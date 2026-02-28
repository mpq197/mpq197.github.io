// tools/jusomin.js
// updated: 2026-02-28


import { createScheduler, bindMutualDisableBySelector } from "../core/utils.js";

const DEBUG = false;
const TOOL_KEY = "jusomin";

/**
 * 7% NaHCO3 concentration conversion in your original code:
 * volume(ml) = mEq * 20 / 16.67  (keep same)
 * dilution ratio: central=2, peripheral=4
 */

export function render(){
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100">
        <div class="card-header text-center">Metabolic Acidosis Correction</div>

        <div class="card-body d-flex align-items-center pb-0">
          <div class="w-100">

            <div class="input-group">
              <span class="input-group-text justify-content-center" style="width:20%;">BW</span>
              <input type="number" class="form-control text-center" data-role="bw" inputmode="numeric" />
              <span class="input-group-text justify-content-center" style="width:20%;">g</span>
            </div>

            <div class="input-group">
              <span class="input-group-text justify-content-center" style="width:20%;">BE</span>
              <input type="number" class="form-control text-center" data-role="be" inputmode="numeric" />
              <span class="input-group-text justify-content-center" style="width:20%;">mEq/L</span>
            </div>

            <div class="input-group">
              <span class="input-group-text justify-content-center" style="width:20%;">Correct</span>
              <input type="number" class="form-control text-center" data-role="ratioPct" inputmode="numeric" />
              <span class="input-group-text justify-content-center" style="width:20%;">% = NaHCO3</span>
              <input type="number" class="form-control text-center" data-role="meqDirect" inputmode="numeric" />
              <span class="input-group-text justify-content-center" style="width:20%;">mEq</span>
            </div>

            <div class="input-group">
              <span class="input-group-text justify-content-center" style="width:20%;">Run</span>
              <input type="number" class="form-control text-center" data-role="durationHr" placeholder="≥ 1" inputmode="numeric" />
              <span class="input-group-text justify-content-center" style="width:10%;">hrs</span>
              <span class="input-group-text justify-content-center" style="width:10%;">via</span>
              <select class="form-select text-center" data-role="catheter">
                <option value="central" selected>central</option>
                <option value="peripheral">peripheral</option>
              </select>
              <span class="input-group-text justify-content-center" style="width:20%;">line</span>
            </div>

          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-10">
              <ul class="list-group mt-2 mb-2" data-role="outputs"></ul>
            </div>

            <div class="col-2" style="padding-left:0;">
              <div class="d-flex justify-content-center align-items-center h-100">
                <button class="btn btn-secondary" type="button" data-role="reset">Reset</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function init(root){
  const box = root.querySelector(`[data-tool="${TOOL_KEY}"]`);
  if (!box) return;

  if (box.dataset.bound === "1") return;
  box.dataset.bound = "1";

  const bwEl = box.querySelector('[data-role="bw"]');
  const beEl = box.querySelector('[data-role="be"]');
  const ratioEl = box.querySelector('[data-role="ratioPct"]');
  const meqDirectEl = box.querySelector('[data-role="meqDirect"]');
  const durEl = box.querySelector('[data-role="durationHr"]');
  const cathEl = box.querySelector('[data-role="catheter"]');
  const outputsEl = box.querySelector('[data-role="outputs"]');
  const resetBtn = box.querySelector('[data-role="reset"]');

  // ✅ Mutual disable: (BE + ratio) vs (direct mEq)
  const mutual = bindMutualDisableBySelector(
    box,
    '[data-role="be"],[data-role="ratioPct"]',
    '[data-role="meqDirect"]',
    { key: "jusominMeq" }
  );

  const safeBlank = (v) => (Number.isFinite(v) ? v : "__");

  const calc = () => {
    if (!outputsEl) return;

    const bw_g = parseFloat(bwEl?.value);
    const be = parseFloat(beEl?.value);
    const ratioPct = parseFloat(ratioEl?.value);
    const meqDirect = parseFloat(meqDirectEl?.value);

    // default duration = 2 (keep your original behavior)
    const durationHrRaw = parseFloat(durEl?.value);
    const durationHr = (Number.isFinite(durationHrRaw) && durationHrRaw > 0) ? durationHrRaw : 2;

    const catheter = (cathEl?.value || "central");
    const dilutionRatio = (catheter === "central") ? 2 : 4;

    const bwKg = Number.isFinite(bw_g) ? (bw_g / 1000) : NaN;
    const ratio = Number.isFinite(ratioPct) ? (ratioPct / 100) : NaN;

    // Determine mEq to give
    const useDirect = Number.isFinite(meqDirect) && meqDirect > 0;

    let correctMeq = 0;

    // Original formula: BE * BWkg * 0.3 * ratio
    // (keep same; note BE is typically negative in acidosis, but you used BE directly)
    if (useDirect) {
      correctMeq = meqDirect;
    } else {
      const base = (Number.isFinite(be) && Number.isFinite(bwKg)) ? (be * bwKg * 0.3) : NaN;
      correctMeq = (Number.isFinite(base) && Number.isFinite(ratio)) ? (base * ratio) : 0;
    }

    // Keep original style: if negative, display 0 (avoid negative orders)
    correctMeq = Math.max(correctMeq, 0);

    // Convert mEq to 7% NaHCO3 volume (ml)
    // volume = mEq * 20 / 16.67
    const correctVolMl = (correctMeq > 0) ? (correctMeq * 20 / 16.67) : 0;

    // mEq/kg/hr
    const meqKgHr = (Number.isFinite(bwKg) && bwKg > 0 && durationHr > 0)
      ? (correctMeq / bwKg / durationHr)
      : NaN;

    // Build lines
    const lines = [];

    // Line 1: "NaHCO3 given: ..."
    let line1 = "NaHCO3 given: ";
    if (!useDirect) {
      const ratioShown = Number.isFinite(ratioPct) ? ratioPct.toFixed(0) : "__";
      line1 += `${safeBlank(be)} * ${safeBlank(bwKg)} kg * 0.3 * ${ratioShown}% =`;
    }
    line1 += ` ${Number.isFinite(correctMeq) ? correctMeq.toFixed(1) : "__"} mEq = ${Number.isFinite(correctVolMl) ? correctVolMl.toFixed(1) : "__"} ml`;
    lines.push(line1);

    // Line 2: order
    const dilutedToMl = correctVolMl * dilutionRatio;
    const line2 =
      `7% NaHCO3 ${Number.isFinite(correctVolMl) ? correctVolMl.toFixed(1) : "__"} ml ` +
      `dilute with D5W to ${Number.isFinite(dilutedToMl) ? dilutedToMl.toFixed(1) : "__"} ml ` +
      `run ${durationHr} hrs`;
    lines.push(line2);

    // Line 3: mEq/kg/hr
    const line3 =
      `= ${Number.isFinite(meqKgHr) ? meqKgHr.toFixed(1) : "__"} mEq/kg/hr  ( max 1 mEq/kg/hr )`;
    lines.push(line3);

    if (DEBUG){
      console.groupCollapsed(`[${TOOL_KEY}] calc`);
      console.log({ bw_g, bwKg, be, ratioPct, ratio, meqDirect, useDirect, correctMeq, correctVolMl, durationHr, catheter, dilutionRatio, dilutedToMl, meqKgHr });
      console.groupEnd();
    }

    // Render outputs (rebuild list)
    outputsEl.innerHTML = "";
    lines.forEach(t => {
      const li = document.createElement("li");
      li.className = "list-group-item copy-item";
      li.textContent = t;
      outputsEl.appendChild(li);
    });
  };

  const scheduleCalc = createScheduler(calc);

  box.addEventListener("input", scheduleCalc);
  box.addEventListener("change", scheduleCalc);

  resetBtn?.addEventListener("click", () => {
    if (bwEl) bwEl.value = "";
    if (beEl) beEl.value = "";
    if (ratioEl) ratioEl.value = "";
    if (meqDirectEl) meqDirectEl.value = "";
    if (durEl) durEl.value = "";      // 留空 -> calc 會用 default=2
    if (cathEl) cathEl.value = "central";
    mutual?.update();  // ✅ 語意最清楚
    scheduleCalc();
  });

  calc();
}
