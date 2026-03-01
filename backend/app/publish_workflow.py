import os
import io
import time
import json
import requests
from datetime import datetime, timezone
from minio import Minio
from app import db 

# --- 根據你的 .env 圖片修正變數讀取 ---
IG_ID = os.getenv("IG_ID")
ACCESS_TOKEN = os.getenv("IG_ACCESS_TOKEN")
GRAPH_URL = os.getenv("IG_GRAPH_URL", "https://graph.facebook.com/v25.0")

# MinIO 連線資訊
minio_client = Minio(
    os.getenv("MINIO_ENDPOINT", "minio:9000"),
    access_key=os.getenv("MINIO_ROOT_USER"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD"),
    secure=False
)

def auto_post_to_ig(image_url, caption):
    """Instagram 發佈邏輯"""
    try:
        print(f"📸 [IG] 開始建立媒體容器，URL: {image_url}", flush=True)
        container_url = f"{GRAPH_URL}/{IG_ID}/media"
        payload = {'image_url': image_url, 'caption': caption, 'access_token': ACCESS_TOKEN}
        
        res_container = requests.post(container_url, data=payload).json()
        if 'id' not in res_container:
            print(f"❌ [IG] 容器建立失敗: {res_container}", flush=True)
            return

        creation_id = res_container['id']
        print(f"⏳ [IG] 容器 ID: {creation_id}，等待 15 秒讓 Meta 處理...", flush=True)
        time.sleep(15) 

        publish_url = f"{GRAPH_URL}/{IG_ID}/media_publish"
        res_publish = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': ACCESS_TOKEN}).json()
        
        if 'id' in res_publish:
            print(f"🎉 [IG] 貼文發布成功！ID: {res_publish['id']}", flush=True)
        else:
            print(f"❌ [IG] 正式發布失敗: {res_publish}", flush=True)
    except Exception as e:
        print(f"💥 [IG] API 呼叫異常: {str(e)}", flush=True)

def ensure_bucket_exists(bucket_name):
    """確保 MinIO Bucket 存在並設定為公開讀取"""
    try:
        if not minio_client.bucket_exists(bucket_name):
            print(f"🪣 [MinIO] 建立儲存桶: {bucket_name}", flush=True)
            minio_client.make_bucket(bucket_name)
            
            # 設定 Bucket Policy 為 Read-Only (讓 IG 伺服器能抓圖)
            policy = {
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}"]
                }, {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                }]
            }
            minio_client.set_bucket_policy(bucket_name, json.dumps(policy))
            print(f"✅ [MinIO] {bucket_name} 已建立並設定公開權限", flush=True)
    except Exception as e:
        print(f"⚠️ [MinIO] 檢查/建立儲存桶失敗: {str(e)}", flush=True)

def run_workflow(app, product_name, caption, image_binary_data, store_id, platform):
    """完整發佈流程"""
    with app.app_context():
        try:
            print(f"🚀 [Workflow] 啟動流程: {product_name} (平台: {platform})", flush=True)
            
            # 1. 確保並上傳至 MinIO
            bucket_name = "tea-master-images"
            ensure_bucket_exists(bucket_name) # 修正 NoSuchBucket 關鍵點
            
            file_name = f"post_{int(time.time())}.png"
            minio_client.put_object(
                bucket_name,
                file_name,
                io.BytesIO(image_binary_data),
                length=len(image_binary_data),
                content_type='image/png'
            )
            
            internal_url = f"http://{os.getenv('MINIO_ENDPOINT')}/{bucket_name}/{file_name}"
            print(f"✅ [Workflow] MinIO 上傳成功: {internal_url}", flush=True)

            # 2. 轉換為外部連結
            external_url = internal_url.replace("minio:9000", os.getenv("EXTERNAL_DOMAIN"))
            external_url = external_url.replace("http://", "https://")

            # 3. 存入資料庫
            from app.models import MarketingContent, ContentImage
            new_content = MarketingContent(
                store_id=store_id,
                generated_text=caption,
                product_name=product_name,
                platform=platform,
                created_at=datetime.now(timezone.utc)
            )
            db.session.add(new_content)
            db.session.flush()

            new_image = ContentImage(
                content_id=new_content.id,
                minio_url=internal_url,
                prompt_used="User confirmed AI generated image"
            )
            db.session.add(new_image)
            db.session.commit()
            print("✅ [Workflow] 資料庫寫入成功", flush=True)

            # 4. 執行發布
            if platform in ['ig', 'sync']:
                auto_post_to_ig(external_url, caption)

        except Exception as e:
            db.session.rollback()
            print(f"❌ [Workflow] 執行失敗: {str(e)}", flush=True)