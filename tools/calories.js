// tools/calorie.js
// NeoAssist - NICU Calorie Calculator V1
import { createScheduler, safeEvalNumber } from "../core/utils.js";

const DEX_KCAL_G = 3.4, AA_KCAL_G = 4.0;
const ENTERAL = [
  {id:"pf16",label:"16% PF",kcal:null},{id:"preterm",label:"早產兒奶水",kcal:null},
  {id:"breast",label:"母乳",kcal:null},{id:"custom",label:"自訂",kcal:null}
];
const DEX = [
  {id:"d5",label:"D5W",pct:5},{id:"d10",label:"D10W",pct:10},{id:"d12_5",label:"D12.5W",pct:12.5},
  {id:"d15",label:"D15W",pct:15},{id:"d20",label:"D20W",pct:20},{id:"custom",label:"自訂 Dextrose %",pct:null}
];
const TPN = [
  {id:"aa5_d10",label:"AA 5.0% / D10",aa:5,dex:10},
  {id:"aa2_5_d10",label:"AA 2.5% / D10",aa:2.5,dex:10}
];

function num(v){const x=safeEvalNumber(String(v??""),{trimTrailingOperators:true});return Number.isFinite(x)?x:NaN;}
function f(x,d=2){return Number.isFinite(x)?Number(x.toFixed(d)).toString():"—";}
function e(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

export function render(){return `
<section class="neo-calorie" data-tool="calorie">
<style>
.neo-calorie{--b:rgba(91,68,51,.15);--soft:rgba(121,91,67,.06);--ink:#49382d;--muted:#81756d}
.neo-calorie .cc{border:1px solid var(--b);border-radius:18px;background:#fff;overflow:hidden}.neo-calorie .ch{padding:1.2rem 1.25rem .8rem}.neo-calorie .cb{padding:0 1.25rem 1.25rem}
.neo-calorie .ct{font-size:1.15rem;font-weight:700;color:var(--ink)}.neo-calorie .muted,.neo-calorie .lab{font-size:.78rem;color:var(--muted)}
.neo-calorie .sec{padding:1rem 0;border-top:1px solid var(--b)}.neo-calorie .st{font-size:.76rem;font-weight:700;letter-spacing:.06em;color:var(--muted)}
.neo-calorie .rowx{border:1px solid var(--b);border-radius:14px;padding:.8rem;margin-bottom:.65rem}.neo-calorie .topx{display:grid;grid-template-columns:minmax(150px,1.5fr) minmax(100px,.8fr) auto;gap:.6rem;align-items:end}
.neo-calorie .adv{display:grid;grid-template-columns:repeat(3,minmax(100px,1fr));gap:.6rem;margin-top:.7rem;padding-top:.7rem;border-top:1px dashed var(--b)}.neo-calorie .lab{margin-bottom:.2rem}
.neo-calorie .result{display:grid;grid-template-columns:1.3fr 1fr;gap:1rem;align-items:end;padding-top:1rem;border-top:1px solid var(--b)}.neo-calorie .big{font-size:2rem;line-height:1.05;font-weight:750;letter-spacing:-.04em;color:var(--ink)}.neo-calorie .unit{font-size:.9rem;font-weight:600;letter-spacing:0}
.neo-calorie .split{display:flex;flex-wrap:wrap;gap:.4rem 1rem;margin-top:.65rem;font-size:.8rem;color:var(--muted)}.neo-calorie .detail{padding:.8rem 1rem;border-radius:12px;background:var(--soft);font-size:.84rem;line-height:1.55;color:var(--ink)}.neo-calorie .db+.db{margin-top:.65rem;padding-top:.65rem;border-top:1px solid var(--b)}.neo-calorie .dn{font-weight:700}.neo-calorie .copy-item{cursor:pointer}.neo-calorie .invalid{font-size:.78rem;color:#9a5b45}
@media(max-width:700px){.neo-calorie .ch,.neo-calorie .cb{padding-left:.85rem;padding-right:.85rem}.neo-calorie .topx{grid-template-columns:1fr 1fr auto}.neo-calorie .kindwrap{grid-column:1/-1}.neo-calorie .adv{grid-template-columns:1fr 1fr}.neo-calorie .result{grid-template-columns:1fr}.neo-calorie .big{font-size:1.75rem}}
</style>
<div class="cc shadow-sm"><div class="ch"><div class="ct">熱量計算</div><div class="muted mt-1">NICU Calorie Calculator · 即時計算 · 可展開公式驗算</div></div><div class="cb">
<div class="sec"><div class="st mb-2">體重</div><div style="max-width:340px"><div class="input-group"><input id="calWeight" class="form-control" inputmode="decimal" autocomplete="off" placeholder="例如 1250"><span class="input-group-text">g</span></div><div id="calWeightKg" class="form-text">— kg</div></div></div>
<div class="sec"><div class="d-flex justify-content-between align-items-center gap-2 mb-2"><div class="st">攝入項目</div><button id="calAdd" type="button" class="btn btn-sm btn-outline-secondary">＋ 新增項目</button></div><div id="calRows"></div><div id="calInvalid" class="invalid"></div></div>
<div class="result"><div><div class="lab">CALORIC INTAKE</div><div class="big"><span id="calPerKg">—</span> <span class="unit">kcal/kg/day</span></div></div><div><div class="lab">TOTAL CALORIES</div><div class="fs-5 fw-semibold"><span id="calTotal">0</span> kcal/day</div></div></div><div id="calSplit" class="split"></div>
<div class="mt-3"><button class="btn btn-sm btn-link text-decoration-none px-0" type="button" data-bs-toggle="collapse" data-bs-target="#calDetails">▾ 查看計算過程</button><div class="collapse" id="calDetails"><div id="calDetail" class="detail mt-1"></div></div></div>
<div class="muted mt-3">請確認輸入值、單位與實際配方；本工具為臨床計算輔助。</div>
<div class="d-flex justify-content-between align-items-center gap-2 mt-3"><button id="calReset" type="button" class="btn btn-sm btn-outline-secondary">Reset</button><ul class="list-group list-group-flush mb-0"><li id="calCopy" class="list-group-item copy-item py-1 px-2" data-content="">複製結果</li></ul></div>
</div></div></section>`;}

function opts(sel="enteral"){return [["enteral","奶類 / Enteral"],["dextrose","Dextrose"],["tpn","TPN"],["lipid","Fat emulsion"],["custom","自訂 kcal/mL"],["zero","0 kcal fluid"]].map(([v,l])=>`<option value="${v}" ${v===sel?"selected":""}>${l}</option>`).join("");}
function row(kind="enteral"){
 const r=document.createElement("div");r.className="rowx";r.innerHTML=`<div class="topx"><div class="kindwrap"><div class="lab">品項</div><select class="form-select form-select-sm kind">${opts(kind)}</select></div><div><div class="lab">攝入量</div><div class="input-group input-group-sm"><input class="form-control vol" inputmode="decimal" placeholder="0"><span class="input-group-text">mL</span></div></div><button type="button" class="btn btn-sm btn-outline-secondary remove">×</button></div><div class="adv"></div>`;fields(r,kind);return r;
}
function fields(r,k){const b=r.querySelector(".adv");
 if(k==="enteral")b.innerHTML=`<div><div class="lab">奶類</div><select class="form-select form-select-sm ep">${ENTERAL.map(p=>`<option value="${p.id}">${e(p.label)}</option>`).join("")}</select></div><div><div class="lab">kcal/mL</div><input class="form-control form-control-sm kpm" inputmode="decimal" placeholder="請輸入"></div><div><div class="lab">備註</div><input class="form-control form-control-sm note" placeholder="選填"></div>`;
 else if(k==="dextrose")b.innerHTML=`<div><div class="lab">Dextrose</div><select class="form-select form-select-sm dp">${DEX.map(p=>`<option value="${p.id}">${e(p.label)}</option>`).join("")}</select></div><div><div class="lab">Dextrose %</div><input class="form-control form-control-sm dex" inputmode="decimal" value="5" readonly></div><div><div class="lab">備註</div><input class="form-control form-control-sm note" placeholder="例如 fentanyl"></div>`;
 else if(k==="tpn"){b.innerHTML=`<div><div class="lab">熱量來源</div><select class="form-select form-select-sm tm"><option value="direct">直接輸入 kcal</option><option value="preset">配方 Preset</option><option value="custom">自訂 AA / Dextrose</option></select></div><div class="tf" style="grid-column:span 2"></div>`;tpnFields(r,"direct");}
 else if(k==="lipid"||k==="custom")b.innerHTML=`<div><div class="lab">${k==="lipid"?"Fat emulsion":"名稱"}</div><input class="form-control form-control-sm note" placeholder="${k==="lipid"?"產品 / 濃度":"自訂項目"}"></div><div><div class="lab">kcal/mL</div><input class="form-control form-control-sm kpm" inputmode="decimal" placeholder="請輸入"></div>`;
 else b.innerHTML=`<div style="grid-column:1/-1"><div class="lab">名稱</div><input class="form-control form-control-sm note" placeholder="例如 N/S (Heparin)"></div>`;
}
function tpnFields(r,m){const b=r.querySelector(".tf");if(!b)return;
 if(m==="direct")b.innerHTML=`<div class="lab">TPN calories（此期間總 kcal）</div><div class="input-group input-group-sm"><input class="form-control tkcal" inputmode="decimal" placeholder="例如 31.4"><span class="input-group-text">kcal</span></div>`;
 else if(m==="preset")b.innerHTML=`<div class="lab">TPN 配方</div><select class="form-select form-select-sm tp">${TPN.map(p=>`<option value="${p.id}">${e(p.label)}</option>`).join("")}</select>`;
 else b.innerHTML=`<div class="row g-2"><div class="col-6"><div class="lab">Dextrose %</div><input class="form-control form-control-sm dex" inputmode="decimal" placeholder="10"></div><div class="col-6"><div class="lab">AA %</div><input class="form-control form-control-sm aa" inputmode="decimal" placeholder="3.3"></div></div>`;
}
function tpnCalc(v,dex,aa,label){if(!Number.isFinite(dex)||!Number.isFinite(aa)||dex<0||aa<0)return{valid:false,reason:"請輸入正確的 Dextrose % 與 AA %"};const dg=v*dex/100,ag=v*aa/100,dk=dg*DEX_KCAL_G,ak=ag*AA_KCAL_G,kcal=dk+ak;return{valid:true,cat:"parenteral",kcal,detail:`<div class="dn">${e(label)}</div><div>Volume: ${f(v)} mL</div><div>Dextrose: ${f(v)} × ${f(dex)} / 100 = ${f(dg,3)} g × 3.4 = <strong>${f(dk)} kcal</strong></div><div>Amino acids: ${f(v)} × ${f(aa)} / 100 = ${f(ag,3)} g × 4 = <strong>${f(ak)} kcal</strong></div><div>TPN total = <strong>${f(kcal)} kcal</strong></div>`};}
function calcRow(r){const k=r.querySelector(".kind")?.value,v=num(r.querySelector(".vol")?.value);if(!Number.isFinite(v))return null;if(v<0)return{valid:false,reason:"攝入量不可小於 0"};
 if(k==="enteral"){const p=ENTERAL.find(x=>x.id===r.querySelector(".ep")?.value),kpm=num(r.querySelector(".kpm")?.value);if(!Number.isFinite(kpm)||kpm<0)return{valid:false,reason:"奶類尚未輸入正確的 kcal/mL"};const name=r.querySelector(".note")?.value.trim()||p?.label||"Enteral",kcal=v*kpm;return{valid:true,cat:"enteral",kcal,detail:`<div class="dn">${e(name)}</div><div>${f(v)} mL × ${f(kpm,3)} kcal/mL = <strong>${f(kcal)} kcal</strong></div>`};}
 if(k==="dextrose"){const p=DEX.find(x=>x.id===r.querySelector(".dp")?.value),dex=num(r.querySelector(".dex")?.value);if(!Number.isFinite(dex)||dex<0)return{valid:false,reason:"尚未輸入正確的 Dextrose %"};const note=r.querySelector(".note")?.value.trim(),name=(p?.label||"Dextrose")+(note?` (${note})`:""),g=v*dex/100,kcal=g*DEX_KCAL_G;return{valid:true,cat:"parenteral",kcal,detail:`<div class="dn">${e(name)}</div><div>${f(v)} mL × ${f(dex)} / 100 = ${f(g,3)} g glucose</div><div>${f(g,3)} g × 3.4 kcal/g = <strong>${f(kcal)} kcal</strong></div>`};}
 if(k==="tpn"){const m=r.querySelector(".tm")?.value;if(m==="direct"){const kcal=num(r.querySelector(".tkcal")?.value);if(!Number.isFinite(kcal)||kcal<0)return{valid:false,reason:"尚未輸入正確的 TPN kcal"};return{valid:true,cat:"parenteral",kcal,detail:`<div class="dn">TPN</div><div>Volume: ${f(v)} mL</div><div>Hospital-provided calories = <strong>${f(kcal)} kcal</strong></div>`};}if(m==="preset"){const p=TPN.find(x=>x.id===r.querySelector(".tp")?.value);return p?tpnCalc(v,p.dex,p.aa,p.label):{valid:false,reason:"TPN preset 無效"};}return tpnCalc(v,num(r.querySelector(".dex")?.value),num(r.querySelector(".aa")?.value),"自訂 TPN");}
 if(k==="lipid"||k==="custom"){const kpm=num(r.querySelector(".kpm")?.value);if(!Number.isFinite(kpm)||kpm<0)return{valid:false,reason:"尚未輸入正確的 kcal/mL"};const name=r.querySelector(".note")?.value.trim()||(k==="lipid"?"Fat emulsion":"自訂項目"),kcal=v*kpm;return{valid:true,cat:"parenteral",kcal,detail:`<div class="dn">${e(name)}</div><div>${f(v)} mL × ${f(kpm,3)} kcal/mL = <strong>${f(kcal)} kcal</strong></div>`};}
 return{valid:true,cat:"parenteral",kcal:0,detail:`<div class="dn">${e(r.querySelector(".note")?.value.trim()||"0 kcal fluid")}</div><div>${f(v)} mL = <strong>0 kcal</strong></div>`};
}

export function init(root){const tool=root.querySelector('[data-tool="calorie"]');if(!tool)return;const rows=tool.querySelector("#calRows"),weight=tool.querySelector("#calWeight"),kgEl=tool.querySelector("#calWeightKg"),totalEl=tool.querySelector("#calTotal"),perEl=tool.querySelector("#calPerKg"),split=tool.querySelector("#calSplit"),detail=tool.querySelector("#calDetail"),invalid=tool.querySelector("#calInvalid"),copy=tool.querySelector("#calCopy");
 const schedule=createScheduler(calculate);
 function add(k="enteral"){const r=row(k);rows.appendChild(r);schedule();return r;}
 function calculate(){const wg=num(weight.value),kg=Number.isFinite(wg)&&wg>0?wg/1000:NaN;kgEl.textContent=Number.isFinite(kg)?`${f(kg,3)} kg`:"— kg";const good=[],bad=[];[...rows.querySelectorAll(".rowx")].forEach((r,i)=>{if(!r.querySelector(".vol")?.value.trim())return;const x=calcRow(r);if(x?.valid)good.push(x);else if(x)bad.push(`第 ${i+1} 項：${x.reason}`);});const total=good.reduce((s,x)=>s+x.kcal,0),ent=good.filter(x=>x.cat==="enteral").reduce((s,x)=>s+x.kcal,0),par=total-ent,pk=Number.isFinite(kg)?total/kg:NaN;totalEl.textContent=f(total,1);perEl.textContent=Number.isFinite(pk)?f(pk,1):"—";split.innerHTML=Number.isFinite(kg)?`<span>Enteral <strong>${f(ent/kg,1)}</strong> kcal/kg/day</span><span>Parenteral <strong>${f(par/kg,1)}</strong> kcal/kg/day</span>`:`<span>Enteral <strong>${f(ent,1)}</strong> kcal/day</span><span>Parenteral <strong>${f(par,1)}</strong> kcal/day</span>`;invalid.innerHTML=bad.map(x=>`<div>${e(x)}</div>`).join("");let blocks=[];if(Number.isFinite(kg))blocks.push(`<div class="db"><div class="dn">體重</div><div>${f(wg)} g ÷ 1000 = <strong>${f(kg,3)} kg</strong></div></div>`);good.forEach(x=>blocks.push(`<div class="db">${x.detail}</div>`));blocks.push(`<div class="db"><div class="dn">Total calories</div><div>${good.length?good.map(x=>f(x.kcal)).join(" + "):"0"} = <strong>${f(total)} kcal/day</strong></div></div>`);if(Number.isFinite(kg))blocks.push(`<div class="db"><div class="dn">Weight-adjusted calories</div><div>${f(total)} kcal ÷ ${f(kg,3)} kg = <strong>${f(pk,2)} kcal/kg/day</strong></div></div>`);detail.innerHTML=blocks.join("");copy.dataset.content=Number.isFinite(pk)?`熱量：${f(total,1)} kcal/day；${f(pk,1)} kcal/kg/day\nEnteral：${f(ent/kg,1)} kcal/kg/day\nParenteral：${f(par/kg,1)} kcal/kg/day`:`熱量：${f(total,1)} kcal/day`;}
 tool.addEventListener("input",schedule);tool.addEventListener("change",ev=>{const t=ev.target,r=t.closest(".rowx");if(t.matches(".kind")){fields(r,t.value);schedule();return;}if(t.matches(".ep")){const p=ENTERAL.find(x=>x.id===t.value),i=r.querySelector(".kpm");if(i)i.value=Number.isFinite(p?.kcal)?p.kcal:"";schedule();return;}if(t.matches(".dp")){const p=DEX.find(x=>x.id===t.value),i=r.querySelector(".dex");if(i){i.value=Number.isFinite(p?.pct)?p.pct:"";i.readOnly=Number.isFinite(p?.pct);}schedule();return;}if(t.matches(".tm")){tpnFields(r,t.value);schedule();return;}schedule();});
 tool.addEventListener("click",ev=>{const b=ev.target.closest(".remove");if(b){b.closest(".rowx")?.remove();schedule();}});tool.querySelector("#calAdd")?.addEventListener("click",()=>add("enteral").querySelector(".kind")?.focus());tool.querySelector("#calReset")?.addEventListener("click",()=>{weight.value="";rows.innerHTML="";add("enteral");add("tpn");add("lipid");calculate();});tool.addEventListener("neo:restore",calculate);add("enteral");add("tpn");add("lipid");calculate();
}
