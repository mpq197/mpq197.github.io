// /tools/pedigree.js
// NeoAssist Tool Module Spec v1 compliant
// Professional click-first pedigree builder (3-generation limit: I/II/III)
// updated: 2026-03-03

import { createScheduler } from "../core/utils.js";

const TOOL_KEY = "pedigree";
const SEX = { M: "M", F: "F", U: "U" };
const GEN = ["I", "II", "III"]; // hard limit

// ---------- utils ----------
function uid() {
  return Math.random().toString(16).slice(2, 10);
}
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function shape(sex, affected) {
  const a = !!affected;
  if (sex === SEX.M) return a ? "■" : "□";
  if (sex === SEX.F) return a ? "●" : "○";
  return a ? "◆" : "◇";
}
function sexLabel(sex) {
  if (sex === SEX.M) return "Male";
  if (sex === SEX.F) return "Female";
  return "Unknown";
}
function bool01(v) {
  return v ? "1" : "0";
}
function findById(state, id) {
  return state.people.find((p) => p.id === id) || null;
}
function ensurePerson(state, p) {
  if (!state.people.some((x) => x.id === p.id)) state.people.push(p);
  return p;
}
function nextCode(state, gen) {
  const g = GEN.includes(gen) ? gen : "II";
  const used = state.people
    .map((p) => p.code)
    .filter(Boolean)
    .filter((c) => c.startsWith(g + "-"));
  let n = 1;
  while (used.includes(`${g}-${n}`)) n++;
  return `${g}-${n}`;
}
function defaultPerson(state, gen = "II", name = "") {
  const g = GEN.includes(gen) ? gen : "II";
  return {
    id: uid(),
    gen: g,
    code: nextCode(state, g),
    name,
    sex: SEX.U,
    affected: false,
    deceased: false,
    fatherId: null,
    motherId: null,
    partnerId: null,
    childrenIds: [],
  };
}
function addChildLink(parent, childId) {
  if (!parent.childrenIds.includes(childId)) parent.childrenIds.push(childId);
}
function marry(a, b) {
  if (!a || !b) return;
  a.partnerId = b.id;
  b.partnerId = a.id;
}
function setParent(child, parent, kind) {
  if (kind === "father") child.fatherId = parent.id;
  if (kind === "mother") child.motherId = parent.id;
}
function compactLabel(p, isProband) {
  const s = shape(p.sex, p.affected) + (p.deceased ? "†" : "");
  const arrow = isProband ? "→" : "";
  const name = p.name?.trim() ? p.name.trim() : p.code;
  return `${arrow}${s} ${name}`;
}
function parentIdsOf(p) {
  return { fatherId: p.fatherId || null, motherId: p.motherId || null };
}
function siblingsOf(state, person) {
  const { fatherId, motherId } = parentIdsOf(person);
  if (!fatherId && !motherId) return [];
  return state.people.filter((p) => {
    if (p.id === person.id) return false;
    const sameFa = fatherId && p.fatherId === fatherId;
    const sameMo = motherId && p.motherId === motherId;
    return fatherId && motherId ? sameFa && sameMo : sameFa || sameMo;
  });
}
function childrenOf(state, person) {
  return person.childrenIds.map((id) => findById(state, id)).filter(Boolean);
}
function genIndex(gen) {
  return GEN.indexOf(gen);
}
function genUp(gen) {
  const i = genIndex(gen);
  if (i <= 0) return null;
  return GEN[i - 1];
}
function genDown(gen) {
  const i = genIndex(gen);
  if (i < 0 || i >= GEN.length - 1) return null;
  return GEN[i + 1];
}

// ---------- model normalization (keep within 3 gens) ----------
function normalize3Gen(state) {
  // Minimal propagation: parents are one gen up; children one gen down; partner same gen.
  for (let k = 0; k < 4; k++) {
    for (const p of state.people) {
      // partner
      const pt = p.partnerId ? findById(state, p.partnerId) : null;
      if (pt && pt.gen !== p.gen) pt.gen = p.gen;

      // parents
      const up = genUp(p.gen);
      if (p.fatherId) {
        const fa = findById(state, p.fatherId);
        if (fa && up) fa.gen = up;
      }
      if (p.motherId) {
        const mo = findById(state, p.motherId);
        if (mo && up) mo.gen = up;
      }

      // children
      const down = genDown(p.gen);
      if (down) {
        for (const cid of p.childrenIds) {
          const c = findById(state, cid);
          if (c) c.gen = down;
        }
      }
    }
  }

  // Keep codes aligned to gen
  for (const p of state.people) {
    const g = GEN.includes(p.gen) ? p.gen : "II";
    p.gen = g;
    if (!String(p.code || "").startsWith(g + "-")) {
      p.code = nextCode(state, g);
    }
  }
}

// ---------- export ----------
function renderTextOutput(state) {
  const proband = findById(state, state.probandId);
  if (!proband) return "No proband.";

  const father = proband.fatherId ? findById(state, proband.fatherId) : null;
  const mother = proband.motherId ? findById(state, proband.motherId) : null;
  const partner = proband.partnerId ? findById(state, proband.partnerId) : null;

  const sibs = siblingsOf(state, proband).sort((a, b) =>
    (a.code || "").localeCompare(b.code || "")
  );
  const kids = childrenOf(state, proband).sort((a, b) =>
    (a.code || "").localeCompare(b.code || "")
  );

  const lines = [];
  lines.push("PEDIGREE (text)");
  lines.push("=".repeat(72));
  lines.push(`Proband: ${compactLabel(proband, true)}`);
  if (partner) lines.push(`Partner: ${compactLabel(partner, false)}`);
  if (father || mother) {
    lines.push(
      `Parents: ${father ? compactLabel(father, false) : "—"}  +  ${
        mother ? compactLabel(mother, false) : "—"
      }`
    );
  }
  if (sibs.length)
    lines.push(`Siblings: ${sibs.map((p) => compactLabel(p, false)).join("  ")}`);
  if (kids.length)
    lines.push(`Children: ${kids.map((p) => compactLabel(p, false)).join("  ")}`);

  lines.push("");
  lines.push("Legend: □/○/◇ unaffected; ■/●/◆ affected; † deceased; → proband");
  lines.push("");
  lines.push("People:");
  const list = [...state.people].sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  for (const p of list) {
    lines.push(`  ${p.code}: ${compactLabel(p, p.id === state.probandId)}`);
  }
  return lines.join("\n");
}

function renderTSV(state) {
  const header = [
    "code",
    "name",
    "gen",
    "sex",
    "affected",
    "deceased",
    "father",
    "mother",
    "partner",
    "children",
    "proband",
  ].join("\t");

  const byCode = [...state.people].sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  const idToCode = new Map(byCode.map((p) => [p.id, p.code]));

  const rows = byCode.map((p) => {
    const children = (p.childrenIds || [])
      .map((id) => idToCode.get(id) || "")
      .filter(Boolean)
      .join(",");
    return [
      p.code || "",
      (p.name || "").replaceAll("\t", " "),
      p.gen || "",
      p.sex || "",
      bool01(p.affected),
      bool01(p.deceased),
      p.fatherId ? idToCode.get(p.fatherId) || "" : "",
      p.motherId ? idToCode.get(p.motherId) || "" : "",
      p.partnerId ? idToCode.get(p.partnerId) || "" : "",
      children,
      bool01(p.id === state.probandId),
    ].join("\t");
  });

  return [header, ...rows].join("\n");
}

function renderJSON(state) {
  // stable, minimal
  const payload = {
    tool: TOOL_KEY,
    version: "20260303",
    probandId: state.probandId,
    people: state.people.map((p) => ({
      id: p.id,
      gen: p.gen,
      code: p.code,
      name: p.name,
      sex: p.sex,
      affected: !!p.affected,
      deceased: !!p.deceased,
      fatherId: p.fatherId,
      motherId: p.motherId,
      partnerId: p.partnerId,
      childrenIds: [...(p.childrenIds || [])],
    })),
  };
  return JSON.stringify(payload, null, 2);
}

// ---------- professional canvas rendering (family groups) ----------
function canonicalCoupleKey(aId, bId) {
  if (!aId || !bId) return null;
  return [aId, bId].sort().join("|");
}
function coupleOf(state, p) {
  if (!p.partnerId) return null;
  const pt = findById(state, p.partnerId);
  if (!pt) return null;
  return { a: p, b: pt, key: canonicalCoupleKey(p.id, pt.id) };
}
function familyKeyByParents(child) {
  const fa = child.fatherId || "";
  const mo = child.motherId || "";
  if (!fa && !mo) return null;
  return [fa, mo].sort().join("|");
}

function renderNode(state, p) {
  const isActive = p.id === state.activeId;
  const isProband = p.id === state.probandId;
  const s = shape(p.sex, p.affected);
  const dead = p.deceased ? "†" : "";
  const name = p.name?.trim() ? p.name.trim() : p.code;

  return `
    <button type="button"
      class="ped-node ${isActive ? "is-active" : ""}"
      data-role="node"
      data-person-id="${esc(p.id)}"
      title="Click to select">
      <span class="ped-icon">${esc(s + dead)}</span>
      <span class="ped-name">${esc(name)}</span>
      ${isProband ? `<span class="ped-badge">proband</span>` : ``}
    </button>
  `;
}

function renderCouple(state, a, b) {
  return `
    <div class="ped-couple">
      ${renderNode(state, a)}
      <div class="ped-couple-link" aria-hidden="true"></div>
      ${renderNode(state, b)}
    </div>
  `;
}

function renderGenI(state) {
  // show couples (unique) + singles
  const genI = state.people.filter((p) => p.gen === "I");
  const seenCouples = new Set();

  const couples = [];
  const singles = [];

  for (const p of genI) {
    const c = coupleOf(state, p);
    if (c && !seenCouples.has(c.key)) {
      seenCouples.add(c.key);
      couples.push(c);
    } else if (!p.partnerId) {
      singles.push(p);
    } else {
      // partner exists but couple already counted; skip
    }
  }

  couples.sort((x, y) => (x.a.code || "").localeCompare(y.a.code || ""));
  singles.sort((x, y) => (x.code || "").localeCompare(y.code || ""));

  return `
    <div class="ped-gen">
      <div class="ped-gen-title mono">Gen I</div>
      <div class="ped-gen-body">
        ${couples
          .map((c) => `<div class="ped-family">${renderCouple(state, c.a, c.b)}</div>`)
          .join("")}
        ${singles.map((p) => `<div class="ped-family">${renderNode(state, p)}</div>`).join("")}
        ${
          couples.length === 0 && singles.length === 0
            ? `<div class="ped-empty text-muted small">—</div>`
            : ``
        }
      </div>
    </div>
  `;
}

function renderGenII(state) {
  // Group Gen II by parents where possible to show sibling sets (family blocks)
  const genII = state.people.filter((p) => p.gen === "II");
  const groups = new Map(); // familyKey -> { key, members: [] }
  const orphans = [];

  for (const p of genII) {
    const k = familyKeyByParents(p);
    if (!k) {
      orphans.push(p);
      continue;
    }
    if (!groups.has(k)) groups.set(k, { key: k, members: [] });
    groups.get(k).members.push(p);
  }

  const groupList = [...groups.values()];
  groupList.forEach((g) =>
    g.members.sort((a, b) => (a.code || "").localeCompare(b.code || ""))
  );
  groupList.sort((a, b) => (a.members[0]?.code || "").localeCompare(b.members[0]?.code || ""));
  orphans.sort((a, b) => (a.code || "").localeCompare(b.code || ""));

  // Render: each group in one family row; keep it clean (no line drawing between parents here)
  const groupHtml = groupList
    .map((g) => {
      const first = g.members[0];
      const fa = first?.fatherId ? findById(state, first.fatherId) : null;
      const mo = first?.motherId ? findById(state, first.motherId) : null;
      const parents =
        fa && mo
          ? `<div class="ped-parents-line">
               <span class="ped-parents-label mono">Parents</span>
               ${renderCouple(state, fa, mo)}
             </div>`
          : ``;

      return `
        <div class="ped-family">
          ${parents}
          <div class="ped-sibs">
            <span class="ped-sibs-label mono">Gen II</span>
            <div class="ped-sibs-nodes">
              ${g.members.map((p) => renderNode(state, p)).join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const orphanHtml =
    orphans.length > 0
      ? `
        <div class="ped-family">
          <div class="ped-sibs">
            <span class="ped-sibs-label mono">Gen II</span>
            <div class="ped-sibs-nodes">
              ${orphans.map((p) => renderNode(state, p)).join("")}
            </div>
          </div>
        </div>
      `
      : ``;

  return `
    <div class="ped-gen">
      <div class="ped-gen-title mono">Gen II</div>
      <div class="ped-gen-body">
        ${groupHtml}${orphanHtml}
        ${
          groupList.length === 0 && orphans.length === 0
            ? `<div class="ped-empty text-muted small">—</div>`
            : ``
        }
      </div>
    </div>
  `;
}

function renderGenIII(state) {
  // Group Gen III by their parents (couple or single parent)
  const genIII = state.people.filter((p) => p.gen === "III");
  const groups = new Map();
  const orphans = [];

  for (const p of genIII) {
    const k = familyKeyByParents(p);
    if (!k) {
      orphans.push(p);
      continue;
    }
    if (!groups.has(k)) groups.set(k, { key: k, members: [] });
    groups.get(k).members.push(p);
  }

  const groupList = [...groups.values()];
  groupList.forEach((g) =>
    g.members.sort((a, b) => (a.code || "").localeCompare(b.code || ""))
  );
  groupList.sort((a, b) => (a.members[0]?.code || "").localeCompare(b.members[0]?.code || ""));
  orphans.sort((a, b) => (a.code || "").localeCompare(b.code || ""));

  const groupHtml = groupList
    .map((g) => {
      const first = g.members[0];
      const fa = first?.fatherId ? findById(state, first.fatherId) : null;
      const mo = first?.motherId ? findById(state, first.motherId) : null;

      const parents =
        fa && mo
          ? `<div class="ped-parents-line">
               <span class="ped-parents-label mono">Parents</span>
               ${renderCouple(state, fa, mo)}
             </div>`
          : fa || mo
          ? `<div class="ped-parents-line">
               <span class="ped-parents-label mono">Parent</span>
               ${renderNode(state, fa || mo)}
             </div>`
          : ``;

      return `
        <div class="ped-family">
          ${parents}
          <div class="ped-sibs">
            <span class="ped-sibs-label mono">Gen III</span>
            <div class="ped-sibs-nodes">
              ${g.members.map((p) => renderNode(state, p)).join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const orphanHtml =
    orphans.length > 0
      ? `
        <div class="ped-family">
          <div class="ped-sibs">
            <span class="ped-sibs-label mono">Gen III</span>
            <div class="ped-sibs-nodes">
              ${orphans.map((p) => renderNode(state, p)).join("")}
            </div>
          </div>
        </div>
      `
      : ``;

  return `
    <div class="ped-gen">
      <div class="ped-gen-title mono">Gen III</div>
      <div class="ped-gen-body">
        ${groupHtml}${orphanHtml}
        ${
          groupList.length === 0 && orphans.length === 0
            ? `<div class="ped-empty text-muted small">—</div>`
            : ``
        }
      </div>
    </div>
  `;
}

function renderCanvas(state) {
  return `${renderGenI(state)}${renderGenII(state)}${renderGenIII(state)}`;
}

// ---------- UI ----------
export function render() {
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100">
        <div class="card-header text-center">Pedigree Builder</div>

        <div class="card-body pt-2">
          <style>
            [data-tool="${TOOL_KEY}"]{
              --neo-text: rgba(0,0,0,.86);
              --neo-muted: rgba(0,0,0,.55);
              --neo-border: rgba(0,0,0,.10);
              --neo-strong: rgba(0,0,0,.55);
              --neo-surface: rgba(255,255,255,.35);
              --neo-surface-strong: rgba(255,255,255,.55);
              --neo-brown: #3A2A1C;
            }
            [data-tool="${TOOL_KEY}"] .mono{
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
            }

            [data-tool="${TOOL_KEY}"] .shell{
              display: grid;
              grid-template-columns: 1fr;
              gap: 12px;
            }
            @media (min-width: 992px){
              [data-tool="${TOOL_KEY}"] .shell{
                grid-template-columns: 1.6fr 1fr;
                align-items: start;
              }
            }

            /* Canvas */
            [data-tool="${TOOL_KEY}"] .canvas{
              border: 1px solid var(--neo-border);
              border-radius: 12px;
              background: transparent;
              padding: 10px;
            }
            [data-tool="${TOOL_KEY}"] .canvas-top{
              display:flex;
              align-items:center;
              justify-content: space-between;
              gap: 8px;
              margin-bottom: 8px;
            }
            [data-tool="${TOOL_KEY}"] .canvas-title{
              font-weight: 600;
              color: var(--neo-text);
            }
            [data-tool="${TOOL_KEY}"] .ped-gen{
              border: 1px solid var(--neo-border);
              border-radius: 12px;
              padding: 10px;
              margin-bottom: 10px;
              background: transparent;
            }
            [data-tool="${TOOL_KEY}"] .ped-gen:last-child{ margin-bottom: 0; }
            [data-tool="${TOOL_KEY}"] .ped-gen-title{
              color: var(--neo-muted);
              font-size: 12px;
              margin-bottom: 8px;
            }
            [data-tool="${TOOL_KEY}"] .ped-gen-body{
              display: grid;
              grid-template-columns: 1fr;
              gap: 10px;
            }

            .text-muted{ color: var(--neo-muted) !important; }

            /* Family blocks */
            [data-tool="${TOOL_KEY}"] .ped-family{
              border: 1px dashed var(--neo-border);
              border-radius: 12px;
              padding: 10px;
              background: transparent;
            }
            [data-tool="${TOOL_KEY}"] .ped-parents-line{
              display:flex;
              align-items:center;
              gap: 10px;
              margin-bottom: 8px;
              flex-wrap: wrap;
            }
            [data-tool="${TOOL_KEY}"] .ped-parents-label{
              color: var(--neo-muted);
              font-size: 12px;
              min-width: 56px;
            }
            [data-tool="${TOOL_KEY}"] .ped-sibs{
              display:flex;
              gap: 10px;
              align-items:flex-start;
              flex-wrap: wrap;
            }
            [data-tool="${TOOL_KEY}"] .ped-sibs-label{
              color: var(--neo-muted);
              font-size: 12px;
              min-width: 56px;
              padding-top: 4px;
            }
            [data-tool="${TOOL_KEY}"] .ped-sibs-nodes{
              display:flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            /* Couple */
            [data-tool="${TOOL_KEY}"] .ped-couple{
              display:inline-flex;
              align-items:center;
              gap: 8px;
              flex-wrap: nowrap;
            }
            [data-tool="${TOOL_KEY}"] .ped-couple-link{
              width: 22px;
              height: 0;
              border-bottom: 2px solid var(--neo-border);
              opacity: .9;
            }

            /* Node */
            [data-tool="${TOOL_KEY}"] .ped-node{
              display:inline-flex;
              align-items:center;
              gap: 8px;
              border: 1px solid var(--neo-border);
              border-radius: 999px;
              padding: 6px 10px;
              background: transparent;
              cursor: pointer;
              user-select: none;
              max-width: 260px;
            }
            [data-tool="${TOOL_KEY}"] .ped-node:hover{
              background: var(--neo-surface);
            }
            [data-tool="${TOOL_KEY}"] .ped-node.is-active{
              border-color: var(--neo-strong);
              background: var(--neo-surface-strong);
              box-shadow: 0 0 0 .2rem rgba(0,0,0,.08);
            }
            [data-tool="${TOOL_KEY}"] .ped-icon{
              font-size: 16px;
              line-height: 1;
            }
            [data-tool="${TOOL_KEY}"] .ped-name{
              overflow:hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-size: 13px;
              color: var(--neo-text);
              max-width: 160px;
            }
            [data-tool="${TOOL_KEY}"] .ped-badge{
              font-size: 11px;
              padding: 2px 8px;
              border-radius: 999px;
              border: 1px solid rgba(58,42,28,.35);
              color: rgba(58,42,28,.9);
              background: rgba(58,42,28,.06);
            }
            [data-tool="${TOOL_KEY}"] .ped-empty{
              padding: 6px 2px;
            }

            /* Inspector */
            [data-tool="${TOOL_KEY}"] .inspector{
              border: 1px solid var(--neo-border);
              border-radius: 12px;
              padding: 10px;
              background: transparent;
            }
            [data-tool="${TOOL_KEY}"] .ins-top{
              display:flex;
              align-items:flex-start;
              justify-content: space-between;
              gap: 10px;
              margin-bottom: 10px;
            }
            [data-tool="${TOOL_KEY}"] .ins-title{
              font-weight: 600;
              color: var(--neo-text);
              overflow:hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 100%;
            }
            [data-tool="${TOOL_KEY}"] .ins-sub{
              color: var(--neo-muted);
              font-size: 12px;
              margin-top: 2px;
            }
            [data-tool="${TOOL_KEY}"] .section{
              border-top: 1px solid var(--neo-border);
              padding-top: 10px;
              margin-top: 10px;
            }
            [data-tool="${TOOL_KEY}"] .section:first-of-type{
              border-top: 0;
              padding-top: 0;
              margin-top: 0;
            }
            [data-tool="${TOOL_KEY}"] .section-title{
              font-weight: 600;
              color: var(--neo-text);
              font-size: 13px;
              margin-bottom: 8px;
            }

            /* Segmented control */
            [data-tool="${TOOL_KEY}"] .seg{
              display:inline-flex;
              border: 1px solid var(--neo-border);
              border-radius: 10px;
              overflow: hidden;
            }
            [data-tool="${TOOL_KEY}"] .seg button{
              border: 0;
              background: transparent;
              padding: 6px 10px;
              font-size: 12px;
              color: var(--neo-muted);
              cursor: pointer;
            }
            [data-tool="${TOOL_KEY}"] .seg button.is-on{
              background: rgba(0,0,0,.06);
              color: var(--neo-text);
            }
            [data-tool="${TOOL_KEY}"] .pill{
              border: 1px solid var(--neo-border);
              border-radius: 999px;
              padding: 6px 10px;
              font-size: 12px;
              background: transparent;
              cursor: pointer;
              color: var(--neo-muted);
            }
            [data-tool="${TOOL_KEY}"] .pill.is-on{
              background: rgba(0,0,0,.06);
              color: var(--neo-text);
              border-color: var(--neo-strong);
            }

            /* Form inputs */
            [data-tool="${TOOL_KEY}"] .tight .input-group-text{
              padding-top: .35rem;
              padding-bottom: .35rem;
            }
            [data-tool="${TOOL_KEY}"] .tight .form-control{
              padding-top: .35rem;
              padding-bottom: .35rem;
            }

            /* Export */
            [data-tool="${TOOL_KEY}"] .export{
              border: 1px solid var(--neo-border);
              border-radius: 12px;
              padding: 10px;
              background: transparent;
              margin-top: 10px;
            }
            [data-tool="${TOOL_KEY}"] pre.out{
              white-space: pre;
              font-size: 12px;
              line-height: 1.25;
              border: 1px solid var(--neo-border);
              border-radius: 12px;
              padding: 12px;
              margin: 0;
              background: transparent;
              overflow: auto;
              min-height: 220px;
            }

            /* Toast */
            [data-tool="${TOOL_KEY}"] .toast{
              position: fixed;
              right: 14px;
              bottom: 14px;
              z-index: 9999;
              border: 1px solid var(--neo-border);
              border-radius: 12px;
              padding: 10px 12px;
              background: rgba(255,255,255,.75);
              backdrop-filter: blur(6px);
              color: var(--neo-text);
              box-shadow: 0 6px 24px rgba(0,0,0,.12);
              display:none;
              max-width: min(360px, calc(100vw - 28px));
            }
            [data-tool="${TOOL_KEY}"] .toast.show{ display:block; }
            [data-tool="${TOOL_KEY}"] .toast .t-title{ font-weight: 600; font-size: 13px; }
            [data-tool="${TOOL_KEY}"] .toast .t-msg{ color: var(--neo-muted); font-size: 12px; margin-top: 2px; }
          </style>

          <div class="shell">
            <!-- Canvas -->
            <div class="canvas">
              <div class="canvas-top">
                <div class="canvas-title">Pedigree Canvas (Gen I–III)</div>
                <div class="d-flex gap-1">
                  <button type="button" class="btn btn-sm btn-outline-secondary" data-role="demo">Demo</button>
                  <button type="button" class="btn btn-sm btn-outline-secondary" data-role="reset">Reset</button>
                </div>
              </div>

              <div data-role="canvasArea"></div>

              <div class="text-muted small mt-2">
                Click node to select → use Inspector to edit / add relationships. (No dragging, mouse-first.)
              </div>
            </div>

            <!-- Inspector + Export -->
            <div>
              <div class="inspector">
                <div class="ins-top">
                  <div style="min-width:0;">
                    <div class="ins-title" data-role="selTitle"></div>
                    <div class="ins-sub" data-role="selMeta"></div>
                  </div>
                  <button type="button" class="btn btn-sm btn-outline-secondary" data-role="setProband">Set proband</button>
                </div>

                <div class="section">
                  <div class="section-title">Properties</div>

                  <div class="tight">
                    <div class="input-group mb-2">
                      <span class="input-group-text" style="width: 30%;">Name</span>
                      <input class="form-control text-center" data-role="nameInput" placeholder="e.g., Father" />
                    </div>
                  </div>

                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="text-muted small">Sex</div>
                    <div class="seg" data-role="sexSeg">
                      <button type="button" data-role="sexBtn" data-sex="M">Male</button>
                      <button type="button" data-role="sexBtn" data-sex="F">Female</button>
                      <button type="button" data-role="sexBtn" data-sex="U">Unknown</button>
                    </div>
                  </div>

                  <div class="d-flex gap-2 flex-wrap">
                    <button type="button" class="pill" data-role="toggleAffected">Affected</button>
                    <button type="button" class="pill" data-role="toggleDeceased">Deceased</button>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Relationships</div>
                  <div class="d-grid gap-2">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addFather">Add Father (Gen I)</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addMother">Add Mother (Gen I)</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addPartner">Add Partner (Same Gen)</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addSibling">Add Sibling (Gen II only)</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addChild">Add Child (Gen III only)</button>
                  </div>

                  <div class="text-muted small mt-2" data-role="relHint"></div>
                </div>

                <div class="section">
                  <div class="section-title">Actions</div>
                  <div class="d-grid gap-2">
                    <button type="button" class="btn btn-sm btn-outline-danger" data-role="deletePerson">Delete selected</button>
                  </div>
                  <div class="text-muted small mt-2">
                    Deleting will unlink relationships. Proband will fall back to the first person if deleted.
                  </div>
                </div>
              </div>

              <div class="export">
                <div class="d-flex align-items-center justify-content-between">
                  <div class="fw-semibold">Export</div>
                  <div class="d-flex gap-1 flex-wrap justify-content-end">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="viewText">Text</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="viewTSV">TSV</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="viewJSON">JSON</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="copyExport">Copy</button>
                  </div>
                </div>

                <div class="mt-2">
                  <pre class="out mono copy-item" data-role="exportOut"></pre>
                </div>

                <div class="text-muted small mt-2">
                  Symbols: □/○/◇ unaffected, ■/●/◆ affected, † deceased, → proband
                </div>
              </div>
            </div>
          </div>

          <div class="toast" data-role="toast">
            <div class="t-title" data-role="toastTitle">Copied</div>
            <div class="t-msg" data-role="toastMsg">Export copied to clipboard.</div>
          </div>
        </div>

        <div class="card-footer text-center small text-muted">
          Professional Pedigree | 3-generation limit (I–III)
        </div>
      </div>
    </div>
  `;
}

// ---------- init ----------
export function init(root) {
  const $ = (role) => root.querySelector(`[data-role="${role}"]`);
  const $$ = (role) => root.querySelectorAll(`[data-role="${role}"]`);

  const state = {
    people: [],
    activeId: null,
    probandId: null,
    exportMode: "text", // text | tsv | json
    _toastTimer: null,
  };

  function seed() {
    state.people = [];
    const p0 = defaultPerson(state, "II", "Proband");
    state.people.push(p0);
    state.activeId = p0.id;
    state.probandId = p0.id;
    normalize3Gen(state);
  }

  seed();

  const scheduler = createScheduler(() => {
    if (!root.isConnected) return;
    renderAll();
  });

  function active() {
    return findById(state, state.activeId) || findById(state, state.probandId) || state.people[0] || null;
  }

  function toast(title, msg) {
    const t = $("toast");
    if (!t) return;
    $("toastTitle").textContent = title || "Done";
    $("toastMsg").textContent = msg || "";
    t.classList.add("show");
    if (state._toastTimer) clearTimeout(state._toastTimer);
    state._toastTimer = setTimeout(() => t.classList.remove("show"), 1300);
  }

  function currentExportText() {
    if (state.exportMode === "tsv") return renderTSV(state);
    if (state.exportMode === "json") return renderJSON(state);
    return renderTextOutput(state);
  }

  function rerender() {
    normalize3Gen(state);
    scheduler.schedule();
  }

  function renderAll() {
    // canvas
    $("canvasArea").innerHTML = renderCanvas(state);

    // inspector
    const a = active();
    if (a) {
      $("selTitle").textContent = compactLabel(a, a.id === state.probandId);
      $("selMeta").textContent = `${a.code} · ${a.gen} · ${sexLabel(a.sex)}`;

      const nameInput = $("nameInput");
      if (nameInput && nameInput.value !== (a.name || "")) nameInput.value = a.name || "";

      // segmented sex buttons
      $$("sexBtn").forEach((b) => {
        const v = b.getAttribute("data-sex");
        b.classList.toggle("is-on", v === a.sex);
      });

      // pills
      $("toggleAffected").classList.toggle("is-on", !!a.affected);
      $("toggleDeceased").classList.toggle("is-on", !!a.deceased);

      // relationship hint + enable rules
      // 3-gen rules:
      // - Add Father/Mother only if gen != I
      // - Add Child only if gen == II (child in III)
      // - Add Sibling only if gen == II (same gen)
      const canAddParent = a.gen !== "I";
      const canAddChild = a.gen === "II";
      const canAddSibling = a.gen === "II";
      const canAddPartner = true;

      $("addFather").disabled = !canAddParent;
      $("addMother").disabled = !canAddParent;
      $("addChild").disabled = !canAddChild;
      $("addSibling").disabled = !canAddSibling;
      $("addPartner").disabled = !canAddPartner;

      const hintParts = [];
      if (!canAddParent) hintParts.push("Gen I: cannot add parents (3-gen limit).");
      if (!canAddChild) hintParts.push("Child can be added only from Gen II (to Gen III).");
      if (!canAddSibling) hintParts.push("Sibling can be added only in Gen II.");
      $("relHint").textContent = hintParts.length ? hintParts.join(" ") : "Relationship actions available.";
    }

    // export
    const out = currentExportText();
    $("exportOut").textContent = out;
    $("exportOut").setAttribute("data-copy", out);

    // export mode buttons visual
    $("viewText").classList.toggle("btn-dark", state.exportMode === "text");
    $("viewText").classList.toggle("btn-outline-secondary", state.exportMode !== "text");
    $("viewTSV").classList.toggle("btn-dark", state.exportMode === "tsv");
    $("viewTSV").classList.toggle("btn-outline-secondary", state.exportMode !== "tsv");
    $("viewJSON").classList.toggle("btn-dark", state.exportMode === "json");
    $("viewJSON").classList.toggle("btn-outline-secondary", state.exportMode !== "json");
  }

  // ---------- relationship helpers (3-gen) ----------
  function ensureParentsFor(child) {
    // only if child.gen is II or III (but III shouldn't be creatable as active parent add due to disabled)
    const up = genUp(child.gen);
    if (!up) return { fa: null, mo: null };

    let fa = child.fatherId ? findById(state, child.fatherId) : null;
    let mo = child.motherId ? findById(state, child.motherId) : null;

    if (!fa) {
      fa = defaultPerson(state, up, "Father");
      fa.sex = SEX.M;
      ensurePerson(state, fa);
      setParent(child, fa, "father");
    } else {
      fa.gen = up;
    }

    if (!mo) {
      mo = defaultPerson(state, up, "Mother");
      mo.sex = SEX.F;
      ensurePerson(state, mo);
      setParent(child, mo, "mother");
    } else {
      mo.gen = up;
    }

    marry(fa, mo);
    return { fa, mo };
  }

  function addFather() {
    const c = active();
    if (!c || c.gen === "I") return;
    const up = genUp(c.gen);
    if (!up) return;

    if (c.fatherId) {
      state.activeId = c.fatherId;
      return rerender();
    }

    const fa = defaultPerson(state, up, "Father");
    fa.sex = SEX.M;
    ensurePerson(state, fa);
    c.fatherId = fa.id;

    // marry with mother if exists
    const mo = c.motherId ? findById(state, c.motherId) : null;
    if (mo) marry(fa, mo);

    state.activeId = fa.id;
    rerender();
  }

  function addMother() {
    const c = active();
    if (!c || c.gen === "I") return;
    const up = genUp(c.gen);
    if (!up) return;

    if (c.motherId) {
      state.activeId = c.motherId;
      return rerender();
    }

    const mo = defaultPerson(state, up, "Mother");
    mo.sex = SEX.F;
    ensurePerson(state, mo);
    c.motherId = mo.id;

    // marry with father if exists
    const fa = c.fatherId ? findById(state, c.fatherId) : null;
    if (fa) marry(fa, mo);

    state.activeId = mo.id;
    rerender();
  }

  function addPartner() {
    const a = active();
    if (!a) return;

    if (a.partnerId) {
      state.activeId = a.partnerId;
      return rerender();
    }

    const pt = defaultPerson(state, a.gen, "Partner");
    ensurePerson(state, pt);
    marry(a, pt);
    state.activeId = pt.id;
    rerender();
  }

  function addSibling() {
    const a = active();
    if (!a || a.gen !== "II") return;

    // require parents (Gen I) for a clean family block
    const { fa, mo } = ensureParentsFor(a);

    const sib = defaultPerson(state, "II", "Sibling");
    ensurePerson(state, sib);
    sib.fatherId = fa ? fa.id : null;
    sib.motherId = mo ? mo.id : null;

    if (fa) addChildLink(fa, sib.id);
    if (mo) addChildLink(mo, sib.id);

    state.activeId = sib.id;
    rerender();
  }

  function addChild() {
    const a = active();
    if (!a || a.gen !== "II") return;

    const child = defaultPerson(state, "III", "Child");
    ensurePerson(state, child);

    // assign parent slots
    if (a.sex === SEX.F) child.motherId = a.id;
    else child.fatherId = a.id;

    const pt = a.partnerId ? findById(state, a.partnerId) : null;
    if (pt) {
      if (pt.sex === SEX.F) child.motherId = pt.id;
      else if (pt.sex === SEX.M) child.fatherId = pt.id;
      else {
        if (!child.motherId) child.motherId = pt.id;
        else if (!child.fatherId) child.fatherId = pt.id;
      }
      addChildLink(pt, child.id);
    }

    addChildLink(a, child.id);

    state.activeId = child.id;
    rerender();
  }

  function deletePerson() {
    const a = active();
    if (!a) return;
    if (state.people.length <= 1) return;

    // unlink references
    for (const p of state.people) {
      if (p.fatherId === a.id) p.fatherId = null;
      if (p.motherId === a.id) p.motherId = null;
      if (p.partnerId === a.id) p.partnerId = null;
      p.childrenIds = (p.childrenIds || []).filter((cid) => cid !== a.id);
    }

    state.people = state.people.filter((p) => p.id !== a.id);

    if (state.probandId === a.id) state.probandId = state.people[0]?.id || null;
    state.activeId = state.probandId;

    rerender();
  }

  // ---------- events ----------
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-role]");
    if (!t) return;
    const role = t.getAttribute("data-role");

    if (role === "node") {
      const id = t.getAttribute("data-person-id");
      if (id) state.activeId = id;
      return rerender();
    }

    if (role === "setProband") {
      const a = active();
      if (!a) return;
      state.probandId = a.id;
      toast("Proband set", compactLabel(a, true));
      return rerender();
    }

    if (role === "toggleAffected") {
      const a = active();
      if (!a) return;
      a.affected = !a.affected;
      return rerender();
    }

    if (role === "toggleDeceased") {
      const a = active();
      if (!a) return;
      a.deceased = !a.deceased;
      return rerender();
    }

    if (role === "sexBtn") {
      const a = active();
      if (!a) return;
      const v = t.getAttribute("data-sex");
      a.sex = v === "M" ? SEX.M : v === "F" ? SEX.F : SEX.U;
      return rerender();
    }

    if (role === "addFather") return addFather();
    if (role === "addMother") return addMother();
    if (role === "addPartner") return addPartner();
    if (role === "addSibling") return addSibling();
    if (role === "addChild") return addChild();
    if (role === "deletePerson") return deletePerson();

    if (role === "viewText") {
      state.exportMode = "text";
      return rerender();
    }
    if (role === "viewTSV") {
      state.exportMode = "tsv";
      return rerender();
    }
    if (role === "viewJSON") {
      state.exportMode = "json";
      return rerender();
    }

    if (role === "copyExport") {
      const txt = currentExportText();
      // Prefer Clipboard API; fallback to copy-item binder if present
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard
          .writeText(txt)
          .then(() => toast("Copied", "Export copied to clipboard."))
          .catch(() => toast("Copy failed", "Clipboard permission denied."));
      } else {
        // bindCopyItems may copy from [data-copy]; we set it already
        toast("Copied", "Use the Copy feature of the page if needed.");
      }
      return;
    }

    if (role === "reset") {
      seed();
      toast("Reset", "Started with a fresh proband (Gen II).");
      return rerender();
    }

    if (role === "demo") {
      // Clean demo within 3 gens
      state.people = [];
      const fa = defaultPerson(state, "I", "Father");
      fa.sex = SEX.M;
      const mo = defaultPerson(state, "I", "Mother");
      mo.sex = SEX.F;
      marry(fa, mo);

      const prob = defaultPerson(state, "II", "Proband");
      prob.sex = SEX.F;
      prob.affected = true;
      prob.fatherId = fa.id;
      prob.motherId = mo.id;

      addChildLink(fa, prob.id);
      addChildLink(mo, prob.id);

      const sib = defaultPerson(state, "II", "Sibling");
      sib.sex = SEX.M;
      sib.fatherId = fa.id;
      sib.motherId = mo.id;
      addChildLink(fa, sib.id);
      addChildLink(mo, sib.id);

      const pt = defaultPerson(state, "II", "Partner");
      pt.sex = SEX.M;
      marry(prob, pt);

      const c1 = defaultPerson(state, "III", "Child1");
      c1.fatherId = pt.id;
      c1.motherId = prob.id;

      const c2 = defaultPerson(state, "III", "Child2");
      c2.sex = SEX.F;
      c2.affected = true;
      c2.fatherId = pt.id;
      c2.motherId = prob.id;

      addChildLink(prob, c1.id);
      addChildLink(pt, c1.id);
      addChildLink(prob, c2.id);
      addChildLink(pt, c2.id);

      state.people.push(fa, mo, prob, sib, pt, c1, c2);
      state.probandId = prob.id;
      state.activeId = prob.id;
      normalize3Gen(state);
      toast("Demo loaded", "Click nodes and try Inspector actions.");
      return rerender();
    }
  });

  // Name input (live)
  const nameInput = $("nameInput");
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      const a = active();
      if (!a) return;
      a.name = String(nameInput.value || "");
      rerender();
    });
  }

  // First paint
  rerender();
}