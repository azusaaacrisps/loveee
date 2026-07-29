import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/auth';
import { useCoupleStore } from '../stores/couple';
import { useMusicStore } from '../stores/music';
import { useLoveHeartStore } from '../stores/loveHeart';
import { fetchSongInfo, formatLyrics, createManualSong } from '../services/musicService';
import { BottomNav } from '../components/BottomNav';
import { SharedSong } from '../types';

export const MusicPage: React.FC = () => {
  const { user } = useAuthStore();
  const { profile } = useCoupleStore();
  const { songs, currentSong, isPlaying, loadSongs, addSong, setCurrentSong, togglePlay, deleteSong } = useMusicStore();
  const { addHeart } = useLoveHeartStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [neteaseUrl, setNeteaseUrl] = useState('');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [manualInput, setManualInput] = useState(false);
  const [manualSongName, setManualSongName] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => togglePlay();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSong]);

  useEffect(() => {
    if (currentSong && lyricsRef.current) {
      const lyrics = formatLyrics(currentSong.lyrics);
      const currentLyricIndex = lyrics.findIndex(
        (l, i) => currentTime >= parseFloat(l.time) && (i === lyrics.length - 1 || currentTime < parseFloat(lyrics[i + 1].time))
      );
      
      if (currentLyricIndex >= 0) {
        const element = lyricsRef.current.children[currentLyricIndex] as HTMLElement;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, currentSong]);

  const handleAddSong = async () => {
    if (manualInput) {
      if (!manualSongName.trim()) {
        setError('请输入歌曲名');
        return;
      }

      const songInfo = createManualSong(
        Date.now().toString(),
        manualSongName.trim(),
        manualArtist.trim() || '未知歌手'
      );

      await addSong({
        userId: user!.id,
        gender: user!.gender,
        songId: songInfo.songId,
        songName: songInfo.songName,
        artist: songInfo.artist,
        cover: songInfo.cover,
        lyrics: songInfo.lyrics,
        url: songInfo.url,
        comment: comment.trim(),
      });

      setShowAddModal(false);
      setManualSongName('');
      setManualArtist('');
      setComment('');
      setManualInput(false);
      return;
    }

    if (!neteaseUrl.trim()) {
      setError('请输入网易云音乐链接');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const songInfo = await fetchSongInfo(neteaseUrl);
      
      await addSong({
        userId: user!.id,
        gender: user!.gender,
        songId: songInfo.songId,
        songName: songInfo.songName,
        artist: songInfo.artist,
        cover: songInfo.cover,
        lyrics: songInfo.lyrics,
        url: songInfo.url,
        comment: comment.trim(),
      });

      setShowAddModal(false);
      setNeteaseUrl('');
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取歌曲信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaySong = (song: SharedSong) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      setCurrentSong(song);
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getNickname = (gender: 'boy' | 'girl') => {
    return gender === 'boy' ? profile?.boyNickname : profile?.girlNickname;
  };

  return (
    <div className="min-h-screen pb-24 page-transition">
      <div className="sticky top-0 bg-bg-nav/95 backdrop-blur-md z-50 border-b border-white/50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-text-secondary hover:text-primary transition-colors">
            ☰
          </button>
          <h1 className="font-semibold text-text-primary tracking-wide">Music</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="glass-card rounded-2xl shadow-card p-5 mb-6">
          <h3 className="font-semibold text-text-primary mb-2">一起听过的歌</h3>
          <p className="text-text-muted text-xs">{songs.length} 首</p>
        </div>

        {currentSong && (
          <div className="glass-card rounded-2xl shadow-card p-5 mb-6">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg">
                <img
                  src={currentSong.cover}
                  alt={currentSong.songName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary truncate">{currentSong.songName}</h3>
                <p className="text-text-muted text-sm truncate">{currentSong.artist}</p>
                <p className="text-text-muted text-xs mt-1">
                  {currentSong.gender === 'boy' ? (
                    <span className="text-primary">{getNickname('boy')}</span>
                  ) : (
                    <span className="text-accent">{getNickname('girl')}</span>
                  )} 分享
                </p>
                {currentSong.comment && (
                  <p className="text-text-muted text-xs mt-1 italic">" {currentSong.comment} "</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-text-muted text-xs mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 mt-4">
              <button
                onClick={() => audioRef.current?.currentTime && (audioRef.current.currentTime -= 10)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
              >
                ⏪
              </button>
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl shadow-lg hover:shadow-xl transition-all"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                onClick={() => audioRef.current?.currentTime && (audioRef.current.currentTime += 10)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
              >
                ⏩
              </button>
            </div>

            {currentSong.lyrics && (
              <div
                ref={lyricsRef}
                className="mt-4 h-32 overflow-y-auto text-center space-y-2 scrollbar-hide"
              >
                {formatLyrics(currentSong.lyrics).map((lyric, index) => (
                  <p
                    key={index}
                    className={`text-sm transition-colors ${
                      currentTime >= parseFloat(lyric.time) &&
                      (index === formatLyrics(currentSong.lyrics).length - 1 ||
                        currentTime < parseFloat(formatLyrics(currentSong.lyrics)[index + 1].time))
                        ? 'text-primary font-medium'
                        : 'text-text-muted'
                    }`}
                  >
                    {lyric.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {songs.length === 0 ? (
            <div className="glass-card rounded-2xl shadow-card p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎵</span>
              </div>
              <p className="text-text-muted">还没有分享过歌曲</p>
              <p className="text-text-muted text-xs mt-1">点击右上角添加</p>
            </div>
          ) : (
            songs.map((song) => (
              <div
                key={song.id}
                onClick={() => handlePlaySong(song)}
                className={`glass-card rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-lg ${
                  currentSong?.id === song.id ? 'ring-2 ring-primary/30' : ''
                }`}
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                  <img
                    src={song.cover}
                    alt={song.songName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-text-primary truncate">{song.songName}</h4>
                  <p className="text-text-muted text-xs truncate">{song.artist}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs ${
                        song.gender === 'boy' ? 'text-primary' : 'text-accent'
                      }`}
                    >
                      {getNickname(song.gender)}
                    </span>
                    {song.comment && (
                      <span className="text-text-muted text-xs truncate">" {song.comment} "</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaySong(song);
                    }}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
                  >
                    {currentSong?.id === song.id && isPlaying ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteId(song.id);
                    }}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:text-danger transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav onHeartClick={addHeart} />

      <audio ref={audioRef} src={currentSong?.url || ''} crossOrigin="anonymous" referrerPolicy="no-referrer" />

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[90%] sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">分享歌曲</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setManualInput(false);
                  setError('');
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setManualInput(false);
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !manualInput ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary'
                }`}
              >
                网易云链接
              </button>
              <button
                onClick={() => {
                  setManualInput(true);
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  manualInput ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary'
                }`}
              >
                手动输入
              </button>
            </div>

            <div className="space-y-4">
              {manualInput ? (
                <>
                  <div>
                    <label className="block text-text-muted text-xs mb-2">歌曲名</label>
                    <input
                      type="text"
                      value={manualSongName}
                      onChange={(e) => setManualSongName(e.target.value)}
                      placeholder="输入歌曲名"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted text-xs mb-2">歌手（可选）</label>
                    <input
                      type="text"
                      value={manualArtist}
                      onChange={(e) => setManualArtist(e.target.value)}
                      placeholder="输入歌手名"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-text-muted text-xs mb-2">网易云音乐链接</label>
                  <input
                    type="text"
                    value={neteaseUrl}
                    onChange={(e) => setNeteaseUrl(e.target.value)}
                    placeholder="https://music.163.com/song?id=xxx"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-text-muted text-xs mb-2">想说的话（可选）</label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="给这首歌加个备注..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              {error && (
                <p className="text-danger text-xs">{error}</p>
              )}

              <button
                onClick={handleAddSong}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '加载中...' : '分享歌曲'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[90%] sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
            <h3 className="font-semibold text-text-primary mb-2">删除歌曲</h3>
            <p className="text-text-muted text-sm mb-6">确定要删除这首歌吗？删除后将无法恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="flex-1 py-3 bg-gray-100 text-text-secondary rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  deleteSong(pendingDeleteId);
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
    </div>
  );
};