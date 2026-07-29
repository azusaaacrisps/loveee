import http from 'http';
import https from 'https';
import url from 'url';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const PORT = 3001;

// 读取网易云账号 Cookie（用于获取播放直链，VIP 歌曲需 VIP 账号）。
// 把浏览器里的 MUSIC_U 值存到同目录 netease-cookie.txt（已被 .gitignore 忽略），
// 内容一行即可，例如：MUSIC_U=你的值
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let NETEASE_COOKIE = '';
try {
  const cookieFile = path.join(__dirname, 'netease-cookie.txt');
  if (fs.existsSync(cookieFile)) {
    NETEASE_COOKIE = fs.readFileSync(cookieFile, 'utf-8').trim();
    console.log('[proxy] 已加载网易云 Cookie（长度:', NETEASE_COOKIE.length, '）');
  } else {
    console.warn('[proxy] 未找到 netease-cookie.txt，将以匿名身份调用（拿不到播放直链）');
  }
} catch (e) {
  console.warn('[proxy] 读取 Cookie 失败:', e.message);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;

  try {
    if (pathname === '/song/detail') {
      const rawIds = query.ids;
      // 兼容两种写法：ids=347230 或 ids=[347230]（NeteaseCloudMusicApi 用前者）
      const idsForNetease = rawIds.startsWith('[') ? rawIds : `[${rawIds}]`;
      console.log('请求歌曲详情:', rawIds);

      const result = await fetchFromNetease('/api/song/detail', { ids: idsForNetease });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } else if (pathname === '/lyric') {
      const songId = query.id;
      console.log('请求歌词:', songId);
      
      const result = await fetchFromNetease('/api/song/lyric', {
        os: 'pc',
        id: songId,
        lv: -1,
        kv: -1,
        tv: -1,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } else if (pathname === '/song/url') {
      const songId = query.id;
      const br = query.br || '320000';
      console.log('请求播放URL:', songId, '码率:', br);

      // 播放直链必须用 weapi 加密 POST 调用，明文 GET 已被网易云限流/失效。
      // 失败时返回 url: null，让前端走 /song/file 回退。
      let result;
      try {
        result = await fetchPlayerUrl(songId);
      } catch (err) {
        console.warn('[proxy] /song/url 获取失败:', err.message);
        result = { code: 200, data: [{ id: Number(songId), url: null }] };
      }
      console.log('播放URL返回数据:', JSON.stringify(result).substring(0, 500));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } else if (pathname === '/song/file') {
      const songId = query.id;
      console.log('请求播放文件直链:', songId);
      const outerUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;

      try {
        let realUrl = null;
        try {
          const urlResult = await fetchPlayerUrl(songId);
          realUrl = urlResult?.data?.[0]?.url || null;
        } catch (err) {
          console.warn('[proxy] 获取直链失败，将回退外链:', err.message);
        }

        // 无直链（无版权 / VIP / 接口失败）时，回退到网易云外链，
        // 外链专门用于页面内嵌播放，可绕过防盗链。
        if (!realUrl) {
          console.warn(`[proxy] 无直链，重定向到外链: ${outerUrl}`);
          res.writeHead(302, { Location: outerUrl });
          res.end();
          return;
        }
        console.log('真实音频地址:', realUrl);

        // 用 https 模块转发音频流（全局 fetch 是 web 流，没有 .pipe），
        // 并把浏览器发来的 Range 请求一并透传，支持拖动/流式播放。
        proxyAudioStream(realUrl, req, res, outerUrl);
      } catch (err) {
        console.error('音频转发错误:', err);
        res.writeHead(302, { Location: outerUrl });
        res.end();
      }
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('代理错误:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// 用 Node https 模块把音频流转发给浏览器（自动跟随最多 3 次重定向），
// 透传浏览器的 Range 头以支持拖动/流式播放，失败时 302 到网易云外链兜底。
const proxyAudioStream = (audioUrl, clientReq, res, fallbackUrl, redirectCount = 0) => {
  if (redirectCount > 3) {
    res.writeHead(302, { Location: fallbackUrl });
    res.end();
    return;
  }
  const target = new URL(audioUrl);
  const mod = target.protocol === 'http:' ? http : https;

  // 透传浏览器的 Range 请求，网易云 CDN 支持 Range，会返回 206 Partial Content
  const audioHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://music.163.com/',
  };
  const range = clientReq.headers['range'];
  if (range) {
    audioHeaders['Range'] = range;
  }

  const audioReq = mod.get(
    audioUrl,
    { headers: audioHeaders },
    (audioRes) => {
      if (audioRes.statusCode >= 300 && audioRes.statusCode < 400 && audioRes.headers.location) {
        audioRes.resume();
        proxyAudioStream(audioRes.headers.location, clientReq, res, fallbackUrl, redirectCount + 1);
        return;
      }
      // 只接受 200 / 206，其余视为失败回退外链
      if (audioRes.statusCode !== 200 && audioRes.statusCode !== 206) {
        console.error(`[proxy] 音频请求失败: ${audioRes.statusCode}，回退外链`);
        audioRes.resume();
        res.writeHead(302, { Location: fallbackUrl });
        res.end();
        return;
      }
      const status = audioRes.statusCode;
      const headers = {
        'Content-Type': audioRes.headers['content-type'] || 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Accept-Ranges': 'bytes',
      };
      if (audioRes.headers['content-range']) {
        headers['Content-Range'] = audioRes.headers['content-range'];
      }
      if (audioRes.headers['content-length']) {
        headers['Content-Length'] = audioRes.headers['content-length'];
      }
      res.writeHead(status, headers);
      audioRes.pipe(res);
    }
  );
  // 浏览器端取消/拖动时，断开上游请求，避免资源泄漏
  res.on('close', () => {
    audioReq.destroy();
  });
  audioReq.on('error', (err) => {
    console.error('[proxy] 音频流请求错误:', err.message);
    if (!res.headersSent) {
      res.writeHead(302, { Location: fallbackUrl });
      res.end();
    } else {
      res.end();
    }
  });
  audioReq.setTimeout(15000, () => {
    audioReq.destroy();
    if (!res.headersSent) {
      res.writeHead(302, { Location: fallbackUrl });
      res.end();
    }
  });
};

// ===== 网易云 weapi 加密（AES-128-CBC + RSA），用于获取播放直链 =====
const NETEASE_IV = Buffer.from('0102030405060708', 'utf-8');
const NETEASE_PRESET_KEY = Buffer.from('0CoJUm6Qyw8W8jud', 'utf-8');
const NETEASE_MODULUS = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
const NETEASE_PUBKEY = '010001';
const NETEASE_BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const randString = (n) => {
  let s = '';
  for (let i = 0; i < n; i++) s += NETEASE_BASE62[Math.floor(Math.random() * 62)];
  return s;
};

const aesCbc = (text, key) => {
  const cipher = crypto.createCipheriv('aes-128-cbc', key, NETEASE_IV);
  return Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]).toString('base64');
};

// RSA：把随机 aesKey 反转后做 modpow（与网易云算法一致），输出 256 位 hex
const rsaEncrypt = (text) => {
  const reversed = text.split('').reverse().join('');
  const biText = BigInt('0x' + Buffer.from(reversed, 'utf-8').toString('hex'));
  const biExp = BigInt('0x' + NETEASE_PUBKEY);
  const biMod = BigInt('0x' + NETEASE_MODULUS);
  let result = 1n;
  let base = biText % biMod;
  let exp = biExp;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % biMod;
    base = (base * base) % biMod;
    exp = exp / 2n;
  }
  let hex = result.toString(16);
  while (hex.length < 256) hex = '0' + hex;
  return hex;
};

const weapi = (data) => {
  const text = JSON.stringify(data);
  const secKey = randString(16);
  const first = aesCbc(text, NETEASE_PRESET_KEY);
  const second = aesCbc(first, Buffer.from(secKey, 'utf-8'));
  return { params: second, encSecKey: rsaEncrypt(secKey) };
};

// 从 Cookie 中解析 __csrf（部分接口需要）
let NETEASE_CSRF = '';
try {
  const m = NETEASE_COOKIE.match(/__csrf=([^;]+)/);
  if (m) NETEASE_CSRF = m[1];
} catch (e) { /* ignore */ }

// 加密 POST 请求网易云 weapi 接口
const weapiRequest = (apiPath, data) => new Promise((resolve, reject) => {
  const body = new URLSearchParams(weapi(data)).toString();
  const options = {
    hostname: 'music.163.com',
    path: apiPath,
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://music.163.com/',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      ...(NETEASE_COOKIE ? { 'Cookie': NETEASE_COOKIE } : {}),
    },
  };
  const req = https.request(options, (res) => {
    let d = '';
    res.on('data', (c) => { d += c; });
    res.on('end', () => {
      try {
        resolve(JSON.parse(d));
      } catch (e) {
        reject(new Error('解析响应失败: ' + d.substring(0, 200)));
      }
    });
  });
  req.on('error', reject);
  req.setTimeout(10000, () => { req.destroy(); reject(new Error('weapi 请求超时')); });
  req.write(body);
  req.end();
});

// 获取播放直链（加密调用 v1 端点，结果字段：data[0].url）
// 注意：旧的 /weapi/song/enhance/player/url(br) 端点已被网易云封禁返回 404，
// 必须用 /v1 且带 level 参数才能拿到直链。
const fetchPlayerUrl = async (songId, level = 'exhigh') => {
  return weapiRequest('/weapi/song/enhance/player/url/v1', {
    ids: `[${songId}]`,
    level,
    encodeType: 'mp3',
    csrf_token: NETEASE_CSRF,
  });
};

const fetchFromNetease = async (path, query) => {
  const queryString = new URLSearchParams(query).toString();
  const fullPath = queryString ? `${path}?${queryString}` : path;

  console.log('请求网易云API:', fullPath);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'music.163.com',
      path: fullPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://music.163.com/',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...(NETEASE_COOKIE ? { 'Cookie': NETEASE_COOKIE } : {}),
      },
    };

    const req = https.request(options, (res) => {
      console.log('网易云响应状态码:', res.statusCode);
      console.log('网易云响应头:', JSON.stringify(res.headers));
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('网易云响应数据长度:', data.length);
        console.log('网易云响应数据:', data.substring(0, 500));
        
        if (!data || data.trim() === '') {
          reject(new Error('网易云API返回空数据'));
          return;
        }
        
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error('JSON解析错误:', e.message);
          reject(new Error('解析响应失败: ' + e.message + ', 数据: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', (error) => {
      console.error('网易云请求错误:', error);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('网易云API请求超时'));
    });
    
    req.end();
  });
};

server.listen(PORT, () => {
  console.log(`Netease Cloud Music Proxy Server running on http://localhost:${PORT}`);
});
