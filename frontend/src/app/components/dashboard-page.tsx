import React, { useState, useEffect } from 'react';
import { TrendingUp, Cloud, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';

// --- 節慶檔期資料 ---
const FULL_CALENDAR_2026 = [
  { name: "2026 元旦連假", date: "2026-01-01T00:00:00", type: "holiday", note: "3天連假" },
  { name: "西洋情人節", date: "2026-02-14T00:00:00", type: "marketing", note: "商機" },
  { name: "農曆春節 (9天)", date: "2026-02-16T00:00:00", type: "holiday", note: "除夕前一日開始" },
  { name: "228 和平紀念日", date: "2026-02-28T00:00:00", type: "holiday", note: "3天連假" },
  { name: "兒童清明連假", date: "2026-04-03T00:00:00", type: "holiday", note: "4天連假" },
  { name: "五一勞動節", date: "2026-05-01T00:00:00", type: "holiday", note: "3天連假" },
];

export function DashboardPage() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

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
        <Card className="border-l-4 flex flex-col shadow-sm" style={{ borderLeftColor: 'var(--df-accent)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--df-accent)' }} />
              Hot Now 趨勢
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pb-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-base font-medium text-gray-700">#草莓季</span>
                <Badge variant="secondary" className="bg-red-100 text-red-600 px-3 py-1 text-sm">🔥 爆發中</Badge>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-base font-medium text-gray-700">#烤糖奶蓋</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-600 px-3 py-1 text-sm">📈 穩定成長</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-gray-700">#減糖健康</span>
                <Badge variant="secondary" className="bg-green-100 text-green-600 px-3 py-1 text-sm">⭐ 潛力新星</Badge>
              </div>
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

        {/* Card 3: 成本 */}
        <Card className="border-l-4 border-orange-400 flex flex-col shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-400" />
              原物料成本
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pb-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center text-base pb-3 border-b border-gray-100">
                <span className="font-medium text-gray-700">草莓</span>
                <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">↑ 漲幅 15%</span>
              </div>
              <div className="flex justify-between items-center text-base pb-3 border-b border-gray-100">
                <span className="font-medium text-gray-700">茶葉</span>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">↓ 跌幅 3%</span>
              </div>
              <div className="flex justify-between items-center text-base">
                <span className="font-medium text-gray-700">鮮奶</span>
                <span className="text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded">→ 持平</span>
              </div>
            </div>
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
    </div>
  );
}