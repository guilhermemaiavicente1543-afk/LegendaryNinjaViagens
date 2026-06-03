import fs from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[match[1]] == null) process.env[match[1]] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [k, v] = arg.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));

const file = String(args.file || "tmp/anced-curation/anced-wiki-curated-all-final-1925.json");
const commit = Boolean(args.commit);
const legacyToo = Boolean(args["legacy-too"] || args.legacyToo);
const batchSize = Number(args.batchSize || 100);

if (!fs.existsSync(file)) {
  console.error("Arquivo não encontrado:", file);
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(rows)) {
  console.error("Arquivo precisa ser uma lista JSON.");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: faltam variáveis Supabase.");
  process.exit(1);
}

function makePatch(item) {
  const patch = {
    anced_curated_rank: item.rank,
    anced_curated_total: item.total,
    anced_curated_details: item.details || "",
    anced_curated_status: item.status || "curado_preliminar",
    anced_curated_batch: item.batch || "",
    anced_curated_payload: item,
    anced_curated_at: new Date().toISOString(),
    anced_needs_review: Boolean(item.needs_review),
  };

  if (legacyToo) {
    patch.anced_rank = item.rank;
    patch.anced_details = item.details || "";
  }

  return patch;
}

const missingIds = rows.filter((x) => !x.technique_id);
if (missingIds.length) {
  console.error("Há itens sem technique_id:", missingIds.slice(0, 10).map((x) => x.name));
  process.exit(1);
}

console.log("Modo:", commit ? "COMMIT" : "DRY-RUN");
console.log("Arquivo:", file);
console.log("Itens:", rows.length);
console.log("Atualiza legacy anced_rank/anced_details:", legacyToo ? "SIM" : "não");
console.log("");

const sample = rows.slice(0, 8).map((item) => ({
  id: item.technique_id,
  name: item.name,
  rank: item.rank,
  total: item.total,
  status: item.status,
  details: item.details,
}));
console.log("Amostra:");
console.log(JSON.stringify(sample, null, 2));

if (!commit) {
  console.log("\nNada foi gravado.");
  console.log("Para gravar nas colunas anced_curated_*:");
  console.log(`node scripts/shinobidex-import/apply-anced-curated-final.mjs --file=${file} --commit`);
  console.log("\nPara também sobrescrever anced_rank/anced_details antigos, use --legacy-too, mas só depois de revisar.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

let ok = 0;
let errors = 0;

for (let i = 0; i < rows.length; i += batchSize) {
  const group = rows.slice(i, i + batchSize);

  for (const item of group) {
    const { error } = await supabase
      .from("technique_catalog")
      .update(makePatch(item))
      .eq("id", item.technique_id);

    if (error) {
      errors++;
      console.error("Erro:", item.name, item.technique_id, error.message);
    } else {
      ok++;
    }
  }

  console.log(`Progresso: ${ok}/${rows.length} ok, ${errors} erros`);
}

console.log("Resultado:", { ok, errors });
if (errors) process.exit(1);
