/**
 * 音频代理端点 —— 添加到你的 NeteaseCloudMusicApi / api-enhanced 项目。
 *
 * 用法：GET /song/proxy/:songId
 *
 * 服务端以 163.com Referer 身份请求外链 → 跟随重定向到 CDN → 流式转发给浏览器。
 * 因为请求发生在服务端，彻底绕过浏览器的 CORS / Referer 限制。
 *
 * 集成步骤：
 *   1. 把本文件放到 api-enhanced 的 module 目录
 *   2. 在主 app.js / index.js 中注册路由，例如：
 *        const songProxy = require('./module/song_proxy_route');
 *        app.get('/song/proxy/:songId', songProxy);
 *   3. 提交并推送到 Render 重新部署
 */

const https = require('https');
const http = require('http');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REFERER = 'https://music.163.com/';

module.exports = (req, res) => {
  const songId = req.params.songId;
  if (!songId || isNaN(Number(songId))) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'invalid songId' });
  }

  console.log(`[song_proxy] 代理音频: ${songId}`);

  // 从网易云外链接入（服务端请求带 Referer 可正常获取重定向目标）
  const outerUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
  forward(outerUrl, req, res, 0);
};

/**
 * 递归跟随重定向，最多 3 次，把最终的音频流以 CORS 头转发给浏览器。
 */
const forward = (url, clientReq, res, depth) => {
  if (depth > 3) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({ error: 'too many redirects' });
  }

  const mod = url.startsWith('https://') ? https : http;

  const opts = {
    headers: {
      'User-Agent': UA,
      'Referer': REFERER,
      'Accept': '*/*',
    },
  };

  // 透传浏览器 Range 头，支持拖拽/流式播放
  const range = clientReq.headers['range'];
  if (range) opts.headers['Range'] = range;

  const proxyReq = mod.get(url, opts, (proxyRes) => {
    const code = proxyRes.statusCode;

    // 跟随重定向
    if (code >= 300 && code < 400 && proxyRes.headers.location) {
      proxyRes.resume();
      return forward(proxyRes.headers.location, clientReq, res, depth + 1);
    }

    // 只接受成功状态码
    if (code !== 200 && code !== 206) {
      console.error(`[song_proxy] 上游返回 ${code}`);
      proxyRes.resume();
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(502).json({ error: `upstream returned ${code}` });
    }

    const responseHeaders = {
      'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    };
    if (proxyRes.headers['content-range'])
      responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
    if (proxyRes.headers['content-length'])
      responseHeaders['Content-Length'] = proxyRes.headers['content-length'];

    res.writeHead(code, responseHeaders);
    proxyRes.pipe(res);
  });

  // 清理
  res.on('close', () => proxyReq.destroy());

  proxyReq.on('error', (err) => {
    console.error(`[song_proxy] 请求错误: ${err.message}`);
    if (!res.headersSent) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(502).json({ error: 'proxy error' });
    }
  });

  proxyReq.setTimeout(20000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(504).json({ error: 'timeout' });
    }
  });
};
