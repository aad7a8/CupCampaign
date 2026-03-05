"""
News Trends via Gemini Google Search
=====================================
Uses Gemini Google Search grounding to find trending topics in Taiwan,
then saves combined results + hashtags to ExternalTrends.
"""

import os
import re
import sys
import asyncio
import logging
from collections import Counter
from datetime import date, timedelta

from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig, GoogleSearch, Tool

# --- Flask / DB imports ---
backend_path = "/app/backend"
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app
from app.extensions import db
from app.models import ExternalTrends

logger = logging.getLogger(__name__)

N = 10  # Number of concurrent searches
MODEL = "gemini-2.5-flash"


# ============================================================
# Helpers
# ============================================================

def extract_citations(response):
    """Extract citation sources from Gemini grounding response."""
    citations = []
    candidates = response.candidates

    if not candidates or not candidates[0].grounding_metadata:
        return citations

    chunks = candidates[0].grounding_metadata.grounding_chunks
    if not chunks:
        return citations

    for chunk in chunks:
        if hasattr(chunk, "web") and chunk.web:
            citations.append({
                "title": chunk.web.title,
                "url": chunk.web.uri,
            })

    return citations


async def google_search_once(client, content, grounding_tool, i):
    """Single Google Search grounding query."""
    resp = await client.aio.models.generate_content(
        model=MODEL,
        contents=content,
        config=GenerateContentConfig(tools=[grounding_tool]),
    )
    logger.info("[搜尋 %d/%d 完成]", i + 1, N)
    return resp


# ============================================================
# Main
# ============================================================

async def run():
    """
    Run Gemini Google Search grounding to find trending topics,
    then save results to ExternalTrends.
    """
    load_dotenv()
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.error("GEMINI_API_KEY not set")
        return

    client = genai.Client(api_key=api_key)
    grounding_tool = Tool(google_search=GoogleSearch())

    today = date.today()
    yesterday = today - timedelta(days=1)

    content = f"""台灣在 {yesterday} 和 {today} 有什麼熱門社群話題?
找出10個
過濾條件:
1.負面
2.過時
3.易引起爭議
4.容易有版權糾紛

輸出格式:
###話題 - 日期###
摘要
Hashtag x 3

"""

    # --- N concurrent searches ---
    logger.info("Starting %d Google Search grounding queries...", N)
    responses = await asyncio.gather(
        *(google_search_once(client, content, grounding_tool, i) for i in range(N))
    )
    logger.info("All %d searches complete", N)

    # --- Combine results ---
    all_texts = []
    all_citations = []
    for i, resp in enumerate(responses):
        citations = extract_citations(resp)
        all_citations.extend(citations)

        citation_lines = "\n".join(
            f"  - {c['title']}: {c['url']}" for c in citations
        )
        all_texts.append(
            f"=== 搜尋結果 {i + 1} ===\n{resp.text}\n"
            f"--- 引用來源 ---\n{citation_lines}"
        )

    combined_text = "\n\n".join(all_texts)
    logger.info("Collected %d citations from %d searches", len(all_citations), N)

    # --- Extract and sort hashtags ---
    raw_tags = []
    for resp in responses:
        raw_tags.extend(re.findall(r"#\S+", resp.text))

    counter = Counter(raw_tags)
    sorted_tags = [tag for tag, _ in counter.most_common()]
    hashtag_string = " ".join(sorted_tags)
    logger.info("Extracted %d unique hashtags", len(sorted_tags))

    # --- Save to DB ---
    flask_app = create_app()
    with flask_app.app_context():
        trend = ExternalTrends(
            hashtag=hashtag_string,
            summary=combined_text,
        )
        db.session.add(trend)
        db.session.commit()
        logger.info("[DB] Saved 1 ExternalTrends record")
