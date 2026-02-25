// tools/age.js
const TOOL_KEY = "age";
const DEBUG = false;

// 如果你之後要統一格式，這些可以抽到 utils
const msPerDay = 24 * 60 * 60 * 1000;

export function render(){
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card">
        <div class="card-header text-center">Age Calculator</div>

        <div class="card-body pb-0">
          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">GA</span>
            <input type="number" inputmode="numeric" data-role="gaW" class="form-control text-center" />
            <span class="input-group-text justify-content-center">weeks</span>
            <input type="number" inputmode="numeric" data-role="gaD" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;">days</span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">出生日期</span>
            <input type="date" data-role="birthday" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;"></span>
          </div>

          <div class="input-group">
            <span class="input-group-text justify-content-center" style="width: 15%;">關注日期</span>
            <input type="date" data-role="doi" class="form-control text-center" />
            <span class="input-group-text justify-content-center" style="width: 15%;"></span>
          </div>
        </div>

        <div class="card-footer">
          <div class="row">
            <div class="col-10">
              <div class="input-group flex-nowrap">
                <span class="input-group-text justify-content-center" style="width: 15%;">Day of life</span>
                <span class="input-group-text text-truncate flex-fill copy-item" data-role="dol"></span>
              </div>
              <div class="input-group flex-nowrap">
                <span class="input-group-text justify-content-center" style="width: 15%;">Age</span>
                <span class="input-group-text text-truncate flex-fill copy-item" data-role="age"></span>
              </div>
            </div>

            <div class="col-2" style="padding-left: 0%;">
              <div class="d-flex justify-content-center align-items-center h-100">
                <button type="button" class="btn btn-secondary" data-role="reset">Reset</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function init(root){
  const box = root.querySelector(`[data-tool="${TOOL_KEY}"]`);
  if (!box) return;

  // 防止重複綁定（熱切換 / 重複載入時）
  if (box.dataset.bound === "1") return;
  box.dataset.bound = "1";

  const gaW = box.querySelector(`[data-role="gaW"]`);
  const gaD = box.querySelector(`[data-role="gaD"]`);
  const birthday = box.querySelector(`[data-role="birthday"]`);
  const doi = box.querySelector(`[data-role="doi"]`);
  const dolOut = box.querySelector(`[data-role="dol"]`);
  const ageOut = box.querySelector(`[data-role="age"]`);
  const resetBtn = box.querySelector(`[data-role="reset"]`);

  // rAF 合併多次 input
  let rafId = 0;
  const scheduleCalc = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      calc();
    });
  };

  const log = (...args) => { if (DEBUG) console.log(`[${TOOL_KEY}]`, ...args); };

  // ---------- helpers ----------
  function parseDateYMD(value){
    // value: "YYYY-MM-DD" from <input type=date>
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    // 用 local date，避免 UTC shift 造成跨日
    return new Date(y, m - 1, d);
  }

  function diffDays(a, b){
    // 用中午對齊避免 DST/時區造成 +/-1 day 漂移（在台灣基本不會，但保險）
    const A = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12);
    const B = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12);
    return Math.round((B - A) / msPerDay);
  }

  function toWeeksDays(totalDays){
    return { w: Math.floor(totalDays / 7), d: totalDays % 7 };
  }

  function addDays(date, days){
    const x = new Date(date.getTime());
    x.setDate(x.getDate() + days);
    return x;
  }

  function diffMonthsDays(startDate, endDate){
    // 真實月齡：以日曆月份計
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth() + years * 12;
    let days = endDate.getDate() - startDate.getDate();

    if (days < 0) {
      months -= 1;
      const lastDayPrevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
      days = lastDayPrevMonth + days;
    }

    if (months < 0) return { months: 0, days: 0 };
    return { months, days };
  }

  function setToday(input){
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    input.value = `${yyyy}-${mm}-${dd}`;
  }

  // ---------- core calc ----------
  function calc(){
    const bday = parseDateYMD(birthday.value);
    const day = parseDateYMD(doi.value);

    // 清空策略：缺任一日期就清空輸出
    if (!bday || !day) {
      dolOut.textContent = "";
      ageOut.textContent = "";
      log("missing date(s)");
      return;
    }

    const dol = diffDays(bday, day);
    if (dol < 0) {
      dolOut.textContent = "關注日期不可早於出生日期";
      ageOut.textContent = "";
      log("doi earlier than birthday");
      return;
    }
    dolOut.textContent = `${dol} day${dol === 1 ? "" : "s"}`;

    // GA（允許空白→視為未提供）
    const wRaw = gaW.value;
    const dRaw = gaD.value;
    const w = wRaw === "" ? NaN : parseInt(wRaw, 10);
    const d = dRaw === "" ? NaN : parseInt(dRaw, 10);

    const hasGA = !(Number.isNaN(w) && Number.isNaN(d));
    if (!hasGA) {
      const { months, days } = diffMonthsDays(bday, day);
      ageOut.textContent = `Chronological age: ${months}m ${days}d`;
      log("no GA -> chronological only");
      return;
    }

    const gaWv = Number.isNaN(w) ? 0 : w;
    const gaDv = Number.isNaN(d) ? 0 : d;
    const gaTotalDays = gaWv * 7 + gaDv;

    const isPreterm = gaTotalDays < 37 * 7;
    const pmaDays = gaTotalDays + dol;

    if (isPreterm) {
      if (pmaDays < 40 * 7) {
        const { w: pw, d: pd } = toWeeksDays(pmaDays);
        ageOut.textContent = `PMA: ${pw}w ${pd}d`;
      } else {
        // corrected age from term (40w0d)
        const daysToTerm = 280 - gaTotalDays;
        const termDate = addDays(bday, daysToTerm);
        const { months, days } = diffMonthsDays(termDate, day);
        ageOut.textContent = `Corrected age (CA): ${months}m ${days}d`;
      }
    } else {
      const { months, days } = diffMonthsDays(bday, day);
      ageOut.textContent = `Chronological age: ${months}m ${days}d`;
    }

    log({ dol, gaTotalDays, pmaDays, isPreterm });
  }

  // ---------- events ----------
  box.addEventListener("input", scheduleCalc);
  box.addEventListener("change", scheduleCalc);

  resetBtn.addEventListener("click", () => {
    gaW.value = "";
    gaD.value = "";
    setToday(birthday);
    setToday(doi);
    dolOut.textContent = "";
    ageOut.textContent = "";
    scheduleCalc();
  });

  // init defaults（跟你原本 resetForm 行為一致）
  if (!birthday.value) setToday(birthday);
  if (!doi.value) setToday(doi);

  calc();
}
