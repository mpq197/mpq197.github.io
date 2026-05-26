// tools/heartEchoPlane.js
// NeoAssist - Neonatal heart arbitrary-plane anatomy viewer
// Clean MVP:
// - Left: interactive 3D heart + clipping plane + cap
// - Right: 2D-like section view showing ONLY the same clipping cap
// - No thin-slab logic
//
// Model path:
//   assets/models/heart-echo/normal_neonatal_heart.glb
//
// Required index.html importmap before ./core/app.js:
//
// <script type="importmap">
// {
//   "imports": {
//     "three": "https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js",
//     "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/"
//   }
// }
// </script>

const TOOL_KEY = "heartEchoPlane";
const MODEL_URL = "./assets/models/heart-echo/normal_neonatal_heart.glb";

const THREE_MODULE = "three";
const ORBIT_CONTROLS = "three/addons/controls/OrbitControls.js";
const GLTF_LOADER = "three/addons/loaders/GLTFLoader.js";

let instanceSeq = 0;

const PRESETS = {
  free: {
    label: "任意切面",
    note: "手動調整 X/Y/Z 角度與 offset。",
    normal: [0, 0, -1],
    offset: 0,
    camera: [0, 0.25, 3.2],
    target: [0, 0, 0],
  },
  subcostal4: {
    label: "Subcostal 4 chamber",
    note: "目標：RA / RV / LA / LV、AV valves、septum 的空間關係。",
    normal: [0.18, 0.18, -0.97],
    offset: 0,
    camera: [0.35, 1.05, 3.15],
    target: [0, 0, 0],
  },
  apical4: {
    label: "Apical 4 chamber",
    note: "目標：四腔、MV / TV、ventricular septum。",
    normal: [0.12, -0.25, -0.96],
    offset: 0,
    camera: [0.2, -0.85, 3.35],
    target: [0, 0, 0],
  },
  apical5: {
    label: "Apical 5 chamber",
    note: "目標：四腔 + LVOT / Ao outflow 的方向。",
    normal: [0.32, -0.18, -0.93],
    offset: 0.03,
    camera: [0.45, -0.75, 3.15],
    target: [0, 0, 0],
  },
  plax: {
    label: "Parasternal long axis",
    note: "目標：LV、LA、MV、AV、Ao、前方 RV wall。",
    normal: [0.72, 0.05, -0.69],
    offset: 0,
    camera: [2.4, 0.55, 2.1],
    target: [0, 0, 0],
  },
  psaxAo: {
    label: "PSAX: aortic valve level",
    note: "目標：Ao valve、RVOT / PA、RA / TV 的關係。",
    normal: [0.05, 0.92, -0.38],
    offset: 0.05,
    camera: [0.05, 2.95, 1.45],
    target: [0, 0, 0],
  },
  psaxPap: {
    label: "PSAX: papillary muscle level",
    note: "目標：LV 圓形切面、RV crescent、septal relation。",
    normal: [0.05, 0.92, -0.38],
    offset: -0.18,
    camera: [0.05, 2.95, 1.45],
    target: [0, 0, 0],
  },
};

const LABELS = [
  { text: "RA", zh: "右心房", pos: [-0.33, 0.12, 0.10] },
  { text: "RV", zh: "右心室", pos: [-0.32, -0.30, 0.04] },
  { text: "LA", zh: "左心房", pos: [0.32, 0.12, 0.05] },
  { text: "LV", zh: "左心室", pos: [0.34, -0.33, 0.00] },
  { text: "MV/TV", zh: "房室瓣", pos: [0.02, -0.04, 0.08] },
  { text: "Ao/PA", zh: "大血管", pos: [0.02, 0.45, 0.08] },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function render() {
  const uid = `${TOOL_KEY}-${++instanceSeq}`;

  return `
    <section class="container-fluid py-3" data-heart-plane-root="${uid}">
      <div class="card shadow-sm border-0">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
            <div>
              <h2 class="h4 mb-1">新生兒心臟 3D 任意切面 MVP</h2>
              <div class="text-muted small">
                左側：3D 心臟與切面平面。右側：同一切面的封口截面視角。
              </div>
            </div>
            <span class="badge text-bg-secondary">Education only</span>
          </div>

          <div class="alert alert-warning py-2 small mb-3">
            此工具為解剖教學示意，不可作為臨床診斷、病人判讀或治療決策依據。封口 cap 是視覺封口，不代表真實 solid volume。
          </div>

          <div class="heart-plane-main">
            <div class="heart-pane">
              <div class="heart-pane-title">3D 立體模型</div>
              <div class="heart-plane-viewer" data-heart-viewer>
                <div class="heart-plane-label-layer" data-label-layer></div>
                <div class="heart-plane-status" data-status>載入 3D 模型中...</div>
              </div>
            </div>

            <div class="heart-pane">
              <div class="heart-pane-title d-flex justify-content-between align-items-center gap-2">
                <span>2D 截面 cap</span>
                <span class="badge text-bg-light border">Single plane cap</span>
              </div>
              <div class="heart-plane-section" data-heart-section>
                <div class="heart-plane-section-hint" data-section-hint>載入後會顯示目前 plane 的封口截面</div>
              </div>
            </div>
          </div>

          <aside class="heart-plane-panel mt-3">
            <div class="row g-3">
              <div class="col-12 col-lg-3">
                <label class="form-label fw-bold">標準切面 preset</label>
                <div class="d-grid gap-2">
                  ${Object.entries(PRESETS).map(([key, preset]) => `
                    <button type="button" class="btn btn-outline-dark btn-sm text-start" data-preset="${escapeHtml(key)}">
                      ${escapeHtml(preset.label)}
                    </button>
                  `).join("")}
                </div>
              </div>

              <div class="col-12 col-lg-4">
                <div class="mb-3">
                  <div class="fw-bold" data-current-title>任意切面</div>
                  <div class="small text-muted" data-current-note>手動調整 X/Y/Z 角度與 offset。</div>
                </div>

                <label class="form-label fw-bold">Plane rotation</label>

                <label class="form-label small mb-0">X angle: <span data-x-value>0</span>°</label>
                <input class="form-range" type="range" min="-180" max="180" step="1" value="0" data-plane-x>

                <label class="form-label small mb-0">Y angle: <span data-y-value>0</span>°</label>
                <input class="form-range" type="range" min="-180" max="180" step="1" value="0" data-plane-y>

                <label class="form-label small mb-0">Z angle: <span data-z-value>0</span>°</label>
                <input class="form-range" type="range" min="-180" max="180" step="1" value="0" data-plane-z>

                <label class="form-label fw-bold mt-2">Plane offset: <span data-offset-value>0.00</span></label>
                <input class="form-range" type="range" min="-0.8" max="0.8" step="0.01" value="0" data-plane-offset>
              </div>

              <div class="col-12 col-lg-2">
                <label class="form-label fw-bold">右側截面</label>
                <label class="form-label small mb-0">Zoom: <span data-section-zoom-value>1.15</span></label>
                <input class="form-range" type="range" min="0.6" max="2.2" step="0.01" value="1.15" data-section-zoom>
              </div>

              <div class="col-12 col-lg-3">
                <div class="d-grid gap-2 mb-3">
                  <button type="button" class="btn btn-dark btn-sm" data-reset-camera>重置 3D 視角</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm" data-flip-plane>切換切面方向</button>
                </div>

                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" role="switch" id="${uid}-show-plane" data-show-plane checked>
                  <label class="form-check-label" for="${uid}-show-plane">左側顯示切面平面</label>
                </div>

                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" role="switch" id="${uid}-clip" data-enable-clip checked>
                  <label class="form-check-label" for="${uid}-clip">啟用 clipping</label>
                </div>

                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" role="switch" id="${uid}-cap" data-show-cap checked>
                  <label class="form-check-label" for="${uid}-cap">封口 cap</label>
                </div>

                <div class="form-check form-switch mb-3">
                  <input class="form-check-input" type="checkbox" role="switch" id="${uid}-labels" data-show-labels checked>
                  <label class="form-check-label" for="${uid}-labels">顯示粗略 anatomy labels</label>
                </div>

                <div class="small text-muted">
                  註：目前模型未把 RA/RV/LA/LV 分成獨立 mesh，因此 label 先用手動座標示意；切面 preset 仍需依實際教學視角微調。
                </div>
              </div>
            </div>

            <div class="small text-muted border-top pt-2 mt-3">
              <strong>模型來源：</strong>
              <em>Normal Neonatal Heart</em>，作者 E-learning UMCG，來源 Sketchfab。
              授權：
              <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">
                CC BY-NC-SA 4.0
              </a>。
              本工具僅作非商業醫學教育用途；此互動式展示為基於原模型之教學應用。
            </div>
          </aside>
        </div>
      </div>

      <style>
        [data-heart-plane-root] .heart-plane-main {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr);
          gap: 1rem;
        }

        [data-heart-plane-root] .heart-pane {
          border: 1px solid #dee2e6;
          border-radius: 18px;
          background: #faf9f8;
          padding: .75rem;
        }

        [data-heart-plane-root] .heart-pane-title {
          font-weight: 750;
          margin-bottom: .5rem;
        }

        [data-heart-plane-root] .heart-plane-viewer,
        [data-heart-plane-root] .heart-plane-section {
          min-height: 560px;
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          background:
            radial-gradient(circle at 50% 35%, rgba(255,255,255,.10), transparent 34%),
            linear-gradient(135deg, #000, #111);
          border: 1px solid rgba(255,255,255,.18);
        }

        [data-heart-plane-root] .heart-plane-viewer canvas,
        [data-heart-plane-root] .heart-plane-section canvas {
          display: block;
          width: 100%;
          height: 100%;
        }

        [data-heart-plane-root] .heart-plane-status {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          z-index: 4;
          border-radius: 12px;
          padding: 8px 10px;
          background: rgba(0,0,0,.72);
          color: #ddd;
          font-size: .875rem;
        }

        [data-heart-plane-root] .heart-plane-section-hint {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          z-index: 2;
          border-radius: 12px;
          padding: 8px 10px;
          background: rgba(0,0,0,.72);
          color: #ddd;
          font-size: .8rem;
          pointer-events: none;
        }

        [data-heart-plane-root] .heart-plane-panel {
          border: 1px solid #dee2e6;
          border-radius: 18px;
          background: #faf9f8;
          padding: 1rem;
        }

        [data-heart-plane-root] .heart-plane-label-layer {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
        }

        [data-heart-plane-root] .heart-label {
          position: absolute;
          transform: translate(-50%, -50%);
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(255,255,255,.9);
          border: 1px solid rgba(0,0,0,.18);
          color: #222;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,.16);
        }

        [data-heart-plane-root] .btn[data-preset].active {
          background: #212529;
          color: #fff;
          border-color: #212529;
        }

        @media (max-width: 992px) {
          [data-heart-plane-root] .heart-plane-main {
            grid-template-columns: 1fr;
          }

          [data-heart-plane-root] .heart-plane-viewer,
          [data-heart-plane-root] .heart-plane-section {
            min-height: 420px;
          }
        }
      </style>
    </section>
  `;
}

export async function init(root) {
  const mount = root.querySelector("[data-heart-viewer]");
  const sectionMount = root.querySelector("[data-heart-section]");

  if (!mount || !sectionMount || mount.dataset.ready === "1") return;
  mount.dataset.ready = "1";

  const status = root.querySelector("[data-status]");
  const sectionHint = root.querySelector("[data-section-hint]");
  const labelLayer = root.querySelector("[data-label-layer]");

  const titleEl = root.querySelector("[data-current-title]");
  const noteEl = root.querySelector("[data-current-note]");

  const xInput = root.querySelector("[data-plane-x]");
  const yInput = root.querySelector("[data-plane-y]");
  const zInput = root.querySelector("[data-plane-z]");
  const offsetInput = root.querySelector("[data-plane-offset]");
  const sectionZoomInput = root.querySelector("[data-section-zoom]");

  const xValue = root.querySelector("[data-x-value]");
  const yValue = root.querySelector("[data-y-value]");
  const zValue = root.querySelector("[data-z-value]");
  const offsetValue = root.querySelector("[data-offset-value]");
  const sectionZoomValue = root.querySelector("[data-section-zoom-value]");

  const showPlaneInput = root.querySelector("[data-show-plane]");
  const enableClipInput = root.querySelector("[data-enable-clip]");
  const showCapInput = root.querySelector("[data-show-cap]");
  const showLabelsInput = root.querySelector("[data-show-labels]");

  const THREE = await import(THREE_MODULE);
  const { OrbitControls } = await import(ORBIT_CONTROLS);
  const { GLTFLoader } = await import(GLTF_LOADER);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
  camera.position.set(...PRESETS.free.camera);

  const sectionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  sectionCamera.position.set(0, 0, 3);
  sectionCamera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClearStencil = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  mount.appendChild(renderer.domElement);

  const sectionRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true });
  sectionRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  sectionRenderer.localClippingEnabled = true;
  sectionRenderer.outputColorSpace = THREE.SRGBColorSpace;
  sectionRenderer.autoClearStencil = true;
  sectionRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  sectionRenderer.toneMappingExposure = 1.35;
  sectionMount.appendChild(sectionRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(...PRESETS.free.target);

  addLights();

  const heartGroup = new THREE.Group();
  scene.add(heartGroup);

  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

  const planeVisual = makePlaneVisual();
  scene.add(planeVisual);

  const capGroup = new THREE.Group();
  scene.add(capGroup);

  const capPlane = makeCapPlane();
  scene.add(capPlane);

  let modelRoot = null;
  let modelScale = 1;
  let currentPresetKey = "free";
  let flipSign = 1;
  let sectionDistance = 3.0;

  const labels = createLabels();

  loadModel();
  bindUi();
  resize();
  animate();

  async function loadModel() {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(MODEL_URL);

      modelRoot = gltf.scene;
      heartGroup.add(modelRoot);

      normalizeModel(modelRoot);
      applyModelMaterials(modelRoot);
      rebuildCap();

      controls.target.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
      controls.update();

      setStatus("3D 模型載入完成。左側可旋轉，右側顯示同一 plane 的封口截面。", true);
      if (sectionHint) {
        sectionHint.textContent = "右側顯示目前 clipping plane 的 cap。";
        window.setTimeout(() => {
          if (sectionHint) sectionHint.style.display = "none";
        }, 2600);
      }

      applyPreset("free");
    } catch (err) {
      console.error(err);
      setStatus(`模型載入失敗：請確認 ${MODEL_URL} 是否存在。`, false);
      if (sectionHint) sectionHint.textContent = "模型載入失敗，無法顯示截面。";
    }
  }

  function bindUi() {
    root.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
    });

    [xInput, yInput, zInput, offsetInput].forEach((input) => {
      input?.addEventListener("input", () => {
        currentPresetKey = "free";
        setActivePreset("free");
        titleEl.textContent = PRESETS.free.label;
        noteEl.textContent = PRESETS.free.note;
        updatePlaneFromInputs();
      });
    });

    sectionZoomInput?.addEventListener("input", () => {
      sectionZoomValue.textContent = Number(sectionZoomInput.value || 1.15).toFixed(2);
      resize();
    });

    showPlaneInput?.addEventListener("change", () => {
      planeVisual.visible = showPlaneInput.checked;
    });

    enableClipInput?.addEventListener("change", () => {});
    showCapInput?.addEventListener("change", () => {});

    showLabelsInput?.addEventListener("change", () => {
      labelLayer.style.display = showLabelsInput.checked ? "" : "none";
    });

    root.querySelector("[data-reset-camera]")?.addEventListener("click", () => {
      const preset = PRESETS[currentPresetKey] || PRESETS.free;
      camera.position.set(...preset.camera);
      controls.target.set(...preset.target);
      camera.lookAt(...preset.target);
      controls.update();
    });

    root.querySelector("[data-flip-plane]")?.addEventListener("click", () => {
      flipSign *= -1;
      updatePlaneFromInputs();
    });

    window.addEventListener("resize", resize);
  }

  function applyPreset(key) {
    const preset = PRESETS[key] || PRESETS.free;
    currentPresetKey = key;
    flipSign = 1;

    const angles = normalToEulerDegrees(new THREE.Vector3(...preset.normal).normalize());

    xInput.value = String(Math.round(angles.x));
    yInput.value = String(Math.round(angles.y));
    zInput.value = String(Math.round(angles.z));
    offsetInput.value = String(preset.offset);

    titleEl.textContent = preset.label;
    noteEl.textContent = preset.note;

    camera.position.set(...preset.camera);
    controls.target.set(...preset.target);
    camera.lookAt(...preset.target);
    controls.update();

    setActivePreset(key);
    updatePlaneFromInputs();
  }

  function setActivePreset(key) {
    root.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.preset === key);
    });
  }

  function updatePlaneFromInputs() {
    const xDeg = Number(xInput.value || 0);
    const yDeg = Number(yInput.value || 0);
    const zDeg = Number(zInput.value || 0);
    const offset = Number(offsetInput.value || 0);

    xValue.textContent = String(Math.round(xDeg));
    yValue.textContent = String(Math.round(yDeg));
    zValue.textContent = String(Math.round(zDeg));
    offsetValue.textContent = offset.toFixed(2);

    const normal = new THREE.Vector3(0, 0, -1);
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(xDeg),
      THREE.MathUtils.degToRad(yDeg),
      THREE.MathUtils.degToRad(zDeg),
      "XYZ"
    );

    normal.applyEuler(euler).normalize().multiplyScalar(flipSign);

    clipPlane.normal.copy(normal);
    clipPlane.constant = offset;

    updatePlaneVisual();
    updateSectionCamera();
    setCapGroupClipping();
  }

  function addLights() {
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 2.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.4);
    fillLight.position.set(-3, -4, -5);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1.8);
    backLight.position.set(0, 0, -5);
    scene.add(backLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.2);
    frontLight.position.set(0, 0, 5);
    scene.add(frontLight);
  }

  function makePlaneVisual() {
    const size = 1.65;
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x8ecaff,
      transparent: true,
      opacity: 0.20,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.80,
      })
    );

    mesh.add(edge);
    return mesh;
  }

  function makeCapPlane() {
    const geo = new THREE.PlaneGeometry(3.4, 3.4);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffb199,
      side: THREE.DoubleSide,
      transparent: false,

      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.ReplaceStencilOp,
      stencilZFail: THREE.ReplaceStencilOp,
      stencilZPass: THREE.ReplaceStencilOp,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 1000;
    mesh.visible = false;
    return mesh;
  }

  function makeStencilMaterials() {
    const baseMat = new THREE.MeshBasicMaterial({
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
      stencilWrite: true,
      stencilFunc: THREE.AlwaysStencilFunc,
      clippingPlanes: [clipPlane],
    });

    const backMat = baseMat.clone();
    backMat.side = THREE.BackSide;
    backMat.stencilFail = THREE.IncrementWrapStencilOp;
    backMat.stencilZFail = THREE.IncrementWrapStencilOp;
    backMat.stencilZPass = THREE.IncrementWrapStencilOp;

    const frontMat = baseMat.clone();
    frontMat.side = THREE.FrontSide;
    frontMat.stencilFail = THREE.DecrementWrapStencilOp;
    frontMat.stencilZFail = THREE.DecrementWrapStencilOp;
    frontMat.stencilZPass = THREE.DecrementWrapStencilOp;

    return { backMat, frontMat };
  }

  function rebuildCap() {
    capGroup.clear();

    if (!modelRoot) return;

    modelRoot.updateMatrixWorld(true);

    let renderOrder = 1;

    modelRoot.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;

      const { backMat, frontMat } = makeStencilMaterials();

      const backMesh = new THREE.Mesh(node.geometry, backMat);
      backMesh.matrix.copy(node.matrixWorld);
      backMesh.matrixAutoUpdate = false;
      backMesh.renderOrder = renderOrder;

      const frontMesh = new THREE.Mesh(node.geometry, frontMat);
      frontMesh.matrix.copy(node.matrixWorld);
      frontMesh.matrixAutoUpdate = false;
      frontMesh.renderOrder = renderOrder;

      capGroup.add(backMesh, frontMesh);
      renderOrder += 1;
    });
  }

  function setCapGroupClipping() {
    capGroup.traverse((node) => {
      if (!node.isMesh || !node.material) return;

      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];

      materials.forEach((mat) => {
        mat.clippingPlanes = [clipPlane];
        mat.needsUpdate = true;
      });
    });
  }

  function updatePlaneVisual() {
    const normal = clipPlane.normal.clone().normalize();

    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    const planePosition = normal.clone().multiplyScalar(-clipPlane.constant);

    planeVisual.quaternion.copy(q);
    planeVisual.position.copy(planePosition);
    planeVisual.visible = Boolean(showPlaneInput?.checked);

    capPlane.quaternion.copy(q);
    capPlane.position.copy(planePosition);
  }

  function updateSectionCamera() {
    const normal = clipPlane.normal.clone().normalize();
    const planePoint = normal.clone().multiplyScalar(-clipPlane.constant);

    sectionCamera.position.copy(
      planePoint.clone().add(normal.clone().multiplyScalar(sectionDistance))
    );
    sectionCamera.lookAt(planePoint);

    // Stable up vector. This keeps the section readable and avoids camera flip.
    const worldUp = Math.abs(normal.dot(new THREE.Vector3(0, 1, 0))) > 0.92
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);

    const right = new THREE.Vector3().crossVectors(worldUp, normal).normalize();
    const up = new THREE.Vector3().crossVectors(normal, right).normalize();

    sectionCamera.up.copy(up);
    sectionCamera.updateMatrixWorld();
  }

  function normalizeModel(obj) {
    obj.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    modelScale = 1.65 / maxAxis;

    obj.scale.setScalar(modelScale);
    obj.position.set(
      -center.x * modelScale,
      -center.y * modelScale,
      -center.z * modelScale
    );

    obj.updateMatrixWorld(true);

    const fixedBox = new THREE.Box3().setFromObject(obj);
    const fixedCenter = new THREE.Vector3();
    fixedBox.getCenter(fixedCenter);

    obj.position.add(fixedCenter.multiplyScalar(-1));
    obj.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(obj);
    const finalSize = new THREE.Vector3();
    finalBox.getSize(finalSize);

    sectionDistance = Math.max(finalSize.x, finalSize.y, finalSize.z) * 2.25 || 3.0;
  }

  function applyModelMaterials(obj) {
    obj.traverse((node) => {
      if (!node.isMesh || !node.material) return;

      const wasArray = Array.isArray(node.material);
      const materials = wasArray ? node.material : [node.material];

      const clonedMaterials = materials.map((mat) => {
        const cloned = mat.clone();

        cloned.side = THREE.DoubleSide;
        cloned.clippingPlanes = [clipPlane];
        cloned.clipIntersection = false;
        cloned.needsUpdate = true;

        return cloned;
      });

      node.material = wasArray ? clonedMaterials : clonedMaterials[0];
      node.castShadow = false;
      node.receiveShadow = false;
    });
  }

  function setAllMaterialClipping(planes) {
    if (!modelRoot) return;

    modelRoot.traverse((node) => {
      if (!node.isMesh || !node.material) return;

      const materials = Array.isArray(node.material) ? node.material : [node.material];

      materials.forEach((mat) => {
        mat.clippingPlanes = planes;
        mat.clipIntersection = false;
        mat.needsUpdate = true;
      });
    });
  }

  function createLabels() {
    return LABELS.map((item) => {
      const el = document.createElement("div");
      el.className = "heart-label";
      el.textContent = `${item.text} ${item.zh}`;
      labelLayer.appendChild(el);

      return {
        ...item,
        world: new THREE.Vector3(...item.pos),
        el,
      };
    });
  }

  function updateLabels() {
    const rect = mount.getBoundingClientRect();

    labels.forEach((label) => {
      const v = label.world.clone();
      v.project(camera);

      const x = (v.x * 0.5 + 0.5) * rect.width;
      const y = (-v.y * 0.5 + 0.5) * rect.height;

      label.el.style.left = `${x}px`;
      label.el.style.top = `${y}px`;

      const isVisible =
        v.z <= 1 &&
        x >= -30 &&
        y >= -30 &&
        x <= rect.width + 30 &&
        y <= rect.height + 30;

      label.el.style.opacity = isVisible ? "1" : "0";
    });
  }

  function normalToEulerDegrees(normal) {
    const base = new THREE.Vector3(0, 0, -1);
    const q = new THREE.Quaternion().setFromUnitVectors(base, normal.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q, "XYZ");

    return {
      x: THREE.MathUtils.radToDeg(e.x),
      y: THREE.MathUtils.radToDeg(e.y),
      z: THREE.MathUtils.radToDeg(e.z),
    };
  }

  function setStatus(message, fade) {
    if (!status) return;

    status.textContent = message;
    status.style.display = "";

    if (fade) {
      window.setTimeout(() => {
        if (status) status.style.display = "none";
      }, 2600);
    }
  }

  function resize() {
    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 560;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    const sWidth = sectionMount.clientWidth || 560;
    const sHeight = sectionMount.clientHeight || 560;
    const aspect = sWidth / sHeight;

    const zoom = Number(sectionZoomInput?.value || 1.15);
    if (sectionZoomValue) sectionZoomValue.textContent = zoom.toFixed(2);

    sectionCamera.left = -zoom * aspect;
    sectionCamera.right = zoom * aspect;
    sectionCamera.top = zoom;
    sectionCamera.bottom = -zoom;
    sectionCamera.updateProjectionMatrix();

    sectionRenderer.setSize(sWidth, sHeight, false);
    updateSectionCamera();
  }

  function animate() {
    requestAnimationFrame(animate);

    controls.update();

    const clipEnabled = Boolean(enableClipInput?.checked);
    const capEnabled = clipEnabled && Boolean(showCapInput?.checked);

    setCapGroupClipping();
    updatePlaneVisual();

    const planeWasVisible = planeVisual.visible;
    const modelWasVisible = modelRoot ? modelRoot.visible : true;
    const labelWasDisplay = labelLayer.style.display;

    // -------------------------
    // Left 3D view
    // -------------------------
    setAllMaterialClipping(clipEnabled ? [clipPlane] : []);

    if (modelRoot) modelRoot.visible = true;
    labelLayer.style.display = showLabelsInput?.checked ? "" : "none";

    planeVisual.visible = Boolean(showPlaneInput?.checked);
    capGroup.visible = capEnabled;
    capPlane.visible = capEnabled;

    renderer.render(scene, camera);

    // -------------------------
    // Right section view
    // Only show the cap, not the 3D surface model.
    // -------------------------
    planeVisual.visible = false;
    labelLayer.style.display = "none";

    if (modelRoot) modelRoot.visible = false;

    // capGroup contains invisible stencil meshes; capPlane contains visible filled section.
    capGroup.visible = capEnabled;
    capPlane.visible = capEnabled;

    sectionRenderer.render(scene, sectionCamera);

    // Restore state
    if (modelRoot) modelRoot.visible = modelWasVisible;
    planeVisual.visible = planeWasVisible;
    labelLayer.style.display = labelWasDisplay;

    updateLabels();
  }
}
