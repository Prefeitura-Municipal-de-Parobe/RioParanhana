(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const fmtBR = (value, digits = 2) => {
    const n = Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(n)) return null;
    return n.toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  };

  function parseNumber(text) {
    if (text == null) return null;
    const cleaned = String(text)
      .replace(/\s+/g, " ")
      .replace(",", ".")
      .match(/-?\d+(?:\.\d+)?/);
    if (!cleaned) return null;
    const n = Number(cleaned[0]);
    return Number.isFinite(n) ? n : null;
  }

  function getText(id) {
    const el = $(id);
    return el ? el.textContent.trim() : "";
  }

  function nowParts() {
    const d = new Date();
    return {
      date: d.toLocaleDateString("pt-BR"),
      time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      seconds: d.toLocaleTimeString("pt-BR")
    };
  }

  function updateClock() {
    const p = nowParts();
    $("header-date").textContent = p.date;
    $("header-time").textContent = p.time;
    $("camera-time").textContent = `${p.date} ${p.seconds}`;
  }

  function getStatus(level) {
    // IMPORTANTE:
    // Ajuste estes limites conforme o protocolo OFICIAL da Defesa Civil.
    if (level == null) {
      return { label: "AGUARDANDO", cls: "status-normal" };
    }
    if (level < 1) return { label: "NORMAL", cls: "status-normal" };
    if (level < 2) return { label: "ATENÇÃO", cls: "status-attention" };
    if (level < 3) return { label: "CUIDADO", cls: "status-care" };
    if (level < 5) return { label: "ALERTA", cls: "status-alert" };
    return { label: "EMERGÊNCIA", cls: "status-emergency" };
  }

  function setStatus(level) {
    const info = getStatus(level);
    const pill = $("riverStatusPill");
    const text = $("riverStatusText");

    pill.classList.remove(
      "status-normal", "status-attention", "status-care",
      "status-alert", "status-emergency"
    );
    pill.classList.add(info.cls);
    text.textContent = info.label;
  }

  // Histórico apenas no navegador:
  // não inventa pontos; só grava leituras realmente vistas por este navegador.
  const STORAGE_KEY = "rio-paranhana-front-history-v1";

  function loadHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return Array.isArray(raw)
        ? raw.filter(p => p && p.t >= cutoff && Number.isFinite(p.v))
        : [];
    } catch {
      return [];
    }
  }

  function saveHistory(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-300)));
    } catch {}
  }

  let history = loadHistory();
  let lastStoredLevel = null;
  let lastStoredAt = 0;

  function storeReading(level) {
    if (!Number.isFinite(level)) return;

    const now = Date.now();
    const levelChanged = lastStoredLevel == null || Math.abs(level - lastStoredLevel) >= 0.005;
    const oldEnough = now - lastStoredAt >= 5 * 60 * 1000;

    if (!levelChanged && !oldEnough) return;

    history.push({ t: now, v: level });
    const cutoff = now - 24 * 60 * 60 * 1000;
    history = history.filter(p => p.t >= cutoff);

    lastStoredLevel = level;
    lastStoredAt = now;
    saveHistory(history);
    drawChart(level);
  }

  function trendFromHistory(current) {
    if (!Number.isFinite(current)) return null;
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    const candidates = history.filter(p => p.t <= cutoff);

    if (!candidates.length) return null;

    const base = candidates[candidates.length - 1].v;
    const cm = (current - base) * 100;

    if (Math.abs(cm) < 1) {
      return { type: "stable", text: "Estável nas últimas 2 horas", icon: "minus" };
    }

    if (cm > 0) {
      return {
        type: "up",
        text: `↑ ${Math.abs(cm).toLocaleString("pt-BR", {maximumFractionDigits: 1})} cm nas últimas 2 horas`,
        icon: "arrow-up"
      };
    }

    return {
      type: "down",
      text: `↓ ${Math.abs(cm).toLocaleString("pt-BR", {maximumFractionDigits: 1})} cm nas últimas 2 horas`,
      icon: "arrow-down"
    };
  }

  function updateTrend(level) {
    const trend = trendFromHistory(level);
    const box = $("riverTrend");

    box.classList.remove("up", "down", "stable");

    if (!trend) {
      box.innerHTML = `<i data-lucide="minus"></i><span>Aguardando histórico de 2 horas</span>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    box.classList.add(trend.type);
    box.innerHTML = `<i data-lucide="${trend.icon}"></i><span>${trend.text}</span>`;
    if (window.lucide) lucide.createIcons();
  }

  function parseDegreesFromNeedle() {
    const needle = $("compass-needle");
    if (!needle) return null;

    const values = [
      needle.style.transform,
      needle.getAttribute("style"),
      needle.dataset ? needle.dataset.degrees : ""
    ].filter(Boolean).join(" ");

    const m = values.match(/rotate\(\s*(-?\d+(?:\.\d+)?)deg\s*\)/i);
    if (m) {
      const deg = ((Number(m[1]) % 360) + 360) % 360;
      return deg;
    }

    return null;
  }

  function cardinal(deg) {
    if (!Number.isFinite(deg)) return "--";
    const names = ["N","NE","L","SE","S","SO","O","NO"];
    return names[Math.round(deg / 45) % 8];
  }

  function syncVisible() {
    // Nível: tenta primeiro o elemento de régua e depois o card antigo.
    const level =
      parseNumber(getText("api-nivel-atual")) ??
      parseNumber(getText("NivelRio"));

    if (Number.isFinite(level)) {
      $("riverLevelValue").textContent = level.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      setStatus(level);
      storeReading(level);
      updateTrend(level);
    }

    // Clima
    const temp = parseNumber(getText("TempAtual"));
    const feels = parseNumber(getText("SensTerm"));
    const wind = parseNumber(getText("VeloVento"));
    const rain = parseNumber(getText("api-rain-current-val"));

    if (Number.isFinite(temp)) $("temperatureVisible").textContent = `${fmtBR(temp, 0)}°C`;
    if (Number.isFinite(feels)) $("feelsLikeVisible").textContent = `${fmtBR(feels, 0)}°C`;
    if (Number.isFinite(wind)) $("windVisible").textContent = `${fmtBR(wind, 2)} km/h`;
    if (Number.isFinite(rain)) $("rainVisible").textContent = `${fmtBR(rain, 2)} mm`;

    const deg = parseDegreesFromNeedle();
    if (Number.isFinite(deg)) {
      $("windDirectionVisible").textContent = cardinal(deg);
      $("windDegreesVisible").textContent = `(${Math.round(deg)}°)`;
    }

    const legacyUpdate = getText("api-last-update");
    if (legacyUpdate && !legacyUpdate.includes("--")) {
      $("lastUpdateVisible").textContent = legacyUpdate;
    } else {
      const p = nowParts();
      $("lastUpdateVisible").textContent = `${p.date} ${p.time}`;
    }

    drawChart(level);
  }

  function drawChart(currentLevel) {
    const canvas = $("riverChart");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(620, rect.width || 620) * dpr;
    canvas.height = (rect.height || 335) * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const pad = { left: 50, right: 112, top: 22, bottom: 40 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px Inter, sans-serif";
    ctx.textBaseline = "middle";

    const yFor = (m) => pad.top + ch - (m / 6) * ch;

    // grid + escala 0–6 m
    for (let m = 0; m <= 6; m++) {
      const y = yFor(m);
      ctx.beginPath();
      ctx.strokeStyle = "#dce7f4";
      ctx.lineWidth = 1;
      ctx.setLineDash(m === 0 ? [] : [3,4]);
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cw, y);
      ctx.stroke();

      ctx.fillStyle = "#60728f";
      ctx.textAlign = "right";
      ctx.fillText(`${m.toFixed(0)},00`, pad.left - 9, y);
    }

    ctx.setLineDash([]);

    // Thresholds
    const limits = [
      { v: 2, color: "#2d7fe8", text: "2,00 m – Atenção" },
      { v: 3, color: "#d49a00", text: "3,00 m – Cuidado" },
      { v: 4, color: "#e66b10", text: "4,00 m – Alerta" },
      { v: 5, color: "#e33636", text: "5,00 m – Emergência" },
    ];

    for (const l of limits) {
      const y = yFor(l.v);
      ctx.beginPath();
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5,4]);
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cw, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = l.color;
      ctx.textAlign = "left";
      ctx.font = "600 10px Inter, sans-serif";
      ctx.fillText(l.text, pad.left + cw + 9, y);
    }

    // eixo X
    const now = new Date();
    const ticks = 8;
    ctx.fillStyle = "#60728f";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i <= ticks; i++) {
      const t = new Date(now.getTime() - (24 - (24 * i / ticks)) * 60 * 60 * 1000);
      const x = pad.left + (cw * i / ticks);
      ctx.fillText(
        t.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}),
        x,
        pad.top + ch + 22
      );
    }

    // dados reais armazenados neste navegador
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const data = history.filter(p => p.t >= cutoff);

    $("chartNote").textContent =
      data.length >= 2
        ? `${data.length} leituras registradas neste navegador`
        : "Aguardando histórico real";

    if (data.length === 0 && Number.isFinite(currentLevel)) {
      // apenas um ponto atual, sem inventar curva
      data.push({ t: Date.now(), v: currentLevel });
    }

    if (data.length) {
      const xForTime = (t) => {
        const ratio = Math.max(0, Math.min(1, (t - cutoff) / (24 * 60 * 60 * 1000)));
        return pad.left + ratio * cw;
      };

      ctx.beginPath();
      data.forEach((p, i) => {
        const x = xForTime(p.t);
        const y = yFor(Math.max(0, Math.min(6, p.v)));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#1269db";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.stroke();

      data.forEach((p) => {
        const x = xForTime(p.t);
        const y = yFor(Math.max(0, Math.min(6, p.v)));
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = "#1269db";
        ctx.fill();
      });

      const last = data[data.length - 1];
      const lx = xForTime(last.t);
      const ly = yFor(Math.max(0, Math.min(6, last.v)));

      const label = `${last.v.toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2})} m`;
      ctx.font = "700 11px Inter, sans-serif";
      const tw = ctx.measureText(label).width;

      let bx = Math.min(pad.left + cw - tw - 16, Math.max(pad.left, lx + 8));
      let by = Math.max(pad.top + 4, ly - 28);

      ctx.fillStyle = "#0755b6";
      roundRect(ctx, bx, by, tw + 14, 24, 6);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.textAlign = "left";
      ctx.fillText(label, bx + 7, by + 12);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  // observa alterações feitas pelos scripts antigos
  const legacy = $("legacy-compat");
  if (legacy && "MutationObserver" in window) {
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(syncVisible);
    });
    observer.observe(legacy, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class", "data-degrees"]
    });
  }

  // Tela cheia
  const fullBtn = $("fullscreenBtn");
  if (fullBtn) {
    fullBtn.addEventListener("click", async () => {
      const target = $("video-wrapper");
      try {
        if (!document.fullscreenElement) {
          await target.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (e) {
        console.warn("Tela cheia indisponível:", e);
      }
    });
  }

  // inicialização
  updateClock();
  setInterval(updateClock, 1000);

  syncVisible();
  setInterval(syncVisible, 5000);

  window.addEventListener("resize", () => {
    const level =
      parseNumber(getText("api-nivel-atual")) ??
      parseNumber(getText("NivelRio"));
    drawChart(level);
  });

  if (window.lucide) lucide.createIcons();
})();
