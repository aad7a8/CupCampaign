import { Facebook, Instagram, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useEffect, useRef } from 'react';

interface GeneralSettingsPageProps {
  scrollToIntegrations?: boolean;
}

export function GeneralSettingsPage({ scrollToIntegrations = false }: GeneralSettingsPageProps) {
  const { t } = useLanguage();
  const integrationsRef = useRef<HTMLDivElement>(null);

  // 當從 platformIntegration 路由進入時，自動滾動到 integrations 區塊
  useEffect(() => {
    if (scrollToIntegrations && integrationsRef.current) {
      setTimeout(() => {
        integrationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [scrollToIntegrations]);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold mb-1">{t('settings.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* 平台串接設定區塊 */}
      <Card ref={integrationsRef}>
        <CardHeader>
          <CardTitle>平台串接設定</CardTitle>
          <CardDescription>管理社群媒體帳號與發布權限</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meta (FB/IG) 帳號綁定管理 */}
          <div>
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Facebook className="w-4 h-4 text-white" />
                  </div>
                  Meta 平台整合
                </CardTitle>
                <CardDescription>Facebook & Instagram 帳號綁定與管理</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Facebook 粉絲專頁</p>
                      <p className="text-xs text-muted-foreground">珍煮丹官方粉絲團</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      已連結
                    </Badge>
                    <Button variant="outline" size="sm">管理</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Instagram className="w-5 h-5 text-pink-600" />
                    <div>
                      <p className="font-medium">Instagram 商業帳號</p>
                      <p className="text-xs text-muted-foreground">@tigersugar_official</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      已連結
                    </Badge>
                    <Button variant="outline" size="sm">管理</Button>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  新增 Meta 帳號
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}