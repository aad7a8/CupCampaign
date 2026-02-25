import { HistoryRecord } from '../types';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Copy, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { format } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';

interface HistoryDrawerProps {
  record: HistoryRecord | null;
  open: boolean;
  onClose: () => void;
  onCopy: (record: HistoryRecord) => void;
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

export function HistoryDrawer({ record, open, onClose, onCopy }: HistoryDrawerProps) {
  const { t, language } = useLanguage();
  const locale = language === 'zh-TW' ? zhTW : enUS;

  if (!record) return null;

  const handleCopy = () => {
    onCopy(record);
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{t('history.drawer.title')}</DrawerTitle>
          <DrawerDescription>
            {getPlatformLabel(record.platform)} • {record.campaign}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6 overflow-y-auto">
          {/* 文案完整內容 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('history.drawer.fullContent')}</h3>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-1" />
                {t('history.drawer.copyContent')}
              </Button>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{record.copyContent}</p>
            </div>
          </div>

          {/* 發布平台連結 */}
          {record.platformUrl && (
            <div className="space-y-2">
              <h3 className="font-semibold">{t('history.drawer.platformLink')}</h3>
              <Button
                variant="outline"
                onClick={() => window.open(record.platformUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('history.drawer.platformLink')}
              </Button>
            </div>
          )}

          {/* 指標 */}
          <div className="space-y-2">
            <h3 className="font-semibold">{t('history.drawer.metrics')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {record.engagementLikes !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('history.drawer.likes')}</p>
                  <p className="text-lg font-semibold">{record.engagementLikes.toLocaleString()}</p>
                </div>
              )}
              {record.engagementComments !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('history.drawer.comments')}</p>
                  <p className="text-lg font-semibold">{record.engagementComments.toLocaleString()}</p>
                </div>
              )}
              {record.engagementShares !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('history.drawer.shares')}</p>
                  <p className="text-lg font-semibold">{record.engagementShares.toLocaleString()}</p>
                </div>
              )}
              {record.engagementTotal !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">{t('history.drawer.totalEngagement')}</p>
                  <p className="text-lg font-semibold">{record.engagementTotal.toLocaleString()}</p>
                </div>
              )}
            </div>
            {record.engagementTotal === undefined && (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* 其他資訊 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('history.table.platform')}</span>
              <span>{getPlatformLabel(record.platform)}</span>
            </div>
            {record.product && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('history.table.product')}</span>
                <span>{record.product}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('history.table.status')}</span>
              <Badge variant="outline">{t(`history.status.${record.status}`)}</Badge>
            </div>
            {record.lastUpdated && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('history.drawer.lastUpdated')}</span>
                <span>
                  {format(new Date(record.lastUpdated), 'yyyy-MM-dd HH:mm', { locale })}
                </span>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">關閉</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
