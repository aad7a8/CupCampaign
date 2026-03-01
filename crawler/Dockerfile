FROM python:3.11

# 設定工作目錄
WORKDIR /app

# 1. 直接下載並安裝 Google Chrome (.deb 檔案會自動處理依賴)
# 這種方法不需要 apt-key，最適合新的 Debian 環境
RUN apt-get update && apt-get install -y wget unzip && \
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get install -y ./google-chrome-stable_current_amd64.deb && \
    rm google-chrome-stable_current_amd64.deb && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. 安裝 Python 套件 (請確保你的 requirements.txt 裡有 pandas, selenium, webdriver-manager)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. 複製程式碼
COPY . .

# 4. 執行主排程
CMD ["python", "main.py"]