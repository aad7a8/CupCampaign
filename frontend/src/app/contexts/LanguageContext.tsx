import { createContext, useContext, ReactNode } from 'react';

// 固定为繁体中文
export type Language = 'zh-TW';

interface LanguageContextType {
  language: Language;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 固定为 zh-TW，不再读取 localStorage
  const language: Language = 'zh-TW';

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, t }}>
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
};
