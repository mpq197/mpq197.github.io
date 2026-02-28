// tools/icd10.js
// updated: 2026-02-28


const DEBUG = false;
const TOOL_KEY = "icd10";

/** @typedef {{ code:string, desc:string, cat:string }} ICDItem */

const ICD = /** @type {ICDItem[]} */ ([
  // --- Birth type / plurality ---
  { code: "Z3800", desc: "單胞胎 NSD", cat: "出生型態" },
  { code: "Z3801", desc: "單胞胎 C/S", cat: "出生型態" },
  { code: "Z3830", desc: "雙胞胎 NSD", cat: "出生型態" },
  { code: "Z3831", desc: "雙胞胎 C/S", cat: "出生型態" },
  { code: "Z3861", desc: "三胞胎 NSD", cat: "出生型態" },
  { code: "Z3862", desc: "三胞胎 C/S", cat: "出生型態" },

  // --- BBW ---
  { code: "P0701", desc: "BBW < 500 g", cat: "體重 (BBW)" },
  { code: "P0702", desc: "BBW 500–749 g", cat: "體重 (BBW)" },
  { code: "P0703", desc: "BBW 750–999 g", cat: "體重 (BBW)" },
  { code: "P0714", desc: "BBW 1000–1249 g", cat: "體重 (BBW)" },
  { code: "P0715", desc: "BBW 1250–1499 g", cat: "體重 (BBW)" },
  { code: "P0716", desc: "BBW 1500–1749 g", cat: "體重 (BBW)" },
  { code: "P0717", desc: "BBW 1750–1999 g", cat: "體重 (BBW)" },
  { code: "P0718", desc: "BBW 2000–2499 g", cat: "體重 (BBW)" },

  // --- GA ---
  { code: "P0721", desc: "GA < 23 w", cat: "週數 (GA)" },
  { code: "P0722", desc: "GA 23+ w", cat: "週數 (GA)" },
  { code: "P0723", desc: "GA 24+ w", cat: "週數 (GA)" },
  { code: "P0724", desc: "GA 25+ w", cat: "週數 (GA)" },
  { code: "P0725", desc: "GA 26+ w", cat: "週數 (GA)" },
  { code: "P0726", desc: "GA 27+ w", cat: "週數 (GA)" },
  { code: "P0731", desc: "GA 28+ w", cat: "週數 (GA)" },
  { code: "P0732", desc: "GA 29+ w", cat: "週數 (GA)" },
  { code: "P0733", desc: "GA 30+ w", cat: "週數 (GA)" },
  { code: "P0734", desc: "GA 31+ w", cat: "週數 (GA)" },
  { code: "P0735", desc: "GA 32+ w", cat: "週數 (GA)" },
  { code: "P0736", desc: "GA 33+ w", cat: "週數 (GA)" },
  { code: "P0737", desc: "GA 34+ w", cat: "週數 (GA)" },
  { code: "P0738", desc: "GA 35+ w", cat: "週數 (GA)" },
  { code: "P0739", desc: "GA 36+ w", cat: "週數 (GA)" },
  { code: "P0730", desc: "GA ??? w (未知週數)", cat: "週數 (GA)" },

  // --- Maternal ---
  { code: "P011", desc: "Maternal PROM", cat: "母體因素" },
  { code: "P000", desc: "Maternal HTN / PIH / Pre-E", cat: "母體因素" },
  { code: "P700", desc: "Maternal GDM", cat: "母體因素" },
  { code: "P701", desc: "Maternal DM", cat: "母體因素" },
  { code: "P0082", desc: "Maternal GBS colonization(+)", cat: "母體因素" },
  { code: "P019", desc: "Maternal complication of pregnancy, unspecified", cat: "母體因素" },
  { code: "P009", desc: "Maternal unspecified condition (與懷孕無關)", cat: "母體因素" },
  { code: "P049", desc: "Maternal noxious substance, unspecified (藥物濫用/酒精...)", cat: "母體因素" },

  // --- Screening / Birth injury ---
  { code: "P099", desc: "Newborn screening 異常, unspecified", cat: "篩檢/產傷" },
  { code: "P149", desc: "Birth injury, peripheral nerves (含臂神經叢損傷...)", cat: "篩檢/產傷" },
  { code: "P159", desc: "Birth injury, unspecified", cat: "篩檢/產傷" },

  // --- Common NICU / perinatal conditions ---
  { code: "P229", desc: "Respiratory distress, unspecified", cat: "新生兒常見問題" },
  { code: "P399", desc: "Infection specific to the perinatal period, unspecified (新生兒發燒/母子燒...)", cat: "新生兒常見問題" },
  { code: "P599", desc: "Neonatal jaundice, unspecified", cat: "新生兒常見問題" },
  { code: "P769", desc: "Intestinal obstruction, unspecified", cat: "新生兒常見問題" },
  { code: "P779", desc: "NEC, unspecified", cat: "新生兒常見問題" },
  { code: "P920", desc: "Vomiting of newborn", cat: "新生兒常見問題" },
  { code: "P921", desc: "Bilious vomiting of newborn", cat: "新生兒常見問題" },
  { code: "P929", desc: "Feeding problem of newborn, unspecified", cat: "新生兒常見問題" },
  { code: "P789", desc: "Perinatal digestive system disorder, unspecified (SIP/血便...)", cat: "新生兒常見問題" },
  { code: "P809", desc: "新生兒體溫調節障礙 (非感染性：低體溫/過熱等)", cat: "新生兒常見問題" },
  { code: "P832", desc: "Hydrops not due to hemolytic disease", cat: "新生兒常見問題" },
  { code: "P5690", desc: "Hydrops related to hemolytic disease, unspecified", cat: "新生兒常見問題" },
  { code: "P942", desc: "Congenital hypotonia", cat: "新生兒常見問題" },
  { code: "P90", desc: "Convulsions of newborn", cat: "新生兒常見問題" },
  { code: "P219", desc: "Birth asphyxia, unspecified", cat: "新生兒常見問題" },
  { code: "P9160", desc: "HIE, unspecified", cat: "新生兒常見問題" },

  { code: "P84", desc: "Other problems with newborn", cat: "新生兒常見問題" },

  // --- Others / congenital ---
  { code: "P741", desc: "Dehydration of newborn 新生兒脫水", cat: "其他" },
  { code: "Q359", desc: "Cleft palate, unspecified 顎裂未明示", cat: "先天異常" },
  { code: "Q36", desc: "Cleft lip 唇裂", cat: "先天異常" },
  { code: "Q37", desc: "Cleft palate with cleft lip 顎裂伴唇裂", cat: "先天異常" },
  { code: "Q7959", desc: "Other congenital malformations of abdominal wall 其他先天性腹壁畸形", cat: "先天異常" },
  { code: "Q33", desc: "Congenital malformations of lung 先天性肺畸形", cat: "先天異常" },
]);


const CATS = ["全部", ...Array.from(new Set(ICD.map(x => x.cat)))];

function normalize(s) {
  return String(s || "").trim().toLowerCase();
}

function itemMatches(it, q, cat) {
  if (cat !== "全部" && it.cat !== cat) return false;
  if (!q) return true;
  const hay = normalize(`${it.code} ${it.desc}`);
  return hay.includes(q);
}

function renderListGroup(items) {
  if (!items.length) {
    return `<div class="text-center py-3">找不到符合的 ICD-10</div>`;
  }

  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.cat)) groups.set(it.cat, []);
    groups.get(it.cat).push(it);
  }

  const parts = [];
  for (const [cat, arr] of groups.entries()) {
    parts.push(`
      <div class="list-group mb-3">
        <div class="list-group-item fw-bold">${cat}</div>
        ${arr.map(it => `
          <div class="list-group-item copy-item"
               data-content="${it.code}"
               title="點擊複製 ${it.code}">
            <div class="neo-icd10-line">
              <span class="neo-icd10-code">${it.code}</span>
              <span class="neo-icd10-desc">${it.desc}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `);
  }

  return parts.join("");
}

export function render() {
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card">
        <div class="card-header text-center">ICD-10 速查</div>

        <div class="card-body pb-0">

          <style>
            /* Grid layout with fixed code column */
            [data-tool="${TOOL_KEY}"] .neo-icd10-line{
              display: grid;
              grid-template-columns: max-content 1fr;
              column-gap: 1rem;
              align-items: baseline;
            }

            /* Code 永遠完整顯示 */
            [data-tool="${TOOL_KEY}"] .neo-icd10-code{
              font-weight: 900;
              white-space: nowrap;
            }

            /* Desc 可以縮略 */
            [data-tool="${TOOL_KEY}"] .neo-icd10-desc{
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          </style>

          <div class="d-flex gap-2 flex-wrap mb-2">
            <div class="input-group flex-grow-1">
              <span class="input-group-text" style="width:80px;">搜尋</span>
              <input class="form-control text-center" data-role="q"
                     placeholder="輸入 ICD 或 關鍵字" />
            </div>

            <div class="input-group" style="width:220px;">
              <span class="input-group-text">分類</span>
              <select class="form-select text-center" data-role="cat">
                ${CATS.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>

            <div class="align-self-center small" data-role="count"></div>
          </div>

        </div>

        <div class="card-footer">
          <div data-role="list"></div>
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

  const qEl = box.querySelector('[data-role="q"]');
  const catEl = box.querySelector('[data-role="cat"]');
  const listEl = box.querySelector('[data-role="list"]');
  const countEl = box.querySelector('[data-role="count"]');

  let rafId = 0;
  const scheduleCalc = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      calc();
    });
  };

  function calc() {
    const q = normalize(qEl.value);
    const cat = catEl.value;

    const matched = ICD.filter(it => itemMatches(it, q, cat));
    listEl.innerHTML = renderListGroup(matched);
    countEl.textContent = `${matched.length}/${ICD.length}`;

    if (DEBUG) {
      console.groupCollapsed(`[${TOOL_KEY}] calc`);
      console.log({ q, cat, matched });
      console.groupEnd();
    }
  }

  box.addEventListener("input", e => {
    if (e.target === qEl) scheduleCalc();
  });

  box.addEventListener("change", e => {
    if (e.target === catEl) scheduleCalc();
  });

  calc();
}