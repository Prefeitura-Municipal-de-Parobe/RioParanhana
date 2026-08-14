const LIVE_CHECK_INTERVAL = 60 * 1000; // 1 minuto
const REQUEST_TIMEOUT = 10 * 1000;    // 10 segundos

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
    liveBadge.innerHTML = `
        <span class="live-dot"></span>
        <span>${labels[status] || 'STATUS'}</span>
    `;
}

function showMessage(title, text) {
    if (!offlineAlert) return;

    offlineAlert.style.display = 'flex';
    offlineAlert.style.backgroundImage = 'none';
    offlineAlert.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:24px;">
            <h2 style="font-size:1.3rem;font-weight:700;margin:0;letter-spacing:-0.5px;">
                ${title}
            </h2>
            <p style="font-size:1rem;font-weight:500;margin:0;color:#495057cb;">
                ${text}
            </p>
        </div>
    `;
}

function hideMessage() {
    if (!offlineAlert) return;
    offlineAlert.innerHTML = '';
    offlineAlert.style.display = 'none';
}

function extractYouTubeId(value) {
    if (!value || typeof value !== 'string') return null;

    // Caso já seja somente o ID do vídeo.
    if (/^[A-Za-z0-9_-]{11}$/.test(value)) {
        return value;
    }

    try {
        const url = new URL(value, window.location.origin);

        // youtube.com/watch?v=ID
        const v = url.searchParams.get('v');
        if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

        // youtu.be/ID
        if (url.hostname.includes('youtu.be')) {
            const id = url.pathname.split('/').filter(Boolean)[0];
            if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
        }

        // youtube.com/live/ID ou youtube.com/embed/ID
        const parts = url.pathname.split('/').filter(Boolean);
        const markerIndex = parts.findIndex(p => p === 'live' || p === 'embed');
        if (markerIndex >= 0 && parts[markerIndex + 1]) {
            const id = parts[markerIndex + 1];
            if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
        }
    } catch (_) {
        // Ignora URL inválida.
    }

    return null;
}

function getTransmissionId(data) {
    if (!data || typeof data !== 'object') return null;

    return (
        extractYouTubeId(data.transmissionId) ||
        extractYouTubeId(data.transmissionUrl)
    );
}

function buildEmbedUrl(videoId) {
    const params = new URLSearchParams({
        autoplay: '1',
        mute: '1',
        playsinline: '1',
        rel: '0'
    });

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function setOffline() {
    currentLiveId = null;

    if (youtubeIframe) {
        youtubeIframe.style.display = 'none';
        youtubeIframe.removeAttribute('src');
    }

    showMessage(
        'TRANSMISSÃO EM MANUTENÇÃO',
        'A transmissão será restabelecida em breve.'
    );

    setBadge('offline');
}

function setLive(videoId) {
    if (!youtubeIframe) return;

    hideMessage();
    youtubeIframe.style.display = 'block';

    // Não recarrega o iframe a cada consulta.
    if (currentLiveId !== videoId) {
        currentLiveId = videoId;
        youtubeIframe.src = buildEmbedUrl(videoId);
    }

    setBadge('live');
}

async function fetchLiveData() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(
            `/api/rio-proxy/?path=live/id&_=${Date.now()}`,
            {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            }
        );

        if (!response.ok) {
            throw new Error(`API respondeu HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error('A API não retornou JSON');
        }

        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

async function checkRiverTransmission() {
    // Só muda para "verificando" quando ainda não existe uma live tocando.
    if (!currentLiveId) {
        setBadge('checking');
    }

    try {
        const transmissionData = await fetchLiveData();
        const videoId = getTransmissionId(transmissionData);

        if (!videoId) {
            setOffline();
            return;
        }

        setLive(videoId);
    } catch (err) {
        console.error('[Rio Paranhana] Erro ao consultar transmissão:', err);

        // Se já existe uma live tocando, não derruba o vídeo por falha temporária da API.
        if (currentLiveId) {
            setBadge('live');
            return;
        }

        showMessage(
            'TRANSMISSÃO TEMPORARIAMENTE INDISPONÍVEL',
            'Não foi possível verificar a câmera neste momento. Tentaremos novamente automaticamente.'
        );
        setBadge('error');
    }
}

// Primeira verificação ao carregar a página.
checkRiverTransmission();

// Reconsulta sem recarregar o vídeo quando o ID continua igual.
setInterval(checkRiverTransmission, LIVE_CHECK_INTERVAL);

// Quando o usuário volta para a aba, faz uma nova verificação.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        checkRiverTransmission();
    }
});
