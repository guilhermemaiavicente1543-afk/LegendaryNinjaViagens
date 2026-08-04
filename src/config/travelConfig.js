export const UNIT_PER_SMALL_SQUARE = 1;
export const UNIT_NAME = "província";
export const DIAGONAL_COST = 1.41;

export const TRAVEL_TIME_MULTIPLIER = 1;

export const PURSUIT_FOLLOWER_SPEED_MULTIPLIER = 6;
export const PURSUIT_TARGET_SPEED_MULTIPLIER = 3;
export const PURSUIT_BREAK_DISTANCE_PROVINCES = 6;
export const PURSUIT_CATCH_DISTANCE_PROVINCES = 0.08;

export const TRAVEL_MODES = {
  terrestre: {
    label: "Terrestre",
    hoursPerProvince: 12,
    hoursPerFiveFeet: 12,
  },
  aquatico: {
    label: "Aquático",
    hoursPerProvince: 9,
    hoursPerFiveFeet: 9,
  },
  terrestre_aquatico: {
    label: "Terrestre + Aquático",
    hoursPerProvince: 0,
    hoursPerFiveFeet: 0,
    hybridTerrain: true,
  },
  aereo: {
    label: "Aéreo",
    hoursPerProvince: 6,
    hoursPerFiveFeet: 6,
  },
  teletransporte: {
    label: "Teletransporte",
    hoursPerProvince: 0,
    hoursPerFiveFeet: 0,
    instant: true,
  },
};
