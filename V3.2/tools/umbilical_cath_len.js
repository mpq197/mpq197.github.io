// tools/umbilical_cath_len.js

const DEBUG = false;
const TOOL_KEY = "umbilical_cath_len";

export function render(){
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100">
        <div class="card-header text-center">UA、UV深度計算</div>

        <div class="card-body pb-0">
          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width:15%;">BW</span>
            <input type="number" class="form-control text-center" data-role="bw" inputmode="numeric" />
            <span class="input-group-text justify-content-center" style="width:15%;">g</span>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-10">

              <div class="input-group d-flex mt-2 mb-2">
                <span class="input-group-text justify-content-center" style="width:30%;">UA</span>
                <span class="input-group-text copy-item flex-fill justify-content-center" data-role="ua"></span>
              </div>

              <div class="input-group d-flex mt-2 mb-2">
                <span class="input-group-text justify-content-center" style="width:30%;">UV</span>
                <span class="input-group-text copy-item flex-fill justify-content-center" data-role="uv"></span>
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

  const bwEl = box.querySelector('[data-role="bw"]');
  const resetBtn = box.querySelector('[data-role="reset"]');
  const getUA = () => box.querySelector('[data-role="ua"]');
  const getUV = () => box.querySelector('[data-role="uv"]');

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
    const uaOut = getUA();
    const uvOut = getUV();
    if (!uaOut || !uvOut) return;

    const bw = parseFloat(bwEl?.value) || 0;

    // 依原始公式：
    // UA high = BW(kg)*3 + 9
    // UA low  = BW(kg)*1 + 7
    // UV      = UA high / 2 + 1
    const uaHigh = bw > 0 ? (bw/1000*3 + 9) : 0;
    const uaLow  = bw > 0 ? (bw/1000   + 7) : 0;
    const uv     = bw > 0 ? (uaHigh/2  + 1) : 0;

    if (DEBUG){
      console.groupCollapsed(`[${TOOL_KEY}] calc`);
      console.log({ bw, uaHigh, uaLow, uv });
      console.groupEnd();
    }

    uaOut.textContent = bw > 0 ? `高位 ${uaHigh.toFixed(1)} cm, 低位 ${uaLow.toFixed(1)} cm` : "";
    uvOut.textContent = bw > 0 ? `${uv.toFixed(1)} cm` : "";
  };

  // events
  bwEl?.addEventListener("input", scheduleCalc);

  resetBtn?.addEventListener("click", () => {
    if (bwEl) bwEl.value = "";
    scheduleCalc();
  });

  calc();
}
