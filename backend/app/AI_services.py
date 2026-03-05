import os
import json
import threading
import re
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ConfigDict
from google import genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

load_dotenv()

# ============================================================
# State 定義 (加入 ConfigDict 修正驗證錯誤)
# ============================================================

class CreativeState(BaseModel):
    # 關鍵修正：解決數據校驗過程中的類型衝突
    model_config = ConfigDict(arbitrary_types_allowed=True)

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
    director_notes: str = ""                            # Supervisor 給下個 Agent 的附加指令
    final_options: list = Field(default_factory=list)   # Output node 格式化後的最終結果

# ============================================================
# Prompts (保留您指定的專家級人設)
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
## 熱門 Hashtag
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
請回傳 3 個話題，每個包含：topic_title, original_title, selection_reason, bridge_idea, mood, recommended_product_type"""

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
## 輸出格式（JSON array）
為每個話題撰寫一組文案，包含：topic_title, bridge_idea, hook_line, threads_copy, ig_copy, product_hook, cta"""

CRITIC_PROMPT = """你是手搖飲品牌的品管主管。請審核以下文案並評分。
## 待審文案
{drafts}
## 輸出格式（JSON array）
為每篇文案回傳：topic_title, hook_line, threads_copy, ig_copy, bridge_idea, score, revision_notes"""

# ============================================================
# Helper Functions (強化數據解析穩定性)
# ============================================================

def _normalize_content(content) -> str:
    if isinstance(content, str): return content
    if isinstance(content, list):
        parts = [part.get("text", str(part)) if isinstance(part, dict) else str(part) for part in content]
        return "".join(parts)
    return str(content)

def _build_state_summary(state: CreativeState) -> str:
    parts = [f"產品：{state.product_info}"]
    if state.topics:
        parts.append(f"已選話題：{', '.join([str(t.get('topic_title', '?')) for t in state.topics if isinstance(t, dict)])}")
    if state.drafts: parts.append(f"已有 {len(state.drafts)} 組文案草稿")
    if state.reviewed:
        scores = []
        for r in state.reviewed:
            if isinstance(r, dict):
                s = r.get("score", 0)
                # 強化判斷：處理 score 是 dict 或 int 的情況，避免報錯
                total = s.get("total", s) if isinstance(s, dict) else s
                scores.append(str(total))
        parts.append(f"審核分數：{', '.join(scores)}")
    parts.append(f"重寫次數：{state.retry_count}")
    return "\n".join(parts)

def _parse_director_decision(content: str) -> dict:
    try: return json.loads(content)
    except:
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            try: return json.loads(match.group(0))
            except: pass
    return {"next": "FINISH", "notes": ""}

def _parse_json_response(content: str) -> list:
    try:
        data = json.loads(content)
        return data if isinstance(data, list) else [data]
    except:
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            try: return json.loads(match.group(0))
            except: pass
    return []

def _extract_revision_notes(reviewed: list | None) -> str:
    if not reviewed: return "無"
    notes = []
    for item in reviewed:
        if not isinstance(item, dict): continue
        s = item.get("score", {})
        total = s.get("total", s) if isinstance(s, dict) else s
        rev = item.get("revision_notes")
        if total < 35 and rev:
            notes.append(f"「{item.get('topic_title', '?')}」：{rev}")
    return "\n".join(notes) if notes else "無"

# ============================================================
# Node 定義
# ============================================================

def supervisor(state: CreativeState) -> Command:
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.5)
    summary = _build_state_summary(state)
    response = llm.invoke([
        SystemMessage(content=DIRECTOR_SYSTEM_PROMPT),
        HumanMessage(content=f"目前狀態：\n{summary}\n\n請決定下一步。")
    ])
    decision = _parse_director_decision(_normalize_content(response.content))
    next_node = decision.get("next", "FINISH")
    
    if next_node == "FINISH" or next_node not in {"curator", "copywriter", "critic"}:
        return Command(goto="output", update={"director_notes": decision.get("notes", "")})
    
    return Command(goto=next_node, update={"director_notes": decision.get("notes", "")})

def curator(state: CreativeState) -> Command:
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.8)
    prompt = CURATOR_PROMPT.format(
        trends_summary=state.trends_summary or "無趨勢資料，請發揮創意",
        trends_hashtags=state.trends_hashtags or "無",
        product_info=state.product_info,
        weather_info=state.weather_info or "未提供",
        holiday_info=state.holiday_info or "未提供",
        director_notes=state.director_notes
    )
    response = llm.invoke(prompt)
    topics = _parse_json_response(_normalize_content(response.content))
    return Command(goto="supervisor", update={"topics": topics})

def copywriter(state: CreativeState) -> Command:
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.9)
    prompt = COPYWRITER_PROMPT.format(
        topics=json.dumps(state.topics, ensure_ascii=False),
        product_info=state.product_info,
        revision_notes=_extract_revision_notes(state.reviewed),
        director_notes=state.director_notes
    )
    response = llm.invoke(prompt)
    drafts = _parse_json_response(_normalize_content(response.content))
    return Command(goto="supervisor", update={"drafts": drafts})

def critic(state: CreativeState) -> Command:
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)
    prompt = CRITIC_PROMPT.format(drafts=json.dumps(state.drafts, ensure_ascii=False))
    response = llm.invoke(prompt)
    reviewed = _parse_json_response(_normalize_content(response.content))
    return Command(goto="supervisor", update={"reviewed": reviewed, "retry_count": state.retry_count + 1})

def output(state: CreativeState) -> dict:
    """格式化最終輸出，具備數據類型保護機制"""
    print("--- Output: Finalizing Options ---")
    source = state.reviewed or state.drafts or []
    options = []
    for item in source:
        if not isinstance(item, dict): continue
        s = item.get("score", 0)
        # 修正關鍵：解決 'int' object has no attribute 'get' 的點
        total = s.get("total", s) if isinstance(s, dict) else s
        options.append({
            "topic_title": item.get("topic_title", ""),
            "bridge_idea": item.get("bridge_idea", ""),
            "threads_copy": item.get("threads_copy", ""),
            "ig_copy": item.get("ig_copy", ""),
            "hook_line": item.get("hook_line", ""),
            "score": total
        })
    return {"final_options": options}

# ============================================================
# Graph 組裝 & Pipeline 執行
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
    return graph.compile()

STAGES = {
    "preparing": {"progress": 5, "message": "準備素材中..."},
    "curating":  {"progress": 25, "message": "趨勢選題中..."},
    "writing":   {"progress": 55, "message": "文案撰寫中..."},
    "reviewing": {"progress": 80, "message": "品質審核中..."},
    "polishing": {"progress": 90, "message": "潤飾修改中..."},
    "done":      {"progress": 100, "message": "完成！"},
}

def run_generation_pipeline(app, task_id, tasks_store, **input_data):
    with app.app_context():
        try:
            tasks_store[task_id].update({"stage": "preparing", **STAGES["preparing"]})
            creative_app = build_creative_graph()
            
            # 使用更穩定的狀態讀取方式
            last_state = input_data
            for event in creative_app.stream(input_data):
                node_name = list(event.keys())[0] if event else None
                if node_name:
                    # 合併節點輸出至本地狀態
                    node_output = event[node_name]
                    if isinstance(node_output, dict):
                        last_state = {**last_state, **node_output}
                    
                    # 動態更新 Flask task 狀態
                    if node_name == "curator":
                        tasks_store[task_id].update({"stage": "curating", **STAGES["curating"]})
                    elif node_name == "copywriter":
                        stage = "polishing" if tasks_store[task_id].get("stage") == "reviewing" else "writing"
                        tasks_store[task_id].update({"stage": stage, **STAGES[stage]})
                    elif node_name == "critic":
                        tasks_store[task_id].update({"stage": "reviewing", **STAGES["reviewing"]})

            tasks_store[task_id].update({
                "stage": "done",
                **STAGES["done"],
                "result": {"options": last_state.get("final_options", [])}
            })
        except Exception as e:
            import traceback
            print(f"Pipeline Error:\n{traceback.format_exc()}")
            tasks_store[task_id].update({"stage": "error", "message": str(e), "progress": 0})

def get_gemini_client():
    from google import genai
    return genai.Client(
        api_key=os.getenv("GEMINI_API_KEY"),
        http_options={'api_version': 'v1beta'}
    )