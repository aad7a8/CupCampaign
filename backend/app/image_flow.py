import os, io, base64
from textwrap import dedent
from typing import Optional, List
from PIL import Image as PILImage

from google import genai
from crewai import Agent, Task, Crew
from crewai.flow.flow import Flow, listen, start
from crewai.tools import tool
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ConfigDict
from tavily import TavilyClient

# 載入環境變數
load_dotenv()

# ============================================================
# 區塊 1：資料結構定義 (對齊 Flask Route 傳入參數)
# ============================================================

class MarketingContext(BaseModel):
    # 基礎行銷背景
    product_name: str
    copywriting: str       # 這裡傳入完整的文案內容或選題資訊
    weather: str
    festival: str
    
    # 直接接收來自 Route 轉換好的 PIL 物件
    source_image: PILImage.Image = Field(None, exclude=True)
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

class ImageSearchQueries(BaseModel):
    queries: List[str]
    reasoning: str

class NanoBananaPrompt(BaseModel):
    """專為 Nano Banana 2 設計的保護型 Prompt"""
    final_prompt: str = Field(..., description="最終繪圖指令，需包含對杯體的保護指令")

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

    @start()
    def analyze_marketing_strategy(self):
        """步驟 1: 分析文案背景，發想背景視覺方向"""
        print("🔍 [Step 1] 分析行銷文案背景...")
        ctx: MarketingContext = self.state["marketing_context"]
        
        strategist = Agent(
            role="Visual Concept Strategist",
            goal="發想與文案氛圍契合的「背景」視覺元素",
            backstory="你擅長解讀文字中的感官描述，並將其轉化為高品質的攝影場景設計。",
            llm="gemini/gemini-2.5-flash"
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
        """步驟 2: 抓取素材參考"""
        print(f"🚀 [Step 2] 正在搜尋視覺靈感素材...")
        materials = []
        for q in self.state.get("search_queries", []):
            res = visual_search_tool.run(query=q)
            materials.append(res)
        self.state["visual_references"] = "\n".join(materials)
        return self.state["visual_references"]

    @listen(fetch_visual_inspiration)
    def design_protected_prompt(self):
        """步驟 3: 撰寫 Nano Banana 2 提示詞"""
        ctx: MarketingContext = self.state["marketing_context"]
        print("🎨 [Step 3] 撰寫 Nano Banana 2 主體保護提示詞...")

        engineer = Agent(
            role="Product-First Image Prompt Engineer",
            goal="生成能 100% 保留原始產品並僅替換背景的高品質 Prompt",
            backstory="你是專業的 AI 提示詞專家，精通 Nano Banana 2 的權重指令，確保產品主體不變。",
            llm="gemini/gemini-2.5-flash"
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
            expected_output="Nano Banana 2 生成指令"
        )

        result = Crew(agents=[engineer], tasks=[task]).kickoff()
        self.state["final_prompt"] = result.pydantic.final_prompt
        return self.state["final_prompt"]

    @listen(design_protected_prompt)
    def execute_generation(self):
        """步驟 4: 執行生圖並回傳 Base64 (解決 'Image' object has no attribute 'convert' 問題)"""
        print("📸 [Step 4] 執行 Nano Banana 2 影像合成...")
        ctx: MarketingContext = self.state["marketing_context"]
        
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        try:
            # 使用 Nano Banana 2 模型 (Gemini 3.1 Flash Image)
            response = client.models.generate_content(
                model="gemini-3.1-flash-image-preview",
                contents=[self.state["final_prompt"], ctx.source_image],
            )

            for part in response.parts:
                if part.inline_data:
                    # 關鍵修正：透過 BytesIO 確保獲得 Pillow Image 物件
                    from PIL import Image
                    generated_pil = Image.open(io.BytesIO(part.inline_data.data))
                    
                    # 轉換為 Base64
                    buf = io.BytesIO()
                    generated_pil.convert("RGB").save(buf, format="PNG")
                    base64_data = base64.b64encode(buf.getvalue()).decode('utf-8')
                    
                    self.state["final_image_base64"] = f"data:image/png;base64,{base64_data}"
                    print(f"✅ 影像生成成功")
                    return self.state["final_image_base64"]
                    
        except Exception as e:
            print(f"❌ 生圖失敗: {e}")
            self.state["final_image_base64"] = None

# ============================================================
# 供 Route 呼叫的統一接口
# ============================================================

def process_image_generation(product_name, copywriting, weather, festival, pil_image):
    """對接 Flask Route 的進入點"""
    flow = TeaMasterNanoBananaFlow()
    
    # 注入 Context
    flow.state["marketing_context"] = MarketingContext(
        product_name=product_name,
        copywriting=copywriting,
        weather=weather,
        festival=festival,
        source_image=pil_image # 這裡接收來自 Route 的 PIL Image 物件
    )
    
    # 執行整個 Agent 流程
    flow.kickoff()
    
    return flow.state.get("final_image_base64")