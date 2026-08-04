export function getPursuitMeta(travel = {}) {
  const endCoord =
    travel.endCoord ||
    travel.end_coord ||
    {};

  const storedMeta =
    travel.pursuit ||
    endCoord.pursuit ||
    {};

  const targetCharacterId = String(
    travel.pursuitTargetCharacterId ||
    travel.pursuit_target_character_id ||
    storedMeta.targetCharacterId ||
    storedMeta.target_character_id ||
    storedMeta.targetId ||
    ""
  );

  const looksLikePursuit =
    travel.isPursuit === true ||
    travel.travelKind === "pursuit" ||
    storedMeta.kind === "pursuit" ||
    storedMeta.active === true ||
    Boolean(targetCharacterId);

  if (!looksLikePursuit || !targetCharacterId) {
    return null;
  }

  return {
    kind: "pursuit",
    active: storedMeta.active !== false,
    targetCharacterId,
    targetName:
      travel.pursuitTargetName ||
      storedMeta.targetName ||
      storedMeta.target_name ||
      "Presença desconhecida",
    startedAt:
      storedMeta.startedAt ||
      storedMeta.started_at ||
      travel.startedAt ||
      "",
  };
}

export function getPursuitTargetCharacterId(travel = {}) {
  return getPursuitMeta(travel)?.targetCharacterId || "";
}

export function isPursuitTravel(travel = {}) {
  const meta = getPursuitMeta(travel);

  return Boolean(
    meta?.active &&
    meta?.targetCharacterId
  );
}

export function attachPursuitMeta(coord = {}, meta = {}) {
  const targetCharacterId = String(
    meta.targetCharacterId || ""
  );

  return {
    ...(coord || {}),
    pursuit: {
      kind: "pursuit",
      active: true,
      targetCharacterId,
      targetName:
        meta.targetName ||
        "Presença desconhecida",
      startedAt:
        meta.startedAt ||
        new Date().toISOString(),
    },
    pursuitTargetCharacterId: targetCharacterId,
  };
}

export function withPursuitBoost(
  travel = {},
  pursuitId,
  multiplier = 3,
  originalModeLabel = ""
) {
  const endCoord =
    travel.endCoord ||
    travel.end_coord ||
    {};

  const baseLabel =
    originalModeLabel ||
    travel.modeLabelBeforePursuit ||
    travel.modeLabel ||
    "Viagem";

  return {
    ...travel,
    endCoord: {
      ...endCoord,
      pursuitBoost: {
        pursuitId: String(pursuitId || ""),
        multiplier: Number(multiplier || 1),
        originalModeLabel: baseLabel,
      },
    },
    pursuitBoostedBy: String(pursuitId || ""),
    pursuitTargetMultiplier: Number(multiplier || 1),
    modeLabelBeforePursuit: baseLabel,
  };
}

export function stripPursuitBoost(travel = {}) {
  const endCoord =
    travel.endCoord ||
    travel.end_coord ||
    {};

  const {
    pursuitBoost,
    ...cleanEndCoord
  } = endCoord;

  const originalModeLabel =
    pursuitBoost?.originalModeLabel ||
    travel.modeLabelBeforePursuit ||
    travel.modeLabel ||
    "Viagem";

  return {
    ...travel,
    endCoord: cleanEndCoord,
    pursuitBoostedBy: "",
    pursuitTargetMultiplier: 1,
    modeLabelBeforePursuit: "",
    modeLabel: originalModeLabel,
  };
}

export function normalizeTravelPursuitState(travel = {}) {
  const endCoord =
    travel.endCoord ||
    travel.end_coord ||
    {};

  const pursuitMeta = getPursuitMeta(travel);
  const pursuitBoost =
    endCoord.pursuitBoost ||
    travel.pursuitBoost ||
    null;

  return {
    ...travel,

    ...(pursuitMeta
      ? {
          isPursuit: true,
          travelKind: "pursuit",
          pursuitTargetCharacterId:
            pursuitMeta.targetCharacterId,
          pursuitTargetName:
            pursuitMeta.targetName,
        }
      : {}),

    ...(pursuitBoost?.pursuitId
      ? {
          pursuitBoostedBy:
            String(pursuitBoost.pursuitId),
          pursuitTargetMultiplier:
            Number(pursuitBoost.multiplier || 3),
          modeLabelBeforePursuit:
            pursuitBoost.originalModeLabel ||
            travel.modeLabel ||
            "Viagem",
        }
      : {}),
  };
}

export function pointsDiffer(
  firstPoint,
  secondPoint,
  tolerance = 0.02
) {
  if (
    !Array.isArray(firstPoint) ||
    !Array.isArray(secondPoint) ||
    firstPoint.length < 2 ||
    secondPoint.length < 2
  ) {
    return true;
  }

  const firstLat = Number(firstPoint[0]);
  const firstLng = Number(firstPoint[1]);
  const secondLat = Number(secondPoint[0]);
  const secondLng = Number(secondPoint[1]);

  if (
    !Number.isFinite(firstLat) ||
    !Number.isFinite(firstLng) ||
    !Number.isFinite(secondLat) ||
    !Number.isFinite(secondLng)
  ) {
    return true;
  }

  return (
    Math.hypot(
      firstLat - secondLat,
      firstLng - secondLng
    ) > tolerance
  );
}
