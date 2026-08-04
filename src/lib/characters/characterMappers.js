/*
  LN Digital — mapeadores de personagem.

  Extraídos do App.jsx sem alterar as regras existentes.
*/

export function parseCharacterTraitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export function dbCharacterToAppCharacter(row, currentUser) {
  if (!row) return null;

  const selectedTraits = parseCharacterTraitList(
    row.selected_traits ?? row.selectedTraits ?? row.unique_trait ?? row.uniqueTrait
  );

  return {
    id: row.id || row.user_id || currentUser?.id || crypto.randomUUID(),
    userId: row.user_id || row.userId || currentUser?.id || "",
    ownerEmail: row.owner_email || row.ownerEmail || currentUser?.email || "",
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || row.created_at || "",

    playerName: row.player_name || row.playerName || "",
    phone:
      row.phone_number ||
      row.phone ||
      row.profile_sheet?.phone ||
      "",
    characterName: row.character_name || row.characterName || "",
    age: row.age || "",
    gender: row.gender || "",
    birthday: row.birthday || "",
    height: row.height || "",
    weight: row.weight || "",

    villageOrOrganization: row.village_or_organization || row.villageOrOrganization || "",
    villageOrOrganizationOther: row.village_or_organization_other || row.villageOrOrganizationOther || "",
    clanOrKinship: row.clan_or_kinship || row.clanOrKinship || "",
    kekkeiGenkaiOrHiden: row.kekkei_genkai_or_hiden || row.kekkeiGenkaiOrHiden || "",
    ninjaStyle: row.ninja_style || row.ninjaStyle || "",
    rank: row.rank || "",
    epithet: row.epithet || "",

    appearance: row.appearance || "",
    history: row.history || "",
    equipment: row.equipment || "",

    uniqueTrait: row.unique_trait || row.uniqueTrait || "",
    selectedTraits,
    selected_traits: selectedTraits,

    characterPhotoUrl: row.character_photo_url || row.characterPhotoUrl || row.portrait_url || "",
    mapIconUrl: row.map_icon_url || row.mapIconUrl || row.icon_url || "",
    portraitUrl: row.portrait_url || row.portraitUrl || row.character_photo_url || "",
    iconUrl: row.icon_url || row.iconUrl || row.map_icon_url || "",

    skillPoints: row.skill_points ?? row.skillPoints ?? 0,
    unlockedSkillIds: Array.isArray(row.unlocked_skill_ids) ? row.unlocked_skill_ids : [],
    profileSheet: row.profile_sheet || row.profileSheet || {},
    currentLocation:
      row.current_location ||
      row.currentLocation ||
      row.profile_sheet?.currentLocation ||
      row.profile_sheet?.mapLocation ||
      null,
  };
}
