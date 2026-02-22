// /tools/medorders.js
// NeoAssist Tool Module Spec v1 compliant (ES module, render()+init(), scoped by data-tool)
//
// =================================================================================================
// 藥囑整理工具：instance-based 解析 → (DC/隱性停止) 配對 → 區間彙整
// =================================================================================================
//
// 【本版修改重點】
// 1) MEDICATION RENEW 觸發「全域隱性停止」：
//    - 不是看藥品列 actionType==="REN" 觸發
//    - 而是偵測「@@@@@@@@ MEDICATION RENEW @@@@@@@@」包起來的區塊
//    - 在該區塊內遇到的「列印時間」header（例如 2025/05/09 13:08）會產生一個 kind="RENEW" event
//    - instances 建立時遇到 kind="RENEW" event → 對所有 open 且 plannedEnd > 這個時間的 instance：
//         actualEnd = 這個列印時間，matchLevel="implicitRenew"
//
// 2) ONGOING 定義：相對於「最後一筆醫囑列印時間 lastPrintTime」
//    - 無 actualEnd：
//        - plannedEnd <= lastPrintTime → 自然結束(end=plannedEnd)
//        - plannedEnd >  lastPrintTime → ONGOING(end=null)
//
// 3) 同分鐘排序：STOP(DC*) → RENEW(trigger) → START
//    - 避免同分鐘先 implicitRenew 導致 DC 配對不到
//
// =================================================================================================

// 待辦事項: 
// 補足所有途徑
// 看看是否有更好的parse方式
// (Amoxycillin 1000mg+Clavulanic acid 200m g)/vial 會被讀成 Amoxycillin
// timing 全集, SIG 全集
// timging/SIG 小心黏字 如Q6HPC
// 我覺得這個判斷邏輯好複雜 我理一下藥品都會以類別開頭，直到 1. 下個類別(為下個藥的開頭) 2. 醫師: 3. [xxxx] 列印時間: 備註都會獨立一行開始且以 ( 開頭, 以 ) 結尾數量一定會是?天 或 ?PC 或 空白途徑一定會是ROUTE全集飯前後一定會是全集或空白用法一定會是全集小心黏來年去或換行


const TOOL_KEY = "medorders";

const START_TYPES = new Set(["EXTN", "CHG", "NEW", "PREP", "REN", "St"]);
const STOP_PREFIX = "DC"; // DC, DC-D, DC-E, DC-C, DC-R ...

const ROUTE_MAP = {
  IVF: "IVF",
  IVD: "IVD",
  IV: "IV",
  IM: "IM",
  PO: "PO",
  OU: "OU",
  OTHE: "OTHE",
  TOPI: "TOPI",
  SC: "SC",
  INHA: "INHA",
  LOC: "LOC",
  ENEM: "ENEM",
};

const ROUTE_RE = new RegExp(`^(${Object.keys(ROUTE_MAP).join("|")})$`);

const SIG_PATTERN = "(Q\\d+H|Q\\d+D|QOD|QD|BID|TID|QID|HS|STAT|PRN|ONCE|CONT|IRRE)";
// 用來 parse：要有字界
const SIG_RE = new RegExp(`\\b${SIG_PATTERN}\\b`, "i");
// 用來 split 黏字：前面不要求 \\b（因為就是要抓緊貼），尾巴加邊界避免吃到更長單字
const SIG_GLUE_RE = new RegExp(`([0-9A-Za-z.%/]+)(${SIG_PATTERN})(?=\\b|$)`, "ig");

const MATCH_POLICY = {
  requireQtyClassInStrict: false,
  enableFallbackA: true,
  enableFallbackB: true,
  rescueUnmatchedDc: true,
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtMD(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtYMDHM(d) {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
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
  return 1;
}

function qtyClass(qtyRaw) {
  const s = String(qtyRaw || "").trim();
  return /^\d+\s*天$/.test(s) ? "DAY" : "NONDAY";
}

// ------------------------------
// 同種藥歸一
// ------------------------------
function normalizeDrugGroup(drugNameRaw) {
  let s0 = String(drugNameRaw || "").replace(/\s+/g, " ").trim();

  // 先嘗試移除括號內容（原本邏輯）
  let s = s0.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  
  // ★救援：如果移除括號後只剩包裝尾巴（例如 "/vial"、"/amp"），代表括號內其實是主藥名
  if (!s || /^\/(vial|amp|bot|bag|cap|tab|syr|vial\W|amp\W)/i.test(s) || s.length <= 6) {
    const m = s0.match(/^\(([^)]+)\)\s*(.*)$/); // 取出括號內 + 括號後尾巴
    if (m) {
        s = `${m[1]} ${m[2]}`.replace(/\s+/g, " ").trim();
    } else {
        s = s0; // 沒抓到就退回原字串
    }
  }

  const toks = s.split(" ").filter(Boolean);
  const keep = [];

  for (const t0 of toks) {
    const t = t0.trim();

    const allowDigitToken =
      /^k\d+$/i.test(t) ||
      (/^vitamin$/i.test(keep[keep.length - 1] || "") && /^k\d+$/i.test(t));

    if (!allowDigitToken && (/[0-9]/.test(t) || /[%/]/.test(t))) break;

    keep.push(t);
    if (keep.length >= 6) break;
  }

  const display = (keep.length ? keep.join(" ") : s).trim();
  const key = display.toLowerCase();
  return { key, display };
}

function parseEntryBuffer(bufLine, noteLines) {
  const s = String(bufLine || "").replace(/\r/g, "").trim();
  if (!s) return null;

  const parts = s.split(/\s{2,}/).map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const type = parts[0];
  const drugName = parts[1] || "";

  const routeIdx = parts.findIndex((p) => ROUTE_RE.test(p));

  let dose = "";
  let sig = "";
  let timing = "";
  let route = "";
  let qty = "";
  let rate = "";

  if (routeIdx >= 0) {
    route = parts[routeIdx] || "";
    qty = (parts[routeIdx + 1] || "").trim();
    rate = (parts[routeIdx + 2] || "").trim();

    const preStr0 = parts.slice(2, routeIdx).join(" ").replace(/\s+/g, " ").trim();

    // 修正常見黏字：0.21MGIRRE、110MGQ6H 這種（在劑量後補空白）
    const preStr = preStr0.replace(SIG_GLUE_RE, "$1 $2");

    let dose2 = "";
    let sig2 = "";
    let timing2 = "";

    // 用 SIG 當錨點：找到第一個 SIG
    const m = preStr.match(new RegExp(`^(.*?)(?:\\s+(${SIG_RE.source}))(?:\\s+(.*))?$`, "i"));
    if (m) {
    dose2 = (m[1] || "").trim();
    sig2 = (m[2] || "").trim().toUpperCase();
    timing2 = (m[3] || "").trim(); // ★ 這裡不限制 AC/PC，剩下什麼都收；可能空
    } else {
    // 找不到 SIG：退回原本的簡單切法（至少不會全空）
    const pre = preStr.split(" ").filter(Boolean);
    dose2 = (pre[0] || "").trim();
    sig2 = (pre[1] || "").trim();
    timing2 = pre.slice(2).join(" ").trim();
    }

    dose = dose2;
    sig = sig2;
    timing = timing2;

  } else {
    dose = (parts[2] || "").trim();
    sig = (parts[3] || "").trim();
    timing = (parts[4] || "").trim();
    route = (parts[5] || "").trim();
    qty = (parts[6] || "").trim();
    rate = (parts[7] || "").trim();
  }

  const note = noteLines.length ? noteLines.join(" ").replace(/\s+/g, " ").trim() : "";

  return { type, drugName, dose, sig, timing, route, qty, rate, note, rawLine: s };
}

function extractEventsFromText(text) {
  const lines = String(text || "").replace(/\u00A0/g, " ").split("\n");

  let currentTime = null;
  let inMedTable = false;

  // ★ NEW: medication renew 區塊偵測（由 banner toggle）
  let inRenewBlock = false;

  let pendingMain = "";
  let pendingNote = [];

  const events = [];

  function flushPending() {
    if (!pendingMain) return;
    const parsed = parseEntryBuffer(pendingMain, pendingNote);
    pendingMain = "";
    pendingNote = [];

    if (!parsed || !currentTime) return;

    const isStop = parsed.type === "DC" || parsed.type.startsWith("DC-") || parsed.type.startsWith(STOP_PREFIX);
    const isStart = START_TYPES.has(parsed.type);
    if (!isStop && !isStart) return;

    const routeNorm = normalizeRoute(parsed.route);
    const plannedDays = isStart ? qtyToPlannedDays(parsed.qty) : null;
    const drugGroup = normalizeDrugGroup(parsed.drugName);

    events.push({
      t: currentTime,
      kind: isStop ? "STOP" : "START",
      actionType: parsed.type,

      drugNameRaw: parsed.drugName,
      doseRaw: parsed.dose,
      sigRaw: parsed.sig,
      timingRaw: parsed.timing,
      routeRaw: parsed.route,
      routeNorm,
      qtyRaw: parsed.qty,
      rateRaw: parsed.rate,
      noteRaw: parsed.note,

      plannedDays,
      plannedEnd: isStart ? addDays(currentTime, plannedDays) : null,

      drugGroupKey: drugGroup.key,
      drugGroupDisplay: drugGroup.display,

      rawLine: parsed.rawLine,
    });
  }

  function isEntryStart(line) {
    return /^\s*(DC-\w+|DC|EXTN|CHG|NEW|PREP|REN|St)\b/.test(line);
  }

  function isRenewBanner(line) {
    // 你提供的樣式：一整排 @ + MEDICATION RENEW + 一整排 @
    // 保守：只要同時含 MEDICATION RENEW 且 @@@@ 很多，就視為 banner
    return /MEDICATION\s+RENEW/i.test(line) && /@{10,}/.test(line);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    // ★ NEW: toggle renew 區塊
    if (isRenewBanner(line)) {
      flushPending();
      inRenewBlock = !inRenewBlock;
      continue;
    }

    const header = line.match(/\]\s*列印時間:(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2})/);
    if (header) {
      flushPending();
      currentTime = parseTaipeiDateTime(header[1]);
      inMedTable = false;

      // ★ NEW: 在 renew 區塊內的列印時間 → 產生 RENEW trigger event
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

    if (line.includes("類別") && line.includes("藥品名稱") && line.includes("劑量") && line.includes("途徑")) {
      flushPending();
      inMedTable = true;
      continue;
    }

    if (inMedTable && (line.includes("類別") && line.includes("醫囑名稱"))) {
      flushPending();
      inMedTable = false;
      continue;
    }
    if (inMedTable && /醫師:/.test(line)) {
      flushPending();
      inMedTable = false;
      continue;
    }

    if (!inMedTable) continue;

    if (isEntryStart(line)) {
      flushPending();
      pendingMain = line.trimEnd();
      pendingNote = [];
      continue;
    }

    if (pendingMain && line.trim().startsWith("(")) {
      const trimmed = line.trim();

      // ★ 如果括號行其實包含欄位（例如 1PC IRRE IVF 7天），就視為主行續行
      const hasRouteToken = trimmed.split(/\s+/).some((tok) => ROUTE_RE.test(tok));
      const hasQtyLike = /\b\d+\s*天\b/.test(trimmed) || /\b\d+\s*PC\b/i.test(trimmed);
      if (hasRouteToken && hasQtyLike) {
        pendingMain += " " + trimmed;
      } else {
        pendingNote.push(trimmed);
      }
      continue;
    }
    
    if (pendingNote.length && line.trim() && !isEntryStart(line) && /^\s+/.test(line)) {
      pendingNote.push(line.trim());
      continue;
    }

    if (pendingMain && /^\s+/.test(line) && line.trim()) {
      pendingMain += " " + line.trim();
      continue;
    }

    if (!line.trim()) {
      // ★ 在藥品表格內：空白行很可能只是版面換行，不代表一筆藥結束
      if (!inMedTable) flushPending();
      continue;
    }
  }

  flushPending();

  // 排序：同分鐘 STOP → RENEW → START
  events.sort((a, b) => {
    const ta = a.t ? a.t.getTime() : 0;
    const tb = b.t ? b.t.getTime() : 0;
    if (ta !== tb) return ta - tb;

    const order = { STOP: 0, RENEW: 1, START: 2 };
    const oa = order[a.kind] ?? 9;
    const ob = order[b.kind] ?? 9;
    if (oa !== ob) return oa - ob;

    return 0;
  });

  return events;
}

// ------------------------------
// DC 回溯配對 keys
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
// MEDICATION RENEW 全域隱性停止：把「尚未到 plannedEnd」的所有 open instance 寫入 actualEnd=renewTime
// ------------------------------
function implicitStopByRenew(rows, renewTime) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r.actualEnd) continue;
    if (!r.plannedEnd) continue;
    if (!r.printTime) continue;

    // renewTime 當下之前開始的
    if (r.printTime.getTime() >= renewTime.getTime()) continue;

    // 「當下還沒到 plannedEnd」
    if (r.plannedEnd.getTime() <= renewTime.getTime()) continue;

    r.actualEnd = renewTime;
    r.matchLevel = "implicitRenew";
    r.matchedByTime = renewTime;
  }
}

// ------------------------------
// Instances 建立：單 pass（依 events 時序）
// - STOP：立即回溯配對並關掉
// - RENEW：全域隱性停止（寫 actualEnd）
// - START：建立 instance（不再因 actionType==="REN" 觸發）
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
      });
    }
  }

  return { rows, unmatchedDc };
}

// ------------------------------
// 彙整 end 決策（本版：不再用 nextStart）
// - 若有 actualEnd：end=actualEnd（含 DC/implicitRenew）
// - 無 actualEnd：以 lastPrintTime 決定是否 ONGOING
//    - plannedEnd <= lastPrintTime → end=plannedEnd（自然結束）
//    - plannedEnd >  lastPrintTime → end=null（ONGOING）
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

    // 若沒有 lastPrintTime，保守顯示 ongoing
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

    // 保守：start/end 任一為 null → 不合併
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
  // 先依 group 分桶 instances
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

    // sort instances by printTime asc; put null start at the end
    const sorted = instances.slice().sort((a, b) => {
      const ta = a.printTime ? a.printTime.getTime() : Infinity;
      const tb = b.printTime ? b.printTime.getTime() : Infinity;
      return ta - tb;
    });

    // instances → intervals with lastPrintTime-aware end logic
    const rawIntervals = computeIntervalEndForGroup(sorted, lastPrintTime);

    // merge conservatively
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
        尚未解析到藥品表格。請把整段含「列印時間」與「類別 藥品名稱 … 途徑 數量」貼上。
      </div>
    `;
    return;
  }

  const filtered = !q
    ? state.agg
    : state.agg.filter((d) => d.drugDisplay.toLowerCase().includes(q) || d.drugKey.includes(q));

  const totalRoutes = filtered.reduce((acc, d) => acc + d.routes.size, 0);

  const lastPT = state.lastPrintTime ? fmtYMDHM(state.lastPrintTime) : "—";

  meta.textContent = `instances: ${state.rows.length}｜藥品: ${filtered.length}｜route groups: ${totalRoutes}｜unmatched DC: ${state.unmatchedDc.length}｜lastPrint: ${lastPT}｜debug: ${dbgOn ? "ON" : "OFF"}`;

  debugTop.innerHTML = dbgOn
    ? `
      <div class="small neo-muted">
        <div>同分鐘排序：STOP(DC*) → <b>RENEW(trigger)</b> → START。</div>
        <div><b>MEDICATION RENEW 觸發點（本版）</b>：偵測 banner 行「MEDICATION RENEW」包住的區塊；在該區塊內遇到的「列印時間」會產生 RENEW event。</div>
        <div><b>隱性停止（本版）</b>：遇到 RENEW event 時，對所有「尚未結束且 plannedEnd &gt; RENEW時間」的 instance 直接寫入 <b>actualEnd=RENEW時間</b>（matchLevel=implicitRenew）。</div>
        <div><b>ONGOING 定義（本版）</b>：相對於最後列印時間 lastPrintTime；若 plannedEnd &le; lastPrintTime → 自然結束，否則才顯示 <b>ONGOING</b>。</div>
        <div>unmatched DC：建立 RESCUE instance（start="?"、end=DC日期）供人工核對。</div>
      </div>
    `
    : "";

  const unmatchedBlock =
    dbgOn && state.unmatchedDc.length
      ? `
    <div class="neo-unmatched mt-2">
      <div class="neo-muted small mb-1">Unmatched DC（可能未貼完整）：</div>
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
                  return `- ${r.actionType}${tag} ${start} → actual:${end} planned:${pe}${lvl}`;
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
                  const main = `${r.actionType}${tag} ${start} → actual:${end} planned:${pe}${lvl}`;
                  const desc = `${r.drugNameRaw} | dose:${r.doseRaw || "-"} | sig:${r.sigRaw || "-"} | timing:${r.timingRaw || "-"} | route:${r.routeRaw || "-"} | qty:${r.qtyRaw || "-"} | rate:${r.rateRaw || "-"}`;
                  const note = r.noteRaw ? ` | note:${r.noteRaw}` : "";
                  return `${escapeHtml(main)}<br><span class="neo-muted">${escapeHtml(desc + note)}</span>`;
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
          MEDICATION RENEW：以 banner 區塊內的「列印時間」觸發全域隱性停止（寫 actualEnd）；ONGOING 以最後列印時間為準。
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
  };

  function recompute() {
    const events = extractEventsFromText(state.raw);

    // lastPrintTime：以全文 events 的最大列印時間為準
    const lastPrintTime = events.reduce((mx, e) => (!mx || (e.t && e.t > mx) ? e.t : mx), null);

    const { rows, unmatchedDc } = buildOrderInstances(events);
    const agg = aggregateByDrugAndRoute(rows, lastPrintTime);

    state.rows = rows;
    state.unmatchedDc = unmatchedDc;
    state.agg = agg;
    state.lastPrintTime = lastPrintTime;

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