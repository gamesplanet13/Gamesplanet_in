'use strict';

(() => {
 const WIDTH = 1080, HEIGHT = 1440;
 const theme = {
  'gurdwara': ['#f9e7aa', '#e5b956', '#3c2509', '#8b5b13', '#fff2c9'],
  'rain-sabai': ['#a91931', '#700e26', '#fff5e4', '#f4cf7d', '#6e1025'],
  'amrit-vela': ['#e8f8ff', '#a9dbf7', '#12394f', '#9a671b', '#f7fbff'],
  'shaheedi': ['#672233', '#38111e', '#fff5e4', '#efc979', '#4c1426'],
  'outside-rampur': ['#393125', '#191714', '#fff2cd', '#e7bc68', '#252019'],
  'regular': ['#fff4df', '#eedbc7', '#492338', '#835126', '#fffbef'],
  'kavi': ['#f2e7fc', '#d5bce9', '#381e51', '#754779', '#f9f1ff'],
 };
 const labels = {
  pa: {download:'ਪੋਸਟਰ ਡਾਊਨਲੋਡ ਕਰੋ',error:'ਪੋਸਟਰ ਡਾਊਨਲੋਡ ਨਹੀਂ ਹੋਇਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',series:'ਪੋਹ ਮਹੀਨੇ ਦੇ ਗੁਰਮਤਿ ਸਮਾਗਮ',venue:'ਸਥਾਨ',gurdwara:'ਗੁਰਦੁਆਰਾ ਸਾਹਿਬ',diwan:'ਵਿਸ਼ੇਸ਼ ਕੀਰਤਨ ਦੀਵਾਨ',kavi:'ਕਵੀ ਦਰਬਾਰ',shaheedi:'ਸ਼ਹੀਦੀ ਪੁਰਬ',shukrana:'ਸ਼ੁਕਰਾਨਾ ਸਮਾਗਮ'},
  hi: {download:'पोस्टर डाउनलोड करें',error:'पोस्टर डाउनलोड नहीं हुआ। फिर से कोशिश करें।',series:'पोह महीने के गुरमत समागम',venue:'स्थान',gurdwara:'गुरुद्वारा साहिब',diwan:'विशेष कीर्तन दीवान',kavi:'कवि दरबार',shaheedi:'शहीदी पर्व',shukrana:'शुकराना समागम'},
  en: {download:'Download poster',error:'Poster download failed. Please try again.',series:'Poh Month Gurmat Samagams',venue:'Venue',gurdwara:'Gurdwara Sahib',diwan:'Special Kirtan Diwan',kavi:'Kavi Darbar',shaheedi:'Shaheedi Purab',shukrana:'Shukrana Samagam'},
 };
 const fonts = '"Noto Sans Gurmukhi","Noto Sans Devanagari",Inter,sans-serif';
 const local = {pa:'pa-IN',hi:'hi-IN',en:'en-IN'};
 const knownOccasion = {
  'poster2026-1127-2':'diwan', 'poster2026-1213-18':'shaheedi', 'poster2026-1214-19':'shaheedi',
  'poster2026-1227-34':'kavi', 'poster2026-1230-38':'shukrana',
 };
 let artwork;
 function image(url) {
  return new Promise(resolve => {
   const img = new Image();
   img.onload = () => resolve(img);
   img.onerror = () => resolve(null);
   img.src = url;
  });
 }
 function size(ctx, px, weight) {
  ctx.font = weight + ' ' + px + 'px ' + fonts;
 }
 function lines(ctx, value, width) {
  const result = [];
  let active = '';
  for (const word of value.trim().split(/\s+/u)) {
   const next = active ? active + ' ' + word : word;
   if (active && ctx.measureText(next).width > width) {
    result.push(active);
    active = word;
   } else active = next;
  }
  if (active) result.push(active);
  return result;
 }
 function fit(ctx, value, max, min, width, count, weight) {
  for (let px = max; px >= min; px -= 2) {
   size(ctx, px, weight);
   const rows = lines(ctx, value, width);
   if (px === min || rows.length <= count) return {rows, px, weight};
  }
 }
 function write(ctx, block, y, color, x = WIDTH / 2) {
  size(ctx, block.px, block.weight);
  ctx.fillStyle = color;
  for (const line of block.rows) {
   ctx.fillText(line, x, y, 872);
   y += Math.ceil(block.px * 1.26);
  }
  return y;
 }
 function cover(ctx, img, x, y, width, height) {
  const scale = Math.max(width / img.width, height / img.height);
  const w = width / scale, h = height / scale;
  ctx.drawImage(img, (img.width - w) / 2, (img.height - h) / 2, w, h, x, y, width, height);
 }
 function localTime(time, lang) {
  if (!time || lang === 'en') return time;
  const notes = lang === 'hi'
   ? {AM:'सुबह', PM:'रात', next:'अगले दिन', hour:'बजे'}
   : {AM:'ਸਵੇਰੇ', PM:'ਰਾਤ', next:'ਅਗਲੇ ਦਿਨ', hour:'ਵਜੇ'};
  const range = /^(\d+:\d{2})\s*(AM|PM)?\s*[–-]\s*(\d+:\d{2})\s*(AM|PM)(?:\s*\(next day\))?$/i.exec(time);
  if (!range) return time;
  const [,start,firstPeriod,end,lastPeriod] = range;
  const first = notes[(firstPeriod || lastPeriod).toUpperCase()];
  const last = notes[lastPeriod.toUpperCase()];
  const afternoon = lang === 'hi' ? 'दोपहर' : 'ਦੁਪਹਿਰ';
  const prefix = (period, value) => (period === notes.PM && Number(value.split(':')[0]) <= 4 ? afternoon : period) + ' ' + value;
  return prefix(first, start) + ' – ' + (/next day/i.test(time) ? notes.next + ' ' + prefix(last, end) :
   first === last ? end : prefix(last, end)) + ' ' + notes.hour;
 }
 function dateText(date, lang) {
  return new Intl.DateTimeFormat(local[lang] || local.pa, {
   timeZone:'Asia/Kolkata', weekday:'long', day:'numeric', month:'long', year:'numeric',
  }).format(new Date(date + 'T12:00:00+05:30'));
 }
 async function makePoster(event, options) {
  const {lang, plate, title, address, gurdwara} = options;
  const time = localTime(options.time, lang);
  const t = labels[lang] || labels.pa;
  const type = knownOccasion[event.id];
  const occasion = t[type] || options.occasion || t.series;
  const date = dateText(event.date, lang);
  const fontSample = [t.series, title, address, time, t.venue, date, occasion, gurdwara ? t.gurdwara : ''].join(' ');
  const fontLoad = document.fonts ? Promise.all([400, 700].flatMap(w =>
   ['Noto Sans Gurmukhi','Noto Sans Devanagari','Inter'].map(f => document.fonts.load(w + ' 38px "' + f + '"', fontSample))
  )).catch(() => {}) : Promise.resolve();
  artwork ||= Promise.all([image('./assets/poh-poster-winter.webp'),image('./assets/safare-sarsa-2026.webp?v=20261125-sarsa-collage4')]);
  const [[backdrop, banner]] = await Promise.all([artwork, fontLoad]);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Poster canvas is unavailable');
  const [start,end,ink,accent,tag] = theme[type==='shaheedi'||type==='kavi'?type:plate] || theme.regular;
  const fill = ctx.createLinearGradient(0, 425, WIDTH, HEIGHT);
  fill.addColorStop(0, start);
  fill.addColorStop(1, end);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#111d34';
  ctx.fillRect(0, 0, WIDTH, 468);
  if (backdrop) cover(ctx, backdrop, 0, 0, WIDTH, 468);
  if (banner) {
   const width = 728, height = 410, x = (WIDTH - width) / 2, y = 29;
   ctx.fillStyle = '#d2ab65';
   ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
   cover(ctx, banner, x, y, width, height);
  }
  ctx.strokeStyle = '#d3a457';
  ctx.lineWidth = 3;
  ctx.strokeRect(19, 19, WIDTH - 38, HEIGHT - 38);
  ctx.fillStyle = '#d3a457';
  ctx.fillRect(20, 465, WIDTH - 40, 3);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const titleBlock = fit(ctx, title, 64, 40, 872, 3, 700);
  const addressBlock = address ? fit(ctx, address, 43, 31, 858, 3, 400) : null;
  const heightOf = block => block.rows.length * Math.ceil(block.px * 1.26);
  const bodyHeight = 102 + heightOf(titleBlock) + 110 +
   (addressBlock ? heightOf(addressBlock) + 86 : 0) + (gurdwara ? 58 : 0) + (time ? 57 : 0);
  let y = 483 + Math.max(18, Math.min(95, (879 - bodyHeight) / 2));
  y = write(ctx, fit(ctx, t.series, 32, 28, 872, 1, 700), y, ink) + 20;
  ctx.fillStyle = tag;
  ctx.fillRect(162, y - 2, 756, 59);
  y = write(ctx, fit(ctx, occasion, 35, 29, 700, 1, 700), y + 4, ink) + 33;
  y = write(ctx, titleBlock, y, ink) + 21;
  ctx.fillStyle = accent;
  ctx.fillRect(460, y, 160, 3);
  y += 24;
  y = write(ctx, fit(ctx, date, 46, 34, 872, 1, 700), y, ink);
  if (time) y = write(ctx, fit(ctx, time, 38, 28, 872, 1, 600), y + 4, ink);
  if (gurdwara) y = write(ctx, fit(ctx, t.gurdwara, 34, 26, 872, 1, 700), y + 8, ink);
  if (addressBlock) {
   y = write(ctx, fit(ctx, t.venue, 29, 25, 872, 1, 700), y + 19, ink);
   y = write(ctx, addressBlock, y + 2, ink);
  }
  if (y > 1395) throw new Error('Poster information does not fit');
  return new Promise((resolve,reject) => canvas.toBlob(
   blob => blob ? resolve(blob) : reject(new Error('PNG could not be created')), 'image/png'
  ));
 }
 function button(event, options) {
  const t = labels[options.lang] || labels.pa;
  const control = document.createElement('button');
  control.className = 'poster-download';
  control.type = 'button';
  control.title = t.download;
  control.setAttribute('aria-label', t.download + ': ' + options.title);
  const icon = document.createElement('span');
  icon.className = 'poster-download-icon';
  icon.setAttribute('aria-hidden','true');
  icon.textContent = '↓';
  control.append(icon);
  control.addEventListener('click',async () => {
   control.disabled = true;
   control.setAttribute('aria-busy','true');
   try {
    const blob = await makePoster(event, options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const suffix = String(event.id || event.time || 'samagam').replace(/[^a-z0-9-]+/gi,'-');
    link.href = url;
    link.download = 'Poh-Samagam-' + event.date + '-' + suffix + '.png';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
   } catch (error) {
    console.warn('Could not download program poster',error);
    window.alert(t.error);
   } finally {
    control.disabled = false;
    control.removeAttribute('aria-busy');
   }
  });
  return control;
 }
 window.PohPoster = {button};
})();
