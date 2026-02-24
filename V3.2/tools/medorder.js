// /tools/medorders.js
// NeoAssist Tool Module Spec v1 compliant (ES module, render()+init(), scoped by data-tool)
//
// =================================================================================================
// 藥囑整理工具：instance-based 解析（新版穩定版）
// =================================================================================================
//
// 【核心設計理念】
// 1) 先用「狀態機」切出藥品資訊區塊（inMedTable）
// 2) 在藥品區塊內用 ORDER_TYPES 切出 instance
// 3) 每個 instance 只解析一次「主列」
// 4) 主列用「由右至左」剝離欄位
// 5) 主列以外的行全部視為 note（避免備註干擾欄位解析）
//
// -------------------------------------------------------------------------------------------------
// 一、狀態機（inMedTable）
// -------------------------------------------------------------------------------------------------
// 進入藥品資訊區塊條件：遇到表頭行（含「類別、藥品名稱、劑量、用法、途徑」）
// 離開藥品資訊區塊條件：遇到「醫師:_____ (」
// 每次遇到表頭皆強制進入 inMedTable（同份列印可能多段表格）
//
// -------------------------------------------------------------------------------------------------
// 二、instance 切割（ORDER_TYPES）
// -------------------------------------------------------------------------------------------------
// 在 inMedTable 區塊內：
//   - 每遇到一行以 ORDER_TYPES 開頭（NEW, CHG, PREP, REN, EXTN, St, DC-C, DC-D, DC-E, DC-R）
//     即視為新 instance 開始
//   - 直到下一個 ORDER_TYPES 或藥品資訊區塊結束
//
// -------------------------------------------------------------------------------------------------
// 三、instance 內部解析
// -------------------------------------------------------------------------------------------------
// 每個 instance 可能包含多行（藥名換行、備註多行）
//
// Step 1) 主列偵測（只做一次）
//   - 從 instance 第一行開始往下 merge
//   - 若尚未同時包含：DOSE + SIG + ROUTE，則繼續併下一行
//   - 最多合併 3 行（護欄 B），超過視為解析失敗
//   - 第一次同時滿足 DOSE + SIG + ROUTE 的 merged 行，即為「主列」
//
// 護欄 A：
//   - 主列必須以 ORDER_TYPES 開頭（instance 的第一 token）
//   - ROUTE 必須落在字串後半段（避免 note 短句誤判）
//
// Step 2) 主列以外行
//   - 全部視為 note
//   - 壓平成單行
//
// -------------------------------------------------------------------------------------------------
// 四、主列欄位抽取（由右至左剝離）
// -------------------------------------------------------------------------------------------------
// 解析順序（穩定度由右至左）：
//  4c1) 最右側 ROUTE（必定存在）
//  4c1a) ROUTE 右側：
//        - 若符合 QTY (?PC 或 ?天) → 視為數量
//        - 若無 QTY → 剩餘視為流速（可空）
//        - QTY 右側全部歸入 note
//  4c2) ROUTE 左側：
//        - 找最右側 SIG（必定存在；先做黏字修復）
//        - SIG 右側找 TIMING（可空）
//        - SIG 左側找最右側 DOSE：((可分數/小數/0) + 單位) 或 QS（例外）
//        - DOSE 左側（扣除 ORDER_TYPES）即為藥名
//
// -------------------------------------------------------------------------------------------------
// 五、黏字修復（主列解析前）
// -------------------------------------------------------------------------------------------------
// 拆解常見黏字：
//   - 110MGQ6H → 110MG Q6H
//   - Q6HPC → Q6H PC
//   - 0.21MGIRRE → 0.21MG IRRE
//
// -------------------------------------------------------------------------------------------------
// 六、MEDICATION RENEW 全域隱性停止（你原版規格保留）
// -------------------------------------------------------------------------------------------------
// 以 banner 區塊（@@@@@@@@ MEDICATION RENEW @@@@@@@@）包住的區塊為準：
//   - 在 renew 區塊內遇到「列印時間」header → 產生 kind="RENEW" event
//   - instances 建立時遇到 kind="RENEW" event → 對所有 open 且 plannedEnd > renewTime 的 instance：
//        actualEnd = renewTime，matchLevel="implicitRenew"
//
// ONGOING 定義：相對於最後列印時間 lastPrintTime
//   - 無 actualEnd：
//       plannedEnd <= lastPrintTime → 自然結束(end=plannedEnd)
//       plannedEnd >  lastPrintTime → ONGOING(end=null)
//
// 同分鐘排序：STOP(DC*) → RENEW(trigger) → START
//
// -------------------------------------------------------------------------------------------------
// 七、Debug 指標（UI 顯示）
// -------------------------------------------------------------------------------------------------
// 每筆 instance（START/STOP）保留：
//   - mainLineUsedLines（主列由幾行 merge 成功）
//   - mainLine（主列內容）
//   - noteLineCount（note 行數）
//   - parseConfidence
// 解析失敗 instance 額外列在 Debug 區塊供人工核對
//
// =================================================================================================

const TOOL_KEY = "medorders";

// ------------------------------
// ORDER TYPES
// ------------------------------
const START_TYPES = new Set(["NEW", "CHG", "PREP", "REN", "EXTN", "St"]);
const STOP_TYPES = new Set(["DC-C", "DC-D", "DC-E", "DC-R"]);
const ORDER_TYPES = new Set([...START_TYPES, ...STOP_TYPES]);

const ORDER_TYPE_RE = /^\s*(NEW|CHG|PREP|REN|EXTN|St|DC-C|DC-D|DC-E|DC-R)\b/;

// ------------------------------
// ROUTE / SIG / TIMING
// ------------------------------
const ROUTE_MAP = {
  AD: "AD",
  AS: "AS",
  AU: "AU",
  BUCC: "BUCC",
  ENEM: "ENEM",
  EPID: "EPID",
  GARG: "GARG",
  IA: "IA",
  ID: "ID",
  IDF: "IDF",
  IL: "IL",
  IM: "IM",
  IMP: "IMP",
  INHA: "INHA",
  IP: "IP",
  IRRI: "IRRI",
  IS: "IS",
  ISB: "ISB",
  ISL: "ISL",
  ISR: "ISR",
  IT: "IT",
  ITV: "ITV",
  IV: "IV",
  IVD: "IVD",
  IVE: "IVE",
  IVF: "IVF",
  LOC: "LOC",
  NASA: "NASA",
  OD: "OD",
  OS: "OS",
  OTHE: "OTHE",
  OU: "OU",
  PO: "PO",
  RECT: "RECT",
  SC: "SC",
  SL: "SL",
  SPRA: "SPRA",
  SUB: "SUB",
  TOPI: "TOPI",
  VAG: "VAG",
  WETT: "WETT",
};

const SIG_MAP = {
  Q1H: "Q1H",
  Q2H: "Q2H",
  Q3H: "Q3H",
  Q4H: "Q4H",
  Q6H: "Q6H",
  Q8H: "Q8H",
  Q12H: "Q12H",

  QD: "QD",
  BID: "BID",
  TID: "TID",
  QID: "QID",

  QN: "QN",
  QAM: "QAM",
  QPM: "QPM",

  HS: "HS",
  CM: "CM",
  CMHS: "CMHS",
  AMHS: "AMHS",
  PMHS: "PMHS",

  QW: "QW",
  Q2W: "Q2W",
  Q3W: "Q3W",
  Q4W: "Q4W",
  BIW: "BIW",
  TIW: "TIW",

  QM: "QM",
  Q3M: "Q3M",
  Q6M: "Q6M",

  Q3D: "Q3D",
  Q4D: "Q4D",
  Q5D: "Q5D",
  QOD: "QOD",

  Q8W: "Q8W",
  QON: "QON",
  QOW: "QOW",

  ONCE: "ONCE",
  STAT: "STAT",
  PRN: "PRN",
  IRRE: "IRRE",
};

const TIMING_MAP = {
  AC: "AC",
  PC: "PC",
  CC: "CC",
};

// dose units (expandable)
const DOSE_UNITS = ["MG", "MCG", "G", "IU", "U", "UN", "MU", "ML", "PC", "PK", "PU", "GT", "PI", "AMP", "VIAL", "TAB", "CAP", "BOT", "BAG"];


// 自備藥特殊處理：同藥名但不同劑型（針劑、水劑、外用、口服）不視為同種藥（避免誤配對）
const SELF_MED_NAMES = new Set(["自備藥針劑", "自備藥水劑", "自備藥外用", "自備藥口服者"]);


// ------------------------------
// MATCH POLICY (keep your original)
// ------------------------------
const MATCH_POLICY = {
  requireQtyClassInStrict: false,
  enableFallbackA: true,
  enableFallbackB: true,
  rescueUnmatchedDc: true,
};

// ------------------------------
// utils
// ------------------------------
function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmtMD(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function fmtYMDHM(d) {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}
function parseTaipeiDateTime(s) {
  const m = String(s).match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  return new Date(y, mo, d, hh, mm, 0, 0);
}
function addDays(dateObj, days) {
  const d = new Date(dateObj.getTime());
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function normalizeText(s) {
  return String(s ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function normalizeRoute(routeRaw) {
  const r = String(routeRaw || "").trim();
  return ROUTE_MAP[r] || r || "UNK";
}
function qtyToPlannedDays(qtyRaw) {
  const s = String(qtyRaw || "").trim();
  const m = s.match(/^(\d+)\s*天$/);
  if (m) return Math.max(1, Number(m[1]));
  // 沒寫天（含 ?PC 或空白）→ 當天消滅
  return 0;
}
function qtyClass(qtyRaw) {
  const s = String(qtyRaw || "").trim();
  return /^\d+\s*天$/.test(s) ? "DAY" : "NONDAY";
}
function isOrderStartLine(line) {
  return ORDER_TYPE_RE.test(line || "");
}

// ------------------------------
// 自備藥清單 + 從 note 取藥名的 helper
// ------------------------------
function extractNameFromSelfMedNote(noteRaw) {
  const s = String(noteRaw || "").trim();
  if (!s) return "";

  // 先優先抓第一個括號內容，例如 "(omegaven)"、"(優寶滴)"
  const m1 = s.match(/[（(]\s*([^)）]{1,80})\s*[)）]/);
  if (m1) return m1[1].trim();

  // 沒括號就取前 80 字（去掉 UA LINE: 這類前綴）
  const s2 = s.replace(/^UA\s*LINE\s*:/i, "").trim();
  return s2.slice(0, 80).trim();
}

// ------------------------------
// 同種藥歸一（保留你原本）
// ------------------------------
function normalizeDrugGroup(drugNameRaw) {
  let s0 = String(drugNameRaw || "").replace(/\s+/g, " ").trim();
  if (!s0) return { key: "", display: "" };

  // 1) 如果是 "(xxx)/vial" 這種，把括號內當主體；把括號後包裝尾巴保留在後面再清
  //    例如: "(Amoxycillin 1000mg+Clavulanic acid 200mg)/vial"
  const mParenLead = s0.match(/^\(([^)]+)\)\s*(.*)$/);
  let s = mParenLead ? `${mParenLead[1]} ${mParenLead[2]}` : s0;

  // 2) 移除「品牌/廠牌/備註」括號（但不再把一開始那種主成分括號整個刪掉）
  //    例如: "(Pipe & Tazo, 中化)" 這種
  s = s.replace(/\(([^)]+)\)/g, (full, inside) => {
    // 如果括號內含明顯強度/單位，視為成分資訊→保留內容
    if (/\d/.test(inside) && /(mg|mcg|g|iu|u|mu|ml|%|meq)/i.test(inside)) return ` ${inside} `;
    // 否則多半是廠牌或註記→拿掉
    return " ";
  });

  // 3) 移除包裝/劑型尾巴（/vial, /amp, /bag, /bot...），避免干擾
  s = s.replace(/\/\s*(vial|amp|bag|bot|tab|cap|syr|bottle|btl)\b/gi, " ");

  // 4) 移除強度/濃度/容量資訊：
  //    - 1000mg, 0.25g, 25,000u, 5mL, 0.45%, 077mEq/mL, 24mg/mL, 60mL
  //    - 允許逗號千分位、分數、mg/kg、mg/ml 等
  s = s
    // 千分位逗號先去掉（25,000u → 25000u）
    .replace(/(\d),(\d)/g, "$1$2")
    // 去掉像 "077mEq/mL" "24mg/mL" "25mg/kg" 這種（含斜線單位）
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu|u|mu|ml|meq|%)(?:\s*\/\s*[a-z]+)?\b/gi, " ")
    // 去掉純數字+單位（含分數）
    .replace(/\b(?:\d+(?:\.\d+)?|\d+\/\d+)\s*(?:mg|mcg|g|iu|u|mu|ml|meq|%|mmol|mol)\b/gi, " ")
    // 去掉單獨的數字（避免剩餘 2、0.25 之類）
    .replace(/\b\d+(?:\.\d+)?\b/g, " ");

  // 5) 把連接符號正規化：+ , / & 等 → 空白（保留組合藥兩邊文字）
  s = s.replace(/[+,/&]/g, " ");

  // 6) 清理多餘符號與空白
  s = s.replace(/[\[\]{}]/g, " ").replace(/\s+/g, " ").trim();

  // 7) token 化：保留最多 6 個詞（避免太長），不再用遇到數字就 break
  const toks = s.split(" ").filter(Boolean);
  const keep = toks.slice(0, 6);

  const display = keep.join(" ").trim();
  const key = display.toLowerCase();

  return { key, display };
}

// ------------------------------
// Token regex helpers
// ------------------------------
function buildTokenReFromMap(mapObj) {
  const keys = Object.keys(mapObj)
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?:^|\\s)(${keys.join("|")})(?=\\s|$)`, "g");
}

const ROUTE_TOKEN_RE = buildTokenReFromMap(ROUTE_MAP);
const SIG_TOKEN_RE = buildTokenReFromMap(SIG_MAP);
const TIMING_TOKEN_RE = buildTokenReFromMap(TIMING_MAP);

const DOSE_UNIT_RE = new RegExp(
  `(?:${DOSE_UNITS.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "i"
);

const DOSE_RE = new RegExp(
  String.raw`(?:^|\s)(QS|(?:(?:\d+(?:\.\d+)?)|(?:\d+\/\d+))\s*${DOSE_UNIT_RE.source})(?=\s|$)`,
  "ig"
);

const QTY_RE = /(?:^|\s)(\d+\s*(?:PC|天))(?=\s|$)/i;

function lastTokenMatch(re, s) {
  re.lastIndex = 0;
  let m;
  let last = null;
  while ((m = re.exec(s))) last = { index: m.index, text: m[1] };
  return last;
}
function firstTokenMatch(re, s) {
  re.lastIndex = 0;
  const m = re.exec(s);
  return m ? { index: m.index, text: m[1] } : null;
}

function preNormalizeGlueMainLine(s) {
  let x = String(s || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

  const sigKeys = Object.keys(SIG_MAP)
    .slice()
    .sort((a, b) => b.length - a.length)
    .join("|");
  const unitKeys = DOSE_UNITS.slice().sort((a, b) => b.length - a.length).join("|");
  const timingKeys = Object.keys(TIMING_MAP)
    .slice()
    .sort((a, b) => b.length - a.length)
    .join("|");

  // unit + SIG
  x = x.replace(new RegExp(`(${unitKeys})(?=(${sigKeys}))`, "ig"), "$1 ");
  // SIG + TIMING
  x = x.replace(new RegExp(`(${sigKeys})(?=(${timingKeys}))`, "ig"), "$1 ");
  // number+unit + SIG
  x = x.replace(
    new RegExp(`((?:\\d+(?:\\.\\d+)?|\\d+\\/\\d+)\\s*(?:${unitKeys}))(?=(${sigKeys}))`, "ig"),
    "$1 "
  );

  return x.replace(/\s+/g, " ").trim();
}

function containsRoute(s) {
  return !!lastTokenMatch(ROUTE_TOKEN_RE, s);
}
function containsSig(s) {
  return !!lastTokenMatch(SIG_TOKEN_RE, s);
}
function containsDose(s) {
  DOSE_RE.lastIndex = 0;
  return DOSE_RE.test(s);
}
function routeInRightHalf(s) {
  const hit = lastTokenMatch(ROUTE_TOKEN_RE, s);
  if (!hit) return false;
  return hit.index >= Math.floor(String(s).length * 0.4);
}

function extractOrderType(s) {
  const m = String(s || "").trim().match(/^(NEW|CHG|PREP|REN|EXTN|St|DC-C|DC-D|DC-E|DC-R)\b/);
  return m ? m[1] : "";
}
function removeLeadingType(s) {
  return String(s || "")
    .trim()
    .replace(/^(NEW|CHG|PREP|REN|EXTN|St|DC-C|DC-D|DC-E|DC-R)\b\s*/, "");
}

function extractLastDoseWithSpan(s) {
  const str = String(s || "");
  DOSE_RE.lastIndex = 0;
  const all = Array.from(str.matchAll(DOSE_RE));
  if (!all.length) return null;
  const last = all[all.length - 1];
  const doseText = String(last[1] || "").replace(/\s+/g, " ").trim();
  const start = last.index;
  const full = last[0];
  const rel = full.toLowerCase().indexOf(doseText.toLowerCase());
  const capStart = rel >= 0 ? start + rel : start;
  const capEnd = capStart + doseText.length;
  return { dose: doseText.toUpperCase(), start: capStart, end: capEnd };
}

// ------------------------------
// 主列：右到左剝離
// ------------------------------
function parseMainLineRightToLeft(mainLine) {
  const flat0 = preNormalizeGlueMainLine(mainLine);

  const type = extractOrderType(flat0);
  if (!type) return null;

  const rest = removeLeadingType(flat0);

  // ROUTE (last)
  const routeHit = lastTokenMatch(ROUTE_TOKEN_RE, rest);
  if (!routeHit) return null;
  const routeRaw = routeHit.text;
  const routeNorm = normalizeRoute(routeRaw);

  const leftOfRoute = rest.slice(0, routeHit.index).trim();
  const rightOfRoute = rest.slice(routeHit.index + routeRaw.length).trim();

  // route right: qty + rate + tailNote
  let qtyRaw = "";
  let rateRaw = "";
  let tailNoteRaw = "";

  const qtyM = rightOfRoute.match(QTY_RE);
  if (qtyM) {
    qtyRaw = qtyM[1].replace(/\s+/g, " ").trim();
    const pos = rightOfRoute.toLowerCase().indexOf(qtyM[0].toLowerCase());
    const beforeQty = rightOfRoute.slice(0, pos).trim();
    const afterQty = rightOfRoute.slice(pos + qtyM[0].length).trim();
    rateRaw = beforeQty;
    tailNoteRaw = afterQty;
  } else {
    rateRaw = rightOfRoute.trim();
    tailNoteRaw = "";
  }

  // SIG (last)
  const sigHit = lastTokenMatch(SIG_TOKEN_RE, leftOfRoute);
  if (!sigHit) return null;
  const sigRaw = sigHit.text.toUpperCase();

  const leftOfSig = leftOfRoute.slice(0, sigHit.index).trim();
  const rightOfSig = leftOfRoute.slice(sigHit.index + sigRaw.length).trim();

  // TIMING optional
  let timingRaw = "";
  const timingHit = firstTokenMatch(TIMING_TOKEN_RE, rightOfSig);
  if (timingHit) timingRaw = timingHit.text.toUpperCase();

  // DOSE (last on leftOfSig)
  const doseHit = extractLastDoseWithSpan(leftOfSig);
  if (!doseHit) return null;
  const doseRaw = doseHit.dose;

  // drug name: before dose span
  const drugNameRaw = leftOfSig.slice(0, doseHit.start).trim();

  return {
    type,
    drugNameRaw,
    doseRaw,
    sigRaw,
    timingRaw,
    routeRaw,
    routeNorm,
    qtyRaw,
    rateRaw: rateRaw || "",
    tailNoteRaw: tailNoteRaw || "",
    rawLine: flat0,
  };
}

// ------------------------------
// instance block：主列偵測 + note 隔離 + debug
// ------------------------------
function parseInstanceBlock(instanceLines) {
  const lines = (instanceLines || []).map((l) => String(l ?? "").replace(/\r/g, ""));

  let merged = "";
  let used = 0;
  let mainLine = "";

  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const add = lines[i].trim();
    if (!add) continue;
    merged = (merged ? merged + " " : "") + add;
    used = i + 1;

    // ★關鍵：先做黏字修復再判斷 DOSE/SIG/ROUTE
    const mergedNorm = preNormalizeGlueMainLine(merged);

    if (
      isOrderStartLine(mergedNorm) &&
      containsDose(mergedNorm) &&
      containsSig(mergedNorm) &&
      containsRoute(mergedNorm) &&
      routeInRightHalf(mergedNorm)
    ) {
      mainLine = mergedNorm; // ★直接存 normalize 後的主列
      break;
    }
    
  }

  if (!mainLine) return null;

  const noteLines = lines.slice(used).map((x) => x.trim()).filter(Boolean);
  const noteFlatten = noteLines.join(" ").replace(/\s+/g, " ").trim();

  const fields = parseMainLineRightToLeft(mainLine);
  if (!fields) return null;

  // qty 後面一律歸 note：把主列內 tailNote 合併進 note
  const noteRaw = [fields.tailNoteRaw, noteFlatten].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  // confidence（簡單版）
  let conf = "high";
  if (!fields.qtyRaw) conf = "normal";
  if (!fields.timingRaw) conf = conf === "high" ? "normal" : conf;

  return {
    ...fields,
    noteRaw,
    debug: {
      mainLineUsedLines: used,
      mainLine: mainLine, // mainLine 已是 normalize 後
      noteLineCount: noteLines.length,
      parseConfidence: conf,
    },
  };
}

// ------------------------------
// Extract events (state machine + instance blocks)
// ------------------------------
function extractEventsFromText(text) {
  const lines = String(text || "").replace(/\u00A0/g, " ").split("\n");

  let currentTime = null;
  let inMedTable = false;

  // renew banner toggle
  let inRenewBlock = false;

  // instance buffer
  let pendingInstanceLines = [];

  const events = [];
  const parseFailures = [];

  function isRenewBanner(line) {
    return /MEDICATION\s+RENEW/i.test(line) && /@{10,}/.test(line);
  }

  function flushInstance() {
    if (!pendingInstanceLines.length) return;

    const rawBlock = pendingInstanceLines.slice();
    pendingInstanceLines = [];

    if (!currentTime) {
      parseFailures.push({
        t: null,
        reason: "missingPrintTime",
        lines: rawBlock,
      });
      return;
    }

    const parsed = parseInstanceBlock(rawBlock);
    if (!parsed) {
      parseFailures.push({
        t: currentTime,
        reason: "parseInstanceBlockFailed",
        lines: rawBlock,
      });
      return;
    }

    const type = parsed.type;
    const isStop = STOP_TYPES.has(type);
    const isStart = START_TYPES.has(type);

    const routeNorm = parsed.routeNorm;
    const plannedDays = isStart ? qtyToPlannedDays(parsed.qtyRaw) : null;

    // ★同藥名但不同劑型（針劑、水劑、外用、口服）不視為同種藥（避免誤配對）
    let drugNameRaw = parsed.drugNameRaw;
    if (SELF_MED_NAMES.has(drugNameRaw)) {  // ★自備藥：藥名 = 備註
      const fromNote = extractNameFromSelfMedNote(parsed.noteRaw);
      if (fromNote) drugNameRaw = drugNameRaw + "-" + fromNote;  
    }
    const drugGroup = normalizeDrugGroup(drugNameRaw);

    events.push({
      t: currentTime,
      kind: isStop ? "STOP" : "START",
      actionType: type,

      drugNameRaw: drugNameRaw, // ★藥名：主列剝離後的藥名（自備藥特殊處理）
      doseRaw: parsed.doseRaw,
      sigRaw: parsed.sigRaw,
      timingRaw: parsed.timingRaw,
      routeRaw: parsed.routeRaw,
      routeNorm,
      qtyRaw: parsed.qtyRaw,
      rateRaw: parsed.rateRaw,
      noteRaw: parsed.noteRaw,

      plannedDays,
      plannedEnd: isStart ? addDays(currentTime, plannedDays) : null,

      drugGroupKey: drugGroup.key,
      drugGroupDisplay: drugGroup.display,

      rawLine: parsed.rawLine,

      _debug: parsed.debug,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    // renew banner toggle
    if (isRenewBanner(line)) {
      flushInstance();
      inRenewBlock = !inRenewBlock;
      continue;
    }

    // print time header
    const header = line.match(/\]\s*列印時間:(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2})/);
    if (header) {
      flushInstance();
      currentTime = parseTaipeiDateTime(header[1]);
      inMedTable = false;

      // renew trigger event
      if (currentTime && inRenewBlock) {
        events.push({
          t: currentTime,
          kind: "RENEW",
          actionType: "MEDICATION_RENEW",
          rawLine: "MEDICATION RENEW trigger",
        });
      }
      continue;
    }

    // enter med table (state machine)
    if (line.includes("類別") && line.includes("藥品名稱") && line.includes("劑量") && line.includes("用法") && line.includes("途徑")) {
      flushInstance();
      inMedTable = true;
      continue;
    }

    // leave med table
    if (inMedTable && /醫師:\s*.*\(/.test(line)) {
      flushInstance();
      inMedTable = false;
      continue;
    }

    // optional additional leave condition (keep)
    if (inMedTable && line.includes("類別") && line.includes("醫囑名稱")) {
      flushInstance();
      inMedTable = false;
      continue;
    }

    if (!inMedTable) continue;

    // instance start
    if (isOrderStartLine(line)) {
      flushInstance();
      pendingInstanceLines = [line.trimEnd()];
      continue;
    }

    // instance continuation
    if (pendingInstanceLines.length) {
      if (!line.trim()) continue; // ignore blank lines in table
      pendingInstanceLines.push(line);
      continue;
    }
  }

  flushInstance();

  // sort: STOP -> RENEW -> START at same minute
  events.sort((a, b) => {
    const ta = a.t ? a.t.getTime() : 0;
    const tb = b.t ? b.t.getTime() : 0;
    if (ta !== tb) return ta - tb;

    const order = { STOP: 0, RENEW: 1, START: 2 };
    const oa = order[a.kind] ?? 9;
    const ob = order[b.kind] ?? 9;
    return oa - ob;
  });

  return { events, parseFailures };
}

// ------------------------------
// DC 回溯配對 keys（保留你原本）
// ------------------------------
function makeKeys(ev) {
  const drugNameNorm = normalizeText(ev.drugNameRaw);
  const doseNorm = normalizeText(ev.doseRaw);
  const sigNorm = normalizeText(ev.sigRaw);
  const timingNorm = normalizeText(ev.timingRaw);
  const routeNorm = normalizeText(ev.routeNorm);
  const rateNorm = normalizeText(ev.rateRaw);
  const noteNorm = normalizeText(ev.noteRaw);
  const qtyClassNorm = qtyClass(ev.qtyRaw);

  const strictBase = [drugNameNorm, doseNorm, sigNorm, timingNorm, routeNorm];
  const strictKey = MATCH_POLICY.requireQtyClassInStrict
    ? [...strictBase, qtyClassNorm, rateNorm, noteNorm].join("|")
    : [...strictBase, rateNorm, noteNorm].join("|");

  const fallbackA = [...strictBase].join("|");
  const fallbackB = [normalizeText(ev.drugGroupKey), routeNorm].join("|");

  return { strictKey, fallbackA, fallbackB };
}

// ------------------------------
// MEDICATION RENEW 全域隱性停止（保留你原本）
// ------------------------------
function implicitStopByRenew(rows, renewTime) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r.actualEnd) continue;
    if (!r.plannedEnd) continue;
    if (!r.printTime) continue;

    if (r.printTime.getTime() >= renewTime.getTime()) continue;
    if (r.plannedEnd.getTime() <= renewTime.getTime()) continue;

    r.actualEnd = renewTime;
    r.matchLevel = "implicitRenew";
    r.matchedByTime = renewTime;
  }
}

// ------------------------------
// Instances 建立（保留你原本，但加入 debug）
// ------------------------------
function buildOrderInstances(events) {
  const rows = [];
  const unmatchedDc = [];

  for (const ev of events) {
    if (ev.kind === "STOP") {
      const dcKeys = makeKeys(ev);

      let matchedIdx = -1;
      let matchedLevel = null;

      // strict
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        if (r.actualEnd) continue;
        if (r.keys.strictKey === dcKeys.strictKey) {
          matchedIdx = i;
          matchedLevel = "strict";
          break;
        }
      }

      // fallbackA
      if (matchedIdx < 0 && MATCH_POLICY.enableFallbackA) {
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i];
          if (r.actualEnd) continue;
          if (r.keys.fallbackA === dcKeys.fallbackA) {
            matchedIdx = i;
            matchedLevel = "fallbackA";
            break;
          }
        }
      }

      // fallbackB
      if (matchedIdx < 0 && MATCH_POLICY.enableFallbackB) {
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i];
          if (r.actualEnd) continue;
          if (r.keys.fallbackB === dcKeys.fallbackB) {
            matchedIdx = i;
            matchedLevel = "fallbackB";
            break;
          }
        }
      }

      if (matchedIdx >= 0) {
        const row = rows[matchedIdx];
        row.actualEnd = ev.t;
        row.matchLevel = matchedLevel;
        row.matchedByTime = ev.t;
      } else {
        unmatchedDc.push(ev);

        if (MATCH_POLICY.rescueUnmatchedDc) {
          const dg = normalizeDrugGroup(ev.drugNameRaw);
          rows.push({
            actionType: "RESCUE",
            drugNameRaw: ev.drugNameRaw,
            doseRaw: ev.doseRaw,
            sigRaw: ev.sigRaw,
            timingRaw: ev.timingRaw,
            routeRaw: ev.routeRaw,
            routeNorm: ev.routeNorm,
            qtyRaw: ev.qtyRaw,
            plannedDays: null,
            plannedEnd: null,
            rateRaw: ev.rateRaw,
            noteRaw: ev.noteRaw,
            printTime: null,
            actualEnd: ev.t,

            drugGroupKey: dg.key,
            drugGroupDisplay: dg.display,

            keys: makeKeys({ ...ev, drugGroupKey: dg.key }),

            rawLine: `RESCUE from unmatched DC: ${ev.rawLine || ""}`,
            matchLevel: "rescue",
            matchedByTime: ev.t,

            isRescue: true,
            debug: null,
          });
        }
      }

      continue;
    }

    if (ev.kind === "RENEW") {
      implicitStopByRenew(rows, ev.t);
      continue;
    }

    // START
    if (ev.kind === "START") {
      rows.push({
        actionType: ev.actionType,
        drugNameRaw: ev.drugNameRaw,
        doseRaw: ev.doseRaw,
        sigRaw: ev.sigRaw,
        timingRaw: ev.timingRaw,
        routeRaw: ev.routeRaw,
        routeNorm: ev.routeNorm,
        qtyRaw: ev.qtyRaw,
        plannedDays: ev.plannedDays,
        plannedEnd: ev.plannedEnd,
        rateRaw: ev.rateRaw,
        noteRaw: ev.noteRaw,
        printTime: ev.t,
        actualEnd: null,

        drugGroupKey: ev.drugGroupKey,
        drugGroupDisplay: ev.drugGroupDisplay,

        keys: makeKeys(ev),

        rawLine: ev.rawLine,
        matchLevel: null,
        matchedByTime: null,

        isRescue: false,

        debug: ev._debug || null,
      });
    }
  }

  return { rows, unmatchedDc };
}

// ------------------------------
// end 決策（保留你原本）
// ------------------------------
function computeIntervalEndForGroup(sortedInstances, lastPrintTime) {
  const out = [];
  for (const r of sortedInstances) {
    const start = r.printTime || null;

    if (r.actualEnd) {
      out.push({ start, end: r.actualEnd, endType: "DC/IMPLICIT", sources: [r] });
      continue;
    }

    const pe = r.plannedEnd || null;

    if (!lastPrintTime) {
      out.push({ start, end: null, endType: "ONGOING", sources: [r] });
      continue;
    }

    if (pe && pe.getTime() <= lastPrintTime.getTime()) {
      out.push({ start, end: pe, endType: "PLANNED", sources: [r] });
    } else {
      out.push({ start, end: null, endType: "ONGOING", sources: [r] });
    }
  }

  return out;
}

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const arr = intervals
    .slice()
    .sort((a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity));

  const out = [];
  for (const it of arr) {
    const last = out[out.length - 1];
    if (!last) {
      out.push({ ...it });
      continue;
    }

    // conservative: any null start/end => no merge
    if (!last.start || !last.end || !it.start || !it.end) {
      out.push({ ...it });
      continue;
    }

    const lastEnd = last.end.getTime();
    const curStart = it.start.getTime();

    if (lastEnd >= curStart) {
      if (it.end.getTime() > last.end.getTime()) last.end = it.end;
      last.sources = (last.sources || []).concat(it.sources || []);
    } else {
      out.push({ ...it });
    }
  }
  return out;
}

function aggregateByDrugAndRoute(rows, lastPrintTime) {
  const groupMap = new Map(); // drugKey||route -> instances[]
  const drugMeta = new Map();

  for (const r of rows) {
    const drugKey = r.drugGroupKey || "";
    const route = r.routeNorm || "UNK";
    if (!drugKey) continue;

    drugMeta.set(drugKey, r.drugGroupDisplay || drugKey);

    const key = `${drugKey}||${route}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(r);
  }

  const byDrug = new Map();

  for (const [key, instances] of groupMap.entries()) {
    const [drugKey, route] = key.split("||");
    const display = drugMeta.get(drugKey) || drugKey;

    if (!byDrug.has(drugKey)) {
      byDrug.set(drugKey, { drugKey, drugDisplay: display, routes: new Map(), instances: [] });
    }

    const sorted = instances.slice().sort((a, b) => {
      const ta = a.printTime ? a.printTime.getTime() : Infinity;
      const tb = b.printTime ? b.printTime.getTime() : Infinity;
      return ta - tb;
    });

    const rawIntervals = computeIntervalEndForGroup(sorted, lastPrintTime);
    const merged = mergeIntervals(rawIntervals);

    byDrug.get(drugKey).routes.set(route, merged);
  }

  // attach instances for debug
  const grouped = Array.from(byDrug.values());
  const idx = new Map(grouped.map((g) => [g.drugKey, g]));
  for (const r of rows) {
    const g = idx.get(r.drugGroupKey);
    if (g) g.instances.push(r);
  }
  for (const g of grouped) {
    g.instances.sort((a, b) => (a.printTime?.getTime() ?? Infinity) - (b.printTime?.getTime() ?? Infinity));
  }

  return grouped.sort((a, b) => a.drugDisplay.localeCompare(b.drugDisplay, "zh-Hant"));
}

// ------------------------------
// UI helpers
// ------------------------------
function debounce(fn, ms = 250) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
function bindCopy(root) {
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest(".copy-item");
    if (!btn) return;
    const text = btn.getAttribute("data-copy") || btn.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      const old = btn.textContent;
      btn.textContent = "Copied";
      btn.classList.add("neo-copied");
      window.setTimeout(() => {
        btn.textContent = old;
        btn.classList.remove("neo-copied");
      }, 650);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      document.body.removeChild(ta);
    }
  });
}
function intervalLabel(itv) {
  const s = itv.start ? fmtMD(itv.start) : "?";
  const e = itv.end ? fmtMD(itv.end) : "ONGOING";
  return `${s}-${e}`;
}
function makeSummaryLine(drug, route, itv) {
  return `${drug} ${route} ${intervalLabel(itv)}`;
}

// ------------------------------
// Render results (debug UI improved)
// ------------------------------
function renderResults(root, state) {
  const meta = root.querySelector('[data-role="parse_meta"]');
  const list = root.querySelector('[data-role="result_list"]');
  const debugTop = root.querySelector('[data-role="debug_area"]');
  const dbgOn = !!state.debug;

  const q = String(state.query || "").trim().toLowerCase();

  if (!state.agg.length && !state.rows.length) {
    meta.textContent = "";
    debugTop.innerHTML = "";
    list.innerHTML = `
      <div class="neo-muted small py-2">
        尚未解析到藥品表格。請把整段含「列印時間」與「類別 藥品名稱 … 途徑」貼上。
      </div>
    `;
    return;
  }

  const filtered = !q
    ? state.agg
    : state.agg.filter((d) => d.drugDisplay.toLowerCase().includes(q) || d.drugKey.includes(q));

  const totalRoutes = filtered.reduce((acc, d) => acc + d.routes.size, 0);
  const lastPT = state.lastPrintTime ? fmtYMDHM(state.lastPrintTime) : "—";

  meta.textContent = `instances: ${state.rows.length}｜藥品: ${filtered.length}｜route groups: ${totalRoutes}｜unmatched DC: ${
    state.unmatchedDc.length
  }｜parse failed: ${state.parseFailures.length}｜lastPrint: ${lastPT}｜debug: ${dbgOn ? "ON" : "OFF"}`;

  const failuresBlock =
    dbgOn && state.parseFailures.length
      ? `
    <div class="neo-unmatched mt-2">
      <div class="neo-muted small mb-1">Parse Failures（主列合併≤3行仍無法找到 DOSE+SIG+ROUTE 或剝離失敗）：</div>
      <div class="neo-kbd small">
        ${state.parseFailures
          .slice(0, 20)
          .map((f, idx) => {
            const t = f.t ? fmtYMDHM(f.t) : "?";
            const head = escapeHtml(`${idx + 1}. ${t} [${f.reason}]`);
            const body = escapeHtml((f.lines || []).slice(0, 6).join(" ⏎ "));
            const more = (f.lines || []).length > 6 ? ` …(+${(f.lines || []).length - 6} lines)` : "";
            return `${head}<br><span class="neo-muted">${body}${escapeHtml(more)}</span>`;
          })
          .join("<br><br>")}
        ${state.parseFailures.length > 20 ? `<br><br>... (+${state.parseFailures.length - 20} more)` : ""}
      </div>
    </div>`
      : "";

  debugTop.innerHTML = dbgOn
    ? `
      <div class="small neo-muted">
        <div><b>解析策略</b>：狀態機進出藥品表格 → ORDER_TYPES 切 instance → instance 內「主列」最多合併 3 行 → 主列右到左剝離欄位；其餘行全部 note。</div>
        <div>同分鐘排序：STOP(DC*) → RENEW(trigger) → START。</div>
        <div>MEDICATION RENEW：偵測 banner 區塊；在該區塊內遇到列印時間產生 RENEW event，對 open 且 plannedEnd&gt;renewTime 的 instance 寫入 actualEnd（implicitRenew）。</div>
        <div>ONGOING：相對最後列印時間 lastPrintTime；plannedEnd ≤ lastPrintTime → 自然結束，否則 ONGOING。</div>
        <div>unmatched DC：建立 RESCUE instance（start="?"、end=DC時間）供人工核對。</div>
      </div>
      ${failuresBlock}
    `
    : "";

  const unmatchedBlock =
    dbgOn && state.unmatchedDc.length
      ? `
    <div class="neo-unmatched mt-2">
      <div class="neo-muted small mb-1">Unmatched DC（可能未貼完整或欄位差異過大）：</div>
      <div class="neo-kbd small">
        ${state.unmatchedDc
          .slice(0, 30)
          .map((dc) => `${escapeHtml(fmtYMDHM(dc.t))}  ${escapeHtml(dc.rawLine || "")}`)
          .join("<br>")}
        ${state.unmatchedDc.length > 30 ? `<br>... (+${state.unmatchedDc.length - 30} more)` : ""}
      </div>
    </div>`
      : "";

  list.innerHTML =
    unmatchedBlock +
    filtered
      .map((d) => {
        const routeRows = Array.from(d.routes.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([route, intervals]) => {
            const chips = intervals
              .map((itv) => {
                const label = intervalLabel(itv);

                const src = (itv.sources || []).slice(0, 8).map((r) => {
                  const start = r.printTime ? fmtYMDHM(r.printTime) : "?";
                  const end = r.actualEnd ? fmtYMDHM(r.actualEnd) : "—";
                  const tag = r.isRescue ? " RESCUE" : "";
                  const lvl = r.matchLevel ? ` match:${r.matchLevel}` : "";
                  const pe = r.plannedEnd ? fmtYMDHM(r.plannedEnd) : "—";
                  const dbg = r.debug
                    ? ` | mainLines:${r.debug.mainLineUsedLines} noteLines:${r.debug.noteLineCount} conf:${r.debug.parseConfidence}`
                    : "";
                  return `- ${r.actionType}${tag} ${start} → actual:${end} planned:${pe}${lvl}${dbg}`;
                });

                const more = (itv.sources || []).length > 8 ? `\n(+${(itv.sources || []).length - 8} more)` : "";
                const title = `interval: ${label}\n${src.join("\n")}${more}`;

                return `<span class="neo-chip" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
              })
              .join("");

            const copyText =
              intervals.length === 1
                ? makeSummaryLine(d.drugDisplay, route, intervals[0])
                : `${d.drugDisplay} ${route} ${intervals.map((itv) => intervalLabel(itv)).join(", ")}`;

            return `
              <div class="d-flex align-items-start gap-2 py-1">
                <div class="neo-route flex-shrink-0">${escapeHtml(route)}</div>
                <div class="flex-grow-1 d-flex flex-wrap gap-2">${chips}</div>
                <button type="button"
                  class="btn btn-sm neo-btn-outline copy-item flex-shrink-0"
                  data-copy="${escapeHtml(copyText)}"
                  title="複製摘要">
                  Copy
                </button>
              </div>
            `;
          })
          .join("");

        const details =
          dbgOn
            ? `
          <details class="mt-2">
            <summary class="small neo-muted">Debug：instances（${d.instances.length}）</summary>
            <div class="neo-kbd small mt-2">
              ${d.instances
                .map((r) => {
                  const start = r.printTime ? fmtYMDHM(r.printTime) : "?";
                  const end = r.actualEnd ? fmtYMDHM(r.actualEnd) : "—";
                  const pe = r.plannedEnd ? fmtYMDHM(r.plannedEnd) : "—";
                  const lvl = r.matchLevel ? ` match:${r.matchLevel}` : "";
                  const tag = r.isRescue ? " RESCUE" : "";
                  const dbg =
                    r.debug
                      ? `<br><span class="neo-muted">debug: mainLineUsed=${escapeHtml(
                          String(r.debug.mainLineUsedLines)
                        )} | noteLines=${escapeHtml(String(r.debug.noteLineCount))} | conf=${escapeHtml(
                          String(r.debug.parseConfidence)
                        )}</span><br><span class="neo-muted">mainLine: ${escapeHtml(r.debug.mainLine || "")}</span>`
                      : "";

                  const main = `${r.actionType}${tag} ${start} → actual:${end} planned:${pe}${lvl}`;
                  const desc = `${r.drugNameRaw} | dose:${r.doseRaw || "-"} | sig:${r.sigRaw || "-"} | timing:${
                    r.timingRaw || "-"
                  } | route:${r.routeRaw || "-"} | qty:${r.qtyRaw || "-"} | rate:${r.rateRaw || "-"}`;
                  const note = r.noteRaw ? ` | note:${r.noteRaw}` : "";
                  return `${escapeHtml(main)}<br><span class="neo-muted">${escapeHtml(desc + note)}</span>${dbg}`;
                })
                .join("<br><br>")}
            </div>
          </details>
        `
            : "";

        return `
          <div class="list-group-item neo-item">
            <div class="d-flex justify-content-between align-items-center gap-2">
                <div class="neo-drug">${escapeHtml(d.drugDisplay)}</div>
            </div>
            <div class="neo-divider"></div>
            <div class="neo-routes">
              ${routeRows || `<div class="neo-muted small">（未辨識到途徑）</div>`}
            </div>
            ${details}
          </div>
        `;
      })
      .join("");
}

// ------------------------------
// render / init
// ------------------------------
export function render() {
  return `
  <div class="container mt-2" data-tool="${TOOL_KEY}">
    <style>
      [data-tool="${TOOL_KEY}"] .card { border-radius: 14px; overflow: hidden; }
      [data-tool="${TOOL_KEY}"] .card-header { font-weight: 700; letter-spacing: .5px; }
      [data-tool="${TOOL_KEY}"] .neo-muted { color: var(--neo-muted, #777); }
      [data-tool="${TOOL_KEY}"] textarea.form-control { min-height: 220px; resize: vertical; }
      [data-tool="${TOOL_KEY}"] .neo-kbd {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
        font-size: .85rem;
      }
      [data-tool="${TOOL_KEY}"] .neo-item { border: 1px solid var(--neo-border, #dee2e6); border-radius: 12px; margin-bottom: 10px; }
      [data-tool="${TOOL_KEY}"] .neo-drug { font-weight: 700; }
      [data-tool="${TOOL_KEY}"] .neo-divider { height: 1px; background: var(--neo-border, #dee2e6); margin: 8px 0; opacity: .8; }
      [data-tool="${TOOL_KEY}"] .neo-route { width: 54px; text-align: center; font-weight: 700; color: var(--neo-text, #333); opacity: .85; }
      [data-tool="${TOOL_KEY}"] .neo-chip {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border: 1px solid var(--neo-border, #dee2e6);
        border-radius: 999px;
        background: transparent;
        font-size: .85rem;
        line-height: 1.4;
      }
      [data-tool="${TOOL_KEY}"] .neo-btn-outline {
        border: 1px solid var(--neo-border, #dee2e6);
        background: transparent;
        color: var(--neo-text, #333);
        border-radius: 999px;
      }
      [data-tool="${TOOL_KEY}"] .neo-btn-outline:hover { background: rgba(255,255,255,.45); }
      [data-tool="${TOOL_KEY}"] .neo-copied { filter: brightness(0.98); opacity: .9; }
      [data-tool="${TOOL_KEY}"] .neo-toggle { user-select: none; }
      [data-tool="${TOOL_KEY}"] .neo-unmatched { border: 1px dashed var(--neo-border, #dee2e6); border-radius: 12px; padding: 10px; }
      [data-tool="${TOOL_KEY}"] details summary { cursor: pointer; }
    </style>

    <div class="card h-100">
      <div class="card-header text-center">藥囑整理（instance-based）</div>

      <div class="card-body">
        <div class="small neo-muted mb-2">
          解析：狀態機進出藥品表格 → ORDER_TYPES 切 instance → 主列最多合併 3 行 → 主列右到左剝離；其餘行全部 note。
        </div>

        <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
          <div class="input-group">
            <span class="input-group-text" style="width: 90px; justify-content:center;">搜尋</span>
            <input class="form-control text-center" data-role="q" placeholder="輸入藥名（例如 metoclopramide）" />
            <button class="btn neo-btn-outline" type="button" data-role="clear_q" title="清除">✕</button>
          </div>

          <label class="neo-toggle small neo-muted d-flex align-items-center gap-1">
            <input type="checkbox" data-role="debug_toggle" />
            Debug
          </label>
        </div>

        <textarea class="form-control neo-kbd" data-role="src" placeholder="把列印出的醫囑整段貼在這裡…（需含列印時間與藥品表格）"></textarea>

        <div class="d-flex justify-content-between align-items-center mt-2">
          <div class="small neo-muted" data-role="parse_meta"></div>
          <div class="d-flex gap-2">
            <button type="button" class="btn neo-btn-outline btn-sm" data-role="clear_all">清空</button>
          </div>
        </div>

        <div class="mt-2" data-role="debug_area"></div>

        <div class="mt-3">
          <div class="list-group" data-role="result_list"></div>
        </div>
      </div>

      <div class="card-footer small neo-muted text-center">
        同分鐘：STOP → RENEW → START｜RENEW：banner 區塊內列印時間觸發全域隱性停止｜ONGOING：以最後列印時間判定
      </div>
    </div>
  </div>
  `;
}

export function init(root) {
  const elSrc = root.querySelector('[data-role="src"]');
  const elQ = root.querySelector('[data-role="q"]');
  const btnClearQ = root.querySelector('[data-role="clear_q"]');
  const btnClearAll = root.querySelector('[data-role="clear_all"]');
  const elDbg = root.querySelector('[data-role="debug_toggle"]');

  const state = {
    raw: "",
    query: "",
    debug: false,
    rows: [],
    unmatchedDc: [],
    agg: [],
    lastPrintTime: null,
    parseFailures: [],
  };

  function recompute() {
    const { events, parseFailures } = extractEventsFromText(state.raw);

    const lastPrintTime = events.reduce((mx, e) => (!mx || (e.t && e.t > mx) ? e.t : mx), null);

    const { rows, unmatchedDc } = buildOrderInstances(events);
    const agg = aggregateByDrugAndRoute(rows, lastPrintTime);

    state.rows = rows;
    state.unmatchedDc = unmatchedDc;
    state.agg = agg;
    state.lastPrintTime = lastPrintTime;
    state.parseFailures = parseFailures || [];

    renderResults(root, state);
  }

  const recomputeDebounced = debounce(recompute, 250);

  elSrc.addEventListener("input", () => {
    state.raw = elSrc.value || "";
    recomputeDebounced();
  });

  elQ.addEventListener("input", () => {
    state.query = elQ.value || "";
    renderResults(root, state);
  });

  btnClearQ.addEventListener("click", () => {
    elQ.value = "";
    state.query = "";
    renderResults(root, state);
    elQ.focus();
  });

  btnClearAll.addEventListener("click", () => {
    elSrc.value = "";
    elQ.value = "";
    state.raw = "";
    state.query = "";
    state.rows = [];
    state.unmatchedDc = [];
    state.agg = [];
    state.lastPrintTime = null;
    state.parseFailures = [];
    renderResults(root, state);
    elSrc.focus();
  });

  elDbg.addEventListener("change", () => {
    state.debug = !!elDbg.checked;
    renderResults(root, state);
  });

  bindCopy(root);
  renderResults(root, state);
}