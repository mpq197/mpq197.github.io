// tools/vitals.js
// Vitals module: single-file version
// Handles raw text parsing, duplicate values, quality flags, SVG charts, and tooltips.

const TOOL_KEY = "vitals";

let vitalsEventsBound = false;
let vitalsMiniMapDrag = null;

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

const CHART_BAND_META = {
  HR: { label: "HR", unit: "次/分", defaultRange: [100, 180], defaultOpacity: 0.06 },
  RR: { label: "RR", unit: "次/分", defaultRange: [30, 60], defaultOpacity: 0.06 },
  SpO2: { label: "SpO₂", unit: "%", defaultRange: [90, 100], defaultOpacity: 0.06 },
  Temp: { label: "Temp", unit: "°C", defaultRange: [36.5, 37.5], defaultOpacity: 0.06 },
  NBP: { label: "周邊血壓 BP / NBPm", unit: "mmHg", defaultRange: null, defaultOpacity: 0.06 },
  ABP: { label: "Aline 血壓 ABPs / ABPd / ABPm", unit: "mmHg", defaultRange: null, defaultOpacity: 0.06 },
};

const DEFAULT_CHART_BAND_RANGES = createDefaultChartBandRanges();

const CHART_AXIS_META = {
  HR: { label: "HR", defaultMin: 50, defaultMax: 250, defaultGrid: 20 },
  RR: { label: "RR", defaultMin: 0, defaultMax: 120, defaultGrid: 10 },
  SpO2: { label: "SpO₂", defaultMin: 60, defaultMax: 100, defaultGrid: 5 },
  Temp: { label: "Temp", defaultMin: 34, defaultMax: 40, defaultGrid: 0.5 },
  NBP: { label: "周邊血壓 BP / NBPm", defaultMin: 20, defaultMax: 100, defaultGrid: 10 },
  ABP: { label: "Aline 血壓 ABPs / ABPd / ABPm", defaultMin: 20, defaultMax: 100, defaultGrid: 10 },
};

const DEFAULT_CHART_AXIS_SETTINGS = createDefaultChartAxisSettings();

const state = {
  rawInput: "",
  rows: [],
  points: [],
  dateFilter: {
    minTime: null,
    maxTime: null,
    startTime: null,
    endTime: null,
  },
  visibleVitals: new Set(DEFAULT_VISIBLE_VITALS),
  duplicateStrategy: "all",
  chartBandRanges: cloneChartBandRanges(DEFAULT_CHART_BAND_RANGES),
  chartAxisSettings: cloneChartAxisSettings(DEFAULT_CHART_AXIS_SETTINGS),
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

      [data-tool="${TOOL_KEY}"] .vitals-band-settings,
      [data-tool="${TOOL_KEY}"] .vitals-axis-settings {
        margin-top: 12px;
        border-top: 1px solid #6c757d2e;
        padding-top: 10px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-band-settings h4,
      [data-tool="${TOOL_KEY}"] .vitals-axis-settings h4 {
        margin: 0 0 8px;
        font-size: 14px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-band-help,
      [data-tool="${TOOL_KEY}"] .vitals-axis-help {
        margin: -2px 0 8px;
        color: #6c757d;
        font-size: 12px;
        line-height: 1.45;
      }

      [data-tool="${TOOL_KEY}"] .vitals-band-grid,
      [data-tool="${TOOL_KEY}"] .vitals-axis-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 7px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-band-row {
        display: grid;
        grid-template-columns: minmax(78px, 1fr) 72px 72px 72px;
        gap: 6px;
        align-items: center;
        font-size: 12px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-axis-row {
        display: grid;
        grid-template-columns: minmax(78px, 1fr) 76px 72px 72px 72px;
        gap: 6px;
        align-items: center;
        font-size: 12px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-band-label,
      [data-tool="${TOOL_KEY}"] .vitals-axis-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      [data-tool="${TOOL_KEY}"] .vitals-band-input,
      [data-tool="${TOOL_KEY}"] .vitals-axis-input,
      [data-tool="${TOOL_KEY}"] .vitals-axis-select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #ced4da;
        border-radius: 7px;
        padding: 5px 6px;
        font-size: 12px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-band-input:focus,
      [data-tool="${TOOL_KEY}"] .vitals-axis-input:focus,
      [data-tool="${TOOL_KEY}"] .vitals-axis-select:focus {
        outline: 2px solid rgba(108, 117, 125, 0.18);
        border-color: #adb5bd;
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



      [data-tool="${TOOL_KEY}"] .vitals-top-grid {
        display: grid;
        grid-template-columns: minmax(320px, 420px) 1fr;
        gap: 14px;
        align-items: start;
        margin-bottom: 14px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-parameter-table-wrap {
        overflow-x: auto;
      }

      [data-tool="${TOOL_KEY}"] .vitals-parameter-table {
        width: 100%;
        min-width: 660px;
        border-collapse: collapse;
        font-size: 12px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-parameter-table th,
      [data-tool="${TOOL_KEY}"] .vitals-parameter-table td {
        border-bottom: 1px solid #6c757d2e;
        padding: 6px 5px;
        text-align: left;
        vertical-align: middle;
      }

      [data-tool="${TOOL_KEY}"] .vitals-parameter-table th {
        color: #495057;
        font-weight: 700;
        background: #f8f9fa;
        position: sticky;
        top: 0;
      }

      [data-tool="${TOOL_KEY}"] .vitals-param-label {
        font-weight: 700;
        white-space: nowrap;
      }

      [data-tool="${TOOL_KEY}"] .vitals-param-input {
        width: 76px;
        box-sizing: border-box;
        border: 1px solid #ced4da;
        border-radius: 7px;
        padding: 5px 6px;
        font-size: 12px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-param-input:focus {
        outline: 2px solid rgba(108, 117, 125, 0.18);
        border-color: #adb5bd;
      }

      [data-tool="${TOOL_KEY}"] .vitals-param-help {
        margin: 0 0 8px;
        color: #6c757d;
        font-size: 12px;
        line-height: 1.45;
      }

      [data-tool="${TOOL_KEY}"] .vitals-date-filter {
        margin: 0 0 12px;
        border: 1px solid #6c757d2e;
        border-radius: 10px;
        padding: 10px;
        background: #f8f9fa;
      }

      [data-tool="${TOOL_KEY}"] .vitals-date-filter h4 {
        margin: 0 0 8px;
        font-size: 14px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-date-input-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-date-filter-label {
        display: grid;
        gap: 4px;
        font-size: 12px;
        color: #495057;
      }

      [data-tool="${TOOL_KEY}"] .vitals-date-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #ced4da;
        border-radius: 7px;
        padding: 5px 6px;
        font-size: 12px;
        background: #fff;
      }

      [data-tool="${TOOL_KEY}"] .vitals-date-input:focus {
        outline: 2px solid rgba(108, 117, 125, 0.18);
        border-color: #adb5bd;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-slider {
        position: relative;
        height: 34px;
        margin: 12px 0 6px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-track,
      [data-tool="${TOOL_KEY}"] .vitals-range-selection {
        position: absolute;
        left: 0;
        right: 0;
        top: 15px;
        height: 6px;
        border-radius: 999px;
        pointer-events: none;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-track {
        background: #dee2e6;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-selection {
        left: var(--vitals-range-left, 0%);
        right: var(--vitals-range-right, 0%);
        background: currentColor;
        opacity: 0.38;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-slider input[type="range"] {
        position: absolute;
        left: 0;
        top: 7px;
        width: 100%;
        height: 22px;
        margin: 0;
        background: transparent;
        pointer-events: none;
        appearance: none;
        -webkit-appearance: none;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-slider input[type="range"]::-webkit-slider-runnable-track {
        height: 6px;
        background: transparent;
        border: 0;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-slider input[type="range"]::-moz-range-track {
        height: 6px;
        background: transparent;
        border: 0;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-slider input[type="range"]::-webkit-slider-thumb {
        pointer-events: auto;
        cursor: grab;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid currentColor;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.22);
        appearance: none;
        -webkit-appearance: none;
        margin-top: -6px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-slider input[type="range"]::-moz-range-thumb {
        pointer-events: auto;
        cursor: grab;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid currentColor;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.22);
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-slider input[type="range"]:active::-webkit-slider-thumb {
        cursor: grabbing;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-slider input[type="range"]:active::-moz-range-thumb {
        cursor: grabbing;
      }

      [data-tool="${TOOL_KEY}"] .vitals-date-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-date-filter-footer {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
        margin-top: 8px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-range-label {
        color: #495057;
        font-size: 12px;
        line-height: 1.45;
      }


      [data-tool="${TOOL_KEY}"] .vitals-minimap-wrap {
        margin-top: 10px;
        border: 1px solid #6c757d2e;
        border-radius: 9px;
        background: #fff;
        overflow: hidden;
      }

      [data-tool="${TOOL_KEY}"] .vitals-minimap-title {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 8px;
        border-bottom: 1px solid #6c757d2e;
        color: #495057;
        font-size: 12px;
        line-height: 1.35;
      }

      [data-tool="${TOOL_KEY}"] .vitals-minimap {
        height: 74px;
        cursor: crosshair;
        user-select: none;
        touch-action: none;
      }

      [data-tool="${TOOL_KEY}"] .vitals-minimap svg {
        display: block;
        width: 100%;
        height: 74px;
      }

      [data-tool="${TOOL_KEY}"] .vitals-minimap-selection {
        cursor: grab;
      }

      [data-tool="${TOOL_KEY}"] .vitals-minimap-selection:active {
        cursor: grabbing;
      }

      @media (max-width: 560px) {
        [data-tool="${TOOL_KEY}"] .vitals-date-input-grid {
          grid-template-columns: 1fr;
        }
      }


      [data-tool="${TOOL_KEY}"] .vitals-chart-section {
        margin-top: 0;
      }

      @media (max-width: 900px) {
        [data-tool="${TOOL_KEY}"] .vitals-layout,
        [data-tool="${TOOL_KEY}"] .vitals-top-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>

    <div data-tool="${TOOL_KEY}">
      <section class="vitals-top-grid">
        <div class="vitals-panel">
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
        </div>

        <div class="vitals-panel">
          <h3>圖表參數調整</h3>
          <div class="vitals-param-help">
            Y min / Y max 有填值時會固定 Y 軸；清空其中一格則回到自動縮放。Y 間距清空則自動產生格線。Ref min / Ref max 清空則不顯示半透明參考區間。
          </div>

          <div class="vitals-date-filter" data-vitals-date-filter hidden>
            <h4>顯示區間</h4>

            <div class="vitals-date-input-grid">
              <label class="vitals-date-filter-label">
                開始時間
                <input
                  type="datetime-local"
                  class="vitals-date-input"
                  data-vitals-time-start
                >
              </label>

              <label class="vitals-date-filter-label">
                結束時間
                <input
                  type="datetime-local"
                  class="vitals-date-input"
                  data-vitals-time-end
                >
              </label>
            </div>


            <div class="vitals-minimap-wrap" data-vitals-minimap-wrap hidden>
              <div class="vitals-minimap-title">
                <span>住院全程 Mini Map</span>
                <span>拖曳灰色區塊選擇顯示範圍</span>
              </div>
              <div class="vitals-minimap" data-vitals-minimap></div>
            </div>

            <div class="vitals-range-slider" data-vitals-range-slider>
              <div class="vitals-range-track"></div>
              <div class="vitals-range-selection" data-vitals-range-selection></div>
              <input type="range" data-vitals-range-start aria-label="顯示區間開始時間">
              <input type="range" data-vitals-range-end aria-label="顯示區間結束時間">
            </div>

            <div class="vitals-date-filter-footer">
              <span class="vitals-range-label" data-vitals-range-label>全部資料</span>
              <div class="vitals-date-presets">
                <button type="button" class="vitals-btn" data-vitals-time-preset="24h">
                  最近 24h
                </button>
                <button type="button" class="vitals-btn" data-vitals-time-preset="48h">
                  最近 48h
                </button>
                <button type="button" class="vitals-btn" data-vitals-time-preset="7d">
                  最近 7d
                </button>
                <button type="button" class="vitals-btn" data-vitals-time-preset="14d">
                  最近 14d
                </button>
                <button type="button" class="vitals-btn" data-vitals-time-preset="30d">
                  最近 30d
                </button>
                <button type="button" class="vitals-btn" data-vitals-time-reset>
                  全部資料
                </button>
              </div>
            </div>
          </div>

          <div class="vitals-parameter-table-wrap">
            <table class="vitals-parameter-table">
              <thead>
                <tr>
                  <th>圖表</th>
                  <th>Y min</th>
                  <th>Y max</th>
                  <th>Y 間距</th>
                  <th>Ref min</th>
                  <th>Ref max</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(CHART_BAND_META).map(([key, meta]) => {
                  const axis = DEFAULT_CHART_AXIS_SETTINGS[key] || {};
                  const range = DEFAULT_CHART_BAND_RANGES[key] || {};

                  return `
                    <tr>
                      <td class="vitals-param-label" title="${escapeHTML(meta.label)}">
                        ${escapeHTML(meta.label)}
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          class="vitals-param-input"
                          data-vitals-axis-min="${key}"
                          value="${formatInputValue(axis.min)}"
                          placeholder="auto"
                        >
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          class="vitals-param-input"
                          data-vitals-axis-max="${key}"
                          value="${formatInputValue(axis.max)}"
                          placeholder="auto"
                        >
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          class="vitals-param-input"
                          data-vitals-axis-grid="${key}"
                          value="${formatInputValue(axis.grid)}"
                          placeholder="auto"
                        >
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          class="vitals-param-input"
                          data-vitals-band-min="${key}"
                          value="${formatInputValue(range.min)}"
                          placeholder="none"
                        >
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          class="vitals-param-input"
                          data-vitals-band-max="${key}"
                          value="${formatInputValue(range.max)}"
                          placeholder="none"
                        >
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>

          <div class="vitals-controls">
            <button type="button" class="vitals-btn" data-vitals-axis-reset>
              Reset Y axes
            </button>
            <button type="button" class="vitals-btn" data-vitals-band-reset>
              Reset reference bands
            </button>
          </div>
        </div>
      </section>

      <section class="vitals-chart-section">
        <div class="vitals-summary" data-vitals-summary></div>

        <div class="vitals-chart-wrap">
          <div class="vitals-chart-header">
            <span>Vitals chart</span>
            <span data-vitals-chart-meta></span>
          </div>

          <div class="vitals-chart-body" data-vitals-chart></div>
        </div>
      </section>

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
  document.addEventListener("input", handleVitalsChange);
  document.addEventListener("pointerdown", handleVitalsPointerDown);
  document.addEventListener("pointermove", handleVitalsPointerMove);
  document.addEventListener("pointerup", handleVitalsPointerUp);
  document.addEventListener("pointercancel", handleVitalsPointerUp);
}


function handleVitalsPointerDown(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const miniMap = target.closest("[data-vitals-minimap]");
  if (!miniMap) return;

  const root = miniMap.closest(`[data-tool="${TOOL_KEY}"]`);
  if (!root) return;

  const { minTime, maxTime } = state.dateFilter;
  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime) || minTime === maxTime) return;

  event.preventDefault();

  const timestamp = getMiniMapTimestampFromEvent(event, miniMap);
  const currentStart = Number.isFinite(state.dateFilter.startTime) ? state.dateFilter.startTime : minTime;
  const currentEnd = Number.isFinite(state.dateFilter.endTime) ? state.dateFilter.endTime : maxTime;
  const currentWindow = Math.max(60 * 1000, Math.abs(currentEnd - currentStart));
  const selection = target.closest(".vitals-minimap-selection");

  vitalsMiniMapDrag = {
    root,
    miniMap,
    mode: selection ? "pan" : "select",
    anchorTime: timestamp,
    startTime: currentStart,
    endTime: currentEnd,
    windowMs: currentWindow,
  };

  if (vitalsMiniMapDrag.mode === "pan") {
    centerDateFilterOnTime(timestamp, currentWindow);
  } else {
    state.dateFilter.startTime = timestamp;
    state.dateFilter.endTime = timestamp;
  }

  syncDateFilterControls(root);
  renderAll(root);
}

function handleVitalsPointerMove(event) {
  if (!vitalsMiniMapDrag) return;

  const { root, mode, anchorTime, windowMs } = vitalsMiniMapDrag;
  const miniMap = root.querySelector("[data-vitals-minimap]");
  if (!miniMap) return;

  event.preventDefault();

  const timestamp = getMiniMapTimestampFromEvent(event, miniMap);

  if (mode === "pan") {
    centerDateFilterOnTime(timestamp, windowMs);
  } else {
    state.dateFilter.startTime = clampDateFilterTime(Math.min(anchorTime, timestamp));
    state.dateFilter.endTime = clampDateFilterTime(Math.max(anchorTime, timestamp));
  }

  syncDateFilterControls(root);
  renderAll(root);
}

function handleVitalsPointerUp() {
  vitalsMiniMapDrag = null;
}

function getMiniMapTimestampFromEvent(event, miniMap) {
  const rect = miniMap.getBoundingClientRect();
  const ratio = rect.width > 0
    ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    : 0;

  const { minTime, maxTime } = state.dateFilter;
  return minTime + ratio * (maxTime - minTime);
}

function centerDateFilterOnTime(centerTime, windowMs) {
  const { minTime, maxTime } = state.dateFilter;
  const half = windowMs / 2;
  let start = centerTime - half;
  let end = centerTime + half;

  if (start < minTime) {
    end += minTime - start;
    start = minTime;
  }

  if (end > maxTime) {
    start -= end - maxTime;
    end = maxTime;
  }

  state.dateFilter.startTime = clampDateFilterTime(start);
  state.dateFilter.endTime = clampDateFilterTime(end);
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

  const bandResetBtn = target.closest("[data-vitals-band-reset]");
  if (bandResetBtn) {
    event.preventDefault();

    const root = bandResetBtn.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    state.chartBandRanges = cloneChartBandRanges(DEFAULT_CHART_BAND_RANGES);
    syncBandInputs(root);
    renderAll(root);
    return;
  }

  const axisResetBtn = target.closest("[data-vitals-axis-reset]");
  if (axisResetBtn) {
    event.preventDefault();

    const root = axisResetBtn.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    state.chartAxisSettings = cloneChartAxisSettings(DEFAULT_CHART_AXIS_SETTINGS);
    syncAxisInputs(root);
    renderAll(root);
    return;
  }

  const timePresetBtn = target.closest("[data-vitals-time-preset]");
  if (timePresetBtn) {
    event.preventDefault();

    const root = timePresetBtn.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    applyDateFilterPreset(timePresetBtn.dataset.vitalsTimePreset);
    syncDateFilterControls(root);
    renderAll(root);
    return;
  }

  const timeResetBtn = target.closest("[data-vitals-time-reset]");
  if (timeResetBtn) {
    event.preventDefault();

    const root = timeResetBtn.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    resetDateFilterToFullRange();
    syncDateFilterControls(root);
    renderAll(root);
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
    state.dateFilter = {
      minTime: null,
      maxTime: null,
      startTime: null,
      endTime: null,
    };

    syncDateFilterControls(root);
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
    return;
  }

  const timeStartInput = target.closest("[data-vitals-time-start]");
  if (timeStartInput) {
    const root = timeStartInput.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    const timestamp = parseDateTimeLocalValue(timeStartInput.value);
    if (Number.isFinite(timestamp)) {
      state.dateFilter.startTime = clampDateFilterTime(timestamp);
      if (Number.isFinite(state.dateFilter.endTime) && state.dateFilter.startTime > state.dateFilter.endTime) {
        state.dateFilter.endTime = state.dateFilter.startTime;
      }
    } else {
      state.dateFilter.startTime = state.dateFilter.minTime;
    }

    syncDateFilterControls(root);
    renderAll(root);
    return;
  }

  const timeEndInput = target.closest("[data-vitals-time-end]");
  if (timeEndInput) {
    const root = timeEndInput.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    const timestamp = parseDateTimeLocalValue(timeEndInput.value);
    if (Number.isFinite(timestamp)) {
      state.dateFilter.endTime = clampDateFilterTime(timestamp);
      if (Number.isFinite(state.dateFilter.startTime) && state.dateFilter.endTime < state.dateFilter.startTime) {
        state.dateFilter.startTime = state.dateFilter.endTime;
      }
    } else {
      state.dateFilter.endTime = state.dateFilter.maxTime;
    }

    syncDateFilterControls(root);
    renderAll(root);
    return;
  }

  const rangeStartInput = target.closest("[data-vitals-range-start]");
  if (rangeStartInput) {
    const root = rangeStartInput.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    state.dateFilter.startTime = clampDateFilterTime(Number(rangeStartInput.value));
    if (Number.isFinite(state.dateFilter.endTime) && state.dateFilter.startTime > state.dateFilter.endTime) {
      state.dateFilter.endTime = state.dateFilter.startTime;
    }

    syncDateFilterControls(root);
    renderAll(root);
    return;
  }

  const rangeEndInput = target.closest("[data-vitals-range-end]");
  if (rangeEndInput) {
    const root = rangeEndInput.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    state.dateFilter.endTime = clampDateFilterTime(Number(rangeEndInput.value));
    if (Number.isFinite(state.dateFilter.startTime) && state.dateFilter.endTime < state.dateFilter.startTime) {
      state.dateFilter.startTime = state.dateFilter.endTime;
    }

    syncDateFilterControls(root);
    renderAll(root);
    return;
  }

  const bandInput = target.closest(
    "[data-vitals-band-min], [data-vitals-band-max]"
  );

  if (bandInput) {
    const root = bandInput.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    updateBandRangeFromInput(bandInput);
    renderAll(root);
    return;
  }

  const axisInput = target.closest(
    "[data-vitals-axis-min], [data-vitals-axis-max], [data-vitals-axis-grid]"
  );

  if (axisInput) {
    const root = axisInput.closest(`[data-tool="${TOOL_KEY}"]`);
    if (!root) return;

    updateAxisSettingFromInput(axisInput);
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


function createDefaultChartBandRanges() {
  const ranges = {};

  Object.entries(CHART_BAND_META).forEach(([key, meta]) => {
    const defaultRange = Array.isArray(meta.defaultRange) ? meta.defaultRange : null;

    ranges[key] = {
      min: defaultRange ? defaultRange[0] : null,
      max: defaultRange ? defaultRange[1] : null,
      opacity: Number.isFinite(meta.defaultOpacity) ? meta.defaultOpacity : 0.06,
    };
  });

  return ranges;
}

function cloneChartBandRanges(ranges) {
  return Object.fromEntries(
    Object.entries(ranges || {}).map(([key, value]) => [
      key,
      {
        min: normalizeNullableNumber(value?.min),
        max: normalizeNullableNumber(value?.max),
        opacity: normalizeBandOpacity(value?.opacity),
      },
    ])
  );
}

function createDefaultChartAxisSettings() {
  const settings = {};

  Object.entries(CHART_AXIS_META).forEach(([key, meta]) => {
    settings[key] = {
      min: normalizeNullableNumber(meta.defaultMin),
      max: normalizeNullableNumber(meta.defaultMax),
      grid: normalizePositiveNumber(meta.defaultGrid),
    };
  });

  return settings;
}

function cloneChartAxisSettings(settings) {
  return Object.fromEntries(
    Object.entries(settings || {}).map(([key, value]) => [
      key,
      {
        min: normalizeNullableNumber(value?.min),
        max: normalizeNullableNumber(value?.max),
        grid: normalizePositiveNumber(value?.grid),
      },
    ])
  );
}

function updateAxisSettingFromInput(input) {
  const key =
    input.dataset.vitalsAxisMin ||
    input.dataset.vitalsAxisMax ||
    input.dataset.vitalsAxisGrid;

  if (!key || !CHART_AXIS_META[key]) return;

  if (!state.chartAxisSettings[key]) {
    const fallback = DEFAULT_CHART_AXIS_SETTINGS[key] || {};
    state.chartAxisSettings[key] = {
      min: normalizeNullableNumber(fallback.min),
      max: normalizeNullableNumber(fallback.max),
      grid: normalizePositiveNumber(fallback.grid),
    };
  }


  if (input.dataset.vitalsAxisMin) {
    state.chartAxisSettings[key].min = normalizeNullableNumber(input.value);
  }

  if (input.dataset.vitalsAxisMax) {
    state.chartAxisSettings[key].max = normalizeNullableNumber(input.value);
  }

  if (input.dataset.vitalsAxisGrid) {
    state.chartAxisSettings[key].grid = normalizePositiveNumber(input.value);
  }
}

function syncAxisInputs(root) {
  Object.entries(state.chartAxisSettings).forEach(([key, axis]) => {
    const minInput = root.querySelector(`[data-vitals-axis-min="${key}"]`);
    const maxInput = root.querySelector(`[data-vitals-axis-max="${key}"]`);
    const gridInput = root.querySelector(`[data-vitals-axis-grid="${key}"]`);

    if (minInput) minInput.value = formatInputValue(axis.min);
    if (maxInput) maxInput.value = formatInputValue(axis.max);
    if (gridInput) gridInput.value = formatInputValue(axis.grid);
  });
}

function getChartAxisSetting(key) {
  return state.chartAxisSettings[key] || DEFAULT_CHART_AXIS_SETTINGS[key] || null;
}

function updateBandRangeFromInput(input) {
  const key =
    input.dataset.vitalsBandMin ||
    input.dataset.vitalsBandMax ||
    input.dataset.vitalsBandOpacity;

  if (!key || !CHART_BAND_META[key]) return;

  if (!state.chartBandRanges[key]) {
    state.chartBandRanges[key] = { min: null, max: null, opacity: 0.06 };
  }

  if (input.dataset.vitalsBandMin) {
    state.chartBandRanges[key].min = normalizeNullableNumber(input.value);
  }

  if (input.dataset.vitalsBandMax) {
    state.chartBandRanges[key].max = normalizeNullableNumber(input.value);
  }

  if (input.dataset.vitalsBandOpacity) {
    state.chartBandRanges[key].opacity = normalizeBandOpacity(input.value);
  }
}

function syncBandInputs(root) {
  Object.entries(state.chartBandRanges).forEach(([key, range]) => {
    const minInput = root.querySelector(`[data-vitals-band-min="${key}"]`);
    const maxInput = root.querySelector(`[data-vitals-band-max="${key}"]`);
    const opacityInput = root.querySelector(`[data-vitals-band-opacity="${key}"]`);

    if (minInput) minInput.value = formatInputValue(range.min);
    if (maxInput) maxInput.value = formatInputValue(range.max);
    if (opacityInput) opacityInput.value = formatInputValue(range.opacity);
  });
}

function getChartBandRange(key) {
  const range = state.chartBandRanges[key];
  if (!range) return null;

  const min = normalizeNullableNumber(range.min);
  const max = normalizeNullableNumber(range.max);

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min === max) return null;

  return [Math.min(min, max), Math.max(min, max), normalizeBandOpacity(range.opacity)];
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePositiveNumber(value) {
  const number = normalizeNullableNumber(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeBandOpacity(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0.06;
  return Math.min(1, Math.max(0, number));
}

/* -------------------------------------------------------
 * Main flow
 * ----------------------------------------------------- */

function parseAndRender(root) {
  const parsedRows = parseVitalsRaw(state.rawInput);

  console.log("[vitals] parsed rows", parsedRows);

  state.rows = annotateVitalsRows(parsedRows);

  rebuildPoints();
  resetDateFilterToFullRange();
  syncDateFilterControls(root);
  renderAll(root);
}

function rebuildPoints() {
  state.points = createChartPoints(state.rows, {
    duplicateStrategy: state.duplicateStrategy,
    visibleVitals: [...state.visibleVitals],
  });

  syncDateFilterToPoints(false);
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
function hasAnyVisibleBPData(keys, points = state.points) {
  return keys.some(key => {
    return state.visibleVitals.has(key) &&
      points.some(point => point.key === key);
  });
}

function syncDateFilterToPoints(reset = false) {
  if (!state.points.length) {
    state.dateFilter = {
      minTime: null,
      maxTime: null,
      startTime: null,
      endTime: null,
    };
    return;
  }

  const minTime = Math.min(...state.points.map(point => point.timestamp));
  const maxTime = Math.max(...state.points.map(point => point.timestamp));

  state.dateFilter.minTime = minTime;
  state.dateFilter.maxTime = maxTime;

  if (reset || !Number.isFinite(state.dateFilter.startTime)) {
    state.dateFilter.startTime = minTime;
  }

  if (reset || !Number.isFinite(state.dateFilter.endTime)) {
    state.dateFilter.endTime = maxTime;
  }

  state.dateFilter.startTime = clampDateFilterTime(state.dateFilter.startTime);
  state.dateFilter.endTime = clampDateFilterTime(state.dateFilter.endTime);

  if (state.dateFilter.startTime > state.dateFilter.endTime) {
    state.dateFilter.startTime = minTime;
    state.dateFilter.endTime = maxTime;
  }
}

function resetDateFilterToFullRange() {
  syncDateFilterToPoints(true);
}

function applyDateFilterPreset(preset) {
  syncDateFilterToPoints(false);

  const { minTime, maxTime } = state.dateFilter;
  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) return;

  const presetHours = {
    "24h": 24,
    "48h": 48,
    "7d": 24 * 7,
    "14d": 24 * 14,
    "30d": 24 * 30,
  };

  const hours = presetHours[preset];
  if (!Number.isFinite(hours)) return;

  state.dateFilter.endTime = maxTime;
  state.dateFilter.startTime = Math.max(minTime, maxTime - hours * 36e5);
}

function clampDateFilterTime(timestamp) {
  const value = Number(timestamp);
  const { minTime, maxTime } = state.dateFilter;

  if (!Number.isFinite(value)) return null;
  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) return value;

  return Math.max(minTime, Math.min(value, maxTime));
}

function getFilteredPoints() {
  const { startTime, endTime } = state.dateFilter;

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return state.points;
  }

  const min = Math.min(startTime, endTime);
  const max = Math.max(startTime, endTime);

  return state.points.filter(point =>
    point.timestamp >= min && point.timestamp <= max
  );
}

function parseDateTimeLocalValue(value) {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function syncDateFilterControls(root) {
  const panel = root.querySelector("[data-vitals-date-filter]");
  const startInput = root.querySelector("[data-vitals-time-start]");
  const endInput = root.querySelector("[data-vitals-time-end]");
  const rangeStart = root.querySelector("[data-vitals-range-start]");
  const rangeEnd = root.querySelector("[data-vitals-range-end]");
  const rangeSelection = root.querySelector("[data-vitals-range-selection]");
  const label = root.querySelector("[data-vitals-range-label]");
  const miniMapWrap = root.querySelector("[data-vitals-minimap-wrap]");
  const miniMap = root.querySelector("[data-vitals-minimap]");

  if (!panel) return;

  const { minTime, maxTime, startTime, endTime } = state.dateFilter;

  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime) || minTime === maxTime) {
    panel.hidden = true;
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";
    if (label) label.textContent = "全部資料";
    if (miniMapWrap) miniMapWrap.hidden = true;
    if (miniMap) miniMap.innerHTML = "";
    return;
  }

  panel.hidden = false;
  if (miniMapWrap) miniMapWrap.hidden = false;

  const minValue = toDateTimeLocalValue(minTime);
  const maxValue = toDateTimeLocalValue(maxTime);
  const step = String(60 * 1000);

  [startInput, endInput].forEach(input => {
    if (!input) return;
    input.min = minValue;
    input.max = maxValue;
  });

  if (startInput) startInput.value = toDateTimeLocalValue(startTime);
  if (endInput) endInput.value = toDateTimeLocalValue(endTime);

  [rangeStart, rangeEnd].forEach(input => {
    if (!input) return;
    input.min = String(minTime);
    input.max = String(maxTime);
    input.step = step;
  });

  if (rangeStart) rangeStart.value = String(startTime);
  if (rangeEnd) rangeEnd.value = String(endTime);

  if (rangeSelection) {
    const span = Math.max(1, maxTime - minTime);
    const left = ((Math.min(startTime, endTime) - minTime) / span) * 100;
    const right = 100 - ((Math.max(startTime, endTime) - minTime) / span) * 100;

    rangeSelection.style.setProperty("--vitals-range-left", `${Math.max(0, Math.min(100, left))}%`);
    rangeSelection.style.setProperty("--vitals-range-right", `${Math.max(0, Math.min(100, right))}%`);
  }

  if (label) {
    label.textContent = `${formatDateTime(startTime)} – ${formatDateTime(endTime)}`;
  }

  if (miniMap) {
    miniMap.innerHTML = renderVitalsMiniMap();
  }
}

function renderVitalsMiniMap() {
  const { minTime, maxTime, startTime, endTime } = state.dateFilter;

  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime) || minTime === maxTime) {
    return "";
  }

  const width = 1000;
  const height = 74;
  const top = 10;
  const bottom = 18;
  const plotH = height - top - bottom;
  const bucketCount = 120;
  const buckets = Array.from({ length: bucketCount }, () => 0);
  const span = Math.max(1, maxTime - minTime);

  state.points.forEach(point => {
    if (!Number.isFinite(point.timestamp)) return;
    const index = Math.max(
      0,
      Math.min(bucketCount - 1, Math.floor(((point.timestamp - minTime) / span) * bucketCount))
    );
    buckets[index] += 1;
  });

  const maxCount = Math.max(1, ...buckets);
  const bucketW = width / bucketCount;

  const bars = buckets.map((count, index) => {
    const barH = Math.max(1, (count / maxCount) * plotH);
    const x = index * bucketW;
    const y = top + plotH - barH;

    return `
      <rect
        x="${x.toFixed(2)}"
        y="${y.toFixed(2)}"
        width="${Math.max(1, bucketW - 1).toFixed(2)}"
        height="${barH.toFixed(2)}"
        fill="currentColor"
        opacity="0.18"
      />
    `;
  }).join("");

  const startX = ((Math.min(startTime, endTime) - minTime) / span) * width;
  const endX = ((Math.max(startTime, endTime) - minTime) / span) * width;
  const selectionX = Math.max(0, Math.min(width, startX));
  const selectionW = Math.max(2, Math.min(width, endX) - selectionX);
  const ticks = createMiniMapTicks(minTime, maxTime, width);

  return `
    <svg
      viewBox="0 0 ${width} ${height}"
      preserveAspectRatio="none"
      role="img"
      aria-label="住院全程 Mini Map，可拖曳選擇顯示時間範圍"
    >
      <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />
      ${bars}
      ${ticks}
      <rect
        class="vitals-minimap-selection"
        x="${selectionX.toFixed(2)}"
        y="4"
        width="${selectionW.toFixed(2)}"
        height="${height - 14}"
        rx="6"
        fill="currentColor"
        opacity="0.14"
      />
      <line x1="${selectionX.toFixed(2)}" y1="4" x2="${selectionX.toFixed(2)}" y2="${height - 10}" stroke="currentColor" opacity="0.5" stroke-width="2" />
      <line x1="${(selectionX + selectionW).toFixed(2)}" y1="4" x2="${(selectionX + selectionW).toFixed(2)}" y2="${height - 10}" stroke="currentColor" opacity="0.5" stroke-width="2" />
    </svg>
  `;
}

function createMiniMapTicks(minTime, maxTime, width) {
  const days = Math.max(1, (maxTime - minTime) / 86400000);
  const intervalDays = days > 90 ? 30 : days > 45 ? 14 : days > 14 ? 7 : days > 7 ? 2 : 1;
  const ticks = [];
  const cursor = new Date(minTime);
  cursor.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= maxTime) {
    const t = cursor.getTime();
    if (t >= minTime) {
      const x = ((t - minTime) / (maxTime - minTime)) * width;
      ticks.push(`
        <line x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="74" stroke="currentColor" opacity="0.08" />
        <text x="${x.toFixed(2)}" y="70" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.55">
          ${escapeSVG(formatDateLabel(t))}
        </text>
      `);
    }
    cursor.setDate(cursor.getDate() + intervalDays);
  }

  return ticks.join("");
}

function renderChart(root) {
  const chartEl = root.querySelector("[data-vitals-chart]");
  const metaEl = root.querySelector("[data-vitals-chart-meta]");

  if (!chartEl) return;

  syncDateFilterToPoints(false);
  syncDateFilterControls(root);

  if (!state.points.length) {
    chartEl.innerHTML = `
      <div class="vitals-empty">
        尚無可繪製資料。請先貼上 raw data 並按 Parse。
      </div>
    `;
    if (metaEl) metaEl.textContent = "";
    return;
  }

  const displayPoints = getFilteredPoints();

  if (!displayPoints.length) {
    chartEl.innerHTML = `
      <div class="vitals-empty">
        此顯示區間內沒有可繪製資料。請調整右上方的開始時間、結束時間或雙拉桿，或按「全部資料」。
      </div>
    `;
    if (metaEl) metaEl.textContent = `${formatActiveDateFilter()} · ${state.duplicateStrategy}`;
    return;
  }

  const visibleKeys = [...state.visibleVitals].filter(key =>
    displayPoints.some(point => point.key === key)
  );

  const minTime = Math.min(...displayPoints.map(point => point.timestamp));
  const maxTime = Math.max(...displayPoints.map(point => point.timestamp));

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

  if (hasAnyVisibleBPData(["SBP", "DBP", "MAP"], displayPoints)) {
    charts.push(
      renderBPCompositeChart({
        title: "周邊血壓 BP / NBPm",
        systolicKey: "SBP",
        diastolicKey: "DBP",
        meanKey: "MAP",
        chartBandKey: "NBP",
        allPoints: displayPoints,
        minTime,
        maxTime,
        width: sharedWidth,
        showXAxis: true,
      })
    );
  }

  if (hasAnyVisibleBPData(["ABPs", "ABPd", "ABPm"], displayPoints)) {
    charts.push(
      renderBPCompositeChart({
        title: "Aline 血壓 ABPs / ABPd / ABPm",
        systolicKey: "ABPs",
        diastolicKey: "ABPd",
        meanKey: "ABPm",
        chartBandKey: "ABP",
        allPoints: displayPoints,
        minTime,
        maxTime,
        width: sharedWidth,
        showXAxis: true,
      })
    );
  }

  singleVitalKeys.forEach(key => {
    charts.push(
      renderSingleVitalChart(
        key,
        displayPoints,
        minTime,
        maxTime,
        sharedWidth,
        true
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
  chartBandKey,
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

  const bandRange = getChartBandRange(chartBandKey);
  const axisSetting = getChartAxisSetting(chartBandKey);
  const values = points.map(point => point.value);
  const [yMin, yMax] = getYDomain(values, bandRange, axisSetting);

  const xScale = timestamp => {
    if (maxTime === minTime) return margin.left + plotW / 2;
    return margin.left + ((timestamp - minTime) / (maxTime - minTime)) * plotW;
  };

  const yScale = value => {
    if (yMax === yMin) return margin.top + plotH / 2;
    return margin.top + ((yMax - value) / (yMax - yMin)) * plotH;
  };

  const grouped = groupBPPointsByTime(points, systolicKey, diastolicKey, meanKey);

  const band = renderNormalBand(bandRange, yMin, yMax, margin, plotW, yScale);
  const yTicks = renderYTicks(yMin, yMax, margin, plotW, yScale, axisSetting?.grid);
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

      ${band}
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

  const bandRange = getChartBandRange(key);
  const axisSetting = getChartAxisSetting(key);
  const values = points.map(point => point.value);
  const [yMin, yMax] = getYDomain(values, bandRange, axisSetting);

  const xScale = timestamp => {
    if (maxTime === minTime) return margin.left + plotW / 2;
    return margin.left + ((timestamp - minTime) / (maxTime - minTime)) * plotW;
  };

  const yScale = value => {
    if (yMax === yMin) return margin.top + plotH / 2;
    return margin.top + ((yMax - value) / (yMax - yMin)) * plotH;
  };

  const linePath = buildLinePath(points, xScale, yScale);
  const normalBand = renderNormalBand(bandRange, yMin, yMax, margin, plotW, yScale);
  const yTicks = renderYTicks(yMin, yMax, margin, plotW, yScale, axisSetting?.grid);
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

function getYDomain(values, normalRange, axisSetting = null) {
  const fixedMin = normalizeNullableNumber(axisSetting?.min);
  const fixedMax = normalizeNullableNumber(axisSetting?.max);

  if (Number.isFinite(fixedMin) && Number.isFinite(fixedMax) && fixedMin !== fixedMax) {
    return [Math.min(fixedMin, fixedMax), Math.max(fixedMin, fixedMax)];
  }

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

  const [normalMin, normalMax, opacity = 0.06] = normalRange;

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
      opacity="${normalizeBandOpacity(opacity)}"
    />
  `;
}

function renderYTicks(yMin, yMax, margin, plotW, yScale, gridInterval = null) {
  const ticks = Number.isFinite(gridInterval) && gridInterval > 0
    ? createFixedTicks(yMin, yMax, gridInterval)
    : createTicks(yMin, yMax, 4);

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

function renderXTicks(
  minTime,
  maxTime,
  margin,
  plotH,
  xScale,
  showLabels
) {
  const majorTicks = createDailyTicks(
    minTime,
    maxTime
  );

  const minorTicks = create4HourTicks(
    minTime,
    maxTime
  );

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
          y="${margin.top + plotH + 18}"
          text-anchor="middle"
          font-size="11"
          font-weight="700"
          fill="currentColor"
          opacity="0.8"
        >
          ${escapeSVG(
            formatDateLabel(timestamp)
          )}
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

function createFixedTicks(min, max, interval) {
  const ticks = [];
  const safeInterval = Math.abs(Number(interval));

  if (!Number.isFinite(safeInterval) || safeInterval <= 0) {
    return createTicks(min, max, 4);
  }

  const first = Math.ceil(min / safeInterval) * safeInterval;

  for (let value = first; value <= max + safeInterval * 0.001; value += safeInterval) {
    ticks.push(Number(value.toFixed(3)));
  }

  if (!ticks.length) return createTicks(min, max, 4);
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
  const d = new Date(timestamp);

  return (
    `${String(d.getMonth() + 1).padStart(2, "0")}/` +
    `${String(d.getDate()).padStart(2, "0")}`
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

function toDateTimeLocalValue(timestamp) {
  const date = new Date(timestamp);

  return (
    `${String(date.getFullYear()).padStart(4, "0")}-` +
    `${String(date.getMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getDate()).padStart(2, "0")}T` +
    `${String(date.getHours()).padStart(2, "0")}:` +
    `${String(date.getMinutes()).padStart(2, "0")}`
  );
}

function formatActiveDateFilter() {
  const { startTime, endTime } = state.dateFilter;

  if (Number.isFinite(startTime) && Number.isFinite(endTime)) {
    return `${formatDateTime(startTime)}–${formatDateTime(endTime)}`;
  }

  return "全部資料";
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);

  return (
    `${String(date.getFullYear()).padStart(4, "0")}/` +
    `${String(date.getMonth() + 1).padStart(2, "0")}/` +
    `${String(date.getDate()).padStart(2, "0")} ` +
    `${String(date.getHours()).padStart(2, "0")}:` +
    `${String(date.getMinutes()).padStart(2, "0")}`
  );
}

function formatInputValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function formatClock(timestamp) {
  const date = new Date(timestamp);

  return (
    `${String(date.getHours()).padStart(2, "0")}:` +
    `${String(date.getMinutes()).padStart(2, "0")}`
  );
}

function formatTimeRange(minTime, maxTime) {
  return `${formatDateTime(minTime)}–${formatDateTime(maxTime)}`;
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
