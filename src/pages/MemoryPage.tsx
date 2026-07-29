import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemoryStore } from '../stores/memory';
import { useLoveHeartStore } from '../stores/loveHeart';
import { useCoupleStore } from '../stores/couple';
import { formatDate } from '../utils/date';
import { Modal } from '../components/common/Modal';
import { BottomNav } from '../components/BottomNav';
import type { Memory } from '../types';

const MemoryCard = ({ 
  item, 
  onDelete,
  onZoom,
  profile
}: { 
  item: Memory; 
  onDelete: (id: string) => void;
  onZoom: (images: string[], index: number) => void;
  profile: { boyNickname?: string; girlNickname?: string } | null;
}) => {
  const hasImages = item.images && item.images.length > 0;
  return (
    <div className="glass-card rounded-2xl shadow-card overflow-hidden card-hover relative">
      <button
        onClick={() => onDelete(item.id)}
        aria-label="删除回忆"
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xs hover:bg-danger transition-colors z-20"
      >
        ✕
      </button>
      {hasImages && (
        <div className="relative">
          {item.images!.length === 1 ? (
            <div className="h-48">
              <img
                src={item.images![0]}
                alt="回忆图片"
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => onZoom(item.images!, 0)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-0.5">
              {item.images!.slice(0, 4).map((img, idx) => (
                <div key={idx} className="aspect-square relative">
                  <img
                    src={img}
                    alt="回忆图片"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => onZoom(item.images!, idx)}
                  />
                  {idx === 3 && item.images!.length > 4 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm font-medium">
                      +{item.images!.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 pr-8">
          <span className={`text-xs font-medium ${item.gender === 'boy' ? 'text-primary' : 'text-accent'}`}>
            {item.gender === 'boy' ? profile?.boyNickname || '他' : profile?.girlNickname || '她'}
          </span>
          <span className="text-xs text-text-muted">添加</span>
        </div>
        <p className="text-text-primary mb-3 line-clamp-2">{item.content}</p>
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs">{formatDate(item.createdAt)}</span>
          {item.isImportant && <span className="text-accent text-xs">★ 重要</span>}
        </div>
      </div>
    </div>
  );
};

export const MemoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { memories, loadMemories, addMemory, deleteMemory } = useMemoryStore();
  const { addHeart } = useLoveHeartStore();
  const { profile } = useCoupleStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [zoomImages, setZoomImages] = useState<string[] | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImages([...images, event.target?.result as string]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!content.trim()) return;
    addMemory(content, images, isPrivate, isImportant);
    setContent('');
    setImages([]);
    setIsPrivate(false);
    setIsImportant(false);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen pb-24 page-transition">
      <div className="sticky top-0 bg-bg-nav/95 backdrop-blur-md z-50 border-b border-white/50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
            >
              ←
            </button>
            <h1 className="font-semibold text-text-primary">回忆库</h1>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-10 h-10 rounded-xl bg-primary text-white shadow-sm flex items-center justify-center hover:bg-primary-dark transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="glass-card rounded-2xl shadow-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">总回忆</p>
              <p className="text-2xl font-semibold text-primary mt-1">{memories.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-xl">💿</span>
            </div>
          </div>
        </div>

        {memories.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {memories.map(item => (
              <MemoryCard
                key={item.id}
                item={item}
                onDelete={setPendingDeleteId}
                onZoom={(images, index) => {
                  setZoomImages(images);
                  setZoomIndex(index);
                }}
                profile={profile}
              />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl shadow-card p-8 text-center">
            <span className="text-4xl mb-3 block">💿</span>
            <p className="text-text-secondary mb-1">还没有回忆</p>
            <p className="text-text-muted text-xs">保存你们的甜蜜瞬间吧</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              添加回忆
            </button>
          </div>
        )}
      </div>

      <BottomNav onHeartClick={addHeart} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="💿 添加回忆">
        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-2">内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="记录当时的心情..."
              className="w-full h-24 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-text-secondary text-sm mb-2">上传图片</label>
            {images.length > 0 && (
              <div className="flex gap-2 mb-2">
                {images.map((img, index) => (
                  <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-0 right-0 w-5 h-5 bg-black/50 flex items-center justify-center text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="memory-image-upload"
            />
            <label
              htmlFor="memory-image-upload"
              className="flex items-center justify-center w-full py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
            >
              <span className="text-text-secondary text-sm">📷 点击上传图片</span>
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-text-secondary text-sm">私密</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-text-secondary text-sm">重要</span>
            </label>
          </div>

          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            添加
          </button>
        </div>
      </Modal>

      {pendingDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[90%] sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
            <h3 className="font-semibold text-text-primary mb-2">删除回忆</h3>
            <p className="text-text-muted text-sm mb-6">确定要删除这条回忆吗？删除后将无法恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="flex-1 py-3 bg-gray-100 text-text-secondary rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  deleteMemory(pendingDeleteId);
                  setPendingDeleteId(null);
                }}
                className="flex-1 py-3 bg-danger text-white rounded-xl font-medium hover:bg-danger/90 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomImages && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setZoomImages(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-lg hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
          {zoomImages.length > 1 && (
            <button
              onClick={() => setZoomIndex((i) => (i - 1 + zoomImages.length) % zoomImages.length)}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-xl hover:bg-white/20 transition-colors"
            >
              ‹
            </button>
          )}
          <img
            src={zoomImages[zoomIndex]}
            alt="回忆图片"
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={() => setZoomImages(null)}
          />
          {zoomImages.length > 1 && (
            <button
              onClick={() => setZoomIndex((i) => (i + 1) % zoomImages.length)}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-xl hover:bg-white/20 transition-colors"
            >
              ›
            </button>
          )}
          {zoomImages.length > 1 && (
            <div className="absolute bottom-6 text-white/70 text-sm">
              {zoomIndex + 1} / {zoomImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};