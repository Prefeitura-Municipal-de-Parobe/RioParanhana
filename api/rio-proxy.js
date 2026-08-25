export default async function handler(req, res) {
  const endpoint = String(req.query.path || '').replace(/^\/+/, '');
  if (!endpoint) return res.status(400).json({ error: 'Parâmetro path obrigatório' });
  if (!/^[a-zA-Z0-9/_?=&.%:-]+$/.test(endpoint)) return res.status(400).json({ error: 'Path inválido' });
  const upstream = `http://apirio.parobe.rs.gov.br:3008/${endpoint}`;
  try {
    const response = await fetch(upstream, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
    const text = await response.text();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!response.ok) return res.status(response.status).json({ error: 'API municipal respondeu com erro', status: response.status });
    try { return res.status(200).json(JSON.parse(text)); }
    catch { return res.status(502).json({ error: 'Resposta da API municipal não é JSON' }); }
  } catch (error) {
    console.error('[rio-proxy]', error);
    return res.status(500).json({ error: 'Erro ao comunicar com o servidor da Prefeitura' });
  }
}
