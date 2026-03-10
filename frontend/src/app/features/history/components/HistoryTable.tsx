import { HistoryRecord } from '../types';
import { Button } from '@/app/components/ui/button';
import { Eye, Loader2, Heart } from 'lucide-react'; // 加入 Heart 代表互動
import { useLanguage } from '@/app/contexts/LanguageContext';
import { format } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';

interface HistoryTableProps {
  records: HistoryRecord[];
  loading?: boolean;
  onView: (record: HistoryRecord) => void;
  onNavigateToAudit?: () => void;
}

const getPlatformStyle = (platform: string) => {
  switch (platform.toUpperCase()) {
    case 'FB':
    case 'FACEBOOK':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'IG':
    case 'INSTAGRAM':
      return 'bg-pink-100 text-pink-700 border-pink-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export function HistoryTable({ records, loading, onView, onNavigateToAudit }: HistoryTableProps) {
  const { t, language } = useLanguage();
  const locale = language === 'zh-TW' ? zhTW : enUS;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-white">
        <p className="text-muted-foreground mb-4">{t('history.empty.noRecords')}</p>
        <Button variant="outline" onClick={onNavigateToAudit}>
          {t('history.empty.goToGenerate')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4"> {/* 卡片之間的間距 */}
      {records.map((record) => (
        <div
          key={record.id}
          className="flex items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
        >
          {/* 1. 左側縮圖區塊 */}
          <div className="w-24 h-24 flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 relative">
            {record.imageUrl ? (
              <img
                src={record.imageUrl}
                alt={record.product}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                NO IMAGE
              </div>
            )}
          </div>

          {/* 2. 中間內容資訊區塊 */}
          <div className="ml-5 flex-grow overflow-hidden">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-lg font-bold text-slate-800 truncate">
                {record.product || '未命名飲品'}
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getPlatformStyle(record.platform)}`}>
                {record.platform}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
              <span className="flex items-center">
                📅 {format(new Date(record.publishTime), 'yyyy-MM-dd HH:mm', { locale })}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                {record.engagementTotal?.toLocaleString() || 0}
              </span>
            </div>

            <p className="text-sm text-slate-600 line-clamp-1 italic" title={record.copyContent}>
              "{record.copyContent}"
            </p>
          </div>

          {/* 3. 右側操作區塊 */}
          <div className="ml-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-slate-100"
              onClick={() => onView(record)}
            >
              <Eye className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}