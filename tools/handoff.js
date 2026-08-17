// tools/handoff.js
// NeoAssist Clinical Handoff / Daily Note — Simple v0.3
// 2026-08-17
//
// Design goals
// - fast daily documentation with minimal fields
// - one source -> handoff / progress note / history / export
// - no Impression / Active Problem automation yet
// - no GENERAL block
// - system blocks are plain free-text: RESP/CV/GI/INF/HEME/NEURO/RENAL/OTHER
// - LINE / FLUIDS / SUPPORT contains lines, fluid-order text, ventilator mode + manual setting
// - local IndexedDB autosave, daily history, carry-forward, finalize/revision
// - optional 210 x 270 mm preview
// - patient bed sidebar for fast switching

const TOOL_KEY = "handoff";
const DB_NAME = "neoassist-clinical-handoff";
const DB_VERSION = 2;
const AUTOSAVE_DELAY_MS = 650;

const SYSTEMS = [
  ["resp", "RESP"],
  ["cv", "CV"],
  ["gi", "GI"],
  ["inf", "INF"],
  ["heme", "HEME"],
  ["neuro", "NEURO"],
  ["renal", "RENAL"],
  ["other", "OTHER"],
];

const VENT_MODES = [
  "", "Room air", "NC", "HFNC", "nCPAP", "NIPPV", "NIMV", "BiPAP",
  "SIMV", "A/C", "PC", "PSV", "PRVC", "HFOV", "HFJV", "Other"
];

const SHIFTS = [
  ["daily", "每日"],
  ["day", "白班"],
  ["evening", "小夜"],
  ["night", "大夜"],
];

const FLUID_PLACEHOLDER = `*************** IVF 醫囑 ***************
BW: 2332 g
Total daily fluid: 2323 ml/kg/day = total 5417.2 ml/day
Diet: 232 ml/day
TPN 2 g/kg/day = 7.8 ml/hr
SMOF 2 g/kg/day = 1.2 ml/hr run 20 hrs
D5W(250) run 207.3 ml/hr
****************************************`;

let activeApp = null;

export function render() {
  return `
  <section class="hf" data-tool="${TOOL_KEY}">
    <style>${STYLES}</style>

    <header class="hf-topbar">
      <div class="hf-title">Clinical Daily Note</div>
      <div class="hf-nav">
        <span class="hf-current-patient" data-ref="currentPatientLabel"></span>
        <button class="hf-square" data-action="prevDay">‹</button>
        <input type="date" data-ref="date">
        <button class="hf-square" data-action="nextDay">›</button>
        <button data-action="today">今天</button>
        <label>班別 <select data-field="shift">${SHIFTS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label>
      </div>
      <div class="hf-nav hf-nav-right">
        <button data-action="togglePreview" data-ref="previewToggle">預覽</button>
        <button data-action="copy">複製</button>
        <button data-action="history">歷程</button>
        <button data-action="editHistory" data-ref="editHistoryBtn" hidden>編輯此日</button>
        <button data-action="save">儲存</button>
        <button data-action="finalize" class="hf-accent">完成今日</button>
      </div>
    </header>

    <div class="hf-status">
      <span class="hf-dot" data-ref="dot"></span>
      <span data-ref="saveStatus">初始化中…</span>
      <span class="hf-badge" data-ref="recordBadge"></span>
      <span class="hf-spacer"></span>
      <button class="hf-link" data-action="backup">匯出備份</button>
      <button class="hf-link" data-action="restore">匯入備份</button>
      <input data-ref="restoreFile" type="file" accept=".json,application/json" hidden>
    </div>

    <div class="hf-shell" data-ref="shell">
      <aside class="hf-patient-sidebar">
        <div class="hf-sidebar-head">床號</div>
        <div class="hf-patient-list" data-ref="patientList"></div>
        <button class="hf-add-patient" data-action="newPatient">＋ 新病人</button>
      </aside>

      <main class="hf-editor">
        <section class="hf-panel hf-static">
          <div class="hf-panel-head">
            <strong>PATIENT / STATIC BACKGROUND</strong>
            <span>建立後通常不需每日修改</span>
          </div>
          <div class="hf-patient-row">
            ${field("床號","patient.bed","text","502")}
            ${field("姓名／代稱","patient.name","text","")}
            ${field("病歷號","patient.mrn","text","")}
            ${field("入院日","patient.admissionDate","date","")}
          </div>
          <div class="hf-patient-row hf-patient-row-5">
            ${field("出生日期","patient.birthDate","date","")}
            ${field("GA wk","patient.gaWeeks","number","",'min="20" max="45" step="1"')}
            ${field("GA day","patient.gaDays","number","",'min="0" max="6" step="1"')}
            ${field("BBW (g)","patient.birthWeightG","number","",'min="100" step="1"')}
            ${field("胎次／其他","patient.plurality","text","")}
          </div>
          <label class="hf-textrow">
            <span>固定背景</span>
            <textarea rows="3" data-field="patient.background" placeholder="Maternal history / delivery / birth course / important fixed background"></textarea>
          </label>
        </section>

        <section class="hf-panel">
          <div class="hf-panel-head">
            <strong>TODAY'S SUMMARY</strong>
            <span data-ref="derivedDate"></span>
          </div>
          <textarea class="hf-summary" rows="4" data-field="todaySummary" placeholder="今天整體病況、重要變化、目前重點；建議 3–5 行。"></textarea>
          <label class="hf-textrow hf-compact-top">
            <span>Today data</span>
            <textarea rows="2" data-field="todayData" placeholder="例如：BW 1280g (+20), IO +20, UO 1.2, Kcal 120, Stool x5, residual 2–5 mL coffee-ground"></textarea>
          </label>
        </section>

        <div data-ref="systems"></div>

        <section class="hf-panel">
          <div class="hf-panel-head">
            <strong>LINE / FLUIDS / SUPPORT</strong>
            <span>無變化時自動 carry forward</span>
          </div>

          <label class="hf-textrow">
            <span>Line</span>
            <textarea rows="2" data-field="lineSupport.lines" placeholder="PCVC (7/25-), 3#ETT (7/25-), UAC (7/25-7/29) …"></textarea>
          </label>

          <label class="hf-textrow">
            <span>Fluids</span>
            <textarea rows="8" data-field="lineSupport.fluids" placeholder="${escapeAttr(FLUID_PLACEHOLDER)}"></textarea>
          </label>

          <div class="hf-support-row">
            <span>Support</span>
            <select data-field="lineSupport.ventMode" aria-label="呼吸器模式">
              ${VENT_MODES.map(v => `<option value="${escapeAttr(v)}">${escapeHTML(v || "模式")}</option>`).join("")}
            </select>
            <input type="text" data-field="lineSupport.ventSettings" placeholder="手打設定，例如 23%, 34, 14/5 或 MAP 12, Amp 24, Hz 12">
          </div>
        </section>

        <section class="hf-panel">
          <div class="hf-panel-head"><strong>TO-DO / WATCH</strong><span>簡短即可；未完成事項可帶到隔日</span></div>
          <div class="hf-two-text">
            <label><span>TO-DO</span><textarea rows="3" data-field="todo" placeholder="6/30 lab\nFollow echo"></textarea></label>
            <label><span>WATCH</span><textarea rows="3" data-field="watch" placeholder="UO / BP / abdominal distension …"></textarea></label>
          </div>
        </section>
      </main>

      <aside class="hf-preview-wrap" data-ref="previewWrap" hidden>
        <div class="hf-preview-toolbar">
          <div class="hf-segment">
            <button class="is-active" data-action="mode" data-mode="progress">Progress Note</button>
            <button data-action="mode" data-mode="handoff">Handoff</button>
          </div>
          <button data-action="copy">複製</button>
          <button data-action="togglePreview">關閉預覽</button>
        </div>
        <div class="hf-paper-stage">
          <article class="hf-paper" data-ref="paper"></article>
        </div>
        <div class="hf-overflow" data-ref="overflow" hidden>內容已超過 210 × 270 mm 一頁範圍。</div>
      </aside>
    </div>

    <dialog class="hf-dialog" data-ref="patientDialog">
      <div class="hf-dialog-card">
        <h2>建立病人</h2>
        <label>床號<input data-ref="newBed" type="text"></label>
        <label>姓名／代稱<input data-ref="newName" type="text"></label>
        <label>病歷號<input data-ref="newMrn" type="text"></label>
        <div class="hf-dialog-actions">
          <button data-action="closeDialog">取消</button>
          <button class="hf-accent" data-action="createPatient">建立</button>
        </div>
      </div>
    </dialog>

    <dialog class="hf-dialog" data-ref="historyDialog">
      <div class="hf-dialog-card hf-history-card">
        <h2>每日歷程</h2>
        <div data-ref="historyList"></div>
        <div class="hf-dialog-actions"><button data-action="closeDialog">關閉</button></div>
      </div>
    </dialog>

  </section>`;
}

export async function init(host = document) {
  // NeoAssist app.js passes #neoMain (single-tool view) or .neo-tool-host
  // (group view). Resolve the actual handoff section from that host.
  const root =
    host?.matches?.(`[data-tool="${TOOL_KEY}"]`)
      ? host
      : host?.querySelector?.(`[data-tool="${TOOL_KEY}"]`);

  if (!root) {
    console.warn("[handoff] root not found");
    return null;
  }

  if (root.__handoffApp) return root.__handoffApp;

  // Clean up any previous handoff instance before mounting a new one.
  if (activeApp && activeApp.root !== root) {
    activeApp.destroy();
  }

  const app = new HandoffApp(root);
  root.__handoffApp = app;
  activeApp = app;

  await app.init();
  return app;
}

export function destroy() {
  activeApp?.destroy();
  activeApp = null;
}

class HandoffApp {
  constructor(root) {
    this.root = root;
    this.db = null;
    this.patients = [];
    this.patient = null;
    this.record = null;
    this.previousRecord = null;
    this.previewMode = "progress";
    this.saveTimer = null;
    this.dirty = false;
    this.patientDirty = false;
    this.allowHistoricalEdit = false;
    this.onInput = this.onInput.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onRestore = this.onRestore.bind(this);
  }

  async init() {
    this.cache();
    this.bind();
    this.db = await openDb();
    this.patients = (await getAll(this.db,"patients")).map(normalizePatient).sort(sortPatients);
    if (!this.patients.length) {
      const p = blankPatient();
      await put(this.db,"patients",p);
      this.patients = [p];
    }
    const savedId = await getSetting(this.db,"currentPatientId");
    const firstId = this.patients.some(p=>p.id===savedId) ? savedId : this.patients[0].id;
    this.renderPatientOptions(firstId);
    await this.selectPatient(firstId,false);
    this.setStatus("saved","已載入；資料保存在此瀏覽器");
  }

  cache() {
    const q = s => this.root.querySelector(s);
    this.r = {
      patientList:q('[data-ref="patientList"]'), currentPatientLabel:q('[data-ref="currentPatientLabel"]'), date:q('[data-ref="date"]'),
      saveStatus:q('[data-ref="saveStatus"]'), dot:q('[data-ref="dot"]'), badge:q('[data-ref="recordBadge"]'),
      systems:q('[data-ref="systems"]'), derivedDate:q('[data-ref="derivedDate"]'), paper:q('[data-ref="paper"]'), overflow:q('[data-ref="overflow"]'),
      patientDialog:q('[data-ref="patientDialog"]'), historyDialog:q('[data-ref="historyDialog"]'), historyList:q('[data-ref="historyList"]'),
      newBed:q('[data-ref="newBed"]'), newName:q('[data-ref="newName"]'), newMrn:q('[data-ref="newMrn"]'),
      restoreFile:q('[data-ref="restoreFile"]'), editHistoryBtn:q('[data-ref="editHistoryBtn"]'), shell:q('[data-ref="shell"]'), previewWrap:q('[data-ref="previewWrap"]'), previewToggle:q('[data-ref="previewToggle"]')
    };
  }

  bind() {
    this.root.addEventListener("input",this.onInput);
    this.root.addEventListener("change",this.onChange);
    this.root.addEventListener("click",this.onClick);
    this.r.restoreFile?.addEventListener("change",this.onRestore);
  }

  destroy() {
    clearTimeout(this.saveTimer);
    this.root.removeEventListener("input",this.onInput);
    this.root.removeEventListener("change",this.onChange);
    this.root.removeEventListener("click",this.onClick);
    this.r.restoreFile?.removeEventListener("change",this.onRestore);
    if (this.root.__handoffApp===this) delete this.root.__handoffApp;
  }

  renderSystems() {
    this.r.systems.innerHTML = SYSTEMS.map(([key,label]) => `
      <section class="hf-panel hf-system">
        <div class="hf-system-label">${label}</div>
        <textarea rows="4" data-field="systems.${key}" placeholder="直接輸入 ${label} 病程 / current status / assessment / plan"></textarea>
      </section>`).join("");
  }

  renderPatientOptions(selected=this.patient?.id) {
    if (!this.r.patientList) return;
    this.r.patientList.innerHTML = this.patients.map(p=>`
      <button class="hf-patient-item ${p.id===selected?"is-active":""}" data-action="patientSwitch" data-patient-id="${escapeAttr(p.id)}" title="${escapeAttr(patientLabel(p))}">
        <strong>${escapeHTML(p.bed || "—")}</strong>
        ${p.name ? `<small>${escapeHTML(p.name)}</small>` : ""}
      </button>`).join("");
    if (this.r.currentPatientLabel) this.r.currentPatientLabel.textContent = patientLabel(this.patients.find(p=>p.id===selected) || this.patient || {});
  }

  async selectPatient(id,save=true) {
    if (save) await this.flush();
    this.patient = clone(this.patients.find(p=>p.id===id) || this.patients[0]);
    this.renderPatientOptions(this.patient.id);
    await setSetting(this.db,"currentPatientId",this.patient.id);
    await this.loadDate(todayISO(),false);
  }

  async loadDate(date,save=true) {
    if (save) await this.flush();
    const all = (await getByIndex(this.db,"dailyRecords","patientId",this.patient.id)).map(normalizeRecord).sort((a,b)=>b.date.localeCompare(a.date));
    this.previousRecord = latestBefore(all,date);
    const id = recordId(this.patient.id,date);
    const found = await get(this.db,"dailyRecords",id);
    this.record = found ? normalizeRecord(found) : blankRecord(this.patient,date,this.previousRecord);
    this.allowHistoricalEdit = date===todayISO();
    this.dirty = false; this.patientDirty = false;
    this.renderSystems();
    this.fill();
    this.renderAll();
    this.setStatus("saved",found ? `已載入 ${date}` : `${date} 新紀錄；沿用前一日穩定內容`);
  }

  fill() {
    this.root.querySelectorAll("[data-field]").forEach(el=>{
      const path=el.dataset.field;
      const value=path.startsWith("patient.") ? getPath(this.displayPatient(),path.slice(8)) : getPath(this.record,path);
      setControl(el,value);
    });
    this.r.date.value=this.record.date;
  }

  displayPatient() {
    return this.record?.patientSnapshot || this.patient;
  }

  onInput(e) {
    const el=e.target.closest("[data-field]");
    if (!el) return;
    const path=el.dataset.field;
    if (path.startsWith("patient.")) {
      if (this.record.date!==todayISO() || this.record.status==="finalized") return this.fill();
      setPath(this.patient,path.slice(8),readControl(el));
      this.patient.updatedAt=nowISO(); this.patientDirty=true;
    } else {
      if (this.isReadOnly()) return this.fill();
      setPath(this.record,path,readControl(el));
      this.record.updatedAt=nowISO();
    }
    this.markDirty();
    this.renderDerived();
    this.renderPreview();
  }

  async onChange(e) {
    if (e.target===this.r.date) return this.loadDate(e.target.value,true);
    if (e.target.matches("[data-field]")) this.onInput(e);
  }

  async onClick(e) {
    const b=e.target.closest("[data-action]"); if(!b) return;
    const a=b.dataset.action;
    try {
      if(a==="newPatient") return this.r.patientDialog.showModal();
      if(a==="patientSwitch") return this.selectPatient(b.dataset.patientId,true);
      if(a==="togglePreview") return this.togglePreview();
      if(a==="createPatient") return this.createPatient();
      if(a==="prevDay") return this.loadDate(addDays(this.record.date,-1));
      if(a==="nextDay") return this.loadDate(addDays(this.record.date,1));
      if(a==="today") return this.loadDate(todayISO());
      if(a==="save") return this.saveNow("manual");
      if(a==="finalize") return this.finalize();
      if(a==="history") return this.openHistory();
      if(a==="historyDate") { this.r.historyDialog.close(); return this.loadDate(b.dataset.date); }
      if(a==="editHistory") { this.allowHistoricalEdit=true; this.renderAll(); return; }
      if(a==="mode") { this.previewMode=b.dataset.mode; this.root.querySelectorAll('[data-action="mode"]').forEach(x=>x.classList.toggle("is-active",x.dataset.mode===this.previewMode)); return this.renderPreview(); }
      if(a==="copy") { await copyText(this.outputText()); return this.flash("已複製"); }
      if(a==="backup") return this.backup();
      if(a==="restore") { this.r.restoreFile.value=""; return this.r.restoreFile.click(); }
      if(a==="closeDialog") return b.closest("dialog")?.close();
    } catch(err) { console.error(err); alert(err.message||String(err)); }
  }

  togglePreview(force) {
    const show = typeof force === "boolean" ? force : this.r.previewWrap.hidden;
    this.r.previewWrap.hidden = !show;
    this.r.shell?.classList.toggle("has-preview", show);
    if (this.r.previewToggle) this.r.previewToggle.textContent = show ? "隱藏預覽" : "預覽";
    if (show) this.renderPreview();
  }

  markDirty() {
    this.dirty=true;
    this.setStatus("dirty","尚未儲存");
    clearTimeout(this.saveTimer);
    this.saveTimer=setTimeout(()=>this.saveNow("autosave"),AUTOSAVE_DELAY_MS);
  }

  async flush() { if(this.dirty||this.patientDirty) await this.saveNow("autosave"); }

  async saveNow(reason="manual") {
    if(!this.record) return;
    clearTimeout(this.saveTimer);
    this.setStatus("saving","正在儲存…");
    if(this.patientDirty) {
      await put(this.db,"patients",this.patient);
      const i=this.patients.findIndex(p=>p.id===this.patient.id); if(i>=0)this.patients[i]=clone(this.patient);
      this.renderPatientOptions(this.patient.id);
    }
    if (this.record.date===todayISO()) this.record.patientSnapshot=clone(this.patient);
    this.record.updatedAt=nowISO();
    await put(this.db,"dailyRecords",this.record);
    await put(this.db,"revisions",{id:`${this.record.id}::${Date.now()}`,recordId:this.record.id,patientId:this.record.patientId,date:this.record.date,reason,savedAt:nowISO(),snapshot:clone(this.record)});
    this.dirty=false; this.patientDirty=false;
    this.setStatus("saved",`已儲存 ${timeHHMM()}`);
    this.renderState();
  }

  async finalize() {
    if(this.isReadOnly() && this.record.status!=="finalized") return;
    if(this.record.status==="finalized") {
      if(!confirm("此日已完成。要建立可編輯修訂嗎？")) return;
      this.record.status="draft"; this.record.revision=(this.record.revision||1)+1; this.record.finalizedAt=""; this.allowHistoricalEdit=true;
      this.markDirty(); this.renderAll(); return;
    }
    await this.saveNow("before-finalize");
    this.record.status="finalized"; this.record.finalizedAt=nowISO(); this.record.updatedAt=nowISO();
    await put(this.db,"dailyRecords",this.record);
    await put(this.db,"revisions",{id:`${this.record.id}::final::${Date.now()}`,recordId:this.record.id,patientId:this.record.patientId,date:this.record.date,reason:"finalize",savedAt:nowISO(),snapshot:clone(this.record)});
    this.renderAll(); this.setStatus("saved","今日已完成");
  }

  isReadOnly() {
    return this.record.status==="finalized" || (this.record.date!==todayISO() && !this.allowHistoricalEdit);
  }

  renderAll() { this.renderDerived(); this.renderState(); this.renderPreview(); this.syncReadonly(); }

  renderDerived() {
    const d=deriveAge(this.displayPatient(),this.record.date);
    const p=[formatDate(this.record.date)];
    if(d.pma)p.push(`PMA ${d.pma}`); if(d.dol!==null)p.push(`DOL ${d.dol}`);
    this.r.derivedDate.textContent=p.join(" · ");
  }

  renderState() {
    const f=this.record.status==="finalized";
    const h=this.record.date!==todayISO();
    this.r.badge.textContent=f?`FINAL ${formatDateTime(this.record.finalizedAt)}`:h&&!this.allowHistoricalEdit?"HISTORY · READ ONLY":`DRAFT · r${this.record.revision||1}`;
    this.r.badge.className=`hf-badge ${f?"is-final":h&&!this.allowHistoricalEdit?"is-history":"is-draft"}`;
    if (this.r.editHistoryBtn) this.r.editHistoryBtn.hidden = !h || this.allowHistoricalEdit || f;
  }

  syncReadonly() {
    const ro=this.isReadOnly();
    this.root.querySelectorAll("[data-field]").forEach(el=>{
      const patientField=el.dataset.field?.startsWith("patient.");
      const shouldDisable=ro || (patientField && this.record.date!==todayISO());
      el.disabled=shouldDisable;
    });
  }

  setStatus(type,text) {
    this.r.saveStatus.textContent=text;
    this.r.dot.className=`hf-dot ${type}`;
  }

  renderPreview() {
    if(!this.record) return;
    this.r.paper.innerHTML=this.previewMode==="handoff"?this.handoffHtml():this.progressHtml();
    requestAnimationFrame(()=>{ this.r.overflow.hidden=this.r.paper.scrollHeight<=this.r.paper.clientHeight+2; });
  }

  progressHtml() {
    const p=this.displayPatient();
    return `
      ${this.noteHeader(p)}
      ${sectionHtml("PATIENT / STATIC BACKGROUND",this.staticText(p))}
      ${sectionHtml("TODAY'S SUMMARY",this.record.todaySummary)}
      ${this.record.todayData?.trim()?sectionHtml("TODAY DATA",this.record.todayData):""}
      ${SYSTEMS.map(([k,l])=>sectionHtml(l,this.record.systems[k],true)).join("")}
      ${this.lineSupportHtml()}
      ${this.todoWatchHtml()}
    `;
  }

  handoffHtml() {
    const p=this.displayPatient();
    const sys=SYSTEMS.filter(([k])=>this.record.systems[k]?.trim()).map(([k,l])=>sectionHtml(l,this.record.systems[k],true)).join("");
    return `
      ${this.noteHeader(p)}
      ${sectionHtml("TODAY'S SUMMARY",this.record.todaySummary)}
      ${this.record.todayData?.trim()?sectionHtml("TODAY DATA",this.record.todayData):""}
      ${sys}
      ${this.lineSupportHtml()}
      ${this.todoWatchHtml()}
    `;
  }

  noteHeader(p) {
    const age=deriveAge(p,this.record.date);
    const bits=[p.bed,p.name,p.mrn].filter(Boolean).map(escapeHTML);
    const sub=[formatDate(this.record.date), age.pma?`PMA ${age.pma}`:"", age.dol!==null?`DOL ${age.dol}`:"", shiftLabel(this.record.shift)].filter(Boolean).map(escapeHTML);
    return `<header class="note-head"><strong>${bits.join(" · ")||"Clinical Daily Note"}</strong><span>${sub.join(" · ")}</span></header>`;
  }

  staticText(p) {
    const first=[p.birthDate?`DOB ${p.birthDate}`:"", p.gaWeeks!==""?`GA ${p.gaWeeks}+${p.gaDays||0}`:"", p.birthWeightG?`BBW ${p.birthWeightG} g`:"", p.plurality||"", p.admissionDate?`Admit ${p.admissionDate}`:""].filter(Boolean).join(" · ");
    return [first,p.background].filter(Boolean).join("\n");
  }

  lineSupportHtml() {
    const ls=this.record.lineSupport;
    const chunks=[];
    if(ls.lines?.trim())chunks.push(`<div class="note-row"><b>Line</b><pre>${escapeHTML(ls.lines)}</pre></div>`);
    if(ls.fluids?.trim())chunks.push(`<div class="note-row"><b>Fluids</b><pre>${escapeHTML(ls.fluids)}</pre></div>`);
    const vent=[ls.ventMode,ls.ventSettings].filter(Boolean).join(" · ");
    if(vent)chunks.push(`<div class="note-row"><b>Support</b><pre>${escapeHTML(vent)}</pre></div>`);
    return chunks.length?`<section class="note-section"><h2>LINE / FLUIDS / SUPPORT</h2>${chunks.join("")}</section>`:"";
  }

  todoWatchHtml() {
    const a=this.record.todo?.trim(), b=this.record.watch?.trim(); if(!a&&!b)return"";
    return `<section class="note-section"><h2>TO-DO / WATCH</h2>${a?`<div class="note-row"><b>To-do</b><pre>${escapeHTML(a)}</pre></div>`:""}${b?`<div class="note-row"><b>Watch</b><pre>${escapeHTML(b)}</pre></div>`:""}</section>`;
  }

  outputText() {
    const p=this.displayPatient(), age=deriveAge(p,this.record.date), lines=[];
    lines.push([p.bed,p.name,p.mrn].filter(Boolean).join(" "));
    lines.push([this.record.date,age.pma?`PMA ${age.pma}`:"",age.dol!==null?`DOL ${age.dol}`:"",shiftLabel(this.record.shift)].filter(Boolean).join(" | "));
    if(this.previewMode==="progress") {
      pushBlock(lines,"PATIENT / STATIC BACKGROUND",this.staticText(p));
    }
    pushBlock(lines,"TODAY'S SUMMARY",this.record.todaySummary);
    pushBlock(lines,"TODAY DATA",this.record.todayData);
    SYSTEMS.forEach(([k,l])=>pushBlock(lines,l,this.record.systems[k]));
    const ls=this.record.lineSupport;
    const support=[ls.lines?.trim()?`Line: ${ls.lines}`:"",ls.fluids?.trim()?`Fluids:\n${ls.fluids}`:"",(ls.ventMode||ls.ventSettings)?`Support: ${[ls.ventMode,ls.ventSettings].filter(Boolean).join(" ")}`:""].filter(Boolean).join("\n");
    pushBlock(lines,"LINE / FLUIDS / SUPPORT",support);
    pushBlock(lines,"TO-DO",this.record.todo); pushBlock(lines,"WATCH",this.record.watch);
    return lines.join("\n").replace(/\n{3,}/g,"\n\n").trim()+"\n";
  }

  async createPatient() {
    const p=blankPatient(); p.bed=this.r.newBed.value.trim(); p.name=this.r.newName.value.trim(); p.mrn=this.r.newMrn.value.trim();
    await put(this.db,"patients",p); this.patients.push(p); this.patients.sort(sortPatients); this.renderPatientOptions(p.id); this.r.patientDialog.close();
    this.r.newBed.value=this.r.newName.value=this.r.newMrn.value=""; await this.selectPatient(p.id,true);
  }

  async openHistory() {
    const list=(await getByIndex(this.db,"dailyRecords","patientId",this.patient.id)).map(normalizeRecord).sort((a,b)=>b.date.localeCompare(a.date));
    this.r.historyList.innerHTML=list.length?list.map(r=>`<button class="hf-history-item" data-action="historyDate" data-date="${r.date}"><strong>${formatDate(r.date)}</strong><span>${r.status==="finalized"?"FINAL":"DRAFT"}</span><small>${trimOneLine(r.todaySummary)||"無 summary"}</small></button>`).join(""):`<p>尚無歷程。</p>`;
    this.r.historyDialog.showModal();
  }

  async backup() {
    await this.flush();
    const data={version:2,exportedAt:nowISO(),patients:await getAll(this.db,"patients"),dailyRecords:await getAll(this.db,"dailyRecords"),revisions:await getAll(this.db,"revisions"),settings:await getAll(this.db,"settings")};
    downloadBlob(`neoassist-handoff-backup-${todayISO()}.json`,JSON.stringify(data,null,2),"application/json;charset=utf-8");
  }

  async onRestore(e) {
    const f=e.target.files?.[0]; if(!f)return;
    const data=JSON.parse(await f.text()); if(!Array.isArray(data.patients)||!Array.isArray(data.dailyRecords))throw new Error("備份格式不正確");
    if(!confirm(`匯入 ${data.patients.length} 位病人與 ${data.dailyRecords.length} 筆每日紀錄？相同 ID 會覆蓋。`))return;
    for(const x of data.patients)await put(this.db,"patients",normalizePatient(x));
    for(const x of data.dailyRecords)await put(this.db,"dailyRecords",normalizeRecord(x));
    for(const x of data.revisions||[])await put(this.db,"revisions",x);
    this.patients=(await getAll(this.db,"patients")).map(normalizePatient).sort(sortPatients); this.renderPatientOptions(this.patients[0]?.id); await this.selectPatient(this.patients[0]?.id,false);
  }

  flash(t){ this.setStatus("saved",t); setTimeout(()=>this.setStatus("saved",`已儲存 ${timeHHMM()}`),1200); }
}

function field(label,path,type="text",placeholder="",extra="") { return `<label class="hf-cell"><span>${label}</span><input type="${type}" data-field="${path}" placeholder="${escapeAttr(placeholder)}" ${extra}></label>`; }
function sectionHtml(title,text,skipEmpty=false){ const v=(text||"").trim(); if(skipEmpty&&!v)return""; return `<section class="note-section"><h2>${escapeHTML(title)}</h2>${v?`<pre>${escapeHTML(v)}</pre>`:`<pre class="note-empty"></pre>`}</section>`; }
function pushBlock(lines,title,text){ const v=(text||"").trim(); if(!v)return; lines.push("",`[${title}]`,v); }

function blankPatient(){ return {id:uid("pt"),bed:"",name:"",mrn:"",admissionDate:"",birthDate:"",gaWeeks:"",gaDays:"",birthWeightG:"",plurality:"",background:"",createdAt:nowISO(),updatedAt:nowISO()}; }
function normalizePatient(x={}){
  const p={...blankPatient(),...clone(x),id:x.id||uid("pt")};
  if(!p.background){
    p.background=[x.maternalHistory?`Mom: ${x.maternalHistory}`:"",x.birthCourse?`Birth: ${x.birthCourse}`:"",x.background||""].filter(Boolean).join("\n");
  }
  return p;
}
function blankRecord(patient,date,previous){
  const prev=previous?normalizeRecord(previous):null;
  return {id:recordId(patient.id,date),patientId:patient.id,date,shift:"daily",status:"draft",revision:1,patientSnapshot:clone(patient),todaySummary:"",todayData:"",systems:Object.fromEntries(SYSTEMS.map(([k])=>[k,prev?.systems?.[k]||""])),lineSupport:{lines:prev?.lineSupport?.lines||"",fluids:prev?.lineSupport?.fluids||"",ventMode:prev?.lineSupport?.ventMode||"",ventSettings:prev?.lineSupport?.ventSettings||""},todo:carryTodo(prev?.todo||""),watch:prev?.watch||"",createdAt:nowISO(),updatedAt:nowISO(),finalizedAt:""};
}
function normalizeRecord(x={}){
  const systems={}; SYSTEMS.forEach(([k])=>{
    const old=x.systems?.[k]; systems[k]=typeof old==="string"?old:(old?.progress||"");
  });
  // migrate old GENERAL content into OTHER only when OTHER is empty, to avoid data loss.
  if(!systems.other && x.systems?.general?.progress) systems.other=x.systems.general.progress;
  const oldSupport=x.support||{};
  return {id:x.id||recordId(x.patientId||"unknown",x.date||todayISO()),patientId:x.patientId||"",date:x.date||todayISO(),shift:x.shift||"daily",status:x.status||"draft",revision:Number(x.revision)||1,patientSnapshot:normalizePatient(x.patientSnapshot||{}),todaySummary:x.todaySummary||"",todayData:x.todayData||legacyTodayData(x),systems,lineSupport:{lines:x.lineSupport?.lines ?? oldSupport.lines ?? [oldSupport.tubes].filter(Boolean).join("\n"),fluids:x.lineSupport?.fluids ?? legacyFluidText(oldSupport),ventMode:x.lineSupport?.ventMode ?? oldSupport.respiratory ?? "",ventSettings:x.lineSupport?.ventSettings ?? oldSupport.fio2 ?? ""},todo:typeof x.todo==="string"?x.todo:legacyTasks(x.tasks),watch:typeof x.watch==="string"?x.watch:legacyWatch(x.watch),createdAt:x.createdAt||nowISO(),updatedAt:x.updatedAt||nowISO(),finalizedAt:x.finalizedAt||""};
}
function legacyTodayData(x){ const m=x.metrics||{}; const parts=[]; if(m.weightG)parts.push(`BW ${m.weightG}g`); if(m.ioBalance!==""&&m.ioBalance!=null)parts.push(`IO ${signedMaybe(m.ioBalance)}`); if(m.urineOutput!==""&&m.urineOutput!=null)parts.push(`UO ${m.urineOutput}`); if(m.kcalKgDay)parts.push(`Kcal ${m.kcalKgDay}`); if(m.stoolCount!==""&&m.stoolCount!=null)parts.push(`Stool ${m.stoolCount}`); if(m.residualMin||m.residualMax)parts.push(`Residual ${m.residualMin||""}-${m.residualMax||""} mL ${m.residualDescription||""}`.trim()); return parts.join(", "); }
function legacyFluidText(s){ const p=[]; if(s.feeding)p.push(`Diet: ${s.feeding}`); if(s.tpn)p.push(`TPN: ${s.tpn}`); if(s.lipid)p.push(`Lipid: ${s.lipid}`); if(s.totalFluid)p.push(`TDF: ${s.totalFluid}`); if(s.drips)p.push(s.drips); return p.join("\n"); }
function legacyTasks(t){ return Array.isArray(t)?t.filter(x=>!x.done).map(x=>x.text).filter(Boolean).join("\n"):""; }
function legacyWatch(w){ return Array.isArray(w)?w.map(x=>x.text).filter(Boolean).join("\n"):(typeof w==="string"?w:""); }
function carryTodo(text){ return (text||"").split(/\r?\n/).filter(line=>line.trim()&&!/^\s*[✓✔☑]/.test(line)).join("\n"); }

function recordId(pid,date){ return `${pid}::${date}`; }
function latestBefore(list,date){ return list.filter(r=>r.date<date).sort((a,b)=>b.date.localeCompare(a.date))[0]||null; }
function patientLabel(p){ return [p.bed,p.name,p.mrn].filter(Boolean).join(" · ")||"未命名病人"; }
function sortPatients(a,b){ return String(a.bed||"").localeCompare(String(b.bed||""),"zh-Hant",{numeric:true})||String(a.name||"").localeCompare(String(b.name||""),"zh-Hant"); }
function shiftLabel(v){ return SHIFTS.find(x=>x[0]===v)?.[1]||v||""; }

function deriveAge(p,date){
  if(!p?.birthDate)return {dol:null,pma:""};
  const d0=parseDate(p.birthDate), d1=parseDate(date); if(!d0||!d1)return {dol:null,pma:""};
  const diff=Math.floor((d1-d0)/86400000); const dol=diff>=0?diff+1:null;
  if(p.gaWeeks===""||p.gaWeeks==null||diff<0)return {dol,pma:""};
  const total=(Number(p.gaWeeks)||0)*7+(Number(p.gaDays)||0)+diff;
  return {dol,pma:`${Math.floor(total/7)}+${((total%7)+7)%7}`};
}

async function openDb(){ return new Promise((res,rej)=>{ const r=indexedDB.open(DB_NAME,DB_VERSION); r.onupgradeneeded=()=>{ const db=r.result; if(!db.objectStoreNames.contains("patients"))db.createObjectStore("patients",{keyPath:"id"}); if(!db.objectStoreNames.contains("dailyRecords")){ const s=db.createObjectStore("dailyRecords",{keyPath:"id"}); s.createIndex("patientId","patientId",{unique:false}); s.createIndex("date","date",{unique:false}); } else { const s=r.transaction.objectStore("dailyRecords"); if(!s.indexNames.contains("patientId"))s.createIndex("patientId","patientId",{unique:false}); }
      if(!db.objectStoreNames.contains("revisions")){ const s=db.createObjectStore("revisions",{keyPath:"id"}); s.createIndex("recordId","recordId",{unique:false}); }
      if(!db.objectStoreNames.contains("settings"))db.createObjectStore("settings",{keyPath:"key"}); };
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function tx(db,store,mode="readonly"){ return db.transaction(store,mode).objectStore(store); }
function req(r){ return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}); }
function get(db,s,k){ return req(tx(db,s).get(k)); }
function getAll(db,s){ return req(tx(db,s).getAll()); }
function put(db,s,v){ return req(tx(db,s,"readwrite").put(v)); }
function getByIndex(db,s,index,key){ return req(tx(db,s).index(index).getAll(IDBKeyRange.only(key))); }
async function getSetting(db,key){ return (await get(db,"settings",key))?.value; }
function setSetting(db,key,value){ return put(db,"settings",{key,value}); }

function getPath(o,p){ return p.split(".").reduce((a,k)=>a?.[k],o); }
function setPath(o,p,v){ const a=p.split("."); let x=o; a.slice(0,-1).forEach(k=>{if(!x[k]||typeof x[k]!=="object")x[k]={};x=x[k]}); x[a.at(-1)]=v; }
function setControl(el,v){ el.value=v==null?"":String(v); }
function readControl(el){ if(el.type==="number") return el.value===""?"":Number(el.value); return el.value; }
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function uid(p="id"){ return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function nowISO(){ return new Date().toISOString(); }
function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function addDays(s,n){ const d=parseDate(s)||new Date(); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function parseDate(s){ if(!s)return null; const [y,m,d]=s.split("-").map(Number); if(!y||!m||!d)return null; return new Date(y,m-1,d); }
function formatDate(s){ const d=parseDate(s); return d?`${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`:s||""; }
function formatDateTime(s){ if(!s)return""; const d=new Date(s); return Number.isNaN(+d)?"":`${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function timeHHMM(){ const d=new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function trimOneLine(s){ return (s||"").replace(/\s+/g," ").trim().slice(0,80); }
function signedMaybe(v){ const n=Number(v); return Number.isFinite(n)&&n>0?`+${n}`:String(v); }
function escapeHTML(v){ return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function escapeAttr(v){ return escapeHTML(v).replace(/\n/g,"&#10;"); }
async function copyText(t){ try{return await navigator.clipboard.writeText(t)}catch{ const x=document.createElement("textarea");x.value=t;document.body.appendChild(x);x.select();document.execCommand("copy");x.remove(); } }
function downloadBlob(name,text,type){ const b=new Blob([text],{type}); const u=URL.createObjectURL(b); const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000); }

const STYLES = `
[data-tool="handoff"]{--beige:#f1e5d5;--ink:#222;--charcoal:#303030;--slate:#76818a;--line:#d7dde2;--panel:#f7f7f6;--paper:#fff;--muted:#70777d;--focus:#9aa4ab;font-family:Arial,"Microsoft JhengHei","Noto Sans TC",sans-serif;color:var(--ink);background:var(--beige);border-radius:8px;overflow:hidden;min-height:760px}
[data-tool="handoff"] *{box-sizing:border-box}
.hf-topbar{background:var(--charcoal);color:white;min-height:50px;padding:8px 14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}.hf-title{font-size:16px;font-weight:700;min-width:170px}.hf-nav{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.hf-nav-right{margin-left:auto}.hf-nav label{display:flex;align-items:center;gap:5px;font-size:12px;color:#ddd}.hf-topbar select,.hf-topbar input,.hf-topbar button{height:32px;border:1px solid #515151;border-radius:5px;background:#3a3a3a;color:#fff;padding:0 9px;font:inherit}.hf-topbar button{cursor:pointer}.hf-topbar button:hover{background:#4a4a4a}.hf-topbar .hf-accent{background:var(--slate);border-color:var(--slate)}.hf-square{width:32px;padding:0!important;font-size:20px}.hf-status{min-height:36px;background:#f3f4f4;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:7px;padding:6px 16px;font-size:12px}.hf-dot{width:8px;height:8px;border-radius:50%;background:#9aa0a5}.hf-dot.dirty{background:#b88b43}.hf-dot.saving{background:#6e8aa0}.hf-dot.saved{background:#7d9283}.hf-spacer{flex:1}.hf-link{border:0;background:transparent;color:#606b72;cursor:pointer}.hf-badge{padding:2px 7px;border-radius:10px;background:#e4e7e9}.hf-badge.is-final{background:#dfe8df}.hf-badge.is-history{background:#eee2cf}.hf-shell{display:grid;grid-template-columns:118px minmax(520px,1fr);gap:14px;padding:14px;align-items:start}.hf-shell.has-preview{grid-template-columns:118px minmax(520px,1fr) minmax(430px,.82fr)}.hf-patient-sidebar{position:sticky;top:10px;background:rgba(255,255,255,.72);border:1px solid var(--line);border-radius:7px;overflow:hidden;max-height:calc(100vh - 90px);display:flex;flex-direction:column}.hf-sidebar-head{background:var(--charcoal);color:#fff;text-align:center;padding:9px 6px;font-size:12px;font-weight:700}.hf-patient-list{overflow:auto;padding:6px;display:flex;flex-direction:column;gap:5px;min-height:70px}.hf-patient-item{border:1px solid var(--line);background:#fff;border-radius:5px;padding:7px 5px;cursor:pointer;text-align:center;color:#222}.hf-patient-item strong{display:block;font-size:15px;line-height:1.15}.hf-patient-item small{display:block;margin-top:3px;font-size:10px;color:#70777c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hf-patient-item:hover{background:#f0f1f1}.hf-patient-item.is-active{background:var(--slate);border-color:var(--slate);color:#fff}.hf-patient-item.is-active small{color:#eef1f2}.hf-add-patient{margin:6px;border:0;border-radius:5px;background:var(--slate);color:#fff;padding:9px 5px;cursor:pointer}.hf-current-patient{font-size:12px;color:#e4e4e4;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hf-editor{display:flex;flex-direction:column;gap:8px;min-width:0}.hf-panel{background:rgba(255,255,255,.72);border:1px solid var(--line);border-radius:7px;overflow:hidden}.hf-panel-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:7px 12px;background:#f2f3f3;border-bottom:1px solid var(--line)}.hf-panel-head strong{font-size:13px;letter-spacing:.2px}.hf-panel-head span{font-size:11px;color:var(--muted)}.hf-patient-row{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--line)}.hf-patient-row-5{grid-template-columns:1.3fr .65fr .65fr .9fr 1.2fr}.hf-cell{display:grid;grid-template-columns:78px 1fr;min-height:38px;border-right:1px solid var(--line);align-items:center}.hf-cell:last-child{border-right:0}.hf-cell span{padding:0 8px;font-size:12px;text-align:center}.hf-cell input{width:100%;height:37px;border:0;border-left:1px solid var(--line);background:#fbfbfb;padding:6px 8px;font:inherit;font-size:13px}.hf-textrow{display:grid;grid-template-columns:90px 1fr;align-items:stretch;border-top:1px solid var(--line)}.hf-textrow:first-of-type{border-top:0}.hf-textrow>span{display:flex;align-items:center;justify-content:center;font-size:12px;padding:7px;background:#f6f6f5;border-right:1px solid var(--line)}.hf-textrow textarea{width:100%;resize:vertical;border:0;background:#fff;padding:8px 10px;font:inherit;font-size:13px;line-height:1.42;min-height:52px}.hf-summary{width:100%;resize:vertical;border:0;background:#fff;padding:10px 12px;font:inherit;font-size:13px;line-height:1.45;min-height:86px}.hf-compact-top{border-top:1px solid var(--line)!important}.hf-system{display:grid;grid-template-columns:82px 1fr;min-height:84px}.hf-system-label{background:#f2f3f3;border-right:1px solid var(--line);display:flex;align-items:flex-start;justify-content:center;padding:11px 7px;font-size:13px;font-weight:700}.hf-system textarea{border:0;background:#fff;resize:vertical;width:100%;padding:9px 11px;font:inherit;font-size:13px;line-height:1.42;min-height:84px}.hf-support-row{display:grid;grid-template-columns:90px 145px 1fr;min-height:40px;border-top:1px solid var(--line)}.hf-support-row>span{display:flex;align-items:center;justify-content:center;background:#f6f6f5;border-right:1px solid var(--line);font-size:12px}.hf-support-row select,.hf-support-row input{border:0;border-right:1px solid var(--line);background:#fff;padding:7px 9px;font:inherit;font-size:13px}.hf-two-text{display:grid;grid-template-columns:1fr 1fr}.hf-two-text label{display:grid;grid-template-columns:68px 1fr}.hf-two-text label+label{border-left:1px solid var(--line)}.hf-two-text span{display:flex;align-items:center;justify-content:center;background:#f6f6f5;border-right:1px solid var(--line);font-size:12px}.hf-two-text textarea{border:0;resize:vertical;padding:8px 10px;font:inherit;font-size:13px;line-height:1.4;min-height:72px}textarea:focus,input:focus,select:focus{outline:2px solid var(--focus);outline-offset:-2px}.hf-preview-wrap{position:sticky;top:10px;min-width:0}.hf-preview-toolbar{display:flex;gap:6px;align-items:center;margin-bottom:7px;flex-wrap:wrap}.hf-preview-toolbar button,.hf-segment button{border:0;border-radius:5px;background:var(--slate);color:white;height:32px;padding:0 11px;cursor:pointer}.hf-segment{display:flex}.hf-segment button{border-radius:0;background:#a0a7ac}.hf-segment button:first-child{border-radius:5px 0 0 5px}.hf-segment button:last-child{border-radius:0 5px 5px 0}.hf-segment button.is-active{background:var(--charcoal)}.hf-paper-stage{background:#d9d9d7;border-radius:6px;padding:10px;overflow:auto;max-height:calc(100vh - 130px)}.hf-paper{width:210mm;height:270mm;background:var(--paper);margin:0 auto;padding:8mm 9mm;box-shadow:0 1px 5px #0002;overflow:hidden;font-size:9.7pt;line-height:1.28;color:#111}.note-head{display:flex;justify-content:space-between;gap:8px;border-bottom:2px solid #333;padding-bottom:3px;margin-bottom:4px}.note-head strong{font-size:11pt}.note-head span{font-size:8.8pt;color:#444}.note-section{margin:0 0 4px}.note-section h2{font-size:9.3pt;margin:3px 0 1px;padding:1px 3px;background:#eeeeec;border-bottom:1px solid #999}.note-section pre,.note-row pre{white-space:pre-wrap;margin:0;font:inherit;line-height:1.27}.note-row{display:grid;grid-template-columns:14mm 1fr;gap:1.5mm}.note-row b{font-size:8.8pt}.note-empty{min-height:3px}.hf-overflow{margin-top:6px;padding:7px 9px;background:#f0d8d1;border:1px solid #d2a69a;border-radius:5px;font-size:12px}.hf-dialog{border:0;border-radius:8px;padding:0;box-shadow:0 15px 60px #0005}.hf-dialog::backdrop{background:#0005}.hf-dialog-card{width:min(460px,88vw);padding:18px;background:#f7f7f6}.hf-dialog-card h2{margin:0 0 14px}.hf-dialog-card>label{display:grid;grid-template-columns:90px 1fr;align-items:center;margin:7px 0}.hf-dialog-card input{height:36px;border:1px solid var(--line);padding:5px 8px}.hf-dialog-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:15px}.hf-dialog-actions button{border:0;border-radius:5px;background:var(--slate);color:white;padding:8px 16px}.hf-history-card{width:min(600px,90vw)}.hf-history-item{display:grid;grid-template-columns:90px 70px 1fr;width:100%;text-align:left;gap:8px;padding:9px;border:0;border-bottom:1px solid var(--line);background:#fff;cursor:pointer}.hf-history-item:hover{background:#f2f2ef}.hf-history-item small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#666}
@media(max-width:1100px){.hf-shell,.hf-shell.has-preview{grid-template-columns:90px minmax(0,1fr)}.hf-preview-wrap{position:static;grid-column:1/-1}.hf-patient-sidebar{top:6px}.hf-current-patient{display:none}.hf-paper-stage{max-height:none}.hf-patient-row,.hf-patient-row-5{grid-template-columns:1fr 1fr}.hf-cell{border-bottom:1px solid var(--line)}}
@media(max-width:650px){.hf-shell,.hf-shell.has-preview{grid-template-columns:72px minmax(0,1fr);padding:8px;gap:8px}.hf-sidebar-head{font-size:11px}.hf-patient-list{padding:4px}.hf-patient-item{padding:6px 3px}.hf-patient-item strong{font-size:13px}.hf-add-patient{margin:4px;padding:7px 2px;font-size:11px}.hf-patient-row,.hf-patient-row-5{grid-template-columns:1fr}.hf-cell{border-right:0}.hf-two-text{grid-template-columns:1fr}.hf-two-text label+label{border-left:0;border-top:1px solid var(--line)}.hf-support-row{grid-template-columns:72px 115px 1fr}.hf-paper{transform-origin:top left}}
@media print{@page{size:210mm 270mm;margin:0}body *{visibility:hidden!important}[data-tool="handoff"] .hf-paper,[data-tool="handoff"] .hf-paper *{visibility:visible!important}.hf-paper{position:fixed!important;left:0;top:0;margin:0!important;box-shadow:none!important;width:210mm!important;height:270mm!important}}
`;

export default { render, init, destroy };
