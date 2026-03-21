// /tools/pedigree.js
// updated: 2026-03-22

const TOOL_KEY = "pedigree";
const DEFAULT_INFO = "請先選取一位成員，再選圖示或新增手足。";
const BOARD_ROWS = 7;
const BOARD_PADDING = 2;

const MARKERS = Object.freeze([
  { key: "male-open", symbol: "□", sex: "male", title: "男性・空心方形" },
  { key: "male-filled", symbol: "■", sex: "male", title: "男性・實心方形" },
  // { key: "male-field", symbol: "田", sex: "male", title: "男性・田" },
  { key: "female-open", symbol: "○", sex: "female", title: "女性・空心圓形" },
  { key: "female-filled", symbol: "●", sex: "female", title: "女性・實心圓形" },
  // { key: "female-cross", symbol: "⊕", sex: "female", title: "女性・十字圓" },
  { key: "unknown-open-diamond", symbol: "◇", sex: "unknown", title: "未知性別・空心菱形" },
  { key: "unknown-filled-diamond", symbol: "◆", sex: "unknown", title: "未知性別・實心菱形" },
]);

const MARKER_MAP = Object.freeze(Object.fromEntries(MARKERS.map((item) => [item.key, item])));

const FIXED_RULES = Object.freeze({
  pgf: { label: "爺爺", allowed: ["male"] },
  pgm: { label: "奶奶", allowed: ["female"] },
  mgf: { label: "外公", allowed: ["male"] },
  mgm: { label: "外婆", allowed: ["female"] },
  father: { label: "爸爸", allowed: ["male"] },
  mother: { label: "媽媽", allowed: ["female"] },
  proband: { label: "個案", allowed: ["male", "female"] },
});

const DIR = Object.freeze({ N: 1, E: 2, S: 4, W: 8 });

const CONNECTOR_TO_CHAR = Object.freeze({
  [DIR.E | DIR.W]: "─",
  [DIR.N | DIR.S]: "│",
  [DIR.S | DIR.E]: "┌",
  [DIR.S | DIR.W]: "┐",
  [DIR.N | DIR.E]: "└",
  [DIR.N | DIR.W]: "┘",
  [DIR.E | DIR.W | DIR.S]: "┬",
  [DIR.E | DIR.W | DIR.N]: "┴",
  [DIR.N | DIR.S | DIR.E]: "├",
  [DIR.N | DIR.S | DIR.W]: "┤",
  [DIR.N | DIR.S | DIR.E | DIR.W]: "┼",
});

const INSTANCES = new WeakMap();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markerByKey(key) {
  return MARKER_MAP[key] || MARKER_MAP["male-open"];
}

function markerSex(key) {
  return markerByKey(key).sex;
}

function midpoint(a, b) {
  return Math.floor((a + b) / 2);
}

function makeRelative(id, markerKey) {
  return { id, markerKey };
}

function createInitialState() {
  return {
    seq: 1,
    selectedId: null,
    hoverId: null,
    activeMarkerKey: "male-open",
    flash: null,
    model: {
      grandparents: {
        pgf: { id: "pgf", markerKey: "male-open" },
        pgm: { id: "pgm", markerKey: "female-open" },
        mgf: { id: "mgf", markerKey: "male-open" },
        mgm: { id: "mgm", markerKey: "female-open" },
      },
      tracks: {
        father: {
          left: [],
          self: { id: "father", markerKey: "male-open" },
          right: [],
        },
        mother: {
          left: [],
          self: { id: "mother", markerKey: "female-open" },
          right: [],
        },
        child: {
          left: [],
          self: { id: "proband", markerKey: "male-open" },
          right: [],
        },
      },
    },
  };
}

function nextRelativeId(state) {
  const id = `rel-${state.seq}`;
  state.seq += 1;
  return id;
}

function trackDisplay(track) {
  return [...track.left, track.self, ...track.right];
}

function locatePerson(model, id) {
  const gpKeys = ["pgf", "pgm", "mgf", "mgm"];
  for (const key of gpKeys) {
    if (model.grandparents[key].id === id) {
      return { kind: "grandparent", key };
    }
  }

  const trackNames = ["father", "mother", "child"];
  for (const trackName of trackNames) {
    const track = model.tracks[trackName];

    if (track.self.id === id) {
      return { kind: "track", track: trackName, segment: "self", index: 0 };
    }

    const leftIndex = track.left.findIndex((item) => item.id === id);
    if (leftIndex >= 0) {
      return { kind: "track", track: trackName, segment: "left", index: leftIndex };
    }

    const rightIndex = track.right.findIndex((item) => item.id === id);
    if (rightIndex >= 0) {
      return { kind: "track", track: trackName, segment: "right", index: rightIndex };
    }
  }

  return null;
}

function getPersonByLocation(model, location) {
  if (!location) return null;
  if (location.kind === "grandparent") {
    return model.grandparents[location.key];
  }

  const track = model.tracks[location.track];
  if (location.segment === "self") return track.self;
  if (location.segment === "left") return track.left[location.index] || null;
  if (location.segment === "right") return track.right[location.index] || null;
  return null;
}

function getPerson(model, id) {
  const location = locatePerson(model, id);
  return getPersonByLocation(model, location);
}

function getSelectionMeta(state, personId) {
  const location = locatePerson(state.model, personId);
  const person = getPersonByLocation(state.model, location);
  if (!location || !person) return null;

  const sex = markerSex(person.markerKey);

  if (location.kind === "grandparent") {
    const rule = FIXED_RULES[location.key];
    return {
      label: rule.label,
      allowedSexes: [...rule.allowed],
      canInsert: false,
      canDelete: false,
      location,
      person,
      sex,
    };
  }

  if (location.segment === "self") {
    const key = location.track === "child" ? "proband" : location.track;
    const rule = FIXED_RULES[key];
    return {
      label: rule.label,
      allowedSexes: [...rule.allowed],
      canInsert: true,
      canDelete: false,
      location,
      person,
      sex,
    };
  }

  let label = "親屬";
  if (location.track === "father") {
    if (location.segment === "left") {
      if (sex === "male") label = "伯伯";
      else if (sex === "female") label = "姑姑";
      else label = "父系年長手足";
    } else {
      if (sex === "male") label = "叔叔";
      else if (sex === "female") label = "姑姑";
      else label = "父系年幼手足";
    }
  } else if (location.track === "mother") {
    if (sex === "male") label = "舅舅";
    else if (sex === "female") label = "阿姨";
    else label = "母系手足";
  } else if (location.track === "child") {
    if (location.segment === "left") {
      if (sex === "male") label = "哥哥";
      else if (sex === "female") label = "姊姊";
      else label = "年長手足";
    } else {
      if (sex === "male") label = "弟弟";
      else if (sex === "female") label = "妹妹";
      else label = "年幼手足";
    }
  }

  return {
    label,
    allowedSexes: ["male", "female", "unknown"],
    canInsert: true,
    canDelete: true,
    location,
    person,
    sex,
  };
}

function canUseMarker(selectionMeta, markerKey) {
  if (!selectionMeta) return false;
  return selectionMeta.allowedSexes.includes(markerSex(markerKey));
}

function replaceSelectedMarker(state) {
  const meta = getSelectionMeta(state, state.selectedId);
  if (!meta) {
    state.flash = { kind: "muted", text: DEFAULT_INFO };
    return;
  }

  if (!canUseMarker(meta, state.activeMarkerKey)) {
    state.flash = { kind: "danger", text: `${meta.label} 不能使用目前選定的圖示。` };
    return;
  }

  meta.person.markerKey = state.activeMarkerKey;
  state.flash = null;
}

function displayIndexForLocation(track, location) {
  if (location.segment === "left") return location.index;
  if (location.segment === "self") return track.left.length;
  return track.left.length + 1 + location.index;
}

function insertIntoTrack(state, side) {
  const meta = getSelectionMeta(state, state.selectedId);
  if (!meta) {
    state.flash = { kind: "muted", text: DEFAULT_INFO };
    return;
  }

  if (!meta.canInsert || meta.location.kind !== "track") {
    state.flash = { kind: "danger", text: "這個位置不能新增親屬。" };
    return;
  }

  const track = state.model.tracks[meta.location.track];
  const selectedDisplayIndex = displayIndexForLocation(track, meta.location);
  const insertionPoint = side === "left" ? selectedDisplayIndex : selectedDisplayIndex + 1;
  const person = makeRelative(nextRelativeId(state), state.activeMarkerKey);

  if (insertionPoint <= track.left.length) {
    track.left.splice(insertionPoint, 0, person);
  } else {
    track.right.splice(insertionPoint - track.left.length - 1, 0, person);
  }

  state.selectedId = person.id;
  state.flash = null;
}

function deleteSelectedPerson(state) {
  const meta = getSelectionMeta(state, state.selectedId);
  if (!meta) {
    state.flash = { kind: "muted", text: DEFAULT_INFO };
    return;
  }

  if (!meta.canDelete || meta.location.kind !== "track") {
    state.flash = { kind: "danger", text: "這個位置不能刪除。" };
    return;
  }

  const track = state.model.tracks[meta.location.track];
  if (meta.location.segment === "left") {
    track.left.splice(meta.location.index, 1);
  } else if (meta.location.segment === "right") {
    track.right.splice(meta.location.index, 1);
  }

  state.selectedId = null;
  state.flash = null;
}

function getStatusMessage(state) {
  if (state.flash) return state.flash;

  if (state.selectedId) {
    const meta = getSelectionMeta(state, state.selectedId);
    if (!meta) return { kind: "muted", text: DEFAULT_INFO };
    return { kind: "success", text: `目前選取：${meta.label}` };
  }

  if (state.hoverId) {
    const meta = getSelectionMeta(state, state.hoverId);
    if (!meta) return { kind: "muted", text: DEFAULT_INFO };
    return { kind: "muted", text: `滑鼠所在：${meta.label}。點一下即可選取。` };
  }

  return { kind: "muted", text: DEFAULT_INFO };
}

function addMask(map, x, y, bit) {
  const key = `${x},${y}`;
  map.set(key, (map.get(key) || 0) | bit);
}

function addLine(maskMap, x1, y1, x2, y2) {
  if (x1 !== x2 && y1 !== y2) {
    throw new Error("Only orthogonal lines are supported.");
  }

  if (x1 === x2) {
    const step = y2 > y1 ? 1 : -1;
    for (let y = y1; y !== y2; y += step) {
      addMask(maskMap, x1, y, step > 0 ? DIR.S : DIR.N);
      addMask(maskMap, x1, y + step, step > 0 ? DIR.N : DIR.S);
    }
    return;
  }

  const step = x2 > x1 ? 1 : -1;
  for (let x = x1; x !== x2; x += step) {
    addMask(maskMap, x, y1, step > 0 ? DIR.E : DIR.W);
    addMask(maskMap, x + step, y1, step > 0 ? DIR.W : DIR.E);
  }
}

function writePeople(glyphMap, row, positions, people, placementMap) {
  positions.forEach((x, index) => {
    const person = people[index];
    const symbol = markerByKey(person.markerKey).symbol;
    glyphMap.set(`${x},${row}`, symbol);
    placementMap.set(person.id, { x, y: row });
  });
}

function drawSiblingGroup(maskMap, childXs, connectorRow, peopleRow) {
  if (!childXs.length) return;

  if (childXs.length === 1) {
    addLine(maskMap, childXs[0], connectorRow, childXs[0], peopleRow);
    return;
  }

  addLine(maskMap, childXs[0], connectorRow, childXs[childXs.length - 1], connectorRow);
  childXs.forEach((x) => {
    addLine(maskMap, x, connectorRow, x, peopleRow);
  });
}

function drawGrandparentBlock(maskMap, glyphMap, placementMap, leftGrandparent, rightGrandparent, childXs, rows) {
  const { grandparentRow, siblingConnectorRow, childRow } = rows;
  const centerX = midpoint(childXs[0], childXs[childXs.length - 1]);
  const leftX = centerX - 1;
  const rightX = centerX + 1;

  glyphMap.set(`${leftX},${grandparentRow}`, markerByKey(leftGrandparent.markerKey).symbol);
  glyphMap.set(`${rightX},${grandparentRow}`, markerByKey(rightGrandparent.markerKey).symbol);
  placementMap.set(leftGrandparent.id, { x: leftX, y: grandparentRow });
  placementMap.set(rightGrandparent.id, { x: rightX, y: grandparentRow });

  addLine(maskMap, leftX, grandparentRow, centerX, grandparentRow);
  addLine(maskMap, centerX, grandparentRow, rightX, grandparentRow);
  addLine(maskMap, centerX, grandparentRow, centerX, siblingConnectorRow);
  drawSiblingGroup(maskMap, childXs, siblingConnectorRow, childRow);
}

function previewCellText(cell) {
  const ch = cell.char || " ";
  // 空白補成兩格，其餘字元維持原樣（因為本身已經是雙寬）
  return ch === " " ? "  " : ch;
}

function buildSymbolReferenceLine() {
  return "符號:□■○●◇◆↑─│└┘┌┐┬┴├┤┼／＼";
}

function buildLayout(model) {
  const glyphMap = new Map();
  const maskMap = new Map();
  const placementMap = new Map();

  const fatherTrack = model.tracks.father;
  const motherTrack = model.tracks.mother;
  const childTrack = model.tracks.child;

  const fatherPeople = trackDisplay(fatherTrack);
  const motherPeople = trackDisplay(motherTrack);
  const childPeople = trackDisplay(childTrack);

  const fatherStartX = 0;
  const fatherXs = fatherPeople.map((_, index) => fatherStartX + index * 2);
  const fatherLastX = fatherXs[fatherXs.length - 1] ?? 0;

  const motherStartX = fatherLastX + 4;
  const motherXs = motherPeople.map((_, index) => motherStartX + index * 2);

  writePeople(glyphMap, 2, fatherXs, fatherPeople, placementMap);
  writePeople(glyphMap, 2, motherXs, motherPeople, placementMap);

  drawGrandparentBlock(
    maskMap,
    glyphMap,
    placementMap,
    model.grandparents.pgf,
    model.grandparents.pgm,
    fatherXs,
    { grandparentRow: 0, siblingConnectorRow: 1, childRow: 2 },
  );

  drawGrandparentBlock(
    maskMap,
    glyphMap,
    placementMap,
    model.grandparents.mgf,
    model.grandparents.mgm,
    motherXs,
    { grandparentRow: 0, siblingConnectorRow: 1, childRow: 2 },
  );

  const fatherSelfX = fatherStartX + fatherTrack.left.length * 2;
  const motherSelfX = motherStartX + motherTrack.left.length * 2;
  const unionX = midpoint(fatherSelfX, motherSelfX);

  // 爸爸、媽媽各自往下接到婚配線
  addLine(maskMap, fatherSelfX, 2, fatherSelfX, 3);
  addLine(maskMap, motherSelfX, 2, motherSelfX, 3);

  // 婚配線
  addLine(maskMap, fatherSelfX, 3, motherSelfX, 3);

  const childStartX = unionX - (childPeople.length - 1);
  const childXs = childPeople.map((_, index) => childStartX + index * 2);

  drawSiblingGroup(maskMap, childXs, 4, 5);
  addLine(maskMap, unionX, 3, unionX, 4);
  writePeople(glyphMap, 5, childXs, childPeople, placementMap);

  const probandX = childStartX + childTrack.left.length * 2;
  glyphMap.set(`${probandX},${BOARD_ROWS - 1}`, "↑");

  let minX = Infinity;
  let maxX = -Infinity;

  for (const key of [...glyphMap.keys(), ...maskMap.keys()]) {
    const [x] = key.split(",").map(Number);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    minX = 0;
    maxX = 0;
  }

  const shiftX = BOARD_PADDING - minX;
  const width = maxX - minX + 1 + BOARD_PADDING * 2;
  const cells = Array.from({ length: BOARD_ROWS }, () => Array.from({ length: width }, () => ({ type: "blank", char: " " })));

  for (const [key, mask] of maskMap.entries()) {
    const [x, y] = key.split(",").map(Number);
    const boardX = x + shiftX;
    if (y < 0 || y >= BOARD_ROWS || boardX < 0 || boardX >= width) continue;
    const char = CONNECTOR_TO_CHAR[mask] || (mask === (DIR.E | DIR.W) ? "─" : mask === (DIR.N | DIR.S) ? "│" : " ");
    cells[y][boardX] = { type: "connector", char };
  }

  for (const [key, char] of glyphMap.entries()) {
    const [x, y] = key.split(",").map(Number);
    const boardX = x + shiftX;
    if (y < 0 || y >= BOARD_ROWS || boardX < 0 || boardX >= width) continue;

    if (char === "↑") {
      cells[y][boardX] = { type: "indicator", char };
      continue;
    }

    let personId = null;
    for (const [id, placement] of placementMap.entries()) {
      if (placement.x === x && placement.y === y) {
        personId = id;
        break;
      }
    }

    cells[y][boardX] = { type: "person", char, personId };
  }

  const positions = new Map();
  for (const [id, placement] of placementMap.entries()) {
    positions.set(id, { x: placement.x + shiftX, y: placement.y });
  }

  const previewLines = cells.map((row) =>
    row
      .map((cell) => previewCellText(cell))
      .join("")
      .replace(/\s+$/u, "")
  );

  const preview = previewLines.join("\n");
  const symbolReferenceLine = buildSymbolReferenceLine();
  const fullOutput = `${preview}\n\n${symbolReferenceLine}`;

  return { width, height: BOARD_ROWS, cells, positions, preview, fullOutput };
}

function markerButtonsHtml(state, selectionMeta) {
  return MARKERS.map((marker) => {
    const isActive = state.activeMarkerKey === marker.key;
    const disabled = selectionMeta ? !canUseMarker(selectionMeta, marker.key) : true;

    return `
      <button
        class="btn btn-sm ${isActive ? "btn-primary" : "btn-outline-secondary"}"
        type="button"
        data-action="choose-marker"
        data-marker-key="${marker.key}"
        title="${escapeHtml(marker.title)}"
        ${disabled ? "disabled" : ""}
      >${marker.symbol}</button>
    `;
  }).join("");
}

function renderBoard(layout, state) {
  const items = [];

  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const cell = layout.cells[y][x];
      if (cell.type === "person") {
        const meta = getSelectionMeta(state, cell.personId);
        const marker = meta ? markerByKey(meta.person.markerKey) : null;
        const ariaLabel = meta && marker ? `${meta.label}，${marker.title}` : "家族成員";
        const selected = state.selectedId === cell.personId;

        items.push(`
          <button
            type="button"
            class="pedigree-cell pedigree-person ${selected ? "is-selected" : ""}"
            data-action="select-person"
            data-person-id="${cell.personId}"
            aria-label="${escapeHtml(ariaLabel)}"
          >${escapeHtml(cell.char)}</button>
        `);
      } else if (cell.type === "indicator") {
        items.push(`<span class="pedigree-cell pedigree-indicator" aria-hidden="true">${escapeHtml(cell.char)}</span>`);
      } else {
        const isBlank = cell.char === " ";
        items.push(`<span class="pedigree-cell pedigree-glyph ${isBlank ? "is-blank" : ""}" aria-hidden="true">${isBlank ? "&nbsp;" : escapeHtml(cell.char)}</span>`);
      }
    }
  }

  return `
    <div class="pedigree-board" style="grid-template-columns: repeat(${layout.width}, 1.45rem);">
      ${items.join("")}
    </div>
  `;
}

function renderSelectionSummary(state) {
  const meta = getSelectionMeta(state, state.selectedId);
  if (!meta) {
    return {
      label: "尚未選取",
      symbol: "--",
      markerTitle: "--",
      canReplace: false,
      canInsert: false,
      canDelete: false,
    };
  }

  const marker = markerByKey(meta.person.markerKey);
  return {
    label: meta.label,
    symbol: marker.symbol,
    markerTitle: marker.title,
    canReplace: true,
    canInsert: meta.canInsert,
    canDelete: meta.canDelete,
  };
}

function chooseNearestPerson(layout, currentId, direction) {
  const current = layout.positions.get(currentId);
  if (!current) return null;

  let bestId = null;
  let bestScore = Infinity;

  for (const [id, pos] of layout.positions.entries()) {
    if (id === currentId) continue;
    const dx = pos.x - current.x;
    const dy = pos.y - current.y;

    let valid = false;
    let primary = 0;
    let secondary = 0;

    if (direction === "left" && dx < 0) {
      valid = true;
      primary = Math.abs(dx);
      secondary = Math.abs(dy);
    } else if (direction === "right" && dx > 0) {
      valid = true;
      primary = dx;
      secondary = Math.abs(dy);
    } else if (direction === "up" && dy < 0) {
      valid = true;
      primary = Math.abs(dy);
      secondary = Math.abs(dx);
    } else if (direction === "down" && dy > 0) {
      valid = true;
      primary = dy;
      secondary = Math.abs(dx);
    }

    if (!valid) continue;

    const score = primary * 100 + secondary;
    if (score < bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return bestId;
}

function focusSelectedButton(box, selectedId) {
  if (!selectedId) return;
  const button = box.querySelector(`[data-action="select-person"][data-person-id="${CSS.escape(selectedId)}"]`);
  if (button instanceof HTMLElement) button.focus();
}

function applyAction(state, action) {
  switch (action.type) {
    case "select": {
      state.selectedId = action.personId;
      state.flash = null;
      return;
    }
    case "hover": {
      state.hoverId = action.personId;
      return;
    }
    case "clear-hover": {
      if (state.hoverId === action.personId || action.personId == null) {
        state.hoverId = null;
      }
      return;
    }
    case "choose-marker": {
      state.activeMarkerKey = action.markerKey;
      state.flash = null;
      return;
    }
    case "replace": {
      replaceSelectedMarker(state);
      return;
    }
    case "insert-left": {
      insertIntoTrack(state, "left");
      return;
    }
    case "insert-right": {
      insertIntoTrack(state, "right");
      return;
    }
    case "delete": {
      deleteSelectedPerson(state);
      return;
    }
    case "reset": {
      const fresh = createInitialState();
      Object.assign(state, fresh);
      return;
    }
    default:
      return;
  }
}

async function copyText(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

function renderState(box, state) {
  const layout = buildLayout(state.model);
  const selectionMeta = getSelectionMeta(state, state.selectedId);
  const summary = renderSelectionSummary(state);
  const status = getStatusMessage(state);

  const boardEl = box.querySelector('[data-role="board"]');
  const paletteEl = box.querySelector('[data-role="marker-palette"]');
  const outputEl = box.querySelector('[data-role="output"]');
  const infoEl = box.querySelector('[data-role="info"]');
  const selectedLabelEl = box.querySelector('[data-role="selected-label"]');
  const selectedSymbolEl = box.querySelector('[data-role="selected-symbol"]');
  const selectedMarkerEl = box.querySelector('[data-role="selected-marker-title"]');
  const replaceBtn = box.querySelector('[data-action="replace"]');
  const insertLeftBtn = box.querySelector('[data-action="insert-left"]');
  const insertRightBtn = box.querySelector('[data-action="insert-right"]');
  const deleteBtn = box.querySelector('[data-action="delete"]');

  if (boardEl) boardEl.innerHTML = renderBoard(layout, state);
  if (paletteEl) paletteEl.innerHTML = markerButtonsHtml(state, selectionMeta);
  if (outputEl) outputEl.textContent = layout.fullOutput;

  if (infoEl) {
    infoEl.className = "alert py-2 mb-3";
    infoEl.classList.add(
      status.kind === "danger"
        ? "alert-danger"
        : status.kind === "success"
          ? "alert-success"
          : "alert-light",
    );
    infoEl.textContent = status.text;
  }

  if (selectedLabelEl) selectedLabelEl.textContent = summary.label;
  if (selectedSymbolEl) selectedSymbolEl.textContent = summary.symbol;
  if (selectedMarkerEl) selectedMarkerEl.textContent = summary.markerTitle;

  if (replaceBtn) replaceBtn.disabled = !summary.canReplace || !canUseMarker(selectionMeta, state.activeMarkerKey);
  if (insertLeftBtn) insertLeftBtn.disabled = !summary.canInsert;
  if (insertRightBtn) insertRightBtn.disabled = !summary.canInsert;
  if (deleteBtn) deleteBtn.disabled = !summary.canDelete;

  box.dataset.preview = layout.fullOutput;
  box.__pedigreeLayout = layout;
}

export function render() {
  return `
    <div class="container mt-2" data-tool="${TOOL_KEY}">
      <style>
        [data-tool="${TOOL_KEY}"] .pedigree-shell {
          display: grid;
          grid-template-columns: minmax(560px, 1fr) 340px;
          gap: 16px;
          align-items: start;
        }

        @media (max-width: 992px) {
          [data-tool="${TOOL_KEY}"] .pedigree-shell {
            grid-template-columns: 1fr;
          }
        }

        [data-tool="${TOOL_KEY}"] .pedigree-card,
        [data-tool="${TOOL_KEY}"] .pedigree-side {
          border: 1px solid #dee2e6;
          border-radius: 14px;
          background: #fff;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-title {
          font-size: .92rem;
          font-weight: 700;
          color: #495057;
          margin-bottom: .5rem;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-board-wrap {
          overflow: auto;
          padding: .75rem;
          min-height: 17rem;
          background: #fbfcfe;
          border-radius: 12px;
          border: 1px solid #eef2f6;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-board {
          display: grid;
          gap: 0;
          width: max-content;
          margin: 0 auto;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-cell {
          width: 1.45rem;
          height: 1.45rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: "Courier New", Consolas, Menlo, Monaco, monospace;
          line-height: 1;
          user-select: none;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-glyph,
        [data-tool="${TOOL_KEY}"] .pedigree-indicator {
          color: #212529;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-glyph.is-blank {
          color: transparent;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-person {
          border: 1px solid transparent;
          border-radius: 6px;
          background: transparent;
          padding: 0;
          cursor: pointer;
          transition: background-color .12s ease, border-color .12s ease, box-shadow .12s ease;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-person:hover,
        [data-tool="${TOOL_KEY}"] .pedigree-person:focus-visible {
          background: #eef3fb;
          border-color: #c8d7ee;
          outline: none;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-person.is-selected {
          background: #d8dfea;
          border-color: #90a4c3;
          box-shadow: inset 0 0 0 1px rgba(61, 90, 128, .12);
        }

        [data-tool="${TOOL_KEY}"] .pedigree-side-sticky {
          position: sticky;
          top: 12px;
        }

        @media (max-width: 992px) {
          [data-tool="${TOOL_KEY}"] .pedigree-side-sticky {
            position: static;
          }
        }

        [data-tool="${TOOL_KEY}"] .pedigree-meta {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 4px 8px;
          font-size: .875rem;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-meta .k {
          color: #6c757d;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-meta .v {
          font-weight: 600;
          color: #212529;
          word-break: break-word;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-palette {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-palette .btn {
          font-family: "Courier New", Consolas, Menlo, Monaco, monospace;
          font-size: 1rem;
          padding: .45rem .35rem;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        [data-tool="${TOOL_KEY}"] [data-role="output"] {
          margin: 0;
          min-height: 11rem;
          white-space: pre;
          font-family: "Courier New", Consolas, Menlo, Monaco, monospace;
          font-size: .95rem;
          line-height: 1.4;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: .5rem;
          padding: .75rem;
          overflow: auto;
        }

        [data-tool="${TOOL_KEY}"] .pedigree-help {
          font-size: .85rem;
          color: #6c757d;
          line-height: 1.55;
        }
      </style>

      <div class="card">
        <div class="card-header text-center">Pedigree 家族史編輯器</div>

        <div class="card-body pb-0">
          <div class="alert alert-light py-2 mb-3" data-role="info" role="status" aria-live="polite">${DEFAULT_INFO}</div>

          <div class="pedigree-shell">
            <div class="pedigree-card p-3">
              <div class="pedigree-title">家族圖預覽</div>
              <div class="pedigree-board-wrap">
                <div data-role="board"></div>
              </div>

              <div class="mt-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div class="pedigree-title mb-0">純文字輸出</div>
                  <button class="btn btn-outline-secondary btn-sm" type="button" data-action="copy-output">複製</button>
                </div>
                <pre data-role="output"></pre>
              </div>
            </div>

            <div class="pedigree-side p-3">
              <div class="pedigree-side-sticky">
                <div class="pedigree-title">目前選取</div>
                <div class="pedigree-meta mb-3">
                  <div class="k">對象</div>
                  <div class="v" data-role="selected-label">尚未選取</div>
                  <div class="k">圖示</div>
                  <div class="v"><span data-role="selected-symbol">--</span> <span class="text-muted small" data-role="selected-marker-title">--</span></div>
                </div>

                <div class="pedigree-title">1. 選擇要使用的圖示</div>
                <div class="pedigree-palette mb-3" data-role="marker-palette"></div>

                <div class="pedigree-title">2. 對目前選取成員執行操作</div>
                <div class="pedigree-actions mb-3">
                  <button class="btn btn-outline-secondary btn-sm" type="button" data-action="replace">替換圖示</button>
                  <button class="btn btn-outline-secondary btn-sm" type="button" data-action="delete">刪除此人</button>
                  <button class="btn btn-outline-secondary btn-sm" type="button" data-action="insert-left">左側新增</button>
                  <button class="btn btn-outline-secondary btn-sm" type="button" data-action="insert-right">右側新增</button>
                </div>

                <div class="d-grid mb-3">
                  <button class="btn btn-secondary btn-sm" type="button" data-action="reset">重設</button>
                </div>

                <div class="pedigree-help">
                  先點選家族圖中的人物，再選圖示與操作。<br>
                  核心角色（祖父母、父母、個案）不可刪除。<br>
                  方向鍵可在圖上的成員之間移動。
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer text-muted small">
          內部資料以語意化人物節點管理，畫面與純文字輸出都由同一個 layout engine 產生。
        </div>
      </div>
    </div>
  `;
}

export function init(root, ctx) {
  void ctx;

  const box = root.querySelector(`[data-tool="${TOOL_KEY}"]`);
  if (!box) return;

  const previous = INSTANCES.get(box);
  if (previous) previous.destroy();

  const controller = new AbortController();
  const { signal } = controller;
  const state = createInitialState();
  state.selectedId = "proband";

  const rerender = (options = {}) => {
    renderState(box, state);
    if (options.focusSelected) {
      focusSelectedButton(box, state.selectedId);
    }
  };

  box.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
    if (!target) return;

    const action = target.getAttribute("data-action");

    if (action === "select-person") {
      const personId = target.getAttribute("data-person-id");
      if (!personId) return;
      applyAction(state, { type: "select", personId });
      rerender({ focusSelected: false });
      return;
    }

    if (action === "choose-marker") {
      const markerKey = target.getAttribute("data-marker-key");
      if (!markerKey || !MARKER_MAP[markerKey]) return;
      applyAction(state, { type: "choose-marker", markerKey });
      rerender();
      return;
    }

    if (action === "copy-output") {
      const text = box.dataset.preview || "";
      try {
        await copyText(text);
        state.flash = { kind: "success", text: "已複製純文字輸出。" };
      } catch {
        state.flash = { kind: "danger", text: "複製失敗，請手動選取文字。" };
      }
      rerender();
      return;
    }

    if (action === "replace") {
      applyAction(state, { type: "replace" });
      rerender({ focusSelected: true });
      return;
    }

    if (action === "insert-left") {
      applyAction(state, { type: "insert-left" });
      rerender({ focusSelected: true });
      return;
    }

    if (action === "insert-right") {
      applyAction(state, { type: "insert-right" });
      rerender({ focusSelected: true });
      return;
    }

    if (action === "delete") {
      applyAction(state, { type: "delete" });
      rerender();
      return;
    }

    if (action === "reset") {
      applyAction(state, { type: "reset" });
      rerender();
    }
  }, { signal });

  box.addEventListener("mouseover", (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-action="select-person"]') : null;
    if (!button) return;
    const personId = button.getAttribute("data-person-id");
    if (!personId) return;
    applyAction(state, { type: "hover", personId });
    renderState(box, state);
  }, { signal });

  box.addEventListener("mouseout", (event) => {
    const fromButton = event.target instanceof Element ? event.target.closest('[data-action="select-person"]') : null;
    if (!fromButton) return;

    const nextButton = event.relatedTarget instanceof Element ? event.relatedTarget.closest('[data-action="select-person"]') : null;
    if (nextButton) return;

    applyAction(state, { type: "clear-hover", personId: null });
    renderState(box, state);
  }, { signal });

  box.addEventListener("keydown", (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-action="select-person"]') : null;
    if (!target) return;

    const currentId = target.getAttribute("data-person-id");
    if (!currentId) return;

    let direction = null;
    if (event.key === "ArrowLeft") direction = "left";
    else if (event.key === "ArrowRight") direction = "right";
    else if (event.key === "ArrowUp") direction = "up";
    else if (event.key === "ArrowDown") direction = "down";
    else return;

    const layout = box.__pedigreeLayout;
    if (!layout) return;

    const nextId = chooseNearestPerson(layout, currentId, direction);
    if (!nextId) return;

    event.preventDefault();
    applyAction(state, { type: "select", personId: nextId });
    rerender({ focusSelected: true });
  }, { signal });

  const destroy = () => controller.abort();
  INSTANCES.set(box, { destroy });
  rerender();
}

export const __test__ = {
  createInitialState,
  buildLayout,
  getSelectionMeta,
  applyAction,
  markerByKey,
  canUseMarker,
};
