# models.py
from datetime import datetime
from app.extensions import db, bcrypt

# 1. 品牌表 (Tenant)
class Tenant(db.Model):
    __tablename__ = 'tenant'
    id = db.Column(db.Integer, primary_key=True) # 統一用整數
    name = db.Column(db.String(100), nullable=False)
    is_registered = db.Column(db.Boolean, default=False)
    
    # 建立關聯
    stores = db.relationship('Store', backref='tenant', lazy=True)
    products = db.relationship('Product', backref='tenant', lazy=True)

# 2. 分店表 (Store)
class Store(db.Model):
    __tablename__ = 'store'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    name = db.Column(db.String(100))
    location_city = db.Column(db.String(50))

    # 關聯設定
    users = db.relationship('Users', backref='store', lazy=True)
    marketing_contents = db.relationship('MarketingContent', backref='store', lazy=True)
# 3. 使用者表 (Users) - 妳指定的表名
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
    
    # 配方關聯
    compositions = db.relationship('ProductComposition', backref='product', lazy=True, cascade="all, delete-orphan")

# 5. 原物料表 (Ingredient)
class Ingredient(db.Model):
    __tablename__ = 'ingredient'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)

# 6. 飲品組成表 (ProductComposition)
class ProductComposition(db.Model):
    __tablename__ = 'product_composition'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredient.id'), nullable=False)
    
    ingredient = db.relationship('Ingredient')

# 7. 行銷文案表 (MarketingContent)
class MarketingContent(db.Model):
    __tablename__ = 'marketing_content'
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    generated_text = db.Column(db.Text, nullable=False)
    # image_url = db.Column(db.String(500), nullable=True)
    # status = db.Column(db.String(20), default='draft')
    platform = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    product_name = db.Column(db.String(100), nullable=True)
    # 妳原本有的關聯
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    product = db.relationship('Product', backref='contents')

class ContentImage(db.Model):
    __tablename__ = 'content_image'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    content_id = db.Column(db.Integer, db.ForeignKey('marketing_content.id'), nullable=False)
    minio_url = db.Column(db.String(255), nullable=False)
    prompt_used = db.Column(db.Text)

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

    # --- 建立複合唯一限制條件 (Unique Constraint) ---
    __table_args__ = (
        db.UniqueConstraint('city_name', 'forecast_date', name='uix_city_date'),
    )

# 10. 節日曆表 (HolidayCalendar)
class HolidayCalendar(db.Model):
    __tablename__ = 'holiday_calendar'

    id = db.Column(db.Integer, primary_key=True)
    holiday_name = db.Column(db.String(100), nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    countdown_days = db.Column(db.Integer)
    
    # --- 新增的欄位 ---
    category_type = db.Column(db.String(50))
    note = db.Column(db.Text)

    # --- 建立唯一限制條件 (Unique Constraint) ---
    __table_args__ = (
        db.UniqueConstraint('holiday_name', 'target_date', name='unique_holiday_date'),
    )


# 11. 趨勢素材表 (ExternalTrends)
class ExternalTrends(db.Model):
    __tablename__ = 'external_trends'

    id = db.Column(db.Integer, primary_key=True)
    source_type = db.Column(db.String(50))
    content_summary = db.Column(db.Text)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)


# 7. 價格追蹤表 (PriceHistory)
class PriceHistory(db.Model):
    __tablename__ = 'price_history'

    id = db.Column(db.Integer, primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredient.id'), nullable=False)
    market_price = db.Column(db.Numeric(10, 2))
    change_rate = db.Column(db.Numeric(5, 2))
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)