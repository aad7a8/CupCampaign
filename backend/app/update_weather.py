import requests
import time
from datetime import datetime, date
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import delete

# 關鍵修改：直接從 app.py 匯入 app 物件與 db 物件
from app import app, db 
# 引用 Model
from models import WeatherForecast 

# 各縣市座標 (保持不變)
CITIES = {
    "基隆市": {"lat": 25.12, "lon": 121.74},
    "台北市": {"lat": 25.03, "lon": 121.56},
    "新北市": {"lat": 25.01, "lon": 121.46},
    "桃園市": {"lat": 24.99, "lon": 121.30},
    "新竹市": {"lat": 24.81, "lon": 120.97},
    "新竹縣": {"lat": 24.83, "lon": 121.01},
    "苗栗縣": {"lat": 24.56, "lon": 120.82},
    "台中市": {"lat": 24.14, "lon": 120.67},
    "彰化縣": {"lat": 24.05, "lon": 120.51},
    "南投縣": {"lat": 23.91, "lon": 120.68},
    "雲林縣": {"lat": 23.70, "lon": 120.43},
    "嘉義市": {"lat": 23.48, "lon": 120.44},
    "嘉義縣": {"lat": 23.45, "lon": 120.25},
    "台南市": {"lat": 22.99, "lon": 120.21},
    "高雄市": {"lat": 22.62, "lon": 120.31},
    "屏東縣": {"lat": 22.66, "lon": 120.48},
    "宜蘭縣": {"lat": 24.75, "lon": 121.75},
    "花蓮縣": {"lat": 23.97, "lon": 121.60},
    "台東縣": {"lat": 22.75, "lon": 121.14},
    "澎湖縣": {"lat": 23.57, "lon": 119.57},
    "金門縣": {"lat": 24.44, "lon": 118.37},
    "連江縣": {"lat": 26.15, "lon": 119.92}
}

URL = "https://api.open-meteo.com/v1/forecast"

def get_weather_recommendation(temp, rain_prob):
    rec = []
    if rain_prob > 50:
        rec.append("帶傘")
    if temp >= 30:
        rec.append("防曬")
    elif temp >= 22:
        rec.append("舒適")
    elif temp >= 18:
        rec.append("加外套")
    else:
        rec.append("注意保暖") 
    return "、".join(rec)

def determine_condition(rain_prob):
    if rain_prob > 60: return "Rainy"
    elif rain_prob > 30: return "Cloudy"
    else: return "Sunny"

def clean_old_data():
    """清理今天以前的舊資料"""
    today = date.today()
    print(f"🧹 開始清理 {today} 以前的過期資料...")
    try:
        stmt = delete(WeatherForecast).where(WeatherForecast.forecast_date < today)
        result = db.session.execute(stmt)
        print(f"🗑️ 已刪除 {result.rowcount} 筆過期資料。")
    except Exception as e:
        print(f"⚠️ 清理資料失敗: {e}")

def fetch_and_update_weekly():
    print("🚀 開始執行一週天氣更新任務...")
    
    # 使用 app.app_context() 確保能使用資料庫連線
    with app.app_context():
        for city_name, coord in CITIES.items():
            params = {
                "latitude": coord["lat"],
                "longitude": coord["lon"],
                # 稍微優化 API 參數的傳遞方式
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": "Asia/Taipei",
                "forecast_days": 7
            }

            try:
                response = requests.get(URL, params=params)
                data = response.json()
                daily = data.get("daily", {})

                if not daily: continue

                for i in range(7):
                    date_str = daily["time"][i]
                    max_t = int(daily["temperature_2m_max"][i])
                    min_t = int(daily["temperature_2m_min"][i])
                    rain_prob = int(daily["precipitation_probability_max"][i])
                    
                    avg_t = int((max_t + min_t) / 2)
                    rec_text = get_weather_recommendation(avg_t, rain_prob)
                    condition_text = determine_condition(rain_prob)

                    # Upsert 邏輯
                    stmt = insert(WeatherForecast).values(
                        city_name=city_name,
                        forecast_date=date_str,
                        min_temp=min_t,
                        max_temp=max_t,
                        rain_prob=rain_prob,
                        condition=condition_text,
                        recommendation=rec_text,
                        updated_at=datetime.now()
                    )

                    stmt = stmt.on_conflict_do_update(
                        index_elements=['city_name', 'forecast_date'], 
                        set_={
                            'min_temp': stmt.excluded.min_temp,
                            'max_temp': stmt.excluded.max_temp,
                            'rain_prob': stmt.excluded.rain_prob,
                            'condition': stmt.excluded.condition,
                            'recommendation': stmt.excluded.recommendation,
                            'updated_at': stmt.excluded.updated_at
                        }
                    )
                    db.session.execute(stmt)
                
                print(f"✅ {city_name} 一週預報同步完成")
                time.sleep(0.1)

            except Exception as e:
                print(f"❌ {city_name} 更新失敗: {e}")

        try:
            db.session.commit()
            print("💾 天氣資料更新提交成功。")
        except Exception as e:
            db.session.rollback()
            print(f"❌ 資料庫提交錯誤: {e}")
            return

        clean_old_data()
        db.session.commit()
        print("🎉 所有任務完成！")

if __name__ == "__main__":
    fetch_and_update_weekly()