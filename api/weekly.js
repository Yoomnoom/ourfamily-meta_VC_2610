/* 매일 아침 자동 실행(Vercel Cron, vercel.json): 2026-12-31 까지는 매일 어제 하루, 2027-01-01 부터는 월요일에만 지난 한 주(첫 주는 1/1~1/3) 방문 요약을
   Supabase 에서 받아 Notion "방문집계"에 새 줄(간단요약 + 상세)을 만든다.
   필요한 환경변수(코드에 값을 넣지 않는다): CRON_SECRET, WEEKLY_SECRET, NOTION_TOKEN, NOTION_DATABASE_ID
   (WEEKLY_SECRET = Supabase 표 ourfamilymeta_cron_secret 의 secret 값) */
const SB = 'https://pkucszwwnwpzvzqczmhh.supabase.co', KEY = 'sb_publishable_ipfRTlcNU5mwSkgqcAKjmg_i8H0pM94';
const NAMES = { index: '홈', works: '상영작', watch: '상영관', making: '메이킹', album: '비하인드 컷', about: '소개' };
const DAILY_UNTIL = '2026-12-31', WEEKLY_FROM = '2027-01-01', DOW = '일월화수목금토';
const iso = d => d.toISOString().slice(0, 10);
const n = v => Number(v || 0).toLocaleString('ko-KR');
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const secs = v => v == null ? '—' : v >= 60 ? `${Math.floor(v / 60)}분 ${v % 60}초` : `${v}초`;
const delta = (a, b) => b ? (a >= b ? '+' : '') + Math.round((a - b) / b * 100) + '%' : (a ? '새로 생김' : '—');
const txt = (c, bold) => ({ type: 'text', text: { content: String(c).slice(0, 1900) }, annotations: bold ? { bold: true } : undefined });
const para = (...rt) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: rt } });
const bullet = c => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [txt(c)] } });
const h2 = c => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [txt(c)] } });

/* 상세 구역: 방문 흐름 · 날짜별 · 페이지별 · 방문자 특성 · 해석 주의. 2차 SQL(ourfamilymeta_weekly_summary_v2.sql)을 실행하기 전에는 새 항목이 없어 있는 것만 보여 준다. */
const bar = (a, b) => '█'.repeat(Math.max(a ? 1 : 0, Math.round(pct(a, b) / 5))) || '';
const row = cells => ({ object: 'block', type: 'table_row', table_row: { cells: cells.map(c => [txt(c)]) } });
const table = (head, rows) => ({ object: 'block', type: 'table', table: { table_width: head.length, has_column_header: true, children: [row(head), ...rows.map(r => row(r.map(String)))] } });
const kv = (list, total, empty = '—') => (list || []).map(x => `${x.k || '알 수 없음'} ${pct(x.n, total)}%`).join(' · ') || empty;
const pname = (p, w, titles) => p === 'watch' && w ? (titles[w] || '상영관 ' + w.slice(0, 12)) : NAMES[p] || p;
function detail(s, titles, one) {
  const out = [h2('상세')], F = s.funnel, S = s.sessions;
  out.push(bullet(`처음 온 방문자 ${n(s.new_visitors)}명 · 재방문자 ${n(s.returning_visitors)}명 · 방문(세션) ${n(S)}번 · 방문당 평균 ${s.avg_pages || '—'}페이지`));
  if (F) {
    out.push(h2('방문 흐름 (세션 ' + n(S) + ')'));
    out.push(table(['단계', '수', '비율', ''], [['홈을 봄', F.home], ['상영작 목록', F.works], ['상영관(작품)', F.watch], ['영상 재생', F.play]].map(([k, v]) => [k, v, pct(v, S) + '%', bar(v, S)])));
    const dp = {}; (s.depth || []).forEach(d => dp[d.k] = d.n);
    out.push(bullet('본 페이지 수: ' + [1, 2, 3, 4, 5].map(k => `${k}${k === 5 ? '+' : ''}페이지 ${pct(dp[k], S)}%`).join(', ')));
    if ((s.entry_pages || []).length) out.push(bullet('처음 들어온 페이지: ' + s.entry_pages.map(p => `${pname(p.page, p.work, titles)} ${p.n}`).join(', ')));
  }
  if (!one && (s.daily || []).length) {
    const mx = Math.max(...s.daily.map(d => d.views));
    out.push(h2('날짜별'));
    out.push(table(['날짜', '방문', '방문자', ''], s.daily.map(d => [d.d.slice(5).replace('-', '/') + ' (' + DOW[new Date(d.d + 'T00:00:00Z').getUTCDay()] + ')', d.views, d.visitors, bar(d.views, mx)])));
  }
  if ((s.pages || []).length) {
    out.push(h2('페이지별'));
    out.push(table(['페이지', '방문', '방문자', '평균 머문'], s.pages.map(p => [pname(p.page, p.work, titles), p.views, p.visitors, secs(p.avg_secs)])));
  }
  out.push(h2('방문자 특성'));
  out.push(bullet('기기: ' + kv(s.devices, s.views)));
  if (s.browsers) out.push(bullet('브라우저: ' + kv(s.browsers, s.views)));
  if (s.oses) out.push(bullet('OS: ' + kv(s.oses, s.views)));
  if (s.referrers) out.push(bullet('유입: ' + kv(s.referrers, s.views)));
  out.push(bullet('국가: ' + kv(s.countries, s.views) + ((s.cities || []).length ? ' / 도시: ' + kv(s.cities, s.views) : '')));
  if (s.suspect_views != null) {
    out.push(h2('자동 접속 의심'));
    out.push(bullet(`해외 접속이거나 Linux 컴퓨터로 들어온 방문 ${n(s.suspect_views)}번 (전체 ${pct(s.suspect_views, s.views)}%). 데이터센터에서 오는 봇·점검 도구일 가능성이 높아요. 1페이지만 보고 몇 초 만에 나갔다면 사람이 아닐 가능성이 더 커요.`));
    if ((s.suspects || []).length) out.push(table(['시각', '페이지', '위치', 'OS·브라우저', '본 페이지', '머문 시간'],
      s.suspects.map(x => [x.t, pname(x.page, x.work, titles), [x.city, x.country].filter(Boolean).join(' · ') || '—', [x.os, x.browser].filter(Boolean).join(' · ') || '—', x.pages + '쪽', secs(x.secs)])));
  }
  out.push(h2('해석 주의'));
  out.push(bullet('유입이 CMS 관리 페이지(사이트에서 보기)로 잡힌 방문은 팀원 본인 방문일 가능성이 높아요. 방문자 수에는 제작 참여자가 많이 섞여 있을 수 있어요.'));
  out.push(bullet('머문 시간은 페이지를 떠날 때 보낸 기록이라, 탭을 그냥 닫거나 기록이 끊기면 비어 있어요.'));
  out.push(bullet('방문이 0이면 방문이 없었거나 기록이 끊겼을 수 있으니 CMS 방문 집계와 함께 확인하세요. 이 보고서는 자동으로 만들어져 해석 문장은 없어요.'));
  return out;
}

module.exports = async (req, res) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET) return res.status(401).end();
  const { WEEKLY_SECRET, NOTION_TOKEN, NOTION_DATABASE_ID } = process.env;
  if (!WEEKLY_SECRET || !NOTION_TOKEN || !NOTION_DATABASE_ID) return res.status(500).json({ error: 'env missing' });
  try {
    const kst = new Date(Date.now() + 9 * 36e5), day = x => iso(new Date(+kst - x * 864e5));   // 한국 날짜 기준, x일 전
    let from = req.query && req.query.week, to = (req.query && req.query.end) || null;          // 시험용: ?week=시작&end=끝
    if (!from) {
      if (day(1) <= DAILY_UNTIL) from = to = day(1);
      else if (kst.getUTCDay() === 1) { from = day(7) < WEEKLY_FROM ? WEEKLY_FROM : day(7); to = day(1); }
      else return res.status(200).json({ skipped: 'not a report day' });
    }
    const q = await fetch(SB + '/rest/v1/rpc/ourfamilymeta_weekly_summary', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret: WEEKLY_SECRET, p_week: from, p_end: to }) });
    if (!q.ok) return res.status(502).json({ error: 'supabase ' + q.status });
    const s = await q.json();
    const titles = {};   // 작품 번호 → 작품 제목 (표에 번호 대신 제목을 보여 주려고, 실패해도 보고서는 만든다)
    try { (await (await fetch(SB + '/rest/v1/ourfamilymeta_works?select=slug,title', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })).json()).forEach(w => { if (w.slug) titles[w.slug] = String(w.title || '').replace(/^\[연재\]\s*/, ''); }); } catch (e) {}
    const nh = { Authorization: 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
    const dup = await (await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, { method: 'POST', headers: nh,
      body: JSON.stringify({ filter: { property: '주 시작(월)', date: { equals: s.week_start } }, page_size: 1 }) })).json();
    if (dup.results && dup.results.length) return res.status(200).json({ skipped: 'already exists', week: s.week_start });

    const one = s.week_start === s.week_end, bounce = pct(s.bounce_sessions, s.sessions), vs = one ? '전날' : '지난주';
    const d5 = s.week_start.slice(5).replace('-', '/') + '~' + s.week_end.slice(5).replace('-', '/');
    const title = one ? `${s.week_start} (${DOW[new Date(s.week_start + 'T00:00:00Z').getUTCDay()]})` : `${s.week_start} 주 (${d5})`;
    const col = (k, v) => ({ object: 'block', type: 'column', column: { children: [para(txt(k, true)), para(txt(v))] } });
    const body = {
      parent: { database_id: NOTION_DATABASE_ID }, icon: { type: 'emoji', emoji: '📅' },
      properties: {
        '보고서': { title: [txt(title)] }, '주 시작(월)': one ? { date: { start: s.week_start } } : { date: { start: s.week_start, end: s.week_end } },   // 한 주는 시작~끝 범위로 넣어 캘린더에서 막대로 보인다
        '월': { select: { name: s.week_start.slice(0, 7) } },
        '방문': { number: s.views }, '방문자': { number: s.visitors }, '신규방문자': { number: s.new_visitors }, '세션': { number: s.sessions },
        '머문시간(초)': { number: s.avg_page_secs || 0 }, '영상 재생': { number: s.plays }, '이탈률(%)': { number: bounce },
        '메모': { rich_text: [txt(one ? '자동 생성 (매일)' : '자동 생성 (매주 월요일)')] },
      },
      children: [
        h2('간단요약'),
        { object: 'block', type: 'column_list', column_list: { children: [col('방문', n(s.views)), col('방문자', n(s.visitors)), col('재방문자', `${n(s.returning_visitors)}명`),
          col('평균 머문 시간', secs(s.avg_page_secs)), col('한 페이지만 보고 나감', bounce + '%')] } },
        bullet(`${vs} 대비: 방문 ${delta(s.views, s.prev_views)}, 방문자 ${delta(s.visitors, s.prev_visitors)}`),
        bullet('가장 많이 본 곳: ' + ((s.top_pages || []).map(p => `${pname(p.page, p.work, titles)} ${p.views}`).join(' · ') || '—')),
        bullet('기기: ' + ((s.devices || []).map(d => `${d.k} ${pct(d.n, s.views)}%`).join(' · ') || '—')),
        bullet(`영상: 재생 ${n(s.plays)}번, 끝까지 ${n(s.ends)}번 (${pct(s.ends, s.plays)}%), 평균 시청 ${secs(s.avg_watch_secs)}`),
        ...detail(s, titles, one),
      ],
    };
    const r = await fetch('https://api.notion.com/v1/pages', { method: 'POST', headers: nh, body: JSON.stringify(body) });
    if (!r.ok) return res.status(502).json({ error: 'notion ' + r.status, detail: (await r.text()).slice(0, 300) });
    return res.status(200).json({ created: s.week_start, to: s.week_end });
  } catch (e) { return res.status(500).json({ error: String(e.message || e).slice(0, 200) }); }
};
