// tools/dex.js
import { parseExpression } from "../core/utils.js"; // 這個工具其實用不到，但保留一致性可刪

const DEBUG = false;
const TOOL_KEY = "dex";

export function render(){
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100">
        <div class="card-header text-center">普通點滴 dextrose 計算</div>

        <div class="card-body d-flex align-items-center pb-0">
          <div class="w-100">

            <div class="input-group">
              <span class="input-group-text justify-content-center" style="width:15%;">Dex</span>
              <input type="number" class="form-control text-center" data-role="origConc" value="5" inputmode="numeric" />
              <span class="input-group-text justify-content-center" style="width:15%;">%</span>
              <input type="number" class="form-control text-center" data-role="origAmt" value="500" inputmode="numeric" />
              <span class="input-group-text justify-content-center" style="width:15%;">ml</span>
            </div>

            <div class="input-group">
              <span class="input-group-text justify-content-center w-100" style="background-color:transparent;border:0;">+</span>
            </div>

            <div class="input-group">
              <span class="input-group-text justify-content-center" style="width:15%;">Dex</span>
              <input type="number" class="form-control text-center" data-role="addConc" value="50" inputmode="numeric" />
              <span class="input-group-text justify-content-center" style="width:15%;">%</span>
              <input type="number" class="form-control text-center" data-role="addAmt" value="" inputmode="numeric" />
              <span class="input-group-text justify-content-center" style="width:15%;">ml</span>
            </div>

            <div class="input-group">
              <span class="input-group-text justify-content-center w-100" style="background-color:transparent;border:0;">| |</span>
            </div>

          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-10">
              <div class="input-group d-flex mt-2 mb-2">
                <span class="input-group-text copy-item flex-fill justify-content-center" data-role="result">
                  Dextrose = 0.00 %
                </span>
              </div>
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

  // 防重綁
  if (box.dataset.bound === "1") return;
  box.dataset.bound = "1";

  const origConcEl = box.querySelector('[data-role="origConc"]');
  const origAmtEl  = box.querySelector('[data-role="origAmt"]');
  const addConcEl  = box.querySelector('[data-role="addConc"]');
  const addAmtEl   = box.querySelector('[data-role="addAmt"]');
  const resetBtn   = box.querySelector('[data-role="reset"]');
  const getOut     = () => box.querySelector('[data-role="result"]');

  // rAF 合併 input
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

    const origConc = parseFloat(origConcEl?.value) || 0;
    const origAmt  = parseFloat(origAmtEl?.value)  || 0;
    const addConc  = parseFloat(addConcEl?.value)  || 0;
    const addAmt   = parseFloat(addAmtEl?.value)   || 0;

    const denom = origAmt + addAmt;

    let finalPct = 0;
    if (denom > 0){
      finalPct =
        ((origConc/100) * origAmt + (addConc/100) * addAmt) / denom * 100;
    }

    const finalStr = (finalPct > 0 ? finalPct.toFixed(2) : "0.00");

    if (DEBUG){
      console.groupCollapsed("%c[DEX] Calculation", "color:#D8C3A5;font-weight:bold;");
      console.log({ origConc, origAmt, addConc, addAmt, denom, finalPct });
      console.groupEnd();
    }

    out.textContent = `Dextrose = ${finalStr} %`;
  };

  // 事件（只要 box 內 input 變動就算）
  box.addEventListener("input", (e) => {
    // 精準一點：只對本工具欄位
    if (e.target === origConcEl || e.target === origAmtEl || e.target === addConcEl || e.target === addAmtEl){
      scheduleCalc();
    }
  });

  resetBtn?.addEventListener("click", () => {
    if (origConcEl) origConcEl.value = 5;
    if (origAmtEl)  origAmtEl.value  = 500;
    if (addConcEl)  addConcEl.value  = 50;
    if (addAmtEl)   addAmtEl.value   = "";

    if (DEBUG) console.log("[DEX] Reset pressed");
    scheduleCalc();
  });

  calc();
}
