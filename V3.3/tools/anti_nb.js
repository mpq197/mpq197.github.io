// tools/anti_nb.js
// updated: 2026-02-28

const TOOL_KEY = "anti_nb";
const DEBUG = false;

import { safeEvalNumber } from "../core/utils.js";

// NOTE:
// - This tool is self-contained (no external imports besides safeEvalNumber).
// - Uses delegated input/change listeners on the tool root.
// - Birthday defaults to today (local).
// - Remark will NEVER carry over between drugs (cleared every calc).
// - UI changes in this version:
//   (1) Reset 改回單一按鈕（保留原本行為：清 BW/GA/Birthday=今天/Calc，Drug 不變）
//   (2) Standard / Meningitis 改成「各自一個標題列」：左標題 + 右側 Copy，同列；下一行顯示 dose；再下一行顯示 desc

export function render() {
  return `
    <style>
      [data-tool="${TOOL_KEY}"] .dose-card{
        border: 1px solid rgba(0,0,0,.12);
        border-radius: .5rem;
        padding: .75rem;
        background: #fff;
        margin-top: .5rem;
      }
      [data-tool="${TOOL_KEY}"] .dose-card .title-row{
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: .5rem;
        margin-bottom: .25rem;
      }
      [data-tool="${TOOL_KEY}"] .dose-card .title{
        font-size: 1rem;
        font-weight: 600;
        color: #495057;
      }
      [data-tool="${TOOL_KEY}"] .dose-card .dose{
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.1;
      }
      [data-tool="${TOOL_KEY}"] .dose-card .desc{
        white-space: pre-wrap;
        word-break: break-word;
        font-size: .95rem;
        line-height: 1.3;
        margin-top: .35rem;
      }
      [data-tool="${TOOL_KEY}"] .summary-line{
        font-size: .85rem;
        color: #6c757d;
        margin-top: .5rem;
      }
      [data-tool="${TOOL_KEY}"] .is-invalid{
        border-color: #dc3545 !important;
      }
      [data-tool="${TOOL_KEY}"] .calc-out{
        width: 15%;
        justify-content: center;
      }
      [data-tool="${TOOL_KEY}"] .btn-col{
        padding-left: 0%;
      }
      [data-tool="${TOOL_KEY}"] .remark-line{
        font-size: .9rem;
        color: #b45309; /* amber-ish */
        white-space: pre-wrap;
      }
      [data-tool="${TOOL_KEY}"] .dose-card{
        cursor: pointer;
      }
      [data-tool="${TOOL_KEY}"] .dose-card:active{
        transform: scale(0.995);
      }
    </style>

    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100" id="anti_NB_content">
        <div class="card-header text-center">NB常用抗生素泡法 (測試版，請參考手冊驗算)</div>

        <div class="card-body pb-0">
          <!-- BW -->
          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">BW</span>
            <input type="number" inputmode="numeric" min="1" step="1" data-role="bw" class="form-control text-center" placeholder="g" />
            <span class="input-group-text justify-content-center" style="width: 15%;">g</span>
          </div>

          <!-- Drug -->
          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">Drug</span>
            <select data-role="drug" class="form-select text-center">
              <option value="Ampicillin">Ampicillin</option>
              <option value="Gentamicin">Gentamicin</option>
              <option value="Cefotaxime">Cefotaxime</option>
              <option value="Ceftazidime">Ceftazidime</option>
              <option value="Vancomycin">Vancomycin</option>
              <option value="Meropenem">Meropenem</option>
              <option value="Metronidazole">Metronidazole</option>
              <option value="Amikacin">Amikacin</option>
              <option value="Cefazolin">Cefazolin</option>
              <option value="Oxacillin">Oxacillin</option>
              <option value="Tazocin">Tazocin</option>
              <option value="Augmentin">Augmentin</option>
            </select>
            <span class="input-group-text justify-content-center" style="width: 15%;"> </span>
          </div>

          <!-- GA -->
          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">GA</span>
            <input type="number" inputmode="numeric" min="1" step="1" data-role="gaW" class="form-control text-center" placeholder="week" />
            <span class="input-group-text justify-content-center">week</span>
            <input type="number" inputmode="numeric" min="0" max="6" step="1" data-role="gaD" class="form-control text-center" placeholder="day" />
            <span class="input-group-text justify-content-center" style="width: 15%;">day</span>
          </div>

          <!-- Birthday -->
          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">Birthday</span>
            <input type="date" data-role="birthday" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;"> </span>
          </div>

          <!-- Calculator -->
          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">計算機</span>
            <input type="text" data-role="calc" class="form-control text-center" placeholder="" />
            <span class="input-group-text justify-content-center">=</span>
            <span class="input-group-text calc-out" data-role="calcOut"></span>
          </div>

          <!-- Summary -->
          <div class="summary-line" data-role="summary"></div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-10">
              <!-- Standard -->
              <div class="dose-card" data-role="cardStd">
                <div class="title-row">
                  <div class="title">Standard</div>
                </div>
                <div class="dose" data-role="stdDose"></div>
                <div class="desc" data-role="stdDesc"></div>
              </div>

              <!-- Meningitis -->
              <div class="dose-card" data-role="cardMen">
                <div class="title-row">
                  <div class="title">Meningitis</div>
                </div>
                <div class="dose" data-role="menDose"></div>
                <div class="desc" data-role="menDesc"></div>
              </div>

              <!-- Remark -->
              <div class="mt-2 remark-line" data-role="remark"></div>
            </div>

            <div class="col-2 btn-col">
              <div class="d-flex justify-content-center align-items-center h-100">
                <button type="button" class="btn btn-secondary w-100" data-role="reset">Reset</button>
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

  const elBW = box.querySelector(`[data-role="bw"]`);
  const elDrug = box.querySelector(`[data-role="drug"]`);
  const elGaW = box.querySelector(`[data-role="gaW"]`);
  const elGaD = box.querySelector(`[data-role="gaD"]`);
  const elBirthday = box.querySelector(`[data-role="birthday"]`);
  const elCalc = box.querySelector(`[data-role="calc"]`);
  const elCalcOut = box.querySelector(`[data-role="calcOut"]`);
  const outSummary = box.querySelector(`[data-role="summary"]`);

  const outStdDose = box.querySelector(`[data-role="stdDose"]`);
  const outStdDesc = box.querySelector(`[data-role="stdDesc"]`);
  const outMenDose = box.querySelector(`[data-role="menDose"]`);
  const outMenDesc = box.querySelector(`[data-role="menDesc"]`);
  const outRemark = box.querySelector(`[data-role="remark"]`);

  const cardStd = box.querySelector(`[data-role="cardStd"]`);
  const cardMen = box.querySelector(`[data-role="cardMen"]`);
  const resetBtn = box.querySelector(`[data-role="reset"]`);

  const log = (...args) => { if (DEBUG) console.log(`[${TOOL_KEY}]`, ...args); };

  // rAF merge
  let rafId = 0;
  const scheduleCalc = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      calc();
    });
  };

  function clearOutputs() {
    outStdDose.textContent = "";
    outStdDesc.textContent = "";
    outMenDose.textContent = "";
    outMenDesc.textContent = "";
    outRemark.textContent = "";
    if (outSummary) outSummary.textContent = "";
  }

  function clearErrors() {
    [elBW, elDrug, elGaW, elGaD, elBirthday].forEach(el => {
      if (el) el.classList.remove("is-invalid");
    });
  }

  function setFieldError(el) {
    if (el) el.classList.add("is-invalid");
  }
  // -----------------------------
  // Drug specs
  // -----------------------------
  const antiNBDrugSpecs = {
    Ampicillin: {
      standard: [
        { GA_min: 0, GA_max: 34, PNA_min: 0, PNA_max: 7,  PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 50, unit: "mg/kg/dose", description: "50 mg/kg/dose, Q12H, dilute with diswater to 最終濃度100mg/ml, 所需量以IVF run 30 mins" },
        { GA_min: 0, GA_max: 34, PNA_min: 8, PNA_max: 28, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 75, unit: "mg/kg/dose", description: "75 mg/kg/dose, Q12H, dilute with diswater to 最終濃度100mg/ml, 所需量以IVF run 30 mins" },
        { GA_min: 35, GA_max: Infinity, PNA_min: 0, PNA_max: 28, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 50, unit: "mg/kg/dose", description: "50 mg/kg/dose, Q8H, dilute with diswater to 最終濃度100mg/ml, 所需量以IVF run 30 mins" }
      ],
      meningitis: [
        { GA_min: 0, GA_max: 34, PNA_min: 0, PNA_max: 7,  PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 100, unit: "mg/kg/dose", description: "100 mg/kg/dose, Q8H, dilute with diswater to 最終濃度100mg/ml, 所需量以IVF run 30 mins" },
        { GA_min: 0, GA_max: 34, PNA_min: 8, PNA_max: 60, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q6H", dose: 75, unit: "mg/kg/dose", description: "75 mg/kg/dose, Q6H, dilute with diswater to 最終濃度100mg/ml, 所需量以IVF run 30 mins" },
        { GA_min: 35, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 100, unit: "mg/kg/dose", description: "100 mg/kg/dose, Q8H, dilute with diswater to 最終濃度100mg/ml, 所需量以IVF run 30 mins" },
        { GA_min: 35, GA_max: Infinity, PNA_min: 8, PNA_max: 60, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q6H", dose: 75, unit: "mg/kg/dose", description: "75 mg/kg/dose, Q6H, dilute with diswater to 最終濃度100mg/ml, 所需量以IVF run 30 mins" }
      ]
    },

    Gentamicin: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q48H", dose: 5, unit: "mg/kg/dose", description: "5 mg/kg/dose, Q48H, DILUTE WITH N/S TO 2ML RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: 28, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q36H", dose: 4, unit: "mg/kg/dose", description: "4 mg/kg/dose, Q36H, DILUTE WITH N/S TO 2ML RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 29, PNA_max: Infinity, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q24H", dose: 4, unit: "mg/kg/dose", description: "4 mg/kg/dose, Q24H, DILUTE WITH N/S TO 2ML RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 30, PMA_max: 34, BW_min: 0, BW_max: Infinity, frequency: "Q36H", dose: 4.5, unit: "mg/kg/dose", description: "4.5 mg/kg/dose, Q36H, DILUTE WITH N/S TO 2ML RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 30, PMA_max: 34, BW_min: 0, BW_max: Infinity, frequency: "Q24H", dose: 4, unit: "mg/kg/dose", description: "4 mg/kg/dose, Q24H, DILUTE WITH N/S TO 2ML RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 35, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q24H", dose: 4, unit: "mg/kg/dose", description: "4 mg/kg/dose, Q24H, DILUTE WITH N/S TO 2ML RUN 30 MINS" }
      ]
    },

    Cefotaxime: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 50, unit: "mg/kg/dose", description: "50MG/KG/DOSE, Q12H, 用D/W泡成250MG/ML, DILUTED WITH N/S TO 2ML RUN 30 MINS" },
        { GA_min: 0, GA_max: 31, PNA_min: 8, PNA_max: Infinity, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 50, unit: "mg/kg/dose", description: "50MG/KG/DOSE, Q8H, 用D/W泡成250MG/ML, DILUTED WITH N/S TO 2ML RUN 30 MINS" },
        { GA_min: 32, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q6H", dose: 50, unit: "mg/kg/dose", description: "50MG/KG/DOSE, Q6H, 用D/W泡成250MG/ML, DILUTED WITH N/S TO 2ML RUN 30 MINS" }
      ],
      meningitis: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7, PMA_min: 0, PMA_max: Infinity, BW_min: 2000, BW_max: Infinity, frequency: "Q8H", dose: 50, unit: "mg/kg/dose", description: "50MG/KG/DOSE, Q8H, 用D/W泡成250MG/ML, DILUTED WITH N/S TO 2ML RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 0, PMA_max: Infinity, BW_min: 2000, BW_max: Infinity, frequency: "Q6H", dose: 50, unit: "mg/kg/dose", description: "50MG/KG/DOSE, Q6H, 用D/W泡成250MG/ML, DILUTED WITH N/S TO 2ML RUN 30 MINS" }
      ]
    },

    Ceftazidime: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 28, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 30, unit: "mg/kg/dose", description: "30MG/KG/DOSE, Q12H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 29, PNA_max: Infinity, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 30, unit: "mg/kg/dose", description: "30MG/KG/DOSE, Q8H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 14, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 30, unit: "mg/kg/dose", description: "30MG/KG/DOSE, Q12H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 15, PNA_max: Infinity, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 30, unit: "mg/kg/dose", description: "30MG/KG/DOSE, Q8H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7, PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 30, unit: "mg/kg/dose", description: "30MG/KG/DOSE, Q12H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 30, unit: "mg/kg/dose", description: "30MG/KG/DOSE, Q8H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 45, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 30, unit: "mg/kg/dose", description: "30MG/KG/DOSE, Q8H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" }
      ],
      meningitis: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: 1999, frequency: "Q12H", dose: 50, unit: "mg/kg/dose", description: "50MG/KG/DOSE, Q12H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7, PMA_min: 0, PMA_max: Infinity, BW_min: 2000, BW_max: Infinity, frequency: "Q8H", dose: 50, unit: "mg/kg/dose", description: "50MG/KG/DOSE, Q8H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 50, unit: "mg/kg/dose", description: "50MG/KG/DOSE, Q8H, 加5ML DISTILLED WATER, 泡成90MG/ML, DILUTE至最終濃度45mg/ml, RUN 30 MINS" }
      ]
    },

    Vancomycin: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 21, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q18H", dose: 15, unit: "mg/kg/dose", description: "15MG/KG/DOSE, Q18H, DILUTE WITH D/W TO 50MG/ML THEN DILUTE 10倍, RUN 1 HR" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 22, PNA_max: Infinity, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 15, unit: "mg/kg/dose", description: "15MG/KG/DOSE, Q12H, DILUTE WITH D/W TO 50MG/ML THEN DILUTE 10倍, RUN 1 HR" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 14, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 15, unit: "mg/kg/dose", description: "15MG/KG/DOSE, Q12H, DILUTE WITH D/W TO 50MG/ML THEN DILUTE 10倍, RUN 1 HR" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 15, PNA_max: Infinity, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 15, unit: "mg/kg/dose", description: "15MG/KG/DOSE, Q8H, DILUTE WITH D/W TO 50MG/ML THEN DILUTE 10倍, RUN 1 HR" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7, PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 15, unit: "mg/kg/dose", description: "15MG/KG/DOSE, Q12H, DILUTE WITH D/W TO 50MG/ML THEN DILUTE 10倍, RUN 1 HR" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 15, unit: "mg/kg/dose", description: "15MG/KG/DOSE, Q8H, DILUTE WITH D/W TO 50MG/ML THEN DILUTE 10倍, RUN 1 HR" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 45, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q6H", dose: 15, unit: "mg/kg/dose", description: "15MG/KG/DOSE, Q6H, DILUTE WITH D/W TO 50MG/ML THEN DILUTE 10倍, RUN 1 HR" }
      ]
    },

    Meropenem: {
      standard: [
        { GA_min: 0, GA_max: 31, PNA_min: 0, PNA_max: 13, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 20, unit: "mg/kg/dose", description: "20mg/kg/dose, Q12H, 稀釋至50mg/ml, Dilute with N/S to 10倍, run 1 hr", remark: "嚴格限水時: Dilute with N/S to 2.5倍" },
        { GA_min: 0, GA_max: 31, PNA_min: 14, PNA_max: Infinity, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 20, unit: "mg/kg/dose", description: "20mg/kg/dose, Q8H, 稀釋至50mg/ml, Dilute with N/S to 10倍, run 1 hr", remark: "嚴格限水時: Dilute with N/S to 2.5倍" },
        { GA_min: 32, GA_max: Infinity, PNA_min: 0, PNA_max: 13, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 20, unit: "mg/kg/dose", description: "20mg/kg/dose, Q8H, 稀釋至50mg/ml, Dilute with N/S to 10倍, run 1 hr", remark: "嚴格限水時: Dilute with N/S to 2.5倍" },
        { GA_min: 32, GA_max: Infinity, PNA_min: 14, PNA_max: Infinity, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 30, unit: "mg/kg/dose", description: "30mg/kg/dose, Q8H, 稀釋至50mg/ml, Dilute with N/S to 10倍, run 1 hr", remark: "嚴格限水時: Dilute with N/S to 2.5倍" }
      ],
      meningitis: [
        { GA_min: 0, GA_max: 31, PNA_min: 0, PNA_max: 13, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 40, unit: "mg/kg/dose", description: "40mg/kg/dose, Q12H, 稀釋至50mg/ml, Dilute with N/S to 10倍, run 1 hr", remark: "嚴格限水時: Dilute with N/S to 2.5倍" },
        { GA_min: 0, GA_max: 31, PNA_min: 14, PNA_max: Infinity, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 40, unit: "mg/kg/dose", description: "40mg/kg/dose, Q8H, 稀釋至50mg/ml, Dilute with N/S to 10倍, run 1 hr", remark: "嚴格限水時: Dilute with N/S to 2.5倍" },
        { GA_min: 32, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 40, unit: "mg/kg/dose", description: "40mg/kg/dose, Q8H, 稀釋至50mg/ml, Dilute with N/S to 10倍, run 1 hr", remark: "嚴格限水時: Dilute with N/S to 2.5倍" }
      ]
    },

    Metronidazole: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 0, PMA_max: 33, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 7.5, unit: "mg/kg/dose", description: "maintenance 7.5 mg/kg/dose, Q12H, run 30 min", remark: "原液5mg/ml, 不須稀釋, 但需loading 15mg/kg" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 34, PMA_max: 40, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 7.5, unit: "mg/kg/dose", description: "maintenance 7.5 mg/kg/dose, Q8H, run 30 min", remark: "原液5mg/ml, 不須稀釋, 但需loading 15mg/kg" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 41, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q6H", dose: 7.5, unit: "mg/kg/dose", description: "maintenance 7.5 mg/kg/dose, Q6H, run 30 min", remark: "原液5mg/ml, 不須稀釋, 但需loading 15mg/kg. Maintain也可10mg/kg/dose Q8H." }
      ]
    },

    Amikacin: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 0, PMA_max: 28, BW_min: 0, BW_max: Infinity, frequency: "Q48H", dose: 14, unit: "mg/kg/dose", description: "14mg/kg/dose, Q48H, dilute 50倍 run 1hr", remark: "可以D5W or N/S稀釋25~100倍至2.5~10mg/ml" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: 28, PMA_min: 0, PMA_max: 28, BW_min: 0, BW_max: Infinity, frequency: "Q36H", dose: 12, unit: "mg/kg/dose", description: "12mg/kg/dose, Q36H, dilute 50倍 run 1hr", remark: "可以D5W or N/S稀釋25~100倍至2.5~10mg/ml" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 29, PNA_max: Infinity, PMA_min: 0, PMA_max: 28, BW_min: 0, BW_max: Infinity, frequency: "Q24H", dose: 12, unit: "mg/kg/dose", description: "12mg/kg/dose, Q24H, dilute 50倍 run 1hr", remark: "可以D5W or N/S稀釋25~100倍至2.5~10mg/ml" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 30, PMA_max: 34, BW_min: 0, BW_max: Infinity, frequency: "Q36H", dose: 12, unit: "mg/kg/dose", description: "12mg/kg/dose, Q36H, dilute 50倍 run 1hr", remark: "可以D5W or N/S稀釋25~100倍至2.5~10mg/ml" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 30, PMA_max: 34, BW_min: 0, BW_max: Infinity, frequency: "Q24H", dose: 12, unit: "mg/kg/dose", description: "12mg/kg/dose, Q24H, dilute 50倍 run 1hr", remark: "可以D5W or N/S稀釋25~100倍至2.5~10mg/ml" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 35, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q24H", dose: 12, unit: "mg/kg/dose", description: "12mg/kg/dose, Q24H, dilute 50倍 run 1hr", remark: "可以D5W or N/S稀釋25~100倍至2.5~10mg/ml" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 35, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q18H", dose: 12, unit: "mg/kg/dose", description: "12mg/kg/dose, Q18H, dilute 50倍 run 1hr", remark: "可以D5W or N/S稀釋25~100倍至2.5~10mg/ml" }
      ]
    },

    Cefazolin: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 28, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q12H, 泡成100mg/ml, diluted with N/S to 2ml run 30 mins", remark: "(1)20~25mg/kg/dose(2)若是信華注射劑，改以7ml D/W泡成 142MG/mL, 所需量 DILUTE WITH N/S TO 2ML, run 30 mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 29, PNA_max: Infinity, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q8H, 泡成100mg/ml, diluted with N/S to 2ml run 30 mins", remark: "(1)20~25mg/kg/dose(2)若是信華注射劑，改以7ml D/W泡成 142MG/mL, 所需量 DILUTE WITH N/S TO 2ML, run 30 mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 14, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q12H, 泡成100mg/ml, diluted with N/S to 2ml run 30 mins", remark: "(1)20~25mg/kg/dose(2)若是信華注射劑，改以7ml D/W泡成 142MG/mL, 所需量 DILUTE WITH N/S TO 2ML, run 30 mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 15, PNA_max: Infinity, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q8H, 泡成100mg/ml, diluted with N/S to 2ml run 30 mins", remark: "(1)20~25mg/kg/dose(2)若是信華注射劑，改以7ml D/W泡成 142MG/mL, 所需量 DILUTE WITH N/S TO 2ML, run 30 mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q12H, 泡成100mg/ml, diluted with N/S to 2ml run 30 mins", remark: "(1)20~25mg/kg/dose(2)若是信華注射劑，改以7ml D/W泡成 142MG/mL, 所需量 DILUTE WITH N/S TO 2ML, run 30 mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q8H, 泡成100mg/ml, diluted with N/S to 2ml run 30 mins", remark: "(1)20~25mg/kg/dose(2)若是信華注射劑，改以7ml D/W泡成 142MG/mL, 所需量 DILUTE WITH N/S TO 2ML, run 30 mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 45, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q6H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q6H, 泡成100mg/ml, diluted with N/S to 2ml run 30 mins", remark: "(1)20~25mg/kg/dose(2)若是信華注射劑，改以7ml D/W泡成 142MG/mL, 所需量 DILUTE WITH N/S TO 2ML, run 30 mins" }
      ]
    },

    Oxacillin: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 28, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q12H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 29, PNA_max: Infinity, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q8H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 14, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q12H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 15, PNA_max: Infinity, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q8H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q12H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q8H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 45, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q6H", dose: 25, unit: "mg/kg/dose", description: "25mg/kg/dose, Q6H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" }
      ],
      meningitis: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 28, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 50, unit: "mg/kg/dose", description: "50mg/kg/dose, Q12H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 29, PNA_max: Infinity, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 50, unit: "mg/kg/dose", description: "50mg/kg/dose, Q8H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 14, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 50, unit: "mg/kg/dose", description: "50mg/kg/dose, Q12H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 15, PNA_max: Infinity, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 50, unit: "mg/kg/dose", description: "50mg/kg/dose, Q8H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 50, unit: "mg/kg/dose", description: "50mg/kg/dose, Q12H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 50, unit: "mg/kg/dose", description: "50mg/kg/dose, Q8H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 45, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q6H", dose: 50, unit: "mg/kg/dose", description: "50mg/kg/dose, Q6H, D/W 10ml dilute to 100mg/ml, then N/S dilute to 2ml run 30mins" }
      ]
    },

    Tazocin: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 28, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 112.5, unit: "mg/kg/dose", description: "以Piperacillin計 100mg/kg/dose, Q12H, DILUTE IN D/W 8.5 ML to 10ml, 所需量再以N/S dilute to 5倍, RUN 30MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 29, PNA_max: Infinity, PMA_min: 0, PMA_max: 29, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 112.5, unit: "mg/kg/dose", description: "以Piperacillin計 100mg/kg/dose, Q8H, DILUTE IN D/W 8.5 ML to 10ml, 所需量再以N/S dilute to 5倍, RUN 30MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 14, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 112.5, unit: "mg/kg/dose", description: "以Piperacillin計 100mg/kg/dose, Q12H, DILUTE IN D/W 8.5 ML to 10ml, 所需量再以N/S dilute to 5倍, RUN 30MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 15, PNA_max: Infinity, PMA_min: 30, PMA_max: 36, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 112.5, unit: "mg/kg/dose", description: "以Piperacillin計 100mg/kg/dose, Q8H, DILUTE IN D/W 8.5 ML to 10ml, 所需量再以N/S dilute to 5倍, RUN 30MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 7,  PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q12H", dose: 112.5, unit: "mg/kg/dose", description: "以Piperacillin計 100mg/kg/dose, Q12H, DILUTE IN D/W 8.5 ML to 10ml, 所需量再以N/S dilute to 5倍, RUN 30MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 8, PNA_max: Infinity, PMA_min: 37, PMA_max: 44, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 112.5, unit: "mg/kg/dose", description: "以Piperacillin計 100mg/kg/dose, Q8H, DILUTE IN D/W 8.5 ML to 10ml, 所需量再以N/S dilute to 5倍, RUN 30MINS" },
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: Infinity, PMA_min: 45, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 112.5, unit: "mg/kg/dose", description: "以Piperacillin計 100mg/kg/dose, Q8H, DILUTE IN D/W 8.5 ML to 10ml, 所需量再以N/S dilute to 5倍, RUN 30MINS" }
      ]
    },

    Augmentin: {
      standard: [
        { GA_min: 0, GA_max: Infinity, PNA_min: 0, PNA_max: 84, PMA_min: 0, PMA_max: Infinity, BW_min: 0, BW_max: Infinity, frequency: "Q8H", dose: 30, unit: "mg/kg/dose", description: "以Amoxicillin計25mg/kg/dose, Q8H, 使用19.1 ml D/W 泡成60mg/ml複方濃度, 所需量dilute with D/W to 2ml run 30m min", remark: "(1)此為1000mg Amoxicillin + 200mg Clavulanic acid，不同比例的劑量可能不同，請再次確認(2)口服水劑以Amoxicillin計15mg/kg/dose Q12H" }
      ]
    }
  };

  function findAntiNBDrugSpec(drugName, condition, BW_g, GA_w, PNA_d, PMA_w) {
    const drug = antiNBDrugSpecs[drugName];
    if (!drug || !drug[condition]) return null;
    return (
      drug[condition].find(spec =>
        spec.BW_min <= BW_g && BW_g <= spec.BW_max &&
        spec.GA_min <= GA_w && GA_w <= spec.GA_max &&
        spec.PNA_min <= PNA_d && PNA_d <= spec.PNA_max &&
        spec.PMA_min <= PMA_w && PMA_w <= spec.PMA_max
      ) || null
    );
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  function num(v) {
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : NaN;
  }

  function toISODateLocal(d = new Date()) {
    const x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseDateInput(value) {
    if (!value) return null;
    const parts = value.split("-").map(n => parseInt(n, 10));
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // local day diff (avoid DST edge)
  function diffInDaysLocal(start, end) {
    const s = new Date(start.getTime());
    const e = new Date(end.getTime());
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    const ms = 24 * 60 * 60 * 1000;
    return Math.floor((e - s) / ms);
  }

  function buildDoseText(spec, BW_g) {
    const amt = (spec.dose * (BW_g / 1000)).toFixed(2);
    const unitLeft = (spec.unit || "").split("/")[0] || "";
    return `${amt} ${unitLeft} ${spec.frequency || ""}`.trim();
  }

  function formatKg(BW_g) {
    const s = (BW_g / 1000).toFixed(3);
    return s.replace(/0+$/,"").replace(/\.$/,"");
  }

  async function copyToClipboard(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }


  // -----------------------------
  // Core
  // -----------------------------
  function calc() {
    clearOutputs();
    clearErrors();

    const drugName = (elDrug.value || "").trim();
    const BW_g = num(elBW.value);
    const GA_w = num(elGaW.value);
    const GA_d = num(elGaD.value);
    const birthday = parseDateInput(elBirthday.value);

    // calculator
    if (elCalc && elCalcOut) {
      const v = safeEvalNumber(elCalc.value, { trimTrailingOperators: true });
      elCalcOut.textContent = Number.isFinite(v)
        ? (Math.abs(v - Math.round(v)) < 1e-12 ? String(Math.round(v)) : String(v.toFixed(6)))
        : (elCalc.value?.trim() ? "ERR" : "");
    }

    // Validate
    let ok = true;

    // Only validate if any input has been started (not just drug, but also GA or BW)
    const hasStarted =
      elBW.value ||
      elGaW.value ||
      elGaD.value ;

    if (!hasStarted) {
      clearErrors();
      return;
    }

    if (!drugName) { ok = false; setFieldError(elDrug); }

    if (!Number.isFinite(BW_g) || BW_g <= 0) {
      ok = false;
      setFieldError(elBW);
    }

    if (!Number.isFinite(GA_w) || GA_w <= 0) {
      ok = false;
      setFieldError(elGaW);
    }
    if (!Number.isFinite(GA_d) || GA_d < 0 || GA_d >= 7) {
      ok = false;
      setFieldError(elGaD);
    }

    if (!birthday) {
      ok = false;
      setFieldError(elBirthday);
    }

    if (!ok) return;

    const today = new Date();
    const PNA_d = diffInDaysLocal(birthday, today);
    if (PNA_d < 0) {
      setFieldError(elBirthday);
      return;
    }

    const PMA_w = GA_w + Math.floor((PNA_d + GA_d) / 7);
    const PMA_d = (GA_d + PNA_d) % 7;

    // Summary
    if (outSummary) {
      outSummary.textContent =
        `BW: ${BW_g} g (${formatKg(BW_g)} kg) | GA: ${GA_w}w${GA_d}d | PNA: ${PNA_d} d | PMA: ${PMA_w}w${PMA_d}d`;
    }

    const std = findAntiNBDrugSpec(drugName, "standard", BW_g, GA_w, PNA_d, PMA_w);
    const men = findAntiNBDrugSpec(drugName, "meningitis", BW_g, GA_w, PNA_d, PMA_w);

    const remarks = [];

    if (std) {
      outStdDose.textContent = buildDoseText(std, BW_g);
      outStdDesc.textContent = std.description || "";
      if (std.remark) remarks.push(std.remark);
    } else {
      outStdDose.textContent = "-";
      outStdDesc.textContent = "No standard dose suggestion found.";
    }

    if (men) {
      outMenDose.textContent = buildDoseText(men, BW_g);
      outMenDesc.textContent = men.description || "";
      if (men.remark) remarks.push(men.remark);
    } else {
      outMenDose.textContent = "-";
      outMenDesc.textContent = "No meningitis dose suggestion found.";
    }

    outRemark.textContent = remarks.join(" ");

    log({ drugName, BW_g, GA_w, GA_d, PNA_d, PMA_w, std, men });
  }

  // delegated events
  box.addEventListener("input", scheduleCalc);
  box.addEventListener("change", scheduleCalc);

  // copy outputs
  function copyDescOnly(kind) {
    const descEl = kind === "std" ? outStdDesc : outMenDesc;
    const desc = (descEl.textContent || "").trim();
    if (!desc || desc === "No standard dose suggestion found." || desc === "No meningitis dose suggestion found.") return;
    copyToClipboard(desc);
  }

  cardStd?.addEventListener("click", () => copyDescOnly("std"));
  cardMen?.addEventListener("click", () => copyDescOnly("men"));

  // Reset (original-style single button; keep drug)
  resetBtn?.addEventListener("click", () => {
    elBW.value = "";
    // keep drug selection
    elGaW.value = "";
    elGaD.value = "";
    elBirthday.value = toISODateLocal(new Date()); // default today after reset
    if (elCalc) elCalc.value = "";
    if (elCalcOut) elCalcOut.textContent = "";
    clearOutputs();
    clearErrors();
    scheduleCalc();
  });

  // init defaults
  clearOutputs();
  clearErrors();

  const todayISO = toISODateLocal(new Date());
  if (elBirthday) {
    elBirthday.max = todayISO;
    if (!elBirthday.value) elBirthday.value = todayISO;
  }

  calc();
}