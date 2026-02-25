import { HistoryRecord } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { format } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';

interface HistoryTop5Props {
  records: HistoryRecord[];
  loading?: boolean;
  onView: (record: HistoryRecord) => void;
}

const truncateText = (text: string, maxLength: number = 60): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

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

export function HistoryTop5({ records, loading, onView }: HistoryTop5Props) {
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-2">{t('history.empty.noPerformance')}</p>
        <p className="text-sm text-muted-foreground">{t('history.empty.noPerformanceHint')}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">{t('history.performance.top5')}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('history.table.copySummary')}</TableHead>
            <TableHead>{t('history.table.platform')}</TableHead>
            <TableHead>{t('history.performance.publishDate')}</TableHead>
            <TableHead className="text-right">{t('history.table.engagement')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow
              key={record.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView(record)}
            >
              <TableCell className="max-w-md">
                <span className="text-sm">{truncateText(record.copyContent, 60)}</span>
              </TableCell>
              <TableCell>{getPlatformLabel(record.platform)}</TableCell>
              <TableCell>
                {format(new Date(record.publishTime), 'yyyy-MM-dd', { locale })}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {record.engagementTotal?.toLocaleString() || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
