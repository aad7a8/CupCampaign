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
    # 自動重建資料表並初始化資料
    # ==========================================
    with app.app_context():
        from app.models import HolidayCalendar, Tenant, Ingredient
        from sqlalchemy import text
        
        # 確保基礎表格存在
        db.create_all()
        print("✅ 所有資料表已建立完成") 

        # --- 1. 初始化節慶資料 ---
        try:
                
                # 寫入 2026 年節慶資料
                db.session.execute(text("""
                    INSERT INTO public.holiday_calendar (holiday_name, target_date, category_type, note)
                    VALUES 
                        ('2026 元旦連假',    '2026-01-01', 'holiday',   '3天連假'),
                        ('西洋情人節',      '2026-02-14', 'marketing', '商機'),
                        ('農曆春節 (9天)',   '2026-02-16', 'holiday',   '除夕前一日開始'),
                        ('228 和平紀念日',  '2026-02-28', 'holiday',   '3天連假'),
                        ('白色情人節',      '2026-03-14', 'marketing', '商機'),
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
            print(f"⚠️ 節慶初始化檢查提示: {e}")

        # --- 2. 初始化手搖飲品牌資料 ---
        try:
            target_brands = [
                '功夫茶', '大茗本位製茶堂', '得正', '先喝道', 
                '清心福全', '迷克夏', 'comebuy', '龜記', 
                '五十嵐', 'coco都可'
            ]

            print("🏢 檢查品牌資料初始化...")
            
            added_count = 0
            for brand_name in target_brands:
                # 先檢查資料庫有沒有這個品牌
                existing_tenant = Tenant.query.filter_by(name=brand_name).first()
                
                # 如果沒有，才把它加進去
                if not existing_tenant:
                    new_tenant = Tenant(name=brand_name, is_registered=True)
                    db.session.add(new_tenant)
                    added_count += 1
            
            # 最後一次過提交所有變更
            db.session.commit()
            
            if added_count > 0:
                print(f"✅ 成功新增 {added_count} 家品牌！目前共有 {Tenant.query.count()} 家品牌。")
            else:
                print(f"✅ 品牌皆已存在，無須新增。目前共有 {Tenant.query.count()} 家品牌。")

        except Exception as e:
            db.session.rollback()
            print(f"⚠️ 品牌初始化提示: {e}")

# --- 3. 初始化原物料(水果)資料 (包含 12 個月價格矩陣) ---
        try:
            # 1: 最佳(低價), 2: 適合, 3: 偏高, 4: 高價, 0: 無資料(非產季)
            FRUIT_MATRIX_MAP = {
                "草莓": [4, 3, 1, 1, 1, 1, 0, 0, 0, 1, 3, 4],
                "百香果-其他": [1, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 2],
                "鳳梨-金鑽鳳梨": [1, 2, 2, 3, 2, 1, 1, 4, 4, 4, 4, 2],
                "甜橙-柳橙": [3, 4, 4, 3, 3, 3, 0, 1, 2, 2, 3, 3],
                "雜柑-檸檬": [4, 4, 3, 3, 4, 2, 1, 1, 1, 2, 3, 4],
                "酪梨-進口": [1, 1, 1, 3, 4, 3, 4, 3, 2, 1, 2, 1],
                "葡萄柚-紅肉": [3, 3, 3, 4, 3, 1, 0, 3, 2, 2, 3, 3],
                "番石榴-紅心": [4, 2, 2, 1, 2, 2, 1, 1, 2, 2, 4, 4],
                "芒果-其他": [2, 3, 4, 4, 2, 1, 1, 1, 1, 1, 2, 3],
                "蘋果-惠": [1, 2, 4, 0, 0, 0, 3, 1, 1, 1, 1, 3]
            }

            print("🍎 正在同步原物料(水果)採購建議矩陣...")
            
            added_fruit_count = 0
            updated_fruit_count = 0

            for fruit_name, matrix in FRUIT_MATRIX_MAP.items():
                existing_fruit = Ingredient.query.filter_by(name=fruit_name).first()
                
                if not existing_fruit:
                    # 不存在則建立，並塞入矩陣
                    new_fruit = Ingredient(name=fruit_name, monthly_status_matrix=matrix)
                    db.session.add(new_fruit)
                    added_fruit_count += 1
                else:
                    # 若已存在，則覆蓋更新矩陣 (確保舊資料能更新到最新分析結果)
                    existing_fruit.monthly_status_matrix = matrix
                    updated_fruit_count += 1
            
            db.session.commit()
            
            if added_fruit_count > 0 or updated_fruit_count > 0:
                print(f"✅ 水果矩陣更新完成！(新增: {added_fruit_count}, 更新: {updated_fruit_count})")
            else:
                print(f"✅ 水果矩陣已是最新狀態。")

        except Exception as e:
            db.session.rollback()
            print(f"⚠️ 原物料初始化提示: {e}")

    return app