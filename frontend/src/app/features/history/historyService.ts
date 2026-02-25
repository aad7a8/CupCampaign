import { HistoryRecord, HistoryQueryParams, HistoryMetrics, HistoryFilters } from './types';
import { MOCK_HISTORY_RECORDS } from './mockData';

// 模擬 API 延遲
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 過濾記錄
const filterRecords = (records: HistoryRecord[], filters: HistoryFilters): HistoryRecord[] => {
  let filtered = [...records];

  // 日期過濾
  const now = new Date();
  const startDate = (() => {
    switch (filters.dateRange) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case '7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'custom':
        if (filters.customStartDate) {
          return new Date(filters.customStartDate);
        }
        return null;
      default:
        return null;
    }
  })();

  const endDate = filters.dateRange === 'custom' && filters.customEndDate
    ? new Date(filters.customEndDate)
    : now;

  if (startDate) {
    filtered = filtered.filter(record => {
      const recordDate = new Date(record.publishTime);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }

  // 平台過濾
  if (filters.platform !== 'ALL') {
    filtered = filtered.filter(record => record.platform === filters.platform);
  }

  // 關鍵字過濾
  if (filters.keyword && filters.keyword.trim()) {
    const keyword = filters.keyword.toLowerCase().trim();
    filtered = filtered.filter(record =>
      record.copyContent.toLowerCase().includes(keyword) ||
      record.campaign.toLowerCase().includes(keyword) ||
      (record.product && record.product.toLowerCase().includes(keyword))
    );
  }

  return filtered;
};

// 查詢歷史記錄
export const fetchHistoryRecords = async (
  params: HistoryQueryParams
): Promise<{ records: HistoryRecord[]; total: number }> => {
  await delay(500); // 模擬 API 延遲

  let filtered = filterRecords(MOCK_HISTORY_RECORDS, params);

  // 排序
  const sortBy = params.sortBy || 'publishTime';
  const sortOrder = params.sortOrder || 'desc';
  filtered.sort((a, b) => {
    const aValue = a[sortBy as keyof HistoryRecord];
    const bValue = b[sortBy as keyof HistoryRecord];
    const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // 分頁
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginated = filtered.slice(start, end);

  return {
    records: paginated,
    total: filtered.length,
  };
};

// 計算成效指標
export const calculateMetrics = async (
  filters: HistoryQueryParams
): Promise<HistoryMetrics> => {
  await delay(300);

  const filtered = filterRecords(MOCK_HISTORY_RECORDS, filters);
  const posts = filtered.length;
  const totalEngagement = filtered.reduce((sum, record) => 
    sum + (record.engagementTotal || 0), 0
  );
  const avgEngagement = posts > 0 ? Math.round(totalEngagement / posts) : 0;

  return {
    posts,
    totalEngagement,
    avgEngagement,
  };
};

// 獲取 Top 5 表現
export const fetchTop5Records = async (
  filters: HistoryQueryParams
): Promise<HistoryRecord[]> => {
  await delay(300);

  let filtered = filterRecords(MOCK_HISTORY_RECORDS, filters);
  
  // 只取有互動數的記錄，按互動數降序排序
  filtered = filtered
    .filter(record => record.engagementTotal !== undefined && record.engagementTotal > 0)
    .sort((a, b) => (b.engagementTotal || 0) - (a.engagementTotal || 0))
    .slice(0, 5);

  return filtered;
};

// 獲取最後同步時間（模擬）
export const getLastSyncTime = async (): Promise<string | null> => {
  await delay(200);
  const stored = localStorage.getItem('history_last_sync');
  return stored || null;
};

// 設置最後同步時間
export const setLastSyncTime = (): void => {
  localStorage.setItem('history_last_sync', new Date().toISOString());
};
