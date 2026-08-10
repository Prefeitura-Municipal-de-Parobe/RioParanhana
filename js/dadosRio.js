import checkWindDirection from "./windDirection";

const LIVE_CHECK_TIMEOUT = 20 * 60 * 1000;

let dataAtual = new Date();
let horaAtual = dataAtual.getHours();
let mesAtual = dataAtual.getMonth() + 1;
let diaAtual = dataAtual.getDate();

let dadoFake = 0;
let nivelRio = 0;

const dadosClima = {
    tempAtual: 0,
    sensTerm: 0,
    veloVento: 0,
    direVento: "N/D",
    chuvaAtual: dadoFake,
    chuvaMaxMes: 300,
    nivelRioMaxGrafico: 6.0,
    historicoMeses: [
        { mes: 'Agosto', valor: dadoFake },
        { mes: 'Julho', valor: 200.2 },
        { mes: 'Junho', valor: 74.2 },
        { mes: 'Maio', valor: 70.6 }
    ]
};

const mapWeatherData = (riverLevel, weatherSummaryData) => {
    dadosClima.tempAtual = weatherSummaryData.temperature;
    dadosClima.sensTerm = weatherSummaryData.thermal_sensation;
    dadosClima.veloVento = weatherSummaryData.wind_speed;
    dadosClima.direVento = weatherSummaryData.wind_direction;
    dadosClima.chuvaAtual = weatherSummaryData.rain_volume_month;
    nivelRio = riverLevel;
};

async function fetchRiverData() {
  try {
    const riverLevelRes = await fetch('/api/rio-proxy?path=river/level');
    const riverLevelData = await riverLevelRes.json();

    const weatherSummaryRes = await fetch('/api/rio-proxy?path=weather');
    const weatherSummaryData = await weatherSummaryRes.json();

    mapWeatherData(riverLevelData.nivelMedicao, weatherSummaryData);
    renderizarDadosFluviais(nivelRio, dadosClima);
    renderizarGraficos(nivelRio, dadosClima);
    
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
    document.querySelector('#compass-needle').style.rotate = `${checkWindDirection(dados.direVento)}deg`;
}

function renderizarGraficos(riverLevel, dados) {
    let chuvaPercentual = (dados.chuvaAtual / dados.chuvaMaxMes) * 100;
    if (chuvaPercentual > 100) chuvaPercentual = 100;
    
    document.getElementById('api-rain-current-val').innerText = `${dados.chuvaAtual}mm`;
    document.getElementById('api-rain-fill').style.height = `${chuvaPercentual}%`;
    
    let rioPercentual = (riverLevel * 100) / dados.nivelRioMaxGrafico;
    if (rioPercentual > 100) rioPercentual = 100;
    
    document.getElementById('api-nivel-atual').innerText = riverLevel.toFixed(2);
    document.getElementById('api-river-fill').style.height = `${rioPercentual}%`;
    document.getElementById('api-river-indicator').style.bottom = `calc(${rioPercentual}% - 15px)`;
    document.getElementById('api-last-update').innerText = `${addZeroBefore(diaAtual)}/${addZeroBefore(mesAtual)}/${dataAtual.getFullYear()}-${addZeroBefore(horaAtual)}:${dataAtual.getMinutes()}`;
    
    if (dados.historicoMeses.length > 0) {
        document.getElementById('api-rain-month-label').innerText = dados.historicoMeses[0].mes.toUpperCase().substring(0, 3);
        document.getElementById('api-rain-current-val').innerText = `${dados.historicoMeses[0].valor}mm`;
    }
    
    dados.historicoMeses.forEach((item, index) => {
        const id = index + 1;
        const mesElemento = document.getElementById(`api-month-${id}`);
        const valorElemento = document.getElementById(`api-val-${id}`);
        
        if (mesElemento && valorElemento) {
            mesElemento.innerText = item.mes;
            const valorFormatado = item.valor.toString().replace('.', ',');
            valorElemento.innerText = `${valorFormatado} mm`;
        }
    });
}

fetchRiverData();
setInterval(fetchRiverData, LIVE_CHECK_TIMEOUT);