import L, { CRS } from "leaflet";
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Polyline,
  Tooltip
} from "react-leaflet";

const MAP_WIDTH = 1080;
const MAP_HEIGHT = 903;
const MAP_IMAGE_CLEAN = "/mapa-limpo.png";

const imageBounds = [
  [0, 0],
  [MAP_HEIGHT, MAP_WIDTH]
];

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

export default function AdminWorldMap({ travelRows = [] }) {
  const visibleTravels = travelRows.filter((travel) =>
    Array.isArray(travel.currentPoint)
  );

  return (
    <div className="admin-world-map-card">
      <div className="admin-world-map-header">
        <div>
          <p className="eyebrow">Mapa ADM</p>
          <h2>Localização revelada dos personagens</h2>
          <p>
            Visualização do mestre com nome real, região, rota e progresso dos personagens.
          </p>
        </div>

        <strong>{visibleTravels.length} personagens localizados</strong>
      </div>

      <div className="admin-world-map-stage">
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
          <ImageOverlay url={MAP_IMAGE_CLEAN} bounds={imageBounds} />

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
