import express from 'express';
import cors from 'cors';
import pkg from 'stremio-addon-sdk';
const { getRouter } = pkg;

import addonInterface from './src/addon.js';
import proxyRouter from './src/proxy.js';

const app = express();
const PORT = process.env.PORT || 7007;

app.use(cors());

// Automatically detect public URL from request headers (Render / Cloud reverse proxies)
app.use((req, res, next) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host');
  if (host && !host.includes('localhost')) {
    process.env.DETECTED_PUBLIC_URL = `${proto}://${host}`;
  }
  next();
});

// Mount HLS Proxy Router
app.use('/proxy', proxyRouter);

// Mount Stremio Addon Router
const addonRouter = getRouter(addonInterface);
app.use('/', addonRouter);

// Landing page for browser view
app.get('/configure', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const manifestUrl = `${protocol}://${host}/manifest.json`;
  const stremioUrl = `stremio://${host}/manifest.json`;

  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NguonC Phim - Stremio Addon</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          background: #1e293b;
          max-width: 540px;
          width: 100%;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        .logo {
          width: 96px;
          height: 96px;
          border-radius: 20px;
          object-fit: cover;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        h1 { font-size: 24px; margin-bottom: 8px; color: #38bdf8; }
        p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
        .btn {
          display: inline-block;
          background: #0284c7;
          color: #fff;
          font-weight: 600;
          padding: 14px 28px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 16px;
          transition: background 0.2s ease;
          margin-bottom: 20px;
          width: 100%;
        }
        .btn:hover { background: #0369a1; }
        .url-box {
          background: #0f172a;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 13px;
          color: #e2e8f0;
          word-break: break-all;
          user-select: all;
          border: 1px solid #334155;
        }
        .features {
          margin-top: 24px;
          text-align: left;
          border-top: 1px solid #334155;
          padding-top: 16px;
        }
        .features h3 { font-size: 14px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
        .features ul { list-style: none; }
        .features li { font-size: 14px; color: #cbd5e1; margin-bottom: 6px; padding-left: 20px; position: relative; }
        .features li::before { content: "✓"; position: absolute; left: 0; color: #38bdf8; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <img class="logo" src="https://phim.nguonc.com/public/images/Post/2/608J6j_4f.jpg" alt="Logo" />
        <h1>NguonC Phim Addon</h1>
        <p>Xem phim Việt Sub & Lồng Tiếng trực tiếp trên Stremio từ nguồn phim.nguonc.com với tốc độ cao HLS stream.</p>
        
        <a class="btn" href="${stremioUrl}">Cài Đặt Vào Stremio</a>
        
        <p style="margin-bottom: 8px; font-size: 13px;">Hoặc dán URL Manifest này vào Stremio:</p>
        <div class="url-box">${manifestUrl}</div>

        <div class="features">
          <h3>Tính năng nổi bật</h3>
          <ul>
            <li>Phim lẻ, Phim bộ, TV Shows, Phim mới cập nhật.</li>
            <li>Tự động giải mã luồng phát HLS (.m3u8) sắc nét.</li>
            <li>Hỗ trợ phân loại thể loại và tìm kiếm phim.</li>
            <li>Tùy chọn đa server Vietsub / Lồng Tiếng.</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Stremio Addon NguonC đang chạy tại: http://localhost:${PORT}`);
  console.log(`🔗 Manifest URL: http://localhost:${PORT}/manifest.json`);
});
