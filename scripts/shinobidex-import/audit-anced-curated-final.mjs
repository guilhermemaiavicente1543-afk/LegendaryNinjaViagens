import fs from "node:fs";

const file = process.argv[2] || "tmp/anced-curation/anced-wiki-curated-all-final-1925.json";
const rows = JSON.parse(fs.readFileSync(file, "utf8"));

const byRank = {};
const byStatus = {};
const review = [];
for (const item of rows) {
  byRank[item.rank] = (byRank[item.rank] || 0) + 1;
  byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  if (item.needs_review || String(item.status || "").includes("revisar")) review.push(item);
}

console.log("Total:", rows.length);
console.log("Ranks:", byRank);
console.log("Status:", byStatus);
console.log("Revisão:", review.length);
console.log("\nPrimeiros itens para revisão:");
for (const item of review.slice(0, 80)) {
  console.log(`- ${item.source_index}. ${item.name} | ${item.rank}/${item.total} | ${item.status}`);
}
