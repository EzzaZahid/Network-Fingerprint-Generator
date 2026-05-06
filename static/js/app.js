/**
 * app.js — Frontend logic for NetPrint
 * Handles: URL validation, API calls, progress animation, chart rendering
 */
//console.log("JS loaded");

// "use strict";

// // ── State ────────────────────────────────────────────────────────
// let currentMode = "single";
// let charts = {};  // Track Chart.js instances for cleanup

// // ── Mode toggle ──────────────────────────────────────────────────
// function setMode(mode) {
//   currentMode = mode;
//   document.getElementById("btn-single").classList.toggle("active", mode === "single");
//   document.getElementById("btn-compare").classList.toggle("active", mode === "compare");
//   document.getElementById("single-mode").style.display = mode === "single" ? "block" : "none";
//   document.getElementById("compare-mode").style.display = mode === "compare" ? "block" : "none";
//   hideResults();
//   dismissError();
// }

// // ── URL Validation ───────────────────────────────────────────────
// function validateUrl(url, errorId) {
//   const el = document.getElementById(errorId);
//   if (!url) {
//     el.textContent = "URL is required.";
//     return false;
//   }
//   const pattern = /^https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(\/.*)?$/;
//   if (!pattern.test(url)) {
//     el.textContent = "Must start with http:// or https:// and have a valid domain.";
//     return false;
//   }
//   el.textContent = "";
//   return true;
// }

// // ── Progress Animation ───────────────────────────────────────────
// const STEPS = [
//   { id: "step-1", label: "Capturing traffic (10s)...", pct: 5 },
//   { id: "step-2", label: "Extracting packet features...", pct: 60 },
//   { id: "step-3", label: "Generating fingerprint...", pct: 80 },
//   { id: "step-4", label: "Classifying behavior...", pct: 95 },
// ];

// let progressInterval = null;
// let currentStep = 0;

// function startProgress() {
//   const wrap = document.getElementById("progress-wrap");
//   wrap.style.display = "block";
//   currentStep = 0;

//   // Reset steps
//   STEPS.forEach(s => {
//     const el = document.getElementById(s.id);
//     el.classList.remove("active", "done");
//   });

//   setProgressStep(0);

//   // Advance through steps on a timer
//   const timings = [0, 11000, 13500, 15500]; // ms offsets matching real pipeline
//   timings.forEach((delay, i) => {
//     setTimeout(() => {
//       if (i > 0) {
//         const prev = document.getElementById(STEPS[i - 1].id);
//         prev.classList.remove("active");
//         prev.classList.add("done");
//       }
//       setProgressStep(i);
//     }, delay);
//   });
// }

// function setProgressStep(i) {
//   const step = STEPS[i];
//   document.getElementById(step.id).classList.add("active");
//   document.getElementById("progress-fill").style.width = step.pct + "%";
//   document.getElementById("progress-label").textContent = step.label;
// }

// function finishProgress() {
//   document.getElementById("progress-fill").style.width = "100%";
//   document.getElementById("progress-label").textContent = "Analysis complete.";
//   STEPS.forEach(s => {
//     const el = document.getElementById(s.id);
//     el.classList.remove("active");
//     el.classList.add("done");
//   });
//   setTimeout(() => {
//     document.getElementById("progress-wrap").style.display = "none";
//   }, 1200);
// }

// function stopProgress() {
//   document.getElementById("progress-wrap").style.display = "none";
// }

// // ── Disable/enable inputs ─────────────────────────────────────────
// function setInputsDisabled(disabled) {
//   ["analyze-btn", "compare-btn", "url-input", "url1-input", "url2-input"].forEach(id => {
//     const el = document.getElementById(id);
//     if (el) el.disabled = disabled;
//   });
// }

// // ── Error handling ────────────────────────────────────────────────
// function showError(msg) {
//   const banner = document.getElementById("error-banner");
//   document.getElementById("error-text").textContent = msg;
//   banner.style.display = "flex";
// }

// function dismissError() {
//   document.getElementById("error-banner").style.display = "none";
// }

// // ── Show/hide results ─────────────────────────────────────────────
// function showResults(mode) {
//   document.getElementById("results").style.display = "block";
//   document.getElementById("single-result").style.display = mode === "single" ? "block" : "none";
//   document.getElementById("compare-result").style.display = mode === "compare" ? "block" : "none";
// }

// function hideResults() {
//   document.getElementById("results").style.display = "none";
//   destroyCharts();
// }

// function destroyCharts() {
//   Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} });
//   charts = {};
// }

// // ── Single Analyze ────────────────────────────────────────────────
// async function analyzeSingle() {
//   const url = document.getElementById("url-input").value.trim();
//   if (!validateUrl(url, "url-error")) return;

//   dismissError();
//   hideResults();
//   setInputsDisabled(true);
//   startProgress();

//   try {
//     const res = await fetch("/api/analyze", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ url }),
//     });
//     const data = await res.json();

//     finishProgress();

//     if (!data.success) {
//       showError(data.error || "Unknown error from server.");
//       return;
//     }

//     renderSingleResult(data.fingerprint);
//     showResults("single");
//     document.getElementById("results").scrollIntoView({ behavior: "smooth" });

//   } catch (err) {
//     stopProgress();
//     showError("Could not reach the server. Is Flask running?");
//     console.error(err);
//   } finally {
//     setInputsDisabled(false);
//   }
// }

// // ── Compare Analyze ───────────────────────────────────────────────
// async function analyzeCompare() {
//   const url1 = document.getElementById("url1-input").value.trim();
//   const url2 = document.getElementById("url2-input").value.trim();
//   const ok1 = validateUrl(url1, "url1-error");
//   const ok2 = validateUrl(url2, "url2-error");
//   if (!ok1 || !ok2) return;

//   dismissError();
//   hideResults();
//   setInputsDisabled(true);
//   startProgress();

//   try {
//     const res = await fetch("/api/compare", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ url1, url2 }),
//     });
//     const data = await res.json();

//     finishProgress();

//     if (!data.success) {
//       showError(data.error || "Comparison failed.");
//       return;
//     }

//     renderCompareResult(data.fingerprint1, data.fingerprint2, data.diff);
//     showResults("compare");
//     document.getElementById("results").scrollIntoView({ behavior: "smooth" });

//   } catch (err) {
//     stopProgress();
//     showError("Could not reach the server. Is Flask running?");
//     console.error(err);
//   } finally {
//     setInputsDisabled(false);
//   }
// }

// // ── Render Single Result ──────────────────────────────────────────
// function renderSingleResult(fp) {
//   renderBadge("behavior-badge", fp.behavior_label, fp.confidence);
//   renderStatGrid("stat-grid", fp);
//   renderDnsList("dns-list", fp.dns_queries);
//   renderIpList("ip-list", fp.unique_ips);
//   renderProtoChart("proto-chart", fp.protocol_distribution);
//   renderHistogram("hist-chart", fp.size_histogram);
//   renderTimeline("timeline-chart", fp.timeline, fp.site_url);
// }

// // ── Render Compare Result ─────────────────────────────────────────
// function renderCompareResult(fp1, fp2, diff) {
//   renderBadge("behavior-badge-a", fp1.behavior_label, fp1.confidence);
//   renderBadge("behavior-badge-b", fp2.behavior_label, fp2.confidence);

//   // Update column headers with actual URLs
//   document.querySelector(".site-a-label").textContent = shortUrl(fp1.site_url);
//   document.querySelector(".site-b-label").textContent = shortUrl(fp2.site_url);

//   renderStatGrid("stat-grid-a", fp1);
//   renderStatGrid("stat-grid-b", fp2);

//   renderDiffCol(diff);

//   renderProtoChart("proto-chart-a", fp1.protocol_distribution, "#00aaff");
//   renderProtoChart("proto-chart-b", fp2.protocol_distribution, "#ff6b35");
//   renderTimelineCompare("timeline-compare-chart", fp1, fp2);
// }

// // ── Helper: short URL label ───────────────────────────────────────
// function shortUrl(url) {
//   return url.replace(/^https?:\/\//, "").split("/")[0];
// }

// // ── Render Behavior Badge ─────────────────────────────────────────
// function renderBadge(id, label, confidence) {
//   const el = document.getElementById(id);
//   const classMap = {
//     "Streaming": "badge-streaming",
//     "Social Media": "badge-social",
//     "Static Content": "badge-static",
//     "API-Heavy": "badge-api",
//     "Unknown": "badge-unknown",
//   };
//   el.className = "behavior-badge " + (classMap[label] || "badge-unknown");
//   el.textContent = label + (confidence > 0 ? ` ${confidence}%` : "");
// }

// // ── Render Stat Grid ──────────────────────────────────────────────
// function renderStatGrid(id, fp) {
//   const el = document.getElementById(id);
//   const stats = [
//     { label: "TOTAL PACKETS",    value: fp.total_packets.toLocaleString() },
//     { label: "TOTAL DATA",       value: fp.total_kb + " KB" },
//     { label: "MEAN PACKET SIZE", value: fp.mean_packet_size + " B" },
//     { label: "MAX PACKET SIZE",  value: fp.max_packet_size + " B" },
//     { label: "UNIQUE IPs",       value: fp.unique_ip_count },
//     { label: "DNS QUERIES",      value: fp.dns_query_count },
//     { label: "TOP PROTOCOL",     value: fp.top_protocol },
//     { label: "CAPTURE DURATION", value: fp.capture_duration_sec + "s" },
//   ];
//   el.innerHTML = stats.map(s => `
//     <div class="stat-item">
//       <div class="stat-label">${s.label}</div>
//       <div class="stat-value">${s.value}</div>
//     </div>
//   `).join("");
// }

// // ── Render DNS list ───────────────────────────────────────────────
// function renderDnsList(id, queries) {
//   const el = document.getElementById(id);
//   if (!queries || !queries.length) {
//     el.innerHTML = '<span class="tag">none captured</span>';
//     return;
//   }
//   el.innerHTML = queries.slice(0, 15).map(q =>
//     `<span class="tag">${escHtml(q)}</span>`
//   ).join("") + (queries.length > 15 ? `<span class="tag">+${queries.length-15} more</span>` : "");
// }

// // ── Render IP list ────────────────────────────────────────────────
// function renderIpList(id, ips) {
//   const el = document.getElementById(id);
//   if (!ips || !ips.length) {
//     el.innerHTML = '<span class="tag">none captured</span>';
//     return;
//   }
//   el.innerHTML = ips.slice(0, 12).map(ip =>
//     `<span class="tag">${escHtml(ip)}</span>`
//   ).join("") + (ips.length > 12 ? `<span class="tag">+${ips.length-12} more</span>` : "");
// }

// // ── Render Diff Column ────────────────────────────────────────────
// function renderDiffCol(diff) {
//   const col = document.getElementById("diff-col");
//   const metrics = [
//     { key: "total_bytes",      label: "BYTES" },
//     { key: "total_packets",    label: "PACKETS" },
//     { key: "unique_ips",       label: "UNIQUE IPs" },
//     { key: "mean_packet_size", label: "MEAN SIZE" },
//   ];

//   let html = '<div class="diff-title">DIFF</div>';
//   metrics.forEach(m => {
//     const d = diff[m.key];
//     if (!d) return;
//     let winnerClass = "winner-tie";
//     let winnerText = "TIE";
//     if (d.winner === "site1") { winnerClass = "winner-a"; winnerText = "A"; }
//     if (d.winner === "site2") { winnerClass = "winner-b"; winnerText = "B"; }
//     html += `
//       <div class="diff-item">
//         <div class="diff-metric">${m.label}</div>
//         <div class="diff-winner ${winnerClass}">${winnerText}</div>
//       </div>
//     `;
//   });
//   col.innerHTML = html;
// }

// // ── Chart helpers ─────────────────────────────────────────────────
// const CHART_DEFAULTS = {
//   plugins: { legend: { labels: { color: "#c8d8e8", font: { family: "'Share Tech Mono'" } } } },
//   scales: {
//     x: { ticks: { color: "#5a7a8a", font: { family: "'Share Tech Mono'", size: 10 } },
//          grid: { color: "#1e3a4a" } },
//     y: { ticks: { color: "#5a7a8a", font: { family: "'Share Tech Mono'", size: 10 } },
//          grid: { color: "#1e3a4a" } },
//   },
// };

// function getCtx(id) {
//   if (charts[id]) { charts[id].destroy(); delete charts[id]; }
//   return document.getElementById(id).getContext("2d");
// }

// // ── Protocol Pie Chart ────────────────────────────────────────────
// function renderProtoChart(canvasId, distribution, singleColor) {
//   if (!distribution || !Object.keys(distribution).length) return;

//   const labels = Object.keys(distribution);
//   const values = labels.map(k => distribution[k]);
//   const COLORS = ["#00aaff","#00ffcc","#ffcc00","#ff6b35","#ff3366","#a855f7","#22d3ee"];

//   const ctx = getCtx(canvasId);
//   charts[canvasId] = new Chart(ctx, {
//     type: "doughnut",
//     data: {
//       labels,
//       datasets: [{ data: values, backgroundColor: COLORS.slice(0, labels.length),
//                    borderColor: "#0d1117", borderWidth: 2 }]
//     },
//     options: {
//       responsive: true, maintainAspectRatio: false,
//       plugins: {
//         legend: { position: "right",
//           labels: { color: "#c8d8e8", font: { family: "'Share Tech Mono'", size: 10 },
//                     padding: 12, boxWidth: 12 } },
//         tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
//       }
//     }
//   });
// }

// // ── Packet Size Histogram ─────────────────────────────────────────
// function renderHistogram(canvasId, histogram) {
//   if (!histogram) return;
//   const labels = Object.keys(histogram);
//   const values = labels.map(k => histogram[k]);

//   const ctx = getCtx(canvasId);
//   charts[canvasId] = new Chart(ctx, {
//     type: "bar",
//     data: {
//       labels,
//       datasets: [{
//         label: "Packet Count",
//         data: values,
//         backgroundColor: "rgba(0,170,255,0.5)",
//         borderColor: "#00aaff",
//         borderWidth: 1,
//       }]
//     },
//     options: {
//       responsive: true, maintainAspectRatio: false,
//       plugins: { legend: { display: false } },
//       scales: {
//         x: { title: { display: true, text: "Size (bytes)", color: "#5a7a8a",
//                        font: { family: "'Share Tech Mono'", size: 9 } },
//              ...CHART_DEFAULTS.scales.x },
//         y: { title: { display: true, text: "Count", color: "#5a7a8a",
//                        font: { family: "'Share Tech Mono'", size: 9 } },
//              ...CHART_DEFAULTS.scales.y },
//       }
//     }
//   });
// }

// // ── Traffic Timeline ──────────────────────────────────────────────
// function renderTimeline(canvasId, timeline, label) {
//   if (!timeline || !Object.keys(timeline).length) return;

//   const seconds = Object.keys(timeline).map(Number).sort((a, b) => a - b);
//   const bytes = seconds.map(s => timeline[String(s)] || 0);

//   const ctx = getCtx(canvasId);
//   charts[canvasId] = new Chart(ctx, {
//     type: "line",
//     data: {
//       labels: seconds.map(s => s + "s"),
//       datasets: [{
//         label: shortUrl(label),
//         data: bytes,
//         borderColor: "#00aaff",
//         backgroundColor: "rgba(0,170,255,0.1)",
//         fill: true,
//         tension: 0.4,
//         pointRadius: 2,
//       }]
//     },
//     options: {
//       responsive: true, maintainAspectRatio: false,
//       plugins: CHART_DEFAULTS.plugins,
//       scales: {
//         x: { title: { display: true, text: "Time (s)", color: "#5a7a8a",
//                        font: { family: "'Share Tech Mono'", size: 9 } },
//              ...CHART_DEFAULTS.scales.x },
//         y: { title: { display: true, text: "Bytes", color: "#5a7a8a",
//                        font: { family: "'Share Tech Mono'", size: 9 } },
//              ...CHART_DEFAULTS.scales.y },
//       }
//     }
//   });
// }

// // ── Comparison Timeline (two overlapping lines) ───────────────────
// function renderTimelineCompare(canvasId, fp1, fp2) {
//   const tl1 = fp1.timeline || {};
//   const tl2 = fp2.timeline || {};
//   const allSeconds = [...new Set([
//     ...Object.keys(tl1).map(Number),
//     ...Object.keys(tl2).map(Number),
//   ])].sort((a, b) => a - b);

//   const ctx = getCtx(canvasId);
//   charts[canvasId] = new Chart(ctx, {
//     type: "line",
//     data: {
//       labels: allSeconds.map(s => s + "s"),
//       datasets: [
//         {
//           label: shortUrl(fp1.site_url),
//           data: allSeconds.map(s => tl1[String(s)] || 0),
//           borderColor: "#00aaff",
//           backgroundColor: "rgba(0,170,255,0.08)",
//           fill: true, tension: 0.4, pointRadius: 2,
//         },
//         {
//           label: shortUrl(fp2.site_url),
//           data: allSeconds.map(s => tl2[String(s)] || 0),
//           borderColor: "#ff6b35",
//           backgroundColor: "rgba(255,107,53,0.08)",
//           fill: true, tension: 0.4, pointRadius: 2,
//         }
//       ]
//     },
//     options: {
//       responsive: true, maintainAspectRatio: false,
//       plugins: CHART_DEFAULTS.plugins,
//       scales: {
//         x: { ...CHART_DEFAULTS.scales.x },
//         y: { title: { display: true, text: "Bytes/sec", color: "#5a7a8a",
//                        font: { family: "'Share Tech Mono'", size: 9 } },
//              ...CHART_DEFAULTS.scales.y },
//       }
//     }
//   });
// }

// // ── Utility: escape HTML ──────────────────────────────────────────
// function escHtml(str) {
//   return String(str)
//     .replace(/&/g, "&amp;").replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// }

// // ── Allow pressing Enter to trigger analyze ───────────────────────
// document.addEventListener("DOMContentLoaded", () => {
//   document.getElementById("url-input").addEventListener("keydown", e => {
//     if (e.key === "Enter") analyzeSingle();
//   });
//   document.getElementById("url1-input").addEventListener("keydown", e => {
//     if (e.key === "Enter") analyzeCompare();
//   });
//   document.getElementById("url2-input").addEventListener("keydown", e => {
//     if (e.key === "Enter") analyzeCompare();
//   });
// });







"use strict";

/* ═══════════════════════════════════════════
   MODE TOGGLE
═══════════════════════════════════════════ */
function setMode(m) {
  document.getElementById('tab-single').classList.toggle('active', m === 'single');
  document.getElementById('tab-compare').classList.toggle('active', m === 'compare');
  document.getElementById('mode-single').style.display  = m === 'single'  ? 'block' : 'none';
  document.getElementById('mode-compare').style.display = m === 'compare' ? 'block' : 'none';
  hideResults();
  dismissError();
}

/* ═══════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════ */
function validateUrl(url, errId) {
  const el = document.getElementById(errId);
  if (!url) { el.textContent = 'Please enter a URL.'; return false; }
  if (!/^https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}/.test(url)) {
    el.textContent = 'URL must start with http:// or https:// and have a valid domain.';
    return false;
  }
  el.textContent = '';
  return true;
}

/* ═══════════════════════════════════════════
   PROGRESS
═══════════════════════════════════════════ */
const STEPS = [
  { id: 'step-1', label: 'Capturing network traffic (10 seconds)...', pct: 5  },
  { id: 'step-2', label: 'Extracting packet features...',             pct: 65 },
  { id: 'step-3', label: 'Building fingerprint profile...',           pct: 82 },
  { id: 'step-4', label: 'Classifying website behavior...',           pct: 96 },
];
const TIMINGS = [0, 11000, 14200, 16800];
let _timers = [];

function startProgress() {
  document.getElementById('progress-wrap').style.display = 'block';
  STEPS.forEach(s => {
    const el = document.getElementById(s.id);
    el.classList.remove('active', 'done');
  });
  _timers.forEach(clearTimeout); _timers = [];

  TIMINGS.forEach((delay, i) => {
    _timers.push(setTimeout(() => {
      if (i > 0) {
        const prev = document.getElementById(STEPS[i-1].id);
        prev.classList.remove('active'); prev.classList.add('done');
      }
      document.getElementById(STEPS[i].id).classList.add('active');
      setProgress(STEPS[i].pct, STEPS[i].label);
    }, delay));
  });
}

function setProgress(pct, label) {
  document.getElementById('prog-fill').style.width  = pct + '%';
  document.getElementById('prog-pct').textContent   = pct + '%';
  document.getElementById('prog-label').textContent = label;
}

function finishProgress() {
  setProgress(100, 'Done! Building your results...');
  STEPS.forEach(s => {
    const el = document.getElementById(s.id);
    el.classList.remove('active'); el.classList.add('done');
  });
  setTimeout(() => {
    document.getElementById('progress-wrap').style.display = 'none';
  }, 1200);
}

function stopProgress() {
  _timers.forEach(clearTimeout);
  document.getElementById('progress-wrap').style.display = 'none';
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function setDisabled(d) {
  ['btn-single','btn-compare','url-input','url1-input','url2-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.disabled = d;
  });
}
function showError(msg) {
  document.getElementById('error-text').textContent = msg;
  document.getElementById('error-banner').style.display = 'flex';
}
function dismissError() {
  document.getElementById('error-banner').style.display = 'none';
}
function hideResults() {
  document.getElementById('results').style.display = 'none';
  destroyCharts();
}
function shortUrl(url) {
  return url.replace(/^https?:\/\//, '').split('/')[0];
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ═══════════════════════════════════════════
   ANALYZE — SINGLE
═══════════════════════════════════════════ */
async function analyzeSingle() {
  const url = document.getElementById('url-input').value.trim();
  if (!validateUrl(url, 'err-url')) return;
  dismissError(); hideResults(); setDisabled(true); startProgress();
  try {
    const res  = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    finishProgress();
    if (!data.success) { showError(data.error || 'Analysis failed.'); return; }
    renderSingle(data.fingerprint);
    document.getElementById('results').style.display       = 'block';
    document.getElementById('single-result').style.display  = 'block';
    document.getElementById('compare-result').style.display = 'none';
    setTimeout(() => document.getElementById('results').scrollIntoView({ behavior: 'smooth' }), 200);
  } catch(e) {
    stopProgress();
    showError('Could not reach the server. Make sure Python app.py is running.');
  } finally { setDisabled(false); }
}

/* ═══════════════════════════════════════════
   ANALYZE — COMPARE
═══════════════════════════════════════════ */
async function analyzeCompare() {
  const url1 = document.getElementById('url1-input').value.trim();
  const url2 = document.getElementById('url2-input').value.trim();
  const ok1  = validateUrl(url1, 'err-url1');
  const ok2  = validateUrl(url2, 'err-url2');
  if (!ok1 || !ok2) return;
  dismissError(); hideResults(); setDisabled(true); startProgress();
  try {
    const res  = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url1, url2 })
    });
    const data = await res.json();
    finishProgress();
    if (!data.success) { showError(data.error || 'Comparison failed.'); return; }
    renderCompare(data.fingerprint1, data.fingerprint2, data.diff);
    document.getElementById('results').style.display        = 'block';
    document.getElementById('single-result').style.display  = 'none';
    document.getElementById('compare-result').style.display = 'block';
    setTimeout(() => document.getElementById('results').scrollIntoView({ behavior: 'smooth' }), 200);
  } catch(e) {
    stopProgress();
    showError('Could not reach the server. Make sure Python app.py is running.');
  } finally { setDisabled(false); }
}

/* ═══════════════════════════════════════════
   RENDER — SINGLE
═══════════════════════════════════════════ */
function renderSingle(fp) {
  setBadge('badge-single', fp.behavior_label, fp.confidence);
  renderStats('stats-single', fp, '');
  renderTags('dns-single', fp.dns_queries, 'None captured during session');
  renderTags('ips-single', fp.unique_ips,  'None captured during session');
  renderProto('chart-proto', fp.protocol_distribution);
  renderHist('chart-hist',   fp.size_histogram);
  renderTimeline('chart-time', fp.timeline, fp.site_url, '#2563eb', 'rgba(37,99,235,0.08)');
}

/* ═══════════════════════════════════════════
   RENDER — COMPARE
═══════════════════════════════════════════ */
function renderCompare(fp1, fp2, diff) {
  setBadge('badge-a', fp1.behavior_label, fp1.confidence);
  setBadge('badge-b', fp2.behavior_label, fp2.confidence);
  document.getElementById('label-a').textContent = shortUrl(fp1.site_url);
  document.getElementById('label-b').textContent = shortUrl(fp2.site_url);
  renderStats('stats-a', fp1, '');
  renderStats('stats-b', fp2, '');
  renderDiff(diff);
  renderProto('chart-proto-a', fp1.protocol_distribution, '#2563eb');
  renderProto('chart-proto-b', fp2.protocol_distribution, '#ea580c');
  renderTimelineCompare('chart-time-compare', fp1, fp2);
}

/* ═══════════════════════════════════════════
   RENDER PIECES
═══════════════════════════════════════════ */
function setBadge(id, label, conf) {
  const el  = document.getElementById(id);
  const map = {
    'Streaming':     'tag-streaming',
    'Social Media':  'tag-social',
    'Static Content':'tag-static',
    'API-Heavy':     'tag-api',
    'Unknown':       'tag-unknown',
  };
  el.className  = 'behavior-tag ' + (map[label] || 'tag-unknown');
  el.textContent = label + (conf > 0 ? ' · ' + conf + '%' : '');
}

function renderStats(id, fp) {
  const rows = [
    { name: 'Total Packets',    value: fp.total_packets.toLocaleString() },
    { name: 'Data Transferred', value: fp.total_kb + ' KB' },
    { name: 'Avg Packet Size',  value: fp.mean_packet_size + ' bytes' },
    { name: 'Largest Packet',   value: fp.max_packet_size + ' bytes' },
    { name: 'Unique Servers',   value: fp.unique_ip_count },
    { name: 'DNS Lookups',      value: fp.dns_query_count },
    { name: 'Top Protocol',     value: fp.top_protocol },
    { name: 'Session Duration', value: fp.capture_duration_sec + ' sec' },
  ];
  document.getElementById(id).innerHTML = rows.map(r => `
    <div class="stat-row">
      <span class="stat-name">${r.name}</span>
      <span class="stat-value">${r.value}</span>
    </div>`).join('');
}

function renderTags(id, arr, empty) {
  const el = document.getElementById(id);
  if (!arr || !arr.length) {
    el.innerHTML = `<span class="ip-tag">${empty}</span>`; return;
  }
  el.innerHTML = arr.slice(0, 14).map(t => `<span class="ip-tag">${esc(t)}</span>`).join('') +
    (arr.length > 14 ? `<span class="ip-tag">+${arr.length - 14} more</span>` : '');
}

function renderDiff(diff) {
  const col = document.getElementById('diff-col');
  const metrics = [
    { key: 'total_bytes',       label: 'More data'      },
    { key: 'total_packets',     label: 'More packets'   },
    { key: 'unique_ips',        label: 'More servers'   },
    { key: 'mean_packet_size',  label: 'Larger packets' },
  ];
  let html = '<div class="diff-heading">Which is higher?</div>';
  metrics.forEach(m => {
    const d = diff[m.key]; if (!d) return;
    const cls = d.winner === 'site1' ? 'diff-a' : d.winner === 'site2' ? 'diff-b' : 'diff-tie';
    const txt = d.winner === 'site1' ? 'Site A' : d.winner === 'site2' ? 'Site B' : 'Equal';
    html += `<div class="diff-row">
      <div class="diff-row-label">${m.label}</div>
      <div class="diff-row-winner ${cls}">${txt}</div>
    </div>`;
  });
  col.innerHTML = html;
}

/* ═══════════════════════════════════════════
   CHARTS
═══════════════════════════════════════════ */
const _charts = {};
function destroyCharts() {
  Object.values(_charts).forEach(c => { try { c.destroy(); } catch(e) {} });
  Object.keys(_charts).forEach(k => delete _charts[k]);
}
function ctx(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
  return document.getElementById(id).getContext('2d');
}

const PALETTE = ['#2563eb','#16a34a','#ea580c','#7c3aed','#ca8a04','#0891b2','#be123c','#0d9488'];

const TOOLTIP = {
  backgroundColor: '#ffffff',
  borderColor: '#e5e7eb',
  borderWidth: 1,
  titleColor: '#111827',
  bodyColor: '#4b5563',
  padding: 10,
  titleFont: { family: "'Fira Code'", size: 11 },
  bodyFont:  { family: "'Fira Code'", size: 11 },
};
const SCALES = {
  x: { ticks: { color: '#9ca3af', font: { family: "'Fira Code'", size: 10 } },
       grid:  { color: '#f3f4f6' } },
  y: { ticks: { color: '#9ca3af', font: { family: "'Fira Code'", size: 10 } },
       grid:  { color: '#f3f4f6' } },
};

function renderProto(id, dist) {
  if (!dist || !Object.keys(dist).length) return;
  const labels = Object.keys(dist), vals = labels.map(k => dist[k]);
  _charts[id] = new Chart(ctx(id), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: vals,
        backgroundColor: PALETTE.slice(0, labels.length),
        borderColor: '#ffffff', borderWidth: 3, hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#374151', font: { family: "'Inter'", size: 11 }, padding: 14, boxWidth: 11 }
        },
        tooltip: { ...TOOLTIP, callbacks: { label: c => ` ${c.label}: ${c.parsed}%` } }
      },
      animation: { duration: 700 }
    }
  });
}

function renderHist(id, hist) {
  if (!hist) return;
  const labels = Object.keys(hist), vals = labels.map(k => hist[k]);
  _charts[id] = new Chart(ctx(id), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Packets',
        data: vals,
        backgroundColor: '#bfdbfe',
        borderColor: '#2563eb',
        borderWidth: 1.5,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...TOOLTIP }
      },
      scales: {
        x: { ...SCALES.x, title: { display: true, text: 'Packet Size (bytes)', color: '#9ca3af', font: { family: "'Fira Code'", size: 9 } } },
        y: { ...SCALES.y, title: { display: true, text: 'Count', color: '#9ca3af', font: { family: "'Fira Code'", size: 9 } } }
      },
      animation: { duration: 600 }
    }
  });
}

function renderTimeline(id, timeline, label, color, bg) {
  if (!timeline || !Object.keys(timeline).length) return;
  const secs = Object.keys(timeline).map(Number).sort((a,b) => a-b);
  const vals = secs.map(s => timeline[String(s)] || 0);
  _charts[id] = new Chart(ctx(id), {
    type: 'line',
    data: {
      labels: secs.map(s => s + 's'),
      datasets: [{
        label: shortUrl(label),
        data: vals,
        borderColor: color, backgroundColor: bg,
        fill: true, tension: 0.4,
        pointRadius: 2, pointHoverRadius: 5,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#374151', font: { family: "'Inter'", size: 11 } } },
        tooltip: { ...TOOLTIP }
      },
      scales: {
        x: { ...SCALES.x, title: { display: true, text: 'Time (seconds)', color: '#9ca3af', font: { family: "'Fira Code'", size: 9 } } },
        y: { ...SCALES.y, title: { display: true, text: 'Bytes', color: '#9ca3af', font: { family: "'Fira Code'", size: 9 } } }
      },
      animation: { duration: 700 }
    }
  });
}

function renderTimelineCompare(id, fp1, fp2) {
  const tl1 = fp1.timeline || {}, tl2 = fp2.timeline || {};
  const all  = [...new Set([...Object.keys(tl1), ...Object.keys(tl2)].map(Number))].sort((a,b) => a-b);
  _charts[id] = new Chart(ctx(id), {
    type: 'line',
    data: {
      labels: all.map(s => s + 's'),
      datasets: [
        {
          label: shortUrl(fp1.site_url),
          data:  all.map(s => tl1[String(s)] || 0),
          borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.07)',
          fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2
        },
        {
          label: shortUrl(fp2.site_url),
          data:  all.map(s => tl2[String(s)] || 0),
          borderColor: '#ea580c', backgroundColor: 'rgba(234,88,12,0.07)',
          fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#374151', font: { family: "'Inter'", size: 11 } } },
        tooltip: { ...TOOLTIP, mode: 'index', intersect: false }
      },
      scales: {
        x: { ...SCALES.x },
        y: { ...SCALES.y, title: { display: true, text: 'Bytes/sec', color: '#9ca3af', font: { family: "'Fira Code'", size: 9 } } }
      }
    }
  });
}

/* ── Enter key support ── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('url-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') analyzeSingle();
  });
  ['url1-input','url2-input'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') analyzeCompare();
    });
  });
});