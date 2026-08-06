# NguonC Phim - Stremio Addon

Stremio Addon cho phép tìm kiếm và xem phim Việt Sub, Lồng Tiếng, Phim bộ, Phim lẻ, TV Shows miễn phí từ nguồn [NguonC API](https://phim.nguonc.com/api-document).

![Stremio Addon Banner](https://phim.nguonc.com/public/images/Post/2/608J6j_4f.jpg)

## 🌟 Tính năng nổi bật

- 🎬 **Kho phim phong phú**: Phim mới cập nhật, Phim lẻ, Phim bộ, TV Shows.
- 🔍 **Tìm kiếm & Bộ lọc**: Tìm kiếm tên phim, lọc theo thể loại (Hành động, Hài, Kinh dị, Cổ trang,...).
- 🚀 **Phát trực tiếp HLS (.m3u8)**: Tự động bóc tách link HLS từ trang embed (`embed.streamc.xyz`), giúp phát video chuẩn HLS sắc nét, mượt mà trên trình phát Stremio native (không cần qua web ngoài).
- 🔊 **Đa máy chủ / Ngôn ngữ**: Hỗ trợ đầy đủ server Vietsub, Lồng Tiếng, Thuyết Minh.

---

## 🛠️ Cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
- [Node.js](https://nodejs.org/) v18+ 

### 2. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 3. Khởi chạy Addon
```bash
npm start
```
Mặc định server sẽ chạy tại cổng `7007`:
- **Trang cấu hình**: `http://localhost:7007/configure`
- **Manifest URL**: `http://localhost:7007/manifest.json`

---

## 📱 Cách thêm Addon vào Stremio

1. Mở ứng dụng **Stremio** (Desktop, Android, iOS, Android TV) hoặc truy cập [Stremio Web](https://web.stremio.com/).
2. Chọn biểu tượng **Addons** (🧩).
3. Nhấp vào ô tìm kiếm Addon và dán link Manifest vào:
   ```text
   http://localhost:7007/manifest.json
   ```
   *(Hoặc URL sau khi deploy lên Render/Vercel)*
4. Nhấn **Install** để hoàn tất.

---

## ☁️ Deploy lên Cloud (Miễn phí)

### Deploy lên Render
1. Đẩy code lên GitHub repository của bạn.
2. Đăng nhập [Render.com](https://render.com/), tạo mới **Web Service**.
3. Chọn repo GitHub chứa addon.
4. Thiết lập:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Nhấn **Create Web Service**. Sau khi deploy xong, bạn sẽ có URL dạng `https://stremio-nguonc.onrender.com/manifest.json`.

---

## 📁 Cấu trúc dự án

```text
├── src/
│   ├── nguoncApi.js   # Tương tác NguonC API & bóc tách stream HLS (.m3u8)
│   └── addon.js       # Đăng ký Manifest, Catalog, Meta, Stream handler cho Stremio
├── server.js          # Entrypoint Express server & Landing page
├── test_addon.js      # Kịch bản kiểm thử tự động
├── package.json
└── README.md
```
