// tools/handoff.js
// NeoAssist Clinical Handoff — Patient-centric V1
// 2026-08-29

const TOOL_KEY="handoff";
const DB_NAME="neoassist-clinical-handoff";
const DB_VERSION=3;
const AUTOSAVE_DELAY_MS=650;

const SYSTEMS=[
  ["resp","RESP"],["cv","CV"],["gi","GI"],["inf","INF"],
  ["heme","HEME"],["neuro","NEURO"],["renal","RENAL"],["other","OTHER"]
];

let activeApp=null;

export function render(){
  return `
  <section class="hf" data-tool="${TOOL_KEY}">
    <style>${STYLES}</style>
    <header class="hf-app-header">
      <h1>交班單</h1>
      <div class="hf-backup-wrap">
        <button class="hf-header-more" data-action="toggleBackupMenu" aria-label="資料備份選單">⋯</button>
        <div class="hf-backup-menu" data-ref="backupMenu" hidden>
          <button data-action="exportBackup">匯出備份</button>
          <button data-action="importBackup">匯入備份</button>
        </div>
        <input type="file" data-ref="backupFileInput" accept=".json,application/json" hidden>
      </div>
    </header>
    <div class="hf-shell">
      <aside class="hf-left">
        <div class="hf-search-wrap">
          <input class="hf-search" data-ref="search" type="search"
            placeholder="搜尋床號 / MRN / 關鍵字..." autocomplete="off">
        </div>

        <div class="hf-left-scroll">
          <button class="hf-new-patient" data-action="newPatient">
            ＋ 新病人
          </button>

          <section class="hf-patient-group">
            <div class="hf-group-title">現有病人</div>
            <div data-ref="activePatientList"></div>
          </section>

          <section class="hf-patient-group">
            <div class="hf-group-title">已轉出</div>
            <div data-ref="dischargedPatientList"></div>
          </section>
        </div>

      </aside>

      <main class="hf-main">
        <header class="hf-header">

          <!-- 第一列：Navigation + Actions -->
          <div class="hf-toolbar-row">

            <div class="hf-date-group">
              <button
                class="hf-date-arrow"
                data-action="prevDay"
                aria-label="前一天"
              >‹</button>

              <input data-ref="date" type="date" max="${addDays(todayISO(),1)}">

              <button
                class="hf-date-arrow"
                data-action="nextDay"
                aria-label="後一天"
              >›</button>

              <button data-action="today">今天</button>
              <button data-action="history">歷程</button>
            </div>

            <div class="hf-actions">
              <div class="hf-output-group">
                <button data-action="copyMode" data-copy-mode="full">COPY</button>
                <button data-action="copyMode" data-copy-mode="soap">SOAP</button>
                <button data-action="copyMode" data-copy-mode="duty">DUTY</button>
                <button data-action="weeklySummary">WEEKLY</button>
              </div>

              <button
                data-action="finalize"
                class="hf-primary"
                data-ref="finalizeBtn"
              >完成</button>
            </div>

          </div>

          <!-- 第二列：Patient Identity + Record Status -->
          <div class="hf-identity-row">

            <button
              class="hf-patient-title-btn"
              data-action="editBackground"
              title="編輯病人背景"
            >
              <span data-ref="patientTitle">未命名病人</span>
            </button>

            <div class="hf-record-state">
              <span class="hf-save-state" data-ref="saveState">
                初始化中…
              </span>

              <span
                class="hf-record-badge"
                data-ref="recordBadge"
              ></span>
            </div>

          </div>

        </header>

        <div class="hf-alert-strip" data-ref="alertStrip" hidden></div>

        <section class="hf-section hf-background" data-action="editBackground">
          <div class="hf-section-heading">
            <h2>BACKGROUND</h2>
            <span>點擊編輯</span>
          </div>
          <div class="hf-background-body" data-ref="backgroundView"></div>
        </section>

        <section class="hf-section">
          <div class="hf-section-heading">
            <h2>SHIFT SUMMARY</h2>
          </div>

          <div class="hf-metrics">
            <div class="hf-age-metrics" data-ref="derivedAge"></div>

            ${metric("BW", "metrics.weightG", "g")}
            ${metric("I/O", "metrics.io", "")}
            ${metric("UO", "metrics.urineOutput", "")}
            ${metric("kcal", "metrics.kcal", "")}
            ${metric("Stool", "metrics.stool", "")}
          </div>

          <textarea class="hf-summary" rows="3" data-field="summary"
            placeholder="Shift summary..."></textarea>

          <div class="hf-support-grid">
            ${supportRow("Vent","vent","例如：HFOV MAP 12 Amp 24 Hz 12 FiO₂ 30%")}
            ${supportRow("Line","line","例如：PCVC (8/26-), ETT (8/26-)")}
            ${supportRow("Fluids","fluids","例如：BM 60 + TPN 70, TDF 140")}
          </div>
        </section>

        <section class="hf-section hf-clinical">
          <div class="hf-section-heading"><h2>CLINICAL</h2></div>
          <div data-ref="systems"></div>
        </section>

        <section class="hf-section">
          <div class="hf-section-heading"><h2>ASSESSMENT</h2></div>
          <textarea class="hf-large-text" rows="4" data-field="assessment"
            placeholder="Assessment..."></textarea>
        </section>

        <section class="hf-section">
          <div class="hf-section-heading"><h2>PLAN</h2></div>
          <textarea class="hf-large-text" rows="4" data-field="plan"
            placeholder="Plan..."></textarea>
        </section>
      </main>
    </div>

    <dialog class="hf-dialog" data-ref="patientDialog">
      <div class="hf-dialog-card">
        <h3>建立病人</h3>
        <label>床號<input data-ref="newBed" type="text"></label>
        <label>病歷號<input data-ref="newMrn" type="text"></label>
        <label>姓名／代稱<input data-ref="newName" type="text"></label>
        <label>主治／Team<input data-ref="newTeam" type="text"></label>
        <div class="hf-dialog-actions">
          <button type="button" data-action="closeDialog">取消</button>
          <button type="button" class="hf-primary" data-action="createPatient">建立</button>
        </div>
      </div>
    </dialog>

    <dialog class="hf-dialog" data-ref="backgroundDialog">
      <div class="hf-dialog-card hf-bg-dialog-card">
        <h3>病人背景</h3>

        <div class="hf-bg-grid">
          ${dialogField("床號","patient.bed","text")}
          ${dialogField("病歷號","patient.mrn","text")}
          ${dialogField("姓名／代稱","patient.name","text")}
          ${dialogField("主治／Team","patient.team","text")}

          ${dialogField("DOB","patient.birthDate","date")}
          ${dialogField("GA wk","patient.gaWeeks","number",'min="20" max="45" step="1"')}
          ${dialogField("GA day","patient.gaDays","number",'min="0" max="6" step="1"')}
          ${dialogField("BBW (g)","patient.birthWeightG","number",'min="100" step="1"')}

          ${dialogField("Delivery","patient.deliveryMode","text")}
          ${dialogField("Reason","patient.deliveryReason","text")}
          ${dialogField("A/S 1 min","patient.apgar1","text")}
          ${dialogField("A/S 5 min","patient.apgar5","text")}
        </div>

        <label class="hf-dialog-text">
          <span>Mom</span>
          <textarea rows="5" data-field="patient.momBackground"></textarea>
        </label>

        <label class="hf-dialog-text">
          <span>NB</span>
          <textarea rows="5" data-field="patient.nbBackground"></textarea>
        </label>

        <label class="hf-dialog-text">
          <span>重要提醒</span>
          <textarea rows="2" data-field="patient.alert" placeholder="例如：Difficult airway / allergy / 特殊交班提醒"></textarea>
        </label>

        <div class="hf-dialog-actions">
          <button type="button" data-action="closeDialog">取消</button>
          <button type="button" class="hf-primary" data-action="saveBackground">完成</button>
        </div>
      </div>
    </dialog>

    <dialog class="hf-dialog" data-ref="historyDialog">
      <div class="hf-dialog-card hf-history-card">
        <div class="hf-history-head">
          <h3>歷程</h3>
          <button type="button" data-action="closeDialog">關閉</button>
        </div>
        <div class="hf-history-list" data-ref="historyList"></div>
      </div>
    </dialog>

    <dialog class="hf-dialog" data-ref="restoreDialog">
      <div class="hf-dialog-card hf-restore-card">
        <div class="hf-history-head">
          <div>
            <h3>還原 Handoff 備份</h3>
            <p class="hf-weekly-sub" data-ref="restoreInfo"></p>
          </div>
          <button type="button" data-action="closeDialog">關閉</button>
        </div>
        <div class="hf-restore-options">
          <label><input type="radio" name="hfRestoreMode" value="merge" data-ref="restoreMerge" checked>
            <span><strong>合併</strong><small>保留目前資料；同 ID 的備份資料會更新現有資料。</small></span></label>
          <label><input type="radio" name="hfRestoreMode" value="replace" data-ref="restoreReplace">
            <span><strong>完整覆蓋</strong><small>清除目前 Handoff 資料後，以備份內容完整取代。</small></span></label>
        </div>
        <div class="hf-dialog-actions">
          <button type="button" data-action="closeDialog">取消</button>
          <button type="button" class="hf-primary" data-action="confirmRestore">開始還原</button>
        </div>
      </div>
    </dialog>

    <dialog class="hf-dialog" data-ref="weeklyDialog">
      <div class="hf-dialog-card hf-weekly-card">
        <div class="hf-history-head">
          <div>
            <h3>Weekly Summary</h3>
            <p class="hf-weekly-sub">選擇日期區間，複製成可直接貼給 AI 的病程時間軸。</p>
          </div>
          <button type="button" data-action="closeDialog">關閉</button>
        </div>

        <div class="hf-weekly-presets">
          <button type="button" data-action="weeklyPreset" data-preset="7days">過去 7 天</button>
          <button type="button" data-action="weeklyPreset" data-preset="week">本週</button>
        </div>

        <div class="hf-weekly-range">
          <label>
            <span>From</span>
            <input type="date" data-ref="weeklyFrom" max="${todayISO()}">
          </label>
          <span class="hf-weekly-arrow">→</span>
          <label>
            <span>To</span>
            <input type="date" data-ref="weeklyTo" max="${todayISO()}">
          </label>
        </div>

        <div class="hf-weekly-options">
          <label>
            <input type="checkbox" data-ref="weeklyAnonymize" checked>
            <span>去除病人識別資訊（建議）</span>
          </label>
          <label>
            <input type="checkbox" data-ref="weeklyBackground" checked>
            <span>包含 Background</span>
          </label>
        </div>

        <div class="hf-weekly-info" data-ref="weeklyInfo"></div>

        <div class="hf-dialog-actions">
          <button type="button" data-action="closeDialog">取消</button>
          <button type="button" class="hf-primary" data-action="copyWeekly">複製給 AI</button>
        </div>
      </div>
    </dialog>
  </section>`;
}

export async function init(host=document){
  const root=host?.matches?.(`[data-tool="${TOOL_KEY}"]`)
    ?host:host?.querySelector?.(`[data-tool="${TOOL_KEY}"]`);
  if(!root)return null;
  if(root.__handoffApp)return root.__handoffApp;
  if(activeApp&&activeApp.root!==root)activeApp.destroy();

  const app=new HandoffApp(root);
  root.__handoffApp=app;
  activeApp=app;
  await app.init();
  return app;
}

export function destroy(){activeApp?.destroy();activeApp=null;}

class HandoffApp{
  constructor(root){
    this.root=root;
    this.db=null;
    this.patients=[];
    this.patient=null;
    this.record=null;
    this.previousRecord=null;
    this.recordCache=new Map();
    this.searchIndex=new Map();
    this.saveTimer=null;
    this.dirty=false;
    this.patientDirty=false;
    this.backgroundEditing=false;

    this.onInput=this.onInput.bind(this);
    this.onChange=this.onChange.bind(this);
    this.onClick=this.onClick.bind(this);
    this.pendingBackup=null;
  }

  async init(){
    this.cache();
    this.bind();
    this.db=await openDb();

    this.patients=(await getAll(this.db,"patients"))
      .map(normalizePatient)
      .sort(sortPatients);

    if(!this.patients.length){
      const p=blankPatient();
      await put(this.db,"patients",p);
      this.patients=[p];
    }

    this.renderSystems();
    await this.rebuildSearchIndex();

    const savedId=await getSetting(this.db,"currentPatientId");
    const firstId=this.patients.some(p=>p.id===savedId)
      ?savedId
      :(this.patients.find(p=>p.status==="active")?.id||this.patients[0].id);

    await this.selectPatient(firstId,false);
    this.setSaveState("已載入");
  }

  cache(){
    const q=s=>this.root.querySelector(s);
    this.r={
      search:q('[data-ref="search"]'),
      activePatientList:q('[data-ref="activePatientList"]'),
      dischargedPatientList:q('[data-ref="dischargedPatientList"]'),
      patientTitle:q('[data-ref="patientTitle"]'),
      finalizeBtn:q('[data-ref="finalizeBtn"]'),
      date:q('[data-ref="date"]'),
      saveState:q('[data-ref="saveState"]'),
      recordBadge:q('[data-ref="recordBadge"]'),
      backgroundView:q('[data-ref="backgroundView"]'),
      derivedAge:q('[data-ref="derivedAge"]'),
      systems:q('[data-ref="systems"]'),
      alertStrip:q('[data-ref="alertStrip"]'),
      copyMenu:q('[data-ref="copyMenu"]'),
      backupMenu:q('[data-ref="backupMenu"]'),
      backupFileInput:q('[data-ref="backupFileInput"]'),
      restoreDialog:q('[data-ref="restoreDialog"]'),
      restoreInfo:q('[data-ref="restoreInfo"]'),
      restoreMerge:q('[data-ref="restoreMerge"]'),
      restoreReplace:q('[data-ref="restoreReplace"]'),
      historyDialog:q('[data-ref="historyDialog"]'),
      historyList:q('[data-ref="historyList"]'),
      weeklyDialog:q('[data-ref="weeklyDialog"]'),
      weeklyFrom:q('[data-ref="weeklyFrom"]'),
      weeklyTo:q('[data-ref="weeklyTo"]'),
      weeklyAnonymize:q('[data-ref="weeklyAnonymize"]'),
      weeklyBackground:q('[data-ref="weeklyBackground"]'),
      weeklyInfo:q('[data-ref="weeklyInfo"]'),
      patientDialog:q('[data-ref="patientDialog"]'),
      backgroundDialog:q('[data-ref="backgroundDialog"]'),
      newBed:q('[data-ref="newBed"]'),
      newMrn:q('[data-ref="newMrn"]'),
      newName:q('[data-ref="newName"]'),
      newTeam:q('[data-ref="newTeam"]'),
    };
  }

  bind(){
    this.root.addEventListener("input",this.onInput);
    this.root.addEventListener("change",this.onChange);
    this.root.addEventListener("click",this.onClick);
  }

  destroy(){
    clearTimeout(this.saveTimer);
    this.root.removeEventListener("input",this.onInput);
    this.root.removeEventListener("change",this.onChange);
    this.root.removeEventListener("click",this.onClick);
    if(this.root.__handoffApp===this)delete this.root.__handoffApp;
  }

  renderSystems(){
    this.r.systems.innerHTML=SYSTEMS.map(([key,label])=>`
      <label class="hf-system-row">
        <span>${label}</span>
        <textarea rows="2" data-field="systems.${key}"
          placeholder="${label}..."></textarea>
      </label>
    `).join("");
  }

  async selectPatient(id,save=true){
    if(save)await this.flush();

    this.patient=clone(this.patients.find(p=>p.id===id)||this.patients[0]);
    await setSetting(this.db,"currentPatientId",this.patient.id);

    if(this.r.search)this.r.search.value="";
    this.renderPatientLists();

    const lastDate=await getSetting(this.db,`lastDate:${this.patient.id}`);
    await this.loadDate(lastDate||todayISO(),false);
  }

  async loadDate(date,save=true){
    const maxDate=addDays(todayISO(),1);

    if(date>maxDate){
      throw new Error("最多只能建立到明天的交班單。");
    }
    
    if(save)await this.flush();

    const all=await this.getPatientRecords(this.patient.id,true);
    this.previousRecord=latestBefore(all,date);

    const id=recordId(this.patient.id,date);
    const found=await get(this.db,"dailyRecords",id);

    this.record=found
      ?normalizeRecord(found)
      :blankRecord(this.patient,date,this.previousRecord);

    this.dirty=false;
    this.patientDirty=false;
    this.backgroundEditing=false;

    await setSetting(this.db,`lastDate:${this.patient.id}`,date);

    this.fill();
    this.renderAll();
    this.setSaveState(found?`已載入 ${formatDate(date)}`:`${formatDate(date)} 新紀錄`);
  }

  async getPatientRecords(patientId,force=false){
    if(!force&&this.recordCache.has(patientId))
      return clone(this.recordCache.get(patientId));

    const rows=(await getByIndex(this.db,"dailyRecords","patientId",patientId))
      .map(normalizeRecord)
      .sort((a,b)=>b.date.localeCompare(a.date));

    this.recordCache.set(patientId,rows);
    return clone(rows);
  }

  fill(){
    this.root.querySelectorAll("[data-field]").forEach(el=>{
      const path=el.dataset.field;
      const value=path.startsWith("patient.")
        ?getPath(this.patient,path.slice(8))
        :getPath(this.record,path);

      setControl(el,value);
      if(el.tagName==="TEXTAREA")autoResize(el);
    });

    this.r.date.value=this.record.date;
  }

  async onInput(e){
    if(e.target===this.r.search){
      this.renderPatientLists(e.target.value);
      return;
    }

    const el=e.target.closest("[data-field]");
    if(!el)return;

    const path=el.dataset.field;

    if(path.startsWith("patient.")){
      if(!this.backgroundEditing)return;
      setPath(this.patient,path.slice(8),readControl(el));
      this.patient.updatedAt=nowISO();
      this.patientDirty=true;
    }else{
      if(this.isReadOnly()){this.fill();return;}
      setPath(this.record,path,readControl(el));
      this.record.updatedAt=nowISO();
      this.dirty=true;
    }

    if(el.tagName==="TEXTAREA")autoResize(el);
    this.markDirty();

    this.renderDerived();
    this.renderPatientHeader();
  }

  async onChange(e){
    if(e.target===this.r.backupFileInput){
      const file=e.target.files?.[0];
      e.target.value="";
      if(file)await this.prepareBackupRestore(file);
      return;
    }
    if(e.target===this.r.date){
      if(!e.target.value)return;

      const maxDate=addDays(todayISO(),1);

      if(e.target.value>maxDate){
        e.target.value=this.record?.date||todayISO();
        this.setSaveState("最多只能建立到明天");
        return;
      }

      await this.loadDate(e.target.value,true);
      return;
    }
    if(e.target===this.r.weeklyFrom||e.target===this.r.weeklyTo){
      await this.updateWeeklyInfo();
      return;
    }
    if(e.target.matches("[data-field]"))await this.onInput(e);
  }

  async onClick(e){
    const b=e.target.closest("[data-action]");
    if(!b)return;
    const a=b.dataset.action;

    try{
      if(a==="toggleBackupMenu"){
        if(this.r.backupMenu)this.r.backupMenu.hidden=!this.r.backupMenu.hidden;
        return;
      }
      if(a==="exportBackup"){
        if(this.r.backupMenu)this.r.backupMenu.hidden=true;
        return this.exportBackup();
      }
      if(a==="importBackup"){
        if(this.r.backupMenu)this.r.backupMenu.hidden=true;
        this.r.backupFileInput?.click();
        return;
      }
      if(a==="confirmRestore")return this.restoreBackup();
      if(a==="newPatient")return this.r.patientDialog.showModal();
      if(a==="togglePatientMenu"){
        e.stopPropagation();
        const id=b.dataset.patientId;
        this.root.querySelectorAll("[data-patient-menu]").forEach(menu=>{
          menu.hidden=menu.dataset.patientMenu!==id ? true : !menu.hidden;
        });
        return;
      }
      if(a==="transferPatient"){
        e.stopPropagation();
        this.root.querySelectorAll("[data-patient-menu]").forEach(menu=>menu.hidden=true);
        return this.transferPatient(b.dataset.patientId);
      }
      if(a==="deletePatient"){
        e.stopPropagation();
        this.root.querySelectorAll("[data-patient-menu]").forEach(menu=>menu.hidden=true);
        return this.deletePatient(b.dataset.patientId);
      }
      if(a==="patientSwitch")return this.selectPatient(b.dataset.patientId,true);
      if(a==="prevDay")return this.loadDate(addDays(this.record.date,-1),true);
      if(a==="nextDay"){
        const next=addDays(this.record.date,1);
        const maxDate=addDays(todayISO(),1);

        if(next>maxDate){
          this.setSaveState("最多只能建立到明天");
          return;
        }

        return this.loadDate(next,true);
      }
      if(a==="today")return this.loadDate(todayISO(),true);
      if(a==="history")return this.openHistory();
      if(a==="historyDate"){
        this.r.historyDialog?.close();
        return this.loadDate(b.dataset.date,true);
      }
      if(a==="toggleHistoryMenu"){
        e.stopPropagation();
        const date=b.dataset.date;
        this.root.querySelectorAll("[data-history-menu]").forEach(menu=>{
          menu.hidden=menu.dataset.historyMenu!==date ? true : !menu.hidden;
        });
        return;
      }
      if(a==="deleteHistoryDate"){
        e.stopPropagation();
        this.root.querySelectorAll("[data-history-menu]").forEach(menu=>menu.hidden=true);
        return this.deleteHistoryDate(b.dataset.date);
      }
      if(a==="toggleCopyMenu"){
        if(this.r.copyMenu)this.r.copyMenu.hidden=!this.r.copyMenu.hidden;
        return;
      }
      if(a==="weeklySummary"){
        if(this.r.copyMenu)this.r.copyMenu.hidden=true;
        return this.openWeeklySummary();
      }
      if(a==="weeklyPreset"){
        return this.applyWeeklyPreset(b.dataset.preset);
      }
      if(a==="copyWeekly"){
        return this.copyWeeklySummary();
      }
      if(a==="copyMode"){
        const mode=b.dataset.copyMode||"full";
        await copyText(this.outputText(mode));
        if(this.r.copyMenu)this.r.copyMenu.hidden=true;
        this.setSaveState(
          mode==="changes"
            ?"已複製今日變更"
            :mode==="soap"
              ?"已複製 SOAP"
              :mode==="duty"
                ?"已複製 Duty Note"
                :"已複製"
        );
        setTimeout(()=>this.setSaveState(`已儲存 ${timeHHMM()}`),1200);
        return;
      }
      if(a==="save")return this.saveNow("manual");
      if(a==="finalize")return this.finalize();
      if(a==="editBackground")return this.openBackgroundEditor();
      if(a==="saveBackground")return this.saveBackground();
      if(a==="createPatient")return this.createPatient();
      if(a==="closeDialog"){
        this.backgroundEditing=false;
        return b.closest("dialog")?.close();
      }
    }catch(err){
      console.error(err);
      alert(err.message||String(err));
    }
  }

  async exportBackup(){
    await this.flush();
    const backup={
      app:"NeoAssist Handoff",
      backupVersion:1,
      databaseName:DB_NAME,
      databaseVersion:DB_VERSION,
      exportedAt:nowISO(),
      data:{
        patients:await getAll(this.db,"patients"),
        dailyRecords:await getAll(this.db,"dailyRecords"),
        revisions:await getAll(this.db,"revisions"),
        settings:await getAll(this.db,"settings")
      }
    };
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`neoassist-handoff-backup-${todayISO()}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    await setSetting(this.db,"lastBackupAt",nowISO());
    this.setSaveState("備份已匯出");
  }

  async prepareBackupRestore(file){
    let backup;
    try{backup=JSON.parse(await file.text());}
    catch{throw new Error("無法讀取備份檔：JSON 格式錯誤。");}

    if(backup?.app!=="NeoAssist Handoff"||!Number.isInteger(backup?.backupVersion)||
      !backup?.data||!Array.isArray(backup.data.patients)||
      !Array.isArray(backup.data.dailyRecords)||!Array.isArray(backup.data.revisions)||
      !Array.isArray(backup.data.settings)){
      throw new Error("這不是有效的 NeoAssist Handoff 備份檔。");
    }
    if(backup.backupVersion>1)
      throw new Error(`此備份版本 v${backup.backupVersion} 比目前程式新，無法安全還原。`);

    this.pendingBackup=backup;
    const d=backup.data;
    this.r.restoreInfo.textContent=
      `備份時間：${backup.exportedAt?formatDateTime(backup.exportedAt):"未知"} · ${d.patients.length} 位病人 · ${d.dailyRecords.length} 筆每日紀錄`;
    if(this.r.restoreMerge)this.r.restoreMerge.checked=true;
    this.r.restoreDialog?.showModal();
  }

  async restoreBackup(){
    const backup=this.pendingBackup;
    if(!backup)throw new Error("沒有可還原的備份資料。");
    const replace=this.r.restoreReplace?.checked===true;

    if(replace&&!confirm("完整覆蓋會刪除目前所有 Handoff 資料，再以備份內容取代。\n\n確定要繼續嗎？"))return;

    await this.flush();
    const stores=["patients","dailyRecords","revisions","settings"];
    if(replace)for(const store of stores)await clearStore(this.db,store);

    for(const row of backup.data.patients)await put(this.db,"patients",normalizePatient(row));
    for(const row of backup.data.dailyRecords)await put(this.db,"dailyRecords",normalizeRecord(row));
    for(const row of backup.data.revisions)await put(this.db,"revisions",row);
    for(const row of backup.data.settings)await put(this.db,"settings",row);

    await setSetting(this.db,"lastRestoreAt",nowISO());
    this.pendingBackup=null;
    this.recordCache.clear();this.searchIndex.clear();
    this.patients=(await getAll(this.db,"patients")).map(normalizePatient).sort(sortPatients);

    if(!this.patients.length){
      const p=blankPatient();await put(this.db,"patients",p);this.patients=[p];
    }

    await this.rebuildSearchIndex();
    const savedId=await getSetting(this.db,"currentPatientId");
    const id=this.patients.some(p=>p.id===savedId)?savedId:
      (this.patients.find(p=>p.status==="active")?.id||this.patients[0].id);

    this.r.restoreDialog?.close();
    await this.selectPatient(id,false);
    this.setSaveState(replace?"備份已完整還原":"備份已合併");
  }

  openBackgroundEditor(){
    if(this.record?.status==="finalized")return;
    this.backgroundEditing=true;
    this.fill();
    this.r.backgroundDialog.showModal();
    this.syncReadonly();
  }

  async saveBackground(){
    await this.saveNow("background");
    this.backgroundEditing=false;
    this.r.backgroundDialog.close();
    this.renderAll();
  }

  async createPatient(){
    const p=blankPatient();
    p.bed=this.r.newBed.value.trim();
    p.mrn=this.r.newMrn.value.trim();
    p.name=this.r.newName.value.trim();
    p.team=this.r.newTeam.value.trim();

    await put(this.db,"patients",p);
    this.patients.push(p);
    this.patients.sort(sortPatients);

    this.r.newBed.value="";
    this.r.newMrn.value="";
    this.r.newName.value="";
    this.r.newTeam.value="";
    this.r.patientDialog.close();

    await this.updateSearchIndexForPatient(p.id);
    await this.selectPatient(p.id,true);
  }

  async transferPatient(patientId=this.patient?.id){
    if(!patientId)return;
    await this.flush();
    const source=this.patients.find(p=>p.id===patientId);
    if(!source)return;

    const p=clone(source);
    const toDischarged=p.status!=="discharged";

    p.status=toDischarged?"discharged":"active";
    p.dischargedAt=toDischarged?nowISO():"";
    p.updatedAt=nowISO();
    await put(this.db,"patients",p);

    const i=this.patients.findIndex(x=>x.id===p.id);
    if(i>=0)this.patients[i]=clone(p);
    this.patients.sort(sortPatients);
    if(this.patient?.id===p.id)this.patient=clone(p);

    await this.updateSearchIndexForPatient(p.id);
    this.renderAll();
  }

  async deletePatient(patientId){
    if(!patientId)return;
    await this.flush();

    const p=this.patients.find(x=>x.id===patientId);
    if(!p)return;

    const mrn=String(p.mrn||"").trim();
    if(!confirm(`永久刪除 ${patientLabel(p)}？\n\n這會刪除病人資料、所有 Daily Records 與 Revision History，無法復原。`))return;

    if(mrn){
      const typed=prompt(`請輸入病歷號 ${mrn} 以確認刪除：`,"");
      if(typed===null)return;
      if(typed.trim()!==mrn){alert("病歷號不符，已取消刪除。");return;}
    }else if(!confirm("此病人沒有病歷號。確定仍要永久刪除？"))return;

    await deletePatientData(this.db,patientId);
    this.recordCache.delete(patientId);
    this.searchIndex.delete(patientId);
    this.patients=this.patients.filter(x=>x.id!==patientId);

    if(!this.patients.length){
      const fresh=blankPatient();
      await put(this.db,"patients",fresh);
      this.patients=[fresh];
    }

    this.patients.sort(sortPatients);
    const next=this.patients.find(x=>x.status==="active")||this.patients[0];
    await this.selectPatient(next.id,false);
    this.setSaveState("病人已刪除");
  }

  markDirty(){
    this.setSaveState("尚未儲存");
    clearTimeout(this.saveTimer);
    this.saveTimer=setTimeout(()=>this.saveNow("autosave"),AUTOSAVE_DELAY_MS);
  }

  async flush(){
    if(this.dirty||this.patientDirty)await this.saveNow("autosave");
  }

  async saveNow(reason="manual"){
    if(!this.record||!this.patient)return;

    clearTimeout(this.saveTimer);
    this.setSaveState("正在儲存…");

    if(this.patientDirty){
      await put(this.db,"patients",this.patient);
      const i=this.patients.findIndex(p=>p.id===this.patient.id);
      if(i>=0)this.patients[i]=clone(this.patient);
      else this.patients.push(clone(this.patient));
      this.patients.sort(sortPatients);
    }

    this.record.patientSnapshot=clone(this.patient);
    this.record.updatedAt=nowISO();

    await put(this.db,"dailyRecords",this.record);
    await put(this.db,"revisions",{
      id:`${this.record.id}::${Date.now()}`,
      recordId:this.record.id,
      patientId:this.record.patientId,
      date:this.record.date,
      reason,
      savedAt:nowISO(),
      snapshot:clone(this.record)
    });

    this.dirty=false;
    this.patientDirty=false;
    this.recordCache.delete(this.patient.id);
    await this.updateSearchIndexForPatient(this.patient.id);

    this.setSaveState(`已儲存 ${timeHHMM()}`);
    this.renderAll();
  }

  async finalize(){
    if(!this.record)return;

    if(this.record.date>todayISO()){
      alert("明日暫存紀錄不能提前完成。");
      return;
    }

    if(this.record.status==="finalized"){
      if(!confirm("此日已完成。要重新開啟編輯嗎？"))return;
      this.record.status="draft";
      this.record.revision=(this.record.revision||1)+1;
      this.record.finalizedAt="";
      this.dirty=true;
      await this.saveNow("reopen");
      return;
    }

    await this.saveNow("before-finalize");

    this.record.status="finalized";
    this.record.finalizedAt=nowISO();
    this.record.updatedAt=nowISO();

    await put(this.db,"dailyRecords",this.record);
    await put(this.db,"revisions",{
      id:`${this.record.id}::final::${Date.now()}`,
      recordId:this.record.id,
      patientId:this.record.patientId,
      date:this.record.date,
      reason:"finalize",
      savedAt:nowISO(),
      snapshot:clone(this.record)
    });

    this.recordCache.delete(this.patient.id);
    await this.updateSearchIndexForPatient(this.patient.id);
    this.renderAll();
    this.setSaveState("今日已完成");
  }

  isReadOnly(){return this.record?.status==="finalized";}

  renderAll(){
    this.renderPatientHeader();
    this.renderPatientLists(this.r.search?.value||"");
    this.renderBackground();
    this.renderAlert();
    this.renderDerived();
    this.renderRecordState();
    this.syncReadonly();
  }

  renderPatientHeader(){
    if(!this.patient)return;

    const p=this.patient;
    const parts=[];

    if(p.team){
      parts.push(`<strong>(${escapeHTML(p.team)})</strong>`);
    }

    if(p.bed){
      parts.push(`<strong>${escapeHTML(p.bed)}</strong>`);
    }

    if(p.mrn){
      parts.push(`<strong>${escapeHTML(p.mrn)}</strong>`);
    }

    if(p.name){
      parts.push(`<strong>${escapeHTML(p.name)}</strong>`);
    }

    this.r.patientTitle.innerHTML=parts.length
      ?parts.join('<span class="hf-dot-sep">·</span>')
      :"未命名病人";
  }

  renderBackground(){
    const p=this.patient;
    if(!p)return;

    const first=[
      p.birthDate?`DOB ${formatDate(p.birthDate)}`:"",
      p.gaWeeks!==""?`GA ${p.gaWeeks}+${p.gaDays||0}`:"",
      p.birthWeightG?`BBW ${p.birthWeightG} g`:"",
      formatDelivery(p),
      formatApgar(p)
    ].filter(Boolean);

    const mom=p.momBackground?.trim();
    const nb=p.nbBackground?.trim();

    this.r.backgroundView.innerHTML=`
      ${first.length
        ?`<div class="hf-bg-summary">${first.map(escapeHTML).join('<span class="hf-dot-sep">·</span>')}</div>`
        :`<div class="hf-bg-empty">尚未建立病人背景</div>`}
      ${mom?`<div class="hf-bg-text"><b>Mom</b><pre>${escapeHTML(mom)}</pre></div>`:""}
      ${nb?`<div class="hf-bg-text"><b>NB</b><pre>${escapeHTML(nb)}</pre></div>`:""}
    `;
  }

  renderAlert(){
    if(!this.r.alertStrip||!this.patient)return;
    const alert=this.patient.alert?.trim()||"";
    this.r.alertStrip.hidden=!alert;
    this.r.alertStrip.innerHTML=alert?`<strong>!</strong><span>${escapeHTML(alert)}</span>`:"";
  }


  async openHistory(){
    await this.flush();
    const list=await this.getPatientRecords(this.patient.id,true);

    this.r.historyList.innerHTML=list.length
      ?list.map(r=>`
        <div class="hf-history-entry ${r.date===this.record.date?"is-current":""}">
          <button class="hf-history-item"
            data-action="historyDate"
            data-date="${escapeAttr(r.date)}">
            <strong>${escapeHTML(formatDate(r.date))}</strong>
            <span class="${r.status==="finalized"?"is-final":""}">
              ${r.status==="finalized"?"FINAL":"DRAFT"}
            </span>
            <small>${escapeHTML(trimOneLine(r.summary)||"無 summary")}</small>
          </button>

          <div class="hf-history-menu-wrap">
            <button class="hf-history-more"
              data-action="toggleHistoryMenu"
              data-date="${escapeAttr(r.date)}"
              aria-label="歷程操作">⋯</button>

            <div class="hf-history-menu"
              data-history-menu="${escapeAttr(r.date)}"
              hidden>
              <button class="hf-danger-text"
                data-action="deleteHistoryDate"
                data-date="${escapeAttr(r.date)}">
                刪除此日紀錄
              </button>
            </div>
          </div>
        </div>
      `).join("")
      :`<div class="hf-empty-list">尚無歷程</div>`;

    this.r.historyDialog.showModal();
  }

  async deleteHistoryDate(date){
    if(!date||!this.patient)return;

    const id=recordId(this.patient.id,date);
    const found=await get(this.db,"dailyRecords",id);
    if(!found){
      await this.openHistory();
      return;
    }

    const status=found.status==="finalized"?"FINAL":"DRAFT";
    if(!confirm(`刪除 ${formatDate(date)} 的交班紀錄？\n\n${status} 紀錄與其 Revision History 將永久刪除。`))return;

    await deleteDailyRecordData(this.db,id);
    this.recordCache.delete(this.patient.id);
    await this.updateSearchIndexForPatient(this.patient.id);

    const deletingCurrent=this.record?.id===id;
    if(deletingCurrent){
      const remaining=await this.getPatientRecords(this.patient.id,true);
      this.r.historyDialog?.close();

      if(remaining.length){
        const next=remaining
          .filter(r=>r.date<=todayISO())
          .sort((a,b)=>b.date.localeCompare(a.date))[0];
        if(next)return this.loadDate(next.date,false);
      }

      return this.loadDate(todayISO(),false);
    }

    await this.openHistory();
    this.setSaveState(`已刪除 ${formatDate(date)} 紀錄`);
  }

  renderDerived() {
    if (!this.record || !this.patient) return;

    const age = deriveAge(this.patient, this.record.date);

    const date = formatDate(this.record.date);

    let ageType = "";
    let ageValue = "";

    if (age.ageLabel) {
      const parts = age.ageLabel.split(" ");
      ageType = parts[0] || "";
      ageValue = parts.slice(1).join(" ");
    }

    this.r.derivedAge.innerHTML = `
      <div class="hf-age-chip">
        <span>Date</span>
        <strong>${escapeHTML(date)}</strong>
      </div>

      <div class="hf-age-chip">
        <span>${escapeHTML(ageType || "PMA")}</span>
        <strong>${escapeHTML(ageValue || "—")}</strong>
      </div>

      <div class="hf-age-chip">
        <span>DOL</span>
        <strong>${age.dol !== null ? escapeHTML(age.dol) : "—"}</strong>
      </div>
    `;
  }

  renderRecordState(){
    const finalized=this.record?.status==="finalized";
    this.r.recordBadge.textContent=finalized
      ?`FINAL · ${formatDateTime(this.record.finalizedAt)}`
      :`DRAFT · r${this.record?.revision||1}`;
    this.r.recordBadge.className=
      `hf-record-badge ${finalized?"is-final":"is-draft"}`;
    this.root.classList.toggle("is-finalized",finalized);
    this.r.finalizeBtn.textContent=finalized?"重新開啟":"完成";
  }

  syncReadonly(){
    const ro=this.isReadOnly();

    this.root.querySelectorAll("[data-field]").forEach(el=>{
      const patientField=el.dataset.field?.startsWith("patient.");
      el.disabled=ro||(patientField&&!this.backgroundEditing);
    });
  }

  setSaveState(text){
    if(this.r.saveState)this.r.saveState.textContent=text;
  }

  async rebuildSearchIndex(){
    this.searchIndex.clear();
    for(const p of this.patients){
      await this.updateSearchIndexForPatient(p.id);
    }
  }

  async updateSearchIndexForPatient(patientId){
    const p=this.patient?.id===patientId
      ?this.patient
      :this.patients.find(x=>x.id===patientId);

    if(!p)return;

    let records=await this.getPatientRecords(patientId,true);

    if(this.patient?.id===patientId&&this.record){
      records=records.filter(r=>r.id!==this.record.id);
      records.push(clone(this.record));
    }

    this.searchIndex.set(patientId,buildSearchText(p,records));
  }

  renderPatientLists(query=""){
    const q=normalizeSearch(query);

    const matches=p=>{
      if(!q)return true;
      return (this.searchIndex.get(p.id)||normalizeSearch(buildPatientText(p))).includes(q);
    };

    const active=this.patients
      .filter(p=>p.status!=="discharged"&&matches(p))
      .sort(sortPatients);

    const discharged=this.patients
      .filter(p=>p.status==="discharged"&&matches(p))
      .sort(sortDischarged);

    this.r.activePatientList.innerHTML=active.length
      ?active.map(p=>this.patientRowHtml(p,q)).join("")
      :`<div class="hf-empty-list">無符合病人</div>`;

    this.r.dischargedPatientList.innerHTML=discharged.length
      ?discharged.map(p=>this.patientRowHtml(p,q)).join("")
      :`<div class="hf-empty-list">無符合病人</div>`;
  }

  patientRowHtml(p,q){
    const active=p.id===this.patient?.id;
    const snippet=q?this.searchSnippet(p,q):"";
    const transferLabel=p.status==="discharged"?"轉入":"轉出";

    return `
      <div class="hf-patient-item ${active?"is-active":""}">
        <button class="hf-patient-row"
          data-action="patientSwitch" data-patient-id="${escapeAttr(p.id)}">
          <span class="hf-bed">${escapeHTML(p.bed||"—")}</span>
          <span class="hf-mrn">${escapeHTML(p.mrn||"—")}</span>
          ${snippet?`<small>${escapeHTML(snippet)}</small>`:""}
        </button>
        <div class="hf-patient-menu-wrap">
          <button class="hf-patient-more" data-action="togglePatientMenu"
            data-patient-id="${escapeAttr(p.id)}" aria-label="病人操作">⋯</button>
          <div class="hf-patient-menu" data-patient-menu="${escapeAttr(p.id)}" hidden>
            <button data-action="transferPatient" data-patient-id="${escapeAttr(p.id)}">${transferLabel}</button>
            <div class="hf-patient-menu-divider"></div>
            <button class="hf-danger-text" data-action="deletePatient"
              data-patient-id="${escapeAttr(p.id)}">刪除病人</button>
          </div>
        </div>
      </div>
    `;
  }

  searchSnippet(p,q){
    const bg=buildPatientText(p);
    if(normalizeSearch(bg).includes(q))return `BG · ${trimAroundMatch(bg,q)}`;

    const records=(this.recordCache.get(p.id)||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
    for(const r of records){
      const fields=[
        ["Summary",r.summary],["Vent",r.vent],["Line",r.line],["Fluids",r.fluids],
        ...SYSTEMS.map(([key,label])=>[label,r.systems?.[key]||""]),
        ["Assessment",r.assessment],["Plan",r.plan]
      ];
      for(const [label,raw] of fields){
        if(normalizeSearch(raw).includes(q))
          return `${formatDate(r.date)} · ${label}: ${trimAroundMatch(raw,q)}`;
      }
    }
    return "";
  }

  async openWeeklySummary(){
    await this.flush();

    const end=this.record?.date||todayISO();
    const start=addDays(end,-6);

    if(this.r.weeklyFrom)this.r.weeklyFrom.value=start;
    if(this.r.weeklyTo)this.r.weeklyTo.value=end;
    if(this.r.weeklyAnonymize)this.r.weeklyAnonymize.checked=true;
    if(this.r.weeklyBackground)this.r.weeklyBackground.checked=true;

    await this.updateWeeklyInfo();
    this.r.weeklyDialog?.showModal();
  }

  async applyWeeklyPreset(preset){
    const end=this.record?.date||todayISO();

    if(preset==="week"){
      const d=parseDate(end)||new Date();
      const day=d.getDay(); // Sunday = 0
      const back=(day+6)%7;  // Monday = start of week
      if(this.r.weeklyFrom)this.r.weeklyFrom.value=addDays(end,-back);
      if(this.r.weeklyTo)this.r.weeklyTo.value=end;
    }else{
      if(this.r.weeklyFrom)this.r.weeklyFrom.value=addDays(end,-6);
      if(this.r.weeklyTo)this.r.weeklyTo.value=end;
    }

    await this.updateWeeklyInfo();
  }

  async weeklyRecords(){
    const from=this.r.weeklyFrom?.value||"";
    const to=this.r.weeklyTo?.value||"";

    if(!from||!to)return [];
    if(from>to)throw new Error("From 日期不可晚於 To 日期。");

    const rows=await this.getPatientRecords(this.patient.id,true);

    // Include the currently loaded record even if it was just saved.
    const merged=rows.filter(r=>r.id!==this.record?.id);
    if(this.record)merged.push(normalizeRecord(this.record));

    return merged
      .filter(r=>r.date>=from&&r.date<=to)
      .sort((a,b)=>a.date.localeCompare(b.date));
  }

  async updateWeeklyInfo(){
    if(!this.r.weeklyInfo)return;

    const from=this.r.weeklyFrom?.value||"";
    const to=this.r.weeklyTo?.value||"";

    if(!from||!to){
      this.r.weeklyInfo.textContent="請選擇日期區間。";
      return;
    }

    if(from>to){
      this.r.weeklyInfo.textContent="From 日期不可晚於 To 日期。";
      return;
    }

    const rows=await this.weeklyRecords();
    this.r.weeklyInfo.textContent=rows.length
      ?`${formatDate(from)}–${formatDate(to)} · 共 ${rows.length} 天有紀錄`
      :`${formatDate(from)}–${formatDate(to)} · 此區間沒有紀錄`;
  }

  async copyWeeklySummary(){
    const rows=await this.weeklyRecords();
    if(!rows.length){
      alert("這個日期區間沒有可匯出的紀錄。");
      return;
    }

    const anonymize=this.r.weeklyAnonymize?.checked!==false;
    const includeBackground=this.r.weeklyBackground?.checked!==false;
    const text=this.weeklySummaryPrompt(rows,{anonymize,includeBackground});

    await copyText(text);
    this.r.weeklyDialog?.close();
    this.setSaveState(`已複製 Weekly Summary · ${rows.length} 天`);
    setTimeout(()=>this.setSaveState(`已儲存 ${timeHHMM()}`),1500);
  }

  weeklySummaryPrompt(records,{anonymize=true,includeBackground=true}={}){
    const p=this.patient;
    const from=records[0]?.date||"";
    const to=records.at(-1)?.date||"";
    const lines=[
      "Please generate a concise NICU weekly summary from the following longitudinal clinical records.",
      "",
      "Requirements:",
      "- Summarize the clinical course over the selected period rather than repeating each day.",
      "- Highlight meaningful changes, trends, escalation/de-escalation, procedures, investigations, and unresolved issues.",
      "- Organize the summary by clinically relevant domains such as respiratory, cardiovascular, nutrition/GI, infection, hematology, neurology, renal, lines/support, and major investigations when applicable.",
      "- End with Current Status and Ongoing Issues / Plan.",
      "- Avoid repeating unchanged information.",
      "- Do not invent, infer, or add information that is not present in the source records.",
      "- Keep important dates when they clarify the clinical course.",
      "",
      `Selected period: ${from} to ${to}`
    ];

    if(!anonymize){
      const id=[p.bed,p.name,p.mrn,p.team].filter(Boolean).join(" · ");
      if(id)lines.push(`Patient: ${id}`);
    }else{
      lines.push("Patient identifiers: removed");
    }

    if(includeBackground){
      const bg=[
        p.birthDate?`DOB ${formatDate(p.birthDate)}`:"",
        p.gaWeeks!==""?`GA ${p.gaWeeks}+${p.gaDays||0}`:"",
        p.birthWeightG?`BBW ${p.birthWeightG} g`:"",
        formatDelivery(p),
        formatApgar(p)
      ].filter(Boolean).join(" · ");

      lines.push("","=== PATIENT BACKGROUND ===");
      if(bg)lines.push(bg);
      if(p.momBackground?.trim())lines.push(`Mom: ${p.momBackground.trim()}`);
      if(p.nbBackground?.trim())lines.push(`NB: ${p.nbBackground.trim()}`);
      if(p.alert?.trim())lines.push(`Important alert: ${p.alert.trim()}`);
    }

    records.forEach(r=>{
      const age=deriveAge(p,r.date);
      lines.push("","========================================");
      lines.push(`=== ${r.date} ===`);
      lines.push(this.quickFactsText(r,age));

      if(r.summary?.trim()){
        lines.push("","SHIFT SUMMARY",r.summary.trim());
      }

      const support=[];
      if(r.vent?.trim())support.push(`Vent: ${r.vent.trim()}`);
      if(r.line?.trim())support.push(`Line: ${r.line.trim()}`);
      if(r.fluids?.trim())support.push(`Fluids: ${r.fluids.trim()}`);
      if(support.length)lines.push("",...support);

      SYSTEMS.forEach(([key,label])=>{
        const value=r.systems?.[key]?.trim();
        if(value)lines.push("",label,value);
      });

      if(r.assessment?.trim())lines.push("","ASSESSMENT",r.assessment.trim());
      if(r.plan?.trim())lines.push("","PLAN",r.plan.trim());
    });

    lines.push("","========================================");
    lines.push("Please return only the weekly clinical summary, without discussing the summarization process.");

    return cleanOutput(lines);
  }

  outputText(mode="full"){
    if(mode==="changes")return this.outputChangesText();
    if(mode==="soap")return this.outputSOAPText();
    if(mode==="duty")return this.outputDutyNoteText();

    const p=this.patient;
    const r=this.record;
    const age=deriveAge(p,r.date);
    const lines=[];

    const head=[p.bed,p.name,p.mrn,p.team].filter(Boolean).join(" · ");
    if(head)lines.push(head);
    if(p.alert?.trim())lines.push(`! ${p.alert.trim()}`);

    const bg=[
      p.birthDate?`DOB ${formatDate(p.birthDate)}`:"",
      p.gaWeeks!==""?`GA ${p.gaWeeks}+${p.gaDays||0}`:"",
      p.birthWeightG?`BBW ${p.birthWeightG} g`:"",
      formatDelivery(p),
      formatApgar(p)
    ].filter(Boolean).join(" · ");

    if(bg)lines.push("","[BACKGROUND]",bg);
    if(p.momBackground?.trim())lines.push(`Mom: ${p.momBackground.trim()}`);
    if(p.nbBackground?.trim())lines.push(`NB: ${p.nbBackground.trim()}`);

    lines.push("","[SHIFT SUMMARY]");
    lines.push(this.quickFactsText(r,age));
    if(r.summary?.trim())lines.push(r.summary.trim());
    if(r.vent?.trim())lines.push(`Vent: ${r.vent.trim()}`);
    if(r.line?.trim())lines.push(`Line: ${r.line.trim()}`);
    if(r.fluids?.trim())lines.push(`Fluids: ${r.fluids.trim()}`);

    SYSTEMS.forEach(([key,label])=>{
      const v=r.systems[key]?.trim();
      if(v)lines.push("",`[${label}]`,v);
    });

    if(r.assessment?.trim())lines.push("","[ASSESSMENT]",r.assessment.trim());
    if(r.plan?.trim())lines.push("","[PLAN]",r.plan.trim());

    return cleanOutput(lines);
  }

  quickFactsText(r=this.record,age=deriveAge(this.patient,r.date)){
    return [
      formatDate(r.date),
      age.ageLabel,
      age.dol!==null?`DOL ${age.dol}`:"",
      r.metrics.weightG!==""?`BW ${r.metrics.weightG} g`:"",
      r.metrics.io!==""?`I/O ${r.metrics.io}`:"",
      r.metrics.urineOutput!==""?`UO ${r.metrics.urineOutput}`:"",
      r.metrics.kcal!==""?`kcal ${r.metrics.kcal}`:"",
      r.metrics.stool!==""?`Stool ${r.metrics.stool}`:""
    ].filter(Boolean).join(" · ");
  }

  outputSOAPText(){
    const p=this.patient;
    const r=this.record;
    const age=deriveAge(p,r.date);
    const lines=[];

    // S — birth background + today's quick facts + shift summary
    lines.push("[S]");

    const birthFacts=[
      p.birthDate?formatDate(p.birthDate):"",
      p.gaWeeks!==""?`GA ${p.gaWeeks}+${p.gaDays||0}`:"",
      p.birthWeightG?`BBW ${p.birthWeightG} g`:"",
      formatDelivery(p),
      formatApgar(p)
    ].filter(Boolean);

    if(birthFacts.length)lines.push(birthFacts.join(" · "));
    lines.push(this.quickFactsText(r,age));

    if(r.summary?.trim())lines.push(r.summary.trim());

    // O — current support + systems
    lines.push("","[O]");

    const pushSection=(label,value)=>{
      const text=value?.trim();
      if(!text)return;

      const indented=text
        .split("\n")
        .map(line=>`   ${line}`)
        .join("\n");

      lines.push("",`# ${label}`,indented);
    };

    pushSection("Vent",r.vent);
    pushSection("Line",r.line);
    pushSection("Fluids",r.fluids);

    SYSTEMS.forEach(([key,label])=>{
      pushSection(label,r.systems?.[key]);
    });

    // A — Assessment
    lines.push("","[A]");
    if(r.assessment?.trim())lines.push(r.assessment.trim());

    // P — Plan
    lines.push("","[P]");
    if(r.plan?.trim())lines.push(r.plan.trim());

    return cleanOutput(lines);
  }

  outputDutyNoteText(){
    const p=this.patient;
    const r=this.record;
    const age=deriveAge(p,r.date);
    const lines=[];

    // S
    lines.push("[S]");

    const birthFacts=[
      p.birthDate?formatDate(p.birthDate):"",
      p.gaWeeks!==""?`GA ${p.gaWeeks}+${p.gaDays||0}`:"",
      p.birthWeightG?`BBW ${p.birthWeightG} g`:"",
      formatDelivery(p),
      formatApgar(p)
    ].filter(Boolean);

    if(birthFacts.length){
      lines.push(birthFacts.join(" · "));
    }

    lines.push(this.quickFactsText(r,age));

    if(r.summary?.trim()){
      lines.push(r.summary.trim());
    }

    // A
    if(r.assessment?.trim()){
      lines.push("","[A]",r.assessment.trim());
    }

    // P
    if(r.plan?.trim()){
      lines.push("","[P]",r.plan.trim());
    }

    return cleanOutput(lines);
  }

  outputChangesText(){
    const r=this.record, prev=this.previousRecord;
    const head=[this.patient.bed,this.patient.name,this.patient.mrn].filter(Boolean).join(" · ");
    const lines=[head,`[今日變更 · ${formatDate(r.date)}]`].filter(Boolean);
    if(!prev){
      lines.push("無前一日紀錄可比較。",this.quickFactsText());
      return cleanOutput(lines);
    }

    const add=(label,path,formatter=v=>String(v??"").trim())=>{
      const cur=getPath(r,path),old=getPath(prev,path);
      if(normalizeComparable(cur)===normalizeComparable(old))return;
      const a=formatter(old)||"∅", b=formatter(cur)||"∅";
      lines.push(`${label}: ${a} → ${b}`);
    };

    add("BW","metrics.weightG",v=>v!==""&&v!=null?`${v} g`:"");
    add("I/O","metrics.io");
    add("UO","metrics.urineOutput");
    add("kcal","metrics.kcal");
    add("Stool","metrics.stool");
    add("Summary","summary");
    add("Vent","vent");
    add("Line","line");
    add("Fluids","fluids");
    SYSTEMS.forEach(([key,label])=>add(label,`systems.${key}`));
    add("Assessment","assessment");
    add("Plan","plan");

    if(lines.length<3)lines.push("與前一日相比無內容變更。");
    return cleanOutput(lines);
  }

}

function metric(label,path,suffix=""){
  return `
    <label class="hf-metric">
      <span>${label}</span>
      <div>
        <input type="text" data-field="${path}">
        ${suffix?`<small>${suffix}</small>`:""}
      </div>
    </label>`;
}

function supportRow(label,path,placeholder){
  return `
    <label class="hf-support-row">
      <span>${label}</span>
      <textarea rows="1" data-field="${path}"
        placeholder="${escapeAttr(placeholder)}"></textarea>
    </label>`;
}

function dialogField(label,path,type="text",extra=""){
  return `
    <label>
      <span>${label}</span>
      <input type="${type}" data-field="${path}" ${extra}>
    </label>`;
}

function blankPatient(){
  return {
    id:uid("pt"),
    status:"active",
    dischargedAt:"",
    bed:"",
    mrn:"",
    name:"",
    team:"",
    birthDate:"",
    gaWeeks:"",
    gaDays:"",
    birthWeightG:"",
    deliveryMode:"",
    deliveryReason:"",
    apgar1:"",
    apgar5:"",
    momBackground:"",
    nbBackground:"",
    alert:"",
    createdAt:nowISO(),
    updatedAt:nowISO()
  };
}

function normalizePatient(x={}){
  const p={...blankPatient(),...clone(x),id:x.id||uid("pt")};

  if(!["active","discharged"].includes(p.status))
    p.status=p.dischargedAt?"discharged":"active";

  if(!p.momBackground&&x.maternalHistory)
    p.momBackground=x.maternalHistory;

  if(!p.nbBackground)
    p.nbBackground=[x.birthCourse,x.background].filter(Boolean).join("\n");

  if(!p.team&&x.attending)p.team=x.attending;

  return p;
}

function blankRecord(patient,date,previous){
  const prev=previous?normalizeRecord(previous):null;

  // All daily fields carry forward.
  return {
    id:recordId(patient.id,date),
    patientId:patient.id,
    date,
    status:"draft",
    revision:1,
    patientSnapshot:clone(patient),

    // Daily numeric metrics do NOT carry forward.
    metrics:{
      weightG:"",
      io:"",
      urineOutput:"",
      kcal:"",
      stool:""
    },

    summary:prev?.summary??"",
    vent:prev?.vent??"",
    line:prev?.line??"",
    fluids:prev?.fluids??"",

    systems:Object.fromEntries(
      SYSTEMS.map(([key])=>[key,prev?.systems?.[key]??""])
    ),

    assessment:prev?.assessment??"",
    plan:prev?.plan??"",

    createdAt:nowISO(),
    updatedAt:nowISO(),
    finalizedAt:""
  };
}

function normalizeRecord(x={}){
  const oldSupport=x.lineSupport||x.support||{};
  const oldMetrics=x.metrics||{};

  const systems={};
  SYSTEMS.forEach(([key])=>{
    const old=x.systems?.[key];
    systems[key]=typeof old==="string"?old:(old?.progress||"");
  });
  if(!systems.other&&x.systems?.general?.progress)
    systems.other=x.systems.general.progress;

  return {
    id:x.id||recordId(x.patientId||"unknown",x.date||todayISO()),
    patientId:x.patientId||"",
    date:x.date||todayISO(),
    status:x.status||"draft",
    revision:Number(x.revision)||1,
    patientSnapshot:normalizePatient(x.patientSnapshot||{}),

    metrics:{
      weightG:oldMetrics.weightG??"",
      io:oldMetrics.io??oldMetrics.ioBalance??"",
      urineOutput:oldMetrics.urineOutput??"",
      kcal:oldMetrics.kcal??oldMetrics.kcalKgDay??"",
      stool:oldMetrics.stool??oldMetrics.stoolCount??""
    },

    summary:x.summary??x.todaySummary??x.todayData??"",
    vent:x.vent??oldSupport.ventSettings??
      [oldSupport.ventMode,oldSupport.respiratory,oldSupport.fio2].filter(Boolean).join(" "),
    line:x.line??oldSupport.lines??oldSupport.tubes??"",
    fluids:x.fluids??oldSupport.fluids??legacyFluidText(oldSupport),

    systems,
    assessment:x.assessment??"",
    plan:x.plan??legacyPlan(x),

    createdAt:x.createdAt||nowISO(),
    updatedAt:x.updatedAt||nowISO(),
    finalizedAt:x.finalizedAt||""
  };
}

function legacyFluidText(s={}){
  const p=[];
  if(s.feeding)p.push(`Diet: ${s.feeding}`);
  if(s.tpn)p.push(`TPN: ${s.tpn}`);
  if(s.lipid)p.push(`Lipid: ${s.lipid}`);
  if(s.totalFluid)p.push(`TDF: ${s.totalFluid}`);
  if(s.drips)p.push(s.drips);
  return p.join("\n");
}

function legacyPlan(x={}){
  const p=[];
  if(typeof x.todo==="string"&&x.todo.trim())p.push(x.todo.trim());
  if(typeof x.watch==="string"&&x.watch.trim())p.push(`Watch: ${x.watch.trim()}`);
  return p.join("\n");
}

function deriveAge(p,date){
  if(!p?.birthDate)return {dol:null,ageLabel:""};

  const d0=parseDate(p.birthDate),d1=parseDate(date);
  if(!d0||!d1)return {dol:null,ageLabel:""};

  const diff=Math.floor((d1-d0)/86400000);
  const dol=diff>=0?diff+1:null;

  if(p.gaWeeks===""||p.gaWeeks==null||diff<0)
    return {dol,ageLabel:""};

  const total=(Number(p.gaWeeks)||0)*7+(Number(p.gaDays)||0)+diff;
  const w=Math.floor(total/7),d=((total%7)+7)%7;

  if(total<280)return {dol,ageLabel:`PMA ${w}+${d}`};

  const ca=total-280;
  return {
    dol,
    ageLabel:`CA ${Math.floor(ca/7)}w${ca%7}d`
  };
}

function formatDelivery(p){
  const m=p.deliveryMode?.trim(),r=p.deliveryReason?.trim();
  if(!m&&!r)return "";
  return m&&r?`${m} (${r})`:(m||r);
}

function formatApgar(p){
  const a1=String(p.apgar1??"").trim();
  const a5=String(p.apgar5??"").trim();
  if(!a1&&!a5)return "";
  return `A/S ${a1||"?"} > ${a5||"?"}`;
}

function buildPatientText(p){
  return [
    p.bed,p.mrn,p.name,p.team,p.birthDate,p.gaWeeks,p.gaDays,
    p.birthWeightG,p.deliveryMode,p.deliveryReason,p.apgar1,p.apgar5,
    p.momBackground,p.nbBackground,p.alert
  ].filter(v=>v!==""&&v!=null).join(" ");
}

function recordText(r){
  return [
    r.date,...Object.values(r.metrics||{}),r.summary,r.vent,r.line,r.fluids,
    ...SYSTEMS.map(([key])=>r.systems?.[key]||""),
    r.assessment,r.plan
  ].filter(v=>v!==""&&v!=null).join(" ");
}

function buildSearchText(patient,records=[]){
  return normalizeSearch([
    buildPatientText(patient),
    ...records.map(recordText)
  ].join(" "));
}

function normalizeSearch(v){
  return String(v??"").toLowerCase().replace(/\s+/g," ").trim();
}

function trimAroundMatch(raw,q){
  const text=String(raw??"").replace(/\s+/g," ").trim();
  if(!text)return "";
  const idx=text.toLowerCase().indexOf(q.toLowerCase());
  if(idx<0)return text.slice(0,72);
  const start=Math.max(0,idx-24),end=Math.min(text.length,idx+q.length+42);
  return `${start>0?"…":""}${text.slice(start,end)}${end<text.length?"…":""}`;
}

function normalizeComparable(v){
  if(v==null)return "";
  if(typeof v==="object")return JSON.stringify(v);
  return String(v).replace(/\s+/g," ").trim();
}
function formatDiffValue(v){
  if(v==null)return "";
  if(typeof v==="object")return JSON.stringify(v);
  return trimOneLine(String(v));
}
function trimOneLine(s){return String(s??"").replace(/\s+/g," ").trim().slice(0,100);}
function cleanOutput(lines){return lines.filter((x,i,a)=>!(x===""&&a[i-1]==="")).join("\n").replace(/\n{3,}/g,"\n\n").trim()+"\n";}

function recordId(pid,date){return `${pid}::${date}`;}

function latestBefore(list,date){
  return list.filter(r=>r.date<date).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
}

function patientLabel(p){
  return [p.bed,p.name,p.mrn].filter(Boolean).join(" · ")||"未命名病人";
}

function sortPatients(a,b){
  if(a.status==="discharged"&&b.status!=="discharged")return 1;
  if(a.status!=="discharged"&&b.status==="discharged")return -1;
  if(a.status==="discharged"&&b.status==="discharged")return sortDischarged(a,b);

  const aBed=String(a.bed||"").trim();
  const bBed=String(b.bed||"").trim();

  if(!aBed&&bBed)return 1;
  if(aBed&&!bBed)return -1;

  return aBed.localeCompare(bBed,"zh-Hant",{numeric:true})
    ||String(a.mrn||"").localeCompare(String(b.mrn||""),"zh-Hant",{numeric:true});
}

function sortDischarged(a,b){
  const ad=a.dischargedAt||"",bd=b.dischargedAt||"";
  if(ad!==bd)return bd.localeCompare(ad);
  return String(a.bed||"").localeCompare(String(b.bed||""),"zh-Hant",{numeric:true});
}

async function openDb(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);

    r.onupgradeneeded=()=>{
      const db=r.result;

      if(!db.objectStoreNames.contains("patients"))
        db.createObjectStore("patients",{keyPath:"id"});

      if(!db.objectStoreNames.contains("dailyRecords")){
        const s=db.createObjectStore("dailyRecords",{keyPath:"id"});
        s.createIndex("patientId","patientId",{unique:false});
        s.createIndex("date","date",{unique:false});
      }else{
        const s=r.transaction.objectStore("dailyRecords");
        if(!s.indexNames.contains("patientId"))
          s.createIndex("patientId","patientId",{unique:false});
        if(!s.indexNames.contains("date"))
          s.createIndex("date","date",{unique:false});
      }

      if(!db.objectStoreNames.contains("revisions")){
        const s=db.createObjectStore("revisions",{keyPath:"id"});
        s.createIndex("recordId","recordId",{unique:false});
      }

      if(!db.objectStoreNames.contains("settings"))
        db.createObjectStore("settings",{keyPath:"key"});
    };

    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  });
}

function tx(db,s,m="readonly"){return db.transaction(s,m).objectStore(s);}
function req(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
function get(db,s,k){return req(tx(db,s).get(k));}
function getAll(db,s){return req(tx(db,s).getAll());}
function put(db,s,v){return req(tx(db,s,"readwrite").put(v));}
function clearStore(db,s){return req(tx(db,s,"readwrite").clear());}
function del(db,s,k){return req(tx(db,s,"readwrite").delete(k));}
async function deleteDailyRecordData(db,recordIdValue){
  const revisions=await getByIndex(db,"revisions","recordId",recordIdValue);
  for(const r of revisions)await del(db,"revisions",r.id);
  await del(db,"dailyRecords",recordIdValue);
}

async function deletePatientData(db,patientId){
  const records=await getByIndex(db,"dailyRecords","patientId",patientId);
  const recordIds=new Set(records.map(r=>r.id));
  const revisions=await getAll(db,"revisions");
  for(const r of revisions.filter(r=>r.patientId===patientId||recordIds.has(r.recordId)))
    await del(db,"revisions",r.id);
  for(const r of records)await del(db,"dailyRecords",r.id);
  await del(db,"patients",patientId);
  await del(db,"settings",`lastDate:${patientId}`);
  if((await getSetting(db,"currentPatientId"))===patientId)
    await del(db,"settings","currentPatientId");
}
function getByIndex(db,s,i,k){return req(tx(db,s).index(i).getAll(IDBKeyRange.only(k)));}
async function getSetting(db,k){return (await get(db,"settings",k))?.value;}
function setSetting(db,k,v){return put(db,"settings",{key:k,value:v});}

function getPath(o,p){return p.split(".").reduce((a,k)=>a?.[k],o);}
function setPath(o,p,v){
  const a=p.split(".");
  let x=o;
  a.slice(0,-1).forEach(k=>{if(!x[k]||typeof x[k]!=="object")x[k]={};x=x[k];});
  x[a.at(-1)]=v;
}
function setControl(el,v){el.value=v==null?"":String(v);}
function readControl(el){return el.type==="number"?(el.value===""?"":Number(el.value)):el.value;}
function autoResize(el){
  if(!el||el.tagName!=="TEXTAREA")return;
  el.style.height="auto";
  el.style.height=`${Math.max(el.scrollHeight,38)}px`;
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function uid(p="id"){return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;}
function nowISO(){return new Date().toISOString();}
function todayISO(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function addDays(s,n){
  const d=parseDate(s)||new Date();
  d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseDate(s){
  if(!s)return null;
  const [y,m,d]=s.split("-").map(Number);
  if(!y||!m||!d)return null;
  return new Date(y,m-1,d);
}
function formatDate(s){
  const d=parseDate(s);
  return d?`${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`:(s||"");
}
function timeHHMM(){
  const d=new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function formatDateTime(s){
  if(!s)return "";
  const d=new Date(s);
  if(Number.isNaN(+d))return "";
  return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function escapeHTML(v){
  return String(v??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function escapeAttr(v){return escapeHTML(v).replace(/\n/g,"&#10;");}
async function copyText(t){
  try{return await navigator.clipboard.writeText(t);}
  catch{
    const x=document.createElement("textarea");
    x.value=t;document.body.appendChild(x);x.select();
    document.execCommand("copy");x.remove();
  }
}

const STYLES=`
[data-tool="handoff"]{
  --bg:#f4eee6;
  --panel:#fff;
  --soft:#faf8f5;
  --ink:#242220;
  --muted:#77716a;
  --line:#ddd7cf;
  --line2:#ebe6df;
  --accent:#4b4743;
  --active:#efe9e1;

  --font-ui:
    Arial,
    "Microsoft JhengHei",
    "Noto Sans TC",
    sans-serif;

  --font-clinical:
    "Cascadia Mono",
    "Consolas",
    "Courier New",
    monospace;

  font-family:var(--font-ui);
  color:var(--ink);
  background:var(--bg);
  min-height:760px;
  border-radius:8px;
  overflow:hidden;
}

[data-tool="handoff"] *{
  box-sizing:border-box;
}

[data-tool="handoff"] button{
  font-family:var(--font-ui);
}

/* =========================
   APP LAYOUT
========================= */

.hf-shell{
  display:grid;
  grid-template-columns:220px minmax(0,1fr);
  min-height:760px;
}

/* =========================
   APP HEADER
========================= */

.hf-app-header{
  height:52px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 22px;
  background:#333333;
  border-bottom:1px solid var(--line);
}

.hf-app-header h1{
  margin:0;
  font-size:18px;
  font-weight:700;
  letter-spacing:.04em;
  color:#fff;
}

/* =========================
   BACKUP MENU
========================= */

.hf-backup-wrap{
  position:relative;
}

.hf-header-more{
  width:36px;
  height:32px;
  border:1px solid #666;
  border-radius:6px;
  background:transparent;
  color:#fff;
  font-size:20px;
  line-height:1;
  cursor:pointer;
}

.hf-header-more:hover{
  background:#ffffff18;
}

.hf-backup-menu{
  position:absolute;
  right:0;
  top:38px;
  z-index:50;

  min-width:130px;
  padding:5px;

  background:#fff;
  border:1px solid var(--line);
  border-radius:7px;
  box-shadow:0 8px 24px #0003;
}

.hf-backup-menu button{
  display:block;
  width:100%;
  height:34px;

  border:0;
  border-radius:4px;

  background:#fff;
  color:var(--ink);

  text-align:left;
  padding:0 10px;

  cursor:pointer;
  font-size:12px;
}

.hf-backup-menu button:hover{
  background:#f3efe9;
}

/* =========================
   LEFT SIDEBAR
========================= */

.hf-left{
  display:flex;
  flex-direction:column;

  background:#f8f4ee;
  border-right:1px solid var(--line);

  min-width:0;
}

.hf-search-wrap{
  padding:14px 12px 12px;
  border-bottom:1px solid var(--line);
}

.hf-search{
  width:100%;
  height:38px;

  border:1px solid #cfc8bf;
  border-radius:6px;

  background:#fff;
  padding:0 10px;

  font-family:var(--font-ui);
  font-size:13px;
}

.hf-left-scroll{
  flex:1;
  overflow:auto;
  min-height:0;
}

.hf-new-patient{
  width:calc(100% - 24px);
  margin:10px 12px 4px;
  height:34px;

  border:1px solid var(--line);
  border-radius:6px;

  background:#fff;
  cursor:pointer;

  font-size:12px;
  font-weight:500;
}

.hf-new-patient:hover{
  background:#f3efe9;
}

.hf-patient-group + .hf-patient-group{
  border-top:1px solid var(--line);
}

.hf-group-title{
  padding:10px 12px 7px;

  font-family:var(--font-ui);
  font-size:11px;
  font-weight:700;

  color:var(--muted);
  letter-spacing:.08em;
}

.hf-patient-item{
  position:relative;
  display:grid;
  grid-template-columns:minmax(0,1fr) 30px;
  align-items:stretch;
}

.hf-patient-item:hover{background:#f1ece5}

.hf-patient-item.is-active{
  background:var(--active);
  box-shadow:inset 3px 0 0 var(--accent);
}

.hf-patient-row{
  width:100%;
  min-width:0;
  border:0;
  background:transparent;
  display:grid;
  grid-template-columns:58px minmax(0,1fr);
  gap:8px;
  align-items:center;
  text-align:left;
  padding:8px 4px 8px 12px;
  cursor:pointer;
  color:var(--ink);
}

.hf-patient-row:hover{background:transparent}

.hf-patient-menu-wrap{
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
}

.hf-patient-more{
  width:26px;
  height:28px;
  padding:0;
  border:0;
  border-radius:5px;
  background:transparent;
  color:#8a837c;
  font-size:17px;
  line-height:1;
  cursor:pointer;
}

.hf-patient-more:hover{
  background:#e8e1d8;
  color:var(--ink);
}

.hf-patient-menu{
  position:absolute;
  top:30px;
  right:4px;
  z-index:40;
  min-width:112px;
  padding:5px;
  background:#fff;
  border:1px solid var(--line);
  border-radius:7px;
  box-shadow:0 8px 24px #0002;
}

.hf-patient-menu[hidden]{display:none}

.hf-patient-menu button{
  display:block;
  width:100%;
  height:32px;
  padding:0 9px;
  border:0;
  border-radius:4px;
  background:#fff;
  color:var(--ink);
  text-align:left;
  font-size:11px;
  cursor:pointer;
}

.hf-patient-menu button:hover{background:#f3efe9}
.hf-patient-menu-divider{height:1px;margin:4px 2px;background:var(--line2)}
.hf-patient-menu .hf-danger-text{color:#9b4949}
.hf-patient-menu .hf-danger-text:hover{background:#fbefef}

.hf-bed{
  font-family:var(--font-clinical);
  font-size:13px;
  font-weight:700;
  font-variant-numeric:tabular-nums;
}

.hf-mrn{
  font-family:var(--font-clinical);
  font-size:12px;
  font-weight:400;
  font-variant-numeric:tabular-nums;
}

.hf-patient-row small{
  grid-column:1/-1;

  color:var(--muted);
  font-size:10px;

  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.hf-empty-list{
  padding:9px 12px 12px;
  color:#9a948d;
  font-size:11px;
}

/* =========================
   MAIN
========================= */

.hf-main{
  min-width:0;
  padding:18px 22px 34px;
}

.hf-header{
  margin-bottom:10px;
}

/* 第一列 */
.hf-toolbar-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  min-height:34px;
}

/* 第二列 */
.hf-identity-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;

  margin-top:12px;
  min-height:42px;

  padding:8px 12px;

  background:#faf8f5;
  border:1px solid var(--line);
  border-radius:7px;
}

/* Patient identity */
.hf-patient-title-btn{
  border:0;
  background:transparent;
  padding:0;

  min-width:0;
  cursor:pointer;

  text-align:left;
  color:var(--ink);

  font-family:var(--font-ui);
  font-size:16px;
  font-weight:500;
  line-height:1.35;
}

.hf-patient-title-btn strong{
  font-size:inherit;
  font-weight:700;
}

/* Status */
.hf-record-state{
  display:flex;
  align-items:center;
  gap:8px;

  margin-left:auto;
}

.hf-save-state{
  font-size:11px;
  font-weight:400;
  color:var(--muted);
}

.hf-record-badge{
  font-size:10px;
  font-weight:500;

  padding:3px 7px;
  border-radius:999px;

  background:#eee9e3;
  color:#6d6862;
}

/* =========================
   PATIENT HEADER
========================= */

.hf-patient-title-btn{
  border:0;
  background:transparent;
  padding:0;

  cursor:pointer;
  min-width:0;

  text-align:left;
  color:var(--ink);

  font-family:var(--font-ui);
  font-size:16px;
  font-weight:500;
  line-height:1.35;
}

.hf-patient-title-btn strong{
  font-family:var(--font-clinical);
  font-size:inherit;
  font-weight:700;
  font-variant-numeric:tabular-nums;
}

.hf-team{
  font-family:var(--font-ui);
  font-size:inherit;
  font-weight:600;
  color:#625d57;
}

.hf-dot-sep{
  display:inline-block;
  margin:0 7px;

  color:#aaa39b;
  font-weight:400;
}

/* =========================
   TOP ACTIONS
========================= */

.hf-actions{
  display:flex;
  gap:7px;
  flex-wrap:wrap;
  justify-content:flex-end;
}

.hf-actions > button,
.hf-dialog-actions button{
  height:34px;

  border:1px solid #cfc8bf;
  border-radius:6px;

  background:#fff;
  color:var(--ink);

  padding:0 11px;
  cursor:pointer;

  font-size:12px;
}

.hf-actions > button:hover,
.hf-dialog-actions button:hover{
  background:#f3efe9;
}

.hf-primary{
  background:var(--accent)!important;
  border-color:var(--accent)!important;
  color:#fff!important;
}

/* =========================
   COPY / SOAP / DUTY / WEEKLY
========================= */

.hf-output-group{
  display:flex;

  border:1px solid #bdb6ae;
  border-radius:7px;

  overflow:hidden;
  background:#fff;
}

.hf-output-group button{
  height:32px;
  padding:0 13px;

  border:0!important;
  border-right:1px solid #bdb6ae!important;
  border-radius:0!important;

  background:#fff!important;
  color:#5c5650!important;

  font-family:var(--font-ui);
  font-size:11px;
  font-weight:600;
  letter-spacing:.03em;

  cursor:pointer;
}

.hf-output-group button:last-child{
  border-right:0!important;
}

.hf-output-group button:hover{
  background:#eee9e2!important;
  color:#2f2b28!important;
}

/* =========================
   DATE NAVIGATION
========================= */


.hf-date-group{
  display:flex;
  align-items:stretch;

  height:34px;

  border:1px solid #bdb6ae;
  border-radius:7px;

  overflow:hidden;
  background:#fff;
}

.hf-date-group button{
  height:32px;

  border:0;
  border-right:1px solid #bdb6ae;
  border-radius:0;

  background:#fff;
  color:var(--ink);

  padding:0 11px;
  cursor:pointer;

  font-family:var(--font-ui);
  font-size:11px;
  font-weight:600;
}

.hf-date-group button:hover{
  background:#eee9e2;
}

.hf-date-group button:last-child{
  border-right:0;
}

.hf-date-group input[type="date"]{
  height:32px;

  border:0;
  border-right:1px solid #bdb6ae;
  border-radius:0;

  background:#fff;

  padding:0 9px;

  font-family:var(--font-clinical);
  font-size:12px;
  font-weight:500;
  font-variant-numeric:tabular-nums;

  color:var(--ink);
}

.hf-date-group input[type="date"]:focus{
  outline:none;
  background:#faf8f5;
}

.hf-date-group .hf-date-arrow{
  width:34px;
  padding:0;

  font-size:18px;
  font-weight:400;
}

/* =========================
   SAVE / DRAFT STATUS
========================= */

.hf-save-state{
  margin-left:auto;

  font-size:11px;
  font-weight:400;
  color:var(--muted);
}

.hf-record-badge{
  font-size:10px;
  font-weight:500;

  padding:3px 7px;
  border-radius:999px;

  background:#eee9e3;
  color:#6d6862;
}

.hf-record-badge.is-final{
  background:#e6efe8;
  color:#54675a;
}

/* =========================
   ALERT
========================= */

.hf-alert-strip{
  display:flex;
  align-items:flex-start;
  gap:8px;

  margin:-6px 0 10px;
  padding:8px 11px;

  border:1px solid #d8c8ae;
  border-radius:6px;

  background:#fbf6ed;
  color:#554b3f;

  font-size:12px;
  line-height:1.45;
}

.hf-alert-strip[hidden]{
  display:none;
}

.hf-alert-strip strong{
  display:inline-flex;
  align-items:center;
  justify-content:center;

  width:17px;
  height:17px;

  border-radius:50%;

  background:#88755c;
  color:#fff;

  font-size:11px;
  flex:0 0 auto;
}

/* =========================
   SECTIONS
========================= */

.hf-section{
  background:var(--panel);

  border:1px solid var(--line);
  border-radius:7px;

  margin-bottom:10px;
  overflow:hidden;
}

.hf-background{
  cursor:pointer;
}

.hf-section-heading{
  min-height:38px;

  display:flex;
  align-items:center;
  justify-content:space-between;

  gap:12px;
  padding:8px 12px;

  border-bottom:1px solid var(--line2);
  background:var(--soft);
}

.hf-section-heading h2{
  margin:0;

  font-family:var(--font-ui);
  font-size:13px;
  font-weight:700;

  letter-spacing:.06em;
}

.hf-section-heading span{
  font-family:var(--font-ui);
  font-size:11px;
  font-weight:400;
  color:var(--muted);
}

/* =========================
   BACKGROUND
========================= */

.hf-background-body{
  padding:12px;
}

.hf-bg-summary{
  font-family:var(--font-clinical);
  font-size:13px;
  font-weight:400;

  line-height:1.55;
  font-variant-numeric:tabular-nums;
}

.hf-bg-empty{
  color:#99928a;
  font-size:12px;
}

.hf-bg-text{
  display:grid;
  grid-template-columns:52px 1fr;
  gap:10px;

  margin-top:10px;

  font-size:13px;
}

.hf-bg-text b{
  font-family:var(--font-ui);
  color:#55504b;

  font-size:12px;
  font-weight:700;
}

.hf-bg-text pre{
  margin:0;
  white-space:pre-wrap;

  font-family:var(--font-clinical);
  font-size:13px;
  font-weight:400;

  line-height:1.55;
  tab-size:4;
}

/* =========================
   SHIFT METRICS
========================= */

.hf-metrics{
  display:flex;
  flex-wrap:wrap;

  border-bottom:1px solid var(--line2);
}

.hf-age-metrics{
  display:flex;
  align-self:stretch;
}

.hf-age-chip{
  display:flex;
  align-items:center;
  gap:7px;

  min-height:42px;
  padding:5px 12px;

  border-right:1px solid var(--line2);
  border-top:1px solid var(--line2);
  border-bottom:1px solid var(--line2);

  white-space:nowrap;
}

.hf-age-chip span{
  font-family:var(--font-ui);

  font-size:10px;
  font-weight:600;

  color:#6f6963;
}

.hf-age-chip strong{
  font-family:var(--font-clinical);

  font-size:12px;
  font-weight:600;

  color:var(--ink);
  font-variant-numeric:tabular-nums;
}

.hf-metric{
  display:grid;
  grid-template-columns:auto auto;

  align-items:center;
  gap:5px;

  min-height:42px;
  padding:5px 9px;

  border-right:1px solid var(--line2);
  border-top:1px solid var(--line2);
  border-bottom:1px solid var(--line2);
}

.hf-metric > span{
  font-family:var(--font-ui);

  font-size:10px;
  font-weight:600;

  color:#6f6963;
}

.hf-metric > div{
  display:flex;
  align-items:center;
  gap:3px;
}

.hf-metric input{
  width:62px;
  height:28px;

  border:0;
  border-bottom:1px solid #cbc4bb;

  background:transparent;

  padding:2px 4px;

  font-family:var(--font-clinical);
  font-size:13px;
  font-weight:500;

  font-variant-numeric:tabular-nums;
  text-align:center;
}

.hf-metric small{
  font-family:var(--font-ui);

  font-size:10px;
  color:var(--muted);
}

/* =========================
   CLINICAL TEXT
========================= */

.hf-summary,
.hf-large-text{
  display:block;

  width:100%;

  border:0;
  resize:none;

  background:#fff;

  padding:10px 12px;

  font-family:var(--font-clinical);
  font-size:14px;
  font-weight:400;

  line-height:1.55;
  letter-spacing:0;
  tab-size:4;

  min-height:74px;
}

.hf-support-grid{
  border-top:1px solid var(--line2);
}

.hf-support-row{
  display:grid;
  grid-template-columns:72px 1fr;

  min-height:38px;

  border-bottom:1px solid var(--line2);
}

.hf-support-row:last-child{
  border-bottom:0;
}

.hf-support-row > span{
  display:flex;
  align-items:center;
  justify-content:center;

  background:#fbf9f6;

  border-right:1px solid var(--line2);

  font-family:var(--font-ui);
  font-size:11px;
  font-weight:600;

  letter-spacing:.02em;
}

.hf-support-row textarea{
  width:100%;

  border:0;
  resize:none;

  background:#fff;

  padding:8px 10px;

  font-family:var(--font-clinical);
  font-size:14px;
  font-weight:400;

  line-height:1.55;
  letter-spacing:0;

  tab-size:4;

  min-height:38px;
}

/* =========================
   SYSTEMS
========================= */

.hf-system-row{
  display:grid;
  grid-template-columns:76px 1fr;

  border-bottom:1px solid var(--line2);
}

.hf-system-row:last-child{
  border-bottom:0;
}

.hf-system-row > span{
  display:flex;
  align-items:center;
  justify-content:center;

  padding:10px 7px;

  background:#fbf9f6;

  border-right:1px solid var(--line2);

  font-family:var(--font-ui);
  font-size:11px;
  font-weight:600;

  letter-spacing:.02em;
}

.hf-system-row textarea{
  width:100%;

  border:0;
  resize:none;

  background:#fff;

  padding:9px 11px;

  font-family:var(--font-clinical);
  font-size:14px;
  font-weight:400;

  line-height:1.55;
  letter-spacing:0;

  tab-size:4;

  min-height:54px;
}

/* =========================
   PLACEHOLDERS
========================= */

.hf textarea::placeholder{
  color:#b0aaa3;
  opacity:1;
  font-weight:400;
}

/* =========================
   FOCUS / DISABLED
========================= */

textarea:focus,
input:focus,
button:focus-visible{
  outline:2px solid #9f9890;
  outline-offset:-2px;
}

textarea:disabled,
input:disabled{
  color:#6f6963;
  background:#f7f5f2;
}

/* =========================
   DIALOG
========================= */

.hf-dialog{
  border:0;
  padding:0;

  border-radius:8px;

  box-shadow:0 20px 60px #0004;
}

.hf-dialog::backdrop{
  background:#0005;
}

.hf-dialog-card{
  width:min(460px,92vw);

  background:#faf8f5;
  padding:18px;
}

.hf-bg-dialog-card{
  width:min(780px,94vw);
}

.hf-dialog-card h3{
  margin:0 0 14px;
  font-size:17px;
}

.hf-dialog-card > label{
  display:grid;
  grid-template-columns:100px 1fr;

  gap:8px;
  align-items:center;

  margin:8px 0;
}

.hf-dialog-card input,
.hf-dialog-card textarea{
  width:100%;

  border:1px solid #cfc8bf;
  border-radius:5px;

  background:#fff;

  padding:7px 8px;

  font:inherit;
  font-size:13px;
}

.hf-bg-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px 14px;
}

.hf-bg-grid label{
  display:grid;
  grid-template-columns:92px 1fr;

  gap:8px;
  align-items:center;
}

.hf-bg-grid label span,
.hf-dialog-text span{
  font-size:12px;
  color:#5f5954;
}

.hf-dialog-text{
  display:block!important;
  margin-top:12px!important;
}

.hf-dialog-text span{
  display:block;
  margin-bottom:5px;
}

.hf-dialog-text textarea{
  font-family:var(--font-clinical);
  font-size:13px;
  line-height:1.55;
  tab-size:4;
}

.hf-dialog-actions{
  display:flex;
  justify-content:flex-end;

  gap:7px;
  margin-top:16px;
}

/* =========================
   WEEKLY DIALOG
========================= */

.hf-weekly-card{
  width:min(620px,92vw);
}

.hf-weekly-sub{
  margin:3px 0 0;

  color:var(--muted);

  font-size:12px;
  line-height:1.4;
}

.hf-weekly-presets{
  display:flex;
  gap:7px;

  margin:14px 0 10px;
}

.hf-weekly-presets button{
  height:32px;

  border:1px solid #cfc8bf;
  border-radius:6px;

  background:#fff;
  color:var(--ink);

  padding:0 11px;

  cursor:pointer;
}

.hf-weekly-presets button:hover{
  background:#f3efe9;
}

.hf-weekly-range{
  display:grid;
  grid-template-columns:1fr auto 1fr;

  gap:10px;
  align-items:end;

  padding:12px;

  border:1px solid var(--line);
  border-radius:7px;

  background:#fff;
}

.hf-weekly-range label{
  display:grid;
  gap:5px;
}

.hf-weekly-range label span{
  font-size:11px;
  font-weight:700;
  color:#5e5954;
}

.hf-weekly-range input{
  height:36px;

  border:1px solid #cfc8bf;
  border-radius:5px;

  background:#fff;

  padding:0 8px;

  font:inherit;
  font-size:12px;
}

.hf-weekly-arrow{
  padding-bottom:9px;
  color:var(--muted);
}

.hf-weekly-options{
  display:grid;
  gap:8px;

  margin-top:13px;
}

.hf-weekly-options label{
  display:flex!important;
  grid-template-columns:none!important;

  align-items:center!important;

  gap:8px!important;
  margin:0!important;

  font-size:12px;
  color:#4e4944;
}

.hf-weekly-options input{
  width:15px!important;
  height:15px!important;
  margin:0;
}

.hf-weekly-info{
  margin-top:13px;
  padding:9px 11px;

  border-radius:6px;

  background:#f3f0eb;
  color:#5f5953;

  font-size:12px;
}

/* =========================
   RESTORE DIALOG
========================= */

.hf-restore-card{
  width:min(560px,92vw);
}

.hf-restore-options{
  display:grid;
  gap:8px;

  margin-top:14px;
}

.hf-restore-options label{
  display:grid!important;
  grid-template-columns:20px 1fr!important;

  gap:9px!important;
  align-items:start!important;

  margin:0!important;
  padding:11px;

  border:1px solid var(--line);
  border-radius:7px;

  background:#fff;

  cursor:pointer;
}

.hf-restore-options input{
  width:15px!important;
  height:15px!important;

  margin:2px 0 0!important;
}

.hf-restore-options span{
  display:grid;
  gap:3px;
}

.hf-restore-options strong{
  font-size:13px;
}

.hf-restore-options small{
  font-size:11px;
  color:var(--muted);
  line-height:1.4;
}

/* =========================
   HISTORY
========================= */

.hf-history-card{
  width:min(680px,92vw);
  max-height:78vh;
  overflow:auto;
}

.hf-history-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:8px;
}

.hf-history-head h3{margin:0}

.hf-history-head button{
  border:1px solid var(--line);
  border-radius:5px;
  background:#fff;
  padding:6px 10px;
  cursor:pointer;
}

.hf-history-list{
  border:1px solid var(--line);
  border-radius:6px;
  overflow:visible;
}

.hf-history-entry{
  position:relative;
  display:grid;
  grid-template-columns:minmax(0,1fr) 42px;
  align-items:stretch;
  background:#fff;
  border-bottom:1px solid var(--line2);
}

.hf-history-entry:last-child{border-bottom:0}

.hf-history-entry:hover,
.hf-history-entry.is-current{
  background:#f5f1eb;
}

.hf-history-item{
  display:grid;
  grid-template-columns:78px 68px minmax(0,1fr);
  gap:10px;
  align-items:center;
  width:100%;
  padding:10px 10px;
  border:0;
  background:transparent;
  text-align:left;
  cursor:pointer;
}

.hf-history-item span{
  font-size:11px;
  color:#796f65;
}

.hf-history-item span.is-final{
  color:#526858;
  font-weight:700;
}

.hf-history-item small{
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  color:var(--muted);
}

.hf-history-menu-wrap{
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
}

.hf-history-more{
  width:30px;
  height:30px;
  padding:0;
  border:0!important;
  border-radius:5px!important;
  background:transparent!important;
  color:#8a837c;
  font-size:18px;
  line-height:1;
  cursor:pointer;
}

.hf-history-more:hover{
  background:#e8e1d8!important;
  color:var(--ink);
}

.hf-history-menu{
  position:absolute;
  top:34px;
  right:4px;
  z-index:60;
  min-width:130px;
  padding:5px;
  background:#fff;
  border:1px solid var(--line);
  border-radius:7px;
  box-shadow:0 8px 24px #0002;
}

.hf-history-menu[hidden]{display:none}

.hf-history-menu button{
  display:block;
  width:100%;
  min-height:34px;
  padding:0 10px;
  border:0;
  border-radius:4px;
  background:#fff;
  text-align:left;
  font-size:12px;
  cursor:pointer;
}

.hf-history-menu .hf-danger-text{color:#9b4949}
.hf-history-menu .hf-danger-text:hover{background:#fbefef}

/* =========================
   FINALIZED
========================= */

[data-tool="handoff"].is-finalized .hf-section{
  border-color:#d7ded8;
}

[data-tool="handoff"].is-finalized .hf-section-heading{
  background:#f3f6f3;
}

[data-tool="handoff"].is-finalized textarea:disabled,
[data-tool="handoff"].is-finalized input:disabled{
  background:#fbfcfb;
  color:#555;
}

/* =========================
   RESPONSIVE
========================= */

@media(max-width:900px){

  .hf-shell{
    grid-template-columns:180px minmax(0,1fr);
  }

  .hf-main{
    padding:14px;
  }

  .hf-header-row{
    align-items:flex-start;
    flex-direction:column;
  }

  .hf-actions{
    width:100%;
    justify-content:flex-start;
  }

  .hf-save-state{
    display:none;
  }

  .hf-bg-grid{
    grid-template-columns:1fr;
  }
}

@media(max-width:650px){

  .hf-weekly-range{
    grid-template-columns:1fr;
  }

  .hf-weekly-arrow{
    display:none;
  }

  .hf-shell{
    grid-template-columns:128px minmax(0,1fr);
  }

  .hf-search-wrap{
    padding:8px 6px;
  }

  .hf-search{
    font-size:11px;
    padding:0 6px;
  }

  .hf-group-title{
    padding-left:7px;
    padding-right:7px;
  }

  .hf-patient-item{grid-template-columns:minmax(0,1fr) 26px}
  .hf-patient-row{
    grid-template-columns:42px minmax(0,1fr);
    gap:5px;
    padding:7px 2px 7px 7px;
  }
  .hf-patient-more{width:23px}

  .hf-bed{
    font-size:12px;
  }

  .hf-mrn{
    font-size:10px;
  }

  .hf-new-patient{
    margin:7px 6px;
    width:calc(100% - 12px);

    font-size:11px;
  }

  .hf-main{
    padding:10px 8px 24px;
  }

  .hf-patient-title-btn{
    font-size:15px;
  }

  .hf-patient-title-btn strong{
    font-size:inherit;
  }

  .hf-dot-sep{
    margin:0 4px;
  }

  .hf-date-row{
    flex-wrap:wrap;
  }

  .hf-date-group{
    max-width:100%;
  }

  .hf-date-group input[type="date"]{
    min-width:0;
  }

  .hf-system-row,
  .hf-support-row{
    grid-template-columns:58px 1fr;
  }

  .hf-metric{
    padding:5px 7px;
  }

  .hf-metric input{
    width:50px;
  }
}
`;

export default {render,init,destroy};
