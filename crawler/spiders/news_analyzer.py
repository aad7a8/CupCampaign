import os
import json
import asyncio
import logging
from datetime import datetime

from pydantic import BaseModel, Field
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

# --- Configuration from environment ---
SCORE_THRESHOLD = float(os.getenv("SCORE_THRESHOLD", "0.6"))
CONCURRENCY = int(os.getenv("CONCURRENCY", "10"))
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash-lite")
TARGET_PRODUCT = os.getenv("TARGET_PRODUCT", "手搖飲")
PRODUCT_DESCRIPTION = os.getenv(
    "PRODUCT_DESCRIPTION",
    "手搖飲料品牌，產品包含珍珠奶茶、水果茶等",
)


# --- Pydantic Schemas ---
class Agent1Response(BaseModel):
    """摘要 + 安全標籤"""
    news_brief: str = Field(
        description="2-3句繁體中文摘要，僅包含核心事實，忽略廣告和推薦閱讀"
    )
    is_safe: bool = Field(
        description="是否安全可用於行銷（True=安全, False=觸發紅線）"
    )
    safety_tags: list[str] = Field(
        description="觸發的安全紅線標籤，如 ['暴力', '天災']；安全則為空列表 []"
    )


class Agent2Response(BaseModel):
    """產品適配評分"""
    relevance: float = Field(
        ge=0, le=1,
        description="新聞熱點與產品核心功能的邏輯連結度 0.0-1.0"
    )
    viral_potential: float = Field(
        ge=0, le=1,
        description="該切入點在社群媒體的潛在討論爆發力 0.0-1.0"
    )
    reasoning: str = Field(
        description="評分邏輯簡析，說明適配或排斥的關鍵原因"
    )


# --- Prompt Templates ---
AGENT1_PROMPT = ChatPromptTemplate.from_messages([
    ("human", """你是品牌行銷部的資深新聞分析師。

請閱讀以下新聞，完成摘要與安全審查：

1. **行銷導向摘要** (news_brief)：
   - 用 2-3 句繁體中文摘要，忽略記者聯絡資訊、推薦閱讀或無關廣告。
   - **重點提取**：除了人、事、時、地、物，請特別保留新聞中的「情緒關鍵字」（如：療癒、崩潰、驚喜、炎上）或「迷因潛力點」。
   - 忽略記者聯絡資訊、推薦閱讀或無關廣告。

2. **安全審查** (is_safe & safety_tags)：
   - 判斷是否適合作為品牌行銷素材。
   - **嚴格過濾**：
     - 負面情緒強烈（仇恨、悲劇、絕望）
     - 爭議性話題（政治對立、性別歧視、宗教衝突）
     - 死亡、重傷、重大犯罪、天災
     - 噁心、血腥或引發生理不適的描寫

---
新聞標題：{title}
新聞內容：{story}""")
])

AGENT2_PROMPT = ChatPromptTemplate.from_messages([
    ("human", """你是品牌借勢行銷適配專家。

根據以下「新聞摘要」與「目標產品」，評估此新聞是否適合用於借勢行銷（Trend-jacking）。

## 目標產品
- 產品名稱：{product}
- 產品描述：{product_description}

## 新聞資訊
- 分類：{tag}
- 標題：{title}
- 摘要：{news_brief}

## 評估維度
1. **關聯度 (relevance)**：新聞熱點與產品核心功能/受眾的邏輯連結度（0.0-1.0）
**0.8-1.0**產品功能/成分與新聞主題直接相關（如：天冷→熱飲、水果新聞→水果茶）
**0.6-0.8**新聞場景中消費產品是自然行為（如：看電影→買飲料、逛夜市→喝手搖）
2. **傳播力 (viral_potential)**：該切入點在社群媒體的潛在討論爆發力（0.0-1.0）
3. **評分邏輯 (reasoning)**：簡述評分原因
**注意：不要當「濫好人」。如果新聞只是普通的社會事件，請勇敢給出低分。**
""")
])


def _build_chains():
    """Build LangChain chains for Agent1 and Agent2."""
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY", "")

    llm = init_chat_model(
        model=MODEL_NAME,
        model_provider="google_genai",
        max_retries=3,
    )

    agent1_chain = AGENT1_PROMPT | llm.with_structured_output(Agent1Response)
    agent2_chain = AGENT2_PROMPT | llm.with_structured_output(Agent2Response)

    return agent1_chain, agent2_chain


# --- Agent1: Summarizer + Safety ---
async def _agent1_one(chain, article, idx, sem):
    async with sem:
        try:
            parsed = await chain.ainvoke({
                "title": article["title"],
                "story": article.get("story", ""),
            })
            return {
                "idx": idx,
                "title": article["title"],
                "date": article.get("date", ""),
                "tag": article.get("tag", ""),
                "href": article.get("href", ""),
                "news_brief": parsed.news_brief.replace("\n", ""),
                "is_safe": parsed.is_safe,
                "safety_tags": parsed.safety_tags,
            }
        except Exception as e:
            logger.warning("[%d] %s... error: %s", idx, article["title"][:30], e)
            return None


async def _run_agent1(chain, articles):
    sem = asyncio.Semaphore(CONCURRENCY)
    tasks = [_agent1_one(chain, art, i, sem) for i, art in enumerate(articles)]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]


# --- Agent2: Product Matcher ---
async def _agent2_one(chain, item, sem):
    async with sem:
        try:
            parsed = await chain.ainvoke({
                "product": TARGET_PRODUCT,
                "product_description": PRODUCT_DESCRIPTION,
                "tag": item["tag"],
                "title": item["title"],
                "news_brief": item["news_brief"],
            })
            return {
                **item,
                "relevance": parsed.relevance,
                "viral_potential": parsed.viral_potential,
                "score": parsed.relevance * 0.6 + parsed.viral_potential * 0.4,
                "reasoning": parsed.reasoning,
            }
        except Exception as e:
            logger.warning("[%d] %s... error: %s", item["idx"], item["title"][:30], e)
            return None


async def _run_agent2(chain, items):
    sem = asyncio.Semaphore(CONCURRENCY)
    tasks = [_agent2_one(chain, item, sem) for item in items]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]


# --- Main entry point ---
async def run(input_file):
    """
    Run the news analysis pipeline.

    Args:
        input_file: Path to the ETtoday JSON file from news_spider.

    Returns:
        dict: Pipeline output with qualified, filtered_out, and unsafe articles.
    """
    logger.info("Loading articles from %s", input_file)
    with open(input_file, "r", encoding="utf-8") as f:
        all_news = json.load(f)

    if not all_news:
        logger.warning("No articles found in %s", input_file)
        return None

    logger.info("Loaded %d articles", len(all_news))

    agent1_chain, agent2_chain = _build_chains()

    # Agent1: Summarize + Safety
    logger.info("Running Agent1 on %d articles...", len(all_news))
    agent1_results = await _run_agent1(agent1_chain, all_news)
    logger.info("Agent1 complete: %d/%d succeeded", len(agent1_results), len(all_news))

    # Safety filter
    safe_articles = [r for r in agent1_results if r["is_safe"]]
    unsafe_articles = [r for r in agent1_results if not r["is_safe"]]
    logger.info("Safety filter: %d safe, %d unsafe", len(safe_articles), len(unsafe_articles))

    # Agent2: Product matching
    logger.info("Running Agent2 on %d safe articles...", len(safe_articles))
    agent2_results = await _run_agent2(agent2_chain, safe_articles)
    logger.info("Agent2 complete: %d/%d succeeded", len(agent2_results), len(safe_articles))

    # Score filter
    qualified = sorted(
        [r for r in agent2_results if r["score"] >= SCORE_THRESHOLD],
        key=lambda x: x["score"],
        reverse=True,
    )
    filtered_out = [r for r in agent2_results if r["score"] < SCORE_THRESHOLD]

    logger.info(
        "Score filter (threshold=%.2f): %d qualified, %d filtered out",
        SCORE_THRESHOLD, len(qualified), len(filtered_out),
    )
    logger.info(
        "Pipeline summary: %d -> Agent1 -> %d safe -> Agent2 -> %d qualified",
        len(all_news), len(safe_articles), len(qualified),
    )

    import langchain
    output = {
        "config": {
            "product": TARGET_PRODUCT,
            "product_description": PRODUCT_DESCRIPTION,
            "score_threshold": SCORE_THRESHOLD,
            "model": MODEL_NAME,
            "framework": f"langchain=={langchain.__version__}",
        },
        "stats": {
            "total_input": len(all_news),
            "agent1_success": len(agent1_results),
            "safe_articles": len(safe_articles),
            "unsafe_articles": len(unsafe_articles),
            "agent2_success": len(agent2_results),
            "qualified": len(qualified),
            "filtered_out": len(filtered_out),
        },
        "qualified": qualified,
        "filtered_out": filtered_out,
        "unsafe": unsafe_articles,
    }

    # Derive date from first article
    date_str = all_news[0]["date"].split(" ")[0].replace("/", "-")
    output_file = f"/app/data/pipeline_langchain_{date_str}.json"
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    logger.info("Saved pipeline results to %s", output_file)
    return output
