export const ANCED_VALUES = {
  range: {
    none: 0,
    melee: 8,
    short: 20,
    medium: 26,
    long: 38,
    all: 44,
  },

  users: {
    none: 0,
    sixPlus: 4,
    five: 12,
    threeOrFour: 24,
    two: 34,
    one: 42,
  },

  class: {
    defensive: 10,
    offensive: 18,
    support: 30,
    sealing: 32,
    preparation: 46,
  },

  structure: {
    taijutsuBukijutsu: 6,
    hidenYang: 14,
    elementalYin: 24,
    nonElementalKekkeiGenkai: 40,
    kinjutsuKekkeiTotaExclusive: 48,
  },

  damage: {
    noneOrIncapacitation: 2,
    light: 16,
    moderate: 22,
    severeOrMortal: 34,
    obliteration: 50,
  },

  bonus: {
    healing: 43,
    senjutsu: 50,
    borutoFiller: 20,
  },
};

export const ANCED_RANKS = [
  { rank: "SS", min: 204, max: 230 },
  { rank: "S", min: 175, max: 203 },
  { rank: "A", min: 146, max: 174 },
  { rank: "B", min: 117, max: 145 },
  { rank: "C", min: 88, max: 116 },
  { rank: "D", min: 59, max: 87 },
  { rank: "E", min: 0, max: 58 },
];

export function getAncedRank(total) {
  const value = Number(total || 0);

  if (value >= 204) return "SS";
  if (value >= 175) return "S";
  if (value >= 146) return "A";
  if (value >= 117) return "B";
  if (value >= 88) return "C";
  if (value >= 59) return "D";
  return "E";
}

export function getUserPoints(count) {
  const value = Number(count || 0);

  if (value >= 6) {
    return {
      label: "6+ usuários",
      points: ANCED_VALUES.users.sixPlus,
      needsReview: false,
    };
  }

  if (value === 5) {
    return {
      label: "5 usuários",
      points: ANCED_VALUES.users.five,
      needsReview: false,
    };
  }

  if (value === 4 || value === 3) {
    return {
      label: "4/3 usuários",
      points: ANCED_VALUES.users.threeOrFour,
      needsReview: false,
    };
  }

  if (value === 2) {
    return {
      label: "2 usuários",
      points: ANCED_VALUES.users.two,
      needsReview: false,
    };
  }

  if (value === 1) {
    return {
      label: "1 usuário",
      points: ANCED_VALUES.users.one,
      needsReview: false,
    };
  }

  return {
    label: "0 usuários válidos",
    points: ANCED_VALUES.users.none,
    needsReview: true,
  };
}

export function calculateAncedTotal({
  rangePoints = 0,
  usersPoints = 0,
  classPoints = 0,
  structurePoints = 0,
  damagePoints = 0,
  healingBonus = false,
  senjutsuBonus = false,
  borutoFillerBonus = false,
  speedPercent = 0,
} = {}) {
  const speedBonus = Math.floor(Number(speedPercent || 0) / 5);

  const bonuses = {
    healing: healingBonus ? ANCED_VALUES.bonus.healing : 0,
    senjutsu: senjutsuBonus ? ANCED_VALUES.bonus.senjutsu : 0,
    borutoFiller: borutoFillerBonus ? ANCED_VALUES.bonus.borutoFiller : 0,
    speed: speedBonus,
  };

  const total =
    Number(rangePoints || 0) +
    Number(usersPoints || 0) +
    Number(classPoints || 0) +
    Number(structurePoints || 0) +
    Number(damagePoints || 0) +
    bonuses.healing +
    bonuses.senjutsu +
    bonuses.borutoFiller +
    bonuses.speed;

  return {
    total,
    rank: getAncedRank(total),
    bonuses,
  };
}
