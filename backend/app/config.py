import os
from dotenv import load_dotenv

# 讀取 .env 檔案中的環境變數
load_dotenv()

class Config:
    # 使用 getenv 的第二個參數作為預設值，防止 None 導致字串拼接出錯
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
    DB_HOST = os.getenv('DB_HOST', 'postgres')  # 預設對應 Docker 服務名
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'cup_campaign_db')

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 💡 也可以把 SECRET_KEY 放在這裡管理
    SECRET_KEY = os.getenv("MY_APP_SECRET_KEY", "default_secret_key")


    MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
    # 這裡抓取團隊 .env 中的管理員帳密
    MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "minioadmin") 
    MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
    MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "marketing-images")
    MINIO_EXTERNAL_URL = os.getenv("MINIO_EXTERNAL_URL", "http://localhost:9000")