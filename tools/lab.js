// tools/lab.js
// updated: 2026-03-03
// note: major revise, bug fixes, and new features added. 

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
        grid-template-columns:110px 1fr;
        gap:10px;
        align-items:center;
        padding:10px 0;              /* ✅ 關鍵：讓內容離分隔線有距離 */
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
      
      /* 讓 Date 看起來跟其他分類有分隔線 */
      [data-tool="lab"] .lab-cat-group.is-date{
        border-bottom:1px solid #6c757d2e;
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
              <div class="mt-1 d-flex gap-1">
                <div class="btn-group mb-2" role="group" aria-label="display mode toggle buttons" data-role="displayModeGroup">
                  <input type="radio" class="btn-check" name="lab_display_mode" id="lab_display_horizontal" autocomplete="off" checked>
                  <label class="btn btn-outline-secondary" for="lab_display_horizontal">橫式</label>

                  <input type="radio" class="btn-check" name="lab_display_mode" id="lab_display_vertical" autocomplete="off">
                  <label class="btn btn-outline-secondary" for="lab_display_vertical">直式</label>
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
                    <label class="btn btn-outline-secondary" for="lab_preset_tpn_fixed">
                      TPN固定格式
                    </label>
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

                <!-- ✅ Items group (existing) -->
                <div class="lab-items-panel__body" data-role="itemSelection"><br></div>
              </div>
            </div>
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
      "72A285", "72B285", "72C285", "72D285", "72E285", "72F285", "72G285", "72H285", "72I285", "72J285", "72K285", "72L285", "72M285", "72N285", "72O285", "72P285", "72Q285", "72R285", "72S285", "72T285", "72U285", "72V285", "72W285", "72X285", "72Y285", "72Z285",
      "72a285", "72b285", "72c285", "72d285", "72e285", "72f285", "72g285", "72h285", "72i285",
      //刪除 INR/aPTT的MNPT
      "72B037", "72B038",
      //刪除 Dbil/Tbil ratio
      "72A513",
      //刪除 G6PD
      "72-065",
      //刪除 gas 多餘項目 72A530(Temperature) 72G530(ctCO2) 72L530(72L530) 72M530(AaDO2) 72A530(TEMP) 72K530(SAT) 72L530(Po2(A-a)) 72M530(FIO2)
      "72A530", "72G530", "72L530", "72M530", "72A530", "72A530", "72K530", "72L530", "72M530",
      //刪除 RBC, MCV, MCH, MCHC, RDW, PDW, MPV
      "72B001", "72E001", "72F001", "72G001", "72H001", "72K001", "72L001",
    ],
  };

  const presetSelectionsMap = {
    "lab_preset_TPN_minor": ["WBC", "Hb", "Hct", "Plt", "Na", "K", "Cl", "Ca", "Mg", "P", "BUN", "Cr", "AST", "ALT", "DB", "TB", "CRP", "Pct"],
    "lab_preset_TPN_major": ["TG", "Chol", "TP", "Alb", "ALP", "γGT", "iPTH"],
    "lab_preset_gas": ["pH", "pCO2", "pO2", "HCO3", "SBE"],
    "lab_preset_cv": ["CK-MB", "hs-Troponin I", "Lactate", "BNP", "NT-ProBNP"],
    "lab_preset_gi": ["BUN", "Cr", "AST", "ALT", "DB", "TB", "ALP", "γGT", "Amylase", "Lipase", "Na", "K", "Cl", "iCa", "Ca", "Mg", "P"],
    "lab_preset_inf": ["WBC", "Seg", "Lym", "ANC", "CRP", "Pct", "Ferritin"],
    "lab_preset_hema": ["Hb", "Hct", "Plt", "PT", "INR", "aPTT", "aPTT/m", "Fibrinogen", "D-dimer", "FDP"],
  };

  // 合併 minor + major，順序 = minor 在前、major 在後，並去重
  const uniq = (arr) => Array.from(new Set(arr));
  presetSelectionsMap["lab_preset_tpn_fixed"] = uniq([
    ...(presetSelectionsMap["lab_preset_TPN_minor"] || []),
    ...(presetSelectionsMap["lab_preset_TPN_major"] || []),
  ]);

  const labOrder = [
    "WBC", "Hb", "Hct", "Plt", "Seg", "Band", "Lym", "Mono", "Eos", "Baso", "Atyp-Lym", "Meta-Mye", "Myelocyte", "Promyelocyte", "Blast", "Megakaryocyte", "ANC", "nRBC",
    "PT", "INR", "aPTT", "aPTT/m",
    "Na", "K", "Cl", "iCa", "Ca", "Mg", "P", "Zn",
    "BUN", "Cr", "AST", "ALT", "DB", "TB",
    "CRP", "Pct",
    "TG", "Chol", "TP", "Alb", "ALP", "γGT", "iPTH", "fT4", "TSH",
  ];

  // ---- helpers
  function getCheckedRadioId(name) {
    const el = box.querySelector(`input[name="${name}"]:checked`);
    return el ? el.id : null;
  }

  // ----- DOM-safe builders (avoid innerHTML / XSS)
  function clearToBr(el) {
    if (!el) return;
    el.replaceChildren(document.createElement("br"));
  }

  // Keep user's manual item selections in sync with DOM.
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

    dateSelEl.replaceChildren(); // clear

    headers.forEach((h, idx) => {
      const hide = idx === 0;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "btn-check";
      input.dataset.role = "dateCb";
      input.dataset.index = String(idx);
      input.id = `lab_date_${idx}`;

      // default selection handled by applyDatePreset()
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

    if (!headers.length) {
      clearToBr(dateSelEl);
    }
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

    if (!specList.length) {
      clearToBr(specimenSelEl);
    }
  }

  function getLabCategory(lab) {
    const CBC = new Set([
      "WBC","Hb","Hct","Plt", "MCV", 
      "Seg","Band","Lym","Mono","Eos","Baso",
      "Atyp-Lym","Meta-Mye","Myelocyte","Promyelocyte","Blast","Megakaryocyte",
      "ANC","nRBC"
    ]);

    const Coag = new Set([
      "PT","INR","aPTT","aPTT/m",
      "Fibrinogen","D-dimer","FDP"
    ]);

    const Chemistry = new Set([
      // Electrolytes
      "Na","K","Cl","iCa","Ca","Mg","P","Zn",

      // Renal/Liver
      "BUN","Cr","AST","ALT","DB","TB","ALP","γGT",

      // Inflammation
      "CRP","Pct","Ferritin",

      // Nutrition/Lipid
      "TG","Chol","TP","Alb",

      // Endocrine
      "iPTH","fT4","TSH",

      // Sugar
      "Sugar"
    ]);

    const Gas = new Set([
      "pH","pCO2","pO2","HCO3","SBE"
    ]);

    if (CBC.has(lab)) return "CBC";
    if (Coag.has(lab)) return "Coag";
    if (Chemistry.has(lab)) return "Chemistry";
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

    const catOrder = ["CBC", "Coag", "Chemistry", "Gas", "Other"];

    for (const cat of catOrder) {
      const idxs = groups.get(cat);
      if (!idxs || !idxs.length) continue;

      // group row
      const groupRow = document.createElement("div");
      groupRow.className = "lab-cat-group";

      // left title
      const left = document.createElement("div");
      left.className = "lab-cat-left";
      left.textContent = cat;

      // right box
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
        label.textContent = sp === "B"? lab : `${lab} (${sp})`;

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

  function getSelectedRowIndicesForCurrentFilters() {
    const selectedSpecimens = getSelectedSpecimensSet();

    // 目前勾選的檢驗項目（itemCb 的 dataset.index 是 original row index）
    const selectedRows = Array.from(box.querySelectorAll('[data-role="itemCb"]:checked'))
      .map((cb) => Number(cb.dataset.index))
      .filter(Number.isFinite)
      .filter((rowIdx) => {
        const sp = rowSpecimens?.[rowIdx] || "(空)";
        return selectedSpecimens.size ? selectedSpecimens.has(sp) : true;
      });

    return selectedRows;
    }

    // 回傳「有任一 selectedRows 在該日期欄位有值」的日期欄位 index（含排序、取最後 n 個）
    function computeLastNDateColsWithAnyValue(n) {
    if (!abbrHeaders || !abbrRows || !dateIsoKeys) return [];

    const selectedRows = getSelectedRowIndicesForCurrentFilters();

    // 如果使用者目前沒勾任何 item：你可以選擇
    // A) 回傳 [] 讓 applyDatePreset fallback 回原本邏輯
    // B) 視為全部 rows 都納入
    // 這裡我採 A，避免「沒勾任何項目時」邏輯怪掉
    if (!selectedRows.length) return [];

    const candidates = [];

    // col 0 是 [Lab]，從 1 開始
    for (let col = 1; col < abbrHeaders.length; col++) {
      let hasAny = false;

      for (const rIdx of selectedRows) {
        const v = String(abbrRows?.[rIdx]?.[col] ?? "").trim();
        if (v !== "") {
          hasAny = true;
          break;
        }
      }

      if (hasAny) {
        candidates.push({
          col,
          iso: dateIsoKeys[col] || "", // "YYYY-MM-DDTHH:mm"
        });
      }
    }

    // 依日期排序（old -> new），取最後 n 個
    candidates.sort((a, b) => String(a.iso).localeCompare(String(b.iso)));
    const picked = candidates.slice(Math.max(0, candidates.length - n)).map((x) => x.col);

    return picked;
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

  // 回傳日期 presetId；若不符合任何 preset -> custom
  function detectDatePresetFromCurrentSelection() {
    const selected = getCheckedDateColSet();

    // 一律要求 col0 ([Lab]) 必須在
    if (!selected.has(0)) return "lab_date_preset_custom";

    const allCbs = Array.from(box.querySelectorAll('[data-role="dateCb"]'));
    const total = allCbs.length;

    // 全選/全不選（注意：你現在 applyDatePreset 會永遠勾 0，所以「全不選」其實是只剩 0）
    if (selected.size === total && total > 0) return "lab_date_preset_all";
    if (selected.size === 1 && selected.has(0)) return "lab_date_preset_none";

    // last N：這裡要沿用你既有的「有值日期」算法（避免跟 applyDatePreset 不一致）
    const isEqual = (a, b) => {
      if (a.size !== b.size) return false;
      for (const x of a) if (!b.has(x)) return false;
      return true;
    };

    const mkExpected = (n) => {
      const cols = computeLastNDateColsWithAnyValue(n);
      if (!cols.length) {
        // fallback：你目前 applyDatePreset 的 fallback 是「最後 n 欄」
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
       if (idx === 0) {
         cb.checked = true;   // ✅ 永遠保留 [Lab] 欄
       } else {
         cb.checked = !!fn(idx, len);
       }
     });
    };

    // ✅ 共用：以「有值日期」決定 last N
    const applyLastNWithAnyValue = (n) => {
      const pickedCols = computeLastNDateColsWithAnyValue(n);

      // 如果目前沒有任何「有值日期」（或沒勾任何 item），fallback 回原本的最後 N 欄
      if (!pickedCols.length) {
        setChecked((i, L) => i === 0 || i >= L - n);
        return;
      }

      const pickedSet = new Set(pickedCols);
      setChecked((i) => i === 0 || pickedSet.has(i));
    };

    if (presetId === "lab_date_preset_custom") return;

    switch (presetId) {
      case "lab_date_preset_all":
        setChecked(() => true);
        break;

      case "lab_date_preset_last_15":
        applyLastNWithAnyValue(15);
        break;

      case "lab_date_preset_last_10":
        applyLastNWithAnyValue(10);
        break;

      case "lab_date_preset_last_5":
        applyLastNWithAnyValue(5);
        break;

      case "lab_date_preset_none":
        setChecked(() => false);
        break;

      default:
        break;
    }
  }

  function getSelectedLabsFromState() {
    const labs = [];
    for (const idx of selectedItemIdxSet) {
      const lab = String(abbrRows?.[idx]?.[0] ?? "").trim();
      if (lab) labs.push(lab);
    }
    return new Set(labs);
  }

  function setPresetRadio(id) {
    const el = box.querySelector(`#${id}`);
    if (el) el.checked = true;
  }

  // 回傳最符合的 presetId；若不符合任何 preset，回傳 "lab_preset_custom"
  function detectPresetFromCurrentSelection() {
    const selected = getSelectedLabsFromState();

    // 特例：全不選 / 全選（如果你希望也能自動回到這兩種）
    const allCbs = Array.from(box.querySelectorAll('[data-role="itemCb"]'));
    const total = allCbs.length;
    const count = selected.size;

    if (count === 0) return "lab_preset_none";
    if (count === total && total > 0) return "lab_preset_all";

    // 一般套組：用「集合完全相等」判斷
    const isEqualSet = (a, arr) => {
      const b = new Set(arr || []);
      if (a.size !== b.size) return false;
      for (const x of a) if (!b.has(x)) return false;
      return true;
    };

    // 你目前的 presetSelectionsMap 已包含 lab_preset_tpn_fixed（minor+major去重）
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

    // ✅ 自選：不要動使用者勾選
    if (presetId === "lab_preset_custom") return;

    if (presetId === "lab_preset_none") {
      cbs.forEach((cb) => (cb.checked = false));
      return;
    }
    if (presetId === "lab_preset_all") {
      cbs.forEach((cb) => (cb.checked = true));
      return;
    }

    // ✅ tpn_fixed：UI 勾選 = minor + major（去重）
    let allow = presetSelectionsMap[presetId] || [];
    if (presetId === "lab_preset_tpn_fixed") {
      allow = presetSelectionsMap["lab_preset_tpn_fixed"] || [];
    }

    cbs.forEach((cb) => {
      const lab = cb.dataset.lab || "";
      cb.checked = allow.includes(lab);
    });
  }

  function getSelectedSpecimensSet() {
    const selected = Array.from(box.querySelectorAll('[data-role="specimenCb"]:checked'))
      .map((cb) => String(cb.dataset.value ?? "").trim())
      .filter(Boolean);
    return new Set(selected);
  }

  function isAutoLastNPreset() {
    const id = getCheckedRadioId("lab_date_presets_selection");
    return id === "lab_date_preset_last_5" || id === "lab_date_preset_last_10" || id === "lab_date_preset_last_15";
  }

  function pickSingleSpecimenForTPNFixed() {
    // User said: "不須多檢體別" => TPN fixed uses ONE specimen
    const checked = Array.from(box.querySelectorAll('[data-role="specimenCb"]:checked'));
    if (checked.length) return String(checked[0].dataset.value ?? "").trim() || "(空)";
    // if none checked, fallback to first known specimen
    if (specimens && specimens.length) return specimens[0];
    return "(空)";
  }

  // -----------------------------
  // Specimen label formatting (NEW)
  // Rules:
  // 1) B is default: no marking.
  // 2) BV -> v-<Lab>, Urine -> u-<Lab>, CSF -> c-<Lab>, Stool -> s-<Lab>, Pleural -> pl-<Lab>, Ascites -> as-<Lab>
  // 3) If only ONE non-blood specimen selected (e.g., only Urine), show header "Specimen: U (urine)" and suppress per-row prefixes.
  // 4) If any marking happens, output legend at the very last line.
  // -----------------------------

  const DEFAULT_BLOOD_SPECIMENS = new Set(["B"]); // ONLY B is default no-mark
  const BLOOD_RELATED_SPECIMENS = new Set(["B", "BV"]); // treat BV as blood-related for rule #3

  function normalizeSpecimenKey(sp) {
    const s = String(sp ?? "").trim();
    if (!s) return "";
    // keep original for display elsewhere, but normalize for matching
    return s.toUpperCase();
  }

  function specimenMeta(sp) {
    const key = normalizeSpecimenKey(sp);

    // You can expand synonyms here if HIS uses different text.
    const map = {
      "B":   { code: "B",  prefix: "",   legendKey: "b",  meaning: "blood (default)" }, // default, usually not shown
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

    // fallback: use 1–2 letters as prefix
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
    // Selected specimens from UI
    const sel = Array.from(getSelectedSpecimensSet()).map(normalizeSpecimenKey).filter(Boolean);

    // Rule #3 trigger: only ONE non-blood specimen selected (exclude blood-related specimens B/BV)
    const nonBlood = sel.filter((k) => !BLOOD_RELATED_SPECIMENS.has(k));
    const singleNonBloodOnly = nonBlood.length === 1 && sel.length === 1; // only that one selected

    // Build header line if rule #3 active
    let headerLine = "";
    let headerLegend = null;
    if (singleNonBloodOnly) {
      const m = specimenMeta(nonBlood[0]);
      headerLine = `Specimen: ${m.code} (${m.meaning})`;
      headerLegend = m; // for legend at last line
    }

    return {
      selectedKeys: new Set(sel),
      suppressRowPrefix: singleNonBloodOnly, // suppress per-row prefixes when only one non-blood specimen selected
      headerLine,
      headerLegend,
    };
  }

  function formatLabLabel(labName, specimen, ctx, usedLegendSet) {
    const lab = String(labName ?? "").trim();
    const spKey = normalizeSpecimenKey(specimen);

    // Rule #1: B no mark
    if (DEFAULT_BLOOD_SPECIMENS.has(spKey)) return lab;

    const m = specimenMeta(spKey);

    // If rule #3 active: we already show header, suppress per-row prefix
    if (ctx?.suppressRowPrefix) {
      // still record legend usage (so last line shows meaning)
      if (usedLegendSet) usedLegendSet.set(m.legendKey, m);
      return lab;
    }

    // Normal: add prefix for non-default specimen
    if (usedLegendSet) usedLegendSet.set(m.legendKey, m);
    return `${m.prefix}${lab}`;
  }

  function buildLegendLine(usedLegendSet, ctx) {
    // Only show legend if there is any marking OR header is shown
    const items = [];

    // header specimen legend
    if (ctx?.headerLegend) {
      items.push(`${ctx.headerLegend.legendKey}=${ctx.headerLegend.code}(${ctx.headerLegend.meaning})`);
    }

    // prefix-used legends
    if (usedLegendSet && usedLegendSet.size) {
      for (const [k, m] of usedLegendSet.entries()) {
        // avoid duplicate with header legendKey
        if (ctx?.headerLegend && ctx.headerLegend.legendKey === k) continue;
        items.push(`${k}=${m.code}(${m.meaning})`);
      }
    }

    if (!items.length) return "";
    return `\nSpecimen legend: ${items.join(", ")}`;
  }


  // Rebuild item checkbox UI according to currently selected specimens.
  // Preserve user's manual item selections (intersection with filtered view).
  function rebuildItemsForSpecimens() {
    if (!abbrHeaders || !abbrRows || !rowSpecimens) return;

    // remember current manual selection before tearing down DOM
    syncSelectedItemsFromDOM();

    const sel = getSelectedSpecimensSet(); // Set of specimen strings
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

    // re-check user's previous selection for items that still exist in this filtered view
    applySavedItemSelectionToDOM();
  }

  // -----------------------------
  // New parser: keep ISO keys internally, display headers as MM/DD
  // Also keep ALL specimens and expose specimen selection in UI.
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

    // flatten header tokens
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
      const display = `${m}/${d}`; // display layer only
      dateMeta.push({ iso, display, src: dateMeta.length });
    }

    if (!dateMeta.length) {
      return { headers: null, rows: null, dateIsoKeys: null, rowSpecimens: null, specimens: null };
    }

    // sort by ISO ascending (old -> new)
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

      // blacklist by item code
      if ((excludingRowKeywords["項目代號"] || []).includes(itemCode)) continue;

      // abbreviate item name only
      const itemName = labHeaderAbbrDict[itemNameRaw] || itemNameRaw;
      if (!itemName) continue;

      // values begin at col 4
      const rawValues = cells.slice(4, 4 + dateMeta.length);

      const values = valueOrder.map((k) => {
        let s = String( rawValues[k] ?? "")
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

  function buildFilteredArray(headers, rows, ctx, usedLegendSet) {
    if (!headers || !rows) return null;

      const selectedCols = Array.from(box.querySelectorAll('[data-role="dateCb"]:checked'))
      .map((cb) => Number(cb.dataset.index))
      .filter(Number.isFinite);

    const selectedSpecimens = getSelectedSpecimensSet();

    const selectedRows = Array.from(box.querySelectorAll('[data-role="itemCb"]:checked'))
      .map((cb) => Number(cb.dataset.index))
      .filter(Number.isFinite)
      .filter((rowIdx) => {
        const sp = rowSpecimens?.[rowIdx] || "(空)";
        return selectedSpecimens.size ? selectedSpecimens.has(sp) : true;
      });

    const displayModeId = getCheckedRadioId("lab_display_mode");
    const isHorizontal = displayModeId === "lab_display_horizontal";

    // Build vertical matrix first
    let arr = [
      headers.filter((_, i) => selectedCols.includes(i)),
      ...selectedRows.map((i) => {
        const sp = rowSpecimens?.[i] || "(空)";
        return selectedCols.map((j, k) => {
          if (k === 0) return formatLabLabel(rows[i]?.[0] ?? "", sp, ctx, usedLegendSet);
          return rows[i]?.[j] ?? "";
        });
      }),
    ];

    let [h, ...r] = arr;

    // sort by predefined order (lab name without specimen suffix)
    r.sort((a, b) => {
      const labA = String(a[0] ?? "").split("(")[0];
      const labB = String(b[0] ?? "").split("(")[0];
      const ia = labOrder.indexOf(labA) === -1 ? Infinity : labOrder.indexOf(labA);
      const ib = labOrder.indexOf(labB) === -1 ? Infinity : labOrder.indexOf(labB);
      return ia - ib;
    });

    // limit label length <= 12 (allow "(B)" etc)
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
      const classificationEndTexts = ["Plt", "P", "TB"];
      arr = arr.map((row) =>
        row.map((cell) => (classificationEndTexts.includes(cell) ? cell + " |" : cell))
      );
    }

    return arr;
  }

  function toAlignedText(matrix) {
    if (!matrix || !matrix[0]) return "";

    const MIN_VALUE_COL_WIDTH = 3; // 「至少空三格」

    const widths = matrix[0].map((_, i) => {
      const maxLen = Math.max(...matrix.map((row) => String(row[i] ?? "").length));
      return i === 0 ? maxLen : Math.max(maxLen, MIN_VALUE_COL_WIDTH);
    });

    return matrix
      .map((row) => row.map((cell, i) => String(cell ?? "").padEnd(widths[i])).join(" "))
      .join("\n");
  }

  // DOM-safe output rendering (no innerHTML)
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

    // selected cols (as chosen by user)
    const selectedColsAll = Array.from(box.querySelectorAll('[data-role="dateCb"]:checked'))
      .map((cb) => Number(cb.dataset.index))
      .filter(Number.isFinite);

    // Need at least [Lab] + 1 date selected at UI level; otherwise no output.
    if (!selectedColsAll.length) return "";

    // TPN fixed: single specimen only
    const pickedSpecimen = pickSingleSpecimenForTPNFixed();

    // Build labName -> row for picked specimen only
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
      m.map((row) =>
        row.map((cell) => (classificationEndTexts.includes(cell) ? cell + " |" : cell))
      );

    // Helper: detect if a date column (colIndex) has ANY value among specified labs
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

    // Helper: build a vertical block for a lab list, but
    // - it filters date columns that are entirely empty within THIS lab list
    // - returns null if no date columns remain (i.e., only [Lab] remains)
    function buildForcedVerticalBlock(items) {
      const labs = (items || []).filter(Boolean);

      // keep [Lab] col (0) always if selected; filter date cols based on emptiness within this block
      const hasAny = makeHasAnyValueInCol(labs);

      // ensure we keep column 0 if user selected it; but your UI typically includes 0 when using presets
      const selectedCols = selectedColsAll
        .filter((colIdx) => colIdx === 0 || hasAny(colIdx));

      // If after filtering, there is no date col left, don't output this block
      // We treat "date cols" as any selected col other than 0
      const hasAnyDateCol = selectedCols.some((c) => c !== 0);
      if (!hasAnyDateCol) return null;

      const headerFiltered = headers.filter((_, i) => selectedCols.includes(i));

      const body = labs.map((labName) => {
        const found = rowByLab.get(labName);

        return selectedCols.map((colIndex, idxInSelected) => {
          if (idxInSelected === 0) {
            // label cell: apply specimen prefixing rules
            return formatLabLabel(labName, pickedSpecimen, ctx, usedLegendSet);
          }
          return found?.[colIndex] ?? "";
        });
      });

      // sort by labOrder (strip specimen suffix if any)
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

    // Build blocks independently (each removes its own empty date columns)
    const minorV = buildForcedVerticalBlock(minorItems);
    const majorV = buildForcedVerticalBlock(majorItems);

    // If both blocks are empty after filtering, output nothing
    if (!minorV && !majorV) return "";

    // Convert each block to fixed-format horizontal (transpose)
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

    // Join blocks:
    // - if only one exists, return it
    // - if both exist, keep two blank lines between blocks (as original)
    if (t1 && t2) return [t1, "", "", t2].join("\n");
    return (t1 || t2 || "").trimEnd();
  }

  // -----------------------------
  // Trend chart helpers (Chart.js)
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

    const selectedRows = Array.from(box.querySelectorAll('[data-role="itemCb"]:checked'))
      .map((cb) => Number(cb.dataset.index))
      .filter(Number.isFinite)
      .filter((rowIdx) => {
        const sp = rowSpecimens?.[rowIdx] || "(空)";
        return selectedSpecimens.size ? selectedSpecimens.has(sp) : true;
      });

    if (!selectedCols.length || !selectedRows.length) return { datasets: [] };

    const colMeta = selectedCols
      .map((i) => ({
        i,
        iso: dateIsoKeys?.[i] || null, // "YYYY-MM-DDTHH:mm"
      }))
      .filter((c) => !!c.iso);

    // old -> new
    colMeta.sort((a, b) => a.iso.localeCompare(b.iso));

    const datasets = selectedRows.map((rIdx) => {
      const lab = String(rows[rIdx]?.[0] ?? "").trim() || `Lab${rIdx + 1}`;
      const sp = rowSpecimens?.[rIdx] || "(空)";

      const data = colMeta
        .map((c) => ({
          x: Date.parse(c.iso),                // ✅ timestamp (ms)
          y: cleanNumeric(rows[rIdx]?.[c.i]),  // ✅ numeric or null
        }))
        .filter((p) => Number.isFinite(p.x));  // safety

      return {
        label: `${lab}(${sp})`,
        data,
      };
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
      data: { datasets: ds }, // ✅ no labels
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false, // ✅ important: we provide {x,y}
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
          x: {
            type: "linear",
            ticks: {
              callback: (v) => fmtMMDD(v),
            },
          },
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
    const presetId = getCheckedRadioId("lab_presets_selection");

    // compute specimen context for this render
    const ctx = computeSpecimenContextForOutput();
    const usedLegendSet = new Map(); // legendKey -> meta

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
    renderTrendChart();
  }

  // ---- main processor (parse -> build selections -> apply presets -> output)
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

    if (DEBUG) {
      console.groupCollapsed("[lab] process");
      console.log({ headers: abbrHeaders, rows: abbrRows?.length, specimens });
      console.groupEnd();
    }

    buildDateCheckboxes(abbrHeaders);
    buildSpecimenCheckboxes(specimens);

    // initial items: show only selected specimens (default B/BV if present)
    rebuildItemsForSpecimens();

    applyItemPreset();
    
    // store preset-applied selection as baseline manual selection
    syncSelectedItemsFromDOM();

    applyDatePreset(); // default: 近5次

    renderOutput();
  };

  const scheduleProcess = createScheduler(process);
  const scheduleOutput = createScheduler(renderOutput);

  // ---- delegated events (NO per-checkbox binding)
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
      // preset change overwrites selection by design
      applyItemPreset();
      syncSelectedItemsFromDOM();
      if (isAutoLastNPreset()) applyDatePreset();
      scheduleOutput();
      return;
    }
    if (t?.name === "lab_display_mode") {
      scheduleOutput();
      return;
    }

    // user manual selection update
    if (t?.matches?.('[data-role="itemCb"]')) {
      syncSelectedItemsFromDOM();

      // ✅ 手動改 item 後，讓 preset UI 反映目前狀態
      const detected = detectPresetFromCurrentSelection();
      setPresetRadio(detected);
      if (isAutoLastNPreset()) applyDatePreset();
      scheduleOutput();
      return;
    }

    // rebuild item list when specimen changes (keep manual selection for remaining items)
    if (t?.matches?.('[data-role="specimenCb"]')) {
      rebuildItemsForSpecimens();

      // ✅ specimen 變動會改變可選 items，更新目前 preset 顯示狀態
      setPresetRadio(detectPresetFromCurrentSelection());

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

    clearToBr(dateSelEl);
    clearToBr(specimenSelEl);
    clearToBr(itemSelEl);
    clearToBr(outEl);

    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }

    const datePresetLast5 = box.querySelector("#lab_date_preset_last_5");
    const presetTPNMinor = box.querySelector("#lab_preset_TPN_minor");
    const displayHorizontal = box.querySelector("#lab_display_horizontal");
    if (datePresetLast5) datePresetLast5.checked = true;
    if (presetTPNMinor) presetTPNMinor.checked = true;
    if (displayHorizontal) displayHorizontal.checked = true;
  });

  // ---- intro (UPDATED)
  introBtn?.addEventListener("click", () => {
    if (typeof introJs === "undefined") return;

    // ✅ Example updated: includes multiple dates and multiple specimens (B / U / CSF)
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
    process();

    // ✅ Steps updated: include specimen / presets / trend chart / output copy
    const steps = [
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`,
        intro:
          `<p><b>(1) HIS 4.0 檢驗頁面</b></p>
          <p>建議用「全部彙總」後再複製貼上。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`,
        intro:
          `<p><b>(2) 複製資料</b></p>
          <p>Ctrl + A 全選 → Ctrl + C 複製</p>
          <img src="./img/intro_lab_step_0_全部彙總.png" style="width:100%;height:auto;">`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`,
        intro:
          `<p><b>(3) 貼上 Raw Lab</b></p>
          <p>Ctrl + V 貼到 Raw Lab，系統會即時解析、生成日期/檢體別/項目。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="presetArea"]`,
        intro:
          `<p><b>(4) 選擇顯示方式</b></p>
          <p>橫式/直式切換：只影響輸出排版，不影響選取內容。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="specimenArea"]`,
        intro:
          `<p><b>(5) 選擇檢體別</b></p>
          <p>預設會偏好勾選 B / BV（若存在）。</p>
          <p>切換檢體別會重建「可選項目清單」，並保留仍存在的已選項目。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="dateArea"]`,
        intro:
          `<p><b>(6) 選擇日期（預設：近5次）</b></p>
          <p>可用：全選 / 近15 / 近10 / 近5 / 全不選 / 自選。</p>
          <p>近N次會優先抓「被選取項目」在該日期有值的欄位。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="presetsArea"]`,
        intro:
          `<p><b>(7) 選擇套組</b></p>
          <p>TPN小抽/大抽、Gas、CV、GI、Inf、Hema、TPN固定格式、或自選。</p>
          <p>切換套組會覆寫項目勾選（自選除外）。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="itemArea"]`,
        intro:
          `<p><b>(8) 客製化日期、檢驗項目</b></p>
          <p>項目依 Date / CBC / Coag / Chemistry / Gas 分類顯示。</p>
          <p>手動調整項目後，套組會自動切換為「最符合」或「自選」。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="outputs"]`,
        intro:
          `<p><b>(9) 輸出與複製</b></p>
          <p>輸出內容為等寬對齊文字，點選內容即可複製（你原本的 copy 行為）。</p>
          <p>若只選到單一非血液檢體（如 Urine），會顯示 Specimen header 並省略每列前綴。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="trendCanvas"]`,
        intro:
          `<p><b>(10) Trend 圖</b></p>
          <p>會根據「目前勾選的日期 + 勾選的項目」畫出趨勢（需 Chart.js）。</p>
          <p>若沒有足夠日期或沒有可轉數值的資料，趨勢圖會自動隱藏/不畫。</p>`,
      },
      {
        element: `[data-tool="${TOOL_KEY}"] [data-role="reset"]`,
        intro:
          `<p><b>(11) Reset</b></p>
          <p>清空資料與所有狀態，回到預設（近5次 + TPN小抽 + 橫式）。</p>`,
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

    // ✅ keep your previous cleanup behavior
    intro.oncomplete(() => resetBtn?.click());
    intro.onexit(() => resetBtn?.click());
    intro.start();
  });

  // ---- initial
  clearToBr(outEl);
}


