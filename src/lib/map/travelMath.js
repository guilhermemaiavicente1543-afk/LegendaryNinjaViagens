import {
  UNIT_PER_SMALL_SQUARE,
  DIAGONAL_COST,
  TRAVEL_MODES,
} from "../../config/travelConfig.js";

export function calculateTravel(a, b, travelMode) {
  const dx = Math.abs(
    Number(a?.globalSmallCol ?? 0) -
    Number(b?.globalSmallCol ?? 0)
  );

  const dy = Math.abs(
    Number(a?.globalSmallRow ?? 0) -
    Number(b?.globalSmallRow ?? 0)
  );

  const diagonals = Math.min(dx, dy);
  const straights = Math.max(dx, dy) - diagonals;

  const smallSquares = diagonals * DIAGONAL_COST + straights;
  const feet = smallSquares * UNIT_PER_SMALL_SQUARE;

  const selectedMode =
    TRAVEL_MODES[travelMode] ||
    TRAVEL_MODES.terrestre;

  const hoursPerProvince = Number(
    selectedMode.hoursPerProvince ??
    selectedMode.hoursPerFiveFeet ??
    0
  );

  const hours = selectedMode.instant
    ? 0
    : smallSquares * hoursPerProvince;

  const days = hours / 24;

  return {
    dx,
    dy,
    diagonals,
    straights,
    smallSquares,
    macroBlocks: smallSquares,
    feet,
    provinces: smallSquares,
    hours,
    days,
    modeKey: travelMode,
    modeLabel: selectedMode.label,
    hoursPerProvince,
    hoursPerFiveFeet: hoursPerProvince,
  };
}

export function formatTime(hours) {
  const numericHours = Number(hours);

  if (!Number.isFinite(numericHours)) {
    return "0h";
  }

  const wholeHours = Math.floor(numericHours);
  const minutes = Math.round((numericHours - wholeHours) * 60);

  if (minutes === 60) {
    return `${wholeHours + 1}h`;
  }

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}min`;
}
