// tools/hypoNa.js
import { createScheduler, bindMutualDisableBySelector } from "../core/utils.js";

const DEBUG = false;
const TOOL_KEY = "hypoNa";

// Na concentration (mEq per 1000 ml)
const FLUID_NA_PER_L = {
  "3% NaCl": 513,
  "N/S": 154,
  "H/S": 77,
  "D0.225S": 38.5,
};

export function render(){
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100">
        <div class="card-header text-center">Hyponatremia Correction</div>

        <div class="card-body pb-0">
          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width:20%;">BW</span>
            <input type="number" class="form-control text-center" data-role="bw" inputmode="numeric" />
            <span class="input-group-text justify-content-center" style="width:20%;">g</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width:20%;">[Na]</span>
            <input type="number" class="form-control text-center" data-role="naCurrent" placeholder="current" inputmode="numeric" />
            <span class="input-group-text justify-content-center" style="width:10%;">→</span>
            <input type="number" class="form-control text-center" data-role="naTarget" placeholder="target" inputmode="numeric" />
            <span class="input-group-text justify-content-center" style="width:20%;">mEq/L</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width:20%;">Correct</span>
            <input type="number" class="form-control text-center" data-role="ratioPct" inputmode="numeric" />
            <span class="input-group-text justify-content-center" style="width:10%;">% =</span>
            <input type="number" class="form-control text-center" data-role="deficitMeq" inputmode="numeric" />
            <span class="input-group-text justify-content-center" style="width:20%;">mEq</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width:20%;">by</span>
            <select class="form-select text-center" data-role="fluid">
              <option value="3% NaCl" selected>3% NaCl</option>
              <option value="N/S">N/S</option>
              <option value="H/S">H/S</option>
              <option value="D0.225S">D0.225S</option>
            </select>
            <span class="input-group-text justify-content-center" style="width:10%;">in</span>
            <input type="number" class="form-control text-center" data-role="durationHr" inputmode="numeric" />
            <span class="input-group-text justify-content-center" style="width:20%;">hr</span>
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
  const naCurEl = box.querySelector('[data-role="naCurrent"]');
  const naTarEl = box.querySelector('[data-role="naTarget"]');
  const ratioEl = box.querySelector('[data-role="ratioPct"]');
  const deficitEl = box.querySelector('[data-role="deficitMeq"]');
  const fluidEl = box.querySelector('[data-role="fluid"]');
  const durEl = box.querySelector('[data-role="durationHr"]');
  const outputsEl = box.querySelector('[data-role="outputs"]');
  const resetBtn = box.querySelector('[data-role="reset"]');

  // ✅ Mutual disable (selector version)
  // A: formula inputs, B: direct deficit input
  bindMutualDisableBySelector(
    box,
    '[data-role="bw"],[data-role="naCurrent"],[data-role="naTarget"],[data-role="ratioPct"]',
    '[data-role="deficitMeq"]',
    { key: "hypoNaDeficit" }
  );

  const safeBlank = (v) => (Number.isFinite(v) ? v : "__");

  const calc = () => {
    if (!outputsEl) return;

    const bw_g = parseFloat(bwEl?.value);
    const naCur = parseFloat(naCurEl?.value);
    const naTar = parseFloat(naTarEl?.value);
    const ratioPct = parseFloat(ratioEl?.value);
    const deficitDirect = parseFloat(deficitEl?.value);
    const fluid = (fluidEl?.value || "3% NaCl");
    const durationHr = parseFloat(durEl?.value);

    const bwKg = Number.isFinite(bw_g) ? (bw_g / 1000) : NaN;
    const ratio = Number.isFinite(ratioPct) ? (ratioPct / 100) : NaN;

    const useDirect = Number.isFinite(deficitDirect) && deficitDirect > 0;

    // mEq to correct
    let correctMeq = 0;

    if (useDirect) {
      correctMeq = deficitDirect;
    } else {
      const delta = (Number.isFinite(naTar) ? naTar : NaN) - (Number.isFinite(naCur) ? naCur : NaN);
      const base = (Number.isFinite(bwKg) && Number.isFinite(delta)) ? (bwKg * delta * 0.6) : NaN;
      correctMeq = (Number.isFinite(base) && Number.isFinite(ratio)) ? (base * ratio) : 0;
    }

    correctMeq = Math.max(correctMeq, 0);

    // line 1
    let line1 = "Na given: ";
    if (!useDirect) {
      const ratioShown = Number.isFinite(ratioPct) ? ratioPct.toFixed(0) : "__";
      line1 += `(${safeBlank(naTar)} - ${safeBlank(naCur)}) * ${safeBlank(bwKg)} kg * 0.6 * ${ratioShown}% =`;
    }
    line1 += ` ${Number.isFinite(correctMeq) ? correctMeq.toFixed(1) : "__"} mEq`;

    // line 2
    const conc = FLUID_NA_PER_L[fluid] ?? FLUID_NA_PER_L["3% NaCl"]; // mEq per 1000 ml
    const volMl = (correctMeq > 0 && conc > 0) ? (correctMeq / conc * 1000) : 0;

    const dur = (Number.isFinite(durationHr) && durationHr > 0) ? durationHr : NaN;
    const rate = (Number.isFinite(dur) && dur > 0) ? (volMl / dur) : NaN;

    const rateRounded = Number.isFinite(rate) ? Number(rate.toFixed(1)) : NaN;
    const actualVol = (Number.isFinite(rateRounded) && Number.isFinite(dur)) ? (rateRounded * dur) : NaN;
    const actualMeq = Number.isFinite(actualVol) ? (actualVol / 1000 * conc) : NaN;

    const line2 =
      `${fluid} ${Number.isFinite(actualVol) ? actualVol.toFixed(1) : "__"} ml run ` +
      `${Number.isFinite(dur) ? dur : "__"} hr ` +
      `(= ${Number.isFinite(rateRounded) ? rateRounded.toFixed(1) : "__"} ml/hr) ` +
      `(= Na ${Number.isFinite(actualMeq) ? actualMeq.toFixed(1) : "__"} mEq)`;

    if (DEBUG){
      console.groupCollapsed(`[${TOOL_KEY}] calc`);
      console.log({ bw_g, bwKg, naCur, naTar, ratioPct, deficitDirect, correctMeq, fluid, conc, durationHr, volMl, rateRounded, actualVol, actualMeq });
      console.groupEnd();
    }

    // render outputs (rebuild list)
    outputsEl.innerHTML = "";
    [line1, line2].forEach(t => {
      const li = document.createElement("li");
      li.className = "list-group-item copy-item";
      li.textContent = t;
      outputsEl.appendChild(li);
    });
  };

  const scheduleCalc = createScheduler(calc);

  // events
  box.addEventListener("input", scheduleCalc);
  box.addEventListener("change", scheduleCalc);

  resetBtn?.addEventListener("click", () => {
    if (bwEl) bwEl.value = "";
    if (naCurEl) naCurEl.value = "";
    if (naTarEl) naTarEl.value = "";
    if (ratioEl) ratioEl.value = "";
    if (deficitEl) deficitEl.value = "";
    if (fluidEl) fluidEl.value = "3% NaCl";
    if (durEl) durEl.value = "";
    scheduleCalc();
  });

  calc();
}
