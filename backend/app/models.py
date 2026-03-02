# models.py
from datetime import datetime
from app.extensions import db, bcrypt
from sqlalchemy import event, text

# 1. 品牌表 (Tenant)
class Tenant(db.Model):
    __tablename__ = 'tenant'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    is_registered = db.Column(db.Boolean, default=False)
    
    stores = db.relationship('Store', backref='tenant', lazy=True)
    products = db.relationship('Product', backref='tenant', lazy=True)

# 2. 分店表 (Store)
class Store(db.Model):
    __tablename__ = 'store'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    name = db.Column(db.String(100))
    location_city = db.Column(db.String(50))

    users = db.relationship('Users', backref='store', lazy=True)
    marketing_contents = db.relationship('MarketingContent', backref='store', lazy=True)

# 3. 使用者表 (Users)
class Users(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

# 4. 飲品表 (Product)
class Product(db.Model):
    __tablename__ = 'product'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'))
    name = db.Column(db.String(100))
    category = db.Column(db.String(50))
    price = db.Column(db.Numeric(10, 2))
    scraped_at = db.Column(db.DateTime, default=datetime.utcnow)

# 5. 原物料表 (Ingredient)
class Ingredient(db.Model):
    __tablename__ = 'ingredient'
    id = db.Column(db.Integer, primary_key=True)
    # ⚠️ tenant_id 已經移除
    name = db.Column(db.String(100), nullable=False)
    
    # 儲存 1~12 月採購狀態的 JSONB 欄位
    monthly_status_matrix = db.Column(db.JSON, server_default='[]')

# 6. 行銷文案表 (MarketingContent)
class MarketingContent(db.Model):
    __tablename__ = 'marketing_content'
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    platform = db.Column(db.String(50), nullable=False)
    product_name = db.Column(db.String(100), nullable=True)
    
    final_text = db.Column(db.Text, nullable=False) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    like = db.Column(db.Integer, default=0) 

# 7. 文案圖片表 (ContentImage)
class ContentImage(db.Model):
    __tablename__ = 'content_image'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    content_id = db.Column(db.Integer, db.ForeignKey('marketing_content.id'), nullable=False)
    minio_url = db.Column(db.String(255), nullable=False)

# 8. 平台 Token 表 (PlatformToken)
class PlatformToken(db.Model):
    __tablename__ = 'platform_tokens'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    platform_name = db.Column(db.String(50), nullable=False)
    page_id = db.Column(db.String(100))
    page_name = db.Column(db.String(100))
    access_token = db.Column(db.Text, nullable=False) 
    expires_at = db.Column(db.DateTime) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tenant = db.relationship('Tenant', backref='tokens')

# 9. 天氣預報表 (WeatherForecast)
class WeatherForecast(db.Model):
    __tablename__ = 'weather_forecast'
    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(50), nullable=False)
    forecast_date = db.Column(db.Date, nullable=False)
    condition = db.Column(db.String(50))
    min_temp = db.Column(db.Integer)
    max_temp = db.Column(db.Integer)
    rain_prob = db.Column(db.Integer)
    recommendation = db.Column(db.String(100))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('city_name', 'forecast_date', name='uix_city_date'),
    )

# 10. 節日曆表 (HolidayCalendar)
class HolidayCalendar(db.Model):
    __tablename__ = 'holiday_calendar'
    id = db.Column(db.Integer, primary_key=True)
    holiday_name = db.Column(db.String(100), nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    countdown_days = db.Column(db.Integer) # 實體欄位
    category_type = db.Column(db.String(50))
    note = db.Column(db.Text)

    __table_args__ = (
        db.UniqueConstraint('holiday_name', 'target_date', name='unique_holiday_date'),
    )

    # --- 在 Python 層動態計算倒數天數 ---
    # 這樣即便實體表 (countdown_days) 沒有每天 UPDATE，
    # 透過 SQLAlchemy 撈出來的物件，呼叫 .dynamic_countdown 永遠是準確的。
    @property
    def dynamic_countdown(self):
        if self.target_date:
            return (self.target_date - datetime.utcnow().date()).days
        return None

# 11. 趨勢素材表 (ExternalTrends)
class ExternalTrends(db.Model):
    __tablename__ = 'external_trends'
    id = db.Column(db.Integer, primary_key=True)
    hashtag = db.Column(db.String(255))
    summary = db.Column(db.Text)       
    mention_count = db.Column(db.Integer, default=0) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow) 

# 12. 價格追蹤表 (PriceHistory)
class PriceHistory(db.Model):
    __tablename__ = 'price_history'
    id = db.Column(db.Integer, primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredient.id'), nullable=False)
    market_price = db.Column(db.Numeric(10, 2))
    change_rate = db.Column(db.Numeric(5, 2))
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)