// /tools/fluid.js
// NeoAssist Tool Module Spec v1 compliant (no ctx, ES module, no id, data-role scoped)

import {
  parseExpression,
  createScheduler,
  bindMutualDisableBySelector,
} from "../core/utils.js";

const DEBUG = false;
const TOOL_KEY = "fluid";

const fluidLipidSpec = {
  SMOF: { density: 1 / 5, unit: "g/ml" },
  Omegaven: { density: 1 / 10, unit: "g/ml" },
};

const fluidTpnAAMap = {
  "0.025": "TPN",
  "0.030": "TPN [AA 3.0]",
  "0.033": "TPN [AA 3.3]",
  "0.035": "TPN [AA 3.5]",
  "0.040": "TPN [AA 4.0]",
  "0.050": "TPN [N0]",
};

export function render() {
  // NOTE: no id, everything via data-role/name, scoped under data-tool="fluid"
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100">
        <div class="card-header text-center pt-0 pb-0">
          <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" type="button" role="tab"
                data-role="tab_basic" aria-selected="true">
                水分計算簡易版
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" type="button" role="tab"
                data-role="tab_advanced" aria-selected="false">
                水分計算進階版
              </button>
            </li>
          </ul>
        </div>

        <div class="card-body pb-0">
          <div class="input-group" data-role="bw_area">
            <span class="input-group-text justify-content-center" style="width:15%;">BW</span>
            <input type="number" class="form-control text-center" data-role="bw" />
            <span class="input-group-text justify-content-center" style="width:15%;">g</span>
          </div>

          <div class="input-group" data-role="tdf_area">
            <span class="input-group-text justify-content-center" style="width:15%;">TDF</span>
            <input type="number" class="form-control text-center" data-role="tdf" />
            <span class="input-group-text justify-content-center" style="width:15%;">ml/kg/day</span>
          </div>

          <div class="input-group" data-role="po_area">
            <span class="input-group-text justify-content-center" style="width:15%;">PO</span>
            <select class="form-select text-center" data-role="po_hm">
              <option value="HM">HM</option>
              <option value=""></option>
            </select>
            <span class="input-group-text" style="background-color:#ffffff;">/</span>
            <select class="form-select text-center" data-role="po_formula">
              <option value="16%PF">16%PF</option>
              <option value="15%PDF">15%PDF</option>
              <option value="14%RF">14%RF</option>
              <option value=""></option>
            </select>
            <input type="text" class="form-control text-center" data-role="po" />
            <span class="input-group-text justify-content-center" style="width:15%;">ml/day</span>
          </div>

          <div class="input-group" data-role="tpn_area">
            <span class="input-group-text justify-content-center" style="width:15%;">TPN</span>
            <select class="form-select text-center" data-role="tpn_aa">
              <option value="0.025">AA 2.5</option>
              <option value="0.030">AA 3.0</option>
              <option value="0.033">AA 3.3</option>
              <option value="0.035">AA 3.5</option>
              <option value="0.040">AA 4.0</option>
              <option value="0.050">AA 5.0</option>
            </select>
            <input type="number" class="form-control text-center" data-role="tpn_grams" />
            <span class="input-group-text">g/kg/day</span>
            <input type="number" min="0" max="24" class="form-control text-center" placeholder="-" data-role="tpn_hours" />
            <span class="input-group-text justify-content-center" style="width:15%;">hrs</span>
          </div>

          <div class="input-group advanced-version-only" data-role="tpn_content_area">
            <span class="input-group-text justify-content-center" style="width:15%;"></span>
            <select class="form-select text-center" data-role="tpn_dex">
              <option value="2.5">Dex 2.5</option>
              <option value="5">Dex 5.0</option>
              <option value="7.5">Dex 7.5</option>
              <option value="10" selected>Dex 10.0</option>
              <option value="12.5">Dex 12.5</option>
              <option value="15">Dex 15.0</option>
              <option value="17.5">Dex 17.5</option>
              <option value="20">Dex 20.0</option>
              <option value="22.5">Dex 22.5</option>
              <option value="25">Dex 25.0</option>
            </select>
            <select class="form-select text-center" data-role="tpn_na">
              <option value="0">Na  0</option>
              <option value="10">Na 10</option>
              <option value="20">Na 20</option>
              <option value="30">Na 30</option>
              <option value="40" selected>Na 40</option>
              <option value="50">Na 50</option>
              <option value="60">Na 60</option>
              <option value="70">Na 70</option>
              <option value="80">Na 80</option>
            </select>
            <select class="form-select text-center" data-role="tpn_k">
              <option value="0">K  0</option>
              <option value="10">K 10</option>
              <option value="20" selected>K 20</option>
              <option value="30">K 30</option>
              <option value="40">K 40</option>
              <option value="50">K 50</option>
              <option value="60">K 60</option>
              <option value="70">K 70</option>
              <option value="80">K 80</option>
            </select>
            <select class="form-select text-center" data-role="tpn_ca">
              <option value="20" selected>Ca 20</option>
              <option value="30">Ca 30</option>
              <option value="40">Ca 40</option>
            </select>
            <select class="form-select text-center" data-role="tpn_p">
              <option value="0">P 0</option>
              <option value="6">P 6</option>
              <option value="9" selected>P 9</option>
              <option value="10">P 10</option>
              <option value="13.5">P 13.5</option>
              <option value="15">P 15</option>
              <option value="20">P 20</option>
            </select>
            <select class="form-select text-center" data-role="tpn_mg">
              <option value="0">Mg 0</option>
              <option value="2">Mg 2</option>
              <option value="4" selected>Mg 4</option>
            </select>
            <span class="input-group-text justify-content-center" style="width:15%;"></span>
          </div>

          <div class="input-group" data-role="lipid_area">
            <span class="input-group-text justify-content-center" style="width:15%;">Lipid</span>
            <select class="form-select text-center" data-role="lipid_type">
              <option value="SMOF">SMOF</option>
              <option value="Omegaven">Omegaven</option>
            </select>
            <input type="number" class="form-control text-center" data-role="lipid_grams" />
            <span class="input-group-text">g/kg/day</span>
            <input type="number" min="16" max="24" class="form-control text-center" placeholder="-" data-role="lipid_hours" />
            <span class="input-group-text justify-content-center" style="width:15%;">hrs</span>
          </div>

          <!-- Other in I/O rows (each row is its own input-group) -->
          <div class="d-flex flex-column" data-role="other_io_rows"></div>

          <!-- Other solution rows (each row is its own input-group) -->
          <div class="d-flex flex-column" data-role="other_solution_rows"></div>

          <div class="input-group" data-role="regular_iv_area">
            <span class="input-group-text justify-content-center" style="width:15%;">普通IV</span>
            <select class="form-select text-center" data-role="regular_iv_type">
              <option value=""></option>
              <option value="D5W(250)">D5W(250)</option>
              <option value="D10W(500)">D10W(500)</option>
              <option value="D0.225S(500)">D0.225S(500)</option>
              <option value="D0.225S(500) + 2PC D50W">D0.225S(500) + 2PC D50W</option>
              <option value="Dex 2.5% in 0.45 Saline(500)">Dex 2.5% in 0.45 saline(500)</option>
              <option value="H/S(500)">H/S(500)</option>
              <option value="N/S(500)">N/S(500)</option>
              <option value="D5S(500)">D5S(500)</option>
              <option value="Taita No.1(500)">Taita No.1(500)</option>
              <option value="Taita No.1(500) + 2PC D50W">Taita No.1(500) + 2PC D50W</option>
              <option value="Taita No.1(500) + 3PC D50W">Taita No.1(500) + 3PC D50W</option>
              <option value="Taita No.2(500)">Taita No.2(500)</option>
              <option value="Taita No.2(500) + 2PC D50W">Taita No.2(500) + 2PC D50W</option>
              <option value="Taita No.2(500) + 3PC D50W">Taita No.2(500) + 3PC D50W</option>
            </select>
            <input type="number" class="form-control text-center" data-role="regular_iv_rate" />
            <span class="input-group-text justify-content-center" style="width:15%;">ml/hr</span>
          </div>

          <div class="input-group" data-role="calc_area">
            <span class="input-group-text justify-content-center" style="width:15%;">計算機</span>
            <input type="text" class="form-control text-center" data-role="calc_input" />
            <span class="input-group-text justify-content-center">=</span>
            <span class="input-group-text justify-content-center" style="width:15%;" data-role="calc_result"></span>
          </div>
        </div>

        <div class="card-footer">
          <div class="input-group d-flex mt-2 mb-2 advanced-version-only" data-role="nutrition_area">
            <span class="input-group-text flex-fill justify-content-center copy-item" title="mEq/kg/day" data-role="nut_na">Na ___</span>
            <span class="input-group-text flex-fill justify-content-center copy-item" title="mEq/kg/day" data-role="nut_k">K ___</span>
            <span class="input-group-text flex-fill justify-content-center copy-item" title="mEq/kg/day" data-role="nut_ca">Ca ___</span>
            <span class="input-group-text flex-fill justify-content-center copy-item" title="mEq/kg/day" data-role="nut_p">P ___</span>
            <span class="input-group-text flex-fill justify-content-center copy-item" title="mEq/kg/day" data-role="nut_mg">Mg ___</span>
            <span class="input-group-text justify-content-center text-truncate" style="width:15%;">mEq/kg/day</span>
          </div>

          <div class="input-group d-flex mt-2 mb-2 advanced-version-only" data-role="nutrition_total_area">
            <span class="input-group-text flex-fill justify-content-center" data-role="nut_total_na">Na ___</span>
            <span class="input-group-text flex-fill justify-content-center" data-role="nut_total_k">K ___</span>
            <span class="input-group-text flex-fill justify-content-center" data-role="nut_total_ca">Ca ___</span>
            <span class="input-group-text flex-fill justify-content-center" data-role="nut_total_p">P ___</span>
            <span class="input-group-text flex-fill justify-content-center" data-role="nut_total_mg">Mg ___</span>
            <span class="input-group-text justify-content-center text-truncate" style="width:15%;">mEq/day</span>
          </div>


          <div class="row">
            <div class="col-10">
              <ul class="list-group mt-2 mb-2" data-role="order_output"></ul>
            </div>
            <div class="col-2" style="padding-left:0%;">
              <div class="d-flex flex-column justify-content-center align-items-center h-100">
                <button class="btn btn-secondary w-75 mb-2" type="button" data-role="intro">教學</button>
                <button class="btn btn-secondary w-75" type="button" data-role="reset">Reset</button>
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

  // ---- state ----
  let version = "basic"; // basic | advanced

  // ---- helpers ----
  const $ = (sel) => box.querySelector(sel);
  const $$ = (sel) => Array.from(box.querySelectorAll(sel));

  const els = {
    tabBasic: $('[data-role="tab_basic"]'),
    tabAdv: $('[data-role="tab_advanced"]'),

    bw: $('[data-role="bw"]'),
    tdf: $('[data-role="tdf"]'),
    poHM: $('[data-role="po_hm"]'),
    poFormula: $('[data-role="po_formula"]'),
    po: $('[data-role="po"]'),

    tpnAA: $('[data-role="tpn_aa"]'),
    tpnGrams: $('[data-role="tpn_grams"]'),
    tpnHours: $('[data-role="tpn_hours"]'),

    tpnDex: $('[data-role="tpn_dex"]'),
    tpnNa: $('[data-role="tpn_na"]'),
    tpnK: $('[data-role="tpn_k"]'),
    tpnCa: $('[data-role="tpn_ca"]'),
    tpnP: $('[data-role="tpn_p"]'),
    tpnMg: $('[data-role="tpn_mg"]'),

    lipidType: $('[data-role="lipid_type"]'),
    lipidGrams: $('[data-role="lipid_grams"]'),
    lipidHours: $('[data-role="lipid_hours"]'),

    regularIVType: $('[data-role="regular_iv_type"]'),
    regularIVRate: $('[data-role="regular_iv_rate"]'),

    otherIoRows: $('[data-role="other_io_rows"]'),
    otherSolRows: $('[data-role="other_solution_rows"]'),

    calcInput: $('[data-role="calc_input"]'),
    calcResult: $('[data-role="calc_result"]'),

    nutArea: $('[data-role="nutrition_area"]'),
    nutNa: $('[data-role="nut_na"]'),
    nutK: $('[data-role="nut_k"]'),
    nutCa: $('[data-role="nut_ca"]'),
    nutP: $('[data-role="nut_p"]'),
    nutMg: $('[data-role="nut_mg"]'),

    nutTotalNa: $('[data-role="nut_total_na"]'),
    nutTotalK:  $('[data-role="nut_total_k"]'),
    nutTotalCa: $('[data-role="nut_total_ca"]'),
    nutTotalP:  $('[data-role="nut_total_p"]'),
    nutTotalMg: $('[data-role="nut_total_mg"]'),


    out: $('[data-role="order_output"]'),

    btnReset: $('[data-role="reset"]'),
    btnIntro: $('[data-role="intro"]'),
  };

  const setAdvancedVisible = (on) => {
    version = on ? "advanced" : "basic";

    // toggle tabs
    if (els.tabBasic) {
      els.tabBasic.classList.toggle("active", !on);
      els.tabBasic.setAttribute("aria-selected", (!on).toString());
    }
    if (els.tabAdv) {
      els.tabAdv.classList.toggle("active", on);
      els.tabAdv.setAttribute("aria-selected", on.toString());
    }

    // show/hide advanced blocks (do not remove DOM)
    $$(".advanced-version-only").forEach((node) => {
      node.classList.toggle("d-none", !on);
    });
  };

  // Each added row is a full input-group: "Other" + (base) + value + unit + "+"
  const mkOtherIORow = () => {
    const advClass =
      "advanced-version-only" + (version === "advanced" ? "" : " d-none");

    const row = document.createElement("div");
    row.className = "input-group w-100";
    row.setAttribute("name", "fluid_other_io_row");
    row.innerHTML = `
      <span class="input-group-text justify-content-center" style="width:15%;">Other</span>

      <select
        class="form-select text-center ${advClass}"
        name="fluid_other_in_IO_base"
        data-role="other_io_base"
      >
        <option value=""></option>
        <option value="3% NaCl">3% NaCl</option>
      </select>

      <input
        type="text"
        class="form-control text-center"
        name="fluid_other_in_IO"
        data-role="other_io_value"
      />

      <span class="input-group-text justify-content-center" style="width:10%;">ml/day</span>

      <button class="btn btn-light" type="button"
        style="border-color:#e0e3e7;width:5%;" data-role="add_other_io">+</button>
    `;
    return row;
  };

  const mkOtherSolutionRow = () => {
    const advClass =
      "advanced-version-only" + (version === "advanced" ? "" : " d-none");

    const row = document.createElement("div");
    row.className = "input-group w-100";
    row.setAttribute("name", "fluid_other_solution_row");
    row.innerHTML = `
      <span class="input-group-text justify-content-center" style="width:15%;">Other</span>

      <select
        class="form-select text-center ${advClass}"
        name="fluid_other_solution_base"
        data-role="other_solution_base"
      >
        <option value=""></option>
        <option value="D/W">D/W base</option>
        <option value="D5W">D5W base</option>
        <option value="D10W">D10W base</option>
        <option value="H/S">H/S base</option>
        <option value="N/S">N/S base</option>
        <option value="L/R">L/R base</option>
      </select>

      <input
        type="text"
        class="form-control text-center"
        name="fluid_other_solution_rate"
        data-role="other_solution_rate"
      />

      <span class="input-group-text justify-content-center" style="width:10%;">ml/hr</span>

      <button class="btn btn-light" type="button"
        style="border-color:#e0e3e7;width:5%;" data-role="add_other_solution">+</button>
    `;
    return row;
  };

  const ensureBaseRows = () => {
    if (els.otherIoRows && els.otherIoRows.childElementCount === 0) {
      els.otherIoRows.appendChild(mkOtherIORow());
    }
    if (els.otherSolRows && els.otherSolRows.childElementCount === 0) {
      els.otherSolRows.appendChild(mkOtherSolutionRow());
    }
  };

  const syncAdvancedRowVisibility = () => {
    // show/hide per-row advanced selects
    $$(".advanced-version-only").forEach((node) => {
      node.classList.toggle("d-none", version !== "advanced");
    });
  };

  const setNutritionPlaceholders = () => {
    if (els.nutNa) els.nutNa.textContent = "Na ___";
    if (els.nutK) els.nutK.textContent = "K ___";
    if (els.nutCa) els.nutCa.textContent = "Ca ___";
    if (els.nutP) els.nutP.textContent = "P ___";
    if (els.nutMg) els.nutMg.textContent = "Mg ___";
    if (els.nutTotalNa) els.nutTotalNa.textContent = "Na ___";
    if (els.nutTotalK)  els.nutTotalK.textContent  = "K ___";
    if (els.nutTotalCa) els.nutTotalCa.textContent = "Ca ___";
    if (els.nutTotalP)  els.nutTotalP.textContent  = "P ___";
    if (els.nutTotalMg) els.nutTotalMg.textContent = "Mg ___";

  };

  const setOutputs = (lines) => {
    if (!els.out) return;
    els.out.innerHTML = "";
    for (const line of lines) {
      if (!line) continue;
      const li = document.createElement("li");
      li.className = "list-group-item copy-item";
      li.setAttribute("name", "fluid_order_outputs");
      li.textContent = line;
      els.out.appendChild(li);
    }
  };

  // ---- scheduler (spec 4.2) ----
  const scheduleCalc = createScheduler(calc);

  // ---- mutual disable (TPN grams vs Regular IV rate) ----
  bindMutualDisableBySelector(
    box,
    '[data-role="tpn_grams"]',
    '[data-role="regular_iv_rate"]',
    { key: "tpn_vs_regulariv" }
  );

  // ---- calc ----
  function calc() {
    ensureBaseRows();

    // calculator (local)
    if (els.calcInput && els.calcResult) {
        const expr = String(els.calcInput.value ?? "").trim();
        if (!expr) {
        els.calcResult.textContent = "";
        } else {
        const v = parseExpression(expr);
        els.calcResult.textContent = Number.isFinite(v) ? Number(v).toFixed(3) : "";
        }
    }

    const BW = Number(els.bw?.value) || 0;   // g
    const TDF = Number(els.tdf?.value) || 0; // ml/kg/day

    const outputLines = [
        BW ? `BW: ${BW} g` : "BW:",
        TDF
        ? `Total daily fluid: ${TDF} ml/kg/day = total ${((TDF * BW) / 1000).toFixed(1)} ml/day`
        : "Total daily fluid:",
    ];

    // if core inputs missing, stop early
    if (!BW || !TDF) {
        setOutputs(outputLines);

        // advanced footer: reset ions only (no GIR here)
        if (version === "advanced") {
        if (els.nutNa) els.nutNa.textContent = "Na ___";
        if (els.nutK)  els.nutK.textContent  = "K ___";
        if (els.nutCa) els.nutCa.textContent = "Ca ___";
        if (els.nutP)  els.nutP.textContent  = "P ___";
        if (els.nutMg) els.nutMg.textContent = "Mg ___";

        // if you have mEq/day row
        if (els.nutTotalNa) els.nutTotalNa.textContent = "Na ___";
        if (els.nutTotalK)  els.nutTotalK.textContent  = "K ___";
        if (els.nutTotalCa) els.nutTotalCa.textContent = "Ca ___";
        if (els.nutTotalP)  els.nutTotalP.textContent  = "P ___";
        if (els.nutTotalMg) els.nutTotalMg.textContent = "Mg ___";
        }

        if (DEBUG) {
        console.groupCollapsed(`[${TOOL_KEY}] calc (early exit)`);
        console.log({ BW, TDF, version });
        console.groupEnd();
        }
        return;
    }

    const totalTDF = (TDF * BW) / 1000; // ml/day
    const bwKg = BW / 1000;

    // PO
    const POraw = String(els.po?.value ?? "").trim();
    const POHM = String(els.poHM?.value ?? "");
    const POFormula = String(els.poFormula?.value ?? "");
    const totalPO = POraw === "" ? 0 : Number(parseExpression(POraw)) || 0;

    // TPN inputs
    const tpnAA = String(els.tpnAA?.value ?? "0.025");
    const tpnAAf = Number(tpnAA) || 0.025;
    const tpnHours = Math.max(0, Math.min(24, Number(els.tpnHours?.value) || 24));
    const tpnGramsRaw = String(els.tpnGrams?.value ?? "").trim();
    const hasTPNGrams = tpnGramsRaw !== "";
    const tpnGramsInput = Number(tpnGramsRaw) || 0;

    // lipid
    const lipidType = String(els.lipidType?.value ?? "SMOF");
    const lipidGrams = Number(els.lipidGrams?.value) || 0;
    const lipidHoursInput = Number(els.lipidHours?.value);
    const lipidHoursValid = Number.isFinite(lipidHoursInput) ? lipidHoursInput : 20;
    const lipidSpec = fluidLipidSpec[lipidType] || fluidLipidSpec.SMOF;

    // other IO / solutions
    const otherIOValues = $$('[data-role="other_io_value"]');
    const otherIOBases  = $$('[data-role="other_io_base"]');
    const otherSolRates = $$('[data-role="other_solution_rate"]');
    const otherSolBases = $$('[data-role="other_solution_base"]');

    // regular IV
    const regularIVType = String(els.regularIVType?.value ?? "") || "普通IV";
    const regularIVRateRaw = String(els.regularIVRate?.value ?? "").trim();
    const hasRegularIVRate = regularIVRateRaw !== "";
    const regularIVRateInput = Number(regularIVRateRaw) || 0;

    // ---- advanced composition defaults ----
    let tpnDex = 10, tpnNa = 40, tpnK = 20, tpnCa = 20, tpnP = 9, tpnMg = 4;
    let totalGIR = 0, totalNa = 0, totalK = 0, totalCa = 0, totalP = 0, totalMg = 0;
    let girText = ""; // GIR line for order_output (advanced only)

    if (version === "advanced") {
        tpnDex = Number(els.tpnDex?.value) || 10;
        tpnNa  = Number(els.tpnNa?.value) || 40;
        tpnK   = Number(els.tpnK?.value) || 20;
        tpnCa  = Number(els.tpnCa?.value) || 20;
        tpnP   = Number(els.tpnP?.value) || 9;
        tpnMg  = Number(els.tpnMg?.value) || 4;
    } else {
        // keep footer placeholders stable (ions only)
        if (els.nutNa) els.nutNa.textContent = "Na ___";
        if (els.nutK)  els.nutK.textContent  = "K ___";
        if (els.nutCa) els.nutCa.textContent = "Ca ___";
        if (els.nutP)  els.nutP.textContent  = "P ___";
        if (els.nutMg) els.nutMg.textContent = "Mg ___";
        if (els.nutTotalNa) els.nutTotalNa.textContent = "Na ___";
        if (els.nutTotalK)  els.nutTotalK.textContent  = "K ___";
        if (els.nutTotalCa) els.nutTotalCa.textContent = "Ca ___";
        if (els.nutTotalP)  els.nutTotalP.textContent  = "P ___";
        if (els.nutTotalMg) els.nutTotalMg.textContent = "Mg ___";
    }

    // ---- lipid calc (choose best hour 16..23 up to user hour, within 10% accepted) ----
    let lipidTotalVolumeGoal = 0;
    let lipidBestHour = 20;
    let lipidRate = 0;
    let lipidTotalVolume = 0;

    if (lipidGrams > 0 && lipidSpec?.density) {
        lipidTotalVolumeGoal = (lipidGrams * BW) / 1000 / lipidSpec.density;

        const h0 = Math.min(23, Math.max(16, Number.isFinite(lipidHoursValid) ? lipidHoursValid : 20));
        lipidBestHour = h0;

        const acceptedError = lipidTotalVolumeGoal * 0.1;
        let bestDiff = Infinity;

        for (let h = 16; h <= 23; h++) {
        if (h > h0) break;
        const r = Number((lipidTotalVolumeGoal / h).toFixed(1));
        const v = r * h;
        const diff = Math.abs(v - lipidTotalVolumeGoal);
        if (diff < bestDiff || diff < acceptedError) {
            bestDiff = diff;
            lipidBestHour = h;
        }
        }

        lipidRate = Number((lipidTotalVolumeGoal / lipidBestHour).toFixed(1));
        lipidTotalVolume = lipidRate * lipidBestHour;
    }

    // ---- other IO total + composition (advanced) ----
    let otherIOTotal = 0;
    for (let i = 0; i < otherIOValues.length; i++) {
        const v = Number(parseExpression(otherIOValues[i]?.value)) || 0;
        otherIOTotal += v;

        if (version === "advanced") {
        const base = String(otherIOBases[i]?.value ?? "");
        if (base === "3% NaCl") {
            totalNa += (v * 513) / 1000; // mEq/day
        }
        }
    }

    // ---- other solution total + composition (advanced) ----
    let otherSolTotal = 0; // ml/day
    for (let i = 0; i < otherSolRates.length; i++) {
        const rate = Number(parseExpression(otherSolRates[i]?.value)) || 0; // ml/hr
        otherSolTotal += rate * 24;

        if (version === "advanced") {
        const base = String(otherSolBases[i]?.value ?? "");
        if (base === "L/R") {
            totalNa += (rate * 24 / 1000) * 130;
            totalK  += (rate * 24 / 1000) * 4.0;
            totalCa += (rate * 24 / 1000) * 3.0;
        } else if (base === "H/S") {
            totalNa += (rate * 24 / 1000) * 77;
        } else if (base === "N/S") {
            totalNa += (rate * 24 / 1000) * 154;
        } else if (base === "D5W") {
            totalGIR += rate * 5;
        } else if (base === "D10W") {
            totalGIR += rate * 10;
        }
        }
    }

    // ---- TPN + Regular IV balancing ----
    let tpnRate = 0;         // ml/hr
    let tpnTotalVol = 0;     // ml over tpnHours
    let regularIVRate = 0;   // ml/hr
    let regularIVTotal = 0;  // ml/day
    let tpnGramsComputed = 0;
    let tpnMakeUp = "";

    const safeTPNHours = tpnHours > 0 ? tpnHours : 24;
    const safeAA = tpnAAf > 0 ? tpnAAf : 0.025;

    if (hasTPNGrams) {
        const grams = tpnGramsInput;

        tpnRate = Number(((grams * bwKg) / safeAA / safeTPNHours).toFixed(1));
        tpnTotalVol = tpnRate * safeTPNHours;

        regularIVRate = Number(
        ((totalTDF - totalPO - tpnTotalVol - lipidTotalVolume - otherIOTotal - otherSolTotal) / 24).toFixed(1)
        );
        if (!Number.isFinite(regularIVRate)) regularIVRate = 0;
        regularIVTotal = regularIVRate * 24;

        tpnGramsComputed = grams;
    } else {
        regularIVRate = hasRegularIVRate ? regularIVRateInput : 0;
        regularIVTotal = Number((regularIVRate * 24).toFixed(1));

        tpnTotalVol = totalTDF - totalPO - lipidTotalVolume - otherIOTotal - otherSolTotal - regularIVTotal;
        if (!Number.isFinite(tpnTotalVol) || tpnTotalVol < 0) tpnTotalVol = 0;

        tpnRate = Number((tpnTotalVol / safeTPNHours).toFixed(1));
        tpnGramsComputed = Number(((tpnRate * safeTPNHours * safeAA) / bwKg).toFixed(2));
        tpnMakeUp = " (補)";
    }

    // ---- output strings ----
    let outPO = "";
    const poPattern = /^(\d+\s*\*\s*\d+)(\s*\+\s*\d+\s*\*\s*\d+)*$/;

    if (POraw === "") {
        outPO = "";
    } else if (totalPO === 0) {
        outPO = "Diet: NPO with OG decompression";
    } else if (!poPattern.test(POraw)) {
        outPO = `Diet: ${totalPO} ml/day`;
    } else {
        const pairRe = /(\d+)\s*\*\s*(\d+)/g;
        let m;
        const pairs = [];
        while ((m = pairRe.exec(POraw)) !== null) {
        pairs.push({ base: parseInt(m[1], 10), mul: parseInt(m[2], 10) });
        }
        const mulSum = pairs.reduce((s, x) => s + (x.mul || 0), 0);

        if (!mulSum || (24 % mulSum) !== 0) {
        outPO = `Diet: ${totalPO} ml/day`;
        } else {
        const parts = pairs.map(({ base, mul }) => `${base} ml * ${mul} meals`);
        let feed = parts.join(" then ");
        feed += ` / Q${24 / mulSum}H`;

        const milkType =
            POHM && POFormula ? `${POHM}/${POFormula}` : (POHM || POFormula || "");
        if (milkType) feed = `${milkType} ${feed}`;

        outPO = `Diet: ${feed} = (total ${totalPO} ml/day)`;
        }
    }

    const tpnTitle = fluidTpnAAMap[tpnAA] || "TPN";
    const tpnHoursText = safeTPNHours === 24 ? "" : `run ${safeTPNHours} hrs`;
    let outTPN = `${tpnTitle}${tpnMakeUp} ${tpnGramsComputed} g/kg/day = ${tpnRate} ml/hr ${tpnHoursText}`.trim();
    if (!Number.isFinite(tpnGramsComputed) || tpnGramsComputed === 0) outTPN = "";

    let outLipid = "";
    if (lipidGrams > 0) {
        outLipid = `${lipidType} ${lipidGrams} g/kg/day = ${lipidRate} ml/hr run ${lipidBestHour} hrs`;
    }

    const outOtherIO = otherIOTotal > 0 ? `Other in I/O: ${otherIOTotal} ml/day` : "";
    const outOtherSol =
        otherSolTotal > 0
        ? `Total Other Solution run ${(otherSolTotal / 24).toFixed(1)} ml/hr = ${otherSolTotal.toFixed(1)} ml/day`
        : "";

    const outRegularIV =
        Number.isFinite(regularIVRate) && regularIVRate !== 0
        ? `${regularIVType} run ${regularIVRate} ml/hr`
        : "";

    outputLines.push(outPO);
    if (outTPN) outputLines.push(outTPN);
    if (outLipid) outputLines.push(outLipid);
    if (outOtherIO) outputLines.push(outOtherIO);
    if (outOtherSol) outputLines.push(outOtherSol);
    if (outRegularIV) outputLines.push(outRegularIV);

    // ---- nutrition (advanced only): compute GIR and ions ----
    if (version === "advanced") {
        // TPN GIR/ions
        totalGIR += tpnRate * tpnDex;
        totalNa  += (tpnTotalVol / 1000) * tpnNa;
        totalK   += (tpnTotalVol / 1000) * tpnK;
        totalCa  += (tpnTotalVol / 1000) * tpnCa;
        totalP   += (tpnTotalVol / 1000) * tpnP;
        totalMg  += (tpnTotalVol / 1000) * tpnMg;

        // Regular IV GIR/ions
        switch (regularIVType) {
        case "D0.225S(500)":
            totalNa += (regularIVTotal / 1000) * 38.5;
            totalGIR += regularIVRate * 5;
            break;
        case "D0.225S(500) + 2PC D50W":
            totalNa += (regularIVTotal / 1000) * 35.6;
            totalGIR += regularIVRate * 8.33;
            break;
        case "Dex 2.5% in 0.45 Saline(500)":
            totalNa += (regularIVTotal / 1000) * 77;
            totalGIR += regularIVRate * 2.5;
            break;
        case "D5W(250)":
            totalGIR += regularIVRate * 5;
            break;
        case "D10W(500)":
            totalGIR += regularIVRate * 10;
            break;
        case "H/S(500)":
            totalNa += (regularIVTotal / 1000) * 77;
            break;
        case "N/S(500)":
            totalNa += (regularIVTotal / 1000) * 154;
            break;
        case "D5S(500)":
            totalNa += (regularIVTotal / 1000) * 154;
            totalGIR += regularIVRate * 5;
            break;
        case "Taita No.1(500)":
            totalNa += (regularIVTotal / 1000) * 25;
            totalK  += (regularIVTotal / 1000) * 18.0;
            totalP  += (regularIVTotal / 1000) * 6.0;
            totalGIR += regularIVRate * 3.8;
            break;
        case "Taita No.1(500) + 2PC D50W":
            totalNa += (regularIVTotal / 1000) * 23.1;
            totalK  += (regularIVTotal / 1000) * 16.7;
            totalP  += (regularIVTotal / 1000) * 5.6;
            totalGIR += regularIVRate * 7.22;
            break;
        case "Taita No.1(500) + 3PC D50W":
            totalNa += (regularIVTotal / 1000) * 22.3;
            totalK  += (regularIVTotal / 1000) * 16.1;
            totalP  += (regularIVTotal / 1000) * 5.4;
            totalGIR += regularIVRate * 8.75;
            break;
        case "Taita No.2(500)":
            totalNa += (regularIVTotal / 1000) * 40;
            totalK  += (regularIVTotal / 1000) * 12.0;
            totalP  += (regularIVTotal / 1000) * 6.0;
            totalGIR += regularIVRate * 3.3;
            break;
        case "Taita No.2(500) + 2PC D50W":
            totalNa += (regularIVTotal / 1000) * 37;
            totalK  += (regularIVTotal / 1000) * 11.1;
            totalP  += (regularIVTotal / 1000) * 5.6;
            totalGIR += regularIVRate * 6.76;
            break;
        case "Taita No.2(500) + 3PC D50W":
            totalNa += (regularIVTotal / 1000) * 35.7;
            totalK  += (regularIVTotal / 1000) * 10.7;
            totalP  += (regularIVTotal / 1000) * 5.4;
            totalGIR += regularIVRate * 8.3;
            break;
        default:
            break;
        }

        // GIR: mg/kg/min (your existing convention)
        const gir = (bwKg > 0 ? (totalGIR / (6 * bwKg)).toFixed(2) : "");
        if (gir) girText = `GIR: ${gir}`;

        // footer: ions only
        const perKg = (x) => (bwKg > 0 ? (x / bwKg).toFixed(1) : "___");
        if (els.nutNa) els.nutNa.textContent = `Na ${perKg(totalNa)}`;
        if (els.nutK)  els.nutK.textContent  = `K ${perKg(totalK)}`;
        if (els.nutCa) els.nutCa.textContent = `Ca ${perKg(totalCa)}`;
        if (els.nutP)  els.nutP.textContent  = `P ${perKg(totalP)}`;
        if (els.nutMg) els.nutMg.textContent = `Mg ${perKg(totalMg)}`;

        // if you have mEq/day row
        if (els.nutTotalNa) els.nutTotalNa.textContent = `Na ${totalNa.toFixed(1)}`;
        if (els.nutTotalK)  els.nutTotalK.textContent  = `K ${totalK.toFixed(1)}`;
        if (els.nutTotalCa) els.nutTotalCa.textContent = `Ca ${totalCa.toFixed(1)}`;
        if (els.nutTotalP)  els.nutTotalP.textContent  = `P ${totalP.toFixed(1)}`;
        if (els.nutTotalMg) els.nutTotalMg.textContent = `Mg ${totalMg.toFixed(1)}`;
    }

    // GIR goes into order_output (advanced only)
    if (version === "advanced" && girText) {
        outputLines.push(girText);
    }

    setOutputs(outputLines);

    if (DEBUG) {
        console.groupCollapsed(`[${TOOL_KEY}] calc`);
        console.log({
        version,
        BW,
        TDF,
        totalTDF,
        totalPO,
        tpnRate,
        tpnTotalVol,
        regularIVRate,
        regularIVTotal,
        lipidRate,
        lipidBestHour,
        lipidTotalVolume,
        });
        console.groupEnd();
    }
  }


  // ---- reset (spec 5) ----
  function reset() {
    if (els.bw) els.bw.value = "";
    if (els.tdf) els.tdf.value = "";
    if (els.po) els.po.value = "";
    if (els.tpnGrams) els.tpnGrams.value = "";
    if (els.tpnHours) els.tpnHours.value = "";
    if (els.lipidGrams) els.lipidGrams.value = "";
    if (els.lipidHours) els.lipidHours.value = "";
    if (els.regularIVRate) els.regularIVRate.value = "";
    if (els.calcInput) els.calcInput.value = "";
    if (els.calcResult) els.calcResult.textContent = "";

    // reset selects
    if (els.poHM) els.poHM.value = "HM";
    if (els.poFormula) els.poFormula.value = "16%PF";
    if (els.tpnAA) els.tpnAA.value = "0.025";
    if (els.lipidType) els.lipidType.value = "SMOF";
    if (els.regularIVType) els.regularIVType.value = "";

    // advanced defaults
    if (els.tpnDex) els.tpnDex.value = "10";
    if (els.tpnNa) els.tpnNa.value = "40";
    if (els.tpnK) els.tpnK.value = "20";
    if (els.tpnCa) els.tpnCa.value = "20";
    if (els.tpnP) els.tpnP.value = "9";
    if (els.tpnMg) els.tpnMg.value = "4";

    // remove dynamic rows (keep one)
    if (els.otherIoRows) els.otherIoRows.innerHTML = "";
    if (els.otherSolRows) els.otherSolRows.innerHTML = "";
    ensureBaseRows();

    // back to basic
    setAdvancedVisible(false);
    syncAdvancedRowVisibility();

    scheduleCalc();
  }

  // ---- intro (optional; only runs if introJs exists globally) ----
  function intro() {
    // prefill example
    if (els.bw) els.bw.value = 1500;
    if (els.tdf) els.tdf.value = 150;
    if (els.po) els.po.value = "5*2+10*4";
    if (els.tpnHours) els.tpnHours.value = 22.5;
    if (els.lipidGrams) els.lipidGrams.value = 2;

    // fill first IO row
    const io0 = box.querySelector('[data-role="other_io_value"]');
    if (io0) io0.value = "2*3+5";

    const sol0 = box.querySelector('[data-role="other_solution_rate"]');
    if (sol0) sol0.value = "0.2+0.5";

    scheduleCalc();

    if (typeof window.introJs !== "function") return;

    const steps = [
      { element: box.querySelector('[data-role="bw_area"]'), intro: "輸入體重" },
      { element: box.querySelector('[data-role="tdf_area"]'), intro: "輸入所需總水分" },
      { element: box.querySelector('[data-role="po_area"]'), intro: "輸入奶量：可輸入總量或算式" },
      { element: box.querySelector('[data-role="tpn_area"]'), intro: "<1>若TPN補不足，TPN grams 留空<br><2>hours 可限制輸注時間" },
      { element: box.querySelector('[data-role="tpn_content_area"]'), intro: "進階版：調整TPN成分計算每日攝取量" },
      { element: box.querySelector('[data-role="lipid_area"]'), intro: "Lipid：hours 留空會自動找最佳時間 (>=16h)" },
      { element: box.querySelector('[data-role="other_io_rows"]'), intro: "Other in I/O：每列都有 + 可新增一整列（含單位）" },
      { element: box.querySelector('[data-role="other_solution_rows"]'), intro: "Other solution：每列都有 + 可新增一整列（含單位）" },
      { element: box.querySelector('[data-role="nutrition_area"]'), intro: "進階版：顯示 GIR/離子 (TPN+other+IV)" },
      { element: box.querySelector('[data-role="order_output"]'), intro: "結果：點一下即可複製" },
    ].filter(s => s.element);

    const intro = window.introJs();
    intro.setOptions({
      steps,
      showProgress: true,
      showBullets: false,
      disableInteraction: false,
      exitOnOverlayClick: false,
      scrollToElement: true,
    });
    intro.oncomplete(() => reset());
    intro.onexit(() => reset());
    intro.start();
  }

  // ---- event delegation (spec 4.3) ----
  box.addEventListener("click", (e) => {
    const t = e.target;

    if (t === els.tabBasic) {
      setAdvancedVisible(false);
      syncAdvancedRowVisibility();
      scheduleCalc();
      return;
    }
    if (t === els.tabAdv) {
      setAdvancedVisible(true);
      syncAdvancedRowVisibility();
      scheduleCalc();
      return;
    }

    // add full rows (button exists in every row)
    if (t?.closest?.('[data-role="add_other_io"]')) {
      els.otherIoRows?.appendChild(mkOtherIORow());
      syncAdvancedRowVisibility();
      scheduleCalc();
      return;
    }
    if (t?.closest?.('[data-role="add_other_solution"]')) {
      els.otherSolRows?.appendChild(mkOtherSolutionRow());
      syncAdvancedRowVisibility();
      scheduleCalc();
      return;
    }

    if (t === els.btnReset) {
      reset();
      return;
    }

    if (t === els.btnIntro) {
      setAdvancedVisible(true);
      syncAdvancedRowVisibility();
      intro();
      return;
    }
  });

  box.addEventListener("input", () => scheduleCalc());
  box.addEventListener("change", () => scheduleCalc());

  // ---- initial ----
  setAdvancedVisible(false);
  ensureBaseRows();
  setNutritionPlaceholders();
  syncAdvancedRowVisibility();
  scheduleCalc();
}
