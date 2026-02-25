import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'zh-TW' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 从 localStorage 读取语言设置
const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'zh-TW';
  const stored = localStorage.getItem('locale');
  if (stored === 'zh-TW' || stored === 'en') {
    return stored;
  }
  return 'zh-TW';
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage());

  // 初始化时读取并套用
  useEffect(() => {
    const stored = getStoredLanguage();
    setLanguageState(stored);
  }, []);

  // 设置语言并保存到 localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('locale', lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

const translations = {
  'zh-TW': {
    // Login Page
    login: {
      title: 'CupCampaign',
      subtitle: '智慧飲品行銷系統 - 登入',
      username: '帳號 / Email',
      password: '密碼',
      forgotPassword: '忘記密碼?',
      loginButton: '登入系統',
      registerButton: '註冊新用戶',
      or: '或者是',
      backToLogin: '返回登入',
    },
    register: {
      title: '建立新帳號',
      subtitle: '註冊以開始建置您的 AI 品牌資料庫',
      username: '設定帳號 (Email)',
      password: '設定密碼',
      brandName: '店家/品牌名稱',
      storeCounty: '店家縣市',
      storeName: '分店名',
      storeLocation: '分店地址',
      selectCounty: '請選擇縣市',
      storePlaceholder: '請輸入',
      locationPlaceholder: 'ex:大安路一段1號',
      registerButton: '立即註冊',
    },
    forgotPassword: {
      title: '忘記密碼',
      subtitle: '請輸入註冊 Email，我們將發送重設密碼連結至您的信箱',
      emailLabel: '請輸入註冊 Email',
      emailPlaceholder: 'name@example.com',
      sendButton: '發送重設密碼 Email',
      sending: '發送中...',
      successMessage: '重設密碼連結已寄出至你的 Email，請前往信箱確認',
      goToResetPage: '前往設定新密碼頁面',
    },
    resetPassword: {
      title: '設定新密碼',
      subtitle: '請輸入您的新密碼',
      newPasswordLabel: '新密碼',
      newPasswordPlaceholder: '請輸入新密碼',
      confirmPasswordLabel: '確認新密碼',
      confirmPasswordPlaceholder: '請再次輸入新密碼',
      submitButton: '確認重置密碼',
      submitting: '處理中...',
      successMessage: '密碼重置成功！請使用新密碼登入。',
      errorMessage: '重置密碼失敗，請檢查連結是否有效或已過期',
      invalidToken: '無效的重置連結，請重新申請',
      newPasswordRequired: '請輸入新密碼',
      confirmPasswordRequired: '請確認新密碼',
      passwordTooShort: '密碼長度至少需要 6 個字元',
      passwordsDoNotMatch: '兩次輸入的密碼不一致',
    },
    header: {
      search: '全站搜尋...',
      profile: '個人中心',
      notifications: '通知',
      profileMenu: {
        settings: '設定',
        platformIntegration: '平臺串接設定',
        logout: '登出',
      },
    },
    brandSetup: {
      title: '初始化品牌菜單',
      subtitle: '建立產品資料與原料成分表',
      section1: '品牌資訊',
      section2: '產品列表與成分',
      brandName: '店家/品牌名稱',
      storeCounty: '店家縣市',
      selectCounty: '選擇縣市（用於天氣分析）',
      addItem: '手動新增',
      category: '分類',
      itemName: '品項名稱',
      price: '單價',
      ingredients: '原料成分表',
      ingredientsPlaceholder: '例如: 草莓, 奶蓋, 紅茶',
      saveButton: '寫入資料庫',
      brandNamePlaceholder: '請在此輸入',
      categoryPlaceholder: '分類',
      itemPlaceholder: '品名',
      pricePlaceholder: '0',
    },
    dashboard: {
      title: '儀表板',
      overview: '總覽',
    },
    navigation: {
      mainFeatures: '主要功能',
      dashboard: '智慧儀表板',
      audit: '內容審核中心',
      settings: '歷史記錄',
      menuManagement: '菜單管理',
    },
    language: {
      select: '語言',
      zhTW: '繁體中文',
      en: 'English',
    },
    settings: {
      title: '設定',
      subtitle: '管理您的帳號與系統偏好設定',
      language: {
        title: '語言設定',
        description: '選擇您偏好的介面語言',
        selectLabel: '語言',
        hint: '選擇後將立即套用至整個系統',
      },
    },
    alerts: {
      emailRequired: '請輸入 Email',
      invalidEmail: '請輸入有效的 Email 格式',
      resetEmailSent: '重設密碼連結已寄出至你的 Email，請前往信箱確認',
      resetEmailFailed: '發送失敗，請稍後再試',
      passwordResetSuccess: '密碼重置成功！請使用新密碼登入。',
      itemNameRequired: '部分產品名稱尚未填寫',
    },
    history: {
      title: '歷史查詢',
      lastSync: '最後同步時間',
      neverSynced: '尚未同步',
      refresh: '重新整理',
      tabs: {
        published: '已發布列表',
        performance: '發布文案成效',
      },
      filters: {
        dateRange: '日期區間',
        today: '今天',
        last7Days: '7 天',
        last30Days: '30 天',
        custom: '自訂',
        platform: '平台',
        allPlatforms: 'All',
        status: '狀態',
        allStatuses: 'All',
        keyword: '關鍵字搜尋',
        keywordPlaceholder: '搜尋文案內容、活動名稱、產品名稱...',
      },
      table: {
        publishTime: '發布時間',
        platform: '平台',
        campaign: '活動/主題',
        product: '產品',
        copySummary: '文案摘要',
        status: '狀態',
        engagement: '互動數',
        actions: '操作',
        view: '查看',
        copy: '複製再用',
        copySuccess: '文案已複製到剪貼簿',
      },
      status: {
        success: '成功',
        scheduled: '排程中',
        failed: '失敗',
        unpublished: '下架',
      },
      drawer: {
        title: '發布詳情',
        fullContent: '文案完整內容',
        copyContent: '複製文案',
        platformLink: '發布平台連結',
        metrics: '指標',
        likes: '讚',
        comments: '留言',
        shares: '分享',
        totalEngagement: '總互動',
        lastUpdated: '最後更新時間',
      },
      empty: {
        noRecords: '尚未有發布紀錄',
        goToGenerate: '前往文案生成',
        noPerformance: '尚無成效資料',
        noPerformanceHint: '請確認已完成平台串接 / 或稍後同步',
      },
      performance: {
        posts: '發布數',
        totalEngagement: '總互動',
        avgEngagement: '平均互動',
        top5: 'Top 5 表現',
        publishDate: '發布日',
      },
    },
  },
  'en': {
    // Login Page
    login: {
      title: 'CupCampaign',
      subtitle: 'Intelligent Beverage Marketing System - Login',
      username: 'Username / Email',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      loginButton: 'Login',
      registerButton: 'Register',
      or: 'or',
      backToLogin: 'Back to Login',
    },
    register: {
      title: 'Create New Account',
      subtitle: 'Register to start building your AI brand database',
      username: 'Set Account (Email)',
      password: 'Set Password',
      brandName: 'Store/Brand Name',
      storeCounty: 'Store County',
      storeName: 'Branch Name',
      storeLocation: 'Branch Address',
      selectCounty: 'Please select county',
      storePlaceholder: 'Please enter',
      locationPlaceholder: 'ex: No.1, Sec.1, Da\'an Rd.',
      registerButton: 'Register Now',
    },
    forgotPassword: {
      title: 'Forgot Password',
      subtitle: 'Please enter your registered email, we will send a password reset link to your inbox',
      emailLabel: 'Enter registered Email',
      emailPlaceholder: 'name@example.com',
      sendButton: 'Send Reset Password Email',
      sending: 'Sending...',
      successMessage: 'Password reset link has been sent to your email, please check your inbox',
      goToResetPage: 'Go to Set New Password Page',
    },
    resetPassword: {
      title: 'Set New Password',
      subtitle: 'Please enter your new password',
      newPasswordLabel: 'New Password',
      newPasswordPlaceholder: 'Enter new password',
      confirmPasswordLabel: 'Confirm New Password',
      confirmPasswordPlaceholder: 'Enter new password again',
      submitButton: 'Confirm Reset Password',
      submitting: 'Processing...',
      successMessage: 'Password reset successfully! Please login with your new password.',
      errorMessage: 'Failed to reset password, please check if the link is valid or expired',
      invalidToken: 'Invalid reset link, please request a new one',
      newPasswordRequired: 'Please enter new password',
      confirmPasswordRequired: 'Please confirm new password',
      passwordTooShort: 'Password must be at least 6 characters',
      passwordsDoNotMatch: 'Passwords do not match',
    },
    header: {
      search: 'Search...',
      profile: 'Profile',
      notifications: 'Notifications',
      profileMenu: {
        settings: 'Settings',
        platformIntegration: 'Platform Integration Settings',
        logout: 'Log out',
      },
    },
    brandSetup: {
      title: 'Initialize Brand Menu',
      subtitle: 'Create product data and ingredient list',
      section1: 'Brand Information',
      section2: 'Product List & Ingredients',
      brandName: 'Store/Brand Name',
      storeCounty: 'Store County',
      selectCounty: 'Select county (for weather analysis)',
      addItem: 'Add Manually',
      category: 'Category',
      itemName: 'Item Name',
      price: 'Price',
      ingredients: 'Ingredient List',
      ingredientsPlaceholder: 'e.g.: Strawberry, Cream Top, Black Tea',
      saveButton: 'Save to Database',
      brandNamePlaceholder: 'Please enter here',
      categoryPlaceholder: 'Category',
      itemPlaceholder: 'Item name',
      pricePlaceholder: '0',
    },
    dashboard: {
      title: 'Dashboard',
      overview: 'Overview',
    },
    navigation: {
      mainFeatures: 'Main Features',
      dashboard: 'Smart Dashboard',
      audit: 'Content Review Center',
      settings: 'History',
      menuManagement: 'Menu Management',
    },
    language: {
      select: 'Language',
      zhTW: '繁體中文',
      en: 'English',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Manage your account and system preferences',
      language: {
        title: 'Language Settings',
        description: 'Choose your preferred interface language',
        selectLabel: 'Language',
        hint: 'Changes will be applied immediately across the system',
      },
    },
    alerts: {
      emailRequired: 'Please enter your email',
      invalidEmail: 'Please enter a valid email format',
      resetEmailSent: 'Password reset link has been sent to your email, please check your inbox',
      resetEmailFailed: 'Failed to send, please try again later',
      passwordResetSuccess: 'Password reset successfully! Please login with your new password.',
      itemNameRequired: 'Some product names are not filled in',
    },
    history: {
      title: 'History Query',
      lastSync: 'Last Sync Time',
      neverSynced: 'Never Synced',
      refresh: 'Refresh',
      tabs: {
        published: 'Published List',
        performance: 'Performance',
      },
      filters: {
        dateRange: 'Date Range',
        today: 'Today',
        last7Days: '7 Days',
        last30Days: '30 Days',
        custom: 'Custom',
        platform: 'Platform',
        allPlatforms: 'All',
        status: 'Status',
        allStatuses: 'All',
        keyword: 'Keyword Search',
        keywordPlaceholder: 'Search content, campaign, product...',
      },
      table: {
        publishTime: 'Publish Time',
        platform: 'Platform',
        campaign: 'Campaign/Theme',
        product: 'Product',
        copySummary: 'Copy Summary',
        status: 'Status',
        engagement: 'Engagement',
        actions: 'Actions',
        view: 'View',
        copy: 'Copy & Reuse',
        copySuccess: 'Copy has been copied to clipboard',
      },
      status: {
        success: 'Success',
        scheduled: 'Scheduled',
        failed: 'Failed',
        unpublished: 'Unpublished',
      },
      drawer: {
        title: 'Post Details',
        fullContent: 'Full Content',
        copyContent: 'Copy Content',
        platformLink: 'Platform Link',
        metrics: 'Metrics',
        likes: 'Likes',
        comments: 'Comments',
        shares: 'Shares',
        totalEngagement: 'Total Engagement',
        lastUpdated: 'Last Updated',
      },
      empty: {
        noRecords: 'No published records yet',
        goToGenerate: 'Go to Copy Generation',
        noPerformance: 'No performance data',
        noPerformanceHint: 'Please ensure platform integration is complete / or sync later',
      },
      performance: {
        posts: 'Posts',
        totalEngagement: 'Total Engagement',
        avgEngagement: 'Avg Engagement',
        top5: 'Top 5 Performance',
        publishDate: 'Publish Date',
      },
    },
  },
};
