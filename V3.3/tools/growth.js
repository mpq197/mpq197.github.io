// tools/growth.js
// updated: 2026-02-28


const TOOL_KEY = "growth";
const DEBUG = false;

import { intergrowth21Refs } from "../refs/intergrowth21Refs.js";
// ✅ 不再從本地 import fenton/lubchenco，改成從 window 讀（index.html 用 <script> 載入 intranet growthRefs.js）
// import { fentonRefs, lubchencoRefs } from "../refs/growthRefs.js";

export function render() {
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100">
        <div class="card-header text-center">生長測量</div>

        <div class="card-body pb-0">
          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">GA</span>
            <input type="number" inputmode="numeric" data-role="gaW" class="form-control text-center" />
            <span class="input-group-text justify-content-center">weeks</span>
            <input type="number" inputmode="numeric" data-role="gaD" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;">days</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">Sex</span>
            <select data-role="sex" class="form-select text-center">
              <option value=""></option>
              <option value="boy">Boy</option>
              <option value="girl">Girl</option>
            </select>
            <span class="input-group-text justify-content-center" style="width: 15%;"></span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">體重</span>
            <input type="number" inputmode="numeric" data-role="bbw" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;">g</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">身長</span>
            <input type="number" inputmode="numeric" data-role="bbl" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;">cm</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">頭圍</span>
            <input type="number" inputmode="numeric" data-role="bhc" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;">cm</span>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-10">

              <!-- Lubchenco -->
              <ul class="list-group mt-2 mb-2">
                <li class="list-group-item copy-item" data-role="outLub" title="同舊版生長資料分析"></li>
              </ul>
              <div class="ps-2">
                <p>
                  本數據參考自
                  <a href="https://doi.org/10.1542/peds.37.3.403">Lubchenco growth chart</a>，特此感謝。僅限醫院內部使用。<br>
                  Lubchenco et al. (1966). Pediatrics; Battaglia & Lubcheno (1967). The Journal of pediatrics.
                </p>
              </div>

              <!-- Fenton -->
              <ul class="list-group mt-2 mb-2">
                <li class="list-group-item copy-item" data-role="outFen" title="無ponderal index的reference。"></li>
              </ul>
              <div class="ps-2">
                <p>
                  本數據參考自
                  <a href="https://ucalgary.ca/resource/preterm-growth-chart">Fenton growth chart</a>，特此感謝。僅限醫院內部使用。<br>
                  Fenton & Kim (2013). BMC pediatrics.
                </p>
              </div>

              <!-- Intergrowth-21st -->
              <ul class="list-group mt-2 mb-2">
                <li class="list-group-item copy-item" data-role="outIG21"
                    title="無ponderal index的reference。33周以上和以下的數據來自不同數據集，部分參考值區間有重疊現象。"></li>
              </ul>
              <div class="ps-2">
                <p>
                  本數據參考自
                  <a href="https://intergrowth21.ndog.ox.ac.uk/">Intergrowth-21st growth chart</a>，特此感謝。<br>
                  Villar et al. (2014). Lancet; Villar et al. (2016). Lancet.
                </p>
              </div>

            </div>

            <div class="col-2" style="padding-left: 0%;">
              <div class="d-flex justify-content-center align-items-center h-100">
                <button type="button" class="btn btn-secondary" data-role="reset">Reset</button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `;
}

export function init(root) {
  const box = root.querySelector(`[data-tool="${TOOL_KEY}"]`);
  if (!box) return;

  if (box.dataset.bound === "1") return;
  box.dataset.bound = "1";

  const elGaW = box.querySelector(`[data-role="gaW"]`);
  const elGaD = box.querySelector(`[data-role="gaD"]`);
  const elSex = box.querySelector(`[data-role="sex"]`);
  const elBBW = box.querySelector(`[data-role="bbw"]`);
  const elBBL = box.querySelector(`[data-role="bbl"]`);
  const elBHC = box.querySelector(`[data-role="bhc"]`);
  const outLub = box.querySelector(`[data-role="outLub"]`);
  const outFen = box.querySelector(`[data-role="outFen"]`);
  const outIG21 = box.querySelector(`[data-role="outIG21"]`);
  const resetBtn = box.querySelector(`[data-role="reset"]`);

  const log = (...args) => { if (DEBUG) console.log(`[${TOOL_KEY}]`, ...args); };

  // rAF 合併：多次 input/ change 只算一次
  let rafId = 0;
  const scheduleCalc = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      calc();
    });
  };

  const templateText =
    `GA:<br>Gender:<br>BBW:<br>BBL:<br>BHC:<br>Ponderal index:`;

  const setTemplates = () => {
    outFen.innerHTML = templateText;
    outLub.innerHTML = templateText;
    outIG21.innerHTML = templateText;
  };

  function numOr0(v) {
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : 0;
  }

  function isReadyInput({ gaW, gaD, sex, bbw, bbl, bhc }) {
    // 你原本邏輯：GA week 必須有；GA day < 7；sex 必須選；三項至少一項有值
    if (!gaW) return false;
    if (gaD >= 7) return false;
    if (!sex) return false;
    if (!(bbw || bbl || bhc)) return false;
    return true;
  }

  // ✅ 取 intranet refs（方案 C：intranet growthRefs.js 最後把 const 掛到 window）
  function getIntranetGrowthRefs() {
    // 你可選一個 namespace（兩個都支援）：
    // window.NeoAssistRefs = { fentonRefs, lubchencoRefs }
    // 或 window.__CGMH_GROWTH__ = { fentonRefs, lubchencoRefs }
    const ns = window.__CGMH_GROWTH__ || window.NeoAssistRefs || null;
    return {
      fentonRefs: ns?.fentonRefs || null,
      lubchencoRefs: ns?.lubchencoRefs || null
    };
  }

  function calc() {
    const gaW = numOr0(elGaW.value);
    const gaD = numOr0(elGaD.value);
    const sex = (elSex.value || "").trim();

    const bbw = numOr0(elBBW.value);
    const bbl = numOr0(elBBL.value);
    const bhc = numOr0(elBHC.value);

    // ✅ input 不完整 → 模板
    if (!isReadyInput({ gaW, gaD, sex, bbw, bbl, bhc })) {
      setTemplates();
      log("missing/invalid inputs", { gaW, gaD, sex, bbw, bbl, bhc });
      return;
    }

    const daysSince22w0d = (gaW - 22) * 7 + gaD;
    const ponderalIndex = (bbw && bbl) ? (bbw / Math.pow(bbl, 3) * 100) : null;

    // ✅ IG21 永遠照算（本地 import intergrowth21Refs，不依賴 intranet）
    outIG21.innerHTML = buildIG21Text(
      gaW, gaD, daysSince22w0d, sex, bbw, bbl, bhc, ponderalIndex
    ).join("<br>");

    // ✅ intranet refs 可能不存在：只影響 Fen/Lub
    const { fentonRefs, lubchencoRefs } = getIntranetGrowthRefs();

    if (!fentonRefs) {
      outFen.innerHTML = templateText + "<br><br><span class='text-muted'>(Fenton refs unavailable)</span>";
    } else {
      outFen.innerHTML = buildFentonText(
        gaW, gaD, daysSince22w0d, sex, bbw, bbl, bhc, ponderalIndex, fentonRefs
      ).join("<br>");
    }

    if (!lubchencoRefs) {
      outLub.innerHTML = templateText + "<br><br><span class='text-muted'>(Lubchenco refs unavailable)</span>";
    } else {
      outLub.innerHTML = buildLubchencoText(
        gaW, gaD, sex, bbw, bbl, bhc, ponderalIndex, lubchencoRefs
      ).join("<br>");
    }
  }

  // -----------------------------
  // Text builders (pure-ish functions)
  // -----------------------------
  function buildFentonText(gaW, gaD, daysSince22w0d, sex, bbw, bbl, bhc, pi, fentonRefsLive) {
    const growthMeasurements = { weight: bbw, height: bbl, hc: bhc };

    const results = Object.fromEntries(
      Object.entries(growthMeasurements).map(([param, measurement]) => {
        const ref = fentonRefsLive?.[param]?.[sex]?.[daysSince22w0d];
        if (!ref) return [param, { zScore: null, estimatedPercentile: null, percentileRange: null }];

        const { L, M, S, "3%": p3, "10%": p10, "50%": p50, "90%": p90, "97%": p97 } = ref;

        const z = (L === 0)
          ? (Math.log(measurement / M) / S)
          : ((Math.pow(measurement / M, L) - 1) / (S * L));

        const estPct = zScoreToPercentile(z);

        const pr = !measurement ? "N/A" :
          measurement < p3 ? "<3rd" :
          measurement == p3 ? "3rd" :
          measurement < p10 ? "3rd–10th" :
          measurement == p10 ? "10th" :
          measurement < p50 ? "10th–50th" :
          measurement == p50 ? "50th" :
          measurement < p90 ? "50th–90th" :
          measurement == p90 ? "90th" :
          measurement < p97 ? "90th–97th" :
          measurement == p97 ? "97th" : ">97th";

        return [param, { zScore: z, estimatedPercentile: estPct, percentileRange: pr }];
      })
    );

    let category = "Unable to determine SGA/LGA due to no reference data.";
    if (results.weight?.percentileRange) {
      if (["<3rd", "3rd", "3rd–10th"].includes(results.weight.percentileRange)) {
        category = "Small for gestational age (SGA, defined as BBW <10th percentile)";
      } else if (["90th–97th", "97th", ">97th"].includes(results.weight.percentileRange)) {
        category = "Large for gestational age (LGA, defined as BBW >90th percentile)";
      } else {
        category = "Appropriate for gestational age (AGA)";
      }
    }

    return [
      `GA: ${gaW} ${gaD}/7 weeks`,
      `Gender: ${sex === "boy" ? "Male" : "Female"}`,
      formatGrowthLine("BBW", "g", bbw, results.weight),
      formatGrowthLine("BBL", "cm", bbl, results.height),
      formatGrowthLine("BHC", "cm", bhc, results.hc),
      formatGrowthLine("Ponderal index", "(unit: 100g/cm3)", pi ? pi.toFixed(2) : "N/A", null),
      category,
      `* Analyzed by Fenton growth chart (2013)`
    ];
  }

  function buildIG21Text(gaW, gaD, daysSince22w0d, sex, bbw, bbl, bhc, pi) {
    const growthMeasurements = { weight: bbw, height: bbl, hc: bhc };

    const results = Object.fromEntries(
      Object.entries(growthMeasurements).map(([param, measurement]) => {
        const ref = intergrowth21Refs?.[param]?.[sex]?.[daysSince22w0d];
        if (!ref) return [param, { percentileRange: null }];

        const { "3%": p3, "5%": p5, "10%": p10, "50%": p50, "90%": p90, "95%": p95, "97%": p97 } = ref;

        // IG21 weight rounded to tens
        if (param === "weight") measurement = Math.round(measurement / 10) * 10;

        const pr = !measurement ? "N/A" :
          measurement < p3 ? "<3rd" :
          measurement == p3 ? "3rd" :
          measurement < p5 ? "3rd–5th" :
          measurement == p5 ? "5th" :
          measurement < p10 ? "5th–10th" :
          measurement == p10 ? "10th" :
          measurement < p50 ? "10th–50th" :
          measurement == p50 ? "50th" :
          measurement < p90 ? "50th–90th" :
          measurement == p90 ? "90th" :
          measurement < p95 ? "90th–95th" :
          measurement == p95 ? "95th" :
          measurement < p97 ? "95th–97th" :
          measurement == p97 ? "97th" : ">97th";

        return [param, { percentileRange: pr }];
      })
    );

    let category = "Unable to determine SGA/LGA due to no reference data.";
    if (results.weight?.percentileRange) {
      if (["<3rd", "3rd", "3rd–5th", "5th", "5th–10th"].includes(results.weight.percentileRange)) {
        category = "Small for gestational age (SGA, defined as BBW <10th percentile)";
      } else if (["90th–95th", "95th", "95th–97th", "97th", ">97th"].includes(results.weight.percentileRange)) {
        category = "Large for gestational age (LGA, defined as BBW >90th percentile)";
      } else {
        category = "Appropriate for gestational age (AGA)";
      }
    }

    return [
      `GA: ${gaW} ${gaD}/7 weeks`,
      `Gender: ${sex === "boy" ? "Male" : "Female"}`,
      formatGrowthLine("BBW", "g", bbw, results.weight),
      formatGrowthLine("BBL", "cm", bbl, results.height),
      formatGrowthLine("BHC", "cm", bhc, results.hc),
      formatGrowthLine("Ponderal index", "(unit: 100g/cm3)", pi ? pi.toFixed(2) : "N/A", null),
      category,
      `* Analyzed by Intergrowth-21st growth chart`
    ];
  }

  function buildLubchencoText(gaW, gaD, sex, bbw, bbl, bhc, pi, lubchencoRefsLive) {
    const growthMeasurements = { weight: bbw, height: bbl, hc: bhc, ponderalIndex: pi };

    const results = Object.fromEntries(
      Object.entries(growthMeasurements).map(([param, measurement]) => {
        const ref = lubchencoRefsLive?.[param]?.[gaW];
        if (!ref) return [param, { percentileRange: null }];

        const { "10%": p10, "25%": p25, "50%": p50, "75%": p75, "90%": p90 } = ref;

        const pr = !measurement ? "N/A" :
          measurement < p10 ? "<10th" :
          measurement == p10 ? "10th" :
          measurement < p25 ? "10th–25th" :
          measurement == p25 ? "25th" :
          measurement < p50 ? "25th–50th" :
          measurement == p50 ? "50th" :
          measurement < p75 ? "50th–75th" :
          measurement == p75 ? "75th" :
          measurement < p90 ? "75th–90th" :
          measurement == p90 ? "90th" : ">90th";

        return [param, { percentileRange: pr }];
      })
    );

    let category = "Unable to determine SGA/LGA due to no reference data.";
    if (results.weight?.percentileRange) {
      if (results.weight.percentileRange === "<10th") {
        if (results.ponderalIndex?.percentileRange === "<10th") {
          category = "Asymmetric small for gestational age (aSGA, defined as BBW and PI both <10th percentile)";
        } else if (results.ponderalIndex?.percentileRange && results.ponderalIndex.percentileRange !== "N/A") {
          category = "Symmetric small for gestational age (sSGA, defined as BBW <10th percentile and PI >10th percentile)";
        } else {
          category = "Small for gestational age (SGA, defined as BBW <10th percentile)";
        }
      } else if (results.weight.percentileRange === ">90th") {
        category = "Large for gestational age (LGA, defined as BBW >90th percentile)";
      } else {
        category = "Appropriate for gestational age (AGA)";
      }
    }

    return [
      `GA: ${gaW} ${gaD}/7 weeks`,
      `Gender: ${sex === "boy" ? "Male" : "Female"}`,
      formatGrowthLine("BBW", "g", bbw, results.weight),
      formatGrowthLine("BBL", "cm", bbl, results.height),
      formatGrowthLine("BHC", "cm", bhc, results.hc),
      formatGrowthLine("Ponderal index", "(unit: 100g/cm3)", pi ? pi.toFixed(2) : "N/A", results.ponderalIndex),
      category,
      `* Analyzed by Lubchenco growth chart (1966 & 1967)`
    ];
  }

  function formatGrowthLine(label, unit, value, result) {
    if (value === null || value === undefined || value === 0) return `${label}: N/A`;

    let text = `${label}: ${value} ${unit}`;
    const parts = [];

    if (result && Number.isFinite(result.zScore)) parts.push(`Z score = ${result.zScore.toFixed(2)}`);
    if (result && result.estimatedPercentile) parts.push(`~ ${result.estimatedPercentile} percentile`);
    if (result && result.percentileRange && result.percentileRange !== "N/A") parts.push(`${result.percentileRange} percentile`);

    if (parts.length) text += ` ( ${parts.join(", ")} )`;
    return text;
  }

  // Z -> percentile (keep your original logic)
  function normalCDF(z) {
    return (1 + erf(z / Math.SQRT2)) / 2;
  }
  function erf(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }
  function zScoreToPercentile(z) {
    return addOrdinalSuffix(normalCDF(z) * 100);
  }
  function addOrdinalSuffix(num) {
    const intPart = Math.floor(num);
    const j = intPart % 10;
    const k = intPart % 100;

    let suffix = "th";
    if (k < 11 || k > 13) {
      if (j === 1) suffix = "st";
      else if (j === 2) suffix = "nd";
      else if (j === 3) suffix = "rd";
    }
    return `${intPart}${suffix}`;
  }

  // events (delegated)
  box.addEventListener("input", scheduleCalc);
  box.addEventListener("change", scheduleCalc);

  resetBtn.addEventListener("click", () => {
    elGaW.value = "";
    elGaD.value = "";
    elSex.value = "";
    elBBW.value = "";
    elBBL.value = "";
    elBHC.value = "";
    setTemplates();      // reset 時才需要模板
    scheduleCalc();
  });

  // init
  setTemplates();        // 初始顯示模板
  calc();
}
