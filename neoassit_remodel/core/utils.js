// core/utils.js

/**
 * Evaluate a math expression safely.
 * - trims spaces
 * - removes trailing operator
 * - returns number (or 0 on error)
 *
 * Requires: mathjs is loaded globally as `math` (via CDN) OR you can replace with your own parser.
 */
export function parseExpression(expression) {
  const raw = String(expression ?? "");
  let exp = raw.replace(/\s+/g, "");
  exp = exp.replace(/[+\-*\/]$/, ""); // remove trailing operator

  if (!exp) return 0;

  try {
    // If you use mathjs via CDN:
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.0.0/math.min.js"></script>
    if (typeof math !== "undefined" && math?.evaluate) {
      return math.evaluate(exp);
    }

    // Fallback (very limited): only numbers
    const n = Number(exp);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

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
  if (!root) return;

  const key = opts.key || "mutual";
  const boundKey = `mutualBound_${key}`;
  if (root.dataset[boundKey] === "1") return;
  root.dataset[boundKey] = "1";

  const getA = () => Array.from(root.querySelectorAll(selectorA));
  const getB = () => Array.from(root.querySelectorAll(selectorB));

  const hasValue = (els) =>
    els.some(el => el && String(el.value ?? "").trim() !== "");

  const update = () => {
    const groupA = getA();
    const groupB = getB();

    const aHas = hasValue(groupA);
    const bHas = hasValue(groupB);

    groupA.forEach(el => { if (el) el.disabled = bHas; });
    groupB.forEach(el => { if (el) el.disabled = aHas; });
  };

  // Delegated listening point; group membership is re-queried each update.
  root.addEventListener("input", update);
  root.addEventListener("change", update);

  update();
}
