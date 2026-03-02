import { HistoryRecord } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Eye, Loader2, Facebook, Instagram } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface HistoryTableProps {
  records: HistoryRecord[];
  loading?: boolean;
  onView: (record: HistoryRecord) => void;
  onNavigateToAudit?: () => void;
}

const getPlatformLabel = (platform: HistoryRecord['platform']) => {
  switch (platform) {
    case 'FB':
      return 'Facebook';
    case 'IG':
      return 'Instagram';
    case 'LINE':
      return 'LINE';
    default:
      return platform;
  }
};

const getPlatformBadge = (platform: HistoryRecord['platform']) => {
  switch (platform) {
    case 'FB':
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
          <Facebook className="w-3 h-3 mr-1" />
          Facebook
        </Badge>
      );
    case 'IG':
      return (
        <Badge variant="outline" className="text-pink-600 border-pink-200 bg-pink-50">
          <Instagram className="w-3 h-3 mr-1" />
          Instagram
        </Badge>
      );
    case 'LINE':
      return (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
          LINE
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {platform}
        </Badge>
      );
  }
};

export function HistoryTable({ records, loading, onView, onNavigateToAudit }: HistoryTableProps) {
  const { t } = useLanguage();
  const locale = zhTW;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">{t('history.empty.noRecords')}</p>
        <Button
          variant="outline"
          onClick={onNavigateToAudit}
        >
          {t('history.empty.goToGenerate')}
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden border-gray-200">
      <div className="relative w-full overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          {/* 固定欄寬定義 */}
          <colgroup>
            <col style={{ width: '160px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: 'auto' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '90px' }} />
          </colgroup>
          <TableHeader>
          <TableRow className="border-b border-gray-200">
            <TableHead className="h-12 px-3 text-left font-semibold">
              {t('history.table.publishTime')}
            </TableHead>
            <TableHead className="h-12 px-3 text-left font-semibold">
              {t('history.table.platform')}
            </TableHead>
            <TableHead className="h-12 px-3 text-left font-semibold hidden lg:table-cell">
              {t('history.table.product')}
            </TableHead>
            <TableHead className="h-12 px-3 text-left font-semibold">
              {t('history.table.copySummary')}
            </TableHead>
            <TableHead className="h-12 px-3 text-right font-semibold">
              {t('history.table.engagement')}
            </TableHead>
            <TableHead className="h-12 px-3 text-center font-semibold">
              {t('history.table.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow 
              key={record.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors h-12"
            >
              <TableCell className="px-3 text-left tabular-nums text-sm">
                {format(new Date(record.publishTime), 'yyyy-MM-dd HH:mm', { locale })}
              </TableCell>
              <TableCell className="px-3 text-left">
                {getPlatformBadge(record.platform)}
              </TableCell>
              <TableCell className="px-3 text-left text-sm hidden lg:table-cell">
                <span className="block truncate" title={record.product || undefined}>
                  {record.product || '—'}
                </span>
              </TableCell>
              <TableCell className="px-3 text-left">
                <span 
                  className="text-sm text-muted-foreground block truncate overflow-hidden whitespace-nowrap" 
                  title={record.copyContent}
                >
                  {record.copyContent}
                </span>
              </TableCell>
              <TableCell className="px-3 text-right tabular-nums text-sm">
                {record.engagementTotal !== undefined ? record.engagementTotal.toLocaleString() : '—'}
              </TableCell>
              <TableCell className="px-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(record)}
                  className="h-8 px-2"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{t('history.table.view')}</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </table>
      </div>
    </div>
  );
}
