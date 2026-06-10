// tools/vitals.js
// Vitals module: single-file version
// Handles raw text parsing, duplicate values, quality flags, SVG charts, and tooltips.

const TOOL_KEY = "vitals";

let vitalsEventsBound = false;

const VITAL_META = {
  HR: {
    label: "HR",
    unit: "次/分",
    normal: [100, 180],
  },
  RR: {
    label: "RR",
    unit: "次/分",
    normal: [30, 60],
  },
  Temp: {
    label: "Temp",
    unit: "°C",
    normal: [36.5, 37.5],
  },
  SpO2: {
    label: "SpO₂",
    unit: "%",
    normal: [90, 100],
  },
  SBP: {
    label: "SBP",
    unit: "mmHg",
    normal: null,
  },
  DBP: {
    label: "DBP",
    unit: "mmHg",
    normal: null,
  },
  MAP: {
    label: "MAP",
    unit: "mmHg",
    normal: null,
  },
    ABPs: {
    label: "ABPs",
    unit: "mmHg",
    normal: null,
  },
  ABPd: {
    label: "ABPd",
    unit: "mmHg",
    normal: null,
  },
  ABPm: {
    label: "ABPm",
    unit: "mmHg",
    normal: null,
  },
};

const DEFAULT_VISIBLE_VITALS = [
  "HR",
  "RR",
  "SpO2",
  "Temp",
  "SBP",
  "DBP",
  "MAP",
  "ABPs",
  "ABPd",
  "ABPm",
];

const state = {
  rawInput: "",
  rows: [],
  points: [],
  visibleVitals: new Set(DEFAULT_VISIBLE_VITALS),
  duplicateStrategy: "all",
};

/* -------------------------------------------------------
 * Public module API
 * ----------------------------------------------------- */

export function render() {
  ensureVitalsEvents();

  return `
    <style>
      [data-tool="${TOOL_KEY}"] {
        width: 100%;
      }

      [data-tool="${TOOL_KEY}"] .vitals-layout {
        display: grid;
        grid-template-columns: minmax(300px, 390px) 1fr;
        gap: 14px;
        align-items: start;
      }

      [data-tool="${TOOL_KEY}"] .vitals-panel {
        border: 1px solid #6c757d2e;
        border-radius: 10px;
        padding: 12px;
        background: #fff;
      }

      [data-tool="${TOOL_KEY}"] .vitals-panel h3 {
        margin: 0 0 10px;
        font-size: 16px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-textarea {
        width: 100%;
        min-height: 380px;
        resize: vertical;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
        line-height: 1.45;
        padding: 10px;
        border: 1px solid #ced4da;
        border-radius: 8px;
        box-sizing: border-box;
      }

      [data-tool="${TOOL_KEY}"] .vitals-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-btn,
      [data-tool="${TOOL_KEY}"] .vitals-select {
        border: 1px solid #adb5bd;
        border-radius: 8px;
        background: #f8f9fa;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 13px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-btn:hover,
      [data-tool="${TOOL_KEY}"] .vitals-select:hover {
        background: #e9ecef;
      }

      [data-tool="${TOOL_KEY}"] .vitals-series-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-series-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 13px;
        padding: 4px 7px;
        border-radius: 6px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
      }

      [data-tool="${TOOL_KEY}"] .vitals-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-summary-card {
        border: 1px solid #6c757d2e;
        border-radius: 8px;
        padding: 8px;
        background: #fff;
      }

      [data-tool="${TOOL_KEY}"] .vitals-summary-card .label {
        font-size: 12px;
        color: #6c757d;
      }

      [data-tool="${TOOL_KEY}"] .vitals-summary-card .value {
        font-size: 18px;
        font-weight: 700;
        margin-top: 2px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-warning {
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        background: #fff3cd;
        color: #664d03;
        font-size: 13px;
        line-height: 1.45;
      }

      [data-tool="${TOOL_KEY}"] .vitals-chart-wrap {
        border: 1px solid #6c757d2e;
        border-radius: 10px;
        background: #fff;
        overflow: hidden;
      }

      [data-tool="${TOOL_KEY}"] .vitals-chart-header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 10px;
        border-bottom: 1px solid #6c757d2e;
        background: #f8f9fa;
        font-size: 13px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-chart-body {
        overflow-x: auto;
      }

      [data-tool="${TOOL_KEY}"] .vitals-empty {
        padding: 16px;
        color: #6c757d;
        font-size: 14px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-tooltip {
        position: fixed;
        z-index: 9999;
        max-width: 360px;
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(33, 37, 41, 0.94);
        color: #fff;
        font-size: 12px;
        line-height: 1.45;
        pointer-events: none;
        display: none;
        white-space: pre-wrap;
      }

      @media (max-width: 900px) {
        [data-tool="${TOOL_KEY}"] .vitals-layout {
          grid-template-columns: 1fr;
        }
      }
    </style>

    <div data-tool="${TOOL_KEY}">
      <div class="vitals-layout">
        <section class="vitals-panel">
          <h3>Vitals raw data</h3>

          <textarea
            class="vitals-textarea"
            data-vitals-input
            placeholder="貼上 vitals raw data..."
          ></textarea>

          <div class="vitals-controls">
            <button type="button" class="vitals-btn" data-vitals-parse>
              Parse
            </button>

            <button type="button" class="vitals-btn" data-vitals-clear>
              Clear
            </button>

            <select class="vitals-select" data-vitals-duplicate-strategy>
              <option value="all">Duplicate: show all</option>
              <option value="last">Duplicate: use last</option>
              <option value="first">Duplicate: use first</option>
              <option value="mean">Duplicate: mean</option>
            </select>
          </div>

          <div class="vitals-series-list">
            ${DEFAULT_VISIBLE_VITALS.map(key => {
              const meta = VITAL_META[key];

              return `
                <label class="vitals-series-item">
                  <input type="checkbox" data-vitals-series="${key}" checked>
                  ${meta.label}
                </label>
              `;
            }).join("")}
          </div>

          <div data-vitals-warnings></div>
        </section>

        <section>
          <div class="vitals-summary" data-vitals-summary></div>

          <div class="vitals-chart-wrap">
            <div class="vitals-chart-header">
              <span>Vitals chart</span>
              <span data-vitals-chart-meta></span>
            </div>

            <div class="vitals-chart-body" data-vitals-chart></div>
          </div>
        </section>
      </div>

      <div class="vitals-tooltip" data-vitals-tooltip></div>
    </div>
  `;
}

export function bind(container) {
  ensureVitalsEvents();

  const root = getRoot(container);
  if (!root) return;

  renderAll(root);
}

/* -------------------------------------------------------
 * Event binding
 * ----------------------------------------------------- */

function ensureVitalsEvents() {
  if (vitalsEventsBound) return;
  if (typeof document === "undefined") return;

  vitalsEventsBound = true;

  document.addEventListener("click", handleVitalsClick);
  document.addEventListener("change", handleVitalsChange);
}

function handleVitalsClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const parseBtn = target.closest("[data-vitals-parse]");
  if (parseBtn) {
    event.preventDefault();

    const root = parseBtn.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    const input = root.querySelector("[data-vitals-input]");
    state.rawInput = input?.value || "";

    console.log("[vitals] parse clicked", {
      rawLength: state.rawInput.length,
    });

    parseAndRender(root);
    return;
  }

  const clearBtn = target.closest("[data-vitals-clear]");
  if (clearBtn) {
    event.preventDefault();

    const root = clearBtn.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    const input = root.querySelector("[data-vitals-input]");
    if (input) input.value = "";

    state.rawInput = "";
    state.rows = [];
    state.points = [];

    renderAll(root);
  }
}

function handleVitalsChange(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const strategySelect = target.closest("[data-vitals-duplicate-strategy]");
  if (strategySelect) {
    const root = strategySelect.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    state.duplicateStrategy = strategySelect.value;

    rebuildPoints();
    renderAll(root);
    return;
  }

  const seriesCheckbox = target.closest("[data-vitals-series]");
  if (seriesCheckbox) {
    const root = seriesCheckbox.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    const key = seriesCheckbox.dataset.vitalsSeries;
    if (!key) return;

    if (seriesCheckbox.checked) {
      state.visibleVitals.add(key);
    } else {
      state.visibleVitals.delete(key);
    }

    rebuildPoints();
    renderAll(root);
  }
}

function getRoot(container) {
  if (!container) return null;

  if (container.matches?.(`[data-tool="${TOOL_KEY}"]`)) {
    return container;
  }

  return container.querySelector?.(`[data-tool="${TOOL_KEY}"]`);
}

/* -------------------------------------------------------
 * Main flow
 * ----------------------------------------------------- */

function parseAndRender(root) {
  const parsedRows = parseVitalsRaw(state.rawInput);

  console.log("[vitals] parsed rows", parsedRows);

  state.rows = annotateVitalsRows(parsedRows);

  rebuildPoints();
  renderAll(root);
}

function rebuildPoints() {
  state.points = createChartPoints(state.rows, {
    duplicateStrategy: state.duplicateStrategy,
    visibleVitals: [...state.visibleVitals],
  });
}

function renderAll(root) {
  renderSummary(root);
  renderWarnings(root);
  renderChart(root);
}

/* -------------------------------------------------------
 * Parser
 * ----------------------------------------------------- */

function parseVitalsRaw(input) {
  const normalized = String(input || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[：]/g, ":")
    .replace(/[　]/g, " ")
    .trim();

  if (!normalized) return [];

  const timeRegex = /\d{4}[/-]\d{2}[/-]\d{2}\s+\d{2}:\d{2}/g;
  const timeMatches = [...normalized.matchAll(timeRegex)];

  const rows = [];

  for (let i = 0; i < timeMatches.length; i++) {
    const originalTime = timeMatches[i][0];
    const blockStart = timeMatches[i].index + originalTime.length;
    const blockEnd =
      i + 1 < timeMatches.length
        ? timeMatches[i + 1].index
        : normalized.length;

    const raw = normalized.slice(blockStart, blockEnd).trim();
    const row = createEmptyVitalsRow(originalTime, raw);

    extractRepeated(raw, /HR\s*:\s*(-?\d+(?:\.\d+)?)/gi)
      .forEach(v => row.HR.push(v));

    extractRepeated(raw, /(?:RR|RESP)\s*:\s*(-?\d+(?:\.\d+)?)/gi)
      .forEach(v => row.RR.push(v));

    extractRepeated(raw, /(?:Warm\s*)?Temp\s*:\s*(-?\d+(?:\.\d+)?)/gi)
      .forEach(v => row.Temp.push(v));

    extractRepeated(raw, /SpO2\s*:\s*(-?\d+(?:\.\d+)?)/gi)
      .forEach(v => row.SpO2.push(v));

    extractRepeated(raw, /NBPm\s*:\s*(-?\d+(?:\.\d+)?)/gi)
      .forEach(v => row.MAP.push(v));
      
    extractRepeated(raw, /ABPs\s*:\s*(-?\d+(?:\.\d+)?)/gi)
      .forEach(v => row.ABPs.push(v));

    extractRepeated(raw, /ABPd\s*:\s*(-?\d+(?:\.\d+)?)/gi)
      .forEach(v => row.ABPd.push(v));

    extractRepeated(raw, /ABPm\s*:\s*(-?\d+(?:\.\d+)?)/gi)
      .forEach(v => row.ABPm.push(v));

    extractBP(raw).forEach(bp => {
      row.SBP.push(bp.sbp);
      row.DBP.push(bp.dbp);
    });

    rows.push(row);
  }

  return rows;
}

function createEmptyVitalsRow(originalTime, raw) {
  return {
    time: toLocalISOString(originalTime),
    originalTime,
    raw,

    HR: [],
    RR: [],
    Temp: [],
    SpO2: [],
    SBP: [],
    DBP: [],
    MAP: [],
    ABPs: [],
    ABPd: [],
    ABPm: [],
    flags: [],
  };
}

function extractRepeated(text, regex) {
  const values = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    values.push(Number(match[1]));
  }

  return values;
}

function extractBP(text) {
  const regex =
    /BP\s*:\s*(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)\s*mmHg/gi;

  const values = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    values.push({
      sbp: Number(match[1]),
      dbp: Number(match[2]),
    });
  }

  return values;
}

function toLocalISOString(timeText) {
  const [datePart, timePart] = timeText.trim().split(/\s+/);
  const [year, month, day] = datePart.split(/[/-]/).map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  return (
    `${String(year).padStart(4, "0")}-` +
    `${String(month).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}T` +
    `${String(hour).padStart(2, "0")}:` +
    `${String(minute).padStart(2, "0")}:00`
  );
}

/* -------------------------------------------------------
 * Flags / quality annotation
 * ----------------------------------------------------- */

function annotateVitalsRows(rows) {
  return rows.map(row => {
    const flags = [];

    addDuplicateFlags(row, flags);
    addZeroFlags(row, flags);
    addExtremeFlags(row, flags);
    addBPFlags(row, flags);

    return {
      ...row,
      flags: unique([...row.flags, ...flags]),
    };
  });
}

function addDuplicateFlags(row, flags) {
  if (row.HR.length > 1) flags.push("duplicate_HR");
  if (row.RR.length > 1) flags.push("duplicate_RR");
  if (row.Temp.length > 1) flags.push("duplicate_Temp");
  if (row.SpO2.length > 1) flags.push("duplicate_SpO2");
  if (row.SBP.length > 1) flags.push("duplicate_SBP");
  if (row.DBP.length > 1) flags.push("duplicate_DBP");
  if (row.MAP.length > 1) flags.push("duplicate_MAP");
}

function addZeroFlags(row, flags) {
  if (row.HR.includes(0)) flags.push("zero_HR");
  if (row.RR.includes(0)) flags.push("zero_RR");
  if (row.SpO2.includes(0)) flags.push("zero_SpO2");
}

function addExtremeFlags(row, flags) {
  row.HR.forEach(v => {
    if (v > 0 && v < 40) flags.push("very_low_HR");
    if (v > 220) flags.push("very_high_HR");
  });

  row.RR.forEach(v => {
    if (v > 100) flags.push("very_high_RR");
  });

  row.SpO2.forEach(v => {
    if (v > 0 && v < 70) flags.push("very_low_SpO2");
  });

  row.Temp.forEach(v => {
    if (v > 0 && v < 34) flags.push("very_low_Temp");
    if (v > 40) flags.push("very_high_Temp");
  });
}

function addBPFlags(row, flags) {
  if (row.SBP.length !== row.DBP.length) {
    flags.push("incomplete_BP");
  }

  row.SBP.forEach(v => {
    if (v > 0 && v < 35) flags.push("very_low_SBP");
    if (v > 120) flags.push("very_high_SBP");
  });

  row.DBP.forEach(v => {
    if (v > 0 && v < 10) flags.push("very_low_DBP");
    if (v > 80) flags.push("very_high_DBP");
  });

  row.MAP.forEach(v => {
    if (v > 0 && v < 20) flags.push("very_low_MAP");
    if (v > 90) flags.push("very_high_MAP");
  });
}

/* -------------------------------------------------------
 * Chart points
 * ----------------------------------------------------- */

function createChartPoints(rows, options = {}) {
  const {
    duplicateStrategy = "all",
    visibleVitals = DEFAULT_VISIBLE_VITALS,
  } = options;

  const points = [];

  rows.forEach(row => {
    visibleVitals.forEach(key => {
      const values = Array.isArray(row[key]) ? row[key] : [];
      if (!values.length) return;

      const selectedValues = resolveDuplicateValues(values, duplicateStrategy);

      selectedValues.forEach((value, index) => {
        points.push({
          time: row.time,
          timestamp: new Date(row.time).getTime(),
          originalTime: row.originalTime,
          key,
          label: VITAL_META[key]?.label || key,
          unit: VITAL_META[key]?.unit || "",
          value,
          index,
          duplicate: values.length > 1,
          duplicateCount: values.length,
          flags: row.flags,
          raw: row.raw,
        });
      });
    });
  });

  points.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.key !== b.key) return a.key.localeCompare(b.key);
    return a.index - b.index;
  });

  return points;
}

function resolveDuplicateValues(values, strategy) {
  if (strategy === "first") return [values[0]];
  if (strategy === "last") return [values[values.length - 1]];

  if (strategy === "mean") {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return [Number(mean.toFixed(2))];
  }

  return values;
}

/* -------------------------------------------------------
 * Summary / warnings
 * ----------------------------------------------------- */

function renderSummary(root) {
  const el = root.querySelector("[data-vitals-summary]");
  if (!el) return;

  const summary = summarizeRows(state.rows);

  el.innerHTML = `
    <div class="vitals-summary-card">
      <div class="label">Time points</div>
      <div class="value">${state.rows.length}</div>
    </div>

    <div class="vitals-summary-card">
      <div class="label">Chart points</div>
      <div class="value">${state.points.length}</div>
    </div>

    <div class="vitals-summary-card">
      <div class="label">Duplicate rows</div>
      <div class="value">${summary.duplicateRows}</div>
    </div>

    <div class="vitals-summary-card">
      <div class="label">Flagged rows</div>
      <div class="value">${summary.flaggedRows}</div>
    </div>
  `;
}

function summarizeRows(rows) {
  let duplicateRows = 0;
  let flaggedRows = 0;

  rows.forEach(row => {
    if (row.flags.length > 0) flaggedRows++;

    const hasDuplicate = DEFAULT_VISIBLE_VITALS.some(key => {
      return Array.isArray(row[key]) && row[key].length > 1;
    });

    if (hasDuplicate) duplicateRows++;
  });

  return {
    duplicateRows,
    flaggedRows,
  };
}

function renderWarnings(root) {
  const el = root.querySelector("[data-vitals-warnings]");
  if (!el) return;

  const flaggedRows = state.rows.filter(row => row.flags.length > 0);

  if (!flaggedRows.length) {
    el.innerHTML = "";
    return;
  }

  const flagCounts = countFlags(flaggedRows);

  const flagText = Object.entries(flagCounts)
    .map(([flag, count]) => `${flag}: ${count}`)
    .join("、");

  el.innerHTML = `
    <div class="vitals-warning">
      偵測到 ${flaggedRows.length} 筆需注意紀錄。<br>
      ${escapeHTML(flagText)}
    </div>
  `;
}

function countFlags(rows) {
  const counts = {};

  rows.forEach(row => {
    row.flags.forEach(flag => {
      counts[flag] = (counts[flag] || 0) + 1;
    });
  });

  return counts;
}

/* -------------------------------------------------------
 * SVG chart renderer
 * ----------------------------------------------------- */
function hasAnyVisibleBPData(keys) {
  return keys.some(key => {
    return state.visibleVitals.has(key) &&
      state.points.some(point => point.key === key);
  });
}

function renderChart(root) {
  const chartEl = root.querySelector("[data-vitals-chart]");
  const metaEl = root.querySelector("[data-vitals-chart-meta]");

  if (!chartEl) return;

  if (!state.points.length) {
    chartEl.innerHTML = `
      <div class="vitals-empty">
        尚無可繪製資料。請先貼上 raw data 並按 Parse。
      </div>
    `;
    if (metaEl) metaEl.textContent = "";
    return;
  }

  const visibleKeys = [...state.visibleVitals].filter(key =>
    state.points.some(point => point.key === key)
  );

  const minTime = Math.min(...state.points.map(point => point.timestamp));
  const maxTime = Math.max(...state.points.map(point => point.timestamp));

  if (metaEl) {
    metaEl.textContent = `${formatTimeRange(minTime, maxTime)} · ${state.duplicateStrategy}`;
  }

  const excludedFromSingleCharts = new Set([
    "SBP", "DBP", "MAP",
    "ABPs", "ABPd", "ABPm",
  ]);

  const singleVitalKeys = visibleKeys.filter(key => !excludedFromSingleCharts.has(key));

  const spanHours = Math.max(1, (maxTime - minTime) / 36e5);
  const sharedWidth = Math.max(820, Math.ceil(spanHours * 28));

  const charts = [];

  if (hasAnyVisibleBPData(["SBP", "DBP", "MAP"])) {
    charts.push(
      renderBPCompositeChart({
        title: "周邊血壓 BP / NBPm",
        systolicKey: "SBP",
        diastolicKey: "DBP",
        meanKey: "MAP",
        allPoints: state.points,
        minTime,
        maxTime,
        width: sharedWidth,
        showXAxis: false,
      })
    );
  }

  if (hasAnyVisibleBPData(["ABPs", "ABPd", "ABPm"])) {
    charts.push(
      renderBPCompositeChart({
        title: "Aline 血壓 ABPs / ABPd / ABPm",
        systolicKey: "ABPs",
        diastolicKey: "ABPd",
        meanKey: "ABPm",
        allPoints: state.points,
        minTime,
        maxTime,
        width: sharedWidth,
        showXAxis: singleVitalKeys.length === 0,
      })
    );
  }

  singleVitalKeys.forEach((key, index) => {
    const showXAxis = index === singleVitalKeys.length - 1;

    charts.push(
      renderSingleVitalChart(
        key,
        state.points,
        minTime,
        maxTime,
        sharedWidth,
        showXAxis
      )
    );
  });

  chartEl.innerHTML = charts.join("");

  bindChartTooltips(root);
}
function renderBPCompositeChart({
  title,
  systolicKey,
  diastolicKey,
  meanKey,
  allPoints,
  minTime,
  maxTime,
  width,
  showXAxis,
}) {
  const points = allPoints.filter(point => {
    return [systolicKey, diastolicKey, meanKey].includes(point.key);
  });

  if (!points.length) return "";

  const height = showXAxis ? 230 : 190;

  const margin = {
    top: 28,
    right: 24,
    bottom: showXAxis ? 55 : 18,
    left: 46,
  };

  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const values = points.map(point => point.value);
  const [yMin, yMax] = getYDomain(values, null);

  const xScale = timestamp => {
    if (maxTime === minTime) return margin.left + plotW / 2;
    return margin.left + ((timestamp - minTime) / (maxTime - minTime)) * plotW;
  };

  const yScale = value => {
    if (yMax === yMin) return margin.top + plotH / 2;
    return margin.top + ((yMax - value) / (yMax - yMin)) * plotH;
  };

  const grouped = groupBPPointsByTime(points, systolicKey, diastolicKey, meanKey);

  const yTicks = renderYTicks(yMin, yMax, margin, plotW, yScale);
  const xTicks = renderXTicks(minTime, maxTime, margin, plotH, xScale, showXAxis);

  const meanPoints = grouped
    .filter(item => Number.isFinite(item.mean))
    .sort((a, b) => a.timestamp - b.timestamp);

  const meanLinePath = meanPoints
    .map((item, index) => {
      const x = xScale(item.timestamp);
      const y = yScale(item.mean);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const bars = grouped.map(item => {
    if (!Number.isFinite(item.systolic) || !Number.isFinite(item.diastolic)) {
      return "";
    }

    const x = xScale(item.timestamp);
    const ySys = yScale(item.systolic);
    const yDia = yScale(item.diastolic);

    return `
      <line
        x1="${x}"
        y1="${ySys}"
        x2="${x}"
        y2="${yDia}"
        stroke="currentColor"
        stroke-width="7"
        stroke-linecap="round"
        opacity="0.34"
      />
    `;
  }).join("");

  const meanDots = meanPoints.map(item => {
    const x = xScale(item.timestamp);
    const y = yScale(item.mean);

    return `
      <circle
        cx="${x}"
        cy="${y}"
        r="3.8"
        fill="#fff"
        stroke="currentColor"
        stroke-width="1.8"
        data-vitals-point="${encodeURIComponent(JSON.stringify(item.meanPoint))}"
      />
    `;
  }).join("");

  return `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      role="img"
      style="display:block; border-bottom:1px solid #6c757d2e;"
    >
      <text x="12" y="18" font-size="13" font-weight="700" fill="currentColor">
        ${escapeSVG(title)} (mmHg)
      </text>

      ${yTicks}
      ${xTicks}

      ${bars}

      <path
        d="${meanLinePath}"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
      />

      ${meanDots}
    </svg>
  `;
}
function groupBPPointsByTime(points, systolicKey, diastolicKey, meanKey) {
  const map = new Map();

  points.forEach(point => {
    const id = `${point.timestamp}-${point.index || 0}`;

    if (!map.has(id)) {
      map.set(id, {
        timestamp: point.timestamp,
        originalTime: point.originalTime,
        systolic: null,
        diastolic: null,
        mean: null,
        meanPoint: null,
      });
    }

    const item = map.get(id);

    if (point.key === systolicKey) item.systolic = point.value;
    if (point.key === diastolicKey) item.diastolic = point.value;

    if (point.key === meanKey) {
      item.mean = point.value;
      item.meanPoint = point;
    }
  });

  return [...map.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function renderSingleVitalChart(key, allPoints, minTime, maxTime, width, showXAxis) {
  const points = allPoints.filter(point => point.key === key);
  if (!points.length) return "";

  const meta = VITAL_META[key] || { label: key, unit: "", normal: null };

  const height = showXAxis ? 210 : 175;

  const margin = {
    top: 24,
    right: 24,
    bottom: showXAxis ? 55 : 18,
    left: 46,
  };

  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const values = points.map(point => point.value);
  const [yMin, yMax] = getYDomain(values, meta.normal);

  const xScale = timestamp => {
    if (maxTime === minTime) return margin.left + plotW / 2;
    return margin.left + ((timestamp - minTime) / (maxTime - minTime)) * plotW;
  };

  const yScale = value => {
    if (yMax === yMin) return margin.top + plotH / 2;
    return margin.top + ((yMax - value) / (yMax - yMin)) * plotH;
  };

  const linePath = buildLinePath(points, xScale, yScale);
  const normalBand = renderNormalBand(meta.normal, yMin, yMax, margin, plotW, yScale);
  const yTicks = renderYTicks(yMin, yMax, margin, plotW, yScale);
  const xTicks = renderXTicks(minTime, maxTime, margin, plotH, xScale, showXAxis);

  const circles = points.map(point => {
    const x = xScale(point.timestamp);
    const y = yScale(point.value);

    const isFlagged = point.flags.some(flag =>
      flag.endsWith(`_${key}`) || flag.includes(key)
    );

    return `
      <circle
        cx="${x}"
        cy="${y}"
        r="${point.duplicate ? 4.2 : 3.4}"
        fill="#fff"
        stroke="currentColor"
        stroke-width="${isFlagged ? 2.4 : 1.4}"
        data-vitals-point="${encodeURIComponent(JSON.stringify(point))}"
      />
    `;
  }).join("");

  return `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      role="img"
      style="display:block; border-bottom:1px solid #6c757d2e;"
    >
      <text x="12" y="17" font-size="13" font-weight="700" fill="currentColor">
        ${escapeSVG(meta.label)} ${meta.unit ? `(${escapeSVG(meta.unit)})` : ""}
      </text>

      ${normalBand}
      ${yTicks}
      ${xTicks}

      <path d="${linePath}" fill="none" stroke="currentColor" stroke-width="1.8" />

      ${circles}
    </svg>
  `;
}

function getYDomain(values, normalRange) {
  let min = Math.min(...values);
  let max = Math.max(...values);

  if (normalRange) {
    min = Math.min(min, normalRange[0]);
    max = Math.max(max, normalRange[1]);
  }

  if (min === max) {
    min -= 1;
    max += 1;
  }

  const padding = (max - min) * 0.12;

  return [
    Math.floor((min - padding) * 10) / 10,
    Math.ceil((max + padding) * 10) / 10,
  ];
}

function buildLinePath(points, xScale, yScale) {
  return points
    .map((point, index) => {
      const x = xScale(point.timestamp);
      const y = yScale(point.value);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function renderNormalBand(normalRange, yMin, yMax, margin, plotW, yScale) {
  if (!normalRange) return "";

  const [normalMin, normalMax] = normalRange;

  if (normalMax < yMin || normalMin > yMax) return "";

  const y1 = yScale(Math.min(normalMax, yMax));
  const y2 = yScale(Math.max(normalMin, yMin));

  return `
    <rect
      x="${margin.left}"
      y="${y1}"
      width="${plotW}"
      height="${Math.max(0, y2 - y1)}"
      fill="currentColor"
      opacity="0.06"
    />
  `;
}

function renderYTicks(yMin, yMax, margin, plotW, yScale) {
  const ticks = createTicks(yMin, yMax, 4);

  return ticks.map(value => {
    const y = yScale(value);

    return `
      <line
        x1="${margin.left}"
        y1="${y}"
        x2="${margin.left + plotW}"
        y2="${y}"
        stroke="currentColor"
        opacity="0.12"
      />

      <text
        x="${margin.left - 8}"
        y="${y + 4}"
        text-anchor="end"
        font-size="11"
        fill="currentColor"
        opacity="0.7"
      >
        ${formatNumber(value)}
      </text>
    `;
  }).join("");
}

function renderXTicks(minTime, maxTime, margin, plotH, xScale, showLabels) {
  const majorTicks = createDailyTicks(minTime, maxTime);
  const minorTicks = create4HourTicks(minTime, maxTime);

  const minorGrid = minorTicks.map(timestamp => {
    const x = xScale(timestamp);

    return `
      <line
        x1="${x}"
        y1="${margin.top}"
        x2="${x}"
        y2="${margin.top + plotH}"
        stroke="currentColor"
        opacity="0.05"
      />
    `;
  }).join("");

  const majorGrid = majorTicks.map(timestamp => {
    const x = xScale(timestamp);

    return `
      <line
        x1="${x}"
        y1="${margin.top}"
        x2="${x}"
        y2="${margin.top + plotH}"
        stroke="currentColor"
        opacity="0.22"
        stroke-width="1.4"
      />

      ${showLabels ? `
        <text
          x="${x}"
          y="${margin.top + plotH + 22}"
          text-anchor="middle"
          font-size="11"
          font-weight="700"
          fill="currentColor"
          opacity="0.8"
        >
          ${escapeSVG(formatDateLabel(timestamp))}
        </text>
      ` : ""}
    `;
  }).join("");

  return minorGrid + majorGrid;
}

function createTicks(min, max, count) {
  if (count <= 1 || min === max) return [min];

  const ticks = [];

  for (let i = 0; i < count; i++) {
    const value = min + ((max - min) * i) / (count - 1);
    ticks.push(Number(value.toFixed(1)));
  }

  return ticks;
}

function createTimeTicks(minTime, maxTime, count) {
  if (count <= 1 || minTime === maxTime) return [minTime];

  const ticks = [];

  for (let i = 0; i < count; i++) {
    const value = minTime + ((maxTime - minTime) * i) / (count - 1);
    ticks.push(value);
  }

  return ticks;
}


function createDailyTicks(minTime, maxTime) {
  const ticks = [];

  const cursor = new Date(minTime);
  cursor.setHours(0, 0, 0, 0);

  const end = new Date(maxTime);

  while (cursor.getTime() <= end.getTime()) {
    ticks.push(cursor.getTime());
    cursor.setDate(cursor.getDate() + 1);
  }

  return ticks;
}

function create4HourTicks(minTime, maxTime) {
  const ticks = [];

  const cursor = new Date(minTime);
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(Math.floor(cursor.getHours() / 4) * 4);

  const end = new Date(maxTime);

  while (cursor.getTime() <= end.getTime()) {
    ticks.push(cursor.getTime());
    cursor.setHours(cursor.getHours() + 4);
  }

  return ticks;
}

function formatDateLabel(timestamp) {
  const date = new Date(timestamp);

  return (
    `${String(date.getMonth() + 1).padStart(2, "0")}/` +
    `${String(date.getDate()).padStart(2, "0")}`
  );
}


/* -------------------------------------------------------
 * Tooltip
 * ----------------------------------------------------- */

function bindChartTooltips(root) {
  const tooltip = root.querySelector("[data-vitals-tooltip]");
  if (!tooltip) return;

  root.querySelectorAll("[data-vitals-point]").forEach(el => {
    el.addEventListener("mouseenter", event => {
      const encoded = el.getAttribute("data-vitals-point");
      if (!encoded) return;

      const point = JSON.parse(decodeURIComponent(encoded));

      tooltip.textContent = formatPointTooltip(point);
      tooltip.style.display = "block";

      moveTooltip(event, tooltip);
    });

    el.addEventListener("mousemove", event => {
      moveTooltip(event, tooltip);
    });

    el.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
  });
}

function moveTooltip(event, tooltip) {
  const offset = 12;
  const viewportW = window.innerWidth || document.documentElement.clientWidth;
  const viewportH = window.innerHeight || document.documentElement.clientHeight;

  let left = event.clientX + offset;
  let top = event.clientY + offset;

  const rect = tooltip.getBoundingClientRect();

  if (left + rect.width > viewportW - 8) {
    left = event.clientX - rect.width - offset;
  }

  if (top + rect.height > viewportH - 8) {
    top = event.clientY - rect.height - offset;
  }

  tooltip.style.left = `${Math.max(8, left)}px`;
  tooltip.style.top = `${Math.max(8, top)}px`;
}

function formatPointTooltip(point) {
  const lines = [
    `${point.originalTime}`,
    `${point.label}: ${point.value}${point.unit ? ` ${point.unit}` : ""}`,
  ];

  if (point.duplicate) {
    lines.push(`duplicate: ${point.duplicateCount}`);
  }

  if (point.flags?.length) {
    lines.push(`flags: ${point.flags.join(", ")}`);
  }

  if (point.raw) {
    lines.push("");
    lines.push(point.raw);
  }

  return lines.join("\n");
}

/* -------------------------------------------------------
 * Formatting helpers
 * ----------------------------------------------------- */

function formatClock(timestamp) {
  const date = new Date(timestamp);

  return (
    `${String(date.getHours()).padStart(2, "0")}:` +
    `${String(date.getMinutes()).padStart(2, "0")}`
  );
}

function formatTimeRange(minTime, maxTime) {
  return `${formatClock(minTime)}–${formatClock(maxTime)}`;
}

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function unique(arr) {
  return [...new Set(arr)];
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeSVG(value) {
  return escapeHTML(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
