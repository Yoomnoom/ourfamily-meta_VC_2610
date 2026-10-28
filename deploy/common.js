/* 가상의 가족 극장 – 공개 페이지 공통 스크립트 (index · works · watch · making · album · about) */
(() => {
  const has = s => typeof s === 'string' && s.trim() !== '';
  const arr = a => Array.isArray(a) ? a : [];
  const obj = o => (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** 내용이 하나라도 있는가 (auto 표시 행은 제외) */
  const filled = v => typeof v === 'string' ? has(v) : Array.isArray(v) ? v.some(filled)
    : v && typeof v === 'object' ? (v.auto ? false : Object.values(v).some(filled)) : false;

  /** 문장 끝 온점(.) 뒤에서 줄을 바꾼다. 숫자 뒤 온점(3.5, 2026. 10.)과 파일명(a.mp4)은 건드리지 않는다. */
  const brk = s => typeof s === 'string' ? s.replace(/([^\d\s])\.[ \t]+(?=\S)/g, '$1.\n') : s;

  function h(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === false || v == null || k === 'raw') continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = props.raw ? v : brk(v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => c != null && c !== false && e.append(c));
    return e;
  }

  const params = new URLSearchParams(location.search);
  const host = (window.opener && window.opener !== window) ? window.opener : (window.parent !== window ? window.parent : null);
  const previewMode = params.has('preview') && !!host;

  /** 내부 링크 – 미리보기 중에는 preview 플래그를 유지한다 */
  const href = p => previewMode ? p + (p.includes('?') ? '&' : '?') + 'preview=1' : p;
  // Supabase 읽기 전용 설정. key는 공개용(anon/publishable) 키라 코드에 들어가도 된다. 비워 두면 content.json만 쓴다.
  const SB = { url: 'https://pkucszwwnwpzvzqczmhh.supabase.co', key: '' };
  const isUrl = f => /^https?:\/\//i.test(String(f).trim());
  // 업로드된 파일은 전체 주소, 직접 넣은 파일은 media/ 안의 파일명
  const mediaPath = f => isUrl(f) ? String(f).trim() : 'media/' + encodeURI(String(f).trim().replace(/^(\.?\/)?(media\/)?/, ''));
  const workId = (w, i) => has(w && w.id) ? w.id.trim() : 'work-' + (i + 1);
  const watchHref = (w, i) => href('watch.html?id=' + encodeURIComponent(workId(w, i)));
  const safeUrl = u => has(u) && /^https?:\/\//i.test(u.trim()) ? u.trim() : null;

  const TITLES = {
    intent: '기획 의도', process: '창작 과정', tools: '사용한 AI 도구와 주요 프롬프트', roles: 'AI가 한 것 vs 직접 한 것',
    ai: 'AI가 한 것', human: '직접 한 것', sources: '출처 · 저작권', others: '다른 작품 보기',
    declaration: '책임 있는 AI 활용 선언문', producer: '제작자 소개', contest: '공모전 안내'
  };
  const NAV = [['index.html', '홈'], ['works.html', '상영작'], ['making.html', '메이킹'], ['album.html', '가족 앨범'], ['about.html', '소개']];
  const curPage = (location.pathname.split('/').pop() || 'index.html').replace(/^watch\.html$/, 'works.html');

  /** 데이터가 있는 페이지만 메뉴·링크에 노출한다 */
  function avail(d) {
    const about = obj(d.about), site = obj(d.site);
    return {
      works: arr(d.works).some(w => w && (has(w.id) || has(w.title))),
      making: filled(obj(d.making)),
      album: arr(obj(d.album).photos).some(p => p && (has(p.file) || has(p.caption))),
      about: filled([obj(about.producer), about.intent, arr(about.sources).filter(s => !s.auto), site.contestName, site.contestInfo])
    };
  }

  /* ---------- 로고 (텍스트 기반 SVG) / 파비콘 ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const markText = site => {
    const own = has(site.logoText);
    const raw = own ? site.logoText.trim() : String(site.name || '').replace(/[\[\]\s]/g, '');
    return [...raw].slice(0, own ? 2 : 1).join('') || '극';
  };
  const markSize = t => [...t].length > 1 ? [13, 21] : [18, 23];
  function logoSvg(txt) {
    const [fs, y] = markSize(txt), s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 32 32'); s.setAttribute('class', 'logo'); s.setAttribute('aria-hidden', 'true');
    const r = document.createElementNS(NS, 'rect');
    Object.entries({ width: 32, height: 32, rx: 8, fill: '#d3202f' }).forEach(([k, v]) => r.setAttribute(k, v));
    const t = document.createElementNS(NS, 'text');
    Object.entries({ x: 16, y, 'font-size': fs, 'text-anchor': 'middle', fill: '#fff' }).forEach(([k, v]) => t.setAttribute(k, v));
    t.textContent = txt; s.append(r, t);
    return s;
  }
  function setFavicon(site) {
    const txt = markText(site).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])), [fs, y] = markSize(txt);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#d3202f"/><text x="16" y="${y}" font-size="${fs}" font-weight="700" text-anchor="middle" fill="#fff" font-family="sans-serif">${txt}</text></svg>`;
    let l = document.querySelector('link[rel~=icon]');
    if (!l) { l = h('link', { rel: 'icon' }); document.head.append(l); }
    l.setAttribute('type', 'image/svg+xml'); l.setAttribute('href', 'data:image/svg+xml,' + encodeURIComponent(svg));
  }

  /* ---------- 포스터 / 영상 ---------- */
  function poster(work) {
    const box = h('div', { class: 'poster' }, h('div', { class: 'poster-fallback', 'aria-hidden': 'true' }));
    const file = work.video && work.video.poster;
    if (has(file)) {
      const img = h('img', { src: mediaPath(file), alt: `${has(work.title) ? work.title : '작품'} 포스터`, loading: 'lazy', draggable: 'false' });
      img.addEventListener('error', () => img.remove());
      box.append(img);
    }
    return box;
  }

  function videoFallback(v, title) {
    const box = h('div', { class: 'video-fallback', role: 'group', 'aria-label': title + ' 영상 안내' },
      h('strong', { text: '영상을 불러오지 못했습니다' }),
      h('small', { text: has(v.file) ? `media/${v.file.trim()} 파일을 찾을 수 없거나 재생할 수 없어요.` : '영상 파일명이 아직 설정되지 않았어요.' }));
    if (has(v.file)) box.append(h('a', { class: 'btn', href: mediaPath(v.file), download: '' }, '영상 파일 다운로드'));
    return box;
  }
  function buildVideo(v, title, onFail) {
    const slot = h('div');
    if (!has(v.file)) { slot.append(videoFallback(v, title)); return slot; }
    const video = h('video', { controls: true, playsinline: true, preload: 'metadata', src: mediaPath(v.file), title, 'aria-label': title + ' 영상' });
    if (has(v.poster)) video.setAttribute('poster', mediaPath(v.poster));
    if (has(v.captions)) video.append(h('track', { kind: 'captions', srclang: 'ko', label: '한국어', src: mediaPath(v.captions), default: true }));
    video.addEventListener('error', () => { video.replaceWith(videoFallback(v, title)); if (onFail) onFail(); });
    slot.append(video);
    return slot;
  }

  async function copyText(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0' }); ta.value = text;
      document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove();
    }
    const old = btn.textContent; btn.textContent = '복사됨 ✓';
    setTimeout(() => btn.textContent = old, 1600);
  }

  /* ---------- 공통 조각 ---------- */
  const section = (id, title, sub, ...body) =>
    h('section', { class: 'page reveal', id, 'data-section': id, 'aria-labelledby': id + '-t' },
      h('div', { class: 'wrap' },
        h('div', { class: 'sec-head' }, h('h2', { id: id + '-t', text: title }), has(sub) && h('p', { text: sub })), ...body));
  const pagehead = (title, sub) =>
    h('section', { class: 'pagehead', 'data-section': 'head' }, h('div', { class: 'wrap' }, h('h1', { text: title }), has(sub) && h('p', { text: sub })));
  const emptyPage = (title) => h('main', { id: 'main', class: 'pad' }, pagehead(title),
    h('div', { class: 'wrap' }, h('p', { class: 'empty', text: '아직 준비 중이에요. 곧 채워 둘게요.' })));

  const timeline = items => {
    items = arr(items).filter(p => has(p.title) || has(p.desc));
    return items.length ? h('ol', { class: 'timeline' }, items.map(p => h('li', {}, has(p.title) && h('h3', { text: p.title }), has(p.desc) && h('p', { text: p.desc })))) : null;
  };
  const toolList = items => arr(items).filter(t => has(t.name) || arr(t.prompts).some(p => has(p.text)));
  function tools(items) {
    items = toolList(items);
    if (!items.length) return null;
    return h('div', { class: 'tools' }, items.map((t, i) => {
      const prompts = arr(t.prompts).filter(p => has(p.text));
      return h('details', { class: 'tool', open: i === 0 },
        h('summary', {}, h('span', {},
          h('span', { class: 'tool-name', text: has(t.name) ? t.name : '(이름 없음)' }),
          has(t.purpose) && h('span', { class: 'tool-purpose', text: t.purpose }))),
        h('div', { class: 'tool-body' }, prompts.length ? prompts.map(p => {
          const btn = h('button', { type: 'button', class: 'btn ghost sm', 'aria-label': `${p.title || '프롬프트'} 복사` }, '복사');
          btn.addEventListener('click', () => copyText(p.text, btn));
          return h('div', { class: 'prompt' },
            h('div', { class: 'prompt-head' }, h('h4', { text: has(p.title) ? p.title : '프롬프트' }), btn),
            h('pre', {}, h('code', { text: p.text, raw: true })));
        }) : h('p', { text: '공개된 프롬프트가 없습니다.' })));
    }));
  }
  function roles(r, T) {
    const ai = arr(r && r.ai).filter(has), human = arr(r && r.human).filter(has);
    if (!ai.length && !human.length) return null;
    return h('div', { class: 'roles' }, [['ai', ai], ['human', human]].map(([k, items]) => items.length && h('article', { class: 'role ' + k },
      h('h3', { text: T[k] }), h('ul', {}, items.map(x => h('li', { text: x }))))));
  }
  function sourcesTable(rows, caption) {
    rows = arr(rows).filter(s => has(s.item) || has(s.source) || has(s.license));
    if (!rows.length) return null;
    return h('div', { class: 'table-wrap' }, h('table', {},
      h('caption', { class: 'sr', text: caption }),
      h('thead', {}, h('tr', {}, ['항목', '출처', '라이선스 · 처리 방식'].map(x => h('th', { scope: 'col', text: x })))),
      h('tbody', {}, rows.map(s => h('tr', {},
        h('td', { 'data-label': '항목', text: s.item || '' }),
        h('td', { 'data-label': '출처', text: s.source || '' }),
        h('td', { 'data-label': '라이선스 · 처리 방식', text: s.license || '' }))))));
  }

  /* ---------- 사진 갤러리 + 확대 ---------- */
  const RATIOS = [1.25, .8, 1, 1.4, .9, 1.1];   // masonry에서 사진이 없을 때의 대체 카드 비율
  function gallery(items, { masonry = false } = {}) {
    const dlg = h('dialog', { class: 'lightbox', 'aria-label': '사진 확대 보기' });
    let cur = 0;
    const fig = h('figure', { class: 'lb-fig' });
    const close = h('button', { type: 'button', class: 'lb-btn lb-close', 'aria-label': '닫기', text: '✕' });
    const prev = h('button', { type: 'button', class: 'lb-btn lb-prev', 'aria-label': '이전 사진', text: '‹' });
    const next = h('button', { type: 'button', class: 'lb-btn lb-next', 'aria-label': '다음 사진', text: '›' });
    dlg.append(fig, close, prev, next);
    function show(i) {
      cur = (i + items.length) % items.length;
      const it = items[cur];
      const cap = has(it.caption) ? it.caption : (it.alt || '');
      let media;
      if (has(it.file)) {
        media = h('img', { class: 'lb-img', src: mediaPath(it.file), alt: it.alt || cap });
        media.addEventListener('error', () => media.replaceWith(h('div', { class: 'lb-miss', role: 'img', 'aria-label': it.alt || cap })));
      } else media = h('div', { class: 'lb-miss', role: 'img', 'aria-label': it.alt || cap });
      fig.replaceChildren(media, h('figcaption', { class: 'lb-cap', text: `${cur + 1} / ${items.length}${cap ? ' · ' + cap : ''}` }));
      prev.hidden = next.hidden = items.length < 2;
    }
    close.addEventListener('click', () => dlg.close());
    prev.addEventListener('click', () => show(cur - 1));
    next.addEventListener('click', () => show(cur + 1));
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });

    const list = h('ul', { class: masonry ? 'masonry' : 'gallery' }, items.map((it, i) => {
      const cap = has(it.caption) ? it.caption : '';
      const btn = h('button', { type: 'button', class: 'tile', 'aria-label': `${it.alt || cap || '사진'} 확대 보기` });
      if (masonry) btn.style.aspectRatio = RATIOS[i % RATIOS.length];
      btn.append(h('div', { class: 'poster-fallback', 'aria-hidden': 'true' }));
      if (has(it.file)) {
        const img = h('img', { src: mediaPath(it.file), alt: '', loading: 'lazy' });
        img.addEventListener('load', () => { if (masonry) btn.style.aspectRatio = ''; });
        img.addEventListener('error', () => img.remove());
        btn.append(img);
      }
      if (cap) btn.append(h('span', { class: 'cap', 'aria-hidden': 'true', text: cap }));
      btn.addEventListener('click', () => { show(i); dlg.showModal(); });
      return h('li', {}, btn);
    }));
    return [list, dlg];
  }

  /* ---------- 헤더 / 푸터 ---------- */
  function header(site, av) {
    const shown = NAV.filter(([p]) => p === 'index.html' || av[{ 'works.html': 'works', 'making.html': 'making', 'album.html': 'album', 'about.html': 'about' }[p]]);
    const name = has(site.name) ? site.name : '가상의 가족 극장';
    const burger = h('button', { type: 'button', class: 'burger', 'aria-expanded': 'false', 'aria-controls': 'nav', 'aria-label': '메뉴 열기' },
      h('span', { 'aria-hidden': 'true' }), h('span', { 'aria-hidden': 'true' }), h('span', { 'aria-hidden': 'true' }));
    const hd = h('header', { class: 'site-header', 'data-section': 'header' }, h('div', { class: 'wrap bar' },
      h('a', { class: 'brand', href: href('index.html') }, logoSvg(markText(site)), h('span', { text: name })),
      burger,
      h('nav', { id: 'nav', class: 'nav', 'aria-label': '주요 메뉴' }, h('ul', {}, shown.map(([p, label]) =>
        h('li', {}, h('a', { class: 'navlink', href: href(p), 'aria-current': p === curPage ? 'page' : null, text: label })))))));
    const setOpen = on => {
      hd.classList.toggle('open', on); burger.setAttribute('aria-expanded', on); burger.setAttribute('aria-label', on ? '메뉴 닫기' : '메뉴 열기'); syncHeader();
    };
    burger.addEventListener('click', () => setOpen(!hd.classList.contains('open')));
    hd.addEventListener('keydown', e => { if (e.key === 'Escape' && hd.classList.contains('open')) { setOpen(false); burger.focus(); } });
    hd.querySelector('nav').addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    return hd;
  }
  function syncHeader() {
    const hd = document.querySelector('.site-header');
    if (hd) hd.classList.toggle('solid', scrollY > 40 || hd.classList.contains('open'));
  }

  function footer(site) {
    const mail = has(site.email) ? site.email.trim() : '';
    const mailEl = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) ? h('a', { href: 'mailto:' + mail, text: mail }) : mail;
    const sns = arr(site.sns).filter(s => safeUrl(s.url));
    const row = (k, v) => v && h('div', {}, h('dt', { text: k }), h('dd', {}, v));
    const info = [
      row('제작자', has(site.producer) ? site.producer : ''), row('문의', mailEl),
      row('공모전', has(site.contestName) ? site.contestName : '')
    ].filter(Boolean);
    return h('footer', { 'data-section': 'footer' }, h('div', { class: 'wrap foot' },
      h('div', { class: 'foot-brand' },
        h('a', { class: 'brand', href: href('index.html') }, logoSvg(markText(site)), h('span', { text: has(site.name) ? site.name : '가상의 가족 극장' })),
        has(site.footer) && h('p', { text: site.footer })),
      info.length && h('dl', { class: 'foot-info' }, info),
      sns.length && h('ul', { class: 'foot-sns', 'aria-label': 'SNS' }, sns.map(s =>
        h('li', {}, h('a', { href: s.url.trim(), target: '_blank', rel: 'noopener noreferrer', text: has(s.label) ? s.label : new URL(s.url.trim()).hostname }))))));
  }

  /* ---------- 스크롤 등장 / 로딩 화면 / 페이지 전환 ---------- */
  function reveal() {
    const els = [...document.querySelectorAll('.reveal:not(.in)')];
    if (reduced || !('IntersectionObserver' in window)) return els.forEach(e => e.classList.add('in'));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .06 });
    els.forEach(e => io.observe(e));
  }

  const t0 = performance.now();
  let loader = null;
  if (!reduced) {
    let c = '극'; try { c = sessionStorage.getItem('ft.logo') || c; } catch {}
    loader = h('div', { id: 'loader', 'aria-hidden': 'true' }, logoSvg(c));
    document.body.append(loader);
  }
  function hideLoader() {
    if (!loader) return;
    const l = loader; loader = null;
    setTimeout(() => { l.classList.add('done'); setTimeout(() => l.remove(), 600); }, Math.max(0, 450 - (performance.now() - t0)));
  }

  window.addEventListener('scroll', syncHeader, { passive: true });
  window.addEventListener('pageshow', () => document.body.classList.remove('leaving'));
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (reduced || !a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return;
    if (u.pathname === location.pathname && u.search === location.search) return;   // 같은 페이지 안 이동
    e.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(() => { location.href = a.href; }, 220);
  });

  /* ---------- 데이터 로딩 / 미리보기 ---------- */
  function showError(app, msg) {
    app.replaceChildren(h('div', { class: 'wrap notice card' },
      h('h1', { text: '내용을 불러오지 못했습니다' }),
      h('p', { text: msg }),
      h('p', {}, '파일을 더블클릭해 연 경우 브라우저 보안 때문에 content.json을 읽지 못할 수 있어요. 이 폴더에서 ',
        h('code', { text: 'python -m http.server 8000' }), ' 를 실행한 뒤 ', h('code', { text: 'http://localhost:8000' }), ' 으로 열어 주세요.')));
    hideLoader();
  }
  /* 관리 페이지 미리보기에서만 쓰이는 입력 위치 강조 (공개 사이트의 일반 동작에는 쓰이지 않는다) */
  let hlSection = null;
  function applyHl(scroll) {
    document.querySelectorAll('.pv-hl').forEach(e => e.classList.remove('pv-hl'));
    if (!hlSection) return;
    const t = document.querySelector('[data-section="' + hlSection + '"]'); if (!t) return;
    t.classList.add('pv-hl');
    if (scroll) { if (hlSection === 'header') window.scrollTo({ top: 0, behavior: 'smooth' }); else t.scrollIntoView({ block: hlSection === 'footer' ? 'end' : 'center', behavior: 'smooth' }); }
  }
  /** render(data)를 호출한다. 미리보기에서는 관리 페이지가 보내는 데이터로 여러 번 호출된다. */
  /** DB(문구 + 작품 + 연재물)를 content.json과 같은 모양으로 읽는다. 키가 없거나 DB가 비어 있으면 null */
  async function fromDb() {
    if (!SB.key) return null;
    const hd = { apikey: SB.key, Authorization: 'Bearer ' + SB.key };
    const get = q => fetch(SB.url + '/rest/v1/' + q, { headers: hd, cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    const [st, ser, wk] = await Promise.all([
      get('ourfamilymeta_settings?key=eq.site&select=value'),
      get('ourfamilymeta_series?select=id,title,summary,status,poster_path&order=sort_order,created_at'),
      get('ourfamilymeta_works?select=slug,title,series_id,episode_no,content&order=sort_order,created_at')]);
    if (!st.length && !wk.length) return null;
    const d = { ...obj(st[0] && st[0].value) };
    d.series = ser.map(x => ({ id: x.id, title: x.title, summary: x.summary || '', status: x.status, poster: x.poster_path || '' }));
    d.works = wk.map(x => ({ ...obj(x.content), id: x.slug || obj(x.content).id, title: x.title || obj(x.content).title,
      series: x.series_id || '', episode: x.episode_no ? String(x.episode_no) : '' }));
    return d;
  }

  /** 목록용: 단독 작품은 그대로, 연재물은 시리즈 하나로 묶어 첫 회로 연결한다 */
  function listing(d) {
    const ws = arr(d.works).filter(w => w && (has(w.id) || has(w.title)));
    const ser = new Map(arr(d.series).map(x => [x.id, x]));
    const seen = new Set(), out = [];
    ws.forEach(w => {
      const x = has(w.series) ? ser.get(w.series) : null;
      if (!x) { out.push(w); return; }
      if (seen.has(x.id)) return;
      seen.add(x.id);
      const eps = ws.filter(e => e.series === x.id).sort((a, b) => (+a.episode || 0) - (+b.episode || 0)), first = eps[0];
      out.push({ ...first, title: x.title, tagline: has(x.summary) ? x.summary : first.tagline,
        video: { ...obj(first.video), poster: has(x.poster) ? x.poster : obj(first.video).poster, duration: '' },
        seriesId: x.id, episodeCount: eps.length, seriesStatus: x.status });
    });
    return out;
  }
  /** 목록 카드의 작은 글줄: 연재물은 "N화까지 공개", 단독 작품은 러닝타임 */
  const metaLine = w => w.episodeCount ? `${w.episodeCount}화까지 공개 · ${w.seriesStatus === 'completed' ? '완결' : '연재 중'}`
    : has(w.video && w.video.duration) ? '러닝타임 ' + w.video.duration.trim() : '';

  async function load(app, render) {
    const run = d => { const y = window.scrollY; render(d); reveal(); window.scrollTo(0, y); syncHeader(); hideLoader(); if (previewMode) applyHl(false); };
    if (previewMode) {
      document.body.classList.add('is-preview');
      document.body.prepend(h('div', { class: 'preview-bar', text: '미리보기 – 관리 페이지에 입력한 내용이 실시간으로 반영됩니다' }));
      window.addEventListener('message', e => {
        if (e.source !== host || !e.data) return;
        if (e.data.type === 'content') run(e.data.data);
        else if (e.data.type === 'highlight') { hlSection = e.data.section || null; applyHl(true); }   // 관리 페이지가 지금 입력 중인 구역을 알려 준다
      });
      host.postMessage({ type: 'preview-ready' }, '*');
      return;
    }
    try {
      let d = null;
      try { d = await fromDb(); } catch (e) { console.warn('DB를 읽지 못해 content.json을 씁니다:', e.message); }
      if (!d) {
        const r = await fetch('content.json', { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        d = await r.json();
      }
      run(d);
    } catch (e) { showError(app, 'content.json을 읽는 중 문제가 생겼어요. (' + e.message + ')'); }
  }

  /** 모든 페이지 공통 골격: build(data, site, av)가 { title, main }을 돌려주면 헤더·푸터를 붙여 그린다. */
  function boot(build) {
    const app = document.getElementById('app');
    load(app, d => {
      d = obj(d);
      const site = obj(d.site), av = avail(d), r = build(d, site, av);
      document.title = r.title;
      setFavicon(site);
      try { sessionStorage.setItem('ft.logo', markText(site)); } catch {}
      const frag = document.createDocumentFragment();
      frag.append(header(site, av), r.main, footer(site));
      app.replaceChildren(frag);
    });
  }

  window.App = { h, has, arr, obj, filled, href, mediaPath, workId, watchHref, poster, buildVideo, listing, metaLine, copyText, TITLES, avail,
    section, pagehead, emptyPage, timeline, tools, toolList, roles, sourcesTable, gallery, boot, reduced, params };
})();
