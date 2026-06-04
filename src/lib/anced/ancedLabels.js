import { ANCED_VALUES } from "./ancedFormula.js";

export const RANGE_OPTIONS = [
  { key: "none", label: "Sem alcance próprio", points: ANCED_VALUES.range.none },
  { key: "melee", label: "Corpo a corpo", points: ANCED_VALUES.range.melee },
  { key: "short", label: "Curto (1-10m)", points: ANCED_VALUES.range.short },
  { key: "medium", label: "Médio (10-30m)", points: ANCED_VALUES.range.medium },
  { key: "long", label: "Longo (30-100m)", points: ANCED_VALUES.range.long },
  { key: "all", label: "Todos os alcances", points: ANCED_VALUES.range.all },
];

export const CLASS_OPTIONS = [
  { key: "defensive", label: "Defensivo", points: ANCED_VALUES.class.defensive },
  { key: "offensive", label: "Ofensivo", points: ANCED_VALUES.class.offensive },
  { key: "support", label: "Suporte", points: ANCED_VALUES.class.support },
  { key: "sealing", label: "Selamento", points: ANCED_VALUES.class.sealing },
  { key: "preparation", label: "Preparação", points: ANCED_VALUES.class.preparation },
];

export const STRUCTURE_OPTIONS = [
  { key: "taijutsuBukijutsu", label: "Taijutsu/Bukijutsu", points: ANCED_VALUES.structure.taijutsuBukijutsu },
  { key: "hidenYang", label: "Hiden/Yang", points: ANCED_VALUES.structure.hidenYang },
  { key: "elementalYin", label: "Elemental/Yin", points: ANCED_VALUES.structure.elementalYin },
  { key: "nonElementalKekkeiGenkai", label: "Não elemental/Kekkei Genkai", points: ANCED_VALUES.structure.nonElementalKekkeiGenkai },
  { key: "kinjutsuKekkeiTotaExclusive", label: "Kinjutsu/Kekkei Tōta/Exclusivo", points: ANCED_VALUES.structure.kinjutsuKekkeiTotaExclusive },
];

export const DAMAGE_OPTIONS = [
  { key: "noneOrIncapacitation", label: "Não causa/Incapacitação", points: ANCED_VALUES.damage.noneOrIncapacitation },
  { key: "light", label: "Ferimentos leves", points: ANCED_VALUES.damage.light },
  { key: "moderate", label: "Ferimentos moderados", points: ANCED_VALUES.damage.moderate },
  { key: "severeOrMortal", label: "Ferimentos graves/mortais", points: ANCED_VALUES.damage.severeOrMortal },
  { key: "obliteration", label: "Dizimação/Obliteração", points: ANCED_VALUES.damage.obliteration },
];

export function getOptionByKey(options, key) {
  return options.find((option) => option.key === key) || null;
}
