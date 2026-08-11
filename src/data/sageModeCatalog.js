const STYLE_LABELS = {
  ninjutsu: "Ninjutsu",
  genjutsu: "Genjutsu",
  taijutsu: "Taijutsu",
  fuinjutsu: "Fuinjutsu",
  tansakujutsu: "Kanchijutsu",
  iryoninjutsu: "Iryoninjutsu",
  bukijutsu: "Bukijutsu",
};

const mode = (key, name, allowedStyleKeys, unavailableReason = "") => ({
  key,
  name,
  allowedStyleKeys,
  unavailableReason,
});

export const SAGE_MODE_TYPES = [
  { key: "perfect", name: "Perfeito" },
  { key: "imperfect", name: "Imperfeito" },
];

export const SAGE_MODE_CATALOG = {
  perfect: [
  mode("abelha", "Abelha", ["ninjutsu"]),
  mode("aranha", "Aranha", ["tansakujutsu", "ninjutsu"]),
  mode("avestruz", "Avestruz", ["taijutsu"]),
  mode("baku", "Baku", ["genjutsu", "ninjutsu"]),
  mode("besta-dragao", "Besta Dragão", ["taijutsu"]),
  mode("besta-encarapacada", "Besta Encarapaçada", ["taijutsu", "bukijutsu"]),
  mode("cachorro", "Cachorro", ["taijutsu", "ninjutsu"]),
  mode("cachorro-de-guarda", "Cachorro de Guarda", ["tansakujutsu", "ninjutsu"]),
  mode("camaleao", "Camaleão", ["taijutsu", "tansakujutsu"]),
  mode("canguru", "Canguru", ["taijutsu"]),
  mode("caranguejo-gigante", "Caranguejo Gigante", ["taijutsu", "ninjutsu"]),
  mode("caranguejo-violinista", "Caranguejo Violinista", ["ninjutsu", "genjutsu"]),
  mode("centopeia-gigante", "Centopéia Gigante", ["taijutsu", "bukijutsu"]),
  mode("cervo", "Cervo", ["taijutsu", "iryoninjutsu"]),
  mode("coalas", "Coalas", ["taijutsu", "bukijutsu"]),
  mode("cobras", "Cobras", ["iryoninjutsu", "ninjutsu"]),
  mode("coruja", "Coruja", ["tansakujutsu"]),
  mode("corvo", "Corvo", ["genjutsu", "ninjutsu"]),
  mode("cao-de-ni", "Cão de Ni", ["ninjutsu", "bukijutsu"]),
  mode("doki", "Doki", ["genjutsu"]),
  mode("doninha", "Doninha", ["ninjutsu", "bukijutsu"]),
  mode("esquilo", "Esquilo", ["bukijutsu"]),
  mode("falcao", "Falcão", ["tansakujutsu"]),
  mode("formiga", "Formiga", ["tansakujutsu"]),
  mode("furao", "Furão", ["ninjutsu", "taijutsu"]),
  mode("gatos-ninjas", "Gatos Ninjas", ["ninjutsu", "genjutsu"]),
  mode("girafa", "Girafa", ["bukijutsu", "taijutsu"]),
  mode("golem-de-prisao-de-terra", "Golem de Prisão de Terra", ["taijutsu", "ninjutsu"]),
  mode("gorila", "Gorila", ["taijutsu"]),
  mode("guaxinim-gigante", "Guaxinim Gigante", ["bukijutsu", "taijutsu"]),
  mode("hashirama", "Hashirama", [], "O sistema enviado não informa qual E.N. este Modo Sábio concede."),
  mode("hipopotamo", "Hipopótamo", ["taijutsu"]),
  mode("inseto-gigante", "Inseto Gigante", ["tansakujutsu", "ninjutsu"]),
  mode("javalis", "Javalis", ["ninjutsu", "taijutsu"]),
  mode("lagartos", "Lagartos", ["iryoninjutsu"]),
  mode("lesma", "Lesma", ["iryoninjutsu", "ninjutsu"]),
  mode("leao-do-pavor", "Leão do Pavor", ["taijutsu"]),
  mode("lobos", "Lobos", ["taijutsu"]),
  mode("lulas", "Lulas", ["ninjutsu"]),
  mode("macaco", "Macaco", ["ninjutsu", "bukijutsu"]),
  mode("mariposa-shinobi", "Mariposa Shinobi", ["iryoninjutsu", "ninjutsu"]),
  mode("marisco-gigante", "Marisco Gigante", ["ninjutsu", "genjutsu"]),
  mode("marlim", "Marlim", ["taijutsu", "bukijutsu"]),
  mode("moguranmaru-toupeira", "Moguranmaru (Toupeira)", ["bukijutsu", "taijutsu"]),
  mode("morcego", "Morcego", ["ninjutsu"]),
  mode("onba", "Onba", ["taijutsu"]),
  mode("penguin", "Penguin", ["taijutsu", "bukijutsu"]),
  mode("piranha", "Piranha", ["ninjutsu"]),
  mode("porco", "Porco", ["taijutsu"]),
  mode("passaro-san", "Pássaro San", ["ninjutsu", "tansakujutsu"]),
  mode("rei-concha", "Rei Concha", ["genjutsu", "taijutsu"]),
  mode("rinoceronte-gigante", "Rinoceronte Gigante", ["taijutsu"]),
  mode("rouen", "Rouen", ["ninjutsu"]),
  mode("ryuurimaru", "Ryuurimaru", ["ninjutsu"]),
  mode("salamandra", "Salamandra", ["iryoninjutsu", "ninjutsu"]),
  mode("sanguessuga", "Sanguessuga", ["ninjutsu", "tansakujutsu"]),
  mode("sapos-kashin-koji", "Sapos (Kashin Koji)", ["ninjutsu", "bukijutsu"]),
  mode("sapos-cla-gama", "Sapos - Clã Gama", ["ninjutsu", "taijutsu"]),
  mode("tamandua-gigante-das-quatro-bestas-guerreiras", "Tamanduá gigante das Quatro Bestas Guerreiras", ["taijutsu"]),
  mode("tartaruga", "Tartaruga", ["taijutsu", "bukijutsu"]),
  mode("tatu", "Tatu", ["bukijutsu", "taijutsu"]),
  mode("tigre", "Tigre", ["taijutsu"]),
  mode("touro-gigante", "Touro Gigante", ["taijutsu"]),
  mode("tubaroes", "Tubarões", ["ninjutsu", "taijutsu"]),
  mode("umibozus", "Umibozus", ["ninjutsu"]),
  mode("urso-panda", "Urso Panda", ["taijutsu"]),
  mode("ursos", "Ursos", ["taijutsu", "ninjutsu"]),
  mode("aguia", "Águia", ["tansakujutsu"]),
],
  imperfect: [
  mode("abelha", "Abelha", ["ninjutsu"]),
  mode("aranha", "Aranha", ["bukijutsu"]),
  mode("avestruz", "Avestruz", ["taijutsu"]),
  mode("baku", "Baku", ["taijutsu"]),
  mode("besta-dragao", "Besta Dragão", ["taijutsu", "bukijutsu"]),
  mode("besta-encouracado", "Besta Encouraçado", ["tansakujutsu", "ninjutsu"]),
  mode("cachorro", "Cachorro", ["taijutsu"]),
  mode("camaleao", "Camaleão", ["taijutsu"]),
  mode("canguru", "Canguru", ["taijutsu"]),
  mode("caraguejo-violinista", "Caraguejo Violinista", ["genjutsu", "ninjutsu"]),
  mode("caranguejo-gigante", "Caranguejo Gigante", ["taijutsu"]),
  mode("centopeia", "Centopéia", ["bukijutsu"]),
  mode("cervo", "Cervo", ["tansakujutsu", "taijutsu"]),
  mode("coala", "Coala", ["taijutsu"]),
  mode("cobras", "Cobras", ["iryoninjutsu", "ninjutsu"]),
  mode("coruja", "Coruja", ["tansakujutsu"]),
  mode("corvo", "Corvo", ["genjutsu"]),
  mode("caes-de-ni", "Cães de Ni", ["bukijutsu"]),
  mode("cao-de-guarda", "Cão de Guarda", ["ninjutsu"]),
  mode("dokis", "Dokis", ["genjutsu"]),
  mode("doninha", "Doninha", ["ninjutsu", "fuinjutsu"]),
  mode("esquilos", "Esquilos", ["bukijutsu"]),
  mode("falcao", "Falcão", ["ninjutsu", "tansakujutsu"]),
  mode("formigas", "Formigas", ["tansakujutsu"]),
  mode("furao", "Furão", ["taijutsu"]),
  mode("gato-ninja", "Gato Ninja", ["ninjutsu", "genjutsu"]),
  mode("girafa", "Girafa", ["taijutsu"]),
  mode("golem-de-pedra", "Golem de Pedra", ["ninjutsu", "taijutsu"]),
  mode("gorilas", "Gorilas", ["taijutsu"]),
  mode("guaxinim", "Guaxinim", ["bukijutsu"]),
  mode("hipopotamo", "Hipopótamo", ["taijutsu"]),
  mode("inseto", "Inseto", ["ninjutsu"]),
  mode("javali", "Javali", ["taijutsu"]),
  mode("lagartos", "Lagartos", ["iryoninjutsu", "tansakujutsu"]),
  mode("lesma", "Lesma", ["iryoninjutsu"]),
  mode("leao-do-pavor", "Leão Do Pavor", ["genjutsu", "taijutsu"]),
  mode("lobo", "Lobo", ["ninjutsu"]),
  mode("lulas", "Lulas", ["iryoninjutsu"]),
  mode("macaco", "Macaco", ["ninjutsu", "bukijutsu"]),
  mode("mariposa", "Mariposa", ["genjutsu"]),
  mode("marisco-gigante", "Marisco Gigante", ["genjutsu"]),
  mode("marlim", "Marlim", ["bukijutsu"]),
  mode("morcegos", "Morcegos", ["genjutsu", "tansakujutsu"]),
  mode("onbaa", "Onbaa", ["taijutsu"]),
  mode("panda", "Panda", ["taijutsu"]),
  mode("passaro-san", "Passaro San", ["ninjutsu"]),
  mode("peixe-gato", "Peixe Gato", ["ninjutsu"]),
  mode("peixes-voadores", "Peixes Voadores", ["ninjutsu"]),
  mode("penguin", "Penguin", ["taijutsu"]),
  mode("porco", "Porco", ["taijutsu"]),
  mode("rei-concha", "Rei Concha", ["genjutsu"]),
  mode("rinoceronte", "Rinoceronte", ["taijutsu"]),
  mode("rouen", "Rouen", ["ninjutsu"]),
  mode("ryuurimaru", "Ryuurimaru", ["ninjutsu"]),
  mode("salamandra", "Salamandra", ["iryoninjutsu"]),
  mode("sanguessuga", "Sanguessuga", ["ninjutsu"]),
  mode("sapo-kashin-koji", "Sapo (Kashin Koji)", ["ninjutsu", "bukijutsu"]),
  mode("sapos-cla-gama", "Sapos (Clã Gama)", ["taijutsu", "ninjutsu"]),
  mode("tamandua", "Tamanduá", ["tansakujutsu"]),
  mode("tartaruga", "Tartaruga", ["taijutsu"]),
  mode("tatu", "Tatu", ["taijutsu"]),
  mode("tigre", "Tigre", ["ninjutsu"]),
  mode("toupeira", "Toupeira", ["bukijutsu"]),
  mode("touro", "Touro", ["taijutsu", "bukijutsu"]),
  mode("tubaroes", "Tubarões", ["ninjutsu"]),
  mode("ursos", "Ursos", ["taijutsu"]),
  mode("aguia", "Águia", ["tansakujutsu"]),
  mode("umibozus", "Ūmibozus", ["ninjutsu"]),
],
};

export function getSageModesByType(type) {
  return SAGE_MODE_CATALOG[type] || [];
}

export function getSageMode(type, key) {
  return getSageModesByType(type).find((item) => item.key === key) || null;
}

export function getSageModeStyleOptions(type, key) {
  const selectedMode = getSageMode(type, key);

  if (!selectedMode) return [];

  return selectedMode.allowedStyleKeys.map((styleKey) => ({
    key: styleKey,
    name: STYLE_LABELS[styleKey] || styleKey,
  }));
}

export function getSageModeTypeLabel(type) {
  return SAGE_MODE_TYPES.find((item) => item.key === type)?.name || "";
}

export function formatSageMode(character = {}) {
  const type = character.sageModeType || character.sage_mode_type || "";
  const name = character.sageModeName || character.sage_mode_name || "";
  const styleName = character.sageModeNinjaStyleName || character.sage_mode_ninja_style_name || "";

  if (!type || !name) return "Nenhum";

  const typeLabel = getSageModeTypeLabel(type);
  const styleSuffix = styleName ? ` — E.N. ${styleName}` : "";

  return `${typeLabel}: ${name}${styleSuffix}`;
}
