/* 방문 기록 중계: 브라우저가 보낸 값에 Vercel 이 알려 주는 나라·도시(IP 자체는 저장하지 않음)를 붙여 Supabase 에 넣는다.
   비밀 키는 쓰지 않는다 — 공개용(publishable) 키로 "기록 추가"만 가능한 표에 넣을 뿐이다. */
const URL_ = 'https://pkucszwwnwpzvzqczmhh.supabase.co/rest/v1/ourfamilymeta_pageviews';
const KEY = 'sb_publishable_ipfRTlcNU5mwSkgqcAKjmg_i8H0pM94';
const cut = (v, n) => (v == null || v === '' ? null : String(v).slice(0, n));
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (/bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i.test(req.headers['user-agent'] || '')) return res.status(204).end();
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  let city = null; try { city = req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : null; } catch {}
  const row = {
    event: b.event === 'leave' ? 'leave' : 'view', page: cut(b.page, 80), work: cut(b.work, 80), visitor: cut(b.visitor, 40),
    pv: cut(b.pv, 40), session: cut(b.session, 40), entry: b.entry === true, seconds: Number.isFinite(+b.seconds) ? Math.max(0, Math.min(86400, Math.round(+b.seconds))) : null,
    referrer: cut(b.referrer, 100), device: cut(b.device, 20), browser: cut(b.browser, 30), os: cut(b.os, 30), lang: cut(b.lang, 20), tz: cut(b.tz, 40), screen: cut(b.screen, 20),
    country: cut(req.headers['x-vercel-ip-country'], 10), city: cut(city, 60),
  };
  if (!row.page || !row.visitor || row.visitor.length < 8) return res.status(400).end();
  try {
    const r = await fetch(URL_, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) });
    return res.status(r.ok ? 204 : 502).end();
  } catch { return res.status(502).end(); }
};
