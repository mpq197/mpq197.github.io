import { parseExpression } from "../core/utils.js";

const DEBUG = false;
const TOOL_KEY = "gir";

export function render(){
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card">
        <div class="card-header text-center">GIR計算</div>

        <div class="card-body pb-0">

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width:15%;">BW</span>
            <input type="number" class="form-control text-center" data-role="bw" inputmode="numeric" />
            <span class="input-group-text justify-content-center" style="width:15%;">g</span>
          </div>

          <div data-role="rows">
            ${rowHTML({ role:"dex10", value:10 })}
            ${rowHTML({ role:"dex5", value:5 })}
          </div>

        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-10">
              <div class="input-group d-flex mt-2 mb-2">
                <span class="input-group-text copy-item flex-fill justify-content-center" data-role="result">
                  GIR 0.0
                </span>
              </div>
            </div>
            <div class="col-2" style="padding-left:0;">
              <div class="d-flex justify-content-center align-items-center h-100">
                <button class="btn btn-secondary" type="button" data-role="reset">
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

function rowHTML({ role="", value="" }={}){
  return `
    <div class="input-group gir-row">
      <span class="input-group-text justify-content-center" style="width:15%;">Dex</span>
      <input name="GIR_dex"
             ${role ? `data-role="${role}"` : ""}
             type="number"
             class="form-control text-center"
             ${value!=="" ? `value="${value}"` : ""}
             inputmode="numeric">
      <span class="input-group-text">%</span>
      <input name="GIR_rate"
             type="text"
             class="form-control text-center"
             inputmode="decimal">
      <span class="input-group-text" style="width:10%;">ml/hr</span>
      <button class="btn btn-light"
              type="button"
              style="border-color:#e0e3e7;width:5%;"
              data-action="addRow">
        +
      </button>
    </div>
  `;
}

export function init(root){
  const box = root.querySelector(`[data-tool="${TOOL_KEY}"]`);
  if (!box) return;

  // 防止重複綁定
  if (box.dataset.bound === "1") return;
  box.dataset.bound = "1";

  const bw = box.querySelector('[data-role="bw"]');
  const rows = box.querySelector('[data-role="rows"]');
  const resetBtn = box.querySelector('[data-role="reset"]');
  const getOut = () => box.querySelector('[data-role="result"]');

  // requestAnimationFrame 合併 input
  let rafId = 0;
  const scheduleCalc = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      calc();
    });
  };

  const calc = () => {

    const out = getOut();
    if (!out) return;

    const bwVal = parseFloat(bw?.value) || 0;

    const dexList = box.querySelectorAll('[name="GIR_dex"]');
    const rateList = box.querySelectorAll('[name="GIR_rate"]');

    let total = 0;

    const n = Math.min(dexList.length, rateList.length);

    for (let i = 0; i < n; i++){
      const d = parseFloat(dexList[i].value) || 0;

      let parsedRate = 0;
      try {
        parsedRate = parseExpression(rateList[i].value);
      } catch {
        parsedRate = 0;
      }

      const r = parseFloat(parsedRate) || 0;
      total += d * r;

      if (DEBUG){
        console.log(`[${TOOL_KEY}] Row ${i}`, { d, r });
      }
    }

    const denom = 6 * (bwVal / 1000);
    const gir = (bwVal > 0 && denom > 0) ? (total / denom) : 0;

    if (DEBUG){
      console.groupCollapsed(`[${TOOL_KEY}] Calculation`);
      console.log({ bwVal, total, denom, gir });
      console.groupEnd();
    }

    out.textContent = gir ? `GIR ${gir.toFixed(2)}` : "GIR 0.0";
  };

  // ===== Event Bindings =====

  bw?.addEventListener("input", scheduleCalc);

  box.addEventListener("input", (e) => {
    if (e.target?.name === "GIR_dex" || e.target?.name === "GIR_rate"){
      scheduleCalc();
    }
  });

  box.addEventListener("click", (e) => {
    const btn = e.target.closest('button[data-action="addRow"]');
    if (!btn) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = rowHTML();
    const newRow = wrap.firstElementChild;

    rows.appendChild(newRow);

    const newDex = newRow.querySelector('[name="GIR_dex"]');
    newDex?.focus();

    if (DEBUG) console.log(`[${TOOL_KEY}] Added new row`);

    scheduleCalc();
  });

  resetBtn?.addEventListener("click", () => {

    if (bw) bw.value = "";

    const all = Array.from(box.querySelectorAll(".gir-row"));
    all.slice(2).forEach(r => r.remove());

    const d10 = box.querySelector('[data-role="dex10"]');
    const d5  = box.querySelector('[data-role="dex5"]');

    if (d10) d10.value = 10;
    if (d5)  d5.value  = 5;

    box.querySelectorAll('[name="GIR_rate"]').forEach(x => x.value = "");

    if (DEBUG) console.log(`[${TOOL_KEY}] Reset`);

    scheduleCalc();
  });

  calc();
}
