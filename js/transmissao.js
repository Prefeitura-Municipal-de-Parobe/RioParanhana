const LIVE_CHECK_TIMEOUT = 20 * 60 * 1000;

const CURRENT_LIVE_ID = "";

const offlineAlert = document.querySelector('#offline-message-container');
const youtubeIframe = document.querySelector('#youtube-transmissison-iframe');

const checkRiverTransmission = async () => {

    try{
        const response = await fetch("/api/rio-proxy/?path=live/id");
        const transmissionData = await response.json();

        if(!transmissionData.transmissionUrl || transmissionData.transmisisonId == null){
            offlineAlert.style.backgroundImage = "none";
            offlineAlert.innerHTML = `
                <h2 style="display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                    TRANSMISSÃO
                    EM
                    MANUTENÇÃO</h2>
                <p style="display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 500; margin: 0; color:#495057cb;">A transmissão será
                    reestabelecida em breve!</p>
            `;
            youtubeIframe.style.display = "none";
        } else {
            offlineAlert.style.backgroundImage = "none";
            youtubeIframe.style.display = "flex";
            youtubeIframe.src = transmissionData.transmissionUrl;
        }

    } catch (err){
        console.error(err.message);
    }


}

checkRiverTransmission();

setInterval(checkRiverTransmission, LIVE_CHECK_TIMEOUT);