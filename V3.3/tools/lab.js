// tools/lab.js
// updated: 2026-02-28

import { createScheduler } from "../core/utils.js";

const TOOL_KEY = "lab";
const DEBUG = false;

export function render() {
  return `
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
                </div>
              </div>

              <div class="mt-1 mb-2 d-flex flex-wrap gap-1" data-role="dateSelection"><br></div>
            </div>
          </div>

          <!-- 檢體別 selection -->
          <div class="row mt-2">
            <div class="col" data-role="specimenArea">
              <span>✔ 選取檢體別</span>
              <div class="mt-1 mb-2 d-flex flex-wrap gap-1" data-role="specimenSelection"><br></div>
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
                </div>
              </div>
            </div>
          </div>

          <!-- Lab item selection -->
          <div class="row" data-role="itemArea">
            <div class="col">
              <div class="row">
                <div class="mt-1 mb-2 d-flex flex-wrap gap-1" data-role="itemSelection"><br></div>
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
    "Atypical-Lympho": "Atyp Lym",
    "Meta-Myelocyte": "Meta Mye",
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
    "WBC", "Hb", "Hct", "Plt", "Seg", "Band", "Lym", "Mono", "Eos", "Baso", "Atyp Lym", "Meta Mye", "Myelocyte", "Promyelocyte", "Blast", "Megakaryocyte", "ANC", "nRBC",
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
      label.className = "btn btn-outline-secondary btn-check-label mt-1 ml-1";
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
    const hema = new Set(["WBC","Hb","Hct","Plt","Seg","Band","Lym","Mono","Eos","Baso","Atyp Lym","Meta Mye","Myelocyte","Promyelocyte","Blast","Megakaryocyte","ANC","nRBC"]);
    const coag = new Set(["PT","INR","aPTT","aPTT/m","Fibrinogen","D-dimer","FDP"]);
    const lyte = new Set(["Na","K","Cl","iCa","Ca","Mg","P","Zn"]);
    const renalLiver = new Set(["BUN","Cr","AST","ALT","DB","TB","ALP","γGT"]);
    const infl = new Set(["CRP","Pct","Ferritin"]);
    const nutri = new Set(["TG","Chol","TP","Alb"]);
    const endocrine = new Set(["iPTH","fT4","TSH"]);
    const gas = new Set(["pH","pCO2","pO2","HCO3","SBE"]);

    if (hema.has(lab)) return "Hematology";
    if (coag.has(lab)) return "Coagulation";
    if (lyte.has(lab)) return "Electrolytes";
    if (renalLiver.has(lab)) return "Renal/Liver";
    if (infl.has(lab)) return "Inflammation";
    if (nutri.has(lab)) return "Nutrition/Lipid";
    if (endocrine.has(lab)) return "Endocrine";
    if (gas.has(lab)) return "Gas";
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

    const catOrder = ["Hematology","Coagulation","Electrolytes","Renal/Liver","Inflammation","Nutrition/Lipid","Endocrine","Gas","Other"];

    catOrder.forEach((cat) => {
      const idxs = groups.get(cat);
      if (!idxs || !idxs.length) return;

      const section = document.createElement("div");
      section.className = "w-100 mt-1";

      const title = document.createElement("div");
      title.className = "text-muted small mt-1";
      title.textContent = `— ${cat} —`;
      section.appendChild(title);

      const wrap = document.createElement("div");
      wrap.className = "d-flex flex-wrap gap-1";

      idxs.forEach((rowIdx) => {
        const lab = String(rows[rowIdx]?.[0] ?? "").trim() || `Lab${rowIdx + 1}`;
        const sp = String(specimensByRow?.[rowIdx] ?? "").trim() || "(空)";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "btn-check";
        input.dataset.role = "itemCb";
        // IMPORTANT: keep dataset.index as ORIGINAL index to keep downstream logic unchanged
        const originalIndex = origIndices ? origIndices[rowIdx] : rowIdx;
        input.dataset.index = String(originalIndex);
        input.dataset.lab = lab;
        input.dataset.specimen = sp;
        input.id = `lab_item_${originalIndex}`;

        const label = document.createElement("label");
        label.className = "btn btn-outline-secondary btn-check-label mt-1 ml-1";
        label.htmlFor = input.id;
        label.textContent = `${lab} [${sp}]`;

        wrap.appendChild(input);
        wrap.appendChild(label);
      });

      section.appendChild(wrap);
      itemSelEl.appendChild(section);
    });

    if (!rows.length) clearToBr(itemSelEl);
  }

  function applyDatePreset() {
    const presetId = getCheckedRadioId("lab_date_presets_selection");
    const cbs = Array.from(box.querySelectorAll('[data-role="dateCb"]'));
    const len = cbs.length;

    const setChecked = (fn) => cbs.forEach((cb, idx) => (cb.checked = !!fn(idx, len)));

    switch (presetId) {
      case "lab_date_preset_all":
        setChecked(() => true);
        break;
      case "lab_date_preset_last_15":
        setChecked((i, L) => i === 0 || i >= L - 15);
        break;
      case "lab_date_preset_last_10":
        setChecked((i, L) => i === 0 || i >= L - 10);
        break;
      case "lab_date_preset_last_5":
        setChecked((i, L) => i === 0 || i >= L - 5);
        break;
      case "lab_date_preset_none":
        setChecked(() => false);
        break;
      default:
        break;
    }
  }

  function applyItemPreset() {
    const presetId = getCheckedRadioId("lab_presets_selection");
    const cbs = Array.from(box.querySelectorAll('[data-role="itemCb"]'));

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
      const minor = presetSelectionsMap["lab_preset_TPN_minor"] || [];
      const major = presetSelectionsMap["lab_preset_TPN_major"] || [];
      allow = Array.from(new Set([...minor, ...major]));
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
      dateMeta.push({ iso, display });
    }

    if (!dateMeta.length) {
      return { headers: null, rows: null, dateIsoKeys: null, rowSpecimens: null, specimens: null };
    }

    // sort by ISO ascending (old -> new)
    dateMeta.sort((a, b) => a.iso.localeCompare(b.iso));

    const headers = ["[Lab]", ...dateMeta.map((x) => x.display)];
    const dateIsoKeysOut = [null, ...dateMeta.map((x) => x.iso)];

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

      const values = rawValues.map((cell) => {
        let s = String(cell ?? "")
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

    applyDatePreset(); // default: 近5次
    applyItemPreset();

    // store preset-applied selection as baseline manual selection
    syncSelectedItemsFromDOM();

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
      scheduleOutput();
      return;
    }

    // rebuild item list when specimen changes (keep manual selection for remaining items)
    if (t?.matches?.('[data-role="specimenCb"]')) {
      rebuildItemsForSpecimens();
      scheduleOutput();
      return;
    }

    if (t?.matches?.('[data-role="dateCb"]')) {
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

  // ---- intro (kept same behavior)
  introBtn?.addEventListener("click", () => {
    if (typeof introJs === "undefined") return;

    const example = `
選取\t項目代號\t項目\t檢體別\t20250129
0125\t20250126
0025\t20250125
2328\t單位\t參考值
True\t72A001\tWBC\tB\t3.5\t4.4\t9.3\t1000/uL\t5.2~13.4(>1d-8d)
True\t72B001\tRBC\tB\t\t4.19\t3.18\tmillion/uL\t3.99~4.98(>1d-8d)
True\t72B001\tHb\tB\t\t10.2\t10.3\tmillion/uL\t3.99~4.98(>1d-8d)
True\t72B001\tHct\tB\t\t30.2\t30.3\tmillion/uL\t3.99~4.98(>1d-8d)
True\t72B001\tPlt\tB\t\t325\t80\tmillion/uL\t3.99~4.98(>1d-8d)
`.trim();

    if (rawEl) rawEl.value = example;
    process();

    const steps = [
      { element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`, intro: `<p>(1) 請開啟His 4.0 新版檢驗</p>` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`, intro: `<p>(2) 點選 "全部彙總"</p><img src="./img/intro_lab_step_0_全部彙總.png" style="width:100%;height:auto;">` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`, intro: `<p>(3) 點選 "任一項檢驗項目"</p><img src="./img/intro_lab_step_1_點選任一檢驗項目.png" style="width:100%;height:auto;">` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`, intro: `<p>(4-1) Ctrl + A 全選</p><img src="./img/intro_lab_step_2_全選複製.png" style="width:100%;height:auto;"><p>(4-2) 再 Ctrl + C 複製</p>` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`, intro: `(5) 貼上複製的資料` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="presetArea"]`, intro: `(6) 點選顯示方式(直式/橫式)` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="dateArea"]`, intro: `(7) 點選想要的日期` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="specimenArea"]`, intro: `(7-1) 點選想要的檢體別` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="presetsArea"]`, intro: `(8) 點選想要的套組` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="itemArea"]`, intro: `(9) 點選想要的檢驗項目` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="outputsArea"]`, intro: `(10) 點選內容即可複製!` },
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

    intro.oncomplete(() => resetBtn?.click());
    intro.onexit(() => resetBtn?.click());
    intro.start();
  });

  // ---- initial
  clearToBr(outEl);
}