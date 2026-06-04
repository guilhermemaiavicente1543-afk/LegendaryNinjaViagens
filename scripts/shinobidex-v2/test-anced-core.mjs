import { calculateAncedTotal } from "../../src/lib/anced/ancedFormula.js";
import { filterAncedUsers } from "../../src/lib/anced/ancedUsers.js";

const users = [
  "Hidari (Apenas Mangá)",
  "Kakashi Hatake",
  "Sasuke Uchiha",
  "Lâmina das Trevas (Apenas Game)",
  "Utakata (Apenas Anime)",
];

console.log("\n=== TESTE FILTRO DE USUÁRIOS ===");
console.log(JSON.stringify(filterAncedUsers(users), null, 2));

console.log("\n=== TESTE CÁLCULO CHIDORI EXEMPLO ===");
console.log(
  calculateAncedTotal({
    rangePoints: 8,
    usersPoints: 24,
    classPoints: 18,
    structurePoints: 24,
    damagePoints: 34,
  })
);

console.log("\n=== TESTE CÁLCULO COM SENJUTSU ===");
console.log(
  calculateAncedTotal({
    rangePoints: 38,
    usersPoints: 42,
    classPoints: 18,
    structurePoints: 48,
    damagePoints: 34,
    senjutsuBonus: true,
  })
);
