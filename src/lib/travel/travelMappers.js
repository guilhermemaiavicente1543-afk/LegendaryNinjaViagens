/*
  LN Digital — mapeadores e normalizadores de viagem.

  Extraídos do App.jsx sem alterar as regras existentes.
*/

export function dedupeTravelsByCharacter(travels) {
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

export function dbTravelToAppTravel(row) {
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
