async function carregarClima() {
    // Adicionado forecast_days=1 para pegar apenas as 24 horas de hoje
    const url = "https://api.open-meteo.com/v1/forecast?latitude=-29.628&longitude=-50.833&hourly=temperature_2m,precipitation&current_weather=true&forecast_days=1&timezone=auto";
    try {
        const res = await fetch(url);
        const data = await res.json();

        // Agora o array tem exatamente 24 horas (do início ao fim de hoje)
        const temps = data.hourly.temperature_2m;
        const chuva = data.hourly.precipitation;
        const horas = data.hourly.time.map(t => t.substring(11, 16));

        const atual = data.current_weather.temperature;
        
        // Cálculo de Min/Max baseado nas 24h de hoje
        const min = Math.min(...temps);
        const max = Math.max(...temps);

        document.getElementById("tempAtual").textContent = atual + "°C";
        document.getElementById("tempMin").textContent = min.toFixed(1) + "°C";
        document.getElementById("tempMax").textContent = max.toFixed(1) + "°C";

        const ctx = document.getElementById("graficoClima");

        // Destruir gráfico anterior se existir (evita bugs de sobreposição)
        if (window.meuGrafico) {
            window.meuGrafico.destroy();
        }

        window.meuGrafico = new Chart(ctx, {
            type: "line",
            data: {
                labels: horas,
                datasets: [
                    {
                        label: "Temperatura (°C)",
                        data: temps,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderWidth: 3,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: "Precipitação (mm/h)",
                        data: chuva,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderWidth: 2,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: "Temperatura (°C)" }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: "Precipitação (mm/h)" },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

carregarClima();