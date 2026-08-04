/*
  LN Digital — armazenamento local do editor de terreno.
*/

import {
  TERRAIN_POLYGONS_STORAGE_KEY,
} from "../../config/storageKeys.js";
import {
  DEFAULT_LAND_POLYGONS,
} from "../../data/mapTerrainPolygons.js";

export function readSavedTerrainPolygons() {
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

export function saveTerrainPolygonsToStorage(polygons) {
  if (typeof localStorage === "undefined") return;

  localStorage.setItem(TERRAIN_POLYGONS_STORAGE_KEY, JSON.stringify(polygons || []));
}
