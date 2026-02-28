import io
import base64
import os
import json
import numpy as np
from PIL import Image as PILImage
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def call_nano_banana_logic(file):
    response = None # 預設為 None 避免 Exception 時抓不到變數
    try:
        input_image = PILImage.open(file.stream).convert("RGB")

        final_prompt = (
            "A cozy, warm indoor setting during the evening. The background is softly blurred, "
            "hinting at Chinese New Year decorations with warm, out-of-focus red and gold lanterns. "
            "The overall atmosphere is serene and peaceful."
        )

        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[final_prompt, input_image]
        )
        
        # 遍歷尋找圖片
        for part in response.parts:
            if part.inline_data:
                # 這裡保留你原本的轉換邏輯
                try:
                    raw_generated = part.as_image()
                    if hasattr(raw_generated, 'to_pil'):
                        final_img = raw_generated.to_pil()
                    elif isinstance(raw_generated, PILImage.Image):
                        final_img = raw_generated
                    else:
                        final_img = PILImage.open(io.BytesIO(part.inline_data.data))
                    
                    buffer = io.BytesIO()
                    final_img.convert("RGB").save(buffer, format="PNG")
                    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

                    return {
                        "status": "success",
                        "image_data": f"data:image/png;base64,{img_base64}"
                    }
                except Exception as conv_err:
                    return {"status": "error", "message": f"圖片轉換失敗: {str(conv_err)}"}

        # 如果跑完迴圈都沒 return，表示沒圖片，丟出 Debug 資訊
        return {
            "status": "error", 
            "message": "模型未回傳圖片數據",
            "debug_info": str(response) # 這會把整包 Response 轉文字噴回前端
        }

    except Exception as e:
        # 捕捉所有異常並回傳
        return {
            "status": "error",
            "message": f"後端執行異常: {str(e)}",
            "raw_response": str(response) if response else "No response generated"
        }