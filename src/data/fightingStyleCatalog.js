const STYLE_LABELS = {
  ninjutsu: "Ninjutsu",
  genjutsu: "Genjutsu",
  taijutsu: "Taijutsu",
  fuinjutsu: "Fuinjutsu",
  tansakujutsu: "Kanchijutsu",
  iryoninjutsu: "Iryoninjutsu",
  bukijutsu: "Bukijutsu",
};

const fightingStyle = (
  key,
  name,
  allowedStyleKeys,
  requirements = "",
  summary = ""
) => ({
  key,
  name,
  allowedStyleKeys,
  requirements,
  summary,
});

export const FIGHTING_STYLE_CATALOG = [
  fightingStyle("argila-explosiva", "Argila Explosiva", ["ninjutsu"], "Kinjutsu de Iwagakure e Bakuton", "Insere chakra em matéria para moldar e ativar explosivos."),
  fightingStyle("assassinato-silencioso", "Assassinato Silencioso", ["bukijutsu"], "Exclusivo de Kirigakure", "Método de eliminação silenciosa com lâminas e movimentação furtiva."),
  fightingStyle("cristalizacao-de-gelo", "Cristalização de Gelo", ["ninjutsu"], "Exclusivo do Clã Yuki", "Molda cristais de gelo transparentes para combate e técnicas derivadas."),
  fightingStyle("arte-ninja-de-flor", "Arte Ninja de Flor", ["ninjutsu", "genjutsu"], "Busca", "Estilo de combate com técnicas secretas baseadas em flores."),
  fightingStyle("danca-desordenada-do-leque", "Dança Desordenada do Leque", ["bukijutsu"], "Exclusivo de Sunagakure", "Combina golpes rápidos usando o leque fechado como arma."),
  fightingStyle("iaido", "Iaidō", ["bukijutsu"], "Exclusivo de Samurai", "Arte de sacar, golpear e embainhar a espada em movimentos controlados."),
  fightingStyle("relampago-negro", "Relâmpago Negro", ["ninjutsu"], "Exclusivo de Kumogakure", "Forma especial de Estilo Raio que produz relâmpagos negros."),
  fightingStyle("arhat", "Arhat", ["taijutsu"], "Busca e Taijutsu 3", "Estilo físico violento baseado em compressões, joelhadas e socos pesados."),
  fightingStyle("bisturi-de-chakra", "Bisturi de Chakra", ["iryoninjutsu"], "Iryoninjutsu 3 e Ninja Médico", "Usa bisturis de chakra com precisão cirúrgica e aplicação ofensiva."),
  fightingStyle("capa-de-areia-de-ferro", "Capa de Areia de Ferro", ["ninjutsu"], "Satetsu", "Reveste o corpo com areia de ferro para defesa e manipulações derivadas."),
  fightingStyle("controle-de-caloria", "Controle de Caloria", ["taijutsu"], "Exclusivo do Clã Akimichi", "Converte calorias corporais em chakra ou força."),
  fightingStyle("balao-de-chiclete", "Balão de Chiclete", ["ninjutsu"], "Busca e Ninjutsu 3", "Cria e manipula grandes bolhas de chiclete para aprisionar ou explodir."),
  fightingStyle("liquido-de-chakra", "Líquido de Chakra", ["ninjutsu"], "Traço Único: Chakra Viscoso", "Expulsa chakra líquido que se solidifica como material emborrachado resistente."),
  fightingStyle("ebulicao-forca-inigualavel", "Ebulição: Força Inigualável", ["taijutsu"], "Jinchūriki de Kokuō", "Usa pressão de vapor para ampliar força e movimentação."),
  fightingStyle("modo-borboleta", "Modo Borboleta", ["taijutsu"], "Clã Akimichi e Controle de Caloria", "Converte calorias em chakra e atributos durante o Modo Borboleta."),
  fightingStyle("punho-adamantino", "Punho Adamantino", ["ninjutsu"], "Ninjutsu 4 ou Iryoninjutsu 2", "Concentra e libera chakra nos punhos ou pés para multiplicar a força."),
  fightingStyle("kenjutsu-estilo-folha", "Kenjutsu ao Estilo da Folha", ["bukijutsu"], "Exclusivo de Konoha", "Kenjutsu de ataques frontais, diretos e cortes de grande impacto."),
  fightingStyle("kenjutsu-estilo-nuvem", "Kenjutsu ao Estilo da Nuvem", ["bukijutsu"], "Exclusivo de Kumogakure", "Kenjutsu capaz de responder a múltiplos ataques e atingir pontos posteriores."),
  fightingStyle("kenjutsu-estilo-uchihas", "Kenjutsu ao Estilo dos Uchihas", ["bukijutsu"], "Uchiha e Bukijutsu 1", "Kenjutsu de golpes rápidos, precisos e integrados ao deslocamento instantâneo."),
  fightingStyle("kumite-dos-sapos", "Kumite dos Sapos", ["taijutsu", "tansakujutsu"], "Modo Sábio dos Sapos e autorização do contrato mestre", "Usa a aura do Senjutsu como extensão invisível do corpo."),
  fightingStyle("ninjutsu-bolhas-de-sabao", "Ninjutsu de Bolhas de Sabão", ["ninjutsu"], "Jinchūriki de Saiken ou Kirigakure", "Manipula bolhas para voo, barreiras, clones, aprisionamento e explosões."),
  fightingStyle("punho-de-arenito", "Punho de Arenito", ["taijutsu"], "Kazekage puro usando areia", "Molda arenito rígido em ferramentas para combate de curta distância."),
  fightingStyle("punho-forte", "Punho Forte", ["taijutsu"], "Clã Lee ou Maito", "Estilo de impacto externo voltado a esmagar e quebrar ossos."),
  fightingStyle("punho-embriagado", "Punho Embriagado", [], "Busca e Taijutsu 3", "Estilo imprevisível ativado por embriaguez; sua proficiência não fornece E.N."),
  fightingStyle("punho-silencioso", "Punho Silencioso", ["taijutsu"], "Sunagakure e Taijutsu 2", "Reveste o corpo com chakra para tornar os movimentos silenciosos."),
  fightingStyle("punho-suave", "Punho Suave", ["taijutsu"], "Ninjutsu 3", "Injeta chakra na rede do alvo para causar danos internos."),
  fightingStyle("punho-suave-hyuuga", "Punho Suave — Melhoria Hyūga", ["taijutsu"], "Exclusivo do Clã Hyūga", "Aprimora o fechamento de Tenketsu e a velocidade durante sequências de golpes."),
  fightingStyle("punicao-divina", "Punição Divina", ["bukijutsu"], "Exclusivo de Jashinista", "Combina golpes físicos e ataques de foice ou kusarigama."),
  fightingStyle("taijutsu-de-agitacao", "Taijutsu de Agitação", ["taijutsu", "bukijutsu"], "Busca", "Estilo dançante de movimentos imprevisíveis contra um ou vários oponentes."),
  fightingStyle("tecnica-das-quatro-patas", "Técnica das Quatro Patas", ["taijutsu"], "Exclusivo do Clã Inuzuka", "Transformação animalesca para combate quadrúpede em alta velocidade."),
  fightingStyle("tecnica-de-assassinato", "Técnica de Assassinato", ["bukijutsu"], "Livre", "Arte de espada voltada a golpes letais e pontos precisos do corpo."),
  fightingStyle("tecnica-da-criacao-de-garras", "Técnica da Criação de Garras", ["taijutsu"], "Jinchūriki de Matatabi ou Modo Sábio dos Gatos", "Amplia e fortalece unhas como garras resistentes e cortantes."),
  fightingStyle("insetos-parasitas-destrutivos", "Técnica de Insetos Parasitas Destrutivos", ["ninjutsu", "tansakujutsu"], "Exclusivo do Clã Aburame", "Usa insetos residentes no corpo para combate, vigilância e inteligência."),
  fightingStyle("restricao-do-caractere", "Técnica de Restrição do Caractere", ["ninjutsu"], "Exclusivo de Amegakure", "Escreve caracteres de chakra no ar para produzir efeitos programados."),
  fightingStyle("metal-viscoso-da-aranha", "Metal Viscoso da Aranha", ["ninjutsu"], "Clã Kidōmaru e Técnica de Criação de Teias", "Endurece teias como metal maleável e resistente."),
  fightingStyle("criacao-de-teias", "Técnica de Criação de Teias", ["ninjutsu"], "Clã Kidōmaru", "Cria e manipula teias em armadilhas, casulos, cordas e redes."),
  fightingStyle("sabre-samurai", "Técnica do Sabre Samurai", ["bukijutsu"], "Ser Samurai", "Canaliza chakra na espada para ampliar corte, alcance e rajadas."),
  fightingStyle("tecnica-de-marionete", "Técnica de Marionete", ["bukijutsu"], "Exclusivo de Sunagakure", "Controla marionetes por fios de chakra."),
  fightingStyle("desenho-super-besta", "Desenho de Imitação da Super Besta", ["ninjutsu"], "Exclusivo de Konoha", "Anima desenhos de tinta para reconhecimento, transporte e combate."),
  fightingStyle("punho-de-gelo-quebrante", "Punho de Gelo Quebrante", ["taijutsu"], "Clã Yuki", "Reveste punhos com gelo rígido e moldável para defesa e ataque."),
  fightingStyle("danca-do-shikigami", "Dança do Shikigami", ["ninjutsu"], "Clã Konan e Técnica Papirocinética", "Desfaz o corpo em folhas de papel e manipula-as livremente."),
];

export function getFightingStyle(key) {
  return FIGHTING_STYLE_CATALOG.find((item) => item.key === key) || null;
}

export function getFightingStyleStyleOptions(key) {
  const selectedStyle = getFightingStyle(key);

  if (!selectedStyle) return [];

  return selectedStyle.allowedStyleKeys.map((styleKey) => ({
    key: styleKey,
    name: STYLE_LABELS[styleKey] || styleKey,
  }));
}

export function normalizeFightingStyles(value) {
  const list = Array.isArray(value) ? value : [];

  return list
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;

      const styleKey = String(item.style_key || item.styleKey || "").trim();
      const catalogItem = getFightingStyle(styleKey);

      if (!styleKey || !catalogItem) return null;

      const proficiency = Boolean(item.proficiency ?? item.hasProficiency ?? false);

      return {
        order: Number(item.order || index + 1) || index + 1,
        style_key: styleKey,
        styleKey,
        style_name: item.style_name || item.styleName || catalogItem.name,
        styleName: item.style_name || item.styleName || catalogItem.name,
        proficiency,
        hasProficiency: proficiency,
        ninja_style_key: item.ninja_style_key || item.ninjaStyleKey || "",
        ninjaStyleKey: item.ninja_style_key || item.ninjaStyleKey || "",
        ninja_style_name: item.ninja_style_name || item.ninjaStyleName || "",
        ninjaStyleName: item.ninja_style_name || item.ninjaStyleName || "",
        ninja_style_level: Number(item.ninja_style_level || item.ninjaStyleLevel || 0) || 0,
        ninjaStyleLevel: Number(item.ninja_style_level || item.ninjaStyleLevel || 0) || 0,
        ability_key: item.ability_key || item.abilityKey || "",
        abilityKey: item.ability_key || item.abilityKey || "",
        ability_name: item.ability_name || item.abilityName || "",
        abilityName: item.ability_name || item.abilityName || "",
        learned_at: item.learned_at || item.learnedAt || "",
        learnedAt: item.learned_at || item.learnedAt || "",
        proficiency_at: item.proficiency_at || item.proficiencyAt || "",
        proficiencyAt: item.proficiency_at || item.proficiencyAt || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

export function formatFightingStyle(item = {}) {
  const name = item.styleName || item.style_name || "Estilo de Luta";
  const proficiency = Boolean(item.hasProficiency ?? item.proficiency);
  const ninjaStyleName = item.ninjaStyleName || item.ninja_style_name || "";
  const ninjaStyleLevel = Number(item.ninjaStyleLevel || item.ninja_style_level || 0) || 0;

  if (!proficiency) return `${name} — aprendido`;

  if (ninjaStyleName && ninjaStyleLevel) {
    return `${name} — Proficiência — E.N. ${ninjaStyleName} ${ninjaStyleLevel}`;
  }

  return `${name} — Proficiência`;
}
