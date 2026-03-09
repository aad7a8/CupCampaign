import os, io, base64, asyncio, time
from textwrap import dedent
from typing import Optional, List
from PIL import Image as PILImage

from google import genai
from google.genai import errors 
from crewai import Agent, Task, Crew, LLM
from crewai.flow.flow import Flow, listen, start
from crewai.tools import tool
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ConfigDict
from tavily import TavilyClient

# 載入環境變數
load_dotenv()

# ============================================================
# 區塊 0：全域 LLM 配置
# ============================================================
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
# 區塊 3：TeaMaster AI 整合 Flow
# ============================================================
class TeaMasterNanoBananaFlow(Flow):
    # 移除類別層級的 image_semaphore，改為實例屬性
    def __init__(self):
        super().__init__()
        self._semaphore = None

    def get_semaphore(self):
        # 確保 Semaphore 在當前的事件迴圈中建立
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(1)
        return self._semaphore

    @start()
    def analyze_marketing_strategy(self):
        print("🔍 [Step 1] 分析行銷文案背景...")
        ctx: MarketingContext = self.state["marketing_context"]
        
        strategist = Agent(
            role="Visual Concept Strategist",
            goal="發想與文案氛圍契合的背景視覺元素",
            backstory="你擅長解讀文字中的感官描述，並將其轉化為高品質的攝影場景設計。",
            llm=gemini_llm
        )

        task = Task(
            description=dedent(f"""
                分析產品：{ctx.product_name}
                文案內容：{ctx.copywriting}
                當前環境：天氣 {ctx.weather}, 節慶 {ctx.festival}
                請產出 3 個搜尋關鍵字，聚焦於「背景場景、燈光、氛圍道具」。
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
            backstory="你是專業的 AI 提示詞專家，精通 Nano Banana 2 的權重指令。",
            llm=gemini_llm
        )

        task = Task(
            description=dedent(f"""
                請為產品「{ctx.product_name}」撰寫繪圖指令。
                核心任務：維持上傳圖片中的杯子結構，僅更換背景。
                
                【杯體保護 (1.9 權重)】:
                - (Original product cup structure and branding:1.9)
                - (Maintain existing bottle shape and labels:1.9)
                
                【場景合成】:
                - 背景參考: {self.state.get('visual_references')}
                - 情境對應文案: {ctx.copywriting}
            """),
            agent=engineer,
            output_pydantic=NanoBananaPrompt,
            expected_output="Nano Banana 2 指令"
        )

        result = Crew(agents=[engineer], tasks=[task]).kickoff()
        self.state["final_prompt"] = result.pydantic.final_prompt
        return self.state["final_prompt"]

    async def _async_generate_single_image(self, client, index, prompt, source_image):
        """加入延遲取得 Semaphore 的機制"""
        sem = self.get_semaphore() 
        async with sem:
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    print(f"   ⚡ 啟動任務 {index+1} (嘗試 {attempt+1})...")
                    variant_prompt = f"Photo variation {index+1}, " + prompt
                    
                    response = client.models.generate_content(
                        model="gemini-3.1-flash-image-preview",
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
        """步驟 4: 使用新的迴圈處理邏輯"""
        print("📸 [Step 4] 執行 Nano Banana 2 控速合成...")
        ctx: MarketingContext = self.state["marketing_context"]
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        async def run_tasks():
            tasks = [
                self._async_generate_single_image(client, i, self.state["final_prompt"], ctx.source_image)
                for i in range(3)
            ]
            return await asyncio.gather(*tasks)

        # 這裡建議直接使用 asyncio.run 的替代方案，或是確保在當前 thread 的 loop 執行
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        if loop.is_running():
            # 在 FastAPI/Flask 等環境中，如果 loop 已在運行，
            # 最保險的做法是另開執行緒或使用 nest_asyncio
            import nest_asyncio
            nest_asyncio.apply()
        
        results = loop.run_until_complete(run_tasks())
        
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
    flow.kickoff()
    return flow.state.get("final_images", [])