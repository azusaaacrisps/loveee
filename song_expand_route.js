/**
 * 短链接展开端点 —— 添加到你的 NeteaseCloudMusicApi / api-enhanced 项目。
 *
 * 用法：GET /expand?url=https://163cn.tv/xxxx
 *
 * 服务端跟随 302 重定向，返回最终真实 URL（如 https://music.163.com/song?id=xxxxx）。
 * 因为 163cn.tv 做了 HTTPS 重定向，前端 fetch 拿不到跨域重定向的最终 URL，
 * 所以必须在服务端处理。
 *
 * 集成步骤：
 *   1. 把本文件放到 api-enhanced 的 module 目录
 *   2. 在主 app.js / index.js 中注册路由，例如：
 *        const expandRoute = require('./module/song_expand_route');
 *        app.get('/expand', expandRoute);
 *   3. 提交并推送到 Render 重新部署
 */

const https = require('https');
const http = require('http');

module.exports = (req, res) => {
  const shortUrl = req.query.url;
  if (!shortUrl) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'missing url param' });
  }

  console.log(`[expand] 展开短链接: ${shortUrl}`);
  doExpand(shortUrl, 0, (err, realUrl) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (err) {
      console.error(`[expand] 展开失败: ${err.message}`);
      return res.status(502).json({ error: err.message });
    }
    console.log(`[expand] 展开结果: ${realUrl}`);
    res.json({ realUrl });
  });
};

/**
 * 递归跟随 HTTP 302 重定向，最多 5 次，返回最终 URL。
 */
const doExpand = (urlStr, depth, callback) => {
  if (depth > 5) return callback(new Error('too many redirects'));

  const mod = urlStr.startsWith('https://') ? https : http;
  const req = mod.get(urlStr, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  }, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      response.resume();
      const nextUrl = new URL(response.headers.location, urlStr).href;
      return doExpand(nextUrl, depth + 1, callback);
    }
    response.resume();
    callback(null, urlStr);
  });

  req.on('error', (err) => callback(err));
  req.setTimeout(10000, () => {
    req.destroy();
    callback(new Error('timeout'));
  });
  req.end();
};
