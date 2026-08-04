/*
  LN Digital — armazenamento local de viagens.
*/

import {
  TRAVEL_STORAGE_KEY,
} from "../../config/storageKeys.js";

export function readSavedTravels() {
  try {
    return JSON.parse(localStorage.getItem(TRAVEL_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
