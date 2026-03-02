import os
import re
from google import genai
from dotenv import load_dotenv


load_dotenv()


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("環境變數中缺少 GEMINI_API_KEY")
    # 確保 .env 檔案中有 GEMINI_API_KEY
    return genai.Client(
        api_key=os.getenv("GEMINI_API_KEY"),
        http_options={'api_version': 'v1beta'}
    )

def generate_drink_post(platform,product_info, news_context, promotion_info, weather_info, holiday_info):
    client = get_gemini_client()
    
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
    - 風格調性：
                1.社畜生存
                2.時事迷因
                3.質感儀式
    # 格式要求：
    1. 【標題】：使用一個能引發共鳴的問句或在地時事作為標題。
    2. 【內文】：將提供的資訊轉化為日常生活場景，清楚說明產品特色與優惠。
    3. 【互動】：結尾必須設計一個「引導留言」或「標記朋友」的機制。
    4. 【Hashtag】：條列 3-5 個精準標籤。
    5. 【字數】：總字數控制在 130~150 字以內。
    6. 【篇幅】：依照提供三種的風格調性產出一篇文章。
    
    最後請加上一段 [DRAW_START] 與 [DRAW_END] 標籤，中間放一段適合此產品的 FB 氛圍，提供給stable diffusion inpainting模型進行圖片生成所使用英文 prompt，只需描述背景與光影。
    """

    # IG Prompt (修正 2: 避免變數覆蓋)
    ig_prompt = f"""
        你現在是一名專業的 IG 社群經理。你的專長是視覺化敘事與情感連結。
        # 任務目標：針對「{product_info}」撰寫視覺化敘事文案
        # 參考資訊：
        - 在地時事：{news_context if news_context else "無"}
        - 天氣：{weather_info if weather_info else "無"}
        - 優惠資訊：{promotion_info if promotion_info else "無"}
        - 節日：{holiday_info if holiday_info else "無"}
        # 風格調性：
                    1.社畜生存
                    2.時事迷因
                    3.質感儀式
                    
        # 格式要求：
        1. 【第一行】：吸睛標題 (必須包含 Emoji + 標題)。
        2. 【內文】：分段清晰，使用簡短有力的短句，適合手機滑動閱讀，強調感官體驗。
        3. 【Hashtag】：條列 3-5 個熱門 Hashtag。
        4. 【字數】：總字數控制在 130~150 字以內。
        5. 【篇幅】：依照提供三種的風格調性產出一篇文章。

        最後請加上一段 [DRAW_START] 與 [DRAW_END] 標籤，中間放一段適合此產品的 IG 風格，提供給stable diffusion inpainting模型進行圖片生成所使用英文 prompt，只需描述背景與光影。
        """

    try:
        # 呼叫 Gemini 模型 (建議使用 gemini-2.0-flash 或 gemini-1.5-flash)
        model_id = "gemini-2.5-pro"  # 可根據需要選擇不同版本
        
        if platform == "facebook":
            response = client.models.generate_content(model=model_id, contents=fb_prompt)
        elif platform == "instagram":
            response = client.models.generate_content(model=model_id, contents=ig_prompt)
        else:
            raise ValueError("不支援的平台")
        
        content = response.text
        
        if platform == "facebook":
            content_fb = content
            # 使用正則表達式提取英文 Prompt
            img_prompt_fb = re.search(r"\[DRAW_START\](.*?)\[DRAW_END\]", content_fb, re.DOTALL)
            extracted_fb_img = img_prompt_fb.group(1).strip() if img_prompt_fb else ""
            return {
            "facebook": content_fb,           
            "fb_img_prompt": extracted_fb_img,            
        }
        elif platform == "instagram":
            content_ig = content
            # 使用正則表達式提取英文 Prompt
            img_prompt_ig = re.search(r"\[DRAW_START\](.*?)\[DRAW_END\]", content_ig, re.DOTALL)
            extracted_ig_img = img_prompt_ig.group(1).strip() if img_prompt_ig else ""
            return {
        
            "instagram": content_ig,            
            "ig_img_prompt": extracted_ig_img
        }
        

    except Exception as e:
        print(f"Gemini 執行出錯: {e}")
        return None
    
if __name__ == "__main__": 
    result = generate_drink_post(platform="facebook",product_info="半熟烏龍厚乳",news_context="2024年228連假期間，受兩波鋒面及東北季風影響，全台降雨機率高，北台灣氣溫明顯下降並有較大雨勢，高山地區可能降雪，顯現春雨特徵。", promotion_info="", weather_info="", holiday_info="")
    print(result)