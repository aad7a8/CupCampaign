import { Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useEffect } from 'react';

interface HeaderProps {
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export function Header({ onNavigate, onLogout }: HeaderProps) {
  const { t } = useLanguage();

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/7a6527d5-0552-4b5c-bae5-8873f6748496',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'header.tsx:useEffect',message:'Header component mounted',data:{hasDropdown:true,hasTranslations:!!t('header.profileMenu.settings')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }, [t]);
  // #endregion

  // #region agent log
  const handleProfileClick = () => {
    fetch('http://127.0.0.1:7242/ingest/7a6527d5-0552-4b5c-bae5-8873f6748496',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'header.tsx:handleProfileClick',message:'Profile click handler called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  };
  // #endregion

  const handleLogout = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7a6527d5-0552-4b5c-bae5-8873f6748496',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'header.tsx:handleLogout',message:'Logout clicked',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header
      className="h-16 px-6 flex items-center justify-between border-b"
      style={{ backgroundColor: 'var(--df-header)', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--df-accent)' }}>
          <span className="font-bold text-white">CC</span>
        </div>
        <h1 className="text-white font-semibold">CupCampaign</h1>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <div className="relative">
          <Bell className="w-5 h-5 text-white cursor-pointer" />
          <Badge
            className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[10px]"
            style={{ backgroundColor: '#ef4444' }}
          >
            3
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity outline-none"
              onClick={handleProfileClick}
              // #region agent log
              onMouseEnter={() => {
                fetch('http://127.0.0.1:7242/ingest/7a6527d5-0552-4b5c-bae5-8873f6748496',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'header.tsx:ProfileTrigger',message:'Profile trigger hovered',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              }}
              // #endregion
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback style={{ backgroundColor: 'var(--df-accent)', color: 'white' }}>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-sm">{t('header.profile')}</span>
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => {
                if (onNavigate) {
                  onNavigate('generalSettings');
                }
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              <span>{t('header.profileMenu.settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              variant="destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>{t('header.profileMenu.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}