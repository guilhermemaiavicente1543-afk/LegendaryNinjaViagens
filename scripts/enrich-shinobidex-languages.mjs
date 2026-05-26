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

const PT_API = "https://naruto.fandom.com/pt-br/api.php";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="));

const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 100;
const OFFSET = offsetArg ? Number(offsetArg.split("=")[1]) : 0;

function decodeTitleFromSourceUrl(sourceUrl = "") {
  const marker = "/wiki/";
  const index = sourceUrl.indexOf(marker);

  if (index === -1) return "";

  const raw = sourceUrl.slice(index + marker.length);

  return decodeURIComponent(raw).replaceAll("_", " ");
}

async function mediaWikiApi(params) {
  const url = new URL(PT_API);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro MediaWiki API: ${response.status}`);
  }

  return response.json();
}

async function getLangLinks(title) {
  const data = await mediaWikiApi({
    action: "query",
    prop: "langlinks",
    titles: title,
    lllimit: "max",
    llprop: "url"
  });

  const page = Object.values(data.query?.pages || {})[0];
  const links = page?.langlinks || [];

  const result = {
    en: null,
    es: null,
    fr: null
  };

  for (const link of links) {
    if (["en", "es", "fr"].includes(link.lang)) {
      result[link.lang] = {
        title: link["*"],
        url: link.url || ""
      };
    }
  }

  return result;
}

async function getRows() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/technique_catalog?select=id,name,source_url,name_en,name_es,name_fr,translation_status&source_url=like.https://naruto.fandom.com/pt-br/wiki/*&order=name.asc&offset=${OFFSET}&limit=${LIMIT}`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro Supabase SELECT ${response.status}: ${text}`);
  }

  return response.json();
}

async function updateRow(id, payload) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/technique_catalog?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro Supabase UPDATE ${response.status}: ${text}`);
  }
}

async function main() {
  console.log(`Buscando traduções EN/ES/FR via langlinks. Offset=${OFFSET}, limit=${LIMIT}`);

  const rows = await getRows();

  for (const [index, row] of rows.entries()) {
    const title = decodeTitleFromSourceUrl(row.source_url) || row.name;

    try {
      const links = await getLangLinks(title);

      const payload = {
        name_pt: row.name,
        source_url_pt: row.source_url,
        name_en: links.en?.title || row.name_en || null,
        name_es: links.es?.title || row.name_es || null,
        name_fr: links.fr?.title || row.name_fr || null,
        source_url_en: links.en?.url || null,
        source_url_es: links.es?.url || null,
        source_url_fr: links.fr?.url || null,
        translation_status:
          links.en || links.es || links.fr ? "langlinks_found" : "needs_manual_review",
        translation_checked_at: new Date().toISOString()
      };

      await updateRow(row.id, payload);

      console.log(
        `[${index + 1}/${rows.length}] ${row.name} → EN: ${payload.name_en || "-"} | ES: ${payload.name_es || "-"} | FR: ${payload.name_fr || "-"}`
      );
    } catch (error) {
      console.error(`[${index + 1}/${rows.length}] ERRO: ${row.name}`);
      console.error(error.message);

      await updateRow(row.id, {
        translation_status: "translation_error",
        translation_checked_at: new Date().toISOString()
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log("Busca de traduções concluída.");
}

main();
