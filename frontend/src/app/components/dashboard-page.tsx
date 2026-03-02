import React, { useState, useEffect } from 'react';
import { TrendingUp, Cloud, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Button } from '@/app/components/ui/button';
import { ProcurementMatrixModal, PROCUREMENT_MATRIX } from '@/app/components/procurement-matrix-modal';
import { ProcurementMonthSummary } from '@/app/components/dashboard/ProcurementMonthSummary';

// --- 節慶檔期資料 ---
const FULL_CALENDAR_2026 = [
  { name: "2026 元旦連假", date: "2026-01-01T00:00:00", type: "holiday", note: "3天連假" },
  { name: "西洋情人節", date: "2026-02-14T00:00:00", type: "marketing", note: "商機" },
  { name: "農曆春節 (9天)", date: "2026-02-16T00:00:00", type: "holiday", note: "除夕前一日開始" },
  { name: "228 和平紀念日", date: "2026-02-28T00:00:00", type: "holiday", note: "3天連假" },
  { name: "兒童清明連假", date: "2026-04-03T00:00:00", type: "holiday", note: "4天連假" },
  { name: "五一勞動節", date: "2026-05-01T00:00:00", type: "holiday", note: "3天連假" },
];

// 模擬一週天氣數據
const MOCK_WEEKLY_WEATHER = [
  { day: '週一', temp: 13, condition: '降雨中', icon: '🌧️', rainProb: 80 },
  { day: '週二', temp: 15, condition: '多雲', icon: '☁️', rainProb: 30 },
  { day: '週三', temp: 18, condition: '晴', icon: '☀️', rainProb: 10 },
  { day: '週四', temp: 16, condition: '多雲', icon: '☁️', rainProb: 20 },
  { day: '週五', temp: 14, condition: '陰', icon: '⛅', rainProb: 40 },
  { day: '週六', temp: 12, condition: '降雨', icon: '🌧️', rainProb: 70 },
  { day: '週日', temp: 11, condition: '降雨', icon: '🌧️', rainProb: 85 },
];

// Top 3 趨勢資料（用於 podium）
const TOP_TRENDS = [
  { rank: 1, tag: '#草莓季' },
  { rank: 2, tag: '#烤糖奶蓋' },
  { rank: 3, tag: '#減糖健康' },
];

type EventWithDaysLeft = {
  name: string;
  date: string;
  type: string;
  note: string;
  daysLeft: number;
};

export function DashboardPage() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  // --- 檔期 Effect ---
  useEffect(() => {
    const calculateEvents = () => {
      const now = new Date().getTime();
      const nextEvents = FULL_CALENDAR_2026
        .filter(event => new Date(event.date).getTime() > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 2)
        .map(event => ({
          ...event,
          daysLeft: Math.floor((new Date(event.date).getTime() - now) / (1000 * 60 * 60 * 24))
        }));
      setUpcomingEvents(nextEvents);
    };
    calculateEvents();
    const timer = setInterval(calculateEvents, 60000);
    return () => clearInterval(timer);
  }, []);

  // --- 天氣 Effect ---
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('/api/weather', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        const resJson = await response.json();
        if (resJson.status === 'success' && resJson.data && resJson.data.length > 0) {
          setWeatherData({
            city: resJson.city,
            forecasts: resJson.data
          });
        }
      } catch (error) {
        console.error("無法取得天氣資料:", error);
      }
    };
    fetchWeather();
  }, []);

  // 取得星期幾
  const getWeekday = (dateString) => {
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return days[new Date(dateString).getDay()];
  };

  // ⭐ 新增：取得短日期 (MM/DD)
  const getShortDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const getWeatherIcon = (condition) => {
    if (condition === 'Rainy') return '🌧️';
    if (condition === 'Cloudy') return '☁️';
    return '☀️';
  };

  const translateCondition = (condition) => {
    if (condition === 'Rainy') return '降雨中';
    if (condition === 'Cloudy') return '多雲';
    return '晴朗';
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen flex flex-col">
      <div>
        <h2 className="text-2xl font-semibold mb-1 text-gray-800">智慧儀表板</h2>
        <p className="text-sm text-muted-foreground">即時掌握四維數據</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 auto-rows-fr">

        {/* Card 1: 趨勢 */}
        <Card className="border-l-4 flex flex-col shadow-sm" style={{ borderLeftColor: 'var(--df-accent)' }} aria-label="Trending Leaderboard">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2" title="Trending Leaderboard">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--df-accent)' }} />
              Trending Leaderboard
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">熱門排行榜</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pb-6 min-h-[280px]">
            {/* Podium 布局：2（左）/ 1（中最高）/ 3（右） */}
            <div className="flex items-end justify-center gap-5 h-full min-h-[240px] py-6">
              {/* 第2名（左） */}
              {(() => {
                const item = TOP_TRENDS.find(t => t.rank === 2);
                if (!item) return null;
                return (
                  <div className="group w-[32%] max-w-[200px] relative" title={`${item.rank}｜${item.tag}`}>
                    <div className="relative bg-white border border-slate-200 rounded-2xl p-5 h-[72%] min-h-[160px] flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      {/* 排名徽章 */}
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-base font-semibold text-slate-600 z-10">
                        2
                      </div>
                      {/* 內容 */}
                      <div className="flex-1 flex flex-col items-center justify-center pt-6">
                        <span className="text-base font-semibold text-gray-700 text-center leading-tight">{item.tag}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 第1名（中，最高） */}
              {(() => {
                const item = TOP_TRENDS.find(t => t.rank === 1);
                if (!item) return null;
                return (
                  <div className="group w-[32%] max-w-[220px] relative" title={`${item.rank}｜${item.tag}`}>
                    {/* Glow Layer - 平時低強度，hover 時增強 */}
                    <div 
                      className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.5]"
                      style={{
                        opacity: 0.35,
                        boxShadow: '0 0 0 1px rgba(245,158,11,0.25), 0 0 22px rgba(245,158,11,0.35)',
                        animation: 'glowPulse 2.6s ease-in-out infinite',
                      }}
                    />
                    <div 
                      className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        boxShadow: '0 0 0 1px rgba(245,158,11,0.35), 0 0 32px rgba(245,158,11,0.5)',
                      }}
                    />
                    {/* 柱子 */}
                    <div className="relative bg-white border border-amber-200 rounded-2xl p-5 h-full min-h-[220px] flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                      {/* 排名徽章 + 獎盃 */}
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-300 flex items-center justify-center text-lg font-semibold text-amber-700 z-10 relative">
                        1
                        <span className="absolute -top-2 -right-2 text-[16px] drop-shadow-sm">🏆</span>
                      </div>
                      {/* 內容 */}
                      <div className="flex-1 flex flex-col items-center justify-center pt-8">
                        <span className="text-lg font-semibold text-gray-800 text-center leading-tight">{item.tag}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 第3名（右） */}
              {(() => {
                const item = TOP_TRENDS.find(t => t.rank === 3);
                if (!item) return null;
                return (
                  <div className="group w-[32%] max-w-[200px] relative" title={`${item.rank}｜${item.tag}`}>
                    <div className="relative bg-white border border-slate-200 rounded-2xl p-5 h-[64%] min-h-[140px] flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      {/* 排名徽章 */}
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-base font-semibold text-slate-600 z-10">
                        3
                      </div>
                      {/* 內容 */}
                      <div className="flex-1 flex flex-col items-center justify-center pt-6">
                        <span className="text-base font-semibold text-gray-700 text-center leading-tight">{item.tag}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: 天氣預報 */}
        <Card className="border-l-4 border-blue-400 flex flex-col shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center justify-between text-gray-800">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                {weatherData ? `${weatherData.city} 天氣預報` : '天氣預報'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pb-6">
            {weatherData ? (
              <div className="space-y-4 h-full flex flex-col justify-between">
                {/* 選擇的單日大氣候 */}
                <div className="bg-blue-50 rounded-xl p-6 relative overflow-hidden flex-1 flex flex-col justify-center">
                  <div className="absolute right-4 top-4 text-blue-200 opacity-40">
                    <Cloud className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <div className="text-5xl font-bold text-gray-800 mb-2">{weatherData.forecasts[selectedDayIdx].max_temp}°C</div>
                    <div className="text-base text-gray-600 font-medium flex items-center gap-1">
                      {getWeatherIcon(weatherData.forecasts[selectedDayIdx].condition)}
                      {translateCondition(weatherData.forecasts[selectedDayIdx].condition)}
                      <span className="mx-1">·</span>
                      降雨機率 {weatherData.forecasts[selectedDayIdx].rain_prob}%
                    </div>
                  </div>
                </div>

                {/* 一週七天小圖示 */}
                <div className="grid grid-cols-7 gap-1">
                  {weatherData.forecasts.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDayIdx(idx)}
                      // ⭐ 修改點：加高了 padding (py-3)，讓版面不擁擠
                      className={`flex flex-col items-center justify-center py-3 rounded-lg border transition-all ${selectedDayIdx === idx
                          ? 'border-blue-400 bg-blue-50 shadow-sm'
                          : 'border-transparent hover:bg-gray-50'
                        }`}
                    >
                      {/* ⭐ 修改點：放大星期幾，並加入日期 */}
                      <span className="text-sm font-medium text-gray-700 mb-0.5">{getWeekday(day.date)}</span>
                      <span className="text-[10px] text-gray-400 mb-2">{getShortDate(day.date)}</span>

                      <span className="text-xl mb-1">{getWeatherIcon(day.condition)}</span>
                      <span className="text-sm font-bold text-gray-800">{day.max_temp}°</span>
                    </button>
                  ))}
                </div>

                {/* 降溫預警 */}
                {weatherData.forecasts.some(d => d.max_temp < 15) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mt-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>降溫預警：</strong> 未來一週有低於 15°C 的冷氣團，建議增加熱飲配料庫存。
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-pulse space-y-4 h-full flex flex-col justify-center">
                <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: 採購建議 */}
        <Card className="border-l-4 border-orange-400 flex flex-col shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-400" />
                採購建議
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMatrixOpen(true)}
                className="h-6 px-2 text-[10px]"
              >
                全年採購矩陣
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pb-6">
            <ProcurementMonthSummary
              month={new Date().getMonth() + 1}
              matrix={PROCUREMENT_MATRIX}
            />
          </CardContent>
        </Card>

        {/* Card 4: 近期檔期 */}
        <Card className="border-l-4 border-purple-400 flex flex-col shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              近期檔期倒數
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pb-6">
            <div className="space-y-8">
              {upcomingEvents.length > 0 ? upcomingEvents.map((event, index) => (
                <div key={index} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xl ${index === 0 ? 'font-bold text-gray-800' : 'text-gray-600 font-medium'}`}>
                        {event.name}
                      </span>
                      <Badge variant="outline" className={`text-sm h-6 px-2 rounded-sm ${event.type === 'holiday' ? 'text-red-500 border-red-200 bg-red-50' : 'text-blue-500 border-blue-200 bg-blue-50'}`}>
                        {event.type === 'holiday' ? '連假' : '行銷'}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-black ${index === 0 ? 'text-purple-600' : 'text-gray-500'}`}>
                        {event.daysLeft}
                      </span>
                      <span className="text-sm text-gray-400 font-medium">天</span>
                    </div>
                  </div>
                  {index === 0 && (
                    <Progress value={Math.max(10, 100 - (event.daysLeft / 30 * 100))} className="h-2 bg-purple-100" />
                  )}
                </div>
              )) : (
                <div className="text-sm text-muted-foreground text-center">無近期活動</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 全年採購矩陣視窗 */}
      <ProcurementMatrixModal open={isMatrixOpen} onOpenChange={setIsMatrixOpen} />
    </div>
  );
}
