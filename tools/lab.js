// tools/lab.js
// updated: 2026-03-05
// note: add Order/Bar area with drag-reorder + add/clear/reset bars (horizontal only)

import { createScheduler } from "../core/utils.js";

const TOOL_KEY = "lab";
const DEBUG = false;

export function render() {
  return `
    <style>
      /* panel */
      [data-tool="lab"] .lab-items-panel{
        margin-top:10px;
        padding:0px;
        border:1px solid #6c757d2e;
        border-radius:10px;
      }

      /* each category row */
      [data-tool="lab"] .lab-cat-group{
        display:grid;
        grid-template-columns:80px 1fr;
        gap:10px;
        align-items:center;
        padding:10px 0;
      }

      [data-tool="lab"] .lab-cat-group + .lab-cat-group{
        border-top:1px solid #6c757d2e;
      }

      /* left title */
      [data-tool="lab"] .lab-cat-left{
        font-weight:700;
        color:#444;
        white-space:nowrap;
        text-align:center;
      }

      /* right items (no box) */
      [data-tool="lab"] .lab-cat-items{
        display:flex;
        flex-wrap:wrap;
        gap:6px;
      }

      /* chips */
      [data-tool="lab"] .lab-items-panel label.btn{
        font-size:12px;
        padding:2px 10px;
        border-radius:999px;
        white-space:nowrap;
      }

      /* Date separation */
      [data-tool="lab"] .lab-cat-group.is-date{
        border-bottom:1px solid #6c757d2e;
      }

      /* -----------------------------
         Order / Bar area
      ----------------------------- */
      [data-tool="lab"] .lab-order-panel{
        margin-top:10px;
        border:1px solid #6c757d2e;
        border-radius:10px;
        padding:10px 10px 10px 0;
      }

      [data-tool="lab"] .lab-order-header{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }

      [data-tool="lab"] .lab-order-title{
        font-weight:700;
        color:#444;
        white-space:nowrap;
        text-align:center;
        width:80px;
      }

      [data-tool="lab"] .lab-order-actions{
        display:flex;
        gap:6px;
        flex-wrap:wrap;
        justify-content:flex-end;
      }

      [data-tool="lab"] .lab-order-list{
        display:flex;
        flex-wrap:nowrap;      /* ✅ 不換行 */
        overflow-x:auto;       /* ✅ 超出用水平捲動 */
        overflow-y:hidden;
        gap:2px;
        align-items:center;
        min-height:36px;
        padding:10px;
        scroll-behavior:smooth;
        -webkit-overflow-scrolling:touch;
      }

      [data-tool="lab"] .lab-order-empty{
        color:#888;
        font-size:12px;
        padding:4px 6px;
      }

      [data-tool="lab"] .lab-order-chip{
        user-select:none;
        cursor:grab;
        padding:3px 10px;
        border-radius:999px;
        font-size:12px;
        border:1px solid #6c757d66;
        background:#ffffff;
        color:#000000;
      }


      /* since you are using bootstrap dark mode, keep neutral */
      [data-tool="lab"] .lab-order-chip:active{
        cursor:grabbing;
      }

      [data-tool="lab"] .lab-order-chip.is-bar{
        padding:3px 10px;
        font-weight:800;
        letter-spacing:1px;
        opacity:0.95;
      }

      [data-tool="lab"] .lab-order-chip.dragging{
        opacity:0.45;
      }
    </style>

    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100">
        <div class="card-header text-center">lab整理</div>

        <div class="card-body pb-0">
          <div class="input-group" data-role="rawArea">
            <span class="input-group-text justify-content-center" style="width:15%;">Raw Lab</span>
            <textarea class="form-control" data-role="rawText" style="height:150px;"></textarea>
          </div>
        </div>

        <div class="card-footer">

          <!-- 顯示方式 -->
          <div class="row mt-2">
            <div class="col" data-role="presetArea">
              <span>✔ 選取顯示方式</span>
              <div class="mt-1 d-flex align-items-center justify-content-between gap-2 flex-wrap">

                <div class="d-flex align-items-center gap-1">

                  <!-- 橫式 / 直式 -->
                  <div class="btn-group mb-2" role="group" aria-label="display mode toggle buttons" data-role="displayModeGroup">
                    <input type="radio" class="btn-check" name="lab_display_mode" id="lab_display_horizontal" autocomplete="off" checked>
                    <label class="btn btn-outline-secondary" for="lab_display_horizontal">橫式</label>

                    <input type="radio" class="btn-check" name="lab_display_mode" id="lab_display_vertical" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_display_vertical">直式</label>
                  </div>

                  <!-- Trend 開關 -->
                  <div class="btn-group mb-2" role="group" aria-label="trend toggle" data-role="trendModeGroup">

                    <input type="radio" class="btn-check" name="lab_trend_mode" id="lab_trend_on" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_trend_on">Chart</label>

                    <input type="radio" class="btn-check" name="lab_trend_mode" id="lab_trend_off" autocomplete="off" checked>
                    <label class="btn btn-outline-secondary" for="lab_trend_off">No Chart</label>

                  </div>

                </div>

              </div>
            </div>
          </div>

          <!-- 檢體別 selection -->
          <div class="row mt-2">
            <div class="col" data-role="specimenArea">
              <span>✔ 選取檢體別</span>
              <div class="mt-1 mb-2 d-flex flex-wrap gap-1" data-role="specimenSelection"><br></div>
            </div>
          </div>

          <!-- 日期 presets -->
          <div class="row mt-2">
            <div class="col" data-role="dateArea">
              <span>✔ 選取日期</span>
              <div class="row">
                <div>
                  <div class="btn-group mt-1 mb-2" role="group" aria-label="date preset toggle buttons" data-role="datePresetGroup">
                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_all" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_date_preset_all">全選</label>

                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_last_15" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_date_preset_last_15">近15次</label>

                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_last_10" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_date_preset_last_10">近10次</label>

                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_last_5" autocomplete="off" checked>
                    <label class="btn btn-outline-secondary" for="lab_date_preset_last_5">近5次</label>

                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_none" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_date_preset_none">全不選</label>
                  </div>
                  <div class="btn-group mt-1 mb-2" role="group" aria-label="custom date preset buttons" data-role="datePresetGroupCustom">
                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_custom" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_date_preset_custom">自選</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 檢驗項目 presets -->
          <div class="row mt-2" data-role="presetsArea">
            <div class="col">
              <span>✔ 選取檢驗項目</span>
              <div class="row">
                <div>
                  <div class="btn-group mt-1 mb-2" role="group" aria-label="lab preset toggle buttons" data-role="labPresetGroup">
                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_all" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_all">全選</label>

                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_TPN_minor" autocomplete="off" checked>
                    <label class="btn btn-outline-secondary" for="lab_preset_TPN_minor">TPN小抽</label>

                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_TPN_major" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_TPN_major">TPN大抽</label>

                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_gas" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_gas">Gas</label>

                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_cv" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_cv">CV</label>

                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_gi" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_gi">GI</label>

                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_inf" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_inf">Inf</label>

                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_hema" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_hema">Hema</label>

                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_none" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_none">全不選</label>
                  </div>

                  <div class="btn-group mt-1 mb-2" role="group" aria-label="tpn fixed preset buttons" data-role="labPresetGroupFixed">
                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_tpn_fixed" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_tpn_fixed">TPN固定格式</label>
                  </div>

                  <div class="btn-group mt-1 mb-2" role="group" aria-label="custom preset buttons" data-role="labPresetGroupCustom">
                    <input type="radio" class="btn-check" name="lab_presets_selection" id="lab_preset_custom" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_preset_custom">自選</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lab item selection -->
          <div class="row" data-role="itemArea">
            <div class="col">
              <div class="lab-items-panel">
                <!-- ✅ Date group -->
                <div class="lab-cat-group is-date">
                  <div class="lab-cat-left">Date</div>
                  <div class="lab-cat-right">
                    <div class="lab-cat-items" data-role="dateSelection"><br></div>
                  </div>
                </div>

                <!-- ✅ Items group -->
                <div class="lab-items-panel__body" data-role="itemSelection"><br></div>
              </div>
            </div>
          </div>

          <!-- ✅ Order/Bar area (NEW) -->
          <div class="lab-order-panel mt-2" data-role="orderArea">
            <div class="lab-order-header">
              <div class="lab-order-title">Order</div>
              <div class="lab-order-actions">
                <button type="button" class="btn btn-outline-secondary btn-sm" data-role="addBarBtn">+ Bar</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-role="clearBarsBtn">- All Bar</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-role="resetOrderBtn">重置</button>
              </div>
            </div>
            <div class="lab-order-list" data-role="orderList"></div>
          </div>

          <!-- Outputs + buttons -->
          <div class="row mt-3 pt-2 border-top">
            <div class="col-10" data-role="outputsArea">
              <ul class="list-group mt-2 mb-2">
                <li class="list-group-item copy-item" data-role="outputs"><br></li>
              </ul>

              <!-- Trend chart -->
              <div class="mt-2">
                <canvas data-role="trendCanvas" height="160"></canvas>
              </div>
            </div>

            <div class="col-2" style="padding-left:0;">
              <div class="d-flex flex-column justify-content-center align-items-center h-100">
                <button class="btn btn-secondary w-75 mb-2" type="button" data-role="introBtn">教學</button>
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

  // ---- DOM refs
  const rawEl = box.querySelector('[data-role="rawText"]');
  const dateSelEl = box.querySelector('[data-role="dateSelection"]');
  const specimenSelEl = box.querySelector('[data-role="specimenSelection"]');
  const itemSelEl = box.querySelector('[data-role="itemSelection"]');
  const outEl = box.querySelector('[data-role="outputs"]');
  const resetBtn = box.querySelector('[data-role="reset"]');
  const introBtn = box.querySelector('[data-role="introBtn"]');

  // Order/Bar (NEW)
  const orderAreaEl = box.querySelector('[data-role="orderArea"]');
  const orderListEl = box.querySelector('[data-role="orderList"]');
  const addBarBtn = box.querySelector('[data-role="addBarBtn"]');
  const clearBarsBtn = box.querySelector('[data-role="clearBarsBtn"]');
  const resetOrderBtn = box.querySelector('[data-role="resetOrderBtn"]');

  // Trend chart
  const trendCanvas = box.querySelector('[data-role="trendCanvas"]');
  let trendChart = null;

  // ---- state (kept inside module instance)
  let abbrHeaders = null; // array for UI (idx0 [Lab], others MM/DD)
  let abbrRows = null; // array of arrays (idx0 lab, others values)
  let dateIsoKeys = null; // array same len as headers, idx0 null, others ISO "YYYY-MM-DDTHH:mm"
  let rowSpecimens = null; // array same len as rows, each specimen string
  let specimens = null; // unique specimen list (sorted)

  // keep user's manual item selection across specimen UI rebuilds (store ORIGINAL row indices)
  let selectedItemIdxSet = new Set();

  // Order tokens (NEW)
  // token: { t:'item', idx:number } or { t:'bar', id:string }
  let orderTokens = [];
  let barSeq = 0;

  // ---- constants (same as your original)
  const labHeaderAbbrDict = {
    "項目": "[Lab]",
    "Hemoglobin": "Hb",
    "Hematocrit": "Hct",
    "Platelets": "Plt",
    "Segment": "Seg",
    "Lymphocyte": "Lym",
    "Monocyte": "Mono",
    "Eosinophil": "Eos",
    "Basophil": "Baso",
    "Atypical-Lympho": "Atyp-Lym",
    "Meta-Myelocyte": "Meta-Mye",
    "Abs Neutro. #": "ANC",
    "Blast cell": "Blast",
    "Nucleated RBC": "nRBC",
    "Glucose(AC)": "Sugar",
    "Creatinine": "Cr",
    "AST/GOT": "AST",
    "ALT/GPT": "ALT",
    "Na(Sodium)": "Na",
    "K(Potassium)": "K",
    "Cl(Chloride)": "Cl",
    "Ca(Calcium)": "Ca",
    "Mg(Magnesium)": "Mg",
    "Inorganic P": "P",
    "Zn(Zinc)": "Zn",
    "Total Bilirubin": "TB",
    "D.Bilirubin": "DB",
    "Amylase(B)": "Amylase",
    "Albumin": "Alb",
    "Triglyceride": "TG",
    "T-Cholesterol": "Chol",
    "Total Protein": "TP",
    "ALK-P": "ALP",
    "γ-GT": "γGT",
    "Intact-PTH": "iPTH",
    "Procalcitonin": "Pct",
    "Free-T4": "fT4",
    "P.T": "PT",
    "APTT": "aPTT",
    "APTT data/mean": "aPTT/m",
    "PH": "pH",
    "PCO2": "pCO2",
    "PO2": "pO2",
    "cHCO3": "HCO3",
    "BEecf": "SBE",
    "pH(Vein)": "pH",
    "pCO2(Vein)": "pCO2",
    "pO2(Vein)": "pO2",
    "cHCO3(Vein)": "HCO3",
    "BEecf(Vein)": "SBE",
    "Uric Acid (B)": "Uric acid",
    "Lactate(B)": "Lactate",
  };

  const excludingRowKeywords = {
    "項目代號": [
      //刪除 NBS 1 & 2
      "72A285","72B285","72C285","72D285","72E285","72F285","72G285","72H285","72I285","72J285","72K285","72L285","72M285","72N285","72O285","72P285","72Q285","72R285","72S285","72T285","72U285","72V285","72W285","72X285","72Y285","72Z285",
      "72a285","72b285","72c285","72d285","72e285","72f285","72g285","72h285","72i285",
      //刪除 INR/aPTT的MNPT
      "72B037","72B038",
      //刪除 Dbil/Tbil ratio
      "72A513",
      //刪除 G6PD
      "72-065",
      //刪除 gas 多餘項目
      "72A530","72G530","72L530","72M530","72A530","72A530","72K530","72L530","72M530",
      //刪除 RBC, MCV, MCH, MCHC, RDW, PDW, MPV
      "72B001","72E001","72F001","72G001","72H001","72K001","72L001",
    ],
  };

  const presetSelectionsMap = {
    "lab_preset_TPN_minor": ["WBC","Hb","Hct","Plt","Na","K","Cl","Ca","Mg","P","BUN","Cr","AST","ALT","DB","TB","CRP","Pct"],
    "lab_preset_TPN_major": ["TG","Chol","TP","Alb","ALP","γGT","iPTH"],
    "lab_preset_gas": ["pH","pCO2","pO2","HCO3","SBE"],
    "lab_preset_cv": ["CK-MB","hs-Troponin I","Lactate","BNP","NT-ProBNP"],
    "lab_preset_gi": ["BUN","Cr","AST","ALT","DB","TB","ALP","γGT","Amylase","Lipase","Na","K","Cl","iCa","Ca","Mg","P"],
    "lab_preset_inf": ["WBC","Seg","Lym","ANC","CRP","Pct","Ferritin"],
    "lab_preset_hema": ["Hb","Hct","Plt","PT","INR","aPTT","aPTT/m","Fibrinogen","D-dimer","FDP"],
  };

  // 合併 minor + major，順序 = minor 在前、major 在後，並去重
  const uniq = (arr) => Array.from(new Set(arr));
  presetSelectionsMap["lab_preset_tpn_fixed"] = uniq([
    ...(presetSelectionsMap["lab_preset_TPN_minor"] || []),
    ...(presetSelectionsMap["lab_preset_TPN_major"] || []),
  ]);

  const labOrder = [
    "WBC","Hb","Hct","Plt","Seg","Band","Lym","Mono","Eos","Baso","Atyp-Lym","Meta-Mye","Myelocyte","Promyelocyte","Blast","Megakaryocyte","ANC","nRBC",
    "PT","INR","aPTT","aPTT/m",
    "Na","K","Cl","iCa","Ca","Mg","P","Zn",
    "BUN","Cr","AST","ALT","DB","TB",
    "CRP","Pct",
    "TG","Chol","TP","Alb","ALP","γGT","iPTH","fT4","TSH",
  ];

  // ---- helpers
  function getCheckedRadioId(name) {
    const el = box.querySelector(`input[name="${name}"]:checked`);
    return el ? el.id : null;
  }

  function clearToBr(el) {
    if (!el) return;
    el.replaceChildren(document.createElement("br"));
  }

  function isTrendEnabled() {
    const id = getCheckedRadioId("lab_trend_mode");
    return id === "lab_trend_on";
  }

  function syncSelectedItemsFromDOM() {
    const cbs = Array.from(box.querySelectorAll('[data-role="itemCb"]'));
    const next = new Set();
    for (const cb of cbs) {
      if (!cb.checked) continue;
      const idx = Number(cb.dataset.index);
      if (Number.isFinite(idx)) next.add(idx);
    }
    selectedItemIdxSet = next;
  }

  function applySavedItemSelectionToDOM() {
    const cbs = Array.from(box.querySelectorAll('[data-role="itemCb"]'));
    for (const cb of cbs) {
      const idx = Number(cb.dataset.index);
      cb.checked = Number.isFinite(idx) ? selectedItemIdxSet.has(idx) : false;
    }
  }

  function buildDateCheckboxes(headers) {
    if (!headers) {
      clearToBr(dateSelEl);
      return;
    }

    dateSelEl.replaceChildren();

    headers.forEach((h, idx) => {
      const hide = idx === 0;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "btn-check";
      input.dataset.role = "dateCb";
      input.dataset.index = String(idx);
      input.id = `lab_date_${idx}`;
      input.checked = false;

      if (hide) input.style.display = "none";

      const label = document.createElement("label");
      label.className = "btn btn-outline-secondary btn-check-label btn-sm";
      label.htmlFor = input.id;
      label.textContent = String(h);

      if (hide) label.style.display = "none";

      dateSelEl.appendChild(input);
      dateSelEl.appendChild(label);
    });

    if (!headers.length) clearToBr(dateSelEl);
  }

  function buildSpecimenCheckboxes(specList) {
    if (!specList || !specList.length) {
      clearToBr(specimenSelEl);
      return;
    }

    specimenSelEl.replaceChildren();

    // default: prefer B + BV (if exist). If neither exists, fallback to all checked.
    const preferred = new Set(["B", "BV"]);
    const hasPreferred = specList.some((sp) => preferred.has(String(sp ?? "").trim()));

    specList.forEach((sp, idx) => {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "btn-check";
      input.dataset.role = "specimenCb";
      input.dataset.value = sp;
      input.id = `lab_specimen_${idx}`;
      if (hasPreferred) {
        input.checked = preferred.has(String(sp ?? "").trim());
      } else {
        input.checked = true;
      }

      const label = document.createElement("label");
      label.className = "btn btn-outline-secondary btn-check-label mt-1 ml-1";
      label.htmlFor = input.id;
      label.textContent = sp;

      specimenSelEl.appendChild(input);
      specimenSelEl.appendChild(label);
    });

    if (!specList.length) clearToBr(specimenSelEl);
  }

  function getLabCategory(lab) {
    const CBC = new Set([
      "WBC","Hb","Hct","Plt","MCV",
      "Seg","Band","Lym","Mono","Eos","Baso",
      "Atyp-Lym","Meta-Mye","Myelocyte","Promyelocyte","Blast","Megakaryocyte",
      "ANC","nRBC"
    ]);

    const Coag = new Set(["PT","INR","aPTT","aPTT/m","Fibrinogen","D-dimer","FDP"]);

    const Chemistry = new Set([
      "Na","K","Cl","iCa","Ca","Mg","P","Zn",
      "BUN","Cr","AST","ALT","DB","TB","ALP","γGT",
      "CRP","Pct","Ferritin",
      "TG","Chol","TP","Alb",
      "iPTH","fT4","TSH",
      "Sugar"
    ]);

    const Gas = new Set(["pH","pCO2","pO2","HCO3","SBE"]);

    if (CBC.has(lab)) return "CBC";
    if (Coag.has(lab)) return "Coag";
    if (Chemistry.has(lab)) return "Chem";
    if (Gas.has(lab)) return "Gas";
    return "Other";
  }

  // NOTE: rows/specimensByRow can be filtered view; origIndices maps view-rowIdx -> original abbrRows index
  function buildItemCheckboxes(headers, rows, specimensByRow, origIndices = null) {
    if (!headers || !rows) {
      clearToBr(itemSelEl);
      return;
    }

    itemSelEl.replaceChildren();

    const groups = new Map(); // cat -> [rowIdx...]
    rows.forEach((row, idx) => {
      const lab = String(row[0] ?? "").trim();
      const cat = getLabCategory(lab);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(idx);
    });

    const catOrder = ["CBC", "Coag", "Chem", "Gas", "Other"];

    for (const cat of catOrder) {
      const idxs = groups.get(cat);
      if (!idxs || !idxs.length) continue;

      const groupRow = document.createElement("div");
      groupRow.className = "lab-cat-group";

      const left = document.createElement("div");
      left.className = "lab-cat-left";
      left.textContent = cat;

      const right = document.createElement("div");
      right.className = "lab-cat-right";

      const itemsWrap = document.createElement("div");
      itemsWrap.className = "lab-cat-items";

      idxs.forEach((rowIdx) => {
        const lab = String(rows[rowIdx]?.[0] ?? "").trim() || `Lab${rowIdx + 1}`;
        const sp = String(specimensByRow?.[rowIdx] ?? "").trim() || "(空)";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "btn-check";
        input.dataset.role = "itemCb";

        const originalIndex = origIndices ? origIndices[rowIdx] : rowIdx;
        input.dataset.index = String(originalIndex);
        input.dataset.lab = lab;
        input.dataset.specimen = sp;
        input.id = `lab_item_${originalIndex}`;

        const label = document.createElement("label");
        label.className = "btn btn-outline-secondary btn-check-label btn-sm";
        label.htmlFor = input.id;
        label.textContent = sp === "B" ? lab : `${lab} (${sp})`;

        itemsWrap.appendChild(input);
        itemsWrap.appendChild(label);
      });

      right.appendChild(itemsWrap);
      groupRow.appendChild(left);
      groupRow.appendChild(right);
      itemSelEl.appendChild(groupRow);
    }

    if (!rows.length) clearToBr(itemSelEl);
  }

  function getSelectedSpecimensSet() {
    const selected = Array.from(box.querySelectorAll('[data-role="specimenCb"]:checked'))
      .map((cb) => String(cb.dataset.value ?? "").trim())
      .filter(Boolean);
    return new Set(selected);
  }

  function getSelectedRowIndicesForCurrentFilters() {
    const selectedSpecimens = getSelectedSpecimensSet();
    const selectedRows = Array.from(box.querySelectorAll('[data-role="itemCb"]:checked'))
      .map((cb) => Number(cb.dataset.index))
      .filter(Number.isFinite)
      .filter((rowIdx) => {
        const sp = rowSpecimens?.[rowIdx] || "(空)";
        return selectedSpecimens.size ? selectedSpecimens.has(sp) : true;
      });
    return selectedRows;
  }

  function computeLastNDateColsWithAnyValue(n) {
    if (!abbrHeaders || !abbrRows || !dateIsoKeys) return [];

    const selectedRows = getSelectedRowIndicesForCurrentFilters();
    if (!selectedRows.length) return [];

    const candidates = [];
    for (let col = 1; col < abbrHeaders.length; col++) {
      let hasAny = false;
      for (const rIdx of selectedRows) {
        const v = String(abbrRows?.[rIdx]?.[col] ?? "").trim();
        if (v !== "") { hasAny = true; break; }
      }
      if (hasAny) candidates.push({ col, iso: dateIsoKeys[col] || "" });
    }

    candidates.sort((a, b) => String(a.iso).localeCompare(String(b.iso)));
    return candidates.slice(Math.max(0, candidates.length - n)).map((x) => x.col);
  }

  function setDatePresetRadio(id) {
    const el = box.querySelector(`#${id}`);
    if (el) el.checked = true;
  }

  function getCheckedDateColSet() {
    return new Set(
      Array.from(box.querySelectorAll('[data-role="dateCb"]:checked'))
        .map((cb) => Number(cb.dataset.index))
        .filter(Number.isFinite)
    );
  }

  function detectDatePresetFromCurrentSelection() {
    const selected = getCheckedDateColSet();
    if (!selected.has(0)) return "lab_date_preset_custom";

    const allCbs = Array.from(box.querySelectorAll('[data-role="dateCb"]'));
    const total = allCbs.length;

    if (selected.size === total && total > 0) return "lab_date_preset_all";
    if (selected.size === 1 && selected.has(0)) return "lab_date_preset_none";

    const isEqual = (a, b) => {
      if (a.size !== b.size) return false;
      for (const x of a) if (!b.has(x)) return false;
      return true;
    };

    const mkExpected = (n) => {
      const cols = computeLastNDateColsWithAnyValue(n);
      if (!cols.length) {
        const fallback = [];
        for (let i = Math.max(1, total - n); i < total; i++) fallback.push(i);
        cols.push(...fallback);
      }
      return new Set([0, ...cols]);
    };

    if (isEqual(selected, mkExpected(5))) return "lab_date_preset_last_5";
    if (isEqual(selected, mkExpected(10))) return "lab_date_preset_last_10";
    if (isEqual(selected, mkExpected(15))) return "lab_date_preset_last_15";

    return "lab_date_preset_custom";
  }

  function applyDatePreset() {
    const presetId = getCheckedRadioId("lab_date_presets_selection");
    const cbs = Array.from(box.querySelectorAll('[data-role="dateCb"]'));
    const len = cbs.length;

    const setChecked = (fn) => {
      cbs.forEach((cb, idx) => {
        if (idx === 0) cb.checked = true;
        else cb.checked = !!fn(idx, len);
      });
    };

    const applyLastNWithAnyValue = (n) => {
      const pickedCols = computeLastNDateColsWithAnyValue(n);
      if (!pickedCols.length) {
        setChecked((i, L) => i === 0 || i >= L - n);
        return;
      }
      const pickedSet = new Set(pickedCols);
      setChecked((i) => i === 0 || pickedSet.has(i));
    };

    if (presetId === "lab_date_preset_custom") return;

    switch (presetId) {
      case "lab_date_preset_all": setChecked(() => true); break;
      case "lab_date_preset_last_15": applyLastNWithAnyValue(15); break;
      case "lab_date_preset_last_10": applyLastNWithAnyValue(10); break;
      case "lab_date_preset_last_5": applyLastNWithAnyValue(5); break;
      case "lab_date_preset_none": setChecked(() => false); break;
      default: break;
    }
  }

  function setPresetRadio(id) {
    const el = box.querySelector(`#${id}`);
    if (el) el.checked = true;
  }

  function getSelectedLabsFromState() {
    const labs = [];
    for (const idx of selectedItemIdxSet) {
      const lab = String(abbrRows?.[idx]?.[0] ?? "").trim();
      if (lab) labs.push(lab);
    }
    return new Set(labs);
  }

  function detectPresetFromCurrentSelection() {
    const selected = getSelectedLabsFromState();
    const allCbs = Array.from(box.querySelectorAll('[data-role="itemCb"]'));
    const total = allCbs.length;
    const count = selected.size;

    if (count === 0) return "lab_preset_none";
    if (count === total && total > 0) return "lab_preset_all";

    const isEqualSet = (a, arr) => {
      const b = new Set(arr || []);
      if (a.size !== b.size) return false;
      for (const x of a) if (!b.has(x)) return false;
      return true;
    };

    const presetIds = [
      "lab_preset_TPN_minor",
      "lab_preset_TPN_major",
      "lab_preset_gas",
      "lab_preset_cv",
      "lab_preset_gi",
      "lab_preset_inf",
      "lab_preset_hema",
      "lab_preset_tpn_fixed",
    ];

    for (const pid of presetIds) {
      const allow = presetSelectionsMap[pid] || [];
      if (isEqualSet(selected, allow)) return pid;
    }

    return "lab_preset_custom";
  }

  function applyItemPreset() {
    const presetId = getCheckedRadioId("lab_presets_selection");
    const cbs = Array.from(box.querySelectorAll('[data-role="itemCb"]'));

    if (presetId === "lab_preset_custom") return;

    if (presetId === "lab_preset_none") {
      cbs.forEach((cb) => (cb.checked = false));
      return;
    }
    if (presetId === "lab_preset_all") {
      cbs.forEach((cb) => (cb.checked = true));
      return;
    }

    let allow = presetSelectionsMap[presetId] || [];
    if (presetId === "lab_preset_tpn_fixed") {
      allow = presetSelectionsMap["lab_preset_tpn_fixed"] || [];
    }

    cbs.forEach((cb) => {
      const lab = cb.dataset.lab || "";
      cb.checked = allow.includes(lab);
    });
  }

  function isAutoLastNPreset() {
    const id = getCheckedRadioId("lab_date_presets_selection");
    return id === "lab_date_preset_last_5" || id === "lab_date_preset_last_10" || id === "lab_date_preset_last_15";
  }

  function pickSingleSpecimenForTPNFixed() {
    const checked = Array.from(box.querySelectorAll('[data-role="specimenCb"]:checked'));
    if (checked.length) return String(checked[0].dataset.value ?? "").trim() || "(空)";
    if (specimens && specimens.length) return specimens[0];
    return "(空)";
  }

  // -----------------------------
  // Specimen label formatting
  // -----------------------------
  const DEFAULT_BLOOD_SPECIMENS = new Set(["B"]);
  const BLOOD_RELATED_SPECIMENS = new Set(["B", "BV"]);

  function normalizeSpecimenKey(sp) {
    const s = String(sp ?? "").trim();
    if (!s) return "";
    return s.toUpperCase();
  }

  function specimenMeta(sp) {
    const key = normalizeSpecimenKey(sp);
    const map = {
      "B":   { code: "B",  prefix: "",   legendKey: "b",  meaning: "blood (default)" },
      "BV":  { code: "BV", prefix: "v-", legendKey: "v",  meaning: "venous blood" },
      "U":   { code: "U",  prefix: "u-", legendKey: "u",  meaning: "urine" },
      "URINE": { code: "U", prefix: "u-", legendKey: "u", meaning: "urine" },

      "CSF": { code: "CSF", prefix: "c-", legendKey: "c", meaning: "CSF" },

      "S":     { code: "S", prefix: "s-", legendKey: "s", meaning: "stool" },
      "STOOL": { code: "S", prefix: "s-", legendKey: "s", meaning: "stool" },

      "PLEURAL": { code: "PL", prefix: "pl-", legendKey: "pl", meaning: "pleural" },
      "PL":      { code: "PL", prefix: "pl-", legendKey: "pl", meaning: "pleural" },

      "ASCITES": { code: "AS", prefix: "as-", legendKey: "as", meaning: "ascites" },
      "AS":      { code: "AS", prefix: "as-", legendKey: "as", meaning: "ascites" },
    };

    if (map[key]) return map[key];

    const short = key.slice(0, 2);
    const prefix = short ? `${short.toLowerCase()}-` : "";
    return {
      code: key || "(空)",
      prefix,
      legendKey: short.toLowerCase() || "?",
      meaning: String(sp ?? "").trim() || "(unknown)",
    };
  }

  function computeSpecimenContextForOutput() {
    const sel = Array.from(getSelectedSpecimensSet()).map(normalizeSpecimenKey).filter(Boolean);
    const nonBlood = sel.filter((k) => !BLOOD_RELATED_SPECIMENS.has(k));
    const singleNonBloodOnly = nonBlood.length === 1 && sel.length === 1;

    let headerLine = "";
    let headerLegend = null;
    if (singleNonBloodOnly) {
      const m = specimenMeta(nonBlood[0]);
      headerLine = `Specimen: ${m.code} (${m.meaning})`;
      headerLegend = m;
    }

    return {
      selectedKeys: new Set(sel),
      suppressRowPrefix: singleNonBloodOnly,
      headerLine,
      headerLegend,
    };
  }

  function formatLabLabel(labName, specimen, ctx, usedLegendSet) {
    const lab = String(labName ?? "").trim();
    const spKey = normalizeSpecimenKey(specimen);

    if (DEFAULT_BLOOD_SPECIMENS.has(spKey)) return lab;

    const m = specimenMeta(spKey);

    if (ctx?.suppressRowPrefix) {
      if (usedLegendSet) usedLegendSet.set(m.legendKey, m);
      return lab;
    }

    if (usedLegendSet) usedLegendSet.set(m.legendKey, m);
    return `${m.prefix}${lab}`;
  }

  function buildLegendLine(usedLegendSet, ctx) {
    const items = [];

    if (ctx?.headerLegend) {
      items.push(`${ctx.headerLegend.legendKey}=${ctx.headerLegend.code}(${ctx.headerLegend.meaning})`);
    }

    if (usedLegendSet && usedLegendSet.size) {
      for (const [k, m] of usedLegendSet.entries()) {
        if (ctx?.headerLegend && ctx.headerLegend.legendKey === k) continue;
        items.push(`${k}=${m.code}(${m.meaning})`);
      }
    }

    if (!items.length) return "";
    return `\nSpecimen legend: ${items.join(", ")}`;
  }

  // -----------------------------
  // Order/Bar logic (NEW)
  // -----------------------------
  function tokenId(tok) {
    return tok.t === "item" ? `i:${tok.idx}` : `b:${tok.id}`;
  }

  function isTPNFixed() {
    return getCheckedRadioId("lab_presets_selection") === "lab_preset_tpn_fixed";
  }

  function ensureOrderAreaVisibility() {
    if (!orderAreaEl) return;
    // Spec requirement: bars only affect horizontal output; but order area is still meaningful.
    // However, for TPN fixed format, we hide the order area to avoid confusion.
    orderAreaEl.style.display = isTPNFixed() ? "none" : "";
  }

  function getRowLabName(idx) {
    return String(abbrRows?.[idx]?.[0] ?? "").trim();
  }

  function getDefaultOrderedSelectedItemIndices() {
    const selected = Array.from(selectedItemIdxSet).filter(Number.isFinite);
    selected.sort((a, b) => {
      const la = getRowLabName(a);
      const lb = getRowLabName(b);
      const ia = labOrder.indexOf(la) === -1 ? Infinity : labOrder.indexOf(la);
      const ib = labOrder.indexOf(lb) === -1 ? Infinity : labOrder.indexOf(lb);
      if (ia !== ib) return ia - ib;
      return a - b;
    });
    return selected;
  }

  function buildDefaultTokensWithBars() {
    const items = getDefaultOrderedSelectedItemIndices().map((idx) => ({ t: "item", idx }));
    const out = [];
    const barAfterLabs = new Set(["Plt", "P", "TB"]);

    for (const tok of items) {
      out.push(tok);
      const lab = getRowLabName(tok.idx);
      if (barAfterLabs.has(lab)) {
        out.push({ t: "bar", id: `bar${++barSeq}` });
      }
    }
    return out;
  }

  function syncOrderTokensFromSelection({ reset = false } = {}) {
    // If no data yet
    if (!abbrRows) {
      orderTokens = [];
      rebuildOrderUI();
      return;
    }

    if (reset || !orderTokens.length) {
      orderTokens = buildDefaultTokensWithBars();
      rebuildOrderUI();
      return;
    }

    // Keep existing order + bars, remove unselected items, append new items by default order.
    const selectedSet = new Set(Array.from(selectedItemIdxSet).filter(Number.isFinite));

    const kept = [];
    const seenItems = new Set();

    for (const tok of orderTokens) {
      if (tok.t === "bar") {
        kept.push(tok);
        continue;
      }
      if (selectedSet.has(tok.idx)) {
        kept.push(tok);
        seenItems.add(tok.idx);
      }
    }

    const missing = getDefaultOrderedSelectedItemIndices().filter((idx) => !seenItems.has(idx));
    for (const idx of missing) kept.push({ t: "item", idx });

    // If all items removed (rare), drop leading/trailing bars:
    orderTokens = compactBars(kept);
    rebuildOrderUI();
  }

  function compactBars(tokens) {
    // remove duplicate bars, and remove bars at start/end, and bars adjacent
    const out = [];
    let prevWasBar = false;

    for (const tok of tokens) {
      if (tok.t === "bar") {
        if (out.length === 0) continue; // no leading bar
        if (prevWasBar) continue;       // no double bar
        out.push(tok);
        prevWasBar = true;
      } else {
        out.push(tok);
        prevWasBar = false;
      }
    }

    // remove trailing bar
    // while (out.length && out[out.length - 1].t === "bar") out.pop();
    return out;
  }

  function rebuildOrderUI() {
    if (!orderListEl) return;
    orderListEl.replaceChildren();

    ensureOrderAreaVisibility();
    if (isTPNFixed()) return;

    const selectedItems = Array.from(selectedItemIdxSet).filter(Number.isFinite);
    if (!selectedItems.length) {
      const msg = document.createElement("div");
      msg.className = "lab-order-empty";
      msg.textContent = "（尚未選取任何 Lab items）";
      orderListEl.appendChild(msg);
      return;
    }

    // Ensure tokens are synced before building UI
    if (!orderTokens.length) syncOrderTokensFromSelection({ reset: true });

    // Build chips
    for (const tok of orderTokens) {
      if (tok.t === "item") {
        // if item not selected, skip rendering (should not happen, but safe)
        if (!selectedItemIdxSet.has(tok.idx)) continue;

        const lab = getRowLabName(tok.idx) || `Lab${tok.idx + 1}`;
        const sp = String(rowSpecimens?.[tok.idx] ?? "").trim() || "(空)";
        const label = sp === "B" ? lab : `${lab} (${sp})`;

        const chip = document.createElement("div");
        chip.className = "lab-order-chip";
        chip.draggable = true;
        chip.dataset.role = "orderChip";
        chip.dataset.tok = tokenId(tok);
        chip.textContent = label;

        orderListEl.appendChild(chip);
      } else {
        const chip = document.createElement("div");
        chip.className = "lab-order-chip is-bar";
        chip.draggable = true;
        chip.dataset.role = "orderChip";
        chip.dataset.tok = tokenId(tok);
        chip.textContent = "|";
        orderListEl.appendChild(chip);
      }
    }

    // If everything got filtered out (shouldn't), show empty
    if (!orderListEl.children.length) {
      const msg = document.createElement("div");
      msg.className = "lab-order-empty";
      msg.textContent = "（無可排序項目）";
      orderListEl.appendChild(msg);
    }
  }

  function readTokensFromOrderDOM() {
    const els = Array.from(orderListEl?.querySelectorAll?.('[data-role="orderChip"]') || []);
    const next = [];
    for (const el of els) {
      const s = String(el.dataset.tok || "");
      if (s.startsWith("i:")) {
        const idx = Number(s.slice(2));
        if (Number.isFinite(idx)) next.push({ t: "item", idx });
      } else if (s.startsWith("b:")) {
        const id = s.slice(2);
        if (id) next.push({ t: "bar", id });
      }
    }
    orderTokens = compactBars(next);
  }

  function addBarTokenAtEnd() {
    if (isTPNFixed()) return;
    // Ensure current tokens reflect selection
    syncOrderTokensFromSelection({ reset: false });
    orderTokens.push({ t: "bar", id: `bar${++barSeq}` });
    orderTokens = compactBars(orderTokens);
    rebuildOrderUI();
  }

  function clearAllBars() {
    orderTokens = orderTokens.filter((t) => t.t !== "bar");
    rebuildOrderUI();
  }

  function resetOrderTokens() {
    orderTokens = buildDefaultTokensWithBars();
    rebuildOrderUI();
  }

  // drag & drop (NEW)
  let draggingEl = null;

  function getDragAfterElement(container, x) {
    const draggableEls = [...container.querySelectorAll('[data-role="orderChip"]:not(.dragging)')];
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

    for (const child of draggableEls) {
      const box = child.getBoundingClientRect();
      const offset = x - (box.left + box.width / 2);
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: child };
      }
    }
    return closest.element;
  }

  if (orderListEl) {
    orderListEl.addEventListener("dragstart", (e) => {
      const t = e.target;
      if (!t?.matches?.('[data-role="orderChip"]')) return;
      draggingEl = t;
      t.classList.add("dragging");
      e.dataTransfer?.setData?.("text/plain", t.dataset.tok || "");
      e.dataTransfer?.setDragImage?.(t, 10, 10);
    });

    orderListEl.addEventListener("dragend", (e) => {
      const t = e.target;
      if (!t?.matches?.('[data-role="orderChip"]')) return;
      t.classList.remove("dragging");
      draggingEl = null;

      // commit orderTokens
      readTokensFromOrderDOM();
      // output update
      scheduleOutput();
    });

    orderListEl.addEventListener("dragover", (e) => {
      if (!draggingEl) return;
      e.preventDefault();
      const afterEl = getDragAfterElement(orderListEl, e.clientX);
      if (afterEl == null) {
        orderListEl.appendChild(draggingEl);
      } else {
        orderListEl.insertBefore(draggingEl, afterEl);
      }
    });
  }

  // -----------------------------
  // Rebuild items for specimen changes (same as before)
  // -----------------------------
  function rebuildItemsForSpecimens() {
    if (!abbrHeaders || !abbrRows || !rowSpecimens) return;

    syncSelectedItemsFromDOM();

    const sel = getSelectedSpecimensSet();
    const filteredRows = [];
    const filteredRowSpecs = [];
    const origIndices = [];

    for (let i = 0; i < abbrRows.length; i++) {
      const sp = rowSpecimens[i] || "(空)";
      if (!sel.size || sel.has(sp)) {
        filteredRows.push(abbrRows[i]);
        filteredRowSpecs.push(sp);
        origIndices.push(i);
      }
    }

    buildItemCheckboxes(abbrHeaders, filteredRows, filteredRowSpecs, origIndices);
    applySavedItemSelectionToDOM();
  }

  // -----------------------------
  // Parser (unchanged)
  // -----------------------------
  function parseRawToTable(rawText) {
    const raw = String(rawText ?? "");
    if (!raw.trim()) {
      return { headers: null, rows: null, dateIsoKeys: null, rowSpecimens: null, specimens: null };
    }

    const lines = raw
      .split("\n")
      .map((l) => l.replace(/\r$/, ""))
      .filter((l) => l.trim() !== "");

    const isBool = (s) => /^(true|false)$/i.test(String(s ?? "").trim());
    const dataStartIdx = lines.findIndex((line) => {
      const cells = line.split("\t");
      return isBool(cells[0]) && cells.length >= 7;
    });
    if (dataStartIdx < 0) {
      return { headers: null, rows: null, dateIsoKeys: null, rowSpecimens: null, specimens: null };
    }

    const headerTokens = [];
    for (const line of lines.slice(0, dataStartIdx)) {
      const toks = line.split("\t").filter((t) => t !== "");
      headerTokens.push(...toks);
    }

    const refIdx = headerTokens.lastIndexOf("參考值");
    const unitIdx = headerTokens.lastIndexOf("單位");
    if (refIdx < 0 || unitIdx < 0 || unitIdx > refIdx) {
      return { headers: null, rows: null, dateIsoKeys: null, rowSpecimens: null, specimens: null };
    }

    const base = ["選取", "項目代號", "項目", "檢體別"];
    const baseIdx = base.map((k) => headerTokens.indexOf(k));
    if (baseIdx.some((i) => i < 0)) {
      return { headers: null, rows: null, dateIsoKeys: null, rowSpecimens: null, specimens: null };
    }

    const afterSpecimen = baseIdx[3] + 1;
    const dateTokens = headerTokens.slice(afterSpecimen, unitIdx);

    const isYYYYMMDD = (t) => /^\d{8}$/.test(String(t));
    const isHHmm = (t) => /^\d{4}$/.test(String(t));

    const dateMeta = [];
    for (let i = 0; i < dateTokens.length; i++) {
      const t = String(dateTokens[i]).trim();
      if (!isYYYYMMDD(t)) continue;

      const y = t.slice(0, 4);
      const m = t.slice(4, 6);
      const d = t.slice(6, 8);

      let hh = "00", mm = "00";
      const next = dateTokens[i + 1];
      if (isHHmm(next)) {
        hh = String(next).slice(0, 2);
        mm = String(next).slice(2, 4);
        i++;
      }

      const iso = `${y}-${m}-${d}T${hh}:${mm}`;
      const display = `${m}/${d}`;
      dateMeta.push({ iso, display, src: dateMeta.length });
    }

    if (!dateMeta.length) {
      return { headers: null, rows: null, dateIsoKeys: null, rowSpecimens: null, specimens: null };
    }

    dateMeta.sort((a, b) => a.iso.localeCompare(b.iso));

    const headers = ["[Lab]", ...dateMeta.map((x) => x.display)];
    const dateIsoKeysOut = [null, ...dateMeta.map((x) => x.iso)];
    const valueOrder = dateMeta.map((x) => x.src);

    const trimTrailingZeros = (s) => {
      const str = String(s ?? "");
      if (!/^-?\d+\.\d+$/.test(str)) return str;
      return str.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    };

    const rows = [];
    const rowSpecimensOut = [];
    const specimenSet = new Set();

    for (const line of lines.slice(dataStartIdx)) {
      const cells = line.split("\t");
      if (!isBool(cells[0])) continue;

      const itemCode = String(cells[1] ?? "").trim();
      const itemNameRaw = String(cells[2] ?? "").trim();
      const specimen = String(cells[3] ?? "").trim() || "(空)";

      specimenSet.add(specimen);

      if ((excludingRowKeywords["項目代號"] || []).includes(itemCode)) continue;

      const itemName = labHeaderAbbrDict[itemNameRaw] || itemNameRaw;
      if (!itemName) continue;

      const rawValues = cells.slice(4, 4 + dateMeta.length);

      const values = valueOrder.map((k) => {
        let s = String(rawValues[k] ?? "")
          .replace(/( [H,L])$/, "")
          .replace(/^< /, "<")
          .trim();
        s = trimTrailingZeros(s);
        return s;
      });

      rows.push([itemName, ...values]);
      rowSpecimensOut.push(specimen);
    }

    return {
      headers,
      rows,
      dateIsoKeys: dateIsoKeysOut,
      rowSpecimens: rowSpecimensOut,
      specimens: Array.from(specimenSet).sort(),
    };
  }

  // -----------------------------
  // Output building with Order/Bar (UPDATED)
  // -----------------------------
  function getOrderedSelectedRowIndicesForOutput() {
    const selectedSpecimens = getSelectedSpecimensSet();
    const selected = new Set(
      Array.from(box.querySelectorAll('[data-role="itemCb"]:checked'))
        .map((cb) => Number(cb.dataset.index))
        .filter(Number.isFinite)
        .filter((rowIdx) => {
          const sp = rowSpecimens?.[rowIdx] || "(空)";
          return selectedSpecimens.size ? selectedSpecimens.has(sp) : true;
        })
    );

    // Ensure orderTokens is synced (keeps bars)
    syncOrderTokensFromSelection({ reset: false });

    const ordered = [];
    const seen = new Set();

    for (const tok of orderTokens) {
      if (tok.t !== "item") continue;
      if (!selected.has(tok.idx)) continue;
      ordered.push(tok.idx);
      seen.add(tok.idx);
    }

    // Any selected but missing in tokens -> append by default order
    const rest = getDefaultOrderedSelectedItemIndices().filter((idx) => selected.has(idx) && !seen.has(idx));
    ordered.push(...rest);

    return ordered;
  }

  function buildFilteredArray(headers, rows, ctx, usedLegendSet) {
    if (!headers || !rows) return null;

    const selectedCols = Array.from(box.querySelectorAll('[data-role="dateCb"]:checked'))
      .map((cb) => Number(cb.dataset.index))
      .filter(Number.isFinite);

    const displayModeId = getCheckedRadioId("lab_display_mode");
    const isHorizontal = displayModeId === "lab_display_horizontal";

    // ordered rows (UPDATED)
    const selectedRowsOrdered = getOrderedSelectedRowIndicesForOutput();

    // vertical matrix first
    let arr = [
      headers.filter((_, i) => selectedCols.includes(i)),
      ...selectedRowsOrdered.map((i) => {
        const sp = rowSpecimens?.[i] || "(空)";
        return selectedCols.map((j, k) => {
          if (k === 0) return formatLabLabel(rows[i]?.[0] ?? "", sp, ctx, usedLegendSet);
          return rows[i]?.[j] ?? "";
        });
      }),
    ];

    let [h, ...r] = arr;

    // limit label length <= 12
    r = r.map((row) =>
      row.map((cell) => {
        const s = String(cell ?? "");
        return s.length > 12 ? s.slice(0, 12) : s;
      })
    );

    // remove empty columns (except header col)
    const emptyCols = h.map((_, i) => r.every((row) => (row[i] ?? "") === ""));
    h = h.filter((_, i) => !emptyCols[i]);
    r = r.map((row) => row.filter((_, i) => !emptyCols[i]));
    arr = [h, ...r];

    // horizontal display (transpose)
    if (isHorizontal) {
      arr = arr[0].map((_, i) => arr.map((row) => row[i] ?? ""));

      // ✅ bars based on orderTokens (only horizontal; vertical ignores)
      // Insert bar columns where bar tokens exist between item tokens.
      // arr currently has:
      //  - row0: [Lab] + lab labels...
      //  - row1..: dates + values...
      // We will build a new matrix by walking orderTokens and mapping to columns.
      const headerRow = arr[0] || [];
      const colCount = headerRow.length;

      // Map lab label -> column index in current horizontal matrix.
      // Because labels may include prefixes (u-/v-) depending on ctx, we use the ACTUAL text in headerRow.
      const labelToCol = new Map();
      for (let c = 1; c < colCount; c++) {
        const labLabel = String(headerRow[c] ?? "");
        if (!labelToCol.has(labLabel)) labelToCol.set(labLabel, c);
      }

      // Build the desired lab-label list in current ctx:
      // For each token item idx, compute the formatted label (must match headerRow label)
      const desired = [];
      const tokensForBars = [];

      for (const tok of orderTokens) {
        if (tok.t === "bar") {
          tokensForBars.push({ t: "bar", id: tok.id });
          continue;
        }
        if (!selectedItemIdxSet.has(tok.idx)) continue;

        const sp = rowSpecimens?.[tok.idx] || "(空)";
        const lbl = formatLabLabel(rows[tok.idx]?.[0] ?? "", sp, ctx, null);
        tokensForBars.push({ t: "item", label: lbl });
      }

      // Build new columns: col0 always kept; then follow tokensForBars, inserting bar columns
      const newArr = arr.map((row) => [row[0]]);

      for (const tok of tokensForBars) {
        if (tok.t === "bar") {
          for (let rIdx = 0; rIdx < arr.length; rIdx++) {
            newArr[rIdx].push(rIdx === 0 ? "|" : "");
          }
          continue;
        }

        const col = labelToCol.get(tok.label);
        if (Number.isFinite(col)) {
          for (let rIdx = 0; rIdx < arr.length; rIdx++) {
            newArr[rIdx].push(arr[rIdx][col] ?? "");
          }
        }
      }

      // Replace
      arr = newArr;
    }

    return arr;
  }

  function toAlignedText(matrix) {
    if (!matrix || !matrix[0]) return "";

    const MIN_VALUE_COL_WIDTH = 3;

    // ✅ 以「header row 是否為 |」判斷 bar 欄
    const isBarCol = (i) => String(matrix[0][i] ?? "") === "|";

    const widths = matrix[0].map((_, i) => {
      if (isBarCol(i)) return 1; // ✅ bar 欄固定寬度 1

      const maxLen = Math.max(...matrix.map((row) => String(row[i] ?? "").length));
      return i === 0 ? maxLen : Math.max(maxLen, MIN_VALUE_COL_WIDTH);
    });

    return matrix
      .map((row) =>
        row
          .map((cell, i) => {
            const s = String(cell ?? "");

            // ✅ bar 欄整欄都只 pad 1 格（包含空字串）
            if (isBarCol(i)) return s.padEnd(1);

            return s.padEnd(widths[i]);
          })
          .join(" ")
      )
      .join("\n");
  }

  function setOutputText(txt) {
    if (!outEl) return;
    outEl.replaceChildren();

    if (!txt) {
      outEl.appendChild(document.createTextNode("No data selected"));
      return;
    }

    const pre = document.createElement("pre");
    pre.textContent = txt;
    outEl.appendChild(pre);
  }

  function buildTPNFixedText(headers, rows, ctx, usedLegendSet) {
    if (!headers || !rows) return "";

    const selectedColsAll = Array.from(box.querySelectorAll('[data-role="dateCb"]:checked'))
      .map((cb) => Number(cb.dataset.index))
      .filter(Number.isFinite);

    if (!selectedColsAll.length) return "";

    const pickedSpecimen = pickSingleSpecimenForTPNFixed();

    const rowByLab = new Map();
    for (let idx = 0; idx < rows.length; idx++) {
      const sp = rowSpecimens?.[idx] || "(空)";
      if (sp !== pickedSpecimen) continue;

      const labName = String(rows[idx]?.[0] ?? "").trim();
      if (labName && !rowByLab.has(labName)) rowByLab.set(labName, rows[idx]);
    }

    const transpose = (m) => m[0].map((_, i) => m.map((row) => row[i] ?? ""));
    const classificationEndTexts = ["Plt", "P", "TB"];
    const markBars = (m) =>
      m.map((row) => row.map((cell) => (classificationEndTexts.includes(cell) ? cell + " |" : cell)));

    function makeHasAnyValueInCol(labs) {
      return (colIndex) => {
        for (const labName of labs) {
          const r = rowByLab.get(labName);
          const v = String(r?.[colIndex] ?? "").trim();
          if (v !== "") return true;
        }
        return false;
      };
    }

    function buildForcedVerticalBlock(items) {
      const labs = (items || []).filter(Boolean);
      const hasAny = makeHasAnyValueInCol(labs);

      const selectedCols = selectedColsAll.filter((colIdx) => colIdx === 0 || hasAny(colIdx));
      const hasAnyDateCol = selectedCols.some((c) => c !== 0);
      if (!hasAnyDateCol) return null;

      const headerFiltered = headers.filter((_, i) => selectedCols.includes(i));

      const body = labs.map((labName) => {
        const found = rowByLab.get(labName);
        return selectedCols.map((colIndex, idxInSelected) => {
          if (idxInSelected === 0) return formatLabLabel(labName, pickedSpecimen, ctx, usedLegendSet);
          return found?.[colIndex] ?? "";
        });
      });

      body.sort((a, b) => {
        const la = String(a[0] ?? "").split("(")[0];
        const lb = String(b[0] ?? "").split("(")[0];
        const ia = labOrder.indexOf(la) === -1 ? Infinity : labOrder.indexOf(la);
        const ib = labOrder.indexOf(lb) === -1 ? Infinity : labOrder.indexOf(lb);
        return ia - ib;
      });

      return [headerFiltered, ...body];
    }

    const minorItems = presetSelectionsMap["lab_preset_TPN_minor"] || [];
    const majorItems = presetSelectionsMap["lab_preset_TPN_major"] || [];

    const minorV = buildForcedVerticalBlock(minorItems);
    const majorV = buildForcedVerticalBlock(majorItems);

    if (!minorV && !majorV) return "";

    let t1 = "";
    if (minorV) {
      let minorH = transpose(minorV);
      minorH = markBars(minorH);
      t1 = toAlignedText(minorH).trimEnd();
    }

    let t2 = "";
    if (majorV) {
      let majorH = transpose(majorV);
      majorH = markBars(majorH);
      t2 = toAlignedText(majorH).trimEnd();
    }

    if (t1 && t2) return [t1, "", "", t2].join("\n");
    return (t1 || t2 || "").trimEnd();
  }

  // -----------------------------
  // Trend chart (order respected by selection orderTokens for dataset ordering)
  // -----------------------------
  function cleanNumeric(cell) {
    let s = String(cell ?? "").trim();
    if (!s) return null;
    s = s.replace(/^<\s*/, "").replace(/^>\s*/, "");
    const v = Number(s);
    return Number.isFinite(v) ? v : null;
  }

  function buildSelectedSeries(headers, rows) {
    if (!headers || !rows) return { datasets: [] };

    const selectedCols = Array.from(box.querySelectorAll('[data-role="dateCb"]:checked'))
      .map((cb) => Number(cb.dataset.index))
      .filter(Number.isFinite)
      .filter((i) => i !== 0);

    const selectedSpecimens = getSelectedSpecimensSet();

    const selectedRowSet = new Set(
      Array.from(box.querySelectorAll('[data-role="itemCb"]:checked'))
        .map((cb) => Number(cb.dataset.index))
        .filter(Number.isFinite)
        .filter((rowIdx) => {
          const sp = rowSpecimens?.[rowIdx] || "(空)";
          return selectedSpecimens.size ? selectedSpecimens.has(sp) : true;
        })
    );

    if (!selectedCols.length || !selectedRowSet.size) return { datasets: [] };

    const colMeta = selectedCols
      .map((i) => ({ i, iso: dateIsoKeys?.[i] || null }))
      .filter((c) => !!c.iso);

    colMeta.sort((a, b) => a.iso.localeCompare(b.iso));

    // keep dataset order aligned with orderTokens (bars ignored)
    syncOrderTokensFromSelection({ reset: false });
    const rowOrder = [];
    const seen = new Set();
    for (const tok of orderTokens) {
      if (tok.t !== "item") continue;
      if (!selectedRowSet.has(tok.idx)) continue;
      rowOrder.push(tok.idx);
      seen.add(tok.idx);
    }
    for (const idx of getDefaultOrderedSelectedItemIndices()) {
      if (selectedRowSet.has(idx) && !seen.has(idx)) rowOrder.push(idx);
    }

    const datasets = rowOrder.map((rIdx) => {
      const lab = String(rows[rIdx]?.[0] ?? "").trim() || `Lab${rIdx + 1}`;
      const sp = rowSpecimens?.[rIdx] || "(空)";

      const data = colMeta
        .map((c) => ({ x: Date.parse(c.iso), y: cleanNumeric(rows[rIdx]?.[c.i]) }))
        .filter((p) => Number.isFinite(p.x));

      return { label: `${lab}(${sp})`, data };
    });

    return { datasets };
  }

  function renderTrendChart() {
    if (!trendCanvas) return;

    if (typeof Chart === "undefined") {
      if (DEBUG) console.warn("[lab] Chart.js not found. Skip trend chart rendering.");
      return;
    }

    const { datasets } = buildSelectedSeries(abbrHeaders, abbrRows);

    if (!datasets.length || datasets.every((d) => !d.data || !d.data.length)) {
      if (trendChart) {
        trendChart.destroy();
        trendChart = null;
      }
      return;
    }

    const ds = datasets.map((d) => ({
      label: d.label,
      data: d.data,
      spanGaps: true,
      tension: 0.25,
    }));

    const fmtMMDD = (ts) => {
      const d = new Date(Number(ts));
      if (!Number.isFinite(d.getTime())) return "";
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${mm}/${dd}`;
    };

    const cfg = {
      type: "line",
      data: { datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          legend: { display: true },
          tooltip: {
            enabled: true,
            callbacks: {
              title: (items) => {
                const x = items?.[0]?.parsed?.x;
                return fmtMMDD(x);
              },
            },
          },
        },
        scales: {
          x: { type: "linear", ticks: { callback: (v) => fmtMMDD(v) } },
          y: { beginAtZero: false },
        },
      },
    };

    if (trendChart) {
      trendChart.data = cfg.data;
      trendChart.options = cfg.options;
      trendChart.update();
    } else {
      trendChart = new Chart(trendCanvas.getContext("2d"), cfg);
    }
  }

  // -----------------------------
  // Output renderer
  // -----------------------------
  function renderOutput() {
    ensureOrderAreaVisibility();

    const presetId = getCheckedRadioId("lab_presets_selection");
    const ctx = computeSpecimenContextForOutput();
    const usedLegendSet = new Map();

    let mainText = "";

    if (presetId === "lab_preset_tpn_fixed") {
      mainText = buildTPNFixedText(abbrHeaders, abbrRows, ctx, usedLegendSet);
    } else {
      const m = buildFilteredArray(abbrHeaders, abbrRows, ctx, usedLegendSet);
      mainText = m ? toAlignedText(m) : "";
    }

    const lines = [];
    if (ctx.headerLine) lines.push(ctx.headerLine);
    if (mainText) lines.push(mainText);

    const legendLine = buildLegendLine(usedLegendSet, ctx);
    if (legendLine) lines.push(legendLine);

    setOutputText(lines.join("\n"));
    if (isTrendEnabled()) {
      renderTrendChart();
    } else {
      if (trendChart) {
        trendChart.destroy();
        trendChart = null;
      }
    }
  }

  // -----------------------------
  // Main processor
  // -----------------------------
  const process = () => {
    const rawText = String(rawEl?.value ?? "").trim();
    const parsed = parseRawToTable(rawText);

    abbrHeaders = parsed.headers;
    abbrRows = parsed.rows;
    dateIsoKeys = parsed.dateIsoKeys;
    rowSpecimens = parsed.rowSpecimens;
    specimens = parsed.specimens;

    // reset manual selection on new raw input
    selectedItemIdxSet = new Set();

    // reset order state on new raw input
    orderTokens = [];
    barSeq = 0;

    if (DEBUG) {
      console.groupCollapsed("[lab] process");
      console.log({ headers: abbrHeaders, rows: abbrRows?.length, specimens });
      console.groupEnd();
    }

    buildDateCheckboxes(abbrHeaders);
    buildSpecimenCheckboxes(specimens);

    rebuildItemsForSpecimens();

    applyItemPreset();
    syncSelectedItemsFromDOM();

    // initialize orderTokens with default bars after Plt/P/TB
    syncOrderTokensFromSelection({ reset: true });

    applyDatePreset(); // default: 近5次

    rebuildOrderUI();
    renderOutput();
  };

  const scheduleProcess = createScheduler(process);
  const scheduleOutput = createScheduler(renderOutput);

  // ---- delegated events
  box.addEventListener("input", (e) => {
    const t = e.target;
    if (t?.matches?.('[data-role="rawText"]')) {
      scheduleProcess();
      return;
    }
    scheduleOutput();
  });

  box.addEventListener("change", (e) => {
    const t = e.target;

    if (t?.name === "lab_date_presets_selection") {
      applyDatePreset();
      scheduleOutput();
      return;
    }

    if (t?.name === "lab_presets_selection") {
      applyItemPreset();
      syncSelectedItemsFromDOM();

      // preset change may change selected items -> resync order tokens (keep bars)
      syncOrderTokensFromSelection({ reset: false });
      rebuildOrderUI();

      if (isAutoLastNPreset()) applyDatePreset();
      scheduleOutput();
      return;
    }

    if (t?.name === "lab_display_mode") {
      scheduleOutput();
      return;
    }

    if (t?.matches?.('[data-role="itemCb"]')) {
      syncSelectedItemsFromDOM();

      // update preset UI
      const detected = detectPresetFromCurrentSelection();
      setPresetRadio(detected);

      // selection changed -> resync order tokens (keep bars)
      syncOrderTokensFromSelection({ reset: false });
      rebuildOrderUI();

      if (isAutoLastNPreset()) applyDatePreset();
      scheduleOutput();
      return;
    }

    if (t?.matches?.('[data-role="specimenCb"]')) {
      rebuildItemsForSpecimens();

      // specimen change -> selection might effectively reduce available items
      syncSelectedItemsFromDOM();
      setPresetRadio(detectPresetFromCurrentSelection());

      syncOrderTokensFromSelection({ reset: false });
      rebuildOrderUI();

      if (isAutoLastNPreset()) applyDatePreset();
      scheduleOutput();
      return;
    }

    if (t?.matches?.('[data-role="dateCb"]')) {
      const detected = detectDatePresetFromCurrentSelection();
      setDatePresetRadio(detected);
      scheduleOutput();
      return;
    }

    if (t?.name === "lab_trend_mode") {
      scheduleOutput();
      return;
    }
  });

  // Order/Bar buttons (NEW)
  addBarBtn?.addEventListener("click", () => {
    addBarTokenAtEnd();
    scheduleOutput();
  });

  clearBarsBtn?.addEventListener("click", () => {
    clearAllBars();
    scheduleOutput();
  });

  resetOrderBtn?.addEventListener("click", () => {
    resetOrderTokens();
    scheduleOutput();
  });

  // ---- reset
  resetBtn?.addEventListener("click", () => {
    if (rawEl) rawEl.value = "";
    abbrHeaders = null;
    abbrRows = null;
    dateIsoKeys = null;
    rowSpecimens = null;
    specimens = null;

    selectedItemIdxSet = new Set();
    orderTokens = [];
    barSeq = 0;

    clearToBr(dateSelEl);
    clearToBr(specimenSelEl);
    clearToBr(itemSelEl);
    clearToBr(outEl);

    if (orderListEl) orderListEl.replaceChildren();

    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }

    const datePresetLast5 = box.querySelector("#lab_date_preset_last_5");
    const presetTPNMinor = box.querySelector("#lab_preset_TPN_minor");
    const displayHorizontal = box.querySelector("#lab_display_horizontal");
    const trendOff = box.querySelector("#lab_trend_off");
    if (datePresetLast5) datePresetLast5.checked = true;
    if (presetTPNMinor) presetTPNMinor.checked = true;
    if (displayHorizontal) displayHorizontal.checked = true;
    if (trendOff) trendOff.checked = true;

    ensureOrderAreaVisibility();
  });

  // ---- intro (same as your current)
  introBtn?.addEventListener("click", () => {
    if (typeof introJs === "undefined") return;

    const example = `
選取\t項目代號\t項目\t檢體別\t20250129\t0125\t20250126\t0025\t20250125\t2328\t單位\t參考值
True\t72A001\tWBC\tB\t3.5\t4.4\t9.3\t\t\t1000/uL\t5.2~13.4(>1d-8d)
True\t72B001\tHb\tB\t\t10.2\t10.3\t\t\t\tg/dL\t12.2~16.6(>1d-8d)
True\t72C001\tPlatelets\tB\t\t325\t80\t\t\t\t1000/uL\t150~450
True\t72A200\tCreatinine\tB\t\t0.62\t0.58\t\t\t\tmg/dL\t0.2~0.8
True\t72A201\tNa(Sodium)\tB\t136\t135\t134\t\t\t\tmmol/L\t135~145
True\t72A202\tK(Potassium)\tB\t4.1\t4.5\t4.0\t\t\t\tmmol/L\t3.5~5.5
True\t72A203\tCl(Chloride)\tB\t104\t103\t102\t\t\t\tmmol/L\t98~107
True\t72A210\tGlucose(AC)\tU\t\t\t\t92\t88\t\tmg/dL\t-
True\t72A300\tTotal Bilirubin\tB\t7.2\t8.1\t9.5\t\t\t\tmg/dL\t-
True\t72A301\tD.Bilirubin\tB\t0.3\t0.4\t0.5\t\t\t\tmg/dL\t-
True\t72A530\tPH\tCSF\t\t\t\t7.30\t7.28\t\t\t\t-
True\t72B530\tPCO2\tCSF\t\t\t\t45\t48\t\tmmHg\t-
  `.trim();

    if (rawEl) rawEl.value = example;
    
    const trendOn = box.querySelector("#lab_trend_on");
    if (trendOn) trendOn.checked = true;

    process();

    const steps = [
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`,
        intro: `<p><b>(1) HIS 4.0 檢驗頁面</b></p><p>建議用「全部彙總」後再複製貼上。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`,
        intro: `<p><b>(2) 複製資料</b></p><p>Ctrl + A 全選 → Ctrl + C 複製</p>
               <img src="./img/intro_lab_step_0_全部彙總.png" style="width:100%;height:auto;">`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`,
        intro: `<p><b>(3) 貼上 Raw Lab</b></p><p>Ctrl + V 貼到 Raw Lab，系統會即時解析。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="presetArea"]`,
        intro: `<p><b>(4) 選擇顯示方式</b></p><p>橫式/直式切換。</p><p>顯示/不顯示圖表</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="specimenArea"]`,
        intro: `<p><b>(5) 選擇檢體別</b></p><p>預設偏好 B / BV（若存在）。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="dateArea"]`,
        intro: `<p><b>(6) 選擇日期（預設：近5次）</b></p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="presetsArea"]`,
        intro: `<p><b>(7) 選擇套組</b></p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="itemArea"]`,
        intro: `<p><b>(8) 自訂項目</b></p><p>可手動勾選/取消。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="orderArea"]`,
        intro: `<p><b>(9) Order (NEW) </b></p>
                <p>拖曳可改輸出順序。</p>
                <p>+Bar：在最後新增「|」。</p>
                <p>- All Bar：移除所有「|」</p>
                <p>重置：回到預設順序</p>
                <p>把「|」移到最左邊時會自動刪除</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="outputs"]`,
        intro: `<p><b>(10) 輸出與複製</b></p><p>點選輸出即可複製。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="trendCanvas"]`,
        intro: `<p><b>(11) Trend 圖</b></p><p>依勾選日期+項目繪圖（需 Chart.js）。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="reset"]`,
        intro: `<p><b>(12) Reset</b></p><p>清空資料與狀態。</p>`,
      },
    ];

    const intro = introJs();
    intro.setOptions({
      steps,
      showProgress: true,
      showBullets: false,
      disableInteraction: false,
      exitOnOverlayClick: false,
      scrollToElement: true,
    });

    // intro.oncomplete(() => resetBtn?.click());
    // intro.onexit(() => resetBtn?.click());
    intro.start();
  });

  // ---- initial
  clearToBr(outEl);
  ensureOrderAreaVisibility();
}
