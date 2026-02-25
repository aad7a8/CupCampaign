## 頂層目錄結構

```plaintext
drink_assistant/                               # 專案根目錄
│
├── backend/                                   # Python 後端（Flask）
│   ├── app/                                   #   應用程式套件（Package）
│   │   ├── __init__.py                        #     Flask App Factory（create_app()）
│   │   ├── routes.py                          #     所有 API 路由定義
│   │   ├── models.py                          #     SQLAlchemy ORM 模型（11 張表）
│   │   ├── config.py                          #     Flask 設定（讀取環境變數組合 DB URI）
│   │   ├── extensions.py                      #     Flask 擴充套件初始化（SQLAlchemy, Bcrypt）
│   │   ├── AI_services.py                     #     Gemini AI 文案生成服務
│   │   └── image_services.py                  #     AI 圖片生成服務（Nano Banana）
│   ├── tests/                                 #   測試代碼（預留）
│   ├── requirements.txt                       #   Python 依賴清單
│   └── Dockerfile                             #   後端容器映像檔定義
│
├── frontend/                                  # React 前端（Vite + TypeScript + Tailwind v4）
│   ├── src/                                   #   前端原始碼
│   │   ├── main.tsx                           #     應用程式進入點
│   │   ├── app/                               #     主要應用程式邏輯
│   │   │   ├── App.tsx                        #       根元件（路由 + 版面配置）
│   │   │   ├── components/                    #       頁面級元件
│   │   │   │   ├── login-page.tsx             #         登入頁
│   │   │   │   ├── dashboard-page.tsx         #         儀表板
│   │   │   │   ├── brand-setup-page.tsx       #         品牌初始設定
│   │   │   │   ├── menu-management-page.tsx   #         菜單管理
│   │   │   │   ├── content-audit-center.tsx   #         AI 文案 / 圖片生成中心
│   │   │   │   ├── history-page.tsx           #         歷史紀錄
│   │   │   │   ├── settings-page.tsx          #         設定頁
│   │   │   │   ├── general-settings-page.tsx  #         一般設定
│   │   │   │   ├── reset-password-page.tsx    #         重設密碼
│   │   │   │   ├── header.tsx                 #         頂部導覽列
│   │   │   │   ├── navigation.tsx             #         側邊導覽
│   │   │   │   ├── content-audit/             #         文案審核子元件
│   │   │   │   ├── menu-management/           #         菜單管理子元件
│   │   │   │   ├── figma/                     #         Figma 輔助元件
│   │   │   │   └── ui/                        #         共用 UI 元件（Radix + shadcn/ui）
│   │   │   ├── contexts/                      #       React Context（語系等）
│   │   │   ├── features/                      #       功能模組
│   │   │   │   └── history/                   #         歷史紀錄功能（元件 + 服務 + 型別）
│   │   │   ├── hooks/                         #       自訂 Hooks
│   │   │   ├── services/                      #       API 呼叫服務（authService 等）
│   │   │   └── data/                          #       前端靜態資料（預留）
│   │   └── styles/                            #     全域樣式
│   │       ├── index.css                      #       主要樣式進入點
│   │       ├── tailwind.css                   #       Tailwind 設定
│   │       ├── theme.css                      #       主題色彩變數
│   │       └── fonts.css                      #       字型設定
│   ├── public/                                #   靜態資源（預留）
│   ├── index.html                             #   HTML 進入點
│   ├── vite.config.ts                         #   Vite 建置設定（含 @ alias → src）
│   ├── postcss.config.mjs                     #   PostCSS 設定（Tailwind v4 自動處理）
│   ├── package.json                           #   Node.js 依賴定義
│   ├── package-lock.json                      #   依賴鎖定檔
│   ├── nginx.conf                             #   Nginx 反向代理與 SPA 路由設定
│   └── Dockerfile                             #   前端容器映像檔定義（多階段建置）
│
├── configs/                                   # 外部化設定檔
│   └── prompts/                               #   LLM System Prompts 模板（預留）
│
├── data/                                      # 靜態資料與種子資料
│   ├── seed/                                  #   資料庫初始種子資料
│   │   └── beverage_report.csv                #     爬蟲飲品報表（品牌 + 品項 + 價格）
│   └── templates/                             #   行銷模板素材
│       └── image_templates/                   #     圖片模板（供 AI 生圖參考，預留）
│
├── scripts/                                   # 開發與運維腳本
│   ├── seed_database.py                       #   種子資料匯入（讀取 CSV → DB）
│   └── init_test_data.py                      #   測試資料初始化（建立測試品牌 + 門市）
│
├── docs/                                      # 專案文件
│   ├── project_structure_guide.md             #   專案結構指南（本文件）
│   └── design/                                #   設計文件（預留）
│
├── infra/                                     # 基礎設施持久化資料（已 gitignore）
│   ├── postgres_data/                         #   PostgreSQL 資料目錄
│   └── minio_data/                            #   MinIO 物件儲存資料
│
├── docker-compose.yml                         # 容器編排定義（開發環境）
├── .env.example                               # 環境變數範本（已納入 Git）
├── .gitignore                                 # Git 忽略規則
└── README.md                                  # 專案介紹與快速入門
```

---

## 後端架構說明

### App Factory 模式

應用程式採用 Flask App Factory 模式（`backend/app/__init__.py`），透過 `create_app()` 函式建立 Flask 實例：

```python
from app import create_app
app = create_app()
```

### 資料庫模型（`models.py`）

| 模型                 | 資料表名稱              | 說明                     |
| -------------------- | ----------------------- | ------------------------ |
| `Tenant`             | `tenant`                | 品牌                     |
| `Store`              | `store`                 | 門市                     |
| `Users`              | `users`                 | 使用者（含密碼雜湊）     |
| `Product`            | `product`               | 飲品                     |
| `Ingredient`         | `ingredient`            | 原物料                   |
| `ProductComposition` | `product_composition`   | 飲品 ↔ 原物料（多對多）  |
| `MarketingContent`   | `marketing_content`     | 行銷文案紀錄             |
| `ContentImage`       | `content_image`         | 文案附屬圖片             |
| `PlatformToken`      | `platform_tokens`       | 社群平台授權 Token       |
| `WeatherForecast`    | `weather_forecast`      | 天氣預報                 |
| `HolidayCalendar`    | `holiday_calendar`      | 節日曆                   |
| `ExternalTrends`     | `external_trends`       | 外部趨勢素材             |
| `PriceHistory`       | `price_history`         | 原物料價格追蹤           |

### API 路由（`routes.py`）

| 方法   | 路徑                          | 說明                       |
| ------ | ----------------------------- | -------------------------- |
| GET    | `/api/health`                 | 健康檢查                   |
| POST   | `/api/auth/register`          | 註冊（品牌 + 門市 + 帳號） |
| POST   | `/api/auth/login`             | 登入（回傳 JWT HttpOnly Cookie） |
| POST   | `/api/auth/logout`            | 登出（清除 Cookie）        |
| GET    | `/api/stores`                 | 取得所有門市清單           |
| GET    | `/api/admin/products`         | 取得目前品牌的飲品清單     |
| POST   | `/api/admin/products`         | 批次新增飲品與配方         |
| POST   | `/api/generate_post`          | AI 生成行銷文案            |
| POST   | `/api/upload`                 | 上傳圖片至 MinIO           |
| POST   | `/api/content/generate-image` | AI 圖片生成                |
| POST   | `/api/content/publish`        | 發布文案（存入歷史紀錄）   |
| GET    | `/api/content/history`        | 取得文案歷史紀錄           |
| POST   | `/api/admin/platform/bind`    | 綁定 Facebook 粉絲專頁     |

---

## 前端架構說明

### 技術棧

- **React 18** + **TypeScript**
- **Vite 6** 建置工具
- **Tailwind CSS v4**（透過 `@tailwindcss/vite` 插件）
- **Radix UI** / **shadcn/ui** 元件庫
- **MUI** 圖示與部分元件
- **Recharts** 圖表
- **react-hook-form** 表單處理

### 路徑別名

`vite.config.ts` 設定 `@` → `src/`，可在 import 中使用：

```typescript
import { Button } from '@/app/components/ui/button'
```

---

## Docker 服務架構

```
Client :80 ──> Nginx（反向代理）
                 ├── /          ──> React SPA（靜態檔案）
                 └── /api/*     ──> Flask backend :5000
                                      ├── PostgreSQL :5432
                                      └── MinIO      :9000
```

| 服務         | 映像檔               | 連接埠             | 說明                         |
| ------------ | -------------------- | ------------------ | ---------------------------- |
| **frontend** | node:20 / nginx:1.28 | 80                 | React SPA + Nginx 反向代理    |
| **backend**  | python:3.11          | 5000               | Flask API（Gunicorn 啟動）    |
| **postgres** | postgres:18-alpine   | 5432               | 關聯式資料庫                  |
| **minio**    | minio/minio:latest   | 9000 (API), 9001 (Console) | S3 相容物件儲存       |

---

## 環境變數（`.env.example`）

| 變數                  | 預設值               | 說明                       |
| --------------------- | -------------------- | -------------------------- |
| `POSTGRES_USER`       | `postgres`           | PostgreSQL 使用者名稱       |
| `POSTGRES_PASSWORD`   | `postgres`           | PostgreSQL 密碼             |
| `POSTGRES_DB`         | `drink_assistant_db` | PostgreSQL 資料庫名稱       |
| `MINIO_ROOT_USER`     | `minioadmin`         | MinIO 管理員帳號            |
| `MINIO_ROOT_PASSWORD` | `minioadmin`         | MinIO 管理員密碼            |
| `MINIO_ENDPOINT`      | `minio:9000`         | MinIO 內部端點              |
| `DB_HOST`             | `postgres`           | Flask 連線用 DB 主機        |
| `DB_PORT`             | `5432`               | Flask 連線用 DB 連接埠      |
| `DB_USER`             | `postgres`           | Flask 連線用 DB 使用者      |
| `DB_PASSWORD`         | `postgres`           | Flask 連線用 DB 密碼        |
| `DB_NAME`             | `drink_assistant_db` | Flask 連線用 DB 名稱        |
| `MY_APP_SECRET_KEY`   | —                    | JWT 簽署密鑰                |
| `GEMINI_API_KEY`      | —                    | Google Gemini API Key       |
| `FB_APP_ID`           | —                    | Facebook App ID（選填）     |
| `FB_APP_SECRET`       | —                    | Facebook App Secret（選填） |

---

## 未來擴充項目（目前預留空目錄或尚未建立）

以下為規劃中但目前無對應原始碼的項目：

- `.github/workflows/` — CI/CD（ci.yml, deploy.yml）
- `configs/settings.toml` — 應用程式非機密設定
- `configs/logging.conf` — 日誌設定
- `configs/prompts/*.txt` — LLM Prompt 模板
- `data/seed/*.json` — JSON 格式種子資料
- `scripts/setup_dev.sh` — 開發環境一鍵安裝
- `scripts/init_minio_buckets.py` — MinIO Bucket 初始化
- `scripts/run_migrations.sh` — 資料庫遷移
- `docker-compose.prod.yml` — 生產環境容器編排
- `Makefile` — 常用指令快捷方式
- `docs/api/` — API 規格文件
- `docs/images/` — 文件用圖片
