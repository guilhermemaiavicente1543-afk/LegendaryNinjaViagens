export default function PlayerLocationMap({
  character,
  travels = [],
  now,
  getCoordinate,
  getTravelCurrentPoint,
  getTravelProgress,
  getUnknownPresencesCount,
  formatUnknownPresences,
  formatTime,

  points = [],
  travel,
  travelMode,
  setTravelMode,
  activeMapImage,
  imageBounds,
  showImageGrid,
  setShowImageGrid,
  setPoints,
  selectedTravelCharacterId,
  setSelectedTravelCharacterId,
  travelCharacters = [],
  refreshTravelCharacters,
  startCharacterTravel,
  handleMapClick,
  getSmallCellCenter
}) {
  const bounds = Array.isArray(imageBounds)
    ? imageBounds
    : [
        [0, 0],
        [903, 1080]
      ];

  const mapHeight = Number(bounds?.[1]?.[0] || 903);
  const mapWidth = Number(bounds?.[1]?.[1] || 1080);
  const mapImage = activeMapImage || "/mapa-coordenado.jpg";

  const characterName =
    character?.character_name || character?.characterName || "Ninja";

  const characterTravel = travels.find((item) => {
    return (
      item.characterId === character?.id ||
      item.characterName === character?.character_name ||
      item.characterName === character?.characterName
    );
  });

  const currentPoint =
    characterTravel && getTravelCurrentPoint
      ? getTravelCurrentPoint(characterTravel, now)
      : null;

  const currentCoord =
    currentPoint && getCoordinate
      ? getCoordinate({ lat: currentPoint[0], lng: currentPoint[1] })
      : null;

  const progress =
    characterTravel && getTravelProgress
      ? getTravelProgress(characterTravel, now)
      : 0;

  const unknownPresences =
    characterTravel && getUnknownPresencesCount
      ? getUnknownPresencesCount(characterTravel, travels, now)
      : 0;

  function getPointPosition(point) {
    const center = getSmallCellCenter
      ? getSmallCellCenter(point)
      : [point.lat || 0, point.lng || 0];

    const lat = Number(center[0] || 0);
    const lng = Number(center[1] || 0);

    return {
      top: `${(lat / mapHeight) * 100}%`,
      left: `${(lng / mapWidth) * 100}%`
    };
  }

  function getRawPosition(point) {
    if (!Array.isArray(point)) return null;

    const lat = Number(point[0] || 0);
    const lng = Number(point[1] || 0);

    return {
      top: `${(lat / mapHeight) * 100}%`,
      left: `${(lng / mapWidth) * 100}%`
    };
  }

  function handleImageClick(event) {
    if (!handleMapClick) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const lng = ((event.clientX - rect.left) / rect.width) * mapWidth;
    const lat = ((event.clientY - rect.top) / rect.height) * mapHeight;

    handleMapClick({ lat, lng });
  }

  const pointA = points[0] ? getPointPosition(points[0]) : null;
  const pointB = points[1] ? getPointPosition(points[1]) : null;
  const currentPosition = currentPoint ? getRawPosition(currentPoint) : null;

  return (
    <div className="player-location-map-card player-location-map-card-full">
      <div className="player-location-map-header">
        <div>
          <p className="eyebrow">Localização</p>
          <h3>Mapa do Personagem</h3>
          <p>
            Clique no mapa para selecionar origem e destino. Depois inicie a
            viagem do seu ninja.
          </p>
        </div>

        <strong>{currentCoord?.macroLabel || "Sem localização ativa"}</strong>
      </div>

      <div className="player-location-layout">
        <aside className="player-location-controls">
          <div className="travelBox">
            <strong>Viagem do Personagem</strong>

            <label>
              Meio de locomoção:
              <select
                value={travelMode}
                onChange={(event) => setTravelMode?.(event.target.value)}
              >
                <option value="terrestre">Terrestre — 1 província = 12 horas</option>
                <option value="aquatico">Aquático — 1 província = 9 horas</option>
                <option value="aereo">Aéreo — 1 província = 6 horas</option>
              </select>
            </label>

            <label>
              Personagem:
              <select
                value={selectedTravelCharacterId}
                onChange={(event) =>
                  setSelectedTravelCharacterId?.(event.target.value)
                }
              >
                {travelCharacters.length === 0 && (
                  <option value="">Nenhum personagem salvo</option>
                )}

                {travelCharacters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.characterName}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={refreshTravelCharacters}>
              Atualizar personagens
            </button>

            <button type="button" onClick={startCharacterTravel}>
              Iniciar viagem com os pontos A e B
            </button>

            <button type="button" onClick={() => setPoints?.([])}>
              Limpar pontos
            </button>
          </div>

          <div className="travelBox">
            <strong>Visual do mapa</strong>

            <button
              type="button"
              className="gridToggleButton imageGridToggleButton"
              onClick={() => setShowImageGrid?.((current) => !current)}
            >
              {showImageGrid ? "Usar mapa limpo" : "Usar mapa com grade"}
            </button>
          </div>

          {points.length > 0 && (
            <div className="info">
              <strong>Ponto A:</strong> {points[0] ? points[0].label : "-"}
              <br />
              <strong>Ponto B:</strong> {points[1] ? points[1].label : "-"}
            </div>
          )}

          {travel && (
            <div className="result">
              <strong>Viagem {travel.modeLabel}</strong>
              <br />
              Distância: {travel.smallSquares.toFixed(2)} províncias
              <br />
              Regiões atravessadas: {travel.macroBlocks.toFixed(2)}
              <br />
              Tempo: {formatTime ? formatTime(travel.hours) : travel.hours}
              <br />
              Dias: {travel.days.toFixed(2)} dias
            </div>
          )}

          <div className="player-location-map-info">
            {characterTravel ? (
              <>
                <span>
                  <strong>Status:</strong>{" "}
                  {progress >= 1 ? "Chegou ao destino" : "Em viagem"}
                </span>

                <span>
                  <strong>Rota:</strong> {characterTravel.startCoord?.label} →{" "}
                  {characterTravel.endCoord?.label}
                </span>

                <span>
                  <strong>Região atual:</strong> {currentCoord?.macroLabel || "-"}
                </span>

                <span>
                  <strong>Presenças:</strong>{" "}
                  {formatUnknownPresences
                    ? formatUnknownPresences(unknownPresences)
                    : `${unknownPresences} presença(s) desconhecida(s)`}
                </span>
              </>
            ) : (
              <span>
                Nenhuma viagem ativa registrada. Clique em dois pontos no mapa e
                inicie uma viagem.
              </span>
            )}
          </div>
        </aside>

        <div className="player-location-image-stage">
          <div
            className="player-location-image-wrap"
            role="button"
            tabIndex={0}
            onClick={handleImageClick}
          >
            <img src={mapImage} alt="Mapa de viagem" draggable="false" />

            {pointA && (
              <span
                className="player-map-point point-a"
                style={pointA}
                title={points[0]?.label}
              >
                A
              </span>
            )}

            {pointB && (
              <span
                className="player-map-point point-b"
                style={pointB}
                title={points[1]?.label}
              >
                B
              </span>
            )}

            {pointA && pointB && (
              <svg className="player-map-route" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line
                  x1={parseFloat(pointA.left)}
                  y1={parseFloat(pointA.top)}
                  x2={parseFloat(pointB.left)}
                  y2={parseFloat(pointB.top)}
                />
              </svg>
            )}

            {currentPosition && (
              <span
                className="player-map-current"
                style={currentPosition}
                title={characterName}
              >
                {characterName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
