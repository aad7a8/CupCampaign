import requests
import time
from datetime import datetime, date
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import delete
import sys
import os

# --- 終極強制校正路徑 ---
backend_path = "/app/backend"
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
# -----------------------

# 🚨 絕對不能寫 from app import app!
from app import create_app
from app.extensions import db  # 改從 extensions 直接拿 db 最安全
from app.models import WeatherForecast 

class WeatherSpider:
    def __init__(self):
        self.url = "https://api.open-meteo.com/v1/forecast"
        self.cities = {
            "基隆市": {"lat": 25.12, "lon": 121.74}, "台北市": {"lat": 25.03, "lon": 121.56},
            "新北市": {"lat": 25.01, "lon": 121.46}, "桃園市": {"lat": 24.99, "lon": 121.30},
            "新竹市": {"lat": 24.81, "lon": 120.97}, "新竹縣": {"lat": 24.83, "lon": 121.01},
            "苗栗縣": {"lat": 24.56, "lon": 120.82}, "台中市": {"lat": 24.14, "lon": 120.67},
            "彰化縣": {"lat": 24.05, "lon": 120.51}, "南投縣": {"lat": 23.91, "lon": 120.68},
            "雲林縣": {"lat": 23.70, "lon": 120.43}, "嘉義市": {"lat": 23.48, "lon": 120.44},
            "嘉義縣": {"lat": 23.45, "lon": 120.25}, "台南市": {"lat": 22.99, "lon": 120.21},
            "高雄市": {"lat": 22.62, "lon": 120.31}, "屏東縣": {"lat": 22.66, "lon": 120.48},
            "宜蘭縣": {"lat": 24.75, "lon": 121.75}, "花蓮縣": {"lat": 23.97, "lon": 121.60},
            "台東縣": {"lat": 22.75, "lon": 121.14}, "澎湖縣": {"lat": 23.57, "lon": 119.57},
            "金門縣": {"lat": 24.44, "lon": 118.37}, "連江縣": {"lat": 26.15, "lon": 119.92}
        }

    def _get_recommendation(self, temp, rain_prob):
        rec = []
        if rain_prob > 50: rec.append("帶傘")
        if temp >= 30: rec.append("防曬")
        elif temp >= 22: rec.append("舒適")
        elif temp >= 18: rec.append("加外套")
        else: rec.append("注意保暖") 
        return "、".join(rec)

    def _determine_condition(self, rain_prob):
        if rain_prob > 60: return "Rainy"
        elif rain_prob > 30: return "Cloudy"
        else: return "Sunny"

    def run(self):
        print("🌤️ 開始執行一週天氣更新任務...")
        
        # 產生 Flask 實例
        flask_app = create_app()
        
        # 開啟 app_context 來操作資料庫
        with flask_app.app_context():
            for city_name, coord in self.cities.items():
                params = {
                    "latitude": coord["lat"], "longitude": coord["lon"],
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                    "timezone": "Asia/Taipei", "forecast_days": 7
                }
                try:
                    res = requests.get(self.url, params=params).json()
                    daily = res.get("daily", {})
                    if not daily: continue

                    for i in range(7):
                        max_t, min_t = int(daily["temperature_2m_max"][i]), int(daily["temperature_2m_min"][i])
                        rain_prob = int(daily["precipitation_probability_max"][i])
                        avg_t = int((max_t + min_t) / 2)

                        stmt = insert(WeatherForecast).values(
                            city_name=city_name, forecast_date=daily["time"][i],
                            min_temp=min_t, max_temp=max_t, rain_prob=rain_prob,
                            condition=self._determine_condition(rain_prob),
                            recommendation=self._get_recommendation(avg_t, rain_prob),
                            updated_at=datetime.now()
                        )
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['city_name', 'forecast_date'],
                            set_={k: getattr(stmt.excluded, k) for k in ['min_temp', 'max_temp', 'rain_prob', 'condition', 'recommendation', 'updated_at']}
                        )
                        db.session.execute(stmt)
                    print(f"✅ {city_name} 同步完成")
                    time.sleep(0.1)
                except Exception as e:
                    print(f"❌ {city_name} 失敗: {e}")

            db.session.commit()
            db.session.execute(delete(WeatherForecast).where(WeatherForecast.forecast_date < date.today()))
            db.session.commit()
            print("🎉 天氣任務全數完成！")