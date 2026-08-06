const BASE_URL = 'https://phim.nguonc.com/api';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': 'https://phim.nguonc.com/',
  'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin'
};

/**
 * Fetch JSON from NguonC API
 */
async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} when fetching ${url}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[NguonC API Error] ${url}:`, err.message);
    return null;
  }
}

/**
 * Phim mới cập nhật
 */
export async function getNewestFilms(page = 1) {
  return await fetchJson(`${BASE_URL}/films/phim-moi-cap-nhat?page=${page}`);
}

/**
 * Phim theo danh mục (phim-le, phim-bo, dang-chieu, tv-shows)
 */
export async function getFilmsByCategory(slug, page = 1) {
  return await fetchJson(`${BASE_URL}/films/danh-sach/${slug}?page=${page}`);
}

/**
 * Phim theo thể loại (hanh-dong, hoat-hinh, phim-hai, v.v.)
 */
export async function getFilmsByGenre(slug, page = 1) {
  return await fetchJson(`${BASE_URL}/films/the-loai/${slug}?page=${page}`);
}

/**
 * Phim theo quốc gia (au-my, trung-quoc, han-quoc, viet-nam, v.v.)
 */
export async function getFilmsByCountry(slug, page = 1) {
  return await fetchJson(`${BASE_URL}/films/quoc-gia/${slug}?page=${page}`);
}

/**
 * Phim theo năm phát hành
 */
export async function getFilmsByYear(year, page = 1) {
  return await fetchJson(`${BASE_URL}/films/nam-phat-hanh/${year}?page=${page}`);
}

/**
 * Tìm kiếm phim theo từ khóa
 */
export async function searchFilms(keyword) {
  return await fetchJson(`${BASE_URL}/films/search?keyword=${encodeURIComponent(keyword)}`);
}

/**
 * Chi tiết phim
 */
export async function getFilmDetail(slug) {
  return await fetchJson(`${BASE_URL}/film/${slug}`);
}

/**
 * Tự động giải mã URL nhúng (embed) của StreamC thành trực tiếp luồng HLS .m3u8
 * @param {string} embedUrl - e.g. "https://embed13.streamc.xyz/embed.php?hash=..."
 * @returns {Promise<string>} - HLS .m3u8 URL hoặc fallback sang embedUrl
 */
export async function resolveHlsStream(embedUrl) {
  if (!embedUrl) return null;

  if (embedUrl.includes('.m3u8') || embedUrl.includes('.mp4')) {
    return { hlsUrl: embedUrl, embedUrl };
  }

  try {
    const parsedUrl = new URL(embedUrl);
    const origin = parsedUrl.origin;

    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Referer': 'https://phim.nguonc.com/'
      }
    });

    if (!res.ok) return { hlsUrl: null, embedUrl };

    const html = await res.text();

    // Parse data-obf for StreamC / NguonC player
    const obfMatch = html.match(/data-obf="([^"]+)"/);

    if (obfMatch && obfMatch[1]) {
      const decodedJsonStr = Buffer.from(obfMatch[1], 'base64').toString('utf-8');
      const streamData = JSON.parse(decodedJsonStr);

      if (streamData && streamData.sUb) {
        const m3u8Url = `${origin}/${streamData.sUb}`;
        return { hlsUrl: m3u8Url, embedUrl, origin };
      }
    }

    // Check if iframe exists in HTML
    const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
    if (iframeMatch && iframeMatch[1]) {
      return await resolveHlsStream(iframeMatch[1]);
    }
  } catch (err) {
    console.error(`[Stream Resolver Error] ${embedUrl}:`, err.message);
  }

  return { hlsUrl: null, embedUrl };
}
