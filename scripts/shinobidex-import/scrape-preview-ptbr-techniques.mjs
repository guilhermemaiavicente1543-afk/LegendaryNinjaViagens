import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const API = "https://naruto.fandom.com/pt-br/api.php";
const CATEGORY = "Categoria:Jutsu";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121 Safari/537.36";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="));
const outArg = process.argv.find((arg) => arg.startsWith("--out="));

const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 20;
const OFFSET = offsetArg ? Number(offsetArg.split("=")[1]) : 0;
const OUT = outArg
  ? outArg.split("=").slice(1).join("=")
  : "tmp/shinobidex-import/scrape-preview-ptbr-techniques.json";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value = "") {
  return String(value)
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesAny(text, terms) {
  const t = String(text || "").toLowerCase();

  return terms.some((term) => {
    const cleanTerm = String(term || "").toLowerCase().trim();

    if (!cleanTerm) return false;

    // Frases continuam por includes normal.
    if (cleanTerm.includes(" ")) {
      return t.includes(cleanTerm);
    }

    // Palavras curtas precisam de fronteira para evitar falso positivo:
    // "cura" não pode bater em "escura", "curar" não pode bater no meio de outra palavra.
    if (cleanTerm.length <= 5) {
      const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(cleanTerm)}([^\\p{L}\\p{N}]|$)`, "u");
      return regex.test(t);
    }

    return t.includes(cleanTerm);
  });
}

async function fetchText(url, retries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      await sleep(800 * (attempt + 1));
    }
  }

  throw lastError;
}

async function wikiApi(params) {
  const url = new URL(API);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  let lastError = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT }
      });

      if (!response.ok) {
        throw new Error(`Erro Fandom API: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;

      if (attempt < 5) {
        const waitMs = 900 * attempt;
        console.warn(
          `Tentativa ${attempt}/5 falhou na Fandom API: ${error.message}. Tentando novamente em ${waitMs}ms...`
        );
        await sleep(waitMs);
      }
    }
  }

  throw lastError;
}

async function getParsedPageHtml(title) {
  const data = await wikiApi({
    action: "parse",
    page: title,
    prop: "text",
    redirects: "1"
  });

  const html = data?.parse?.text?.["*"] || "";

  if (!html) {
    throw new Error("A API parse não retornou HTML para esta página.");
  }

  return html;
}

async function getJutsuPages() {
  const pages = [];
  let cmcontinue = undefined;
  const target = LIMIT + OFFSET;

  do {
    const data = await wikiApi({
      action: "query",
      list: "categorymembers",
      cmtitle: CATEGORY,
      cmtype: "page",
      cmlimit: "50",
      ...(cmcontinue ? { cmcontinue } : {})
    });

    pages.push(...(data.query?.categorymembers || []));
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue && pages.length < target);

  return pages.slice(OFFSET, OFFSET + LIMIT);
}

function getCanonicalSourceUrl(title) {
  return `https://naruto.fandom.com/pt-br/wiki/${encodeURIComponent(
    title.replaceAll(" ", "_")
  )}`;
}

function extractInfobox($) {
  const box = $(".portable-infobox").first();
  const data = {};

  if (!box.length) return data;

  box.find("div[class*=pi-item]").each((_, element) => {
    const label = cleanText(
      $(element).find("h3[class*=pi-data-label], div[class*=pi-data-label]").first().text()
    ).toLowerCase();

    const value = cleanText(
      $(element).find("div[class*=pi-data-value]").first().text()
    );

    if (!label || !value) return;

    data[label] = value;
  });

  return data;
}

function findInfoboxValue(infobox, labels) {
  for (const [label, value] of Object.entries(infobox)) {
    if (labels.some((wanted) => label.includes(wanted))) {
      return value;
    }
  }

  return "";
}

function normalizeClassification(value) {
  const text = String(value || "").toLowerCase();
  const found = [];

  const add = (label, terms) => {
    if (terms.some((term) => text.includes(term)) && !found.includes(label)) {
      found.push(label);
    }
  };

  add("Ninjutsu", ["ninjutsu"]);
  add("Taijutsu", ["taijutsu"]);
  add("Genjutsu", ["genjutsu"]);
  add("Fuinjutsu", ["fūinjutsu", "fuinjutsu", "selamento"]);
  add("Senjutsu", ["senjutsu", "arte eremita", "modo sábio", "modo sabio"]);
  add("Kenjutsu", ["kenjutsu"]);
  add("Bukijutsu", ["bukijutsu"]);
  add("Dōjutsu", ["dōjutsu", "dojutsu", "doujutsu"]);
  add("Kekkei Genkai", ["kekkei genkai"]);
  add("Kinjutsu", ["kinjutsu"]);
  add("Hiden", ["hiden"]);

  return found.join(", ");
}

function normalizeNature(value) {
  const text = String(value || "").toLowerCase();
  const matches = [];

  const map = [
    ["Suiton", ["estilo água", "estilo agua", "suiton", "água", "agua"]],
    ["Katon", ["estilo fogo", "katon", "fogo"]],
    ["Mokuton", ["estilo madeira", "mokuton", "madeira"]],
    ["Raiton", ["estilo raio", "estilo relâmpago", "estilo relampago", "raiton", "raio", "relâmpago", "relampago"]],
    ["Doton", ["estilo terra", "doton", "terra"]],
    ["Fuuton", ["estilo vento", "fūton", "fuuton", "vento"]],
    ["Hyoton", ["estilo gelo", "hyōton", "hyoton", "gelo"]],
    ["Youton", ["estilo lava", "yōton", "youton", "lava"]],
    ["Futton", ["estilo vapor", "futton", "vapor", "ebulição", "ebulicao"]],
    ["Bakuton", ["estilo explosão", "estilo explosao", "bakuton", "explosão", "explosao"]],
    ["Shoton", ["estilo cristal", "shōton", "shoton", "cristal"]],
    ["Ranton", ["estilo tempestade", "ranton", "tempestade"]],
    ["Jiton", ["estilo magnetismo", "jiton", "magnetismo"]],
    ["Jinton", ["estilo pó", "estilo po", "liberação de pó", "liberacao de po", "jinton"]],
    ["Shakuton", ["estilo calor", "shakuton", "calor", "queimadura"]],
    ["Enton", ["estilo chama", "enton", "chamas negras"]],
    ["Yin", ["liberação de yin", "liberacao de yin", "yin", "inton"]],
    ["Yang", ["liberação de yang", "liberacao de yang", "yang"]]
  ];

  for (const [label, terms] of map) {
    const positions = terms
      .map((term) => text.indexOf(term))
      .filter((position) => position >= 0);

    if (positions.length) {
      matches.push({
        label,
        position: Math.min(...positions)
      });
    }
  }

  return matches
    .sort((a, b) => a.position - b.position)
    .map((item) => item.label)
    .filter((label, index, list) => list.indexOf(label) === index)
    .join(", ");
}

function normalizeType(value) {
  const text = String(value || "").toLowerCase();
  const found = [];

  const add = (label, terms) => {
    if (terms.some((term) => text.includes(term)) && !found.includes(label)) {
      found.push(label);
    }
  };

  add("Ofensivo", ["ofensiv"]);
  add("Defensivo", ["defensiv"]);
  add("Suplementar", ["suplementar", "suporte"]);
  add("Selamento", ["selamento", "selo"]);

  return found.join(", ");
}

function normalizeRank(value, fallbackText = "") {
  const text = `${value} ${fallbackText}`.toUpperCase();

  if (/\bS\b/.test(text) && text.includes("RANK")) return "S";
  if (/\bA\b/.test(text) && text.includes("RANK")) return "A";
  if (/\bB\b/.test(text) && text.includes("RANK")) return "B";
  if (/\bC\b/.test(text) && text.includes("RANK")) return "C";
  if (/\bD\b/.test(text) && text.includes("RANK")) return "D";
  if (/\bE\b/.test(text) && text.includes("RANK")) return "E";

  const lower = `${value} ${fallbackText}`.toLowerCase();

  if (lower.includes("rank s")) return "S";
  if (lower.includes("rank a")) return "A";
  if (lower.includes("rank b")) return "B";
  if (lower.includes("rank c")) return "C";
  if (lower.includes("rank d")) return "D";
  if (lower.includes("rank e")) return "E";

  return "";
}

function extractSummary($) {
  const root =
    $("#mw-content-text .mw-parser-output").first().length
      ? $("#mw-content-text .mw-parser-output").first()
      : $("#mw-content-text").first();

  const clone = root.clone();

  clone
    .find(
      ".portable-infobox, .toc, .navbox, .reflist, .references, sup.reference, " +
        ".mw-editsection, script, style, .quote, .thumb, table, .mbox, .ambox, " +
        ".hatnote, aside, .navigation-not-searchable"
    )
    .remove();

  const paragraphs = [];

  clone.find("p").each((_, element) => {
    const text = cleanText($(element).text());

    if (text.length < 45) return;

    const lower = text.toLowerCase();

    if (
      lower.includes("este artigo") ||
      lower.includes("esta página") ||
      lower.includes("para outros usos") ||
      lower.includes("categorias") ||
      lower.includes("predefinição")
    ) {
      return;
    }

    paragraphs.push(text);
  });

  if (paragraphs[0]) return paragraphs[0].slice(0, 900);

  const og = cleanText($('meta[property="og:description"]').attr("content") || "");
  if (og && og.length >= 30) return og.slice(0, 900);

  return "";
}

function makeFallbackSummary({ title, classification, nature, type, users }) {
  const parts = [];

  if (classification) parts.push(`classificada como ${classification}`);
  if (nature) parts.push(`associada a ${nature}`);
  if (type) parts.push(`do tipo ${type}`);
  if (users) parts.push(`usuários registrados: ${users}`);

  if (!parts.length) {
    return `Técnica catalogada na Wiki Naruto PT-BR. Descrição detalhada pendente de revisão.`;
  }

  return `${title} é uma técnica ${parts.join(", ")}. Descrição detalhada pendente de revisão.`;
}

function ancedRank(total) {
  if (total >= 204) return "SS";
  if (total >= 175) return "S";
  if (total >= 146) return "A";
  if (total >= 117) return "B";
  if (total >= 88) return "C";
  if (total >= 59) return "D";
  return "E";
}

function estimateAnced({
  title,
  summary,
  classification,
  nature,
  type,
  usersText,
  wikiRank,
  rangeText = "",
  secondaryClassification = "",
  isGamePresent = false,
  isGameOnly = false
}) {
  const text = `${title} ${summary} ${classification} ${nature} ${type} ${usersText} ${rangeText}`.toLowerCase();
  const rawRange = String(rangeText || "").toLowerCase();
  const rawType = String(type || "").toLowerCase();
  const secondaryText = String(secondaryClassification || "").toLowerCase();
  const fullClassificationText = `${classification} ${secondaryClassification}`.toLowerCase();
  const isKonbijutsu = includesAny(secondaryText, ["konbijutsu", "cooperação", "cooperacao"]);

  let range = ["Curto alcance", 20];

  if (includesAny(rawRange, ["todos", "curto, médio, longo", "curto, medio, longo"])) {
    range = ["Todos os alcances", 44];
  } else if (includesAny(rawRange, ["longo"])) {
    range = ["Longo alcance", 38];
  } else if (includesAny(rawRange, ["médio", "medio"])) {
    range = ["Médio alcance", 26];
  } else if (includesAny(rawRange, ["curto"])) {
    range = ["Curto alcance", 20];
  } else if (includesAny(text, ["longo alcance", "grande distância", "grande distancia", "long range", "long-range"])) {
    range = ["Longo alcance", 38];
  } else if (includesAny(text, ["médio alcance", "medio alcance", "medium range", "mid-range"])) {
    range = ["Médio alcance", 26];
  } else if (includesAny(text, ["corpo a corpo", "close combat", "close-range"]) || classification.includes("Taijutsu")) {
    range = ["Corpo a corpo", 8];
  } else if (includesAny(text, ["grande área", "grande area", "ampla área", "ampla area", "todos os alcances"])) {
    range = ["Todos os alcances", 44];
  }

  let users = ["1 usuário", 42];

  const userItems = usersText
    .split(/,| e |;|\//)
    .map((item) => item.trim())
    .filter(Boolean);

  if (includesAny(usersText, ["vários", "varios", "múltiplos", "multiplos", "diversos"])) {
    users = ["6+ usuários", 4];
  } else if (userItems.length >= 5) {
    users = ["5 usuários", 12];
  } else if (userItems.length >= 3) {
    users = ["3–4 usuários", 24];
  } else if (userItems.length === 2) {
    users = ["2 usuários", 34];
  } else if (isKonbijutsu && includesAny(summary, ["três", "tres", "os três", "os tres"])) {
    users = ["3–4 usuários", 24];
  } else if (isKonbijutsu) {
    users = ["2 usuários", 34];
  }

  let classType = ["Ofensiva", 18];

  const hasOffensiveType = includesAny(rawType, ["ofensiv"]);
  const hasDefensiveType = includesAny(rawType, ["defensiv"]);
  const hasSupportType = includesAny(rawType, ["suplementar", "suporte"]);
  const hasSealingType = includesAny(rawType, ["selamento"]);

  // Regra de dominância:
  // se a wiki diz "Ofensivo, Defensivo" ou "Ofensivo, Suplementar",
  // tratamos como Ofensiva para o cálculo principal, porque há dano/ataque direto.
  if (!hasOffensiveType && (hasDefensiveType || includesAny(text, ["defesa", "barreira", "protege", "proteção", "protecao"]))) {
    classType = ["Defensiva", 10];
  }

  if (!hasOffensiveType && (hasSupportType || includesAny(text, ["suporte", "sensor", "rastreamento", "cura", "curar", "aumenta", "amplifica"]))) {
    classType = ["Suporte", 30];
  }

  const hasRealSealing =
    hasSealingType ||
    classification.includes("Fuinjutsu") ||
    includesAny(fullClassificationText, ["Fuinjutsu", "Fūinjutsu"]) ||
    includesAny(text, [
      "técnica de selamento",
      "tecnica de selamento",
      "fuuinjutsu",
      "fuinjutsu",
      "fūinjutsu",
      "selamento",
      "selar o corpo",
      "selar a alma",
      "selar chakra",
      "sela o alvo",
      "sela o oponente",
      "sela uma técnica",
      "sela uma tecnica"
    ]);

  // Não contar como Selamento apenas por aparecer "selo de mão" ou "selo amaldiçoado".
  if (hasRealSealing) {
    classType = ["Selamento", 32];
  }

  if (includesAny(text, ["preparação", "preparacao", "preparar", "armadilha"])) {
    classType = ["Preparação", 46];
  }

  const structureCandidates = [];

  const addStructureCandidate = (label, points, condition) => {
    if (condition) {
      structureCandidates.push([label, points]);
    }
  };

  const hasPhysicalStructure = includesAny(fullClassificationText, ["Taijutsu", "Bukijutsu", "Kenjutsu"]);

  // Senjutsu NÃO entra aqui, porque já recebe bônus próprio de +50.
  // Se entrar também como estrutura, técnicas físicas com Modo Sennin ficam infladas.
  const hasNinjaStructure = includesAny(fullClassificationText, ["Ninjutsu", "Genjutsu", "Fuinjutsu"]);

  const hasElementalNature = Boolean(nature && nature !== "Hiden");

  addStructureCandidate(
    "Taijutsu/Bukijutsu",
    6,
    hasPhysicalStructure
  );

  addStructureCandidate(
    "Hiden/Yang",
    14,
    nature === "Hiden" || includesAny(fullClassificationText, ["Hiden"]) || includesAny(text, ["hiden", "yang"])
  );

  addStructureCandidate(
    "Elemental/Yin",
    24,
    hasNinjaStructure || hasElementalNature
  );

  addStructureCandidate(
    "Não elemental/Kekkei Genkai",
    40,
    includesAny(fullClassificationText, ["Kekkei Genkai", "Dōjutsu", "Doujutsu", "Dojutsu", "Kekkei Moura"])
  );

  addStructureCandidate(
    "Kinjutsu/Exclusiva",
    48,
    includesAny(fullClassificationText, ["Kinjutsu"]) || includesAny(text, ["técnica proibida", "tecnica proibida", "proibida", "kinjutsu"])
  );

  const structure = structureCandidates
    .sort((a, b) => b[1] - a[1])[0] || ["Elemental/Yin", 24];

  let damage = ["Ferimentos moderados", 22];

  if (
    classType[0] === "Defensiva" ||
    classType[0] === "Suporte" ||
    classType[0] === "Selamento" ||
    classification.includes("Genjutsu")
  ) {
    damage = ["Não causa dano/Incapacitante", 2];
  }

  if (hasOffensiveType && classType[0] === "Ofensiva") {
    damage = ["Ferimentos moderados", 22];
  }

  if (includesAny(text, ["ferimentos leves", "dano leve"])) damage = ["Ferimentos leves", 16];

  const breaksBody =
    includesAny(text, ["quebrar ossos", "quebra ossos", "quebrando ossos", "fraturar", "fratura", "fraturar as costas", "quebrar as costas"]);

  const breaksSeal =
    includesAny(text, ["quebrar fuuinjutsu", "quebrar fuinjutsu", "quebrar selamento", "quebrar selo", "decodificar", "fórmula de selamento", "formula de selamento"]);

  if (
    breaksBody ||
    includesAny(text, [
      "esmaga",
      "esmagar",
      "perfura",
      "perfurar",
      "empala",
      "atravessa",
      "mortal",
      "morte",
      "fatal",
      "grave",
      "matar"
    ])
  ) {
    damage = ["Ferimentos graves/mortais", 34];
  }

  if (breaksSeal && classType[0] === "Selamento") {
    damage = ["Não causa dano/Incapacitante", 2];
  }

  if (includesAny(text, ["destrói", "destroi", "destruir", "devasta", "devastar", "obliterar", "aniquilar", "explosão gigante"])) {
    damage = ["Dizimação/obliteração", 50];
  }

  const isHealing = includesAny(text, ["cura", "curar", "médico", "medico", "iryō", "iryo"]);
  const usesSenjutsu = includesAny(text, ["senjutsu", "arte eremita", "modo sábio", "modo sabio", "sennin"]);
  const isFillerBoruto = includesAny(text, ["boruto"]);

  let total = range[1] + users[1] + classType[1] + structure[1] + damage[1];

  if (isHealing) total += 43;
  if (usesSenjutsu) total += 50;
  if (isFillerBoruto) total += 20;

  let confidence = "baixa";
  const isGameOnlyOrGame = Boolean(isGameOnly);

  if (summary && summary.length >= 120) confidence = "média";
  if (classification && type && rangeText && summary && summary.length >= 120) confidence = "média";
  if (wikiRank && classification && nature && type && rangeText && summary && summary.length >= 180) confidence = "alta";

  const calculatedRank = ancedRank(total);

  if (!wikiRank && isGameOnlyOrGame) {
    confidence = "baixa";
  }

  if (!wikiRank && ["A", "S", "SS"].includes(calculatedRank)) {
    confidence = "baixa";
  }

  const details = [
    `${range[0]}: +${range[1]}`,
    `${users[0]}: +${users[1]}`,
    `${classType[0]}: +${classType[1]}`,
    `${structure[0]}: +${structure[1]}`,
    `${damage[0]}: +${damage[1]}`,
    isHealing ? "Técnica de cura: +43" : "",
    usesSenjutsu ? "Usa Senjutsu: +50" : "",
    isFillerBoruto ? "Filler Boruto: +20" : ""
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    rank: calculatedRank,
    total,
    confidence,
    details
  };
}

function makeRpgEffect({ classification, nature, wikiRank, summary }) {
  const parts = [];

  if (classification) parts.push(classification);
  if (nature) parts.push(nature);
  if (wikiRank) parts.push(`Rank Wiki ${wikiRank}`);

  const base = parts.length ? parts.join(" · ") : "Técnica Shinobi";

  if (!summary) {
    return `${base}. Efeito RPG pendente de revisão do ADM.`;
  }

  return `${base}. Em jogo, use a descrição oficial como referência narrativa e aplique os custos, alcance e limitações definidos pela administração.`;
}


function getMediaFlags(infobox) {
  const labels = Object.keys(infobox || {})
    .join(" ")
    .toLowerCase();

  const hasGame = /\b(game|games|jogo|jogos)\b/.test(labels);
  const hasAnime = /\banime\b/.test(labels);
  const hasManga = /\b(mangá|manga)\b/.test(labels);
  const hasMovie = /\b(filme|movie)\b/.test(labels);
  const hasOva = /\bova\b/.test(labels);
  const hasNovel = /\b(novel|livro|romance)\b/.test(labels);

  const hasNonGameMedia = hasAnime || hasManga || hasMovie || hasOva || hasNovel;
  const isGameOnly = hasGame && !hasNonGameMedia;

  return {
    hasGame,
    hasAnime,
    hasManga,
    hasMovie,
    hasOva,
    hasNovel,
    isGameOnly
  };
}

async function scrapeTechnique(page, index, total) {
  const title = page.title;
  const sourceUrl = getCanonicalSourceUrl(title);
  const html = await getParsedPageHtml(title);
  const $ = cheerio.load(
    `<div id="mw-content-text"><div class="mw-parser-output">${html}</div></div>`
  );

  const infobox = extractInfobox($);
  const mediaFlags = getMediaFlags(infobox);
  const infoboxText = Object.values(infobox).join(" ");

  const rawClassification = findInfoboxValue(infobox, ["classificação", "classificacao", "classification"]);
  const rawSecondaryClassification = findInfoboxValue(infobox, ["classificação 2", "classificacao 2"]);
  const rawNature = findInfoboxValue(infobox, ["natureza", "elemento", "nature"]);
  const rawType = findInfoboxValue(infobox, ["classe", "tipo", "type"]);
  const rawRange = findInfoboxValue(infobox, ["alcance", "range"]);
  const usersText = findInfoboxValue(infobox, ["usuário", "usuario", "usuários", "usuarios", "users"]);
  const rawRank = findInfoboxValue(infobox, ["rank", "classificação ninja"]);

  const scrapedSummary = extractSummary($);

  const classification =
    normalizeClassification(rawClassification) ||
    normalizeClassification(rawSecondaryClassification) ||
    "Ninjutsu";

  const nature = normalizeNature(rawNature);
  const type = normalizeType(rawType);
  const wikiRank = normalizeRank(rawRank, "");

  const summary =
    scrapedSummary ||
    makeFallbackSummary({
      title,
      classification,
      nature,
      type,
      users: usersText
    });

  const anced = estimateAnced({
    title,
    summary,
    classification,
    nature,
    type,
    usersText,
    wikiRank,
    rangeText: rawRange,
    secondaryClassification: rawSecondaryClassification,
    isGamePresent: mediaFlags.hasGame,
    isGameOnly: mediaFlags.isGameOnly
  });

  const notes = [
    !scrapedSummary ? "DESCRICAO_GERADA_FALLBACK" : "",
    !rawClassification ? "SEM_CLASSIFICACAO_INFOBOX" : "",
    rawSecondaryClassification ? "CLASSIFICACAO_SECUNDARIA_PRESENTE" : "",
    rawSecondaryClassification && includesAny(rawSecondaryClassification, ["konbijutsu", "cooperação", "cooperacao"]) ? "KONBIJUTSU_DETECTADO" : "",
    !rawNature ? "SEM_NATUREZA_INFOBOX" : "",
    !rawRank ? "SEM_RANK_WIKI" : "",
    !rawRange ? "SEM_ALCANCE_INFOBOX" : "",
    rawRange && rawRange.split(",").length >= 3 ? "MULTI_ALCANCE" : "",
    nature && nature.split(",").length >= 3 ? "NATUREZA_MULTIPLA" : "",
    mediaFlags.hasGame ? "GAME_PRESENTE" : "",
    mediaFlags.isGameOnly ? "GAME_ONLY" : "",
    !rawRank && ["A", "S", "SS"].includes(anced.rank) ? "ANCED_ALTO_SEM_RANK_WIKI" : "",
    !rawRank && ["A", "S", "SS"].includes(anced.rank) ? "REVISAO_PRIORITARIA" : "",
    anced.confidence === "baixa" ? "ANCED_BAIXA_CONFIANCA" : ""
  ].filter(Boolean);

  console.log(
    `[${index}/${total}] OK: ${title} | ${classification || "-"} | ${nature || "-"} | ${wikiRank || "sem rank"} | ${anced.rank} (${anced.total}) | ${
      scrapedSummary ? "descrição wiki" : "fallback"
    }`
  );

  return {
    slug: slugify(title),
    name: title,
    name_pt: title,
    wiki_rank: wikiRank,
    anced_rank: anced.rank,
    anced_total: anced.total,
    anced_confidence: anced.confidence,
    anced_details: anced.details,
    classification,
    nature,
    technique_type: type,
    users_text: usersText,
    summary,
    rpg_effect: makeRpgEffect({ classification, nature, wikiRank, summary }),
    requirements: "",
    limitations: "",
    source_name: "Wiki Naruto PT-BR",
    source_url: sourceUrl,
    source_url_pt: sourceUrl,
    source_license: "CC BY-SA 3.0",
    source_status: "scrape_preview",
    status: "needs_review",
    import_notes: notes,
    raw_classification: rawClassification,
    raw_secondary_classification: rawSecondaryClassification,
    raw_nature: rawNature,
    raw_type: rawType,
    raw_range: rawRange,
    media_flags: mediaFlags,
    raw_infobox: infobox
  };
}

async function main() {
  console.log("Scrape Preview ShinobiDex PT-BR");
  console.log(`API: ${API}`);
  console.log(`Categoria: ${CATEGORY}`);
  console.log(`Limit=${LIMIT} | Offset=${OFFSET}`);

  const pages = await getJutsuPages();
  const records = [];
  const errors = [];

  for (const [index, page] of pages.entries()) {
    try {
      const record = await scrapeTechnique(page, index + 1, pages.length);
      records.push(record);
    } catch (error) {
      errors.push({ title: page.title, error: error.message });
      console.error(`[${index + 1}/${pages.length}] ERRO: ${page.title}: ${error.message}`);
    }

    await sleep(450);
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(
    OUT,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        api: API,
        category: CATEGORY,
        limit: LIMIT,
        offset: OFFSET,
        total_records: records.length,
        total_errors: errors.length,
        records,
        errors
      },
      null,
      2
    )
  );

  console.log(`Preview salvo em: ${OUT}`);
  console.log(`Registros: ${records.length} | Erros: ${errors.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
