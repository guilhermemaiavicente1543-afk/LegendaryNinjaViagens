import { useEffect, useMemo, useState } from "react";
import L, { CRS } from "leaflet";
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Polyline,
  Tooltip,
  CircleMarker,
  Popup,
  useMapEvents
} from "react-leaflet";

const MAP_WIDTH = 1080;
const MAP_HEIGHT = 903;
const MAP_IMAGE_CLEAN = "/mapa-limpo.png";

const imageBounds = [
  [0, 0],
  [MAP_HEIGHT, MAP_WIDTH]
];

function parseMaybeJson(value) {
  if (!value || typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeAdminPoint(value) {
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

function getInitials(name) {
  return String(name || "N")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function createAdminCharacterIcon(travel) {
  return L.divIcon({
    className: "admin-map-character-icon",
    html: `<span>${getInitials(travel.characterName)}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function createAdminPlayerIcon(character) {
  return L.divIcon({
    className: "admin-map-player-icon",
    html: `<span>${getInitials(character.characterName)}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    tooltipAnchor: [0, -20]
  });
}


function groupAdminCharactersByPoint(characters = []) {
  const groups = new Map();

  for (const character of characters) {
    const point = normalizeAdminPoint(character?.currentPoint);

    if (!point) continue;

    // Três casas agrupam personagens gravados na mesma posição,
    // sem confundir locais realmente diferentes.
    const key = `${point[0].toFixed(3)}:${point[1].toFixed(3)}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        currentPoint: point,
        characters: [],
      });
    }

    groups.get(key).characters.push(character);
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    characters: group.characters.sort((a, b) =>
      String(a.characterName || "").localeCompare(
        String(b.characterName || ""),
        "pt-BR"
      )
    ),
  }));
}

function createAdminPlayerGroupIcon(group) {
  const count = group?.characters?.length || 0;

  if (count <= 1) {
    return createAdminPlayerIcon(group?.characters?.[0] || {});
  }

  return L.divIcon({
    className: "admin-map-player-group-icon",
    html: `
      <div class="admin-map-player-group-core">
        <strong>${count}</strong>
        <small>ninjas</small>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    tooltipAnchor: [0, -26]
  });
}

function getSupabaseAccessTokenFromStorage() {
  if (typeof window === "undefined") return "";

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) {
      continue;
    }

    const parsed = parseMaybeJson(window.localStorage.getItem(key));

    const token =
      parsed?.access_token ||
      parsed?.currentSession?.access_token ||
      parsed?.session?.access_token ||
      parsed?.user?.access_token ||
      "";

    if (token) return token;
  }

  return "";
}

function getCharacterAdminLocation(row) {
  const profileSheet = parseMaybeJson(row?.profile_sheet) || {};
  const rawLocation =
    parseMaybeJson(row?.current_location) ||
    parseMaybeJson(row?.currentLocation) ||
    parseMaybeJson(profileSheet?.currentLocation) ||
    parseMaybeJson(profileSheet?.current_location) ||
    null;

  if (!rawLocation) return null;

  const coord =
    parseMaybeJson(rawLocation?.coord) ||
    parseMaybeJson(rawLocation?.currentCoord) ||
    rawLocation;

  const point =
    normalizeAdminPoint(rawLocation?.currentPoint) ||
    normalizeAdminPoint(coord?.exactPoint) ||
    normalizeAdminPoint(coord?.freePoint) ||
    normalizeAdminPoint(rawLocation?.center) ||
    normalizeAdminPoint(coord?.center) ||
    normalizeAdminPoint(coord);

  if (!point) return null;

  return {
    id: row.id,
    userId: row.user_id,
    characterName:
      row.character_name ||
      row.name ||
      row.nome ||
      profileSheet?.characterName ||
      "Ninja sem nome",
    playerName:
      row.player_name ||
      row.playerName ||
      profileSheet?.playerName ||
      profileSheet?.player_name ||
      "-",
    village:
      row.village_or_organization ||
      row.villageOrOrganization ||
      profileSheet?.villageOrOrganization ||
      profileSheet?.village_or_organization ||
      "-",
    iconUrl:
      row.icon_url ||
      row.map_icon_url ||
      row.character_icon_url ||
      row.photo_url ||
      row.portrait_url ||
      "",
    currentPoint: point,
    currentCoord: coord || {},
    location: rawLocation,
    updatedAt: rawLocation?.updatedAt || rawLocation?.updated_at || row.updated_at || ""
  };
}

function AdminPingClickCapture({ enabled, onPick }) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onPick(event.latlng);
    }
  });

  return null;
}

export default function AdminWorldMap({
  travelRows = [],
  characterRows = [],
  enablePingPicker = false,
  title = "Localização revelada dos personagens",
  description = "Visualização do mestre com nome real, região, rota e progresso dos personagens."
}) {
  const [pickedPoint, setPickedPoint] = useState(null);
  const [loadedCharacterRows, setLoadedCharacterRows] = useState([]);
  const [charactersLoadError, setCharactersLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCharacters() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        setCharactersLoadError("Supabase não configurado no ambiente.");
        return;
      }

      try {
        const accessToken = getSupabaseAccessTokenFromStorage();
        const response = await fetch(
          `${supabaseUrl}/rest/v1/characters?select=*&order=character_name.asc`,
          {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${accessToken || anonKey}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const rows = await response.json();

        if (!cancelled) {
          setLoadedCharacterRows(Array.isArray(rows) ? rows : []);
          setCharactersLoadError("");
        }
      } catch (error) {
        console.error("Erro ao carregar personagens na Cartografia ADM:", error);

        if (!cancelled) {
          setCharactersLoadError(error?.message || String(error));
        }
      }
    }

    loadCharacters();

    const timer = window.setInterval(loadCharacters, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const visibleTravels = travelRows.filter((travel) =>
    Array.isArray(travel.currentPoint)
  );

  const visibleCharacters = useMemo(() => {
    const sourceRows = characterRows.length > 0 ? characterRows : loadedCharacterRows;

    return sourceRows
      .map(getCharacterAdminLocation)
      .filter(Boolean);
  }, [characterRows, loadedCharacterRows]);


  const characterPointGroups = useMemo(
    () => groupAdminCharactersByPoint(visibleCharacters),
    [visibleCharacters]
  );

  function handlePickPoint(latlng) {
    const payload = {
      lat: Number(latlng.lat.toFixed(4)),
      lng: Number(latlng.lng.toFixed(4)),
      pickedAt: new Date().toISOString()
    };

    setPickedPoint([payload.lat, payload.lng]);

    localStorage.setItem("ln-admin-map-last-ping-point", JSON.stringify(payload));

    window.dispatchEvent(
      new CustomEvent("ln-admin-map-ping-point", {
        detail: payload
      })
    );
  }

  return (
    <div className="admin-world-map-card">
      <div className="admin-world-map-header">
        <div>
          <p className="eyebrow">{enablePingPicker ? "Cartografia ADM" : "Mapa ADM"}</p>
          <h2>{enablePingPicker ? "Clique no mapa para posicionar o ping" : title}</h2>
          <p>
            {enablePingPicker
              ? "Clique exatamente no local onde o ping oficial deve aparecer. A latitude e longitude internas serão enviadas ao formulário de Cartografia."
              : description}
          </p>

          {charactersLoadError && (
            <p className="admin-world-map-error">
              Erro ao carregar personagens: {charactersLoadError}
            </p>
          )}
        </div>

        <strong>
          {enablePingPicker
            ? pickedPoint
              ? `${pickedPoint[0]} / ${pickedPoint[1]}`
              : "Aguardando clique"
            : `${visibleCharacters.length} players localizados • ${characterPointGroups.length} pontos no mapa • ${visibleTravels.length} viagens`}
        </strong>
      </div>

      <div className="admin-world-map-stage">
        <MapContainer
          crs={CRS.Simple}
          bounds={imageBounds}
          center={[MAP_HEIGHT / 2, MAP_WIDTH / 2]}
          zoom={-1}
          scrollWheelZoom
          maxBounds={imageBounds}
          maxBoundsViscosity={0.75}
          minZoom={-2}
          maxZoom={6}
          zoomSnap={0.25}
          zoomDelta={0.5}
          wheelPxPerZoomLevel={80}
          style={{ height: "100%", width: "100%" }}
        >
          <ImageOverlay url={MAP_IMAGE_CLEAN} bounds={imageBounds} />

          <AdminPingClickCapture
            enabled={enablePingPicker}
            onPick={handlePickPoint}
          />

          {enablePingPicker && pickedPoint && (
            <CircleMarker
              center={pickedPoint}
              radius={10}
              pathOptions={{
                color: "#ff7a00",
                fillColor: "#ff7a00",
                fillOpacity: 0.88,
                weight: 3
              }}
            >
              <Popup>
                <strong>Ponto selecionado</strong>
                <br />
                Lat: {pickedPoint[0]}
                <br />
                Lng: {pickedPoint[1]}
              </Popup>
            </CircleMarker>
          )}

          {visibleTravels.map((travel) => (
            <Polyline
              key={`admin-route-${travel.id}`}
              positions={[travel.startCenter, travel.endCenter]}
              pathOptions={{
                color: travel.arrived ? "#22c55e" : "#38bdf8",
                weight: 3,
                opacity: 0.75,
                dashArray: travel.arrived ? undefined : "8 8"
              }}
              interactive={false}
            />
          ))}

          {characterPointGroups.map((group) => {
            const singleCharacter =
              group.characters.length === 1
                ? group.characters[0]
                : null;

            return (
              <Marker
                key={`admin-player-group-${group.id}`}
                position={group.currentPoint}
                icon={createAdminPlayerGroupIcon(group)}
              >
                <Tooltip direction="top" className="admin-map-player-group-tooltip">
                  {singleCharacter ? (
                    <>
                      <strong>{singleCharacter.characterName}</strong>
                      <br />
                      Player: {singleCharacter.playerName || "-"}
                      <br />
                      Aldeia/Org: {singleCharacter.village || "-"}
                      <br />
                      Região: {singleCharacter.currentCoord?.macroLabel || "-"}
                      <br />
                      Coordenada: {singleCharacter.currentCoord?.label || "-"}
                      <br />
                      Lat/Lng: {group.currentPoint[0].toFixed(2)} /{" "}
                      {group.currentPoint[1].toFixed(2)}
                      <br />
                      Atualizado:{" "}
                      {singleCharacter.updatedAt
                        ? new Date(singleCharacter.updatedAt).toLocaleString("pt-BR")
                        : "-"}
                    </>
                  ) : (
                    <div className="admin-map-player-group-list">
                      <strong>
                        {group.characters.length} players neste ponto
                      </strong>

                      <small>
                        Lat/Lng: {group.currentPoint[0].toFixed(2)} /{" "}
                        {group.currentPoint[1].toFixed(2)}
                      </small>

                      <ul>
                        {group.characters.map((character) => (
                          <li key={character.id}>
                            <b>{character.characterName}</b>
                            <span>
                              {character.playerName
                                ? ` — ${character.playerName}`
                                : ""}
                            </span>
                            <small>
                              {character.currentCoord?.label
                                ? ` · ${character.currentCoord.label}`
                                : ""}
                            </small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Tooltip>
              </Marker>
            );
          })}

          {visibleTravels.map((travel) => (
            <Marker
              key={`admin-marker-${travel.id}`}
              position={travel.currentPoint}
              icon={createAdminCharacterIcon(travel)}
            >
              <Tooltip direction="top">
                <strong>{travel.characterName}</strong>
                <br />
                Região: {travel.currentCoord?.macroLabel || "-"}
                <br />
                Coordenada: {travel.currentCoord?.label || "-"}
                <br />
                Status: {travel.arrived ? "Chegou ao destino" : "Em viagem"}
                <br />
                Progresso: {travel.progressPercent}%
                <br />
                Rota: {travel.startCoord?.label} → {travel.endCoord?.label}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
