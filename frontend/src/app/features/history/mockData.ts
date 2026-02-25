import { HistoryRecord } from './types';

// 生成模擬數據
const generateMockRecords = (): HistoryRecord[] => {
  const platforms: Array<'FB' | 'IG' | 'LINE'> = ['FB', 'IG', 'LINE'];
  const statuses: Array<'success' | 'scheduled' | 'failed' | 'unpublished'> = ['success', 'scheduled', 'failed', 'unpublished'];
  const campaigns = ['草莓季活動', '情人節特惠', '夏日新品', '冬季限定', '週年慶活動'];
  const products = ['草莓鮮奶茶', '珍珠奶茶', '四季春茶', '烏龍茶', '抹茶拿鐵', undefined];
  
  const copyTemplates = [
    '🍓 草莓季來襲！濃郁的草莓香氣搭配鮮奶，每一口都是幸福的味道～限時優惠中，快來品嚐吧！',
    '💕 情人節限定！與最愛的人一起分享這份甜蜜，讓愛意滿滿的飲品見證你們的美好時光。',
    '☀️ 夏日新品上市！清爽解渴，最適合炎熱的夏天。快來試試我們的新口味吧！',
    '❄️ 冬季限定款！溫暖你的心，讓這個冬天不再寒冷。',
    '🎉 週年慶活動開跑！感謝大家一直以來的支持，特別推出優惠活動，千萬別錯過！',
  ];

  const records: HistoryRecord[] = [];
  const now = new Date();

  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const publishTime = new Date(now);
    publishTime.setDate(publishTime.getDate() - daysAgo);
    publishTime.setHours(Math.floor(Math.random() * 24));
    publishTime.setMinutes(Math.floor(Math.random() * 60));

    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const copyContent = copyTemplates[Math.floor(Math.random() * copyTemplates.length)];

    const hasEngagement = status === 'success' && Math.random() > 0.3;
    const engagementTotal = hasEngagement ? Math.floor(Math.random() * 5000) + 100 : undefined;
    const engagementLikes = hasEngagement ? Math.floor((engagementTotal || 0) * 0.7) : undefined;
    const engagementComments = hasEngagement ? Math.floor((engagementTotal || 0) * 0.2) : undefined;
    const engagementShares = hasEngagement ? Math.floor((engagementTotal || 0) * 0.1) : undefined;

    records.push({
      id: `record-${i + 1}`,
      publishTime: publishTime.toISOString(),
      platform,
      campaign,
      product,
      copyContent,
      status,
      engagementTotal,
      engagementLikes,
      engagementComments,
      engagementShares,
      platformUrl: status === 'success' ? `https://${platform.toLowerCase()}.com/post/${i + 1}` : undefined,
      lastUpdated: publishTime.toISOString(),
    });
  }

  // 按發布時間降序排序
  return records.sort((a, b) => 
    new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime()
  );
};

export const MOCK_HISTORY_RECORDS: HistoryRecord[] = generateMockRecords();
