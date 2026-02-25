import { Languages, Facebook, Instagram, MessageSquare, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useEffect, useRef } from 'react';

interface GeneralSettingsPageProps {
  scrollToIntegrations?: boolean;
}

export function GeneralSettingsPage({ scrollToIntegrations = false }: GeneralSettingsPageProps) {
  const { language, setLanguage, t } = useLanguage();
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

      {/* 語言設定區塊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            {t('settings.language.title')}
          </CardTitle>
          <CardDescription>{t('settings.language.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.language.selectLabel')}</Label>
            <Select 
              value={language} 
              onValueChange={(value) => setLanguage(value as 'zh-TW' | 'en')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-TW">{t('language.zhTW')}</SelectItem>
                <SelectItem value="en">{t('language.en')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('settings.language.hint')}</p>
          </div>
        </CardContent>
      </Card>

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
          
          {/* LineBot 權限與通知設定 */}
          <div>
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  LINE 官方帳號整合
                </CardTitle>
                <CardDescription>LineBot 自動回覆與通知設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">LINE 官方帳號</p>
                      <p className="text-xs text-muted-foreground">@tigersugar</p>
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
                
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">通知設定</h4>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="notify-generation">內容生成完成通知</Label>
                      <p className="text-xs text-muted-foreground">AI 完成文案生成時發送通知</p>
                    </div>
                    <Switch id="notify-generation" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="notify-approval">審核提醒通知</Label>
                      <p className="text-xs text-muted-foreground">有待審核內容時提醒店長</p>
                    </div>
                    <Switch id="notify-approval" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="notify-publish">發布成功通知</Label>
                      <p className="text-xs text-muted-foreground">內容成功發布後通知</p>
                    </div>
                    <Switch id="notify-publish" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="notify-trend">趨勢警報</Label>
                      <p className="text-xs text-muted-foreground">檢測到重要趨勢變化時通知</p>
                    </div>
                    <Switch id="notify-trend" defaultChecked />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input 
                    type="text" 
                    placeholder="https://your-domain.com/webhook"
                    defaultValue="https://cupcampaign.com/webhook/line"
                  />
                  <p className="text-xs text-muted-foreground">
                    用於接收 LINE 平台的回調通知
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* API 金鑰管理 */}
          <div>
            <Card className="border">
              <CardHeader>
                <CardTitle>API 金鑰管理</CardTitle>
                <CardDescription>管理第三方服務的 API 存取權限</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>OpenAI API Key (文案生成)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="password" 
                      placeholder="sk-..."
                      defaultValue="sk-xxxxxxxxxxxxxxxx"
                    />
                    <Button variant="outline">更新</Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Flux.1 API Key (圖像生成)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="password" 
                      placeholder="flux-..."
                      defaultValue="flux-xxxxxxxxxxxxxxxx"
                    />
                    <Button variant="outline">更新</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
