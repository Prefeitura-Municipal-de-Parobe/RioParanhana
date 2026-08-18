(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function setHealth(name, state, text) {
    const map = {
      camera: ["healthCamera", "healthCameraText"],
      river: ["healthRiver", "healthRiverText"],
      weather: ["healthWeather", "healthWeatherText"]
    };
    const ids = map[name];
    if (!ids) return;
    const box = $(ids[0]);
    const label = $(ids[1]);
    if (!box || !label) return;
    const dot = box.querySelector(".health-dot");
    if (dot) {
      dot.classList.remove("ok", "error", "waiting");
      dot.classList.add(state);
    }
    label.textContent = text;
  }

  function watchLiveBadge() {
    const badge = $("liveBadge");
    if (!badge || !window.MutationObserver) return;
    const sync = () => {
      const status = badge.dataset.status || "checking";
      if (status === "live") setHealth("camera", "ok", "Ao vivo");
      else if (status === "offline" || status === "error") setHealth("camera", "error", "Indisponível");
      else setHealth("camera", "waiting", "Verificando");
    };
    new MutationObserver(sync).observe(badge, { attributes:true, childList:true, subtree:true });
    sync();
  }
  const LAT = -29.64357476725393;
  const LON = -50.800925760328184;

  function setIntegrationStatus(text, type = "ok") {
    const el = $("integrationStatus");
    if (!el) return;
    // só exibe quando há problema; em funcionamento normal fica invisível
    if (type === "ok") {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.textContent = text;
    el.style.background = type === "warn" ? "#fff8db" : "#fff1f1";
    el.style.color = type === "warn" ? "#8a6400" : "#b42318";
    el.style.border = `1px solid ${type === "warn" ? "#f2d36b" : "#ffc4c4"}`;
  }

  function numberFrom(text) {
    if (text == null) return null;
    const m = String(text).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  function br(n, digits = 2) {
    if (!Number.isFinite(n)) return "--";
    return n.toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function nowText() {
    const d = new Date();
    return {
      date: d.toLocaleDateString("pt-BR"),
      time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      seconds: d.toLocaleTimeString("pt-BR")
    };
  }

  function tickClock() {
    const n = nowText();
    if ($("header-date")) $("header-date").textContent = n.date;
    if ($("header-time")) $("header-time").textContent = n.time;
  }

  function statusInfo(level) {
    // Faixas visuais do protótipo. Confirme os limites oficiais antes de publicação definitiva.
    if (!Number.isFinite(level)) return ["AGUARDANDO", "status-normal"];
    if (level < 1) return ["NORMAL", "status-normal"];
    if (level < 2) return ["ATENÇÃO", "status-attention"];
    if (level < 3) return ["CUIDADO", "status-care"];
    if (level < 5) return ["ALERTA", "status-alert"];
    return ["EMERGÊNCIA", "status-emergency"];
  }

  function applyRiver(level, updatedAt = null) {
    if (!Number.isFinite(level)) return false;

    $("riverLevelValue").textContent = br(level, 2);

    const [label, cls] = statusInfo(level);
    const pill = $("riverStatusPill");
    pill.classList.remove(
      "status-normal", "status-attention", "status-care",
      "status-alert", "status-emergency"
    );
    pill.classList.add(cls);
    $("riverStatusText").textContent = label;

    if (updatedAt) $("lastUpdateVisible").textContent = updatedAt;

    storeHistory(level);
    updateTrend(level);
    drawChart(level);
    setHealth("river", "ok", `${br(level, 2)} m`);
    return true;
  }

  // ============================================================
  // CLIMA DIRETO - não depende mais do script antigo
  // ============================================================
  async function updateWeatherDirect() {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", LAT);
    url.searchParams.set("longitude", LON);
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m"
    );
    url.searchParams.set("daily", "precipitation_sum");
    url.searchParams.set("past_days", "30");
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set("timezone", "America/Sao_Paulo");

    try {
      const r = await fetch(url.toString(), { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();

      const c = d.current || {};
      const temp = Number(c.temperature_2m);
      const feel = Number(c.apparent_temperature);
      const wind = Number(c.wind_speed_10m);
      const deg = Number(c.wind_direction_10m);

      if (Number.isFinite(temp)) $("temperatureVisible").textContent = `${br(temp, 0)}°C`;
      if (Number.isFinite(feel)) $("feelsLikeVisible").textContent = `${br(feel, 0)}°C`;
      if (Number.isFinite(wind)) $("windVisible").textContent = `${br(wind, 2)} km/h`;

      if (Number.isFinite(deg)) {
        $("windDirectionVisible").textContent = cardinal(deg);
        $("windDegreesVisible").textContent = `(${Math.round(deg)}°)`;
      }

      const rainArray = d.daily && Array.isArray(d.daily.precipitation_sum)
        ? d.daily.precipitation_sum
        : [];

      const rain30 = rainArray
        .slice(0, 30)
        .map(Number)
        .filter(Number.isFinite)
        .reduce((a, b) => a + b, 0);

      if (rainArray.length) {
        $("rainVisible").textContent = `${br(rain30, 2)} mm`;
      }

      setHealth("weather", "ok", "Atualizado");
      return true;
    } catch (e) {
      console.warn("[Rio] Falha ao buscar clima diretamente:", e);
      setHealth("weather", "error", "Indisponível");
      return false;
    }
  }

  function cardinal(deg) {
    const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
    return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  }

  // ============================================================
  // LEITURA DOS SCRIPTS ANTIGOS DA RAIZ
  // ============================================================
  function syncFromLegacyDom(doc = document) {
    try {
      const text = (id) => {
        const el = doc.getElementById(id);
        return el ? el.textContent.trim() : "";
      };

      const level =
        numberFrom(text("api-nivel-atual")) ??
        numberFrom(text("NivelRio"));

      const update = text("api-last-update");
      const updateText =
        update && !update.includes("--")
          ? update
          : `${nowText().date} ${nowText().time}`;

      const gotRiver = applyRiver(level, updateText);

      // Como fallback, também lê os cards antigos de clima.
      const temp = numberFrom(text("TempAtual"));
      const feels = numberFrom(text("SensTerm"));
      const wind = numberFrom(text("VeloVento"));
      const rain = numberFrom(text("api-rain-current-val"));

      if (Number.isFinite(temp)) $("temperatureVisible").textContent = `${br(temp, 0)}°C`;
      if (Number.isFinite(feels)) $("feelsLikeVisible").textContent = `${br(feels, 0)}°C`;
      if (Number.isFinite(wind)) $("windVisible").textContent = `${br(wind, 2)} km/h`;
      if (Number.isFinite(rain)) $("rainVisible").textContent = `${br(rain, 2)} mm`;

      const needle = doc.getElementById("compass-needle");
      if (needle) {
        const style = (needle.getAttribute("style") || "") + " " + (needle.style.transform || "");
        const m = style.match(/rotate\(\s*(-?\d+(?:\.\d+)?)deg\s*\)/i);
        if (m) {
          const deg = Number(m[1]);
          $("windDirectionVisible").textContent = cardinal(deg);
          $("windDegreesVisible").textContent = `(${Math.round(deg)}°)`;
        }
      }

      return gotRiver;
    } catch (e) {
      console.warn("[Rio] Falha ao sincronizar DOM antigo:", e);
      return false;
    }
  }

  // ============================================================
  // PONTE DE TESTE:
  // Se index-novo estiver em uma subpasta, lê a página antiga da raiz.
  // Assim o teste não fica sem nível/clima apenas por causa do caminho.
  // ============================================================
  let bridgeFrame = null;

  function createLegacyBridgeIfNeeded() {
    const p = window.location.pathname.toLowerCase();
    const isRoot =
      p === "/" ||
      p === "/index.html" ||
      p === "/index-novo.html";

    // Em index-novo na raiz, scripts antigos absolutos já atendem.
    // Em subpastas, abre a raiz antiga em iframe oculto para usar como ponte.
    if (isRoot) return;

    bridgeFrame = document.createElement("iframe");
    bridgeFrame.id = "legacyBridgeFrame";
    bridgeFrame.src = "/?front_bridge=1";
    bridgeFrame.setAttribute("aria-hidden", "true");
    bridgeFrame.style.cssText =
      "position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(bridgeFrame);

    bridgeFrame.addEventListener("load", () => {
      try {
        syncFromLegacyDom(bridgeFrame.contentDocument);

        // Se a API do novo front falhar, reaproveita a live já resolvida pela página antiga.
        const oldIframe = bridgeFrame.contentDocument.getElementById("youtube-transmissison-iframe");
        const newIframe = $("youtube-transmissison-iframe");
        const oldSrc = oldIframe && oldIframe.src;

        if (oldSrc && newIframe && !newIframe.src) {
          newIframe.src = oldSrc;
          newIframe.style.display = "block";
          const off = $("offline-message-container");
          if (off) off.style.display = "none";
          const badge = $("liveBadge");
          if (badge) {
            badge.dataset.status = "live";
            badge.innerHTML = '<span class="live-dot"></span><span>AO VIVO</span>';
          }
        }
      } catch (e) {
        console.warn("[Rio] Ponte de compatibilidade não disponível:", e);
      }
    });
  }

  function syncBridge() {
    if (!bridgeFrame) return false;
    try {
      const doc = bridgeFrame.contentDocument;
      if (!doc) return false;
      return syncFromLegacyDom(doc);
    } catch {
      return false;
    }
  }

  // ============================================================
  // HISTÓRICO LOCAL DO GRÁFICO
  // ============================================================
  const HISTORY_KEY = "rio-paranhana-history-v2";
  let history = loadHistory();
  let lastStored = null;
  let lastStoredTime = 0;

  function loadHistory() {
    try {
      const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const cut = Date.now() - 24 * 60 * 60 * 1000;
      return Array.isArray(list)
        ? list.filter(x => x && Number.isFinite(x.v) && Number.isFinite(x.t) && x.t >= cut)
        : [];
    } catch {
      return [];
    }
  }

  function storeHistory(level) {
    const now = Date.now();
    if (
      lastStored !== null &&
      Math.abs(level - lastStored) < 0.005 &&
      now - lastStoredTime < 5 * 60 * 1000
    ) return;

    history.push({ t: now, v: level });
    const cut = now - 24 * 60 * 60 * 1000;
    history = history.filter(x => x.t >= cut).slice(-300);

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {}

    lastStored = level;
    lastStoredTime = now;
  }

  function updateTrend(current) {
    const el = $("riverTrend");
    if (!el || !Number.isFinite(current)) return;

    const target = Date.now() - 2 * 60 * 60 * 1000;
    const old = history.filter(x => x.t <= target).pop();

    el.classList.remove("up", "down", "stable");

    if (!old) {
      el.classList.add("stable");
      el.innerHTML = '<i data-lucide="minus"></i><span>Aguardando histórico de 2 horas</span>';
      if (window.lucide) lucide.createIcons();
      return;
    }

    const cm = (current - old.v) * 100;
    if (Math.abs(cm) < 1) {
      el.classList.add("stable");
      el.innerHTML = '<i data-lucide="minus"></i><span>Estável nas últimas 2 horas</span>';
    } else if (cm > 0) {
      el.classList.add("up");
      el.innerHTML = `<i data-lucide="arrow-up"></i><span>↑ ${br(Math.abs(cm), 1)} cm nas últimas 2 horas</span>`;
    } else {
      el.classList.add("down");
      el.innerHTML = `<i data-lucide="arrow-down"></i><span>↓ ${br(Math.abs(cm), 1)} cm nas últimas 2 horas</span>`;
    }
    if (window.lucide) lucide.createIcons();
  }

  // ============================================================
  // GRÁFICO CANVAS
  // ============================================================
  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  }

  function drawChart(current) {
    const canvas = $("riverChart");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(620, rect.width || 620);
    const cssH = rect.height || 335;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const W = cssW, H = cssH;
    const pad = { left: 50, right: 112, top: 22, bottom: 40 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;
    const y = (m) => pad.top + ch - (Math.max(0, Math.min(6, m)) / 6) * ch;

    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px Inter, sans-serif";
    ctx.textBaseline = "middle";

    for (let m = 0; m <= 6; m++) {
      const yy = y(m);
      ctx.beginPath();
      ctx.strokeStyle = "#dce7f4";
      ctx.setLineDash(m ? [3,4] : []);
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(pad.left + cw, yy);
      ctx.stroke();
      ctx.fillStyle = "#60728f";
      ctx.textAlign = "right";
      ctx.fillText(`${m},00`, pad.left - 9, yy);
    }
    ctx.setLineDash([]);

    [
      [2, "#2d7fe8", "2,00 m – Atenção"],
      [3, "#d49a00", "3,00 m – Cuidado"],
      [4, "#e66b10", "4,00 m – Alerta"],
      [5, "#e33636", "5,00 m – Emergência"]
    ].forEach(([v, color, label]) => {
      const yy = y(v);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5,4]);
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(pad.left + cw, yy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.font = "600 10px Inter, sans-serif";
      ctx.fillText(label, pad.left + cw + 9, yy);
    });

    const now = Date.now();
    const cut = now - 24 * 60 * 60 * 1000;
    const data = history.filter(x => x.t >= cut);
    if (!data.length && Number.isFinite(current)) data.push({ t: now, v: current });

    if ($("chartNote")) {
      $("chartNote").textContent =
        data.length >= 2 ? `${data.length} leituras reais registradas` : "Aguardando histórico real";
    }

    const x = (t) => pad.left + Math.max(0, Math.min(1, (t - cut)/(24*60*60*1000))) * cw;

    ctx.fillStyle = "#60728f";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i <= 8; i++) {
      const t = new Date(cut + i * 3 * 60 * 60 * 1000);
      ctx.fillText(
        t.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}),
        pad.left + cw * i/8,
        pad.top + ch + 22
      );
    }

    if (!data.length) return;

    ctx.beginPath();
    data.forEach((p, i) => {
      const xx = x(p.t), yy = y(p.v);
      i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    });
    ctx.strokeStyle = "#1269db";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    data.forEach(p => {
      ctx.beginPath();
      ctx.arc(x(p.t), y(p.v), 3, 0, Math.PI*2);
      ctx.fillStyle = "#1269db";
      ctx.fill();
    });

    const last = data[data.length - 1];
    const label = `${br(last.v,2)} m`;
    ctx.font = "700 11px Inter, sans-serif";
    const tw = ctx.measureText(label).width;
    const bx = Math.min(pad.left + cw - tw - 14, Math.max(pad.left, x(last.t)+7));
    const by = Math.max(pad.top + 4, y(last.v)-27);

    roundedRect(ctx, bx, by, tw+14, 23, 6);
    ctx.fillStyle = "#0755b6";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(label, bx+7, by+12);
  }

  // ============================================================
  // FULLSCREEN
  // ============================================================
  const full = $("fullscreenBtn");
  if (full) {
    full.addEventListener("click", async () => {
      const v = $("video-wrapper");
      try {
        if (!document.fullscreenElement) await v.requestFullscreen();
        else await document.exitFullscreen();
      } catch (e) {
        console.warn("Tela cheia:", e);
      }
    });
  }

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================
  tickClock();
  setInterval(tickClock, 1000);
  watchLiveBadge();

  createLegacyBridgeIfNeeded();

  // Clima independente já no carregamento
  updateWeatherDirect();
  setInterval(updateWeatherDirect, 15 * 60 * 1000);

  let riverEverLoaded = false;

  function pollAll() {
    const direct = syncFromLegacyDom(document);
    const bridge = syncBridge();
    riverEverLoaded = riverEverLoaded || direct || bridge;

    if (!riverEverLoaded) {
      setHealth("river", "waiting", "Aguardando");
    } else {
      setIntegrationStatus("", "ok");
    }
  }

  pollAll();
  setInterval(pollAll, 4000);

  const compat = $("legacy-compat");
  if (compat && window.MutationObserver) {
    new MutationObserver(pollAll).observe(compat, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true
    });
  }

  window.addEventListener("resize", () => {
    const level = numberFrom($("riverLevelValue")?.textContent);
    drawChart(level);
  });

  if (window.lucide) lucide.createIcons();
})();
