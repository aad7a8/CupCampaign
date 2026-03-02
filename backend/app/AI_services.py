import os
import re
import time
from google import genai
from dotenv import load_dotenv


load_dotenv()


# 階段定義 & 進度對應
STAGES = {
    "collecting":       {"progress": 10,  "message": "蒐集素材中..."},
    "reporting":        {"progress": 30,  "message": "分析報告中..."},
    "generating_copy":  {"progress": 50,  "message": "生成文案中..."},
    "reviewing":        {"progress": 75,  "message": "品質檢查中..."},
    "retrying":         {"progress": 50,  "message": "重新生成文案... (第{n}次)"},
    "done":             {"progress": 100, "message": "完成！"},
    "error":            {"progress": 0,   "message": "生成失敗"},
}


def run_generation_pipeline(app, task_id, tasks_store, product_info, news_context,
                            promotion_info, mood_tone, weather_info, holiday_info):
    """非同步 pipeline：蒐集素材→分析報告→生成文案→品質檢查→完成"""
    with app.app_context():
        def update_stage(stage, extra_msg=""):
            info = STAGES[stage].copy()
            if extra_msg:
                info["message"] = extra_msg
            tasks_store[task_id].update({"stage": stage, **info})

        try:
            update_stage("collecting")
            # 蒐集素材（目前直接用傳入的參數）
            time.sleep(0.5)

            update_stage("reporting")
            # 分析報告
            time.sleep(0.5)

            update_stage("generating_copy")
            # 生成文案
            ai_result = generate_drink_post(
                product_info=product_info,
                news_context=news_context,
                promotion_info=promotion_info,
                mood_tone=mood_tone,
                weather_info=weather_info,
                holiday_info=holiday_info,
            )

            if ai_result is None:
                raise Exception("AI 模型回傳空結果")

            update_stage("reviewing")
            # 品質檢查（目前直接通過）
            time.sleep(0.5)

            update_stage("done")
            tasks_store[task_id]["result"] = ai_result

        except Exception as e:
            update_stage("error", str(e))


def get_gemini_client():
    # 確保 .env 檔案中有 GEMINI_API_KEY
    return genai.Client(
        api_key=os.getenv("GEMINI_API_KEY"),
        http_options={'api_version': 'v1beta'}
    )

def generate_drink_post(product_info, news_context, promotion_info, mood_tone, weather_info, holiday_info):
    # client = get_gemini_client()
    
    # 修正 1: 使用 f-string 注入變數
    # FB Prompt
    fb_prompt = f"""
    你現在是一名經驗豐富的 Facebook 社群經營專家。你的專長在於在地社群經營與資訊深度傳達。
    # 任務目標：針對「{product_info}」撰寫 FB 貼文
    # 參考資訊：
    - 在地時事：{news_context if news_context else "無"}
    - 天氣：{weather_info if weather_info else "無"}
    - 優惠資訊：{promotion_info if promotion_info else "無"}
    - 節日：{holiday_info if holiday_info else "無"}
    # 風格調性：{mood_tone}

    # 格式要求：
    1. 【標題】：使用一個能引發共鳴的問句或在地時事作為標題。
    2. 【內文】：將提供的資訊轉化為日常生活場景，清楚說明產品特色與優惠。
    3. 【互動】：結尾必須設計一個「引導留言」或「標記朋友」的機制。
    4. 【Hashtag】：條列 3-5 個精準標籤。
    5. 【字數】：總字數控制在 120~150 字以內。

    最後請加上一段 [DRAW_START] 與 [DRAW_END] 標籤，中間放一段適合此產品的 FB 氛圍圖片生成英文 prompt，只需描述背景與光影。
    """

    # IG Prompt (修正 2: 避免變數覆蓋)
    ig_prompt = f"""
        你現在是一名專業的 IG 社群經理。你的專長是視覺化敘事與情感連結。
        # 任務目標：針對「{product_info}」撰寫視覺化敘事文案
        # 風格調性：{mood_tone}
        # 參考資訊：
        - 在地時事：{news_context if news_context else "無"}
        - 天氣：{weather_info if weather_info else "無"}
        - 優惠資訊：{promotion_info if promotion_info else "無"}
        - 節日：{holiday_info if holiday_info else "無"}
        # 風格調性：{mood_tone} 
        
        
        # 格式要求：
        1. 【第一行】：吸睛標題 (必須包含 Emoji + 標題)。
        2. 【內文】：分段清晰，使用簡短有力的短句，適合手機滑動閱讀，強調感官體驗。
        3. 【Hashtag】：條列 3-5 個熱門 Hashtag。
        4. 【字數】：總字數控制在 100~130 字以內。

        最後請加上一段 [DRAW_START] 與 [DRAW_END] 標籤，中間放一段適合此產品的 IG 風格圖片生成英文 prompt，只需描述場景背景。
        """

    try:
        # --- 🟢 以下開始是「測試用假資料」取代區 ---
        
        # 💡 這裡我們模擬 Gemini 回傳的兩段文案與圖片 Prompt
        content_fb = f"【FB 測試文案】\n🥤 {product_info} 來囉！\n今日天氣 {weather_info} 最適合來一杯。\n目前的活動：{promotion_info} \n#手搖飲 #測試"
        content_ig = f"【IG 測試文案】\n✨ {product_info} ✨\n在 {holiday_info} 也要對自己好一點 ❤️\n#instadrink #yummy"
        
        extracted_fb_img = "A refreshing fruit tea with floating ice cubes, sunny cafe background."
        extracted_ig_img = "Close-up of a bubble tea on a minimal pastel pink background."
        
        # 呼叫 Gemini 模型 (建議使用 gemini-2.0-flash 或 gemini-1.5-flash)
        # model_id = "gemini-2.0-flash" 
        
        # response_fb = client.models.generate_content(model=model_id, contents=fb_prompt)
        # content_fb = response_fb.text
        
        # response_ig = client.models.generate_content(model=model_id, contents=ig_prompt)
        # content_ig = response_ig.text
        
        # 使用正則表達式提取英文 Prompt
        # img_prompt_fb = re.search(r"\[DRAW_START\](.*?)\[DRAW_END\]", content_fb, re.DOTALL)
        # img_prompt_ig = re.search(r"\[DRAW_START\](.*?)\[DRAW_END\]", content_ig, re.DOTALL)
        
        # extracted_fb_img = img_prompt_fb.group(1).strip() if img_prompt_fb else ""
        # extracted_ig_img = img_prompt_ig.group(1).strip() if img_prompt_ig else ""
        
        return {
            "facebook": content_fb,
            "instagram": content_ig,
            "fb_img_prompt": extracted_fb_img,
            "ig_img_prompt": extracted_ig_img
        }

    except Exception as e:
        print(f"Gemini 執行出錯: {e}")
        return None