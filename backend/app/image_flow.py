import os, io, base64, asyncio, time
from textwrap import dedent
from typing import Optional, List
from PIL import Image as PILImage

from google import genai
from google.genai import errors # 匯入錯誤類型
from crewai import Agent, Task, Crew, LLM
from crewai.flow.flow import Flow, listen, start
from crewai.tools import tool
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ConfigDict
from tavily import TavilyClient

# 載入環境變數
load_dotenv()

# ============================================================
# 區塊 0：全域 LLM 配置 (加上速率限制)
# ============================================================
# 強制設定每分鐘請求數 (max_rpm)，免費版建議設為 2-3
gemini_llm = LLM(
    model="gemini/gemini-3.1-flash-lite-preview", 
    api_key=os.getenv("GEMINI_API_KEY"),
    max_rpm=2 
)

# ============================================================
# 區塊 1：資料結構定義
# ============================================================
class MarketingContext(BaseModel):
    product_name: str
    copywriting: str
    weather: str
    festival: str
    source_image: PILImage.Image = Field(None, exclude=True)
    model_config = ConfigDict(arbitrary_types_allowed=True)

class ImageSearchQueries(BaseModel):
    queries: List[str]
    reasoning: str

class NanoBananaPrompt(BaseModel):
    final_prompt: str = Field(..., description="最終繪圖指令")

# ============================================================
# 區塊 2：視覺搜尋工具
# ============================================================
@tool("visual_search_tool")
def visual_search_tool(query: str) -> str:
    """搜尋視覺背景與氛圍素材。"""
    client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
    results = client.search(query=f"{query} lifestyle beverage photography background", max_results=3)
    return str(results)

# ============================================================
# 區塊 3：TeaMaster AI 整合 Flow (加入速率控制與重試)
# ============================================================
class TeaMasterNanoBananaFlow(Flow):
    # 使用 Semaphore 限制 Step 4 的圖片生成併發數
    image_semaphore = asyncio.Semaphore(1) 

    @start()
    def analyze_marketing_strategy(self):
        print("🔍 [Step 1] 分析行銷文案背景...")
        ctx: MarketingContext = self.state["marketing_context"]
        
        strategist = Agent(
            role="Visual Concept Strategist",
            goal="發想與文案氛圍契合的背景視覺元素",
            backstory="你擅長解讀文字中的感官描述，並將其轉化為高品質的攝影場景設計。",
            llm=gemini_llm # 使用統一配置的 LLM
        )

        task = Task(
            description=dedent(f"""
                分析產品：{ctx.product_name}
                文案內容：{ctx.copywriting}
                當前環境：天氣 {ctx.weather}, 節慶 {ctx.festival}
                請產出 3 個搜尋關鍵字，聚焦於「背景場景、燈光、氛圍道具」。
                你的任務是讓圖片背景與文案中描述的情境完全一致。
            """),
            agent=strategist,
            output_pydantic=ImageSearchQueries,
            expected_output="視覺氛圍關鍵字"
        )

        result = Crew(agents=[strategist], tasks=[task]).kickoff()
        self.state["search_queries"] = result.pydantic.queries
        return self.state["search_queries"]

    @listen(analyze_marketing_strategy)
    def fetch_visual_inspiration(self):
        print(f"🚀 [Step 2] 正在搜尋視覺靈感素材...")
        materials = []
        for q in self.state.get("search_queries", []):
            res = visual_search_tool.run(query=q)
            materials.append(res)
        self.state["visual_references"] = "\n".join(materials)
        return self.state["visual_references"]

    @listen(fetch_visual_inspiration)
    def design_protected_prompt(self):
        ctx: MarketingContext = self.state["marketing_context"]
        print("🎨 [Step 3] 撰寫 Nano Banana 2 主體保護提示詞...")

        engineer = Agent(
            role="Product-First Image Prompt Engineer",
            goal="生成能 100% 保留原始產品並僅替換背景的高品質 Prompt",
            backstory="你是專業的 AI 提示詞專家，精通 Nano Banana 2 的權重指令，確保產品主體不變。",
            llm=gemini_llm # 使用統一配置的 LLM
        )

        task = Task(
            description=dedent(f"""
                請為產品「{ctx.product_name}」撰寫繪圖指令。
                核心任務：維持上傳圖片中的杯子結構，僅更換背景，不要在杯子上產生任何文字。
                
                【杯體保護 (1.9 權重)】:
                - (Original product cup structure and branding:1.9)
                - (Maintain existing bottle shape and labels:1.9)
                
                【場景合成】:
                - 背景參考: {self.state.get('visual_references')}
                - 情境對應文案: {ctx.copywriting}
                - 攝影規格: (Professional lifestyle background:1.4), (Cinematic lighting:1.2), (Blurred background bokeh:1.3).
            """),
            agent=engineer,
            output_pydantic=NanoBananaPrompt,
            expected_output="Nano Banana 2 指令"
        )

        result = Crew(agents=[engineer], tasks=[task]).kickoff()
        self.state["final_prompt"] = result.pydantic.final_prompt
        return self.state["final_prompt"]

    async def _async_generate_single_image(self, client, index, prompt, source_image):
        """單張圖片生成的非同步協程，加入 Semaphore 與 429 重試邏輯"""
        async with self.image_semaphore: # 確保圖片生成一個一個來
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    print(f"   ⚡ 啟動任務 {index+1} (嘗試 {attempt+1})...")
                    variant_prompt = f"Photo variation {index+1}, " + prompt
                    
                    # 圖片生成模型建議使用穩定名稱
                    response = client.models.generate_content(
                        model="gemini-3.1-flash-image-preview", # 或 gemini-2.0-flash-exp
                        contents=[variant_prompt, source_image],
                    )

                    for part in response.parts:
                        if part.inline_data:
                            from PIL import Image
                            generated_pil = Image.open(io.BytesIO(part.inline_data.data))
                            buf = io.BytesIO()
                            generated_pil.convert("RGB").save(buf, format="PNG")
                            b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
                            print(f"   ✅ 任務 {index+1} 完成")
                            # 每次成功生成後，強制冷卻 12 秒，符合 5 RPM 限制
                            await asyncio.sleep(12) 
                            return f"data:image/png;base64,{b64}"
                
                except Exception as e:
                    if "429" in str(e):
                        wait_time = 30 * (attempt + 1)
                        print(f"   ⚠️ 任務 {index+1} 觸發 429，等待 {wait_time}s...")
                        await asyncio.sleep(wait_time)
                    else:
                        print(f"   ❌ 任務 {index+1} 失敗: {e}")
                        break
            return None

    @listen(design_protected_prompt)
    def execute_generation(self):
        """步驟 4: 修改為嚴格控速且執行緒安全的執行模式"""
        print("📸 [Step 4] 執行 Nano Banana 2 控速合成...")
        ctx: MarketingContext = self.state["marketing_context"]
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        async def run_controlled_parallel():
            # 建立任務列表
            tasks = [
                self._async_generate_single_image(client, i, self.state["final_prompt"], ctx.source_image)
                for i in range(3)
            ]
            # 由於 Semaphore 在 _async_generate_single_image 內，這裡會排隊執行
            return await asyncio.gather(*tasks)

        # --- 修正後的非同步執行邏輯 ---
        try:
            # 嘗試獲取現有的迴圈，如果沒有則建立新的
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            if loop.is_running():
                # 如果迴圈正在運行 (例如在某些框架或 Jupyter 中)，使用 run_coroutine_threadsafe
                import nest_asyncio
                nest_asyncio.apply()
                results = loop.run_until_complete(run_controlled_parallel())
            else:
                results = loop.run_until_complete(run_controlled_parallel())
        except Exception as e:
            print(f"⚠️ 執行非同步任務時發生錯誤: {e}")
            # 備案：如果非同步失敗，改用傳統同步迴圈逐一執行以確保穩定
            results = []
            for i in range(3):
                # 建立一個臨時的同步包裝
                res = loop.run_until_complete(self._async_generate_single_image(client, i, self.state["final_prompt"], ctx.source_image))
                results.append(res)
        
        self.state["final_images"] = [r for r in results if r is not None]
        print(f"🏁 生成結束，成功取得 {len(self.state['final_images'])} 張圖片")
        return self.state["final_images"]

# ============================================================
# 進入點
# ============================================================
def process_image_generation(product_name, copywriting, weather, festival, pil_image):
    flow = TeaMasterNanoBananaFlow()
    flow.state["marketing_context"] = MarketingContext(
        product_name=product_name,
        copywriting=copywriting,
        weather=weather,
        festival=festival,
        source_image=pil_image
    )
    # kickoff 是同步呼叫
    flow.kickoff()
    return flow.state.get("final_images", [])