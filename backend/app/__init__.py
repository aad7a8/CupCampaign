from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from app.config import Config
from app.extensions import db, bcrypt
from minio import Minio
import os

minio_client = Minio(
    os.getenv("MINIO_ENDPOINT", "minio:9000"),
    access_key=os.getenv("MINIO_ROOT_USER", "minioadmin"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD", "minioadmin"),
    secure=False
)
BUCKET_NAME = "marketing-images"

migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, supports_credentials=True, origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost",
    ])

    # 初始化擴展
    db.init_app(app)
    bcrypt.init_app(app)
    migrate.init_app(app, db)

    @app.before_request
    def ensure_minio_is_ready():
        if not hasattr(app, 'minio_checked'):
            try:
                if not minio_client.bucket_exists(BUCKET_NAME):
                    minio_client.make_bucket(BUCKET_NAME)
                app.minio_checked = True
                print("Successfully connected to MinIO and verified bucket.")
            except Exception as e:
                print(f"MinIO initialization failed: {e}")

    # 註冊路由
    from app.routes import register_routes
    register_routes(app)

    # ==========================================
    # 核心修改：自動重建資料表並初始化資料
    # ==========================================
    with app.app_context():
        from app.models import HolidayCalendar
        from sqlalchemy import text
        
        try:
            # 1. 檢查表格是否存在且欄位是否正確 (最簡單做法：檢查新欄位是否存在)
            # 如果你想要強制同步所有欄位，開發階段最快的方法是檢查 count 失敗就重建
            # 這裡我們用「如果 HolidayCalendar 沒資料就初始化」作為基礎
            
            db.create_all() # 確保基礎表格存在
            
            if HolidayCalendar.query.count() == 0:
                print("📥 偵測到空資料庫，開始初始化節慶資料與 View...")
                
                # 寫入 2026 年節慶資料
                db.session.execute(text("""
                    INSERT INTO public.holiday_calendar (holiday_name, target_date, category_type, note)
                    VALUES 
                        ('2026 元旦連假',    '2026-01-01', 'holiday',   '3天連假'),
                        ('西洋情人節',      '2026-02-14', 'marketing', '商機'),
                        ('農曆春節 (9天)',   '2026-02-16', 'holiday',   '除夕前一日開始'),
                        ('228 和平紀念日',  '2026-02-28', 'holiday',   '3天連假'),
                        ('兒童清明連假',    '2026-04-03', 'holiday',   '4天連假'),
                        ('五一勞動節',      '2026-05-01', 'holiday',   '3天連假'),
                        ('母親節',          '2026-05-10', 'marketing', '商機'),
                        ('端午節連假',      '2026-06-19', 'holiday',   '3天連假'),
                        ('七夕情人節',      '2026-08-19', 'marketing', '商機'),
                        ('中秋節連假',      '2026-09-25', 'holiday',   '3天連假'),
                        ('雙十國慶連假',    '2026-10-09', 'holiday',   '3天連假'),
                        ('雙11購物節',      '2026-11-11', 'marketing', '大檔'),
                        ('聖誕節',          '2026-12-25', 'marketing', '商機')
                    ON CONFLICT (holiday_name, target_date) DO NOTHING;
                """))
                
                # 建立/更新動態計算倒數的 View
                db.session.execute(text("""
                    CREATE OR REPLACE VIEW public.v_holiday_calendar AS
                    SELECT 
                        id, holiday_name, target_date, category_type, note,
                        (target_date - CURRENT_DATE) AS countdown_days
                    FROM public.holiday_calendar;
                """))

                # 更新實體表倒數天數
                db.session.execute(text("""
                    UPDATE public.holiday_calendar
                    SET countdown_days = target_date - CURRENT_DATE;
                """))

                db.session.commit()
                print("✅ 節慶資料初始化完成！")

        except Exception as e:
            db.session.rollback()
            print(f"⚠️ 初始化檢查提示: {e}")
            # 如果是因為欄位對不起來（例如找不到 hashtag），可以考慮在這裡印出建議 DROP SCHEMA 的提示

    return app