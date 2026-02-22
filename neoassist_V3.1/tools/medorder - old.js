// /tools/medorders.js
// NeoAssist Tool Module Spec v1 compliant (ES module, render()+init(), scoped by data-tool)
//
// =================================================================================================
// 藥囑整理工具：instance-based 解析 → (DC/隱性停止) 配對 → 區間彙整
// =================================================================================================
//
// 【目的】
// - 使用者貼上「列印醫囑」文字後：
//   1) 解析每一筆藥品開立（EXTN/CHG/NEW/PREP/REN/St）成獨立 instance（一筆資料）
//   2) 解析停止（DC / DC-*）並回溯配對到最合理的那筆 instance，填上 actualEnd
//   3) 將 instances 彙整為「同種藥 + 途徑」的使用區間，並提供搜尋 / Copy / Debug
//
// =================================================================================================
// A. 事件切段與解析（Input → Events）
// =================================================================================================
//
// A1. 切段時間點（列印時間）
// - 以每段抬頭的： `列印時間:YYYY/MM/DD HH:MM` 作為該段事件時間 t
// - 同一份貼文可含多段列印時間，每段的藥品表格會各自解析
//
// A2. 只解析「藥品表格」區
// - 進入藥品表格：該段內出現同一行同時包含 `類別 / 藥品名稱 / 劑量 / 途徑`
// - 離開藥品表格：遇到
//   - 下一個 `類別  醫囑名稱` 的表頭
//   - 或 `醫師:` 行
//   - 或下一個列印時間
//
// A3. 什麼會變成事件（Event）
// - START（開立）：類別為 `EXTN / CHG / NEW / PREP / REN / St` → 建立 START event
// - STOP（停藥）：類別為 `DC` 或 `DC-*` → 建立 STOP event
// - 其他類別：忽略
//
// A4. 一筆藥品行如何抽欄位
// - 用「兩個以上空白」切欄： split(/\s{2,}/)
// - 尋找途徑 token 的位置 routeIdx（IVF/IVD/IV/IM/PO/OU/OTHE/TOP/SC）
// - 依 routeIdx 推算 dose/sig/timing/route/qty/rate
// - 括號備註：後續行若以 `(` 起頭或縮排續行 → 合併成 noteRaw
//
// A5. 途徑標準化 routeNorm
// - IVF/IVD/IV → IV；其餘原樣（PO/OU/IM...）
//
// A6. 同種藥歸一 drugGroupKey（忽略劑量/濃度/包裝，保留 Vitamin K1 這類 K1 token）
// - 去括號內容、連續空白壓成一格
// - token 逐個保留，遇到「含數字/濃度/比例」的 token 多半表示進入劑量/包裝區 → 截斷
// - 例外：Vitamin K1 的 K1 要保留
//
// =================================================================================================
// B. instance 建立與 plannedEnd（Events → Instances）
// =================================================================================================
//
// B1. 每個 START event 都建立一筆 instance（獨立資料）
// instance 欄位（主要）：
// - actionType（EXTN/CHG/NEW/PREP/REN/St）
// - drugNameRaw / doseRaw / sigRaw / timingRaw / routeRaw / qtyRaw / rateRaw / noteRaw
// - printTime = 列印時間（起始）
// - actualEnd = null（先空）
// - plannedDays：
//   - qtyRaw 若為 `?天` → plannedDays = ?
//   - 否則（例如 1PC 或空白）→ plannedDays = 1
// - plannedEnd = printTime + plannedDays（預計自然結束）
//
// =================================================================================================
// C. STOP（DC）回溯配對（Instances + STOP events）
// =================================================================================================
//
// C1. 同分鐘排序規則（非常重要）
// - 先依時間 t 升序
// - 若同一分鐘：STOP(DC*) 先處理，START 後處理
//   → 你的院內習慣：「同時間 stop 先處理，start 後處理」
//   → 避免同分鐘先開新藥再 DC 把新藥關掉
//
// C2. DC 如何回溯配對
// - 只在「尚未結束的 instance（actualEnd==null）」中往回找最近的一筆
// - key 由欄位 normalize（小寫、壓空白）形成，依序嘗試：
//   1) strict：drugName + dose + sig + timing + routeNorm + rate + note
//   2) fallbackA：drugName + dose + sig + timing + routeNorm（忽略 rate/note）
//   3) fallbackB：drugGroupKey + routeNorm（最寬）
// - 配到後：instance.actualEnd = DC 的時間；並記 matchLevel
//
// C3. DC 找不到可配對（可能沒貼完整）
// - unmatchedDc 列入 debug 清單
// - 建立 RESCUE instance：start(null)、actualEnd=DC時間
//   → 彙整會顯示 `?-M/D`，提醒「看到了停藥、但沒看到開立」
//
// =================================================================================================
// D. 你新提出的「自然消滅 vs ongoing」與「MEDICATION RENEW 隱性停止」
// =================================================================================================
//
// D1. 彙整用 end 的新規則（取代先前一律 end=actualEnd/null）
// - instance 若有 actualEnd： end = actualEnd（明確停止）
// - instance 若沒有 actualEnd：
//   - 若「不是同藥同途徑的最後一筆」：視為前面那筆自然消滅/被後續取代
//     → end = min(plannedEnd, nextStartTimeOfSameDrugRoute)
//   - 若「是同藥同途徑的最後一筆」：才視為仍在用
//     → end = null（顯示為 ONGOING）
//
// D2. MEDICATION RENEW（REN）造成的「隱性 DC」問題如何解
// - 現象：REN 出現時，院內系統會把 REN 之前仍在用的藥「自動 DC」，但單上不會印 DC
// - 本工具的處理方式：
//   - 在彙整階段使用 nextStartTimeOfSameDrugRoute 機制：
//     若某筆 NEW/CHG/EXTN/... 沒有 actualEnd，但後面同藥同途徑又出現 REN（或任一 START）
//     → end 會被截到該 nextStartTime（等價於「隱性停止」）
//   - 這會把你例子中：
//       NEW 2025/05/09 09:05 plannedEnd=5/16
//       REN 2025/05/09 13:08
//     修正成：NEW 的 end = 5/09 13:08（隱性停止），REN 再跑到後續 DC 或 plannedEnd
//
// =================================================================================================
// E. 彙整與顯示（Instances → Aggregation → UI）
// =================================================================================================
//
// E1. 分桶：以 (drugGroupKey, routeNorm) 分組
//
// E2. 每筆 instance → interval
// - start = printTime（RESCUE 可能為 null）
// - end   =
//   - actualEnd（若有）
//   - else（無 actualEnd）依 D1 規則：
//       - 非最後一筆：min(plannedEnd, nextStart)
//       - 最後一筆：null（ONGOING）
//
// E3. 顯示字串
// - start=null → "?"
// - end=null   → "ONGOING"（你要求由 ? 改成 ONGOING）
// - 其他 end   → M/D
//
// E4. mergeIntervals（合併區間）
// - 保守策略：
//   - 若任一段 start 或 end 為 null → 不合併（避免把未知/ongoing 糊成一段）
//   - 只有 start/end 都明確且重疊才合併
//
// E5. Debug
// - 顯示 unmatched DC 清單
// - 每藥品展開 instances：含 start/end、matchLevel、raw 欄位與 note
//
// =================================================================================================

const TOOL_KEY = "medorders";

const START_TYPES = new Set(["EXTN", "CHG", "NEW", "PREP", "REN", "St"]);
const STOP_PREFIX = "DC"; // DC, DC-D, DC-E, DC-C, DC-R ...

const ROUTE_MAP = {
  IVF: "IV",
  IVD: "IV",
  IV: "IV",
  IM: "IM",
  PO: "PO",
  OU: "OU",
  OTHE: "OTHE",
  TOP: "TOP",
  SC: "SC",
};

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
  let s = String(drugNameRaw || "").replace(/\s+/g, " ").trim();
  s = s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return { key: "", display: "" };

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

  const routeIdx = parts.findIndex((p) => /^(IVF|IVD|IV|IM|PO|OU|OTHE|TOP|SC)$/.test(p));

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

    const pre = parts.slice(2, routeIdx);
    dose = (pre[0] || "").trim();
    sig = (pre[1] || "").trim();
    timing = (pre[2] || "").trim();
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    const header = line.match(/\]\s*列印時間:(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2})/);
    if (header) {
      flushPending();
      currentTime = parseTaipeiDateTime(header[1]);
      inMedTable = false;
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
      pendingNote.push(line.trim());
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
      flushPending();
      continue;
    }
  }

  flushPending();

  // 排序：同分鐘 STOP 先處理，再 START
  events.sort((a, b) => {
    const ta = a.t ? a.t.getTime() : 0;
    const tb = b.t ? b.t.getTime() : 0;
    if (ta !== tb) return ta - tb;
    if (a.kind !== b.kind) return a.kind === "STOP" ? -1 : 1;
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

function buildOrderInstances(events) {
  const rows = [];
  const dcEvents = [];
  const unmatchedDc = [];

  for (const ev of events) {
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
    } else if (ev.kind === "STOP") {
      dcEvents.push(ev);
    }
  }

  for (const dc of dcEvents) {
    const dcKeys = makeKeys(dc);

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
      row.actualEnd = dc.t;
      row.matchLevel = matchedLevel;
      row.matchedByTime = dc.t;
    } else {
      unmatchedDc.push(dc);

      if (MATCH_POLICY.rescueUnmatchedDc) {
        const dg = normalizeDrugGroup(dc.drugNameRaw);
        rows.push({
          actionType: "RESCUE",
          drugNameRaw: dc.drugNameRaw,
          doseRaw: dc.doseRaw,
          sigRaw: dc.sigRaw,
          timingRaw: dc.timingRaw,
          routeRaw: dc.routeRaw,
          routeNorm: dc.routeNorm,
          qtyRaw: dc.qtyRaw,
          plannedDays: null,
          plannedEnd: null,
          rateRaw: dc.rateRaw,
          noteRaw: dc.noteRaw,
          printTime: null,
          actualEnd: dc.t,

          drugGroupKey: dg.key,
          drugGroupDisplay: dg.display,

          keys: makeKeys({ ...dc, drugGroupKey: dg.key }),

          rawLine: `RESCUE from unmatched DC: ${dc.rawLine || ""}`,
          matchLevel: "rescue",
          matchedByTime: dc.t,

          isRescue: true,
        });
      }
    }
  }

  return { rows, unmatchedDc };
}

// ------------------------------
// 彙整 end 決策（解決：缺 DC 的自然消滅 + REN 隱性 DC）
// ------------------------------
function computeIntervalEndForGroup(sortedInstances) {
  // sortedInstances: 同 drugGroupKey + routeNorm，依 printTime 升序（null 最後）
  // 規則：
  // - 若 actualEnd 有 → 用 actualEnd
  // - 若 actualEnd 無：
//    - 非最後一筆：end = min(plannedEnd, nextStartTime)
//    - 最後一筆：end = null（ONGOING）
  const out = [];
  const n = sortedInstances.length;

  for (let i = 0; i < n; i++) {
    const r = sortedInstances[i];
    const start = r.printTime || null;

    if (r.actualEnd) {
      out.push({ start, end: r.actualEnd, endType: "DC", sources: [r] });
      continue;
    }

    // RESCUE（start 可能為 null）但 actualEnd 已在 buildOrderInstances 填了；上面已處理
    // 這裡只處理「沒 actualEnd 的正常 instance」
    const isLast = i === n - 1;

    if (isLast) {
      out.push({ start, end: null, endType: "ONGOING", sources: [r] });
      continue;
    }

    // nextStartTime：找下一筆「有 printTime」的開始時間（理論上同 group 都有，但保險）
    let nextStart = null;
    for (let j = i + 1; j < n; j++) {
      if (sortedInstances[j].printTime) {
        nextStart = sortedInstances[j].printTime;
        break;
      }
    }

    // plannedEnd 可能為 null（理論上 START 都有，但保險）
    let end = r.plannedEnd || null;

    // 若 nextStart 存在且 end 不存在 或 end 晚於 nextStart → 截到 nextStart（等價隱性停止）
    if (nextStart && (!end || end.getTime() > nextStart.getTime())) {
      end = nextStart;
    }

    out.push({
      start,
      end,
      endType: end ? "PLANNED/IMPLICIT" : "UNKNOWN",
      sources: [r],
    });
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

function aggregateByDrugAndRoute(rows) {
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

    // instances → intervals with new end logic
    const rawIntervals = computeIntervalEndForGroup(sorted);

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

  meta.textContent = `instances: ${state.rows.length}｜藥品: ${filtered.length}｜route groups: ${totalRoutes}｜unmatched DC: ${state.unmatchedDc.length}｜debug: ${dbgOn ? "ON" : "OFF"}`;

  debugTop.innerHTML = dbgOn
    ? `
      <div class="small neo-muted">
        <div>同分鐘排序：STOP(DC*) 先、START 後。</div>
        <div>彙整 end 規則：有 actualEnd → 用 actualEnd；無 actualEnd → 非最後一筆用 min(plannedEnd,nextStart)；最後一筆顯示 <b>ONGOING</b>。</div>
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
      .map((d, idx) => {
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
              <button type="button"
                class="btn btn-sm neo-btn-outline copy-item"
                data-copy="${escapeHtml(d.drugDisplay)}"
                title="複製藥名">
                Copy
              </button>
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
          末筆未停藥顯示 <b>ONGOING</b>；其餘未見 DC 的會以 plannedEnd/nextStart 推算自然結束（含 REN 隱性 DC）。
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
        同分鐘：先處理 DC*，再處理開立｜末筆未停藥：ONGOING｜REN 造成的隱性停止：用 nextStart 截斷上一筆。
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
  };

  function recompute() {
    const events = extractEventsFromText(state.raw);
    const { rows, unmatchedDc } = buildOrderInstances(events);
    const agg = aggregateByDrugAndRoute(rows);

    state.rows = rows;
    state.unmatchedDc = unmatchedDc;
    state.agg = agg;

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