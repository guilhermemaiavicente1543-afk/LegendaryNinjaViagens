import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";
import { filterAncedUsers } from "../../src/lib/anced/ancedUsers.js";

const API_URL = "https://naruto.fandom.com/pt-br/api.php";

const JUNK_SELECTOR = [
  ".portable-infobox",
  ".toc",
  ".navbox",
  ".reflist",
  ".references",
  "sup.reference",
  ".mw-editsection",
  "script",
  "style",
  ".quote",
  ".thumb",
  "table",
  ".mbox",
  ".ambox",
  ".hatnote",
  "aside",
  ".navigation-not-searchable",
].join(",");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function stripAccents(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeKey(value = "") {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wikiTitleToUrl(title) {
  return `https://naruto.fandom.com/pt-br/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

async function fetchWikiParse(title) {
  const url = new URL(API_URL);

  url.searchParams.set("action", "parse");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("prop", "text|displaytitle|categories|properties");
  url.searchParams.set("page", title);

  const response = await fetch(url, {
    headers: {
      "user-agent": "LN-Digital-ShinobiDex-V2/1.0",
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao buscar ${title}`);
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(`${json.error.code}: ${json.error.info}`);
  }

  return {
    title: json.parse?.title || title,
    displayTitle: json.parse?.displaytitle || title,
    html: json.parse?.text?.["*"] || "",
    raw: json,
  };
}

function cleanText(value = "") {
  return String(value)
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractInfobox($) {
  const infobox = $(".portable-infobox").first();
  const fields = {};
  const rawFields = [];

  if (!infobox.length) {
    return { fields, rawFields };
  }

  infobox.find("[data-source], div[class*=pi-item]").each((_, element) => {
    const row = $(element);

    const dataSource = row.attr("data-source") || "";
    const label =
      row.find(".pi-data-label").first().text().trim() ||
      row.find("h3[class*=pi-data-label]").first().text().trim() ||
      dataSource;

    const valueNode = row.find(".pi-data-value").first();
    const valueText = cleanText(valueNode.text());

    if (!label || !valueText) return;

    const key = normalizeKey(dataSource || label);

    fields[key] = valueText;

    rawFields.push({
      key,
      dataSource,
      label,
      value: valueText,
      html: valueNode.html() || "",
    });
  });

  return { fields, rawFields };
}

function getField(fields, keys) {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (fields[normalized]) return fields[normalized];
  }

  return "";
}

function splitUsersText(text = "") {
  return cleanText(text)
    .replace(/\s+e\s+/gi, ", ")
    .split(/[,;|•]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractUsersFromRawFields(rawFields = []) {
  const userField = rawFields.find((field) => {
    const joined = normalizeKey(`${field.key} ${field.dataSource} ${field.label}`);
    return joined.includes("usuario") || joined.includes("usuarios") || joined.includes("users");
  });

  if (!userField) return [];

  const $ = cheerio.load(`<div>${userField.html || ""}</div>`);

  const candidates = [];

  $("a").each((_, link) => {
    const name = cleanText($(link).text());
    if (!name) return;

    let label = "";

    const parentText = cleanText($(link).parent().text());
    const localMatch = parentText.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(([^)]*)\\)`));

    if (localMatch) {
      label = localMatch[1].trim();
    }

    candidates.push({
      name,
      label,
      raw: label ? `${name} (${label})` : name,
    });
  });

  if (candidates.length > 0) {
    return candidates;
  }

  return splitUsersText(userField.value);
}

function extractDescription($) {
  const content = $("#mw-content-text").first();

  if (!content.length) return "";

  const clone = cheerio.load(content.html() || "");
  clone(JUNK_SELECTOR).remove();

  const paragraphs = [];

  clone("p").each((_, element) => {
    const text = cleanText(clone(element).text());

    if (text.length < 40) return;
    if (/este artigo|esta página|para outros usos|predefinição/i.test(text)) return;

    paragraphs.push(text);
  });

  return paragraphs.slice(0, 3).join("\n\n");
}

function detectMediaFlags(fields, rawFields) {
  const debut = getField(fields, [
    "estreia",
    "debut",
    "primeira aparição",
    "primeira aparicao",
  ]);

  const allText = normalizeKey(`${debut} ${rawFields.map((field) => field.value).join(" ")}`);

  return {
    hasAnime: allText.includes("anime"),
    hasManga: allText.includes("manga"),
    hasGame: allText.includes("game") || allText.includes("jogo"),
    hasNovel: allText.includes("novel") || allText.includes("romance"),
    hasMovie: allText.includes("filme") || allText.includes("movie"),
    isGameOnly:
      (allText.includes("game") || allText.includes("jogo")) &&
      !allText.includes("anime") &&
      !allText.includes("manga") &&
      !allText.includes("novel") &&
      !allText.includes("romance") &&
      !allText.includes("filme"),
    isKonbijutsu:
      allText.includes("konbijutsu") ||
      allText.includes("cooperacao") ||
      allText.includes("cooperação"),
  };
}

function buildPreview({ title, displayTitle, html, raw }) {
  const $ = cheerio.load(html);

  const { fields, rawFields } = extractInfobox($);

  const rawUsers = extractUsersFromRawFields(rawFields);
  const usersForAnced = filterAncedUsers(rawUsers);

  const preview = {
    name: cleanText(displayTitle.replace(/<[^>]+>/g, "")) || title,
    title,
    source_url: wikiTitleToUrl(title),

    description: extractDescription($),

    raw: {
      classification: getField(fields, [
        "classificação",
        "classificacao",
        "classification",
      ]),
      nature: getField(fields, [
        "natureza de transformação",
        "natureza de transformacao",
        "natureza",
        "elemento",
        "nature type",
        "nature",
      ]),
      type: getField(fields, ["tipo", "type", "classe"]),
      range: getField(fields, ["alcance", "range"]),
      rank: getField(fields, ["rank"]),
      users_text: rawUsers.map((user) => {
        if (typeof user === "string") return user;
        return user.label ? `${user.name} (${user.label})` : user.name;
      }).join(", "),
      users_labeled: rawUsers,
      infobox_fields: fields,
      infobox_raw_fields: rawFields,
      media: detectMediaFlags(fields, rawFields),
    },

    ancedUsers: usersForAnced,

    meta: {
      scraper_version: "shinobidex-v2-preview-001",
      scraped_at: new Date().toISOString(),
      parse_pageid: raw.parse?.pageid || null,
    },
  };

  return preview;
}

async function main() {
  const title = getArg("title") || process.argv.slice(2).join(" ").trim();

  if (!title) {
    console.error("Uso: node scripts/shinobidex-v2/preview-technique-v2.mjs --title=\"Chidori\"");
    process.exit(1);
  }

  const page = await fetchWikiParse(title);
  const preview = buildPreview(page);

  const outDir = path.resolve("tmp/shinobidex-v2");
  fs.mkdirSync(outDir, { recursive: true });

  const safeName = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  const outFile = path.join(outDir, `preview-${safeName || "technique"}.json`);

  fs.writeFileSync(outFile, JSON.stringify(preview, null, 2));

  console.log(JSON.stringify({
    name: preview.name,
    source_url: preview.source_url,
    classification: preview.raw.classification,
    nature: preview.raw.nature,
    type: preview.raw.type,
    range: preview.raw.range,
    rank: preview.raw.rank,
    raw_users_text: preview.raw.users_text,
    valid_users_count: preview.ancedUsers.count,
    valid_users: preview.ancedUsers.validUsers,
    users_points: preview.ancedUsers.usersPoints,
    users_label: preview.ancedUsers.usersLabel,
    description_preview: preview.description.slice(0, 300),
    outFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
