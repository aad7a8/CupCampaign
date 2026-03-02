import sys
import os
import time
import re
import json
import datetime
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# --- 終極強制校正路徑 ---
backend_path = "/app/backend"
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app
from app.extensions import db
from app.models import Tenant, Product

# --- 基礎爬蟲類別 ---
class BaseBeverageSpider:
    def __init__(self):
        options = webdriver.ChromeOptions()
        # Docker 環境必要設定
        options.add_argument("--headless") 
        options.add_argument("--no-sandbox") 
        options.add_argument("--disable-dev-shm-usage") 
        options.add_argument("--start-maximized")
        options.add_argument("--incognito")
        options.add_argument("--disable-popup-blocking")

        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()), 
            options=options
        )
        self.final_menu_list = []

    def close(self):
        """確保正確關閉瀏覽器"""
        if hasattr(self, 'driver') and self.driver:
            self.driver.quit()
            print("Successfully closed the browser session.")

# --- 爬蟲主邏輯類別 ---
class NidinSpider(BaseBeverageSpider):
    def scrape(self, brand_name, url, exclude_keywords=None):
        self.driver.get(url)
        time.sleep(3) 
        self.local_seen = []
        if exclude_keywords is None:
            exclude_keywords = []

        try:
            close_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "div.close.bg-secondary"))
            )
            close_button.click()
            print(f"[{brand_name}] 彈窗已關閉")
        except:
            pass
        
        try:
            all_contents = self.driver.find_element(By.CSS_SELECTOR, "div.menu-list.grid")
            items = all_contents.find_elements(By.CSS_SELECTOR, "div.item.menu-item")
            for item in items:
                category_title = item.find_element(By.CSS_SELECTOR, "div.q-py-sm.b-color").text
                item_names = item.find_elements(By.CSS_SELECTOR, "div.q-px-md.cursor-pointer")
                for name_element in item_names:
                    full_info = name_element.text
                    all_numbers = re.findall(r'\d+', full_info)
                    price_raw = all_numbers[-1] if all_numbers else "0"
                    item_name = name_element.find_element(By.CSS_SELECTOR, "div").text.strip().split('\n')[0]
                    if any(key in item_name for key in exclude_keywords):
                        continue 
                    if item_name and item_name not in self.local_seen:
                        self.local_seen.append(item_name)
                        self.final_menu_list.append({
                            "brand": brand_name, "category": category_title,
                            "item_name": item_name, "price": price_raw,
                            "scraped_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        })
                        print(f"[{brand_name}] {category_title} -> {item_name}: {price_raw}")
        except Exception as e:
            print(f"抓取 {brand_name} 時發生錯誤: {e}")

    def scrape_nidin_special(self, brand_name, url):
        print(f"\n--- 開始爬取特殊清洗店家：{brand_name} ---")
        self.driver.get(url)
        time.sleep(3)
        local_seen = []
        try:
            all_content = self.driver.find_element(By.CSS_SELECTOR, "div.menu-list")
            items = all_content.find_elements(By.CSS_SELECTOR, "div.item.menu-item")
            for item in items:
                category_title = item.find_element(By.CSS_SELECTOR, "div.q-py-sm.b-color").text
                category_items = item.find_elements(By.CSS_SELECTOR, "div.q-px-md.cursor-pointer")
                for c in category_items:
                    full_info = c.text
                    all_numbers = re.findall(r'\d+', full_info)
                    price_raw = all_numbers[-1] if all_numbers else "0"
                    try:
                        name = c.find_element(By.CSS_SELECTOR, "span").text
                        if "●" in name: name = name.split("●")[1]
                        elif name.startswith(("大", "中")): name = name[1:]
                        if name and name[0].isdigit(): name = re.sub(r'^\d+', '', name) 
                        if name and name not in local_seen:
                            local_seen.append(name)
                            self.final_menu_list.append({
                                "brand": brand_name, "category": category_title,
                                "item_name": name, "price": price_raw,
                                "scraped_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            })
                            print(f"{category_title} -> {name}: {price_raw}")
                    except: continue
        except Exception as e:
            print(f"特殊店家 {brand_name} 抓取失敗: {e}")

# --- 資料庫同步函數 ---
def save_scraped_data_to_db(data_list):
    flask_app = create_app()
    with flask_app.app_context():
        try:
            count = 0
            for item in data_list:
                brand_name, drink_name = item.get('brand'), item.get('item_name')
                tenant = Tenant.query.filter_by(name=brand_name).first()
                if not tenant:
                    tenant = Tenant(name=brand_name, is_registered=True)
                    db.session.add(tenant)
                    db.session.flush()

                existing_product = Product.query.filter_by(tenant_id=tenant.id, name=drink_name).first()
                price_val = float(item.get('price', 0))
                scraped_dt = datetime.datetime.strptime(item.get('scraped_at'), '%Y-%m-%d %H:%M:%S')

                if not existing_product:
                    db.session.add(Product(
                        tenant_id=tenant.id, name=drink_name,
                        category=item.get('category'), price=price_val, scraped_at=scraped_dt
                    ))
                    count += 1
                else:
                    existing_product.price = price_val
                    existing_product.scraped_at = scraped_dt
            db.session.commit()
            print(f"✅ 資料庫同步完成！新增 {count} 筆。")
        except Exception as e:
            db.session.rollback()
            print(f"❌ 寫入資料庫失敗: {e}")

# --- 主任務函數 ---
def run_beverage_pipeline():
    print("=== 開始執行手搖飲菜單爬蟲 ===")
    spider = NidinSpider()
    nidin_tasks = [
        {"brand": "功夫茶", "url": "https://order.nidin.shop/menu/22590", "exclude_keywords":["袋"]},
        {"brand": "大茗本位製茶堂", "url": "https://order.nidin.shop/menu/15667", "exclude_keywords":["袋"]},
        {"brand": "得正" , "url": "https://order.nidin.shop/menu/20217", "exclude_keywords":["袋"]},
        {"brand": "先喝道", "url": "https://order.nidin.shop/menu/14614", "exclude_keywords":["袋","吸管"]},
        {"brand": "清心福全", "url": "https://order.nidin.shop/menu/26542", "exclude_keywords":["袋"]},
        {"brand": "迷克夏", "url": "https://order.nidin.shop/menu/15151", "exclude_keywords":["袋"]},
        {"brand": "comebuy", "url": "https://order.nidin.shop/menu/11509", "exclude_keywords":["袋"]},
        {"brand": "龜記", "url": "https://order.nidin.shop/menu/27601", "exclude_keywords":["袋"]}
    ]
    special_tasks = [{"brand": "五十嵐", "url": "https://order.nidin.shop/menu/485"}]

    try:
        for task in nidin_tasks:
            spider.scrape(task["brand"], task["url"], task["exclude_keywords"])
        for task in special_tasks:
            spider.scrape_nidin_special(task["brand"], task["url"])
        spider.scrape("coco都可", "https://order.nidin.shop/menu/843", exclude_keywords=["元", "買一送一", "任選","袋"])
        
        if spider.final_menu_list:
            save_scraped_data_to_db(spider.final_menu_list)
    except Exception as e:
        print(f"任務發生錯誤: {e}")
    finally:
        spider.close()

if __name__ == "__main__":
    run_beverage_pipeline()