// tools/files.js
// updated: 2026-03-01

const DEBUG = false;
const TOOL_KEY = "files";

/* ===============================
   File registry (single source)
================================= */
const FILES = [
  {
    key: "hx",
    title: "病史詢問",
    path: "./files/病史詢問.pdf",
    type: "PDF",
    description: ""
  },
  {
    key: "bed",
    title: "控床交班",
    path: "./files/控床交班.pdf",
    type: "PDF",
    description: ""
  },
  {
    key: "external",
    title: "外接交班",
    path: "./files/外接交班.pdf",
    type: "PDF",
    description: ""
  }
];

/* ===============================
   Render
================================= */
export function render(){

  const fileCards = FILES.map(file => `
    <div class="col-12 col-md-4">
      <div class="border rounded-3 p-3 h-100">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <div class="fw-semibold">${file.title}</div>
          <span class="badge text-bg-light">${file.type}</span>
        </div>

        <div class="small text-muted mb-3">
          ${file.description || ""}
        </div>

        <div class="d-flex gap-2">
          <a class="btn btn-outline-secondary btn-sm flex-fill"
             href="${file.path}"
             download>
             下載
          </a>
        </div>
      </div>
    </div>
  `).join("");

  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <div class="card">
        <div class="card-header text-center">文件下載</div>

        <div class="card-body pb-2">
          <div class="row g-2" data-role="fileGrid">
            ${fileCards}
          </div>
        </div>

        <div class="card-footer text-muted small">
           共 ${FILES.length} 個文件
        </div>
      </div>
    </div>
  `;
}

/* ===============================
   Init
================================= */
export function init(root){
  const box = root.querySelector(`[data-tool="${TOOL_KEY}"]`);
  if (!box) return;

  if (box.dataset.bound === "1") return;
  box.dataset.bound = "1";

  if (DEBUG){
    console.groupCollapsed(`[${TOOL_KEY}] init`);
    console.log("files:", FILES);
    console.groupEnd();
  }
}