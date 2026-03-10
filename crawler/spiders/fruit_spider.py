import os
import sys
import time
from datetime import date, datetime, timedelta
import requests

# 將專案根目錄加入 sys.path，確保能匯入 app 與 models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__name__), '..')))

from app.extensions import db
from app.models import Ingredient, PriceHistory

# 目標水果清單
TARGET_FRUITS = [
    "草莓", "百香果-其他", "鳳梨-金鑽鳳梨", "甜橙-柳橙", 
    "雜柑-檸檬", "酪梨-進口", "葡萄柚-紅肉", "番石榴-紅心", 
    "芒果-其他", "蘋果-惠"
]

def parse_minguo(s: str) -> date:
    parts = s.split(".")
    year = int(parts[0]) + 1911
    month = int(parts[1])
    day = int(parts[2])
    return date(year, month, day)

def to_minguo(d: date) -> str:
    return f"{d.year - 1911}.{d.month:02d}.{d.day:02d}"

def get_fruit_data(start_time: str, end_time: str) -> list:
    """呼叫農委會 API 獲取資料"""
    url = "https://data.moa.gov.tw/api/v1/AgriProductsTransType/"
    params = {
        "Start_time": start_time,
        "End_time": end_time,
        "MarketName": "台北一",
        "TcType": "N05", # N05 代表水果類
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("Data", [])
    except Exception as e:
        print(f"❌ 抓取 API 失敗 ({start_time}): {e}")
        return []

# ⚠️ 這裡移除了 create_app()，改由外部統一建立 Context 以提升效能
def process_daily_data(target_date: date, daily_records: list):
    """處理單日資料寫入 DB，並處理休市邏輯"""
    today_prices = {}
    for item in daily_records:
        crop_name = item.get("CropName", "")
        if crop_name in TARGET_FRUITS:
            today_prices[crop_name] = float(item.get("Avg_Price", 0))

    record_datetime = datetime(target_date.year, target_date.month, target_date.day)

    for fruit_name in TARGET_FRUITS:
        # 1. 確保該水果 (Ingredient) 存在
        ingredient = Ingredient.query.filter_by(name=fruit_name).first()
        if not ingredient:
            ingredient = Ingredient(name=fruit_name)
            db.session.add(ingredient)
            db.session.flush()

        # 2. 檢查重複與取得歷史紀錄
        existing = PriceHistory.query.filter_by(
            ingredient_id=ingredient.id, 
            recorded_at=record_datetime
        ).first()
        if existing: continue

        last_record = PriceHistory.query.filter_by(ingredient_id=ingredient.id)\
                                        .order_by(PriceHistory.recorded_at.desc()).first()
        last_price = float(last_record.market_price) if last_record else 0.0

        # 3. 休市邏輯處理
        if fruit_name in today_prices and today_prices[fruit_name] > 0:
            current_price = today_prices[fruit_name]
            change_rate = round(((current_price - last_price) / last_price) * 100, 2) if last_price > 0 else 0.0
            print(f"[{target_date}] 🍏 {fruit_name}: {current_price} 元")
        else:
            if last_price > 0:
                current_price = last_price
                change_rate = 0.0
                print(f"[{target_date}] 💤 {fruit_name}: 休市，延用價格 {current_price}")
            else: continue 

        # 4. 寫入
        db.session.add(PriceHistory(
            ingredient_id=ingredient.id,
            market_price=current_price,
            change_rate=change_rate,
            recorded_at=record_datetime
        ))

    db.session.commit()

def run_crawler():
    # 👇 把 app_context 開在最外層，整個爬蟲過程只啟動一次 Flask
    from app import create_app
    flask_app = create_app()
    
    with flask_app.app_context():
        # 👇 直接計算從今天往前推 7 天的日期
        today = date.today()
        start_date = today - timedelta(days=7)

        print(f"🚀 開始整合爬取水果價格：{start_date} ~ {today}")

        current = start_date
        while current <= today:
            end = current + timedelta(days=6)
            if end > today:
                end = today

            # 🛠️ 時光機機制：打 API 時，將年份減 2 年 (例如 115 轉 113) 來獲取真實歷史資料
            api_start_str = f"{current.year - 1913}.{current.month:02d}.{current.day:02d}"
            api_end_str = f"{end.year - 1913}.{end.month:02d}.{end.day:02d}"
            
            print(f"📡 正在請求 API (以 {api_start_str} ~ {api_end_str} 替代實際 2026 年資料)...")
            records = get_fruit_data(api_start_str, api_end_str)

            # 將這週的資料依照「假日期」(把年份加回 2 年) 分組
            grouped_data = {}
            for r in records:
                orig_date = r.get("TransDate") # e.g., "113.03.07"
                if not orig_date: continue
                
                parts = orig_date.split('.')
                # 轉回 2026 (民國 115) 讓資料庫時間正確
                fake_future_date = f"{int(parts[0]) + 2}.{parts[1]}.{parts[2]}" 
                
                if fake_future_date not in grouped_data:
                    grouped_data[fake_future_date] = []
                grouped_data[fake_future_date].append(r)

            day_iter = current
            while day_iter <= end:
                day_str = to_minguo(day_iter)
                daily_records = grouped_data.get(day_str, []) 
                
                process_daily_data(day_iter, daily_records)
                
                day_iter += timedelta(days=1)

            current = end + timedelta(days=1)
            time.sleep(1)

    print("🎉 所有價格資料已成功寫入資料庫！")

if __name__ == "__main__":
    # 這裡不再需要 sys.argv 傳入參數，直接執行即可
    run_crawler()