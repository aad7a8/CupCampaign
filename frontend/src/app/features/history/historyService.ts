import { HistoryRecord, HistoryQueryParams, HistoryMetrics } from './types';

const API_BASE_URL = '/api/content/history';

/**
 * 查詢歷史記錄
 * 這裡將 API 回傳的資料結構轉換為前端組件需要的格式
 */
export const fetchHistoryRecords = async (
  params: HistoryQueryParams
): Promise<{ records: HistoryRecord[]; total: number }> => {
  // 注意：目前的 Flask API 尚未實作後端分頁與過濾參數，
  // 若後續需要，需在 Flask get_history 內加入 request.args.get('platform') 等邏輯
  const response = await fetch(API_BASE_URL, {
    method: 'GET',
    // 瀏覽器會自動帶上 request.cookies 中的 access_token
  });

  if (!response.ok) {
    throw new Error('無法取得歷史紀錄');
  }

  const result = await response.json();

  if (result.status !== 'success') {
    throw new Error(result.message || '讀取資料失敗');
  }

  // 欄位轉換：將後端欄位對應到前端定義的 HistoryRecord 介面
  const mappedRecords: HistoryRecord[] = result.data.map((item: any) => ({
    id: item.id,
    platform: item.platform,
    copyContent: item.final_text || item.text || '無內容', // 對應後端的 'text'
    product: item.product_name,      // 對應後端的 'product_name'
    publishTime: item.created_at,    // 對應後端的 'created_at'
    campaign: '一般發布',             // 後端暫無此欄位，給予預設值
    engagementTotal: item.like || 0, // 後端暫無成效數據，給予預設值
    imageUrl: item.image_url || '',
  }));

  // 前端過濾邏輯 (因為目前 Flask API 是回傳 .all()，建議在此做簡單過濾)
  let filtered = [...mappedRecords];
  if (params.platform && params.platform !== 'ALL') {
    filtered = filtered.filter(r => r.platform === params.platform);
  }
  if (params.keyword) {
    const k = params.keyword.toLowerCase();
    filtered = filtered.filter(r =>
      r.copyContent.toLowerCase().includes(k) ||
      (r.product && r.product.toLowerCase().includes(k))
    );
  }

  // 前端分頁處理
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return {
    records: paginated,
    total: filtered.length,
  };
};

/**
 * 計算成效指標
 * (目前後端資料庫 MarketingContent 暫無 engagement 相關欄位，先回傳 0)
 */
export const calculateMetrics = async (params: HistoryQueryParams): Promise<HistoryMetrics> => {
  const { records, total } = await fetchHistoryRecords(params);
  return {
    posts: total,
    totalEngagement: 0,
    avgEngagement: 0,
  };
};

/**
 * 獲取 Top 5 表現
 * (同上，因暫無成效欄位，先回傳前五筆)
 */
export const fetchTop5Records = async (params: HistoryQueryParams): Promise<HistoryRecord[]> => {
  const { records } = await fetchHistoryRecords({ ...params, pageSize: 5 });
  return records;
};

/**
 * 獲取最後同步時間
 * (這部分可維持讀取 localStorage 或讓 Flask 增加一個 API)
 */
export const getLastSyncTime = async (): Promise<string | null> => {
  return localStorage.getItem('history_last_sync');
};

export const setLastSyncTime = (): void => {
  localStorage.setItem('history_last_sync', new Date().toISOString());
};