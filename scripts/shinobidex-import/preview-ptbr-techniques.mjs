import fs from "node:fs/promises";
import path from "node:path";

const API = "https://naruto.fandom.com/pt-br/api.php";
const CATEGORY = "Categoria:Jutsu";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="));
const outArg = process.argv.find((arg) => arg.startsWith("--out="));

const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 20;
const OFFSET = offsetArg ? Number(offsetArg.split("=")[1]) : 0;
const OUT = outArg ? outArg.split("=").slice(1).join("=") : "tmp/shinobidex-import/preview-ptbr-techniques.json";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function cleanWikiText(value = "") {
  return String(value)
    .replace(/\{\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\}/g, "")
    .replace(/\{\{.*?\}\}/gs, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\[https?:\/\/[^\s\]]+\s?([^\]]*)\]/g, "$1")
    .replace(/<ref[^>]*>.*?<\/ref>/gis, "")
    .replace(/<.*?>/g, "")
    .replace(/'{2,}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripSections(text = "") {
  return String(text)
    .replace(/==+\s*(Referências|Referencias|Trivia|Curiosidades|Navegação|Navigation|Galeria|Gallery|Veja também|Ver também)[\s\S]*$/i, "")
    .trim();
}

function getFirstUsefulParagraph(extract = "") {
  const cleaned = stripSections(extract)
    .replace(/\r/g, "")
    .split(/\n{2,}|\n/)
    .map((item) => cleanWikiText(item))
    .filter(Boolean)
    .filter((item) => item.length >= 45)
    .filter((item) => {
      const lower = item.toLowerCase();
      return !(
        lower.includes("este artigo") ||
        lower.includes("esta página") ||
        lower.includes("para outros usos") ||
        lower.includes("categorias") ||
        lower.includes("predefinição")
      );
    });

  return (cleaned[0] || "").slice(0, 700);
}

function getTemplateField(wikitext, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\|\\s*${escaped}\\s*=\\s*([^\\n|}]+)`, "i");
    const match = String(wikitext || "").match(regex);
    if (match?.[1]) return cleanWikiText(match[1]);
  }

  return "";
}

function includesAny(text, terms) {
  const t = String(text || "").toLowerCase();
  return terms.some((term) => t.includes(term));
}

function detectClassification(text) {
  const t = String(text || "").toLowerCase();

  const map = [
    ["Genjutsu", ["genjutsu", "ilusão", "ilusao"]],
    ["Taijutsu", ["taijutsu", "combate corpo a corpo", "corpo a corpo"]],
    ["Fuinjutsu", ["fūinjutsu", "fuinjutsu", "selamento", "selo", "técnica de selamento", "tecnica de selamento"]],
    ["Senjutsu", ["senjutsu", "arte eremita", "modo sábio", "modo sabio", "sennin"]],
    ["Kenjutsu", ["kenjutsu", "espada"]],
    ["Bukijutsu", ["bukijutsu", "arma", "armas ninja"]],
    ["Dōjutsu", ["dōjutsu", "dojutsu", "sharingan", "byakugan", "rinnegan"]],
    ["Kekkei Genkai", ["kekkei genkai"]],
    ["Kinjutsu", ["kinjutsu", "técnica proibida", "tecnica proibida", "proibida"]],
    ["Ninjutsu", ["ninjutsu"]]
  ];

  for (const [label, terms] of map) {
    if (terms.some((term) => t.includes(term))) return label;
  }

  return "Ninjutsu";
}

function detectNature(text) {
  const t = String(text || "").toLowerCase();

  const map = [
    ["Bakuton", ["explosão", "explosao", "bakuton", "estilo explosão", "estilo explosao", "explosion release"]],
    ["Hyoton", ["gelo", "hyoton", "hyōton", "estilo gelo", "ice release"]],
    ["Mokuton", ["madeira", "mokuton", "estilo madeira", "wood release"]],
    ["Youton", ["lava", "youton", "yōton", "estilo lava", "lava release"]],
    ["Futton", ["vapor", "ebulição", "ebulicao", "futton", "boil release"]],
    ["Shoton", ["cristal", "shōton", "shoton", "estilo cristal"]],
    ["Ranton", ["tempestade", "ranton", "storm release"]],
    ["Jiton", ["magnetismo", "jiton", "magnet release"]],
    ["Jinton", ["pó", "po", "jinton", "dust release", "estilo pó", "estilo po"]],
    ["Shakuton", ["calor", "queimadura", "shakuton", "scorch release"]],
    ["Enton", ["chama", "enton", "blaze release", "chamas negras"]],
    ["Katon", ["fogo", "katon", "estilo fogo", "fire release"]],
    ["Suiton", ["água", "agua", "suiton", "estilo água", "estilo agua", "water release"]],
    ["Raiton", ["raio", "relâmpago", "relampago", "raiton", "lightning release"]],
    ["Doton", ["terra", "doton", "estilo terra", "earth release"]],
    ["Fuuton", ["vento", "fuuton", "fūton", "wind release"]],
    ["Yin", ["yin", "inton", "liberação de yin", "liberacao de yin"]],
    ["Yang", ["yang", "liberação de yang", "liberacao de yang"]],
    ["Hiden", ["hiden", "técnica secreta", "tecnica secreta"]],
    ["Kekkei Genkai", ["kekkei genkai"]]
  ];

  for (const [label, terms] of map) {
    if (terms.some((term) => t.includes(term))) return label;
  }

  return "";
}

function wikiRankFromText(text) {
  const t = String(text || "").toUpperCase();

  if (/\bS[-\s]?RANK\b|\bRANK\s*S\b|\bRANK\s*S\b/.test(t)) return "S";
  if (/\bA[-\s]?RANK\b|\bRANK\s*A\b/.test(t)) return "A";
  if (/\bB[-\s]?RANK\b|\bRANK\s*B\b/.test(t)) return "B";
  if (/\bC[-\s]?RANK\b|\bRANK\s*C\b/.test(t)) return "C";
  if (/\bD[-\s]?RANK\b|\bRANK\s*D\b/.test(t)) return "D";
  if (/\bE[-\s]?RANK\b|\bRANK\s*E\b/.test(t)) return "E";

  const pt = String(text || "").toLowerCase();
  if (pt.includes("rank s")) return "S";
  if (pt.includes("rank a")) return "A";
  if (pt.includes("rank b")) return "B";
  if (pt.includes("rank c")) return "C";
  if (pt.includes("rank d")) return "D";
  if (pt.includes("rank e")) return "E";

  return "";
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

function estimateAnced({ title, summary, wikitext, classification, nature, wikiRank, usersText }) {
  const text = `${title} ${summary} ${wikitext} ${classification} ${nature} ${usersText}`.toLowerCase();

  let range = ["Curto alcance", 20];
  if (includesAny(text, ["longo alcance", "long-range", "long range", "grande distância", "grande distancia"])) {
    range = ["Longo alcance", 38];
  } else if (includesAny(text, ["médio alcance", "medio alcance", "mid-range", "medium range"])) {
    range = ["Médio alcance", 26];
  } else if (includesAny(text, ["corpo a corpo", "close-range", "close combat"]) || classification === "Taijutsu") {
    range = ["Corpo a corpo", 8];
  } else if (includesAny(text, ["grande área", "grande area", "wide area", "large area", "todos os alvos", "campo inteiro"])) {
    range = ["Todos os alcances", 44];
  }

  let users = ["1 usuário", 42];
  const usersLower = String(usersText || "").toLowerCase();
  if (includesAny(usersLower, ["vários", "varios", "diversos", "múltiplos", "multiplos", "exército", "exercito"])) {
    users = ["6+ usuários", 4];
  } else if (usersLower.split(",").length >= 3) {
    users = ["3–4 usuários", 24];
  } else if (usersLower.split(",").length === 2) {
    users = ["2 usuários", 34];
  }

  let classType = ["Ofensiva", 18];
  if (classification === "Fuinjutsu" || includesAny(text, ["selamento", "selo", "seal"])) classType = ["Selamento", 32];
  if (includesAny(text, ["barreira", "defesa", "defensiva", "proteger", "protect", "barrier"])) classType = ["Defensiva", 10];
  if (includesAny(text, ["cura", "curar", "médico", "medico", "suporte", "sensor", "heal", "support", "sense", "enhance"])) classType = ["Suporte", 30];
  if (includesAny(text, ["preparação", "preparacao", "requires preparation", "preparation"])) classType = ["Preparação", 46];

  let structure = ["Elemental/Yin", 24];
  if (["Taijutsu", "Bukijutsu", "Kenjutsu"].includes(classification)) {
    structure = ["Taijutsu/Bukijutsu", 6];
  } else if (classification === "Hiden" || nature === "Hiden" || includesAny(text, ["hiden", "yang"])) {
    structure = ["Hiden/Yang", 14];
  } else if (classification === "Kekkei Genkai" || classification === "Dōjutsu" || includesAny(text, ["kekkei genkai", "dōjutsu", "dojutsu"])) {
    structure = ["Não elemental/Kekkei Genkai", 40];
  } else if (classification === "Kinjutsu" || includesAny(text, ["kinjutsu", "proibida", "forbidden"])) {
    structure = ["Kinjutsu/Exclusiva", 48];
  }

  let damage = ["Ferimentos moderados", 22];
  if (["Defensiva", "Suporte", "Selamento"].includes(classType[0]) || includesAny(text, ["ilusão", "ilusao", "genjutsu", "incapacita", "paralisa"])) {
    damage = ["Não causa dano/Incapacitante", 2];
  }
  if (includesAny(text, ["ferimentos leves", "dano leve", "minor", "small wound"])) damage = ["Ferimentos leves", 16];
  if (includesAny(text, ["matar", "morte", "mortal", "fatal", "grave", "severe", "deadly", "kill"])) damage = ["Ferimentos graves/mortais", 34];
  if (includesAny(text, ["destruir", "devastar", "obliterar", "aniquilar", "destroy", "devastate", "obliterate", "annihilate"])) damage = ["Dizimação/obliteração", 50];

  const isHealing = includesAny(text, ["cura", "curar", "medical ninjutsu", "iryo", "iryō"]);
  const usesSenjutsu = includesAny(text, ["senjutsu", "arte eremita", "modo sábio", "modo sabio", "sage"]);
  const isFillerBoruto = includesAny(text, ["boruto"]);

  let total = range[1] + users[1] + classType[1] + structure[1] + damage[1];

  if (isHealing) total += 43;
  if (usesSenjutsu) total += 50;
  if (isFillerBoruto) total += 20;

  let confidence = "baixa";
  if (wikiRank && classification && nature) confidence = "média";
  if (wikiRank && classification && summary.length > 120) confidence = "média";
  if (!summary || summary.length < 80) confidence = "baixa";

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
    rank: ancedRank(total),
    total,
    confidence,
    details
  };
}

function makeRpgEffect({ classification, nature, wikiRank, summary }) {
  const base = cleanWikiText(summary);
  const intro = `${classification || "Técnica"}${nature ? ` de ${nature}` : ""}${wikiRank ? `, associada ao rank ${wikiRank}` : ""}.`;

  if (!base) {
    return `${intro} Efeito RPG pendente de revisão pelo ADM.`;
  }

  return `${intro} Em jogo, deve ser tratada conforme sua descrição oficial e revisada pelo ADM antes de aprovação definitiva.`;
}

async function wikiApi(params) {
  const url = new URL(API);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro Fandom API: ${response.status}`);
  }

  return response.json();
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

async function getPageData(title) {
  const data = await wikiApi({
    action: "query",
    prop: "extracts|revisions",
    explaintext: "1",
    redirects: "1",
    rvprop: "content",
    rvslots: "main",
    titles: title
  });

  const page = Object.values(data.query?.pages || {})[0];

  const extract = page?.extract || "";
  const summary = getFirstUsefulParagraph(extract);
  const wikitext = page?.revisions?.[0]?.slots?.main?.["*"] || page?.revisions?.[0]?.["*"] || "";

  return { summary, wikitext, extract };
}

async function main() {
  console.log(`Preview ShinobiDex PT-BR`);
  console.log(`API: ${API}`);
  console.log(`Categoria: ${CATEGORY}`);
  console.log(`Limit=${LIMIT} | Offset=${OFFSET}`);

  const pages = await getJutsuPages();
  const records = [];
  const errors = [];

  for (const [index, page] of pages.entries()) {
    const title = page.title;
    const sourceUrl = `https://naruto.fandom.com/pt-br/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;

    try {
      const { summary, wikitext } = await getPageData(title);
      const sourceText = `${wikitext} ${summary}`;

      const classification =
        cleanWikiText(getTemplateField(wikitext, [
          "classificação",
          "classificacao",
          "classification",
          "Classification"
        ])) || detectClassification(sourceText);

      const nature =
        cleanWikiText(getTemplateField(wikitext, [
          "natureza",
          "elemento",
          "nature",
          "Nature",
          "nature type"
        ])) || detectNature(sourceText);

      const wikiRank =
        cleanWikiText(getTemplateField(wikitext, ["rank", "Rank"])) ||
        wikiRankFromText(sourceText);

      const usersText =
        cleanWikiText(getTemplateField(wikitext, [
          "usuários",
          "usuarios",
          "usuário",
          "usuario",
          "users",
          "Users",
          "user",
          "User"
        ])).slice(0, 300);

      const anced = estimateAnced({
        title,
        summary,
        wikitext,
        classification,
        nature,
        wikiRank,
        usersText
      });

      const record = {
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
        users_text: usersText,
        summary,
        rpg_effect: makeRpgEffect({ classification, nature, wikiRank, summary }),
        requirements: "",
        limitations: "",
        source_name: "Wiki Naruto PT-BR",
        source_url: sourceUrl,
        source_url_pt: sourceUrl,
        source_license: "CC BY-SA 3.0",
        source_status: "preview_import",
        status: "needs_review",
        import_notes: [
          !summary ? "SEM_DESCRICAO" : "",
          !nature ? "SEM_NATUREZA" : "",
          !wikiRank ? "SEM_RANK_WIKI" : "",
          anced.confidence === "baixa" ? "ANCED_BAIXA_CONFIANCA" : ""
        ].filter(Boolean)
      };

      records.push(record);

      console.log(
        `[${index + 1}/${pages.length}] OK: ${title} | ${record.classification || "-"} | ${record.nature || "-"} | ${record.anced_rank} (${record.anced_total}) | ${record.summary ? "com descrição" : "sem descrição"}`
      );
    } catch (error) {
      errors.push({ title, error: error.message });
      console.error(`[${index + 1}/${pages.length}] ERRO: ${title}: ${error.message}`);
    }

    await sleep(350);
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
