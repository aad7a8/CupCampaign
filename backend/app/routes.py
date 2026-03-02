from flask import jsonify, request, make_response
from app.models import (
    db, Product, Tenant, MarketingContent, Users, Store, ContentImage,WeatherCache,Ingredient,HolidayCalendar,ExternalTrends,PriceHistory,PlatformToken
)
from app.AI_services import generate_drink_post
from app.create_images import create_image_from_prompt,save_pil_to_minio
from datetime import datetime, timezone, timedelta
from app.extensions import minio_client, BUCKET_NAME,MINIO_EXTERNAL_URL
from sqlalchemy import text
import os
import jwt
import uuid
import io
import json
import requests

SECRET_KEY = os.getenv("MY_APP_SECRET_KEY", "your_fallback_key")


def register_routes(app):

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
        """ 
        整合版本：
        1. 採用的欄位接收方式 (tenant_name, city, store_name)
        2. 註冊後不發憑證，統一導向登入頁
        3. 移除 UUID，交由資料庫自動遞增 ID
        4.使用兩次flush,在最後才一次性提交
        """
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "無效的請求"}), 400

        # 獲取妳原本規劃的細緻欄位
        email = data.get('email')
        password = data.get('password')
        tenant_name = data.get('tenant_name') # 使用者手寫的品牌
        city = data.get('city', '台北市')      # 縣市
        store_name = data.get('store_name')   # 分店名稱

        # 1. 安全檢查：確保必填欄位
        if not all([email, password, tenant_name, store_name]):
            return jsonify({"status": "error", "message": "所有欄位皆為必填"}), 400

        # 2. 檢查重複註冊
        if Users.query.filter_by(email=email).first():
            return jsonify({"status": "error", "message": "Email 已被註冊"}), 400

        try:
            # 3. 處理品牌 (Tenant) - 妳的邏輯：判斷是爬蟲過的舊品牌還是新自創
            tenant = Tenant.query.filter_by(name=tenant_name).first()
            if not tenant:
                tenant = Tenant(name=tenant_name,is_registered=True)
                db.session.add(tenant)
                db.session.flush() # 拿到 tenant.id 供下一步使用

            # 4. 處理分店 (Store)
            store = Store.query.filter_by(
                tenant_id=tenant.id, 
                name=store_name, 
                location_city=city
            ).first()
            
            if not store:
                store = Store(
                    tenant_id=tenant.id, 
                    name=store_name, 
                    location_city=city
                )
                db.session.add(store)
                db.session.flush() # 拿到 store.id 供下一步使用

            # 5. 建立使用者 (Users)
            new_user = Users(email=email, store_id=store.id)
            new_user.set_password(password) # 使用妳 Model 裡的雜湊加密
            db.session.add(new_user)
            
            # 6. 一次性提交所有變更
            db.session.commit()

            # 7. 流程簡化：不發放憑證，回傳成功後叫前端轉跳到登入頁面
            return jsonify({
                "status": "success",
                "message": "註冊成功，請前往登入頁面重新登入",
                "redirect": "/login" 
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({"status": "error", "message": f"系統錯誤: {str(e)}"}), 500
        

    @app.route('/api/auth/login', methods=['POST'])
    def handle_login():
        """ 
        整合版本：
        1. 採用HttpOnly Cookie 安全機制
        2. 採用前端欄位命名 ('username')
        3. 放入 store_id 到 Token 中，方便後續 API 使用
        """
        data = request.json
        # 💡 配合組長前端：接收 'username' (裡面存的是 email)
        email = data.get('username') 
        password = data.get('password')

        # 1. 查找使用者 (確保對應到妳的 Users model)
        user = Users.query.filter_by(email=email).first()
        
        # 2. 驗證密碼
        if user and user.check_password(password):
            # 3. 產生 JWT Token
            # 我們把 store_id 也塞進去，這樣以後 API 就不必每次都查資料庫看他在哪間店
            payload = {
                "user": str(user.id),
                "store": str(user.store_id), # 💡 妳的實用設計
                "email": email,
                "exp": datetime.now(timezone.utc) + timedelta(hours=24) # 建議改長一點，例如 24 小時
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

            # 4. 建立回應內容 
            resp = make_response(jsonify({
                "status": "success",
                "message": "登入成功",
                "redirect": "/dashboard" 
            }))

            # 5. 寫入加密 Cookie (安全性)
            resp.set_cookie(
                'access_token',
                token,
                httponly=True,   # 🛡️ 安全防護：JS 拿不到，防 XSS
                samesite='Lax',  # 防 CSRF
                secure=False     # 本地開發設 False
            )
            return resp
        
        # 6. 失敗處理
        return jsonify({"status": "error", "message": "帳號或密碼錯誤"}), 401


    @app.route('/api/auth/logout')
    def logout():
        # 1. 建立一個 JSON 回應
        resp = make_response(jsonify({
            "status": "success", 
            "message": "已成功登出",
            "redirect": "/login"
        }))
        
        # 2. 強制將 Cookie 設為過期 (把原本的 access_token 蓋掉，並設為 0 秒後過期)
        resp.set_cookie(
            'access_token', 
            '', 
            expires=0, 
            httponly=True, 
            samesite='Lax'
        )
        
        return resp

    # ==========================================
    # Stores API
    # ==========================================

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

    @app.route('/api/admin/products', methods=['GET', 'POST','DELETE'])
    def handle_products():
        """
        整合版：使用 JWT 驗證，支持 GET 撈取與 POST 批次新增
        """
        # 1. JWT 身分驗證 (從 Cookie 讀取)
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_store_id = decoded.get("store")
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        # 2. 獲取當前分店與品牌資訊
        store = Store.query.get(current_store_id)
        if not store:
            return jsonify({"status": "error", "message": "找不到所屬門市資料"}), 404
        
        target_tenant_id = store.tenant_id

        # -------------------------------------------------------
        # 🔵 GET 請求：撈取該品牌的所有飲料
        # -------------------------------------------------------
        if request.method == 'GET':
            products = Product.query.filter_by(tenant_id=target_tenant_id).all()

            return jsonify({
                "status": "success",
                "brand_name": store.tenant.name,
                "data": [
                    {   
                        "id": p.id,  # 現在是自動遞增的 INT
                        "category": p.category,
                        "name": p.name, 
                        "price": float(p.price) if p.price else 0,
                        "scraped_at": p.scraped_at.strftime('%Y-%m-%d %H:%M:%S') if p.scraped_at else None
                    } for p in products
                ]
            })

        # -------------------------------------------------------
        # 🟢 POST 請求：批次新增飲料
        # -------------------------------------------------------
        if request.method == 'POST':
            data = request.json
            product_list = data.get('products') # 預期前端傳來一個 list
            
            if not product_list:
                return jsonify({"status": "error", "message": "請至少輸入一項產品"}), 400

            try:
                for item in product_list:
                    # A. 建立產品 (不傳 ID，讓資料庫自增)
                    new_product = Product(
                        tenant_id=target_tenant_id,
                        name=item.get('name'),
                        category=item.get('category'),
                        price=item.get('price'),
                        scraped_at=None 
                    )
                    db.session.add(new_product)

                db.session.commit()
                return jsonify({"status": "success", "message": "菜單已儲存！"})
            
            except Exception as e:
                db.session.rollback()
                return jsonify({"status": "error", "message": f"儲存失敗: {str(e)}"}), 500
        
        # -------------------------------------------------------
        # 🔴 DELETE：刪除指定飲品
        # -------------------------------------------------------
        if request.method == 'DELETE':
            data = request.json
            product_id = data.get('product_id') # 前端傳入要刪除的 ID

            if not product_id:
                return jsonify({"status": "error", "message": "請提供產品 ID"}), 400

            try:
                # 💡 安全檢查：確保該產品真的屬於該使用者的品牌，防止刪到別人的
                product_to_delete = Product.query.filter_by(
                    id=product_id, 
                    tenant_id=target_tenant_id
                ).first()

                if not product_to_delete:
                    return jsonify({"status": "error", "message": "找不到該產品"}), 404

                db.session.delete(product_to_delete)
                db.session.commit()
                return jsonify({"status": "success", "message": "產品已成功刪除"})

            except Exception as e:
                db.session.rollback()
                return jsonify({"status": "error", "message": f"刪除失敗: {str(e)}"}), 500

    # ==========================================
    # AI Content Generation API
    # ==========================================

    @app.route('/api/generate_post', methods=['POST'])
    def handle_generate_post():
        # 1. JWT 身分驗證 (React 友善)
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            # 即使不存草稿，通常還是會確認使用者是否存在
            user_record = Users.query.get(decoded.get("user"))
            if not user_record:
                return jsonify({"status": "error", "message": "用戶不存在"}), 404
            # 💡 關鍵：獲取該使用者的品牌 ID
            current_tenant_id = user_record.store.tenant_id

        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401
        
        # 2. 接收 JSON 資料
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "請求格式錯誤"}), 400
        
        # 提取文案生成參數
        selected_drink = data.get('drink_name')
        news_context   = data.get('news_context', "")
        promotion_info = data.get('promotion_info', "")
        # mood_tone      = data.get('mood_tone', "親切")
        weather_info   = data.get('weather_info', "")
        holiday_info   = data.get('holiday_info', "")
        target_platform = data.get('platform', 'facebook')

        # 3. 檢查產品資訊 (為了提供更精準的資訊給 AI)
        # 這裡建議加上 tenant_id 過濾，確保沒抓錯別家的飲料
        product = Product.query.filter_by(name=selected_drink,tenant_id=current_tenant_id).first()
        if not product:
            return jsonify({"status": "error", "message": f"找不到飲品: {selected_drink}"}), 404
        
        product_info = f"產品：{product.name}，類別：{product.category}，價格：{product.price}元"

        # 4. 呼叫 AI (直接回傳 AI 產出的字典)
        try:
            ai_result = generate_drink_post(
                platform = target_platform,
                product_info=product_info,
                news_context=news_context,
                promotion_info=promotion_info,
                weather_info=weather_info,
                holiday_info=holiday_info
            )
        except Exception as e:
            return jsonify({"status": "error", "message": f"AI 生成失敗: {str(e)}"}), 500

        # 5. 直接回傳，不進行 db.session 操作
        return jsonify({
            "status": "success",
            "generated_content": ai_result, 
            "platform": target_platform,
            "message": "文案生成成功，請注意：此文案尚未儲存，關閉頁面後將消失。"
        })


    # ==========================================
    # Upload API
    # ==========================================

    @app.route('/api/upload', methods=['POST'])
    def handle_upload():
        # 驗證 JWT
        # 1. JWT 身分驗證 (React 友善)
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            # 即使不存草稿，通常還是會確認使用者是否存在
            user_record = Users.query.get(decoded.get("user"))
            if not user_record:
                return jsonify({"status": "error", "message": "用戶不存在"}), 404
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401
        
        # 接收檔案 (React 用 FormData 傳送，key 設為 'file')
        image_file = request.files.get('file')
        if not image_file:
            return jsonify({"status": "error", "message": "請選擇圖片檔案"}), 400

        try:
            # 生成唯一檔名並上傳 MinIO
            original_ext = image_file.filename.split('.')[-1]
            filename = f"{uuid.uuid4()}.{original_ext}"
            file_data = image_file.read()
            
            minio_client.put_object(
                BUCKET_NAME,
                filename,
                io.BytesIO(file_data),
                length=len(file_data),
                content_type=image_file.content_type
            )
            
            # 組合網址 (假設 MinIO 跑在 9000 port)
            image_url = f"{MINIO_EXTERNAL_URL}/{BUCKET_NAME}/{filename}"
            
            return jsonify({
                "status": "success",
                "image_url": image_url # 💡 給前端暫存，前端等下要傳給產圖 API 和發布 API
            })
        except Exception as e:
            return jsonify({"status": "error", "message": f"圖片上傳失敗: {str(e)}"}), 500

    # ==========================================
    # AI Image Generation API
    # ==========================================

    @app.route('/api/content/generate-image', methods=['POST'])
    def handle_generate_image():
        # 1. 嚴謹的 JWT 驗證
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            # 即使不存草稿，通常還是會確認使用者是否存在
            user_record = Users.query.get(decoded.get("user"))
            if not user_record:
                return jsonify({"status": "error", "message": "用戶不存在"}), 404
        except Exception:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        # 2. 接收前端資料
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "請求格式錯誤"}), 400

        ref_image_url = data.get('image_url') # 回傳給前端的原始圖 MinIO 網址
        image_prompt  = data.get('image_prompt')

        if not ref_image_url or not image_prompt:
            return jsonify({"status": "error", "message": "缺少參考圖片網址"}), 400

        # 3. 呼叫 Nano Banana (圖生圖)
        try:
            # 💡 這邊會呼叫AI 工具函式
            # 注意：此時還不寫入資料庫，因為使用者可能還想再產一張試試看
            generated_urls = []
            for i in range(3):
                # 呼叫產圖函式
                pil_img = create_image_from_prompt(base_image_url=ref_image_url, prompt=image_prompt)
                
                # --- 重要！將 AI 圖下載並轉存到 MinIO ---
                # 因為 AI 產出的網址通常是暫時的，轉存後妳才能永久擁有它
                if pil_img:
                    local_minio_url = save_pil_to_minio(pil_img)
                    generated_urls.append(local_minio_url)
                else:
                    print(f"第 {i+1} 張產圖失敗，跳過...")
            
            return jsonify({
                "status": "success",
                "generated_image_url": generated_urls, # 回傳給前端讓使用者驚艷一下
                "prompt_used": image_prompt # 讓前端暫存，最後按下「發布」時連同文字傳回來
            })
        except Exception as e:
            print(f"產圖 API 報錯: {str(e)}")
            return jsonify({"status": "error", "message": f"AI 繪圖失敗: {str(e)}"}), 500

    # ==========================================
    # Publish API
    # ==========================================

    @app.route('/api/content/publish', methods=['POST'])
    def handle_publish_post():
        # 1. 驗證 JWT
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_record = Users.query.get(decoded.get("user"))
            current_store_id = user_record.store_id 
        except:
            return jsonify({"status": "error", "message": "認證失效"}), 401

        # 2. 獲取前端傳來的所有資料 (文案 + 原始圖網址 + AI圖網址)
        data = request.json
        posts = data.get('posts',[]) #預期前端傳一個名為posts的list 
        if not posts:
            return jsonify({"status": "error", "message": "沒有可發布的內容"}), 400
        
        created_ids = []
        try:
            for post in posts:
                final_text = post.get('final_text')
                target_platform = post.get('platform')
                product_name = post.get('product_name')
                # upload_url = post.get('upload_url')      # 原始圖 (來自上傳 API)
                ai_minio_url = post.get('ai_minio_url')  # AI圖 (來自產圖 API)
                prompt_used = post.get('prompt_used', '') # 產圖用的 Prompt

                if not final_text or not target_platform:
                    return jsonify({"status": "error", "message": "文案內容與平台資訊不能為空"}), 400

        
                # 3. 💡 步驟一：建立「文案主紀錄」 (對應 marketing_content 表)
                # 這裡的 id 會根據妳資料庫設定自動生成 INT (或是手動給 UUID)
                new_content = MarketingContent(
                    store_id=current_store_id,
                    final_text=final_text,
                    product_name = product_name,
                    # status="published",
                    # upload_url=upload_url,
                    platform=target_platform, # 如果妳的表有這個欄位的話
                    created_at=datetime.now(timezone.utc)
                )
                db.session.add(new_content)
            
                # 💡 強制執行一次 flush，這樣我們才能拿到剛產生的 new_content.id
                db.session.flush()

                # 4. 💡 步驟二：建立「圖片紀錄」 (對應 content_image 表)
                if ai_minio_url:
                    new_image = ContentImage(
                        content_id=new_content.id, # 這裡串連了主表的 ID
                        minio_url=ai_minio_url,
                        prompt_used=prompt_used
                    )
                    db.session.add(new_image)
                created_ids.append(new_content.id)

            # 5. 統一提交
            db.session.commit()

            return jsonify({
                "status": "success", 
                "message": f"文成功儲存 {len(created_ids)} 篇文案！",
                "content_id": created_ids
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({"status": "error", "message": f"儲存失敗: {str(e)}"}), 500

    # ==========================================
    # history API
    # ==========================================
    @app.route('/api/content/history', methods=['GET'])
    def get_history():
        # 1. JWT 驗證 (跟妳其他 API 格式一致)
        token = request.cookies.get('access_token')
        if not token:
            return jsonify({"status": "error", "message": "請先登入"}), 401
        
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_record = Users.query.get(decoded.get("user"))
            current_store_id = user_record.store_id
        except:
            return jsonify({"status": "error", "message": "認證失效"}), 401


        
        # 💡 多做一步：拿店名，讓前端可以顯示「這是哪間店的紀錄」
        store = Store.query.get(current_store_id)
        store_display_name = f"{store.tenant.name} - {store.name}" if store else "未知門市"

        history = MarketingContent.query.filter_by(store_id=current_store_id)\
                                        .order_by(MarketingContent.created_at.desc())\
                                        .all()

        return jsonify({
            "status": "success",
            "store_info": store_display_name, # 💡 讓前端知道這是誰的歷史
            "count": len(history),
            "data": [
                {
                    "id": str(h.id),
                    "platform": h.platform,      # 💡 新增這一行：讓前端顯示 FB/IG 圖示或標籤
                    "text": h.generated_text,
                    "image_url": h.image_url, # 💡 加這行，前端才能用 <img src="..."> 顯示
                    "status": h.status,
                    "created_at": h.created_at.strftime('%Y-%m-%d %H:%M:%S')
                } for h in history
            ]
        })

    # ==========================================
    # holidays API
    # ==========================================
    @app.route('/api/holidays', methods=['GET'])
    def get_holidays():
        try:
            sql = text("SELECT * FROM v_holiday_calendar WHERE countdown_days >= -1 ORDER BY target_date ASC")
            
            with db.engine.connect() as conn:
                result = conn.execute(sql)
                
                holidays = []
                for row in result:
                    row_dict = dict(row._mapping)
                    # ⭐ 關鍵 3：將 datetime.date 轉換為字串，避免 JSON 序列化報錯
                    if row_dict.get('target_date'):
                        row_dict['target_date'] = str(row_dict['target_date'])
                    
                    holidays.append(row_dict)
                
            return jsonify(holidays)

        except Exception as e:
            print(f"Error fetching holidays: {e}")
            # 將錯誤回傳，方便在瀏覽器 Network 面板除錯
            return jsonify({"error": "無法讀取資料庫", "details": str(e)}), 500
        
    
    # ==========================================
    # weather API
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

        # 2. 取得使用者的門市與城市資訊
        user = Users.query.get(user_id)
        if not user or not user.store:
            return jsonify({"status": "error", "message": "找不到使用者的門市資料"}), 404
        
        user_city = user.store.location_city

        # 3. 查詢該城市的天氣預報 (今天及未來的預報)
        today = datetime.date.today()
        try:
            # 篩選條件：符合門市所在縣市，且日期大於等於今天，按日期遞增排序
            forecasts = WeatherCache.query.filter(
                        WeatherCache.city_name == user_city,
                        WeatherCache.forecast_date >= today
            ).order_by(WeatherCache.forecast_date.asc()).all()

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



