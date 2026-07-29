import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDailyStore } from '../stores/daily';
import { useCoupleStore } from '../stores/couple';
import { useLoveHeartStore } from '../stores/loveHeart';
import { calculateDaysTogether, formatDate, getYearsWithRecords, getMonthsWithRecords, getDaysWithRecords } from '../utils/date';
import { Modal } from '../components/common/Modal';
import { Timeline } from '../components/common/Timeline';
import { ImagePreview } from '../components/common/ImagePreview';
import { BottomNav } from '../components/BottomNav';

export const DailyPage: React.FC = () => {
  const navigate = useNavigate();
  const { records, addRecord, deleteRecord } = useDailyStore();
  const { profile } = useCoupleStore();
  const { addHeart } = useLoveHeartStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<number | undefined>();
  const [filterMonth, setFilterMonth] = useState<number | undefined>();
  const [filterDay, setFilterDay] = useState<number | undefined>();
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);

  

  const today = new Date();
  const daysTogether = profile ? calculateDaysTogether(profile.togetherDate) : 0;
  
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  
  const years = getYearsWithRecords(records);
  const currentYearMonths = filterYear !== undefined 
    ? getMonthsWithRecords(records, filterYear) 
    : [];
  const currentMonthDays = filterYear !== undefined && filterMonth !== undefined
    ? getDaysWithRecords(records, filterYear, filterMonth)
    : [];

  const filteredRecords = records.filter(r => {
    const date = new Date(r.createdAt);
    if (filterYear !== undefined && date.getFullYear() !== filterYear) return false;
    if (filterMonth !== undefined && date.getMonth() !== filterMonth) return false;
    if (filterDay !== undefined && date.getDate() !== filterDay) return false;
    return true;
  });

  const monthRecords = filteredRecords.filter(r => {
    const date = new Date(r.createdAt);
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    const limit = 9 - images.length;
    
    Array.from(files).slice(0, limit).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newImages.push(event.target?.result as string);
        if (newImages.length === Math.min(files.length, limit)) {
          setImages([...images, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!content.trim()) return;
    addRecord(content, images);
    setContent('');
    setImages([]);
    setIsModalOpen(false);
  };

  const clearFilters = () => {
    setFilterYear(undefined);
    setFilterMonth(undefined);
    setFilterDay(undefined);
  };

  const timelineItems = filteredRecords.map(record => ({
    id: record.id,
    date: formatDate(record.createdAt, 'MM月DD日'),
    time: formatDate(record.createdAt, 'HH:mm'),
    content: (
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${record.gender === 'boy' ? 'text-primary' : 'text-accent'}`}>
              {record.gender === 'boy' ? profile?.boyNickname || '他' : profile?.girlNickname || '她'}
            </span>
            <span className="text-xs text-text-muted">记录</span>
          </div>
          <p className="text-text-primary">{record.content}</p>
          <ImagePreview images={record.images} />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteRecord(record.id);
          }}
          className="w-8 h-8 shrink-0 rounded-full bg-danger/10 flex items-center justify-center text-danger/70 hover:text-danger hover:bg-danger/20 transition-all self-start pointer-events-auto"
          aria-label="删除记录"
        >
          ✕
        </button>
      </div>
    ),
  }));

  return (
    <div className="min-h-screen pb-24 page-transition">
      <div className="sticky top-0 bg-bg-nav/95 backdrop-blur-md z-50 border-b border-white/50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
            >
              ←
            </button>
            <h1 className="font-semibold text-text-primary">日常记录</h1>
            <div className="w-10" />
          </div>
          
          <div className="glass-card rounded-xl p-3 mb-4 shadow-sm border border-white/40">
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-text-secondary">
                <span className="text-accent font-semibold">本月 {monthRecords.length}</span> 条
              </span>
              <span className="w-px h-4 bg-gray-200" />
              <span className="text-text-secondary">
                <span className="text-primary font-semibold">总共 {records.length}</span> 条
              </span>
              <span className="w-px h-4 bg-gray-200" />
              <span className="text-text-secondary">
                <span className="text-accent font-semibold">相恋 {daysTogether}</span> 天
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setShowYearPicker(!showYearPicker);
                setShowMonthPicker(false);
                setShowDayPicker(false);
              }}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                filterYear !== undefined 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-white text-text-secondary hover:bg-gray-50 shadow-sm'
              }`}
            >
              {filterYear !== undefined ? `${filterYear}年` : '年份'}
            </button>
            
            {filterYear !== undefined && (
              <button
                onClick={() => {
                  setShowMonthPicker(!showMonthPicker);
                  setShowDayPicker(false);
                }}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  filterMonth !== undefined 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-white text-text-secondary hover:bg-gray-50 shadow-sm'
                }`}
              >
                {filterMonth !== undefined ? months[filterMonth] : '月份'}
              </button>
            )}
            
            {filterMonth !== undefined && (
              <button
                onClick={() => setShowDayPicker(!showDayPicker)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  filterDay !== undefined 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-white text-text-secondary hover:bg-gray-50 shadow-sm'
                }`}
              >
                {filterDay !== undefined ? `${filterDay}日` : '日期'}
              </button>
            )}
            
            {(filterYear !== undefined || filterMonth !== undefined || filterDay !== undefined) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-full text-sm bg-white text-text-secondary hover:bg-gray-50 transition-colors ml-auto shadow-sm"
              >
                清除
              </button>
            )}
          </div>

          {showYearPicker && (
            <div className="mt-2 glass-card rounded-xl shadow-card p-2 max-h-40 overflow-y-auto border border-white/40">
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => {
                    setFilterYear(year);
                    setFilterMonth(undefined);
                    setFilterDay(undefined);
                    setShowYearPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    filterYear === year ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                  }`}
                >
                  {year}年
                </button>
              ))}
            </div>
          )}

          {showMonthPicker && (
            <div className="mt-2 glass-card rounded-xl shadow-card p-2 max-h-40 overflow-y-auto border border-white/40">
              {currentYearMonths.map(month => (
                <button
                  key={month}
                  onClick={() => {
                    setFilterMonth(month);
                    setFilterDay(undefined);
                    setShowMonthPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    filterMonth === month ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                  }`}
                >
                  {months[month]}
                </button>
              ))}
            </div>
          )}

          {showDayPicker && (
            <div className="mt-2 glass-card rounded-xl shadow-card p-2 max-h-40 overflow-y-auto border border-white/40">
              {currentMonthDays.map(day => (
                <button
                  key={day}
                  onClick={() => {
                    setFilterDay(day);
                    setShowDayPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    filterDay === day ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                  }`}
                >
                  {day}日
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <Timeline items={timelineItems} />
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full chat-fab flex items-center justify-center text-white text-2xl shadow-lg hover:shadow-xl transition-all"
      >
        +
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="📝 添加日常记录">
        <div className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录今天发生的事情..."
            className="w-full h-32 p-4 bg-gray-50 rounded-xl border border-gray-100 resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
          
          <div>
            <label className="block text-text-secondary text-sm mb-2">上传图片（最多9张）</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="daily-image-upload"
            />
            <label
              htmlFor="daily-image-upload"
              className="flex items-center justify-center w-full py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
            >
              <span className="text-text-secondary text-sm">📷 点击上传图片</span>
            </label>
            
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((img, index) => (
                  <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm">
                    <img src={img} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xs hover:bg-black/60 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            保存记录
          </button>
        </div>
      </Modal>

      <BottomNav onHeartClick={addHeart} />
    </div>
  );
};