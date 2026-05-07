document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // Set current year
    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // Simulated viewer count (simulates a live counter)
    simulateViewers();

    // Handle logo error - show fallback
    handleLogoErrors();

    // Configure YouTube player
    configureYouTubePlayer();
});

/**
 * Simulates a viewer count with realistic fluctuations.
 * In production, this would use the YouTube Data API.
 */
function simulateViewers() {
    const viewersEl = document.getElementById('viewers');
    if (!viewersEl) return;

    let baseViewers = 142;
    let currentViewers = baseViewers;

    function updateViewers() {
        // Random fluctuation: -3 to +4
        const change = Math.floor(Math.random() * 8) - 3;
        currentViewers = Math.max(50, currentViewers + change);
        viewersEl.textContent = currentViewers.toLocaleString('pt-BR');
    }

    // Initial display
    updateViewers();

    // Update every 5 seconds
    setInterval(updateViewers, 5000);
}

/**
 * Shows a text fallback if logo images fail to load.
 */
function handleLogoErrors() {
    const logos = [
        document.getElementById('logoImg'),
        document.getElementById('footerLogoImg')
    ];

    logos.forEach(logo => {
        if (!logo) return;

        logo.addEventListener('error', () => {
            // Create a text-based fallback
            const fallback = document.createElement('div');
            fallback.className = 'logo-fallback';
            fallback.innerHTML = '🏛️';
            fallback.style.cssText = `
                width: ${logo.offsetWidth || 48}px;
                height: ${logo.offsetHeight || 48}px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                background: rgba(255,255,255,0.15);
                border-radius: 50%;
                border: 2px solid rgba(255,255,255,0.3);
            `;

            logo.parentNode.replaceChild(fallback, logo);
        });
    });
}

/**
 * Configures the YouTube iframe player.
 * Replace 'LIVE_STREAM_ID' with your actual YouTube Live Stream ID or Video ID.
 */
function configureYouTubePlayer() {
    const player = document.getElementById('youtubePlayer');
    if (!player) return;

    // Get the current src
    let src = player.getAttribute('src');

    // If the placeholder ID is still there, add a console hint
    if (src && src.includes('LIVE_STREAM_ID')) {
        console.info(
            '%c📋 Parobé Ao Vivo — Para exibir um vídeo, substitua "LIVE_STREAM_ID" no iframe src pelo ID do vídeo/transmissão do YouTube.',
            'color: #0d3b66; font-size: 14px; font-weight: bold;'
        );

        // Show a placeholder overlay
        const wrapper = player.parentElement;
        const overlay = document.createElement('div');
        overlay.className = 'stream-placeholder';
        overlay.innerHTML = `
            <div style="
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: #50A2FF;
                color: white;
                font-family: 'Inter', sans-serif;
                z-index: 10;
                gap: 16px;
                padding: 32px;
                text-align: center;
            ">
                <div style="
                    width: 80px; height: 80px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 36px;
                ">📺</div>
                <h2 style="
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                ">Aguardando Transmissão</h2>
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(229, 62, 62, 0.8);
                    padding: 8px 20px;
                    border-radius: 50px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 1.5px;
                ">
                    <span style="
                        width: 8px; height: 8px;
                        background: white;
                        border-radius: 50%;
                        animation: dotBlink 1.5s ease-in-out infinite;
                    "></span>
                    EM BREVE
                </div>
            </div>
        `;
        wrapper.appendChild(overlay);
    }
}

/**
 * Utility: Update the YouTube video source dynamically.
 * Call this function with a YouTube video/stream ID to change the stream.
 * 
 * @param {string} videoId - The YouTube video or stream ID
 */
function setLiveStream(videoId) {
    const player = document.getElementById('youtubePlayer');
    if (!player) return;

    const newSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1`;
    player.setAttribute('src', newSrc);

    // Remove placeholder if exists
    const placeholder = document.querySelector('.stream-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    console.info(`%c✅ Transmissão atualizada para: ${videoId}`, 'color: green; font-weight: bold;');
}

// Expose function globally for console use
window.setLiveStream = setLiveStream;