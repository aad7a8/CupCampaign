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
        # ⚠️ 這裡新增了 MarketingContent
        from app.models import HolidayCalendar, Tenant, Ingredient, Store, Users, MarketingContent
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
            if Tenant.query.count() == 0:
                print("🏢 開始初始化品牌資料...")
                
                db.session.execute(text("""
                    INSERT INTO public.tenant (name, is_registered)
                    VALUES 
                    ('功夫茶', true), ('大茗本位製茶堂', true), ('得正', true), 
                    ('先喝道', true), ('清心福全', true), ('迷客夏', true), 
                    ('comebuy', true), ('龜記', true), ('五十嵐', true), ('coco都可', true)
                    ON CONFLICT (name) DO NOTHING;
                """))
                
                # 重置 ID 流水號
                db.session.execute(text("SELECT setval(pg_get_serial_sequence('tenant', 'id'), coalesce(max(id),0) + 1, false) FROM public.tenant;"))
                db.session.commit()
                print("✅ 品牌資料初始化完成！")
            else:
                print(f"💡 品牌資料已存在 ({Tenant.query.count()} 筆)，跳過初始化。")
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ 品牌初始化提示: {e}")

        # --- 3. 初始化原物料(水果)資料 (包含 12 個月價格矩陣) ---
        try:
            print("🍎 正在同步原物料(水果)採購建議矩陣...")
            
            # 使用 JSON 字串格式化寫入
            import json
            
            fruit_data = [
                ("草莓", json.dumps([4, 3, 1, 1, 1, 1, 0, 0, 0, 1, 3, 4])),
                ("百香果-其他", json.dumps([1, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 2])),
                ("鳳梨-金鑽鳳梨", json.dumps([1, 2, 2, 3, 2, 1, 1, 4, 4, 4, 4, 2])),
                ("甜橙-柳橙", json.dumps([3, 4, 4, 3, 3, 3, 0, 1, 2, 2, 3, 3])),
                ("雜柑-檸檬", json.dumps([4, 4, 3, 3, 4, 2, 1, 1, 1, 2, 3, 4])),
                ("酪梨-進口", json.dumps([1, 1, 1, 3, 4, 3, 4, 3, 2, 1, 2, 1])),
                ("葡萄柚-紅肉", json.dumps([3, 3, 3, 4, 3, 1, 0, 3, 2, 2, 3, 3])),
                ("番石榴-紅心", json.dumps([4, 2, 2, 1, 2, 2, 1, 1, 2, 2, 4, 4])),
                ("芒果-其他", json.dumps([2, 3, 4, 4, 2, 1, 1, 1, 1, 1, 2, 3])),
                ("蘋果-惠", json.dumps([1, 2, 4, 0, 0, 0, 3, 1, 1, 1, 1, 3]))
            ]

            for name, matrix in fruit_data:
                db.session.execute(text("""
                    INSERT INTO public.ingredient (name, monthly_status_matrix)
                    -- ⚠️ 這裡改用 CAST 語法，解決 SQLAlchemy 解析報錯
                    VALUES (:name, CAST(:matrix AS JSON)) 
                    ON CONFLICT (name) 
                    DO UPDATE SET monthly_status_matrix = EXCLUDED.monthly_status_matrix;
                """), {"name": name, "matrix": matrix})
            
            # 重置 ID 流水號
            db.session.execute(text("SELECT setval(pg_get_serial_sequence('ingredient', 'id'), coalesce(max(id),0) + 1, false) FROM public.ingredient;"))
            
            db.session.commit()
            print("✅ 水果矩陣同步完成！")

        except Exception as e:
            db.session.rollback()
            print(f"⚠️ 原物料初始化提示: {e}")

        # --- 4. 初始化分店 (Store) 資料 ---
        try:
            if Store.query.count() == 0:
                print("🏪 開始初始化分店 (Store) 資料...")
                
                # 依據截圖，城市欄位為 location_city
                db.session.execute(text("""
                    INSERT INTO public.store (id, name, location_city, tenant_id)
                    VALUES 
                    (1, '基隆廟口店', '基隆市', 1),
                    (2, '台北通化店', '台北市', 2),
                    (3, '台中美村店', '台中市', 3),
                    (4, '新竹巨城店', '新竹市', 4),
                    (5, '台南總店', '台南市', 5),
                    (6, '桃園站前店', '桃園市', 6),
                    (7, '馬公店', '澎湖縣', 7),
                    (8, '高雄左營店', '高雄市', 8),
                    (9, '彰化曉陽店', '彰化縣', 9),
                    (10, '板橋店', '新北市', 10)
                    ON CONFLICT (id) DO NOTHING;
                """))
                
                # 避免後續新增資料時 ID 衝突，重置 sequence 流水號
                db.session.execute(text("SELECT setval(pg_get_serial_sequence('store', 'id'), coalesce(max(id),0) + 1, false) FROM public.store;"))
                
                db.session.commit()
                print("✅ 分店 (Store) 資料初始化完成！")
            else:
                print(f"💡 分店資料已存在 ({Store.query.count()} 筆)，跳過初始化。")
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ 分店初始化發生錯誤: {e}")

        # --- 5. 初始化使用者 (Users) 資料 ---
        try:
            if Users.query.count() == 0:
                print("👤 開始初始化使用者帳號 (Users) 資料...")
                
                user_credentials = [
                    (1, 'kungfu@cup.com', 'KFtea_2026!'),
                    (2, 'daming@cup.com', 'DMtea_2026!'),
                    (3, 'dejing@cup.com', 'DJtea_2026!'),
                    (4, 'taotao@cup.com', 'TTtea_2026!'),
                    (5, 'chingshin@cup.com', 'CStea_2026!'),
                    (6, 'milksha@cup.com', 'MStea_2026!'),
                    (7, 'comebuy@cup.com', 'CBtea_2026!'),
                    (8, 'guiji@cup.com', 'GJtea_2026!'),
                    (9, '50lan@cup.com', '50Ltea_2026!'),
                    (10, 'coco@cup.com', 'COtea_2026!')
                ]
                
                for store_id, email, password in user_credentials:
                    # 使用 app 已初始化的 bcrypt 進行密碼加密
                    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
                    
                    db.session.execute(text("""
                        INSERT INTO public.users (store_id, email, password_hash)
                        VALUES (:store_id, :email, :password_hash)
                    """), {"store_id": store_id, "email": email, "password_hash": hashed_pw})
                
                # 避免後續新增資料時 ID 衝突，重置 sequence 流水號
                db.session.execute(text("SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id),0) + 1, false) FROM public.users;"))

                db.session.commit()
                print("✅ 使用者帳號 (Users) 資料初始化完成！")
            else:
                print(f"💡 使用者資料已存在 ({Users.query.count()} 筆)，跳過初始化。")
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ 使用者初始化發生錯誤: {e}")

        # --- 6. 初始化行銷文案歷史資料 ---
        try:
            if MarketingContent.query.count() == 0:
                print("📝 偵測到資料表為空，開始初始化行銷貼文歷史資料...")
                
                # 指向 SQL 檔案路徑
                sql_file_path = os.path.join(app.root_path, 'seed_marketing.sql') 
                
                if os.path.exists(sql_file_path):
                    with open(sql_file_path, 'r', encoding='utf-8') as file:
                        sql_script = file.read()
                    
                    import re
                    # 🚀 自動移除 [Text], [OCR], [需人工確認] 等標籤
                    # 這個正則會找 ', '[任何文字]' 並把括號標籤刪掉
                    sql_script = re.sub(r"',\s*'\[.*?\]\s*", "', '", sql_script)
                    
                    # ⚠️ 使用原生連線執行，避免 SQLAlchemy 解析冒號 (:) 導致網址或時間報錯
                    connection = db.engine.raw_connection()
                    try:
                        cursor = connection.cursor()
                        # 執行完整的 SQL 腳本
                        cursor.execute(sql_script)
                        
                        # 重置 ID 流水號 (Sequence)
                        cursor.execute("SELECT setval(pg_get_serial_sequence('marketing_content', 'id'), coalesce(max(id),0) + 1, false) FROM marketing_content;")
                        
                        connection.commit()
                        print(f"✅ 行銷貼文初始化完成！目前的總筆數: {MarketingContent.query.count()}")
                    except Exception as ex:
                        connection.rollback()
                        print(f"❌ SQL 執行失敗！錯誤細節: {ex}")
                    finally:
                        cursor.close()
                        connection.close()
                else:
                    print(f"⚠️ 找不到 SQL 檔案，請確認位置: {sql_file_path}")
            else:
                print(f"💡 資料庫已有 {MarketingContent.query.count()} 筆資料，跳過初始化。")
                
        except Exception as e:
            db.session.rollback()
            print(f"⚠️ 初始化檢查過程發生錯誤: {e}")

    return app