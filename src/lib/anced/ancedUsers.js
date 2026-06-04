import { getUserPoints } from "./ancedFormula.js";

const NON_HUMAN_PATTERNS = [
  "kurama",
  "shukaku",
  "matatabi",
  "isobu",
  "son goku",
  "son gokū",
  "kokuo",
  "kokuō",
  "saiken",
  "chomei",
  "chōmei",
  "gyuki",
  "gyūki",
  "dez-caudas",
  "juubi",
  "jūbi",
  "gedo mazo",
  "gedō mazō",
  "manda",
  "gamabunta",
  "gamatatsu",
  "gamaken",
  "gamakichi",
  "katsuyu",
  "aoda",
  "kyodaija",
  "ninken",
  "akamaru",
  "kuromaru",
  "tonton",
  "isobu",
  "bijuu",
  "bijū",
  "besta com cauda",
  "besta-invocação",
  "besta invocação",
  "invocação",
  "marionete",
  "ferramenta",
  "arma",
  "estátua",
  "mundo de genjutsu",
];

export function stripAccents(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeText(value = "") {
  return stripAccents(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function parseUserEntry(rawEntry) {
  if (typeof rawEntry === "object" && rawEntry !== null) {
    return {
      name: String(rawEntry.name || "").trim(),
      label: String(rawEntry.label || rawEntry.media || "").trim(),
      raw: rawEntry.raw || `${rawEntry.name || ""} ${rawEntry.label || ""}`.trim(),
    };
  }

  const raw = String(rawEntry || "").trim();

  const match = raw.match(/^(.*?)\s*\((.*?)\)\s*$/);

  if (match) {
    return {
      name: match[1].trim(),
      label: match[2].trim(),
      raw,
    };
  }

  return {
    name: raw,
    label: "",
    raw,
  };
}

export function labelContainsManga(label = "") {
  const normalized = normalizeText(label);
  return normalized.includes("manga");
}

export function isRestrictiveMediaLabel(label = "") {
  const normalized = normalizeText(label);

  if (!normalized) return false;

  if (labelContainsManga(normalized)) return false;

  return [
    "apenas anime",
    "somente anime",
    "anime",
    "apenas game",
    "somente game",
    "game",
    "jogo",
    "anime e game",
    "anime e jogo",
    "anime e novel",
    "novel e anime",
    "anime e romance",
    "romance e anime",
    "apenas novel",
    "somente novel",
    "novel",
    "romance",
    "filme",
    "movie",
    "ova",
    "mundo de genjutsu",
  ].some((pattern) => normalized.includes(pattern));
}

export function isMundoDeGenjutsu(user) {
  const joined = normalizeText(`${user?.name || ""} ${user?.label || ""} ${user?.raw || ""}`);
  return joined.includes("mundo de genjutsu");
}

export function isNonHumanUser(user) {
  const normalized = normalizeText(`${user?.name || ""} ${user?.label || ""} ${user?.raw || ""}`);

  if (!normalized) return false;

  return NON_HUMAN_PATTERNS.some((pattern) => normalized.includes(normalizeText(pattern)));
}

export function dedupeUsers(users = []) {
  const seen = new Set();
  const result = [];

  for (const user of users) {
    const key = normalizeText(user.name || user.raw || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(user);
  }

  return result;
}

export function filterAncedUsers(rawUsers = []) {
  const parsed = dedupeUsers(rawUsers.map(parseUserEntry).filter((user) => user.name));

  const withoutGenjutsuWorld = parsed.filter((user) => !isMundoDeGenjutsu(user));

  const mediaValid = withoutGenjutsuWorld.filter((user) => {
    return !isRestrictiveMediaLabel(user.label);
  });

  const humanUsers = mediaValid.filter((user) => !isNonHumanUser(user));
  const nonHumanUsers = mediaValid.filter((user) => isNonHumanUser(user));

  const validUsers = humanUsers.length > 0 ? humanUsers : nonHumanUsers;

  const userPoints = getUserPoints(validUsers.length);

  return {
    rawUsers: parsed,
    mediaValidUsers: mediaValid,
    humanUsers,
    nonHumanUsers,
    validUsers,
    count: validUsers.length,
    usersLabel: userPoints.label,
    usersPoints: userPoints.points,
    needsReview: userPoints.needsReview,
    ruleApplied:
      humanUsers.length > 0
        ? "Foram contados apenas usuários humanos canônicos ou com rótulo contendo Mangá."
        : nonHumanUsers.length > 0
          ? "Não havia usuários humanos válidos; usuários não humanos foram contados pela exceção ANCED."
          : "Nenhum usuário válido encontrado após filtro de mídia/canonicidade.",
  };
}
