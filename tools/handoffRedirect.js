// tools/handoffRedirect.js
// NeoAssist entry → standalone Handoff

export function render() {
  return `
    <div style="
      padding:32px;
      text-align:center;
      color:#777;
      font-size:13px;
    ">
      正在開啟交班單…
    </div>
  `;
}

export function init() {
  window.location.replace("./handoff/");
}

export function destroy() {}

export default {
  render,
  init,
  destroy
};
