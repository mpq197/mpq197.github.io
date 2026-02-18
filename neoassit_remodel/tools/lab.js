// tools/lab.js
import { createScheduler } from "../core/utils.js";

const TOOL_KEY = "lab";
const DEBUG = false;

export function render(){
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
                <div class="btn-group mb-2" role="group" aria-label="transpose toggle buttons" data-role="transposeGroup">
                  <input type="radio" class="btn-check" name="lab_should_transpose" id="lab_need_transpose" autocomplete="off" checked>
                  <label class="btn btn-outline-secondary" for="lab_need_transpose">橫式</label>

                  <input type="radio" class="btn-check" name="lab_should_transpose" id="lab_no_need_transpose" autocomplete="off">
                  <label class="btn btn-outline-secondary" for="lab_no_need_transpose">直式</label>
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

                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_last_15" autocomplete="off" checked>
                    <label class="btn btn-outline-secondary" for="lab_date_preset_last_15">近15次</label>

                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_last_10" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_date_preset_last_10">近10次</label>

                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_last_5" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_date_preset_last_5">近5次</label>

                    <input type="radio" class="btn-check" name="lab_date_presets_selection" id="lab_date_preset_none" autocomplete="off">
                    <label class="btn btn-outline-secondary" for="lab_date_preset_none">全不選</label>
                  </div>
                </div>
              </div>

              <div class="mt-1 mb-2" data-role="dateSelection"><br></div>
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
                </div>
              </div>
            </div>
          </div>

          <!-- Lab item selection -->
          <div class="row" data-role="itemArea">
            <div class="col">
              <div class="row">
                <div class="mt-1 mb-2" data-role="itemSelection"><br></div>
              </div>
            </div>
          </div>

          <!-- Outputs + buttons -->
          <div class="row mt-3 pt-2 border-top">
            <div class="col-10" data-role="outputsArea">
              <ul class="list-group mt-2 mb-2">
                <li class="list-group-item copy-item" data-role="outputs"><br></li>
              </ul>
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

export function init(root){
  const box = root.querySelector(`[data-tool="${TOOL_KEY}"]`);
  if (!box) return;

  if (box.dataset.bound === "1") return;
  box.dataset.bound = "1";

  // ---- DOM refs
  const rawEl = box.querySelector('[data-role="rawText"]');
  const dateSelEl = box.querySelector('[data-role="dateSelection"]');
  const itemSelEl = box.querySelector('[data-role="itemSelection"]');
  const outEl = box.querySelector('[data-role="outputs"]');
  const resetBtn = box.querySelector('[data-role="reset"]');
  const introBtn = box.querySelector('[data-role="introBtn"]');

  // ---- state (kept inside module instance)
  let abbrHeaders = null; // array
  let abbrRows = null;    // array of arrays

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
    "Na(Sodium)": "Na ",
    "K(Potassium)": "K  ",
    "Cl(Chloride)": "Cl ",
    "Ca(Calcium)": "Ca ",
    "Mg(Magnesium)": "Mg ",
    "Inorganic P": "P  ",
    "Zn(Zinc)": "Zn",
    "Total Bilirubin": "TB ",
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
    "Lactate(B)": "Lactate"
  };

  const remainingRowKeywords = { "檢體別": ["B", "BV"] };

  const excludingRowKeywords = {
    "項目代號": [
      "72A285","72B285","72C285","72D285","72E285","72F285","72G285","72H285","72I285","72J285","72K285","72L285","72M285","72N285","72O285","72P285","72Q285","72R285","72S285","72T285","72U285","72V285","72W285","72X285","72Y285","72Z285",
      "72a285","72b285","72c285","72d285","72e285","72f285","72g285","72h285","72i285",
      "72B037","72B038",
      "72A513",
      "72-065",
      "72A530","72G530","72L530","72M530","72A530","72A530","72K530","72L530","72M530",
      "72B001","72E001","72F001","72G001","72H001","72K001","72L001"
    ]
  };

  const excludeColKeywords = ["選取", "項目代號", "檢體別", "單位", "參考值"];

  const presetSelectionsMap = {
    "lab_preset_TPN_minor": ["WBC","Hb","Hct","Plt","Na ","K  ","Cl ","Ca ","Mg ","P  ","BUN","Cr","AST","ALT","DB","TB ","CRP","Pct"],
    "lab_preset_TPN_major": ["TG","Chol","TP","Alb","ALP","γGT","iPTH","fT4","TSH"],
    "lab_preset_gas": ["pH","pCO2","pO2","HCO3","SBE"],
    "lab_preset_cv": ["CK-MB","hs-Troponin I","Lactate","BNP","NT-ProBNP"],
    "lab_preset_gi": ["BUN","Cr","AST","ALT","DB","TB ","ALP","γGT","Amylase","Lipase","Na ","K  ","Cl ","iCa","Ca ","Mg ","P  "],
    "lab_preset_inf": ["WBC","Seg","Lym","ANC","CRP","Pct","Ferritin"],
    "lab_preset_hema": ["Hb","Hct","Plt","PT","INR","aPTT","aPTT/m","Fibrinogen","D-dimer","FDP"],
  };

  const labOrder = [
    "WBC","Hb","Hct","Plt","Seg","Band","Lym","Mono","Eos","Baso","Atyp Lym","Meta Mye","Myelocyte","Promyelocyte","Blast","Megakaryocyte","ANC","nRBC",
    "PT","INR","aPTT","aPTT/m",
    "Na ","K  ","Cl ","iCa","Ca ","Mg ","P  ","Zn",
    "BUN","Cr","AST","ALT","DB","TB ",
    "CRP","Pct",
    "TG","Chol","TP","Alb","ALP","γGT","iPTH","fT4","TSH"
  ];

  // ---- helpers
  const abbr = (items) => items.map(x => labHeaderAbbrDict[x] || x);

  function getCheckedRadioId(name){
    const el = box.querySelector(`input[name="${name}"]:checked`);
    return el ? el.id : null;
  }

  function parseRawToTable(rawText){
    const raw = String(rawText ?? "").trim();
    if (!raw) return { headers: null, rows: null };

    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const headerIndex = lines.findIndex(line => line.includes("參考值"));
    if (headerIndex < 0) return { headers: null, rows: null };

    const rawHeaders = lines.slice(0, headerIndex + 1).join(" ");
    const rawData = lines.slice(headerIndex + 1);

    const [labHeaders, ...labRows] = [rawHeaders, ...rawData].map(r => r.split("\t"));

    // 2.1 abbreviate
    let headers = abbr(labHeaders);
    let rows = labRows.map(abbr);

    // 2.2 filter rows
    const getIndices = (keywords, headersArr) =>
      Object.keys(keywords).map(h => headersArr.indexOf(h)).filter(i => i !== -1);

    const remainingRowIndices = getIndices(remainingRowKeywords, headers);
    const excludingRowIndices = getIndices(excludingRowKeywords, headers);

    const filterRows = (rowsArr, indices, keywords, include = true) =>
      rowsArr.filter(row =>
        indices.every(idx => include
          ? (keywords[headers[idx]]?.includes(row[idx]))
          : !(keywords[headers[idx]]?.includes(row[idx]))
        )
      );

    rows = filterRows(rows, remainingRowIndices, remainingRowKeywords, true);
    rows = filterRows(rows, excludingRowIndices, excludingRowKeywords, false);

    // 2.3 filter cols
    const excludeColIndices = headers
      .map((col, i) => excludeColKeywords.includes(col) ? i : -1)
      .filter(i => i !== -1);

    headers = headers.filter((_, i) => !excludeColIndices.includes(i));
    rows = rows.map(r => r.filter((_, i) => !excludeColIndices.includes(i)));

    // 2.4 header date format yyyyMMdd -> mm/dd
    headers = headers.map(h => h.replace(/^(\d{4})(\d{2})(\d{2}) (\d{4})/, "$2/$3"));

    // 2.5 clean cells
    rows = rows.map(row =>
      row.map(cell => String(cell ?? "")
        .replace(/( [H,L])$/, "")
        .replace(/^< /, "<")
        .replace(/(\.0+|(\.\d*[1-9])0+)$/, "$2")
      )
    );

    // 2.6 reverse date cols (keep first col)
    headers = [headers[0], ...headers.slice(1).reverse()];
    rows = rows.map(r => [r[0], ...r.slice(1).reverse()]);

    // remove empty columns
    const emptyCols = headers.map((_, i) => rows.every(r => (r[i] ?? "") === ""));
    headers = headers.filter((_, i) => !emptyCols[i]);
    rows = rows.map(r => r.filter((_, i) => !emptyCols[i]));

    return { headers, rows };
  }

  function buildDateCheckboxes(headers){
    if (!headers) {
      dateSelEl.innerHTML = "<br>";
      return;
    }

    // default: [Lab] + last 5 dates
    const defaultDates = [headers[0], ...headers.slice(-5)];

    const html = headers.map((h, idx) => {
      const hide = (idx === 0);
      const checked = defaultDates.includes(h);

      return `
        <input
          type="checkbox"
          class="btn-check"
          data-role="dateCb"
          data-index="${idx}"
          id="lab_date_${idx}"
          ${checked ? "checked" : ""}
          ${hide ? 'style="display:none;"' : ""}
        >
        <label
          class="btn btn-outline-secondary btn-check-label mt-1 ml-1"
          for="lab_date_${idx}"
          ${hide ? 'style="display:none;"' : ""}
        >${h}</label>
      `;
    }).join("");

    dateSelEl.innerHTML = html || "<br>";
  }

  function buildItemCheckboxes(headers, rows){
    if (!headers || !rows) {
      itemSelEl.innerHTML = "<br>";
      return;
    }

    const itemIndex = headers.indexOf("[Lab]");
    if (itemIndex === -1) {
      itemSelEl.innerHTML = "<div class='text-muted'>找不到 [Lab] 欄位</div>";
      return;
    }

    const html = rows.map((row, idx) => {
      const label = row[itemIndex] || `labItem ${idx + 1}`;
      return `
        <input
          type="checkbox"
          class="btn-check"
          data-role="itemCb"
          data-index="${idx}"
          id="lab_item_${idx}"
        >
        <label class="btn btn-outline-secondary btn-check-label mt-1 ml-1" for="lab_item_${idx}">
          ${label}
        </label>
      `;
    }).join("");

    itemSelEl.innerHTML = html || "<br>";
  }

  function applyDatePreset(){
    const presetId = getCheckedRadioId("lab_date_presets_selection");
    const cbs = Array.from(box.querySelectorAll('[data-role="dateCb"]'));
    const len = cbs.length;

    const setChecked = (fn) => cbs.forEach((cb, idx) => cb.checked = !!fn(idx, len));

    switch (presetId) {
      case "lab_date_preset_all":
        setChecked(() => true); break;
      case "lab_date_preset_last_15":
        setChecked((i, L) => i === 0 || i >= L - 15); break;
      case "lab_date_preset_last_10":
        setChecked((i, L) => i === 0 || i >= L - 10); break;
      case "lab_date_preset_last_5":
        setChecked((i, L) => i === 0 || i >= L - 5); break;
      case "lab_date_preset_none":
        setChecked(() => false); break;
      default:
        break;
    }
  }

  function applyItemPreset(){
    const presetId = getCheckedRadioId("lab_presets_selection");
    const cbs = Array.from(box.querySelectorAll('[data-role="itemCb"]'));

    if (presetId === "lab_preset_none") {
      cbs.forEach(cb => cb.checked = false);
      return;
    }
    if (presetId === "lab_preset_all") {
      cbs.forEach(cb => cb.checked = true);
      return;
    }

    const allow = presetSelectionsMap[presetId] || [];
    cbs.forEach(cb => {
      const label = cb.nextElementSibling?.textContent?.trim() || "";
      cb.checked = allow.includes(label);
    });
  }

  function buildFilteredArray(headers, rows){
    if (!headers || !rows) return null;

    const selectedCols = Array.from(box.querySelectorAll('[data-role="dateCb"]:checked'))
      .map(cb => Number(cb.dataset.index))
      .filter(Number.isFinite);

    const selectedRows = Array.from(box.querySelectorAll('[data-role="itemCb"]:checked'))
      .map(cb => Number(cb.dataset.index))
      .filter(Number.isFinite);

    const shouldTranspose = (getCheckedRadioId("lab_should_transpose") === "lab_need_transpose");

    let arr = [
      headers.filter((_, i) => selectedCols.includes(i)),
      ...selectedRows.map(i => selectedCols.map(j => rows[i]?.[j] ?? ""))
    ];

    let [h, ...r] = arr;

    // sort by predefined order
    r.sort((a, b) => {
      const ia = labOrder.indexOf(a[0]) === -1 ? Infinity : labOrder.indexOf(a[0]);
      const ib = labOrder.indexOf(b[0]) === -1 ? Infinity : labOrder.indexOf(b[0]);
      return ia - ib;
    });

    // limit label length <= 8
    r = r.map(row => row.map(cell => String(cell ?? "").length > 8 ? String(cell).slice(0, 8) : String(cell ?? "")));

    // remove empty columns (except header col)
    const emptyCols = h.map((_, i) => r.every(row => (row[i] ?? "") === ""));
    h = h.filter((_, i) => !emptyCols[i]);
    r = r.map(row => row.filter((_, i) => !emptyCols[i]));

    arr = [h, ...r];

    if (shouldTranspose) {
      arr = arr[0].map((_, i) => arr.map(row => row[i] ?? ""));
      const classificationEndTexts = ["Plt", "P  ", "TB "];
      arr = arr.map(row => row.map(cell => classificationEndTexts.includes(cell) ? (cell + " |") : cell));
    }

    return arr;
  }

  function toAlignedText(matrix){
    if (!matrix || !matrix[0]) return "";

    const widths = matrix[0].map((_, i) =>
      Math.max(...matrix.map(row => String(row[i] ?? "").length))
    );

    return matrix
      .map(row => row.map((cell, i) => String(cell ?? "").padEnd(widths[i])).join(" "))
      .join("\n");
  }

  function renderOutput(){
    if (!outEl) return;

    const m = buildFilteredArray(abbrHeaders, abbrRows);
    if (!m) {
      outEl.innerHTML = "No data selected";
      return;
    }

    const txt = toAlignedText(m);
    outEl.innerHTML = txt ? `<pre>${txt}</pre>` : "No data selected";
  }

  // ---- main processor (parse -> build selections -> apply presets -> output)
  const process = () => {
    const rawText = String(rawEl?.value ?? "").trim();
    const parsed = parseRawToTable(rawText);

    abbrHeaders = parsed.headers;
    abbrRows = parsed.rows;

    if (DEBUG) {
      console.groupCollapsed("[lab] process");
      console.log({ headers: abbrHeaders, rows: abbrRows?.length });
      console.groupEnd();
    }

    buildDateCheckboxes(abbrHeaders);
    buildItemCheckboxes(abbrHeaders, abbrRows);

    // apply default presets after rebuild
    applyDatePreset();
    applyItemPreset();

    renderOutput();
  };

  const scheduleProcess = createScheduler(process);
  const scheduleOutput = createScheduler(renderOutput);

  // ---- delegated events (NO per-checkbox binding)
  box.addEventListener("input", (e) => {
    const t = e.target;

    // raw text changes -> full process
    if (t?.matches?.('[data-role="rawText"]')) {
      scheduleProcess();
      return;
    }

    // checkboxes / numeric not exist here
    scheduleOutput();
  });

  box.addEventListener("change", (e) => {
    const t = e.target;

    // presets toggles -> apply + output (no reprocess)
    if (t?.name === "lab_date_presets_selection") {
      applyDatePreset();
      scheduleOutput();
      return;
    }
    if (t?.name === "lab_presets_selection") {
      applyItemPreset();
      scheduleOutput();
      return;
    }
    if (t?.name === "lab_should_transpose") {
      scheduleOutput();
      return;
    }

    // manual checkbox toggle
    if (t?.matches?.('[data-role="dateCb"],[data-role="itemCb"]')) {
      scheduleOutput();
      return;
    }
  });

  // ---- reset
  resetBtn?.addEventListener("click", () => {
    if (rawEl) rawEl.value = "";
    abbrHeaders = null;
    abbrRows = null;
    dateSelEl.innerHTML = "<br>";
    itemSelEl.innerHTML = "<br>";
    outEl.innerHTML = "<br>";

    // restore defaults
    const datePresetLast15 = box.querySelector("#lab_date_preset_last_15");
    const presetTPNMinor = box.querySelector("#lab_preset_TPN_minor");
    const transposeNeed = box.querySelector("#lab_need_transpose");
    if (datePresetLast15) datePresetLast15.checked = true;
    if (presetTPNMinor) presetTPNMinor.checked = true;
    if (transposeNeed) transposeNeed.checked = true;
  });

  // ---- intro (kept same behavior)
  introBtn?.addEventListener("click", () => {
    if (typeof introJs === "undefined") return;

    // example input
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
      { element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`, intro: `<p>(2) 點選 "全部彙總"</p><img src="img/intro_lab_step_0_全部彙總.png" style="width:100%;height:auto;">` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`, intro: `<p>(3) 點選 "任一項檢驗項目"</p><img src="img/intro_lab_step_1_點選任一檢驗項目.png" style="width:100%;height:auto;">` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`, intro: `<p>(4-1) Ctrl + A 全選</p><img src="img/intro_lab_step_2_全選複製.png" style="width:100%;height:auto;"><p>(4-2) 再 Ctrl + C 複製</p>` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="rawArea"]`, intro: `(5) 貼上複製的資料` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="presetArea"]`, intro: `(6) 點選顯示方式(直式/橫式)` },
      { element: `[data-tool="${TOOL_KEY}"] [data-role="dateArea"]`, intro: `(7) 點選想要的日期` },
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
  outEl.innerHTML = "<br>";
}
