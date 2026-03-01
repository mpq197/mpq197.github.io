// core/utils.js
// updated: 2026-02-28

/**
 * Decode HTML entities (e.g. &lt; -> <).
 */
export function decodeHTMLEntities(str) {
  const txt = document.createElement("textarea");
  txt.innerHTML = String(str ?? "");
  return txt.value;
}

/**
 * ✅ Copy binding (event delegation)
 * - Bind once per root (dataset.copyBound)
 * - Works for dynamically added .copy-item
 *
 * Copy behavior:
 * - prefers data-content if present, otherwise uses innerHTML
 * - converts <br> to \n
 * - strips HTML tags
 * - decodes HTML entities
 */
export function bindCopyItems(root) {
  if (!root) return;
  if (root.dataset.copyBound === "1") return;
  root.dataset.copyBound = "1";

  root.addEventListener("click", (e) => {
    const item = e.target?.closest?.(".copy-item");
    if (!item || !root.contains(item)) return;

    let content = item.dataset.content || item.innerHTML || "";

    content = content.replace(/<br\s*\/?>/gi, "\n"); // <br> -> newline
    content = content.replace(/<[^>]*>/g, "");       // remove tags
    content = decodeHTMLEntities(content);           // decode entities

    navigator.clipboard.writeText(content).catch(() => {});
  });
}

/**
 * ✅ rAF scheduler helper
 * - collapse multiple schedule() calls into one calc() per animation frame
 */
export function createScheduler(calcFn) {
  let rafId = 0;
  return function schedule() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      calcFn();
    });
  };
}

/**
 * ✅ Mutual disable (selector version, scoped, dynamic-safe)
 * - If any input in group A has value -> disable all in group B
 * - If any input in group B has value -> disable all in group A
 * - Binds once per root using dataset key
 *
 * @param {HTMLElement} root
 * @param {string} selectorA
 * @param {string} selectorB
 * @param {object} [opts]
 * @param {string} [opts.key]
 */

export function bindMutualDisableBySelector(root, selectorA, selectorB, opts = {}) {
  if (!root) return null;

  const key = opts.key || "mutual";
  const boundKey = `mutualBound_${key}`;
  if (root.dataset[boundKey] === "1") {
    // 已綁定：回傳既有 api（如果你願意存起來）
    return root[`__mutualApi_${key}`] || null;
  }
  root.dataset[boundKey] = "1";

  const getA = () => Array.from(root.querySelectorAll(selectorA));
  const getB = () => Array.from(root.querySelectorAll(selectorB));

  const hasValue = (els) => els.some(el => el && String(el.value ?? "").trim() !== "");

  const update = () => {
    const groupA = getA();
    const groupB = getB();
    const aHas = hasValue(groupA);
    const bHas = hasValue(groupB);
    groupA.forEach(el => { if (el) el.disabled = bHas; });
    groupB.forEach(el => { if (el) el.disabled = aHas; });
  };

  root.addEventListener("input", update);
  root.addEventListener("change", update);

  update();

  const api = { update };
  root[`__mutualApi_${key}`] = api;
  return api;
}


// core/utils.js  (or utils.js)


export function safeEvalNumber(expr, options = {}) {
  const {
    trimTrailingOperators = false,   // 是否啟用容錯
    maxLen = 200        // 長度上限
  } = options;

  let raw = (expr ?? "").toString().trim();
  if (!raw) return NaN;

  if (raw.length > maxLen) return NaN;

  if (!/^[0-9+\-*/().\s]+$/.test(raw)) return NaN;

  // 容錯：移除尾端多餘運算子
  if (trimTrailingOperators) {
    raw = raw.replace(/\s+/g, "");
    raw = raw.replace(/[+\-*/]+$/g, "");
    if (!raw) return NaN;
  }

  try {
    const tokens = tokenize(raw);
    const rpn = toRPN(tokens);
    return evalRPN(rpn);
  } catch {
    return NaN;
  }

  function tokenize(s0) {
    const s = s0.replace(/\s+/g, "");
    const out = [];
    let i = 0;

    const isDigit = c => c >= "0" && c <= "9";
    const isOp = c => c === "+" || c === "-" || c === "*" || c === "/";

    while (i < s.length) {
      const c = s[i];

      if (isDigit(c) || c === ".") {
        let j = i + 1;
        while (j < s.length && (isDigit(s[j]) || s[j] === ".")) j++;
        const numStr = s.slice(i, j);
        if (numStr === "." || numStr.split(".").length > 2) throw new Error("bad number");
        const num = Number(numStr);
        if (!Number.isFinite(num)) throw new Error("bad number");
        out.push({ type: "num", value: num });
        i = j;
        continue;
      }

      if (c === "(" || c === ")") {
        out.push({ type: "par", value: c });
        i++;
        continue;
      }

      if (isOp(c)) {
        const prev = out[out.length - 1];
        const unaryMinus =
          c === "-" &&
          (!prev || prev.type === "op" || (prev.type === "par" && prev.value === "("));
        out.push({ type: "op", value: unaryMinus ? "u-" : c });
        i++;
        continue;
      }

      throw new Error("invalid char");
    }
    return out;
  }

  function toRPN(tokens) {
    const out = [];
    const ops = [];
    const prec = op => (op === "u-" ? 3 : (op === "*" || op === "/") ? 2 : 1);
    const rightAssoc = op => op === "u-";

    for (const t of tokens) {
      if (t.type === "num") out.push(t);
      else if (t.type === "op") {
        while (ops.length) {
          const top = ops[ops.length - 1];
          if (top.type !== "op") break;
          const p1 = prec(t.value);
          const p2 = prec(top.value);
          if ((rightAssoc(t.value) && p1 < p2) || (!rightAssoc(t.value) && p1 <= p2)) {
            out.push(ops.pop());
          } else break;
        }
        ops.push(t);
      } else if (t.type === "par" && t.value === "(") {
        ops.push(t);
      } else if (t.type === "par" && t.value === ")") {
        while (ops.length && !(ops[ops.length - 1].type === "par" && ops[ops.length - 1].value === "(")) {
          out.push(ops.pop());
        }
        if (!ops.length) throw new Error("mismatch");
        ops.pop();
      }
    }

    while (ops.length) {
      const t = ops.pop();
      if (t.type === "par") throw new Error("mismatch");
      out.push(t);
    }

    return out;
  }

  function evalRPN(rpn) {
    const st = [];
    for (const t of rpn) {
      if (t.type === "num") {
        st.push(t.value);
      } else {
        if (t.value === "u-") {
          if (st.length < 1) throw new Error("stack");
          st.push(-st.pop());
        } else {
          if (st.length < 2) throw new Error("stack");
          const b = st.pop();
          const a = st.pop();
          let v;
          if (t.value === "+") v = a + b;
          else if (t.value === "-") v = a - b;
          else if (t.value === "*") v = a * b;
          else if (t.value === "/") v = a / b;
          if (!Number.isFinite(v)) throw new Error("bad result");
          st.push(v);
        }
      }
    }

    if (st.length !== 1) throw new Error("stack");
    return st[0];
  }
}