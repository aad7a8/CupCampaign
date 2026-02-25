import React, { useState, useEffect } from 'react';
import { TrendingUp, Cloud, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';

// ------------------------------------------------------------------
// 1. 115年 (2026) 完整行銷與放假行事曆
// ------------------------------------------------------------------
const FULL_CALENDAR_2026 = [
  // --- 上半年 ---
  { name: "2026 元旦連假", date: "2026-01-01T00:00:00", type: "holiday", note: "3天連假" },
  { name: "西洋情人節", date: "2026-02-14T00:00:00", type: "marketing", note: "商機" },
  { name: "農曆春節 (9天)", date: "2026-02-16T00:00:00", type: "holiday", note: "除夕前一日開始" },
  { name: "228 和平紀念日", date: "2026-02-28T00:00:00", type: "holiday", note: "3天連假" },
  { name: "兒童清明連假", date: "2026-04-03T00:00:00", type: "holiday", note: "4天連假" },
  { name: "五一勞動節", date: "2026-05-01T00:00:00", type: "holiday", note: "3天連假" },
  { name: "母親節", date: "2026-05-10T00:00:00", type: "marketing", note: "商機" },
  { name: "端午節連假", date: "2026-06-19T00:00:00", type: "holiday", note: "3天連假" },

  // --- 下半年 ---
  { name: "七夕情人節", date: "2026-08-19T00:00:00", type: "marketing", note: "商機" },
  { name: "中秋節連假", date: "2026-09-25T00:00:00", type: "holiday", note: "3天連假" },
  { name: "雙十國慶連假", date: "2026-10-09T00:00:00", type: "holiday", note: "3天連假" },
  { name: "雙11購物節", date: "2026-11-11T00:00:00", type: "marketing", note: "大檔" },
  { name: "聖誕節", date: "2026-12-25T00:00:00", type: "marketing", note: "商機" }
];

export function DashboardPage() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    const calculateEvents = () => {
      const now = new Date().getTime();

      const nextTwo = FULL_CALENDAR_2026
        .filter(event => new Date(event.date).getTime() > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 2) // 只取前 2 個，讓卡片更小
        .map(event => {
          const distance = new Date(event.date).getTime() - now;
          return {
            ...event,
            daysLeft: Math.floor(distance / (1000 * 60 * 60 * 24))
          };
        });

      setUpcomingEvents(nextTwo);
    };

    calculateEvents();
    const timer = setInterval(calculateEvents, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h2 className="text-2xl font-semibold mb-1 text-gray-800">智慧儀表板</h2>
        <p className="text-sm text-muted-foreground">即時掌握四維數據</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 趨勢 */}
        <Card className="border-l-4" style={{ borderLeftColor: 'var(--df-accent)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--df-accent)' }} />
              Hot Now 趨勢
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs">#草莓季</span>
                <Badge variant="secondary" className="bg-red-100 text-red-600 h-5 px-1.5 text-[10px]">🔥 熱</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">#烤糖奶蓋</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-600 h-5 px-1.5 text-[10px]">📈 升</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">#減糖健康</span>
                <Badge variant="secondary" className="bg-green-100 text-green-600 h-5 px-1.5 text-[10px]">⭐ 新</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: 天氣 */}
        <Card className="border-l-4 border-blue-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              天氣預報
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-700">13°C</div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">🌧️ 降雨中</span>
                <span className="text-xs text-blue-600 font-medium">推熱飲</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: 成本 */}
        <Card className="border-l-4 border-orange-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-400" />
              原物料成本
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 space-y-2">
            <div className="flex justify-between text-xs"><span>草莓</span><span className="text-orange-600 font-bold">↑ 15%</span></div>
            <div className="flex justify-between text-xs"><span>茶葉</span><span className="text-green-600 font-bold">↓ 3%</span></div>
            <div className="flex justify-between text-xs"><span>鮮奶</span><span className="text-gray-500">→ 持平</span></div>
          </CardContent>
        </Card>

        {/* Card 4: 節日行銷 (精簡版：只顯示2個，高度縮小) */}
        <Card className="border-l-4 border-purple-400">
          <CardHeader className="pb-2"> {/* 縮小標題下方的間距 */}
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              近期檔期
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3"> {/* 縮小內容下方的間距 */}
            <div className="space-y-3"> {/* 縮小列表項目間距 */}
              {upcomingEvents.length > 0 ? upcomingEvents.map((event, index) => (
                <div key={index} className={index !== 0 ? "pt-2 border-t border-gray-100" : ""}>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${index === 0 ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                          {event.name}
                        </span>
                        <Badge variant="outline" className={`text-[10px] h-4 px-1 rounded-sm ${event.type === 'holiday' ? 'text-red-500 border-red-200 bg-red-50' : 'text-blue-500 border-blue-200 bg-blue-50'}`}>
                          {event.type === 'holiday' ? '連假' : '節慶'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className={`text-base font-bold ${index === 0 ? 'text-purple-600' : 'text-gray-500'}`}>
                        {event.daysLeft}
                      </span>
                      <span className="text-[10px] text-gray-400">天</span>
                    </div>
                  </div>
                  {/* 第一個項目顯示極細的進度條 */}
                  {index === 0 && (
                    <Progress value={Math.max(10, 100 - (event.daysLeft / 30 * 100))} className="h-1 bg-purple-100 mt-1.5" />
                  )}
                </div>
              )) : (
                <div className="text-xs text-muted-foreground py-1 text-center">無近期活動</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}