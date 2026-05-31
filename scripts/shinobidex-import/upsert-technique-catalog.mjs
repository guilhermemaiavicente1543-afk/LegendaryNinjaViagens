import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));

const getArg = (name, fallback = "") => {
  const found = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return found ? found.split("=").slice(1).join("=") : fallback;
};

const INPUT = getArg(
  "--input",
  "tmp/shinobidex-import/scrape-preview-ptbr-techniques.json"
);

const LIMIT = Number(getArg("--limit", "0"));
const START = Number(getArg("--start", "0"));
const STATUS = getArg("--status", "needs_review");

const COMMIT = args.has("--commit");
const OVERWRITE_APPROVED = args.has("--overwrite-approved");

const DISABLED_FIELDS = new Set();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.production");

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Erro: SUPABASE_URL/VITE_SUPABASE_URL e uma chave Supabase precisam estar no .env.");
  console.error("Recomendado para importação: SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
  console.warn("Aviso: você não parece estar usando service role key. Se o RLS bloquear, use SUPABASE_SERVICE_ROLE_KEY.");
}

function apiUrl(endpoint, query = "") {
  const base = SUPABASE_URL.replace(/\/$/, "");
  return `${base}/rest/v1/${endpoint}${query ? `?${query}` : ""}`;
}

async function supabaseRequest(endpoint, options = {}, query = "") {
  const response = await fetch(apiUrl(endpoint, query), {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      body?.message ||
      body?.hint ||
      body?.details ||
      text ||
      `HTTP ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

function extractMissingColumn(error) {
  const message = String(error?.message || "");

  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column "([^"]+)" does not exist/i,
    /record "new" has no field "([^"]+)"/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

async function writeWithColumnFallback(endpoint, options, query, payload) {
  let currentPayload = { ...payload };

  while (true) {
    try {
      return await supabaseRequest(
        endpoint,
        {
          ...options,
          body: JSON.stringify(currentPayload)
        },
        query
      );
    } catch (error) {
      const missingColumn = extractMissingColumn(error);

      if (missingColumn && currentPayload[missingColumn] !== undefined) {
        console.warn(`Campo inexistente no banco detectado: ${missingColumn}. Removendo e tentando novamente.`);
        DISABLED_FIELDS.add(missingColumn);
        delete currentPayload[missingColumn];
        continue;
      }

      throw error;
    }
  }
}

async function findExisting(record) {
  const checks = [
    ["source_url_pt", record.source_url_pt],
    ["source_url", record.source_url],
    ["name", record.name],
    ["name_pt", record.name_pt]
  ].filter(([, value]) => value);

  for (const [field, value] of checks) {
    if (DISABLED_FIELDS.has(field)) continue;

    const query = [
      "select=id,name,name_pt,status,source_url,source_url_pt,updated_at",
      `${field}=eq.${encodeURIComponent(value)}`,
      "limit=1"
    ].join("&");

    try {
      const rows = await supabaseRequest("technique_catalog", { method: "GET" }, query);

      if (Array.isArray(rows) && rows[0]) {
        return rows[0];
      }
    } catch (error) {
      const missingColumn = extractMissingColumn(error);

      if (missingColumn) {
        DISABLED_FIELDS.add(missingColumn);
        continue;
      }

      throw error;
    }
  }

  return null;
}

function buildAncedDetails(record) {
  const parts = [];

  if (record.anced_details) {
    parts.push(record.anced_details);
  }

  const notes = record.import_notes || [];

  if (notes.length) {
    parts.push(`Notas do importador: ${notes.join(", ")}`);
  }

  if (record.source_url_pt || record.source_url) {
    parts.push(`Fonte PT-BR: ${record.source_url_pt || record.source_url}`);
  }

  return parts.join("\n");
}

function buildPayload(record) {
  const payload = {
    name: record.name || record.name_pt || "",
    original_name: record.original_name || "",
    english_name: record.english_name || "",
    wiki_rank: record.wiki_rank || "",
    anced_rank: record.anced_rank || "",
    anced_total: Number(record.anced_total || 0),
    anced_confidence: record.anced_confidence || "baixa",
    anced_details: buildAncedDetails(record),
    classification: record.classification || "",
    nature: record.nature || "",
    technique_type: record.technique_type || "",
    users_text: record.users_text || "",
    summary: record.summary || "",
    rpg_effect: record.rpg_effect || "",
    requirements: record.requirements || "",
    limitations: record.limitations || "",
    status: STATUS,
    updated_at: new Date().toISOString(),

    // Campos usados pela ShinobiDex pública/enriquecimento multilíngue, caso existam no banco.
    name_pt: record.name_pt || record.name || "",
    source_url: record.source_url || record.source_url_pt || "",
    source_url_pt: record.source_url_pt || record.source_url || "",
    source_status: "scraped_needs_review"
  };

  for (const field of DISABLED_FIELDS) {
    delete payload[field];
  }

  return payload;
}

function summarizeRecord(record) {
  const notes = record.import_notes?.length
    ? ` | notas: ${record.import_notes.join(", ")}`
    : "";

  return `${record.name} | ${record.anced_rank || "-"} ${record.anced_total || 0} | ${record.anced_confidence || "-"}${notes}`;
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Arquivo não encontrado: ${INPUT}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const allRecords = data.records || [];
  const records = LIMIT > 0
    ? allRecords.slice(START, START + LIMIT)
    : allRecords.slice(START);

  const stats = {
    total: records.length,
    insert: 0,
    update: 0,
    skipApproved: 0,
    errors: 0
  };

  console.log("IMPORTADOR SEGURO SHINOBIDEX");
  console.log("Input:", INPUT);
  console.log("Registros no arquivo:", allRecords.length);
  console.log("Registros nesta execução:", records.length);
  console.log("Status aplicado:", STATUS);
  console.log("Modo:", COMMIT ? "COMMIT / grava no Supabase" : "DRY-RUN / não grava nada");
  console.log("Overwrite approved:", OVERWRITE_APPROVED ? "sim" : "não");
  console.log();

  for (const [index, record] of records.entries()) {
    try {
      const existing = await findExisting(record);
      const payload = buildPayload(record);

      if (existing?.id && existing.status === "approved" && !OVERWRITE_APPROVED) {
        stats.skipApproved += 1;
        console.log(`[${index + 1}/${records.length}] SKIP APPROVED: ${summarizeRecord(record)}`);
        continue;
      }

      if (!existing?.id) {
        stats.insert += 1;

        if (COMMIT) {
          await writeWithColumnFallback(
            "technique_catalog",
            { method: "POST" },
            "",
            payload
          );
        }

        console.log(`[${index + 1}/${records.length}] ${COMMIT ? "INSERT" : "DRY INSERT"}: ${summarizeRecord(record)}`);
        continue;
      }

      stats.update += 1;

      if (COMMIT) {
        await writeWithColumnFallback(
          "technique_catalog",
          { method: "PATCH" },
          `id=eq.${encodeURIComponent(existing.id)}`,
          payload
        );
      }

      console.log(`[${index + 1}/${records.length}] ${COMMIT ? "UPDATE" : "DRY UPDATE"}: ${summarizeRecord(record)}`);
    } catch (error) {
      stats.errors += 1;
      console.error(`[${index + 1}/${records.length}] ERRO: ${record.name}: ${error.message}`);
    }
  }

  console.log();
  console.log("RESUMO");
  console.log(`Total: ${stats.total}`);
  console.log(`Inserções: ${stats.insert}`);
  console.log(`Atualizações: ${stats.update}`);
  console.log(`Aprovadas puladas: ${stats.skipApproved}`);
  console.log(`Erros: ${stats.errors}`);

  if (!COMMIT) {
    console.log();
    console.log("Nada foi gravado. Para gravar de verdade, rode novamente com --commit.");
  }

  if (DISABLED_FIELDS.size) {
    console.log();
    console.log("Campos ignorados por inexistência no banco:", [...DISABLED_FIELDS].join(", "));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
