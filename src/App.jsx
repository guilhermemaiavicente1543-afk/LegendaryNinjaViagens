import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Polyline,
  Polygon,
  CircleMarker,
  Tooltip,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { CRS, divIcon } from "leaflet";
import { DEFAULT_LAND_POLYGONS } from "./data/mapTerrainPolygons";
import { getTerrainAtPoint } from "./lib/map/lnTerrainEngine";
import "leaflet/dist/leaflet.css";
import "./App.css";
import "./styles/hall-back-button.css";
import AuthPage from "./components/auth/AuthPage";
import AdminPanel from "./components/admin/AdminPanel";
import SkillTreePage from "./components/SkillTreePage";
import EntryHall from "./components/EntryHall";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import SoundtrackPlayer from "./components/audio/SoundtrackPlayer";
import PasswordRecoveryWidget from "./components/auth/PasswordRecoveryWidget";
import ShinobiDexPage from "./components/shinobidex/ShinobiDexPage";
import AncedCalculatorPage from "./components/anced/AncedCalculatorPage";
import LegendsPage from "./components/legends/LegendsPage";
import PlayerKnowledgeAssistant from "./components/knowledge/PlayerKnowledgeAssistant";
import LnSelect from "./components/ui/LnSelect";
import MyNinjaCleanPage from "./components/MyNinjaCleanPage";
import HallBackButton from "./components/ui/HallBackButton";

const CREATE_NINJA_AFTER_AUTH_KEY = "ln-create-ninja-after-auth";

/*
  Mapa com grade:
  largura: 1080px
  altura: 903px

  Sistema:
  - Colunas grandes: A-J
  - Linhas grandes: 1-10
  - Cada bloco grande: 5 x 5 províncias
  - Distância: diagonal = 1.41
  - 1 província = 5 províncias
  - Aéreo: 5 províncias = 6 horas
  - Aquático: 5 províncias = 9 horas
  - Terrestre: 5 províncias = 12 horas
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

const UNIT_PER_SMALL_SQUARE = 1;
const UNIT_NAME = "província";
const DIAGONAL_COST = 1.41;

const TRAVEL_MODES = {
  terrestre: {
    label: "Terrestre",
    hoursPerProvince: 12,
    hoursPerFiveFeet: 12,
  },
  aquatico: {
    label: "Aquático",
    hoursPerProvince: 9,
    hoursPerFiveFeet: 9,
  },
  terrestre_aquatico: {
    label: "Terrestre + Aquático",
    hoursPerProvince: 0,
    hoursPerFiveFeet: 0,
    hybridTerrain: true,
  },
  aereo: {
    label: "Aéreo",
    hoursPerProvince: 6,
    hoursPerFiveFeet: 6,
  },
  teletransporte: {
    label: "Teletransporte",
    hoursPerProvince: 0,
    hoursPerFiveFeet: 0,
    instant: true,
  },
};

const MAP_IMAGE_WITH_GRID = "/mapa-coordenado.jpg";
const MAP_IMAGE_CLEAN = "/mapa-limpo.png";

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

  useEffect(() => {
    map.fitBounds(imageBounds, {
      padding: [10, 10],
      animate: false,
    });
  }, [map]);

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

  // O eixo Y do Leaflet/CRS.Simple fica invertido em relação à leitura visual do mapa.
  // Por isso, para a escala do RPG, o cálculo vertical precisa começar no topo visual.
  const relYFromTop = GRID_BOTTOM - y;

  const macroCol = Math.min(MACRO_COLS - 1, Math.floor(relX / macroCellWidth));
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

  // Linha visual da macro-região: topo = 1, depois 2, 3...
  const displayMacroRow = macroRow + 1;

  // Províncias sequenciais por linha:
  // topo: P1, P2, P3, P4, P5
  // linha abaixo: P6, P7, P8, P9, P10...
  const provinceNumber =
    (subRow - 1) * SUBDIVISIONS + subCol;

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


function getSmallCellCenter(coord) {
  return [
    GRID_BOTTOM - (coord.globalSmallRow + 0.5) * smallCellHeight,
    GRID_LEFT + (coord.globalSmallCol + 0.5) * smallCellWidth,
  ];
}


function calculateTravel(a, b, travelMode) {
  const dx = Math.abs(Number(a?.globalSmallCol ?? 0) - Number(b?.globalSmallCol ?? 0));
  const dy = Math.abs(Number(a?.globalSmallRow ?? 0) - Number(b?.globalSmallRow ?? 0));

  const diagonals = Math.min(dx, dy);
  const straights = Math.max(dx, dy) - diagonals;

  const smallSquares = diagonals * DIAGONAL_COST + straights;
  const feet = smallSquares * UNIT_PER_SMALL_SQUARE;

  const selectedMode = TRAVEL_MODES[travelMode] || TRAVEL_MODES.terrestre;
  const hoursPerProvince = Number(
    selectedMode.hoursPerProvince ?? selectedMode.hoursPerFiveFeet ?? 0
  );

  const hours = selectedMode.instant ? 0 : smallSquares * hoursPerProvince;
  const days = hours / 24;

  return {
    dx,
    dy,
    diagonals,
    straights,
    smallSquares,
    macroBlocks: smallSquares,
    feet,
    provinces: smallSquares,
    hours,
    days,
    modeKey: travelMode,
    modeLabel: selectedMode.label,
    hoursPerProvince,
    hoursPerFiveFeet: hoursPerProvince,
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


const CHARACTER_STORAGE_KEY = "legendary-ninja-characters";
const TRAVEL_STORAGE_KEY = "legendary-ninja-travels";
const TERRAIN_POLYGONS_STORAGE_KEY = "ln-map-terrain-polygons-v1";

function readSavedTerrainPolygons() {
  if (typeof localStorage === "undefined") {
    return DEFAULT_LAND_POLYGONS;
  }

  try {
    const raw = localStorage.getItem(TERRAIN_POLYGONS_STORAGE_KEY);
    if (!raw) return DEFAULT_LAND_POLYGONS;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_LAND_POLYGONS;
  } catch {
    return DEFAULT_LAND_POLYGONS;
  }
}

function saveTerrainPolygonsToStorage(polygons) {
  if (typeof localStorage === "undefined") return;

  localStorage.setItem(TERRAIN_POLYGONS_STORAGE_KEY, JSON.stringify(polygons || []));
}

// Em produção, deixe 1.
// Para teste rápido, você pode trocar para 3600, fazendo 1 segundo real valer 1 hora de viagem.
const TRAVEL_TIME_MULTIPLIER = 1;

function readSavedCharacters() {
  try {
    return JSON.parse(localStorage.getItem(CHARACTER_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}


function parseCharacterTraitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function dbCharacterToAppCharacter(row, currentUser) {
  if (!row) return null;

  const selectedTraits = parseCharacterTraitList(
    row.selected_traits ?? row.selectedTraits ?? row.unique_trait ?? row.uniqueTrait
  );

  return {
    id: row.id || row.user_id || currentUser?.id || crypto.randomUUID(),
    userId: row.user_id || row.userId || currentUser?.id || "",
    ownerEmail: row.owner_email || row.ownerEmail || currentUser?.email || "",
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || row.created_at || "",

    playerName: row.player_name || row.playerName || "",
    phone: row.phone || "",
    characterName: row.character_name || row.characterName || "",
    age: row.age || "",
    gender: row.gender || "",
    birthday: row.birthday || "",
    height: row.height || "",
    weight: row.weight || "",

    villageOrOrganization: row.village_or_organization || row.villageOrOrganization || "",
    villageOrOrganizationOther: row.village_or_organization_other || row.villageOrOrganizationOther || "",
    clanOrKinship: row.clan_or_kinship || row.clanOrKinship || "",
    kekkeiGenkaiOrHiden: row.kekkei_genkai_or_hiden || row.kekkeiGenkaiOrHiden || "",
    ninjaStyle: row.ninja_style || row.ninjaStyle || "",
    rank: row.rank || "",
    epithet: row.epithet || "",

    appearance: row.appearance || "",
    history: row.history || "",
    equipment: row.equipment || "",

    uniqueTrait: row.unique_trait || row.uniqueTrait || "",
    selectedTraits,
    selected_traits: selectedTraits,

    characterPhotoUrl: row.character_photo_url || row.characterPhotoUrl || row.portrait_url || "",
    mapIconUrl: row.map_icon_url || row.mapIconUrl || row.icon_url || "",
    portraitUrl: row.portrait_url || row.portraitUrl || row.character_photo_url || "",
    iconUrl: row.icon_url || row.iconUrl || row.map_icon_url || "",

    skillPoints: row.skill_points ?? row.skillPoints ?? 0,
    unlockedSkillIds: Array.isArray(row.unlocked_skill_ids) ? row.unlocked_skill_ids : [],
    currentLocation: row.current_location || row.currentLocation || null,
  };
}


function readSavedTravels() {
  try {
    return JSON.parse(localStorage.getItem(TRAVEL_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function getTravelProgress(travel, now) {
  const startedAt = new Date(travel.startedAt).getTime();
  const durationMs = travel.durationHours * 60 * 60 * 1000;

  if (!durationMs || durationMs <= 0) {
    return 1;
  }

  const elapsedMs = (now - startedAt) * TRAVEL_TIME_MULTIPLIER;
  return Math.min(Math.max(elapsedMs / durationMs, 0), 1);
}

function getTravelCurrentPoint(travel, now) {
  const progress = getTravelProgress(travel, now);

  const startLat = travel.startCenter[0];
  const startLng = travel.startCenter[1];
  const endLat = travel.endCenter[0];
  const endLng = travel.endCenter[1];

  return [
    startLat + (endLat - startLat) * progress,
    startLng + (endLng - startLng) * progress,
  ];
}

function getRemainingTravelHours(travel, now) {
  const progress = getTravelProgress(travel, now);
  return Math.max(travel.durationHours * (1 - progress), 0);
}

function getTravelCurrentCoord(travel, now) {
  const currentPoint = getTravelCurrentPoint(travel, now);

  return getCoordinate({
    lat: currentPoint[0],
    lng: currentPoint[1],
  });
}

function getUnknownPresencesCount(currentTravel, travels, now) {
  const currentCoord = getTravelCurrentCoord(currentTravel, now);

  if (!currentCoord) {
    return 0;
  }

  return travels.filter((otherTravel) => {
    if (otherTravel.id === currentTravel.id) {
      return false;
    }

    const otherCoord = getTravelCurrentCoord(otherTravel, now);

    return otherCoord && otherCoord.macroLabel === currentCoord.macroLabel;
  }).length;
}

function formatUnknownPresences(count) {
  if (count === 0) {
    return "Não há presenças desconhecidas nesta região.";
  }

  if (count === 1) {
    return "Há 1 presença desconhecida nesta região.";
  }

  return `Há ${count} presenças desconhecidas nesta região.`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createCharacterIcon(travel = {}, progress = 1) {
  const statusClass = progress >= 1 ? "arrived" : "moving";

  const rawIconUrl =
    travel.characterIconUrl ||
    travel.iconUrl ||
    travel.icon_url ||
    travel.character_icon_url ||
    travel.mapIconUrl ||
    travel.map_icon_url ||
    travel.photoUrl ||
    travel.photo_url ||
    travel.portraitUrl ||
    travel.portrait_url ||
    travel.profileImageUrl ||
    travel.profile_image_url ||
    "";

  const cleanIconUrl = String(rawIconUrl || "").trim();

  const iconUrl =
    cleanIconUrl &&
    (
      cleanIconUrl.startsWith("http://") ||
      cleanIconUrl.startsWith("https://") ||
      cleanIconUrl.startsWith("data:image/") ||
      cleanIconUrl.startsWith("blob:") ||
      cleanIconUrl.startsWith("/")
    )
      ? cleanIconUrl
      : cleanIconUrl
        ? `/${cleanIconUrl}`
        : "";

  const characterName =
    travel.characterName ||
    travel.character_name ||
    travel.name ||
    "Ninja";

  const content = iconUrl
    ? `
      <img
        src="${escapeHtml(iconUrl)}"
        alt="${escapeHtml(characterName)}"
        loading="lazy"
        referrerpolicy="no-referrer"
        onerror="this.remove(); this.closest('.characterMapIcon')?.classList.add('broken-image');"
      />
      <span class="characterMapIconFallback">忍</span>
    `
    : `<span class="characterMapIconFallback visible">忍</span>`;

  return divIcon({
    className: "characterMapIconWrapper",
    html: `<div class="characterMapIcon ${statusClass} ${iconUrl ? "has-custom-image" : "no-custom-image"}">${content}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function createUnknownPresenceIcon(showName = false) {
  return divIcon({
    className: `unknownPresenceMarkerWrapper ${showName ? "same-province" : ""}`,
    html: `
      <div class="unknownPresenceMarker">
        <span class="unknownPresenceQuestion">?</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function dedupeTravelsByCharacter(travels) {
  const map = new Map();

  for (const travel of travels) {
    if (!travel?.characterId) continue;

    const current = map.get(travel.characterId);
    const travelTime = new Date(travel.startedAt || 0).getTime();
    const currentTime = current ? new Date(current.startedAt || 0).getTime() : -1;

    if (!current || travelTime >= currentTime) {
      map.set(travel.characterId, travel);
    }
  }

  return Array.from(map.values());
}

function dbTravelToAppTravel(row) {
  return {
    id: row.id,
    characterId: row.character_id,
    characterName: row.character_name || "Ninja sem nome",
    characterIconUrl:
      row.character_icon_url ||
      row.icon_url ||
      row.iconUrl ||
      row.map_icon_url ||
      row.photo_url ||
      row.portrait_url ||
      row.profile_image_url ||
      "",
    travelMode: row.travel_mode,
    modeLabel: row.mode_label,
    startCoord: row.start_coord,
    endCoord: row.end_coord,
    startCenter: row.start_center,
    endCenter: row.end_center,
    durationHours: Number(row.duration_hours),
    durationDays: Number(row.duration_days),
    distanceFeet: Number(row.distance_feet),
    startedAt: row.started_at,
    arrivalAt: row.arrival_at,
  };
}


const CHARACTER_LOCATION_STORAGE_KEY = "legendary-ninja-character-locations";

function readCharacterLocations() {
  try {
    return JSON.parse(localStorage.getItem(CHARACTER_LOCATION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}


const CHARACTER_DIMENSION_STORAGE_KEY = "ln-character-dimension-locations";

const DIMENSION_TARGET_OPTIONS = [
  {
    value: "invocacao",
    label: "Mundo da Invocação"
  },
  {
    value: "kamui",
    label: "Kamui"
  },
  {
    value: "outra",
    label: "Outra dimensão"
  }
];

function readCharacterDimensionLocations() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CHARACTER_DIMENSION_STORAGE_KEY) || "{}"
    );

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCharacterDimensionLocations(locations) {
  localStorage.setItem(
    CHARACTER_DIMENSION_STORAGE_KEY,
    JSON.stringify(locations || {})
  );
}

function getDimensionTargetLabel(kind, customName = "") {
  const cleanName = String(customName || "").trim();

  if (kind === "invocacao") {
    return cleanName
      ? `Mundo da Invocação — ${cleanName}`
      : "Mundo da Invocação";
  }

  if (kind === "kamui") {
    return cleanName ? `Kamui — ${cleanName}` : "Kamui";
  }

  return cleanName || "Outra dimensão";
}

const MAP_PING_ICON_PATHS = {
  invocacao: "/map-ping-icons/iconinvoc.png",
  vila: "/map-ping-icons/iconvila.png",
  construcao: "/map-ping-icons/iconconstr.png",
  desconhecido: "/map-ping-icons/iconinterrogacao.png",
  alerta: "/map-ping-icons/iconexcla.png"
};

function getMapPingIconPath(iconKey = "vila") {
  return MAP_PING_ICON_PATHS[iconKey] || MAP_PING_ICON_PATHS.vila;
}

function createMapPingImageIcon(ping = {}, isSelected = false) {
  const iconPath = getMapPingIconPath(ping.icon_key);
  const size = isSelected ? 50 : 42;
  const anchorY = Math.round(size * 0.92);

  return divIcon({
    className: `map-ping-image-marker-wrapper ${isSelected ? "selected" : ""}`,
    html: `
      <div
        class="map-ping-image-marker"
        style="width:${size}px;height:${size}px;max-width:${size}px;max-height:${size}px;"
      >
        <img
          src="${iconPath}"
          alt=""
          draggable="false"
          style="width:${size}px;height:${size}px;max-width:${size}px;max-height:${size}px;object-fit:contain;display:block;"
        />
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [Math.round(size / 2), anchorY],
    tooltipAnchor: [0, -size]
  });
}


function writeCharacterLocations(locations) {
  localStorage.setItem(CHARACTER_LOCATION_STORAGE_KEY, JSON.stringify(locations));
}

export default function App() {
  const [points, setPoints] = useState([]);
  const [mapControlsVisible, setMapControlsVisible] = useState(true);
  const [terrainHudVisible, setTerrainHudVisible] = useState(false);
  const [terrainEditorEnabled, setTerrainEditorEnabled] = useState(false);
  const [terrainPolygons, setTerrainPolygons] = useState(() => readSavedTerrainPolygons());
  const [draftTerrainPoints, setDraftTerrainPoints] = useState([]);
  const [lastTerrainSample, setLastTerrainSample] = useState(null);
  const [terrainRectangleMode, setTerrainRectangleMode] = useState(false);
  const [terrainRectangleStart, setTerrainRectangleStart] = useState(null);

  useEffect(() => {
    saveTerrainPolygonsToStorage(terrainPolygons);
  }, [terrainPolygons]);

  const [travelMode, setTravelMode] = useState("terrestre");
  const [showImageGrid, setShowImageGrid] = useState(false);
  const [showOverlayGrid, setShowOverlayGrid] = useState(false);
  const [showSmallGrid, setShowSmallGrid] = useState(false);
  const [showMapPings, setShowMapPings] = useState(true);

  useEffect(() => {
    if (!showMapPings) {
      setSelectedMapPing(null);
      setMapPingImagePreview(null);
    }
  }, [showMapPings]);

  const [gridOpacity, setGridOpacity] = useState(0.5);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activePage, setActivePage] = useState("hall");
  const [showMobileMapOptions, setShowMobileMapOptions] = useState(true);
  const [travelCharacters, setTravelCharacters] = useState(() => readSavedCharacters());
  const [selectedTravelCharacterId, setSelectedTravelCharacterId] = useState("");
  const [travels, setTravels] = useState(() => readSavedTravels());
  const [mapPings, setMapPings] = useState([]);
  const [selectedMapPing, setSelectedMapPing] = useState(null);
  const [selectedPursuitPresence, setSelectedPursuitPresence] = useState(null);
  const [mapPingImagePreview, setMapPingImagePreview] = useState(null);
  const ignoreNextMapClickRef = useRef(false);
  const [characterLocations, setCharacterLocations] = useState(() =>
    readCharacterLocations()
  );
  const [dimensionLocations, setDimensionLocations] = useState(() =>
    readCharacterDimensionLocations()
  );
  const [selectedDimensionKind, setSelectedDimensionKind] = useState("invocacao");
  const [dimensionTargetName, setDimensionTargetName] = useState("");

  const [now, setNow] = useState(Date.now());
  const [session, setSession] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured);



  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setIsAuthLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    if (localStorage.getItem(CREATE_NINJA_AFTER_AUTH_KEY) === "1") {
      localStorage.removeItem(CREATE_NINJA_AFTER_AUTH_KEY);
      setActivePage("my-ninja");
      setIsPanelOpen(false);
    }
  }, [session?.user?.id]);

  async function handleLogout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }

    setSession(null);
    setIsDemoMode(false);
    setActivePage("hall");
  }

  
  async function loadOnlineCharacters() {
    if (!isSupabaseConfigured || !supabase || !session?.user) {
      setTravelCharacters(readSavedCharacters());
      return;
    }

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar personagens:", error.message);
      setTravelCharacters(readSavedCharacters());
      return;
    }

    const onlineCharacters = (data || [])
      .map((row) => dbCharacterToAppCharacter(row, session.user))
      .filter(Boolean);

    if (onlineCharacters.length > 0) {
      setTravelCharacters(onlineCharacters);
      localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(onlineCharacters));

      setSelectedTravelCharacterId((current) => current || onlineCharacters[0].id);
      return;
    }

    setTravelCharacters(readSavedCharacters());
  }

async function loadOnlineTravels() {
    if (!isSupabaseConfigured || !supabase || !session?.user) {
      return;
    }

    const { data, error } = await supabase
      .from("travels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar viagens:", error.message);
      return;
    }

    const mappedTravels = data.map(dbTravelToAppTravel);
    setTravels(mappedTravels);
    localStorage.setItem(TRAVEL_STORAGE_KEY, JSON.stringify(mappedTravels));
  }

  useEffect(() => {
    if (session?.user) {
      loadOnlineTravels();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    localStorage.setItem(TRAVEL_STORAGE_KEY, JSON.stringify(travels));
  }, [travels]);

  useEffect(() => {
    loadMapPings();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadOnlineCharacters();
      return;
    }

    setTravelCharacters(readSavedCharacters());
  }, [activePage, session?.user?.id]);

  useEffect(() => {
    if (!selectedTravelCharacterId && travelCharacters.length > 0) {
      setSelectedTravelCharacterId(travelCharacters[0].id);
    }
  }, [selectedTravelCharacterId, travelCharacters]);

  const selectedTravelCharacter = useMemo(
    () =>
      travelCharacters.find(
        (character) => character.id === selectedTravelCharacterId
      ),
    [selectedTravelCharacterId, travelCharacters]
  );

  const selectedCharacterDimension = selectedTravelCharacterId
    ? dimensionLocations[String(selectedTravelCharacterId)] || null
    : null;


  function findTravelCharacter(characterId) {
    if (!characterId) return null;

    return travelCharacters.find(
      (character) => String(character.id) === String(characterId)
    ) || null;
  }

  function getCharacterImageUrl(character) {
    if (!character) return "";

    return (
      character.iconUrl ||
      character.icon_url ||
      character.characterIconUrl ||
      character.character_icon_url ||
      character.mapIconUrl ||
      character.map_icon_url ||
      character.photoUrl ||
      character.photo_url ||
      character.portraitUrl ||
      character.portrait_url ||
      character.profileImageUrl ||
      character.profile_image_url ||
      ""
    );
  }

  function enrichTravelWithCharacterIcon(travel) {
    const linkedCharacter = findTravelCharacter(travel.characterId);

    const characterImageUrl = getCharacterImageUrl(linkedCharacter);

    return {
      ...travel,
      characterName:
        travel.characterName ||
        linkedCharacter?.characterName ||
        linkedCharacter?.character_name ||
        linkedCharacter?.name ||
        "Ninja sem nome",
      characterIconUrl:
        travel.characterIconUrl ||
        travel.iconUrl ||
        travel.icon_url ||
        travel.character_icon_url ||
        travel.mapIconUrl ||
        travel.map_icon_url ||
        travel.photoUrl ||
        travel.photo_url ||
        travel.portraitUrl ||
        travel.portrait_url ||
        travel.profileImageUrl ||
        travel.profile_image_url ||
        characterImageUrl ||
        ""
    };
  }


  function saveDimensionLocations(nextLocations) {
    setDimensionLocations(nextLocations);
    writeCharacterDimensionLocations(nextLocations);
  }

  async function startDimensionTeleport() {
    if (!selectedTravelCharacter) {
      alert("Selecione um personagem antes de viajar para outra dimensão.");
      return;
    }

    const characterId = String(selectedTravelCharacter.id);
    const currentCoord = getCurrentCoordinateForCharacter(selectedTravelCharacter.id);

    const dimensionLabel = getDimensionTargetLabel(
      selectedDimensionKind,
      dimensionTargetName
    );

    const nextLocations = {
      ...dimensionLocations,
      [characterId]: {
        characterId,
        characterName:
          selectedTravelCharacter.characterName ||
          selectedTravelCharacter.character_name ||
          selectedTravelCharacter.name ||
          "Ninja sem nome",
        kind: selectedDimensionKind,
        label: dimensionLabel,
        previousCoord: currentCoord || null,
        enteredAt: new Date().toISOString()
      }
    };

    saveDimensionLocations(nextLocations);

    setPoints([]);

    setTravels((current) =>
      current.filter((travel) => String(travel.characterId) !== characterId)
    );

    if (isSupabaseConfigured && supabase && session?.user) {
      await supabase
        .from("travels")
        .delete()
        .eq("character_id", selectedTravelCharacter.id);
    }

    alert(`${selectedTravelCharacter.characterName || "Personagem"} entrou em: ${dimensionLabel}`);
  }

  function returnFromDimension() {
    if (!selectedTravelCharacter) return;

    const characterId = String(selectedTravelCharacter.id);

    if (!dimensionLocations[characterId]) {
      alert("Este personagem não está em outra dimensão.");
      return;
    }

    const nextLocations = { ...dimensionLocations };
    delete nextLocations[characterId];

    saveDimensionLocations(nextLocations);

    alert(`${selectedTravelCharacter.characterName || "Personagem"} retornou ao mapa.`);
  }

  async function loadMapPings() {
    if (!isSupabaseConfigured || !supabase) {
      setMapPings([]);
      return;
    }

    const { data, error } = await supabase
      .from("map_pings")
      .select("*")
      .eq("visibility", "public")
      .eq("status", "active")
      .order("title", { ascending: true });

    if (error) {
      console.error("Erro ao carregar pings do mapa:", error.message);
      return;
    }

    setMapPings(data || []);
  }

  function saveCharacterLocation(characterId, coord) {
    if (!characterId || !coord) return;

    const nextLocations = {
      ...characterLocations,
      [characterId]: {
        coord,
        center: getSmallCellCenter(coord),
        updatedAt: new Date().toISOString()
      }
    };

    setCharacterLocations(nextLocations);
    writeCharacterLocations(nextLocations);
  }

  function getCenterCoordinate() {
    return getCoordinate({
      lat: GRID_TOP + gridHeight / 2,
      lng: GRID_LEFT + gridWidth / 2
    });
  }

  function getCurrentCoordinateForCharacter(characterId) {
    const existingTravel = travels.find(
      (travel) => travel.characterId === characterId
    );

    if (existingTravel) {
      const currentPoint = getTravelCurrentPoint(existingTravel, now);

      return getCoordinate({
        lat: currentPoint[0],
        lng: currentPoint[1]
      });
    }

    const savedLocation = characterLocations[characterId];

    if (savedLocation?.coord) {
      return savedLocation.coord;
    }

    return getCenterCoordinate();
  }

  function isSameProvince(a, b) {
    return (
      a &&
      b &&
      a.macroLabel === b.macroLabel &&
      a.provinceNumber === b.provinceNumber
    );
  }

  function refreshTravelCharacters() {
    setTravelCharacters(readSavedCharacters());
  }

  async function startCharacterTravel() {
    if (!selectedTravelCharacter) {
      alert("Selecione um personagem para iniciar a viagem.");
      return;
    }

    if (points.length < 1) {
      alert("Clique no destino da viagem.");
      return;
    }

    const startCoord = getCurrentCoordinateForCharacter(selectedTravelCharacter.id);
    const endCoord = points[0];

    if (!startCoord) {
      alert("Não foi possível determinar a localização atual do personagem.");
      return;
    }

    if (!endCoord) {
      alert("Selecione um destino no mapa.");
      return;
    }

    const travelData = calculateTravelForSelectedMode(startCoord, endCoord, travelMode);
    const activeTravelModifier = endCoord?.travelModifier || null;
    const travelSpeedMultiplier = Math.max(1, Number(activeTravelModifier?.multiplier || 1));
    const effectiveTravelHours = travelSpeedMultiplier > 1
      ? travelData.hours / travelSpeedMultiplier
      : travelData.hours;
    const effectiveTravelDays = effectiveTravelHours / 24;
    const startedAt = new Date().toISOString();
    const arrivalAt = new Date(
      Date.now() + effectiveTravelHours * 60 * 60 * 1000
    ).toISOString();

    const newTravel = {
      id: crypto.randomUUID(),
      characterId: selectedTravelCharacter.id,
      characterName: selectedTravelCharacter.characterName,
      characterIconUrl: getCharacterImageUrl(selectedTravelCharacter),
      travelMode: travelData.modeKey || travelMode,
      terrainSegments: travelData.terrainSegments || [],
      landProvinces: travelData.landProvinces || 0,
      waterProvinces: travelData.waterProvinces || 0,
      landHours: travelData.landHours || 0,
      waterHours: travelData.waterHours || 0,
      modeLabel: activeTravelModifier
        ? `${travelData.modeLabel} (${activeTravelModifier.label || "modificador"} ×${travelSpeedMultiplier})`
        : travelData.modeLabel,
      travelModifier: activeTravelModifier,
      pursuitTarget: endCoord?.pursuitTarget || null,
      normalDurationHours: travelData.hours,
      speedMultiplier: travelSpeedMultiplier,
      startCoord,
      endCoord,
      startCenter: getSelectedPointCenter(startCoord),
      endCenter: getSelectedPointCenter(endCoord),
      durationHours: effectiveTravelHours,
      durationDays: effectiveTravelDays,
      distanceFeet: travelData.feet,
      startedAt,
      arrivalAt,
    };

    const selectedTravelCharacterIdForTravel = String(selectedTravelCharacter.id);

    const shouldCancelPreviousTravel = (currentTravel) =>
      String(currentTravel.characterId) === selectedTravelCharacterIdForTravel &&
      getTravelProgress(currentTravel, now) < 1;

    const hasPreviousUnfinishedTravel = travels.some(shouldCancelPreviousTravel);

    if (hasPreviousUnfinishedTravel) {
      setTravels((currentTravels) =>
        currentTravels.filter((currentTravel) => !shouldCancelPreviousTravel(currentTravel))
      );
    }

    saveCharacterLocation(selectedTravelCharacter.id, endCoord);

    if (hasPreviousUnfinishedTravel && isSupabaseConfigured && supabase && session?.user) {
      const { error: cancelPreviousTravelError } = await supabase
        .from("travels")
        .delete()
        .eq("character_id", selectedTravelCharacter.id)
        .eq("status", "active");

      if (cancelPreviousTravelError) {
        console.error(
          "Erro ao cancelar viagem anterior antes de iniciar nova viagem:",
          cancelPreviousTravelError.message
        );
      }
    }

    if (isSupabaseConfigured && supabase && session?.user) {
      await supabase
        .from("travels")
        .delete()
        .eq("character_id", selectedTravelCharacter.id);

      const payload = {
        character_id: selectedTravelCharacter.id,
        user_id: session.user.id,
        character_name: selectedTravelCharacter.characterName,
        character_icon_url: getCharacterImageUrl(selectedTravelCharacter),
        travel_mode: travelData.modeKey || travelMode,
        mode_label: activeTravelModifier
          ? `${travelData.modeLabel} (${activeTravelModifier.label || "modificador"} ×${travelSpeedMultiplier})`
          : travelData.modeLabel,
        start_coord: startCoord,
        end_coord: endCoord,
        start_center: getSelectedPointCenter(startCoord),
        end_center: getSelectedPointCenter(endCoord),
        duration_hours: effectiveTravelHours,
        duration_days: effectiveTravelDays,
        distance_feet: travelData.feet,
        started_at: startedAt,
        arrival_at: arrivalAt,
      };

      const { data, error } = await supabase
        .from("travels")
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert(`Erro ao salvar viagem online: ${error.message}`);
        return;
      }

      const savedTravel = dbTravelToAppTravel(data);

      setTravels((currentTravels) => [
        savedTravel,
        ...currentTravels.filter(
          (travel) => travel.characterId !== selectedTravelCharacter.id
        ),
      ]);

      setPoints([]);
      return;
    }

    setTravels((currentTravels) => [
      newTravel,
      ...currentTravels.filter(
        (travel) => travel.characterId !== selectedTravelCharacter.id
      ),
    ]);

    setPoints([]);
  }

  async function cancelTravel(travelId) {
    const travelToCancel = travels.find((travel) => travel.id === travelId);

    if (travelToCancel) {
      const currentPoint = getTravelCurrentPoint(travelToCancel, now);
      const currentCoord = getCoordinate({
        lat: currentPoint[0],
        lng: currentPoint[1]
      });

      if (currentCoord) {
        saveCharacterLocation(travelToCancel.characterId, currentCoord);
      }
    }

    if (isSupabaseConfigured && supabase && session?.user) {
      const { error } = await supabase
        .from("travels")
        .delete()
        .eq("id", travelId);

      if (error) {
        alert(`Erro ao remover viagem: ${error.message}`);
        return;
      }
    }

    setTravels((currentTravels) =>
      currentTravels.filter((travel) => travel.id !== travelId)
    );
  }

  const activeMapImage = showImageGrid ? MAP_IMAGE_WITH_GRID : MAP_IMAGE_CLEAN;

  const gridLines = useMemo(() => buildGridLines(showSmallGrid), [showSmallGrid]);


  function getSelectedPointCenter(point) {
    const exactPoint = point?.exactPoint || point?.freePoint || point?.clickedPoint;

    if (
      exactPoint &&
      Number.isFinite(Number(exactPoint.lat)) &&
      Number.isFinite(Number(exactPoint.lng))
    ) {
      return [Number(exactPoint.lat), Number(exactPoint.lng)];
    }

    return getSmallCellCenter(point);
  }



  function formatTravelPreviewNumber(value, digits = 2) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "-";
    }

    return number.toFixed(digits);
  }

  function formatTravelPreviewHours(value) {
    const hours = Number(value);

    if (!Number.isFinite(hours)) {
      return "-";
    }

    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    }

    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }

    return `${(hours / 24).toFixed(2)} dias`;
  }

  function calculateExactTravelPreview(startCoord, endCoord, selectedTravelMode) {
    if (!startCoord || !endCoord) return null;

    const legacyTravel = calculateTravel(startCoord, endCoord, selectedTravelMode);
    const startPoint = getSelectedPointCenter(startCoord);
    const endPoint = getSelectedPointCenter(endCoord);

    if (!Array.isArray(startPoint) || !Array.isArray(endPoint)) {
      return null;
    }

    const dx = (Number(endPoint[1]) - Number(startPoint[1])) / smallCellWidth;
    const dy = (Number(endPoint[0]) - Number(startPoint[0])) / smallCellHeight;
    const exactSmallSquares = Math.sqrt(dx * dx + dy * dy);
    const exactMacroBlocks = exactSmallSquares / SUBDIVISIONS;

    const selectedMode = TRAVEL_MODES[selectedTravelMode] || TRAVEL_MODES.terrestre || {};
    const hoursPerFiveProvinces = Number(
      selectedMode.hoursPerFiveProvinces ??
      selectedMode.hoursPerFiveProvince ??
      selectedMode.hoursPerFive ??
      0
    );

    const fallbackHoursPerSmallSquare =
      Number(legacyTravel?.feet) > 0 && Number(legacyTravel?.hours) >= 0
        ? Number(legacyTravel.hours) / Number(legacyTravel.feet)
        : 0;

    const hoursPerSmallSquare =
      hoursPerFiveProvinces > 0
        ? hoursPerFiveProvinces / SUBDIVISIONS
        : fallbackHoursPerSmallSquare;

    const exactHours = selectedMode.instant ? 0 : exactSmallSquares * hoursPerSmallSquare;
    const exactDays = exactHours / 24;

    return {
      modeLabel: legacyTravel?.modeLabel || selectedMode.label || selectedTravelMode,
      legacy: {
        feet: legacyTravel?.feet,
        provinces: legacyTravel?.feet,
        macroBlocks: legacyTravel?.macroBlocks,
        hours: legacyTravel?.hours,
        days: legacyTravel?.days,
      },
      exact: {
        feet: exactSmallSquares,
        provinces: exactSmallSquares,
        macroBlocks: exactMacroBlocks,
        hours: exactHours,
        days: exactDays,
      },
      delta: {
        feet: exactSmallSquares - Number(legacyTravel?.feet || 0),
        hours: exactHours - Number(legacyTravel?.hours || 0),
      },
    };
  }



  function getMapPointFromLatLng(latlng) {
    return {
      lat: Number(latlng?.lat),
      lng: Number(latlng?.lng),
      y: Number(latlng?.lat),
      x: Number(latlng?.lng),
    };
  }

  function getTerrainInfoForLatLng(latlng) {
    const point = getMapPointFromLatLng(latlng);
    return {
      point,
      ...getTerrainAtPoint(point, terrainPolygons),
    };
  }


  function buildTerrainRectanglePoints(startPoint, endPoint) {
    if (!startPoint || !endPoint) return [];

    const lat1 = Number(startPoint.lat);
    const lng1 = Number(startPoint.lng);
    const lat2 = Number(endPoint.lat);
    const lng2 = Number(endPoint.lng);

    if (
      !Number.isFinite(lat1) ||
      !Number.isFinite(lng1) ||
      !Number.isFinite(lat2) ||
      !Number.isFinite(lng2)
    ) {
      return [];
    }

    return [
      [lat1, lng1],
      [lat1, lng2],
      [lat2, lng2],
      [lat2, lng1],
    ];
  }

  function saveTerrainRectangle(startPoint, endPoint) {
    const rectanglePoints = buildTerrainRectanglePoints(startPoint, endPoint);

    if (rectanglePoints.length < 4) {
      alert("Não consegui formar o quadrado/retângulo de terreno.");
      return;
    }

    const polygonName = prompt(
      "Nome da área de terra:",
      `Área retangular ${terrainPolygons.length + 1}`
    );

    if (!polygonName) {
      setTerrainRectangleStart(null);
      return;
    }

    const newPolygon = {
      id: `land-rect-${Date.now()}`,
      name: polygonName,
      type: "land",
      shape: "rectangle",
      points: rectanglePoints,
      createdAt: new Date().toISOString(),
    };

    setTerrainPolygons((current) => [...current, newPolygon]);
    setTerrainRectangleStart(null);
    setLastTerrainSample({
      point: endPoint,
      terrain: "land",
      label: "Terra",
      polygon: newPolygon,
      saved: true,
    });
  }

  function cancelTerrainRectangle() {
    setTerrainRectangleStart(null);
  }

  function toggleTerrainRectangleMode() {
    setTerrainRectangleMode((current) => {
      const next = !current;

      if (!next) {
        setTerrainRectangleStart(null);
      }

      return next;
    });
  }

  function saveDraftTerrainPolygon() {
    if (draftTerrainPoints.length < 3) {
      alert("Marque pelo menos 3 pontos para fechar uma área de terra.");
      return;
    }

    const polygonName = prompt(
      "Nome da área de terra:",
      `Área de terra ${terrainPolygons.length + 1}`
    );

    if (!polygonName) {
      return;
    }

    const newPolygon = {
      id: `land-${Date.now()}`,
      name: polygonName,
      type: "land",
      points: draftTerrainPoints,
      createdAt: new Date().toISOString(),
    };

    setTerrainPolygons((current) => [...current, newPolygon]);
    setDraftTerrainPoints([]);
    setLastTerrainSample({
      point: draftTerrainPoints[draftTerrainPoints.length - 1],
      terrain: "land",
      label: "Terra",
      polygon: newPolygon,
      saved: true,
    });
  }

  function undoDraftTerrainPoint() {
    setDraftTerrainPoints((current) => current.slice(0, -1));
  }

  function clearDraftTerrainPolygon() {
    setDraftTerrainPoints([]);
  }

  async function exportTerrainPolygons() {
    const json = JSON.stringify(terrainPolygons, null, 2);

    try {
      await navigator.clipboard?.writeText(json);
      alert("Polígonos copiados para a área de transferência.");
    } catch {
      console.log("Polígonos de terreno:", json);
      alert("Não consegui copiar automaticamente. O JSON foi enviado para o console.");
    }
  }

  function clearLastTerrainPolygon() {
    const last = terrainPolygons[terrainPolygons.length - 1];

    if (!last) {
      alert("Nenhum polígono salvo para remover.");
      return;
    }

    if (!confirm(`Remover o último polígono salvo: ${last.name}?`)) {
      return;
    }

    setTerrainPolygons((current) => current.slice(0, -1));
  }


  function setTravelDestinationFromLatLng(latlng, options = {}) {
    const coord = getCoordinate(latlng);

    if (!coord) {
      alert("O destino selecionado está fora da área válida do mapa.");
      return false;
    }

    const exactPoint = {
      lat: Number(latlng.lat),
      lng: Number(latlng.lng),
      y: Number(latlng.lat),
      x: Number(latlng.lng),
    };

    const terrainInfo = getTerrainAtPoint(exactPoint, terrainPolygons);

    setLastTerrainSample({
      point: exactPoint,
      ...terrainInfo,
    });

    setPoints([
      {
        ...coord,
        exactPoint,
        freePoint: exactPoint,
        clickedPoint: exactPoint,
        terrain: terrainInfo.terrain,
        terrainLabel: terrainInfo.label,
        destinationSource: options.source || "map",
        destinationName: options.name || coord.label,
        destinationId: options.id || "",
        travelModifier: options.travelModifier || null,
        pursuitTarget: options.pursuitTarget || null,
      },
    ]);

    return true;
  }


  function preparePursuitToUnknownPresence(presence) {
    if (!presence?.position) {
      alert("Não foi possível localizar esta presença no mapa.");
      return;
    }

    const lat = Number(presence.position[0]);
    const lng = Number(presence.position[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert("Esta presença não possui coordenada válida para perseguição.");
      return;
    }

    const ok = setTravelDestinationFromLatLng(
      { lat, lng },
      {
        source: "pursuit",
        id: presence.id || "",
        name: presence.characterName || "Presença desconhecida",
        travelModifier: {
          type: "pursuit",
          multiplier: 6,
          label: "Perseguição",
          reason: "Perseguidor recebe 6x velocidade dentro da mesma região.",
        },
        pursuitTarget: {
          travelId: presence.id || "",
          characterName: presence.characterName || "Presença desconhecida",
          coord: presence.coord || null,
          sameProvince: !!presence.sameProvince,
        },
      }
    );

    if (ok) {
      alert("Destino de perseguição marcado. Ao iniciar a viagem, o tempo será dividido por 6.");
    }
  }

  function prepareTravelToMapPing(ping) {
    if (!ping) return;

    const lat = Number(ping.lat);
    const lng = Number(ping.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert("Este ping não possui coordenada válida para viagem.");
      return;
    }

    const ok = setTravelDestinationFromLatLng(
      { lat, lng },
      {
        source: "ping",
        id: ping.id,
        name: ping.title || ping.name || "Ping do mapa",
      }
    );

    if (ok) {
      setSelectedMapPing(null);
    }
  }

  function handleMapClick(latlng) {
    if (ignoreNextMapClickRef.current) {
      ignoreNextMapClickRef.current = false;
      return;
    }

    setSelectedMapPing(null);
    setMapPingImagePreview(null);

    const coord = getCoordinate(latlng);

    if (!coord) {
      return;
    }

    const exactPoint = {
      lat: Number(latlng.lat),
      lng: Number(latlng.lng),
      y: Number(latlng.lat),
      x: Number(latlng.lng),
    };

    const terrainInfo = getTerrainAtPoint(exactPoint, terrainPolygons);

    setLastTerrainSample({
      point: exactPoint,
      ...terrainInfo,
    });

    if (terrainEditorEnabled) {
      if (terrainRectangleMode) {
        if (!terrainRectangleStart) {
          setTerrainRectangleStart(exactPoint);
          return;
        }

        saveTerrainRectangle(terrainRectangleStart, exactPoint);
        return;
      }

      setDraftTerrainPoints((current) => [
        ...current,
        [exactPoint.lat, exactPoint.lng],
      ]);
      return;
    }

    setTravelDestinationFromLatLng(latlng);
  }


  function getHoursPerProvinceForTravelMode(modeKey) {
    const mode = TRAVEL_MODES[modeKey] || TRAVEL_MODES.terrestre;

    return Number(mode.hoursPerProvince ?? mode.hoursPerFiveFeet ?? 0);
  }

  function getHybridRoutePoint(startPoint, endPoint, progress) {
    return [
      Number(startPoint[0]) + (Number(endPoint[0]) - Number(startPoint[0])) * progress,
      Number(startPoint[1]) + (Number(endPoint[1]) - Number(startPoint[1])) * progress,
    ];
  }

  function getDistanceInProvincesBetweenCenters(startPoint, endPoint) {
    if (!Array.isArray(startPoint) || !Array.isArray(endPoint)) return 0;

    const dx = (Number(endPoint[1]) - Number(startPoint[1])) / smallCellWidth;
    const dy = (Number(endPoint[0]) - Number(startPoint[0])) / smallCellHeight;

    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;

    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTerrainTravelModeForPoint(point) {
    const terrainInfo = getTerrainAtPoint(
      {
        lat: point[0],
        lng: point[1],
      },
      terrainPolygons
    );

    return terrainInfo.terrain === "land" ? "terrestre" : "aquatico";
  }

  function getTravelModeLabel(modeKey) {
    if (modeKey === "terrestre") return "Terrestre";
    if (modeKey === "aquatico") return "Aquático";
    if (modeKey === "aereo") return "Aéreo";
    if (modeKey === "teletransporte") return "Teletransporte";
    if (modeKey === "terrestre_aquatico") return "Terrestre + Aquático";
    return modeKey || "-";
  }

  function calculateTerrestrialAquaticTravel(startCoord, endCoord) {
    const startPoint = getSelectedPointCenter(startCoord);
    const endPoint = getSelectedPointCenter(endCoord);

    if (!Array.isArray(startPoint) || !Array.isArray(endPoint)) {
      return calculateTravel(startCoord, endCoord, "terrestre");
    }

    const totalDistance = getDistanceInProvincesBetweenCenters(startPoint, endPoint);

    if (!Number.isFinite(totalDistance) || totalDistance <= 0) {
      return {
        dx: 0,
        dy: 0,
        diagonals: 0,
        straights: 0,
        smallSquares: 0,
        macroBlocks: 0,
        feet: 0,
        provinces: 0,
        hours: 0,
        days: 0,
        modeKey: "terrestre_aquatico",
        modeLabel: "Terrestre + Aquático",
        hoursPerProvince: 0,
        hoursPerFiveFeet: 0,
        terrainSegments: [],
        landProvinces: 0,
        waterProvinces: 0,
        landHours: 0,
        waterHours: 0,
      };
    }

    const samples = 120;
    const rawSegments = [];

    for (let i = 0; i < samples; i += 1) {
      const startProgress = i / samples;
      const endProgress = (i + 1) / samples;
      const middleProgress = (startProgress + endProgress) / 2;

      const segmentStart = getHybridRoutePoint(startPoint, endPoint, startProgress);
      const segmentEnd = getHybridRoutePoint(startPoint, endPoint, endProgress);
      const segmentMiddle = getHybridRoutePoint(startPoint, endPoint, middleProgress);

      const modeKey = getTerrainTravelModeForPoint(segmentMiddle);
      const distanceProvinces = getDistanceInProvincesBetweenCenters(segmentStart, segmentEnd);
      const hoursPerProvince = getHoursPerProvinceForTravelMode(modeKey);
      const hours = distanceProvinces * hoursPerProvince;

      const last = rawSegments[rawSegments.length - 1];

      if (last && last.modeKey === modeKey) {
        last.endPoint = segmentEnd;
        last.distanceProvinces += distanceProvinces;
        last.hours += hours;
      } else {
        rawSegments.push({
          modeKey,
          modeLabel: getTravelModeLabel(modeKey),
          terrain: modeKey === "terrestre" ? "land" : "water",
          terrainLabel: modeKey === "terrestre" ? "Terra" : "Água",
          startPoint: segmentStart,
          endPoint: segmentEnd,
          distanceProvinces,
          hours,
        });
      }
    }

    let cursorHours = 0;

    const terrainSegments = rawSegments.map((segment, index) => {
      const startHour = cursorHours;
      const endHour = cursorHours + segment.hours;
      cursorHours = endHour;

      return {
        ...segment,
        index,
        startHour,
        endHour,
      };
    });

    const landProvinces = terrainSegments
      .filter((segment) => segment.modeKey === "terrestre")
      .reduce((sum, segment) => sum + segment.distanceProvinces, 0);

    const waterProvinces = terrainSegments
      .filter((segment) => segment.modeKey === "aquatico")
      .reduce((sum, segment) => sum + segment.distanceProvinces, 0);

    const landHours = landProvinces * getHoursPerProvinceForTravelMode("terrestre");
    const waterHours = waterProvinces * getHoursPerProvinceForTravelMode("aquatico");
    const totalHours = landHours + waterHours;
    const totalProvinces = landProvinces + waterProvinces;

    return {
      dx: Math.abs(Number(startCoord?.globalSmallCol ?? 0) - Number(endCoord?.globalSmallCol ?? 0)),
      dy: Math.abs(Number(startCoord?.globalSmallRow ?? 0) - Number(endCoord?.globalSmallRow ?? 0)),
      diagonals: 0,
      straights: totalProvinces,
      smallSquares: totalProvinces,
      macroBlocks: totalProvinces,
      feet: totalProvinces,
      provinces: totalProvinces,
      hours: totalHours,
      days: totalHours / 24,
      modeKey: "terrestre_aquatico",
      modeLabel: "Terrestre + Aquático",
      hoursPerProvince: null,
      hoursPerFiveFeet: null,
      terrainSegments,
      landProvinces,
      waterProvinces,
      landHours,
      waterHours,
      hasLand: landProvinces > 0.01,
      hasWater: waterProvinces > 0.01,
    };
  }

  function calculateTravelForSelectedMode(startCoord, endCoord, selectedTravelMode) {
    try {
      if (selectedTravelMode === "terrestre_aquatico") {
        return calculateTerrestrialAquaticTravel(startCoord, endCoord);
      }

      return calculateTravel(startCoord, endCoord, selectedTravelMode);
    } catch (error) {
      console.error("Erro no cálculo de viagem. Usando fallback terrestre:", error);

      try {
        return calculateTravel(startCoord, endCoord, "terrestre");
      } catch {
        return {
          feet: 0,
          provinces: 0,
          macroBlocks: 0,
          hours: 0,
          days: 0,
          modeKey: "terrestre",
          modeLabel: "Terrestre",
          terrainSegments: [],
          landProvinces: 0,
          waterProvinces: 0,
          landHours: 0,
          waterHours: 0,
        };
      }
    }
  }


  function formatHybridTravelNumber(value, digits = 2) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0.00";
    }

    return number.toFixed(digits);
  }

  function formatHybridTravelHours(value) {
    const hours = Number(value);

    if (!Number.isFinite(hours) || hours <= 0) {
      return "0h";
    }

    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    }

    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }

    return `${(hours / 24).toFixed(2)} dias`;
  }

  const currentTravelOrigin =
    selectedTravelCharacter
      ? getCurrentCoordinateForCharacter(selectedTravelCharacter.id)
      : null;

  const travel = (() => {
    if (!(points.length >= 1 && currentTravelOrigin)) {
      return null;
    }

    try {
      return calculateTravelForSelectedMode(currentTravelOrigin, points[0], travelMode);
    } catch (error) {
      console.error("Erro ao calcular preview da viagem:", error);
      window.__lnLastTravelPreviewError = error;

      try {
        return calculateTravel(currentTravelOrigin, points[0], "terrestre");
      } catch {
        return {
          feet: 0,
          provinces: 0,
          macroBlocks: 0,
          hours: 0,
          days: 0,
          modeKey: "terrestre",
          modeLabel: "Terrestre",
          terrainSegments: [],
          landProvinces: 0,
          waterProvinces: 0,
          landHours: 0,
          waterHours: 0,
          fallback: true,
        };
      }
    }
  })();

  const exactTravelPreview =
    points.length >= 1 && currentTravelOrigin && travelMode !== "terrestre_aquatico"
      ? calculateExactTravelPreview(currentTravelOrigin, points[0], travelMode)
      : null;

  useEffect(() => {
    if (!exactTravelPreview) return;

    window.__lnTravelPreview = exactTravelPreview;

    if (import.meta.env.DEV) {
      console.info("[LN Digital] Preview de viagem por coordenada exata:", exactTravelPreview);
    }
  }, [exactTravelPreview]);

  if (isAuthLoading) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="eyebrow">LN Digital</p>
          <h1>Carregando...</h1>
          <p>Verificando sessão do jogador.</p>
        </section>
      </main>
    );
  }

  if (!session && !isDemoMode) {
    return (
      <AuthPage
        onDemoEnter={() => {
          setIsDemoMode(true);
          setActivePage("hall");
        }}
      />
    );
  }
  const selectedMapTravel =
    travels.find(
      (item) =>
        item.characterId === selectedTravelCharacterId &&
        !dimensionLocations[String(item.characterId)]
    ) || null;

  const publicMapTravels = selectedMapTravel ? [selectedMapTravel] : [];

  const selectedInitialCoord =
    selectedTravelCharacter && !selectedMapTravel
      ? getCurrentCoordinateForCharacter(selectedTravelCharacter.id)
      : null;


  const selectedMapPresence = selectedMapTravel
    ? (() => {
        const currentPoint = getTravelCurrentPoint(selectedMapTravel, now);
        const currentCoord = getCoordinate({
          lat: currentPoint[0],
          lng: currentPoint[1]
        });
        const unknownPresences = getUnknownPresencesCount(
          selectedMapTravel,
          travels,
          now
        );

        return {
          currentPoint,
          currentCoord,
          unknownPresences,
          text: formatUnknownPresences(unknownPresences)
        };
      })()
    : null;

  const unknownPresenceMarkers =
    selectedMapTravel && selectedMapPresence?.currentCoord
      ? travels
          .filter((travel) => String(travel.characterId) !== String(selectedMapTravel.characterId))
          .filter((travel) => !dimensionLocations[String(travel.characterId)])
          .map((travel) => {
            const currentPoint = getTravelCurrentPoint(travel, now);
            const currentCoord = getCoordinate({
              lat: currentPoint[0],
              lng: currentPoint[1]
            });

            if (!currentCoord) return null;

            const sameMacroRegion =
              currentCoord.macroLabel &&
              selectedMapPresence.currentCoord.macroLabel &&
              currentCoord.macroLabel === selectedMapPresence.currentCoord.macroLabel;

            if (!sameMacroRegion) return null;

            const sameProvince =
              currentCoord.label &&
              selectedMapPresence.currentCoord.label &&
              currentCoord.label === selectedMapPresence.currentCoord.label;

            return {
              id: travel.id,
              targetTravelId: travel.id,
              targetCharacterId: travel.characterId,
              characterName: travel.characterName || travel.character_name || "Personagem desconhecido",
              position: currentPoint,
              coord: currentCoord,
              sameProvince
            };
          })
          .filter(Boolean)
      : [];

  return (
    <main className={`app app-${activePage}`}>
      <SoundtrackPlayer />
      <PasswordRecoveryWidget session={session} />
      {activePage !== "hall" && activePage !== "admin" && <PlayerKnowledgeAssistant />}
      <button
        className="mobileConfigButton"
        onClick={() => setIsPanelOpen(true)}
        type="button"
      >
        {activePage === "map" ? "☰ Controles do Mapa" : "☰ Configurações"}
      </button>

      {["map", "anced", "shinobidex", "admin", "my-ninja"].includes(activePage) && (
        <HallBackButton
          onClick={() => setActivePage("hall")}
          className={`ln-hall-back-button--compact ln-hall-back-button-app-return ${
            activePage === "my-ninja" ? "ln-hall-back-button-my-ninja-mobile-only" : ""
          }`}
        />
      )}

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
          <h1>LN Digital</h1>

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
        <div className="ln-current-user">
          <strong>{session?.user?.email || "Modo demonstração"}</strong>
          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>

        <div className="navigationTabs">
          <button
            type="button"
            className={activePage === "my-ninja" ? "activeTab" : ""}
            onClick={() => {
              setActivePage("my-ninja");
              setIsPanelOpen(false);
            }}
          >
            Meu Ninja
          </button>

          <button
            type="button"
            className={activePage === "map" ? "activeTab" : ""}
            onClick={() => {
              setActivePage("map");
              setIsPanelOpen(false);
            }}
          >
            Mapa
          </button>
          <button
            type="button"
            className={activePage === "skills" ? "activeTab" : ""}
            onClick={() => {
              setActivePage("skills");
              setIsPanelOpen(false);
            }}
          >
            Teia
          </button>


          <button
            type="button"
            className={activePage === "legends" ? "activeTab" : ""}
            onClick={() => {
              setActivePage("legends");
              setIsPanelOpen(false);
            }}
          >
            Lendas
          </button>

          <button
            type="button"
            className={activePage === "admin" ? "activeTab" : ""}
            onClick={() => {
              setActivePage("admin");
              setIsPanelOpen(false);
            }}
          >
            ADM
          </button>
        </div>

        {/* OTIMIZAÇÃO: controles do mapa só renderizam na página Mapa. */}
        {activePage === "map" && (<>
        <div className={`map-controls-card ${mapControlsVisible ? "" : "is-hidden"}`}>
            <button
              type="button"
              className="ln-map-panel-close"
              onClick={() => setMapControlsVisible(false)}
              title="Ocultar menu do mapa"
              aria-label="Ocultar menu do mapa"
            >
              ×
            </button>
          <section className="map-control-section">
            <h3>
              <span className="map-control-section-icon">⌘</span>
              Meio de Locomoção
            </h3>

            <label className="map-control-label">
              <LnSelect
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value)}
              >
                <option value="terrestre">Terrestre — 1 província = 12 horas</option>
                <option value="aquatico">Aquático — 1 província = 9 horas</option>
                <option value="terrestre_aquatico">Terrestre + Aquático — automático</option>
                <option value="aereo">Aéreo — 1 província = 6 horas</option>
                <option value="teletransporte">Teletransporte — imediato</option>
              </LnSelect>
            </label>
          </section>

          <section className="map-control-section">
            <h3>
              <span className="map-control-section-icon">▦</span>
              Camadas do Mapa
            </h3>

            <button
              type="button"
              className="map-control-action"
              onClick={() => setShowImageGrid((current) => !current)}
            >
              <span>▦</span>
              {showImageGrid ? "Usar mapa limpo" : "Usar mapa com grade"}
            </button>

            <button
              type="button"
              className="map-control-action"
              onClick={() => setShowOverlayGrid((current) => !current)}
            >
              <span>◌</span>
              {showOverlayGrid ? "Ocultar grade do sistema" : "Mostrar grade do sistema"}
            </button>

            <button
              type="button"
              className="map-control-action"
              onClick={() => setShowMapPings((current) => !current)}
            >
              <span>⌖</span>
              {showMapPings ? "Ocultar pings do mapa" : "Mostrar pings do mapa"}
            </button>
<label className="map-control-check">
              <input
                type="checkbox"
                checked={showSmallGrid}
                onChange={(e) => setShowSmallGrid(e.target.checked)}
              />
              <span>Mostrar províncias</span>
            </label>

            {points.length > 0 && (
              <button
                type="button"
                className="map-control-action map-control-action-muted"
                onClick={() => setPoints([])}
              >
                <span>×</span>
                Limpar destino selecionado
              </button>
            )}
          </section>
<section className="map-control-section">
            <h3>
              <span className="map-control-section-icon">♟</span>
              Viagem do Personagem
            </h3>

            <label className="map-character-select-label">
              <span>Personagem:</span>

              <div className="map-character-select-wrap">
                {selectedTravelCharacter && getCharacterImageUrl(selectedTravelCharacter) ? (
                  <img
                    src={getCharacterImageUrl(selectedTravelCharacter)}
                    alt={selectedTravelCharacter.characterName || "Personagem"}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <em>忍</em>
                )}

                <LnSelect
                  value={selectedTravelCharacterId}
                  onChange={(e) => setSelectedTravelCharacterId(e.target.value)}
                >
                  {travelCharacters.length === 0 && (
                    <option value="">Nenhum personagem salvo</option>
                  )}

                  {travelCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.characterName}
                    </option>
                  ))}
                </LnSelect>
              </div>
            </label>

            <button
              type="button"
              className="map-control-primary"
              onClick={startCharacterTravel}
            >
              <span>➤</span>
              Iniciar viagem até o destino
            </button>

            <button
              type="button"
              className="map-control-secondary"
              onClick={refreshTravelCharacters}
            >
              <span>↻</span>
              Atualizar personagens
            </button>

            <div className="map-dimension-tools">
              <h4>Viagem dimensional</h4>

              {selectedCharacterDimension ? (
                <div className="map-dimension-status">
                  <span>Fora do mapa</span>
                  <strong>{selectedCharacterDimension.label}</strong>
                  <button type="button" onClick={returnFromDimension}>
                    Retornar ao mapa
                  </button>
                </div>
              ) : (
                <>
                  <LnSelect
                    value={selectedDimensionKind}
                    onChange={(event) => setSelectedDimensionKind(event.target.value)}
                  >
                    {DIMENSION_TARGET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </LnSelect>

                  <input
                    value={dimensionTargetName}
                    onChange={(event) => setDimensionTargetName(event.target.value)}
                    placeholder="Ex: Sapos, Cobras, Kamui particular..."
                  />

                  <button
                    type="button"
                    className="map-control-danger"
                    onClick={startDimensionTeleport}
                  >
                    Teleportar para dimensão
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="map-control-section map-control-presence">
            <h3>
              <span className="map-control-section-icon">♣</span>
              Presenças na Região
            </h3>

            <p>
              {selectedMapPresence
                ? selectedMapPresence.text
                : "Não há presenças"}
            </p>

            {selectedMapPresence?.currentCoord && (
              <small>
                Região atual: {selectedMapPresence.currentCoord.macroLabel || "-"}
              </small>
            )}

            {unknownPresenceMarkers.length > 0 && (
              <div className="map-presence-actions">
                {unknownPresenceMarkers.map((presence) => (
                  <button
                    key={`presence-action-${presence.id}`}
                    type="button"
                    onClick={() => setSelectedPursuitPresence(presence)}
                  >
                    Ver presença {presence.sameProvince ? `em ${presence.coord?.label || "província"}` : `na região ${presence.coord?.macroLabel || ""}`}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {points.length > 0 && (
          <div className="info map-coordinate-dock">
            <strong>Destino:</strong>{" "}
            {points[0] ? points[0].label : "-"}
          </div>
        )}

        {travel && (
          <div className="result map-route-result-dock">
            <strong>Viagem {travel.modeLabel}</strong>
            <br />
            Distância: {travel.smallSquares.toFixed(2)} províncias
            <br />
            Regiões atravessadas: {travel.macroBlocks.toFixed(2)}
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
            Cada província por {travel.modeLabel.toLowerCase()} ={" "}
            {travel.hoursPerFiveFeet} horas
          </div>
        )}

        {travels.length > 0 && (
          <div className="travelList">
            <strong>Viagens registradas</strong>

          {travels.map((travel) => {
              const progress = getTravelProgress(travel, now);
              const currentPoint = getTravelCurrentPoint(travel, now);
              const currentCoord = getCoordinate({
                lat: currentPoint[0],
                lng: currentPoint[1],
              });
              const remainingHours = getRemainingTravelHours(travel, now);
              const unknownPresences = getUnknownPresencesCount(
                travel,
                travels,
                now
              );

              return (
                <div className="travelItem" key={travel.id}>
                  <div>
                    <strong>{travel.characterName}</strong>
                    <br />
                    {progress >= 1 ? "Chegou ao destino" : "Em viagem"} •{" "}
                    {Math.round(progress * 100)}%
                    <br />
                    Região atual: {currentCoord ? currentCoord.macroLabel : "-"}
                    <br />
                    <span className="presenceNotice">
                      {formatUnknownPresences(unknownPresences)}
                    </span>
                    <br />
                    Origem: {travel.startCoord.label} → Destino:{" "}
                    {travel.endCoord.label}
                    <br />
                    Chegada prevista: {formatDateTime(travel.arrivalAt)}
                    {progress < 1 && (
                      <>
                        <br />
                        Tempo restante: {formatTime(remainingHours)}
                      </>
                    )}
                  </div>

                  <button type="button" onClick={() => cancelTravel(travel.id)}>
                    Remover
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="hint">
          <strong>Coordenada:</strong> C4-3,2
          <br />
          C4 = bloco grande.
          <br />
          3,2 = província interno.
          <br />
          <strong>Imagem:</strong> 1080 × 903px
        </div>
        </>
        )}

      </aside>

      {activePage === "map" && points.length > 0 && (
        <div className="map-coordinate-dock-floating">
          <strong>Destino selecionado</strong>
          <span>{points[0] ? points[0].label : "-"}</span>
        </div>
      )}

      {activePage === "map" && travel && (
        <div className="map-route-result-dock-floating">
          <strong>Viagem {travel.modeLabel}</strong>
          <span>Distância: {travel.smallSquares.toFixed(2)} províncias</span>
          <span>Regiões atravessadas: {travel.macroBlocks.toFixed(2)}</span>
          <span>Tempo: {formatTime(travel.hours)}</span>
          <span>Dias: {travel.days.toFixed(2)} dias</span>
        </div>
      )}



      <section className="mapArea">
        {activePage === "hall" ? (
          <EntryHall
            userEmail={session?.user?.email}
            onOpenMyNinja={() => setActivePage("my-ninja")}
            onOpenMap={() => setActivePage("map")}
            onOpenShinobiDex={() => setActivePage("shinobidex")}
            onOpenLegends={() => setActivePage("legends")}
            onOpenAnced={() => setActivePage("anced")}
            onOpenAdmin={() => setActivePage("admin")}
            onLogout={handleLogout}
          />
        ) : activePage === "anced" ? (
          <AncedCalculatorPage user={session?.user} onBack={() => setActivePage("hall")} />
        ) : activePage === "shinobidex" ? (
          <ShinobiDexPage onBack={() => setActivePage("hall")} />
        ) : activePage === "legends" ? (
          <LegendsPage onBack={() => setActivePage("hall")} />
        ) : activePage === "map" ? (
        <>
          <button
            type="button"
            className={`mobile-map-options-toggle ${showMobileMapOptions ? "open" : "closed"}`}
            onClick={() => setShowMobileMapOptions((current) => !current)}
            aria-label="Abrir opções do mapa"
          >
            <span className="mobile-map-options-icon">▱</span>
            <strong>Opções</strong>
            <span className="mobile-map-options-chevron">
              {showMobileMapOptions ? "⌃" : "⌄"}
            </span>
          </button>

          {showMobileMapOptions && (
            <div className="mobile-map-quick-controls" aria-label="Controles rápidos do mapa">
              <div className="mobile-map-sheet-handle" />

              <div className="mobile-map-control-field mobile-map-control-full">
                <h3>
                  <span>🥾</span>
                  Locomoção
                </h3>

                <LnSelect
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value)}
                >
                  <option value="terrestre">Terrestre — 1 província = 12h</option>
                  <option value="aquatico">Aquático — 1 província = 9h</option>
                  <option value="terrestre_aquatico">Terrestre + Aquático — automático</option>
                  <option value="aereo">Aéreo — 1 província = 6h</option>
                  <option value="teletransporte">Teletransporte — imediato</option>
                </LnSelect>
              </div>

              <div className="mobile-map-control-buttons">
                <button
                  type="button"
                  className={showImageGrid ? "active" : ""}
                  onClick={() => setShowImageGrid((current) => !current)}
                >
                  <span>✦</span>
                  {showImageGrid ? "Mapa com grade" : "Mapa limpo"}
                </button>

                <button
                  type="button"
                  className={showOverlayGrid ? "active" : ""}
                  onClick={() => setShowOverlayGrid((current) => !current)}
                >
                  <span>▦</span>
                  {showOverlayGrid ? "Grade sistema" : "Sem grade"}
                </button>

                <button
                  type="button"
                  className={showSmallGrid ? "active" : ""}
                  onClick={() => setShowSmallGrid((current) => !current)}
                >
                  <span>▰</span>
                  {showSmallGrid ? "Províncias" : "Sem províncias"}
                </button>

                <button
                  type="button"
                  className={showMapPings ? "active" : ""}
                  onClick={() => setShowMapPings((current) => !current)}
                >
                  <span>⌖</span>
                  {showMapPings ? "Pings ativos" : "Sem pings"}
                </button>

                <button type="button" onClick={() => setPoints([])}>
                  <span>◎</span>
                  Limpar pontos
                </button>

                <button
                  type="button"
                  onClick={() => setTravelMode("terrestre_aquatico")}
                  title="Usar rota automática entre terra e água"
                >
                  <span>≈</span>
                  Terrestre + Aquático
                </button>

                <button
                  type="button"
                  onClick={() => setTerrainEditorEnabled((value) => !value)}
                  title="Marcar áreas de terra no mapa"
                >
                  <span>◈</span>
                  Terreno ADM: {terrainEditorEnabled ? "ON" : "OFF"}
                </button>

                {terrainEditorEnabled && (
                  <>
                    <button type="button" onClick={undoDraftTerrainPoint}>
                      <span>↶</span>
                      Desfazer ponto ({draftTerrainPoints.length})
                    </button>

                    <button type="button" onClick={saveDraftTerrainPolygon}>
                      <span>✓</span>
                      Salvar terra
                    </button>

                    <button type="button" onClick={clearDraftTerrainPolygon}>
                      <span>×</span>
                      Limpar desenho
                    </button>

                    <button type="button" onClick={exportTerrainPolygons}>
                      <span>⇩</span>
                      Exportar terreno
                    </button>

                    <button type="button" onClick={clearLastTerrainPolygon}>
                      <span>⌫</span>
                      Remover último
                    </button>
                  </>
                )}
              </div>

              <div className="mobile-map-travel-tools">
                <h3 className="mobile-map-personagem-title">
                  <img
                    className="ln-personagem-title-icon"
                    src="/icons/ninja-personagem-original.svg"
                    alt=""
                    aria-hidden="true"
                  />
                  <span>Personagem</span>
                </h3>

                <LnSelect
                  value={selectedTravelCharacterId}
                  onChange={(e) => setSelectedTravelCharacterId(e.target.value)}
                >
                  {travelCharacters.length === 0 && (
                    <option value="">Nenhum personagem salvo</option>
                  )}

                  {travelCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.characterName}
                    </option>
                  ))}
                </LnSelect>

                <button type="button" onClick={refreshTravelCharacters}>
                  <span>↻</span>
                  Atualizar
                </button>

                <div className="mobile-dimension-tools">
                  {selectedCharacterDimension ? (
                    <>
                      <strong>Fora do mapa: {selectedCharacterDimension.label}</strong>
                      <button type="button" onClick={returnFromDimension}>
                        Retornar ao mapa
                      </button>
                    </>
                  ) : (
                    <>
                      <LnSelect
                        value={selectedDimensionKind}
                        onChange={(event) => setSelectedDimensionKind(event.target.value)}
                      >
                        {DIMENSION_TARGET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </LnSelect>

                      <input
                        value={dimensionTargetName}
                        onChange={(event) => setDimensionTargetName(event.target.value)}
                        placeholder="Invocação ou dimensão"
                      />

                      <button type="button" onClick={startDimensionTeleport}>
                        Teleportar dimensão
                      </button>
                    </>
                  )}
                </div>

                <button type="button" className="primary" onClick={startCharacterTravel}>
                  Iniciar viagem
                </button>
              </div>
            </div>
          )}

        {false && terrainHudVisible && (
        <aside
          className="ln-terrain-hud"
          style={{
            position: "absolute",
            left: 18,
            top: 18,
            zIndex: 1200,
            width: "min(360px, calc(100% - 36px))",
            padding: "12px",
            borderRadius: 16,
            border: "1px solid rgba(255, 122, 0, 0.48)",
            background: "rgba(14, 12, 10, 0.92)",
            color: "#f5eadc",
            boxShadow: "0 18px 44px rgba(0, 0, 0, 0.38)",
            backdropFilter: "blur(10px)",
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          <button
            type="button"
            className="ln-map-panel-close"
            onClick={() => setTerrainHudVisible(false)}
            title="Ocultar cartografia de terreno"
            aria-label="Ocultar cartografia de terreno"
          >
            ×
          </button>

          <strong
            style={{
              display: "block",
              marginBottom: 8,
              color: "#ff9a32",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Cartografia de Terreno
          </strong>

          <div style={{ display: "grid", gap: 6 }}>
            <button
              type="button"
              onClick={() => setTerrainEditorEnabled((value) => !value)}
              style={{
                border: "1px solid rgba(255, 122, 0, 0.5)",
                borderRadius: 999,
                padding: "8px 10px",
                background: terrainEditorEnabled ? "#ff7a00" : "rgba(255, 122, 0, 0.12)",
                color: terrainEditorEnabled ? "#130b04" : "#ffb45c",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Terreno ADM: {terrainEditorEnabled ? "ON" : "OFF"}
            </button>

            <div>
              Último clique:{" "}
              <b>
                {lastTerrainSample
                  ? `${lastTerrainSample.label}${lastTerrainSample.polygon?.name ? ` · ${lastTerrainSample.polygon.name}` : ""}`
                  : "nenhum"}
              </b>
            </div>

            <div style={{ color: "#d6c4aa" }}>
              Polígonos salvos: {terrainPolygons.length} · Pontos em desenho: {draftTerrainPoints.length}
              {terrainRectangleMode && (
                <>
                  {" "}· Quadrado: {terrainRectangleStart ? "marque o canto oposto" : "marque o 1º canto"}
                </>
              )}
            </div>

            {terrainEditorEnabled && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                <button type="button" onClick={toggleTerrainRectangleMode}>
                  Modo quadrado: {terrainRectangleMode ? "ON" : "OFF"}
                </button>

                {terrainRectangleStart && (
                  <button type="button" onClick={cancelTerrainRectangle}>
                    Cancelar quadrado
                  </button>
                )}

                <button type="button" onClick={undoDraftTerrainPoint}>
                  Desfazer ponto
                </button>
                <button type="button" onClick={saveDraftTerrainPolygon}>
                  Salvar terra
                </button>
                <button type="button" onClick={clearDraftTerrainPolygon}>
                  Limpar desenho
                </button>
                <button type="button" onClick={clearLastTerrainPolygon}>
                  Remover último
                </button>
              </div>
            )}
          </div>
        </aside>
        )}


        {!mapControlsVisible && (
          <button
            type="button"
            className="ln-map-floating-toggle ln-map-floating-menu-toggle"
            onClick={() => setMapControlsVisible(true)}
          >
            Mostrar menu
          </button>
        )}


        {travelMode === "terrestre_aquatico" && travel && (
          <aside
            className="ln-hybrid-travel-panel"
            style={{
              position: "absolute",
              right: 18,
              bottom: 18,
              zIndex: 1180,
              width: "min(360px, calc(100% - 36px))",
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(255, 122, 0, 0.48)",
              background: "rgba(14, 12, 10, 0.90)",
              color: "#f5eadc",
              boxShadow: "0 18px 44px rgba(0, 0, 0, 0.38)",
              backdropFilter: "blur(10px)",
              fontSize: 12,
              lineHeight: 1.4,
              pointerEvents: "none",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: 6,
                color: "#ff9a32",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Viagem Terra + Água
            </strong>

            <div>
              Total: <b>{formatHybridTravelHours(travel?.hours)}</b>
            </div>

            <div>
              Terra: <b>{formatHybridTravelHours(travel?.landHours)}</b>{" "}
              · {formatHybridTravelNumber(travel?.landProvinces)} prov.
            </div>

            <div>
              Água: <b>{formatHybridTravelHours(travel?.waterHours)}</b>{" "}
              · {formatHybridTravelNumber(travel?.waterProvinces)} prov.
            </div>

            <div style={{ marginTop: 6, color: "#d6c4aa" }}>
              Trechos detectados: {Array.isArray(travel?.terrainSegments) ? travel.terrainSegments.length : 0}
            </div>

            {travel?.fallback && (
              <div style={{ marginTop: 6, color: "#fca5a5" }}>
                Fallback terrestre ativado.
              </div>
            )}
          </aside>
        )}


        {selectedPursuitPresence && (
          <aside className="map-pursuit-side-panel">
            <button
              type="button"
              className="map-pursuit-side-close"
              onClick={() => setSelectedPursuitPresence(null)}
              aria-label="Fechar perseguição"
            >
              ×
            </button>

            <strong>Presença detectada</strong>

            <p>
              Região: <b>{selectedPursuitPresence.coord?.macroLabel || "-"}</b>
              <br />
              Província:{" "}
              <b>
                {selectedPursuitPresence.sameProvince
                  ? selectedPursuitPresence.coord?.label || "-"
                  : "não revelada"}
              </b>
            </p>

            <p className="map-pursuit-note">
              Perseguidor recebe velocidade ×6. O tempo da viagem será dividido por 6 ao iniciar.
            </p>

            <button
              type="button"
              className="map-pursuit-start-button"
              onClick={() => preparePursuitToUnknownPresence(selectedPursuitPresence)}
            >
              Iniciar perseguição
            </button>
          </aside>
        )}

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
          dragging={true}
          touchZoom={true}
          doubleClickZoom="center"
          scrollWheelZoom="center"
          boxZoom={false}
          keyboard={false}
          zoomControl={true}
          bounceAtZoomLimits={false}
          inertia={false}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          <FitMapToBounds />

          <ImageOverlay url={activeMapImage} bounds={imageBounds} />

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

          {publicMapTravels.map((travel) => (
            <Polyline
              key={`route-${travel.id}`}
              positions={[travel.startCenter, travel.endCenter]}
              pathOptions={{
                color: "#38bdf8",
                weight: 3,
                opacity: 0.65,
                dashArray: "8 8",
              }}
              interactive={false}
            />
          ))}

          <ClickHandler onMapClick={handleMapClick} />

          {false && terrainPolygons.map((polygon) => (
            <Polygon
              key={polygon.id}
              positions={polygon.points}
              pathOptions={{
                color: "#22c55e",
                weight: 2,
                opacity: 0.86,
                fillColor: "#22c55e",
                fillOpacity: terrainEditorEnabled ? 0.18 : 0.08,
              }}
              interactive={false}
            />
          ))}

          {false && draftTerrainPoints.length >= 2 && (
            <Polyline
              positions={draftTerrainPoints}
              pathOptions={{
                color: "#f97316",
                weight: 3,
                opacity: 0.95,
                dashArray: "8 8",
              }}
              interactive={false}
            />
          )}

          {false && terrainEditorEnabled && terrainRectangleStart && (
            <CircleMarker
              center={[terrainRectangleStart.lat, terrainRectangleStart.lng]}
              radius={7}
              pathOptions={{
                color: "#38bdf8",
                fillColor: "#38bdf8",
                fillOpacity: 0.95,
                weight: 2,
              }}
              interactive={false}
            />
          )}

          {false && terrainEditorEnabled &&
            draftTerrainPoints.map((point, index) => (
              <CircleMarker
                key={`terrain-draft-${index}`}
                center={point}
                radius={5}
                pathOptions={{
                  color: "#f97316",
                  fillColor: "#f97316",
                  fillOpacity: 0.95,
                  weight: 2,
                }}
                interactive={false}
              />
            ))}

          {unknownPresenceMarkers.map((presence) => (
            <Marker
              key={`unknown-presence-${presence.id}`}
              position={presence.position}
              icon={createUnknownPresenceIcon(presence.sameProvince)}
              interactive={true}
            >
              <Tooltip direction="top">
                <strong>
                  {presence.sameProvince
                    ? presence.characterName
                    : "Presença desconhecida"}
                </strong>
                <br />
                {presence.sameProvince
                  ? "Está exatamente na mesma província que você."
                  : "Há um personagem nesta região."}
                <br />
                Região: {presence.coord.macroLabel || "-"}
                <br />
                Província: {presence.coord.provinceLabel || presence.coord.label || "-"}
              </Tooltip>
            </Marker>
          ))}

          {points.map((point, index) => (
            <CircleMarker
              key={index}
              center={getSelectedPointCenter(point)}
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

          {points.length >= 1 && currentTravelOrigin && (
            <Polyline
              positions={[getSmallCellCenter(currentTravelOrigin), getSelectedPointCenter(points[0])]}
              pathOptions={{
                color: "#f97316",
                weight: 4,
                opacity: 0.95,
              }}
            />
          )}
          {showMapPings && mapPings.map((ping) => {
            const lat = Number(ping.lat);
            const lng = Number(ping.lng);
            const isSelected = selectedMapPing?.id === ping.id;

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              return null;
            }

            return (
              <Marker
                key={`map-ping-${ping.id}`}
                position={[lat, lng]}
                icon={createMapPingImageIcon(ping, isSelected)}
                eventHandlers={{
                  click: (event) => {
                    event.originalEvent?.preventDefault?.();
                    event.originalEvent?.stopPropagation?.();
                    ignoreNextMapClickRef.current = true;
                    setSelectedMapPing(ping);
                  }
                }}
              >
                <Tooltip direction="top">
                  <strong>{ping.title}</strong>
                  <br />
                  {ping.type || "Local"}
                </Tooltip>
              </Marker>
            );
          })}

          {publicMapTravels.map((travel) => {
            const progress = getTravelProgress(travel, now);
            const currentPoint = getTravelCurrentPoint(travel, now);
            const currentCoord = getCoordinate({
              lat: currentPoint[0],
              lng: currentPoint[1],
            });
            const markerTravel = enrichTravelWithCharacterIcon(travel);

            return (
              <Marker
                key={`marker-${travel.id}`}
                position={currentPoint}
                icon={createCharacterIcon(markerTravel, progress)}
              >
                <Tooltip direction="top">
                  <strong>{markerTravel.characterName}</strong>
                  <br />
                  {progress >= 1 ? "Chegou ao destino" : "Em viagem"}
                  <br />
                  Progresso: {Math.round(progress * 100)}%
                  <br />
                  Região: {currentCoord ? currentCoord.macroLabel : "-"}
                </Tooltip>
              </Marker>
            );
          })}

          {selectedInitialCoord && !selectedCharacterDimension && (
            <Marker
              key={`initial-${selectedTravelCharacter.id}`}
              position={getSmallCellCenter(selectedInitialCoord)}
              icon={createCharacterIcon(
                {
                  characterName:
                    selectedTravelCharacter.characterName ||
                    selectedTravelCharacter.character_name ||
                    "Ninja",
                  characterIconUrl: getCharacterImageUrl(selectedTravelCharacter)
                },
                1
              )}
            >
              <Tooltip direction="top">
                <strong>{selectedTravelCharacter.characterName}</strong>
                <br />
                Localização inicial
                <br />
                Região: {selectedInitialCoord.macroLabel}
                <br />
                Província: {selectedInitialCoord.provinceLabel}
              </Tooltip>
            </Marker>
          )}

        </MapContainer>

        {exactTravelPreview && (
          <aside
            className="ln-travel-preview-panel"
            style={{
              position: "absolute",
              left: 18,
              bottom: 18,
              zIndex: 900,
              width: "min(360px, calc(100% - 36px))",
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(255, 122, 0, 0.45)",
              background: "rgba(14, 12, 10, 0.88)",
              color: "#f5eadc",
              boxShadow: "0 18px 44px rgba(0, 0, 0, 0.38)",
              backdropFilter: "blur(10px)",
              fontSize: 12,
              lineHeight: 1.4,
              pointerEvents: "none",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: 6,
                color: "#ff9a32",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Preview de coordenada livre
            </strong>

            <div style={{ display: "grid", gap: 4 }}>
              <span>
                Atual: {formatTravelPreviewNumber(exactTravelPreview.legacy?.provinces)} prov. ·{" "}
                {formatTravelPreviewHours(exactTravelPreview.legacy?.hours)}
              </span>
              <span>
                Exato: {formatTravelPreviewNumber(exactTravelPreview.exact?.provinces)} prov. ·{" "}
                {formatTravelPreviewHours(exactTravelPreview.exact?.hours)}
              </span>
              <span style={{ color: "#d6c4aa" }}>
                Diferença: {formatTravelPreviewNumber(exactTravelPreview.delta?.feet)} prov. ·{" "}
                {formatTravelPreviewHours(exactTravelPreview.delta?.hours)}
              </span>
            </div>
          </aside>
        )}


          {mapPingImagePreview && (
            <div
              className="map-ping-image-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Imagem ampliada do local"
              onClick={() => setMapPingImagePreview(null)}
            >
              <button
                type="button"
                className="map-ping-image-lightbox-close"
                onClick={() => setMapPingImagePreview(null)}
                aria-label="Fechar imagem ampliada"
              >
                ×
              </button>

              <figure
                className="map-ping-image-lightbox-frame"
                onClick={(event) => event.stopPropagation()}
              >
                <img
                  src={mapPingImagePreview.src}
                  alt={mapPingImagePreview.title}
                  referrerPolicy="no-referrer"
                />

                <figcaption>
                  <span>{mapPingImagePreview.type}</span>
                  <strong>{mapPingImagePreview.title}</strong>
                </figcaption>
              </figure>
            </div>
          )}

          {selectedMapPing && (
            <aside className="map-ping-side-panel" aria-live="polite">
              <button
                type="button"
                className="map-ping-side-close"
                onClick={() => {
                  setSelectedMapPing(null);
                  setMapPingImagePreview(null);
                }}
                aria-label="Fechar detalhes do local"
              >
                ×
              </button>

              <div className={`map-ping-side-image ${selectedMapPing.image_url ? "" : "is-empty"}`}>
                {selectedMapPing.image_url && (
                  <button
                    type="button"
                    className="map-ping-side-image-button"
                    onClick={() =>
                      setMapPingImagePreview({
                        src: selectedMapPing.image_url,
                        title: selectedMapPing.title || "Imagem do local",
                        type: selectedMapPing.type || "Local"
                      })
                    }
                    aria-label="Abrir imagem do local"
                  >
                    <img
                      src={selectedMapPing.image_url}
                      alt={selectedMapPing.title || "Local do mapa"}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.closest(".map-ping-side-image")?.classList.add("is-empty");
                      }}
                    />
                  </button>
                )}

                <span>Imagem do local indisponível</span>
              </div>

              <div className="map-ping-side-content">
                <p>{selectedMapPing.type || "Local do mundo ninja"}</p>
                <h2>{selectedMapPing.title}</h2>

                {(selectedMapPing.coord_label || selectedMapPing.macro_label) && (
                  <small>
                    {[selectedMapPing.coord_label, selectedMapPing.macro_label]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                )}

                {selectedMapPing.description ? (
                  <strong>{selectedMapPing.description}</strong>
                ) : (
                  <strong>Este local ainda não possui descrição cadastrada.</strong>
                )}
              </div>
            
              <button
                type="button"
                className="map-ping-travel-button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  prepareTravelToMapPing(selectedMapPing);
                }}
              >
                Iniciar viagem até este ping
              </button>
</aside>
          )}
        </>
        ) : activePage === "skills" ? (
          <SkillTreePage />
        ) : activePage === "admin" ? (
          <AdminPanel
            now={now}
            getCoordinate={getCoordinate}
            getTravelCurrentPoint={getTravelCurrentPoint}
            getTravelProgress={getTravelProgress}
            formatTime={formatTime}
          />
        ) : (
          <MyNinjaCleanPage
            onNavigate={(label) => {
              if (label === "Sair") {
                handleLogout();
                return;
              }

              const routes = {
                "Início": "hall",
                "Mapa": "map",
                "Hall das Lendas": "legends",
              };

              const nextPage = routes[label];

              if (nextPage) {
                setActivePage(nextPage);
                setIsPanelOpen(false);
              }
            }}
            session={session}
            travels={travels}
            now={now}
            getCoordinate={getCoordinate}
            getTravelCurrentPoint={getTravelCurrentPoint}
            getTravelProgress={getTravelProgress}
            getRemainingTravelHours={getRemainingTravelHours}
            getUnknownPresencesCount={getUnknownPresencesCount}
            formatUnknownPresences={formatUnknownPresences}
            formatTime={formatTime}
            points={points}
            travel={travel}
            travelMode={travelMode}
            setTravelMode={setTravelMode}
            activeMapImage={activeMapImage}
            imageBounds={imageBounds}
            showImageGrid={showImageGrid}
            setShowImageGrid={setShowImageGrid}
            showOverlayGrid={showOverlayGrid}
            setShowOverlayGrid={setShowOverlayGrid}
            showSmallGrid={showSmallGrid}
            setShowSmallGrid={setShowSmallGrid}
            gridOpacity={gridOpacity}
            setGridOpacity={setGridOpacity}
            gridLines={gridLines}
            setPoints={setPoints}
            selectedTravelCharacterId={selectedTravelCharacterId}
            setSelectedTravelCharacterId={setSelectedTravelCharacterId}
            travelCharacters={travelCharacters}
            refreshTravelCharacters={refreshTravelCharacters}
            startCharacterTravel={startCharacterTravel}
            handleMapClick={handleMapClick}
            getSmallCellCenter={getSmallCellCenter}
          />
        )}
      </section>
    </main>
  );
}
