import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Lock, User, ArrowRight, UserPlus, Mail, ArrowLeft, Languages } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { forgotPassword } from '@/app/services/authService';
import { toast } from 'sonner';

const TAIWAN_COUNTIES = [
  "基隆市", "台北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣", "台中市",
  "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "台南市", "高雄市", "屏東縣",
  "宜蘭縣", "花蓮縣", "台東縣", "澎湖縣", "金門縣", "連江縣"
];

interface LoginPageProps {
  onLogin: (username: string) => void;
  onRegister: (payload: {
    username: string;
    password: string;
    brandName: string;
    storeCounty: string;
    storeName: string;
  }) => void;
  onForgotPassword?: () => void; // 保留接口但我們將主要邏輯內化
}

// 定義頁面模式
type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

export function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  // 表單狀態
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [brandName, setBrandName] = useState('');
  const [storeCounty, setStoreCounty] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');

  // 忘記密碼狀態
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) onLogin(username);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onRegister({
        username,
        password,
        brandName,
        storeCounty,
        storeName,
      });
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error(t('alerts.emailRequired'));
      return;
    }

    // 驗證 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error(t('alerts.invalidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPassword({ email });

      if (response.success) {
        setIsEmailSent(true);
        toast.success(t('alerts.resetEmailSent'));
      } else {
        toast.error(response.message || t('alerts.resetEmailFailed'));
      }
    } catch (error) {
      console.error('Send reset email error:', error);
      toast.error(t('alerts.resetEmailFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染標題與描述
  const getHeaderContent = () => {
    switch (mode) {
      case 'REGISTER':
        return { title: t('register.title'), desc: t('register.subtitle') };
      case 'FORGOT_PASSWORD':
        return { title: t('forgotPassword.title'), desc: t('forgotPassword.subtitle') };
      default:
        return { title: t('login.title'), desc: t('login.subtitle') };
    }
  };

  const header = getHeaderContent();

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--df-bg)' }}>
      <Card className="w-full max-w-md shadow-lg border-0 transition-all duration-300 relative">
        {/* Language Selector - Top Right (smaller, not blocking title) */}
        <div className="absolute top-3 right-3 z-10">
          <Select value={language} onValueChange={(value) => setLanguage(value as 'zh-TW' | 'en')}>
            <SelectTrigger className="w-[110px] h-8 bg-white/90 hover:bg-white border border-gray-200 text-xs shadow-sm px-2">
              <div className="flex items-center gap-2">
                <Languages className="w-3 h-3" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh-TW">{t('language.zhTW')}</SelectItem>
              <SelectItem value="en">{t('language.en')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CardHeader
          className="space-y-1 rounded-t-lg transition-colors pt-10 pb-4"
          style={{ backgroundColor: 'var(--df-header)', color: 'white' }}
        >
          <CardTitle className="text-2xl text-center font-bold tracking-wide">
            {header.title}
          </CardTitle>
          <CardDescription className="text-center text-gray-200">
            {header.desc}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8 px-8 pb-8 bg-white/95 rounded-b-lg">

          {/* --- 1. 登入模式 --- */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4" /> {t('login.username')}
                </Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="name@example.com" className="h-11" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="flex items-center gap-2 text-gray-700">
                    <Lock className="w-4 h-4" /> {t('login.password')}
                  </Label>
                  <button type="button" onClick={() => setMode('FORGOT_PASSWORD')} className="text-xs text-blue-600 hover:underline">
                    {t('login.forgotPassword')}
                  </button>
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={t('login.password')} className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11" style={{ backgroundColor: 'var(--df-accent)', color: 'white' }}>
                {t('login.loginButton')} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          {/* --- 2. 註冊模式 --- */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="reg-username">{t('register.username')}</Label>
                <Input id="reg-username" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">{t('register.password')}</Label>
                <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-brand">{t('register.brandName')}</Label>
                <Input
                  id="reg-brand"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder={t('register.storePlaceholder')}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-county">{t('register.storeCounty')}</Label>
                <Select value={storeCounty} onValueChange={setStoreCounty}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t('register.selectCounty')} />
                  </SelectTrigger>
                  <SelectContent>
                    {TAIWAN_COUNTIES.map((county) => (
                      <SelectItem key={county} value={county}>{county}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-storename">{t('register.storeName')}</Label>
                <Input
                  id="reg-storename"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder={t('register.storePlaceholder')}
                  className="h-11"
                />
              </div>

              <Button type="submit" className="w-full h-11" style={{ backgroundColor: 'var(--df-accent)', color: 'white' }}>
                {t('register.registerButton')} <UserPlus className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          {/* --- 3. 忘記密碼模式 --- */}
          {mode === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleSendResetEmail} className="space-y-6">
              {!isEmailSent ? (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-4 h-4" /> {t('forgotPassword.emailLabel')}
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('forgotPassword.emailPlaceholder')}
                      className="h-11"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? t('forgotPassword.sending') : t('forgotPassword.sendButton')}
                  </Button>
                </>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 mb-3">
                      {t('forgotPassword.successMessage')}
                    </p>
                    {/* 開發模式：提供測試連結 */}
                    {import.meta.env.DEV && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => navigate('/reset-password?token=test-token-123')}
                      >
                        {t('forgotPassword.goToResetPage')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </form>
          )}

          {/* --- 底部切換按鈕 --- */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">{t('login.or')}</span>
            </div>
          </div>

          <div className="text-center space-y-2">
            {mode === 'LOGIN' ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => setMode('REGISTER')}>
                {t('login.registerButton')}
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="w-full hover:bg-slate-100" onClick={() => {
                setMode('LOGIN');
                setIsEmailSent(false);
                setEmail('');
              }}>
                <ArrowLeft className="w-4 h-4 mr-2" /> {t('login.backToLogin')}
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}