const LIVE_CHECK_INTERVAL = 60 * 1000;
const REQUEST_TIMEOUT = 12 * 1000;

const offlineAlert = document.querySelector('#offline-message-container');
const youtubeIframe = document.querySelector('#youtube-transmissison-iframe');
const liveBadge = document.querySelector('#liveBadge');

let currentLiveId = null;

function setBadge(status) {
  if (!liveBadge) return;
  const labels = {
    checking: 'VERIFICANDO',
    live: 'AO VIVO',
    offline: 'OFFLINE',
    error: 'INDISPONÍVEL'
  };
  liveBadge.dataset.status = status;
  liveBadge.innerHTML = `<span class="live-dot"></span><span>${labels[status] || 'STATUS'}</span>`;
}

function showMessage(title, text) {
  if (!offlineAlert) return;
  offlineAlert.style.display = 'flex';
  offlineAlert.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:24px;">
      <h2 style="font-size:1.15rem;font-weight:800;margin:0;color:#fff;">${title}</h2>
      <p style="font-size:.9rem;font-weight:500;margin:0;color:rgba(255,255,255,.78);">${text}</p>
    </div>`;
}

function hideMessage() {
  if (!offlineAlert) return;
  offlineAlert.innerHTML = '';
  offlineAlert.style.display = 'none';
}

function extractYouTubeId(value) {
  if (!value || typeof value !== 'string') return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value, window.location.origin);
    const v = url.searchParams.get('v');
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const i = parts.findIndex(p => p === 'live' || p === 'embed');
    if (i >= 0 && parts[i + 1] && /^[A-Za-z0-9_-]{11}$/.test(parts[i + 1])) {
      return parts[i + 1];
    }
  } catch (_) {}
  return null;
}

function getTransmissionId(data) {
  if (!data || typeof data !== 'object') return null;
  return extractYouTubeId(data.transmissionId) || extractYouTubeId(data.transmissionUrl);
}

function buildEmbedUrl(videoId) {
  const p = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    rel: '0'
  });
  return `https://www.youtube.com/embed/${videoId}?${p.toString()}`;
}

async function fetchLiveData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(`/api/rio-proxy?path=live/id&_=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function setOffline() {
  currentLiveId = null;
  if (youtubeIframe) {
    youtubeIframe.style.display = 'none';
    youtubeIframe.removeAttribute('src');
  }
  showMessage('TRANSMISSÃO TEMPORARIAMENTE INDISPONÍVEL',
              'Não foi possível verificar a câmera neste momento. Tentaremos novamente automaticamente.');
  setBadge('offline');
}

function setLive(id) {
  hideMessage();
  if (!youtubeIframe) return;
  youtubeIframe.style.display = 'block';
  if (currentLiveId !== id) {
    currentLiveId = id;
    youtubeIframe.src = buildEmbedUrl(id);
  }
  setBadge('live');
}

async function checkLive() {
  if (!currentLiveId) setBadge('checking');
  try {
    const data = await fetchLiveData();
    const id = getTransmissionId(data);
    if (!id) return setOffline();
    setLive(id);
  } catch (e) {
    console.error('[Rio] Falha na transmissão:', e);
    if (currentLiveId) return setBadge('live');
    setOffline();
    setBadge('error');
  }
}

checkLive();
setInterval(checkLive, LIVE_CHECK_INTERVAL);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkLive();
});
