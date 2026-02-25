import { HistoryRecord } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { format } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';

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
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('history.table.publishTime')}</TableHead>
            <TableHead>{t('history.table.platform')}</TableHead>
            <TableHead>{t('history.table.product')}</TableHead>
            <TableHead className="w-[200px]">{t('history.table.copySummary')}</TableHead>
            <TableHead className="text-right">{t('history.table.engagement')}</TableHead>
            <TableHead className="text-right">{t('history.table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>
                {format(new Date(record.publishTime), 'yyyy-MM-dd HH:mm', { locale })}
              </TableCell>
              <TableCell>{getPlatformLabel(record.platform)}</TableCell>
              <TableCell>{record.product || '—'}</TableCell>
              <TableCell className="w-[200px] max-w-[200px]">
                <span className="text-sm text-muted-foreground block truncate" title={record.copyContent}>
                  {record.copyContent}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {record.engagementTotal !== undefined ? record.engagementTotal.toLocaleString() : '—'}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(record)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {t('history.table.view')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
