export default async function handler(req, res) {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return res.status(503).json({ configured: false, error: 'Integração do X não configurada' });
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const userResponse = await fetch('https://api.x.com/2/users/by/username/DefesaCivilRS', { headers, signal: AbortSignal.timeout(8000) });
    if (!userResponse.ok) throw new Error('Perfil indisponível');
    const user = await userResponse.json();
    const postsResponse = await fetch(`https://api.x.com/2/users/${user.data.id}/tweets?max_results=5&exclude=retweets,replies&tweet.fields=created_at`, { headers, signal: AbortSignal.timeout(8000) });
    if (!postsResponse.ok) throw new Error('Publicações indisponíveis');
    const posts = await postsResponse.json();
    const post = posts.data?.[0];
    if (!post) throw new Error('Nenhum aviso encontrado');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.status(200).json({ configured: true, text: post.text, createdAt: post.created_at, url: `https://x.com/DefesaCivilRS/status/${post.id}` });
  } catch (error) {
    res.status(502).json({ configured: true, error: error.message || 'Não foi possível consultar o X' });
  }
}
