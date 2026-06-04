/**
 * LN Digital — Motor de Mapa e Viagens
 * Etapa 1: motor paralelo, sem alterar o App.jsx ainda.
 *
 * Objetivo:
 * - Centralizar medidas do mapa.
 * - Preservar região/província.
 * - Preparar coordenada livre.
 * - Permitir futura troca de ImageOverlay por tiles.
 */

export const LN_MAP_CONFIG = {
  width: 1080,
  height: 903,

  grid: {
    left: 14,
    top: 14,
    right: 1065,
    bottom: 888,

    macroCols: 10,
    macroRows: 10,
    subdivisions: 5,

    // Regra narrativa/base: cada província pequena representa 200 km.
    provinceKm: 200,
  },
};

export const TRAVEL_MODES = {
  terrestre: {
    key: "terrestre",
    label: "Terrestre",
    hoursPerProvince: 12,
    hoursPerMacroBlock: 12,
  },
  aquatico: {
    key: "aquatico",
    label: "Aquático",
    hoursPerProvince: 9,
    hoursPerMacroBlock: 9,
  },
  aereo: {
    key: "aereo",
    label: "Aéreo",
    hoursPerProvince: 6,
    hoursPerMacroBlock: 6,
  },
  teletransporte: {
    key: "teletransporte",
    label: "Teletransporte",
    hoursPerProvince: 0,
    hoursPerMacroBlock: 0,
    instant: true,
  },
};

/**
 * Dois modos de regra:
 *
 * current_app:
 *   Mantém comportamento mais próximo do app atual:
 *   12h/9h/6h por bloco macro de 5 províncias.
 *
 * official_province:
 *   Usa a regra mais literal:
 *   12h/9h/6h por província de 200 km.
 *
 * A reforma pode escolher qual regra usar sem reescrever o motor.
 */
export const TRAVEL_RULESETS = {
  current_app: "current_app",
  official_province: "official_province",
};

const REGION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePoint(input) {
  if (Array.isArray(input)) {
    return {
      y: toFiniteNumber(input[0]),
      x: toFiniteNumber(input[1]),
    };
  }

  if (!input || typeof input !== "object") {
    return { x: 0, y: 0 };
  }

  return {
    x: toFiniteNumber(input.x ?? input.lng ?? input.longitude),
    y: toFiniteNumber(input.y ?? input.lat ?? input.latitude),
  };
}

export function getMapMetrics(config = LN_MAP_CONFIG) {
  const gridWidth = config.grid.right - config.grid.left;
  const gridHeight = config.grid.bottom - config.grid.top;

  const macroCellWidth = gridWidth / config.grid.macroCols;
  const macroCellHeight = gridHeight / config.grid.macroRows;

  const smallCellWidth = macroCellWidth / config.grid.subdivisions;
  const smallCellHeight = macroCellHeight / config.grid.subdivisions;

  return {
    gridWidth,
    gridHeight,
    macroCellWidth,
    macroCellHeight,
    smallCellWidth,
    smallCellHeight,
    totalSmallCols: config.grid.macroCols * config.grid.subdivisions,
    totalSmallRows: config.grid.macroRows * config.grid.subdivisions,
  };
}

export function isInsideMapGrid(input, config = LN_MAP_CONFIG) {
  const point = normalizePoint(input);

  return (
    point.x >= config.grid.left &&
    point.x <= config.grid.right &&
    point.y >= config.grid.top &&
    point.y <= config.grid.bottom
  );
}

/**
 * Converte clique/ponto do Leaflet para região/província.
 * Mantém nomes compatíveis com o App.jsx atual:
 * - label
 * - macroLabel
 * - globalSmallCol
 * - globalSmallRow
 */
export function getCoordinate(input, config = LN_MAP_CONFIG) {
  const point = normalizePoint(input);
  const metrics = getMapMetrics(config);

  if (!isInsideMapGrid(point, config)) {
    return null;
  }

  const relX = point.x - config.grid.left;

  // No CRS.Simple atual, o eixo visual do mapa é lido de cima para baixo.
  // Por isso usamos bottom - y para descobrir a linha visual correta.
  const relYFromTop = config.grid.bottom - point.y;

  const macroCol = clamp(
    Math.floor(relX / metrics.macroCellWidth),
    0,
    config.grid.macroCols - 1
  );

  const macroRow = clamp(
    Math.floor(relYFromTop / metrics.macroCellHeight),
    0,
    config.grid.macroRows - 1
  );

  const relXInsideMacro = relX - macroCol * metrics.macroCellWidth;
  const relYInsideMacro = relYFromTop - macroRow * metrics.macroCellHeight;

  const subCol = clamp(
    Math.floor(relXInsideMacro / metrics.smallCellWidth) + 1,
    1,
    config.grid.subdivisions
  );

  const subRow = clamp(
    Math.floor(relYInsideMacro / metrics.smallCellHeight) + 1,
    1,
    config.grid.subdivisions
  );

  const globalSmallCol = macroCol * config.grid.subdivisions + (subCol - 1);
  const globalSmallRow = macroRow * config.grid.subdivisions + (subRow - 1);

  const regionLetter = REGION_LETTERS[macroCol] || `C${macroCol + 1}`;
  const macroLabel = `${regionLetter}${macroRow + 1}`;
  const provinceIndex = (subRow - 1) * config.grid.subdivisions + subCol;
  const provinceLabel = `${macroLabel}-P${provinceIndex}`;

  return {
    x: point.x,
    y: point.y,
    lat: point.y,
    lng: point.x,

    macroCol,
    macroRow,
    macroLabel,

    subCol,
    subRow,
    provinceIndex,

    globalSmallCol,
    globalSmallRow,

    label: provinceLabel,
    provinceLabel,
    coordLabel: provinceLabel,
  };
}

/**
 * Centro da província. Mantém retorno no formato Leaflet atual: [lat, lng].
 */
export function getSmallCellCenter(coord, config = LN_MAP_CONFIG) {
  if (!coord) return null;

  const metrics = getMapMetrics(config);

  return [
    config.grid.bottom - (coord.globalSmallRow + 0.5) * metrics.smallCellHeight,
    config.grid.left + (coord.globalSmallCol + 0.5) * metrics.smallCellWidth,
  ];
}

/**
 * Coordenada livre: retorna o ponto exato clicado + região/província administrativa.
 */
export function getFreeMapPoint(input, config = LN_MAP_CONFIG) {
  const point = normalizePoint(input);
  const coord = getCoordinate(point, config);

  if (!coord) return null;

  return {
    x: point.x,
    y: point.y,
    lat: point.y,
    lng: point.x,

    regionLabel: coord.macroLabel,
    macroLabel: coord.macroLabel,

    provinceLabel: coord.provinceLabel,
    coordLabel: coord.coordLabel,

    provinceIndex: coord.provinceIndex,
    globalSmallCol: coord.globalSmallCol,
    globalSmallRow: coord.globalSmallRow,
  };
}

export function calculateProvinceDistance(a, b) {
  if (!a || !b) return 0;

  const dx = toFiniteNumber(b.globalSmallCol) - toFiniteNumber(a.globalSmallCol);
  const dy = toFiniteNumber(b.globalSmallRow) - toFiniteNumber(a.globalSmallRow);

  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateFreeProvinceDistance(a, b, config = LN_MAP_CONFIG) {
  const start = normalizePoint(a);
  const end = normalizePoint(b);
  const metrics = getMapMetrics(config);

  const dxInProvinces = (end.x - start.x) / metrics.smallCellWidth;
  const dyInProvinces = (end.y - start.y) / metrics.smallCellHeight;

  return Math.sqrt(dxInProvinces * dxInProvinces + dyInProvinces * dyInProvinces);
}

function calculateDurationHours(distanceInProvinces, mode, ruleset, config) {
  if (!mode || mode.instant) return 0;

  if (ruleset === TRAVEL_RULESETS.official_province) {
    return distanceInProvinces * mode.hoursPerProvince;
  }

  // Compatibilidade com o sistema atual do site:
  // 5 províncias pequenas = 1 bloco macro.
  const macroBlocks = distanceInProvinces / config.grid.subdivisions;
  return macroBlocks * mode.hoursPerMacroBlock;
}

/**
 * Cálculo compatível com o App.jsx atual: origem/destino por província.
 */
export function calculateTravel(
  startCoord,
  endCoord,
  travelMode = "terrestre",
  options = {}
) {
  const config = options.config || LN_MAP_CONFIG;
  const ruleset = options.ruleset || TRAVEL_RULESETS.current_app;
  const mode = TRAVEL_MODES[travelMode] || TRAVEL_MODES.terrestre;

  const distanceProvinces = calculateProvinceDistance(startCoord, endCoord);
  const macroBlocks = distanceProvinces / config.grid.subdivisions;
  const distanceKm = distanceProvinces * config.grid.provinceKm;
  const durationHours = calculateDurationHours(distanceProvinces, mode, ruleset, config);

  return {
    modeKey: mode.key,
    modeLabel: mode.label,

    distanceProvinces,
    distanceSmallSquares: distanceProvinces,

    // Nome legado preservado para não quebrar código antigo.
    distanceFeet: distanceProvinces,

    macroBlocks,
    distanceKm,

    durationHours,
    durationDays: durationHours / 24,

    ruleset,
  };
}

/**
 * Cálculo novo: origem/destino por coordenada livre.
 */
export function calculateFreeTravel(
  startPoint,
  endPoint,
  travelMode = "terrestre",
  options = {}
) {
  const config = options.config || LN_MAP_CONFIG;
  const ruleset = options.ruleset || TRAVEL_RULESETS.official_province;
  const mode = TRAVEL_MODES[travelMode] || TRAVEL_MODES.terrestre;

  const distanceProvinces = calculateFreeProvinceDistance(startPoint, endPoint, config);
  const macroBlocks = distanceProvinces / config.grid.subdivisions;
  const distanceKm = distanceProvinces * config.grid.provinceKm;
  const durationHours = calculateDurationHours(distanceProvinces, mode, ruleset, config);

  return {
    modeKey: mode.key,
    modeLabel: mode.label,

    distanceProvinces,
    distanceSmallSquares: distanceProvinces,
    distanceFeet: distanceProvinces,

    macroBlocks,
    distanceKm,

    durationHours,
    durationDays: durationHours / 24,

    ruleset,
  };
}

function getDateMs(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();

  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function getTravelProgress(travel, now = new Date()) {
  if (!travel) return 0;

  const startedAt = getDateMs(travel.startedAt ?? travel.started_at);
  const arrivalAt = getDateMs(travel.arrivalAt ?? travel.arrival_at);
  const current = getDateMs(now);

  if (!startedAt || !arrivalAt || arrivalAt <= startedAt) {
    return 1;
  }

  return clamp((current - startedAt) / (arrivalAt - startedAt), 0, 1);
}

function normalizeLeafletPoint(value) {
  if (Array.isArray(value)) {
    return [toFiniteNumber(value[0]), toFiniteNumber(value[1])];
  }

  const point = normalizePoint(value);

  return [point.y, point.x];
}

export function getTravelCurrentPoint(travel, now = new Date()) {
  if (!travel) return null;

  const progress = getTravelProgress(travel, now);

  const start =
    travel.startPoint ||
    travel.start_point ||
    travel.startCenter ||
    travel.start_center;

  const end =
    travel.endPoint ||
    travel.end_point ||
    travel.endCenter ||
    travel.end_center;

  if (!start || !end) return null;

  const [startLat, startLng] = normalizeLeafletPoint(start);
  const [endLat, endLng] = normalizeLeafletPoint(end);

  return [
    startLat + (endLat - startLat) * progress,
    startLng + (endLng - startLng) * progress,
  ];
}

export function getRemainingTravelHours(travel, now = new Date()) {
  if (!travel) return 0;

  const progress = getTravelProgress(travel, now);
  const durationHours = toFiniteNumber(travel.durationHours ?? travel.duration_hours);

  return Math.max(0, durationHours * (1 - progress));
}

export function formatDistanceKm(value) {
  const distance = toFiniteNumber(value);

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} mil km`;
  }

  return `${Math.round(distance)} km`;
}
