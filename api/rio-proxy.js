export default async function handler(req, res) {
  const endpoint = req.query.path || '';

  try {
    const response = await httpFetch(`http://apirio.parobe.rs.gov.br:3008/${endpoint}`);
    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao comunicar com o servidor da prefeitura' });
  }
}