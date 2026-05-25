// tools/heartEchoPlane.js
// MVP: Neonatal heart arbitrary-plane anatomy viewer
// Layout: left 3D model + right thin-slab 2D section + bottom controls
//
// Put model at:
// assets/models/heart-echo/normal_neonatal_heart.glb
//
// IMPORTANT:
// index.html should include an importmap BEFORE ./core/app.js:
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
              <h2 class="h4 mb-1">新生兒心臟 3D / 2D 任意切面 MVP</h2>
              <div class="text-muted small">
                左側顯示立體模型與切面平面；右側顯示目前 plane 附近的 thin-slab 2D-like 剖面。
              </div>
            </div>
            <span class="badge text-bg-secondary">Education only</span>
          </div>

          <div class="alert alert-warning py-2 small mb-3">
            此工具為解剖教學示意，不可作為臨床診斷、病人判讀或治療決策依據。
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
                <span>2D 切面圖</span>
                <span class="badge text-bg-light border">Thin-slab section</span>
              </div>
              <div class="heart-plane-section" data-heart-section>
                <div class="heart-plane-section-hint">載入後會顯示目前 plane 附近的薄層切面</div>
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

              <div class="col-12 col-lg-3">
                <div class="mb-3">
                  <div class="fw-bold" data-current-title>任意切面</div>
                  <div class="small text-muted" data-current-note>手動調整 X/Y/Z 角度與 offset。</div>
                </div>

                <div class="d-grid gap-2 mb-3">
                  <button type="button" class="btn btn-dark btn-sm" data-reset-camera>重置3D視角</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm" data-flip-plane>切換切面方向</button>
                </div>

                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" role="switch" id="${uid}-show-plane" data-show-plane checked>
                  <label class="form-check-label" for="${uid}-show-plane">左側顯示切面平面</label>
                </div>

                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" role="switch" id="${uid}-clip" data-enable-clip checked>
                  <label class="form-check-label" for="${uid}-clip">左側啟用 clipping</label>
                </div>

                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" role="switch" id="${uid}-labels" data-show-labels checked>
                  <label class="form-check-label" for="${uid}-labels">左側顯示粗略 anatomy labels</label>
                </div>

                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" role="switch" id="${uid}-section-slab" data-section-slab checked>
                  <label class="form-check-label" for="${uid}-section-slab">右側 thin-slab 模式</label>
                </div>
              </div>

              <div class="col-12 col-lg-3">
                <label class="form-label fw-bold">Plane rotation</label>

                <label class="form-label small mb-0">X angle: <span data-x-value>0</span>°</label>
                <input class="form-range" type="range" min="-180" max="180" step="1" value="0" data-plane-x>

                <label class="form-label small mb-0">Y angle: <span data-y-value>0</span>°</label>
                <input class="form-range" type="range" min="-180" max="180" step="1" value="0" data-plane-y>

                <label class="form-label small mb-0">Z angle: <span data-z-value>0</span>°</label>
                <input class="form-range" type="range" min="-180" max="180" step="1" value="0" data-plane-z>
              </div>

              <div class="col-12 col-lg-3">
                <label class="form-label fw-bold">Plane offset: <span data-offset-value>0.00</span></label>
                <input class="form-range" type="range" min="-0.8" max="0.8" step="0.01" value="0" data-plane-offset>

                <label class="form-label fw-bold mt-3">2D thickness: <span data-thickness-value>0.05</span></label>
                <input class="form-range" type="range" min="0.005" max="0.20" step="0.005" value="0.05" data-section-thickness>

                <label class="form-label fw-bold mt-3">2D zoom: <span data-section-zoom-value>1.15</span></label>
                <input class="form-range" type="range" min="0.65" max="2.2" step="0.01" value="1.15" data-section-zoom>

                <div class="small text-muted mt-3 border-top pt-2">
                  <strong>模型來源：</strong>
                  <em>Normal Neonatal Heart</em>，作者 E-learning UMCG，來源 <a href="https://sketchfab.com/3d-models/normal-neonatal-heart-9c0dcc64acd74f0aaa9847736a9a87af" target="_blank" rel="noopener noreferrer">
                    Sketchfab
                  </a>。
                  授權：
                  <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">
                    CC BY-NC-SA 4.0
                  </a>。
                  本工具僅作非商業醫學教育用途。
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>
        [data-heart-plane-root] .heart-plane-main {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.95fr);
          gap: 1rem;
        }

        [data-heart-plane-root] .heart-pane,
        [data-heart-plane-root] .heart-plane-panel {
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
            radial-gradient(circle at 50% 34%, rgba(255,255,255,.45), transparent 36%),
            linear-gradient(135deg, #f4efe8, #d8c7b7);
          border: 1px solid rgba(0,0,0,.08);
        }

        [data-heart-plane-root] .heart-plane-section {
          background:
            radial-gradient(circle at 50% 48%, rgba(255,255,255,.56), transparent 44%),
            linear-gradient(135deg, #f8f4ee, #ded1c2);
        }

        [data-heart-plane-root] .heart-plane-viewer canvas,
        [data-heart-plane-root] .heart-plane-section canvas {
          display: block;
          width: 100%;
          height: 100%;
        }

        [data-heart-plane-root] .heart-plane-section-hint,
        [data-heart-plane-root] .heart-plane-status {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          z-index: 4;
          border-radius: 12px;
          padding: 8px 10px;
          background: rgba(255,255,255,.88);
          color: #222;
          font-size: .875rem;
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
          background: rgba(255,255,255,.88);
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
  const sectionHint = root.querySelector(".heart-plane-section-hint");
  const labelLayer = root.querySelector("[data-label-layer]");

  const titleEl = root.querySelector("[data-current-title]");
  const noteEl = root.querySelector("[data-current-note]");

  const xInput = root.querySelector("[data-plane-x]");
  const yInput = root.querySelector("[data-plane-y]");
  const zInput = root.querySelector("[data-plane-z]");
  const offsetInput = root.querySelector("[data-plane-offset]");
  const sectionThicknessInput = root.querySelector("[data-section-thickness]");
  const sectionZoomInput = root.querySelector("[data-section-zoom]");

  const xValue = root.querySelector("[data-x-value]");
  const yValue = root.querySelector("[data-y-value]");
  const zValue = root.querySelector("[data-z-value]");
  const offsetValue = root.querySelector("[data-offset-value]");
  const thicknessValue = root.querySelector("[data-thickness-value]");
  const sectionZoomValue = root.querySelector("[data-section-zoom-value]");

  const showPlaneInput = root.querySelector("[data-show-plane]");
  const enableClipInput = root.querySelector("[data-enable-clip]");
  const showLabelsInput = root.querySelector("[data-show-labels]");
  const sectionSlabInput = root.querySelector("[data-section-slab]");

  const THREE = await import(THREE_MODULE);
  const { OrbitControls } = await import(ORBIT_CONTROLS);
  const { GLTFLoader } = await import(GLTF_LOADER);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
  camera.position.set(...PRESETS.free.camera);

  const sectionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  sectionCamera.position.set(0, 0, 3);
  sectionCamera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  mount.appendChild(renderer.domElement);

  const sectionRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  sectionRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  sectionRenderer.localClippingEnabled = true;
  sectionRenderer.outputColorSpace = THREE.SRGBColorSpace;
  sectionRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  sectionRenderer.toneMappingExposure = 1.45;
  sectionMount.appendChild(sectionRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(...PRESETS.free.target);

  addLights();

  const heartGroup = new THREE.Group();
  scene.add(heartGroup);

  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const slabPlaneA = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const slabPlaneB = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  const planeVisual = makePlaneVisual();
  scene.add(planeVisual);

  let modelRoot = null;
  let modelScale = 1;
  let currentPresetKey = "free";
  let flipSign = 1;

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

      controls.target.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
      controls.update();

      setStatus("3D 模型載入完成。左側可旋轉，右側會同步顯示 thin-slab 2D 切面。", true);
      if (sectionHint) sectionHint.style.display = "none";

      applyPreset("free");
    } catch (err) {
      console.error(err);
      setStatus(`模型載入失敗：請確認 ${MODEL_URL} 是否存在。`, false);
      if (sectionHint) sectionHint.textContent = "模型載入失敗，無法顯示 2D 切面。";
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

    sectionThicknessInput?.addEventListener("input", () => {
      const thickness = Number(sectionThicknessInput.value || 0.05);
      thicknessValue.textContent = thickness.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
      updateSlabPlanes();
    });

    sectionZoomInput?.addEventListener("input", () => {
      sectionZoomValue.textContent = Number(sectionZoomInput.value || 1.15).toFixed(2);
      resize();
    });

    showPlaneInput?.addEventListener("change", () => {
      planeVisual.visible = showPlaneInput.checked;
    });

    enableClipInput?.addEventListener("change", () => {});
    sectionSlabInput?.addEventListener("change", () => {});

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
    updateSlabPlanes();
    updateSectionCamera();
  }

  function updateSlabPlanes() {
    const normal = clipPlane.normal.clone().normalize();
    const offset = clipPlane.constant;
    const thickness = Number(sectionThicknessInput?.value || 0.05);
    const halfThickness = Math.max(0.001, thickness / 2);

    if (thicknessValue) {
      thicknessValue.textContent = thickness.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    }

    // Thin slab is centered on the current clipping plane.
    //
    // Three.js keeps points where plane.distanceToPoint(point) >= 0.
    // A: keep points at/after center - halfThickness along normal.
    // B: keep points at/before center + halfThickness along normal.
    //
    // If main plane is n·p + c = 0:
    // slab lower boundary: n·p + c + halfThickness >= 0
    // slab upper boundary: -n·p - c + halfThickness >= 0
    slabPlaneA.normal.copy(normal);
    slabPlaneA.constant = offset + halfThickness;

    slabPlaneB.normal.copy(normal).multiplyScalar(-1);
    slabPlaneB.constant = -offset + halfThickness;
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

  function updatePlaneVisual() {
    const normal = clipPlane.normal.clone().normalize();

    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    planeVisual.quaternion.copy(q);
    planeVisual.position.copy(normal.clone().multiplyScalar(-clipPlane.constant));
    planeVisual.visible = Boolean(showPlaneInput?.checked);
  }

  function updateSectionCamera() {
    const normal = clipPlane.normal.clone().normalize();
    const planePoint = normal.clone().multiplyScalar(-clipPlane.constant);
    const distance = 3.0;

    sectionCamera.position.copy(planePoint.clone().add(normal.clone().multiplyScalar(distance)));
    sectionCamera.lookAt(planePoint);

    // Pick a stable up vector. If normal is too close to world-up, use X as reference.
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

    // Fine correction after scale/position.
    const fixedBox = new THREE.Box3().setFromObject(obj);
    const fixedCenter = new THREE.Vector3();
    fixedBox.getCenter(fixedCenter);

    obj.position.add(fixedCenter.multiplyScalar(-1));
    obj.updateMatrixWorld(true);
  }

  function applyModelMaterials(obj) {
    obj.traverse((node) => {
      if (!node.isMesh || !node.material) return;

      const wasArray = Array.isArray(node.material);
      const materials = wasArray ? node.material : [node.material];

      const clonedMaterials = materials.map((mat) => {
        const cloned = mat.clone();

        // Preserve original GLB material/color/texture.
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
      label.el.style.opacity = v.z > 1 ? "0" : "1";
    });
  }

  function normalToEulerDegrees(normal) {
    // Approximate inverse mapping for UI sliders.
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

  function animate() {
    requestAnimationFrame(animate);

    controls.update();

    const leftClip = Boolean(enableClipInput?.checked);
    const rightSlab = Boolean(sectionSlabInput?.checked);
    const planeWasVisible = planeVisual.visible;

    // Left 3D view: show plane visual and optional single clipping plane.
    setAllMaterialClipping(leftClip ? [clipPlane] : []);
    planeVisual.visible = Boolean(showPlaneInput?.checked);
    renderer.render(scene, camera);

    // Right 2D-like section:
    // - hide blue plane visual
    // - thin-slab mode uses two clipping planes
    // - fallback mode uses one clipping plane
    if (rightSlab) {
      setAllMaterialClipping([slabPlaneA, slabPlaneB]);
    } else {
      setAllMaterialClipping([clipPlane]);
    }

    planeVisual.visible = false;
    sectionRenderer.render(scene, sectionCamera);

    planeVisual.visible = planeWasVisible;
    updateLabels();
  }
}
