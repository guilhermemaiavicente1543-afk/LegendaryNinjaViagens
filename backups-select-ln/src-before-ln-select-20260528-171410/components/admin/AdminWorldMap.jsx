import { useState } from "react";
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
  enablePingPicker = false,
  title = "Localização revelada dos personagens",
  description = "Visualização do mestre com nome real, região, rota e progresso dos personagens."
}) {
  const [pickedPoint, setPickedPoint] = useState(null);

  const visibleTravels = travelRows.filter((travel) =>
    Array.isArray(travel.currentPoint)
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
        </div>

        <strong>
          {enablePingPicker
            ? pickedPoint
              ? `${pickedPoint[0]} / ${pickedPoint[1]}`
              : "Aguardando clique"
            : `${visibleTravels.length} personagens localizados`}
        </strong>
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
