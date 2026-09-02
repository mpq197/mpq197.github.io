// tools/jusomin.js
// updated: 2026-09-03

import {
  createScheduler,
  bindMutualDisableBySelector,
  updateCopyList,
} from "../core/utils.js";

const DEBUG = false;
const TOOL_KEY = "jusomin";

/**
 * Metabolic acidosis correction
 *
 * Input:
 * - Base deficit is entered as a positive magnitude
 *   e.g. base excess = -10 mEq/L -> base deficit = 10 mEq/L
 *
 * Formula:
 * NaHCO3 (mEq) = base deficit * BW(kg) * 0.3 * correction ratio
 *
 * 7% NaHCO3 concentration conversion:
 * volume(ml) = mEq * 20 / 16.67
 *
 * Dilution ratio:
 * central = 2
 * peripheral = 4
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
              <input
                type="number"
                class="form-control text-center"
                data-role="bw"
                inputmode="numeric"
              />
              <span class="input-group-text justify-content-center" style="width:20%;">g</span>
            </div>

            <div class="input-group">
              <span class="input-group-text justify-content-center" style="width:20%;">Base deficit</span>
              <input
                type="number"
                class="form-control text-center"
                data-role="baseDeficit"
                min="0"
                inputmode="decimal"
              />
              <span class="input-group-text justify-content-center" style="width:20%;">mEq/L</span>
            </div>

            <div class="input-group">
              <span class="input-group-text justify-content-center" style="width:20%;">Correct</span>
              <input
                type="number"
                class="form-control text-center"
                data-role="ratioPct"
                inputmode="numeric"
              />
              <span class="input-group-text justify-content-center" style="width:20%;">% = NaHCO3</span>
              <input
                type="number"
                class="form-control text-center"
                data-role="meqDirect"
                inputmode="numeric"
              />
              <span class="input-group-text justify-content-center" style="width:20%;">mEq</span>
            </div>

            <div class="input-group">
              <span class="input-group-text justify-content-center" style="width:20%;">Run</span>
              <input
                type="number"
                class="form-control text-center"
                data-role="durationHr"
                placeholder="≥ 1"
                inputmode="numeric"
              />
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
              <ul
                class="list-group mt-2 mb-2"
                data-role="outputs"
              ></ul>
            </div>

            <div class="col-2" style="padding-left:0;">
              <div class="d-flex justify-content-center align-items-center h-100">
                <button
                  class="btn btn-secondary"
                  type="button"
                  data-role="reset"
                >
                  Reset
                </button>
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
  const baseDeficitEl = box.querySelector('[data-role="baseDeficit"]');
  const ratioEl = box.querySelector('[data-role="ratioPct"]');
  const meqDirectEl = box.querySelector('[data-role="meqDirect"]');
  const durEl = box.querySelector('[data-role="durationHr"]');
  const cathEl = box.querySelector('[data-role="catheter"]');
  const outputsEl = box.querySelector('[data-role="outputs"]');
  const resetBtn = box.querySelector('[data-role="reset"]');

  // Mutual disable:
  // (Base deficit + correction ratio) vs direct NaHCO3 mEq
  const mutual = bindMutualDisableBySelector(
    box,
    '[data-role="baseDeficit"],[data-role="ratioPct"]',
    '[data-role="meqDirect"]',
    { key: "jusominMeq" }
  );

  const safeBlank = (v) => (
    Number.isFinite(v) ? v : "__"
  );

  const calc = () => {
    if (!outputsEl) return;

    const bw_g = parseFloat(bwEl?.value);
    const baseDeficit = parseFloat(baseDeficitEl?.value);
    const ratioPct = parseFloat(ratioEl?.value);
    const meqDirect = parseFloat(meqDirectEl?.value);

    // Default duration = 2 hr
    const durationHrRaw = parseFloat(durEl?.value);
    const durationHr =
      (Number.isFinite(durationHrRaw) && durationHrRaw > 0)
        ? durationHrRaw
        : 2;

    const catheter = cathEl?.value || "central";
    const dilutionRatio =
      catheter === "central" ? 2 : 4;

    const bwKg =
      Number.isFinite(bw_g)
        ? bw_g / 1000
        : NaN;

    const ratio =
      Number.isFinite(ratioPct)
        ? ratioPct / 100
        : NaN;

    // Use direct NaHCO3 mEq when entered
    const useDirect =
      Number.isFinite(meqDirect) && meqDirect > 0;

    let correctMeq = 0;

    if (useDirect) {
      correctMeq = meqDirect;
    } else {
      const base =
        (
          Number.isFinite(baseDeficit) &&
          baseDeficit >= 0 &&
          Number.isFinite(bwKg)
        )
          ? baseDeficit * bwKg * 0.3
          : NaN;

      correctMeq =
        (
          Number.isFinite(base) &&
          Number.isFinite(ratio)
        )
          ? base * ratio
          : 0;
    }

    // Prevent invalid negative order values
    correctMeq = Math.max(correctMeq, 0);

    // Convert mEq to 7% NaHCO3 volume
    // volume = mEq * 20 / 16.67
    const correctVolMl =
      correctMeq > 0
        ? correctMeq * 20 / 16.67
        : 0;

    // mEq/kg/hr
    const meqKgHr =
      (
        Number.isFinite(bwKg) &&
        bwKg > 0 &&
        durationHr > 0
      )
        ? correctMeq / bwKg / durationHr
        : NaN;

    // -----------------------------
    // Build output lines
    // -----------------------------

    const lines = [];

    // Line 1: NaHCO3 calculation
    let line1 = "NaHCO3 given: ";

    if (!useDirect) {
      const ratioShown =
        Number.isFinite(ratioPct)
          ? ratioPct.toFixed(0)
          : "__";

      line1 +=
        `${safeBlank(baseDeficit)} * ` +
        `${safeBlank(bwKg)} kg * ` +
        `0.3 * ${ratioShown}% =`;
    }

    line1 +=
      ` ${Number.isFinite(correctMeq) ? correctMeq.toFixed(1) : "__"} mEq` +
      ` = ${Number.isFinite(correctVolMl) ? correctVolMl.toFixed(1) : "__"} ml`;

    lines.push(line1);

    // Line 2: preparation / administration
    const dilutedToMl =
      correctVolMl * dilutionRatio;

    const line2 =
      `7% NaHCO3 ` +
      `${Number.isFinite(correctVolMl) ? correctVolMl.toFixed(1) : "__"} ml ` +
      `dilute with D5W to ` +
      `${Number.isFinite(dilutedToMl) ? dilutedToMl.toFixed(1) : "__"} ml ` +
      `run ${durationHr} hrs`;

    lines.push(line2);

    // Line 3: administration rate
    const line3 =
      `= ${Number.isFinite(meqKgHr) ? meqKgHr.toFixed(1) : "__"} mEq/kg/hr` +
      `  ( max 1 mEq/kg/hr )`;

    lines.push(line3);

    if (DEBUG){
      console.groupCollapsed(`[${TOOL_KEY}] calc`);

      console.log({
        bw_g,
        bwKg,
        baseDeficit,
        ratioPct,
        ratio,
        meqDirect,
        useDirect,
        correctMeq,
        correctVolMl,
        durationHr,
        catheter,
        dilutionRatio,
        dilutedToMl,
        meqKgHr,
      });

      console.groupEnd();
    }

    // Preserve existing copy-item nodes
    updateCopyList(outputsEl, lines);
  };

  const scheduleCalc = createScheduler(calc);

  // -----------------------------
  // Events
  // -----------------------------

  box.addEventListener("input", scheduleCalc);
  box.addEventListener("change", scheduleCalc);

  resetBtn?.addEventListener("click", () => {
    if (bwEl) bwEl.value = "";
    if (baseDeficitEl) baseDeficitEl.value = "";
    if (ratioEl) ratioEl.value = "";
    if (meqDirectEl) meqDirectEl.value = "";
    if (durEl) durEl.value = "";
    if (cathEl) cathEl.value = "central";

    mutual?.update();
    scheduleCalc();
  });

  calc();
}
