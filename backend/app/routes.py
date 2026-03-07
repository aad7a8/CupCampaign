from flask import jsonify, request, make_response, current_app
from app.models import (
    db, Product, Tenant, MarketingContent, Users, Store,
    Ingredient, PlatformToken, ContentImage, WeatherForecast, HolidayCalendar,
    ExternalTrends
)
from app.image_flow import process_image_generation
from app.AI_services import run_generation_pipeline
from datetime import datetime, timezone, timedelta, date
from app.publish_workflow import run_workflow, auto_post_to_ig
import os
import jwt
import uuid
import io
import json
import requests
import base64
import threading
from PIL import Image as PILImage


SECRET_KEY = os.getenv("MY_APP_SECRET_KEY", "your_fallback_key")

# 全域 task store（in-memory，足夠此規模使用）
generation_tasks = {}

# Task 清理閾值（秒）
TASK_EXPIRY_SECONDS = 300  # 5 分鐘

def register_routes(app):
    from app import minio_client, BUCKET_NAME

    # ==========================================
    # Health check
    # ==========================================
    @app.route('/api/health')
    def health_check():
        return jsonify({"status": "ok"})

    # ==========================================
    # Auth API
    # ==========================================
    @app.route('/api/auth/register', methods=['POST'])
    def handle_register():
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "無效的請求"}), 400
        
        # 對齊前端欄位名稱 (brandName, storeCounty, storeName)
        email = data.get('email', '').strip()
        password = data.get('password')
        tenant_name = data.get('tenant_name', '').strip()
        store_county = data.get('storeCounty', '').strip()
        store_name = data.get('store_name', '').strip()

        if not all([email, password, tenant_name, store_county, store_name]):
            return jsonify({"status": "error", "message": "所有欄位皆為必填"}), 400

        if Users.query.filter_by(email=email).first():
            return jsonify({"status": "error", "message": "Email 已被註冊"}), 400

        try:
            # 1. 處理租戶 (Tenant/品牌)
            tenant = Tenant.query.filter_by(name=tenant_name).first()
            if not tenant:
                tenant = Tenant(name=tenant_name)
                db.session.add(tenant)
                db.session.flush()

            # 2. 處理店鋪 (Store)
            store = Store.query.filter_by(
                tenant_id=tenant.id,
                name=store_name,
                location_city=store_county
            ).first()

            if not store:
                store = Store(
                    tenant_id=tenant.id,
                    name=store_name,
                    location_city=store_county
                )
                db.session.add(store)
                db.session.flush()

            # 3. 建立使用者
            new_user = Users(email=email, store_id=store.id)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()

            return jsonify({
                "status": "success",
                "message": "註冊成功，請前往登入頁面重新登入",
                "redirect": "/login"
            })
        except Exception as e:
            db.session.rollback()
            print(f"Registration Error: {str(e)}")
            return jsonify({"status": "error", "message": f"系統錯誤: {str(e)}"}), 500

    @app.route('/api/auth/login', methods=['POST'])
    def handle_login():
        data = request.json
        email = data.get('username', '').strip()
        password = data.get('password')
        
        user = Users.query.filter_by(email=email).first()
        if user and user.check_password(password):
            payload = {
                "user": str(user.id),
                "store": str(user.store_id),
                "email": email,
                "exp": datetime.now(timezone.utc) + timedelta(hours=24)
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
            resp = make_response(jsonify({
                "status": "success",
                "message": "登入成功",
                "redirect": "/dashboard"
            }))
            resp.set_cookie(
                'access_token',
                token,
                httponly=True,
                samesite='Lax',
                secure=False
            )
            return resp
        return jsonify({"status": "error", "message": "帳號或密碼錯誤"}), 401

    @app.route('/api/auth/logout', methods=['POST'])
    def logout():
        resp = make_response(jsonify({"status": "success", "message": "已登出"}))
        resp.delete_cookie('access_token')
        return resp

    @app.route('/api/stores', methods=['GET'])
    def get_stores():
        stores = Store.query.all()
        return jsonify({
            "status": "success",
            "data": [
                {
                    "store_id": str(s.id),
                    "brand_name": s.tenant.name,
                    "store_name": s.name,
                    "location": s.location_city,
                    "full_display_name": f"{s.tenant.name} - {s.name}"
                } for s in stores
            ]
        })

    # ==========================================
    # Products API
    # ==========================================
    @app.route('/api/admin/products', methods=['GET', 'POST'])
    def handle_products():
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_store_id = decoded.get("store")
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        store = Store.query.get(current_store_id)
        if not store:
            return jsonify({"status": "error", "message": "找不到所屬門市資料"}), 404
        
        target_tenant_id = store.tenant_id

        if request.method == 'GET':
            products = Product.query.filter_by(tenant_id=target_tenant_id).all()
            return jsonify({
                "status": "success",
                "brand_name": store.tenant.name,
                "data": [
                    {
                        "id": p.id,
                        "category": p.category,
                        "name": p.name,
                        "price": float(p.price) if p.price else 0,
                        # 修改點：因為移除了 ProductComposition，GET 時暫時回傳空字串
                        "ingredients_display": "", 
                        "scraped_at": p.scraped_at.strftime('%Y-%m-%d %H:%M:%S') if p.scraped_at else None
                    } for p in products
                ]
            })

        if request.method == 'POST':
            data = request.json
            product_list = data.get('products')
            if not product_list:
                return jsonify({"status": "error", "message": "請至少輸入一項產品"}), 400
            try:
                for item in product_list:
                    # 1. 建立新飲品
                    new_product = Product(
                        tenant_id=target_tenant_id,
                        name=item.get('name'),
                        category=item.get('category'),
                        price=item.get('price'),
                        scraped_at=None
                    )
                    db.session.add(new_product)
                    db.session.flush()

                    # 2. 處理原物料 (全域共用架構，不再綁定 tenant_id 與 ProductComposition)
                    raw_ingredients = item.get('ingredients', '')
                    if raw_ingredients:
                        ing_names = [n.strip() for n in raw_ingredients.replace('，', ',').split(',') if n.strip()]
                        for ing_name in ing_names:
                            # 直接以名稱查詢全域原物料庫
                            ing = Ingredient.query.filter_by(name=ing_name).first()
                            
                            # 若資料庫無此原物料，則新增至全域庫
                            if not ing:
                                ing = Ingredient(name=ing_name)
                                db.session.add(ing)
                                db.session.flush()
                                
                db.session.commit()
                return jsonify({"status": "success", "message": "菜單與原物料庫已更新儲存！"})
            except Exception as e:
                db.session.rollback()
                return jsonify({"status": "error", "message": f"儲存失敗: {str(e)}"}), 500

    # ==========================================
    # Ingredient Matrix API (水果採購矩陣)
    # ==========================================
    @app.route('/api/ingredients/matrix', methods=['GET'])
    def get_ingredient_matrix():
        """ 獲取所有具備採購矩陣的原物料(水果)資料 """
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            # 驗證 Token
            jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except Exception:
            return jsonify({"status": "error", "message": "認證失效，請重新登入"}), 401

        try:
            # 查詢所有有填寫 monthly_status_matrix 的原物料
            # 注意：這裡假設 Ingredient 模型中已有 monthly_status_matrix 欄位
            ingredients = Ingredient.query.filter(Ingredient.monthly_status_matrix.isnot(None)).all()
            
            # 將資料轉換成前端需要的字典格式 (例如: {"草莓": [4,3,1...], "芒果": [...]})
            matrix_map = {}
            for ing in ingredients:
                # 確保資料庫讀出來的是 list (如果是存成 JSON 字串，需依照情況做 json.loads(ing.monthly_status_matrix))
                matrix_map[ing.name] = ing.monthly_status_matrix
            
            return jsonify({
                "status": "success",
                "data": matrix_map
            })

        except Exception as e:
            print(f"Ingredient Matrix Fetch Error: {e}")
            return jsonify({"status": "error", "message": "無法讀取採購矩陣資料"}), 500

    # ==========================================
    # AI Content Generation API
    # ==========================================
    @app.route('/api/generate_post', methods=['POST'])
    def handle_generate_post():
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_record = Users.query.get(decoded.get("user"))
            if not user_record:
                return jsonify({"status": "error", "message": "用戶不存在"}), 404
            current_tenant_id = user_record.store.tenant_id
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "請求格式錯誤"}), 400

        selected_drink = data.get('drink_name')

        product = Product.query.filter_by(name=selected_drink, tenant_id=current_tenant_id).first()
        if not product:
            return jsonify({"status": "error", "message": f"找不到飲品: {selected_drink}"}), 404

        product_info = f"產品：{product.name}，類別：{product.category}，價格：{product.price}元"

        # 自動注入 ExternalTrends
        trends_summary = ""
        trends_hashtags = ""
        latest_trends = ExternalTrends.query.order_by(ExternalTrends.created_at.desc()).first()
        if latest_trends:
            trends_summary = latest_trends.summary or ""
            trends_hashtags = latest_trends.hashtag or ""

        # 自動注入天氣資訊（使用者門市城市的今日天氣）
        weather_info = ""
        user_city = user_record.store.location_city if user_record.store else None
        if user_city:
            today = date.today()
            forecast = WeatherForecast.query.filter(
                WeatherForecast.city_name == user_city,
                WeatherForecast.forecast_date == today,
            ).first()
            if forecast:
                weather_info = f"{user_city} 今日天氣：{forecast.condition}，{forecast.min_temp}-{forecast.max_temp}°C，降雨機率 {forecast.rain_prob}%"

        # 自動注入未來 7 天內節日
        holiday_info = ""
        today = date.today()
        upcoming = HolidayCalendar.query.filter(
            HolidayCalendar.target_date >= today,
            HolidayCalendar.target_date <= today + timedelta(days=7),
        ).order_by(HolidayCalendar.target_date.asc()).all()
        if upcoming:
            holiday_info = "，".join(
                f"{h.holiday_name}（{h.target_date.strftime('%m/%d')}）" for h in upcoming
            )

        # 建立非同步 task
        task_id = str(uuid.uuid4())
        generation_tasks[task_id] = {
            "stage": "pending",
            "progress": 0,
            "message": "排隊中...",
            "result": None,
            "created_at": datetime.now(timezone.utc),
        }

        app_instance = current_app._get_current_object()
        thread = threading.Thread(
            target=run_generation_pipeline,
            # 位置參數只給 3 個：app, id, store
            args=(app_instance, task_id, generation_tasks), 
            # 剩餘的全部包進 kwargs，對應 image_flow.py 的 **input_data
            kwargs={
                "product_info": product_info,
                "trends_summary": trends_summary,
                "trends_hashtags": trends_hashtags,
                "weather_info": weather_info,
                "holiday_info": holiday_info
    }
) 
        thread.start()

        return jsonify({"status": "success", "task_id": task_id})

    @app.route('/api/generate_post/status/<task_id>', methods=['GET'])
    def get_generation_status(task_id):
        # 清理過期的 tasks
        now = datetime.now(timezone.utc)
        expired_ids = [
            tid for tid, t in generation_tasks.items()
            if t.get("stage") in ("done", "error")
            and (now - t.get("created_at", now)).total_seconds() > TASK_EXPIRY_SECONDS
        ]
        for tid in expired_ids:
            generation_tasks.pop(tid, None)

        task = generation_tasks.get(task_id)
        if not task:
            return jsonify({"status": "error", "message": "Task not found"}), 404

        return jsonify({
            "status": "success",
            "stage": task["stage"],
            "progress": task["progress"],
            "message": task["message"],
            "result": task["result"],
        })

    # ==========================================
    # Upload API
    # ==========================================
    image_generation_tasks = {}

    @app.route('/api/upload_and_generate', methods=['POST'])
    def upload_and_generate_route():
        """ 改良版：支持一次產出三張圖的非同步任務 """
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "未提供圖片檔案"}), 400
        
        file = request.files['file']
        product_name = request.form.get('product_name', '產品')
        copywriting = request.form.get('copywriting', '')
        weather = request.form.get('weather', '')
        festival = request.form.get('festival', '')

        try:
            img_data = file.read()
            pil_img = PILImage.open(io.BytesIO(img_data)).convert("RGB")

            task_id = str(uuid.uuid4())
            # 修改點 1：初始化任務狀態，將儲存欄位改為複數型態 images
            image_generation_tasks[task_id] = {
                "status": "processing",
                "images": [], # 這裡改為空清單
                "error": None,
                "created_at": datetime.now(timezone.utc)
            }

            def run_async_image_flow(t_id, p_name, p_copy, p_weather, p_fest, p_img):
                try:
                    # 執行 Flow，現在會回傳 List[str]
                    generated_images_list = process_image_generation(
                        product_name=p_name,
                        copywriting=p_copy,
                        weather=p_weather,
                        festival=p_fest,
                        pil_image=p_img
                    )
                    
                    # 修改點 2：檢查清單是否有效
                    if generated_images_list and len(generated_images_list) > 0:
                        image_generation_tasks[t_id].update({
                            "status": "success",
                            "images": generated_images_list # 儲存完整的 Base64 清單
                        })
                    else:
                        image_generation_tasks[t_id].update({
                            "status": "error",
                            "error": "模型未能成功生成任何圖片"
                        })
                except Exception as e:
                    image_generation_tasks[t_id].update({
                        "status": "error",
                        "error": str(e)
                    })

            thread = threading.Thread(
                target=run_async_image_flow,
                args=(task_id, product_name, copywriting, weather, festival, pil_img)
            )
            thread.start()

            return jsonify({
                "status": "pending", 
                "task_id": task_id,
                "message": "併行產圖任務已啟動，預計生成 3 款方案..."
            })

        except Exception as e:
            return jsonify({"status": "error", "message": f"啟動影像任務失敗: {str(e)}"}), 500

    # ------------------------------------------------------------
    # 修改點 3：查詢狀態的 Route 也需要確保回傳正確的欄位
    # ------------------------------------------------------------
    @app.route('/api/upload_and_generate/status/<task_id>', methods=['GET'])
    def get_upload_status(task_id):
        task = image_generation_tasks.get(task_id)
        if not task:
            return jsonify({"status": "error", "message": "找不到此任務"}), 404
        
        # 確保這裡回傳的是 images
        return jsonify(task)
    # ==========================================
    # AI Image Generation API
    # ==========================================
    @app.route('/api/content/publish', methods=['POST'])
    def handle_publish_post():
        # --- 1. 驗證登入狀態 ---
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            # 解碼時可加入 options 避開某些警告，但建議 .env 的 SECRET_KEY 設長一點
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_record = Users.query.get(decoded.get("user"))
            if not user_record:
                return jsonify({"status": "error", "message": "找不到使用者"}), 404
            current_store_id = user_record.store_id
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        # --- 2. 解析前端資料 ---
        data = request.json
        product_name = data.get('product_name')
        final_text = data.get('final_text')
        platform = data.get('platform', 'instagram')
        image_base64 = data.get('image_data') 

        if not final_text or not image_base64:
            return jsonify({"status": "error", "message": "文案或圖片數據缺失"}), 400

        try:
            # --- 3. 處理圖片數據 ---
            if "base64," in image_base64:
                image_base64 = image_base64.split("base64,")[1]
            image_binary = base64.b64decode(image_base64)

            # --- 4. 非同步執行完整 Workflow ---
            # 獲取 Flask App 實體，供 Thread 內部使用 App Context
            app_instance = current_app._get_current_object()
            
            thread = threading.Thread(
                target=run_workflow, 
                # 參數順序：app, 產品名, 文案, 圖片, 門市ID, 平台
                args=(app_instance, product_name, final_text, image_binary, current_store_id, platform)
            )
            thread.start()

            return jsonify({
                "status": "success", 
                "message": "內容已進入處理程序，系統正在進行上傳與發布。"
            })

        except Exception as e:
            return jsonify({"status": "error", "message": f"發布請求失敗: {str(e)}"}), 500
    @app.route('/api/content/history', methods=['GET'])
    def get_history():
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_record = Users.query.get(decoded.get("user"))
            current_store_id = user_record.store_id
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        store = Store.query.get(current_store_id)
        store_display_name = f"{store.tenant.name} - {store.name}" if store else "未知門市"
        history = MarketingContent.query.filter_by(store_id=current_store_id)\
                                        .order_by(MarketingContent.created_at.desc())\
                                        .all()
        return jsonify({
            "status": "success",
            "store_info": store_display_name,
            "count": len(history),
            "data": [
                {
                    "id": str(h.id),
                    "platform": h.platform,
                    "text": h.generated_text,
                    "product_name": h.product_name,
                    "created_at": h.created_at.strftime('%Y-%m-%d %H:%M:%S')
                } for h in history
            ]
        })

    # ==========================================
    # Platform Binding API
    # ==========================================
    @app.route('/api/admin/platform/bind', methods=['POST'])
    def handle_fb_binding():
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_record = Users.query.get(decoded.get("user"))
            if not user_record:
                return jsonify({"status": "error", "message": "用戶不存在"}), 404
            current_store_id = decoded.get("store")
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        data = request.json
        short_token = data.get('short_token')
        if not short_token:
            return jsonify({"status": "error", "message": "缺少授權碼"}), 400

        FB_APP_ID = os.getenv('FB_APP_ID', '')
        FB_APP_SECRET = os.getenv('FB_APP_SECRET', '')
        auth_url = "https://graph.facebook.com/v18.0/oauth/access_token"
        params = {
            "grant_type": "fb_exchange_token",
            "client_id": FB_APP_ID,
            "client_secret": FB_APP_SECRET,
            "fb_exchange_token": short_token
        }
        try:
            auth_res = requests.get(auth_url, params=params).json()
            long_user_token = auth_res.get('access_token')
            accounts_url = f"https://graph.facebook.com/v18.0/me/accounts?access_token={long_user_token}"
            accounts_res = requests.get(accounts_url).json()
            if not accounts_res.get('data'):
                return jsonify({"status": "error", "message": "此帳號無管理的粉絲專頁"}), 400
            
            page_data = accounts_res['data'][0]
            store = Store.query.get(current_store_id)
            existing_token = PlatformToken.query.filter_by(
                tenant_id=store.tenant_id,
                platform_name='facebook'
            ).first()
            
            if existing_token:
                target_record = existing_token
            else:
                target_record = PlatformToken(tenant_id=store.tenant_id, platform_name='facebook')
                db.session.add(target_record)
            
            target_record.page_id = page_data['id']
            target_record.page_name = page_data['name']
            target_record.access_token = page_data['access_token']
            target_record.expires_at = datetime.now(timezone.utc) + timedelta(days=60)
            db.session.commit()
            
            return jsonify({
                "status": "success",
                "message": f"成功連接粉專：{page_data['name']}"
            })
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    # ==========================================
    # Weather API
    # ==========================================
    @app.route('/api/weather', methods=['GET'])
    def get_weather():
        """ 獲取使用者所屬門市縣市的一週天氣預報 """
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = decoded.get("user")
        except Exception:
            return jsonify({"status": "error", "message": "認證失效，請重新登入"}), 401

        user = Users.query.get(user_id)
        if not user or not user.store:
            return jsonify({"status": "error", "message": "找不到使用者的門市資料"}), 404
        
        user_city = user.store.location_city
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        try:
            forecasts = WeatherForecast.query.filter(
                WeatherForecast.city_name == user_city,
                WeatherForecast.forecast_date >= today
            ).order_by(WeatherForecast.forecast_date.asc()).all()

            if not forecasts:
                forecasts = WeatherForecast.query.filter(
                    WeatherForecast.city_name == user_city
                ).order_by(WeatherForecast.forecast_date.asc()).limit(7).all()

            weather_data = [
                {
                    "date": f.forecast_date.strftime("%Y-%m-%d"),
                    "condition": f.condition,
                    "min_temp": f.min_temp,
                    "max_temp": f.max_temp,
                    "rain_prob": f.rain_prob,
                    "recommendation": f.recommendation
                } for f in forecasts
            ]

            return jsonify({
                "status": "success",
                "city": user_city,
                "data": weather_data
            })

        except Exception as e:
            print(f"Weather Fetch Error: {e}")
            return jsonify({"status": "error", "message": "無法讀取天氣資料"}), 500

    # ==========================================
    # Holiday Calendar API
    # ==========================================
    @app.route('/api/holidays', methods=['GET'])
    def get_holidays():
        """ 獲取系統內建的節慶與行銷檔期 """
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            # 驗證 Token 是否有效
            jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except Exception:
            return jsonify({"status": "error", "message": "認證失效，請重新登入"}), 401

        try:
            # 撈取所有檔期，並以日期由近到遠排序
            holidays = HolidayCalendar.query.order_by(HolidayCalendar.target_date.asc()).all()

            holiday_data = [
                {
                    "id": h.id,
                    "holiday_name": h.holiday_name,
                    # 將 datetime 格式化為前端可解析的 ISO 格式字串
                    "target_date": h.target_date.strftime("%Y-%m-%dT00:00:00") if h.target_date else None,
                    "category_type": h.category_type,
                    "note": h.note
                } for h in holidays
            ]

            return jsonify({
                "status": "success",
                "data": holiday_data
            })

        except Exception as e:
            print(f"Holiday Fetch Error: {e}")
            return jsonify({"status": "error", "message": "無法讀取節慶檔期資料"}), 500

    # ==========================================
    # External Trends API
    # ==========================================
    @app.route('/api/trends/latest', methods=['GET'])
    def get_latest_trends():
        """ 獲取最新一筆 AI 統整的社群熱搜趨勢 """
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            # 驗證 Token 是否有效
            jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except Exception:
            return jsonify({"status": "error", "message": "認證失效，請重新登入"}), 401

        try:
            # 撈取最新的一筆趨勢資料
            latest_trend = ExternalTrends.query.order_by(ExternalTrends.created_at.desc()).first()

            # 如果資料庫還沒有任何資料，回傳空字串讓前端妥善處理
            if not latest_trend:
                return jsonify({
                    "status": "success",
                    "data": {
                        "summary": "",
                        "hashtag": "",
                        "created_at": None
                    }
                })

            return jsonify({
                "status": "success",
                "data": {
                    "id": latest_trend.id,
                    "summary": latest_trend.summary,
                    "hashtag": latest_trend.hashtag,
                    # 轉成 ISO 格式，方便前端 React 進行時間解析與格式化
                    "created_at": latest_trend.created_at.isoformat() if latest_trend.created_at else None
                }
            })

        except Exception as e:
            print(f"Trends Fetch Error: {e}")
            return jsonify({"status": "error", "message": "無法讀取社群趨勢資料"}), 500