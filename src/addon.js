import pkg from 'stremio-addon-sdk';
const { addonBuilder } = pkg;

import {
  getNewestFilms,
  getFilmsByCategory,
  getFilmsByGenre,
  getFilmsByCountry,
  getFilmsByYear,
  searchFilms,
  getFilmDetail,
  resolveHlsStream
} from './nguoncApi.js';

// Danh sách thể loại NguonC
const GENRES_MAP = {
  'Hành Động': 'hanh-dong',
  'Phiêu Lưu': 'phieu-luu',
  'Hoạt Hình': 'hoat-hinh',
  'Hài': 'phim-hai',
  'Hình Sự': 'hinh-su',
  'Tài Liệu': 'tai-lieu',
  'Chính Kịch': 'chinh-kich',
  'Gia Đình': 'gia-dinh',
  'Giả Tưởng': 'gia-tuong',
  'Lịch Sử': 'lich-su',
  'Kinh Dị': 'kinh-di',
  'Nhạc': 'phim-nhac',
  'Bí Ẩn': 'bi-an',
  'Lãng Mạn': 'lang-man',
  'Khoa Học Viễn Tưởng': 'khoa-hoc-vien-tuong',
  'Gây Cấn': 'gay-can',
  'Chiến Tranh': 'chien-tranh',
  'Tâm Lý': 'tam-ly',
  'Tình Cảm': 'tinh-cam',
  'Cổ Trang': 'co-trang',
  'Miền Tây': 'mien-tay',
  'Phim 18+': 'phim-18'
};

const GENRE_NAMES = Object.keys(GENRES_MAP);

const manifest = {
  id: 'com.nguonc.stremio.addon',
  version: '1.0.0',
  name: 'NguonC Phim',
  description: 'Xem phim Vietsub & Lồng Tiếng Việt Nam miễn phí từ NguonC (phim.nguonc.com)',
  logo: 'https://phim.nguonc.com/public/images/Post/2/608J6j_4f.jpg',
  resources: ['catalog', 'meta', 'stream'],
  types: ['movie', 'series'],
  idPrefixes: ['nguonc:'],
  catalogs: [
    {
      type: 'movie',
      id: 'nguonc_movie',
      name: 'NguonC - Phim Lẻ',
      extra: [
        { name: 'genre', options: GENRE_NAMES },
        { name: 'search' },
        { name: 'skip' }
      ]
    },
    {
      type: 'series',
      id: 'nguonc_series',
      name: 'NguonC - Phim Bộ',
      extra: [
        { name: 'genre', options: GENRE_NAMES },
        { name: 'search' },
        { name: 'skip' }
      ]
    },
    {
      type: 'movie',
      id: 'nguonc_tvshows',
      name: 'NguonC - TV Shows',
      extra: [
        { name: 'search' },
        { name: 'skip' }
      ]
    },
    {
      type: 'movie',
      id: 'nguonc_newest',
      name: 'NguonC - Mới Cập Nhật',
      extra: [
        { name: 'search' },
        { name: 'skip' }
      ]
    }
  ]
};

const builder = new addonBuilder(manifest);

/**
 * CATALOG HANDLER
 */
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  let responseData = null;
  const skip = extra?.skip ? parseInt(extra.skip, 10) : 0;
  const page = Math.floor(skip / 10) + 1;

  if (extra?.search) {
    responseData = await searchFilms(extra.search);
  } else if (extra?.genre && GENRES_MAP[extra.genre]) {
    const genreSlug = GENRES_MAP[extra.genre];
    responseData = await getFilmsByGenre(genreSlug, page);
  } else {
    switch (id) {
      case 'nguonc_movie':
        responseData = await getFilmsByCategory('phim-le', page);
        break;
      case 'nguonc_series':
        responseData = await getFilmsByCategory('phim-bo', page);
        break;
      case 'nguonc_tvshows':
        responseData = await getFilmsByCategory('tv-shows', page);
        break;
      case 'nguonc_newest':
      default:
        responseData = await getNewestFilms(page);
        break;
    }
  }

  if (!responseData || !responseData.items) {
    return { metas: [] };
  }

  const metas = responseData.items.map((item) => {
    // Xác định type dựa trên catalog id hoặc cấu trúc
    let itemType = type || 'movie';
    if (id === 'nguonc_series') {
      itemType = 'series';
    }

    return {
      id: `nguonc:${item.slug}`,
      type: itemType,
      name: item.name,
      poster: item.poster_url || item.thumb_url,
      description: item.description || item.original_name || '',
      releaseInfo: item.created ? new Date(item.created).getFullYear().toString() : undefined
    };
  });

  return { metas };
});

/**
 * META HANDLER
 */
builder.defineMetaHandler(async ({ type, id }) => {
  const parts = id.split(':');
  const slug = parts[1];

  if (!slug) return { meta: null };

  const data = await getFilmDetail(slug);
  if (!data || !data.movie) return { meta: null };

  const movie = data.movie;

  // Lấy danh sách thể loại từ category object
  const genres = [];
  if (movie.category) {
    Object.values(movie.category).forEach((catGroup) => {
      if (catGroup.list) {
        catGroup.list.forEach((item) => {
          if (item.name) genres.push(item.name);
        });
      }
    });
  }

  // Tách cast và director
  const cast = movie.casts ? movie.casts.split(',').map((c) => c.trim()).filter(Boolean) : [];
  const director = movie.director ? movie.director.split(',').map((d) => d.trim()).filter(Boolean) : [];

  // Tạo danh sách tập cho Series
  const videos = [];
  const episodesData = movie.episodes || [];
  
  if (episodesData.length > 0) {
    // Lấy server đầu tiên để sinh danh sách các tập
    const primaryServer = episodesData[0];
    if (primaryServer && primaryServer.items) {
      primaryServer.items.forEach((epItem, index) => {
        // Parse episode number
        let epNum = index + 1;
        const parsedNum = parseInt(epItem.name, 10);
        if (!isNaN(parsedNum)) epNum = parsedNum;

        videos.push({
          id: `nguonc:${movie.slug}:${epItem.slug}`,
          title: `Tập ${epItem.name}`,
          season: 1,
          episode: epNum,
          released: movie.created
        });
      });
    }
  }

  // Quyết định type (series nếu có nhiều tập hoặc total_episodes > 1)
  const isSeries = (videos.length > 1) || (movie.total_episodes > 1) || (type === 'series');

  const meta = {
    id: `nguonc:${movie.slug}`,
    type: isSeries ? 'series' : 'movie',
    name: movie.name,
    original_name: movie.original_name,
    poster: movie.poster_url || movie.thumb_url,
    background: movie.thumb_url || movie.poster_url,
    description: `${movie.description || ''}\n\nTrạng thái: ${movie.current_episode || ''} | Chất lượng: ${movie.quality || ''} | Ngôn ngữ: ${movie.language || ''}`,
    genres: genres.length > 0 ? genres : ['Phim Việt'],
    releaseInfo: movie.created ? new Date(movie.created).getFullYear().toString() : undefined,
    runtime: movie.time || undefined,
    cast,
    director,
    videos: isSeries ? videos : undefined
  };

  return { meta };
});

/**
 * STREAM HANDLER
 */
builder.defineStreamHandler(async ({ type, id }) => {
  const parts = id.split(':');
  const slug = parts[1];
  const epSlug = parts[2]; // Có thể undefined nếu là phim lẻ

  if (!slug) return { streams: [] };

  const data = await getFilmDetail(slug);
  if (!data || !data.movie) return { streams: [] };

  const movie = data.movie;
  const episodesData = movie.episodes || [];
  const streams = [];

  const host = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 7007}`;

  for (const server of episodesData) {
    const items = server.items || [];
    let targetEp = null;

    if (epSlug) {
      targetEp = items.find((it) => it.slug === epSlug || it.name === epSlug);
    } else {
      targetEp = items[0];
    }

    if (targetEp && targetEp.embed) {
      const streamInfo = await resolveHlsStream(targetEp.embed);

      if (streamInfo && streamInfo.hlsUrl) {
        const proxiedHlsUrl = `${host}/proxy/hls?url=${encodeURIComponent(streamInfo.hlsUrl)}&referer=${encodeURIComponent(targetEp.embed)}`;

        streams.push({
          name: `NguonC`,
          title: `[${server.server_name}] Tập ${targetEp.name}\n${movie.quality || 'HD'} - ${movie.language || 'Vietsub'}`,
          url: proxiedHlsUrl,
          behaviorHints: {
            notSupported: false
          }
        });
      }
    }
  }

  return { streams };
});

export default builder.getInterface();
