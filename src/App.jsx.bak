import { useMemo, useState } from "react";
import {
  MapContainer,
  ImageOverlay,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { CRS } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

/*
  Mapa com grade:
  largura: 1080px
  altura: 903px

  Sistema:
  - Colunas grandes: A-J
  - Linhas grandes: 1-10
  - Cada bloco grande: 5 x 5 subquadrados
  - Distância: diagonal = 1.41
  - 1 subquadrado = 5 pés
  - Aéreo: 5 pés = 6 horas
  - Aquático: 5 pés = 9 horas
  - Terrestre: 5 pés = 12 horas
*/

const MAP_WIDTH = 1080;
const MAP_HEIGHT = 903;

const GRID_LEFT = 14;
const GRID_TOP = 14;
const GRID_RIGHT = 1065;
const GRID_BOTTOM = 888;

const MACRO_COLS = 10;
const MACRO_ROWS = 10;
const SUBDIVISIONS = 5;

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

const UNIT_PER_SMALL_SQUARE = 5;
const UNIT_NAME = "pés";
const DIAGONAL_COST = 1.41;

const TRAVEL_MODES = {
  aereo: {
    label: "Aéreo",
    hoursPerFiveFeet: 6,
  },
  aquatico: {
    label: "Aquático",
    hoursPerFiveFeet: 9,
  },
  terrestre: {
    label: "Terrestre",
    hoursPerFiveFeet: 12,
  },
};

const imageBounds = [
  [0, 0],
  [MAP_HEIGHT, MAP_WIDTH],
];

const gridWidth = GRID_RIGHT - GRID_LEFT;
const gridHeight = GRID_BOTTOM - GRID_TOP;
const macroCellWidth = gridWidth / MACRO_COLS;
const macroCellHeight = gridHeight / MACRO_ROWS;
const smallCellWidth = macroCellWidth / SUBDIVISIONS;
const smallCellHeight = macroCellHeight / SUBDIVISIONS;

function FitMapToBounds() {
  const map = useMap();

  setTimeout(() => {
    map.fitBounds(imageBounds, {
      padding: [10, 10],
      animate: false,
    });
  }, 0);

  return null;
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });

  return null;
}

function getCoordinate(latlng) {
  const x = latlng.lng;
  const y = latlng.lat;

  if (x < GRID_LEFT || x > GRID_RIGHT || y < GRID_TOP || y > GRID_BOTTOM) {
    return null;
  }

  const relX = x - GRID_LEFT;
  const relY = y - GRID_TOP;

  const macroCol = Math.min(MACRO_COLS - 1, Math.floor(relX / macroCellWidth));
  const macroRow = Math.min(MACRO_ROWS - 1, Math.floor(relY / macroCellHeight));

  const insideMacroX = relX - macroCol * macroCellWidth;
  const insideMacroY = relY - macroRow * macroCellHeight;

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

  return {
    x,
    y,
    macroCol,
    macroRow,
    subCol,
    subRow,
    globalSmallCol,
    globalSmallRow,
    label: `${LETTERS[macroCol]}${macroRow + 1}-${subCol},${subRow}`,
    macroLabel: `${LETTERS[macroCol]}${macroRow + 1}`,
  };
}

function getSmallCellCenter(coord) {
  return [
    GRID_TOP + (coord.globalSmallRow + 0.5) * smallCellHeight,
    GRID_LEFT + (coord.globalSmallCol + 0.5) * smallCellWidth,
  ];
}

function calculateTravel(a, b, travelMode) {
  const dx = Math.abs(a.globalSmallCol - b.globalSmallCol);
  const dy = Math.abs(a.globalSmallRow - b.globalSmallRow);

  const diagonals = Math.min(dx, dy);
  const straights = Math.max(dx, dy) - diagonals;

  const smallSquares = diagonals * DIAGONAL_COST + straights;
  const feet = smallSquares * UNIT_PER_SMALL_SQUARE;

  const selectedMode = TRAVEL_MODES[travelMode];
  const hours = smallSquares * selectedMode.hoursPerFiveFeet;
  const days = hours / 24;

  return {
    dx,
    dy,
    diagonals,
    straights,
    smallSquares,
    macroBlocks: smallSquares / SUBDIVISIONS,
    feet,
    hours,
    days,
    modeLabel: selectedMode.label,
    hoursPerFiveFeet: selectedMode.hoursPerFiveFeet,
  };
}

function formatTime(hours) {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 60) {
    return `${wholeHours + 1}h`;
  }

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}min`;
}

function buildGridLines(showSmallGrid) {
  const lines = [];

  if (showSmallGrid) {
    const totalSmallCols = MACRO_COLS * SUBDIVISIONS;
    const totalSmallRows = MACRO_ROWS * SUBDIVISIONS;

    for (let i = 0; i <= totalSmallCols; i++) {
      const x = GRID_LEFT + i * smallCellWidth;
      lines.push({
        type: i % SUBDIVISIONS === 0 ? "macro" : "small",
        positions: [
          [GRID_TOP, x],
          [GRID_BOTTOM, x],
        ],
      });
    }

    for (let i = 0; i <= totalSmallRows; i++) {
      const y = GRID_TOP + i * smallCellHeight;
      lines.push({
        type: i % SUBDIVISIONS === 0 ? "macro" : "small",
        positions: [
          [y, GRID_LEFT],
          [y, GRID_RIGHT],
        ],
      });
    }
  } else {
    for (let i = 0; i <= MACRO_COLS; i++) {
      const x = GRID_LEFT + i * macroCellWidth;
      lines.push({
        type: "macro",
        positions: [
          [GRID_TOP, x],
          [GRID_BOTTOM, x],
        ],
      });
    }

    for (let i = 0; i <= MACRO_ROWS; i++) {
      const y = GRID_TOP + i * macroCellHeight;
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

export default function App() {
  const [points, setPoints] = useState([]);
  const [travelMode, setTravelMode] = useState("terrestre");
  const [showOverlayGrid, setShowOverlayGrid] = useState(true);
  const [showSmallGrid, setShowSmallGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.35);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const gridLines = useMemo(() => buildGridLines(showSmallGrid), [showSmallGrid]);

  function handleMapClick(latlng) {
    const coord = getCoordinate(latlng);

    if (!coord) {
      return;
    }

    setPoints((current) => {
      if (current.length >= 2) {
        return [coord];
      }

      return [...current, coord];
    });
  }

  const travel =
    points.length === 2 ? calculateTravel(points[0], points[1], travelMode) : null;

  return (
    <main className="app">
      <button
        className="mobileConfigButton"
        onClick={() => setIsPanelOpen(true)}
        type="button"
      >
        ☰ Configurações
      </button>

      {isPanelOpen && (
        <button
          className="panelBackdrop"
          onClick={() => setIsPanelOpen(false)}
          aria-label="Fechar configurações"
          type="button"
        />
      )}

      <aside className={`panel ${isPanelOpen ? "panelOpen" : ""}`}>
        <div className="panelHeader">
          <h1>Mapa RPG</h1>

          <button
            className="mobileCloseButton"
            onClick={() => setIsPanelOpen(false)}
            type="button"
            aria-label="Fechar painel"
          >
            ✕
          </button>
        </div>

        <p>
          Selecione o meio de locomoção e clique em dois pontos para calcular
          distância e tempo de viagem.
        </p>

        <label>
          Meio de locomoção:
          <select
            value={travelMode}
            onChange={(e) => setTravelMode(e.target.value)}
          >
            <option value="terrestre">Terrestre — 5 pés = 12 horas</option>
            <option value="aquatico">Aquático — 5 pés = 9 horas</option>
            <option value="aereo">Aéreo — 5 pés = 6 horas</option>
          </select>
        </label>

        <div className="ruleBox">
          <strong>Regra ativa:</strong>
          <br />
          Diagonal = {DIAGONAL_COST}
          <br />1 subquadrado = {UNIT_PER_SMALL_SQUARE} {UNIT_NAME}
        </div>

        <label className="checkboxRow">
          <input
            type="checkbox"
            checked={showOverlayGrid}
            onChange={(e) => setShowOverlayGrid(e.target.checked)}
          />
          Mostrar grade do app
        </label>

        <label className="checkboxRow">
          <input
            type="checkbox"
            checked={showSmallGrid}
            onChange={(e) => setShowSmallGrid(e.target.checked)}
          />
          Mostrar subquadrados
        </label>

        <label>
          Transparência da grade:
          <input
            type="range"
            min="0.05"
            max="0.8"
            step="0.05"
            value={gridOpacity}
            onChange={(e) => setGridOpacity(Number(e.target.value))}
          />
          <span>{Math.round(gridOpacity * 100)}%</span>
        </label>

        <button onClick={() => setPoints([])} type="button">
          Limpar pontos
        </button>

        {points.length > 0 && (
          <div className="info">
            <strong>Ponto A:</strong>{" "}
            {points[0] ? points[0].label : "-"}
            <br />
            <strong>Ponto B:</strong>{" "}
            {points[1] ? points[1].label : "-"}
          </div>
        )}

        {travel && (
          <div className="result">
            <strong>Viagem {travel.modeLabel}</strong>
            <br />
            Distância: {travel.smallSquares.toFixed(2)} subquadrados
            <br />
            Blocos grandes: {travel.macroBlocks.toFixed(2)}
            <br />
            Distância em pés: {travel.feet.toFixed(2)} {UNIT_NAME}
            <br />
            Tempo: {formatTime(travel.hours)}
            <br />
            Dias: {travel.days.toFixed(2)} dias
          </div>
        )}

        {travel && (
          <div className="hint">
            <strong>Cálculo:</strong>
            <br />
            Diagonais: {travel.diagonals} × {DIAGONAL_COST}
            <br />
            Retas: {travel.straights} × 1
            <br />
            Cada 5 pés por {travel.modeLabel.toLowerCase()} ={" "}
            {travel.hoursPerFiveFeet} horas
          </div>
        )}

        <div className="hint">
          <strong>Coordenada:</strong> C4-3,2
          <br />
          C4 = bloco grande.
          <br />
          3,2 = subquadrado interno.
          <br />
          <strong>Imagem:</strong> 1080 × 903px
        </div>
      </aside>

      <section className="mapArea">
        <MapContainer
          crs={CRS.Simple}
          bounds={imageBounds}
          maxBounds={imageBounds}
          maxBoundsViscosity={0.75}
          minZoom={-2}
          maxZoom={6}
          zoomSnap={0.25}
          zoomDelta={0.5}
          wheelPxPerZoomLevel={80}
          style={{ height: "100%", width: "100%" }}
        >
          <FitMapToBounds />

          <ImageOverlay url="/mapa-coordenado.jpg" bounds={imageBounds} />

          {showOverlayGrid &&
            gridLines.map((line, index) => (
              <Polyline
                key={index}
                positions={line.positions}
                pathOptions={{
                  color: line.type === "macro" ? "#000000" : "#111827",
                  weight: line.type === "macro" ? 3 : 1,
                  opacity:
                    line.type === "macro"
                      ? Math.min(gridOpacity + 0.2, 1)
                      : gridOpacity,
                }}
                interactive={false}
              />
            ))}

          <ClickHandler onMapClick={handleMapClick} />

          {points.map((point, index) => (
            <CircleMarker
              key={index}
              center={getSmallCellCenter(point)}
              radius={8}
              pathOptions={{
                color: index === 0 ? "#22c55e" : "#ef4444",
                fillColor: index === 0 ? "#22c55e" : "#ef4444",
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Tooltip permanent direction="top">
                {index === 0 ? `A: ${point.label}` : `B: ${point.label}`}
              </Tooltip>
            </CircleMarker>
          ))}

          {points.length === 2 && (
            <Polyline
              positions={[getSmallCellCenter(points[0]), getSmallCellCenter(points[1])]}
              pathOptions={{
                color: "#f97316",
                weight: 4,
                opacity: 0.95,
              }}
            />
          )}
        </MapContainer>
      </section>
    </main>
  );
}
