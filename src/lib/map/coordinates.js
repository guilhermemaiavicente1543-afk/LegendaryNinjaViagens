import {
  GRID_LEFT,
  GRID_TOP,
  GRID_RIGHT,
  GRID_BOTTOM,
  MACRO_COLS,
  MACRO_ROWS,
  SUBDIVISIONS,
  LETTERS,
} from "../../config/mapConfig.js";

const gridWidth = GRID_RIGHT - GRID_LEFT;
const gridHeight = GRID_BOTTOM - GRID_TOP;

const macroCellWidth = gridWidth / MACRO_COLS;
const macroCellHeight = gridHeight / MACRO_ROWS;

const smallCellWidth = macroCellWidth / SUBDIVISIONS;
const smallCellHeight = macroCellHeight / SUBDIVISIONS;

export function getCoordinate(latlng) {
  const x = Number(latlng?.lng);
  const y = Number(latlng?.lat);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  if (x < GRID_LEFT || x > GRID_RIGHT || y < GRID_TOP || y > GRID_BOTTOM) {
    return null;
  }

  const relX = x - GRID_LEFT;

  // O eixo Y do Leaflet/CRS.Simple é invertido em relação à leitura visual.
  const relYFromTop = GRID_BOTTOM - y;

  const macroCol = Math.min(
    MACRO_COLS - 1,
    Math.floor(relX / macroCellWidth)
  );

  const macroRow = Math.min(
    MACRO_ROWS - 1,
    Math.floor(relYFromTop / macroCellHeight)
  );

  const insideMacroX = relX - macroCol * macroCellWidth;
  const insideMacroY = relYFromTop - macroRow * macroCellHeight;

  const subCol = Math.min(
    SUBDIVISIONS,
    Math.floor(insideMacroX / smallCellWidth) + 1
  );

  const subRow = Math.min(
    SUBDIVISIONS,
    Math.floor(insideMacroY / smallCellHeight) + 1
  );

  const globalSmallCol = macroCol * SUBDIVISIONS + (subCol - 1);
  const globalSmallRow = macroRow * SUBDIVISIONS + (subRow - 1);

  const displayMacroRow = macroRow + 1;
  const provinceNumber = (subRow - 1) * SUBDIVISIONS + subCol;

  return {
    x,
    y,
    macroCol,
    macroRow,
    subCol,
    subRow,
    provinceNumber,
    globalSmallCol,
    globalSmallRow,
    label: `${LETTERS[macroCol]}${displayMacroRow}-P${provinceNumber}`,
    macroLabel: `${LETTERS[macroCol]}${displayMacroRow}`,
    provinceLabel: `P${provinceNumber}`,
  };
}

export function getSmallCellCenter(coord) {
  if (
    !coord ||
    !Number.isFinite(Number(coord.globalSmallRow)) ||
    !Number.isFinite(Number(coord.globalSmallCol))
  ) {
    return [
      GRID_TOP + gridHeight / 2,
      GRID_LEFT + gridWidth / 2,
    ];
  }

  return [
    GRID_BOTTOM - (Number(coord.globalSmallRow) + 0.5) * smallCellHeight,
    GRID_LEFT + (Number(coord.globalSmallCol) + 0.5) * smallCellWidth,
  ];
}

export function getMacroCellCenter(coord) {
  if (
    !coord ||
    coord.macroRow == null ||
    coord.macroCol == null
  ) {
    return coord
      ? getSmallCellCenter(coord)
      : [
          GRID_TOP + gridHeight / 2,
          GRID_LEFT + gridWidth / 2,
        ];
  }

  return [
    GRID_BOTTOM - (Number(coord.macroRow) + 0.5) * macroCellHeight,
    GRID_LEFT + (Number(coord.macroCol) + 0.5) * macroCellWidth,
  ];
}

export function buildGridLines(showSmallGrid) {
  const lines = [];

  if (showSmallGrid) {
    const totalSmallCols = MACRO_COLS * SUBDIVISIONS;
    const totalSmallRows = MACRO_ROWS * SUBDIVISIONS;

    for (let index = 0; index <= totalSmallCols; index += 1) {
      const x = GRID_LEFT + index * smallCellWidth;

      lines.push({
        type: index % SUBDIVISIONS === 0 ? "macro" : "small",
        positions: [
          [GRID_TOP, x],
          [GRID_BOTTOM, x],
        ],
      });
    }

    for (let index = 0; index <= totalSmallRows; index += 1) {
      const y = GRID_TOP + index * smallCellHeight;

      lines.push({
        type: index % SUBDIVISIONS === 0 ? "macro" : "small",
        positions: [
          [y, GRID_LEFT],
          [y, GRID_RIGHT],
        ],
      });
    }
  } else {
    for (let index = 0; index <= MACRO_COLS; index += 1) {
      const x = GRID_LEFT + index * macroCellWidth;

      lines.push({
        type: "macro",
        positions: [
          [GRID_TOP, x],
          [GRID_BOTTOM, x],
        ],
      });
    }

    for (let index = 0; index <= MACRO_ROWS; index += 1) {
      const y = GRID_TOP + index * macroCellHeight;

      lines.push({
        type: "macro",
        positions: [
          [y, GRID_LEFT],
          [y, GRID_RIGHT],
        ],
      });
    }
  }

  return lines;
}
