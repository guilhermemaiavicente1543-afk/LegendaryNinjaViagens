/*
  LN Digital — armazenamento local de personagens e localizações.
*/

import {
  CHARACTER_STORAGE_KEY,
  CHARACTER_LOCATION_STORAGE_KEY,
  CHARACTER_DIMENSION_STORAGE_KEY,
} from "../../config/storageKeys.js";

export function readSavedCharacters() {
  try {
    return JSON.parse(localStorage.getItem(CHARACTER_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function readCharacterLocations() {
  try {
    return JSON.parse(localStorage.getItem(CHARACTER_LOCATION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function writeCharacterLocations(locations) {
  localStorage.setItem(CHARACTER_LOCATION_STORAGE_KEY, JSON.stringify(locations));
}

export function readCharacterDimensionLocations() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CHARACTER_DIMENSION_STORAGE_KEY) || "{}"
    );

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCharacterDimensionLocations(locations) {
  localStorage.setItem(
    CHARACTER_DIMENSION_STORAGE_KEY,
    JSON.stringify(locations || {})
  );
}
