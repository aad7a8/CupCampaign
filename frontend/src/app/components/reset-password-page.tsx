import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Lock, ArrowLeft, Languages } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { resetPassword } from '@/app/services/authService';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { t, language, setLanguage } = useLanguage();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  // 如果没有 token，重定向到登录页
  useEffect(() => {
    if (!token) {
      // 延迟一下，确保 Toaster 已经渲染
      setTimeout(() => {
        toast.error(t('resetPassword.invalidToken'));
        navigate('/');
      }, 100);
    }
  }, [token, navigate, t]);

  const validateForm = (): boolean => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      newErrors.newPassword = t('resetPassword.newPasswordRequired');
    } else if (newPassword.length < 6) {
      newErrors.newPassword = t('resetPassword.passwordTooShort');
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.confirmPasswordRequired');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await resetPassword({
        token,
        newPassword,
        confirmPassword,
      });

      if (response.success) {
        toast.success(t('resetPassword.successMessage'));
        // 延迟一下再跳转，让用户看到成功提示
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        toast.error(response.message || t('resetPassword.errorMessage'));
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(t('resetPassword.errorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--df-bg)' }}>
      <Card className="w-full max-w-md shadow-lg border-0 transition-all duration-300 relative">
        {/* Language Selector - Top Right */}
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
            {t('resetPassword.title')}
          </CardTitle>
          <CardDescription className="text-center text-gray-200">
            {t('resetPassword.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8 px-8 pb-8 bg-white/95 rounded-b-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2 text-gray-700">
                <Lock className="w-4 h-4" /> {t('resetPassword.newPasswordLabel')}
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) {
                    setErrors({ ...errors, newPassword: undefined });
                  }
                }}
                placeholder={t('resetPassword.newPasswordPlaceholder')}
                className="h-11"
                disabled={isLoading}
              />
              {errors.newPassword && (
                <p className="text-xs text-red-500">{errors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-gray-700">
                <Lock className="w-4 h-4" /> {t('resetPassword.confirmPasswordLabel')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                className="h-11"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? t('resetPassword.submitting') : t('resetPassword.submitButton')}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Button
              type="button"
              variant="ghost"
              className="w-full hover:bg-slate-100"
              onClick={() => navigate('/')}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('login.backToLogin')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
