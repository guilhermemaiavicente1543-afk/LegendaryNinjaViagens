const ELEMENTS = [
  {
    key: "katon",
    name: "Katon",
    label: "Fogo",
    summary: "Afinidade com a Liberação de Fogo.",
  },
  {
    key: "suiton",
    name: "Suiton",
    label: "Água",
    summary: "Afinidade com a Liberação de Água.",
  },
  {
    key: "fuuton",
    name: "Fuuton",
    label: "Vento",
    summary: "Afinidade com a Liberação de Vento.",
  },
  {
    key: "raiton",
    name: "Raiton",
    label: "Relâmpago",
    summary: "Afinidade com a Liberação de Relâmpago.",
  },
  {
    key: "doton",
    name: "Doton",
    label: "Terra",
    summary: "Afinidade com a Liberação de Terra.",
  },
];

const ALIASES = new Map(
  ELEMENTS.flatMap((element) => [
    [element.key, element.name],
    [element.name.toLowerCase(), element.name],
    [element.label.toLowerCase(), element.name],
  ])
);

export const INITIAL_CHAKRA_ELEMENTS = ELEMENTS;
export const MAX_CHAKRA_NATURES = 5;

export function normalizeChakraNatures(value) {
  let raw = value;

  if (typeof raw === "string") {
    const text = raw.trim();

    if (!text) return [];

    try {
      raw = JSON.parse(text);
    } catch {
      raw = text.split(",");
    }
  }

  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const normalized = [];

  for (const item of list) {
    const candidate =
      typeof item === "string"
        ? item
        : item?.name || item?.key || item?.element || item?.label || "";

    const clean = String(candidate || "").trim();
    if (!clean) continue;

    const canonical = ALIASES.get(clean.toLowerCase());

    if (!canonical) continue;

    if (!normalized.includes(canonical)) {
      normalized.push(canonical);
    }

    if (normalized.length >= MAX_CHAKRA_NATURES) {
      break;
    }
  }

  return normalized;
}

export function getInitialChakraElement(value) {
  const normalized = normalizeChakraNatures(value);
  const primary = normalized[0] || "";

  return (
    ELEMENTS.find((element) => element.name === primary) ||
    ELEMENTS.find((element) => element.key === String(primary).toLowerCase()) ||
    null
  );
}

export function isValidInitialChakraNature(value) {
  const normalized = normalizeChakraNatures(value);

  return (
    normalized.length >= 1 &&
    normalized.length <= MAX_CHAKRA_NATURES &&
    normalized.every((nature) =>
      ELEMENTS.some((element) => element.name === nature)
    )
  );
}

export function formatChakraNatures(value) {
  const normalized = normalizeChakraNatures(value);

  if (normalized.length === 0) return "Não registrado";

  return normalized
    .map((nature, index) => `${nature}${index === 0 ? " — Primário" : " — Secundário"}`)
    .join(" | ");
}
