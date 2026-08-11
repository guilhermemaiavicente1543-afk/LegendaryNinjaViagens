import { useEffect, useMemo, useState } from "react";
import "../styles/my-ninja-clean.css";
import { uniqueTraits } from "../data/uniqueTraits";
import { villageOptions } from "../data/characterOptions";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import HallBackButton from "./ui/HallBackButton";
import {
  buildNinjaStyleSummary,
  formatNinjaStyleSelection,
  getNextNinjaStyleOptions,
  getNinjaStyleAbilities,
  getNinjaStyleDefinition,
  normalizeNinjaStyleSelections,
} from "../data/ninjaStyleCatalog";
import {
  formatSageMode,
  getSageMode,
  getSageModesByType,
  getSageModeStyleOptions,
  getSageModeTypeLabel,
  SAGE_MODE_TYPES,
} from "../data/sageModeCatalog";
import {
  FIGHTING_STYLE_CATALOG,
  formatFightingStyle,
  getFightingStyle,
  getFightingStyleStyleOptions,
  normalizeFightingStyles,
} from "../data/fightingStyleCatalog";
import {
  INITIAL_CHAKRA_ELEMENTS,
  MAX_CHAKRA_NATURES,
  formatChakraNatures,
  getInitialChakraElement,
  isValidInitialChakraNature,
  normalizeChakraNatures,
} from "../data/chakraElementCatalog";

const CHARACTER_STORAGE_KEY = "legendary-ninja-characters";
const PROFILE_SHEET_STORAGE_KEY = "legendary-ninja-profile-sheets";
const CHARACTER_PROOFS_BUCKET = "character-proofs";

const NINJA_RANKS = ["E", "D", "C", "B", "A", "S", "SS", "SS+"];

function normalizeNinjaRank(value) {
  const normalized = String(value || "E")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  return NINJA_RANKS.includes(normalized)
    ? normalized
    : "E";
}

function getAvailableNinjaStyleChoices(character = {}) {
  return Math.max(
    0,
    Number(
      character?.availableNinjaStyleChoices ??
      character?.available_ninja_style_choices ??
      0
    ) || 0
  );
}

function getNinjaStyleAcquisitionLabel(selection = {}) {
  const acquisitionType = String(
    selection?.acquisition_type ||
    selection?.acquisitionType ||
    ""
  ).trim();

  const sourceName = String(
    selection?.source_name ||
    selection?.sourceName ||
    ""
  ).trim();

  switch (acquisitionType) {
    case "initial":
      return "Escolha inicial";
    case "sage_mode":
      return sourceName
        ? `Modo Sábio — ${sourceName}`
        : "Adquirido por Modo Sábio";
    case "fighting_style":
      return sourceName
        ? `Estilo de Luta — ${sourceName}`
        : "Adquirido por proficiência";
    case "administrative":
      return "Ajuste administrativo";
    case "progression":
    default:
      return "Adquirido por crédito de evolução";
  }
}

const EMPTY_CHARACTER = {
  id: "",
  userId: "",
  ownerEmail: "",
  playerName: "",
  phone: "",
  characterName: "",
  age: "",
  rank: "E",
  clanOrKinship: "",
  villageOrOrganization: "",
  villageOrOrganizationOther: "",
  kekkeiGenkaiOrHiden: "",
  chakraNatures: [],
  chakra_natures: [],
  ninjaStyle: "",
  ninjaStyleSelections: [],
  ninja_style_selections: [],
  availableNinjaStyleChoices: 0,
  available_ninja_style_choices: 0,
  sageModeType: "",
  sage_mode_type: "",
  sageModeKey: "",
  sage_mode_key: "",
  sageModeName: "",
  sage_mode_name: "",
  sageModeNinjaStyleKey: "",
  sage_mode_ninja_style_key: "",
  sageModeNinjaStyleName: "",
  sage_mode_ninja_style_name: "",
  sageModeRegisteredAt: "",
  sage_mode_registered_at: "",
  fightingStyles: [],
  fighting_styles: [],
  epithet: "",
  appearance: "",
  history: "",
  equipment: "",
  uniqueTrait: "",
  selectedTraits: [],
  selected_traits: [],
  characterPhotoUrl: "",
  mapIconUrl: "",
  portraitUrl: "",
  iconUrl: "",
  skillPoints: 0,
};

function StarIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10z" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

const icons = {
  home: <><path d="M3 12 12 3l9 9" /><path d="M5 10v10h14V10" /></>,
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14" /><path d="M15 6v14" /></>,
  missions: <><path d="M4 4h12l4 4v12H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  heart: <path d="M11 20s-7-4-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-7 11-7 11" />,
  trophy: <><path d="M6 9V4h12v5a6 6 0 0 1-12 0Z" /><path d="M4 6H2v2a4 4 0 0 0 4 4M20 6h2v2a4 4 0 0 1-4 4M10 18h4v3h-4z" /></>,
  bag: <><path d="M5 7h14l-1 13H6z" /><path d="M9 7a3 3 0 0 1 6 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  exit: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  eye: <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" /></>,
  medal: <><circle cx="12" cy="8" r="6" /><path d="m9 14-2 7 5-3 5 3-2-7" /></>,
  flask: <path d="M9 2h6M10 2v6L4 20a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 8V2" />,
  link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>,
  layers: <><path d="m21 8-9-5-9 5 9 5z" /><path d="m3 8 9 5 9-5M3 16l9 5 9-5" /></>,
  arrow: <path d="m14 5 7 7-7 7M3 12h18" />,
  pulse: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  hidden: <path d="M17 17a7 7 0 0 1-10-9m3-3a7 7 0 0 1 10 9M1 1l22 22" />,
  book: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  affiliation: <path d="M2 15c6.5 0 6.5-6 13-6 3 0 5 2 5 5s-2 5-5 5c-6.5 0-6.5-6-13-6" />,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0Z" /><circle cx="12" cy="10" r="3" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
};

function SvgIcon({ name, className = "mn-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function cleanValue(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readLocalCharacters() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHARACTER_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSelectedTraits(character = {}) {
  const raw =
    character.selectedTraits ||
    character.selected_traits ||
    character.uniqueTraits ||
    character.traits ||
    character.uniqueTrait ||
    character.unique_trait ||
    [];

  const list = Array.isArray(raw) ? raw : [raw];

  return list
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      return item.name || item.label || item.title || "";
    })
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function splitVillage(value) {
  const text = String(value || "").trim();

  if (!text) return { villageOrOrganization: "", villageOrOrganizationOther: "" };
  if (villageOptions.includes(text)) return { villageOrOrganization: text, villageOrOrganizationOther: "" };

  return { villageOrOrganization: "Outro", villageOrOrganizationOther: text };
}

function finalVillage(character) {
  if (character.villageOrOrganization === "Outro") {
    return String(character.villageOrOrganizationOther || "").trim();
  }

  return String(character.villageOrOrganization || "").trim();
}

function normalizeCharacter(character = {}) {
  // LN_NORMALIZE_PROFILE_SHEET_V4
  //
  // profile_sheet pertence exclusivamente à Ficha Complementar.
  // Os dados oficiais do perfil vêm das colunas próprias de characters.
  const profileSheet =
    character?.profileSheet &&
    typeof character.profileSheet === "object"
      ? character.profileSheet
      : character?.profile_sheet &&
        typeof character.profile_sheet === "object"
        ? character.profile_sheet
        : {};

  const source = {
    ...profileSheet,
    ...character,
  };

  const selectedTraits =
    getSelectedTraits(source);

  const village = splitVillage(
    source.villageOrOrganization ||
    source.village_or_organization
  );

  const ninjaStyleSelections = normalizeNinjaStyleSelections(
    source.ninjaStyleSelections ||
    source.ninja_style_selections ||
    []
  );

  const fightingStyles = normalizeFightingStyles(
    source.fightingStyles ||
    source.fighting_styles ||
    []
  );

  const chakraNatures = normalizeChakraNatures(
    source.chakraNatures ||
    source.chakra_natures ||
    source.primary_element ||
    []
  );

  const normalized = {
    ...EMPTY_CHARACTER,
    ...profileSheet,
    ...character,

    id:
      character.id ||
      source.id ||
      "",

    userId:
      character.userId ||
      character.user_id ||
      source.userId ||
      source.user_id ||
      "",

    ownerEmail:
      character.ownerEmail ||
      character.owner_email ||
      source.ownerEmail ||
      source.owner_email ||
      "",

    playerName:
      source.playerName ||
      source.player_name ||
      "",

    phone:
      character.phone ||
      character.phone_number ||
      character.profileSheet?.phone ||
      character.profile_sheet?.phone ||
      "",

    characterName:
      source.characterName ||
      source.character_name ||
      source.name ||
      "",

    age:
      source.age ??
      "",

    rank:
      normalizeNinjaRank(source.rank),

    clanOrKinship:
      source.clanOrKinship ||
      source.clan_or_kinship ||
      "",

    villageOrOrganization:
      source.villageOrOrganization === "Outro"
        ? "Outro"
        : village.villageOrOrganization,

    villageOrOrganizationOther:
      source.villageOrOrganizationOther ||
      village.villageOrOrganizationOther,

    kekkeiGenkaiOrHiden:
      source.kekkeiGenkaiOrHiden ||
      source.kekkei_genkai_or_hiden ||
      "",

    chakraNatures,
    chakra_natures: chakraNatures,

    ninjaStyle:
      source.ninjaStyle ||
      source.ninja_style ||
      buildNinjaStyleSummary(ninjaStyleSelections) ||
      "",

    ninjaStyleSelections,
    ninja_style_selections: ninjaStyleSelections,

    availableNinjaStyleChoices:
      Number(
        source.availableNinjaStyleChoices ??
        source.available_ninja_style_choices ??
        0
      ) || 0,

    available_ninja_style_choices:
      Number(
        source.availableNinjaStyleChoices ??
        source.available_ninja_style_choices ??
        0
      ) || 0,

    sageModeType:
      source.sageModeType ||
      source.sage_mode_type ||
      "",

    sage_mode_type:
      source.sageModeType ||
      source.sage_mode_type ||
      "",

    sageModeKey:
      source.sageModeKey ||
      source.sage_mode_key ||
      "",

    sage_mode_key:
      source.sageModeKey ||
      source.sage_mode_key ||
      "",

    sageModeName:
      source.sageModeName ||
      source.sage_mode_name ||
      "",

    sage_mode_name:
      source.sageModeName ||
      source.sage_mode_name ||
      "",

    sageModeNinjaStyleKey:
      source.sageModeNinjaStyleKey ||
      source.sage_mode_ninja_style_key ||
      "",

    sage_mode_ninja_style_key:
      source.sageModeNinjaStyleKey ||
      source.sage_mode_ninja_style_key ||
      "",

    sageModeNinjaStyleName:
      source.sageModeNinjaStyleName ||
      source.sage_mode_ninja_style_name ||
      "",

    sage_mode_ninja_style_name:
      source.sageModeNinjaStyleName ||
      source.sage_mode_ninja_style_name ||
      "",

    sageModeRegisteredAt:
      source.sageModeRegisteredAt ||
      source.sage_mode_registered_at ||
      "",

    sage_mode_registered_at:
      source.sageModeRegisteredAt ||
      source.sage_mode_registered_at ||
      "",

    fightingStyles,
    fighting_styles: fightingStyles,

    epithet:
      source.epithet ||
      "",

    appearance:
      source.appearance ||
      "",

    history:
      source.history ||
      "",

    equipment:
      source.equipment ||
      "",

    selectedTraits,
    selected_traits: selectedTraits,

    uniqueTrait:
      selectedTraits[0] ||
      source.uniqueTrait ||
      source.unique_trait ||
      "",

    characterPhotoUrl:
      source.characterPhotoUrl ||
      source.character_photo_url ||
      source.portraitUrl ||
      source.portrait_url ||
      source.photoUrl ||
      source.photo_url ||
      "",

    mapIconUrl:
      source.mapIconUrl ||
      source.map_icon_url ||
      source.iconUrl ||
      source.icon_url ||
      "",

    skillPoints:
      source.skillPoints ??
      source.skill_points ??
      0,

    profileSheet,
    profile_sheet: profileSheet,

    updatedAt:
      source.updatedAt ||
      source.updated_at ||
      "",
  };

  normalized.portraitUrl =
    normalized.characterPhotoUrl;

  normalized.iconUrl =
    normalized.mapIconUrl;

  return normalized;
}

function getInitialCharacter(character) {
  const fromProp = normalizeCharacter(character);

  if (fromProp.characterName || fromProp.playerName || fromProp.villageOrOrganization) {
    return fromProp;
  }

  const localCharacters = readLocalCharacters();

  if (localCharacters.length > 0) {
    return normalizeCharacter(localCharacters[0]);
  }

  return fromProp;
}

function saveLocalCharacter(character) {
  const saved = normalizeCharacter({
    ...character,
    villageOrOrganization: finalVillage(character),
    updatedAt: new Date().toISOString(),
  });

  const characters = readLocalCharacters();

  const next = [
    saved,
    ...characters.filter((item) => {
      if (saved.id && item.id === saved.id) return false;
      if (saved.userId && item.userId === saved.userId) return false;
      if (saved.ownerEmail && item.ownerEmail === saved.ownerEmail) return false;
      return item.characterName !== saved.characterName;
    }),
  ];

  localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(next));
  return saved;
}


function buildMyNinjaProfilePayload(character = {}) {
  const normalized =
    normalizeCharacter(character);

  const selectedTraits =
    getSelectedTraits(normalized);


  const characterPhotoUrl =
    normalized.characterPhotoUrl ||
    normalized.portraitUrl ||
    "";

  const mapIconUrl =
    normalized.mapIconUrl ||
    normalized.iconUrl ||
    "";

  return {
    player_name:
      normalized.playerName,

    phone_number:
      normalized.phone,

    character_name:
      normalized.characterName,

    age:
      String(normalized.age ?? "").trim() ||
      null,

    rank:
      normalizeNinjaRank(normalized.rank),

    clan_or_kinship:
      normalized.clanOrKinship,

    village_or_organization:
      finalVillage(normalized),

    kekkei_genkai_or_hiden:
      normalized.kekkeiGenkaiOrHiden,

    chakra_natures:
      normalizeChakraNatures(normalized.chakraNatures),

    /*
      Estilos Ninja e créditos de E.N. não são enviados pelo salvamento
      comum da ficha. A progressão usa uma RPC própria e validada no banco.
    */
    epithet:
      normalized.epithet,

    appearance:
      normalized.appearance,

    history:
      normalized.history,

    equipment:
      normalized.equipment,

    selected_traits:
      selectedTraits,

    portrait_url:
      characterPhotoUrl,

    icon_url:
      mapIconUrl,

    updated_at:
      new Date().toISOString(),

  };
}

async function persistCharacterProfileToSupabase(
  character = {}
) {
  // LN_DIRECT_MY_NINJA_SAVE_V6
  //
  // Os dados oficiais são salvos nas colunas próprias.
  // profile_sheet pertence exclusivamente à Ficha Complementar.
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "O Supabase não está configurado."
    );
  }

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  const userId =
    authData?.user?.id;

  if (!userId) {
    throw new Error(
      "A sessão autenticada do jogador não foi encontrada."
    );
  }

  let characterId =
    String(character?.id || "").trim();

  /*
    Normalmente o Meu Ninja já recebe o id pelo App.jsx.
    O fallback abaixo cobre contas antigas ou estados locais
    que ainda estejam sem o id do personagem.
  */
  if (!characterId) {
    const {
      data: characterRows,
      error: lookupError,
    } = await supabase
      .from("characters")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1);

    if (lookupError) {
      throw new Error(
        `Não foi possível localizar o personagem: ${lookupError.message}`
      );
    }

    characterId =
      String(characterRows?.[0]?.id || "").trim();
  }

  if (!characterId) {
    throw new Error(
      "Nenhum personagem vinculado a esta conta foi encontrado."
    );
  }

  const payload =
    buildMyNinjaProfilePayload(character);

  const {
    data,
    error,
  } = await supabase
    .from("characters")
    .update(payload)
    .eq("id", characterId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "O Supabase não devolveu o personagem depois do salvamento."
    );
  }

  return normalizeCharacter({
    ...data,

    userId:
      data.user_id ||
      userId,

    ownerEmail:
      authData?.user?.email ||
      "",

    profileSheet:
      data.profile_sheet ||
      {},
  });
}


async function acquireNinjaStyleProgression({
  styleKey,
  abilityKey,
} = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "O Supabase não está configurado."
    );
  }

  const normalizedStyleKey =
    String(styleKey || "").trim();

  const normalizedAbilityKey =
    String(abilityKey || "").trim();

  if (!normalizedStyleKey || !normalizedAbilityKey) {
    throw new Error(
      "Escolha o Estilo Ninja e a habilidade antes de confirmar."
    );
  }

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData?.user?.id) {
    throw new Error(
      "A sessão autenticada do jogador não foi encontrada."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "ln_acquire_ninja_style",
    {
      p_style_key:
        normalizedStyleKey,

      p_ability_key:
        normalizedAbilityKey,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const savedRow =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!savedRow) {
    throw new Error(
      "O Supabase não devolveu o personagem depois da aquisição do E.N."
    );
  }

  return normalizeCharacter({
    ...savedRow,

    userId:
      savedRow.user_id ||
      authData.user.id,

    ownerEmail:
      authData.user.email ||
      "",

    profileSheet:
      savedRow.profile_sheet ||
      {},
  });
}


async function removeNinjaStyleProgression({
  styleKey,
  level,
} = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "O Supabase não está configurado."
    );
  }

  const normalizedStyleKey =
    String(styleKey || "").trim();

  const normalizedLevel =
    Number(level) || 0;

  if (!normalizedStyleKey || normalizedLevel < 1) {
    throw new Error(
      "Escolha um Estilo Ninja válido para remover."
    );
  }

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData?.user?.id) {
    throw new Error(
      "A sessão autenticada do jogador não foi encontrada."
    );
  }

  const { data, error } = await supabase.rpc(
    "ln_remove_ninja_style",
    {
      p_style_key: normalizedStyleKey,
      p_level: normalizedLevel,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const savedRow =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!savedRow) {
    throw new Error(
      "O Supabase não devolveu o personagem depois da remoção do E.N."
    );
  }

  return normalizeCharacter({
    ...savedRow,

    userId:
      savedRow.user_id ||
      authData.user.id,

    ownerEmail:
      authData.user.email ||
      "",

    profileSheet:
      savedRow.profile_sheet ||
      {},
  });
}


async function registerSageModeAndAcquireNinjaStyle({
  sageModeType,
  sageModeKey,
  styleKey,
  abilityKey,
} = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "O Supabase não está configurado."
    );
  }

  const normalizedType =
    String(sageModeType || "").trim();

  const normalizedModeKey =
    String(sageModeKey || "").trim();

  const normalizedStyleKey =
    String(styleKey || "").trim();

  const normalizedAbilityKey =
    String(abilityKey || "").trim();

  if (
    !normalizedType ||
    !normalizedModeKey ||
    !normalizedStyleKey ||
    !normalizedAbilityKey
  ) {
    throw new Error(
      "Informe o tipo, o Modo Sábio, o E.N. recebido e a habilidade."
    );
  }

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData?.user?.id) {
    throw new Error(
      "A sessão autenticada do jogador não foi encontrada."
    );
  }

  const { data, error } = await supabase.rpc(
    "ln_register_sage_mode_and_acquire_ninja_style",
    {
      p_sage_mode_type: normalizedType,
      p_sage_mode_key: normalizedModeKey,
      p_style_key: normalizedStyleKey,
      p_ability_key: normalizedAbilityKey,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const savedRow =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!savedRow) {
    throw new Error(
      "O Supabase não devolveu o personagem depois do registro do Modo Sábio."
    );
  }

  return normalizeCharacter({
    ...savedRow,

    userId:
      savedRow.user_id ||
      authData.user.id,

    ownerEmail:
      authData.user.email ||
      "",

    profileSheet:
      savedRow.profile_sheet ||
      {},
  });
}


async function registerFightingStyleAndMaybeAcquireNinjaStyle({
  fightingStyleKey,
  gainProficiency = false,
  styleKey = "",
  abilityKey = "",
} = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "O Supabase não está configurado."
    );
  }

  const normalizedFightingStyleKey =
    String(fightingStyleKey || "").trim();

  const normalizedStyleKey =
    String(styleKey || "").trim();

  const normalizedAbilityKey =
    String(abilityKey || "").trim();

  if (!normalizedFightingStyleKey) {
    throw new Error(
      "Escolha o Estilo de Luta antes de confirmar."
    );
  }

  if (
    gainProficiency &&
    (!normalizedStyleKey || !normalizedAbilityKey)
  ) {
    const fightingStyle = getFightingStyle(
      normalizedFightingStyleKey
    );

    if (fightingStyle?.allowedStyleKeys?.length > 0) {
      throw new Error(
        "Escolha o E.N. e a habilidade recebidos pela proficiência."
      );
    }
  }

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData?.user?.id) {
    throw new Error(
      "A sessão autenticada do jogador não foi encontrada."
    );
  }

  const { data, error } = await supabase.rpc(
    "ln_register_fighting_style",
    {
      p_fighting_style_key:
        normalizedFightingStyleKey,
      p_gain_proficiency:
        Boolean(gainProficiency),
      p_style_key:
        normalizedStyleKey || null,
      p_ability_key:
        normalizedAbilityKey || null,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const savedRow =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!savedRow) {
    throw new Error(
      "O Supabase não devolveu o personagem depois do registro do Estilo de Luta."
    );
  }

  return normalizeCharacter({
    ...savedRow,

    userId:
      savedRow.user_id ||
      authData.user.id,

    ownerEmail:
      authData.user.email ||
      "",

    profileSheet:
      savedRow.profile_sheet ||
      {},
  });
}


const sidebarItems = [
  ["Início", "home"],
  ["Mapa", "map"],
  ["Meu Ninja", "star", true],
  ["Missões", "missions"],
  ["Vila da Folha", "heart"],
  ["Hall das Lendas", "trophy"],
  ["Loja", "bag"],
  ["Configurações", "settings"],
  ["Sair", "exit"],
];

const dossierItems = [
  ["Registro de Provas", "medal"],
  ["Ciência e Medicina", "flask"],
  ["Contratos e Vínculos", "link"],
  ["Inventário", "layers"],
  ["Atividades e Missões", "arrow"],
  ["Status do Personagem", "pulse"],
  ["Ações Ocultas", "hidden"],
  ["Desenvolvimento Narrativo", "book"],
];

function TraitSearchSelect({ value = [], onChange }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selected = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

  const traitOptions = useMemo(
    () =>
      uniqueTraits
        .map((trait) => ({
          id: trait.id || trait.name,
          name: trait.name || "",
          category: trait.category || "",
          type: trait.type || "",
          requirement: trait.requirement || "",
        }))
        .filter((trait) => trait.name),
    []
  );

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return traitOptions;

    return traitOptions.filter((trait) =>
      normalizeText([trait.name, trait.category, trait.type, trait.requirement].join(" ")).includes(q)
    );
  }, [query, traitOptions]);

  function addTrait(name) {
    if (selected.includes(name)) return;
    onChange([...selected, name]);
    setQuery("");
  }

  function removeTrait(name) {
    onChange(selected.filter((item) => item !== name));
  }

  return (
    <div className="mn-trait-select">
      <button type="button" className="mn-trait-select-trigger" onClick={() => setIsOpen((current) => !current)}>
        <span>{selected.length ? `${selected.length} traço(s) selecionado(s)` : "Selecionar traços únicos"}</span>
        <SvgIcon name="chevron" className="mn-small-icon" />
      </button>

      {selected.length > 0 && (
        <div className="mn-trait-selected-list">
          {selected.map((name) => (
            <span key={name}>
              {name}
              <button type="button" onClick={() => removeTrait(name)}>×</button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="mn-trait-select-panel">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar traço único..." autoFocus />

          <div className="mn-trait-select-list">
            {filtered.length === 0 ? (
              <button type="button" className="mn-trait-empty" disabled>Nenhum traço encontrado</button>
            ) : (
              filtered.map((trait) => (
                <button key={trait.id || trait.name} type="button" className={selected.includes(trait.name) ? "is-selected" : ""} onClick={() => addTrait(trait.name)}>
                  <strong>{trait.name}</strong>
                  {(trait.category || trait.type) && <small>{[trait.category, trait.type].filter(Boolean).join(" • ")}</small>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}



function getTechniqueName(technique) {
  return (
    technique?.name ||
    technique?.name_pt ||
    technique?.title ||
    technique?.original_name ||
    "Técnica sem nome"
  );
}

function getTechniqueRank(technique) {
  return technique?.anced_curated_rank || technique?.anced_rank || technique?.wiki_rank || technique?.rank || "";
}

function getTechniqueMeta(technique) {
  return [
    getTechniqueRank(technique) ? `Rank ${getTechniqueRank(technique)}` : "",
    technique?.classification || "",
    technique?.nature || "",
    technique?.status || "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function makeRecordId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getProfileSheetKey(ninja = {}) {
  return (
    ninja.id ||
    ninja.userId ||
    ninja.ownerEmail ||
    ninja.characterName ||
    "default-character"
  );
}

function createEmptyProfileSheet() {
  return {
    proofs: [],
    hiddenActions: [],
    missions: [],
    development: {
      motivation: "",
      personality: "",
      development: "",
      habits: "",
      peculiarities: "",
      favoriteFoods: "",
      dislikedFoods: "",
      fears: "",
      flaws: "",
    },
    medical: {
      bloodType: "",
      procedures: [],
    },
    contracts: {
      masterSummon: "",
      secondarySummon: "",
      specialCases: "",
    },
    inventory: {
      techniques: [],
      equipment: [],
      notes: "",
    },
    status: {
      chakraTotal: "",
      staminaTotal: "",
      chakraRecovery: "",
      staminaRecovery: "",
      speed: "",
      perception: "",
      otherAttributes: "",
    },
  };
}

function readProfileSheet(ninja) {
  try {
    const allSheets = JSON.parse(localStorage.getItem(PROFILE_SHEET_STORAGE_KEY) || "{}");
    const key = getProfileSheetKey(ninja);
    return {
      ...createEmptyProfileSheet(),
      ...(allSheets[key] || {}),
    };
  } catch {
    return createEmptyProfileSheet();
  }
}

function saveProfileSheet(ninja, sheet) {
  try {
    const allSheets = JSON.parse(localStorage.getItem(PROFILE_SHEET_STORAGE_KEY) || "{}");
    allSheets[getProfileSheetKey(ninja)] = {
      ...sheet,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PROFILE_SHEET_STORAGE_KEY, JSON.stringify(allSheets));
  } catch {
    // Se o localStorage falhar, mantém a edição só na sessão atual.
  }
}


function getStorageSafeName(value) {
  return String(value || "sem-nome")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80) || "sem-nome";
}

function getFileExtension(file) {
  const fromName = String(file?.name || "").split(".").pop();

  if (fromName && fromName !== file?.name) {
    return fromName.toLowerCase();
  }

  if (file?.type === "image/png") return "png";
  if (file?.type === "image/webp") return "webp";
  return "jpg";
}

async function uploadDossierImage(file, ninja, folder = "proofs") {
  if (!file) return null;

  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase não configurado.");
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Use apenas imagens PNG, JPG/JPEG ou WEBP.");
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("A imagem precisa ter no máximo 5MB.");
  }

  const owner = getStorageSafeName(
    ninja?.id ||
    ninja?.userId ||
    ninja?.ownerEmail ||
    ninja?.characterName ||
    "personagem"
  );

  const extension = getFileExtension(file);
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const path = `${owner}/${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from(CHARACTER_PROOFS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(CHARACTER_PROOFS_BUCKET)
    .getPublicUrl(path);

  return {
    imageUrl: data?.publicUrl || "",
    imagePath: path,
    imageName: file.name,
    imageSize: file.size,
    imageType: file.type,
  };
}


function ShinobiDossierPanel({ ninja, activeDossier, persistLocally = true }) {
  const [sheet, setSheet] = useState(() =>
    persistLocally ? readProfileSheet(ninja) : createEmptyProfileSheet()
  );
  const [message, setMessage] = useState("");
  const [proofDraft, setProofDraft] = useState({ title: "", imageUrl: "", notes: "" });
  const [proofImageFile, setProofImageFile] = useState(null);
  const [proofImagePreview, setProofImagePreview] = useState("");
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [hiddenDraft, setHiddenDraft] = useState({ title: "", imageUrl: "", status: "Não revelada" });
  const [hiddenImageFile, setHiddenImageFile] = useState(null);
  const [hiddenImagePreview, setHiddenImagePreview] = useState("");
  const [isUploadingHidden, setIsUploadingHidden] = useState(false);
  const [missionDraft, setMissionDraft] = useState({ title: "", description: "" });
  const [procedureDraft, setProcedureDraft] = useState({ title: "", description: "" });
  const [developmentDraft, setDevelopmentDraft] = useState({ title: "", description: "" });

  const [activeInventoryTab, setActiveInventoryTab] = useState("techniques");
  const [techniqueDraft, setTechniqueDraft] = useState({
    techniqueId: "",
    acquisition: "",
    acquiredAt: "",
  });
  const [techniqueSearch, setTechniqueSearch] = useState("");
  const [shinobiDexTechniques, setShinobiDexTechniques] = useState([]);
  const [isLoadingTechniques, setIsLoadingTechniques] = useState(false);
  const [equipmentDraft, setEquipmentDraft] = useState({
    name: "",
    quantity: "1",
    description: "",
    origin: "",
  });
  const [consumableDraft, setConsumableDraft] = useState({
    name: "",
    quantity: "1",
    effect: "",
    origin: "",
  });
  const [resourceDraft, setResourceDraft] = useState({
    name: "",
    quantity: "",
    description: "",
  });
  const [specialItemDraft, setSpecialItemDraft] = useState({
    name: "",
    description: "",
    origin: "",
    adminNote: "",
  });

  const selectedTechnique = useMemo(() => {
    return shinobiDexTechniques.find(
      (technique) => String(technique.id) === String(techniqueDraft.techniqueId)
    );
  }, [shinobiDexTechniques, techniqueDraft.techniqueId]);

  const visibleShinobiDexTechniques = useMemo(() => {
    const search = normalizeText(techniqueSearch);

    if (!search) return [];

    return shinobiDexTechniques
      .filter((technique) => {
        const haystack = normalizeText(
          [
            getTechniqueName(technique),
            getTechniqueRank(technique),
            technique.classification,
            technique.nature,
            technique.status,
            technique.summary,
          ]
            .filter(Boolean)
            .join(" ")
        );

        return haystack.includes(search);
      })
      .slice(0, 80);
  }, [shinobiDexTechniques, techniqueSearch]);

  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfileSheetFromSupabase() {
      if (!isSupabaseConfigured || !supabase || !ninja?.id) return;

      if (!persistLocally) {
        setSheet(createEmptyProfileSheet());
      }

      setIsSyncingSheet(true);

      const { data, error } = await supabase
        .from("characters")
        .select("profile_sheet")
        .eq("id", ninja.id)
        .maybeSingle();

      if (!isMounted) return;

      setIsSyncingSheet(false);

      if (error) {
        setMessage(`Não foi possível carregar profile_sheet: ${error.message}`);
        return;
      }

      if (data?.profile_sheet && Object.keys(data.profile_sheet).length > 0) {
        const nextSheet = {
          ...createEmptyProfileSheet(),
          ...data.profile_sheet,
        };

        setSheet(nextSheet);
        if (persistLocally) {
          saveProfileSheet(ninja, nextSheet);
        }
      }
    }

    loadProfileSheetFromSupabase();

    return () => {
      isMounted = false;
    };
  }, [ninja?.id, persistLocally]);

  async function persistToSupabase(nextSheet) {
    if (!isSupabaseConfigured || !supabase || !ninja?.id) return null;

    const { error } = await supabase
      .from("characters")
      .update({ profile_sheet: nextSheet })
      .eq("id", ninja.id);

    return error;
  }

  async function loadShinobiDexTechniques() {
    if (!isSupabaseConfigured || !supabase) return;

    setIsLoadingTechniques(true);

    async function fetchAllRows(table, select, orderBy = null) {
      const all = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        let query = supabase
          .from(table)
          .select(select)
          .range(from, from + pageSize - 1);

        if (orderBy) {
          query = query.order(orderBy, { ascending: true });
        }

        const { data, error } = await query;

        if (error) throw error;

        const rows = data || [];
        all.push(...rows);

        if (rows.length < pageSize) break;
        from += pageSize;
      }

      return all;
    }

    try {
      const [techniqueRows, rankRows] = await Promise.all([
        fetchAllRows(
          "shinobidex_techniques",
          "id,name,slug,summary,description,source_url,status,updated_at",
          "name"
        ),
        fetchAllRows(
          "anced_curated_ranks",
          "technique_id,total,rank,range_label,users_label,class_label,structure_label,damage_label,status,updated_at"
        ),
      ]);

      const rankByTechniqueId = new Map(
        (rankRows || []).map((rank) => [rank.technique_id, rank])
      );

      const normalized = (techniqueRows || []).map((technique) => {
        const anced = rankByTechniqueId.get(technique.id) || null;

        return {
          ...technique,
          source: "shinobidex_v2",
          technique_source: "shinobidex_v2",
          anced,
          anced_curated_rank: anced?.rank || "",
          anced_rank: anced?.rank || "",
          wiki_rank: anced?.rank || "",
          rank: anced?.rank || "",
          anced_total: anced?.total ?? null,
          classification: anced?.class_label || "",
          nature: anced?.structure_label || "",
          raw_classification: anced?.class_label || "",
          raw_nature: anced?.structure_label || "",
          raw_type: anced?.damage_label || "",
          summary: technique.summary || technique.description || "",
        };
      });

      const sorted = normalized.sort((a, b) =>
        getTechniqueName(a).localeCompare(getTechniqueName(b), "pt-BR")
      );

      setShinobiDexTechniques(sorted);
    } catch (error) {
      setMessage(`Erro ao carregar técnicas da nova ShinobiDex: ${error.message}`);
    } finally {
      setIsLoadingTechniques(false);
    }
  }

  useEffect(() => {
    if (activeDossier === "Inventário" && shinobiDexTechniques.length === 0) {
      loadShinobiDexTechniques();
    }
  }, [activeDossier, shinobiDexTechniques.length]);


  async function persist(nextSheet, successMessage = "Ficha Complementar salva.") {
    setSheet(nextSheet);

    if (persistLocally) {
      saveProfileSheet(ninja, nextSheet);
    }

    setIsSyncingSheet(true);
    const error = await persistToSupabase(nextSheet);
    setIsSyncingSheet(false);

    if (error) {
      setMessage(`Salvo localmente, mas falhou no Supabase: ${error.message}`);
      return;
    }

    setMessage(successMessage);
  }

  function addRecord(section, draft, resetDraft, requiredField = "title") {
    if (!String(draft[requiredField] || "").trim()) {
      setMessage("Informe um título antes de adicionar.");
      return;
    }

    const nextSheet = {
      ...sheet,
      [section]: [
        {
          id: makeRecordId(),
          createdAt: new Date().toISOString(),
          ...draft,
        },
        ...(sheet[section] || []),
      ],
    };

    persist(nextSheet, "Registro adicionado.");
    resetDraft();
  }

  function removeRecord(section, id) {
    const nextSheet = {
      ...sheet,
      [section]: (sheet[section] || []).filter((item) => item.id !== id),
    };

    persist(nextSheet, "Registro removido.");
  }

  function updateNested(section, field, value) {
    const nextSheet = {
      ...sheet,
      [section]: {
        ...(sheet[section] || {}),
        [field]: value,
      },
    };

    persist(nextSheet);
  }

  function getInventoryObject() {
    const inventory = sheet.inventory || {};

    return {
      techniques: Array.isArray(inventory.techniques) ? inventory.techniques : [],
      equipment: Array.isArray(inventory.equipment) ? inventory.equipment : [],
      notes: typeof inventory.notes === "string" ? inventory.notes : "",
    };
  }

  function addInventoryItem(kind, draft, resetDraft, requiredField = "name") {
    if (!String(draft[requiredField] || "").trim()) {
      setMessage("Informe o nome antes de adicionar.");
      return;
    }

    const inventory = getInventoryObject();

    const nextSheet = {
      ...sheet,
      inventory: {
        ...inventory,
        [kind]: [
          {
            id: makeRecordId(),
            createdAt: new Date().toISOString(),
            ...draft,
          },
          ...(inventory[kind] || []),
        ],
      },
    };

    persist(nextSheet, "Item adicionado ao inventário.");
    resetDraft();
  }

  function removeInventoryItem(kind, id) {
    const inventory = getInventoryObject();

    const nextSheet = {
      ...sheet,
      inventory: {
        ...inventory,
        [kind]: (inventory[kind] || []).filter((item) => item.id !== id),
      },
    };

    persist(nextSheet, "Item removido do inventário.");
  }

  function updateInventoryNotes(value) {
    const inventory = getInventoryObject();

    const nextSheet = {
      ...sheet,
      inventory: {
        ...inventory,
        notes: value,
      },
    };

    persist(nextSheet, "Anotações do inventário salvas.");
  }

  function renderInventoryRecords(kind, emptyText, renderFields) {
    const inventory = getInventoryObject();
    const records = inventory[kind] || [];

    if (records.length === 0) {
      return <p className="mn-dossier-empty">{emptyText}</p>;
    }

    return (
      <div className="mn-dossier-records mn-inventory-records">
        {records.map((record) => (
          <details key={record.id} className="mn-dossier-record mn-inventory-record">
            <summary>
              <span>{record.name || "Item sem nome"}</span>
              {record.quantity && <small>Qtd. {record.quantity}</small>}
              {record.rank && <small>{record.rank}</small>}
            </summary>

            <div className="mn-dossier-record-body">
              {renderFields(record)}

              <button type="button" onClick={() => removeInventoryItem(kind, record.id)}>
                Remover
              </button>
            </div>
          </details>
        ))}
      </div>
    );
  }

  function handleProofImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setProofImageFile(null);
      setProofImagePreview("");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Use apenas imagens PNG, JPG/JPEG ou WEBP.");
      event.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage("A imagem precisa ter no máximo 5MB.");
      event.target.value = "";
      return;
    }

    setProofImageFile(file);
    setProofImagePreview(URL.createObjectURL(file));
    setMessage("");
  }


  function handleHiddenImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setHiddenImageFile(null);
      setHiddenImagePreview("");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Use apenas imagens PNG, JPG/JPEG ou WEBP.");
      event.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage("A imagem precisa ter no máximo 5MB.");
      event.target.value = "";
      return;
    }

    setHiddenImageFile(file);
    setHiddenImagePreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function handleAddHiddenActionRecord() {
    if (!String(hiddenDraft.title || "").trim()) {
      setMessage("Informe um título antes de adicionar.");
      return;
    }

    setIsUploadingHidden(true);

    try {
      let uploadedImage = null;

      if (hiddenImageFile) {
        uploadedImage = await uploadDossierImage(hiddenImageFile, ninja, "hidden-actions");
      }

      const record = {
        id: makeRecordId(),
        createdAt: new Date().toISOString(),
        title: hiddenDraft.title.trim(),
        status: hiddenDraft.status,
        imageUrl: uploadedImage?.imageUrl || "",
        imagePath: uploadedImage?.imagePath || "",
        imageName: uploadedImage?.imageName || "",
        imageSize: uploadedImage?.imageSize || "",
        imageType: uploadedImage?.imageType || "",
      };

      const nextSheet = {
        ...sheet,
        hiddenActions: [record, ...(sheet.hiddenActions || [])],
      };

      await persist(nextSheet, "Ação oculta adicionada.");
      setHiddenDraft({ title: "", imageUrl: "", status: "Não revelada" });
      setHiddenImageFile(null);
      setHiddenImagePreview("");
    } catch (error) {
      setMessage(`Erro ao enviar imagem: ${error.message}`);
    } finally {
      setIsUploadingHidden(false);
    }
  }

  async function handleAddProofRecord() {
    if (!String(proofDraft.title || "").trim()) {
      setMessage("Informe um título antes de adicionar.");
      return;
    }

    setIsUploadingProof(true);

    try {
      let uploadedImage = null;

      if (proofImageFile) {
        uploadedImage = await uploadDossierImage(proofImageFile, ninja, "proofs");
      }

      const record = {
        id: makeRecordId(),
        createdAt: new Date().toISOString(),
        title: proofDraft.title.trim(),
        notes: proofDraft.notes.trim(),
        imageUrl: uploadedImage?.imageUrl || "",
        imagePath: uploadedImage?.imagePath || "",
        imageName: uploadedImage?.imageName || "",
        imageSize: uploadedImage?.imageSize || "",
        imageType: uploadedImage?.imageType || "",
      };

      const nextSheet = {
        ...sheet,
        proofs: [record, ...(sheet.proofs || [])],
      };

      await persist(nextSheet, "Prova adicionada.");
      setProofDraft({ title: "", imageUrl: "", notes: "" });
      setProofImageFile(null);
      setProofImagePreview("");
    } catch (error) {
      setMessage(`Erro ao enviar imagem: ${error.message}`);
    } finally {
      setIsUploadingProof(false);
    }
  }


  function renderRecords(section, emptyText) {
    const records = sheet[section] || [];

    if (records.length === 0) {
      return <p className="mn-dossier-empty">{emptyText}</p>;
    }

    return (
      <div className="mn-dossier-records">
        {records.map((record) => (
          <details key={record.id} className="mn-dossier-record">
            <summary>
              <span>{record.title || "Registro sem título"}</span>
              {"status" in record && <small>{record.status}</small>}
            </summary>

            <div className="mn-dossier-record-body">
              {record.description && <p>{record.description}</p>}
              {record.notes && <p>{record.notes}</p>}

              {record.imageUrl && (
                <a className="mn-dossier-record-image" href={record.imageUrl} target="_blank" rel="noreferrer">
                  <img src={record.imageUrl} alt={record.title || "Imagem do registro"} />
                  <span>Abrir imagem</span>
                </a>
              )}

              <button type="button" onClick={() => removeRecord(section, record.id)}>
                Remover
              </button>
            </div>
          </details>
        ))}
      </div>
    );
  }

  if (activeDossier === "Registro de Provas") {
    return (
      <div className="mn-dossier-editor">
        {isSyncingSheet && <p className="mn-sheet-message">Sincronizando ficha...</p>}
        <h4>Registro de Provas</h4>
        <p>Registre treinos, cenas, prints, aprovações e decisões do mestre. A imagem é enviada para o Storage e a ficha salva apenas o link.</p>

        <div className="mn-dossier-form">
          <label>
            Título da prova
            <input
              value={proofDraft.title}
              onChange={(e) => setProofDraft({ ...proofDraft, title: e.target.value })}
              placeholder="Ex: Treino aprovado"
            />
          </label>

          <div className="mn-file-field">
            <span>Inserir imagem</span>

            <label className="mn-file-picker">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleProofImageChange}
              />
              <span>Selecionar imagem</span>
            </label>

            {proofImageFile && (
              <button
                type="button"
                className="mn-file-clear"
                onClick={() => {
                  setProofImageFile(null);
                  setProofImagePreview("");
                }}
              >
                Remover imagem
              </button>
            )}
          </div>

          {proofImagePreview && (
            <div className="mn-dossier-image-preview mn-dossier-wide">
              <img src={proofImagePreview} alt="Preview da prova" />
              <span>{proofImageFile?.name}</span>
            </div>
          )}

          <label className="mn-dossier-wide">
            Observações
            <textarea
              rows={3}
              value={proofDraft.notes}
              onChange={(e) => setProofDraft({ ...proofDraft, notes: e.target.value })}
              placeholder="Observações sobre a aprovação, cena ou decisão..."
            />
          </label>

          <button
            type="button"
            className="mn-primary-button"
            onClick={handleAddProofRecord}
            disabled={isUploadingProof}
          >
            {isUploadingProof ? "Enviando imagem..." : "Adicionar prova"}
          </button>
        </div>

        {renderRecords("proofs", "Nenhuma prova registrada.")}
        {message && <p className="mn-sheet-message">{message}</p>}
      </div>
    );
  }

  if (activeDossier === "Ciência e Medicina") {
    return (
      <div className="mn-dossier-editor">
        <h4>Ciência e Medicina</h4>
        <p>Registre tipo sanguíneo, procedimentos, tratamentos e alterações médicas.</p>

        <div className="mn-dossier-form">
          <label>
            Tipo sanguíneo
            <input
              value={sheet.medical?.bloodType || ""}
              onChange={(e) => updateNested("medical", "bloodType", e.target.value)}
              placeholder="Ex: A+, O-, AB..."
            />
          </label>

          <label>
            Nome do procedimento
            <input value={procedureDraft.title} onChange={(e) => setProcedureDraft({ ...procedureDraft, title: e.target.value })} />
          </label>

          <label className="mn-dossier-wide">
            Descrição do procedimento
            <textarea rows={3} value={procedureDraft.description} onChange={(e) => setProcedureDraft({ ...procedureDraft, description: e.target.value })} />
          </label>

          <button
            type="button"
            className="mn-primary-button"
            onClick={() => {
              if (!procedureDraft.title.trim()) {
                setMessage("Informe o nome do procedimento.");
                return;
              }

              const nextSheet = {
                ...sheet,
                medical: {
                  ...(sheet.medical || {}),
                  procedures: [
                    {
                      id: makeRecordId(),
                      createdAt: new Date().toISOString(),
                      ...procedureDraft,
                    },
                    ...((sheet.medical || {}).procedures || []),
                  ],
                },
              };

              persist(nextSheet, "Procedimento adicionado.");
              setProcedureDraft({ title: "", description: "" });
            }}
          >
            Adicionar procedimento
          </button>
        </div>

        {(sheet.medical?.procedures || []).length === 0 ? (
          <p className="mn-dossier-empty">Nenhum procedimento registrado.</p>
        ) : (
          <div className="mn-dossier-records">
            {(sheet.medical?.procedures || []).map((record) => (
              <details key={record.id} className="mn-dossier-record">
                <summary><span>{record.title}</span></summary>
                <div className="mn-dossier-record-body">
                  <p>{record.description || "Sem descrição."}</p>
                </div>
              </details>
            ))}
          </div>
        )}

        {message && <p className="mn-sheet-message">{message}</p>}
      </div>
    );
  }

  if (activeDossier === "Contratos e Vínculos") {
    return (
      <div className="mn-dossier-editor">
        <h4>Contratos e Vínculos</h4>
        <p>Registre invocações, contratos especiais e vínculos narrativos.</p>

        <div className="mn-dossier-form">
          <label>
            Invocação Mestre
            <input value={sheet.contracts?.masterSummon || ""} onChange={(e) => updateNested("contracts", "masterSummon", e.target.value)} />
          </label>

          <label>
            Invocação secundária
            <input value={sheet.contracts?.secondarySummon || ""} onChange={(e) => updateNested("contracts", "secondarySummon", e.target.value)} />
          </label>

          <label className="mn-dossier-wide">
            Casos Especiais
            <textarea rows={4} value={sheet.contracts?.specialCases || ""} onChange={(e) => updateNested("contracts", "specialCases", e.target.value)} />
          </label>
        </div>

        {message && <p className="mn-sheet-message">{message}</p>}
      </div>
    );
  }

  if (activeDossier === "Inventário") {
    const inventoryTabs = [
      ["techniques", "Técnicas"],
      ["equipment", "Equipamentos"],
    ];

    const inventory = getInventoryObject();

    return (
      <div className="mn-dossier-editor mn-inventory-editor">
        {isSyncingSheet && <p className="mn-sheet-message">Sincronizando ficha...</p>}

        <h4>Inventário</h4>
        <p>
          Inventário sem raridade. Registre técnicas, equipamentos, consumíveis, recursos e itens especiais em gavetas organizadas.
        </p>

        <div className="mn-inventory-tabs">
          {inventoryTabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={activeInventoryTab === id ? "is-active" : ""}
              onClick={() => setActiveInventoryTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {activeInventoryTab === "techniques" && (
          <div className="mn-inventory-panel">
            <div className="mn-dossier-form">
              <div className="mn-dossier-wide mn-technique-picker">
                <label>
                  Buscar técnica na ShinobiDex
                  <input
                    value={techniqueSearch}
                    onChange={(e) => {
                      setTechniqueSearch(e.target.value);
                      setTechniqueDraft((current) => ({ ...current, techniqueId: "" }));
                    }}
                    placeholder="Digite nome, rank, natureza ou classificação..."
                  />
                </label>

                <div className="mn-technique-search-status">
                  {isLoadingTechniques ? (
                    <span>Carregando técnicas da ShinobiDex...</span>
                  ) : (
                    <span>{shinobiDexTechniques.length} técnicas disponíveis</span>
                  )}

                  <button type="button" onClick={loadShinobiDexTechniques}>
                    Atualizar
                  </button>
                </div>

                <div className="mn-technique-search-results">
                  {!techniqueSearch.trim() ? (
                    <p>Digite no campo acima para procurar uma técnica.</p>
                  ) : visibleShinobiDexTechniques.length === 0 ? (
                    <p>Nenhuma técnica encontrada com esse termo.</p>
                  ) : (
                    visibleShinobiDexTechniques.map((technique) => {
                      const isSelected =
                        String(techniqueDraft.techniqueId) === String(technique.id);

                      return (
                        <button
                          key={technique.id}
                          type="button"
                          className={isSelected ? "is-selected" : ""}
                          onClick={() => {
                            setTechniqueDraft((current) => ({
                              ...current,
                              techniqueId: String(technique.id),
                            }));
                            setTechniqueSearch(getTechniqueName(technique));
                          }}
                        >
                          <strong>{getTechniqueName(technique)}</strong>
                          <small>{getTechniqueMeta(technique) || "Sem metadados identificados"}</small>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedTechnique && (
                  <div className="mn-selected-technique-preview">
                    <span>Técnica selecionada</span>
                    <strong>{getTechniqueName(selectedTechnique)}</strong>
                    <small>{getTechniqueMeta(selectedTechnique) || "Sem metadados identificados"}</small>
                  </div>
                )}
              </div>

              <label className="mn-dossier-wide">
                Como adquiriu
                <textarea
                  rows={3}
                  value={techniqueDraft.acquisition}
                  onChange={(e) =>
                    setTechniqueDraft({ ...techniqueDraft, acquisition: e.target.value })
                  }
                  placeholder="Ex.: ensinada por um mestre, treino aprovado, recompensa de missão, compra, busca narrada..."
                />
              </label>

              <label>
                Data de aquisição
                <input
                  type="date"
                  value={techniqueDraft.acquiredAt}
                  onChange={(e) =>
                    setTechniqueDraft({ ...techniqueDraft, acquiredAt: e.target.value })
                  }
                />
              </label>

              <button
                type="button"
                className="mn-primary-button"
                onClick={() => {
                  if (!selectedTechnique) {
                    setMessage("Selecione uma técnica da ShinobiDex.");
                    return;
                  }

                  if (!techniqueDraft.acquisition.trim()) {
                    setMessage("Informe como a técnica foi adquirida.");
                    return;
                  }

                  if (!techniqueDraft.acquiredAt) {
                    setMessage("Informe a data de aquisição.");
                    return;
                  }

                  addInventoryItem(
                    "techniques",
                    {
                      techniqueId: String(selectedTechnique.id),
                      name: getTechniqueName(selectedTechnique),
                      rank: getTechniqueRank(selectedTechnique),
                      classification: selectedTechnique.classification || "",
                      nature: selectedTechnique.nature || "",
                      status: selectedTechnique.status || "",
                      meta: getTechniqueMeta(selectedTechnique),
                      summary: selectedTechnique.summary || "",
                      acquisition: techniqueDraft.acquisition.trim(),
                      acquiredAt: techniqueDraft.acquiredAt,
                    },
                    () => {
                      setTechniqueDraft({ techniqueId: "", acquisition: "", acquiredAt: "" });
                      setTechniqueSearch("");
                    }
                  );
                }}
              >
                Adicionar Técnica
              </button>
            </div>

            {renderInventoryRecords("techniques", "Nenhuma técnica registrada.", (record) => (
              <>
                {record.rank && <p><strong>Rank:</strong> {record.rank}</p>}
                {record.classification && <p><strong>Classificação:</strong> {record.classification}</p>}
                {record.nature && <p><strong>Natureza:</strong> {record.nature}</p>}
                {record.acquiredAt && <p><strong>Data de aquisição:</strong> {record.acquiredAt}</p>}
                {record.acquisition && <p><strong>Como adquiriu:</strong> {record.acquisition}</p>}
                {record.summary && <p>{record.summary}</p>}
              </>
            ))}
          </div>
        )}

        {activeInventoryTab === "equipment" && (
          <div className="mn-inventory-panel">
            <div className="mn-dossier-form">
              <label>
                Nome do equipamento
                <input
                  value={equipmentDraft.name}
                  onChange={(e) => setEquipmentDraft({ ...equipmentDraft, name: e.target.value })}
                  placeholder="Ex: Kunai, Tanto, Máscara..."
                />
              </label>

              <label>
                Quantidade
                <input
                  value={equipmentDraft.quantity}
                  onChange={(e) => setEquipmentDraft({ ...equipmentDraft, quantity: e.target.value })}
                />
              </label>

              <label>
                Origem
                <input
                  value={equipmentDraft.origin}
                  onChange={(e) => setEquipmentDraft({ ...equipmentDraft, origin: e.target.value })}
                  placeholder="Compra, missão, recompensa..."
                />
              </label>

              <label className="mn-dossier-wide">
                Descrição
                <textarea
                  rows={3}
                  value={equipmentDraft.description}
                  onChange={(e) => setEquipmentDraft({ ...equipmentDraft, description: e.target.value })}
                />
              </label>

              <button
                type="button"
                className="mn-primary-button"
                onClick={() =>
                  addInventoryItem(
                    "equipment",
                    equipmentDraft,
                    () => setEquipmentDraft({ name: "", quantity: "1", description: "", origin: "" })
                  )
                }
              >
                Adicionar equipamento
              </button>
            </div>

            {renderInventoryRecords("equipment", "Nenhum equipamento registrado.", (record) => (
              <>
                {record.origin && <p><strong>Origem:</strong> {record.origin}</p>}
                {record.description && <p>{record.description}</p>}
              </>
            ))}
          </div>
        )}

        {activeInventoryTab === "consumables" && (
          <div className="mn-inventory-panel">
            <div className="mn-dossier-form">
              <label>
                Nome do consumível
                <input
                  value={consumableDraft.name}
                  onChange={(e) => setConsumableDraft({ ...consumableDraft, name: e.target.value })}
                  placeholder="Ex: Pílula, antídoto, pergaminho..."
                />
              </label>

              <label>
                Quantidade
                <input
                  value={consumableDraft.quantity}
                  onChange={(e) => setConsumableDraft({ ...consumableDraft, quantity: e.target.value })}
                />
              </label>

              <label>
                Origem
                <input
                  value={consumableDraft.origin}
                  onChange={(e) => setConsumableDraft({ ...consumableDraft, origin: e.target.value })}
                />
              </label>

              <label className="mn-dossier-wide">
                Efeito / Uso
                <textarea
                  rows={3}
                  value={consumableDraft.effect}
                  onChange={(e) => setConsumableDraft({ ...consumableDraft, effect: e.target.value })}
                />
              </label>

              <button
                type="button"
                className="mn-primary-button"
                onClick={() =>
                  addInventoryItem(
                    "consumables",
                    consumableDraft,
                    () => setConsumableDraft({ name: "", quantity: "1", effect: "", origin: "" })
                  )
                }
              >
                Adicionar consumível
              </button>
            </div>

            {renderInventoryRecords("consumables", "Nenhum consumível registrado.", (record) => (
              <>
                {record.origin && <p><strong>Origem:</strong> {record.origin}</p>}
                {record.effect && <p>{record.effect}</p>}
              </>
            ))}
          </div>
        )}

        {activeInventoryTab === "resources" && (
          <div className="mn-inventory-panel">
            <div className="mn-dossier-form">
              <label>
                Nome do recurso
                <input
                  value={resourceDraft.name}
                  onChange={(e) => setResourceDraft({ ...resourceDraft, name: e.target.value })}
                  placeholder="Ex: Ryō, material raro, documento..."
                />
              </label>

              <label>
                Quantidade / Valor
                <input
                  value={resourceDraft.quantity}
                  onChange={(e) => setResourceDraft({ ...resourceDraft, quantity: e.target.value })}
                />
              </label>

              <label className="mn-dossier-wide">
                Descrição
                <textarea
                  rows={3}
                  value={resourceDraft.description}
                  onChange={(e) => setResourceDraft({ ...resourceDraft, description: e.target.value })}
                />
              </label>

              <button
                type="button"
                className="mn-primary-button"
                onClick={() =>
                  addInventoryItem(
                    "resources",
                    resourceDraft,
                    () => setResourceDraft({ name: "", quantity: "", description: "" })
                  )
                }
              >
                Adicionar recurso
              </button>
            </div>

            {renderInventoryRecords("resources", "Nenhum recurso registrado.", (record) => (
              <>
                {record.description && <p>{record.description}</p>}
              </>
            ))}
          </div>
        )}

        {activeInventoryTab === "specialItems" && (
          <div className="mn-inventory-panel">
            <div className="mn-dossier-form">
              <label>
                Nome do item especial
                <input
                  value={specialItemDraft.name}
                  onChange={(e) => setSpecialItemDraft({ ...specialItemDraft, name: e.target.value })}
                />
              </label>

              <label>
                Origem
                <input
                  value={specialItemDraft.origin}
                  onChange={(e) => setSpecialItemDraft({ ...specialItemDraft, origin: e.target.value })}
                />
              </label>

              <label className="mn-dossier-wide">
                Descrição
                <textarea
                  rows={3}
                  value={specialItemDraft.description}
                  onChange={(e) => setSpecialItemDraft({ ...specialItemDraft, description: e.target.value })}
                />
              </label>

              <label className="mn-dossier-wide">
                Observação administrativa
                <textarea
                  rows={3}
                  value={specialItemDraft.adminNote}
                  onChange={(e) => setSpecialItemDraft({ ...specialItemDraft, adminNote: e.target.value })}
                />
              </label>

              <button
                type="button"
                className="mn-primary-button"
                onClick={() =>
                  addInventoryItem(
                    "specialItems",
                    specialItemDraft,
                    () => setSpecialItemDraft({ name: "", description: "", origin: "", adminNote: "" })
                  )
                }
              >
                Adicionar item especial
              </button>
            </div>

            {renderInventoryRecords("specialItems", "Nenhum item especial registrado.", (record) => (
              <>
                {record.origin && <p><strong>Origem:</strong> {record.origin}</p>}
                {record.description && <p>{record.description}</p>}
                {record.adminNote && <p><strong>Obs. ADM:</strong> {record.adminNote}</p>}
              </>
            ))}
          </div>
        )}

        <label className="mn-inventory-notes">
          Anotações gerais do inventário
          <textarea
            rows={3}
            value={inventory.notes || ""}
            onChange={(e) => updateInventoryNotes(e.target.value)}
            placeholder="Observações gerais, pendências, detalhes administrativos..."
          />
        </label>

        {message && <p className="mn-sheet-message">{message}</p>}
      </div>
    );
  }

  if (activeDossier === "Atividades e Missões") {
    return (
      <div className="mn-dossier-editor">
        <h4>Atividades e Missões</h4>
        <p>Missões não precisam de status. Registre apenas título e descrição.</p>

        <div className="mn-dossier-form">
          <label>
            Título da missão/atividade
            <input value={missionDraft.title} onChange={(e) => setMissionDraft({ ...missionDraft, title: e.target.value })} />
          </label>

          <label className="mn-dossier-wide">
            Descrição
            <textarea rows={3} value={missionDraft.description} onChange={(e) => setMissionDraft({ ...missionDraft, description: e.target.value })} />
          </label>

          <button
            type="button"
            className="mn-primary-button"
            onClick={() => addRecord("missions", missionDraft, () => setMissionDraft({ title: "", description: "" }))}
          >
            Adicionar missão
          </button>
        </div>

        {renderRecords("missions", "Nenhuma missão registrada.")}
        {message && <p className="mn-sheet-message">{message}</p>}
      </div>
    );
  }

  if (activeDossier === "Status do Personagem") {
    return (
      <div className="mn-dossier-editor">
        <h4>Status do Personagem</h4>
        <p>Registre os atributos atuais do personagem. Use números nos campos principais e texto livre apenas em Outros Atributos.</p>

        <div className="mn-dossier-form mn-status-grid">
          <label>
            Chakra total
            <input
              type="number"
              inputMode="numeric"
              value={sheet.status?.chakraTotal || ""}
              onChange={(e) => updateNested("status", "chakraTotal", e.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            Estamina total
            <input
              type="number"
              inputMode="numeric"
              value={sheet.status?.staminaTotal || ""}
              onChange={(e) => updateNested("status", "staminaTotal", e.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            Recuperação Chakra
            <input
              type="number"
              inputMode="numeric"
              value={sheet.status?.chakraRecovery || ""}
              onChange={(e) => updateNested("status", "chakraRecovery", e.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            Recuperação Estamina
            <input
              type="number"
              inputMode="numeric"
              value={sheet.status?.staminaRecovery || ""}
              onChange={(e) => updateNested("status", "staminaRecovery", e.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            Velocidade
            <input
              type="number"
              inputMode="numeric"
              value={sheet.status?.speed || ""}
              onChange={(e) => updateNested("status", "speed", e.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            Percepção
            <input
              type="number"
              inputMode="numeric"
              value={sheet.status?.perception || ""}
              onChange={(e) => updateNested("status", "perception", e.target.value)}
              placeholder="0"
            />
          </label>

          <label className="mn-dossier-wide">
            Outros Atributos
            <textarea
              rows={4}
              value={sheet.status?.otherAttributes || ""}
              onChange={(e) => updateNested("status", "otherAttributes", e.target.value)}
              placeholder="Registre outros atributos, bônus, reduções, condições especiais ou observações."
            />
          </label>
        </div>

        {message && <p className="mn-sheet-message">{message}</p>}
      </div>
    );
  }

  if (activeDossier === "Ações Ocultas") {
    return (
      <div className="mn-dossier-editor">
        <h4>Ações Ocultas</h4>
        <p>Registre apenas título, imagem e status de revelação.</p>

        <div className="mn-dossier-form">
          <label>
            Título
            <input value={hiddenDraft.title} onChange={(e) => setHiddenDraft({ ...hiddenDraft, title: e.target.value })} />
          </label>

          <label>
            Status
            <select value={hiddenDraft.status} onChange={(e) => setHiddenDraft({ ...hiddenDraft, status: e.target.value })}>
              <option>Não revelada</option>
              <option>Parcialmente revelada</option>
              <option>Revelada</option>
            </select>
          </label>

          <div className="mn-file-field mn-dossier-wide">
            <span>Inserir imagem</span>

            <label className="mn-file-picker">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleHiddenImageChange}
              />
              <span>Selecionar imagem</span>
            </label>

            {hiddenImageFile && (
              <button
                type="button"
                className="mn-file-clear"
                onClick={() => {
                  setHiddenImageFile(null);
                  setHiddenImagePreview("");
                }}
              >
                Remover imagem
              </button>
            )}
          </div>

          {hiddenImagePreview && (
            <div className="mn-dossier-image-preview mn-dossier-wide">
              <img src={hiddenImagePreview} alt="Preview da ação oculta" />
              <span>{hiddenImageFile?.name}</span>
            </div>
          )}

          <button
            type="button"
            className="mn-primary-button"
            onClick={handleAddHiddenActionRecord}
            disabled={isUploadingHidden}
          >
            {isUploadingHidden ? "Enviando imagem..." : "Adicionar ação oculta"}
          </button>
        </div>

        {renderRecords("hiddenActions", "Nenhuma ação oculta registrada.")}
        {message && <p className="mn-sheet-message">{message}</p>}
      </div>
    );
  }

  if (activeDossier === "Desenvolvimento Narrativo") {
    return (
      <div className="mn-dossier-editor">
        <h4>Desenvolvimento Narrativo</h4>
        <p>Registre a construção pessoal do personagem: motivações, personalidade, hábitos, gostos, medos e defeitos.</p>

        <div className="mn-dossier-form mn-development-grid">
          <label className="mn-dossier-wide">
            Motivação
            <textarea
              rows={3}
              value={sheet.development?.motivation || ""}
              onChange={(e) => updateNested("development", "motivation", e.target.value)}
            />
          </label>

          <label className="mn-dossier-wide">
            Personalidade
            <textarea
              rows={3}
              value={sheet.development?.personality || ""}
              onChange={(e) => updateNested("development", "personality", e.target.value)}
            />
          </label>

          <label className="mn-dossier-wide">
            Desenvolvimento
            <textarea
              rows={4}
              value={sheet.development?.development || ""}
              onChange={(e) => updateNested("development", "development", e.target.value)}
            />
          </label>

          <label>
            Manias
            <textarea
              rows={3}
              value={sheet.development?.habits || ""}
              onChange={(e) => updateNested("development", "habits", e.target.value)}
            />
          </label>

          <label>
            Peculiaridades
            <textarea
              rows={3}
              value={sheet.development?.peculiarities || ""}
              onChange={(e) => updateNested("development", "peculiarities", e.target.value)}
            />
          </label>

          <label>
            Comidas Preferidas
            <textarea
              rows={3}
              value={sheet.development?.favoriteFoods || ""}
              onChange={(e) => updateNested("development", "favoriteFoods", e.target.value)}
            />
          </label>

          <label>
            Comidas que não gosta
            <textarea
              rows={3}
              value={sheet.development?.dislikedFoods || ""}
              onChange={(e) => updateNested("development", "dislikedFoods", e.target.value)}
            />
          </label>

          <label>
            Medos
            <textarea
              rows={3}
              value={sheet.development?.fears || ""}
              onChange={(e) => updateNested("development", "fears", e.target.value)}
            />
          </label>

          <label>
            Defeitos
            <textarea
              rows={3}
              value={sheet.development?.flaws || ""}
              onChange={(e) => updateNested("development", "flaws", e.target.value)}
            />
          </label>
        </div>

        {message && <p className="mn-sheet-message">{message}</p>}
      </div>
    );
  }

  return null;
}


function InfoCard({ title, icon, rows, className = "" }) {
  return (
    <article className={`mn-card mn-info-card ${className}`}>
      <div className="mn-info-title">
        <SvgIcon name={icon} className="mn-small-icon" />
        {title}
      </div>
      <ul className="mn-info-list">
        {rows.map(([label, value]) => (
          <li key={label}>
            <span>{label}</span>
            <strong>{cleanValue(value)}</strong>
          </li>
        ))}
      </ul>
    </article>
  );
}



function FightingStyleControl({
  ninja,
  onRegister,
}) {
  const fightingStyles = normalizeFightingStyles(
    ninja?.fightingStyles ||
    ninja?.fighting_styles ||
    []
  );

  const ninjaStyleSelections = normalizeNinjaStyleSelections(
    ninja?.ninjaStyleSelections ||
    ninja?.ninja_style_selections ||
    []
  );

  const registeredKeys = new Set(
    fightingStyles.map((item) => item.styleKey)
  );

  const availableToLearn = FIGHTING_STYLE_CATALOG.filter(
    (item) => !registeredKeys.has(item.key)
  );

  const awaitingProficiency = fightingStyles.filter(
    (item) => !item.hasProficiency
  );

  const hasProficiency = fightingStyles.some(
    (item) => item.hasProficiency
  );

  const [formMode, setFormMode] = useState("");
  const [fightingStyleKey, setFightingStyleKey] = useState("");
  const [styleKey, setStyleKey] = useState("");
  const [abilityKey, setAbilityKey] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedFightingStyle = getFightingStyle(
    fightingStyleKey
  );

  const nextOptions = getNextNinjaStyleOptions(
    ninjaStyleSelections
  );

  const allowedStyleOptions = selectedFightingStyle
    ? getFightingStyleStyleOptions(
        selectedFightingStyle.key
      ).map((styleOption) => {
        const progressionOption = nextOptions.find(
          (option) => option.styleKey === styleOption.key
        );

        return {
          ...styleOption,
          progressionOption,
        };
      })
    : [];

  const selectedStyleOption = allowedStyleOptions.find(
    (option) => option.key === styleKey
  ) || null;

  const selectedProgression =
    selectedStyleOption?.progressionOption || null;

  const abilities = selectedProgression
    ? getNinjaStyleAbilities(
        selectedProgression.styleKey,
        selectedProgression.level
      )
    : [];

  const proficiencyNeedsNinjaStyle =
    formMode === "proficiency" &&
    (selectedFightingStyle?.allowedStyleKeys?.length || 0) > 0;

  function resetForm() {
    setFormMode("");
    setFightingStyleKey("");
    setStyleKey("");
    setAbilityKey("");
    setMessage("");
  }

  function openForm(mode) {
    setFormMode(mode);
    setFightingStyleKey("");
    setStyleKey("");
    setAbilityKey("");
    setMessage("");
  }

  function closeForm() {
    if (isSaving) return;
    resetForm();
  }

  async function handleConfirm() {
    if (!selectedFightingStyle) {
      setMessage("Escolha o Estilo de Luta.");
      return;
    }

    if (formMode === "proficiency") {
      if (hasProficiency) {
        setMessage(
          "Este personagem já possui uma proficiência de Estilo de Luta registrada."
        );
        return;
      }

      if (proficiencyNeedsNinjaStyle && !selectedProgression) {
        setMessage(
          "Escolha um E.N. válido fornecido por este Estilo de Luta."
        );
        return;
      }

      if (proficiencyNeedsNinjaStyle && !abilityKey) {
        setMessage(
          "Escolha a habilidade do novo nível de E.N."
        );
        return;
      }
    }

    setIsSaving(true);
    setMessage("");

    try {
      await onRegister?.({
        fightingStyleKey: selectedFightingStyle.key,
        gainProficiency: formMode === "proficiency",
        styleKey: selectedProgression?.styleKey || "",
        abilityKey: abilityKey || "",
      });

      const successMessage =
        formMode === "proficiency"
          ? `Proficiência em ${selectedFightingStyle.name} registrada com sucesso.`
          : `${selectedFightingStyle.name} adicionado à ficha.`;

      setFormMode("");
      setFightingStyleKey("");
      setStyleKey("");
      setAbilityKey("");
      setMessage(successMessage);
    } catch (error) {
      setMessage(
        error?.message ||
        "Não foi possível registrar o Estilo de Luta."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mn-fighting-style-control">
      <div className="mn-fighting-style-summary">
        <div>
          <span>Estilos aprendidos</span>
          <strong>{fightingStyles.length}/2</strong>
        </div>

        <div>
          <span>Proficiência</span>
          <strong>{hasProficiency ? "1/1" : "0/1"}</strong>
        </div>
      </div>

      {fightingStyles.length > 0 ? (
        <div className="mn-fighting-style-list">
          {fightingStyles.map((item) => (
            <article key={item.styleKey} className="mn-fighting-style-item">
              <div>
                <strong>{item.styleName}</strong>
                <small>
                  {item.hasProficiency
                    ? "Proficiência conquistada"
                    : "Aprendido — sem proficiência"}
                </small>
              </div>

              {item.hasProficiency && (
                <span>
                  {item.ninjaStyleName && item.ninjaStyleLevel
                    ? `E.N. ${item.ninjaStyleName} ${item.ninjaStyleLevel}`
                    : "Sem E.N. próprio"}
                </span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mn-fighting-style-empty">
          Nenhum Estilo de Luta registrado.
        </p>
      )}

      <div className="mn-fighting-style-actions">
        <button
          type="button"
          className="mn-sage-mode-add-button"
          disabled={
            isSaving ||
            fightingStyles.length >= 2 ||
            availableToLearn.length === 0
          }
          onClick={() => openForm("learn")}
        >
          Adicionar Estilo de Luta
        </button>

        <button
          type="button"
          className="mn-style-acquire-button"
          disabled={
            isSaving ||
            hasProficiency ||
            awaitingProficiency.length === 0
          }
          onClick={() => openForm("proficiency")}
        >
          Registrar proficiência
        </button>
      </div>

      <p className="mn-sage-mode-help">
        O personagem pode aprender até dois Estilos de Luta. Os bônus e o E.N.
        do Estilo só são liberados quando a proficiência é registrada.
      </p>

      {formMode && (
        <div className="mn-style-acquisition-form mn-fighting-style-form">
          <label>
            {formMode === "proficiency"
              ? "Estilo que recebeu proficiência"
              : "Estilo de Luta aprendido"}
            <select
              value={fightingStyleKey}
              onChange={(event) => {
                setFightingStyleKey(event.target.value);
                setStyleKey("");
                setAbilityKey("");
                setMessage("");
              }}
            >
              <option value="">Selecione</option>
              {(formMode === "proficiency"
                ? awaitingProficiency.map((item) => getFightingStyle(item.styleKey)).filter(Boolean)
                : availableToLearn
              ).map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {selectedFightingStyle?.requirements && (
            <div className="mn-fighting-style-requirements">
              <strong>Requisitos do sistema</strong>
              <p>{selectedFightingStyle.requirements}</p>
            </div>
          )}

          {formMode === "proficiency" &&
            selectedFightingStyle &&
            selectedFightingStyle.allowedStyleKeys.length === 0 && (
              <div className="mn-style-ability-preview">
                <strong>Proficiência sem novo E.N.</strong>
                <p>
                  Este Estilo de Luta possui proficiência e bônus próprios, mas
                  o sistema enviado não determina um Estilo Ninja adicional.
                </p>
              </div>
            )}

          {proficiencyNeedsNinjaStyle && (
            <label>
              Estilo Ninja recebido
              <select
                value={styleKey}
                onChange={(event) => {
                  setStyleKey(event.target.value);
                  setAbilityKey("");
                  setMessage("");
                }}
              >
                <option value="">Selecione</option>
                {allowedStyleOptions.map((styleOption) => (
                  <option
                    key={styleOption.key}
                    value={styleOption.key}
                    disabled={!styleOption.progressionOption}
                  >
                    {styleOption.name}
                    {styleOption.progressionOption
                      ? ` ${styleOption.progressionOption.level}`
                      : " — Nível 5 já alcançado"}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedProgression && (
            <label>
              Habilidade de {selectedProgression.styleName} {selectedProgression.level}
              <select
                value={abilityKey}
                onChange={(event) => {
                  setAbilityKey(event.target.value);
                  setMessage("");
                }}
              >
                <option value="">Selecione uma habilidade</option>
                {abilities.map((abilityItem) => (
                  <option key={abilityItem.key} value={abilityItem.key}>
                    {abilityItem.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedProgression && abilityKey && (
            <div className="mn-style-ability-preview">
              <strong>
                {abilities.find((item) => item.key === abilityKey)?.name}
              </strong>
              <p>
                {abilities.find((item) => item.key === abilityKey)?.summary}
              </p>
            </div>
          )}

          <div className="mn-style-acquisition-actions">
            <button
              type="button"
              className="mn-file-clear"
              disabled={isSaving}
              onClick={closeForm}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="mn-primary-button"
              disabled={
                isSaving ||
                !selectedFightingStyle ||
                (
                  proficiencyNeedsNinjaStyle &&
                  (!selectedProgression || !abilityKey)
                )
              }
              onClick={handleConfirm}
            >
              {isSaving
                ? "Salvando..."
                : formMode === "proficiency"
                  ? "Confirmar proficiência"
                  : "Confirmar Estilo de Luta"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="mn-style-progression-message">
          {message}
        </p>
      )}
    </div>
  );
}

function SageModeControl({
  ninja,
  onRegister,
}) {
  const selections = normalizeNinjaStyleSelections(
    ninja?.ninjaStyleSelections ||
    ninja?.ninja_style_selections ||
    []
  );

  const registeredType =
    ninja?.sageModeType ||
    ninja?.sage_mode_type ||
    "";

  const registeredKey =
    ninja?.sageModeKey ||
    ninja?.sage_mode_key ||
    "";

  const hasSageMode =
    Boolean(registeredType && registeredKey);

  const [isOpen, setIsOpen] = useState(false);
  const [sageModeType, setSageModeType] = useState("");
  const [sageModeKey, setSageModeKey] = useState("");
  const [styleKey, setStyleKey] = useState("");
  const [abilityKey, setAbilityKey] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const modes = sageModeType
    ? getSageModesByType(sageModeType)
    : [];

  const selectedMode = getSageMode(
    sageModeType,
    sageModeKey
  );

  const nextOptions = getNextNinjaStyleOptions(selections);

  const allowedStyleOptions = selectedMode
    ? getSageModeStyleOptions(
        sageModeType,
        sageModeKey
      ).map((styleOption) => {
        const progressionOption = nextOptions.find(
          (option) => option.styleKey === styleOption.key
        );

        return {
          ...styleOption,
          progressionOption,
        };
      })
    : [];

  const selectedStyleOption =
    allowedStyleOptions.find(
      (option) => option.key === styleKey
    ) || null;

  const selectedProgression =
    selectedStyleOption?.progressionOption || null;

  const abilities = selectedProgression
    ? getNinjaStyleAbilities(
        selectedProgression.styleKey,
        selectedProgression.level
      )
    : [];

  function resetForm() {
    setSageModeType("");
    setSageModeKey("");
    setStyleKey("");
    setAbilityKey("");
    setMessage("");
  }

  function closeForm() {
    if (isSaving) return;
    setIsOpen(false);
    resetForm();
  }

  async function handleRegister() {
    if (!sageModeType) {
      setMessage("Escolha se o Modo Sábio é Perfeito ou Imperfeito.");
      return;
    }

    if (!selectedMode) {
      setMessage("Escolha qual Modo Sábio foi adquirido.");
      return;
    }

    if (selectedMode.allowedStyleKeys.length === 0) {
      setMessage(
        selectedMode.unavailableReason ||
        "Este Modo Sábio ainda não possui E.N. configurado."
      );
      return;
    }

    if (!selectedProgression) {
      setMessage(
        "Escolha uma opção de E.N. que ainda possa ser iniciada ou evoluída."
      );
      return;
    }

    if (!abilityKey) {
      setMessage("Escolha a habilidade do novo nível de E.N.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await onRegister?.({
        sageModeType,
        sageModeKey,
        styleKey: selectedProgression.styleKey,
        abilityKey,
      });

      setMessage(
        `Modo Sábio ${getSageModeTypeLabel(sageModeType)} — ${selectedMode.name} registrado com sucesso.`
      );
      setIsOpen(false);
      resetForm();
    } catch (error) {
      setMessage(
        error?.message ||
        "Não foi possível registrar o Modo Sábio."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (hasSageMode) {
    return (
      <div className="mn-sage-mode-control is-registered">
        <div className="mn-sage-mode-registered">
          <span>Modo Sábio registrado</span>
          <strong>{formatSageMode(ninja)}</strong>
          <small>
            O Modo Sábio é permanente na ficha e não pode ser trocado pelo jogador.
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="mn-sage-mode-control">
      <div className="mn-sage-mode-status">
        <div>
          <span>Modo Sábio</span>
          <strong>Nenhum adquirido</strong>
        </div>

        <button
          type="button"
          className="mn-sage-mode-add-button"
          disabled={isSaving}
          onClick={() => {
            setIsOpen((current) => !current);
            setMessage("");
          }}
        >
          Adicionar Modo Sábio
        </button>
      </div>

      <p className="mn-sage-mode-help">
        Registre o Modo Sábio somente depois de conquistá-lo no RPG. O tipo e o
        animal definem quais Estilos Ninja podem ser recebidos.
      </p>

      {isOpen && (
        <div className="mn-style-acquisition-form mn-sage-mode-form">
          <label>
            Tipo de Modo Sábio
            <select
              value={sageModeType}
              onChange={(event) => {
                setSageModeType(event.target.value);
                setSageModeKey("");
                setStyleKey("");
                setAbilityKey("");
                setMessage("");
              }}
            >
              <option value="">Selecione</option>
              {SAGE_MODE_TYPES.map((type) => (
                <option key={type.key} value={type.key}>
                  Modo Sábio {type.name}
                </option>
              ))}
            </select>
          </label>

          {sageModeType && (
            <label>
              Modo Sábio adquirido
              <select
                value={sageModeKey}
                onChange={(event) => {
                  setSageModeKey(event.target.value);
                  setStyleKey("");
                  setAbilityKey("");
                  setMessage("");
                }}
              >
                <option value="">Selecione</option>
                {modes.map((modeItem) => (
                  <option
                    key={modeItem.key}
                    value={modeItem.key}
                    disabled={modeItem.allowedStyleKeys.length === 0}
                  >
                    {modeItem.name}
                    {modeItem.allowedStyleKeys.length === 0
                      ? " — E.N. ainda não definido"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedMode && selectedMode.allowedStyleKeys.length > 0 && (
            <label>
              Estilo Ninja recebido
              <select
                value={styleKey}
                onChange={(event) => {
                  setStyleKey(event.target.value);
                  setAbilityKey("");
                  setMessage("");
                }}
              >
                <option value="">Selecione</option>
                {allowedStyleOptions.map((styleOption) => (
                  <option
                    key={styleOption.key}
                    value={styleOption.key}
                    disabled={!styleOption.progressionOption}
                  >
                    {styleOption.name}
                    {styleOption.progressionOption
                      ? ` ${styleOption.progressionOption.level}`
                      : " — Nível 5 já alcançado"}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedProgression && (
            <label>
              Habilidade de {selectedProgression.styleName} {selectedProgression.level}
              <select
                value={abilityKey}
                onChange={(event) => {
                  setAbilityKey(event.target.value);
                  setMessage("");
                }}
              >
                <option value="">Selecione uma habilidade</option>
                {abilities.map((abilityItem) => (
                  <option key={abilityItem.key} value={abilityItem.key}>
                    {abilityItem.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedProgression && abilityKey && (
            <div className="mn-style-ability-preview">
              <strong>
                {abilities.find((item) => item.key === abilityKey)?.name}
              </strong>
              <p>
                {abilities.find((item) => item.key === abilityKey)?.summary}
              </p>
            </div>
          )}

          <div className="mn-style-acquisition-actions">
            <button
              type="button"
              className="mn-file-clear"
              disabled={isSaving}
              onClick={closeForm}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="mn-primary-button"
              disabled={
                isSaving ||
                !selectedMode ||
                !selectedProgression ||
                !abilityKey
              }
              onClick={handleRegister}
            >
              {isSaving
                ? "Registrando..."
                : "Confirmar Modo Sábio"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="mn-style-progression-message">
          {message}
        </p>
      )}
    </div>
  );
}

function NinjaStyleProgressionControl({
  ninja,
  onAcquire,
  onRemove,
}) {
  const selections =
    normalizeNinjaStyleSelections(
      ninja?.ninjaStyleSelections ||
      ninja?.ninja_style_selections ||
      []
    );

  const availableChoices =
    Math.max(
      0,
      Number(
        ninja?.availableNinjaStyleChoices ??
        ninja?.available_ninja_style_choices ??
        0
      ) || 0
    );

  const nextOptions =
    getNextNinjaStyleOptions(
      selections
    );

  const highestLevelByStyle = selections.reduce(
    (levels, selection) => {
      const styleKey = String(selection.style_key || "").trim();
      const level = Number(selection.level) || 0;

      if (styleKey && level > (levels[styleKey] || 0)) {
        levels[styleKey] = level;
      }

      return levels;
    },
    {}
  );

  const removableSelections = selections.filter(
    (selection) =>
      Number(selection.level) ===
      highestLevelByStyle[selection.style_key]
  );

  const [isOpen, setIsOpen] =
    useState(false);

  const [isRemoveOpen, setIsRemoveOpen] =
    useState(false);

  const [selectedOptionValue, setSelectedOptionValue] =
    useState("");

  const [abilityKey, setAbilityKey] =
    useState("");

  const [removeOptionValue, setRemoveOptionValue] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const selectedOption =
    nextOptions.find(
      (option) =>
        `${option.styleKey}:${option.level}` ===
        selectedOptionValue
    ) || null;

  const selectedStyle =
    getNinjaStyleDefinition(
      selectedOption?.styleKey
    );

  const abilities =
    selectedOption
      ? getNinjaStyleAbilities(
          selectedOption.styleKey,
          selectedOption.level
        )
      : [];

  const selectedRemoval =
    removableSelections.find(
      (selection) =>
        `${selection.style_key}:${selection.level}` ===
        removeOptionValue
    ) || null;

  const removalReturnsCredit =
    selectedRemoval && [
      "initial",
      "progression",
      "administrative",
    ].includes(selectedRemoval.acquisition_type);

  useEffect(() => {
    if (!selectedOptionValue) {
      return;
    }

    const optionStillExists =
      nextOptions.some(
        (option) =>
          `${option.styleKey}:${option.level}` ===
          selectedOptionValue
      );

    if (!optionStillExists) {
      setSelectedOptionValue("");
      setAbilityKey("");
    }
  }, [
    selectedOptionValue,
    ninja?.ninjaStyleSelections,
    ninja?.ninja_style_selections,
  ]);

  function closeAcquisition() {
    if (isSaving) {
      return;
    }

    setIsOpen(false);
    setSelectedOptionValue("");
    setAbilityKey("");
    setMessage("");
  }

  function closeRemoval() {
    if (isSaving) {
      return;
    }

    setIsRemoveOpen(false);
    setRemoveOptionValue("");
    setMessage("");
  }

  async function handleRemove() {
    if (!selectedRemoval) {
      setMessage(
        "Escolha qual E.N. deseja remover."
      );
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await onRemove?.({
        styleKey: selectedRemoval.style_key,
        level: selectedRemoval.level,
      });

      setMessage(
        `${selectedRemoval.style_name} ${selectedRemoval.level} removido com sucesso.`
      );

      setRemoveOptionValue("");
      setIsRemoveOpen(false);
    } catch (error) {
      setMessage(
        error?.message ||
        "Não foi possível remover o E.N."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAcquire() {
    if (availableChoices <= 0) {
      setMessage(
        "Você ainda não possui um novo E.N. disponível."
      );
      return;
    }

    if (!selectedOption) {
      setMessage(
        "Escolha qual Estilo Ninja deseja iniciar ou evoluir."
      );
      return;
    }

    if (!abilityKey) {
      setMessage(
        "Escolha uma habilidade para o novo nível."
      );
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await onAcquire?.({
        styleKey:
          selectedOption.styleKey,

        abilityKey,
      });

      setMessage(
        `${selectedStyle?.shortName || selectedStyle?.name || "Estilo Ninja"} ${selectedOption.level} adquirido com sucesso.`
      );

      setSelectedOptionValue("");
      setAbilityKey("");
      setIsOpen(false);
    } catch (error) {
      setMessage(
        error?.message ||
        "Não foi possível adquirir o novo E.N."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mn-style-progression-control">
      <div className="mn-style-progression-status">
        <div>
          <span>Novos E.N. disponíveis</span>
          <strong>{availableChoices}</strong>
        </div>

        <div className="mn-style-progression-buttons">
          <button
            type="button"
            className="mn-style-acquire-button"
            disabled={
              availableChoices <= 0 ||
              nextOptions.length === 0 ||
              isSaving
            }
            onClick={() => {
              setIsOpen((current) => !current);
              setIsRemoveOpen(false);
              setRemoveOptionValue("");
              setMessage("");
            }}
          >
            {nextOptions.length === 0
              ? "Progressão máxima alcançada"
              : "Adquirir novo E.N."}
          </button>

          <button
            type="button"
            className="mn-style-remove-button"
            disabled={
              removableSelections.length === 0 ||
              isSaving
            }
            onClick={() => {
              setIsRemoveOpen((current) => !current);
              setIsOpen(false);
              setSelectedOptionValue("");
              setAbilityKey("");
              setMessage("");
            }}
          >
            Remover E.N.
          </button>
        </div>
      </div>

      <p className="mn-style-progression-help">
        Ao receber um crédito de evolução, você pode iniciar um Estilo no Nível 1
        ou avançar para o próximo nível de um Estilo que já possui. Não é
        possível pular níveis.
      </p>

      {isOpen && (
        <div className="mn-style-acquisition-form">
          <label>
            Estilo e próximo nível
            <select
              value={selectedOptionValue}
              onChange={(event) => {
                setSelectedOptionValue(
                  event.target.value
                );
                setAbilityKey("");
                setMessage("");
              }}
            >
              <option value="">
                Selecione
              </option>

              {nextOptions.map((option) => (
                <option
                  key={`${option.styleKey}-${option.level}`}
                  value={`${option.styleKey}:${option.level}`}
                >
                  {option.styleName} {option.level}
                  {option.isNewStyle
                    ? " — iniciar Estilo"
                    : " — continuar Estilo"}
                </option>
              ))}
            </select>
          </label>

          {selectedOption && (
            <label>
              Habilidade de {selectedOption.styleName} {selectedOption.level}
              <select
                value={abilityKey}
                onChange={(event) => {
                  setAbilityKey(
                    event.target.value
                  );
                  setMessage("");
                }}
              >
                <option value="">
                  Selecione uma habilidade
                </option>

                {abilities.map((abilityItem) => (
                  <option
                    key={abilityItem.key}
                    value={abilityItem.key}
                  >
                    {abilityItem.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedOption && abilityKey && (
            <div className="mn-style-ability-preview">
              <strong>
                {
                  abilities.find(
                    (abilityItem) =>
                      abilityItem.key === abilityKey
                  )?.name
                }
              </strong>

              <p>
                {
                  abilities.find(
                    (abilityItem) =>
                      abilityItem.key === abilityKey
                  )?.summary
                }
              </p>
            </div>
          )}

          <div className="mn-style-acquisition-actions">
            <button
              type="button"
              className="mn-file-clear"
              disabled={isSaving}
              onClick={closeAcquisition}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="mn-primary-button"
              disabled={
                isSaving ||
                !selectedOption ||
                !abilityKey
              }
              onClick={handleAcquire}
            >
              {isSaving
                ? "Adquirindo..."
                : "Confirmar novo E.N."}
            </button>
          </div>
        </div>
      )}

      {isRemoveOpen && (
        <div className="mn-style-acquisition-form mn-style-removal-form">
          <label>
            E.N. que será removido
            <select
              value={removeOptionValue}
              onChange={(event) => {
                setRemoveOptionValue(event.target.value);
                setMessage("");
              }}
            >
              <option value="">Selecione</option>
              {removableSelections.map((selection) => (
                <option
                  key={`${selection.style_key}-${selection.level}`}
                  value={`${selection.style_key}:${selection.level}`}
                >
                  {formatNinjaStyleSelection(selection)}
                </option>
              ))}
            </select>
          </label>

          {selectedRemoval && (
            <div className="mn-style-removal-warning">
              <strong>Confirme a correção ou anulação</strong>
              <p>
                Só o nível mais alto de cada Estilo pode ser removido, evitando
                intervalos inválidos na progressão.
              </p>
              <small>
                {removalReturnsCredit
                  ? "Esta remoção devolverá 1 crédito de evolução de E.N."
                  : selectedRemoval.acquisition_type === "sage_mode"
                    ? "O registro do Modo Sábio será liberado para correção. Nenhum crédito será criado."
                    : selectedRemoval.acquisition_type === "fighting_style"
                      ? "A proficiência do Estilo de Luta será desfeita para poder ser registrada novamente. Nenhum crédito será criado."
                      : "Nenhum crédito será criado por esta remoção."}
              </small>
            </div>
          )}

          <div className="mn-style-acquisition-actions">
            <button
              type="button"
              className="mn-file-clear"
              disabled={isSaving}
              onClick={closeRemoval}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="mn-style-remove-confirm"
              disabled={isSaving || !selectedRemoval}
              onClick={handleRemove}
            >
              {isSaving
                ? "Removendo..."
                : "Confirmar remoção"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="mn-style-progression-message">
          {message}
        </p>
      )}
    </div>
  );
}

function NinjaSheetCard({
  ninja,
  onSave,
  onAcquireNinjaStyle,
  onRemoveNinjaStyle,
  onRegisterSageMode,
  onRegisterFightingStyle,
}) {
  const [draft, setDraft] = useState(() => normalizeCharacter(ninja));
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft(
      normalizeCharacter(ninja)
    );
  }, [ninja?.id]);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const selectedTraits = Array.isArray(draft.selectedTraits) ? draft.selectedTraits.filter(Boolean) : [];

    const required = [
      ["playerName", "Nome do player"],
      ["phone", "Telefone"],
      ["characterName", "Nome do personagem"],
      ["age", "Idade"],
      ["rank", "Rank Ninja"],
      ["clanOrKinship", "Clã ou Parentesco"],
      ["villageOrOrganization", "Aldeia ou Organização"],
      ["kekkeiGenkaiOrHiden", "Kekkei Genkai ou Hiden"],
      ["ninjaStyle", "Estilo Ninja atual"],
      ["appearance", "Aparência"],
      ["history", "História"],
      ["equipment", "Equipamentos"],
    ];

    for (const [field, label] of required) {
      if (!String(draft[field] || "").trim()) {
        setMessage(`Preencha o campo: ${label}.`);
        return;
      }
    }

    if (draft.villageOrOrganization === "Outro" && !String(draft.villageOrOrganizationOther || "").trim()) {
      setMessage("Informe a aldeia ou organização em Outro.");
      return;
    }

    if (!isValidInitialChakraNature(draft.chakraNatures)) {
      setMessage(
        "Selecione de 1 a 5 elementos básicos. O primeiro será considerado primário."
      );
      return;
    }

    if (selectedTraits.length === 0) {
      setMessage("Selecione ao menos um Traço Único.");
      return;
    }

    const choicesBefore =
      getAvailableNinjaStyleChoices(ninja);

    const savedCharacter =
      await onSave({
        ...draft,
        rank: normalizeNinjaRank(draft.rank),
        villageOrOrganization: finalVillage(draft),
        chakraNatures: normalizeChakraNatures(draft.chakraNatures),
        chakra_natures: normalizeChakraNatures(draft.chakraNatures),
        selectedTraits,
        selected_traits: selectedTraits,
        uniqueTrait: selectedTraits[0] || "",
        characterPhotoUrl: draft.characterPhotoUrl || draft.portraitUrl || "",
        mapIconUrl: draft.mapIconUrl || draft.iconUrl || "",
      });

    const normalizedSaved =
      normalizeCharacter(savedCharacter || draft);

    setDraft(normalizedSaved);

    const choicesAfter =
      getAvailableNinjaStyleChoices(normalizedSaved);

    if (choicesAfter > choicesBefore) {
      setMessage(
        "Ficha salva. Ao alcançar o Rank B ou superior, você recebeu +1 escolha de Estilo Ninja."
      );
    } else {
      setMessage("Ficha salva permanentemente no Supabase.");
    }
  }

  async function handleAcquireNinjaStyleFromSheet(payload) {
    const savedCharacter =
      await onAcquireNinjaStyle?.(payload);

    if (savedCharacter) {
      setDraft(normalizeCharacter(savedCharacter));
    }

    return savedCharacter;
  }

  async function handleRemoveNinjaStyleFromSheet(payload) {
    const savedCharacter =
      await onRemoveNinjaStyle?.(payload);

    if (savedCharacter) {
      setDraft(normalizeCharacter(savedCharacter));
    }

    return savedCharacter;
  }

  async function handleRegisterSageModeFromSheet(payload) {
    const savedCharacter =
      await onRegisterSageMode?.(payload);

    if (savedCharacter) {
      setDraft(normalizeCharacter(savedCharacter));
    }

    return savedCharacter;
  }

  async function handleRegisterFightingStyleFromSheet(payload) {
    const savedCharacter =
      await onRegisterFightingStyle?.(payload);

    if (savedCharacter) {
      setDraft(normalizeCharacter(savedCharacter));
    }

    return savedCharacter;
  }

  const selectedChakraNatures = normalizeChakraNatures(
    draft.chakraNatures
  );

  return (
    <section className="mn-card mn-sheet-card">
      <div className="mn-sheet-header">
        <div>
          <div className="mn-section-kicker">FICHA DO PERSONAGEM</div>
          <h3>Dados oficiais do ninja</h3>
          <p>Esta é a ficha principal do personagem. Ela nasce no cadastro e pode ser revisada aqui no Meu Ninja.</p>
        </div>
      </div>

      <form className="mn-sheet-form" onSubmit={handleSubmit}>
        <label>Nome do player<input value={draft.playerName} onChange={(e) => updateField("playerName", e.target.value)} /></label>
        <label>Telefone<input type="tel" value={draft.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="(00) 00000-0000" /></label>
        <label>Nome do personagem<input value={draft.characterName} onChange={(e) => updateField("characterName", e.target.value)} /></label>
        <label>Idade<input value={draft.age} onChange={(e) => updateField("age", e.target.value)} /></label>
        <label className="mn-rank-field">
          Rank Ninja
          <select
            value={normalizeNinjaRank(draft.rank)}
            onChange={(event) => updateField("rank", event.target.value)}
          >
            {NINJA_RANKS.map((rank) => (
              <option key={rank} value={rank}>
                Rank {rank}
              </option>
            ))}
          </select>
          <small>
            Todo personagem inicia no Rank E. Ao alcançar o Rank B ou qualquer
            rank superior pela primeira vez, recebe +1 escolha de Estilo Ninja.
          </small>
        </label>
        <label>Clã ou Parentesco<input value={draft.clanOrKinship} onChange={(e) => updateField("clanOrKinship", e.target.value)} /></label>

        <label>
          Aldeia ou Organização
          <select value={draft.villageOrOrganization} onChange={(e) => updateField("villageOrOrganization", e.target.value)}>
            {villageOptions.map((option) => <option key={option || "empty"} value={option}>{option || "Selecione"}</option>)}
          </select>
        </label>

        {draft.villageOrOrganization === "Outro" && (
          <label>Qual aldeia ou organização?<input value={draft.villageOrOrganizationOther} onChange={(e) => updateField("villageOrOrganizationOther", e.target.value)} placeholder="Digite o nome" /></label>
        )}

        <label>Kekkei Genkai ou Hiden<input value={draft.kekkeiGenkaiOrHiden} onChange={(e) => updateField("kekkeiGenkaiOrHiden", e.target.value)} /></label>

        <div className="mn-sheet-wide mn-chakra-natures-editor">
          <div className="mn-style-readonly-heading">
            <div>
              <span>Naturezas Elementais</span>
              <small>
                Você pode registrar até cinco elementos básicos. O primeiro da lista é sempre o primário; os demais são secundários.
              </small>
            </div>
            <strong>
              {selectedChakraNatures.length}/{MAX_CHAKRA_NATURES}
            </strong>
          </div>

          <div className="mn-chakra-nature-grid">
            {INITIAL_CHAKRA_ELEMENTS.map((element) => {
              const selectedIndex = selectedChakraNatures.indexOf(
                element.name
              );
              const selected = selectedIndex >= 0;
              const limitReached =
                selectedChakraNatures.length >= MAX_CHAKRA_NATURES;

              return (
                <button
                  key={element.key}
                  type="button"
                  className={selected ? "is-selected" : ""}
                  disabled={!selected && limitReached}
                  onClick={() => {
                    const nextNatures = selected
                      ? selectedChakraNatures.filter(
                          (nature) => nature !== element.name
                        )
                      : [...selectedChakraNatures, element.name];

                    updateField(
                      "chakraNatures",
                      normalizeChakraNatures(nextNatures)
                    );
                  }}
                  aria-pressed={selected}
                >
                  <strong>{element.name}</strong>
                  <span>{element.label}</span>
                  <small>
                    {selected
                      ? selectedIndex === 0
                        ? "Primário"
                        : "Secundário"
                      : "Adicionar"}
                  </small>
                </button>
              );
            })}
          </div>

          <p className="mn-chakra-nature-help">
            {selectedChakraNatures.length > 0
              ? `Primário atual: ${getInitialChakraElement(selectedChakraNatures)?.name || "—"}. Ao remover o primário, o próximo elemento da lista assume automaticamente essa posição.`
              : "Selecione ao menos um elemento antes de salvar a ficha."}
          </p>
        </div>

        <div className="mn-sheet-wide mn-sage-mode-panel">
          <div className="mn-style-readonly-heading">
            <div>
              <span>Modo Sábio</span>
              <small>
                O personagem começa sem Modo Sábio. Ao conquistar um, registre
                o tipo e o animal para receber o E.N. correspondente.
              </small>
            </div>
          </div>

          <SageModeControl
            ninja={draft}
            onRegister={handleRegisterSageModeFromSheet}
          />
        </div>

        <div className="mn-sheet-wide mn-fighting-style-panel">
          <div className="mn-style-readonly-heading">
            <div>
              <span>Estilos de Luta</span>
              <small>
                Registre os Estilos aprendidos e, quando conquistar a
                proficiência, receba o E.N. correspondente ao sistema.
              </small>
            </div>
          </div>

          <FightingStyleControl
            ninja={draft}
            onRegister={handleRegisterFightingStyleFromSheet}
          />
        </div>

        <div className="mn-sheet-wide mn-style-readonly-panel">
          <div className="mn-style-readonly-heading">
            <div>
              <span>Progressão de Estilos Ninja</span>
              <small>
                Os dois primeiros E.N. foram definidos na criação. Novos níveis
                são adquiridos aqui usando créditos de evolução.
              </small>
            </div>
          </div>

          <ol>
            {normalizeNinjaStyleSelections(draft.ninjaStyleSelections).length > 0 ? (
              normalizeNinjaStyleSelections(draft.ninjaStyleSelections).map((selection) => (
                <li key={`${selection.slot}-${selection.style_key}-${selection.level}`}>
                  <strong>{formatNinjaStyleSelection(selection)}</strong>
                  <small>
                    {getNinjaStyleAcquisitionLabel(selection)}
                  </small>
                </li>
              ))
            ) : (
              <li>
                <strong>{draft.ninjaStyle || "Configuração antiga sem habilidades registradas"}</strong>
              </li>
            )}
          </ol>

          <NinjaStyleProgressionControl
            ninja={draft}
            onAcquire={handleAcquireNinjaStyleFromSheet}
            onRemove={handleRemoveNinjaStyleFromSheet}
          />
        </div>
        <label>Alcunha / Epíteto<input value={draft.epithet} onChange={(e) => updateField("epithet", e.target.value)} /></label>

        <label>
          Traços Únicos
          <TraitSearchSelect value={draft.selectedTraits} onChange={(value) => updateField("selectedTraits", value)} />
        </label>

        <label className="mn-sheet-wide">Aparência<textarea rows={4} value={draft.appearance} onChange={(e) => updateField("appearance", e.target.value)} /></label>
        <label className="mn-sheet-wide">História<textarea rows={5} value={draft.history} onChange={(e) => updateField("history", e.target.value)} /></label>
        <label className="mn-sheet-wide">Equipamentos<textarea rows={4} value={draft.equipment} onChange={(e) => updateField("equipment", e.target.value)} /></label>
        <label className="mn-sheet-wide">URL do ícone do mapa<input value={draft.mapIconUrl} onChange={(e) => updateField("mapIconUrl", e.target.value)} placeholder="https://..." /></label>

        {message && <p className="mn-sheet-message">{message}</p>}

        <div className="mn-sheet-actions">
          <button type="submit" className="mn-primary-button"><SvgIcon name="save" className="mn-small-icon" />Salvar ficha</button>
        </div>
      </form>
    </section>
  );
}

export default function MyNinjaCleanPage({
  character = EMPTY_CHARACTER,
  locationSlot = null,
  skillTreeSlot = null,
  onNavigate,
  onChangePhoto,
  onSaveSheet,
  persistLocally = true,
}) {
  const [activeTab, setActiveTab] = useState("perfil");
  const [activeDossier, setActiveDossier] = useState("Registro de Provas");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [localCharacter, setLocalCharacter] = useState(() => getInitialCharacter(character));

  useEffect(() => {
    const nextCharacter =
      getInitialCharacter(character);

    if (
      !nextCharacter?.id &&
      !nextCharacter?.characterName &&
      !nextCharacter?.playerName
    ) {
      return;
    }

    setLocalCharacter(nextCharacter);
  }, [character]);


  async function handleSaveNinjaSheet(nextCharacter) {
    const prepared =
      normalizeCharacter({
        ...nextCharacter,

        villageOrOrganization:
          finalVillage(nextCharacter),
      });

    try {
      const onlineSaved =
        await persistCharacterProfileToSupabase(
          prepared
        );

      const finalSaved = persistLocally
        ? saveLocalCharacter(onlineSaved)
        : onlineSaved;

      setLocalCharacter(finalSaved);

      await Promise.resolve(
        onSaveSheet?.(finalSaved)
      );

      /*
        O modal permanece aberto para que NinjaSheetCard
        consiga mostrar a confirmação somente depois que
        o Supabase devolver a linha realmente atualizada.
      */
      return finalSaved;
    } catch (error) {
      console.error(
        "[LN Digital] Erro ao salvar Meu Ninja:",
        error
      );

      alert(
        `A ficha NÃO foi salva no Supabase.\n\n${error.message}`
      );

      throw error;
    }
  }

  async function handleAcquireNinjaStyle({
    styleKey,
    abilityKey,
  }) {
    try {
      const onlineSaved =
        await acquireNinjaStyleProgression({
          styleKey,
          abilityKey,
        });

      const finalSaved = persistLocally
        ? saveLocalCharacter(onlineSaved)
        : onlineSaved;

      setLocalCharacter(finalSaved);

      await Promise.resolve(
        onSaveSheet?.(finalSaved)
      );

      return finalSaved;
    } catch (error) {
      console.error(
        "[LN Digital] Erro ao adquirir novo E.N.:",
        error
      );

      throw error;
    }
  }

  async function handleRemoveNinjaStyle({
    styleKey,
    level,
  }) {
    try {
      const onlineSaved =
        await removeNinjaStyleProgression({
          styleKey,
          level,
        });

      const finalSaved = persistLocally
        ? saveLocalCharacter(onlineSaved)
        : onlineSaved;

      setLocalCharacter(finalSaved);

      await Promise.resolve(
        onSaveSheet?.(finalSaved)
      );

      return finalSaved;
    } catch (error) {
      console.error(
        "[LN Digital] Erro ao remover E.N.:",
        error
      );

      throw error;
    }
  }

  async function handleRegisterSageMode({
    sageModeType,
    sageModeKey,
    styleKey,
    abilityKey,
  }) {
    try {
      const onlineSaved =
        await registerSageModeAndAcquireNinjaStyle({
          sageModeType,
          sageModeKey,
          styleKey,
          abilityKey,
        });

      const finalSaved = persistLocally
        ? saveLocalCharacter(onlineSaved)
        : onlineSaved;

      setLocalCharacter(finalSaved);

      await Promise.resolve(
        onSaveSheet?.(finalSaved)
      );

      return finalSaved;
    } catch (error) {
      console.error(
        "[LN Digital] Erro ao registrar Modo Sábio:",
        error
      );

      throw error;
    }
  }

  async function handleRegisterFightingStyle({
    fightingStyleKey,
    gainProficiency,
    styleKey,
    abilityKey,
  }) {
    try {
      const onlineSaved =
        await registerFightingStyleAndMaybeAcquireNinjaStyle({
          fightingStyleKey,
          gainProficiency,
          styleKey,
          abilityKey,
        });

      const finalSaved = persistLocally
        ? saveLocalCharacter(onlineSaved)
        : onlineSaved;

      setLocalCharacter(finalSaved);

      await Promise.resolve(
        onSaveSheet?.(finalSaved)
      );

      return finalSaved;
    } catch (error) {
      console.error(
        "[LN Digital] Erro ao registrar Estilo de Luta:",
        error
      );

      throw error;
    }
  }

  function handleMobileMenuClick(label) {
    setIsMobileMenuOpen(false);

    if (label !== "Meu Ninja") {
      onNavigate?.(label);
    }
  }

  async function handleProfilePhotoUpload(event) {
    // LN_SAVE_PROFILE_PHOTO_RPC_V4
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploadingProfilePhoto(true);

    try {
      const uploaded =
        await uploadDossierImage(
          file,
          ninja,
          "profile-photos"
        );

      const nextCharacter =
        normalizeCharacter({
          ...ninja,

          characterPhotoUrl:
            uploaded?.imageUrl || "",

          portraitUrl:
            uploaded?.imageUrl || "",
        });

      const onlineSaved =
        await persistCharacterProfileToSupabase(
          nextCharacter
        );

      const finalSaved = persistLocally
        ? saveLocalCharacter(onlineSaved)
        : onlineSaved;

      setLocalCharacter(finalSaved);

      await Promise.resolve(
        onSaveSheet?.(finalSaved)
      );

      onChangePhoto?.(uploaded);
    } catch (error) {
      console.error(
        "[LN Digital] Erro ao salvar foto:",
        error
      );

      alert(
        `A foto NÃO foi salva no perfil.\n\n${error.message}`
      );
    } finally {
      setIsUploadingProfilePhoto(false);
      event.target.value = "";
    }
  }

  const ninja = normalizeCharacter(localCharacter);
  const village = cleanValue(finalVillage(ninja), "Aldeia não definida");
  const headerName = cleanValue(ninja.characterName, "Ninja sem nome");
  const epithet = cleanValue(ninja.epithet, "Ninja sem alcunha definida");
  const traitsSummary = ninja.selectedTraits?.length ? ninja.selectedTraits.join(", ") : "Sem traços únicos";
  const ninjaStyleSelections = normalizeNinjaStyleSelections(ninja.ninjaStyleSelections);

  const ninjaStyleRows =
    ninjaStyleSelections.length > 0
      ? ninjaStyleSelections.map(
          (selection, index) => [
            `${index + 1}º E.N.`,
            formatNinjaStyleSelection(selection),
          ]
        )
      : [[
          "Estilos Ninja",
          ninja.ninjaStyle || "Não registrado",
        ]];

  const identityRows = [
    ["Nome do personagem", ninja.characterName],
    ["Nome do player", ninja.playerName],
    ["Telefone", ninja.phone],
    ["Idade", ninja.age],
    ["Rank Ninja", `Rank ${normalizeNinjaRank(ninja.rank)}`],
    ["Alcunha / Epíteto", ninja.epithet],
    ["Traços Únicos", traitsSummary],
  ];

  const fightingStyleSummary = normalizeFightingStyles(
    ninja.fightingStyles || ninja.fighting_styles || []
  );

  const originRows = [
    ["Aldeia ou Organização", village],
    ["Clã ou Parentesco", ninja.clanOrKinship],
    ["Kekkei Genkai ou Hiden", ninja.kekkeiGenkaiOrHiden],
    ["Natureza Elemental", formatChakraNatures(ninja.chakraNatures)],
    ["Modo Sábio", formatSageMode(ninja)],
    [
      "Estilos de Luta",
      fightingStyleSummary.length > 0
        ? fightingStyleSummary.map(formatFightingStyle).join(" | ")
        : "Nenhum registrado",
    ],
    ...ninjaStyleRows,
    [
      "Novos E.N. disponíveis",
      ninja.availableNinjaStyleChoices,
    ],
    ["Pontos de Habilidade", ninja.skillPoints],
  ];

  const narrativeRows = [
    ["Aparência", ninja.appearance],
    ["História", ninja.history],
    ["Equipamentos", ninja.equipment],
  ];

  return (
    <div className="mn-page">
      <aside className="mn-sidebar" aria-label="Menu principal">
        <div className="mn-sidebar-hall-button-wrap">
          <HallBackButton
            onClick={() => onNavigate?.("Início")}
            className="ln-hall-back-button--compact mn-sidebar-hall-back-button"
          />
        </div>

        <nav className="mn-nav">
          {sidebarItems.map(([label, icon, active]) => (
            <button
              key={label}
              type="button"
              className={`mn-nav-item ${active ? "is-active" : ""}`}
              onClick={() => label !== "Meu Ninja" && onNavigate?.(label)}
            >
              {icon === "star" ? <StarIcon className="mn-icon" /> : <SvgIcon name={icon} />}
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="mn-shell">
        <header className="mn-topbar">
<button type="button" className="mn-ghost-button" aria-label="Notificações">
            <SvgIcon name="bell" />
          </button>

          <button
            type="button"
            className="mn-avatar-button mn-mobile-hall-menu-button"
            aria-label="Abrir menu do Hall"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            <span className="mn-avatar">
              {ninja.mapIconUrl ? (
                <img
                  className="mn-avatar-map-icon"
                  src={ninja.mapIconUrl}
                  alt="Ícone de viagem do personagem"
                />
              ) : (
                <StarIcon className="mn-avatar-star" />
              )}
              <span className="mn-online-dot" />
            </span>
            <SvgIcon
              name="chevron"
              className={`mn-small-icon ${isMobileMenuOpen ? "is-open" : ""}`}
            />
          </button>
        </header>

        {isMobileMenuOpen && (
          <div
            className="mn-mobile-menu-backdrop"
            role="presentation"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <nav
              className="mn-mobile-hall-menu"
              aria-label="Menu mobile do Hall"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mn-mobile-hall-menu-head">
                <div className="mn-brand-mark">
                  <StarIcon className="mn-brand-star" />
                </div>

                <div>
                  <small>LN DIGITAL</small>
                  <strong>HALL</strong>
                </div>

                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="mn-mobile-hall-menu-list">
                {sidebarItems.map(([label, icon, active]) => (
                  <button
                    key={label}
                    type="button"
                    className={active ? "is-active" : ""}
                    onClick={() => handleMobileMenuClick(label)}
                  >
                    {icon === "star" ? (
                      <StarIcon className="mn-small-icon" />
                    ) : (
                      <SvgIcon name={icon} className="mn-small-icon" />
                    )}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </nav>
          </div>
        )}

        <main className="mn-main">
          <section className="mn-hero">
            <div className="mn-hero-title-row"><h1>MEU NINJA</h1><StarIcon className="mn-hero-star" /></div>
            <p>Cada player possui apenas um ninja. Esta página reúne ficha, localização e árvore de habilidades do personagem.</p>
            <StarIcon className="mn-hero-watermark" />
          </section>

          <section className="mn-card mn-character-head">
            <div className="mn-character-head-top">
              <div>
                <h2>{headerName}</h2>
                <div className="mn-head-meta">
                  <span>{village}</span>
                  <SvgIcon name="eye" className="mn-small-icon mn-orange" />
                </div>
              </div>

              <button
                type="button"
                className="mn-character-edit-button-mobile"
                onClick={() => setIsEditingProfile((current) => !current)}
              >
                <SvgIcon name="settings" className="mn-small-icon" />
                {isEditingProfile ? "Fechar" : "Editar"}
              </button>
            </div>

            <div className="mn-tabs" role="tablist" aria-label="Seções do Meu Ninja">
              <button type="button" role="tab" className={activeTab === "perfil" ? "is-active" : ""} onClick={() => setActiveTab("perfil")}>Perfil</button>
              <button type="button" role="tab" className={activeTab === "localizacao" ? "is-active" : ""} onClick={() => setActiveTab("localizacao")}>Localização</button>
              <button type="button" role="tab" className={activeTab === "teia" ? "is-active" : ""} onClick={() => setActiveTab("teia")}>Árvore de Habilidades</button>
            </div>
          </section>

          {activeTab === "perfil" && (
            <>
              <section className="mn-profile-grid">
                <article className="mn-card mn-profile-card">
                  <div className="mn-profile-layout">
                    <div className="mn-photo-column">
                      <div className="mn-photo-box">
                        {ninja.characterPhotoUrl ? <img src={ninja.characterPhotoUrl} alt={`Retrato de ${headerName}`} /> : <StarIcon className="mn-photo-placeholder" />}
                      </div>
                      <label className="mn-outline-button mn-photo-upload-button">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleProfilePhotoUpload}
                          disabled={isUploadingProfilePhoto}
                        />
                        <SvgIcon name="camera" className="mn-small-icon" />
                        {isUploadingProfilePhoto ? "Enviando..." : "Alterar foto"}
                      </label>
                    </div>

                    <div className="mn-profile-info">
                      <div className="mn-profile-info-head">
                        <div className="mn-section-kicker">PERFIL DO PERSONAGEM</div>

                        <button
                          type="button"
                          className="mn-profile-edit-button mn-profile-edit-button-inline"
                          onClick={() => setIsEditingProfile((current) => !current)}
                        >
                          <SvgIcon name="settings" className="mn-small-icon" />
                          {isEditingProfile ? "Fechar edição" : "Editar perfil"}
                        </button>
                      </div>

                      <h3 className="mn-profile-character-name">{headerName}</h3>

                      <div className="mn-alert-chip">
                        <StarIcon className="mn-small-icon" />
                        {epithet}
                      </div>

                      <div className="mn-chip-row">
                        <span>{village}</span>
                        <span>{traitsSummary}</span>
                      </div>
                    </div>
                  </div>


              <section className="mn-bottom-grid mn-profile-summary-grid">
                <InfoCard title="IDENTIDADE" icon="users" rows={identityRows} className="mn-summary-card mn-summary-card-identity" />
                <InfoCard title="ORIGEM E PODERES" icon="affiliation" rows={originRows} className="mn-summary-card mn-summary-card-origin" />

                <InfoCard
                  title="NARRATIVA E EQUIPAMENTOS"
                  icon="book"
                  rows={narrativeRows}
                  className="mn-summary-card mn-summary-card-narrative"
                />

                <article className="mn-card mn-map-icon-card mn-summary-card mn-summary-card-map">
                  <div className="mn-info-title">
                    <SvgIcon name="pin" className="mn-small-icon" />
                    ÍCONE DO MAPA
                  </div>

                  <div className="mn-map-icon-visual-board">
                    <div className="mn-map-icon-large-preview">
                      {ninja.mapIconUrl ? (
                        <img src={ninja.mapIconUrl} alt="Ícone do mapa" />
                      ) : (
                        <StarIcon className="mn-map-placeholder" />
                      )}
                    </div>

                    <div>
                      <strong>{ninja.mapIconUrl ? "Ícone personalizado" : "Ícone não definido"}</strong>
                      <span>O link do ícone fica disponível apenas na edição da ficha.</span>
                    </div>
                  </div>
                </article>
              </section>
                </article>

                <article className="mn-card mn-dossier-card">
                  <div className="mn-dossier-header">
                    <div>
                      <div className="mn-section-kicker">DOSSIÊ SHINOBI</div>
                      <h3>Ficha Complementar</h3>
                      <p>Área reservada para provas, medicina, contratos, inventário, missões, status, ações ocultas e desenvolvimento.</p>
                    </div>
                  </div>

                  <div className="mn-dossier-grid">
                    <ul className="mn-dossier-list">
                      {dossierItems.map(([label, icon]) => (
                        <li key={label}>
                          <button type="button" className={activeDossier === label ? "is-active" : ""} onClick={() => setActiveDossier(label)}>
                            <span><SvgIcon name={icon} className="mn-small-icon" />{label}</span>
                            {activeDossier === label && <i className="mn-white-dot" />}
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="mn-dossier-preview">
                      <ShinobiDossierPanel
                        ninja={ninja}
                        activeDossier={activeDossier}
                        persistLocally={persistLocally}
                      />
                    </div>
                  </div>
                </article>
              </section>

              {isEditingProfile && (
                <div
                  className="mn-profile-editor-overlay"
                  role="presentation"
                  onClick={() => setIsEditingProfile(false)}
                >
                  <div
                    className="mn-profile-editor-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Editar perfil do personagem"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mn-profile-editor-modal-head">
                      <div>
                        <small>MEU NINJA</small>
                        <strong>Editar ficha</strong>
                      </div>

                      <button
                        type="button"
                        aria-label="Fechar edição"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        ×
                      </button>
                    </div>

                    <NinjaSheetCard
                      ninja={ninja}
                      onSave={handleSaveNinjaSheet}
                      onAcquireNinjaStyle={handleAcquireNinjaStyle}
                      onRemoveNinjaStyle={handleRemoveNinjaStyle}
                      onRegisterSageMode={handleRegisterSageMode}
                      onRegisterFightingStyle={handleRegisterFightingStyle}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "localizacao" && (
            <section className="mn-card mn-placeholder-card">
              {locationSlot || <><div className="mn-section-kicker">LOCALIZAÇÃO</div><h3>Mapa e viagem</h3><p>O mapa de localização será reconectado aqui em uma etapa separada.</p></>}
            </section>
          )}

          {activeTab === "teia" && (
            <section className="mn-card mn-placeholder-card">
              {skillTreeSlot || <><div className="mn-section-kicker">ÁRVORE DE HABILIDADES</div><h3>Teia Shinobi</h3><p>A teia preservada será reconectada aqui.</p></>}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
