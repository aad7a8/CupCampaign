from google import genai
from google.genai import types
from PIL import Image
import os
import io
import requests  # 💡 新增：用來從網址抓取圖片數據
from dotenv import load_dotenv
import uuid
from app.extensions import minio_client, BUCKET_NAME,MINIO_EXTERNAL_URL
load_dotenv()


# 💡 修改點 1：將 input_image_path 改為 input_image_url
def create_image_from_prompt(input_image_url, prompt=None):
    internal_url = input_image_url.replace("localhost", "minio").replace("127.0.0.1", "minio")
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    # 1. 準備模型 ID
    MODEL_ID = "gemini-3-pro-image-preview"

    # 💡 修改點 2：改用 requests 從網址讀取圖片
    try:
        response_img = requests.get(internal_url)
        if response_img.status_code != 200:
            print(f"錯誤：無法從網址取得圖片，狀態碼：{response_img.status_code}")
            return None
        
        # 將抓到的內容轉成 PIL Image 物件
        image = Image.open(io.BytesIO(response_img.content))

    except Exception as e:
        print(f"讀取圖片網址時發生錯誤：{e}")
        return None

    # 處理 Prompt 邏輯
    if not prompt:
        prompt = "A cozy, warm indoor setting during the evening. The background is softly blurred, hinting at Chinese New Year decorations with warm, out-of-focus red and gold lanterns. Dramatic sidelight from a nearby lamp casts long, soft shadows and creates a gentle golden glow on the surface. The overall atmosphere is serene and peaceful, a quiet moment amidst a festive celebration."

    # 3. 呼叫 generate_content
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[prompt, image]    
        )

        # 4. 處理回應
        found_image = False
        for part in response.parts:
            if part.inline_data:
                found_image = True
                return part.as_image()  # 💡 回傳 PIL 物件
            elif part.text:
                print(f"模型回傳文字資訊: {part.text}")
        
        if not found_image:
            print("模型未回傳任何圖片數據。")

    except Exception as e:
        print(f"呼叫 API 時發生錯誤: {e}")
        return None

def save_pil_to_minio(pil_img):
    """
    將 PIL 圖片物件轉成 Bytes 並上傳至 MinIO，回傳可存取的網址
    """
    if not pil_img:
        return None

    try:
        img_byte_arr = io.BytesIO()
        pil_img.save(img_byte_arr, format='PNG')
        img_data = img_byte_arr.getvalue()

        filename = f"ai-gen-{uuid.uuid4()}.png"

        minio_client.put_object(
            BUCKET_NAME,
            filename,
            io.BytesIO(img_data),
            length=len(img_data),
            content_type="image/png"
        )

        return f"{MINIO_EXTERNAL_URL}/{BUCKET_NAME}/{filename}"
    
    except Exception as e:
        print(f"上傳 AI 圖片至 MinIO 失敗: {e}")
        return None

if __name__ == "__main__":
    # 💡 測試用網址 (請確保這張圖在妳的 MinIO 裡是存在的)
    test_url = "http://127.0.0.1:9000/marketing-images/123.jpg"
    print("正在從網址讀取圖片並產生 AI 新圖...")
    
    result_img = create_image_from_prompt(test_url)
    if result_img:
        new_url = save_pil_to_minio(result_img, "marketing-images")
        print(f"成功！新的 AI 圖片網址為：{new_url}")