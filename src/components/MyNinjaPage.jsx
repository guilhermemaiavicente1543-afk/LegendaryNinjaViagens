import { useEffect, useMemo, useState } from "react";
import CharactersPage from "./CharactersPage";
import CharacterSkillTree from "./CharacterSkillTree";
import { uniqueTraits } from "../data/uniqueTraits";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import CharacterPortraitUploader from "./profile/CharacterPortraitUploader";
import CharacterFullSheetPanel from "./profile/CharacterFullSheetPanel";
import MyNinjaMobilePanel from "./mobile/MyNinjaMobilePanel";
import LnSelect from "./ui/LnSelect";
import { createPortal } from "react-dom";

const LOCAL_CHARACTER_STORAGE_KEY = "legendary-ninja-characters";

const villageOptions = [
  "Vila da Folha",
  "Vila da Névoa",
  "Vila da Nuvem",
  "Vila da Areia",
  "Vila da Pedra"
];

const ninjaStyles = [
  "Ninjutsu",
  "Taijutsu",
  "Genjutsu",
  "Bukijutsu",
  "Tansakujutsu",
  "Fuinjutsu",
  "Iryoninjutsu",
  "Kugutsu",
  "Kenjutsu",
  "Sensorial",
  "Médico",
  "Outro"
];

const initialForm = {
  playerName: "",
  phoneNumber: "",
  characterName: "",
  villageChoice: "",
  iconUrl: "",
  portraitUrl: "",
  bannerUrl: "",
  epithet: "",
  quote: "",
  gender: "",
  age: "",
  heightCm: "",
  weightKg: "",
  birthday: "",
  rankTitle: "",
  teamName: "",
  sensei: "",
  chakraNatures: "",
  mainWeapon: "",
  summonContract: "",
  combatRole: "",
  personality: "",
  biography: "",
  goals: "",
  fears: "",
  allies: "",
  rivals: "",
  notes: "",
  appearance: "",
  clanOrKinship: "",
  history: "",
  villageOrOrganization: "",
  kekkeiGenkaiOrHiden: "",
  equipment: "",
  ninjaStyle: "",
  selectedTraits: []
};

function dbToForm(character) {
  const savedVillage = character.village_or_organization || "";
  const isKnownVillage = villageOptions.includes(savedVillage);

  return {
    playerName: character.player_name || "",
    phoneNumber: character.phone_number || "",
    characterName: character.character_name || "",
    villageChoice: isKnownVillage ? savedVillage : savedVillage ? "Outros" : "",
    iconUrl: character.icon_url || "",
    portraitUrl: character.portrait_url || "",
    bannerUrl: character.banner_url || "",
    epithet: character.epithet || "",
    quote: character.quote || "",
    gender: character.gender || "",
    age: character.age || "",
    heightCm: character.height_cm || "",
    weightKg: character.weight_kg || "",
    birthday: character.birthday || "",
    rankTitle: character.rank_title || "",
    teamName: character.team_name || "",
    sensei: character.sensei || "",
    chakraNatures: Array.isArray(character.chakra_natures)
      ? character.chakra_natures.join(", ")
      : "",
    mainWeapon: character.main_weapon || "",
    summonContract: character.summon_contract || "",
    combatRole: character.combat_role || "",
    personality: character.personality || "",
    biography: character.biography || character.history || "",
    goals: character.goals || "",
    fears: character.fears || "",
    allies: character.allies || "",
    rivals: character.rivals || "",
    notes: character.notes || "",
    appearance: character.appearance || "",
    clanOrKinship: character.clan_or_kinship || "",
    history: character.history || "",
    villageOrOrganization: character.village_or_organization || "",
    kekkeiGenkaiOrHiden: character.kekkei_genkai_or_hiden || "",
    equipment: character.equipment || "",
    ninjaStyle: character.ninja_style || "",
    selectedTraits: Array.isArray(character.selected_traits)
      ? character.selected_traits
      : []
  };
}

function dbToLocalCharacter(character) {
  return {
    id: character.id,
    playerName: character.player_name || "",
    phoneNumber: character.phone_number || "",
    characterName: character.character_name || "",
    iconUrl: character.icon_url || "",
    portraitUrl: character.portrait_url || "",
    epithet: character.epithet || "",
    quote: character.quote || "",
    age: character.age || "",
    appearance: character.appearance || "",
    clanOrKinship: character.clan_or_kinship || "",
    history: character.history || "",
    villageOrOrganization: character.village_or_organization || "",
    kekkeiGenkaiOrHiden: character.kekkei_genkai_or_hiden || "",
    equipment: character.equipment || "",
    ninjaStyle: character.ninja_style || "",
    selectedTraits: Array.isArray(character.selected_traits)
      ? character.selected_traits
      : [],
    createdAt: character.created_at
  };
}

function syncCharacterToLocalStorage(character) {
  if (!character) return;

  const localCharacter = dbToLocalCharacter(character);
  localStorage.setItem(
    LOCAL_CHARACTER_STORAGE_KEY,
    JSON.stringify([localCharacter])
  );
}

function buildPayload(form, userId) {
  const village =
    form.villageChoice === "Outros"
      ? form.villageOrOrganization.trim()
      : form.villageChoice;

  return {
    user_id: userId,
    player_name: form.playerName.trim(),
    phone_number: form.phoneNumber.trim(),
    character_name: form.characterName.trim(),
    icon_url: form.iconUrl,
    portrait_url: form.portraitUrl,
    banner_url: form.bannerUrl,
    epithet: form.epithet,
    quote: form.quote,
    gender: form.gender,
    age: form.age,
    height_cm: form.heightCm ? Number(form.heightCm) : null,
    weight_kg: form.weightKg ? Number(form.weightKg) : null,
    birthday: form.birthday,
    rank_title: form.rankTitle,
    team_name: form.teamName,
    sensei: form.sensei,
    chakra_natures: form.chakraNatures
      ? form.chakraNatures.split(",").map((item) => item.trim()).filter(Boolean)
      : [],
    main_weapon: form.mainWeapon,
    summon_contract: form.summonContract,
    combat_role: form.combatRole,
    personality: form.personality,
    biography: form.biography,
    goals: form.goals,
    fears: form.fears,
    allies: form.allies,
    rivals: form.rivals,
    notes: form.notes,
    age: form.age,
    appearance: form.appearance,
    clan_or_kinship: form.clanOrKinship,
    history: form.history || form.biography,
    village_or_organization: village,
    kekkei_genkai_or_hiden: form.kekkeiGenkaiOrHiden,
    equipment: form.equipment,
    ninja_style: form.ninjaStyle,
    selected_traits: form.selectedTraits,
    updated_at: new Date().toISOString()
  };
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function MyNinjaPage({
  travels = [],
  now = Date.now(),
  getCoordinate,
  getTravelCurrentPoint,
  getTravelProgress,
  getRemainingTravelHours,
  getUnknownPresencesCount,
  formatUnknownPresences,
  formatTime,
  points,
  travelMode,
  setTravelMode,
  activeMapImage,
  showImageGrid,
  setShowImageGrid,
  showOverlayGrid,
  setShowOverlayGrid,
  showSmallGrid,
  setShowSmallGrid,
  gridOpacity,
  setGridOpacity,
  gridLines,
  setPoints,
  selectedTravelCharacterId,
  setSelectedTravelCharacterId,
  travelCharacters,
  refreshTravelCharacters,
  startCharacterTravel,
  handleMapClick,
  getSmallCellCenter,
  imageBounds,
}) {
  const [user, setUser] = useState(null);
  const [character, setCharacter] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [profileTab, setProfileTab] = useState("info");
  const [isMobileFullSheetOpen, setIsMobileFullSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [traitSearch, setTraitSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("Todos");

  useEffect(() => {
    async function loadMyNinja() {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        setIsLoading(false);
        return;
      }

      setUser(userData.user);

      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        setCharacter(data);
        setForm(dbToForm(data));
        syncCharacterToLocalStorage(data);

        if (profileTab === "skills" || profileTab === "sheet" || profileTab === "inventory") {
          setProfileTab("info");
        }
      }

      setIsLoading(false);
    }

    loadMyNinja();
  }, []);

  const characterTravel = useMemo(() => {
    if (!character) return null;

    return travels.find((travel) => travel.characterId === character.id) || null;
  }, [character, travels]);

  const location = useMemo(() => {
    if (
      !characterTravel ||
      !getTravelCurrentPoint ||
      !getCoordinate ||
      !getTravelProgress
    ) {
      return null;
    }

    const currentPoint = getTravelCurrentPoint(characterTravel, now);
    const currentCoord = getCoordinate({
      lat: currentPoint[0],
      lng: currentPoint[1]
    });

    const progress = getTravelProgress(characterTravel, now);
    const remainingHours = getRemainingTravelHours
      ? getRemainingTravelHours(characterTravel, now)
      : 0;

    const unknownPresences = getUnknownPresencesCount
      ? getUnknownPresencesCount(characterTravel, travels, now)
      : 0;

    return {
      currentCoord,
      progress,
      progressPercent: Math.round(progress * 100),
      remainingHours,
      unknownPresences
    };
  }, [
    characterTravel,
    getTravelCurrentPoint,
    getCoordinate,
    getTravelProgress,
    getRemainingTravelHours,
    getUnknownPresencesCount,
    travels,
    now
  ]);

  const categories = useMemo(() => {
    const all = uniqueTraits.map((trait) => trait.category).filter(Boolean);
    return ["Todos", ...Array.from(new Set(all))];
  }, []);

  const types = useMemo(() => {
    const all = uniqueTraits.map((trait) => trait.type).filter(Boolean);
    return ["Todos", ...Array.from(new Set(all))];
  }, []);

  const filteredTraits = useMemo(() => {
    const search = traitSearch.trim().toLowerCase();

    return uniqueTraits.filter((trait) => {
      const matchesSearch =
        !search ||
        trait.name.toLowerCase().includes(search) ||
        trait.category.toLowerCase().includes(search) ||
        trait.type.toLowerCase().includes(search) ||
        trait.requirement.toLowerCase().includes(search) ||
        trait.description.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "Todos" || trait.category === categoryFilter;

      const matchesType = typeFilter === "Todos" || trait.type === typeFilter;

      const alreadySelected = form.selectedTraits.some(
        (selected) => selected.id === trait.id
      );

      return matchesSearch && matchesCategory && matchesType && !alreadySelected;
    });
  }, [traitSearch, categoryFilter, typeFilter, form.selectedTraits]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function addTrait(trait) {
    setForm((current) => ({
      ...current,
      selectedTraits: [...current.selectedTraits, trait]
    }));

    setTraitSearch("");
  }

  function removeTrait(traitId) {
    setForm((current) => ({
      ...current,
      selectedTraits: current.selectedTraits.filter(
        (trait) => trait.id !== traitId
      )
    }));
  }

  async function saveNinja(event) {
    event.preventDefault();
    setMessage("");

    if (!user) {
      setMessage("Sessão não encontrada. Faça login novamente.");
      return;
    }

    if (!form.characterName.trim()) {
      setMessage("Preencha o nome do personagem.");
      return;
    }

    const payload = buildPayload(form, user.id);

    if (character) {
      const { data, error } = await supabase
        .from("characters")
        .update(payload)
        .eq("id", character.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      setCharacter(data);
      setForm(dbToForm(data));
      syncCharacterToLocalStorage(data);
      setIsEditing(false);
      setMessage("Ninja atualizado com sucesso.");
      return;
    }

    const { data, error } = await supabase
      .from("characters")
      .insert(payload)
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setCharacter(data);
    setForm(dbToForm(data));
    syncCharacterToLocalStorage(data);
    setIsEditing(false);
    setProfileTab("info");
    setMessage("Ninja criado com sucesso.");
  }

  function renderNinjaForm() {
    return (
      <form className="character-form" onSubmit={saveNinja}>
<h2>{character ? "Editar Meu Ninja" : "Criar Meu Ninja"}</h2>

        <p className="empty-message">
          Cada conta pode ter apenas um personagem. Depois de criado, você poderá
          editar as informações deste ninja.
        </p>

        <label>
          Nome do Player
          <input
            value={form.playerName}
            onChange={(event) => updateField("playerName", event.target.value)}
            placeholder="Ex: Guilherme"
          />
        </label>

        <label>
          Número de telefone
          <input
            value={form.phoneNumber}
            onChange={(event) => updateField("phoneNumber", event.target.value)}
            placeholder="Ex: (35) 99999-9999"
          />
        </label>

        <label>
          Nome do Personagem
          <input
            value={form.characterName}
            onChange={(event) => updateField("characterName", event.target.value)}
            placeholder="Ex: Haruto Senju"
          />
        </label>

        <label>
          Ícone do personagem no mapa
          <input
            value={form.iconUrl}
            onChange={(event) => updateField("iconUrl", event.target.value)}
            placeholder="Cole uma URL de imagem para o ícone do mapa"
          />
        </label>

        <label>
          Idade do Personagem
          <input
            value={form.age}
            onChange={(event) => updateField("age", event.target.value)}
            placeholder="Ex: 16"
          />
        </label>

        <label>
          Aparência
          <textarea
            value={form.appearance}
            onChange={(event) => updateField("appearance", event.target.value)}
            placeholder="Descreva altura, cabelo, roupas, marcas, postura..."
          />
        </label>

        <label>
          Clã ou Parentesco
          <input
            value={form.clanOrKinship}
            onChange={(event) => updateField("clanOrKinship", event.target.value)}
            placeholder="Ex: Uchiha, Senju, órfão, parentesco especial..."
          />
        </label>

        <label>
          História
          <textarea
            value={form.history}
            onChange={(event) => updateField("history", event.target.value)}
            placeholder="Conte a origem, motivações, traumas e objetivos do personagem."
          />
        </label>

        <label>
          Aldeia ou Organização
          <LnSelect
            value={form.villageChoice}
            onChange={(event) => {
              const value = event.target.value;
              updateField("villageChoice", value);

              if (value !== "Outros") {
                updateField("villageOrOrganization", "");
              }
            }}
          >
            <option value="">Selecione uma opção</option>
            {villageOptions.map((village) => (
              <option key={village} value={village}>
                {village}
              </option>
            ))}
            <option value="Outros">Outros</option>
          </LnSelect>
        </label>

        {form.villageChoice === "Outros" && (
          <label>
            Informe a vila ou organização
            <input
              value={form.villageOrOrganization}
              onChange={(event) =>
                updateField("villageOrOrganization", event.target.value)
              }
              placeholder="Ex: Akatsuki, organização própria..."
            />
          </label>
        )}

        <label>
          Kekkei Genkai ou Hiden
          <input
            value={form.kekkeiGenkaiOrHiden}
            onChange={(event) =>
              updateField("kekkeiGenkaiOrHiden", event.target.value)
            }
            placeholder="Ex: Sharingan, Byakugan, Mokuton, Hiden do clã..."
          />
        </label>

        <label>
          Equipamentos
          <textarea
            value={form.equipment}
            onChange={(event) => updateField("equipment", event.target.value)}
            placeholder="Liste armas, itens, pergaminhos, equipamentos especiais..."
          />
        </label>

        <label>
          Estilo Ninja
          <LnSelect
            value={form.ninjaStyle}
            onChange={(event) => updateField("ninjaStyle", event.target.value)}
          >
            <option value="">Selecione um estilo</option>
            {ninjaStyles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </LnSelect>
        </label>


        <div className="profile-form-section">
          <h3>Perfil completo do personagem</h3>

          <div className="profile-form-grid">
            <label>
              Epíteto / Alcunha
              <input
                value={form.epithet}
                onChange={(event) => updateField("epithet", event.target.value)}
                placeholder="Ex: O Relâmpago Carmesim"
              />
            </label>

            <label>
              Frase marcante
              <input
                value={form.quote}
                onChange={(event) => updateField("quote", event.target.value)}
                placeholder="Ex: Um ninja nunca abandona sua sombra."
              />
            </label>

            <label>
              Gênero
              <input
                value={form.gender}
                onChange={(event) => updateField("gender", event.target.value)}
                placeholder="Ex: Masculino, feminino, outro..."
              />
            </label>

            <label>
              Aniversário
              <input
                value={form.birthday}
                onChange={(event) => updateField("birthday", event.target.value)}
                placeholder="Ex: 12 de outubro"
              />
            </label>

            <label>
              Altura em cm
              <input
                type="number"
                value={form.heightCm}
                onChange={(event) => updateField("heightCm", event.target.value)}
                placeholder="Ex: 175"
              />
            </label>

            <label>
              Peso em kg
              <input
                type="number"
                value={form.weightKg}
                onChange={(event) => updateField("weightKg", event.target.value)}
                placeholder="Ex: 68"
              />
            </label>

            <label>
              Título / graduação
              <input
                value={form.rankTitle}
                onChange={(event) => updateField("rankTitle", event.target.value)}
                placeholder="Ex: Genin, Chūnin, Jōnin, ANBU..."
              />
            </label>

            <label>
              Time / célula
              <input
                value={form.teamName}
                onChange={(event) => updateField("teamName", event.target.value)}
                placeholder="Ex: Time 7, Esquadrão Sensorial..."
              />
            </label>

            <label>
              Sensei
              <input
                value={form.sensei}
                onChange={(event) => updateField("sensei", event.target.value)}
                placeholder="Nome do mestre"
              />
            </label>

            <label>
              Naturezas de chakra
              <input
                value={form.chakraNatures}
                onChange={(event) => updateField("chakraNatures", event.target.value)}
                placeholder="Ex: Katon, Raiton, Yin"
              />
            </label>

            <label>
              Arma principal
              <input
                value={form.mainWeapon}
                onChange={(event) => updateField("mainWeapon", event.target.value)}
                placeholder="Ex: Katana, kunai, leque, marionete..."
              />
            </label>

            <label>
              Contrato de invocação
              <input
                value={form.summonContract}
                onChange={(event) => updateField("summonContract", event.target.value)}
                placeholder="Ex: Sapos, cobras, corvos..."
              />
            </label>

            <label>
              Função em combate
              <input
                value={form.combatRole}
                onChange={(event) => updateField("combatRole", event.target.value)}
                placeholder="Ex: Suporte, assassino, tanque, sensor..."
              />
            </label>
          </div>

          <label>
            Personalidade
            <textarea
              value={form.personality}
              onChange={(event) => updateField("personality", event.target.value)}
              placeholder="Descreva comportamento, temperamento, virtudes e defeitos."
            />
          </label>

          <label>
            Biografia completa
            <textarea
              value={form.biography}
              onChange={(event) => updateField("biography", event.target.value)}
              placeholder="Conte a origem, trajetória, perdas, conquistas e conflitos do personagem."
            />
          </label>

          <label>
            Objetivos
            <textarea
              value={form.goals}
              onChange={(event) => updateField("goals", event.target.value)}
              placeholder="Quais são os sonhos, ambições e metas do ninja?"
            />
          </label>

          <label>
            Medos / fraquezas emocionais
            <textarea
              value={form.fears}
              onChange={(event) => updateField("fears", event.target.value)}
              placeholder="O que o personagem teme perder, enfrentar ou revelar?"
            />
          </label>

          <div className="profile-form-grid">
            <label>
              Aliados
              <input
                value={form.allies}
                onChange={(event) => updateField("allies", event.target.value)}
                placeholder="Aliados importantes"
              />
            </label>

            <label>
              Rivais
              <input
                value={form.rivals}
                onChange={(event) => updateField("rivals", event.target.value)}
                placeholder="Rivais ou inimigos recorrentes"
              />
            </label>
          </div>

          <label>
            Anotações do Mestre
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Observações narrativas, limitações, segredos ou pendências."
            />
          </label>
        </div>

        <details className="trait-selector unique-traits-accordion">
          <summary>
            <span>Traços Únicos</span>
            <small>Clique para abrir/fechar a lista de traços.</small>
          </summary>

<div className="trait-filters">
            <input
              value={traitSearch}
              onChange={(event) => setTraitSearch(event.target.value)}
              placeholder="Pesquisar traço único..."
            />

            <LnSelect
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </LnSelect>

            <LnSelect
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </LnSelect>
          </div>

          <div className="trait-results">
            {filteredTraits.map((trait) => (
              

<button
                type="button"
                key={trait.id}
                className="trait-result"
                onClick={() => addTrait(trait)}
              >
                <strong>{trait.name}</strong>
                <span>
                  {trait.category} • {trait.type} •{" "}
                  {trait.requirement || "Sem requisito"}
                </span>
              </button>
            ))}
          </div>

          <div className="selected-traits">
            {form.selectedTraits.length === 0 ? (
              <p>Nenhum traço selecionado.</p>
            ) : (
              form.selectedTraits.map((trait) => (
                <button
                  type="button"
                  key={trait.id}
                  className="selected-trait"
                  onClick={() => removeTrait(trait.id)}
                >
                  {trait.name} ×
                </button>
              ))
            )}
          </div>
        </details>

        <button className="save-character-button" type="submit">
          {character ? "Salvar Alterações" : "Criar Meu Ninja"}
        </button>

        {character && (
          <button
            className="save-character-button"
            type="button"
            onClick={() => {
              setForm(dbToForm(character));
              setIsEditing(false);
            }}
          >
            Cancelar edição
          </button>
        )}
      </form>
    );
  }

  function renderInfoTab() {
    if (!character) return null;

    const display = (value, fallback = "Não informado") => {
      if (Array.isArray(value)) {
        return value.length ? value.join(", ") : fallback;
      }

      return value || fallback;
    };

    return (
      <div className="profile-tab-content character-complete-profile ln-premium-profile-board">
        <section className="character-profile-hero ln-premium-hero-board">
          <div className="ln-premium-portrait-column">
            <CharacterPortraitUploader
              user={user}
              character={character}
              value={character.portrait_url}
              onUploaded={(portraitUrl, updatedCharacterFromDb) => {
                const updatedCharacter = updatedCharacterFromDb || {
                  ...character,
                  portrait_url: portraitUrl
                };

                setCharacter(updatedCharacter);
                setForm(dbToForm(updatedCharacter));
                syncCharacterToLocalStorage(updatedCharacter);
              }}
            />
          </div>

          <div className="character-profile-hero-info ln-premium-hero-info">
            <p className="eyebrow">Perfil do personagem</p>
            <h2>{character.character_name}</h2>

            <span className="epithet">
              {character.epithet || character.rank_title || "Ninja sem alcunha definida"}
            </span>

            {character.quote && (
              <blockquote className="character-profile-quote">
                “{character.quote}”
              </blockquote>
            )}

            <div className="character-profile-badges">
              <span>{character.village_or_organization || "Sem aldeia"}</span>
              <span>{character.ninja_style || "Sem estilo"}</span>
              <span>{character.rank_title || "Sem graduação"}</span>
            </div>
          </div>
        </section>

        <section className="profile-section-card ln-board-card ln-identity-card">
          <h3>
            <span className="ln-board-icon">忍</span>
            Identidade
          </h3>

          <div className="profile-section-grid ln-identity-grid">
            <div className="profile-field">
              <strong>Nome</strong>
              <span>{character.character_name}</span>
            </div>

            <div className="profile-field">
              <strong>Player</strong>
              <span>{character.player_name || "Não informado"}</span>
            </div>

            <div className="profile-field">
              <strong>Gênero</strong>
              <span>{display(character.gender)}</span>
            </div>

            <div className="profile-field">
              <strong>Idade</strong>
              <span>{display(character.age)}</span>
            </div>

            <div className="profile-field">
              <strong>Aniversário</strong>
              <span>{display(character.birthday)}</span>
            </div>

            <div className="profile-field">
              <strong>Altura / Peso</strong>
              <span>
                {character.height_cm ? `${character.height_cm} cm` : "-"} /{" "}
                {character.weight_kg ? `${character.weight_kg} kg` : "-"}
              </span>
            </div>
          </div>
        </section>

        <section className="profile-section-card ln-board-card ln-origin-card">
          <h3>
            <span className="ln-board-icon">紋</span>
            Afiliação e origem
          </h3>

          <div className="ln-origin-list">
            <div className="profile-field">
              <strong>Aldeia ou Organização</strong>
              <span>{display(character.village_or_organization)}</span>
            </div>

            <div className="profile-field">
              <strong>Clã ou Parentesco</strong>
              <span>{display(character.clan_or_kinship)}</span>
            </div>

            <div className="profile-field">
              <strong>Kekkei Genkai ou Hiden</strong>
              <span>{character.kekkei_genkai_or_hiden || "Nenhum"}</span>
            </div>

            <div className="profile-field">
              <strong>Pontos de habilidade</strong>
              <span>{character.skill_points ?? 50}</span>
            </div>
          </div>
        </section>

        <section className="profile-section-card map-icon-only-card ln-board-card ln-map-icon-card">
          <h3>
            <span className="ln-board-icon">◎</span>
            Ícone do mapa
          </h3>

          <div className="profile-field map-icon-only-field">
            {character.icon_url ? (
              <span className="map-icon-preview">
                <img src={character.icon_url} alt={character.character_name} />
                Personalizado
              </span>
            ) : (
              <span>Nenhum ícone definido</span>
            )}
          </div>
        </section>

        <section className="profile-section-card ln-board-card ln-story-card">
          <h3>
            <span className="ln-board-icon">文</span>
            História e personalidade
          </h3>

          <div className="ln-story-grid">
            <div className="profile-field full">
              <strong>Aparência</strong>
              <p>{character.appearance || "Não informada."}</p>
            </div>

            <div className="profile-field full">
              <strong>Objetivos</strong>
              <p>{character.goals || "Não informados."}</p>
            </div>

            <div className="profile-field full">
              <strong>Personalidade</strong>
              <p>{character.personality || "Não informada."}</p>
            </div>

            <div className="profile-field full">
              <strong>Medos / fraquezas emocionais</strong>
              <p>{character.fears || "Não informados."}</p>
            </div>

            <div className="profile-field full ln-biography-field">
              <strong>Biografia</strong>
              <p>{character.biography || character.history || "Não informada."}</p>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="secondary-button ln-edit-profile-button"
          onClick={() => {
            setForm(dbToForm(character));
            setIsEditing(true);
          }}
        >
          Editar Perfil
        </button>
      </div>
    );
  }

  function renderSkillsTab() {
    if (!character) return null;

    return (
      <div className="profile-tab-content full-tree-tab">
        <CharacterSkillTree
          character={character}
          onCharacterUpdated={(updatedCharacter) => {
            setCharacter(updatedCharacter);
            syncCharacterToLocalStorage(updatedCharacter);
          }}
        />
      </div>
    );
  }

  function renderLocationTab() {
    if (!character) {
      return (
        <div className="profile-tab-content location-tab-content">
          <p className="empty-message">Crie seu ninja antes de acessar a localização.</p>
        </div>
      );
    }

    const hasActiveTravel = !!characterTravel && !!location;
    const arrived = hasActiveTravel ? location.progress >= 1 : false;

    const presenceText = hasActiveTravel
      ? formatUnknownPresences
        ? formatUnknownPresences(location.unknownPresences)
        : `Há ${location.unknownPresences} presenças desconhecidas nesta região.`
      : "Nenhuma presença detectada porque não há viagem ativa.";

    return (
      <div className="profile-tab-content location-tab-content location-safe-tab">
        <div className="location-safe-header">
          <p className="eyebrow">Localização</p>
          <h2>Status de localização do personagem</h2>
          <p>
            O mapa de viagem voltou a ficar em uma área separada da plataforma.
            Use o Hall → Mapa de Viagem para iniciar ou acompanhar rotas.
          </p>
        </div>

        <div className={`location-status-card ${hasActiveTravel ? arrived ? "arrived" : "moving" : "stopped"}`}>
          <strong>Status</strong>
          <span>
            {hasActiveTravel
              ? arrived
                ? "Chegou ao destino"
                : "Em viagem"
              : "Sem viagem ativa registrada."}
          </span>
        </div>

        <div className={`location-presence-card ${hasActiveTravel ? "active" : "inactive"}`}>
          <strong>Presenças na região</strong>
          <span>
            {hasActiveTravel
              ? presenceText
              : "Sem região atual definida para verificar presenças."}
          </span>
        </div>

        {hasActiveTravel ? (
          <>
            <div className="profile-field">
              <strong>Região atual</strong>
              <span>{location.currentCoord?.macroLabel || "-"}</span>
            </div>

            <div className="profile-field">
              <strong>Coordenada atual</strong>
              <span>{location.currentCoord?.label || "-"}</span>
            </div>

            <div className="profile-field">
              <strong>Origem</strong>
              <span>{characterTravel.startCoord.label}</span>
            </div>

            <div className="profile-field">
              <strong>Destino</strong>
              <span>{characterTravel.endCoord.label}</span>
            </div>

            <div className="profile-field">
              <strong>Meio de locomoção</strong>
              <span>{characterTravel.modeLabel}</span>
            </div>

            <div className="profile-field">
              <strong>Progresso</strong>
              <span>{location.progressPercent}%</span>
            </div>

            <div className="profile-field">
              <strong>Chegada prevista</strong>
              <span>{formatDateTime(characterTravel.arrivalAt)}</span>
            </div>

            <div className="profile-field">
              <strong>Tempo restante</strong>
              <span>
                {arrived
                  ? "Viagem concluída"
                  : formatTime
                    ? formatTime(location.remainingHours)
                    : `${location.remainingHours.toFixed(2)}h`}
              </span>
            </div>

            <div className="profile-field full">
              <strong>Presenças na região</strong>
              <p className="presenceNotice">{presenceText}</p>
            </div>
          </>
        ) : (
          <div className="profile-field full">
            <strong>Como iniciar viagem</strong>
            <p>
              Volte ao Hall e abra o Mapa de Viagem. Lá você pode marcar origem,
              destino, selecionar o personagem e iniciar a viagem.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return <CharactersPage {...arguments[0]} />;
  }

  if (isLoading) {
    return (
      <section className="characters-page">
        <div className="characters-header">
          <p className="eyebrow">LN Digital</p>
          <h1>Meu Ninja</h1>
          <p>Carregando dados do seu personagem...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return <CharactersPage {...arguments[0]} />;
  }

  return (
    <section className="characters-page my-ninja-page">
      <div className="characters-header">
        <div>
          <p className="eyebrow">LN Digital</p>
          <h1>Meu Ninja</h1>
          <p>
            Cada player possui apenas um ninja. Esta página reúne informações,
            localização e árvore de habilidades do personagem.
          </p>
        </div>
      </div>

      {message && <p className="auth-message">{message}</p>}

      {!character || isEditing ? (
        <div className="characters-layout">{renderNinjaForm()}</div>
      ) : (
        <>
          <MyNinjaMobilePanel
            character={character}
            profileTab={profileTab}
            setProfileTab={setProfileTab}
            onEditProfile={() => {
              setForm(dbToForm(character));
              setIsEditing(true);
            }}
            onOpenFullSheet={() => setIsMobileFullSheetOpen(true)}
          />

          <div className="my-ninja-mobile-live-area">
            {profileTab === "location" && renderLocationTab()}
            {profileTab === "skills" && renderSkillsTab()}
          </div>

          {isMobileFullSheetOpen &&
            createPortal(
              <div className="ln-sheet-portal-overlay" role="dialog" aria-modal="true">
                <section className="ln-sheet-portal-window">
                  <header className="ln-sheet-portal-header">
                    <div>
                      <span>Dossiê Shinobi</span>
                      <strong>Ficha Complementar</strong>
                    </div>

                    <button
                      type="button"
                      className="ln-sheet-portal-close"
                      onClick={() => setIsMobileFullSheetOpen(false)}
                      aria-label="Fechar ficha complementar"
                    >
                      ×
                    </button>
                  </header>

                  <main className="ln-sheet-portal-body">
                    <CharacterFullSheetPanel
                      user={user}
                      character={character}
                      onCharacterUpdated={(updatedCharacter) => {
                        setCharacter(updatedCharacter);
                        setForm(dbToForm(updatedCharacter));
                        syncCharacterToLocalStorage(updatedCharacter);
                      }}
                    />
                  </main>
                </section>
              </div>,
              document.body
            )}

          <div className="characters-layout desktop-my-ninja-layout">
            <section className={`character-profile-panel ${profileTab === "skills" ? "skill-tree-fullscreen" : ""}`}>
            <div className="profile-title">
              <h3>{character.character_name}</h3>
              <p>
                {character.village_or_organization || "Sem aldeia"} •{" "}
                {character.ninja_style || "Sem estilo"}
              </p>
            </div>

            <div className="profile-tabs">
              <button
                type="button"
                className={profileTab === "info" ? "active" : ""}
                onClick={() => setProfileTab("info")}
              >
                Perfil
              </button>

              <button
                type="button"
                className={profileTab === "location" ? "active" : ""}
                onClick={() => setProfileTab("location")}
              >
                Localização
              </button>

              <button
                type="button"
                className={profileTab === "skills" ? "active" : ""}
                onClick={() => setProfileTab("skills")}
              >
                Teia
              </button>
            </div>

            {profileTab === "info" && (
              <div className="my-ninja-unified-profile">
                {renderInfoTab()}

                <CharacterFullSheetPanel
                  user={user}
                  character={character}
                  onCharacterUpdated={(updatedCharacter) => {
                    setCharacter(updatedCharacter);
                    setForm(dbToForm(updatedCharacter));
                    syncCharacterToLocalStorage(updatedCharacter);
                  }}
                />
              </div>
            )}
            {profileTab === "location" && renderLocationTab()}
            {profileTab === "skills" && renderSkillsTab()}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
