//import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "";
const SUPABASE_SECRET = "";
const GOOGLE_API_KEY = "AIzaSyACoYmuLmsnKETVSWeSx5T5wvcvv8I5xsE";
const CHANNEL_ID = "UCZC4KJEmy7_bka6uV_x1RfQ";

//const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET);

const verifificarTransmissaoRio = async () => {
    
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${GOOGLE_API_KEY}`;
    try{
        const response = await fetch(url);
        const data = await response.json();

        const videoId = data.items[0].id.videoId;

        console.log(videoId);


        const youtubeIframe = document.querySelector('#youtube-transmissison-iframe');
        youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&modestbranding=0&rel=0&playsinline=1`;

    } catch (error) {
        console.error(error)
    }
}


verifificarTransmissaoRio();