import fs from "node:fs";

const inputArg = process.argv.find((arg) => arg.startsWith("--input="));
const INPUT = inputArg
  ? inputArg.split("=").slice(1).join("=")
  : "tmp/shinobidex-import/scrape-preview-ptbr-techniques.json";

function countBy(items, getter) {
  const map = new Map();

  for (const item of items) {
    const key = getter(item) || "-";
    map.set(key, (map.get(key) || 0) + 1);
  }

  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function printCounter(title, entries, limit = 30) {
  console.log(`\n${title}:`);
  for (const [key, value] of entries.slice(0, limit)) {
    console.log(`- ${key}: ${value}`);
  }
}

const data = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const records = data.records || [];

const notes = [];
for (const item of records) {
  for (const note of item.import_notes || []) {
    notes.push(note);
  }
}

console.log("RELATÓRIO SHINOBIDEX PREVIEW");
console.log("Arquivo:", INPUT);
console.log("Gerado em:", data.generated_at || "-");
console.log("Total:", records.length);
console.log("Erros:", data.total_errors || 0);

printCounter(
  "Descrições",
  countBy(records, (item) => {
    if (!item.summary) return "sem descrição";
    if ((item.import_notes || []).includes("DESCRICAO_GERADA_FALLBACK")) return "fallback";
    return "descrição wiki";
  })
);

printCounter("Rank ANCED", countBy(records, (item) => item.anced_rank));
printCounter("Confiança ANCED", countBy(records, (item) => item.anced_confidence));
printCounter("Notas", countBy(notes, (note) => note));
printCounter("Classificações", countBy(records, (item) => item.classification));
printCounter("Naturezas", countBy(records, (item) => item.nature));
printCounter("Tipos", countBy(records, (item) => item.technique_type));
printCounter("Alcances", countBy(records, (item) => item.raw_range));

console.log("\nREVISÃO PRIORITÁRIA:");
for (const item of records) {
  const itemNotes = item.import_notes || [];

  if (
    itemNotes.includes("REVISAO_PRIORITARIA") ||
    itemNotes.includes("ANCED_ALTO_SEM_RANK_WIKI") ||
    itemNotes.includes("DESCRICAO_GERADA_FALLBACK")
  ) {
    console.log("=".repeat(80));
    console.log(item.name);
    console.log("ANCED:", item.anced_rank, item.anced_total, item.anced_confidence);
    console.log("Classificação:", item.classification || "-");
    console.log("Natureza:", item.nature || "-");
    console.log("Tipo:", item.technique_type || "-");
    console.log("Alcance:", item.raw_range || "-");
    console.log("Detalhes:", item.anced_details || "-");
    console.log("Notas:", itemNotes.join(", ") || "-");
    console.log("Resumo:", (item.summary || "").slice(0, 260));
  }
}
