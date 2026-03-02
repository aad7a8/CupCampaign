from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from minio import Minio
import os

# 1. 初始化資料庫與加密器 (維持團隊風格)
db = SQLAlchemy()
bcrypt = Bcrypt()

# 2. 初始化 MinIO 客戶端 (將邏輯搬進來，但名稱要對齊團隊的 .env)
# 💡 注意：這裡的變數名稱要對應團隊 .env 裡的 MINIO_ROOT_USER
minio_client = Minio(
    os.getenv("MINIO_ENDPOINT", "minio:9000"),
    access_key=os.getenv("MINIO_ROOT_USER", "minioadmin"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD", "minioadmin"),
    secure=False
)

# 3. 定義全域常數 (方便其他 API 引用)
BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "marketing-images")
MINIO_EXTERNAL_URL = os.getenv("MINIO_EXTERNAL_URL", "http://localhost:9000")