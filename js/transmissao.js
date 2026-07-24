const SUPABASE_URL = "";
const SUPABASE_SECRET = "";
const GOOGLE_API_KEY = "AIzaSyACoYmuLmsnKETVSWeSx5T5wvcvv8I5xsE";
const CHANNEL_ID = "UCZC4KJEmy7_bka6uV_x1RfQ";
const LIVE_CHECK_TIMEOUT = 15 * 60 * 1000;

let CURRENT_LIVE_ID = "";

const offlineAlert = document.querySelector('#offline-message-container');
const youtubeIframe = document.querySelector('#youtube-transmissison-iframe');


const checkRiverTransmission = async () => {
    
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${GOOGLE_API_KEY}`;
    
    try{
        const response = await fetch(url);
        const data = await response.json();

        if(data && data.items && data.items.length > 0){
            const videoId = data.items[0].id.videoId;

            if(videoId != CURRENT_LIVE_ID){
                CURRENT_LIVE_ID = data.items[0].id.videoId;
                youtubeIframe.src = `https://www.youtube.com/embed/${CURRENT_LIVE_ID}?autoplay=1&mute=1&controls=1&modestbranding=0&rel=0&playsinline=1`;
                youtubeIframe.style.display = "block";
                offlineAlert.style.display = "none";
            }
        } else {
            offlineAlert.style.display = "flex";
            youtubeIframe.style.display = "none";
        }

    } catch (error) {
        console.error(error)
    }
}


checkRiverTransmission();

setInterval(checkRiverTransmission, LIVE_CHECK_TIMEOUT);