import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { HistoryFilters } from '@/app/features/history/components/HistoryFilters';
import { HistoryTable } from '@/app/features/history/components/HistoryTable';
import { HistoryDrawer } from '@/app/features/history/components/HistoryDrawer';
import { HistoryKPI } from '@/app/features/history/components/HistoryKPI';
import { HistoryTop5 } from '@/app/features/history/components/HistoryTop5';
import {
  fetchHistoryRecords,
  calculateMetrics,
  fetchTop5Records,
  getLastSyncTime,
  setLastSyncTime,
} from '@/app/features/history/historyService';
import { HistoryRecord, HistoryFilters as HistoryFiltersType, HistoryQueryParams } from '@/app/features/history/types';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { format } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

interface HistoryPageProps {
  onNavigate?: (page: string) => void;
}

export function HistoryPage({ onNavigate }: HistoryPageProps) {
  const { t, language } = useLanguage();
  const locale = language === 'zh-TW' ? zhTW : enUS;

  // 狀態管理
  const [activeTab, setActiveTab] = useState<'published' | 'performance'>('published');
  const [filters, setFilters] = useState<HistoryFiltersType>({
    dateRange: '30days',
    platform: 'ALL',
    keyword: '',
  });

  // 處理殘留 state：當 platform 為 LINE 時 fallback 為 ALL
  useEffect(() => {
    if (filters.platform === 'LINE') {
      setFilters(prev => ({ ...prev, platform: 'ALL' }));
    }
  }, [filters.platform]);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [metrics, setMetrics] = useState({ posts: 0, totalEngagement: 0, avgEngagement: 0 });
  const [top5Records, setTop5Records] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSyncTime, setLastSyncTimeState] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  // 載入最後同步時間
  useEffect(() => {
    loadLastSyncTime();
  }, []);

  // 當篩選條件改變時重新載入資料
  useEffect(() => {
    loadData();
  }, [filters, activeTab, currentPage]);

  const loadLastSyncTime = async () => {
    const syncTime = await getLastSyncTime();
    setLastSyncTimeState(syncTime);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const queryParams: HistoryQueryParams = {
        ...filters,
        page: currentPage,
        pageSize,
        sortBy: 'publishTime',
        sortOrder: 'desc',
      };

      // 過濾掉 LINE 平台的 query params（避免後端返回 LINE 資料）
      const filteredQueryParams = {
        ...queryParams,
        // 如果 platform 是 LINE，改為 ALL；否則保持原值
        platform: queryParams.platform === 'LINE' ? 'ALL' : queryParams.platform,
      };

      if (activeTab === 'published') {
        const result = await fetchHistoryRecords(filteredQueryParams);
        // 顯示層過濾：再次確保沒有 LINE 平台的紀錄
        const filteredRecords = result.records.filter(record => 
          record.platform !== 'LINE' && record.platform.toUpperCase() !== 'LINE'
        );
        setRecords(filteredRecords);
        // 計算總數時也排除 LINE
        const totalWithoutLine = result.total - result.records.filter(r => 
          r.platform === 'LINE' || r.platform.toUpperCase() === 'LINE'
        ).length;
        setTotalRecords(totalWithoutLine);
      } else {
        // 成效頁面：載入 KPI 和 Top 5
        const [metricsData, top5Data] = await Promise.all([
          calculateMetrics(filteredQueryParams),
          fetchTop5Records(filteredQueryParams),
        ]);
        // 過濾掉 LINE 平台的紀錄
        const filteredTop5 = top5Data.filter(record => 
          record.platform !== 'LINE' && record.platform.toUpperCase() !== 'LINE'
        );
        setMetrics(metricsData);
        setTop5Records(filteredTop5);
      }
    } catch (error) {
      console.error('Failed to load history data:', error);
      toast.error('載入資料失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLastSyncTime(null);
    setLastSyncTimeState(null);
    setLastSyncTime(); // 設置新的同步時間
    await loadLastSyncTime();
    await loadData();
    toast.success('資料已重新整理');
  };

  const handleView = (record: HistoryRecord) => {
    setSelectedRecord(record);
    setDrawerOpen(true);
  };

  const handleCopy = async (record: HistoryRecord) => {
    try {
      await navigator.clipboard.writeText(record.copyContent);
      toast.success(t('history.table.copySuccess'));
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('複製失敗，請手動複製');
    }
  };

  const handleNavigateToAudit = () => {
    if (onNavigate) {
      onNavigate('audit');
    }
  };

  // 格式化最後同步時間
  const formatLastSyncTime = () => {
    if (!lastSyncTime) return t('history.neverSynced');
    try {
      return format(new Date(lastSyncTime), 'yyyy-MM-dd HH:mm', { locale });
    } catch {
      return t('history.neverSynced');
    }
  };

  // 計算總頁數
  const totalPages = Math.ceil(totalRecords / pageSize);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 頁面標題與同步資訊 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1">{t('history.title')}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {t('history.lastSync')}: {formatLastSyncTime()}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('history.refresh')}
          </Button>
        </div>
      </div>

      {/* 篩選器 */}
      <HistoryFilters filters={filters} onChange={setFilters} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'published' | 'performance')}>
        <TabsList>
          <TabsTrigger value="published">{t('history.tabs.published')}</TabsTrigger>
          <TabsTrigger value="performance">{t('history.tabs.performance')}</TabsTrigger>
        </TabsList>

        {/* Tab A: 已發布列表 */}
        <TabsContent value="published" className="space-y-4">
          <HistoryTable
            records={records}
            loading={loading}
            onView={handleView}
            onNavigateToAudit={handleNavigateToAudit}
          />

          {/* 分頁 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                共 {totalRecords} 筆，第 {currentPage} / {totalPages} 頁
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  上一頁
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  下一頁
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab B: 發布文案成效 */}
        <TabsContent value="performance" className="space-y-6">
          <HistoryKPI metrics={metrics} loading={loading} />
          <HistoryTop5
            records={top5Records}
            loading={loading}
            onView={handleView}
          />
        </TabsContent>
      </Tabs>

      {/* Drawer */}
      <HistoryDrawer
        record={selectedRecord}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCopy={handleCopy}
      />
    </div>
  );
}
