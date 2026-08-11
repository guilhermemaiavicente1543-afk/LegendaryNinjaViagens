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
import {
  getCoordinate,
  getSmallCellCenter,
  getMacroCellCenter,
  buildGridLines,
} from "./lib/map/coordinates.js";
import {
  calculateTravel,
  formatTime,
} from "./lib/map/travelMath.js";
import {
  parseCharacterTraitList,
  dbCharacterToAppCharacter,
} from "./lib/characters/characterMappers.js";
import {
  dedupeTravelsByCharacter,
  dbTravelToAppTravel,
} from "./lib/travel/travelMappers.js";
import {
  attachPursuitMeta,
  getPursuitTargetCharacterId,
  isPursuitTravel,
  normalizeTravelPursuitState,
  pointsDiffer,
  stripPursuitBoost,
  withPursuitBoost,
} from "./lib/travel/pursuitUtils.js";



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
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  GRID_LEFT,
  GRID_TOP,
  GRID_RIGHT,
  GRID_BOTTOM,
  MACRO_COLS,
  MACRO_ROWS,
  SUBDIVISIONS,
  LETTERS,
  MAP_IMAGE_WITH_GRID,
  MAP_IMAGE_CLEAN,
} from "./config/mapConfig.js";
import {
  UNIT_PER_SMALL_SQUARE,
  UNIT_NAME,
  DIAGONAL_COST,
  TRAVEL_MODES,
  TRAVEL_TIME_MULTIPLIER,
  PURSUIT_FOLLOWER_SPEED_MULTIPLIER,
  PURSUIT_TARGET_SPEED_MULTIPLIER,
  PURSUIT_BREAK_DISTANCE_PROVINCES,
  PURSUIT_CATCH_DISTANCE_PROVINCES,
} from "./config/travelConfig.js";
import {
  CREATE_NINJA_AFTER_AUTH_KEY,
  CHARACTER_STORAGE_KEY,
  TRAVEL_STORAGE_KEY,
  TERRAIN_POLYGONS_STORAGE_KEY,
  CHARACTER_LOCATION_STORAGE_KEY,
  CHARACTER_DIMENSION_STORAGE_KEY,
  LOCAL_INSIDE_PING_REPAIR_KEY,
} from "./config/storageKeys.js";
import {
  readSavedCharacters,
  readCharacterLocations,
  writeCharacterLocations,
  readCharacterDimensionLocations,
  writeCharacterDimensionLocations,
} from "./lib/storage/characterStorage.js";
import {
  readSavedTravels,
} from "./lib/storage/travelStorage.js";
import {
  readSavedTerrainPolygons,
  saveTerrainPolygonsToStorage,
} from "./lib/storage/terrainStorage.js";



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












// Em produção, deixe 1.
// Para teste rápido, você pode trocar para 3600, fazendo 1 segundo real valer 1 hora de viagem.


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


function createUnknownPresenceGroupIcon(count = 1, sameProvince = false) {
  const total = Number(count) || 1;
  const isGroup = total > 1;

  return divIcon({
    className: `unknownPresenceGroupMarkerWrapper ${sameProvince ? "same-province" : ""} ${isGroup ? "multiple" : "single"}`,
    html: `
      <div class="unknownPresenceGroupMarker">
        <span class="unknownPresenceGroupSymbol">${isGroup ? "◆" : "?"}</span>
        ${isGroup ? `<span class="unknownPresenceGroupCount">${total}</span>` : ""}
      </div>
    `,
    iconSize: isGroup ? [42, 42] : [34, 34],
    iconAnchor: isGroup ? [21, 21] : [17, 17],
    tooltipAnchor: [0, -18],
  });
}

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
  const size = isSelected ? 54 : 46;
  const anchorY = Math.round(size * 0.92);

  return divIcon({
    className: `map-ping-image-marker-wrapper ${isSelected ? "selected" : ""}`,
    html: `
      <div
        class="map-ping-image-marker"
        style="width:${size}px;height:${size}px;max-width:${size}px;max-height:${size}px;"
      >
        <span class="map-ping-fallback-shape"></span>
        <img
          src="${iconPath}"
          alt=""
          draggable="false"
          onerror="this.style.display='none';this.parentElement.classList.add('use-fallback');"
          style="width:${size}px;height:${size}px;max-width:${size}px;max-height:${size}px;object-fit:contain;display:block;position:relative;z-index:2;"
        />
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [Math.round(size / 2), anchorY],
    tooltipAnchor: [0, -size]
  });
}


// LN LOCAL INSIDE PING REPAIR

function stripLegacyInsidePing(value) {
  if (Array.isArray(value)) {
    let changed = false;

    for (const item of value) {
      if (stripLegacyInsidePing(item)) changed = true;
    }

    return changed;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  let changed = false;

  if (Object.prototype.hasOwnProperty.call(value, "insidePing")) {
    delete value.insidePing;
    changed = true;
  }

  if (Object.prototype.hasOwnProperty.call(value, "insidePingOnArrival")) {
    delete value.insidePingOnArrival;
    changed = true;
  }

  for (const key of Object.keys(value)) {
    if (stripLegacyInsidePing(value[key])) {
      changed = true;
    }
  }

  return changed;
}

function cleanLegacyInsidePingFromLocalStorage() {
  if (typeof window === "undefined") return false;

  if (window.localStorage.getItem(LOCAL_INSIDE_PING_REPAIR_KEY) === "1") {
    return false;
  }

  const keys = [
    "legendary-ninja-character-locations",
    "legendary-ninja-characters"
  ];

  let changed = false;

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);

      if (stripLegacyInsidePing(parsed)) {
        window.localStorage.setItem(key, JSON.stringify(parsed));
        changed = true;
      }
    } catch (error) {
      console.warn("[LN Digital] Não consegui limpar insidePing local:", key, error);
    }
  }

  if (changed) {
    window.localStorage.setItem(LOCAL_INSIDE_PING_REPAIR_KEY, "1");
    console.warn("[LN Digital] insidePing local antigo limpo. Recarregando.");
  }

  return changed;
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
  const [mapCharacters, setMapCharacters] = useState(() => readSavedCharacters());
  const [selectedTravelCharacterId, setSelectedTravelCharacterId] = useState("");
  const [travels, setTravels] = useState(() => readSavedTravels());
  const [mapPings, setMapPings] = useState([]);
  const [selectedMapPing, setSelectedMapPing] = useState(null);
  const pingArrivalHandledRef = useRef(new Set());
  const pursuitActionRef = useRef(new Set());
  const pursuitSyncRef = useRef(new Map());
  const stoppedPursuitIdsRef = useRef(new Set());
  const [selectedPursuitPresence, setSelectedPursuitPresence] = useState(null);
  const [selectedPursuitPresenceGroup, setSelectedPursuitPresenceGroup] = useState(null);
  const [incomingPursuitNotice, setIncomingPursuitNotice] = useState(null);
  const lastIncomingPursuitAlertRef = useRef("");
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

  // O reparo antigo de insidePing foi desativado.
  // insidePing agora é um estado legítimo e persistente do personagem.




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

      // LN_VALIDATE_ONLINE_CHARACTER_SELECTION_V3
      setSelectedTravelCharacterId((current) => {
        const currentStillExists =
          onlineCharacters.some(
            (character) =>
              String(character.id) ===
              String(current)
          );

        return currentStillExists
          ? current
          : onlineCharacters[0].id;
      });
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

    const mappedTravels = data.map((row) =>
      normalizeTravelPursuitState(
        dbTravelToAppTravel(row)
      )
    );
    setTravels(mappedTravels);
    localStorage.setItem(TRAVEL_STORAGE_KEY, JSON.stringify(mappedTravels));
  }

  useEffect(() => {
    if (session?.user) {
      loadOnlineTravels();
    }
  }, [session?.user?.id]);


  /*
    LN INCOMING PURSUIT WATCH

    O alvo consulta o banco periodicamente e também escuta
    alterações em travels. Isso evita depender de recarregar
    a página para descobrir que está sendo perseguido.
  */
  useEffect(() => {
    if (
      !isSupabaseConfigured ||
      !supabase ||
      !session?.user ||
      !selectedTravelCharacterId
    ) {
      setIncomingPursuitNotice(null);
      lastIncomingPursuitAlertRef.current = "";
      return;
    }

    let disposed = false;

    async function refreshIncomingPursuit() {
      const { data, error } = await supabase
        .from("travels")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (disposed) {
        return;
      }

      if (error) {
        console.warn(
          "Erro ao verificar perseguições recebidas:",
          error.message
        );
        return;
      }

      const mappedRemoteTravels =
        (data || []).map((row) =>
          normalizeTravelPursuitState(
            dbTravelToAppTravel(row)
          )
        );

      const remoteTravelIds =
        new Set(
          mappedRemoteTravels.map(
            (travelItem) =>
              String(travelItem.id || "")
          )
        );

      /*
        Sincronização autoritativa:

        - enquanto a perseguição do personagem selecionado
          existir no banco, preservamos a posição local mais
          recente calculada pelo motor;

        - quando ela for apagada do banco, ela obrigatoriamente
          desaparece também do estado local.
      */
      setTravels((currentTravels) => {
        const currentById =
          new Map(
            currentTravels.map(
              (travelItem) => [
                String(travelItem.id || ""),
                travelItem,
              ]
            )
          );

        for (const currentTravel of currentTravels) {
          const currentId =
            String(currentTravel.id || "");

          if (
            currentId &&
            isPursuitTravel(currentTravel) &&
            !remoteTravelIds.has(currentId)
          ) {
            stoppedPursuitIdsRef.current.add(
              currentId
            );

            pursuitSyncRef.current.delete(
              currentId
            );

            pursuitActionRef.current.delete(
              `cancel:${currentId}`
            );

            pursuitActionRef.current.delete(
              `finish:${currentId}`
            );
          }
        }

        return mappedRemoteTravels.map(
          (remoteTravel) => {
            const travelId =
              String(remoteTravel.id || "");

            const localTravel =
              currentById.get(travelId);

            const isLocallyControlledPursuit =
              localTravel &&
              isPursuitTravel(localTravel) &&
              String(
                localTravel.characterId || ""
              ) ===
              String(
                selectedTravelCharacterId || ""
              ) &&
              !stoppedPursuitIdsRef.current.has(
                travelId
              );

            return isLocallyControlledPursuit
              ? localTravel
              : remoteTravel;
          }
        );
      });

      const incoming =
        mappedRemoteTravels.find(
          (travelItem) => {
            if (!isPursuitTravel(travelItem)) {
              return false;
            }

            const pursuitId =
              String(travelItem.id || "");

            if (
              stoppedPursuitIdsRef.current.has(
                pursuitId
              )
            ) {
              return false;
            }

            return (
              String(
                getPursuitTargetCharacterId(
                  travelItem
                )
              ) ===
              String(selectedTravelCharacterId)
            );
          }
        ) ||
        null;

      setIncomingPursuitNotice(incoming);

      if (!incoming) {
        lastIncomingPursuitAlertRef.current = "";
        return;
      }

      const pursuitId = String(
        incoming.id || ""
      );

      if (
        pursuitId &&
        lastIncomingPursuitAlertRef.current !== pursuitId
      ) {
        lastIncomingPursuitAlertRef.current = pursuitId;

        window.setTimeout(() => {
          alert(
            `VOCÊ ESTÁ SENDO PERSEGUIDO!\n\nPerseguidor: ${
              incoming.characterName ||
              "presença desconhecida"
            }`
          );
        }, 0);
      }
    }

    refreshIncomingPursuit();

    const pollingId = window.setInterval(
      refreshIncomingPursuit,
      2000
    );

    const channel = supabase
      .channel(
        `ln-incoming-pursuit-${session.user.id}-${selectedTravelCharacterId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "travels",
        },
        (payload) => {
          if (
            payload?.eventType === "DELETE"
          ) {
            const deletedTravelId =
              String(
                payload?.old?.id ||
                ""
              );

            if (deletedTravelId) {
              stoppedPursuitIdsRef.current.add(
                deletedTravelId
              );

              pursuitSyncRef.current.delete(
                deletedTravelId
              );

              pursuitActionRef.current.delete(
                `cancel:${deletedTravelId}`
              );

              pursuitActionRef.current.delete(
                `finish:${deletedTravelId}`
              );

              setTravels(
                (currentTravels) =>
                  currentTravels.filter(
                    (travelItem) =>
                      String(
                        travelItem.id || ""
                      ) !== deletedTravelId
                  )
              );
            }

            setIncomingPursuitNotice(
              (currentNotice) => {
                if (
                  !currentNotice ||
                  !deletedTravelId ||
                  String(
                    currentNotice.id
                  ) !==
                    deletedTravelId
                ) {
                  return currentNotice;
                }

                lastIncomingPursuitAlertRef.current =
                  "";

                return null;
              }
            );
          }

          refreshIncomingPursuit();
        }
      )
      .subscribe();

    return () => {
      disposed = true;

      window.clearInterval(
        pollingId
      );

      supabase.removeChannel(
        channel
      );
    };
  }, [
    session?.user?.id,
    selectedTravelCharacterId,
  ]);

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


  async function loadMapCharacters() {
    if (!isSupabaseConfigured || !supabase) {
      setMapCharacters(readSavedCharacters());
      return;
    }

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar personagens do mapa:", error.message);
      setMapCharacters(readSavedCharacters());
      return;
    }

    const mappedCharacters = (data || [])
      .map((row) => dbCharacterToAppCharacter(row, session?.user || null))
      .filter(Boolean);

    setMapCharacters(mappedCharacters);
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

  // LN FIX: carregar pings ao abrir mapa
  // Atualiza personagens e ocupantes dos pings no mapa.
  useEffect(() => {
    if (activePage !== "map") return;

    loadMapCharacters();

    const timer = window.setInterval(() => {
      loadMapCharacters();
    }, 8000);

    return () => window.clearInterval(timer);
  }, [activePage, session?.user?.id]);


  useEffect(() => {
    if (activePage !== "map") return;

    loadMapPings();

    const timer = window.setInterval(() => {
      loadMapPings();
    }, 8000);

    return () => window.clearInterval(timer);
  }, [activePage, session?.user?.id]);


  async function saveCharacterLocation(characterId, coord, extraLocation = {}) {
    if (!characterId || !coord) return;

    const locationPayload = {
      coord,
      center: getSmallCellCenter(coord),
      ...extraLocation,
      updatedAt: new Date().toISOString()
    };

    const nextLocations = {
      ...characterLocations,
      [characterId]: locationPayload
    };

    setCharacterLocations(nextLocations);
    writeCharacterLocations(nextLocations);

    setMapCharacters((currentCharacters) =>
      currentCharacters.map((character) =>
        String(character.id) === String(characterId)
          ? {
              ...character,
              currentLocation: locationPayload,
              profileSheet: {
                ...(character.profileSheet || {}),
                currentLocation: locationPayload
              }
            }
          : character
      )
    );

    if (isSupabaseConfigured && supabase) {
      const currentCharacter = mapCharacters.find(
        (character) => String(character.id) === String(characterId)
      );

      const nextProfileSheet = {
        ...(currentCharacter?.profileSheet || {}),
        currentLocation: locationPayload
      };

      const { error } = await supabase
        .from("characters")
        .update({ profile_sheet: nextProfileSheet })
        .eq("id", characterId);

      if (error) {
        console.error("Erro ao salvar localização do personagem:", error.message);
      }
    }
  }

  function getCenterCoordinate() {
    return getCoordinate({
      lat: GRID_TOP + gridHeight / 2,
      lng: GRID_LEFT + gridWidth / 2
    });
  }

  function getCurrentCoordinateForCharacter(characterId) {
    const existingTravel = travels.find(
      (travel) =>
        String(travel.characterId) === String(characterId) &&
        getTravelProgress(travel, now) < 1
    );

    if (existingTravel) {
      const currentPoint = getTravelCurrentPoint(existingTravel, now);

      return getCoordinate({
        lat: currentPoint[0],
        lng: currentPoint[1]
      });
    }

    const savedLocation =
      characterLocations[String(characterId)] ||
      characterLocations[characterId];

    if (savedLocation?.coord) {
      return savedLocation.coord;
    }

    const linkedCharacter =
      mapCharacters.find((character) => String(character.id) === String(characterId)) ||
      travelCharacters.find((character) => String(character.id) === String(characterId));

    const onlineLocation =
      linkedCharacter?.currentLocation ||
      linkedCharacter?.profileSheet?.currentLocation ||
      linkedCharacter?.profile_sheet?.currentLocation ||
      null;

    if (onlineLocation?.coord) {
      return onlineLocation.coord;
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
    setSelectedPursuitPresence(null);
    setSelectedPursuitPresenceGroup(null);

    if (!selectedTravelCharacter) {
      alert("Selecione um personagem para iniciar a viagem.");
      return;
    }

    const currentPursuit =
      travels.find(
        (travelItem) =>
          String(travelItem.characterId) ===
            String(selectedTravelCharacter.id) &&
          isPursuitTravel(travelItem)
      ) ||
      null;

    if (currentPursuit) {
      await cancelPursuitCommonTravel(
        currentPursuit,
        "replaced",
        {
          silent: true,
        }
      );
    }

    if (
      isCharacterInsideAnyPing(
        getSelectedTravelCharacterLive()
      )
    ) {
      alert(
        "Seu personagem está dentro de um local. Use “Sair deste local” antes de iniciar outra viagem."
      );
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

    // LN SAFE START TRAVEL: impede que erro de cálculo/centro derrube a página.
    let travelData;

    try {
      travelData = calculateTravelForSelectedMode(startCoord, endCoord, travelMode);
    } catch (error) {
      console.error("Erro ao calcular viagem:", {
        error,
        startCoord,
        endCoord,
        travelMode,
      });
      alert(`Erro ao calcular viagem: ${error?.message || error}`);
      return;
    }

    const isValidTravelCenter = (point) =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(Number(point[0])) &&
      Number.isFinite(Number(point[1]));

    let startCenter;
    let endCenter;

    try {
      startCenter = getSelectedPointCenter(startCoord);
      endCenter = getSelectedPointCenter(endCoord);
    } catch (error) {
      console.error("Erro ao calcular centro da viagem:", {
        error,
        startCoord,
        endCoord,
      });
      alert(`Erro ao calcular centro da viagem: ${error?.message || error}`);
      return;
    }

    if (!isValidTravelCenter(startCenter) || !isValidTravelCenter(endCenter)) {
      console.error("Centro inválido ao iniciar viagem:", {
        startCoord,
        endCoord,
        startCenter,
        endCenter,
      });
      alert("Erro ao iniciar viagem: origem ou destino gerou coordenada inválida. Veja o Console.");
      return;
    }

    if ((travelData.modeKey || travelMode) === "teletransporte" || travelData.instant) {
      setSelectedPursuitPresence(null);
      setSelectedPursuitPresenceGroup(null);

      await saveCharacterLocation(selectedTravelCharacter.id, endCoord);

      setTravels((currentTravels) =>
        currentTravels.filter(
          (travel) => String(travel.characterId) !== String(selectedTravelCharacter.id)
        )
      );

      if (isSupabaseConfigured && supabase && session?.user) {
        const { error: deleteTeleportTravelError } = await supabase
          .from("travels")
          .delete()
          .eq("character_id", selectedTravelCharacter.id);

        if (deleteTeleportTravelError) {
          console.error("Erro ao limpar viagens do teletransporte:", deleteTeleportTravelError.message);
        }
      }

      setPoints([]);
      return;
    }

    const incomingPursuit =
      travels.find(
        (travelItem) =>
          isPursuitTravel(travelItem) &&
          String(
            getPursuitTargetCharacterId(
              travelItem
            )
          ) ===
            String(
              selectedTravelCharacter.id
            )
      ) ||
      null;

    const pursuitTravelModifier =
      incomingPursuit
        ? {
            multiplier:
              PURSUIT_TARGET_SPEED_MULTIPLIER,
            label: "perseguido",
            pursuitId:
              incomingPursuit.id,
          }
        : null;

    const activeTravelModifier =
      endCoord?.travelModifier ||
      pursuitTravelModifier ||
      null;

    const travelSpeedMultiplier = Math.max(
      1,
      Number(
        activeTravelModifier?.multiplier ||
        1
      )
    );

    const effectiveEndCoord =
      incomingPursuit
        ? {
            ...endCoord,
            pursuitBoost: {
              pursuitId:
                incomingPursuit.id,
              multiplier:
                PURSUIT_TARGET_SPEED_MULTIPLIER,
              originalModeLabel:
                travelData.modeLabel ||
                "Viagem",
            },
          }
        : endCoord;
    const baseTravelHours = Number(travelData?.hours);

    if (!Number.isFinite(baseTravelHours) || baseTravelHours < 0) {
      console.error("Duração inválida ao iniciar viagem:", {
        travelData,
        baseTravelHours,
        startCoord,
        endCoord,
        travelMode,
      });
      alert("Erro ao iniciar viagem: duração inválida. Veja o Console.");
      return;
    }

    const effectiveTravelHours = travelSpeedMultiplier > 1
      ? baseTravelHours / travelSpeedMultiplier
      : baseTravelHours;
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
      pursuitBoostedBy:
        incomingPursuit?.id || "",
      pursuitTargetMultiplier:
        incomingPursuit
          ? PURSUIT_TARGET_SPEED_MULTIPLIER
          : 1,
      modeLabelBeforePursuit:
        incomingPursuit
          ? travelData.modeLabel
          : "",
      pursuitTarget: endCoord?.pursuitTarget || null,
      normalDurationHours: travelData.hours,
      speedMultiplier: travelSpeedMultiplier,
      startCoord,
      endCoord: effectiveEndCoord,
      startCenter,
      endCenter,
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

    // Não salva a localização final no início da viagem.
    // A localização final deve ser gravada apenas ao chegar, cancelar ou teleportar.
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
        end_coord: effectiveEndCoord,
        start_center: startCenter,
        end_center: endCenter,
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
          (travel) => String(travel.characterId) !== String(selectedTravelCharacter.id)
        ),
      ]);

      setPoints([]);
      return;
    }

    setTravels((currentTravels) => [
      newTravel,
      ...currentTravels.filter(
        (travel) => String(travel.characterId) !== String(selectedTravelCharacter.id)
      ),
    ]);

    setPoints([]);
  }

  async function cancelTravel(travelId) {
    const travelToCancel =
      travels.find(
        (travel) =>
          String(travel.id) ===
          String(travelId)
      );

    if (
      travelToCancel &&
      isPursuitTravel(travelToCancel)
    ) {
      await cancelPursuitCommonTravel(
        travelToCancel,
        "manual"
      );
      return;
    }

    if (travelToCancel) {
      const currentPoint =
        getTravelCurrentPoint(
          travelToCancel,
          now
        );

      const currentCoord =
        getCoordinate({
          lat: currentPoint[0],
          lng: currentPoint[1],
        });

      if (currentCoord) {
        await saveCharacterLocation(
          travelToCancel.characterId,
          currentCoord,
          {
            center: currentPoint,
          }
        );
      }
    }

    if (
      isSupabaseConfigured &&
      supabase &&
      session?.user
    ) {
      const { error } = await supabase
        .from("travels")
        .delete()
        .eq("id", travelId);

      if (error) {
        alert(
          `Erro ao remover viagem: ${error.message}`
        );
        return;
      }
    }

    setTravels((currentTravels) =>
      currentTravels.filter(
        (travel) =>
          String(travel.id) !==
          String(travelId)
      )
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


function getPointCoord(point) {
    if (!Array.isArray(point) || point.length < 2) return null;

    const lat = Number(point[0]);
    const lng = Number(point[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return getCoordinate({ lat, lng });
  }

  function getActiveTravelForCharacter(characterId, list = travels) {
    const id = String(characterId || "");

    if (!id) return null;

    return (
      list.find(
        (travelItem) =>
          String(travelItem.characterId) === id &&
          (
            isPursuitTravel(travelItem) ||
            getTravelProgress(travelItem, now) < 1
          )
      ) || null
    );
  }

  function getCurrentPointForCharacter(characterId, list = travels) {
    const id = String(characterId || "");

    if (!id || dimensionLocations[id]) {
      return null;
    }

    const activeTravel =
      getActiveTravelForCharacter(id, list);

    if (activeTravel) {
      return getTravelCurrentPoint(
        activeTravel,
        now
      );
    }

    const linkedCharacter =
      mapCharacters.find(
        (character) =>
          String(character.id) === id
      ) ||
      travelCharacters.find(
        (character) =>
          String(character.id) === id
      ) ||
      null;

    const savedLocation =
      characterLocations[id] ||
      linkedCharacter?.currentLocation ||
      linkedCharacter?.profileSheet?.currentLocation ||
      linkedCharacter?.profile_sheet?.currentLocation ||
      null;

    const savedCoord =
      savedLocation?.coord ||
      getCurrentCoordinateForCharacter(id);

    return (
      getLocationMapPoint(
        savedLocation,
        savedCoord
      ) ||
      (
        savedCoord
          ? getSmallCellCenter(savedCoord)
          : null
      )
    );
  }

function getDistanceInProvincesByPoints(pointA, pointB) {
    const coordA = getPointCoord(pointA);
    const coordB = getPointCoord(pointB);

    if (
      coordA &&
      coordB &&
      Number.isFinite(Number(coordA.globalSmallCol)) &&
      Number.isFinite(Number(coordA.globalSmallRow)) &&
      Number.isFinite(Number(coordB.globalSmallCol)) &&
      Number.isFinite(Number(coordB.globalSmallRow))
    ) {
      const dx = Number(coordA.globalSmallCol) - Number(coordB.globalSmallCol);
      const dy = Number(coordA.globalSmallRow) - Number(coordB.globalSmallRow);
      return Math.sqrt(dx * dx + dy * dy);
    }

    if (!Array.isArray(pointA) || !Array.isArray(pointB)) return Infinity;

    const dy = Number(pointA[0]) - Number(pointB[0]);
    const dx = Number(pointA[1]) - Number(pointB[1]);

    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return Infinity;

    return Math.sqrt(dx * dx + dy * dy);
  }


  function getMapCharacterById(characterId) {
    const id = String(characterId || "");

    return (
      mapCharacters.find(
        (character) =>
          String(character.id) === id
      ) ||
      travelCharacters.find(
        (character) =>
          String(character.id) === id
      ) ||
      null
    );
  }

  function getTravelPersistencePayload(
    travelItem,
    {
      includeId = false,
      includeUser = false,
    } = {}
  ) {
    const payload = {
      character_id: travelItem.characterId,
      character_name:
        travelItem.characterName ||
        "Ninja",
      character_icon_url:
        travelItem.characterIconUrl ||
        "",
      travel_mode:
        travelItem.travelMode ||
        "terrestre",
      mode_label:
        travelItem.modeLabel ||
        "Viagem",
      start_coord:
        travelItem.startCoord ||
        {},
      end_coord:
        travelItem.endCoord ||
        {},
      start_center:
        travelItem.startCenter,
      end_center:
        travelItem.endCenter,
      duration_hours:
        Number(travelItem.durationHours || 0),
      duration_days:
        Number(travelItem.durationDays || 0),
      distance_feet:
        Number(travelItem.distanceFeet || 0),
      started_at:
        travelItem.startedAt,
      arrival_at:
        travelItem.arrivalAt,
    };

    if (includeId && travelItem.id) {
      payload.id = travelItem.id;
    }

    if (
      includeUser &&
      session?.user?.id
    ) {
      payload.user_id =
        session.user.id;
    }

    return payload;
  }

  async function insertPursuitTravelOnline(travelItem) {
    if (
      !isSupabaseConfigured ||
      !supabase ||
      !session?.user
    ) {
      return travelItem;
    }

    const { error: deleteError } = await supabase
      .from("travels")
      .delete()
      .eq(
        "character_id",
        travelItem.characterId
      );

    if (deleteError) {
      throw deleteError;
    }

    const { data, error } = await supabase
      .from("travels")
      .insert(
        getTravelPersistencePayload(
          travelItem,
          {
            includeId: true,
            includeUser: true,
          }
        )
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return normalizeTravelPursuitState(
      dbTravelToAppTravel(data)
    );
  }

  async function updateTravelSnapshotOnline(travelItem) {
    if (
      !isSupabaseConfigured ||
      !supabase ||
      !session?.user ||
      !travelItem?.id
    ) {
      return;
    }

    const { error } = await supabase
      .from("travels")
      .update(
        getTravelPersistencePayload(
          travelItem
        )
      )
      .eq("id", travelItem.id);

    if (error) {
      console.warn(
        "[LN Digital] Não foi possível sincronizar a viagem:",
        error.message
      );
    }
  }

  async function deleteCharacterTravelsOnline(characterIds = []) {
    const cleanIds = Array.from(
      new Set(
        characterIds
          .map((id) => String(id || ""))
          .filter(Boolean)
      )
    );

    if (
      cleanIds.length === 0 ||
      !isSupabaseConfigured ||
      !supabase ||
      !session?.user
    ) {
      return;
    }

    const { error } = await supabase
      .from("travels")
      .delete()
      .in("character_id", cleanIds);

    if (error) {
      console.warn(
        "[LN Digital] Não foi possível limpar viagens:",
        error.message
      );
    }
  }


  function rebaseTravelFromPoint(travelItem, startPoint, multiplier = 1, labelSuffix = "") {
    const startCoord = getPointCoord(startPoint);

    if (!travelItem || !startCoord || !travelItem.endCoord) return travelItem;

    const remaining = calculateTravelForSelectedMode(
      startCoord,
      travelItem.endCoord,
      travelItem.travelMode || "terrestre"
    );

    const speedMultiplier = Math.max(1, Number(multiplier || 1));
    const durationHours = Math.max(0.01, Number(remaining.hours || 0.01) / speedMultiplier);
    const startedAt = new Date().toISOString();

    return {
      ...travelItem,
      startCoord,
      startCenter: startPoint,
      durationHours,
      durationDays: durationHours / 24,
      normalDurationHours: remaining.hours || durationHours,
      speedMultiplier,
      startedAt,
      arrivalAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
      modeLabel: labelSuffix
        ? `${travelItem.modeLabelBeforePursuit || travelItem.modeLabel || "Viagem"} ${labelSuffix}`
        : travelItem.modeLabelBeforePursuit || travelItem.modeLabel || "Viagem",
    };
  }


  async function finishPursuitCommonTravel(
    pursuitTravel,
    targetPoint
  ) {
    if (
      !pursuitTravel ||
      !targetPoint
    ) {
      return;
    }

    /*
      Defesa adicional: o alvo pode receber a viagem pelo
      Realtime, mas nunca pode executar sua conclusão.
    */
    if (
      String(
        pursuitTravel.characterId ||
        ""
      ) !==
      String(
        selectedTravelCharacterId ||
        ""
      )
    ) {
      return;
    }

    const actionKey =
      `finish:${pursuitTravel.id}`;

    if (
      pursuitActionRef.current.has(
        actionKey
      )
    ) {
      return;
    }

    pursuitActionRef.current.add(
      actionKey
    );

    try {
      const finalCoord =
        getPointCoord(targetPoint);

      if (!finalCoord) {
        throw new Error(
          "Coordenada final inválida."
        );
      }

      const followerId = String(
        pursuitTravel.characterId ||
        ""
      );

      const targetId = String(
        getPursuitTargetCharacterId(
          pursuitTravel
        )
      );

      if (!followerId || !targetId) {
        throw new Error(
          "Perseguidor ou alvo inválido."
        );
      }

      const exactCenter = [
        Number(targetPoint[0]),
        Number(targetPoint[1]),
      ];

      const locationPayload = {
        coord: finalCoord,
        center: exactCenter,
        updatedAt:
          new Date().toISOString(),
      };

      if (
        isSupabaseConfigured &&
        supabase &&
        session?.user
      ) {
        const { error } = await supabase.rpc(
          "ln_finish_pursuit",
          {
            p_follower_id:
              followerId,
            p_target_id:
              targetId,
            p_coord:
              finalCoord,
            p_center:
              exactCenter,
          }
        );

        if (error) {
          throw new Error(
            `Falha ao interromper as viagens no banco: ${error.message}`
          );
        }
      } else {
        await Promise.all([
          saveCharacterLocation(
            followerId,
            finalCoord,
            {
              center: exactCenter,
            }
          ),
          saveCharacterLocation(
            targetId,
            finalCoord,
            {
              center: exactCenter,
            }
          ),
        ]);
      }

      stoppedPursuitIdsRef.current.add(
        String(pursuitTravel.id)
      );

      setCharacterLocations(
        (currentLocations) => {
          const nextLocations = {
            ...currentLocations,
            [followerId]:
              locationPayload,
            [targetId]:
              locationPayload,
          };

          writeCharacterLocations(
            nextLocations
          );

          return nextLocations;
        }
      );

      setMapCharacters(
        (currentCharacters) =>
          currentCharacters.map(
            (character) => {
              const characterId =
                String(
                  character.id || ""
                );

              if (
                characterId !== followerId &&
                characterId !== targetId
              ) {
                return character;
              }

              return {
                ...character,
                currentLocation:
                  locationPayload,
                profileSheet: {
                  ...(character.profileSheet || {}),
                  currentLocation:
                    locationPayload,
                },
              };
            }
          )
      );

      setTravels(
        (currentTravels) =>
          currentTravels.filter(
            (travelItem) => {
              const characterId =
                String(
                  travelItem.characterId ||
                  ""
                );

              return (
                characterId !== followerId &&
                characterId !== targetId
              );
            }
          )
      );

      pursuitSyncRef.current.delete(
        String(pursuitTravel.id)
      );

      setIncomingPursuitNotice(null);
      setPoints([]);

      if (
        isSupabaseConfigured &&
        supabase &&
        session?.user
      ) {
        await Promise.all([
          loadOnlineTravels(),
          loadMapCharacters(),
        ]);
      }

      alert(
        "INTERCEPTAÇÃO CONCLUÍDA!\n\nAs viagens do perseguidor e do alvo foram interrompidas. Ambos ficaram na mesma coordenada."
      );
    } catch (error) {
      pursuitActionRef.current.delete(
        actionKey
      );

      console.error(
        "Erro ao concluir perseguição:",
        error
      );

      alert(
        error?.message ||
        "Não foi possível concluir a interceptação."
      );
    }
  }

  async function cancelPursuitCommonTravel(
    pursuitTravel,
    reason = "cancel",
    options = {}
  ) {
    if (!pursuitTravel) {
      return;
    }

    /*
      A vítima observa a perseguição, mas não pode cancelar
      a viagem pertencente ao perseguidor.
    */
    if (
      String(
        pursuitTravel.characterId ||
        ""
      ) !==
      String(
        selectedTravelCharacterId ||
        ""
      )
    ) {
      return;
    }

    const actionKey =
      `cancel:${pursuitTravel.id}`;

    if (
      pursuitActionRef.current.has(
        actionKey
      )
    ) {
      return;
    }

    pursuitActionRef.current.add(
      actionKey
    );

    try {
      const followerId = String(
        pursuitTravel.characterId ||
        ""
      );

      const targetId = String(
        getPursuitTargetCharacterId(
          pursuitTravel
        ) ||
        ""
      );

      if (!followerId || !targetId) {
        throw new Error(
          "Perseguidor ou alvo inválido."
        );
      }

      /*
        Posição exata do perseguidor no instante
        em que a perseguição é interrompida.
      */
      const followerPoint =
        getTravelCurrentPoint(
          pursuitTravel,
          now
        );

      const followerCoord =
        getPointCoord(
          followerPoint
        );

      if (
        !followerPoint ||
        !followerCoord
      ) {
        throw new Error(
          "Não foi possível determinar a posição atual do perseguidor."
        );
      }

      /*
        O alvo pode estar com uma viagem acelerada ×3.
        Ela será recalculada a partir da posição atual
        usando novamente a velocidade normal.
      */
      const targetTravel =
        travels.find(
          (travelItem) =>
            String(
              travelItem.pursuitBoostedBy ||
              ""
            ) ===
            String(pursuitTravel.id)
        ) ||
        null;

      let restoredTargetTravel = null;

      if (targetTravel) {
        const targetPoint =
          getTravelCurrentPoint(
            targetTravel,
            now
          );

        const cleanTargetTravel =
          stripPursuitBoost(
            targetTravel
          );

        restoredTargetTravel = {
          ...rebaseTravelFromPoint(
            cleanTargetTravel,
            targetPoint,
            1,
            ""
          ),
          modeLabel:
            cleanTargetTravel.modeLabel ||
            "Viagem",
          pursuitBoostedBy: "",
          pursuitTargetMultiplier: 1,
          modeLabelBeforePursuit: "",
        };
      }

      const targetPayload =
        restoredTargetTravel
          ? {
              start_coord:
                restoredTargetTravel.startCoord,
              end_coord:
                restoredTargetTravel.endCoord,
              start_center:
                restoredTargetTravel.startCenter,
              end_center:
                restoredTargetTravel.endCenter,
              mode_label:
                restoredTargetTravel.modeLabel,
              duration_hours:
                restoredTargetTravel.durationHours,
              duration_days:
                restoredTargetTravel.durationDays,
              distance_feet:
                restoredTargetTravel.distanceFeet,
              started_at:
                restoredTargetTravel.startedAt,
              arrival_at:
                restoredTargetTravel.arrivalAt,
            }
          : null;

      if (
        isSupabaseConfigured &&
        supabase &&
        session?.user
      ) {
        const { error } =
          await supabase.rpc(
            "ln_cancel_pursuit",
            {
              p_pursuit_id:
                pursuitTravel.id,
              p_follower_id:
                followerId,
              p_target_id:
                targetId,
              p_follower_coord:
                followerCoord,
              p_follower_center:
                followerPoint,
              p_target_travel_id:
                restoredTargetTravel?.id ||
                null,
              p_target_payload:
                targetPayload,
            }
          );

        if (error) {
          throw new Error(
            `Falha ao interromper perseguição no banco: ${error.message}`
          );
        }
      } else {
        await saveCharacterLocation(
          followerId,
          followerCoord,
          {
            center:
              followerPoint,
          }
        );
      }

      /*
        A partir deste ponto a perseguição está definitivamente
        encerrada neste navegador. Mesmo que uma renderização
        antiga ainda tenha a viagem, o motor não poderá retomá-la.
      */
      stoppedPursuitIdsRef.current.add(
        String(pursuitTravel.id)
      );

      const followerLocationPayload = {
        coord:
          followerCoord,
        center:
          followerPoint,
        updatedAt:
          new Date().toISOString(),
      };

      /*
        Atualização local imediata:
        o perseguidor fica parado na posição atual.
      */
      setCharacterLocations(
        (currentLocations) => {
          const nextLocations = {
            ...currentLocations,
            [followerId]:
              followerLocationPayload,
          };

          writeCharacterLocations(
            nextLocations
          );

          return nextLocations;
        }
      );

      setMapCharacters(
        (currentCharacters) =>
          currentCharacters.map(
            (character) => {
              if (
                String(character.id) !==
                followerId
              ) {
                return character;
              }

              return {
                ...character,
                currentLocation:
                  followerLocationPayload,
                profileSheet: {
                  ...(character.profileSheet || {}),
                  currentLocation:
                    followerLocationPayload,
                },
              };
            }
          )
      );

      /*
        Remove qualquer viagem pertencente ao perseguidor,
        não somente a linha que estava marcada como perseguição.
      */
      setTravels(
        (currentTravels) =>
          currentTravels
            .filter(
              (travelItem) =>
                String(
                  travelItem.characterId ||
                  ""
                ) !== followerId
            )
            .map((travelItem) => {
              if (
                !restoredTargetTravel ||
                String(travelItem.id) !==
                  String(
                    restoredTargetTravel.id
                  )
              ) {
                return travelItem;
              }

              return restoredTargetTravel;
            })
      );

      pursuitSyncRef.current.delete(
        String(pursuitTravel.id)
      );

      setSelectedPursuitPresence(
        null
      );

      setSelectedPursuitPresenceGroup(
        null
      );

      setIncomingPursuitNotice(
        (currentNotice) =>
          String(
            currentNotice?.id ||
            ""
          ) ===
          String(pursuitTravel.id)
            ? null
            : currentNotice
      );

      setPoints([]);

      if (
        isSupabaseConfigured &&
        supabase &&
        session?.user
      ) {
        await Promise.all([
          loadOnlineTravels(),
          loadMapCharacters(),
        ]);
      }

      if (options.silent) {
        return;
      }

      if (reason === "dimension") {
        alert(
          "Perseguição interrompida: o alvo entrou em outra dimensão. O perseguidor parou na posição atual."
        );
        return;
      }

      if (reason === "distance") {
        alert(
          "Perseguição interrompida: o alvo ficou a mais de 6 províncias. O perseguidor parou na posição atual."
        );
        return;
      }

      if (reason === "lost") {
        alert(
          "Perseguição interrompida: o alvo não pôde mais ser localizado. O perseguidor parou na posição atual."
        );
        return;
      }

      if (reason === "manual") {
        alert(
          "Perseguição cancelada. O perseguidor parou na posição atual."
        );
        return;
      }

      alert(
        "Perseguição interrompida. O perseguidor parou na posição atual."
      );
    } catch (error) {
      pursuitActionRef.current.delete(
        actionKey
      );

      console.error(
        "Erro ao cancelar perseguição:",
        error
      );

      alert(
        error?.message ||
        "Não foi possível interromper a perseguição."
      );
    }
  }

  async function startPursuitCommonTravel(presence) {
    if (!selectedTravelCharacter) {
      alert(
        "Selecione o seu personagem antes de iniciar perseguição."
      );
      return;
    }

    if (!presence?.targetCharacterId) {
      alert(
        "Esta presença não possui alvo válido para perseguição."
      );
      return;
    }

    const followerId = String(
      selectedTravelCharacter.id
    );

    const targetId = String(
      presence.targetCharacterId
    );

    if (followerId === targetId) {
      alert(
        "Você não pode perseguir o próprio personagem."
      );
      return;
    }

    if (
      isCharacterInsideAnyPing(
        getSelectedTravelCharacterLive()
      )
    ) {
      alert(
        "Saia do local antes de iniciar uma perseguição."
      );
      return;
    }

    if (dimensionLocations[followerId]) {
      alert(
        "Você não pode iniciar perseguição enquanto estiver em outra dimensão."
      );
      return;
    }

    if (dimensionLocations[targetId]) {
      alert(
        "O alvo está em outra dimensão."
      );
      return;
    }

    const followerPoint =
      getCurrentPointForCharacter(
        followerId
      );

    const targetPoint =
      getCurrentPointForCharacter(
        targetId
      ) ||
      presence.position ||
      null;

    const followerCoord =
      followerPoint
        ? getPointCoord(followerPoint)
        : null;

    const targetCoord =
      targetPoint
        ? getPointCoord(targetPoint)
        : null;

    if (!followerPoint || !followerCoord) {
      alert(
        "Não foi possível determinar a posição atual do perseguidor."
      );
      return;
    }

    if (!targetPoint || !targetCoord) {
      alert(
        "Não foi possível determinar a posição atual do alvo."
      );
      return;
    }

    const initialDistance =
      getDistanceInProvincesByPoints(
        followerPoint,
        targetPoint
      );

    if (
      initialDistance >
      PURSUIT_BREAK_DISTANCE_PROVINCES
    ) {
      alert(
        "O alvo está a mais de 6 províncias. A perseguição não pode começar."
      );
      return;
    }

    const previousPursuit =
      travels.find(
        (travelItem) =>
          String(travelItem.characterId) ===
            followerId &&
          isPursuitTravel(travelItem)
      ) ||
      null;

    if (previousPursuit) {
      await cancelPursuitCommonTravel(
        previousPursuit,
        "replaced",
        {
          silent: true,
        }
      );
    }

    if (travelMode === "teletransporte") {
      const finalCoord =
        getPointCoord(targetPoint);

      if (!finalCoord) {
        alert(
          "Não foi possível determinar a coordenada atual do alvo."
        );
        return;
      }

      const exactCenter = [
        Number(targetPoint[0]),
        Number(targetPoint[1]),
      ];

      if (
        !Number.isFinite(exactCenter[0]) ||
        !Number.isFinite(exactCenter[1])
      ) {
        alert(
          "Não foi possível determinar a posição exata do alvo."
        );
        return;
      }

      const locationPayload = {
        coord: finalCoord,
        center: exactCenter,
        updatedAt:
          new Date().toISOString(),
      };

      /*
        No modo online, o banco move os dois personagens
        e encerra as duas viagens em uma única operação.
      */
      if (
        isSupabaseConfigured &&
        supabase &&
        session?.user
      ) {
        const { error } =
          await supabase.rpc(
            "ln_teleport_pursuit",
            {
              p_follower_id:
                followerId,
              p_target_id:
                targetId,
              p_coord:
                finalCoord,
              p_center:
                exactCenter,
            }
          );

        if (error) {
          console.error(
            "Erro no teletransporte da perseguição:",
            error
          );

          alert(
            `Falha ao executar teletransporte: ${error.message}`
          );
          return;
        }
      }

      /*
        Atualização local atômica.

        Os dois personagens são gravados juntos para impedir
        que a localização do alvo sobrescreva a do perseguidor.
      */
      setCharacterLocations(
        (currentLocations) => {
          const nextLocations = {
            ...currentLocations,
            [followerId]:
              locationPayload,
            [targetId]:
              locationPayload,
          };

          writeCharacterLocations(
            nextLocations
          );

          return nextLocations;
        }
      );

      const applyTeleportLocation =
        (character) => {
          const characterId = String(
            character?.id || ""
          );

          if (
            characterId !== followerId &&
            characterId !== targetId
          ) {
            return character;
          }

          return {
            ...character,
            currentLocation:
              locationPayload,
            profileSheet: {
              ...(character.profileSheet || {}),
              currentLocation:
                locationPayload,
            },
            profile_sheet: {
              ...(character.profile_sheet || {}),
              currentLocation:
                locationPayload,
            },
          };
        };

      setMapCharacters(
        (currentCharacters) =>
          currentCharacters.map(
            applyTeleportLocation
          )
      );

      setTravelCharacters(
        (currentCharacters) =>
          currentCharacters.map(
            applyTeleportLocation
          )
      );

      /*
        Teletransporte intercepta imediatamente:
        nenhuma viagem dos dois permanece na tela.
      */
      setTravels(
        (currentTravels) =>
          currentTravels.filter(
            (travelItem) => {
              const characterId = String(
                travelItem.characterId ||
                ""
              );

              return (
                characterId !== followerId &&
                characterId !== targetId
              );
            }
          )
      );

      setSelectedPursuitPresence(
        null
      );

      setSelectedPursuitPresenceGroup(
        null
      );

      setPoints([]);

      if (
        isSupabaseConfigured &&
        supabase &&
        session?.user
      ) {
        await Promise.all([
          loadOnlineTravels(),
          loadMapCharacters(),
        ]);
      }

      alert(
        "TELETRANSPORTE CONCLUÍDO!\n\nO perseguidor apareceu na posição exata do alvo. As viagens dos dois foram interrompidas."
      );

      return;
    }

    const pursuitId =
      crypto.randomUUID();

    stoppedPursuitIdsRef.current.delete(
      String(pursuitId)
    );

    const startedAt =
      new Date().toISOString();

    const travelData =
      calculateTravelForSelectedMode(
        followerCoord,
        targetCoord,
        travelMode
      );

    const durationHours = Math.max(
      0.01,
      Number(
        travelData.hours || 0.01
      ) /
        PURSUIT_FOLLOWER_SPEED_MULTIPLIER
    );

    const pursuitMeta = {
      targetCharacterId: targetId,
      targetName:
        presence.characterName ||
        "Presença desconhecida",
      startedAt,
    };

    const pursuitEndCoord =
      attachPursuitMeta(
        targetCoord,
        pursuitMeta
      );

    let pursuitTravel = {
      id: pursuitId,
      isPursuit: true,
      travelKind: "pursuit",
      characterId:
        selectedTravelCharacter.id,
      characterName:
        selectedTravelCharacter.characterName ||
        selectedTravelCharacter.character_name ||
        selectedTravelCharacter.name ||
        "Ninja",
      characterIconUrl:
        getCharacterImageUrl(
          selectedTravelCharacter
        ),
      travelMode:
        travelData.modeKey ||
        travelMode,
      modeLabel:
        `${travelData.modeLabel || "Viagem"} — Perseguição ×${PURSUIT_FOLLOWER_SPEED_MULTIPLIER}`,
      startCoord: followerCoord,
      endCoord: pursuitEndCoord,
      startCenter: followerPoint,
      endCenter: targetPoint,
      durationHours,
      durationDays:
        durationHours / 24,
      normalDurationHours:
        travelData.hours ||
        durationHours,
      speedMultiplier:
        PURSUIT_FOLLOWER_SPEED_MULTIPLIER,
      distanceFeet:
        travelData.feet ||
        travelData.provinces ||
        initialDistance,
      startedAt,
      arrivalAt:
        new Date(
          Date.now() +
          durationHours *
            60 *
            60 *
            1000
        ).toISOString(),
      pursuitTargetCharacterId:
        targetId,
      pursuitTargetName:
        presence.characterName ||
        "Presença desconhecida",
    };

    const targetTravel =
      getActiveTravelForCharacter(
        targetId,
        travels
      );

    let boostedTargetTravel = null;

    if (
      targetTravel &&
      !isPursuitTravel(targetTravel)
    ) {
      const currentTargetPoint =
        getTravelCurrentPoint(
          targetTravel,
          now
        );

      const originalModeLabel =
        targetTravel.modeLabelBeforePursuit ||
        targetTravel.modeLabel ||
        "Viagem";

      boostedTargetTravel =
        withPursuitBoost(
          {
            ...rebaseTravelFromPoint(
              {
                ...targetTravel,
                modeLabelBeforePursuit:
                  originalModeLabel,
              },
              currentTargetPoint,
              PURSUIT_TARGET_SPEED_MULTIPLIER,
              `— perseguido ×${PURSUIT_TARGET_SPEED_MULTIPLIER}`
            ),
            modeLabelBeforePursuit:
              originalModeLabel,
          },
          pursuitId,
          PURSUIT_TARGET_SPEED_MULTIPLIER,
          originalModeLabel
        );
    }

    if (
      isSupabaseConfigured &&
      supabase &&
      session?.user
    ) {
      try {
        pursuitTravel =
          await insertPursuitTravelOnline(
            pursuitTravel
          );
      } catch (error) {
        console.error(
          "Erro ao salvar perseguição:",
          error
        );

        alert(
          `Erro ao iniciar perseguição online: ${
            error?.message || error
          }`
        );
        return;
      }

      if (boostedTargetTravel) {
        await updateTravelSnapshotOnline(
          boostedTargetTravel
        );
      }
    }

    setTravels((currentTravels) => {
      const withoutFollower =
        currentTravels.filter(
          (travelItem) =>
            String(
              travelItem.characterId
            ) !== followerId
        );

      const updatedTravels =
        withoutFollower.map(
          (travelItem) => {
            if (
              !boostedTargetTravel ||
              String(travelItem.id) !==
                String(
                  boostedTargetTravel.id
                )
            ) {
              return travelItem;
            }

            return boostedTargetTravel;
          }
        );

      return [
        ...updatedTravels,
        pursuitTravel,
      ];
    });

    setSelectedPursuitPresence(null);
    setSelectedPursuitPresenceGroup(null);
    setPoints([]);

    alert(
      `Perseguição iniciada. Perseguidor ×${PURSUIT_FOLLOWER_SPEED_MULTIPLIER}; alvo em viagem ×${PURSUIT_TARGET_SPEED_MULTIPLIER}.`
    );
  }

function preparePursuitToUnknownPresence(presence) {
    startPursuitCommonTravel(presence);
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


  // LN INSIDE PING SYSTEM
  function getMapPingPoint(ping) {
    if (!ping) return null;

    const lat = Number(ping.lat);
    const lng = Number(ping.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return [lat, lng];
  }

  function getMapPingCoord(ping) {
    const point = getMapPingPoint(ping);

    if (!point) return null;

    const coord =
      getCoordinate({
        lat: point[0],
        lng: point[1],
      }) || {};

    return {
      ...coord,
      label: coord.label || ping.coord_label || ping.title || "Local",
      macroLabel: coord.macroLabel || ping.macro_label || "",
      destinationId: ping.id,
      destinationName: ping.title || ping.name || "Local",
      destinationSource: "ping",
      exactPoint: {
        lat: point[0],
        lng: point[1],
        y: point[0],
        x: point[1],
      },
      freePoint: {
        lat: point[0],
        lng: point[1],
        y: point[0],
        x: point[1],
      },
    };
  }

  function getCharacterLocationForPing(character) {
    return (
      character?.currentLocation ||
      character?.profileSheet?.currentLocation ||
      character?.profile_sheet?.currentLocation ||
      null
    );
  }

  function getCharacterInsidePing(character) {
    const location = getCharacterLocationForPing(character);

    return (
      location?.insidePing ||
      location?.coord?.insidePing ||
      character?.insidePing ||
      null
    );
  }


  function normalizeInsidePingMapPoint(value) {
    if (Array.isArray(value) && value.length >= 2) {
      const lat = Number(value[0]);
      const lng = Number(value[1]);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lat, lng];
      }
    }

    if (value && typeof value === "object") {
      const lat =
        value.lat ??
        value.y ??
        value.center?.[0] ??
        value.currentPoint?.[0] ??
        value.exactPoint?.lat ??
        value.freePoint?.lat;

      const lng =
        value.lng ??
        value.x ??
        value.center?.[1] ??
        value.currentPoint?.[1] ??
        value.exactPoint?.lng ??
        value.freePoint?.lng;

      const parsedLat = Number(lat);
      const parsedLng = Number(lng);

      if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
        return [parsedLat, parsedLng];
      }
    }

    return null;
  }

  function getLocationMapPoint(location, coord = null) {
    return (
      normalizeInsidePingMapPoint(location?.center) ||
      normalizeInsidePingMapPoint(location?.currentPoint) ||
      normalizeInsidePingMapPoint(coord?.exactPoint) ||
      normalizeInsidePingMapPoint(coord?.freePoint) ||
      normalizeInsidePingMapPoint(coord?.clickedPoint) ||
      normalizeInsidePingMapPoint(coord) ||
      (coord ? getSmallCellCenter(coord) : null)
    );
  }

  function getCharacterSavedLocation(characterId, character = null) {
    return (
      characterLocations[String(characterId)] ||
      characterLocations[characterId] ||
      character?.currentLocation ||
      character?.profileSheet?.currentLocation ||
      character?.profile_sheet?.currentLocation ||
      null
    );
  }

  function isCoordinateInSameProvince(firstCoord, secondCoord) {
    if (!firstCoord || !secondCoord) {
      return false;
    }

    const firstLabel = String(firstCoord.label || "").trim();
    const secondLabel = String(secondCoord.label || "").trim();

    if (firstLabel && secondLabel) {
      return firstLabel === secondLabel;
    }

    const sameMacro =
      String(firstCoord.macroLabel || "").trim() ===
      String(secondCoord.macroLabel || "").trim();

    const firstProvince = String(
      firstCoord.provinceLabel ??
      firstCoord.provinceNumber ??
      ""
    ).trim();

    const secondProvince = String(
      secondCoord.provinceLabel ??
      secondCoord.provinceNumber ??
      ""
    ).trim();

    if (sameMacro && firstProvince && secondProvince) {
      return firstProvince === secondProvince;
    }

    return (
      Number(firstCoord.globalSmallCol) ===
        Number(secondCoord.globalSmallCol) &&
      Number(firstCoord.globalSmallRow) ===
        Number(secondCoord.globalSmallRow)
    );
  }


  function isPointAtPing(point, pingPoint, tolerance = 1.5) {
    if (!Array.isArray(point) || !Array.isArray(pingPoint)) {
      return false;
    }

    const deltaLat = Number(point[0]) - Number(pingPoint[0]);
    const deltaLng = Number(point[1]) - Number(pingPoint[1]);

    if (!Number.isFinite(deltaLat) || !Number.isFinite(deltaLng)) {
      return false;
    }

    return Math.hypot(deltaLat, deltaLng) <= tolerance;
  }

  function isSameMapPingId(a, b) {
    return String(a || "") === String(b || "");
  }

  function isCharacterInsideAnyPing(character) {
    return Boolean(getCharacterInsidePing(character)?.id);
  }

  function getSelectedTravelCharacterLive() {
    if (!selectedTravelCharacter) return null;

    return (
      mapCharacters.find(
        (character) => String(character.id) === String(selectedTravelCharacter.id)
      ) ||
      travelCharacters.find(
        (character) => String(character.id) === String(selectedTravelCharacter.id)
      ) ||
      selectedTravelCharacter
    );
  }

  function isSelectedCharacterInsidePing(ping) {
    const character = getSelectedTravelCharacterLive();

    if (!character || !ping) return false;

    return isSameMapPingId(getCharacterInsidePing(character)?.id, ping.id);
  }

  function getPlayersInsideMapPing(ping) {
    if (!ping?.id) return [];

    const byId = new Map();

    [
      ...mapCharacters,
      ...travelCharacters,
      selectedTravelCharacter,
    ]
      .filter(Boolean)
      .forEach((character) => {
        const insidePing = getCharacterInsidePing(character);

        if (!insidePing || !isSameMapPingId(insidePing.id, ping.id)) {
          return;
        }

        const id = String(character.id || character.characterId || character.characterName);

        if (!byId.has(id)) {
          byId.set(id, {
            id,
            characterName:
              character.characterName ||
              character.character_name ||
              character.name ||
              "Ninja sem nome",
            playerName:
              character.playerName ||
              character.player_name ||
              character.profileSheet?.playerName ||
              character.profile_sheet?.playerName ||
              "",
            enteredAt: insidePing.enteredAt || "",
          });
        }
      });

    return Array.from(byId.values()).sort((a, b) =>
      String(a.characterName).localeCompare(String(b.characterName), "pt-BR")
    );
  }

  async function enterSelectedCharacterIntoPing(ping) {
    if (!selectedTravelCharacter) {
      alert("Selecione seu personagem antes de entrar no local.");
      return;
    }

    const liveCharacter = getSelectedTravelCharacterLive();

    const currentInsidePing = getCharacterInsidePing(liveCharacter);

    if (
      currentInsidePing?.id &&
      isSameMapPingId(currentInsidePing.id, ping?.id)
    ) {
      alert("Seu personagem já está dentro deste local.");
      return;
    }

    const activeTravel = travels.find(
      (travel) =>
        String(travel.characterId) === String(selectedTravelCharacter.id) &&
        getTravelProgress(travel, now) < 1
    );

    if (activeTravel) {
      alert("Aguarde a chegada ao ping antes de entrar no local.");
      return;
    }

    const pingCoord = getMapPingCoord(ping);
    const pingPoint = getMapPingPoint(ping);

    if (!pingCoord || !pingPoint) {
      alert("Este ping não possui coordenada válida.");
      return;
    }

    const savedLocation = getCharacterSavedLocation(
      selectedTravelCharacter.id,
      liveCharacter
    );

    const currentCoord =
      savedLocation?.coord ||
      getCurrentCoordinateForCharacter(selectedTravelCharacter.id);

    if (!isCoordinateInSameProvince(currentCoord, pingCoord)) {
      const currentLabel =
        currentCoord?.label ||
        currentCoord?.provinceLabel ||
        "desconhecida";

      const pingLabel =
        pingCoord?.label ||
        pingCoord?.provinceLabel ||
        "desconhecida";

      alert(
        `Você precisa estar na mesma província deste local. ` +
        `Província atual: ${currentLabel}. ` +
        `Província do ping: ${pingLabel}.`
      );
      return;
    }

    await saveCharacterLocation(
      selectedTravelCharacter.id,
      pingCoord,
      {
        center: pingPoint,
        insidePing: {
          id: ping.id,
          title: ping.title || ping.name || "Local",
          type: ping.type || "Local",
          lat: pingPoint[0],
          lng: pingPoint[1],
          enteredAt: new Date().toISOString(),
        },
      }
    );

    setTravels((currentTravels) =>
      currentTravels.filter(
        (travel) =>
          String(travel.characterId) !==
          String(selectedTravelCharacter.id)
      )
    );

    if (isSupabaseConfigured && supabase && session?.user) {
      const { error } = await supabase
        .from("travels")
        .delete()
        .eq("character_id", selectedTravelCharacter.id);

      if (error) {
        console.error(
          "Erro ao limpar viagem após entrada no ping:",
          error.message
        );
      }
    }

    setSelectedMapPing({ ...ping });

    alert(
      `${selectedTravelCharacter.characterName || "Personagem"} entrou em: ${
        ping.title || ping.name || "local"
      }.`
    );
  }

  async function leaveSelectedCharacterFromPing(ping) {
    if (!selectedTravelCharacter) {
      alert("Selecione seu personagem antes de sair do local.");
      return;
    }

    const liveCharacter = getSelectedTravelCharacterLive();
    const currentInsidePing = getCharacterInsidePing(liveCharacter);

    if (
      !currentInsidePing?.id ||
      !isSameMapPingId(currentInsidePing.id, ping?.id)
    ) {
      alert("Seu personagem não está dentro deste local.");
      return;
    }

    const pingCoord = getMapPingCoord(ping);
    const pingPoint = getMapPingPoint(ping);

    if (!pingCoord || !pingPoint) {
      alert("Este ping não possui coordenada válida.");
      return;
    }

    await saveCharacterLocation(
      selectedTravelCharacter.id,
      pingCoord,
      {
        center: pingPoint,
        insidePing: null,
      }
    );

    setSelectedMapPing({ ...ping });

    alert(
      `${selectedTravelCharacter.characterName || "Personagem"} saiu de: ${
        ping.title || ping.name || "local"
      }.`
    );
  }



  // LN PING ARRIVAL SYSTEM
  useEffect(() => {
    if (!selectedTravelCharacterId) return;

    const arrivedPingTravels = travels.filter((travel) => {
      if (
        String(travel.characterId) !==
        String(selectedTravelCharacterId)
      ) {
        return false;
      }

      const destinationSource =
        travel?.endCoord?.destinationSource ||
        travel?.endCoord?.destination_source ||
        "";

      const destinationId =
        travel?.endCoord?.destinationId ||
        travel?.endCoord?.destination_id ||
        "";

      return (
        destinationSource === "ping" &&
        destinationId &&
        getTravelProgress(travel, now) >= 1 &&
        !pingArrivalHandledRef.current.has(String(travel.id))
      );
    });

    if (arrivedPingTravels.length === 0) return;

    for (const travel of arrivedPingTravels) {
      const travelId = String(travel.id);

      pingArrivalHandledRef.current.add(travelId);

      const destinationId =
        travel?.endCoord?.destinationId ||
        travel?.endCoord?.destination_id;

      const ping = mapPings.find(
        (item) => String(item.id) === String(destinationId)
      );

      const fallbackPoint =
        normalizeInsidePingMapPoint(travel?.endCoord?.exactPoint) ||
        normalizeInsidePingMapPoint(travel?.endCoord?.freePoint) ||
        normalizeInsidePingMapPoint(travel?.endCenter);

      const pingPoint =
        getMapPingPoint(ping) ||
        fallbackPoint;

      const pingCoord =
        getMapPingCoord(ping) ||
        travel.endCoord;

      if (!pingPoint || !pingCoord) {
        console.error(
          "Não foi possível finalizar entrada no ping:",
          travel
        );

        pingArrivalHandledRef.current.delete(travelId);
        continue;
      }

      const pingTitle =
        ping?.title ||
        ping?.name ||
        travel?.endCoord?.destinationName ||
        "Local";

      (async () => {
        try {
          await saveCharacterLocation(
            travel.characterId,
            pingCoord,
            {
              center: pingPoint,
              insidePing: {
                id: destinationId,
                title: pingTitle,
                type: ping?.type || "Local",
                lat: pingPoint[0],
                lng: pingPoint[1],
                enteredAt: new Date().toISOString(),
              },
            }
          );

          setTravels((currentTravels) =>
            currentTravels.filter(
              (item) => String(item.id) !== travelId
            )
          );

          if (isSupabaseConfigured && supabase && session?.user) {
            const { error } = await supabase
              .from("travels")
              .delete()
              .eq("id", travel.id);

            if (error) {
              console.error(
                "Erro ao remover viagem concluída no ping:",
                error.message
              );
            }
          }

          if (ping) {
            setSelectedMapPing({ ...ping });
          }

          alert(
            `${travel.characterName || "Personagem"} chegou e entrou em: ${pingTitle}.`
          );
        } catch (error) {
          pingArrivalHandledRef.current.delete(travelId);

          console.error(
            "Erro ao colocar personagem dentro do ping:",
            error
          );
        }
      })();
    }
  }, [
    travels,
    now,
    selectedTravelCharacterId,
    mapPings,
    session?.user?.id,
  ]);


  function handleMapClick(latlng) {
    if (ignoreNextMapClickRef.current) {
      ignoreNextMapClickRef.current = false;
      return;
    }

    setSelectedMapPing(null);
    setMapPingImagePreview(null);
    setSelectedPursuitPresence(null);
    setSelectedPursuitPresenceGroup(null);

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


  // LN PURSUIT ENGINE V2
  useEffect(() => {
    /*
      Todas as perseguições precisam permanecer visíveis
      para que alvos recebam avisos e apareçam no mapa.

      Porém, somente o cliente que controla o perseguidor
      pode executar o motor, cancelar ou concluir a perseguição.
    */
    const allPursuitTravels =
      travels.filter(
        (travelItem) =>
          isPursuitTravel(travelItem)
      );

    const pursuitTravels =
      allPursuitTravels.filter(
        (travelItem) => {
          const pursuitId =
            String(travelItem.id || "");

          if (
            pursuitId &&
            stoppedPursuitIdsRef.current.has(
              pursuitId
            )
          ) {
            return false;
          }

          return (
            String(
              travelItem.characterId ||
              ""
            ) ===
            String(
              selectedTravelCharacterId ||
              ""
            )
          );
        }
      );

    const activePursuitIds =
      new Set(
        allPursuitTravels.map(
          (travelItem) =>
            String(travelItem.id)
        )
      );

    const orphanBoostedTravels =
      travels.filter(
        (travelItem) =>
          travelItem.pursuitBoostedBy &&
          !activePursuitIds.has(
            String(
              travelItem.pursuitBoostedBy
            )
          )
      );

    if (
      orphanBoostedTravels.length > 0
    ) {
      const restoredById =
        new Map();

      for (
        const boostedTravel
        of orphanBoostedTravels
      ) {
        const currentPoint =
          getTravelCurrentPoint(
            boostedTravel,
            now
          );

        const cleanTravel =
          stripPursuitBoost(
            boostedTravel
          );

        const restoredTravel = {
          ...rebaseTravelFromPoint(
            cleanTravel,
            currentPoint,
            1,
            ""
          ),
          pursuitBoostedBy: "",
          pursuitTargetMultiplier: 1,
          modeLabelBeforePursuit: "",
        };

        restoredById.set(
          String(restoredTravel.id),
          restoredTravel
        );

        updateTravelSnapshotOnline(
          restoredTravel
        );
      }

      setTravels(
        (currentTravels) =>
          currentTravels.map(
            (travelItem) =>
              restoredById.get(
                String(travelItem.id)
              ) ||
              travelItem
          )
      );

      return;
    }

    for (
      const pursuitTravel
      of pursuitTravels
    ) {
      const targetId = String(
        getPursuitTargetCharacterId(
          pursuitTravel
        )
      );

      if (!targetId) {
        cancelPursuitCommonTravel(
          pursuitTravel,
          "lost"
        );
        continue;
      }

      if (dimensionLocations[targetId]) {
        cancelPursuitCommonTravel(
          pursuitTravel,
          "dimension"
        );
        continue;
      }

      const followerPoint =
        getTravelCurrentPoint(
          pursuitTravel,
          now
        );

      const targetPoint =
        getCurrentPointForCharacter(
          targetId
        );

      if (!followerPoint || !targetPoint) {
        cancelPursuitCommonTravel(
          pursuitTravel,
          "lost"
        );
        continue;
      }

      const distance =
        getDistanceInProvincesByPoints(
          followerPoint,
          targetPoint
        );

      if (
        distance >
        PURSUIT_BREAK_DISTANCE_PROVINCES
      ) {
        cancelPursuitCommonTravel(
          pursuitTravel,
          "distance"
        );
        continue;
      }

      if (
        distance <=
        PURSUIT_CATCH_DISTANCE_PROVINCES
      ) {
        finishPursuitCommonTravel(
          pursuitTravel,
          targetPoint
        );
        continue;
      }

      // Destino só é recalculado quando o alvo realmente muda.
      if (
        !pointsDiffer(
          pursuitTravel.endCenter,
          targetPoint,
          0.02
        )
      ) {
        continue;
      }

      const followerCoord =
        getPointCoord(
          followerPoint
        );

      const targetCoord =
        getPointCoord(
          targetPoint
        );

      if (
        !followerCoord ||
        !targetCoord
      ) {
        continue;
      }

      const travelData =
        calculateTravelForSelectedMode(
          followerCoord,
          targetCoord,
          pursuitTravel.travelMode ||
          "terrestre"
        );

      const durationHours = Math.max(
        0.01,
        Number(
          travelData.hours ||
          0.01
        ) /
          PURSUIT_FOLLOWER_SPEED_MULTIPLIER
      );

      const startedAt =
        new Date().toISOString();

      const pursuitMeta = {
        targetCharacterId:
          targetId,
        targetName:
          pursuitTravel.pursuitTargetName ||
          "Presença desconhecida",
        startedAt:
          pursuitTravel.startedAt ||
          startedAt,
      };

      const nextPursuitTravel = {
        ...pursuitTravel,
        isPursuit: true,
        travelKind: "pursuit",
        startCoord:
          followerCoord,
        endCoord:
          attachPursuitMeta(
            targetCoord,
            pursuitMeta
          ),
        startCenter:
          followerPoint,
        endCenter:
          targetPoint,
        durationHours,
        durationDays:
          durationHours / 24,
        normalDurationHours:
          travelData.hours ||
          durationHours,
        speedMultiplier:
          PURSUIT_FOLLOWER_SPEED_MULTIPLIER,
        distanceFeet:
          travelData.feet ||
          travelData.provinces ||
          distance,
        startedAt,
        arrivalAt:
          new Date(
            Date.now() +
            durationHours *
              60 *
              60 *
              1000
          ).toISOString(),
        pursuitTargetCharacterId:
          targetId,
      };

      setTravels(
        (currentTravels) =>
          currentTravels.map(
            (travelItem) =>
              String(travelItem.id) ===
              String(
                pursuitTravel.id
              )
                ? nextPursuitTravel
                : travelItem
          )
      );

      const lastSync =
        pursuitSyncRef.current.get(
          String(pursuitTravel.id)
        ) ||
        0;

      if (
        Date.now() - lastSync >=
        5000
      ) {
        pursuitSyncRef.current.set(
          String(pursuitTravel.id),
          Date.now()
        );

        updateTravelSnapshotOnline(
          nextPursuitTravel
        );
      }
    }
  }, [
    now,
    travels,
    dimensionLocations,
    characterLocations,
    mapCharacters,
    selectedTravelCharacterId,
  ]);


  useEffect(() => {
    loadMapCharacters();
  }, [activePage, session?.user?.id]);

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

  if (!session) {
    return (
      <AuthPage
        onAuthSuccess={(requestedPage = "hall") => {
          // LN_AUTH_ROUTE_AFTER_SIGNUP_V2
          //
          // Preserva o Meu Ninja caso o listener da sessão tenha
          // processado o cadastro antes desta função terminar.
          const hasPendingNinjaCreation =
            localStorage.getItem(CREATE_NINJA_AFTER_AUTH_KEY) === "1";

          setIsDemoMode(false);
          setIsPanelOpen(false);

          setActivePage((currentPage) => {
            if (
              requestedPage === "my-ninja" ||
              hasPendingNinjaCreation ||
              currentPage === "my-ninja"
            ) {
              return "my-ninja";
            }

            return "hall";
          });
        }}
      />
    );
  }
  const selectedMapTravel =
    travels.find(
      (item) =>
        String(item.characterId) === String(selectedTravelCharacterId) &&
        !dimensionLocations[String(item.characterId)] &&
        (
          isPursuitTravel(item) ||
          getTravelProgress(item, now) < 1
        )
    ) || null;

  const publicMapTravels = selectedMapTravel ? [selectedMapTravel] : [];

  const selectedIncomingPursuit =
    incomingPursuitNotice &&
    !stoppedPursuitIdsRef.current.has(
      String(
        incomingPursuitNotice.id ||
        ""
      )
    )
      ? incomingPursuitNotice
      : null;

  const selectedCharacterLiveForMap =
    getSelectedTravelCharacterLive();

  const selectedCharacterInsidePing =
    isCharacterInsideAnyPing(selectedCharacterLiveForMap);

  const selectedInitialLocation =
    selectedTravelCharacter
      ? getCharacterSavedLocation(
          selectedTravelCharacter.id,
          selectedCharacterLiveForMap
        )
      : null;

  const selectedInitialCoord =
    selectedTravelCharacter &&
    !selectedMapTravel &&
    !selectedCharacterInsidePing
      ? (
          selectedInitialLocation?.coord ||
          getCurrentCoordinateForCharacter(
            selectedTravelCharacter.id
          )
        )
      : null;

  const selectedInitialPoint =
    selectedInitialCoord
      ? getLocationMapPoint(
          selectedInitialLocation,
          selectedInitialCoord
        )
      : null;


  /*
    LN WORLD PRESENCE V2

    Cada personagem é analisado uma única vez.

    - parado: usa a localização salva;
    - viajando: usa o ponto atual da viagem;
    - perseguindo: usa o ponto atual da perseguição;
    - dentro de ping ou dimensão: não aparece;
    - somente personagens na mesma região são mostrados.
  */
  const worldPresenceCharacters = (() => {
    const byId = new Map();

    // travelCharacters pode conter a cópia local.
    for (const character of travelCharacters) {
      const id = String(character?.id || "");

      if (!id) continue;

      byId.set(id, character);
    }

    // mapCharacters é a fonte online e substitui cópias locais.
    for (const character of mapCharacters) {
      const id = String(character?.id || "");

      if (!id) continue;

      byId.set(id, character);
    }

    return Array.from(byId.values());
  })();

  const selectedCharacterForPresence =
    getSelectedTravelCharacterLive();

  const selectedCharacterCanAppearOnWorldMap =
    selectedTravelCharacterId &&
    !dimensionLocations[String(selectedTravelCharacterId)] &&
    !isCharacterInsideAnyPing(
      selectedCharacterForPresence
    );

  const selectedCharacterWorldPoint =
    selectedCharacterCanAppearOnWorldMap
      ? getCurrentPointForCharacter(
          selectedTravelCharacterId
        )
      : null;

  const selectedCharacterWorldCoord =
    selectedCharacterWorldPoint
      ? getCoordinate({
          lat: selectedCharacterWorldPoint[0],
          lng: selectedCharacterWorldPoint[1],
        })
      : null;

  const worldPresenceCandidates =
    selectedCharacterWorldCoord
      ? worldPresenceCharacters
          .filter((character) => {
            const characterId = String(
              character?.id || ""
            );

            return (
              characterId &&
              characterId !==
                String(selectedTravelCharacterId)
            );
          })
          .filter(
            (character) =>
              !dimensionLocations[
                String(character.id)
              ]
          )
          .filter(
            (character) =>
              !isCharacterInsideAnyPing(character)
          )
          .map((character) => {
            const characterId = String(
              character.id
            );

            const activeTravel =
              getActiveTravelForCharacter(
                characterId
              );

            const currentPoint =
              getCurrentPointForCharacter(
                characterId
              );

            if (!currentPoint) {
              return null;
            }

            const currentCoord =
              getCoordinate({
                lat: currentPoint[0],
                lng: currentPoint[1],
              });

            if (!currentCoord) {
              return null;
            }

            const sameMacroRegion =
              currentCoord.macroLabel &&
              selectedCharacterWorldCoord.macroLabel &&
              currentCoord.macroLabel ===
                selectedCharacterWorldCoord.macroLabel;

            if (!sameMacroRegion) {
              return null;
            }

            const sameProvince =
              isSameProvince(
                currentCoord,
                selectedCharacterWorldCoord
              );

            return {
              id:
                activeTravel?.id ||
                `character-${characterId}`,
              targetTravelId:
                activeTravel?.id || "",
              targetCharacterId:
                characterId,
              characterName:
                character.characterName ||
                character.character_name ||
                character.name ||
                "Personagem desconhecido",
              position: currentPoint,
              coord: currentCoord,
              sameProvince,
              isMoving:
                Boolean(activeTravel),
              isPursuit:
                Boolean(
                  activeTravel &&
                  isPursuitTravel(activeTravel)
                ),
            };
          })
          .filter(Boolean)
      : [];

  const selectedMapPresence =
    selectedCharacterWorldPoint &&
    selectedCharacterWorldCoord
      ? {
          currentPoint:
            selectedCharacterWorldPoint,
          currentCoord:
            selectedCharacterWorldCoord,
          unknownPresences:
            worldPresenceCandidates.length,
          text:
            worldPresenceCandidates.length > 0
              ? `${worldPresenceCandidates.length} ${
                  worldPresenceCandidates.length === 1
                    ? "presença detectada"
                    : "presenças detectadas"
                } na região`
              : "",
        }
      : null;


  function spreadOverlappedMapMarkers(markers) {
    if (!Array.isArray(markers) || markers.length <= 1) return markers || [];

    const groups = new Map();

    for (const marker of markers) {
      const position = marker?.position;

      if (!Array.isArray(position) || position.length < 2) {
        continue;
      }

      const key = `${Number(position[0]).toFixed(3)}:${Number(position[1]).toFixed(3)}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(marker);
    }

    const nextMarkers = [...markers];

    for (const group of groups.values()) {
      if (group.length <= 1) continue;

      const radius = 14;

      group.forEach((marker, index) => {
        const originalIndex = nextMarkers.findIndex((item) => item === marker);
        if (originalIndex < 0) return;

        const angle = (Math.PI * 2 * index) / group.length;
        const basePosition = marker.position;

        nextMarkers[originalIndex] = {
          ...marker,
          visualPosition: [
            Number(basePosition[0]) + Math.sin(angle) * radius,
            Number(basePosition[1]) + Math.cos(angle) * radius,
          ],
          overlappedCount: group.length,
        };
      });
    }

    return nextMarkers;
  }


  // A presença já foi calculada uma única vez por personagem.
  const unknownPresenceMarkers =
    worldPresenceCandidates;


  function groupUnknownPresenceMarkers(markers) {
    if (!Array.isArray(markers) || markers.length === 0) return [];

    const groups = new Map();

    for (const marker of markers) {
      if (!marker?.coord?.label) continue;

      const key = marker.coord.label;

      if (!groups.has(key)) {
        groups.set(key, {
          id: `presence-province-${key}`,
          position: getSmallCellCenter(marker.coord),
          coord: marker.coord,
          sameProvince: Boolean(marker.sameProvince),
          count: 0,
          regionalCount: markers.length,
          presences: []
        });
      }

      const group = groups.get(key);
      group.presences.push(marker);
      group.count = group.presences.length;

      if (marker.sameProvince) {
        group.sameProvince = true;
      }
    }

    return Array.from(groups.values());
  }

  const visibleUnknownPresenceMarkers = groupUnknownPresenceMarkers(unknownPresenceMarkers);

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

            {visibleUnknownPresenceMarkers.length > 0 && (
              <div className="map-presence-actions">
                {visibleUnknownPresenceMarkers.map((presenceGroup) => (
                  <button
                    key={`presence-action-${presenceGroup.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedPursuitPresence(null);
                      setSelectedPursuitPresenceGroup(presenceGroup);
                    }}
                  >
                    Ver {presenceGroup.count} {presenceGroup.count === 1 ? "presença" : "presenças"} {presenceGroup.sameProvince ? `em ${presenceGroup.coord?.label || "província"}` : `na região ${presenceGroup.coord?.macroLabel || ""}`}
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

        {terrainHudVisible && (
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


        {selectedIncomingPursuit && (
          <aside className="map-pursuit-warning-banner">
            <strong>
              VOCÊ ESTÁ SENDO PERSEGUIDO
            </strong>

            <span>
              Perseguidor:{" "}
              {selectedIncomingPursuit.characterName ||
                "presença desconhecida"}
            </span>
          </aside>
        )}

        {selectedPursuitPresenceGroup && (
          <aside className="map-pursuit-side-panel map-pursuit-group-panel">
            <button
              type="button"
              className="map-pursuit-side-close"
              onClick={() => setSelectedPursuitPresenceGroup(null)}
              aria-label="Fechar presenças"
            >
              ×
            </button>

            <strong>Presenças na província</strong>

            <p>
              Região: <b>{selectedPursuitPresenceGroup.coord?.macroLabel || "-"}</b>
              <br />
              Província: <b>{selectedPursuitPresenceGroup.coord?.label || "-"}</b>
              <br />
              Total nesta província: <b>{selectedPursuitPresenceGroup.count || 0}</b>
            </p>

            <p className="map-pursuit-note">
              Este painel mostra apenas as presenças agrupadas nesta província.
            </p>

            <div className="map-pursuit-target-list">
              {selectedPursuitPresenceGroup.presences.map((presence, index) => (
                <article
                  key={`presence-target-${presence.id}`}
                  className="map-pursuit-target-card"
                >
                  <div>
                    <strong>
                      {presence.sameProvince
                        ? presence.characterName || `Presença ${index + 1}`
                        : `Presença desconhecida ${index + 1}`}
                    </strong>
                    <small>
                      Província: {presence.coord?.label || "-"}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="map-pursuit-start-button"
                    onClick={() => {
                      setSelectedPursuitPresenceGroup(null);
                      setSelectedPursuitPresence(null);
                      preparePursuitToUnknownPresence(presence);
                    }}
                  >
                    Iniciar perseguição
                  </button>
                </article>
              ))}
            </div>
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
              Perseguidor recebe velocidade ×6 e o alvo recebe velocidade ×3. Se o alvo entrar em dimensão ou ficar a mais de 6 províncias, a perseguição será interrompida.
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

          {terrainEditorEnabled && terrainPolygons.map((polygon) => (
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

          {terrainEditorEnabled && draftTerrainPoints.length >= 2 && (
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

          {terrainEditorEnabled && terrainRectangleStart && (
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

          {terrainEditorEnabled &&
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

          {visibleUnknownPresenceMarkers.map((presenceGroup) => (
            <Marker
              key={`unknown-presence-group-${presenceGroup.id}`}
              position={presenceGroup.position}
              icon={createUnknownPresenceGroupIcon(presenceGroup.count, presenceGroup.sameProvince)}
              interactive={true}
              bubblingMouseEvents={false}
              eventHandlers={{
                click: (event) => {
                  event.originalEvent?.preventDefault?.();
                  event.originalEvent?.stopPropagation?.();
                  ignoreNextMapClickRef.current = true;
                  setSelectedPursuitPresence(null);
                  setSelectedPursuitPresenceGroup(presenceGroup);
                },
              }}
            >
              <Tooltip direction="top">
                <strong>
                  {presenceGroup.count}{" "}
                  {presenceGroup.count === 1 ? "presença nesta província" : "presenças nesta província"}
                </strong>
                <br />
                "Há presença exatamente na mesma província que você."
                <br />
                Região: {presenceGroup.coord?.macroLabel || "-"}
                <br />
                Província:{" "}
                presenceGroup.coord?.provinceLabel || presenceGroup.coord?.label || "-"
                <br />
                Clique para ver a lista.
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
              position={selectedInitialPoint || getSmallCellCenter(selectedInitialCoord)}
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

                <div className="map-ping-players-local">
                  <h3>Players no local:</h3>

                  {(() => {
                    const playersInsidePing = getPlayersInsideMapPing(selectedMapPing);

                    if (playersInsidePing.length <= 0) {
                      return <p>Nenhum player dentro deste local.</p>;
                    }

                    return (
                      <ul>
                        {playersInsidePing.map((player) => (
                          <li key={player.id}>
                            <strong>{player.characterName}</strong>
                            {player.playerName ? <span> — {player.playerName}</span> : null}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>

              <div className="map-ping-location-actions">
                <button
                  type="button"
                  className="map-ping-enter-button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    enterSelectedCharacterIntoPing(selectedMapPing);
                  }}
                >
                  Entrar neste local
                </button>

                {isSelectedCharacterInsidePing(selectedMapPing) && (
                  <button
                    type="button"
                    className="map-ping-leave-button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      leaveSelectedCharacterFromPing(selectedMapPing);
                    }}
                  >
                    Sair deste local
                  </button>
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
            // LN_MY_NINJA_ONLINE_PROP_V4
            character={
              selectedTravelCharacter ||
              travelCharacters[0] ||
              undefined
            }
            persistLocally={true}
            onSaveSheet={(savedCharacter) => {
              // LN_ACCEPT_SAVED_MY_NINJA_V5
              if (!savedCharacter) {
                return;
              }

              setTravelCharacters((currentCharacters) => {
                const nextCharacters = [
                  savedCharacter,

                  ...currentCharacters.filter(
                    (characterItem) =>
                      String(characterItem.id || "") !==
                        String(savedCharacter.id || "") &&
                      String(characterItem.userId || "") !==
                        String(savedCharacter.userId || "")
                  ),
                ];

                localStorage.setItem(
                  CHARACTER_STORAGE_KEY,
                  JSON.stringify(nextCharacters)
                );

                return nextCharacters;
              });

              setMapCharacters((currentCharacters) => [
                savedCharacter,

                ...currentCharacters.filter(
                  (characterItem) =>
                    String(characterItem.id || "") !==
                      String(savedCharacter.id || "") &&
                    String(characterItem.userId || "") !==
                      String(savedCharacter.userId || "")
                ),
              ]);

              if (savedCharacter.id) {
                setSelectedTravelCharacterId(
                  savedCharacter.id
                );
              }
            }}
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
