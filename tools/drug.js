// tools/drug.js
// updated: 2026-02-28

const TOOL_KEY = "drug";
const DEBUG = false;

import { bindMutualDisableBySelector, safeEvalNumber } from "../core/utils.js"; 

export function render() {
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100" id="drug_content">
        <div class="card-header text-center">藥物泡法</div>

        <div class="card-body pb-0">

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">BW</span>
            <input type="text" data-role="bw" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;">g or Kg</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">Drug</span>
            <select data-role="drug" class="form-select text-center" title="">
              <option value="Dopamine">Dopamine</option>
              <option value="Dobutamine">Dobutamine</option>
              <option value="Milrinone">Milrinone</option>
              <option value="Epinephrine">Epinephrine</option>
              <option value="Midazolam">Midazolam</option>
              <option value="Fentanyl">Fentanyl</option>
              <option value="Bumetanide">Bumetanide</option>
              <option value="Norepinephrine">Norepinephrine</option>
              <option value="Nicardipine">Nicardipine</option>
              <option value="Nitroglycerin">Nitroglycerin</option>
              <option value="Labetalol">Labetalol</option>
              <option value="PGE1">PGE1</option>
              <option value="Vasopressin">Vasopressin</option>
              <option value="Isoproterenol">Isoproterenol</option>
              <option value="Rocuronium">Rocuronium</option>
              <option value="Cisatracurium">Cisatracurium</option>
              <option value="Morphine">Morphine</option>
              <option value="Lorazepam">Lorazepam</option>
              <option value="Ketamine">Ketamine</option>
              <option value="Propofol">Propofol</option>
              <option value="MgSO4">MgSO4</option>
              <option value="Lidocaine">Lidocaine</option>
              <option value="Insulin">Insulin</option>
              <option value="Heparin">Heparin</option>
              <option value="Jusomin">Jusomin</option>
              <option value="Octreotide">Octreotide</option>
              <option value="Amiodarone">Amiodarone</option>
            </select>

            <input type="text" data-role="extract" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;" data-role="extractUnit">mg</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">In</span>
            <select data-role="diluter" class="form-select text-center">
              <option value="D5W">D5W</option>
              <option value="N/S">N/S</option>
              <option value="H/S">H/S</option>
              <option value="D/W">D/W</option>
            </select>
            <span class="input-group-text justify-content-center">total</span>
            <input type="number" data-role="totalVol" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;">ml</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">Run</span>
            <input type="text" data-role="runRate" class="form-control text-center" />
            <span class="input-group-text justify-content-center">ml/hr</span>
            <span class="input-group-text justify-content-center">=</span>
            <input type="number" data-role="finalRate" class="form-control text-center" />
            <span class="input-group-text justify-content-center" data-role="finalRateUnit" style="min-width: 15%;">mcg/kg/min</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">計算機</span>
            <input type="text" data-role="calcIn" class="form-control text-center" />
            <span class="input-group-text justify-content-center">=</span>
            <span class="input-group-text justify-content-center" data-role="calcOut" style="width: 15%;"></span>
          </div>

        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-10">
              <ul class="list-group mt-2 mb-2">
                <li class="list-group-item copy-item" data-role="bwOut">BW</li>
                <li class="list-group-item copy-item" data-role="orderOut">&nbsp;</li>
                <li class="list-group-item copy-item" data-role="medOut">&nbsp;</li>
                <li class="list-group-item copy-item" data-role="pureOut">&nbsp;</li>
              </ul>
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

// ---- original specs ----
const drugSpecs = {
  Dopamine:          { concentration: 40,   unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 },
  Dobutamine:        { concentration: 12.5, unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 },
  Milrinone:         { concentration: 1,    unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 },
  Epinephrine:       { concentration: 1,    unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 2 },
  Midazolam:         { concentration: 5,    unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 },
  Fentanyl:          { concentration: 0.05, unit: "mg/ml",  rateUnit: "mcg/kg/hr",  decimalPlace: 3 },
  Bumetanide:        { concentration: 0.25, unit: "mg/ml",  rateUnit: "mcg/kg/hr",  decimalPlace: 1 },
  Norepinephrine:    { concentration: 1,    unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 2 },
  Nicardipine:       { concentration: 1,    unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 },
  Nitroglycerin:     { concentration: 0.5,  unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 2 }, //小數點待確定
  Labetalol:         { concentration: 5,    unit: "mg/ml",  rateUnit: "mg/kg/hr",   decimalPlace: 2 }, //小數點待確定
  PGE1:              { concentration: 0.5,  unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 2 },
  Vasopressin:       { concentration: 20,   unit: "U/ml",   rateUnit: "mU/kg/min",  decimalPlace: 1 },
  Isoproterenol:     { concentration: 0.2,  unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 },
  Rocuronium:        { concentration: 10,   unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 },
  Cisatracurium:     { concentration: 2,    unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 },
  Morphine:          { concentration: 10,   unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 2 }, //小數點待確定
  Lorazepam:         { concentration: 2,    unit: "mg/ml",  rateUnit: "mg/kg/hr",   decimalPlace: 2 }, //小數點待確定
  Ketamine:          { concentration: 50,   unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 },
  Propofol:          { concentration: 10,   unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 2 }, //小數點待確定
  MgSO4:             { concentration: 100,  unit: "mg/ml",  rateUnit: "mg/kg/hr",   decimalPlace: 1 },
  Lidocaine:         { concentration: 20,   unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 2 }, //小數點待確定
  Insulin:           { concentration: 100,  unit: "U/ml",   rateUnit: "U/kg/hr",    decimalPlace: 0 },
  Heparin:           { concentration: 5000, unit: "U/ml",   rateUnit: "U/kg/hr",    decimalPlace: 1 },
  Jusomin:           { concentration: 0.83, unit: "mEq/ml", rateUnit: "mEq/kg/hr",  decimalPlace: 1 }, //小數點待確定
  Octreotide:        { concentration: 100,  unit: "mcg/ml", rateUnit: "mcg/kg/hr",  decimalPlace: 1 }, //小數點待確定
  Amiodarone:        { concentration: 50,   unit: "mg/ml",  rateUnit: "mcg/kg/min", decimalPlace: 1 }, //小數點待確定
};

export function init(root) {
  const box = root.querySelector(`[data-tool="${TOOL_KEY}"]`);
  if (!box || box.dataset.bound === "1") return;
  box.dataset.bound = "1";

  const elBW        = box.querySelector(`[data-role="bw"]`);
  const elDrug      = box.querySelector(`[data-role="drug"]`);
  const elExtract   = box.querySelector(`[data-role="extract"]`);
  const elExtractU  = box.querySelector(`[data-role="extractUnit"]`);
  const elDiluter   = box.querySelector(`[data-role="diluter"]`);
  const elTotalVol  = box.querySelector(`[data-role="totalVol"]`);
  const elRunRate   = box.querySelector(`[data-role="runRate"]`);
  const elFinalRate = box.querySelector(`[data-role="finalRate"]`);
  const elFinalU    = box.querySelector(`[data-role="finalRateUnit"]`);
  const elCalcIn    = box.querySelector(`[data-role="calcIn"]`);
  const elCalcOut   = box.querySelector(`[data-role="calcOut"]`);

  const outBW       = box.querySelector(`[data-role="bwOut"]`);
  const outOrder    = box.querySelector(`[data-role="orderOut"]`);
  const outMed      = box.querySelector(`[data-role="medOut"]`);
  const outPure     = box.querySelector(`[data-role="pureOut"]`);
  const btnReset    = box.querySelector(`[data-role="reset"]`);

  const log = (...args) => { if (DEBUG) console.log(`[${TOOL_KEY}]`, ...args); };

  const defaults = () => {
    outBW.textContent    = "BW";
    outOrder.textContent = "醫囑";
    outMed.textContent   = "藥囑";
    outPure.textContent  = "Pure Line";
  };

  // ✅ mutual disable via your utils (exact signature)
  const mutual = bindMutualDisableBySelector(
    box,
    `[data-role="extract"]`,
    `[data-role="finalRate"]`,
    { key: "drugDose" }
  );

  let rafId = 0;
  const scheduleCalc = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      calc();
    });
  };

  function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeBWtoKg(bwInput) {
    const bw = toNumber(bwInput);
    if (!bw) return 0;
    return (bw > 200) ? (bw / 1000) : bw;
  }

  function splitRateUnit(rateUnit) {
    const parts = (rateUnit || "").split("/");
    return {
      amount: parts[0] || "", // mcg / mg / U / mU ...
      per:    parts[1] || "", // kg
      time:   parts[2] || "", // min / hr / (可能沒有)
    };
  }

  function getUnitConversionRatio(extractAmountUnit, rateAmountUnit) {
    const comb = `${extractAmountUnit}-${rateAmountUnit}`;
    switch (comb) {
      case "mg-mcg":  return 1 / 1000;
      case "U-mU":    return 1 / 1000;
      case "mg-mg":   return 1;
      case "mEq-mEq": return 1;
      case "mcg-mcg": return 1;
      default:        return 1;
    }
  }

  function getTimeConversionRatio(rateTimeUnit) {
    // 原本你只有 min 才 *60；hr 或缺省則 1
    return (rateTimeUnit === "min") ? 60 : 1;
  }

  function fmt(n, digits) {
    if (!Number.isFinite(n)) return "";
    const s = n.toFixed(digits);

    // 整數（沒有小數點）不要做去 0，避免 "107610" -> "10761"
    if (!s.includes(".")) return s;

    // 只有小數才去掉尾端 0（以及可能殘留的小數點）
    return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  // ---- safe mini calculator (no eval) ----
  function simpleCalc() {
    const raw = (elCalcIn?.value ?? "").toString().trim();
    if (!raw) { elCalcOut.textContent = ""; return; }
    const v = safeEvalNumber(raw, { trimTrailingOperators: true });
    if (!Number.isFinite(v)) { elCalcOut.textContent = ""; return; }
    elCalcOut.textContent = (Math.abs(v - Math.round(v)) < 1e-12)
      ? String(Math.round(v))
      : String(v.toFixed(6));
  }

  function calc() {
    defaults();

    const drugName = (elDrug.value || "").trim();
    const spec = drugSpecs[drugName];
    if (!spec) return;

    elDrug.title = `${drugName} ${spec.concentration} ${spec.unit}`;
    elExtractU.textContent = spec.unit.replace("/ml", "");
    elFinalU.textContent = spec.rateUnit;

    const bwKg = normalizeBWtoKg(elBW.value);
    const diluterName = (elDiluter.value || "").trim();
    const totalVol = toNumber(elTotalVol.value);
    const runRate = toNumber(elRunRate.value);

    // 必須具備的基礎欄位
    if (!bwKg || !diluterName || !totalVol || !runRate) return;
    if (bwKg <= 0 || totalVol <= 0 || runRate <= 0) return;

    // 互斥：extract 或 final rate 必須有其一
    const extractInput = toNumber(elExtract.value);
    const finalRateInput = toNumber(elFinalRate.value);
    const hasExtract = extractInput > 0;
    const hasFinalRate = finalRateInput > 0;
    if (!hasExtract && !hasFinalRate) return;

    const extractUnits = spec.unit.split("/"); // [amount, "ml"]
    const rateParts = splitRateUnit(spec.rateUnit);

    const unitConv = getUnitConversionRatio(extractUnits[0], rateParts.amount);
    const timeConv = getTimeConversionRatio(rateParts.time);

    // ✅ 不回填 input：只在區域變數算出推導值
    let extract = extractInput;
    let finalRate = finalRateInput;

    if (!hasExtract) {
      const val = (finalRate * bwKg * unitConv * timeConv / runRate * totalVol);
      if (!Number.isFinite(val) || val <= 0) return;
      extract = val;
    } else {
      const val = (extract / totalVol / bwKg / unitConv / timeConv * runRate);
      if (!Number.isFinite(val) || val <= 0) return;
      finalRate = val;
    }

    const drugVolMl = extract / spec.concentration;
    const diluterMl = totalVol - drugVolMl;
    if (!Number.isFinite(diluterMl)) return;

    const pureLine = (1 * spec.concentration / unitConv / bwKg / timeConv);
    if (!Number.isFinite(pureLine)) return;

    // outputs
    outBW.textContent = (bwKg > 5)
      ? `BW = ${fmt(bwKg, 3)} kg`
      : `BW = ${Math.round(bwKg * 1000)} g`;

    const extractUnitText = extractUnits[0];

    outOrder.textContent =
      `${drugName} ${fmt(extract, spec.decimalPlace)}${extractUnitText} in ${diluterName} ${fmt(diluterMl, 1)}ml ` +
      `(total ${fmt(totalVol, 1)}ml), run ${fmt(runRate, 2)}ml/hr = ${fmt(finalRate, 2)} ${spec.rateUnit}`;

    outMed.textContent =
      `${drugName} ${fmt(extract, spec.decimalPlace)}${extractUnitText} in ${diluterName} ${fmt(diluterMl, 1)}ml ` +
      `(total ${fmt(totalVol, 1)}ml), run as order`;

    outPure.textContent =
      `${drugName} pure line 1 ml/hr = ${fmt(pureLine, 1)} ${spec.rateUnit}`;

    log({ bwKg, drugName, extract, totalVol, runRate, finalRate, diluterMl, pureLine });
  }

  // events
  box.addEventListener("input", (e) => {
    if (e.target === elCalcIn) simpleCalc();
    scheduleCalc();
  });
  box.addEventListener("change", (e) => {
    if (e.target === elCalcIn) simpleCalc();
    scheduleCalc();
  });

  btnReset.addEventListener("click", () => {
    elBW.value = "";
    elDrug.value = "Dopamine";
    elExtract.value = "";
    elDiluter.value = "D5W";
    elTotalVol.value = "";
    elRunRate.value = "";
    elFinalRate.value = "";
    elCalcIn.value = "";
    elCalcOut.textContent = "";
    defaults();
    mutual?.update();
    scheduleCalc();
  });

  defaults();
  simpleCalc();
  calc();
}
