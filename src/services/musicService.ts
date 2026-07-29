export interface SongInfo {
  songId: string;
  songName: string;
  artist: string;
  cover: string;
  lyrics: string;
  url: string;
}

/**
 * 构建音频代理 URL：通过 Render API 转发音频流，绕过浏览器 CORS/Referer 限制。
 * 本地开发时 Vite 会把 /netease/song/proxy/* 代理到 proxy-server.js，
 * 正式环境直接请求 Render API 的 /song/proxy 端点。
 */
const getProxyAudioUrl = (baseUrl: string, songId: string): string => {
  return `${baseUrl}/song/proxy/${songId}`;
};

/**
 * 从粘贴的文案中提取第一个 HTTPS URL（如"分享歌曲《xxx》https://163cn.tv/xxx"）。
 * 找不到 URL 时回退到原始文本。
 */
const extractUrl = (text: string): string => {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  if (match) {
    // 去掉末尾可能被误带入的标点
    return match[0].replace(/[.,;:!?)]+$/, '');
  }
  return text.trim();
};

const parseNeteaseUrl = (url: string): string | null => {
  const trimmedUrl = url.trim();
  
  const patterns = [
    // 非贪婪 .*? 确保匹配第一个 id=，避免被展开后 URL 的追踪参数干扰
    /music\.163\.com.*?(?:song\/|song\?id=|id=)(\d+)/i,
    /y\.music\.163\.com.*?(?:song\/|id=)(\d+)/i,
    /music\.163\.com.*?\/(\d+)(?:\/|\?|$)/i,
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

/**
 * 展开 163cn.tv 等短链接，获取真实 music.163.com URL。
 * 本地开发命中 proxy-server.js 的 /expand，线上命中 Render 后端的 /expand。
 */
const expandShortUrl = async (shortUrl: string): Promise<string> => {
  const baseUrl = (import.meta.env.VITE_NETEASE_API_BASE as string | undefined)?.trim() || '/netease';
  const response = await fetch(
    `${baseUrl}/expand?url=${encodeURIComponent(shortUrl)}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!response.ok) {
    throw new Error(`短链接展开失败（${response.status}）`);
  }
  const data = await response.json();
  if (!data.realUrl) {
    throw new Error('短链接展开失败：未获取到真实URL');
  }
  return data.realUrl;
};

export const fetchSongInfo = async (neteaseUrl: string): Promise<SongInfo> => {
  // 从粘贴的分享文案中提取第一个 URL
  const url = extractUrl(neteaseUrl);
  console.log('提取到的URL:', url);
  
  let songId = parseNeteaseUrl(url);
  
  // 无法直接解析（如 163cn.tv 短链接），通过后端展开
  if (!songId) {
    console.log('未直接解析到歌曲ID，尝试展开短链接...');
    try {
      const realUrl = await expandShortUrl(url);
      console.log('短链接展开结果:', realUrl);
      songId = parseNeteaseUrl(realUrl);
    } catch (err) {
      throw new Error(`无法解析网易云音乐链接: ${url}`);
    }
  }
  
  if (!songId) {
    throw new Error(`无法解析网易云音乐链接: ${url}`);
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

  // 播放地址：通过 Render API 代理音频流，避免浏览器端 CORS/Referer 被拦截
  const playUrl = getProxyAudioUrl(baseUrl, songId);
  console.log('使用代理播放URL:', playUrl);

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
  console.log(`歌曲 ${songId} 使用代理 URL`);
  return getProxyAudioUrl(baseUrl, songId);
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
