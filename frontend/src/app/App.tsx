import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/app/components/login-page';
import { ResetPasswordPage } from '@/app/components/reset-password-page';
import { Header } from '@/app/components/header';
import { Navigation } from '@/app/components/navigation';
import { DashboardPage } from '@/app/components/dashboard-page';
import { ContentAuditCenter } from '@/app/components/content-audit-center';
import { GeneralSettingsPage } from '@/app/components/general-settings-page';
import { HistoryPage } from '@/app/components/history-page';
import { MenuManagementPage } from '@/app/components/menu-management-page';
import { LanguageProvider } from '@/app/contexts/LanguageContext';
import { Toaster } from '@/app/components/ui/sonner';

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentBrand, setCurrentBrand] = useState('');
  const [currentPage, setCurrentPage] = useState('menuManagement');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 處理登入 (登入成功後導向菜單管理)
  const handleLogin = (username: string) => {
    // [模擬後端邏輯]
    setCurrentBrand('珍煮丹 (範例)'); // 模擬從後端抓取到的品牌名
    setIsLoggedIn(true);
    setCurrentPage('menuManagement');
  };

  // 處理註冊：註冊成功後直接導航到菜單管理頁面
  const handleRegister = (payload: {
    username: string;
    password: string;
    brandName: string;
    storeName: string;
  }) => {
    console.log('新用戶註冊:', payload);

    setIsLoggedIn(true);

    const displayName = payload.storeName
      ? `${payload.brandName} - ${payload.storeName}`
      : payload.brandName;

    // 記錄品牌名稱
    setCurrentBrand(displayName);

    // 註冊成功後直接導航到菜單管理頁面
    setCurrentPage('menuManagement');
  };

  // 處理登出 (重置所有狀態並回到登錄畫面)
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentBrand('');
    setCurrentPage('menuManagement');
  };

  // 頁面路由渲染器
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'audit':
        return <ContentAuditCenter />;
      case 'settings':
        return <HistoryPage onNavigate={setCurrentPage} />;
      case 'generalSettings':
        return <GeneralSettingsPage scrollToIntegrations={false} />;
      case 'platformIntegration':
        // 保留路由兼容：導向到設定頁，並自動滾動到 integrations 區塊
        return <GeneralSettingsPage scrollToIntegrations={true} />;
      case 'menuManagement':
        return <MenuManagementPage />;
      default:
        return <MenuManagementPage />;
    }
  };

  // 1. 未登入狀態
  if (!isLoggedIn) {
    return (
      <>
        <Routes>
          <Route
            path="/"
            element={
              <LoginPage
                onLogin={handleLogin}
                onRegister={handleRegister}
              />
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </>
    );
  }

  // 2. 已登入 (顯示主系統)
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <div className="h-screen flex flex-col">
            <Header onNavigate={setCurrentPage} onLogout={handleLogout} />
            <div className="flex-1 flex overflow-hidden">
              <Navigation
                currentPage={currentPage}
                onNavigate={setCurrentPage}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
              <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--df-bg)' }}>
                {renderPage()}
              </main>
            </div>
            <Toaster />
          </div>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  );
}