"""
News Clustering Pipeline
========================
LangChain + Pydantic + asyncio

Pipeline:
  1. Filter   (Agent1) — gemini-2.5-flash-lite, 3x votes per article
  2. Summary  (Agent2) — gemini-2.5-flash-lite, per article
  3. Cluster  (Agent3) — gemini-3.1-pro-preview, all summaries at once
  4. Group Summary + Hashtags (Agent4) — gemini-2.5-flash-lite, per group
"""

import os
import json
import asyncio
import logging
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)


# ============================================================
# Prompts
# ============================================================

FILTER_PROMPT = """\
你是一位嚴謹的品牌安全審核專家，負責為社群媒體素材來源把關，確保社群媒體素材「絕對安全」。

## 任務
判斷以下新聞是否適合作為品牌社群貼文的素材來源。
請以「負面排除法」判斷——預設通過，僅在符合下列排除條件時才標記為不通過。

## 審核流程 (Step-by-Step)
1. **內容解構**：提取新聞中的主體（人物）、動作（事件）與結果（傷亡/爭議）。
2. **風險比對**：逐一對照下列排除條件。
3. **極端假設**：思考「如果品牌轉發這則新聞，是否會被網友出征或貼標籤？」
4. **最終判定**：若有 1% 的疑慮，即判定為 is_passed: false。

## 排除條件（任一符合即排除）
1. **Tragedy (悲劇)**：
   - 包含：死亡、重傷、絕症、自殺、虐待、大型災難、天災、性犯罪。
   - 註：即便是名人病逝或感人悼念也需排除，品牌不應消費死亡。
2. **Controversy (爭議)**：
   - 包含：地緣政治、兩岸議題、種族/性別歧視言論、勞資衝突、公眾人物性醜聞、民俗迷信恐慌。
   - 註：網友在留言區出現大規模攻擊（如出征、霸凌）的報導亦屬此類。
3. **LowQuality (低品質)**：
   - 包含：18禁暗示、內容空泛無實質資訊、內容農場標題（如：他慘曝原因、這 1 問題）、廣編稿/業配、純網友討論無事實根據。

## 判斷原則
- 寧缺勿濫：有疑慮時傾向排除
- 中性報導犯罪偵辦進度（如警方破案）→ 不通過
- 單純社會新聞但不涉重大傷亡 → 不通過
- 體育賽事、娛樂、科技、生活等正面/中性新聞 → 通過

## 輸出
- **is_passed**: true=通過 / false=排除
- **risk_category**: Tragedy / Controversy / LowQuality / Safe（通過時填 Safe）
- **reason**: 一句話說明理由

---
新聞標題：{title}
新聞內容：{story}"""


SUMMARY_PROMPT = """\
你是一位新聞資料結構化專家，目標是產出可被下游聚類演算法正確分群的結構化摘要。

## 前處理規則
請忽略以下內容，不納入摘要：
- 記者署名、聯絡資訊
- 「推薦閱讀」、「延伸閱讀」、「更多新聞」等導流區塊
- 廣告、業配標示

## 輸出欄位
- **who**: 核心人物或組織，無明確人物填「未指定」
- **what**: 事件核心摘要
- **keywords**: 3-5 個關鍵詞

## what 欄位要求
- 一句話總結「客觀發生的核心事件」
- 格式：「主體 + 核心事件 + 影響/結果」
- 去除所有修飾語、程度副詞、背景補充

---
新聞標題：{title}
新聞內容：{story}"""


CLUSTERING_PROMPT = """\
# Role
你是一位精準的新聞主題聚類專家。

# Task
分析輸入的 {total_count} 筆 JSON 新聞摘要（含 id/who/what/keywords），將屬於「同一話題/議題」的報導歸類在一起。

## 「同一話題」定義
只要新聞圍繞同一個「議題領域」或「討論主題」，即使涉及不同人物、不同面向、不同角度，都應歸為同一群。

### 應合併的情況
- **同一人物的多面向報導**：同一人在同一場合的不同細節（例如：記者會上的不同發言）→ 合併
- **同一事件的不同角度**：同一件事的原因分析、影響評估、各方回應 → 合併
- **同一議題的不同個案**：都在討論同一政策/趨勢/現象 → 合併
- **同一賽事/活動的相關報導**：賽果、花絮、賽後訪問 → 合併
- **同一產品/品牌的系列報導**：新品發表、評測、市場反應 → 合併

### 應拆分的情況
- **完全不同的議題領域**：體育 vs 政治 vs 科技 → 拆
- **僅有表面關鍵詞重疊但實質無關**：同樣提到「台北」但一個是美食、一個是交通 → 拆

### 拒絕收容條款（嚴格遵守）
寧可讓一篇新聞「單獨成群」，也不要把它硬塞進一個不夠相關的群組。具體規則：

1. **相關性門檻**：將一篇新聞歸入某群組前，先檢查它與該群組「多數成員」是否共享具體的議題主軸（而非僅共享寬泛的領域標籤如「財經」「生活」「消費」）。若僅有表面類別相同、但實質討論的事件/對象/脈絡不同，該篇應獨立。
2. **群組膨脹警戒**：任何群組達到 **15 篇以上**時，必須重新審視——是否存在多個子議題被混為一談？若是，請拆分為更具體的子群組。
3. **禁止「萬用垃圾桶」群組**：不得建立如「社會生活」「其他消費」「綜合新聞」等過於寬泛的收容群組。如果你無法用一句話描述該群組的具體議題（例如「輝達財報與 AI 晶片前景」），代表這個群組定義太模糊，應拆分或讓成員各自獨立。
4. **單獨成群完全合理**：預期會有 **30-80 個單篇群組**，這是正常的。不需要強迫每篇新聞都找到同伴。

## 目標群組數量
預期產出 **20-50 個主題群組**（視實際內容而定），外加若干單篇群組。如果你發現多篇群組數量超過 80，代表分得太細，請放寬合併標準。但如果單篇群組少於 20 個，代表你可能在強迫歸類——請回頭檢查大群組是否混入了不相關的新聞。

## 輸出要求
每個 group 包含：
- **id**: 該話題的新聞 ID 列表
- **confidence**: 聚類信心度
  - high：明確屬於同一話題
  - medium：相關但跨了一些子議題
  - low：不太確定是否同一話題，但勉強歸類

## 處理步驟
1. 閱讀每筆摘要的 who/what/keywords
2. 識別出主要的「話題/議題」
3. 將相關新聞歸入對應的話題群組
4. **對每篇新聞執行歸入前檢查**：這篇與群組現有成員是否共享具體議題？若否，讓它單獨成群
5. 檢查是否有群組可以進一步合併
6. **大群組拆分檢查**：任何超過 15 篇的群組，逐一審視每篇是否真的屬於同一話題
7. **最後自我清點**：確認所有 {total_count} 個 id 都已分配，無遺漏無重複

# Example
Input:
[
  {{"id": 0, "who": "Lulu", "what": "Lulu今日大婚", "keywords": ["Lulu", "婚禮", "台北"]}},
  {{"id": 1, "who": "101攀登賽", "what": "101攀登比賽開跑", "keywords": ["101", "攀登賽", "台北"]}},
  {{"id": 2, "who": "陳漢典、Lulu", "what": "陳漢典出席Lulu婚禮", "keywords": ["陳漢典", "Lulu", "婚禮"]}},
  {{"id": 3, "who": "浩子", "what": "浩子祝福Lulu新婚快樂", "keywords": ["浩子", "Lulu", "婚禮"]}},
  {{"id": 4, "who": "101攀登賽", "what": "101攀登賽冠軍出爐", "keywords": ["101", "攀登賽", "冠軍"]}},
  {{"id": 5, "who": "威力彩", "what": "威力彩頭獎開出", "keywords": ["威力彩", "樂透", "頭獎"]}},
  {{"id": 6, "who": "渣打銀行", "what": "渣打銀行3P策略擴展", "keywords": ["渣打", "銀行", "策略"]}}
]

Output:
- id=[0, 2, 3], confidence="high"   ← Lulu婚禮相關報導全部合併
- id=[1, 4], confidence="high"       ← 101攀登賽相關報導合併
- id=[5], confidence="high"          ← 威力彩獨立（與消費/財經無關，不硬塞）
- id=[6], confidence="high"          ← 渣打銀行業務獨立（不因「有錢」就塞進財經群）

---
請處理以下 {total_count} 筆 JSON 摘要資料：
{news_json}"""


GROUP_SUMMARY_PROMPT = """\
你是一位社群內容專家，擅長為新聞事件產生精準摘要與具社群感的 hashtag。

## 任務
針對以下新聞群組（共 {articles_count} 篇），完成：

1. **summary**：一句話總結客觀發生的核心事件
   - 格式：主體＋核心事件＋影響/結果
   - 若群組有多篇報導，綜合所有報導產出一個統整摘要

2. **hashtags**：3-5 個具社群感的 hashtag（含 # 號）
   - 優先使用年輕族群熟悉的用語
   - 包含事件關鍵字 + 情緒/氛圍標籤
   - 避免過於通用的標籤（如 #新聞 #今日）

---
待處理新聞群組（共 {articles_count} 篇）：
{articles_json}
"""


# ============================================================
# Pydantic Response Models
# ============================================================

class FilterResponse(BaseModel):
    is_passed: bool = Field(description="true=通過 / false=排除")
    risk_category: str = Field(description="Tragedy / Controversy / LowQuality / Safe")
    reason: str = Field(description="一句話說明理由")


class SummaryResponse(BaseModel):
    who: str = Field(description="核心人物或組織")
    what: str = Field(description="事件核心摘要")
    keywords: list[str] = Field(description="3-5 個關鍵詞")


class ClusterGroup(BaseModel):
    id: list[int] = Field(description="該話題的新聞 ID 列表")
    confidence: str = Field(description="聚類信心度: high / medium / low")


class ClusteringResponse(BaseModel):
    groups: list[ClusterGroup] = Field(description="所有主題群組")


class GroupSummaryResponse(BaseModel):
    summary: str = Field(description="一句話總結核心事件")
    hashtags: list[str] = Field(description="3-5 個 hashtag（含 # 號）")


# ============================================================
# Configuration
# ============================================================

CONCURRENCY = 30
FILTER_MODEL = "gemini-2.5-flash-lite"
SUMMARY_MODEL = "gemini-2.5-flash-lite"
CLUSTERING_MODEL = "gemini-3.1-pro-preview"
GROUP_SUMMARY_MODEL = "gemini-2.5-flash-lite"
FILTER_VOTES = 3
MAX_CLUSTERING_RETRIES = 3


# ============================================================
# Chain Builders
# ============================================================

def _build_llm(model: str, timeout: int = 120):
    return init_chat_model(
        model=model,
        model_provider="google_genai",
        max_retries=3,
        timeout=timeout,
    )


def _build_chains():
    llm_filter = _build_llm(FILTER_MODEL)
    llm_summary = _build_llm(SUMMARY_MODEL)
    llm_cluster = _build_llm(CLUSTERING_MODEL, timeout=1200)
    llm_group = _build_llm(GROUP_SUMMARY_MODEL)

    filter_chain = (
        ChatPromptTemplate.from_messages([("human", FILTER_PROMPT)])
        | llm_filter.with_structured_output(FilterResponse)
    )
    summary_chain = (
        ChatPromptTemplate.from_messages([("human", SUMMARY_PROMPT)])
        | llm_summary.with_structured_output(SummaryResponse)
    )
    clustering_chain = (
        ChatPromptTemplate.from_messages([("human", CLUSTERING_PROMPT)])
        | llm_cluster.with_structured_output(ClusteringResponse)
    )
    group_summary_chain = (
        ChatPromptTemplate.from_messages([("human", GROUP_SUMMARY_PROMPT)])
        | llm_group.with_structured_output(GroupSummaryResponse)
    )

    return filter_chain, summary_chain, clustering_chain, group_summary_chain


# ============================================================
# Stage 1: Filter (3x voting, any fail → exclude)
# ============================================================

async def _filter_one_vote(
    article: dict, chain, sem: asyncio.Semaphore,
) -> FilterResponse | None:
    async with sem:
        try:
            return await chain.ainvoke({
                "title": article["title"],
                "story": article.get("story", ""),
            })
        except Exception as e:
            logger.warning("[Filter] Error: %s... %s", article["title"][:30], e)
            return None


async def _filter_one(
    article: dict, idx: int, chain, sem: asyncio.Semaphore,
) -> dict:
    tasks = [_filter_one_vote(article, chain, sem) for _ in range(FILTER_VOTES)]
    votes = await asyncio.gather(*tasks)

    # Any is_passed=false or error → exclude
    passed = all(v is not None and v.is_passed for v in votes)

    failed_vote = next(
        (v for v in votes if v is not None and not v.is_passed),
        None,
    )

    return {
        "id": idx,
        "title": article["title"],
        "story": article.get("story", ""),
        "date": article.get("date", ""),
        "tag": article.get("tag", ""),
        "href": article.get("href", ""),
        "passed": passed,
        "risk_category": failed_vote.risk_category if failed_vote else "Safe",
        "reason": failed_vote.reason if failed_vote else "",
    }


async def _run_filter(
    articles: list[dict], chain, sem: asyncio.Semaphore,
) -> list[dict]:
    tasks = [_filter_one(art, i, chain, sem) for i, art in enumerate(articles)]
    return await asyncio.gather(*tasks)


# ============================================================
# Stage 2: Summary
# ============================================================

async def _summarize_one(
    article: dict, chain, sem: asyncio.Semaphore,
) -> dict | None:
    async with sem:
        try:
            result: SummaryResponse = await chain.ainvoke({
                "title": article["title"],
                "story": article.get("story", ""),
            })
            return {
                "id": article["id"],
                "who": result.who,
                "what": result.what,
                "keywords": result.keywords,
            }
        except Exception as e:
            logger.warning("[Summary] Error: %s... %s", article["title"][:30], e)
            return None


async def _run_summary(
    articles: list[dict], chain, sem: asyncio.Semaphore,
) -> list[dict]:
    tasks = [_summarize_one(art, chain, sem) for art in articles]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]


# ============================================================
# Stage 3: Clustering (with validation & retry)
# ============================================================

def _validate_clusters(
    groups: list[ClusterGroup], total_ids: set[int],
) -> tuple[bool, set[int], set[int]]:
    """Returns (is_valid, duplicate_ids, missing_ids)."""
    seen: set[int] = set()
    duplicates: set[int] = set()
    for g in groups:
        for id_ in g.id:
            if id_ in seen:
                duplicates.add(id_)
            seen.add(id_)
    missing = total_ids - seen
    is_valid = len(duplicates) == 0 and len(missing) == 0
    return is_valid, duplicates, missing


def _deduplicate_clusters(groups: list[ClusterGroup]) -> list[ClusterGroup]:
    """Remove duplicate IDs across groups, keeping the first occurrence."""
    seen: set[int] = set()
    deduped: list[ClusterGroup] = []
    for g in groups:
        new_ids = [id_ for id_ in g.id if id_ not in seen]
        seen.update(new_ids)
        if new_ids:
            deduped.append(ClusterGroup(id=new_ids, confidence=g.confidence))
    return deduped


async def _run_clustering(
    summaries: list[dict], chain,
) -> list[ClusterGroup]:
    total_ids = {s["id"] for s in summaries}
    news_json = json.dumps(summaries, ensure_ascii=False)

    last_result: ClusteringResponse | None = None

    for attempt in range(MAX_CLUSTERING_RETRIES):
        try:
            result: ClusteringResponse = await chain.ainvoke({
                "total_count": len(summaries),
                "news_json": news_json,
            })
            last_result = result
        except Exception as e:
            logger.warning("[Clustering] Attempt %d error: %s", attempt + 1, e)
            continue

        is_valid, duplicates, missing = _validate_clusters(
            result.groups, total_ids,
        )

        if is_valid:
            logger.info("[Clustering] Valid on attempt %d", attempt + 1)
            return result.groups

        if duplicates and not missing:
            # Only duplicates → remove them and return
            logger.info(
                "[Clustering] Removing %d duplicate ID(s)", len(duplicates),
            )
            return _deduplicate_clusters(result.groups)

        # Missing IDs (with or without duplicates) → retry
        logger.warning(
            "[Clustering] Attempt %d: %d missing, %d duplicate(s) → retry",
            attempt + 1, len(missing), len(duplicates),
        )

    # Exhausted retries — return best effort
    if last_result:
        logger.warning("[Clustering] Max retries reached, returning best effort")
        return _deduplicate_clusters(last_result.groups)

    logger.error("[Clustering] All attempts failed")
    return []


# ============================================================
# Stage 4: Group Summary + Hashtags
# ============================================================

async def _group_summary_one(
    group: ClusterGroup,
    articles_by_id: dict[int, dict],
    chain,
    sem: asyncio.Semaphore,
) -> dict | None:
    group_articles = [
        {
            "id": id_,
            "title": articles_by_id[id_]["title"],
            "story": articles_by_id[id_].get("story", ""),
        }
        for id_ in group.id
        if id_ in articles_by_id
    ]
    if not group_articles:
        return None

    async with sem:
        try:
            result: GroupSummaryResponse = await chain.ainvoke({
                "articles_count": len(group_articles),
                "articles_json": json.dumps(
                    group_articles, ensure_ascii=False,
                ),
            })
            return {
                "article_ids": group.id,
                "confidence": group.confidence,
                "summary": result.summary,
                "hashtags": result.hashtags,
                "articles": [
                    {"id": a["id"], "title": a["title"]}
                    for a in group_articles
                ],
            }
        except Exception as e:
            ids_preview = group.id[:3]
            logger.warning("[GroupSummary] Error for group %s...: %s", ids_preview, e)
            return None


async def _run_group_summary(
    groups: list[ClusterGroup],
    articles: list[dict],
    chain,
    sem: asyncio.Semaphore,
) -> list[dict]:
    articles_by_id = {a["id"]: a for a in articles}
    tasks = [
        _group_summary_one(g, articles_by_id, chain, sem) for g in groups
    ]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]


# ============================================================
# Main Pipeline
# ============================================================

async def run_pipeline(articles: list[dict]) -> dict:
    """
    Run the full news clustering pipeline.

    Args:
        articles: List of news dicts with keys: title, story, date, tag, href

    Returns:
        Dict with keys: filtered_out, groups, stats
    """
    load_dotenv()
    if not os.environ.get("GOOGLE_API_KEY"):
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            os.environ["GOOGLE_API_KEY"] = api_key

    filter_chain, summary_chain, clustering_chain, group_summary_chain = (
        _build_chains()
    )
    sem = asyncio.Semaphore(CONCURRENCY)

    # --- Stage 1: Filter ---
    logger.info(
        "[Stage 1/4] Filtering %d articles (x%d votes each)...",
        len(articles), FILTER_VOTES,
    )
    filter_results = list(await _run_filter(articles, filter_chain, sem))
    passed = [r for r in filter_results if r["passed"]]
    failed = [r for r in filter_results if not r["passed"]]
    logger.info("  Passed: %d, Filtered out: %d", len(passed), len(failed))

    if not passed:
        logger.warning("No articles passed filter. Exiting.")
        return {
            "filtered_out": failed,
            "groups": [],
            "stats": {
                "total_input": len(articles),
                "passed_filter": 0,
                "filtered_out": len(failed),
            },
        }

    # --- Stage 2: Summary ---
    logger.info("[Stage 2/4] Summarizing %d articles...", len(passed))
    summaries = await _run_summary(passed, summary_chain, sem)
    logger.info("  Summarized: %d", len(summaries))

    # --- Stage 3: Clustering ---
    logger.info("[Stage 3/4] Clustering %d summaries...", len(summaries))
    clusters = await _run_clustering(summaries, clustering_chain)
    multi_groups = [g for g in clusters if len(g.id) > 1]
    single_groups = [g for g in clusters if len(g.id) == 1]
    logger.info(
        "  Groups: %d multi-article, %d single-article",
        len(multi_groups), len(single_groups),
    )

    # --- Stage 4: Group Summary + Hashtags ---
    logger.info(
        "[Stage 4/4] Generating summaries & hashtags for %d groups...",
        len(clusters),
    )
    groups = await _run_group_summary(
        clusters, passed, group_summary_chain, sem,
    )
    logger.info("  Done: %d groups", len(groups))

    # --- Build result ---
    return {
        "filtered_out": [
            {
                "id": r["id"],
                "title": r["title"],
                "risk_category": r["risk_category"],
                "reason": r["reason"],
            }
            for r in failed
        ],
        "groups": sorted(groups, key=lambda g: len(g["article_ids"]), reverse=True),
        "stats": {
            "total_input": len(articles),
            "passed_filter": len(passed),
            "filtered_out": len(failed),
            "summarized": len(summaries),
            "num_groups": len(groups),
            "multi_article_groups": len(multi_groups),
            "single_article_groups": len(single_groups),
        },
    }


# ============================================================
# Compatibility wrapper for main.py
# ============================================================

async def run(input_file: str) -> dict | None:
    """
    Wrapper that reads a JSON file and runs the pipeline.
    Maintains backward compatibility with crawler/main.py.
    """
    logger.info("Loading articles from %s", input_file)
    with open(input_file, "r", encoding="utf-8") as f:
        all_news = json.load(f)

    if not all_news:
        logger.warning("No articles found in %s", input_file)
        return None

    logger.info("Loaded %d articles", len(all_news))

    result = await run_pipeline(all_news)

    # Save output
    date_str = all_news[0]["date"].split(" ")[0].replace("/", "-")
    output_file = f"/app/data/pipeline_{date_str}.json"
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    logger.info("Saved pipeline results to %s", output_file)
    return result


# ============================================================
# CLI Entry Point
# ============================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python news_analyzer.py <input.json> [output.json]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    with open(input_file, "r", encoding="utf-8") as f:
        raw_articles = json.load(f)

    pipeline_result = asyncio.run(run_pipeline(raw_articles))

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(pipeline_result, f, ensure_ascii=False, indent=2)
        print(f"\nSaved to {output_file}")
    else:
        print(json.dumps(pipeline_result, ensure_ascii=False, indent=2))
