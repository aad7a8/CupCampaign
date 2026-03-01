from flask import jsonify, request, make_response
from app.models import (
    db, Product, Tenant, MarketingContent, Users, Store,
    Ingredient, ProductComposition, PlatformToken, ContentImage, WeatherForecast
)
# from app.image_services import call_nano_banana_logic
# from app.AI_services import generate_drink_post
from datetime import datetime, timezone, timedelta, date
import os
import jwt
import uuid
import io
import json
import requests

SECRET_KEY = os.getenv("MY_APP_SECRET_KEY", "your_fallback_key")

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
                        "ingredients_display": ", ".join([comp.ingredient.name for comp in p.compositions])
                                               if hasattr(p, 'compositions') else "",
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
                    new_product = Product(
                        tenant_id=target_tenant_id,
                        name=item.get('name'),
                        category=item.get('category'),
                        price=item.get('price'),
                        scraped_at=None
                    )
                    db.session.add(new_product)
                    db.session.flush()

                    raw_ingredients = item.get('ingredients', '')
                    if raw_ingredients:
                        ing_names = [n.strip() for n in raw_ingredients.replace('，', ',').split(',') if n.strip()]
                        for ing_name in ing_names:
                            ing = Ingredient.query.filter_by(
                                tenant_id=target_tenant_id,
                                name=ing_name
                            ).first()
                            if not ing:
                                ing = Ingredient(tenant_id=target_tenant_id, name=ing_name)
                                db.session.add(ing)
                                db.session.flush()
                            
                            composition = ProductComposition(
                                product_id=new_product.id,
                                ingredient_id=ing.id
                            )
                            db.session.add(composition)
                db.session.commit()
                return jsonify({"status": "success", "message": "菜單與配方已儲存！"})
            except Exception as e:
                db.session.rollback()
                return jsonify({"status": "error", "message": f"儲存失敗: {str(e)}"}), 500

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
        news_context   = data.get('news_context', "")
        promotion_info = data.get('promotion_info', "")
        mood_tone      = data.get('mood_tone', "親切")
        weather_info   = data.get('weather_info', "")
        holiday_info   = data.get('holiday_info', "")

        product = Product.query.filter_by(name=selected_drink, tenant_id=current_tenant_id).first()
        if not product:
            return jsonify({"status": "error", "message": f"找不到飲品: {selected_drink}"}), 404

        product_info = f"產品：{product.name}，類別：{product.category}，價格：{product.price}元"
        try:
            ai_result_dict = generate_drink_post(
                product_info=product_info,
                news_context=news_context,
                promotion_info=promotion_info,
                mood_tone=mood_tone,
                weather_info=weather_info,
                holiday_info=holiday_info
            )
            return jsonify({
                "status": "success",
                "generated_content": ai_result_dict,
                "platform": "all",
                "message": "文案生成成功，請注意：此文案尚未儲存，關閉頁面後將消失。"
            })
        except Exception as e:
            return jsonify({"status": "error", "message": f"AI 生成失敗: {str(e)}"}), 500

    # ==========================================
    # Upload API
    # ==========================================
# 確保裝飾器路徑包含 /api (對應 Nginx 設定)
    @app.route('/api/upload_and_generate', methods=['POST'])
    def upload_and_generate_route():
        # --- 以下所有內容都必須縮排 4 個空格 ---
        
        # 1. 檢查檔案是否存在
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "未提供圖片檔案"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "檔名為空"}), 400

        # 2. 取得前端傳來的文案 (formData.append('prompt', ...))
        user_prompt = request.form.get('prompt', '')

        try:
            # 3. 呼叫 Service 邏輯
            result = call_nano_banana_logic(file)

            # 4. 根據結果回傳 Response
            if result.get("status") == "success":
                return jsonify(result), 200
            else:
                return jsonify(result), 500
                
        except Exception as e:
            # 萬一 Service 噴錯，回傳 JSON 格式的錯誤訊息
            return jsonify({"status": "error", "message": str(e)}), 500
    
    @app.route('/api/upload', methods=['POST'])
    def handle_upload():
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_record = Users.query.get(decoded.get("user"))
            if not user_record:
                return jsonify({"status": "error", "message": "用戶不存在"}), 404
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        image_file = request.files.get('file')
        if not image_file:
            return jsonify({"status": "error", "message": "請選擇圖片檔案"}), 400

        try:
            filename = f"{uuid.uuid4()}-{image_file.filename}"
            file_data = image_file.read()
            minio_client.put_object(
                BUCKET_NAME,
                filename,
                io.BytesIO(file_data),
                length=len(file_data),
                content_type=image_file.content_type
            )
            minio_endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
            image_url = f"http://{minio_endpoint}/{BUCKET_NAME}/{filename}"
            return jsonify({
                "status": "success",
                "image_url": image_url
            })
        except Exception as e:
            return jsonify({"status": "error", "message": f"圖片上傳失敗: {str(e)}"}), 500

    # ==========================================
    # AI Image Generation API
    # ==========================================
    @app.route('/api/content/generate-image', methods=['POST'])
    def handle_generate_image():
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_record = Users.query.get(decoded.get("user"))
            if not user_record:
                return jsonify({"status": "error", "message": "用戶不存在"}), 404
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "請求格式錯誤"}), 400

        ref_image_url = data.get('image_url')
        image_prompt  = data.get('image_prompt', '一張美味的飲品宣傳照')
        if not ref_image_url:
            return jsonify({"status": "error", "message": "缺少參考圖片網址"}), 400

        try:
            generated_image_url = call_nano_banana(
                base_image_url=ref_image_url,
                prompt=image_prompt
            )
            return jsonify({
                "status": "success",
                "generated_image_url": generated_image_url,
                "prompt_used": image_prompt
            })
        except Exception as e:
            return jsonify({"status": "error", "message": f"AI 繪圖失敗: {str(e)}"}), 500

    # ==========================================
    # Publish & History API
    # ==========================================
    @app.route('/api/content/publish', methods=['POST'])
    def handle_publish_post():
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_record = Users.query.get(decoded.get("user"))
            current_store_id = user_record.store_id
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        data = request.json
        final_text = data.get('final_text')
        target_platform = data.get('platform')
        product_name = data.get('product_name')
        ai_minio_url = data.get('ai_minio_url')
        prompt_used = data.get('prompt_used', '')

        if not final_text or not target_platform:
            return jsonify({"status": "error", "message": "文案內容與平台資訊不能為空"}), 400

        try:
            new_content = MarketingContent(
                store_id=current_store_id,
                generated_text=final_text,
                product_name=product_name,
                platform=target_platform,
                created_at=datetime.now(timezone.utc)
            )
            db.session.add(new_content)
            db.session.flush()

            if ai_minio_url:
                new_image = ContentImage(
                    content_id=new_content.id,
                    minio_url=ai_minio_url,
                    prompt_used=prompt_used
                )
                db.session.add(new_image)
            db.session.commit()
            return jsonify({
                "status": "success",
                "message": f"文案已成功存入歷史紀錄並發布至 {target_platform}！",
                "content_id": new_content.id
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({"status": "error", "message": f"儲存失敗: {str(e)}"}), 500

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
        # 1. 身分驗證 (從 Cookie 讀取 JWT)
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = decoded.get("user")
        except Exception:
            return jsonify({"status": "error", "message": "認證失效，請重新登入"}), 401

        # 2. 取得使用者的門市與城市資訊 (注意：您的 Model 是 Users 不是 User)
        user = Users.query.get(user_id)
        if not user or not user.store:
            return jsonify({"status": "error", "message": "找不到使用者的門市資料"}), 404
        
        user_city = user.store.location_city

        # 3. 查詢該城市的天氣預報 (今天及未來的預報)
        today = date.today()
        try:
            # 篩選條件：符合門市所在縣市，且日期大於等於今天，按日期遞增排序
            forecasts = WeatherForecast.query.filter(
                WeatherForecast.city_name == user_city,
                WeatherForecast.forecast_date >= today
            ).order_by(WeatherForecast.forecast_date.asc()).all()

            # 4. 將結果轉換為 JSON 格式
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