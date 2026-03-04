import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from google import genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

load_dotenv()


# ============================================================
# State 定義
# ============================================================

class CreativeState(BaseModel):
    # 輸入（不可變）
    product_info: str = ""
    trends_summary: str = ""
    trends_hashtags: str = ""
    weather_info: str = ""
    holiday_info: str = ""
    # Agent 產出（逐步填入）
    topics: list = Field(default_factory=list)          # Curator 產出
    drafts: list = Field(default_factory=list)          # Copywriter 產出
    reviewed: list = Field(default_factory=list)        # Critic 產出
    # 控制
    retry_count: int = 0
    director_notes: str = ""   # Supervisor 給下個 Agent 的附加指令
    final_options: list = Field(default_factory=list)   # Output node 格式化後的最終結果


# ============================================================
# Prompts
# ============================================================

DIRECTOR_SYSTEM_PROMPT = """你是手搖飲品牌的創意總監。你負責指揮三位團隊成員完成文案專案。

## 你的團隊
- curator：趨勢選題專家，從新聞中挑出適合借勢的話題
- copywriter：社群文案手，撰寫 Threads + IG 文案
- critic：品管主管，審核文案品質並給分

## 你的品牌（不可更改）
- 調性：活潑、年輕、有梗、微廢
- 受眾：18-35 歲社群重度使用者
- 核心邏輯：話題要能自然接到「來喝一杯」
- 產出數量：3 組文案

## 決策規則
根據目前狀態，你必須回傳 JSON：
{"next": "curator 或 copywriter 或 critic 或 FINISH", "notes": "給下一位的補充指令"}

## 判斷邏輯
- 還沒有 topics → 派 curator
- 有 topics 但沒有 drafts → 派 copywriter
- 有 drafts 但沒有 reviewed → 派 critic
- reviewed 中有低分（total < 35/50）且重寫次數 < 1 → 派 copywriter 重寫，notes 裡說明要改什麼
- reviewed 都合格 或 已重寫過 → FINISH

請只回傳 JSON，不要加任何其他說明。"""

CURATOR_PROMPT = """你是手搖飲品牌的趨勢選題專家。請從以下資訊中挑選 3 個最適合借勢行銷的話題。

## 趨勢新聞摘要
{trends_summary}

## 熱門 Hashtag (已照出現次數多到少排列)
{trends_hashtags}

## 產品資訊
{product_info}

## 天氣資訊
{weather_info}

## 節日資訊
{holiday_info}

## 總監補充指令
{director_notes}

## 輸出格式（JSON array）
請回傳 3 個話題，每個包含：
- topic_title：話題標題（10字內）
- original_title：原始新聞／趨勢標題（保留原文，供後續溯源）
- selection_reason：選題邏輯（30字內，說明為何這個話題適合借勢行銷）
- bridge_idea：如何從這個話題自然接到飲品（20字內）
- mood：情緒調性（如：搞笑、溫馨、熱血）
- recommended_product_type：推薦搭配的飲品類型

注意：
- 話題必須是近期大眾有感的事件或趨勢
- 每個話題的角度要不同（例如：搞笑、溫馨、時事）
- 如果話題來自天氣或節日而非新聞，original_title 填入對應的天氣／節日描述"""

COPYWRITER_PROMPT = """你是手搖飲品牌的社群文案手。請根據以下話題撰寫文案。

## 話題列表
{topics}

## 產品資訊
{product_info}

## 修改建議（如有）
{revision_notes}

## 總監補充指令
{director_notes}

## 品牌調性
- 活潑、年輕、有梗、微廢
- 受眾：18-35 歲社群重度使用者
- 核心邏輯：話題要能自然接到「來喝一杯」

## 輸出格式（JSON array）
為每個話題撰寫一組文案，包含：
- topic_title：對應的話題標題
- bridge_idea：話題與飲品的連結點
- hook_line：開頭吸睛句（15字內，要有梗）
- threads_copy：Threads 文案（100-150字，口語化、有段落感）
- ig_copy：IG 文案（80-120字，短句、Emoji、適合手機閱讀）
- product_hook：產品如何融入話題
- cta：行動呼籲語句

## 寫作規則
- 開頭必須讓人想繼續看
- 產品置入要自然，不能硬塞
- 結尾要有互動感（提問/標記朋友/投票）
- Threads 跟 IG 文案風格要有區別"""

CRITIC_PROMPT = """你是手搖飲品牌的品管主管。請審核以下文案並評分。

## 待審文案
{drafts}

## 評分維度（各 1-10 分）
1. hook_power：開頭吸引力 — 是否讓人想繼續看？
2. brand_fit：品牌契合度 — 調性是否活潑年輕有梗？
3. natural_integration：產品置入自然度 — 飲品出現是否突兀？
4. engagement_potential：互動潛力 — 是否能引發留言/分享？
5. platform_fit：平台適配度 — Threads/IG 文案是否符合各平台特性？

## 輸出格式（JSON array）
為每篇文案回傳：
- topic_title, hook_line, threads_copy, ig_copy, bridge_idea（原文保留）
- score: {{ hook_power, brand_fit, natural_integration, engagement_potential, platform_fit, total }}
- revision_notes：如果 total < 35，說明具體要改什麼；否則為 null"""


# ============================================================
# Helper functions
# ============================================================

def _normalize_content(content) -> str:
    """將 LLM response.content 統一轉為 str（新版模型可能回傳 list）。"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and "text" in part:
                parts.append(part["text"])
        return "".join(parts)
    return str(content)


def _build_state_summary(state: CreativeState) -> str:
    """摘要當前進度給 Director。"""
    parts = []
    parts.append(f"產品：{state.product_info}")

    if state.topics:
        titles = [t.get("topic_title", "?") for t in state.topics]
        parts.append(f"已選話題：{', '.join(titles)}")
    else:
        parts.append("尚未選題")

    if state.drafts:
        parts.append(f"已有 {len(state.drafts)} 組文案草稿")
    else:
        parts.append("尚未撰寫文案")

    if state.reviewed:
        scores = []
        for r in state.reviewed:
            s = r.get("score", {})
            total = s.get("total", s) if isinstance(s, dict) else s
            scores.append(str(total))
        parts.append(f"審核分數：{', '.join(scores)}")
    else:
        parts.append("尚未審核")

    parts.append(f"重寫次數：{state.retry_count}")
    return "\n".join(parts)


def _parse_director_decision(content: str) -> dict:
    """從 Director 回覆中解析 JSON decision。"""
    try:
        # 嘗試直接解析
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    # 嘗試從 markdown code block 提取
    import re
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # 嘗試找第一個 JSON object
    match = re.search(r'\{[^}]+\}', content)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    # Fallback：根據 state 推斷
    return {"next": "FINISH", "notes": ""}


def _extract_revision_notes(reviewed: list | None) -> str:
    """從 reviewed 中提取低分項的修改建議。"""
    if not reviewed:
        return "無"
    notes = []
    for item in reviewed:
        score = item.get("score", {})
        total = score.get("total", 50) if isinstance(score, dict) else (score or 50)
        revision = item.get("revision_notes")
        if total < 35 and revision:
            notes.append(f"「{item.get('topic_title', '?')}」：{revision}")
    return "\n".join(notes) if notes else "無"


def _parse_json_response(content: str) -> list:
    """從 LLM 回覆中解析 JSON array。"""
    try:
        result = json.loads(content)
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            return [result]
    except json.JSONDecodeError:
        pass
    # 嘗試從 markdown code block 提取
    import re
    match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # 嘗試找 JSON array
    match = re.search(r'\[[\s\S]*\]', content)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return []


# ============================================================
# Node 定義
# ============================================================

def supervisor(state: CreativeState) -> Command:
    """Director LLM — 決定下一步路由。"""
    llm = ChatGoogleGenerativeAI(model="gemini-3-flash-preview", temperature=0.5)

    state_summary = _build_state_summary(state)

    response = llm.invoke([
        SystemMessage(content=DIRECTOR_SYSTEM_PROMPT),
        HumanMessage(content=f"目前狀態：\n{state_summary}\n\n請決定下一步。")
    ])

    decision = _parse_director_decision(_normalize_content(response.content))

    next_node = decision.get("next", "FINISH")
    notes = decision.get("notes", "")

    if next_node == "FINISH":
        return Command(goto="output", update={"director_notes": notes})

    # 確保 next_node 是有效的 node 名稱
    valid_nodes = {"curator", "copywriter", "critic"}
    if next_node not in valid_nodes:
        return Command(goto="output", update={"director_notes": notes})

    return Command(goto=next_node, update={"director_notes": notes})


def curator(state: CreativeState) -> Command:
    """選題 LLM — 從趨勢中挑選 3 個話題。"""
    llm = ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview", temperature=0.8,
        model_kwargs={"response_mime_type": "application/json"},
    )
    prompt = CURATOR_PROMPT.format(
        trends_summary=state.trends_summary if state.trends_summary else "目前無趨勢資料，請根據天氣和節日發揮",
        trends_hashtags=state.trends_hashtags if state.trends_hashtags else "無",
        product_info=state.product_info,
        weather_info=state.weather_info or "未提供",
        holiday_info=state.holiday_info or "未提供",
        director_notes=state.director_notes,
    )
    response = llm.invoke(prompt)
    topics = _parse_json_response(_normalize_content(response.content))
    return Command(goto="supervisor", update={"topics": topics})


def copywriter(state: CreativeState) -> Command:
    """文案 LLM — 撰寫 Threads + IG 文案。"""
    llm = ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview", temperature=0.9,
        model_kwargs={"response_mime_type": "application/json"},
    )
    revision_notes = _extract_revision_notes(state.reviewed)
    prompt = COPYWRITER_PROMPT.format(
        topics=json.dumps(state.topics, ensure_ascii=False),
        product_info=state.product_info,
        revision_notes=revision_notes,
        director_notes=state.director_notes,
    )
    response = llm.invoke(prompt)
    drafts = _parse_json_response(_normalize_content(response.content))
    return Command(goto="supervisor", update={"drafts": drafts})


def critic(state: CreativeState) -> Command:
    """審稿 LLM — 評分並給出修改建議。"""
    llm = ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview", temperature=0.3,
        model_kwargs={"response_mime_type": "application/json"},
    )
    prompt = CRITIC_PROMPT.format(
        drafts=json.dumps(state.drafts, ensure_ascii=False)
    )
    response = llm.invoke(prompt)
    reviewed = _parse_json_response(_normalize_content(response.content))
    return Command(
        goto="supervisor",
        update={"reviewed": reviewed, "retry_count": state.retry_count + 1},
    )


def output(state: CreativeState) -> dict:
    """格式化最終輸出。"""
    source = state.reviewed or state.drafts or []
    options = []
    for item in source:
        score = item.get("score", {})
        total = score.get("total") if isinstance(score, dict) else score
        options.append({
            "topic_title": item.get("topic_title", ""),
            "bridge_idea": item.get("bridge_idea", ""),
            "threads_copy": item.get("threads_copy", ""),
            "ig_copy": item.get("ig_copy", ""),
            "hook_line": item.get("hook_line", ""),
            "score": total,
        })
    return {"final_options": options}


# ============================================================
# Graph 組裝
# ============================================================

def build_creative_graph():
    graph = StateGraph(CreativeState)

    graph.add_node("supervisor", supervisor)
    graph.add_node("curator", curator)
    graph.add_node("copywriter", copywriter)
    graph.add_node("critic", critic)
    graph.add_node("output", output)

    graph.add_edge(START, "supervisor")
    graph.add_edge("output", END)
    # 其餘路由由 Command(goto=...) 控制

    return graph.compile()


# ============================================================
# 階段定義 & 進度對應
# ============================================================

STAGES = {
    "preparing":  {"progress": 5,   "message": "準備素材中..."},
    "curating":   {"progress": 20,  "message": "趨勢選題中..."},
    "writing":    {"progress": 50,  "message": "文案撰寫中..."},
    "reviewing":  {"progress": 75,  "message": "品質審核中..."},
    "polishing":  {"progress": 88,  "message": "潤飾修改中..."},
    "done":       {"progress": 100, "message": "完成！"},
    "error":      {"progress": 0,   "message": "生成失敗"},
}


# ============================================================
# Pipeline 主函式（整合 threading + tasks_store）
# ============================================================

def run_generation_pipeline(app, task_id, tasks_store, product_info,
                            trends_summary, trends_hashtags,
                            weather_info, holiday_info):
    """非同步 pipeline：LangGraph Supervisor 架構產生 3 組話題文案。"""
    with app.app_context():
        try:
            tasks_store[task_id].update({"stage": "preparing", **STAGES["preparing"]})

            creative_app = build_creative_graph()

            initial_state = {
                "product_info": product_info,
                "trends_summary": trends_summary,
                "trends_hashtags": trends_hashtags,
                "weather_info": weather_info,
                "holiday_info": holiday_info,
            }

            # 準備 Opik tracer（如果啟用）
            callbacks = []
            if os.getenv("OPIK_ENABLED", "").lower() == "true":
                try:
                    from opik.integrations.langchain import OpikTracer
                    opik_tracer = OpikTracer(
                        tags=["v4-creative-pipeline"],
                        metadata={"product": product_info},
                    )
                    callbacks.append(opik_tracer)
                except Exception:
                    pass  # Opik 不可用時不影響主流程

            config = {"callbacks": callbacks} if callbacks else {}

            # 用 stream 追蹤中間進度
            last_state = initial_state
            for event in creative_app.stream(initial_state, config=config):
                node_name = list(event.keys())[0] if event else None
                if node_name and node_name in event:
                    # 更新 last_state
                    node_output = event[node_name]
                    if isinstance(node_output, dict):
                        last_state = {**last_state, **node_output}

                if node_name == "curator":
                    tasks_store[task_id].update({"stage": "curating", **STAGES["curating"]})
                elif node_name == "copywriter":
                    current_stage = tasks_store[task_id].get("stage")
                    if current_stage == "reviewing":
                        tasks_store[task_id].update({"stage": "polishing", **STAGES["polishing"]})
                    else:
                        tasks_store[task_id].update({"stage": "writing", **STAGES["writing"]})
                elif node_name == "critic":
                    tasks_store[task_id].update({"stage": "reviewing", **STAGES["reviewing"]})

            # 取得最終結果
            final_options = last_state.get("final_options", [])

            tasks_store[task_id].update({"stage": "done", **STAGES["done"]})
            tasks_store[task_id]["result"] = {
                "options": final_options,
            }

        except Exception as e:
            tasks_store[task_id].update({"stage": "error", **STAGES["error"]})
            tasks_store[task_id]["message"] = str(e)


# ============================================================
# 保留給其他 service 用的 Gemini client
# ============================================================

def get_gemini_client():
    return genai.Client(
        api_key=os.getenv("GEMINI_API_KEY"),
        http_options={'api_version': 'v1beta'}
    )
