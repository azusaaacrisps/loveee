export interface SongInfo {
  songId: string;
  songName: string;
  artist: string;
  cover: string;
  lyrics: string;
  url: string;
}

const parseNeteaseUrl = (url: string): string | null => {
  const trimmedUrl = url.trim();
  
  const patterns = [
    /music\.163\.com.*(?:song\/|song\?id=|id=)(\d+)/i,
    /y\.music\.163\.com.*(?:song\/|id=)(\d+)/i,
    /music\.163\.com.*\/(\d+)(?:\/|\?|$)/i,
    /song\?id=(\d+)/i,
    /song\/(\d+)/i,
    /id=(\d+)/i,
    /(\d{8,12})/
  ];

  for (const pattern of patterns) {
    const match = trimmedUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

export const fetchSongInfo = async (neteaseUrl: string): Promise<SongInfo> => {
  const songId = parseNeteaseUrl(neteaseUrl);
  
  if (!songId) {
    throw new Error(`无法解析网易云音乐链接: ${neteaseUrl}`);
  }

  console.log(`解析到歌曲ID: ${songId}`);

  // 优先使用你自己的私人 API（在 .env 中配置 VITE_NETEASE_API_BASE），
  // 未配置时回退到本地 /netease 代理（proxy-server.js）。请勿填写公用 API。
  const baseUrl = (import.meta.env.VITE_NETEASE_API_BASE as string | undefined)?.trim() || '/netease';
  
  console.log('使用网易云API:', baseUrl);

  const detailResponse = await fetch(
    `${baseUrl}/song/detail?ids=${songId}`,
    { signal: AbortSignal.timeout(15000) }
  );
  
  if (!detailResponse.ok) {
    const status = detailResponse.status;
    const text = await detailResponse.text();
    throw new Error(`API响应失败，状态码: ${status}，错误: ${text}`);
  }
  
  const data = await detailResponse.json();
  const song = data.songs?.[0];
  
  if (!song) {
    throw new Error(`未找到歌曲，返回数据: ${JSON.stringify(data)}`);
  }
  
  const lyricResponse = await fetch(
    `${baseUrl}/lyric?id=${songId}`,
    { signal: AbortSignal.timeout(10000) }
  );
  
  const lyricData = lyricResponse.ok ? await lyricResponse.json() : { lrc: { lyric: '暂无歌词' } };
  const lyrics = lyricData.lrc?.lyric || lyricData.tlyric?.lyric || '暂无歌词';
  
  console.log('API调用成功:', song.name);

  // 播放地址：统一走 /song/url 拿 CDN 直链（NeteaseCloudMusicApi 与私人 API 均支持），
  // 由浏览器直接播放；无直链时回退官方外链。
  let playUrl = '';
  try {
    const urlResponse = await fetch(
      `${baseUrl}/song/url?id=${songId}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (urlResponse.ok) {
      const urlData = await urlResponse.json();
      playUrl = urlData.data?.[0]?.url || '';
    }
  } catch (error) {
    console.error('获取播放地址失败:', error);
  }
  if (!playUrl) {
    playUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
  }
  console.log('使用播放URL:', playUrl);

  // 封面：兼容两种返回格式——
  // 新版 NeteaseCloudMusicApi: song.al.picUrl / song.ar
  // 旧版裸接口(proxy-server.js): song.album.picUrl / song.artists
  let cover = song.al?.picUrl || song.album?.picUrl || song.album?.blurPicUrl || '';
  if (cover && !cover.startsWith('http')) {
    cover = `https://${cover}`;
  }
  if (cover) {
    cover = `${cover}?param=300y300`;
  }

  const artistList = song.ar || song.artists || [];

  return {
    songId,
    songName: song.name,
    artist: artistList.map((a: any) => a.name).join(' / ') || '未知歌手',
    cover,
    lyrics,
    url: playUrl,
  };
};

/**
 * 播放前刷新歌曲 URL，解决 CDN 临时链接过期导致 404 的问题。
 * 优先从 API 获取新 URL，失败时使用网易云外链兜底。
 */
export const refreshSongUrl = async (songId: string): Promise<string> => {
  const baseUrl = (import.meta.env.VITE_NETEASE_API_BASE as string | undefined)?.trim() || '/netease';

  try {
    const urlResponse = await fetch(
      `${baseUrl}/song/url?id=${songId}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (urlResponse.ok) {
      const urlData = await urlResponse.json();
      const freshUrl = urlData.data?.[0]?.url || '';
      if (freshUrl) {
        console.log(`歌曲 ${songId} 获取到新 URL`);
        return freshUrl;
      }
    }
  } catch {
    // API 不可用时静默回退
  }

  // 兜底：网易云外链播放页
  console.log(`歌曲 ${songId} 使用外链兜底`);
  return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
};

export const createManualSong = (songId: string, songName: string, artist: string): SongInfo => {
  return {
    songId,
    songName,
    artist,
    cover: `https://p4.music.126.net/${Math.random().toString(16).slice(2, 10)}=/${songId}.jpg`,
    lyrics: '暂无歌词',
    url: '',
  };
};

export const formatLyrics = (lyrics: string): { time: string; text: string }[] => {
  const lines = lyrics.split('\n');
  const result: { time: string; text: string }[] = [];
  
  lines.forEach(line => {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      const time = (minutes * 60 + seconds + milliseconds / 1000).toFixed(2);
      const text = match[4].trim();
      
      if (text) {
        result.push({ time, text });
      }
    } else if (line.trim()) {
      result.push({ time: '', text: line.trim() });
    }
  });
  
  return result;
};
