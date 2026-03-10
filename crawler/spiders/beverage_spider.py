import sys
import os
import time
import re
import datetime
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
        options.add_argument("--headless=new") 
        options.add_argument("--no-sandbox") 
        options.add_argument("--disable-dev-shm-usage") 
        options.add_argument("--start-maximized")
        options.add_argument("--incognito")
        options.add_argument("--disable-popup-blocking")
        options.add_argument("--disable-gpu") 
        options.add_argument("--blink-settings=imagesEnabled=false") 

        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()), 
            options=options
        )
        self.driver.set_page_load_timeout(45)
        self.final_menu_list = []

    def close(self):
        if hasattr(self, 'driver') and self.driver:
            self.driver.quit()
            print("Successfully closed the browser session.", flush=True)

    def scroll_page_to_bottom(self):
        """🌟 終極解法：將每個分類逐一捲動到畫面中央，強迫觸發懶加載"""
        print("開始逐一捲動類別以觸發懶加載...", flush=True)
        try:
            # 取得所有大類別的容器
            categories = self.driver.find_elements(By.CSS_SELECTOR, "div.item.menu-item")
            for index, category in enumerate(categories):
                # 強制把該類別滾動到畫面正中央
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", category)
                print(f"  -> 正在載入第 {index + 1}/{len(categories)} 個分類...", flush=True)
                # 停頓 1.5 秒讓裡面的飲料品項渲染出來
                time.sleep(1.5)
        except Exception as e:
            print(f"捲動過程發生小錯誤，略過並繼續: {e}", flush=True)
        print("所有類別捲動完畢，準備抓取！", flush=True)

# --- 爬蟲主邏輯類別 ---
class NidinSpider(BaseBeverageSpider):
    def scrape(self, brand_name, url, exclude_keywords=None):
        exclude_keywords = exclude_keywords or []
        self.local_seen = []
        
        try:
            self.driver.get(url)
        except Exception as e:
            print(f"⚠️ [{brand_name}] 網頁載入逾時或失敗，跳過: {e}", flush=True)
            return

        time.sleep(4) 

        try:
            close_button = WebDriverWait(self.driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "div.close.bg-secondary"))
            )
            close_button.click()
            print(f"[{brand_name}] 彈窗已關閉", flush=True)
        except:
            pass

        # 🌟 強制各分類渲染
        self.scroll_page_to_bottom()

        print(f"[{brand_name}] 開始解析畫面上所有的菜單...", flush=True)
        try:
            all_contents = self.driver.find_element(By.CSS_SELECTOR, "div.menu-list.grid")
            items = all_contents.find_elements(By.CSS_SELECTOR, "div.item.menu-item")
            print(f"[{brand_name}] 確認解析 {len(items)} 個大類別", flush=True)

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
                        print(f"[{brand_name}] {category_title} -> {item_name}: {price_raw}", flush=True)
        except Exception as e:
            print(f"❌ [{brand_name}] 抓取或解析時發生錯誤: {e}", flush=True)

    def scrape_nidin_special(self, brand_name, url):
        print(f"\n--- 開始爬取特殊清洗店家：{brand_name} ---", flush=True)
        try:
            self.driver.get(url)
        except Exception as e:
            print(f"⚠️ [{brand_name}] 網頁載入逾時或失敗，跳過: {e}", flush=True)
            return
            
        time.sleep(4)
        
        # 🌟 強制各分類渲染
        self.scroll_page_to_bottom()
        
        local_seen = []
        try:
            all_content = self.driver.find_element(By.CSS_SELECTOR, "div.menu-list")
            items = all_content.find_elements(By.CSS_SELECTOR, "div.item.menu-item")
            print(f"[{brand_name}] 確認解析 {len(items)} 個大類別", flush=True)

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
                            print(f"[{brand_name}] {category_title} -> {name}: {price_raw}", flush=True)
                    except: continue
        except Exception as e:
            print(f"❌ [{brand_name}] 抓取發生錯誤: {e}", flush=True)

# --- 資料庫同步函數 ---
def save_scraped_data_to_db(data_list):
    flask_app = create_app()
    with flask_app.app_context():
        brand_data_map = {}
        for item in data_list:
            brand = item.get('brand')
            if brand not in brand_data_map:
                brand_data_map[brand] = []
            brand_data_map[brand].append(item)

        total_added_count = 0
        for brand_name, items in brand_data_map.items():
            try:
                brand_added_count = 0
                tenant = Tenant.query.filter_by(name=brand_name).first()
                if not tenant:
                    tenant = Tenant(name=brand_name, is_registered=True)
                    db.session.add(tenant)
                    db.session.flush()

                Product.query.filter_by(tenant_id=tenant.id).delete()
                print(f"🧹 已清除 [{brand_name}] 的舊菜單資料", flush=True)

                for item in items:
                    drink_name = item.get('item_name')
                    try:
                        price_val = float(item.get('price', 0))
                        scraped_dt = datetime.datetime.strptime(item.get('scraped_at'), '%Y-%m-%d %H:%M:%S')
                    except: continue

                    db.session.add(Product(
                        tenant_id=tenant.id, 
                        name=drink_name,
                        category=item.get('category'), 
                        price=price_val, 
                        scraped_at=scraped_dt
                    ))
                    brand_added_count += 1
                
                db.session.commit()
                total_added_count += brand_added_count
                print(f"✅ [{brand_name}] 同步完成，最新品項共 {brand_added_count} 筆。", flush=True)
            except Exception as e:
                db.session.rollback()
                print(f"❌ [{brand_name}] 寫入失敗: {e}", flush=True)
        print(f"🎉 菜單更新作業結束，總計寫入 {total_added_count} 筆最新品項。", flush=True)

# --- 主任務函數 ---
def run_beverage_pipeline():
    print("=== 開始執行手搖飲菜單爬蟲 ===", flush=True)
    spider = NidinSpider()
    nidin_tasks = [
        {"brand": "功夫茶", "url": "https://order.nidin.shop/menu/22590", "exclude_keywords":["袋"]},
        {"brand": "大茗本位製茶堂", "url": "https://order.nidin.shop/menu/15667", "exclude_keywords":["袋"]},
        {"brand": "得正" , "url": "https://order.nidin.shop/menu/20217", "exclude_keywords":["袋"]},
        {"brand": "先喝道", "url": "https://order.nidin.shop/menu/14614", "exclude_keywords":["袋","吸管"]},
        {"brand": "清心福全", "url": "https://order.nidin.shop/menu/26542", "exclude_keywords":["袋"]},
        {"brand": "迷客夏", "url": "https://order.nidin.shop/menu/15151", "exclude_keywords":["袋"]},
        {"brand": "comebuy", "url": "https://order.nidin.shop/menu/11509", "exclude_keywords":["袋"]},
        {"brand": "龜記", "url": "https://order.nidin.shop/menu/27601", "exclude_keywords":["袋"]}
    ]
    special_tasks = [{"brand": "五十嵐", "url": "https://order.nidin.shop/menu/485"}]

    for task in nidin_tasks:
        try:
            spider.scrape(task["brand"], task["url"], task["exclude_keywords"])
        except Exception as e:
            print(f"❌ [{task['brand']}] 整體爬取發生錯誤，已跳過: {e}", flush=True)
            
    for task in special_tasks:
        try:
            spider.scrape_nidin_special(task["brand"], task["url"])
        except Exception as e:
            print(f"❌ [{task['brand']}] 整體爬取發生錯誤，已跳過: {e}", flush=True)
            
    try:
        spider.scrape("coco都可", "https://order.nidin.shop/menu/843", exclude_keywords=["元", "買一送一", "任選","袋"])
    except Exception as e:
        print(f"❌ [coco都可] 整體爬取發生錯誤，已跳過: {e}", flush=True)
        
    try:
        if spider.final_menu_list:
            save_scraped_data_to_db(spider.final_menu_list)
        else:
            print("⚠️ 本次執行沒有抓到任何菜單資料", flush=True)
    except Exception as e:
        print(f"❌ 資料庫儲存發生錯誤: {e}", flush=True)
    finally:
        spider.close()

if __name__ == "__main__":
    run_beverage_pipeline()