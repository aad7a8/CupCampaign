import os
from dotenv import load_dotenv

# 讀取 .env 檔案中的環境變數
load_dotenv()

class Config:
    # 組合連線字串：postgresql://使用者:密碼@主機:埠/資料庫名稱
    # 這裡的變數名稱要對應到 .env 裡的 key
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
        f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    )
    
    # 關閉 SQLAlchemy 的追蹤修改功能，以節省記憶體並提升效能
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 預留空間：之後若有 OpenAI 或 Flux 的 API Key 也可以加在這裡
    # OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')