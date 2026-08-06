const LIVE_CHECK_TIMEOUT = 20 * 60 * 1000;

let dataAtual = new Date()
let horaAtual = dataAtual.getHours()
let mesAtual = dataAtual.getMonth() + 1
let diaAtual = dataAtual.getDate()


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
}

async function fetchRiverData() {
  try {
    const riverLevelResponse = await fetch('http://apirio.parobe.rs.gov.br:3008/river/level');
    const weatherSummaryResponse = await fetch('http://apirio.parobe.rs.gov.br:3008/weather');

    const riverLevelData = await riverLevelResponse.json();
    const weatherSummaryData = await weatherSummaryResponse.json();

    mapWeatherData(riverLevelData.nivelMedicao, weatherSummaryData);
    renderizarDadosFluviais(nivelRio, dadosClima);
    renderizarGraficos(nivelRio, dadosClima);

    if (!riverLevelResponse.ok) {
      throw new Error(`HTTP error! Status: ${riverLevelResponse.status}`);
    }
    
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
    document.querySelector('#DireVento').innerText = `${dados.direVento}`;
}

function renderizarGraficos(riverLevel, dados) {

    // ==========================================
    // ==========================================
    let chuvaPercentual = (dados.chuvaAtual / dados.chuvaMaxMes) * 100;
    if (chuvaPercentual > 100) chuvaPercentual = 100;
    
    
    document.getElementById('api-rain-current-val').innerText = `${dados.chuvaAtual}mm`;
    document.getElementById('api-rain-fill').style.height = `${chuvaPercentual}%`;
    

    // ==========================================
    // 2. ATUALIZAR RÉGUA DO RIO
    // ==========================================
    let rioPercentual = (riverLevel * 100) / dados.nivelRioMaxGrafico;
    if (rioPercentual > 100) rioPercentual = 100;
    
    document.getElementById('api-nivel-atual').innerText = riverLevel.toFixed(2);
    document.getElementById('api-river-fill').style.height = `${rioPercentual}%`;
    document.getElementById('api-river-indicator').style.bottom = `calc(${rioPercentual}% - 15px)`;
    document.getElementById('api-last-update').innerText = `${addZeroBefore(diaAtual)}/${addZeroBefore(mesAtual)}/${dataAtual.getFullYear()}-${addZeroBefore(horaAtual)}:${dataAtual.getMinutes()}`
    
    
    // ==========================================
    // 3. ATUALIZAR HISTÓRICO DE MESES (NOVO)
    // ==========================================
    
    // Atualiza a palavra "JULHO" (ou o mês atual) dentro do tanque de água
    if (dados.historicoMeses.length > 0) {
        // Pega o nome do primeiro mês da lista e coloca em maiúsculo, logo após, recorta o nome para apenas 3 caracteres
        document.getElementById('api-rain-month-label').innerText = dados.historicoMeses[0].mes.toUpperCase().substring(0, 3);
        
        document.getElementById('api-rain-current-val').innerText = `${dados.historicoMeses[0].valor}mm`;
    }
    
    // Faz um loop nos 3 meses que vieram da API
    dados.historicoMeses.forEach((item, index) => {
        // Como o index começa em 0, somamos 1 para encontrar os IDs: 1, 2 e 3
        const id = index + 1;
        
        const mesElemento = document.getElementById(`api-month-${id}`);
        const valorElemento = document.getElementById(`api-val-${id}`);
        
        // Se o elemento existir no HTML, atualiza com o dado da API
        if (mesElemento && valorElemento) {
            mesElemento.innerText = item.mes;
            
            // Troca o ponto por vírgula para manter o padrão brasileiro (ex: 280.2 vira 280,2)
            const valorFormatado = item.valor.toString().replace('.', ',');
            valorElemento.innerText = `${valorFormatado} mm`;
        }
    });
}


fetchRiverData();
setInterval(fetchRiverData, LIVE_CHECK_TIMEOUT);