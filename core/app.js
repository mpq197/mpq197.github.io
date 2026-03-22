// core/app.js
// updated: 2026-03-23
// note: remove legacy jQuery code

import { bindCopyItems } from "./utils.js";

/**
 * Routing:
 * - #tool=xxx  => single tool view
 * - #group=grp => group dashboard view (ALL tools in that group, single-column)
 */
const GROUPS = [
  {
    id: "grp-fluid",
    title: "水分",
    items: [
      { key: "fluid", label: "水分計算", module: `../tools/fluid.js`  },
      { key: "gir", label: "GIR 計算", module: `../tools/gir.js`  },
      { key: "dex", label: "Dex 濃度", module: `../tools/dex.js`  },
      { key: "hypoNa", label: "低鈉矯正", module: `../tools/hypoNa.js`  },
      { key: "jusomin", label: "酸中毒矯正", module: `../tools/jusomin.js`  },
    ],
  },
  {
    id: "grp-med",
    title: "藥物",
    items: [
      { key: "drug", label: "藥物泡法", module: "../tools/drug.js"  },
      { key: "anti_nb", label: "NB常用抗生素泡法", module: "../tools/anti_nb.js"  },
    ],
  },
  {
    id: "grp-growth",
    title: "測量",
    items: [
      { key: "growth", label: "生長測量", module: "../tools/growth.js"  },
      { key: "age", label: "年齡計算", module: "../tools/age.js"  },
      { key: "umbilical_cath_len", label: "UA/UV 深度", module: "../tools/umbilical_cath_len.js"  },
    ],
  },
  {
    id: "grp-oth",
    title: "其他",
    items: [
      { key: "lab", label: "Lab整理", module: "../tools/lab.js"  },
      { key: "med", label: "藥囑整理", module: "../tools/medorder.js"  },
      { key: "icd10", label: "常用診斷碼", module: "../tools/icd10.js"  },
      { key: "pedigree", label: "家族樹", module: "../tools/pedigree.js"  },
      { key: "docs", label: "常用文件", module: "../tools/files.js"  },
    ],
  },
];

const MODULE_CACHE = new Map();

const sidebar   = document.getElementById("neoSidebar");
const miniMount = document.getElementById("neoSidebarGroupsCollapsed");
const fullMount = document.getElementById("neoSidebarGroupsExpanded");
const searchEl  = document.getElementById("neoToolSearch");
const mainEl    = document.getElementById("neoMain");

const toggleBtnCollapsed = document.getElementById("sidebarToggleBtnCollapsed");
const toggleBtnExpanded  = document.getElementById("sidebarToggleBtnExpanded");

/* -------------------------
   GA helpers
------------------------- */
function gaEvent(name, params = {}) {
  // Do not let analytics break UI
  try {
    window.gtag?.("event", name, params);
  } catch (_) {}
}

function isHoverCapable(){
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/* -------------------------
   Sidebar open/close helpers
------------------------- */
function openSidebar(){
  sidebar?.classList.add("is-open");
  // expanded layer will be visible after transition; focusing immediately is fine
  searchEl?.focus();
}
function closeSidebar(){
  sidebar?.classList.remove("is-open");
}
function toggleSidebar(){
  if (!sidebar) return;
  sidebar.classList.toggle("is-open");
  if (sidebar.classList.contains("is-open")) searchEl?.focus();
}

/* -------------------------
   Hash parsing
------------------------- */
function getRouteFromHash(){
  const h = location.hash || "";
  const mTool  = h.match(/tool=([^&]+)/);
  const mGroup = h.match(/group=([^&]+)/);
  if (mTool)  return { type: "tool",  key: decodeURIComponent(mTool[1]) };
  if (mGroup) return { type: "group", key: decodeURIComponent(mGroup[1]) };
  return { type: "group", key: GROUPS[0]?.id };
}

function setHashTool(toolKey){
  history.replaceState(null, "", `#tool=${encodeURIComponent(toolKey)}`);
}
function setHashGroup(groupId){
  history.replaceState(null, "", `#group=${encodeURIComponent(groupId)}`);
}

/* -------------------------
   Finders
------------------------- */
function findToolByKey(key){
  for (const g of GROUPS){
    const it = g.items.find(x => x.key === key);
    if (it) return { groupId: g.id, groupTitle: g.title, ...it };
  }
  return null;
}
function findGroupById(groupId){
  return GROUPS.find(g => g.id === groupId) || null;
}

/* -------------------------
   Module loader cache
------------------------- */
async function importModule(path){
  if (!MODULE_CACHE.has(path)) MODULE_CACHE.set(path, import(path));
  return MODULE_CACHE.get(path);
}

/* -------------------------
   Sidebar: collapsed groups
------------------------- */
function formatGroupTitle(title){ return title; }

function buildCollapsedGroups(){
  if (!miniMount) return;

  miniMount.innerHTML = `<div class="neo-group-mini"></div>`;
  const wrap = miniMount.querySelector(".neo-group-mini");

  GROUPS.forEach(g => {
    const a = document.createElement("a");
    a.href = "javascript:void(0)";
    a.className = "neo-group-mini-btn";
    a.dataset.group = g.id;
    a.innerHTML = `<div class="neo-mini-title">${formatGroupTitle(g.title)}</div>`;

    a.addEventListener("click", async (e) => {
      e.preventDefault();

      // ✅ GA: group click (mini)
      gaEvent("group_click", {
        group_id: g.id,
        group_name: g.title,
        source: "mini"
      });

      await loadGroup(g.id);
      setHashGroup(g.id);
      setActive();
      // openSidebar(); // 點擊 mini group 時不強制打開 sidebar
    });

    wrap?.appendChild(a);
  });
}

/* -------------------------
   Sidebar: expanded groups+tools
------------------------- */
function buildExpandedGroups(filterText=""){
  if (!fullMount) return;

  const q = filterText.trim().toLowerCase();
  fullMount.innerHTML = "";

  GROUPS.forEach(g => {
    const items = g.items.filter(it => it.label.toLowerCase().includes(q));
    if (q && items.length === 0) return;

    const block = document.createElement("div");
    block.className = "neo-group";
    block.setAttribute("data-group-block", g.id);

    const h = document.createElement("div");
    h.className = "neo-group-h";
    h.textContent = g.title;

    // click group header => dashboard
    h.addEventListener("click", async (e) => {
      e.preventDefault();

      // ✅ GA: group click (header)
      gaEvent("group_click", {
        group_id: g.id,
        group_name: g.title,
        source: "header"
      });

      await loadGroup(g.id);
      setHashGroup(g.id);
      setActive();
      if (!isHoverCapable()) closeSidebar();
    });

    const b = document.createElement("div");
    b.className = "neo-group-b";

    items.forEach(it => {
      const link = document.createElement("a");
      link.className = "neo-navlink";
      link.href = `#tool=${encodeURIComponent(it.key)}`;
      link.dataset.tool = it.key;
      link.textContent = it.label;

      link.addEventListener("click", async (e) => {
        e.preventDefault();

        // ✅ GA: tool click
        gaEvent("tool_click", {
          tool_id: it.key,
          tool_name: it.label,
          group_id: g.id,
          group_name: g.title
        });

        await loadTool(it.key);
        setHashTool(it.key);
        setActive();
        if (!isHoverCapable()) closeSidebar();
      });

      b.appendChild(link);
    });

    block.appendChild(h);
    block.appendChild(b);
    fullMount.appendChild(block);
  });

  setActive();
}

/* -------------------------
   Active highlight
------------------------- */
function setActive(){
  const route = getRouteFromHash();

  document.querySelectorAll("[data-tool]").forEach(a => {
    a.classList.toggle("active", route.type === "tool" && a.dataset.tool === route.key);
  });

  const activeGroupId =
    route.type === "group"
      ? route.key
      : (findToolByKey(route.key)?.groupId);

  document.querySelectorAll("[data-group]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.group === activeGroupId);
  });
}

/* -------------------------
   Render: tool view
------------------------- */
async function loadTool(toolKey){
  const meta = findToolByKey(toolKey) || findToolByKey(GROUPS[0]?.items?.[0]?.key);
  if (!meta) return;

  const main = document.getElementById("neoMain");
  if (!main) return;

  const mod = await importModule(meta.module);
  main.innerHTML = mod.render();

  if (typeof mod.init === "function") mod.init(main);
  bindCopyItems(main);

  // (Optional) GA virtual pageview for SPA tool view
  gaEvent("page_view", { page_path: `/tool/${meta.key}` });
}

/* -------------------------
   Render: group dashboard (SINGLE COLUMN)
------------------------- */
async function loadGroup(groupId){
  const g = findGroupById(groupId) || GROUPS[0];
  if (!g) return;

  const main = document.getElementById("neoMain");
  if (!main) return;

  main.innerHTML = `
    <div class="neo-main-group-title">${g.title}</div>
    <div class="row g-3" id="neoDashRow"></div>
  `;

  const row = main.querySelector("#neoDashRow");
  if (!row) return;

  const modules = await Promise.all(
    g.items.map(async (it) => {
      const mod = await importModule(it.module);
      return { it, mod };
    })
  );

  modules.forEach(({ it, mod }) => {
    const col = document.createElement("div");
    col.className = "col-12";

    const mount = document.createElement("div");
    mount.className = "neo-tool-host";
    mount.dataset.toolHost = it.key;

    mount.innerHTML = mod.render();
    col.appendChild(mount);
    row.appendChild(col);

    if (typeof mod.init === "function") mod.init(mount);
    bindCopyItems(mount);
  });

  // (Optional) GA virtual pageview for SPA group dashboard
  gaEvent("page_view", { page_path: `/group/${g.id}` });
}

/* -------------------------
   Router
------------------------- */
async function applyRoute(){
  const route = getRouteFromHash();
  if (route.type === "tool") await loadTool(route.key);
  else await loadGroup(route.key);
  setActive();
}

window.addEventListener("hashchange", applyRoute);

/* -------------------------
   UI bindings (final behavior)
------------------------- */
function bindToggle(btn, which){
  btn?.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent sidebar click handler

    gaEvent("sidebar_toggle", {
      which, // "collapsed" or "expanded"
      to_open: !(sidebar?.classList.contains("is-open"))
    });

    toggleSidebar();
  });
}
bindToggle(toggleBtnCollapsed, "collapsed");
bindToggle(toggleBtnExpanded, "expanded");

// Click main => CLOSE
mainEl?.addEventListener("click", () => {
  closeSidebar();
});

// Search filter
searchEl?.addEventListener("input", () => {
  buildExpandedGroups(searchEl.value);

  // Optional: track search usage (does not include medical data)
  gaEvent("tool_search", {
    keyword_len: (searchEl.value || "").length
  });
});

window.addEventListener("load", async () => {
  buildCollapsedGroups();
  buildExpandedGroups("");

  await applyRoute();

  // start collapsed
  closeSidebar();

  // ✅ GA: site open (optional; GA sessions already exist)
  gaEvent("site_open", {
    page_path: location.pathname + location.hash
  });

  // ✅ Legacy button tracking
  const legacyBtn = document.getElementById("neoLegacyBtn");
  legacyBtn?.addEventListener("click", () => {
    gaEvent("open_legacy", {
      link_url: legacyBtn.href,
      source: "footer_btn",
      appVersion : appVersion 
    });
  });

});



