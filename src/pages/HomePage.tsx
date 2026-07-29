import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoupleStore } from '../stores/couple';
import { useAnniversaryStore } from '../stores/anniversary';
import { useDailyStore } from '../stores/daily';
import { useWeatherStore } from '../stores/weather';
import { useLoveHeartStore } from '../stores/loveHeart';
import { calculateDaysTogether, calculateDaysUntil, formatDate } from '../utils/date';
import { Modal } from '../components/common/Modal';
import { BottomNav } from '../components/BottomNav';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useCoupleStore();
  const { anniversaries, loadAnniversaries } = useAnniversaryStore();
  const { records } = useDailyStore();
  const { records: weatherRecords, loadWeather, addWeather, updateWeather, getTodayWeather, fetchWeatherAuto, isFetching, fetchError } = useWeatherStore();
  const { loveHeart, loadLoveHeart, addHeart } = useLoveHeartStore();
  const [daysDisplay, setDaysDisplay] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [weatherForm, setWeatherForm] = useState({
    city: '',
    weather: '',
    temperature: '',
    note: '',
  });

  useEffect(() => {
    loadAnniversaries();
    loadWeather();
    loadLoveHeart();
  }, [loadAnniversaries, loadWeather, loadLoveHeart]);

  useEffect(() => {
    if (profile) {
      const days = calculateDaysTogether(profile.togetherDate);
      const duration = 1500;
      const steps = 60;
      const increment = days / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= days) {
          setDaysDisplay(days);
          clearInterval(timer);
        } else {
          setDaysDisplay(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [profile]);

  useEffect(() => {
    const todayWeather = getTodayWeather();
    if (todayWeather) {
      setWeatherForm({
        city: todayWeather.city,
        weather: todayWeather.weather,
        temperature: todayWeather.temperature,
        note: todayWeather.note,
      });
    }
  }, [getTodayWeather]);

  const upcomingAnniversaries = anniversaries
    .map(a => ({ ...a, daysUntil: calculateDaysUntil(a.date) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);

  const today = new Date();
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const todayWeather = getTodayWeather();

  const handleWeatherSave = () => {
    if (!weatherForm.city.trim() || !weatherForm.weather.trim()) return;
    
    if (todayWeather) {
      updateWeather(todayWeather.id, weatherForm.city, weatherForm.weather, weatherForm.temperature, weatherForm.note);
    } else {
      addWeather(weatherForm.city, weatherForm.weather, weatherForm.temperature, weatherForm.note);
    }
    setIsWeatherModalOpen(false);
  };

  const getWeatherIcon = (weather: string) => {
    if (weather.includes('晴')) return '☀️';
    if (weather.includes('多云')) return '⛅';
    if (weather.includes('雨')) return '🌧️';
    if (weather.includes('雪')) return '❄️';
    if (weather.includes('雾')) return '🌫️';
    if (weather.includes('风')) return '🌬️';
    return '🌤️';
  };

  return (
    <div className="min-h-screen pb-20 relative">
      
      <div className="fixed top-0 left-0 right-0 bg-white/40 backdrop-blur-md z-50 border-b border-white/40">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-xl bg-white/80 shadow-sm flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
          >
            ☰
          </button>
          <h1 className="font-semibold text-text-primary text-sm tracking-wide">
            {profile?.boyNickname} & {profile?.girlNickname}
          </h1>
          <div className="flex items-center gap-1 bg-accent-light rounded-full px-2.5 py-1">
            <span className="text-accent text-xs">♥</span>
            <span className="text-accent text-xs font-semibold">100%</span>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setMenuOpen(false)}>
          <div className="absolute top-[52px] left-4 right-4 bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <p className="text-text-secondary text-sm">设置</p>
            </div>
            <button
              onClick={() => { navigate('/settings'); setMenuOpen(false); }}
              className="w-full px-4 py-3 text-left text-text-primary hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              ⚙️ 账号设置
            </button>
            <button
              onClick={() => { navigate('/savings'); setMenuOpen(false); }}
              className="w-full px-4 py-3 text-left text-text-primary hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              💰 小金库
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-16 pb-6">
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-card p-6 mb-5 text-center border border-white/40">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Little love record</p>
          
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {profile?.boyNickname} & {profile?.girlNickname}
          </h2>
          
          <div className="flex items-center justify-center mb-2">
            <span className="text-7xl font-extralight text-primary tracking-tighter">{daysDisplay}</span>
          </div>
          <p className="text-text-secondary text-xs mb-7">days together for</p>

          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-white shadow-sm overflow-hidden">
              {profile?.boyAvatar?.startsWith('data:image') ? (
                <img src={profile.boyAvatar} alt="男生头像" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                  <span className="text-2xl">🧸</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-8 h-px bg-primary/40" />
              <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                <span className="text-accent text-xs">♥</span>
              </div>
              <div className="w-8 h-px bg-primary/40" />
            </div>
            
            <div className="w-16 h-16 rounded-full border-2 border-white shadow-sm overflow-hidden">
              {profile?.girlAvatar?.startsWith('data:image') ? (
                <img src={profile.girlAvatar} alt="女生头像" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-pink-50 flex items-center justify-center">
                  <span className="text-2xl">🐰</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-text-muted text-xs">
            since {formatDate(profile?.togetherDate || '')} · 我们已经一起走过 {daysDisplay} 天
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => setIsWeatherModalOpen(true)}
            className="bg-white/35 backdrop-blur-xl rounded-2xl p-4 text-left border border-white/40 shadow-sm hover:shadow-md transition-all relative"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-text-muted text-xs">今日天气</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  fetchWeatherAuto();
                }}
                className={`w-5 h-5 rounded-full bg-white/60 flex items-center justify-center text-text-muted hover:text-primary transition-colors ml-auto cursor-pointer ${isFetching ? 'opacity-50' : ''}`}
              >
                {isFetching ? '⏳' : '↻'}
              </span>
            </div>
            {(() => {
              const shanghaiWeather = weatherRecords.find(r => r.city === '上海');
              const chongqingWeather = weatherRecords.find(r => r.city === '重庆');
              
              if (shanghaiWeather && chongqingWeather) {
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getWeatherIcon(shanghaiWeather.weather)}</span>
                      <span className="text-text-primary font-medium text-sm">上海</span>
                      <span className="text-text-secondary text-xs ml-auto">{shanghaiWeather.temperature}°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getWeatherIcon(chongqingWeather.weather)}</span>
                      <span className="text-text-primary font-medium text-sm">重庆</span>
                      <span className="text-text-secondary text-xs ml-auto">{chongqingWeather.temperature}°C</span>
                    </div>
                  </div>
                );
              }
              return (
                <>
                  <p className="text-text-primary font-medium text-sm mb-1">点击添加</p>
                  <p className="text-text-secondary text-xs">记录今天的天气</p>
                </>
              );
            })()}
            <p className="text-text-muted text-xs mt-2">
              {today.getMonth() + 1}月{today.getDate()}日 {weekDays[today.getDay()]}
            </p>
          </button>

          <button 
            onClick={addHeart}
            className="bg-white/35 backdrop-blur-xl rounded-2xl p-4 text-left border border-white/40 shadow-sm hover:shadow-md transition-all relative group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-accent text-xs">♥</span>
              <span className="text-text-muted text-xs">今日心情</span>
            </div>
            <p className="text-text-primary font-medium text-sm mb-1">今日心情：💭</p>
            <p className="text-text-secondary text-xs">点一下去打卡</p>
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              <span className="text-xs text-primary font-semibold">{loveHeart?.boyCount || 0}</span>
              <span className="text-accent text-xs">♥</span>
              <span className="text-xs text-accent font-semibold">{loveHeart?.girlCount || 0}</span>
            </div>
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary text-sm">重要日子</h3>
            <button 
              onClick={() => navigate('/anniversary')}
              className="w-7 h-7 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
            >
              +
            </button>
          </div>
          
          <div className="space-y-2">
            {upcomingAnniversaries.length > 0 ? (
              upcomingAnniversaries.map((item, index) => (
                <div key={item.id} className="bg-white/35 backdrop-blur-xl rounded-xl p-3 border border-white/40 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-text-muted text-xs px-2 py-0.5 bg-blue-50 rounded-full">我们</span>
                        <h4 className="font-medium text-text-primary text-sm">{item.name}</h4>
                      </div>
                      <p className="text-text-muted text-xs">{formatDate(item.date)}</p>
                      {index === 0 && (
                        <span className="text-accent text-xs mt-1 block">置顶</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-primary">{item.daysUntil}</p>
                      <p className="text-text-muted text-xs">days left</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white/35 backdrop-blur-xl rounded-xl p-5 text-center border border-white/40">
                <span className="text-2xl mb-2 block">📅</span>
                <p className="text-text-secondary text-xs">还没有添加纪念日</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/35 backdrop-blur-xl rounded-xl p-4 border border-white/40">
          <h3 className="font-semibold text-text-primary text-sm mb-3">我们的回忆</h3>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => navigate('/daily')}
              className="bg-white/30 rounded-xl p-3 text-left border border-white/30 hover:bg-white/50 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <span className="text-primary text-base">📝</span>
              </div>
              <p className="font-medium text-text-primary text-xs">日记</p>
              <p className="text-text-muted text-xs">{records.length} 篇</p>
            </button>
            
            <button 
              onClick={() => navigate('/memory')}
              className="bg-white/30 rounded-xl p-3 text-left border border-white/30 hover:bg-white/50 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                <span className="text-accent text-base">💿</span>
              </div>
              <p className="font-medium text-text-primary text-xs">回忆库</p>
              <p className="text-text-muted text-xs">珍藏时光</p>
            </button>

            <button 
              onClick={() => navigate('/wishlist')}
              className="bg-white/30 rounded-xl p-3 text-left border border-white/30 hover:bg-white/50 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center mb-2">
                <span className="text-yellow-500 text-base">✨</span>
              </div>
              <p className="font-medium text-text-primary text-xs">心愿清单</p>
              <p className="text-text-muted text-xs">未来计划</p>
            </button>

            <button 
              onClick={() => navigate('/savings')}
              className="bg-white/30 rounded-xl p-3 text-left border border-white/30 hover:bg-white/50 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-2">
                <span className="text-green-500 text-base">💰</span>
              </div>
              <p className="font-medium text-text-primary text-xs">小金库</p>
              <p className="text-text-muted text-xs">共同财富</p>
            </button>
          </div>
        </div>
      </div>

      <BottomNav onHeartClick={addHeart} />

      <Modal isOpen={isWeatherModalOpen} onClose={() => setIsWeatherModalOpen(false)} title="🌤️ 今日天气">
        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-2">城市</label>
            <input
              type="text"
              value={weatherForm.city}
              onChange={(e) => setWeatherForm({ ...weatherForm, city: e.target.value })}
              placeholder="例如：广州"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-text-secondary text-sm mb-2">天气状况</label>
            <select
              value={weatherForm.weather}
              onChange={(e) => setWeatherForm({ ...weatherForm, weather: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            >
              <option value="">请选择天气</option>
              <option value="☀️ 晴天">☀️ 晴天</option>
              <option value="⛅ 多云">⛅ 多云</option>
              <option value="🌤️ 晴转多云">🌤️ 晴转多云</option>
              <option value="🌧️ 小雨">🌧️ 小雨</option>
              <option value="⛈️ 大雨">⛈️ 大雨</option>
              <option value="❄️ 雪">❄️ 雪</option>
              <option value="🌫️ 雾">🌫️ 雾</option>
              <option value="🌬️ 大风">🌬️ 大风</option>
            </select>
          </div>
          
          <div>
            <label className="block text-text-secondary text-sm mb-2">温度</label>
            <input
              type="number"
              value={weatherForm.temperature}
              onChange={(e) => setWeatherForm({ ...weatherForm, temperature: e.target.value })}
              placeholder="26"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
            <span className="text-text-muted text-xs">°C</span>
          </div>
          
          <div>
            <label className="block text-text-secondary text-sm mb-2">备注（可选）</label>
            <textarea
              value={weatherForm.note}
              onChange={(e) => setWeatherForm({ ...weatherForm, note: e.target.value })}
              placeholder="记录今天的心情..."
              className="w-full h-20 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <button
            onClick={handleWeatherSave}
            disabled={!weatherForm.city.trim() || !weatherForm.weather.trim()}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {todayWeather ? '更新天气' : '添加天气'}
          </button>
        </div>
      </Modal>
    </div>
  );
};