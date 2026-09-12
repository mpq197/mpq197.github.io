// tools/growthTrend.js
// NeoAssist - 身體測量趨勢
// X-axis uses Unix timestamps on a Chart.js linear scale: real elapsed-time spacing.

let growthTrendChart = null;

export function render() {
  return `
    <div class="card shadow-sm" data-tool="growthTrend">
      <div class="card-body">
        <style>
          [data-tool="growthTrend"] .gt-subtitle,.gt-note{color:#7b6a5e}
          [data-tool="growthTrend"] .gt-subtitle{font-size:.9rem}
          [data-tool="growthTrend"] .gt-note{font-size:.76rem;line-height:1.5}
          [data-tool="growthTrend"] .gt-input{min-height:260px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;line-height:1.55}
          [data-tool="growthTrend"] .gt-stat{height:100%;padding:.7rem .8rem;border:1px solid rgba(111,78,55,.14);border-radius:.75rem;background:rgba(111,78,55,.045)}
          [data-tool="growthTrend"] .gt-stat-value{font-size:1.08rem;font-weight:700;line-height:1.2}
          [data-tool="growthTrend"] .gt-stat-label{margin-top:.2rem;color:#7b6a5e;font-size:.72rem}
          [data-tool="growthTrend"] .gt-chart-wrap{position:relative;height:360px;min-height:300px}
          [data-tool="growthTrend"] .gt-table-wrap{max-height:280px;overflow:auto}
          [data-tool="growthTrend"] .gt-table th{position:sticky;top:0;z-index:1;background:var(--bs-body-bg,#fff);white-space:nowrap}
          [data-tool="growthTrend"] .gt-table td{white-space:nowrap}
          @media(max-width:767.98px){[data-tool="growthTrend"] .gt-chart-wrap{height:320px}}
        </style>

        <h5 class="card-title mb-1">身體測量趨勢</h5>
        <div class="gt-subtitle mb-3">貼上身體評估紀錄，自動擷取日期時間、體重、身高與頭圍。</div>

        <div class="row g-3">
          <div class="col-12 col-xl-5">
            <label class="form-label fw-semibold" for="gtRawText">身體評估原始文字</label>
            <textarea id="gtRawText" class="form-control gt-input"
              placeholder="將護理身體評估紀錄貼在這裡……" spellcheck="false"></textarea>
            <div class="d-flex flex-wrap gap-2 mt-2">
              <button type="button" class="btn btn-primary btn-sm" id="gtParseBtn">解析並繪圖</button>
              <button type="button" class="btn btn-outline-secondary btn-sm" id="gtClearBtn">清除</button>
            </div>
            <div class="gt-note mt-2">
              支援：體重 2170GM、2170 g、2.17 kg；身高 41.5CM；頭圍 30CM。
              只有實際記載測量值的時間點才建立資料點。
            </div>
          </div>

          <div class="col-12 col-xl-7">
            <div class="row g-2 mb-3">
              <div class="col-6 col-md-3"><div class="gt-stat"><div class="gt-stat-value" id="gtNPoints">0</div><div class="gt-stat-label">量測時間點</div></div></div>
              <div class="col-6 col-md-3"><div class="gt-stat"><div class="gt-stat-value" id="gtLastWt">—</div><div class="gt-stat-label">最新體重</div></div></div>
              <div class="col-6 col-md-3"><div class="gt-stat"><div class="gt-stat-value" id="gtLastHt">—</div><div class="gt-stat-label">最新身高</div></div></div>
              <div class="col-6 col-md-3"><div class="gt-stat"><div class="gt-stat-value" id="gtLastHC">—</div><div class="gt-stat-label">最新頭圍</div></div></div>
            </div>
            <div class="gt-chart-wrap"><canvas id="gtChart"></canvas></div>
            <div class="gt-note mt-2">
              X 軸使用實際 timestamp；相隔 1 天與相隔 7 天的水平距離會依 1:7 呈現。
            </div>
          </div>

          <div class="col-12">
            <div class="gt-table-wrap border rounded">
              <table class="table table-sm table-hover align-middle mb-0 gt-table">
                <thead><tr><th>日期時間</th><th>體重 (g)</th><th>身高 (cm)</th><th>頭圍 (cm)</th></tr></thead>
                <tbody id="gtTableBody"><tr><td colspan="4" class="text-center text-muted py-4">尚未解析資料</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

export function init(root) {
  const tool = root.querySelector('[data-tool="growthTrend"]');
  if (!tool) return;

  const $ = s => tool.querySelector(s);
  const rawText = $("#gtRawText");
  const canvas = $("#gtChart");

  function parseDateTime(s) {
    const m = String(s || "").match(/(20\d{2})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const d = new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function findMeasurement(block, labelPattern, unitPattern) {
    const re = new RegExp(`${labelPattern}\\s*[：:]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(${unitPattern})?`, "i");
    const m = block.match(re);
    return m ? { value:Number(m[1]), unit:String(m[2] || "").toLowerCase() } : null;
  }

  function parseText(text) {
    const source = String(text || "");
    const headerRe = /(20\d{2}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/g;
    const headers = [...source.matchAll(headerRe)];
    const rows = [];

    for (let i=0; i<headers.length; i++) {
      const dt = parseDateTime(headers[i][1]);
      if (!dt) continue;
      const start = headers[i].index + headers[i][0].length;
      const end = i+1 < headers.length ? headers[i+1].index : source.length;
      const block = source.slice(start,end);

      let wt = findMeasurement(block, "體重", "GM|G|KG");
      const ht = findMeasurement(block, "身高", "CM");
      const hc = findMeasurement(block, "(?:頭圍|頭部周長|頭周|頭部圍)", "CM");

      if (wt && wt.unit === "kg") wt.value *= 1000;

      if (wt || ht || hc) rows.push({
        dt, ts:dt.getTime(),
        weight:wt ? wt.value : null,
        height:ht ? ht.value : null,
        hc:hc ? hc.value : null
      });
    }
    return rows.sort((a,b)=>a.ts-b.ts);
  }

  function fmt(d) {
    const p=n=>String(n).padStart(2,"0");
    return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function tick(ms) {
    const d=new Date(Number(ms)), p=n=>String(n).padStart(2,"0");
    return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function latest(rows,key,unit) {
    const r=[...rows].reverse().find(x=>x[key]!=null);
    return r ? `${r[key]} ${unit}` : "—";
  }

  function render(rows) {
    $("#gtNPoints").textContent=String(rows.length);
    $("#gtLastWt").textContent=latest(rows,"weight","g");
    $("#gtLastHt").textContent=latest(rows,"height","cm");
    $("#gtLastHC").textContent=latest(rows,"hc","cm");

    $("#gtTableBody").innerHTML = rows.length
      ? rows.map(r=>`<tr><td>${fmt(r.dt)}</td><td>${r.weight??"—"}</td><td>${r.height??"—"}</td><td>${r.hc??"—"}</td></tr>`).join("")
      : `<tr><td colspan="4" class="text-center text-muted py-4">沒有找到體重、身高或頭圍資料</td></tr>`;

    if (growthTrendChart) {
      growthTrendChart.destroy();
      growthTrendChart=null;
    }
    if (!canvas || typeof window.Chart === "undefined") return;

    const defs=[
      {label:"體重 (g)",key:"weight",axis:"yWeight"},
      {label:"身高 (cm)",key:"height",axis:"yLength"},
      {label:"頭圍 (cm)",key:"hc",axis:"yLength"}
    ];

    growthTrendChart=new window.Chart(canvas,{
      type:"line",
      data:{datasets:defs.map(d=>({
        label:d.label,
        data:rows.filter(r=>r[d.key]!=null).map(r=>({x:r.ts,y:r[d.key]})),
        yAxisID:d.axis,tension:.15,spanGaps:true,pointRadius:4,pointHoverRadius:6,borderWidth:2
      }))},
      options:{
        responsive:true,maintainAspectRatio:false,parsing:false,normalized:true,
        interaction:{mode:"nearest",intersect:false},
        plugins:{tooltip:{callbacks:{title(items){return items?.length ? fmt(new Date(items[0].parsed.x)) : "";}}}},
        scales:{
          x:{
            type:"linear",
            title:{display:true,text:"實際日期／時間"},
            ticks:{callback:v=>tick(v),autoSkip:true,maxTicksLimit:8,maxRotation:45,minRotation:0}
          },
          yWeight:{type:"linear",position:"left",beginAtZero:false,title:{display:true,text:"體重 (g)"}},
          yLength:{type:"linear",position:"right",beginAtZero:false,title:{display:true,text:"身高／頭圍 (cm)"},grid:{drawOnChartArea:false}}
        }
      }
    });
  }

  const calculate=()=>render(parseText(rawText.value));

  $("#gtParseBtn")?.addEventListener("click",calculate);
  $("#gtClearBtn")?.addEventListener("click",()=>{
    rawText.value="";
    rawText.dispatchEvent(new Event("input",{bubbles:true}));
    render([]);
  });

  // Compatible with core/app.js TOOL_STATE_CACHE restore.
  tool.addEventListener("neo:restore",calculate);
  calculate();
}

