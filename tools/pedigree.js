// /tools/pedigree.js
// NeoAssist Tool Module Spec v1 compliant
// Simple text/symbol pedigree generator (ASCII/Unicode)
// updated: 2026-03-03

import { createScheduler } from "../core/utils.js";

const TOOL_KEY = "pedigree";
const DEBUG = false;

const SEX = {
  M: "M",
  F: "F",
  U: "U",
};

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uid() {
  return Math.random().toString(16).slice(2, 10);
}

function getShape(sex, affected) {
  const a = !!affected;
  if (sex === SEX.M) return a ? "■" : "□";
  if (sex === SEX.F) return a ? "●" : "○";
  return a ? "◆" : "◇";
}

function labelOf(p, { probandId } = {}) {
  const shape = getShape(p.sex, p.affected);
  const dead = p.deceased ? "†" : "";
  const arrow = p.id === probandId ? "→" : "  ";
  const nm = p.name?.trim() ? p.name.trim() : p.code;
  return `${arrow}${shape}${dead} ${nm}`;
}

function compactLabelOf(p) {
  const shape = getShape(p.sex, p.affected);
  const dead = p.deceased ? "†" : "";
  const nm = p.name?.trim() ? p.name.trim() : p.code;
  return `${shape}${dead} ${nm}`;
}

function findById(state, id) {
  return state.people.find((x) => x.id === id) || null;
}

function ensurePerson(state, person) {
  if (!state.people.some((p) => p.id === person.id)) state.people.push(person);
  return person;
}

function nextCode(state, genHint = null) {
  // codes: I-1, I-2 ... II-1 ...
  const gens = ["I", "II", "III", "IV"];
  const gen = genHint && gens.includes(genHint) ? genHint : "II";
  const used = state.people
    .map((p) => p.code)
    .filter(Boolean)
    .filter((c) => c.startsWith(gen + "-"));
  let n = 1;
  while (used.includes(`${gen}-${n}`)) n++;
  return `${gen}-${n}`;
}

function deriveGenFromCode(code) {
  // "II-3" -> "II"
  const m = String(code || "").match(/^([IVX]+)-\d+$/);
  return m ? m[1] : null;
}

function defaultPerson(state, { gen, name, sex = SEX.U } = {}) {
  const code = nextCode(state, gen || "II");
  return {
    id: uid(),
    code,
    name: name ?? "",
    sex,
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

function setParent(child, parent, kind /* 'father'|'mother' */) {
  if (kind === "father") child.fatherId = parent.id;
  if (kind === "mother") child.motherId = parent.id;
}

function marry(a, b) {
  if (!a || !b) return;
  a.partnerId = b.id;
  b.partnerId = a.id;
}

function siblingsOf(state, person) {
  const fa = person.fatherId;
  const mo = person.motherId;
  if (!fa && !mo) return [];
  return state.people.filter((p) => {
    if (p.id === person.id) return false;
    const sameFa = fa && p.fatherId === fa;
    const sameMo = mo && p.motherId === mo;
    return (fa && mo) ? (sameFa && sameMo) : (sameFa || sameMo);
  });
}

function childrenOf(state, person) {
  return person.childrenIds.map((id) => findById(state, id)).filter(Boolean);
}

function ancestors2(state, proband) {
  // return up to grandparents
  const father = proband.fatherId ? findById(state, proband.fatherId) : null;
  const mother = proband.motherId ? findById(state, proband.motherId) : null;

  const pf = father?.fatherId ? findById(state, father.fatherId) : null;
  const pm = father?.motherId ? findById(state, father.motherId) : null;
  const mf = mother?.fatherId ? findById(state, mother.fatherId) : null;
  const mm = mother?.motherId ? findById(state, mother.motherId) : null;

  return { father, mother, pf, pm, mf, mm };
}

function renderPedigreeText(state) {
  const proband = findById(state, state.probandId);
  if (!proband) return "No proband.";

  const { father, mother, pf, pm, mf, mm } = ancestors2(state, proband);
  const sibs = siblingsOf(state, proband).sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  const partner = proband.partnerId ? findById(state, proband.partnerId) : null;

  // children are from proband.childrenIds (plus partner link doesn't matter)
  const kids = childrenOf(state, proband).sort((a, b) => (a.code || "").localeCompare(b.code || ""));

  // Formatting helpers (monospace)
  const cellW = 16; // keep stable width for connectors
  const padCell = (s) => {
    const t = String(s);
    if (t.length >= cellW) return t.slice(0, cellW - 1) + "…";
    const left = Math.floor((cellW - t.length) / 2);
    const right = cellW - t.length - left;
    return " ".repeat(left) + t + " ".repeat(right);
  };
  const joinCells = (cells) => cells.map(padCell).join("");

  const L = (p) => (p ? compactLabelOf(p) : " ");
  const top = joinCells([L(pf), L(pm), " ", L(mf), L(mm)]);

  // parents row
  const parentsRow = joinCells([L(father), "─────", L(mother), " ", " "]);

  // siblings + proband + partner row
  const sibCells = sibs.map((p) => L(p));
  const selfCell = labelOf(proband, { probandId: state.probandId });
  const couple = partner ? `${selfCell}  ──  ${compactLabelOf(partner)}` : selfCell;

  // If too many siblings, show them as a list below instead of forcing 1-line
  let sibLine = "";
  if (sibs.length > 0) {
    const sibText = sibs.map((p) => compactLabelOf(p)).join("  ");
    sibLine = `Siblings: ${sibText}\n`;
  }

  // children row
  let kidsLine = "";
  if (kids.length > 0) {
    const kidsText = kids.map((p) => compactLabelOf(p)).join("  ");
    kidsLine = `Children: ${kidsText}\n`;
  }

  // connector-ish block (simple, readable, not “perfect CAD pedigree”)
  const block = [];
  block.push("PEDIGREE (text)");
  block.push("=".repeat(64));
  block.push("Grandparents (optional):");
  block.push(top.trimEnd());
  block.push("");
  block.push("Parents (optional):");
  block.push(parentsRow.trimEnd());
  block.push("");
  block.push("Proband & Partner:");
  block.push(couple);
  block.push("");
  if (sibLine) block.push(sibLine.trimEnd());
  if (kidsLine) block.push(kidsLine.trimEnd());

  block.push("");
  block.push("Legend:");
  block.push("  □ male   ○ female   ◇ unknown");
  block.push("  ■/●/◆ affected");
  block.push("  † deceased");
  block.push("  → proband");
  block.push("");
  block.push("People (codes):");
  const list = [...state.people].sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  for (const p of list) {
    block.push(`  ${p.code}: ${compactLabelOf(p)}${p.id === state.probandId ? "  (proband)" : ""}`);
  }

  return block.join("\n");
}

function renderPeopleList(state) {
  const items = [...state.people].sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  return items
    .map((p) => {
      const active = p.id === state.activeId ? " active" : "";
      const shape = getShape(p.sex, p.affected);
      const dead = p.deceased ? "†" : "";
      const nm = p.name?.trim() ? p.name.trim() : "(no name)";
      const probandTag = p.id === state.probandId ? `<span class="badge text-bg-dark ms-2">proband</span>` : "";
      return `
        <button type="button"
          class="list-group-item list-group-item-action d-flex justify-content-between align-items-center${active}"
          data-role="personItem"
          data-person-id="${escapeHtml(p.id)}">
          <span class="text-truncate">
            <span class="me-2">${escapeHtml(shape + dead)}</span>
            <span class="me-2 fw-semibold">${escapeHtml(p.code)}</span>
            <span class="text-muted">${escapeHtml(nm)}</span>
            ${probandTag}
          </span>
          <span class="text-muted small">edit</span>
        </button>
      `;
    })
    .join("");
}

function ensureMinimumFamily(state) {
  // create proband if empty
  if (state.people.length === 0) {
    const proband = defaultPerson(state, { gen: "II", name: "Proband", sex: SEX.U });
    state.probandId = proband.id;
    state.activeId = proband.id;
    state.people.push(proband);
  }
}

export function render() {
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card h-100">
        <div class="card-header text-center">家族樹（文字/符號）</div>

        <div class="card-body pt-2">
          <style>
            [data-tool="${TOOL_KEY}"] .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
            [data-tool="${TOOL_KEY}"] pre.pedigree {
              white-space: pre;
              font-size: 12px;
              line-height: 1.25;
              border: 1px solid rgba(0,0,0,.08);
              border-radius: 10px;
              padding: 12px;
              margin: 0;
              background: transparent;
              overflow: auto;
              min-height: 260px;
            }
            [data-tool="${TOOL_KEY}"] .hint { font-size: 12px; color: rgba(0,0,0,.55); }
            [data-tool="${TOOL_KEY}"] .tight .input-group-text { padding-top: .35rem; padding-bottom: .35rem; }
            [data-tool="${TOOL_KEY}"] .tight .form-control,
            [data-tool="${TOOL_KEY}"] .tight .form-select { padding-top: .35rem; padding-bottom: .35rem; }
          </style>

          <div class="row g-2">
            <!-- left: people + controls -->
            <div class="col-12 col-lg-5">
              <div class="d-flex align-items-center justify-content-between">
                <div class="fw-semibold">People</div>
                <div class="d-flex gap-1">
                  <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addPerson">+ Person</button>
                  <button type="button" class="btn btn-sm btn-outline-secondary" data-role="setProband">Set proband</button>
                </div>
              </div>

              <div class="mt-2 list-group" data-role="peopleList"></div>

              <div class="mt-3">
                <div class="fw-semibold mb-1">Edit selected</div>

                <div class="tight">
                  <div class="input-group mb-2">
                    <span class="input-group-text" style="width: 30%;">Code</span>
                    <input class="form-control text-center mono" data-role="code" placeholder="II-1" />
                  </div>

                  <div class="input-group mb-2">
                    <span class="input-group-text" style="width: 30%;">Name</span>
                    <input class="form-control text-center" data-role="name" placeholder="e.g., Father" />
                  </div>

                  <div class="input-group mb-2">
                    <span class="input-group-text" style="width: 30%;">Sex</span>
                    <select class="form-select text-center" data-role="sex">
                      <option value="U">Unknown</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>

                  <div class="d-flex gap-2 mb-2">
                    <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-role="toggleAffected">Affected</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-role="toggleDeceased">Deceased</button>
                    <button type="button" class="btn btn-sm btn-outline-danger flex-fill" data-role="deletePerson">Delete</button>
                  </div>

                  <div class="hint mb-2">關係操作：先選人，再按下列按鈕建立關係（會自動補齊必要人物）。</div>

                  <div class="d-flex flex-wrap gap-1">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addFather">+ Father</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addMother">+ Mother</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addSibling">+ Sibling</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addPartner">+ Partner</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-role="addChild">+ Child</button>
                  </div>

                  <div class="mt-2 d-flex gap-1">
                    <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-role="reset">Reset</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-role="demo">Demo</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- right: output -->
            <div class="col-12 col-lg-7">
              <div class="d-flex align-items-center justify-content-between">
                <div class="fw-semibold">Output</div>
                <div class="d-flex gap-1">
                  <button type="button" class="btn btn-sm btn-outline-secondary copy-item" data-role="copyTreeBtn" title="Copy pedigree text">Copy</button>
                </div>
              </div>

              <div class="mt-2">
                <pre class="pedigree mono copy-item" data-role="treeText"></pre>
              </div>

              <div class="hint mt-2">
                特色：不用拖曳、不用畫圖；適合貼在病歷摘要、報告、討論紀錄。若要更完整（雙胞胎、流產、婚姻多次等），再加規則即可。
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer text-center small text-muted">
          Symbols: □/○/◇ (unaffected), ■/●/◆ (affected), † (deceased), → (proband)
        </div>
      </div>
    </div>
  `;
}

export function init(root) {
  const el = (role) => root.querySelector(`[data-role="${role}"]`);

  const state = {
    people: [],
    probandId: null,
    activeId: null,
  };

  ensureMinimumFamily(state);

  const scheduler = createScheduler(() => {
    if (!root.isConnected) return;
    renderAll();
  });

  function active() {
    return findById(state, state.activeId) || findById(state, state.probandId) || state.people[0] || null;
  }

  function rerenderSoon() {
    scheduler.schedule();
  }

  function renderAll() {
    // people list
    el("peopleList").innerHTML = renderPeopleList(state);

    // editor fields
    const a = active();
    if (a) {
      el("code").value = a.code || "";
      el("name").value = a.name || "";
      el("sex").value = a.sex || SEX.U;

      // button styles
      el("toggleAffected").classList.toggle("btn-outline-secondary", !a.affected);
      el("toggleAffected").classList.toggle("btn-dark", !!a.affected);

      el("toggleDeceased").classList.toggle("btn-outline-secondary", !a.deceased);
      el("toggleDeceased").classList.toggle("btn-dark", !!a.deceased);
    }

    // output
    const txt = renderPedigreeText(state);
    el("treeText").textContent = txt;

    // make the copy button copy the pre content (copy-item binder will handle it if you use bindCopyItems globally)
    el("copyTreeBtn").setAttribute("data-copy", txt);
    el("treeText").setAttribute("data-copy", txt);
  }

  // ===== Events =====

  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-role]");
    if (!btn) return;
    const role = btn.getAttribute("data-role");

    // select person item
    if (role === "personItem") {
      const pid = btn.getAttribute("data-person-id");
      if (pid) state.activeId = pid;
      rerenderSoon();
      return;
    }

    if (role === "addPerson") {
      const p = defaultPerson(state, { gen: "II", name: "" });
      ensurePerson(state, p);
      state.activeId = p.id;
      rerenderSoon();
      return;
    }

    if (role === "setProband") {
      const a = active();
      if (a) state.probandId = a.id;
      rerenderSoon();
      return;
    }

    if (role === "toggleAffected") {
      const a = active();
      if (a) a.affected = !a.affected;
      rerenderSoon();
      return;
    }

    if (role === "toggleDeceased") {
      const a = active();
      if (a) a.deceased = !a.deceased;
      rerenderSoon();
      return;
    }

    if (role === "deletePerson") {
      const a = active();
      if (!a) return;

      // don't allow deleting the last person
      if (state.people.length <= 1) return;

      // remove links
      for (const p of state.people) {
        if (p.fatherId === a.id) p.fatherId = null;
        if (p.motherId === a.id) p.motherId = null;
        if (p.partnerId === a.id) p.partnerId = null;
        p.childrenIds = p.childrenIds.filter((cid) => cid !== a.id);
      }

      state.people = state.people.filter((p) => p.id !== a.id);

      if (state.probandId === a.id) state.probandId = state.people[0]?.id || null;
      state.activeId = state.probandId;

      rerenderSoon();
      return;
    }

    // relationship ops
    if (role === "addFather" || role === "addMother") {
      const child = active();
      if (!child) return;

      const childGen = deriveGenFromCode(child.code) || "II";
      const parentGen = childGen === "I" ? "I" : "I"; // keep simple: parents in I if child in II
      const parent = defaultPerson(state, {
        gen: parentGen,
        name: role === "addFather" ? "Father" : "Mother",
        sex: role === "addFather" ? SEX.M : SEX.F,
      });
      ensurePerson(state, parent);

      setParent(child, parent, role === "addFather" ? "father" : "mother");

      // auto marry if the other parent exists
      const otherId = role === "addFather" ? child.motherId : child.fatherId;
      const other = otherId ? findById(state, otherId) : null;
      if (other) marry(parent, other);

      state.activeId = parent.id;
      rerenderSoon();
      return;
    }

    if (role === "addSibling") {
      const a = active();
      if (!a) return;

      // ensure parents exist if missing? We'll create unknown parents as needed.
      let fa = a.fatherId ? findById(state, a.fatherId) : null;
      let mo = a.motherId ? findById(state, a.motherId) : null;

      const aGen = deriveGenFromCode(a.code) || "II";
      const parentGen = aGen === "I" ? "I" : "I";

      if (!fa) {
        fa = defaultPerson(state, { gen: parentGen, name: "Father", sex: SEX.M });
        ensurePerson(state, fa);
        a.fatherId = fa.id;
      }
      if (!mo) {
        mo = defaultPerson(state, { gen: parentGen, name: "Mother", sex: SEX.F });
        ensurePerson(state, mo);
        a.motherId = mo.id;
      }
      marry(fa, mo);

      const sib = defaultPerson(state, { gen: aGen, name: "Sibling", sex: SEX.U });
      ensurePerson(state, sib);
      sib.fatherId = fa.id;
      sib.motherId = mo.id;

      addChildLink(fa, sib.id);
      addChildLink(mo, sib.id);

      state.activeId = sib.id;
      rerenderSoon();
      return;
    }

    if (role === "addPartner") {
      const a = active();
      if (!a) return;

      if (a.partnerId) {
        // already has partner -> just select it
        state.activeId = a.partnerId;
        rerenderSoon();
        return;
      }

      const aGen = deriveGenFromCode(a.code) || "II";
      const partner = defaultPerson(state, { gen: aGen, name: "Partner", sex: SEX.U });
      ensurePerson(state, partner);
      marry(a, partner);

      state.activeId = partner.id;
      rerenderSoon();
      return;
    }

    if (role === "addChild") {
      const a = active();
      if (!a) return;

      const aGen = deriveGenFromCode(a.code) || "II";
      const childGen = aGen === "I" ? "II" : aGen === "II" ? "III" : "IV";

      const child = defaultPerson(state, { gen: childGen, name: "Child", sex: SEX.U });
      ensurePerson(state, child);

      // assign parents: if a is male -> father, female -> mother, unknown -> father by default
      if (a.sex === SEX.F) child.motherId = a.id;
      else child.fatherId = a.id;

      // if partner exists, assign other parent accordingly
      const partner = a.partnerId ? findById(state, a.partnerId) : null;
      if (partner) {
        if (partner.sex === SEX.F) child.motherId = partner.id;
        else if (partner.sex === SEX.M) child.fatherId = partner.id;
        else {
          // unknown partner: fill whichever slot is empty
          if (!child.motherId) child.motherId = partner.id;
          else if (!child.fatherId) child.fatherId = partner.id;
        }
      }

      // link childrenIds
      addChildLink(a, child.id);
      if (partner) addChildLink(partner, child.id);

      state.activeId = child.id;
      rerenderSoon();
      return;
    }

    if (role === "reset") {
      state.people = [];
      state.probandId = null;
      state.activeId = null;
      ensureMinimumFamily(state);
      rerenderSoon();
      return;
    }

    if (role === "demo") {
      state.people = [];
      state.probandId = null;
      state.activeId = null;

      // build a small demo pedigree
      const proband = defaultPerson(state, { gen: "II", name: "Proband", sex: SEX.F });
      proband.affected = true;

      const father = defaultPerson(state, { gen: "I", name: "Father", sex: SEX.M });
      const mother = defaultPerson(state, { gen: "I", name: "Mother", sex: SEX.F });
      marry(father, mother);
      proband.fatherId = father.id;
      proband.motherId = mother.id;
      addChildLink(father, proband.id);
      addChildLink(mother, proband.id);

      const sib = defaultPerson(state, { gen: "II", name: "Sibling", sex: SEX.M });
      sib.fatherId = father.id;
      sib.motherId = mother.id;
      addChildLink(father, sib.id);
      addChildLink(mother, sib.id);

      const partner = defaultPerson(state, { gen: "II", name: "Partner", sex: SEX.M });
      marry(proband, partner);

      const child1 = defaultPerson(state, { gen: "III", name: "Child1", sex: SEX.U });
      child1.fatherId = partner.id;
      child1.motherId = proband.id;
      addChildLink(proband, child1.id);
      addChildLink(partner, child1.id);

      const child2 = defaultPerson(state, { gen: "III", name: "Child2", sex: SEX.F });
      child2.fatherId = partner.id;
      child2.motherId = proband.id;
      child2.affected = true;
      addChildLink(proband, child2.id);
      addChildLink(partner, child2.id);

      state.people.push(father, mother, proband, sib, partner, child1, child2);
      state.probandId = proband.id;
      state.activeId = proband.id;

      rerenderSoon();
      return;
    }
  });

  // input changes (realtime)
  const onInput = (role, fn) => {
    const node = el(role);
    node.addEventListener("input", () => {
      fn(node.value);
      rerenderSoon();
    });
    node.addEventListener("change", () => {
      fn(node.value);
      rerenderSoon();
    });
  };

  onInput("code", (v) => {
    const a = active();
    if (!a) return;
    a.code = String(v || "").trim();
  });

  onInput("name", (v) => {
    const a = active();
    if (!a) return;
    a.name = String(v || "");
  });

  onInput("sex", (v) => {
    const a = active();
    if (!a) return;
    a.sex = v === "M" ? SEX.M : v === "F" ? SEX.F : SEX.U;
  });

  // initial render
  renderAll();
}