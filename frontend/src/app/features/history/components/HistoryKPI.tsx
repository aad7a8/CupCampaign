import { HistoryMetrics } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useLanguage } from '@/app/contexts/LanguageContext';

interface HistoryKPIProps {
  metrics: HistoryMetrics;
  loading?: boolean;
}

export function HistoryKPI({ metrics, loading }: HistoryKPIProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('history.performance.posts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{metrics.posts}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('history.performance.totalEngagement')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{metrics.totalEngagement.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('history.performance.avgEngagement')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{metrics.avgEngagement.toLocaleString()}</p>
        </CardContent>
      </Card>
    </div>
  );
}
