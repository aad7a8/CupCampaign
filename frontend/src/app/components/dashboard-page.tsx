import React, { useState, useEffect } from 'react';
import { Cloud, Calendar, AlertTriangle, Globe, ChevronDown, ChevronUp, Clock, ShoppingCart, LayoutDashboard, FileCheck, History, MenuSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';

// ============================================================================
// 輔助函數：解析 Gemini 產生的字串
// ============================================================================
const parseTrendsData = (rawSummary = '') => {
  const topics = [];
  const topicBlockRegex = /###([^#]+)###([\s\S]*?)(?=(?:###|--- 引用來源 ---|=== 搜尋結果|$))/g;
  let match;

  while ((match = topicBlockRegex.exec(rawSummary)) !== null) {
    const rawTitle = match[1].trim();
    const rawContent = match[2].trim();

    let title = rawTitle;
    const dateMatchIdx = rawTitle.search(/\s*-\s*\d{4}/);
    if (dateMatchIdx !== -1) {
      title = rawTitle.substring(0, dateMatchIdx).trim();
    }

    const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l !== '');
    const summaryLines = [];

    lines.forEach(line => {
      let textLine = line.replace(/Hashtag:?/i, '').trim();
      if (textLine) {
        summaryLines.push(textLine);
      }
    });

    let summary = summaryLines.join(' ');
    summary = summary.replace(/^摘要[\s：:]*/, '').trim();

    if (title && summary) {
      if (!topics.find(t => t.title === title)) {
        topics.push({ title, summary });
      }
    }
  }

  topics.forEach((t, idx) => {
    t.rank = idx + 1;
    if (idx === 0) t.type = 'hot';
    else if (idx < 3) t.type = 'steady';
    else t.type = 'new';
  });

  return topics;
};

// ============================================================================
// 輔助函數：水果名稱轉換與 Icon 映射
// ============================================================================
const getFruitDisplay = (rawName) => {
  if (!rawName) return { name: '', icon: '🛒' };

  if (rawName.includes('甜橙')) return { name: '柳橙', icon: '🍊' };
  if (rawName.includes('番石榴')) return { name: '紅心芭樂' };
  if (rawName.includes('雜柑')) return { name: '檸檬', icon: '🍋' };
  if (rawName.includes('草莓')) return { name: '草莓', icon: '🍓' };
  if (rawName.includes('鳳梨')) return { name: '鳳梨', icon: '🍍' };
  if (rawName.includes('酪梨')) return { name: '酪梨', icon: '🥑' };
  if (rawName.includes('芒果')) return { name: '芒果', icon: '🥭' };
  if (rawName.includes('蘋果')) return { name: '蘋果', icon: '🍎' };
  if (rawName.includes('百香果')) return { name: '百香果' };
  if (rawName.includes('葡萄柚')) return { name: '葡萄柚', icon: '🍊' };

  return { name: rawName.split('-')[0], icon: '🛒' };
};

export function DashboardPage() {
  // === 1. 定義所有的 State ===
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const [trends, setTrends] = useState([]);
  const [trendsLastUpdated, setTrendsLastUpdated] = useState('');
  const [expandedIdx, setExpandedIdx] = useState(null);

  const [fruitMatrixMap, setFruitMatrixMap] = useState({});
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(false);

  // === 2. 所有的 useEffect ===
  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const response = await fetch('/api/trends/latest', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const resJson = await response.json();

        if (resJson.status === 'success' && resJson.data) {
          const { summary, created_at } = resJson.data;
          const parsedTopics = parseTrendsData(summary);
          setTrends(parsedTopics.slice(0, 5));

          if (created_at) {
            const d = new Date(created_at);
            setTrendsLastUpdated(`${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
          }
        }
      } catch (error) {
        console.error("無法取得社群趨勢資料:", error);
      }
    };
    fetchTrends();
  }, []);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch('/api/holidays', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const resJson = await response.json();

        if (resJson.status === 'success' && resJson.data) {
          setCalendarData(resJson.data);
        }
      } catch (error) {
        console.error("無法取得節慶檔期資料:", error);
      }
    };
    fetchHolidays();
  }, []);

  useEffect(() => {
    if (calendarData.length === 0) return;

    const calculateEvents = () => {
      const now = new Date().getTime();
      const nextEvents = calendarData
        .filter(event => new Date(event.target_date).getTime() > now)
        .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
        .slice(0, 2)
        .map(event => ({
          name: event.holiday_name,
          date: event.target_date,
          type: event.category_type,
          note: event.note,
          daysLeft: Math.ceil((new Date(event.target_date).getTime() - now) / (1000 * 60 * 60 * 24))
        }));
      setUpcomingEvents(nextEvents);
    };

    calculateEvents();
    const timer = setInterval(calculateEvents, 60000);
    return () => clearInterval(timer);
  }, [calendarData]);

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
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const validForecasts = resJson.data
            .filter(day => {
              const forecastDate = new Date(day.date);
              forecastDate.setHours(0, 0, 0, 0);
              return forecastDate >= today;
            })
            .slice(0, 7);

          setWeatherData({
            city: resJson.city,
            forecasts: validForecasts
          });
        }
      } catch (error) {
        console.error("無法取得天氣資料:", error);
      }
    };
    fetchWeather();
  }, []);

  useEffect(() => {
    const fetchMatrixData = async () => {
      try {
        const response = await fetch('/api/ingredients/matrix', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        const resJson = await response.json();

        if (resJson.status === 'success' && resJson.data) {
          setFruitMatrixMap(resJson.data);
        }
      } catch (error) {
        console.error("無法取得原物料矩陣資料:", error);
      }
    };
    fetchMatrixData();
  }, []);

  // === 3. 處理月份與推薦邏輯 ===
  const currentMonthIndex = new Date().getMonth();
  const currentMonthDisplay = currentMonthIndex + 1;

  const STATUS_CONFIG = {
    1: { label: '最佳(低價)', color: 'bg-emerald-500 text-white', border: 'border-emerald-600' },
    2: { label: '適合', color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200' },
    3: { label: '偏高', color: 'bg-orange-100 text-orange-800', border: 'border-orange-200' },
    4: { label: '高價', color: 'bg-red-400 text-white', border: 'border-red-500' },
    0: { label: '沒有供應', color: 'bg-gray-100 text-gray-400', border: 'border-gray-200' },
  };

  const bestBuys = Object.entries(fruitMatrixMap).filter(([_, matrix]) => matrix && matrix[currentMonthIndex] === 1);
  const goodBuys = Object.entries(fruitMatrixMap).filter(([_, matrix]) => matrix && matrix[currentMonthIndex] === 2);

  // === 4. Helper Functions ===
  const getWeekday = (dateString) => {
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return days[new Date(dateString).getDay()];
  };

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

  const getTrendBadgeStyle = (type, rank) => {
    if (rank === 1) return <Badge variant="secondary" className="bg-red-100 text-red-600 px-2 py-0.5 text-xs">🔥</Badge>;
    if (type === 'steady') return <Badge variant="secondary" className="bg-orange-100 text-orange-600 px-2 py-0.5 text-xs">📈</Badge>;
    return <Badge variant="secondary" className="bg-blue-100 text-blue-600 px-2 py-0.5 text-xs">✨</Badge>;
  };

  return (
    < div className="p-6 space-y-6 bg-gray-50 min-h-screen flex flex-col" >
      <div>
        <h2 className="text-2xl font-semibold mb-1 text-gray-800">智慧儀表板</h2>
        <p className="text-sm text-muted-foreground">即時掌握四維數據</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* --- Card 1: 社群熱搜主題 (邊框改為 border-l-4) --- */}
        <Card className="border-l-4 shadow-sm flex flex-col" style={{ borderLeftColor: '#f6953b' }}>
          <CardHeader className="pb-3 border-b border-gray-50">
            <CardTitle className="text-lg flex items-center justify-between text-gray-800">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-500" />
                社群熱搜主題
              </div>
              {trendsLastUpdated && (
                <div className="flex items-center gap-1 text-xs text-gray-400 font-normal">
                  <Clock className="w-3 h-3" />
                  {trendsLastUpdated} 更新
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1 overflow-y-auto">
            {trends.length > 0 ? (
              <div className="space-y-3">
                {trends.map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400 w-4">{item.rank}</span>
                        <span className="text-base font-medium text-gray-800">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendBadgeStyle(item.type, item.rank)}
                        {expandedIdx === idx ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                    {expandedIdx === idx && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 bg-white p-3 rounded shadow-sm">
                        <p className="leading-relaxed">{item.summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-gray-400 text-sm animate-pulse space-y-3">
                <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
                <p>正在載入 AI 趨勢洞察...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Card 2: 天氣預報 (邊框改為 border-l-4) --- */}
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

                <div className="grid grid-cols-7 gap-2">
                  {weatherData.forecasts.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`flex flex-col items-center justify-center py-4 rounded-lg border transition-all ${selectedDayIdx === idx
                        ? 'border-blue-400 bg-blue-50 shadow-sm scale-105'
                        : 'border-transparent bg-white hover:bg-gray-50'
                        }`}
                    >
                      <span className={`font-bold mb-1 ${selectedDayIdx === idx ? 'text-blue-600' : 'text-gray-700'} text-base`}>
                        {getWeekday(day.date)}
                      </span>
                      <span className="text-xs text-gray-400 mb-2">
                        {getShortDate(day.date)}
                      </span>
                      <span className="text-2xl mb-1">{getWeatherIcon(day.condition)}</span>
                      <span className="text-sm font-bold text-gray-800">{day.max_temp}°</span>
                    </button>
                  ))}
                </div>

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

        {/* --- Card 3: 鮮果採購指南 (邊框改為 border-l-4，字體統一 text-lg) --- */}
        <Card className="border-l-4 border-emerald-500 flex flex-col shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-50">
            <CardTitle className="text-lg flex items-center justify-between text-gray-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                鮮果採購指南
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200">
                📍 {currentMonthDisplay} 月推薦
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6 flex-1 flex flex-col space-y-6">
            {/* 第一層：本月採購建議 */}
            <div className="space-y-5">
              <section>
                <h4 className="text-xs font-bold text-gray-400 mb-3 flex items-center gap-1.5">💎 本月最佳 (較低價)</h4>
                <div className="flex flex-wrap gap-3">
                  {bestBuys.length > 0 ? bestBuys.map(([fruit]) => {
                    const { name, icon } = getFruitDisplay(fruit);
                    return (
                      <Badge key={fruit} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-base font-medium shadow-sm">
                        <span className="mr-1.5 text-lg">{icon}</span>{name}
                      </Badge>
                    );
                  }) : <span className="text-sm text-gray-400">載入中或本月無最佳推薦</span>}
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-gray-400 mb-3 flex items-center gap-1.5">👍 本月適合 (價格平穩)</h4>
                <div className="flex flex-wrap gap-3">
                  {goodBuys.length > 0 ? goodBuys.map(([fruit]) => {
                    const { name, icon } = getFruitDisplay(fruit);
                    return (
                      <Badge key={fruit} variant="outline" className="bg-white border-emerald-200 text-emerald-700 px-4 py-2 text-base shadow-sm">
                        <span className="mr-1.5 text-lg">{icon}</span>{name}
                      </Badge>
                    );
                  }) : <span className="text-sm text-gray-400">載入中或本月無適合推薦</span>}
                </div>
              </section>
            </div>

            {/* 展開/收合按鈕 */}
            <div className="mt-auto pt-4 flex justify-center">
              <button
                onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 transition-colors bg-gray-100 px-5 py-1.5 rounded-full"
              >
                {isMatrixExpanded ? '收合年度矩陣' : '展開年度熱點矩陣'}
                {isMatrixExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* 第二層：年度熱力圖矩陣 (展開顯示) */}
            {isMatrixExpanded && Object.keys(fruitMatrixMap).length > 0 && (
              <div className="mt-2 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-wrap items-center justify-center gap-3 mb-4 text-xs text-gray-600">
                  {[1, 2, 3, 4, 0].map(status => (
                    <div key={status} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-sm ${STATUS_CONFIG[status].color} border ${STATUS_CONFIG[status].border}`}></span>
                      {STATUS_CONFIG[status].label}
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm bg-white">
                  <table className="w-full text-sm text-center min-w-[500px]">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                      <tr>
                        <th className="py-2.5 px-3 text-left sticky left-0 bg-gray-50 z-10 w-28 border-r border-gray-100">品項</th>
                        {[...Array(12)].map((_, i) => (
                          <th key={i} className={`py-2 px-1 w-8 ${i === currentMonthIndex ? 'bg-emerald-100 text-emerald-800 font-bold' : ''}`}>
                            {i + 1}月
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(fruitMatrixMap).map(([fruit, matrix]) => {
                        const { name, icon } = getFruitDisplay(fruit);
                        return (
                          <tr key={fruit} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-3 text-left text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-100 font-medium whitespace-nowrap" title={fruit}>
                              <div className="flex items-center gap-2">
                                <span className="text-base">{icon}</span>
                                <span>{name}</span>
                              </div>
                            </td>
                            {matrix && matrix.map((status, idx) => (
                              <td key={idx} className={`p-1 ${idx === currentMonthIndex ? 'bg-emerald-50/50' : ''}`}>
                                <div className={`w-full h-6 rounded-sm flex items-center justify-center text-[10px] font-medium border ${STATUS_CONFIG[status]?.color || 'bg-gray-100'} ${STATUS_CONFIG[status]?.border || 'border-gray-200'} opacity-90`}>
                                  {status !== 0 ? status : '-'}
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Card 4: 近期檔期倒數 (邊框改為 border-l-4) --- */}
        <Card className="border-l-4 border-purple-400 flex flex-col shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center justify-between text-gray-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                近期檔期倒數
              </div>
              <Badge variant="outline" className="text-sm border-purple-200 text-purple-600">
                共 {upcomingEvents.length} 個進行中
              </Badge>
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
                        {event.type === 'holiday' ? '連假' : '行銷'} {getShortDate(event.date)}
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
                  {event.note && (
                    <p className="text-xs text-purple-500 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      備註：{event.note}
                    </p>
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