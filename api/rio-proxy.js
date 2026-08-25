const ALLOWED_PATHS = new Set(['live/id', 'nivel', 'nivel/atual', 'nivel/historico']);
export default async function handler(req, res) {
  const path = String(req.query.path || '').replace(/^\/+/, '');
  if (!ALLOWED_PATHS.has(path)) return res.status(400).json({ error: 'Caminho não permitido' });
  try {
    const response = await fetch(`http://rio.parobe.rs.gov.br:3008/${path}`, { signal: AbortSignal.timeout(8000) });
    const body = await response.text();
    res.setHeader('Cache-Control', path === 'live/id' ? 's-maxage=60, stale-while-revalidate=300' : 's-maxage=300, stale-while-revalidate=900');
    res.status(response.status).setHeader('Content-Type', response.headers.get('content-type') || 'application/json').send(body);
  } catch { res.status(502).json({ error: 'Serviço municipal temporariamente indisponível' }); }
}
