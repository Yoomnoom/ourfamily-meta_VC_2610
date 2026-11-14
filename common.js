/* 우리 가족 극장 – 공개 페이지 공통 스크립트 (index · works · watch · making · album · about) */
(() => {
  const has = s => typeof s === 'string' && s.trim() !== '';
  const arr = a => Array.isArray(a) ? a : [];
  const obj = o => (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
  // 공모전 발표용: 심사위원 기기의 '움직임 줄이기' 설정을 따르지 않는다 (연출·로딩 화면이 항상 나온다)
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
  const SB = { url: 'https://pkucszwwnwpzvzqczmhh.supabase.co', key: 'sb_publishable_ipfRTlcNU5mwSkgqcAKjmg_i8H0pM94' };
  const isUrl = f => /^https?:\/\//i.test(String(f).trim());
  // 업로드된 파일은 전체 주소, 직접 넣은 파일은 media/ 안의 파일명
  const mediaPath = f => isUrl(f) ? String(f).trim() : 'media/' + encodeURI(String(f).trim().replace(/^(\.?\/)?(media\/)?/, ''));
  const workId = (w, i) => has(w && w.id) ? w.id.trim() : 'work-' + (i + 1);
  const watchHref = (w, i) => href('watch.html?id=' + encodeURIComponent(workId(w, i)));
  const safeUrl = u => has(u) && /^https?:\/\//i.test(u.trim()) ? u.trim() : null;
  /** 글 속의 링크를 눌러지는 <a>로 바꾼다 (새 탭으로 열림, innerHTML 안 씀).
      [바로가기](https://…) → "바로가기" 글자에 링크 / 그냥 https://… 주소는 주소 글자 그대로 링크. 끝의 . , ) 같은 문장부호는 링크에 넣지 않는다 */
  const linkify = text => {
    const frag = document.createDocumentFragment(), s = String(text), re = /\[([^\]\n]+)\]\((https?:\/\/[^\s<>"')]+)\)|(https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)\]])/g;
    let at = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > at) frag.append(s.slice(at, m.index));
      frag.append(h('a', { href: m[2] || m[3], target: '_blank', rel: 'noopener noreferrer', raw: true, text: m[1] || m[3] }));
      at = m.index + m[0].length;
    }
    if (at < s.length) frag.append(s.slice(at));
    return frag;
  };

  const TITLES = {
    intent: '기획 의도', process: '창작 과정', tools: '사용한 AI 도구와 주요 프롬프트', roles: 'AI가 한 것 vs 직접 한 것',
    ai: 'AI가 한 것', human: '직접 한 것', sources: '출처 · 저작권', others: '다른 작품 보기', world: '같은 세계관 이야기',
    declaration: '책임 있는 AI 활용 선언문', producer: '제작자 소개', contest: '공모전 안내'
  };
  const NAV = [['index.html', '홈'], ['works.html', '상영작'], ['making.html', '메이킹'], ['album.html', '비하인드 컷'], ['about.html', '소개']];
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
  /** 로고 이미지가 있으면 그림, 없으면 글자 로고. 이미지가 안 불러와지면 글자 로고로 되돌린다. */
  function logoMark(site) {
    if (!has(site.logoImage)) return logoSvg(markText(site));
    const img = h('img', { class: 'logo logo-img', src: mediaPath(site.logoImage), alt: '', draggable: 'false' });
    img.addEventListener('error', () => img.replaceWith(logoSvg(markText(site))));
    return img;
  }
  function setFavicon(site) {
    if (has(site.logoImage)) {
      let l = document.querySelector('link[rel~=icon]');
      if (!l) { l = h('link', { rel: 'icon' }); document.head.append(l); }
      l.removeAttribute('type'); l.setAttribute('href', mediaPath(site.logoImage));
      return;
    }
    const txt = markText(site).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])), [fs, y] = markSize(txt);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#d3202f"/><text x="16" y="${y}" font-size="${fs}" font-weight="700" text-anchor="middle" fill="#fff" font-family="sans-serif">${txt}</text></svg>`;
    let l = document.querySelector('link[rel~=icon]');
    if (!l) { l = h('link', { rel: 'icon' }); document.head.append(l); }
    l.setAttribute('type', 'image/svg+xml'); l.setAttribute('href', 'data:image/svg+xml,' + encodeURIComponent(svg));
  }

  /* ---------- 종류 알약 (영상·게임·앱·스토리보드) ---------- */
  const KINDS = {
    video: ['영상', '<polygon points="7 4 20 12 7 20 7 4"/>'],
    game: ['게임', '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11.5" r=".6"/><circle cx="18.5" cy="14" r=".6"/>'],
    app: ['앱', '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18.5h2"/>'],
    storyboard: ['스토리보드', '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>']
  };
  const kindOf = w => w && (w.kind === 'game' || w.kind === 'app' || w.kind === 'storyboard') ? w.kind : 'video';
  function kindPill(work) {
    const k = kindOf(work), e = h('span', { class: 'kind-pill ' + k });
    e.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + KINDS[k][1] + '</svg>';
    e.append(KINDS[k][0]); return e;
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
    const logo = work.video && work.video.logo;   // 포스터 아래쪽에 얹는 작품 로고
    if (has(logo)) {
      const v = work.video, num = (k, d, lo, hi) => has(String(v[k] ?? '')) && isFinite(+v[k]) ? Math.min(hi, Math.max(lo, +v[k])) : d;
      const li = h('img', { class: 'poster-logo', src: mediaPath(logo), alt: '', loading: 'lazy', draggable: 'false',
        style: `left:${num('logoX', 50, 0, 100)}%;top:${num('logoY', 85, 0, 100)}%;width:${num('logoW', 80, 20, 100)}%` });
      li.addEventListener('error', () => li.remove());
      box.append(li);
    }
    const peek = has(work.intent) ? work.intent : work.tagline;   // 마우스를 올리면 기획 의도(없으면 한 줄 소개)가 나온다
    if (has(peek)) box.append(h('div', { class: 'poster-peek', 'aria-hidden': 'true' }, h('span', { class: 'peek-label', text: has(work.intent) ? '기획 의도' : '소개' }),
      h('p', { class: 'peek-text', raw: true, text: peek.trim().replace(/\s*\n\s*/g, ' ') })));

    return box;
  }

  // 다른 도메인(Supabase) 파일은 download 속성이 무시되므로, 받아서 저장한다. 실패하면 새 탭으로 연다.
  function dlLink(file, label, cls) {
    const url = mediaPath(file), name = decodeURIComponent(url.split('?')[0].split('/').pop() || 'video.mp4');
    const a = h('a', { class: cls || 'btn', href: url, download: name }, label);
    a.addEventListener('click', async e => {
      e.preventDefault();
      if (a.dataset.busy) return;
      a.dataset.busy = '1'; const old = a.textContent; a.textContent = '내려받는 중…';
      try {
        const r = await fetch(url, { mode: 'cors' }); if (!r.ok) throw 0;
        const b = URL.createObjectURL(await r.blob()), t = document.createElement('a');
        t.href = b; t.download = name; document.body.append(t); t.click(); t.remove();
        setTimeout(() => URL.revokeObjectURL(b), 10000);
      } catch (_) { window.open(url, '_blank', 'noopener'); }
      a.textContent = old; delete a.dataset.busy;
    });
    return a;
  }


  function videoFallback(v, title) {
    const box = h('div', { class: 'video-fallback', role: 'group', 'aria-label': title + ' 영상 안내' },
      h('strong', { text: '영상을 불러오지 못했습니다' }),
      h('small', { text: has(v.file) ? `media/${v.file.trim()} 파일을 찾을 수 없거나 재생할 수 없어요.` : '영상 파일명이 아직 설정되지 않았어요.' }));
    if (has(v.file)) box.append(dlLink(v.file, '영상 파일 다운로드', 'btn'));
    return box;
  }
  function buildVideo(v, title, onFail) {
    const slot = h('div');
    if (!has(v.file)) { slot.append(videoFallback(v, title)); return slot; }
    const video = h('video', { controls: true, playsinline: true, preload: 'metadata', crossorigin: has(v.captions) ? 'anonymous' : null, src: mediaPath(v.file) + (has(v.cover) ? '' : '#t=' + (+v.coverAt > 0 ? +v.coverAt : 0.1)), 'aria-label': title + ' 영상' });
    const st = mediaStatus(video, { above: true, errors: false, lazy: true }); slot.style.position = 'relative';
    if (has(v.cover)) video.setAttribute('poster', mediaPath(v.cover));   // 세로 포스터는 목록용이라 쓰지 않는다 (없으면 영상 첫 장면)
    if (has(v.captions)) video.append(h('track', { kind: 'captions', srclang: 'ko', label: '한국어', src: mediaPath(v.captions), default: true }));
    video.addEventListener('error', () => { st.el.remove(); video.replaceWith(videoFallback(v, title)); if (onFail) onFail(); });
    slot.append(video, st.el);
    {   // 방문 집계: 재생 시작 · 25/50/75% 지점 · 끝까지 · 실제로 본 시간 (건너뛴 구간은 세지 않는다)
      let started = 0, next = 0, last = 0, watched = 0;
      const marks = [25, 50, 75], push = () => { if (watched >= 1) vSend('watch', { seconds: Math.round(watched) }); };
      video.addEventListener('play', () => { if (!started) { started = 1; vSend('play'); } });
      video.addEventListener('timeupdate', () => {
        const t = video.currentTime, d = t - last; last = t;
        if (video.seeking || d <= 0 || d > 1.5) return;
        watched += d;
        const p = video.duration > 0 ? t / video.duration * 100 : 0;
        while (next < 3 && p >= marks[next]) { if (p < marks[next] + 8) vSend('progress', { pct: marks[next] }); next++; }
      });
      video.addEventListener('ended', () => { vSend('end'); push(); });
      video.addEventListener('pause', push);
      addEventListener('pagehide', push);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(); });
    }
    if (has(v.endCover)) {   // 영상이 끝나면 끝 화면 이미지를 보여 준다 (다시 재생하면 사라진다). 아래쪽은 재생 막대를 위해 비워 둔다
      const end = h('div', { class: 'end-cover', hidden: true }, h('img', { src: mediaPath(v.endCover), alt: '', draggable: 'false' }));
      end.firstChild.addEventListener('error', () => end.remove());
      slot.append(end);
      video.addEventListener('ended', () => { end.hidden = false; });
      ['play', 'seeking'].forEach(k => video.addEventListener(k, () => { end.hidden = true; }));
    }
    return slot;
  }


  /* ---------- 불러오는 상태 안내: 인터넷이 느릴 때 이유를 보여 준다 ---------- */
  function mediaStatus(video, { noun = '영상', errors = true, above = false, lazy = false } = {}) {
    const base = 'media-status' + (above ? ' above' : '');
    const el = h('div', { class: base, role: 'status', 'aria-live': 'polite', hidden: true });
    let t = 0, ok = false, bad = false;
    const say = (msg, kind) => {   // kind: 'bad' 오류 · 'info' 안내 · 없으면 불러오는 중(빙글빙글)
      bad = kind === 'bad'; el.className = base + (kind ? ' ' + kind : '');
      el.replaceChildren(...[kind ? null : h('span', { class: 'spin', 'aria-hidden': 'true' }), h('span', { text: msg })].filter(Boolean)); el.hidden = false;
    };
    const hide = () => { clearTimeout(t); el.hidden = true; };
    const pct = () => { try { const b = video.buffered; return video.duration > 0 && b.length ? Math.min(99, Math.round(b.end(b.length - 1) / video.duration * 100)) : 0; } catch { return 0; } };
    const slow = () => { if (!ok && !bad) say(`${noun}을 불러오는 중이에요.\n인터넷이 느리면 조금 걸려요.` + (pct() ? `\n(${pct()}%)` : '')); };
    const fail = code => say(code === 2 ? `인터넷이 끊겼거나 너무 느려서 ${noun}을 받지 못했어요.\n인터넷 연결을 확인해 주세요.`
      : code === 3 ? `${noun} 파일이 손상되었거나 이 기기에서 재생할 수 없어요.`
      : code === 4 ? `이 브라우저에서 재생할 수 없는 형식이거나 주소가 잘못되었어요.`
      : `${noun}을 불러오지 못했어요.\n인터넷 연결을 확인해 주세요.`, 'bad');
    if (!lazy) t = setTimeout(slow, 1200);
    else video.addEventListener('play', () => { if (!ok) { clearTimeout(t); t = setTimeout(slow, 1200); } });
    video.addEventListener('progress', () => { if (!el.hidden && !ok && !bad) slow(); });
    video.addEventListener('playing', () => { ok = true; bad = false; hide(); });
    video.addEventListener('pause', () => { if (!video.ended) hide(); });
    video.addEventListener('waiting', () => { if (!ok) return; clearTimeout(t); t = setTimeout(() => say('다음 장면을 미리 받는 중이에요.\n인터넷이 느리면 잠시 멈출 수 있어요.'), 900); });
    if (errors) video.addEventListener('error', () => fail(video.error && video.error.code));
    window.addEventListener('offline', () => say('인터넷 연결이 끊겼어요.\n연결을 확인해 주세요.', 'bad'));
    window.addEventListener('online', () => { if (bad && !video.error) hide(); });
    return { el, say, fail, hide };
  }
  function frameStatus(frame, noun = '게임') {   // 게임·앱 화면(iframe)이 늦게 열릴 때
    const el = h('div', { class: 'media-status', role: 'status', 'aria-live': 'polite', hidden: true });
    let done = false;
    const t1 = setTimeout(() => { if (done) return; el.replaceChildren(h('span', { class: 'spin', 'aria-hidden': 'true' }), h('span', { text: `${noun}을 불러오는 중이에요.\n인터넷이 느리면 조금 걸려요.` })); el.hidden = false; }, 1500);
    const t2 = setTimeout(() => { if (done) return; el.className = 'media-status bad'; el.replaceChildren(h('span', { text: `아직 ${noun}을 불러오지 못했어요.\n인터넷을 확인하거나 "새 창에서 열기"를 눌러 보세요.` })); el.hidden = false; }, 15000);
    frame.addEventListener('load', () => { done = true; clearTimeout(t1); clearTimeout(t2); el.hidden = true; });
    return el;
  }

  /* ---------- 꾸밈 효과: 주제에 맞는 마우스 모양과 말풍선 안내 (마우스를 쓰는 기기에서만) ---------- */
  const finePointer = () => matchMedia('(hover:hover) and (pointer:fine)').matches;
  /* 마우스 모양: 작품마다 CMS에서 이모지나 그림으로 고른다. 비워 두면 제목 속 낱말로 정하고, 그래도 없으면 홈 모양(팝콘)을 쓴다 */
  const CURSOR_HOME = '🍿';
  const CURSOR_WORDS = [['지영', '📕'], ['찰칵', '📷'], ['보은', '🐕'], ['풍산', '🐗'], ['잘먹', '🥄'], ['마음', '🏠'], ['식탁', '🥢'], ['식당', '🥢']];   // 제목의 공백은 무시하고 비교한다
  const CURSOR_ACTIVE = { '📕': '📖', '📷': '📸', '🥄': '🍚', '🥢': '🍜', '🏠': '🏡', '🐕': '🐶', '🍿': '🎬' };   // 눌릴 만한 곳에 올리거나 누르면 바뀌는 모양 (책이 펼쳐진다, 셔터가 터진다…). 없는 것은 커졌다 작아지기만 한다
  const CURSOR_FAMILY = [['👨', 22, 18, .6], ['👩', 38, 10, .5], ['👧', 34, 30, .42]];   // 아이콘 옆을 바짝 따라다니는 작은 가족 [모양, 가로, 세로, 따라가는 빠르기]
  function cursorSpec(emoji, image, ...titles) {
    if (has(image)) return { img: mediaPath(image) };
    if (has(emoji)) return { text: emoji.trim() };
    const k = CURSOR_WORDS.find(([w]) => titles.some(t => String(t || '').replace(/\s/g, '').includes(w)));
    return k ? { text: k[1] } : null;
  }
  const siteCursor = site => cursorSpec(obj(site).cursor, obj(site).cursorImage) || { text: CURSOR_HOME };
  let setCursor = () => {};
  function cursorFx() {
    if (!finePointer() || window.parent !== window) return;   // 관리 페이지 미리보기 안에서는 쓰지 않는다
    const el = h('div', { class: 'fx-cursor', 'aria-hidden': 'true' }), inner = h('span', { class: 'fx-c-in' });
    el.append(inner); document.body.append(el);
    const fam = h('div', { class: 'fx-fam', 'aria-hidden': 'true' }), kin = CURSOR_FAMILY.map(([g, dx, dy, k], i) => ({ dx, dy, k, x: 0, y: 0, e: h('span', { class: 'fx-f' }, h('span', { text: g, style: `animation-delay:${-i * .4}s` })) }));
    fam.append(...kin.map(f => f.e)); document.body.append(fam);
    const both = (c, on) => { el.classList.toggle(c, on); fam.classList.toggle(c, on); };
    const root = document.documentElement, HOT = 'a[href],button,[role="button"],.tile,.arrow,summary,label';
    let spec = null, mx = 0, my = 0, px = 0, tilt = 0, raf = 0, seen = false, near = false, live = 0, hotNow = false, down = false;
    const content = () => spec.img ? h('img', { src: spec.img, alt: '', draggable: 'false' }) : document.createTextNode(spec.text);
    const glyph = () => { if (!spec || spec.img) return; const t = (hotNow || down) && CURSOR_ACTIVE[spec.text] || spec.text; if (inner.textContent !== t) inner.textContent = t; };   // 책이 펼쳐지는 식의 모양 바꾸기
    setCursor = sp => {
      spec = sp || null;
      if (!spec) { root.classList.remove('fx-on'); el.hidden = true; fam.hidden = true; return; }
      el.hidden = false; fam.hidden = false; inner.replaceChildren(content());
      const im = inner.querySelector('img'); if (im) im.addEventListener('error', () => { spec = { text: CURSOR_HOME }; inner.replaceChildren(content()); });
      if (seen && !near) root.classList.add('fx-on');
    };
    const loop = () => {
      el.style.transform = `translate(${mx}px,${my}px)`;   // 마우스 위치에 바로 붙인다 (지연 없음)
      tilt += (Math.max(-28, Math.min(28, (mx - px) * 1.4)) - tilt) * .3; px = mx;   // 기울기만 부드럽게: 움직이는 방향으로 흔들리고 멈추면 돌아온다
      inner.style.setProperty('--tilt', tilt + 'deg');
      let busy = Math.abs(tilt) > .5;
      for (const f of kin) { const tx = mx + f.dx, ty = my + f.dy; f.x += (tx - f.x) * f.k; f.y += (ty - f.y) * f.k; f.e.style.transform = `translate(${f.x}px,${f.y}px)`; if (Math.abs(tx - f.x) + Math.abs(ty - f.y) > .3) busy = true; }   // 가족은 마우스 가까이에서 바짝 따라온다 (멈추면 곧 제자리)
      raf = busy ? requestAnimationFrame(loop) : 0;
      if (!raf) inner.style.setProperty('--tilt', '0deg');
    };
    const bit = (cx, cy) => {   // 클릭하면 같은 모양의 작은 조각이 톡 튀어 오른다 (팝콘 튀기듯)
      if (live > 24 || !spec) return;
      const b = h('span', { class: 'fx-bit', 'aria-hidden': 'true' }, content()), a = (-90 + (Math.random() - .5) * 150) * Math.PI / 180, d = 26 + Math.random() * 40;
      b.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--r:${(Math.random() - .5) * 240}deg`;
      live++; b.addEventListener('animationend', () => { b.remove(); live--; }); document.body.append(b);
    };
    document.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' || !spec) return;
      mx = e.clientX; my = e.clientY;
      if (!seen) { seen = true; px = mx; for (const f of kin) { f.x = mx + f.dx; f.y = my + f.dy; } both('on', true); }
      // 영상·스토리보드·게임·앱 화면(사진 확대 창의 영상 포함)과 그 둘레(80px)에서는 사이트 아이콘을 숨기고 원래 마우스 모양으로 돌려 놓는다 (조작에 방해가 되지 않게)
      near = [...document.querySelectorAll('.screen-frame,video.lb-img')].some(f => { const rc = f.getBoundingClientRect(); return rc.width > 0 && mx > rc.left - 80 && mx < rc.right + 80 && my > rc.top - 80 && my < rc.bottom + 80; });
      hotNow = !near && !!(e.target.closest && e.target.closest(HOT));
      root.classList.toggle('fx-on', !near); both('gone', near); both('hot', hotNow); glyph();
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || !spec || near) return; down = true; both('press', true); glyph(); for (let i = 0; i < 6; i++) bit(e.clientX, e.clientY); });
    document.addEventListener('pointerup', () => { down = false; both('press', false); glyph(); });
    document.addEventListener('mouseout', e => { if (e.relatedTarget && e.relatedTarget.tagName === 'IFRAME') both('gone', true); });   // 게임·앱 화면 안에서는 그쪽 마우스 모양을 쓴다
    root.addEventListener('mouseleave', () => both('on', false));
    root.addEventListener('mouseenter', () => { if (seen) both('on', true); });
  }
  function tooltips() {   // 브라우저 기본 말풍선(title) 대신 꾸민 말풍선을 보여 준다
    if (!finePointer()) return;
    const tip = h('div', { class: 'fx-tip', role: 'tooltip', 'aria-hidden': 'true' });
    document.body.append(tip);
    let cur = null, timer = 0;
    const textOf = el => {
      if (/^(VIDEO|IFRAME)$/.test(el.tagName)) return '';
      let t = el.getAttribute('data-tip');
      if (!t && el.hasAttribute('title')) { t = el.getAttribute('title'); el.setAttribute('data-tip', t); el.removeAttribute('title'); }
      if (!t && el.matches('.arrow,.lb-btn,.tile')) t = el.getAttribute('aria-label');
      return (t || '').trim();
    };
    const hide = () => { clearTimeout(timer); cur = null; tip.classList.remove('on'); };
    const place = el => {
      const r = el.getBoundingClientRect(); tip.classList.remove('below'); tip.style.left = '0px'; tip.style.top = '0px';
      const w = tip.offsetWidth, hh = tip.offsetHeight, x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
      let y = r.top - hh - 12; if (y < 8) { y = r.bottom + 12; tip.classList.add('below'); }
      tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.setProperty('--ax', (r.left + r.width / 2 - x) + 'px');
    };
    document.addEventListener('mouseover', e => {
      const el = e.target.closest && e.target.closest('[title],[data-tip],.arrow,.lb-btn,.tile');
      if (el === cur) return;
      hide(); if (!el) return;
      const t = textOf(el); if (!t) return;
      cur = el; timer = setTimeout(() => { tip.textContent = t; place(el); tip.classList.add('on'); }, 350);
    });
    ['scroll', 'mousedown', 'keydown'].forEach(k => window.addEventListener(k, hide, { passive: true, capture: true }));
    document.documentElement.addEventListener('mouseleave', hide);
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
        h('div', { class: 'sec-head' }, h('h2', { id: id + '-t', text: title }), has(sub) && h('p', { raw: true, text: sub })), ...body));
  const pagehead = (title, sub) =>
    h('section', { class: 'pagehead', 'data-section': 'head' }, h('div', { class: 'wrap' }, h('h1', { text: title }), has(sub) && h('p', { raw: true, text: sub })));
  const emptyPage = (title) => h('main', { id: 'main', class: 'pad' }, pagehead(title),
    h('div', { class: 'wrap' }, h('p', { class: 'empty', text: '아직 준비 중이에요. 곧 채워 둘게요.' })));

  const timeline = items => {
    items = arr(items).filter(p => has(p.title) || has(p.desc));
    return items.length ? h('ol', { class: 'timeline' }, items.map(p => h('li', {}, has(p.title) && h('h3', { text: p.title }), has(p.desc) && h('p', { raw: true, text: p.desc })))) : null;
  };
  const toolList = items => arr(items).filter(t => has(t.name) || arr(t.prompts).some(p => has(p.text)));
  /** 프롬프트 글 안의 마크다운 표(| 로 구분)는 표로, 나머지는 쓴 그대로 보여 준다. 복사하면 원문 그대로 복사된다 */
  function promptBody(text) {
    /* 한 박스 안에 여러 요청을 이어 쓴 글: "# 제목" 줄은 제목(크게), 그 아래는 내용(작게)으로 보여 준다. 복사하면 쓴 그대로 복사된다 */
    if (/^# .+/m.test(String(text))) {
      const box = h('div', { class: 'prompt-multi' });
      let sec = null;
      String(text).split(/\r?\n/).forEach(l => {
        const m = /^# (.+)$/.exec(l);
        if (m) { sec = { body: [], el: h('p', { class: 'pm-body' }) }; box.append(h('h5', { text: '# ' + m[1].trim() }), sec.el); }
        else if (sec) sec.body.push(l);
        else if (l.trim()) box.append(h('p', { class: 'pm-body', text: l }));
        if (sec) sec.el.textContent = sec.body.join('\n').replace(/^\n+|\n+$/g, '');
      });
      return [box];
    }
    const lines = String(text).split(/\r?\n/), out = [], isRow = l => /^\s*\|.*\|\s*$/.test(l), isSep = l => isRow(l) && /^[\s|:-]+$/.test(l) && l.includes('---');
    const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    let buf = [], found = false;
    const flush = () => { const t = buf.join('\n').replace(/^\n+|\n+$/g, ''); if (t) out.push(h('pre', {}, h('code', { text: t, raw: true }))); buf = []; };
    for (let i = 0; i < lines.length; i++) {
      if (isRow(lines[i]) && i + 1 < lines.length && isSep(lines[i + 1])) {
        flush(); found = true;
        const head = cells(lines[i]), rows = []; let j = i + 2;
        while (j < lines.length && isRow(lines[j])) rows.push(cells(lines[j++]));
        out.push(h('div', { class: 'prompt-table' }, h('table', {}, h('thead', {}, h('tr', {}, head.map(c => h('th', { text: c })))),
          h('tbody', {}, rows.map(r => h('tr', {}, r.map(c => h('td', { text: c }))))))));
        i = j - 1;
      } else buf.push(lines[i]);
    }
    if (!found) return [h('pre', {}, h('code', { text: String(text), raw: true }))];
    flush(); return out;
  }
  /** 요약 묶음: 요청 박스와 같은 글꼴·간격. "1. …" 줄은 번호가 걸린 목록으로 보여 준다 */
  function summaryBody(text, title) {
    const box = h('div', { class: 'prompt-multi pm-sum' });
    if (has(title)) box.append(h('h5', { text: title }));
    let ol = null;
    String(text).split(/\r?\n/).forEach(l => {
      const m = /^\s*(\d+)\.\s+(.*)$/.exec(l);
      if (m) { if (!ol) { ol = h('ol', { class: 'pm-list' }); box.append(ol); } ol.append(h('li', { value: m[1], text: m[2] })); }
      else if (l.trim()) { ol = null; box.append(h('p', { class: 'pm-body', text: l.trim() })); }
    });
    return [box];
  }
  function tools(items) {
    items = toolList(items);
    if (!items.length) return null;
    return h('div', { class: 'tools' }, items.map((t, i) => {
      const prompts = arr(t.prompts).filter(p => has(p.text)); let lastGroup = '';
      return h('details', { class: 'tool' + (prompts.some(p => !/^\s*\[요약\]/.test(p.title || '')) ? '' : ' no-prompt') },   // 프롬프트 원문이 있는 카드만 '프롬프트 보기', 나머지는 '활용 내용 보기'
        h('summary', {}, h('span', {},
          h('span', { class: 'tool-name', text: has(t.name) ? t.name : '(이름 없음)' }),
          has(t.purpose) && h('span', { class: 'tool-purpose', text: t.purpose }))),
        h('div', { class: 'tool-body' }, prompts.length ? prompts.map(p => {
          const refs = arr(p.refs).filter(x => x && has(x.file));
          /* 제목을 "[묶음 이름] 제목"으로 쓰면 같은 묶음끼리 소제목 아래에 모아 보여 준다 */
          const gm = /^\s*\[([^\]]+)\]\s*(.*)$/.exec(p.title || ''), group = gm ? gm[1].trim() : '', ptitle = gm ? gm[2].trim() : (p.title || '');
          const head = group && group !== lastGroup ? h('h3', { class: 'prompt-group', text: group }) : null;
          if (group) lastGroup = group;
          const btn = h('button', { type: 'button', class: 'btn ghost sm', 'aria-label': `${ptitle || '프롬프트'} 복사` }, '복사');
          btn.addEventListener('click', () => copyText(p.text, btn));
          const box = h('div', { class: 'prompt' },
            group !== '요약' && h('div', { class: 'prompt-head' }, h('h4', { text: ptitle || (group ? group : '프롬프트') }), btn),
            group === '요약' ? summaryBody(p.text, ptitle) : promptBody(p.text),
            refs.length > 0 && h('div', { class: 'prompt-refs' }, h('p', { class: 'prompt-refs-title', text: '프롬프트에 함께 넣은 이미지' }), gallery(refs)));
          return head ? h('div', { class: 'prompt-set' }, head, box) : box;
        }) : h('p', { text: '공개된 프롬프트가 없습니다.' })));
    }));
  }
  function roles(r, T) {
    const ai = arr(r && r.ai).filter(has), human = arr(r && r.human).filter(has);
    if (!ai.length && !human.length) return null;
    return h('div', { class: 'roles' }, [['ai', ai], ['human', human]].map(([k, items]) => items.length > 0 && h('article', { class: 'role ' + k },
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
  const isVideo = f => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(f || ''));   // 비하인드 컷은 사진과 영상을 함께 담는다
  function gallery(groups, { masonry = false } = {}) {
    /* 한 장면(글·설명 하나)에 사진·영상이 여럿일 수 있다: file + more[]. 확대 보기는 모든 파일을 한 줄로 이어서 넘겨 본다. */
    const filesOf = g => [{ file: g.file, alt: g.alt, fx: g.fx, fy: g.fy }, ...arr(g.more).map(m => ({ file: m && m.file, alt: m && has(m.alt) ? m.alt : g.alt, fx: m && m.fx, fy: m && m.fy }))].filter(f => has(f.file));
    const items = [], first = [];
    groups.forEach(g => { first.push(items.length); const fs = filesOf(g); (fs.length ? fs : [{ file: '', alt: g.alt }]).forEach(f => items.push({ file: f.file || '', alt: f.alt, caption: g.caption, fx: f.fx, fy: f.fy })); });
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
      const cap = has(it.alt) ? it.alt : (it.caption || '');   // 누르면 '사진 설명'이 보인다 (목록 밖에는 '사진 아래에 보일 글'만)
      let media;
      if (has(it.file) && isVideo(it.file)) {
        media = h('video', { class: 'lb-img', src: mediaPath(it.file), controls: true, playsinline: true, autoplay: true, 'aria-label': it.alt || cap });
        media.addEventListener('error', () => media.replaceWith(h('div', { class: 'lb-miss', role: 'img', 'aria-label': it.alt || cap })));
      } else if (has(it.file)) {
        media = h('img', { class: 'lb-img', src: mediaPath(it.file), alt: it.alt || cap });
        media.addEventListener('error', () => media.replaceWith(h('div', { class: 'lb-miss', role: 'img', 'aria-label': it.alt || cap })));
      } else media = h('div', { class: 'lb-miss', role: 'img', 'aria-label': it.alt || cap });
      fig.replaceChildren(media, h('figcaption', { class: 'lb-cap', text: `${cur + 1} / ${items.length}${cap ? ' · ' + cap : ''}` }));
      prev.hidden = next.hidden = items.length < 2;
    }
    close.addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => fig.replaceChildren());   // 닫으면 영상 소리도 함께 멈춘다
    prev.addEventListener('click', () => show(cur - 1));
    next.addEventListener('click', () => show(cur + 1));
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });

    // 4:3 칸보다 가로로 넓은 사진은 가로를 칸에 맞춰 양옆이 잘리지 않게 한다 (세로로 긴 사진은 가로에 맞추고 위아래만 잘림)
    const edgeFill = (el, src) => {   // 4:3보다 넓은 사진은 통째로 보여 주므로, 남는 위아래 여백을 사진 가장자리 색으로 채운다 (읽지 못하면 기존 배경 그대로)
      try {
        const im = new Image(); im.crossOrigin = 'anonymous';
        im.onload = () => { try {
          const S = 24, c = document.createElement('canvas'); c.width = c.height = S;
          const x = c.getContext('2d'); x.drawImage(im, 0, 0, S, S);
          let r = 0, g = 0, b = 0, n = 0;
          for (let i = 0; i < S; i++) for (const [px, py] of [[i, 0], [i, S - 1], [0, i], [S - 1, i]]) { const d = x.getImageData(px, py, 1, 1).data; r += d[0]; g += d[1]; b += d[2]; n++; }
          el.style.backgroundColor = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
        } catch (e) {} };
        im.src = src;
      } catch (e) {}
    };
    const fitW = (el, w, h) => { if (w && h && w / h > 3 / 2) { el.style.objectFit = 'contain'; if (el.tagName === 'IMG') edgeFill(el, el.currentSrc || el.src); } };
    const media = (it, big) => {
      if (has(it.file) && isVideo(it.file)) {
        const vd = h('video', { src: mediaPath(it.file) + '#t=0.1', muted: true, preload: 'metadata', playsinline: true, tabindex: '-1', 'aria-hidden': 'true' });
        vd.muted = true; vd.addEventListener('error', () => vd.remove());
        vd.addEventListener('loadedmetadata', () => fitW(vd, vd.videoWidth, vd.videoHeight));
        return vd;
      }
      const img = h('img', { src: mediaPath(it.file), alt: '', loading: 'lazy' });
      img.addEventListener('error', () => img.remove());
      img.addEventListener('load', () => fitW(img, img.naturalWidth, img.naturalHeight));
      return img;
    };
    const list = h('ul', { class: masonry ? 'masonry' : 'gallery' }, groups.map((g, i) => {
      const cap = has(g.caption) ? g.caption : '';
      const mine = items.slice(first[i], i + 1 < first.length ? first[i + 1] : items.length), n = mine.length;
      const mode = n > 1 ? (['auto', 'grid', 'stack'].includes(g.mode) ? g.mode : 'auto') : 'one';
      const btn = h('button', { type: 'button', class: 'tile' + (n > 1 ? ' multi multi-' + mode : ''), 'aria-label': `${(mine[0] && mine[0].alt) || cap || '사진'}${n > 1 ? ` 외 ${n - 1}장` : ''} 확대 보기` });
      if (masonry) { btn.style.aspectRatio = '3 / 2'; btn.classList.add('fixed'); }   // 썸네일은 항상 4:3 (CMS 사진 칸과 같은 모양이라, CMS에서 맞춘 위치가 그대로 보인다)
      btn.append(h('div', { class: 'poster-fallback', 'aria-hidden': 'true' }));
      const shown = mode === 'grid' ? mine.slice(0, 4) : mode === 'auto' ? mine : mine.slice(0, 1);
      const els = shown.map(m => media(m));
      shown.forEach((m, k) => { if (m.fx != null || m.fy != null) els[k].style.objectPosition = `${m.fx ?? 50}% ${m.fy ?? 50}%`; });   // 썸네일 칸에서 잘릴 때 보이게 할 부분 (CMS에서 사진을 끌어 맞춘 값)
      els.forEach((el, k) => { if (mode === 'auto') el.classList.add('shot', k ? 'off' : 'on', k ? 'over' : 'base'); });
      const unfix = () => {};
      if (mode === 'grid') { const gr = h('div', { class: 'mini mini-' + shown.length }); els.forEach(el => gr.append(el)); btn.append(gr); }
      else els.forEach(el => btn.append(el));
      if (mode !== 'grid' && els[0]) els[0].addEventListener(els[0].tagName === 'VIDEO' ? 'loadedmetadata' : 'load', unfix);
      
      if (mine[0] && has(mine[0].file) && isVideo(mine[0].file) && mode !== 'auto') btn.append(h('span', { class: 'vbadge', 'aria-hidden': 'true', text: '▶' }));
      if (n > 1 && mode !== 'auto') btn.append(h('span', { class: 'count', 'aria-hidden': 'true', text: n + '장' }));
      if (mode === 'auto') {
        let at = 0, hold = 0; btn.append(h('span', { class: 'count', 'aria-hidden': 'true', text: n + '장' }));
        const go = k => { els[at].classList.replace('on', 'off'); at = k; els[at].classList.replace('off', 'on'); };
        setTimeout(() => setInterval(() => { if (Date.now() > hold) go((at + 1) % els.length); }, 3000), (i % 4) * 700);
        btn._files = mine.map(m => m.file || '');
        btn._show = k => { hold = Date.now() + 60000; go(k); }; btn._release = () => { hold = 0; };   // CMS(미리보기)에서 이 사진을 만지는 동안은 자동 넘김을 멈추고 이 사진을 보여 준다
      }
      btn.addEventListener('click', () => { show(first[i]); dlg.showModal(); });
      return h('li', {}, btn, cap ? h('p', { class: 'cap-below', text: cap }) : null);   // 글은 사진 위가 아니라 아래에 둔다 (사진을 가리지 않게)
    }));
    return [list, dlg];
  }


  /* ---------- 방문 집계: 페이지를 열 때 1건, 떠날 때 머문 시간을 기록 (개인정보 없음, CMS "방문 집계"에서 본다) ---------- */
  let vEv = null;   // track() 가 켜질 때 채워진다 (화면을 그린 뒤라서 영상 쪽은 vSend 로 늦게 연결한다)
  const vSend = (e, x) => { if (vEv) vEv(e, x); };   // 방문 집계가 켜져 있을 때만 생기는 영상 이벤트 기록 함수
  function track() {
    if (window.parent !== window || !SB.url || navigator.webdriver || /^(localhost|127\.|\[::1\])/.test(location.hostname)) return;   // 미리보기·내 컴퓨터 시험은 세지 않는다
    const page = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index', work = page === 'watch' ? (params.get('id') || '').slice(0, 80) : '';
    const key = 'ft.pv.' + page + ':' + work;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch {}   // 같은 탭에서 새로고침해도 한 번만
    const rnd = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, '').slice(0, 24);
    let vid = ''; try { vid = localStorage.getItem('ft.vid') || ''; if (vid.length < 8) { vid = rnd(); localStorage.setItem('ft.vid', vid); } } catch {}   // 브라우저마다 다른 임의 번호(재방문 계산용)
    if (vid.length < 8) vid = 'anon' + String(Math.random()).slice(2, 12);
    let sid = ''; try { sid = sessionStorage.getItem('ft.sid') || ''; } catch {}
    const entry = !sid; if (!sid) { sid = rnd(); try { sessionStorage.setItem('ft.sid', sid); } catch {} }   // 탭을 연 뒤 첫 페이지인가(유입 경로 계산용)
    const pv = rnd(), ua = navigator.userAgent;
    const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : '기타';
    const device = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? '태블릿' : /Mobi|iPhone|Android/.test(ua) ? '휴대폰' : '컴퓨터';
    const browser = /KAKAOTALK/i.test(ua) ? '카카오톡 앱' : /NAVER\(inapp/i.test(ua) ? '네이버 앱' : /Instagram|FBAN|FBAV/i.test(ua) ? '인스타·페이스북 앱' : /Whale/.test(ua) ? '웨일' : /SamsungBrowser/.test(ua) ? '삼성 인터넷' : /Edg\//.test(ua) ? 'Edge' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : '기타';
    let referrer = ''; try { const u = new URL(document.referrer); if (u.hostname !== location.hostname) referrer = u.hostname.replace(/^www\./, ''); } catch {}   // 사이트 밖에서 온 경우만(도메인만 저장)
    let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
    const send = (o, fallback) => {   // 같은 사이트의 /api/track 이 나라·도시를 붙여 저장한다. 안 되면 Supabase 에 직접
      fetch('/api/track', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) })
        .then(r => { if (!r.ok && fallback) throw 0; })
        .catch(() => { if (fallback) fetch(SB.url + '/rest/v1/ourfamilymeta_pageviews', { method: 'POST', keepalive: true,
          headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ page: o.page, work: o.work || null, visitor: o.visitor }) }).catch(() => {}); });
    };
    const id = { page, work: work || null, visitor: vid, pv, session: sid };
    vEv = (event, extra) => send({ ...id, event, ...extra }, false);
    send({ ...id, event: 'view', entry, referrer, device, browser, os, lang: (navigator.language || '').slice(0, 20), tz, screen: innerWidth + 'x' + innerHeight }, true);
    let shown = 0, since = document.visibilityState === 'visible' ? performance.now() : 0;   // 화면에 실제로 보인 시간만 센다
    const flush = () => { if (since) { shown += performance.now() - since; since = 0; } const sec = Math.round(shown / 1000); if (sec >= 1) send({ ...id, event: 'leave', seconds: sec }, false); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else since = performance.now(); });
    addEventListener('pagehide', flush);
  }

  /* ---------- 헤더 / 푸터 ---------- */
  function header(site, av) {
    const shown = NAV.filter(([p]) => p === 'index.html' || av[{ 'works.html': 'works', 'making.html': 'making', 'album.html': 'album', 'about.html': 'about' }[p]]);
    const name = has(site.name) ? site.name : '우리 가족 극장';
    const burger = h('button', { type: 'button', class: 'burger', 'aria-expanded': 'false', 'aria-controls': 'nav', 'aria-label': '메뉴 열기' },
      h('span', { 'aria-hidden': 'true' }), h('span', { 'aria-hidden': 'true' }), h('span', { 'aria-hidden': 'true' }));
    const hd = h('header', { class: 'site-header', 'data-section': 'header' }, h('div', { class: 'wrap bar' },
      h('a', { class: 'brand', href: href('index.html') }, logoMark(site), h('span', { text: name })),
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
        h('a', { class: 'brand', href: href('index.html') }, logoMark(site), h('span', { text: has(site.name) ? site.name : '우리 가족 극장' })),
        has(site.footer) && h('p', { raw: true, text: site.footer })),
      info.length > 0 && h('dl', { class: 'foot-info' }, info),
      sns.length > 0 && h('ul', { class: 'foot-sns', 'aria-label': 'SNS' }, sns.map(s =>
        h('li', {}, h('a', { href: s.url.trim(), target: '_blank', rel: 'noopener noreferrer', text: has(s.label) ? s.label : new URL(s.url.trim()).hostname }))))));
  }

  /* ---------- 스크롤 등장 / 로딩 화면 / 페이지 전환 ---------- */
  function reveal() {
    const els = [...document.querySelectorAll('.reveal:not(.in)')];
    if (!('IntersectionObserver' in window)) return els.forEach(e => e.classList.add('in'));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .06 });
    els.forEach(e => io.observe(e));
  }

  const t0 = performance.now();
  let loader = null;
  // 처음 방문에도 로고가 바로 보이도록 지금 쓰는 로고를 기본값으로 박아 둔다. CMS에서 로고를 바꾸면 데이터를 읽은 뒤 자동으로 바뀌고, 이 값도 새 주소로 고쳐 두면 처음 방문부터 새 로고가 보인다.
  const DEFAULT_LOGO = 'img:https://pkucszwwnwpzvzqczmhh.supabase.co/storage/v1/object/public/ourfamilymeta-media/2026-11/mw0ba3m2gct8-file-1.png';
  let c = DEFAULT_LOGO; try { c = localStorage.getItem('ft.logo') || sessionStorage.getItem('ft.logo') || DEFAULT_LOGO; } catch {}
  let firstPage = true; try { firstPage = !sessionStorage.getItem('ft.seen'); sessionStorage.setItem('ft.seen', '1'); } catch {}   // 로딩 화면은 탭을 연 뒤 첫 페이지에서만 (메뉴를 옮길 때마다 뜨지 않게)
  const bar = h('i');
  let tick = 0;
  if (firstPage && !previewMode) {
    loader = h('div', { id: 'loader', 'aria-hidden': 'true' }, h('div', { class: 'ld-mark' }), h('div', { class: 'ld-bar' }, bar));
    paintLoaderLogo(c);
    document.body.append(loader);
    let pct = 6; tick = setInterval(() => { pct += (92 - pct) * .09; bar.style.width = pct + '%'; }, 90);   // 실제 진행률은 알 수 없어서 90%쪽으로 천천히 차오르다가, 다 불러오면 100%로 채운다
    bar.style.width = pct + '%';
  }
  function paintLoaderLogo(v) {   // 로딩 화면의 로고 자리를 채운다 (모르면 비워 둔다)
    const m = loader && loader.querySelector('.ld-mark'); if (!m || !v || m.dataset.v === v) return;   // 같은 로고면 다시 그리지 않는다 (깜빡임 방지)
    m.dataset.v = v;
    m.replaceChildren(v.startsWith('img:') ? h('img', { class: 'logo logo-img', src: v.slice(4), alt: '' }) : logoSvg(v));
  }
  function hideLoader() {
    if (!loader) return;
    const l = loader; loader = null;
    setTimeout(() => { clearInterval(tick); bar.style.width = '100%'; setTimeout(() => { l.classList.add('done'); setTimeout(() => l.remove(), 600); }, 260); }, Math.max(0, 700 - (performance.now() - t0)));
  }

  cursorFx(); tooltips();
  window.addEventListener('scroll', syncHeader, { passive: true });
  window.addEventListener('pageshow', () => document.body.classList.remove('leaving'));

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
    const hp = t.closest('[role="tabpanel"][hidden]'); if (hp) { const tb = document.getElementById(hp.getAttribute('aria-labelledby')); if (tb) tb.click(); }
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
      get('ourfamilymeta_settings?key=in.(site,album,worlds)&select=key,value'),
      get('ourfamilymeta_series?select=id,title,summary,status,poster_path,solo,common&order=sort_order,created_at'),
      get('ourfamilymeta_works?select=slug,kind,title,series_id,episode_no,content&order=sort_order,created_at')]);
    const siteRow = st.find(r => r.key === 'site'), albumRow = st.find(r => r.key === 'album');   // 비하인드 컷은 편집자도 고칠 수 있게 따로 저장한다(없으면 site 안의 예전 값)
    if (!siteRow && !albumRow && !wk.length) return null;
    const d = { ...obj(siteRow && siteRow.value) };
    if (albumRow) d.album = obj(albumRow.value);
    d.series = ser.map(x => ({ id: x.id, title: x.title, summary: x.summary || '', status: x.status, poster: x.poster_path || '', logo: obj(x.common).logo || '', logoX: obj(x.common).logoX || '', logoY: obj(x.common).logoY || '', logoW: obj(x.common).logoW || '', solo: !!x.solo, common: obj(x.common) }));
    d.works = wk.map(x => ({ ...obj(x.content), kind: obj(x.content).kind === 'app' ? 'app' : x.kind, id: x.slug || obj(x.content).id, title: has(obj(x.content).title) ? obj(x.content).title : (x.title && x.title !== x.slug ? x.title : ''),
      series: x.series_id || '', episode: x.episode_no ? String(x.episode_no) : '' }));
    const worldsRow = st.find(r => r.key === 'worlds');   // 같은 세계관 연결은 따로 모아 저장한다(행이 없으면 예전처럼 작품 안의 related를 쓴다)
    if (worldsRow) d.works.forEach(w => { w.related = arr(obj(obj(worldsRow.value).related)[w.id]); });
    return d;
  }

  /* ---------- 제작 기록 합치기 ----------
     연재물 공통 제작 정보(series.common) + 이 회차에서 추가한 것(작품의 process·tools·roles·sources)을 합친다.
     CMS 미리보기와 공개 상영관이 이 함수 하나를 같이 쓰므로 두 화면의 결과가 달라질 수 없다.
     - 단독 작품(solo 연재물): 연재물의 공통 정보가 곧 그 작품의 제작 기록이다. 비어 있으면 작품에 직접 적힌 값을 쓴다.
     - 연재 회차: 기본은 "공통 + 회차 추가분". 회차가 useCommon === false면 공통 정보는 무시하고 회차 자체 정보만 쓴다.
     - 중복 판단: 단계는 이름+설명, 도구는 이름, 프롬프트는 문장, 출처는 항목+출처(공백·대소문자·한글 정규화 후 같으면 같은 것)이다. 먼저 나온 것을 남긴다. */
  const norm = s => String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  const uniqBy = (list, key) => { const seen = new Set(); return list.filter(x => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); };
  const prodOf = o => { o = obj(o); return { process: arr(o.process), tools: arr(o.tools), roles: obj(o.roles), sources: arr(o.sources) }; };
  const srcRow = s => has(obj(s).item) || has(obj(s).source) || has(obj(s).license);
  const prodHas = p => p.process.some(x => has(obj(x).title) || has(obj(x).desc)) || toolList(p.tools).length
    || arr(p.roles.ai).some(has) || arr(p.roles.human).some(has) || p.sources.some(srcRow);
  const srcKey = s => [obj(s).item, obj(s).source].map(norm).join('|') === '|' ? 'lic:' + norm(obj(s).license) : [obj(s).item, obj(s).source].map(norm).join('|');
  function mergeTools(a, b) {
    const out = [], idx = new Map();
    [...toolList(a), ...toolList(b)].forEach(t => {
      const k = norm(t.name), prompts = arr(t.prompts).filter(p => has(p.text));
      if (k && idx.has(k)) {
        const cur = idx.get(k);
        cur.prompts = uniqBy([...cur.prompts, ...prompts], p => norm(p.text));
        if (!has(cur.purpose) && has(t.purpose)) cur.purpose = t.purpose;
        return;
      }
      const c = { ...t, prompts: uniqBy(prompts, p => norm(p.text)) };
      out.push(c); if (k) idx.set(k, c);
    });
    return out;
  }
  function production(w, d) {
    w = obj(w);
    const own = prodOf(w), ser = has(w.series) ? arr(obj(d).series).find(x => x && x.id === w.series) : null;
    if (!ser) return own;
    const cm = prodOf(ser.common);
    if (ser.solo) return prodHas(cm) ? cm : own;
    if (w.useCommon === false) return own;
    return {
      process: uniqBy([...cm.process, ...own.process].filter(p => has(obj(p).title) || has(obj(p).desc)), p => norm(obj(p).title) + '|' + norm(obj(p).desc)),
      tools: mergeTools(cm.tools, own.tools),
      roles: { ai: uniqBy([...arr(cm.roles.ai), ...arr(own.roles.ai)].filter(has), norm), human: uniqBy([...arr(cm.roles.human), ...arr(own.roles.human)].filter(has), norm) },
      sources: uniqBy([...cm.sources, ...own.sources].filter(srcRow), srcKey)
    };
  }

  /** 같은 세계관 작품: 작품의 related(작품 id 목록)를 연재물 단위로 풀어 양쪽에서 보이게 한다 (한쪽에만 적어도 서로 보인다) */
  function relatedOf(w, d) {
    const ws = arr(d.works), ser = new Set(arr(d.series).filter(x => x && !x.solo).map(x => x.id));
    const key = x => has(x.series) && ser.has(x.series) ? 's:' + x.series : 'w:' + x.id, me = key(w), set = new Set();
    ws.forEach(a => arr(a.related).forEach(id => { const b = ws.find(x => x && x.id === id); if (!b) return;
      const ka = key(a), kb = key(b); if (ka === me && kb !== me) set.add(kb); if (kb === me && ka !== me) set.add(ka); }));
    return listing(d).filter(o => set.has(has(o.seriesId) ? 's:' + o.seriesId : 'w:' + o.id));
  }
  /** 목록용: 단독 작품은 그대로, 연재물은 시리즈 하나로 묶어 첫 회로 연결한다 (solo 연재물은 연재물로 보이지 않는다) */
  // 같은 도구가 철자·언어·묶음 표기만 달라 여러 번 보이지 않도록 대표 이름으로 합쳐 모은다 (메이킹 페이지 '사용한 AI 도구')
  function toolNames(d) {
      const ALIAS = [[/claudecode/, 'Claude Code'], [/claude|클로드/, 'Claude'], [/chatgpt|챗gpt/, 'ChatGPT'], [/flow|플로우/, 'Google Flow'], [/vids|비즈/, 'Google Vids'],
        [/제미나이|gemini/, 'Gemini'], [/나노바나나|nanobanana/, 'Nano Banana'], [/러버블|lovable/, 'Lovable'], [/capcut|캡컷/, 'CapCut'], [/ffmpeg/, 'FFmpeg'],
        [/clipchamp|클립챔프/, 'Microsoft Clipchamp'], [/suno|수노/, 'Suno'], [/supabase/, 'Supabase'], [/vercel/, 'Vercel'], [/github|깃허브/, 'GitHub'], [/higgsfield/, 'Higgsfield']];
      const canon = raw => { let s = raw.toLowerCase().replace(/\s+/g, ''), out = []; ALIAS.forEach(([re, n]) => { if (re.test(s)) { out.push(n); s = s.replace(re, ' '); } }); return out.length ? out : [raw]; };
      const names = [...new Set([...toolList(obj(d.making).tools), ...listing(d).flatMap(w => toolList(production(w, d).tools))].flatMap(t => canon((t.name || '').trim())).filter(Boolean))];
    return names;
  }
  function listing(d) {
    const ws = arr(d.works).filter(w => w && (has(w.id) || has(w.title)));
    const ser = new Map(arr(d.series).filter(x => x && !x.solo).map(x => [x.id, x]));
    const seen = new Set(), out = [];
    ws.forEach(w => {
      const x = has(w.series) ? ser.get(w.series) : null;
      if (!x) { out.push(w); return; }
      if (seen.has(x.id)) return;
      seen.add(x.id);
      const eps = ws.filter(e => e.series === x.id).sort((a, b) => (+a.episode || 0) - (+b.episode || 0)), first = eps[0];
      out.push({ ...first, title: x.title, tagline: has(x.summary) ? x.summary : first.tagline,
        video: { ...obj(first.video), poster: has(x.poster) ? x.poster : obj(first.video).poster, duration: '', logo: x.logo, logoX: x.logoX, logoY: x.logoY, logoW: x.logoW },   // 연재물 로고는 연재물 정보에서 올린 것
        seriesId: x.id, episodeCount: eps.length, seriesStatus: x.status });
    });
    return out;
  }
  /** 목록 카드의 작은 글줄: 연재물은 "N화까지 공개", 단독 작품은 러닝타임 */
  const credit = w => has(w.creator) ? '© ' + w.creator.trim() : '';
  const metaLine0 = w => w.episodeCount ? `${w.episodeCount}화까지 공개 · ${w.seriesStatus === 'completed' ? '완결' : '연재 중'}`
    : has(w.video && w.video.duration) ? '러닝타임 ' + w.video.duration.trim() : '';
  const metaLine = w => [metaLine0(w), credit(w)].filter(Boolean).join(' · ');

  async function load(app, render) {
    const run = d => { const y = window.scrollY; render(d); reveal(); window.scrollTo(0, y); syncHeader(); hideLoader(); if (previewMode) applyHl(false); };
    if (previewMode) {
      document.body.classList.add('is-preview');
      document.body.prepend(h('div', { class: 'preview-bar', text: '미리보기 – 관리 페이지에 입력한 내용이 실시간으로 반영됩니다' }));
      window.addEventListener('message', e => {
        if (e.source !== host || !e.data) return;
        if (e.data.type === 'content') run(e.data.data);
        else if (e.data.type === 'show-photo' && !e.data.file) document.querySelectorAll('.tile').forEach(b => b._release && b._release());   // 마우스가 사진 칸을 벗어나면 자동 넘김 다시 시작
        else if (e.data.type === 'show-photo') {   // 관리 페이지에서 만지고 있는 사진을 썸네일에 바로 보여 준다
          const t = [...document.querySelectorAll('.tile')].find(b => b._files && b._files.includes(e.data.file));
          host.postMessage({ type: 'show-photo-ack', found: !!t, index: t ? t._files.indexOf(e.data.file) : -1, tiles: document.querySelectorAll('.tile').length }, '*');
          if (t) { t._show(t._files.indexOf(e.data.file)); window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - innerHeight / 2 + t.offsetHeight / 2, behavior: 'smooth' }); /* 미리보기 창 안에서만 스크롤: CMS 화면은 밀리지 않게 */ }
        }
        else if (e.data.type === 'highlight') { hlSection = e.data.section || null; applyHl(true); }   // 관리 페이지가 지금 입력 중인 구역을 알려 준다
      });
      host.postMessage({ type: 'preview-ready' }, '*');
      return;
    }
    let shown = '';   // 직전 방문 때 읽어 둔 내용이 있으면 바로 그리고, 뒤에서 최신 내용을 확인해 달라졌을 때만 다시 그린다 (메뉴 이동이 즉시 보이게)
    try { shown = sessionStorage.getItem('ft.data') || ''; if (shown) run(JSON.parse(shown)); } catch { shown = ''; }
    try {
      let d = null;
      try { d = await fromDb(); } catch (e) { console.warn('DB를 읽지 못해 content.json을 씁니다:', e.message); }
      if (!d) {
        const r = await fetch('content.json', { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        d = await r.json();
      }
      const now = JSON.stringify(d);
      try { sessionStorage.setItem('ft.data', now); } catch {}
      if (now !== shown) run(d);
    } catch (e) { if (!shown) showError(app, 'content.json을 읽는 중 문제가 생겼어요. (' + e.message + ')'); }
  }

  /** 모든 페이지 공통 골격: build(data, site, av)가 { title, main }을 돌려주면 헤더·푸터를 붙여 그린다. */
  /** 홈 첫 화면 "사진"(hero.image)을 모든 페이지의 뒷배경으로 깐다. 사진이 없거나 못 불러오면 기본 배경 그대로 */
  function siteBg(hr) {
    if (!has(hr.image) || document.querySelector('.site-bg')) return;
    const src = mediaPath(hr.image), probe = new Image();
    probe.onload = () => { const e = h('div', { class: 'site-bg', 'aria-hidden': 'true' }); e.style.backgroundImage = `url("${src}")`; document.body.prepend(e); };
    probe.src = src;
  }

  /** 가로로 이어지는 목록: 스크롤바 대신 좌우 화살표로 넘긴다 (터치·트랙패드 스와이프도 그대로). 끝에 닿으면 반대쪽 끝으로 돌아간다. 한 화면에 다 들어가면 화살표를 숨긴다 */
  function rail(list) {
    const btn = (dir, label) => h('button', { type: 'button', class: 'rail-btn ' + dir, 'aria-label': label, text: dir === 'prev' ? '‹' : '›' });
    const prev = btn('prev', '이전 작품 보기'), next = btn('next', '다음 작품 보기');
    const max = () => list.scrollWidth - list.clientWidth;
    const sync = () => { prev.hidden = next.hidden = max() <= 6; };
    const go = s => () => {
      const x = list.scrollLeft, to = s > 0 && x >= max() - 6 ? 0 : s < 0 && x <= 6 ? max() : x + s * Math.max(120, Math.round(list.clientWidth * .8));   // 끝이면 반대쪽 끝으로
      list.scrollTo({ left: to, behavior: 'smooth' });
    };
    prev.addEventListener('click', go(-1)); next.addEventListener('click', go(1));
    if (window.ResizeObserver) { const ro = new ResizeObserver(sync); ro.observe(list); [...list.children].forEach(c => ro.observe(c)); } else window.addEventListener('resize', sync);   // 포스터가 뜨며 폭이 바뀌어도 따라간다
    window.addEventListener('load', sync); list.addEventListener('scroll', sync, { passive: true });
    sync();
    return h('div', { class: 'rail' }, prev, list, next);
  }


  let tracked = false;
  function boot(build) {
    const app = document.getElementById('app');
    load(app, d => {
      d = obj(d);
      const site = obj(d.site), av = avail(d);
      setCursor(siteCursor(site));   // 기본은 홈 모양. 상영관은 작품 모양으로 다시 정한다
      const r = build(d, site, av);
      document.title = r.title;
      setFavicon(site);
      siteBg(obj(d.hero));
      { const lg = has(site.logoImage) ? 'img:' + mediaPath(site.logoImage) : markText(site); try { sessionStorage.setItem('ft.logo', lg); localStorage.setItem('ft.logo', lg); } catch {} paintLoaderLogo(lg); }
      const frag = document.createDocumentFragment();
      frag.append(header(site, av), r.main, footer(site));
      app.replaceChildren(frag);
      if (!tracked) { tracked = true; track(); }
    });
  }

  window.App = { kindOf, kindPill, dlLink, h, has, arr, obj, filled, href, mediaPath, workId, watchHref, poster, buildVideo, safeUrl, linkify, listing, relatedOf, metaLine, credit, production, copyText, mediaStatus, frameStatus, isVideo, cursorSpec, siteCursor, setCursor: sp => setCursor(sp), TITLES, avail,
    section, pagehead, emptyPage, timeline, tools, toolList, toolNames, roles, sourcesTable, gallery, rail, boot, params };
})();
