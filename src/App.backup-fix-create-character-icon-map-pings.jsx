import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Polyline,
  CircleMarker,
  Tooltip,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { CRS, divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import MyNinjaPage from "./components/MyNinjaPage";
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
  teletransporte: {
    label: "Teletransporte",
    hoursPerFiveFeet: 0,
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


const CHARACTER_STORAGE_KEY = "legendary-ninja-characters";
const TRAVEL_STORAGE_KEY = "legendary-ninja-travels";

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

function createCharacterIcon(travel = {}

function getMapPingSymbol(type = "") {
  const normalized = String(type || "").toLowerCase();

  if (normalized.includes("vila")) return "里";
  if (normalized.includes("país") || normalized.includes("pais")) return "国";
  if (normalized.includes("cidade")) return "町";
  if (normalized.includes("organização") || normalized.includes("organizacao")) return "暁";
  if (normalized.includes("base")) return "砦";
  if (normalized.includes("campo")) return "⚔";
  if (normalized.includes("ruína") || normalized.includes("ruina")) return "遺";
  if (normalized.includes("laboratório") || normalized.includes("laboratorio")) return "研";
  if (normalized.includes("templo")) return "寺";
  if (normalized.includes("porto")) return "港";
  if (normalized.includes("perigosa")) return "!";
  if (normalized.includes("evento")) return "炎";

  return "印";
}

function createMapPingIcon(ping = {}) {
  const symbol = escapeHtml(getMapPingSymbol(ping.type));
  const type = escapeHtml(ping.type || "Local");

  return divIcon({
    className: "ln-map-ping-marker",
    html: `
      <div class="ln-map-ping-icon" title="${type}">
        <span>${symbol}</span>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24]
  });
}
, progress = 1) {
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
    iconSize: [46, 46],
    iconAnchor: [23, 23],
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

function writeCharacterLocations(locations) {
  localStorage.setItem(CHARACTER_LOCATION_STORAGE_KEY, JSON.stringify(locations));
}

export default function App() {
  const [points, setPoints] = useState([]);
  const [travelMode, setTravelMode] = useState("terrestre");
  const [showImageGrid, setShowImageGrid] = useState(false);
  const [showOverlayGrid, setShowOverlayGrid] = useState(true);
  const [showSmallGrid, setShowSmallGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.35);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activePage, setActivePage] = useState("hall");
  const [showMobileMapOptions, setShowMobileMapOptions] = useState(true);
  const [travelCharacters, setTravelCharacters] = useState(() => readSavedCharacters());
  const [selectedTravelCharacterId, setSelectedTravelCharacterId] = useState("");
  const [travels, setTravels] = useState(() => readSavedTravels());
  const [mapPings, setMapPings] = useState([]);
  const [characterLocations, setCharacterLocations] = useState(() =>
    readCharacterLocations()
  );
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

  async function handleLogout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }

    setSession(null);
    setIsDemoMode(false);
    setActivePage("hall");
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
    setTravelCharacters(readSavedCharacters());
  }, [activePage]);

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

    const travelData = calculateTravel(startCoord, endCoord, travelMode);
    const startedAt = new Date().toISOString();
    const arrivalAt = new Date(
      Date.now() + travelData.hours * 60 * 60 * 1000
    ).toISOString();

    const newTravel = {
      id: crypto.randomUUID(),
      characterId: selectedTravelCharacter.id,
      characterName: selectedTravelCharacter.characterName,
      characterIconUrl: getCharacterImageUrl(selectedTravelCharacter),
      travelMode,
      modeLabel: travelData.modeLabel,
      startCoord,
      endCoord,
      startCenter: getSmallCellCenter(startCoord),
      endCenter: getSmallCellCenter(endCoord),
      durationHours: travelData.hours,
      durationDays: travelData.days,
      distanceFeet: travelData.feet,
      startedAt,
      arrivalAt,
    };

    saveCharacterLocation(selectedTravelCharacter.id, endCoord);

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
        travel_mode: travelMode,
        mode_label: travelData.modeLabel,
        start_coord: startCoord,
        end_coord: endCoord,
        start_center: getSmallCellCenter(startCoord),
        end_center: getSmallCellCenter(endCoord),
        duration_hours: travelData.hours,
        duration_days: travelData.days,
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

  function handleMapClick(latlng) {
    const coord = getCoordinate(latlng);

    if (!coord) {
      return;
    }

    setPoints([coord]);
  }

  const currentTravelOrigin =
    selectedTravelCharacter
      ? getCurrentCoordinateForCharacter(selectedTravelCharacter.id)
      : null;

  const travel =
    points.length >= 1 && currentTravelOrigin
      ? calculateTravel(currentTravelOrigin, points[0], travelMode)
      : null;

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
    travels.find((item) => item.characterId === selectedTravelCharacterId) || null;

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
          currentCoord,
          unknownPresences,
          text: formatUnknownPresences(unknownPresences)
        };
      })()
    : null;

  return (
    <main className={`app app-${activePage}`}>
      <SoundtrackPlayer />
      <PasswordRecoveryWidget session={session} />
      <button
        className="mobileConfigButton"
        onClick={() => setIsPanelOpen(true)}
        type="button"
      >
        {activePage === "map" ? "☰ Controles do Mapa" : "☰ Configurações"}
      </button>

      {activePage !== "hall" && (
        <button className="ln-hall-return-button"
         
          type="button"
          onClick={() => {
            setActivePage("hall");
            setIsPanelOpen(false);
          }}
        >
          <span className="ln-hall-return-button__seal">忍</span>
          <span className="ln-hall-return-button__text">
            <small>LN Digital</small>
            <strong>Hall</strong>
          </span>
        </button>
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

        <label>
          Meio de locomoção:
          <select
            value={travelMode}
            onChange={(e) => setTravelMode(e.target.value)}
          >
            <option value="terrestre">Terrestre — 1 província = 12 horas</option>
            <option value="aquatico">Aquático — 1 província = 9 horas</option>
            <option value="aereo">Aéreo — 1 província = 6 horas</option>
            <option value="teletransporte">Teletransporte — imediato</option>
          </select>
        </label>

        <div className="ruleBox">
          <strong>Regra ativa:</strong>
          <br />
          Diagonal = {DIAGONAL_COST}
          <br />1 província = {UNIT_PER_SMALL_SQUARE} {UNIT_NAME}
        </div>

        <button
          type="button"
          className="gridToggleButton imageGridToggleButton"
          onClick={() => setShowImageGrid((current) => !current)}
        >
          {showImageGrid ? "Usar mapa limpo" : "Usar mapa com grade"}
        </button>

        <button
          type="button"
          className="gridToggleButton"
          onClick={() => setShowOverlayGrid((current) => !current)}
        >
          {showOverlayGrid ? "Ocultar grade do sistema" : "Mostrar grade do sistema"}
        </button>

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
          Mostrar províncias
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

        <div className="travelBox">
          <strong>Viagem do Personagem</strong>

          <label>
            Personagem:
            <select
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
            </select>
          </label>

          <button type="button" onClick={refreshTravelCharacters}>
            Atualizar personagens
          </button>

          <button type="button" onClick={startCharacterTravel}>
            Iniciar viagem até o destino
          </button>

          <p className="travelSmallText">
            Clique em dois pontos no mapa, selecione o personagem e inicie a
            viagem. O ícone será movido de acordo com o tempo real.
          </p>
        </div>

        <div className={`map-presence-card ${selectedMapPresence ? "active" : "inactive"}`}>
          <strong>Presenças na região</strong>
          <span>
            {selectedMapPresence
              ? selectedMapPresence.text
              : "Selecione um personagem com viagem ativa para verificar presenças."}
          </span>

          {selectedMapPresence?.currentCoord && (
            <small>
              Região atual: {selectedMapPresence.currentCoord.macroLabel || "-"}
            </small>
          )}
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

            {mapPings.map((ping) => {
            const lat = Number(ping.lat);
            const lng = Number(ping.lng);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              return null;
            }

            return (
              <Marker
                key={`map-ping-${ping.id}`}
                position={[lat, lng]}
                icon={createMapPingIcon(ping)}
              >
                <Popup className="ln-map-ping-popup">
                  <article className="ln-map-ping-card">
                    {ping.image_url && (
                      <img src={ping.image_url} alt={ping.title || "Local do mapa"} />
                    )}

                    <div>
                      <p>{ping.type || "Local"}</p>
                      <h3>{ping.title}</h3>

                      {(ping.coord_label || ping.macro_label) && (
                        <span>
                          {[ping.coord_label, ping.macro_label].filter(Boolean).join(" · ")}
                        </span>
                      )}

                      {ping.description && <strong>{ping.description}</strong>}
                    </div>
                  </article>
                </Popup>
              </Marker>
            );
          })}

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
          >
            {showMobileMapOptions ? "Ocultar opções" : "Mostrar opções"}
          </button>

          {showMobileMapOptions && (
          <div className="mobile-map-quick-controls" aria-label="Controles rápidos do mapa">
            <div className="mobile-map-control-field mobile-map-control-full">
              <label>
                Locomoção
                <select
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value)}
                >
                  <option value="terrestre">Terrestre — 1 província = 12h</option>
                  <option value="aquatico">Aquático — 1 província = 9h</option>
                  <option value="aereo">Aéreo — 1 província = 6h</option>
                  <option value="teletransporte">Teletransporte — imediato</option>
                </select>
              </label>
            </div>

            <div className="mobile-map-control-buttons">
              <button
                type="button"
                className={showImageGrid ? "active" : ""}
                onClick={() => setShowImageGrid((current) => !current)}
              >
                {showImageGrid ? "Mapa com grade" : "Mapa limpo"}
              </button>

              <button
                type="button"
                className={showOverlayGrid ? "active" : ""}
                onClick={() => setShowOverlayGrid((current) => !current)}
              >
                {showOverlayGrid ? "Grade sistema" : "Sem grade"}
              </button>

              <button
                type="button"
                className={showSmallGrid ? "active" : ""}
                onClick={() => setShowSmallGrid((current) => !current)}
              >
                {showSmallGrid ? "Províncias" : "Sem províncias"}
              </button>

              <button type="button" onClick={() => setPoints([])}>
                Limpar pontos
              </button>
            </div>

            <label className="mobile-map-opacity">
              <span>Opacidade da grade: {Math.round(gridOpacity * 100)}%</span>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={gridOpacity}
                onChange={(e) => setGridOpacity(Number(e.target.value))}
              />
            </label>

            <div className="mobile-map-travel-tools">
              <label>
                Personagem
                <select
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
                </select>
              </label>

              <button type="button" onClick={refreshTravelCharacters}>
                Atualizar
              </button>

              <button type="button" className="primary" onClick={startCharacterTravel}>
                Iniciar viagem
              </button>
            </div>

            {(points.length > 0 || travel) && (
              <div className="mobile-map-live-info">
                {points.length > 0 && (
                  <span>
                    <strong>Destino:</strong> {points[0]?.label || "-"}
                  </span>
                )}

                {travel && (
                  <span>
                    <strong>Viagem:</strong> {travel.modeLabel} ·{" "}
                    {travel.smallSquares.toFixed(2)} províncias ·{" "}
                    {formatTime(travel.hours)}
                  </span>
                )}
              </div>
            )}
          </div>
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

          {travels.map((travel) => (
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

          {points.length >= 1 && currentTravelOrigin && (
            <Polyline
              positions={[getSmallCellCenter(currentTravelOrigin), getSmallCellCenter(points[0])]}
              pathOptions={{
                color: "#f97316",
                weight: 4,
                opacity: 0.95,
              }}
            />
          )}
          {travels.map((travel) => {
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

          {selectedInitialCoord && (
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
          <MyNinjaPage
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
