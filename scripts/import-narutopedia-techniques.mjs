import fs from "node:fs";

const envPath = ".env.import";

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;

    const [key, ...rest] = clean.split("=");
    process.env[key] = rest.join("=");
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.import");
  process.exit(1);
}

const API = "https://naruto.fandom.com/pt-br/api.php";
const CATEGORY = "Categoria:Jutsu";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="));

const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 50;
const OFFSET = offsetArg ? Number(offsetArg.split("=")[1]) : 0;
const SKIP_EXISTING = process.argv.includes("--skip-existing");

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
    .replace(/\{\{.*?\}\}/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/<.*?>/g, "")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getTemplateField(wikitext, names) {
  for (const name of names) {
    const regex = new RegExp(`\\\\|\\\\s*${name}\\\\s*=\\\\s*([^\\\\n|}]+)`, "i");
    const match = wikitext.match(regex);
    if (match?.[1]) return cleanWikiText(match[1]);
  }

  return "";
}

function detectNature(text) {
  const t = text.toLowerCase();

  const map = [
    ["Katon", ["fire release", "katon", "fire"]],
    ["Suiton", ["water release", "suiton", "water"]],
    ["Raiton", ["lightning release", "raiton", "lightning"]],
    ["Doton", ["earth release", "doton", "earth"]],
    ["Fuuton", ["wind release", "fūton", "fuuton", "wind"]],
    ["Mokuton", ["wood release", "mokuton", "wood"]],
    ["Hyoton", ["ice release", "hyōton", "hyoton", "ice"]],
    ["Youton", ["lava release", "yōton", "youton", "lava"]],
    ["Futton", ["boil release", "futton", "boil"]],
    ["Bakuton", ["explosion release", "bakuton", "explosion"]],
    ["Jiton", ["magnet release", "jiton", "magnet"]],
    ["Enton", ["blaze release", "enton", "blaze"]],
    ["Yin", ["yin release"]],
    ["Yang", ["yang release"]]
  ];

  for (const [label, terms] of map) {
    if (terms.some((term) => t.includes(term))) return label;
  }

  return "";
}

function detectClassification(text) {
  const t = text.toLowerCase();

  const map = [
    ["Genjutsu", ["genjutsu"]],
    ["Taijutsu", ["taijutsu"]],
    ["Fuinjutsu", ["fūinjutsu", "fuinjutsu", "sealing technique", "seal"]],
    ["Senjutsu", ["senjutsu", "sage technique"]],
    ["Kenjutsu", ["kenjutsu"]],
    ["Bukijutsu", ["bukijutsu"]],
    ["Dōjutsu", ["dōjutsu", "dojutsu", "sharingan", "byakugan", "rinnegan"]],
    ["Kekkei Genkai", ["kekkei genkai"]],
    ["Kinjutsu", ["kinjutsu", "forbidden technique"]],
    ["Ninjutsu", ["ninjutsu"]]
  ];

  for (const [label, terms] of map) {
    if (terms.some((term) => t.includes(term))) return label;
  }

  return "Ninjutsu";
}

function wikiRankFromText(text) {
  const t = text.toUpperCase();

  if (/\bS-RANK\b|\bS RANK\b|\bS\b/.test(t) && t.includes("RANK")) return "S";
  if (/\bA-RANK\b|\bA RANK\b/.test(t)) return "A";
  if (/\bB-RANK\b|\bB RANK\b/.test(t)) return "B";
  if (/\bC-RANK\b|\bC RANK\b/.test(t)) return "C";
  if (/\bD-RANK\b|\bD RANK\b/.test(t)) return "D";
  if (/\bE-RANK\b|\bE RANK\b/.test(t)) return "E";

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

function estimateAnced({ title, summary, wikitext, classification, nature, wikiRank }) {
  const text = `${title} ${summary} ${wikitext} ${classification} ${nature}`.toLowerCase();

  let range = ["Curto alcance", 20];
  if (text.includes("long-range") || text.includes("long range") || text.includes("great distance")) {
    range = ["Longo alcance", 38];
  } else if (text.includes("mid-range") || text.includes("medium range")) {
    range = ["Médio alcance", 26];
  } else if (text.includes("close-range") || text.includes("close combat") || classification === "Taijutsu") {
    range = ["Corpo a corpo", 8];
  } else if (text.includes("wide area") || text.includes("large area") || text.includes("entire")) {
    range = ["Todos os alcances", 44];
  }

  const users = ["1 usuário", 42];

  let classType = ["Ofensiva", 18];
  if (classification === "Fuinjutsu" || text.includes("seal")) classType = ["Selamento", 32];
  if (text.includes("barrier") || text.includes("defend") || text.includes("protect")) classType = ["Defensiva", 10];
  if (text.includes("heal") || text.includes("support") || text.includes("enhance") || text.includes("sense")) classType = ["Suporte", 30];
  if (text.includes("preparation") || text.includes("requires preparation")) classType = ["Preparação", 46];

  let structure = ["Elemental/Yin", 24];
  if (classification === "Taijutsu" || classification === "Bukijutsu" || classification === "Kenjutsu") {
    structure = ["Taijutsu/Bukijutsu", 6];
  } else if (classification === "Hiden" || text.includes("hiden") || text.includes("yang")) {
    structure = ["Hiden/Yang", 14];
  } else if (classification === "Kekkei Genkai" || classification === "Dōjutsu" || text.includes("kekkei genkai")) {
    structure = ["Não elemental/Kekkei Genkai", 40];
  } else if (classification === "Kinjutsu" || text.includes("forbidden")) {
    structure = ["Kinjutsu/Exclusiva", 48];
  }

  let damage = ["Ferimentos moderados", 22];
  if (classType[0] === "Defensiva" || classType[0] === "Suporte" || text.includes("illusion")) damage = ["Não causa dano/Incapacitante", 2];
  if (text.includes("minor") || text.includes("small wound")) damage = ["Ferimentos leves", 16];
  if (text.includes("kill") || text.includes("deadly") || text.includes("fatal") || text.includes("severe")) damage = ["Ferimentos graves/mortais", 34];
  if (text.includes("destroy") || text.includes("devastate") || text.includes("obliterate") || text.includes("annihilate")) damage = ["Dizimação/obliteração", 50];

  let total = range[1] + users[1] + classType[1] + structure[1] + damage[1];

  const isHealing = text.includes("heal") || text.includes("medical ninjutsu");
  const usesSenjutsu = text.includes("senjutsu") || text.includes("sage");
  const isFillerBoruto = text.includes("boruto");

  if (isHealing) total += 43;
  if (usesSenjutsu) total += 50;
  if (isFillerBoruto) total += 20;

  let confidence = "baixa";
  if (wikiRank && classification && nature) confidence = "média";
  if (wikiRank && classification && summary.length > 80) confidence = "média";

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

async function wikiApi(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
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
    exintro: "1",
    explaintext: "1",
    redirects: "1",
    rvprop: "content",
    rvslots: "main",
    titles: title
  });

  const page = Object.values(data.query?.pages || {})[0];

  const summary = cleanWikiText(page?.extract || "").slice(0, 450);
  const wikitext = page?.revisions?.[0]?.slots?.main?.["*"] || page?.revisions?.[0]?.["*"] || "";

  return { summary, wikitext };
}

async function getExistingSourceUrls() {
  const existing = new Set();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/technique_catalog?select=source_url&source_url=not.is.null&offset=${from}&limit=${pageSize}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro ao buscar técnicas existentes: ${response.status} ${text}`);
    }

    const rows = await response.json();

    for (const row of rows) {
      if (row.source_url) existing.add(row.source_url);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return existing;
}

async function upsertTechnique(record) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/technique_catalog?on_conflict=source_url`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro Supabase ${response.status}: ${text}`);
  }
}

async function main() {
  console.log(`API usada: ${API}`);
  console.log(`Categoria usada: ${CATEGORY}`);

  if (!API.includes("/pt-br/api.php")) {
    throw new Error("Importação bloqueada: API não está apontando para a Wiki Naruto PT-BR.");
  }

  if (CATEGORY !== "Categoria:Jutsu") {
    throw new Error("Importação bloqueada: categoria não está em português.");
  }
  console.log(`Importando até ${LIMIT} técnicas de ${CATEGORY} a partir do offset ${OFFSET}...`);

  const existingSourceUrls = SKIP_EXISTING ? await getExistingSourceUrls() : new Set();

  if (SKIP_EXISTING) {
    console.log(`Modo skip-existing ativo. ${existingSourceUrls.size} técnica(s) já existem no Supabase.`);
  }

  const pages = await getJutsuPages();

  for (const [index, page] of pages.entries()) {
    const title = page.title;
    const sourceUrl = `https://naruto.fandom.com/pt-br/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;

    if (SKIP_EXISTING && existingSourceUrls.has(sourceUrl)) {
      console.log(`[${index + 1}/${pages.length}] PULADO: ${title} já existe.`);
      continue;
    }

    try {
      const { summary, wikitext } = await getPageData(title);

      const infoboxText = `${wikitext} ${summary}`;

      const classification =
        cleanWikiText(getTemplateField(wikitext, ["classification", "Classification"])) ||
        detectClassification(infoboxText);

      const nature =
        cleanWikiText(getTemplateField(wikitext, ["nature", "Nature", "nature type"])) ||
        detectNature(infoboxText);

      const wikiRank =
        cleanWikiText(getTemplateField(wikitext, ["rank", "Rank"])) ||
        wikiRankFromText(infoboxText);

      const usersText =
        cleanWikiText(getTemplateField(wikitext, ["users", "Users", "user", "User"])).slice(0, 300);

      const anced = estimateAnced({
        title,
        summary,
        wikitext,
        classification,
        nature,
        wikiRank
      });

      const record = {
        slug: slugify(title),
        name: title,
        wiki_rank: wikiRank,
        anced_rank: anced.rank,
        anced_total: anced.total,
        anced_confidence: anced.confidence,
        anced_details: anced.details,
        classification,
        nature,
        users_text: usersText,
        summary,
        rpg_effect: "",
        requirements: "",
        limitations: "",
        source_name: "Wiki Naruto PT-BR",
        source_url: sourceUrl,
        source_license: "CC BY-SA 3.0",
        source_status: "imported",
        status: "draft",
        updated_at: new Date().toISOString()
      };

      await upsertTechnique(record);

      console.log(`[${index + 1}/${pages.length}] OK: ${title} → ${anced.rank} (${anced.total})`);
    } catch (error) {
      console.error(`[${index + 1}/${pages.length}] ERRO: ${title}`);
      console.error(error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  console.log("Importação concluída.");
}

main();
