import fs from "node:fs";
import path from "node:path";

const INPUTS = [
  "tmp/anced-curation/anced-wiki-curated-001-completo-500-USERS-REVISADOS.json",
  "tmp/anced-curation/anced-wiki-curated-002-completo-500-USERS-REVISADOS.json",
  "tmp/anced-curation/anced-wiki-curated-003-completo-500.json",
  "tmp/anced-curation/anced-wiki-curated-004-completo-425.json",
];

const OUT_JSON = "tmp/anced-curation/anced-wiki-curated-all-final-1925.json";
const OUT_MD = "tmp/anced-curation/anced-wiki-curated-all-final-1925-resumo.md";

function arr(x) {
  return Array.isArray(x) ? x : x ? [x] : [];
}

function text(x) {
  return x == null ? "" : String(x);
}

function statusNeedsReview(status) {
  const s = text(status).toLowerCase();
  return s.includes("revisar") || s.includes("review");
}

function normalize(item, inputFile) {
  const sourceIndex = item.source_index ?? item.index ?? null;
  const batch = item.batch || inputFile.match(/wiki-rank-\d+/)?.[0] || "wiki-rank-unknown";
  const url = item.url || item.source_url || "";
  const bonusPontos = Number(item.bonus_pontos ?? item.bonus ?? 0) || 0;
  const bonusItens = arr(item.bonus_itens || item.bonus).filter((x) => typeof x !== "number");
  const flags = [...arr(item.flags), ...arr(item.review_reasons)].filter(Boolean);
  const details = item.details || [
    item.alcance ? `${item.alcance}: +${item.alcance_pontos}` : null,
    item.usuarios || item.usuarios_categoria ? `${item.usuarios || item.usuarios_categoria}: +${item.usuarios_pontos}` : null,
    item.classe ? `${item.classe}: +${item.classe_pontos}` : null,
    item.estrutura ? `${item.estrutura}: +${item.estrutura_pontos}` : null,
    item.danos ? `${item.danos}: +${item.danos_pontos}` : null,
    bonusPontos ? `Bônus: +${bonusPontos}` : null,
  ].filter(Boolean).join(" | ");

  const normalized = {
    technique_id: item.technique_id,
    name: item.name,
    source_index: sourceIndex,
    batch,
    url,
    rank: item.rank,
    total: Number(item.total),
    status: item.status || "curado_preliminar",
    needs_review: statusNeedsReview(item.status),
    details,
    anced: {
      alcance: item.alcance,
      alcance_pontos: Number(item.alcance_pontos ?? 0),
      alcance_motivo: item.alcance_motivo || "",
      usuarios: item.usuarios || item.usuarios_categoria || "",
      usuarios_pontos: Number(item.usuarios_pontos ?? 0),
      usuarios_validos: arr(item.usuarios_validos),
      usuarios_descartados: arr(item.usuarios_descartados),
      classe: item.classe,
      classe_pontos: Number(item.classe_pontos ?? 0),
      classe_motivo: item.classe_motivo || "",
      estrutura: item.estrutura,
      estrutura_pontos: Number(item.estrutura_pontos ?? 0),
      estrutura_motivo: item.estrutura_motivo || "",
      danos: item.danos,
      danos_pontos: Number(item.danos_pontos ?? 0),
      danos_motivo: item.danos_motivo || "",
      bonus_pontos: bonusPontos,
      bonus_itens: bonusItens,
      total: Number(item.total),
      rank: item.rank,
    },
    flags,
    justificativa: item.justificativa || "",
    evidence: item.evidence || item.evidencia_bruta || {},
    raw: item,
  };

  return normalized;
}

fs.mkdirSync("tmp/anced-curation", { recursive: true });

const all = [];
for (const file of INPUTS) {
  if (!fs.existsSync(file)) {
    console.error("Arquivo não encontrado:", file);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(data)) {
    console.error("Arquivo não é lista JSON:", file);
    process.exit(1);
  }
  all.push(...data.map((item) => normalize(item, file)));
}

const ids = new Map();
const duplicates = [];
const missingId = [];
const missingRank = [];
const invalidTotal = [];

for (const item of all) {
  if (!item.technique_id) missingId.push(item.name);
  if (!item.rank) missingRank.push(item.name);
  if (!Number.isFinite(item.total)) invalidTotal.push(item.name);
  if (item.technique_id) {
    if (ids.has(item.technique_id)) duplicates.push([item.technique_id, ids.get(item.technique_id), item.name]);
    else ids.set(item.technique_id, item.name);
  }
}

const byRank = {};
const byStatus = {};
for (const item of all) {
  byRank[item.rank] = (byRank[item.rank] || 0) + 1;
  byStatus[item.status] = (byStatus[item.status] || 0) + 1;
}

const errors = [];
if (all.length !== 1925) errors.push(`Total esperado 1925, recebido ${all.length}.`);
if (duplicates.length) errors.push(`IDs duplicados: ${duplicates.length}.`);
if (missingId.length) errors.push(`Sem technique_id: ${missingId.length}.`);
if (missingRank.length) errors.push(`Sem rank: ${missingRank.length}.`);
if (invalidTotal.length) errors.push(`Total inválido: ${invalidTotal.length}.`);

const sorted = all.sort((a, b) => (a.source_index ?? 0) - (b.source_index ?? 0));
fs.writeFileSync(OUT_JSON, JSON.stringify(sorted, null, 2));

let md = `# ANCED curado final — 1925 técnicas\n\n`;
md += `Arquivos usados:\n` + INPUTS.map((f) => `- ${f}`).join("\n") + `\n\n`;
md += `Total consolidado: ${all.length}\n\n`;
md += `## Ranks\n\n`;
for (const key of ["SS", "S", "A", "B", "C", "D", "E"]) md += `- ${key}: ${byRank[key] || 0}\n`;
md += `\n## Status\n\n`;
for (const [key, value] of Object.entries(byStatus).sort((a,b)=>b[1]-a[1])) md += `- ${key}: ${value}\n`;
md += `\n## Validação\n\n`;
if (errors.length) {
  md += `ERROS:\n` + errors.map((e) => `- ${e}`).join("\n") + `\n`;
} else {
  md += `OK: sem duplicatas, sem IDs/ranks/totais ausentes e total = 1925.\n`;
}

fs.writeFileSync(OUT_MD, md);

console.log("Consolidado gerado:");
console.log(OUT_JSON);
console.log(OUT_MD);
console.log("Total:", all.length);
console.log("Ranks:", byRank);
console.log("Status:", byStatus);
if (errors.length) {
  console.error("Validação falhou:", errors);
  process.exit(1);
}
