function normalizePoint(point) {
  if (Array.isArray(point)) {
    return {
      lat: Number(point[0]),
      lng: Number(point[1]),
    };
  }

  return {
    lat: Number(point?.lat ?? point?.y),
    lng: Number(point?.lng ?? point?.x),
  };
}

export function isValidPoint(point) {
  const normalized = normalizePoint(point);
  return Number.isFinite(normalized.lat) && Number.isFinite(normalized.lng);
}

export function isPointInPolygon(point, polygonPoints = []) {
  const target = normalizePoint(point);

  if (!isValidPoint(target) || !Array.isArray(polygonPoints) || polygonPoints.length < 3) {
    return false;
  }

  // Ray casting. x = lng, y = lat.
  const x = target.lng;
  const y = target.lat;

  let inside = false;

  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const current = normalizePoint(polygonPoints[i]);
    const previous = normalizePoint(polygonPoints[j]);

    if (!isValidPoint(current) || !isValidPoint(previous)) {
      continue;
    }

    const xi = current.lng;
    const yi = current.lat;
    const xj = previous.lng;
    const yj = previous.lat;

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function getTerrainAtPoint(point, landPolygons = []) {
  const normalized = normalizePoint(point);

  if (!isValidPoint(normalized)) {
    return {
      terrain: "unknown",
      label: "Desconhecido",
      polygon: null,
    };
  }

  const polygon =
    landPolygons.find((item) => isPointInPolygon(normalized, item.points || [])) || null;

  if (polygon) {
    return {
      terrain: "land",
      label: "Terra",
      polygon,
    };
  }

  return {
    terrain: "water",
    label: "Água",
    polygon: null,
  };
}

export function analyzeRouteTerrain(startPoint, endPoint, landPolygons = [], samples = 24) {
  const start = normalizePoint(startPoint);
  const end = normalizePoint(endPoint);

  if (!isValidPoint(start) || !isValidPoint(end)) {
    return {
      terrain: "unknown",
      label: "Rota desconhecida",
      samples: [],
    };
  }

  const routeSamples = [];

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const point = {
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
    };

    routeSamples.push({
      point,
      ...getTerrainAtPoint(point, landPolygons),
    });
  }

  const hasLand = routeSamples.some((sample) => sample.terrain === "land");
  const hasWater = routeSamples.some((sample) => sample.terrain === "water");

  if (hasLand && hasWater) {
    return {
      terrain: "mixed",
      label: "Rota mista",
      samples: routeSamples,
    };
  }

  if (hasLand) {
    return {
      terrain: "land",
      label: "Rota terrestre",
      samples: routeSamples,
    };
  }

  if (hasWater) {
    return {
      terrain: "water",
      label: "Rota aquática",
      samples: routeSamples,
    };
  }

  return {
    terrain: "unknown",
    label: "Rota desconhecida",
    samples: routeSamples,
  };
}
