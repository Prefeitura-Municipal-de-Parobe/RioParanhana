const LIVE_CHECK_TIMEOUT = 20 * 60 * 1000;

let dataAtual = new Date();
let horaAtual = dataAtual.getHours();
let mesAtual = dataAtual.getMonth() + 1;
let diaAtual = dataAtual.getDate();

let nivelRio = 0;

const dadosClima = {
    tempAtual: 0,
    sensTerm: 0,
    veloVento: 0,
    direVento: "N/D",
    chuvaMesAtual: 0,
    chuvaMaxMes: 0,
    nivelRioMaxGrafico: 6.0,
    historicoMeses: [
        { mes: 'Agosto', valor: 0 },
        { mes: 'Julho', valor: 200.2 },
        { mes: 'Junho', valor: 74.2 },
        { mes: 'Maio', valor: 70.6 }
    ]
};

const mapWeatherData = (riverLevel, weatherSummaryData, riverRecordData) => {
    dadosClima.tempAtual = weatherSummaryData.temperature;
    dadosClima.sensTerm = weatherSummaryData.thermal_sensation;
    dadosClima.veloVento = weatherSummaryData.wind_speed;
    dadosClima.direVento = weatherSummaryData.wind_direction;
    dadosClima.chuvaMesAtual = weatherSummaryData.rain_volume_month;
    dadosClima.chuvaMaxMes = riverRecordData.recordLevel;
    nivelRio = riverLevel;
};

const buscarMesTraduzido = (mesAtual) => {
    
    switch(mesAtual){
        case "JANUARY": return "JAN";
        case "FEBRUARY": return "FEV";
        case "MARCH": return "MAR";
        case "APRIL": return "ABR";
        case "MAY": return "MAI";
        case "JUNE": return "JUN";
        case "JULY": return "JUL";
        case "AUGUST": return "AGO";
        case "SEPTEMBER": return "SET";
        case "OCTOBER": return "OUT";
        case "NOVEMBER": return "NOV";
        case "DECEMBER": return "DEZ";
    }
}

const checkWindDirection = (originDirection) => {
    
    switch(originDirection){
        case "N": return 0;
        case "NNE": return 22.5;
        case "NE": return 45;
        case "ENE": return 67.5;
        case "E": return 90;
        case "ESE": return 112.5;
        case "SE": return 135;
        case "SSE": return 157.5;
        case "S": return 180;
        case "SSW": 
        case "SSO": return 202.5;
        case "SW": 
        case "SO": return 225;
        case "WSW": 
        case "OSO": return 247.5;
        case "W": 
        case "O": return 270;
        case "WNW": 
        case "ONO": return 292.5;
        case "NW": 
        case "NO": return 315;
        case "NNW": 
        case "NNO": return 337.5;
        default: return null;
    }

}

async function fetchRiverData() {
  try {

    const riverLevelRes = await fetch('/api/rio-proxy?path=/river/level');
    const riverLevelData = await riverLevelRes.json();

    const weatherSummaryRes = await fetch('/api/rio-proxy?path=/weather');
    const weatherSummaryData = await weatherSummaryRes.json();

    const riverRecord = await fetch('/api/rio-proxy?path=/river_record');
    const riverRecordData = await riverRecord.json();

    mapWeatherData(riverLevelData.nivelMedicao, weatherSummaryData, riverRecordData);
    renderizarDadosFluviais(nivelRio, dadosClima);
    renderizarGraficos(nivelRio, dadosClima, riverRecord);
    
  } catch (error) {
    console.error('Network or parsing error:', error);
  }
}

function addZeroBefore(n) {
    return (n < 10 ? '0' : '') + n;
}

function renderizarDadosFluviais(riverLevel, dados) {
    document.querySelector('#NivelRio').innerText = `${riverLevel.toFixed(2)}m`;
    document.querySelector('#TempAtual').innerText = `${dados.tempAtual}°c`;
    document.querySelector('#SensTerm').innerText = `${dados.sensTerm}°c`;
    document.querySelector('#VeloVento').innerText = `${dados.veloVento}Km/H`;
    document.querySelector('#compass-needle').style.rotate = `${checkWindDirection(dados.direVento) - 180}deg`;
}

function renderizarGraficos(riverLevel, dados, riverRecord) {
    let chuvaPercentual = (dados.chuvaMesAtual / dados.chuvaMaxMes) * 100;
    if (chuvaPercentual > 100) chuvaPercentual = 100;
    
    document.getElementById('api-rain-current-val').innerText = `${dados.chuvaMesAtual}mm`;
    document.getElementById('api-rain-fill').style.height = `${chuvaPercentual}%`;
    
    let rioPercentual = (riverLevel * 100) / dados.nivelRioMaxGrafico;
    if (rioPercentual > 100) rioPercentual = 100;
    
    document.getElementById('api-nivel-atual').innerText = riverLevel.toFixed(2);
    document.getElementById('api-river-fill').style.height = `${rioPercentual}%`;
    document.getElementById('api-river-indicator').style.bottom = `calc(${rioPercentual}% - 15px)`;
    document.getElementById('api-last-update').innerText = `${addZeroBefore(diaAtual)}/${addZeroBefore(mesAtual)}/${dataAtual.getFullYear()}-${addZeroBefore(horaAtual)}:${dataAtual.getMinutes()}`;
    
    if (dados.historicoMeses.length > 0) {
        document.getElementById('api-rain-month-label').innerText = buscarMesTraduzido(riverRecord.month);
        document.getElementById('api-rain-current-val').innerText = `${dados.historicoMeses[0].valor}mm`;
    }
    
    /*dados.historicoMeses.forEach((item, index) => {
        const id = index + 1;
        const mesElemento = document.getElementById(`api-month-${id}`);
        const valorElemento = document.getElementById(`api-val-${id}`);
        
        if (mesElemento && valorElemento) {
            mesElemento.innerText = item.mes;
            const valorFormatado = item.valor.toString().replace('.', ',');
            valorElemento.innerText = `${valorFormatado} mm`;
        }
    });*/
}

fetchRiverData();
setInterval(fetchRiverData, LIVE_CHECK_TIMEOUT);