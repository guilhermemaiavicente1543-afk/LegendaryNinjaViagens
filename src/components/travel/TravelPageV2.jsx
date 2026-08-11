import { useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const STORAGE_KEY = "ln-travel-page-v2-state";

const MAP_IMAGE_URL = "/mapa-ln-original.png";
const MAP_IMAGE_WIDTH = 2048;
const MAP_IMAGE_HEIGHT = 1713;

const MACRO_COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const MACRO_ROWS = 10;
const SUBDIVISIONS = 5;
const TOTAL_SMALL_COLS = MACRO_COLS.length * SUBDIVISIONS;
const TOTAL_SMALL_ROWS = MACRO_ROWS * SUBDIVISIONS;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

const MAP_PING_ICON_PATHS = {
  invocacao: "/map-ping-icons/iconinvoc.png",
  vila: "/map-ping-icons/iconvila.png",
  construcao: "/map-ping-icons/iconconstr.png",
  desconhecido: "/map-ping-icons/iconinterrogação.png",
  alerta: "/map-ping-icons/iconexcla.png",
};

const TRAVEL_MODES = {
  terrestre: {
    label: "Terrestre",
    hoursPerProvince: 12,
    description: "12h por província.",
  },
  aquatico: {
    label: "Aquático",
    hoursPerProvince: 9,
    description: "9h por província.",
  },
  aereo: {
    label: "Aéreo",
    hoursPerProvince: 6,
    description: "6h por província.",
  },
  teletransporte: {
    label: "Teletransporte",
    hoursPerProvince: 0,
    description: "Chegada imediata.",
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { characterLocations: {}, travels: {} };

    const parsed = JSON.parse(raw);

    return {
      characterLocations: parsed?.characterLocations || {},
      travels: parsed?.travels || {},
    };
  } catch {
    return { characterLocations: {}, travels: {} };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeCharacter(character, index) {
  const id =
    character?.id ||
    character?.character_id ||
    character?.userId ||
    character?.user_id ||
    `character-${index}`;

  const name =
    character?.characterName ||
    character?.character_name ||
    character?.name ||
    character?.playerName ||
    character?.player_name ||
    "Ninja sem nome";

  const iconUrl =
    character?.mapIconUrl ||
    character?.map_icon_url ||
    character?.iconUrl ||
    character?.icon_url ||
    character?.characterPhotoUrl ||
    character?.character_photo_url ||
    character?.portraitUrl ||
    character?.portrait_url ||
    "";

  const location =
    character?.currentLocation ||
    character?.current_location ||
    character?.coord_label ||
    character?.macro_label ||
    character?.location ||
    null;

  return {
    ...character,
    id,
    name,
    iconUrl,
    location,
  };
}

function fallbackPoint() {
  return {
    xPct: 38,
    yPct: 44,
  };
}

function normalizePoint(value) {
  if (
    value &&
    typeof value === "object" &&
    Number.isFinite(Number(value.xPct)) &&
    Number.isFinite(Number(value.yPct))
  ) {
    return {
      xPct: clamp(Number(value.xPct), 0, 100),
      yPct: clamp(Number(value.yPct), 0, 100),
    };
  }

  if (typeof value === "string") {
    const exactMatch = value
      .toUpperCase()
      .match(/X\s*(\d+(?:\.\d+)?)\s*Y\s*(\d+(?:\.\d+)?)/);

    if (exactMatch) {
      return {
        xPct: clamp((Number(exactMatch[1]) / MAP_IMAGE_WIDTH) * 100, 0, 100),
        yPct: clamp((Number(exactMatch[2]) / MAP_IMAGE_HEIGHT) * 100, 0, 100),
      };
    }

    const match = value
      .toUpperCase()
      .match(/([A-J])\s*([1-9]|10)(?:\s*-\s*P\s*(\d{1,2}))?/);

    if (match) {
      const macroCol = MACRO_COLS.indexOf(match[1]);
      const macroRow = Number(match[2]) - 1;
      const province = clamp(Number(match[3] || 13), 1, 25);

      const provinceIndex = province - 1;
      const subCol = provinceIndex % SUBDIVISIONS;
      const subRow = Math.floor(provinceIndex / SUBDIVISIONS);

      const globalCol = macroCol * SUBDIVISIONS + subCol;
      const globalRow = macroRow * SUBDIVISIONS + subRow;

      return {
        xPct: ((globalCol + 0.5) / TOTAL_SMALL_COLS) * 100,
        yPct: ((globalRow + 0.5) / TOTAL_SMALL_ROWS) * 100,
      };
    }
  }

  return fallbackPoint();
}

function pointToCoord(point) {
  const normalized = normalizePoint(point);

  const x = clamp(normalized.xPct, 0, 99.9999);
  const y = clamp(normalized.yPct, 0, 99.9999);

  const globalCol = clamp(
    Math.floor((x / 100) * TOTAL_SMALL_COLS),
    0,
    TOTAL_SMALL_COLS - 1
  );

  const globalRow = clamp(
    Math.floor((y / 100) * TOTAL_SMALL_ROWS),
    0,
    TOTAL_SMALL_ROWS - 1
  );

  const macroCol = Math.floor(globalCol / SUBDIVISIONS);
  const macroRow = Math.floor(globalRow / SUBDIVISIONS);

  const subCol = globalCol % SUBDIVISIONS;
  const subRow = globalRow % SUBDIVISIONS;

  const province = subRow * SUBDIVISIONS + subCol + 1;
  const macro = `${MACRO_COLS[macroCol]}${macroRow + 1}`;

  return {
    macro,
    province,
    full: `${macro}-P${province}`,
  };
}

function pointToExactCoord(point) {
  const normalized = normalizePoint(point);

  const x = Math.round((normalized.xPct / 100) * MAP_IMAGE_WIDTH);
  const y = Math.round((normalized.yPct / 100) * MAP_IMAGE_HEIGHT);

  return {
    x,
    y,
    full: `X${x} Y${y}`,
    percent: `${normalized.xPct.toFixed(2)}% / ${normalized.yPct.toFixed(2)}%`,
  };
}

function buildCoordinateCells() {
  const cells = [];

  for (let row = 0; row < MACRO_ROWS; row += 1) {
    for (let col = 0; col < MACRO_COLS.length; col += 1) {
      cells.push({
        key: `${MACRO_COLS[col]}${row + 1}`,
        label: `${MACRO_COLS[col]}${row + 1}`,
        left: `${(col / MACRO_COLS.length) * 100}%`,
        top: `${(row / MACRO_ROWS) * 100}%`,
        width: `${100 / MACRO_COLS.length}%`,
        height: `${100 / MACRO_ROWS}%`,
      });
    }
  }

  return cells;
}

function calculateDistance(startPoint, endPoint) {
  const a = normalizePoint(startPoint);
  const b = normalizePoint(endPoint);

  const dx = ((b.xPct - a.xPct) / 100) * TOTAL_SMALL_COLS;
  const dy = ((b.yPct - a.yPct) / 100) * TOTAL_SMALL_ROWS;

  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

function calculateDurationHours(distance, mode) {
  const currentMode = TRAVEL_MODES[mode] || TRAVEL_MODES.terrestre;
  if (mode === "teletransporte") return 0;
  return Math.round(distance * currentMode.hoursPerProvince * 100) / 100;
}

function formatHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return "imediato";

  if (hours < 24) {
    return `${Math.ceil(hours)}h`;
  }

  const days = Math.floor(hours / 24);
  const rest = Math.ceil(hours % 24);

  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}

function getProgress(travel, now) {
  if (!travel || !travel.startedAt) return 0;
  if (!travel.durationHours || travel.durationHours <= 0) return 1;

  const startedAt = new Date(travel.startedAt).getTime();
  const durationMs = travel.durationHours * 60 * 60 * 1000;

  return clamp((now - startedAt) / durationMs, 0, 1);
}

function interpolatePoint(startPoint, endPoint, progress) {
  const a = normalizePoint(startPoint);
  const b = normalizePoint(endPoint);

  return {
    xPct: a.xPct + (b.xPct - a.xPct) * progress,
    yPct: a.yPct + (b.yPct - a.yPct) * progress,
  };
}

function markerStyle(point) {
  const normalized = normalizePoint(point);

  return {
    left: `${normalized.xPct}%`,
    top: `${normalized.yPct}%`,
  };
}

function getPingIconPath(iconKey) {
  return MAP_PING_ICON_PATHS[iconKey] || MAP_PING_ICON_PATHS.desconhecido;
}

function pingToPoint(ping) {
  if (
    Number.isFinite(Number(ping?.xPct)) &&
    Number.isFinite(Number(ping?.yPct))
  ) {
    return normalizePoint(ping);
  }

  if (
    Number.isFinite(Number(ping?.lng)) &&
    Number.isFinite(Number(ping?.lat))
  ) {
    return {
      xPct: clamp((Number(ping.lng) / MAP_IMAGE_WIDTH) * 100, 0, 100),
      yPct: clamp((Number(ping.lat) / MAP_IMAGE_HEIGHT) * 100, 0, 100),
    };
  }

  return normalizePoint(ping?.coord_label || ping?.macro_label || "");
}

function pointToMapLatLng(point) {
  const normalized = normalizePoint(point);

  return {
    lng: Math.round((normalized.xPct / 100) * MAP_IMAGE_WIDTH * 100) / 100,
    lat: Math.round((normalized.yPct / 100) * MAP_IMAGE_HEIGHT * 100) / 100,
  };
}

function isVisiblePing(ping) {
  if (!ping) return false;
  if (ping.status === "archived") return false;
  if (ping.visibility === "admin") return false;
  return true;
}

export default function TravelPageV2({
  characters = [],
  selectedCharacterId = "",
  onSelectedCharacterChange,
  onBackToHall,
}) {
  const normalizedCharacters = useMemo(
    () => (characters || []).map(normalizeCharacter),
    [characters]
  );

  const [state, setState] = useState(() => readState());
  const [internalSelectedId, setInternalSelectedId] = useState("");
  const [travelMode, setTravelMode] = useState("terrestre");
  const [destinationMode, setDestinationMode] = useState("livre");
  const [destinationPoint, setDestinationPoint] = useState(null);
  const [pursuitTargetId, setPursuitTargetId] = useState("");
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showPings, setShowPings] = useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [mapPings, setMapPings] = useState([]);
  const [selectedPing, setSelectedPing] = useState(null);
  const [now, setNow] = useState(Date.now());

  const coordinateCells = useMemo(() => buildCoordinateCells(), []);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    moved: false,
  });

  const selectedId =
    selectedCharacterId ||
    internalSelectedId ||
    normalizedCharacters[0]?.id ||
    "";

  const selectedCharacter =
    normalizedCharacters.find((character) => character.id === selectedId) ||
    normalizedCharacters[0] ||
    null;

  const pursuitTargets = normalizedCharacters.filter(
    (character) => character.id !== selectedId
  );

  const pursuitTarget =
    pursuitTargets.find((character) => character.id === pursuitTargetId) ||
    pursuitTargets[0] ||
    null;

  const activeTravel = selectedId ? state.travels?.[selectedId] : null;

  const savedLocation =
    selectedId && state.characterLocations?.[selectedId]
      ? state.characterLocations[selectedId]
      : selectedCharacter?.location || "D5-P13";

  const originPoint = activeTravel
    ? normalizePoint(activeTravel.startPoint)
    : normalizePoint(savedLocation);

  const endTravelPoint = activeTravel
    ? normalizePoint(activeTravel.endPoint)
    : null;

  const progress = activeTravel ? getProgress(activeTravel, now) : 0;

  const currentPoint =
    activeTravel && endTravelPoint
      ? interpolatePoint(originPoint, endTravelPoint, progress)
      : originPoint;

  const pursuitDestinationPoint = pursuitTarget
    ? normalizePoint(
        state.characterLocations?.[pursuitTarget.id] ||
          pursuitTarget.location ||
          "D5-P13"
      )
    : null;

  const effectiveDestinationPoint =
    destinationMode === "perseguicao" ? pursuitDestinationPoint : destinationPoint;

  const currentCoord = pointToCoord(currentPoint);
  const currentExactCoord = pointToExactCoord(currentPoint);

  const destinationCoord = effectiveDestinationPoint
    ? pointToCoord(effectiveDestinationPoint)
    : null;

  const destinationExactCoord = effectiveDestinationPoint
    ? pointToExactCoord(effectiveDestinationPoint)
    : null;

  const selectedPingPoint = selectedPing ? pingToPoint(selectedPing) : null;
  const selectedPingCoord = selectedPingPoint ? pointToCoord(selectedPingPoint) : null;
  const selectedPingExactCoord = selectedPingPoint ? pointToExactCoord(selectedPingPoint) : null;
  const selectedPingMapLatLng = selectedPingPoint
    ? pointToMapLatLng(selectedPingPoint)
    : null;

  const plannedDistance = effectiveDestinationPoint
    ? calculateDistance(currentPoint, effectiveDestinationPoint)
    : 0;

  const plannedDuration = calculateDurationHours(plannedDistance, travelMode);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    async function loadPings() {
      if (!isSupabaseConfigured || !supabase) {
        setMapPings([]);
        return;
      }

      const { data, error } = await supabase
        .from("map_pings")
        .select("id,title,type,icon_key,description,image_url,lat,lng,coord_label,macro_label,visibility,status,created_at")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Erro ao carregar pings do mapa:", error.message);
        setMapPings([]);
        return;
      }

      setMapPings((data || []).filter(isVisiblePing));
    }

    loadPings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setState((currentState) => {
      let changed = false;

      const next = {
        characterLocations: { ...currentState.characterLocations },
        travels: { ...currentState.travels },
      };

      for (const [characterId, travel] of Object.entries(currentState.travels || {})) {
        if (getProgress(travel, now) >= 1) {
          const finalPoint = normalizePoint(travel.endPoint);
          const finalCoord = pointToCoord(finalPoint);
          const finalExactCoord = pointToExactCoord(finalPoint);

          next.characterLocations[characterId] = {
            xPct: finalPoint.xPct,
            yPct: finalPoint.yPct,
            label: finalExactCoord.full,
            macroLabel: finalCoord.full,
          };

          delete next.travels[characterId];
          changed = true;
        }
      }

      return changed ? next : currentState;
    });
  }, [now]);

  useEffect(() => {
    if (!pursuitTargetId && pursuitTargets[0]?.id) {
      setPursuitTargetId(pursuitTargets[0].id);
    }
  }, [pursuitTargetId, pursuitTargets]);

  function handleCharacterChange(nextId) {
    setInternalSelectedId(nextId);
    onSelectedCharacterChange?.(nextId);
    setDestinationPoint(null);
    setSelectedPing(null);
  }

  function handleMapClick(event) {
    if (!selectedCharacter) return;
    if (destinationMode !== "livre") return;
    if (dragRef.current.moved) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xPct = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPct = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);

    setDestinationPoint({ xPct, yPct });
    setSelectedPing(null);
  }

  function setDestinationFromPing(ping) {
    const point = pingToPoint(ping);
    setDestinationMode("livre");
    setDestinationPoint(point);
    setSelectedPing(ping);
  }

  function startTravel() {
    if (!selectedCharacter || !effectiveDestinationPoint) return;

    const startPoint = normalizePoint(currentPoint);
    const endPoint = normalizePoint(effectiveDestinationPoint);

    const startCoord = pointToCoord(startPoint);
    const endCoord = pointToCoord(endPoint);

    const startExactCoord = pointToExactCoord(startPoint);
    const endExactCoord = pointToExactCoord(endPoint);

    const distance = calculateDistance(startPoint, endPoint);
    const durationHours = calculateDurationHours(distance, travelMode);

    setState((currentState) => {
      const next = {
        characterLocations: { ...currentState.characterLocations },
        travels: { ...currentState.travels },
      };

      if (travelMode === "teletransporte" || durationHours <= 0) {
        next.characterLocations[selectedCharacter.id] = {
          xPct: endPoint.xPct,
          yPct: endPoint.yPct,
          label: endExactCoord.full,
          macroLabel: endCoord.full,
        };
        delete next.travels[selectedCharacter.id];
        return next;
      }

      next.characterLocations[selectedCharacter.id] = {
        xPct: startPoint.xPct,
        yPct: startPoint.yPct,
        label: startExactCoord.full,
        macroLabel: startCoord.full,
      };

      next.travels[selectedCharacter.id] = {
        characterId: selectedCharacter.id,
        characterName: selectedCharacter.name,
        mode: travelMode,
        modeLabel: TRAVEL_MODES[travelMode]?.label || travelMode,
        travelKind: destinationMode === "perseguicao" ? "pursuit" : "travel",
        targetCharacterId: destinationMode === "perseguicao" ? pursuitTarget?.id : "",
        targetCharacterName: destinationMode === "perseguicao" ? pursuitTarget?.name : "",
        startPoint,
        endPoint,
        startLabel: startExactCoord.full,
        endLabel: endExactCoord.full,
        startMacroLabel: startCoord.full,
        endMacroLabel: endCoord.full,
        distance,
        durationHours,
        startedAt: new Date().toISOString(),
      };

      return next;
    });

    if (destinationMode === "livre") {
      setDestinationPoint(null);
    }

    setNow(Date.now());
  }

  function cancelTravel() {
    if (!selectedCharacter || !activeTravel) return;

    const stoppedPoint = normalizePoint(currentPoint);
    const stoppedCoord = pointToCoord(stoppedPoint);
    const stoppedExactCoord = pointToExactCoord(stoppedPoint);

    setState((currentState) => {
      const next = {
        characterLocations: { ...currentState.characterLocations },
        travels: { ...currentState.travels },
      };

      next.characterLocations[selectedCharacter.id] = {
        xPct: stoppedPoint.xPct,
        yPct: stoppedPoint.yPct,
        label: stoppedExactCoord.full,
        macroLabel: stoppedCoord.full,
      };

      delete next.travels[selectedCharacter.id];

      return next;
    });

    setNow(Date.now());
  }

  function zoomIn() {
    setZoom((current) =>
      clamp(Math.round((current + ZOOM_STEP) * 100) / 100, MIN_ZOOM, MAX_ZOOM)
    );
  }

  function zoomOut() {
    setZoom((current) =>
      clamp(Math.round((current - ZOOM_STEP) * 100) / 100, MIN_ZOOM, MAX_ZOOM)
    );
  }

  function resetCamera() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleWheel(event) {
    event.preventDefault();

    const direction = event.deltaY > 0 ? -1 : 1;
    const nextZoom = clamp(
      Math.round((zoom + direction * ZOOM_STEP) * 100) / 100,
      MIN_ZOOM,
      MAX_ZOOM
    );

    setZoom(nextZoom);
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;

    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      moved: false,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragRef.current.active) return;

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
    }

    if (zoom <= 1 && !dragRef.current.moved) return;

    setPan({
      x: dragRef.current.startPanX + dx,
      y: dragRef.current.startPanY + dy,
    });
  }

  function handlePointerUp(event) {
    if (dragRef.current.active) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    const wasMoved = dragRef.current.moved;

    dragRef.current = {
      ...dragRef.current,
      active: false,
      moved: wasMoved,
    };

    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 80);
  }

  return (
    <section className="lnv2-page">
      <div className="lnv2-map-shell">
        <div className="lnv2-map-frame">
          <div className="lnv2-map-camera" onWheel={handleWheel}>
            <div
              className="lnv2-map-stage"
              onClick={handleMapClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              <img
                className="lnv2-map-image"
                src={MAP_IMAGE_URL}
                alt="Mapa original da Legendary Ninja"
                width={MAP_IMAGE_WIDTH}
                height={MAP_IMAGE_HEIGHT}
                draggable="false"
              />

              {showCoordinates && (
                <div className="lnv2-coordinate-overlay" aria-hidden="true">
                  {coordinateCells.map((cell) => (
                    <div
                      key={cell.key}
                      className="lnv2-coordinate-cell"
                      style={{
                        left: cell.left,
                        top: cell.top,
                        width: cell.width,
                        height: cell.height,
                      }}
                    >
                      <span>{cell.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {showPings &&
                mapPings.map((ping) => {
                  const point = pingToPoint(ping);

                  return (
                    <button
                      key={ping.id}
                      type="button"
                      className={`lnv2-map-ping ${selectedPing?.id === ping.id ? "is-selected" : ""}`}
                      style={markerStyle(point)}
                      title={ping.title || "Local do mapa"}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedPing(ping);
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedPing(ping);
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedPing(ping);
                      }}
                    >
                      <img src={getPingIconPath(ping.icon_key)} alt="" draggable="false" />
                    </button>
                  );
                })}

              {selectedPing && selectedPingPoint && (
                <article
                  className="lnv2-map-ping-card"
                  style={markerStyle(selectedPingPoint)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="lnv2-map-ping-card-close"
                    onClick={() => setSelectedPing(null)}
                    aria-label="Fechar ping"
                  >
                    ×
                  </button>

                  <p>{selectedPing.type || "Local"}</p>
                  <strong>{selectedPing.title || "Local sem nome"}</strong>

                  <span>
                    {selectedPing.coord_label ||
                      selectedPing.macro_label ||
                      selectedPingCoord?.full ||
                      selectedPingExactCoord?.full}
                  </span>

                  <button
                    type="button"
                    className="lnv2-map-ping-card-action"
                    onClick={() => setDestinationFromPing(selectedPing)}
                  >
                    Viajar para cá
                  </button>
                </article>
              )}

              {activeTravel && (
                <svg
                  className="lnv2-route-svg"
                  viewBox={`0 0 ${MAP_IMAGE_WIDTH} ${MAP_IMAGE_HEIGHT}`}
                  preserveAspectRatio="none"
                >
                  <line
                    x1={(normalizePoint(activeTravel.startPoint).xPct / 100) * MAP_IMAGE_WIDTH}
                    y1={(normalizePoint(activeTravel.startPoint).yPct / 100) * MAP_IMAGE_HEIGHT}
                    x2={(normalizePoint(activeTravel.endPoint).xPct / 100) * MAP_IMAGE_WIDTH}
                    y2={(normalizePoint(activeTravel.endPoint).yPct / 100) * MAP_IMAGE_HEIGHT}
                  />
                </svg>
              )}

              <div
                className="lnv2-character-marker"
                style={markerStyle(currentPoint)}
                title={selectedCharacter?.name || "Personagem"}
              >
                {selectedCharacter?.iconUrl ? (
                  <img src={selectedCharacter.iconUrl} alt="" />
                ) : (
                  <span>{selectedCharacter?.name?.slice(0, 1) || "N"}</span>
                )}
              </div>

              {effectiveDestinationPoint && (
                <div
                  className="lnv2-destination-marker"
                  style={markerStyle(effectiveDestinationPoint)}
                  title={destinationExactCoord?.full || "Destino"}
                >
                  <span />
                </div>
              )}

              {pursuitDestinationPoint && destinationMode === "perseguicao" && pursuitTarget && (
                <div
                  className="lnv2-pursuit-target-marker"
                  style={markerStyle(pursuitDestinationPoint)}
                  title={`Alvo: ${pursuitTarget.name}`}
                >
                  <span>{pursuitTarget.name.slice(0, 1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <header className="lnv2-header">
        <button type="button" className="lnv2-back" onClick={onBackToHall}>
          Voltar pro Hall
        </button>

        <div>
          <p className="lnv2-kicker">LN Digital</p>
          <h1>Viagens</h1>
          <span>Viagem livre por coordenada exata · pings · perseguição.</span>
        </div>
      </header>

      <button
        type="button"
        className="lnv2-panel-toggle"
        onClick={() => setIsPanelCollapsed((current) => !current)}
      >
        {isPanelCollapsed ? "Abrir opções" : "Recolher opções"}
      </button>

      <aside className={`lnv2-panel ${isPanelCollapsed ? "is-collapsed" : ""}`}>
        <div className="lnv2-card">
          <label className="lnv2-label" htmlFor="lnv2-character">
            Personagem
          </label>

          <select
            id="lnv2-character"
            className="lnv2-select"
            value={selectedId}
            onChange={(event) => handleCharacterChange(event.target.value)}
          >
            {normalizedCharacters.length === 0 && (
              <option value="">Nenhum personagem encontrado</option>
            )}

            {normalizedCharacters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>

          {selectedCharacter && (
            <div className="lnv2-character-box">
              <div className="lnv2-avatar">
                {selectedCharacter.iconUrl ? (
                  <img src={selectedCharacter.iconUrl} alt="" />
                ) : (
                  <span>{selectedCharacter.name.slice(0, 1)}</span>
                )}
              </div>

              <div>
                <strong>{selectedCharacter.name}</strong>
                <small>Local: {currentExactCoord.full}</small>
                <small className="lnv2-mini-line">Ref.: {currentCoord.full}</small>
              </div>
            </div>
          )}
        </div>

        <div className="lnv2-card">
          <p className="lnv2-label">Destino</p>

          <div className="lnv2-destination-mode">
            <button
              type="button"
              className={destinationMode === "livre" ? "is-active" : ""}
              onClick={() => setDestinationMode("livre")}
            >
              Livre
            </button>

            <button
              type="button"
              className={destinationMode === "perseguicao" ? "is-active" : ""}
              onClick={() => setDestinationMode("perseguicao")}
            >
              Perseguição
            </button>
          </div>

          {destinationMode === "perseguicao" && (
            <div className="lnv2-pursuit-box">
              <label className="lnv2-label" htmlFor="lnv2-pursuit-target">
                Alvo
              </label>

              <select
                id="lnv2-pursuit-target"
                className="lnv2-select"
                value={pursuitTarget?.id || ""}
                onChange={(event) => setPursuitTargetId(event.target.value)}
                disabled={pursuitTargets.length === 0}
              >
                {pursuitTargets.length === 0 && (
                  <option value="">Nenhum alvo disponível</option>
                )}

                {pursuitTargets.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>

              <small className="lnv2-help-text">
                Nesta etapa, a perseguição mira a posição atual do alvo. Depois ela será transformada em destino móvel.
              </small>
            </div>
          )}
        </div>

        <div className="lnv2-card">
          <label className="lnv2-label">Meio de locomoção</label>

          <div className="lnv2-mode-grid">
            {Object.entries(TRAVEL_MODES).map(([key, config]) => (
              <button
                key={key}
                type="button"
                className={`lnv2-mode ${travelMode === key ? "is-active" : ""}`}
                onClick={() => setTravelMode(key)}
              >
                <strong>{config.label}</strong>
                <span>{config.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lnv2-card">
          <p className="lnv2-label">Viagem planejada</p>

          <div className="lnv2-summary">
            <div>
              <span>Origem</span>
              <strong>{currentExactCoord.full}</strong>
            </div>

            <div>
              <span>Destino</span>
              <strong>{destinationExactCoord?.full || "Clique no mapa"}</strong>
            </div>

            <div>
              <span>Referência</span>
              <strong>{destinationCoord?.full || "—"}</strong>
            </div>

            <div>
              <span>Tempo</span>
              <strong>{effectiveDestinationPoint ? formatHours(plannedDuration) : "—"}</strong>
            </div>
          </div>

          <button
            type="button"
            className="lnv2-primary"
            onClick={startTravel}
            disabled={!selectedCharacter || !effectiveDestinationPoint}
          >
            {destinationMode === "perseguicao" ? "Iniciar perseguição" : "Iniciar viagem"}
          </button>

          {activeTravel && (
            <button type="button" className="lnv2-secondary" onClick={cancelTravel}>
              Cancelar viagem no ponto atual
            </button>
          )}
        </div>

        <div className="lnv2-card lnv2-status-card">
          <p className="lnv2-label">Status</p>

          {activeTravel ? (
            <>
              <strong>
                {activeTravel.travelKind === "pursuit" ? "Perseguindo" : "Em rota"} para{" "}
                {activeTravel.endLabel} via {activeTravel.modeLabel}
              </strong>
              <span>
                Progresso: {Math.round(progress * 100)}% · restante{" "}
                {formatHours(activeTravel.durationHours * (1 - progress))}
              </span>
            </>
          ) : (
            <>
              <strong>Parado no mapa</strong>
              <span>O personagem permanece visível na última coordenada salva.</span>
            </>
          )}
        </div>
      </aside>

      {selectedPing && (
        <section className="lnv2-ping-panel">
          <button
            type="button"
            className="lnv2-ping-close"
            onClick={() => setSelectedPing(null)}
            aria-label="Fechar ping"
          >
            ×
          </button>

          {selectedPing.image_url && (
            <img src={selectedPing.image_url} alt="" className="lnv2-ping-image" />
          )}

          <p className="lnv2-label">Local do mapa</p>
          <h2>{selectedPing.title || "Local sem nome"}</h2>

          <span>
            {selectedPing.coord_label ||
              selectedPing.macro_label ||
              selectedPingCoord?.full ||
              selectedPingExactCoord?.full}
          </span>

          {selectedPingMapLatLng && (
            <small className="lnv2-ping-debug">
              Mapa: lat {selectedPingMapLatLng.lat} · lng {selectedPingMapLatLng.lng}
            </small>
          )}

          {selectedPing.description && <p>{selectedPing.description}</p>}

          <button
            type="button"
            className="lnv2-primary"
            onClick={() => setDestinationFromPing(selectedPing)}
          >
            Viajar para este ponto
          </button>
        </section>
      )}

      <div className="lnv2-current-pill">
        Atual: {currentExactCoord.full}
      </div>

      <div className="lnv2-map-tools">
        <button
          type="button"
          className={showCoordinates ? "is-active" : ""}
          onClick={() => setShowCoordinates((current) => !current)}
        >
          Coordenadas
        </button>

        <button
          type="button"
          className={showPings ? "is-active" : ""}
          onClick={() => setShowPings((current) => !current)}
        >
          Pings
        </button>

        <button type="button" onClick={zoomIn}>+</button>
        <button type="button" onClick={zoomOut}>−</button>
        <button type="button" onClick={resetCamera}>⌖</button>

        <span>{Math.round(zoom * 100)}%</span>
      </div>
    </section>
  );
}
