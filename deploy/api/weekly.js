/* 매주 월요일 아침 자동 실행(Vercel Cron, vercel.json): 지난 한 주 방문 요약을 Supabase 에서 받아 Notion "주별 기록"에 새 줄(간단요약 + 상세)을 만든다.
   필요한 환경변수(코드에 값을 넣지 않는다): CRON_SECRET, WEEKLY_SECRET, NOTION_TOKEN, NOTION_DATABASE_ID
   (WEEKLY_SECRET = Supabase 표 ourfamilymeta_cron_secret 의 secret 값) */
const SB = 'https://pkucszwwnwpzvzqczmhh.supabase.co', KEY = 'sb_publishable_ipfRTlcNU5mwSkgqcAKjmg_i8H0pM94';
const NAMES = { index: '홈', works: '상영작', watch: '상영관', making: '메이킹', album: '비하인드 컷', about: '소개' };
const n = v => Number(v || 0).toLocaleString('ko-KR');
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const secs = v => v == null ? '—' : v >= 60 ? `${Math.floor(v / 60)}분 ${v % 60}초` : `${v}초`;
const delta = (a, b) => b ? (a >= b ? '+' : '') + Math.round((a - b) / b * 100) + '%' : (a ? '새로 생김' : '—');
const txt = (c, bold) => ({ type: 'text', text: { content: String(c).slice(0, 1900) }, annotations: bold ? { bold: true } : undefined });
const para = (...rt) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: rt } });
const bullet = c => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [txt(c)] } });
const h2 = c => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [txt(c)] } });

module.exports = async (req, res) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET) return res.status(401).end();
  const { WEEKLY_SECRET, NOTION_TOKEN, NOTION_DATABASE_ID } = process.env;
  if (!WEEKLY_SECRET || !NOTION_TOKEN || !NOTION_DATABASE_ID) return res.status(500).json({ error: 'env missing' });
  try {
    const q = await fetch(SB + '/rest/v1/rpc/ourfamilymeta_weekly_summary', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret: WEEKLY_SECRET, p_week: (req.query && req.query.week) || null }) });
    if (!q.ok) return res.status(502).json({ error: 'supabase ' + q.status });
    const s = await q.json();
    const nh = { Authorization: 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
    const dup = await (await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, { method: 'POST', headers: nh,
      body: JSON.stringify({ filter: { property: '주 시작(월)', date: { equals: s.week_start } }, page_size: 1 }) })).json();
    if (dup.results && dup.results.length) return res.status(200).json({ skipped: 'already exists', week: s.week_start });

    const bounce = pct(s.bounce_sessions, s.sessions), d5 = s.week_start.slice(5).replace('-', '/') + '~' + s.week_end.slice(5).replace('-', '/');
    const col = (k, v) => ({ object: 'block', type: 'column', column: { children: [para(txt(k, true)), para(txt(v))] } });
    const body = {
      parent: { database_id: NOTION_DATABASE_ID }, icon: { type: 'emoji', emoji: '📅' },
      properties: {
        '보고서': { title: [txt(`${s.week_start} 주 (${d5})`)] }, '주 시작(월)': { date: { start: s.week_start } },
        '방문': { number: s.views }, '방문자': { number: s.visitors }, '처음 온 방문자': { number: s.new_visitors }, '세션': { number: s.sessions },
        '평균 머문 시간(초)': { number: s.avg_page_secs || 0 }, '영상 재생': { number: s.plays }, '한 페이지만 보고 나감(%)': { number: bounce },
        '메모': { rich_text: [txt('자동 생성 (매주 월요일)')] },
      },
      children: [
        h2('간단요약'),
        { object: 'block', type: 'column_list', column_list: { children: [col('방문', n(s.views)), col('방문자', n(s.visitors)), col('재방문자', `${n(s.returning_visitors)}명`),
          col('평균 머문 시간', secs(s.avg_page_secs)), col('한 페이지만 보고 나감', bounce + '%')] } },
        bullet(`지난주 대비: 방문 ${delta(s.views, s.prev_views)}, 방문자 ${delta(s.visitors, s.prev_visitors)}`),
        bullet('가장 많이 본 곳: ' + ((s.top_pages || []).map(p => `${p.page === 'watch' && p.work ? '상영관 ' + p.work.slice(0, 12) : NAMES[p.page] || p.page} ${p.views}`).join(' · ') || '—')),
        bullet('기기: ' + ((s.devices || []).map(d => `${d.k} ${pct(d.n, s.views)}%`).join(' · ') || '—')),
        bullet(`영상: 재생 ${n(s.plays)}번, 끝까지 ${n(s.ends)}번 (${pct(s.ends, s.plays)}%), 평균 시청 ${secs(s.avg_watch_secs)}`),
        h2('상세'),
        bullet(`처음 온 방문자 ${n(s.new_visitors)}명 · 재방문자 ${n(s.returning_visitors)}명 · 방문(세션) ${n(s.sessions)}번 · 방문당 평균 ${s.avg_pages || '—'}페이지`),
        bullet('국가: ' + ((s.countries || []).map(c => `${c.k || '알 수 없음'} ${c.n}`).join(' · ') || '—')),
        bullet('방문 집계는 CMS ⋯ 메뉴의 "방문 집계"에서 더 자세히 볼 수 있어요. 이 줄은 자동으로 만들어졌고 해석 문장은 없어요.'),
      ],
    };
    const r = await fetch('https://api.notion.com/v1/pages', { method: 'POST', headers: nh, body: JSON.stringify(body) });
    if (!r.ok) return res.status(502).json({ error: 'notion ' + r.status, detail: (await r.text()).slice(0, 300) });
    return res.status(200).json({ created: s.week_start });
  } catch (e) { return res.status(500).json({ error: String(e.message || e).slice(0, 200) }); }
};
