import { HistoryFilters as HistoryFiltersType } from '../types';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { useLanguage } from '@/app/contexts/LanguageContext';

interface HistoryFiltersProps {
  filters: HistoryFiltersType;
  onChange: (filters: HistoryFiltersType) => void;
}

export function HistoryFilters({ filters, onChange }: HistoryFiltersProps) {
  const { t } = useLanguage();

  const handleDateRangeChange = (value: string) => {
    onChange({
      ...filters,
      dateRange: value as HistoryFiltersType['dateRange'],
      customStartDate: value !== 'custom' ? undefined : filters.customStartDate,
      customEndDate: value !== 'custom' ? undefined : filters.customEndDate,
    });
  };

  const handlePlatformChange = (value: string) => {
    onChange({
      ...filters,
      platform: value as HistoryFiltersType['platform'],
    });
  };

  const handleKeywordChange = (value: string) => {
    onChange({
      ...filters,
      keyword: value,
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white border rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 日期區間 */}
        <div className="space-y-2">
          <Label>{t('history.filters.dateRange')}</Label>
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t('history.filters.today')}</SelectItem>
              <SelectItem value="7days">{t('history.filters.last7Days')}</SelectItem>
              <SelectItem value="30days">{t('history.filters.last30Days')}</SelectItem>
              <SelectItem value="custom">{t('history.filters.custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 自訂日期 */}
        {filters.dateRange === 'custom' && (
          <>
            <div className="space-y-2">
              <Label>開始日期</Label>
              <Input
                type="date"
                value={filters.customStartDate || ''}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    customStartDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>結束日期</Label>
              <Input
                type="date"
                value={filters.customEndDate || ''}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    customEndDate: e.target.value,
                  })
                }
              />
            </div>
          </>
        )}

        {/* 平台 */}
        <div className="space-y-2">
          <Label>{t('history.filters.platform')}</Label>
          <Select value={filters.platform} onValueChange={handlePlatformChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('history.filters.allPlatforms')}</SelectItem>
              <SelectItem value="FB">Facebook</SelectItem>
              <SelectItem value="IG">Instagram</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* 關鍵字搜尋 */}
      <div className="space-y-2">
        <Label>{t('history.filters.keyword')}</Label>
        <Input
          placeholder={t('history.filters.keywordPlaceholder')}
          value={filters.keyword || ''}
          onChange={(e) => handleKeywordChange(e.target.value)}
        />
      </div>
    </div>
  );
}
