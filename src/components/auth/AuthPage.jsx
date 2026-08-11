import PasswordRecoveryWidget from "./PasswordRecoveryWidget";
import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import { uniqueTraits } from "../../data/uniqueTraits";
import {
  INITIAL_NINJA_STYLE_KEYS,
  buildNinjaStyleSummary,
  createNinjaStyleSelection,
  getInitialNinjaStyleValidationError,
  getNinjaStyleDefinition,
  getSecondInitialStyleOptions,
  normalizeNinjaStyleSelections,
} from "../../data/ninjaStyleCatalog";
import {
  INITIAL_CHAKRA_ELEMENTS,
  MAX_CHAKRA_NATURES,
  getInitialChakraElement,
  isValidInitialChakraNature,
  normalizeChakraNatures,
} from "../../data/chakraElementCatalog";

const CHARACTER_STORAGE_KEY = "legendary-ninja-characters";
const CREATE_NINJA_AFTER_AUTH_KEY = "ln-create-ninja-after-auth";

const EMPTY_FORM = {
  email: "",
  password: "",
  playerName: "",
  phone: "",
  characterName: "",
  age: "",
  clanOrKinship: "",
  villageOrOrganization: "",
  villageOrOrganizationOther: "",
  kekkeiGenkaiOrHiden: "",
  chakraNatures: [],
  ninjaStyleSelections: [],
  epithet: "",
  appearance: "",
  history: "",
  equipment: "",
  uniqueTrait: "",
  characterPhotoUrl: "",
  mapIconUrl: ""
};

const VILLAGE_OPTIONS = [
  "",
  "Vila da Folha",
  "Vila da Areia",
  "Vila da Névoa",
  "Vila da Nuvem",
  "Vila da Pedra",
  "Vila da Chuva",
  "Vila da Grama",
  "Vila da Cachoeira",
  "Vila do Som",
  "Akatsuki",
  "Taka",
  "Hebi",
  "Shinsengumi",
  "Sora no Seishin",
  "A Sombra",
  "Outra Organização"
];

const UNIQUE_TRAIT_OPTIONS = [
  "",
  ...uniqueTraits
    .map((trait) => trait?.name || "")
    .filter(Boolean)
];

function getFinalVillage(form) {
  if (form.villageOrOrganization === "Outra Organização") {
    return form.villageOrOrganizationOther.trim();
  }

  return form.villageOrOrganization.trim();
}

function readCharacters() {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCharacterLocally(character) {
  const characters = readCharacters();

  const withoutSameOwner = characters.filter((item) => {
    if (character.userId && item.userId === character.userId) return false;
    if (character.ownerEmail && item.ownerEmail === character.ownerEmail) return false;
    return true;
  });

  localStorage.setItem(
    CHARACTER_STORAGE_KEY,
    JSON.stringify([character, ...withoutSameOwner])
  );
}

function makeCharacterRecord(form, user) {
  const now = new Date().toISOString();

  return {
    id: user?.id || crypto.randomUUID(),
    userId: user?.id || "",
    ownerEmail: form.email.trim().toLowerCase(),
    createdAt: now,
    updatedAt: now,

    playerName: form.playerName.trim(),
    phone: form.phone.trim(),
    characterName: form.characterName.trim(),
    age: form.age.trim(),
    rank: "E",
    clanOrKinship: form.clanOrKinship.trim(),
    villageOrOrganization: getFinalVillage(form),
    kekkeiGenkaiOrHiden: form.kekkeiGenkaiOrHiden.trim(),
    chakraNatures: normalizeChakraNatures(form.chakraNatures),
    chakra_natures: normalizeChakraNatures(form.chakraNatures),
    ninjaStyle: buildNinjaStyleSummary(form.ninjaStyleSelections),
    ninjaStyleSelections: normalizeNinjaStyleSelections(form.ninjaStyleSelections),
    ninja_style_selections: normalizeNinjaStyleSelections(form.ninjaStyleSelections),
    epithet: form.epithet.trim(),
    appearance: form.appearance.trim(),
    history: form.history.trim(),
    equipment: form.equipment.trim(),
    uniqueTrait: form.uniqueTrait.trim(),
    selectedTraits: form.uniqueTrait.trim() ? [form.uniqueTrait.trim()] : [],
    selected_traits: form.uniqueTrait.trim() ? [form.uniqueTrait.trim()] : [],
    characterPhotoUrl: form.characterPhotoUrl.trim(),
    mapIconUrl: form.mapIconUrl.trim(),

    skillPoints: 50,
    unlockedSkillIds: [],
    currentLocation: null,

    // A ficha principal fica nas colunas oficiais de characters.
    // profile_sheet pertence somente à Ficha Complementar.
    profileSheet: {}
  };
}

function InitialNinjaStylePicker({
  slot,
  selection,
  firstSelection,
  disabled = false,
  onChange,
}) {
  const availableStyles =
    slot === 1
      ? INITIAL_NINJA_STYLE_KEYS.map((styleKey) => ({ styleKey, level: 1 }))
      : getSecondInitialStyleOptions(firstSelection);

  const selectedStyle = getNinjaStyleDefinition(selection?.style_key);
  const selectedLevel = Number(selection?.level || 0);
  const abilities = selectedStyle?.levels?.[selectedLevel] || [];

  function handleStyleChange(event) {
    const [styleKey, rawLevel] = event.target.value.split(":");
    const level = Number(rawLevel || 0);

    onChange(
      createNinjaStyleSelection({
        slot,
        styleKey,
        level,
        abilityKey: "",
      })
    );
  }

  function handleAbilityChange(abilityKey) {
    onChange(
      createNinjaStyleSelection({
        slot,
        styleKey: selection?.style_key,
        level: selection?.level,
        abilityKey,
      })
    );
  }

  const selectValue = selection?.style_key
    ? `${selection.style_key}:${selection.level}`
    : "";

  return (
    <section className={`ln-initial-style-card ${disabled ? "is-disabled" : ""}`}>
      <header>
        <span>{slot === 1 ? "1º Estilo Ninja" : "2º Estilo Ninja"}</span>
        <strong>
          {slot === 1
            ? "Escolha um Estilo no Nível 1"
            : "Comece outro Estilo ou evolua o primeiro para o Nível 2"}
        </strong>
      </header>

      <label className="ln-initial-style-select">
        <span>Estilo e nível</span>
        <select
          value={selectValue}
          onChange={handleStyleChange}
          disabled={disabled}
        >
          <option value="">Selecione</option>
          {availableStyles.map(({ styleKey, level }) => {
            const style = getNinjaStyleDefinition(styleKey);
            const isContinuation =
              slot === 2 && styleKey === firstSelection?.style_key;

            return (
              <option key={`${styleKey}-${level}`} value={`${styleKey}:${level}`}>
                {style?.shortName || style?.name} {level}
                {isContinuation ? " — continuação do primeiro" : ""}
              </option>
            );
          })}
        </select>
      </label>

      {selectedStyle && (
        <>
          <p className="ln-initial-style-description">
            {selectedStyle.shortDescription}
          </p>

          <div
            className="ln-initial-ability-list"
            role="radiogroup"
            aria-label={`Habilidade de ${selectedStyle.name} ${selectedLevel}`}
          >
            {abilities.map((item) => {
              const isSelected = selection?.ability_key === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={isSelected ? "is-selected" : ""}
                  onClick={() => handleAbilityChange(item.key)}
                  disabled={disabled}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <strong>{item.name}</strong>
                  <span>{item.summary}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateNinjaStyleSelection(slot, nextSelection) {
    setForm((current) => {
      const currentSelections = normalizeNinjaStyleSelections(
        current.ninjaStyleSelections
      );

      if (slot === 1) {
        return {
          ...current,
          ninjaStyleSelections: [nextSelection],
        };
      }

      return {
        ...current,
        ninjaStyleSelections: [currentSelections[0], nextSelection].filter(Boolean),
      };
    });
  }

  function validateCreateForm() {
    const requiredFields = [
      ["email", "E-mail"],
      ["password", "Senha"],
      ["playerName", "Nome do player"],
      ["phone", "Telefone"],
      ["characterName", "Nome do personagem"],
      ["age", "Idade"],
      ["clanOrKinship", "Clã ou Parentesco"],
      ["villageOrOrganization", "Aldeia ou Organização"],
      ["kekkeiGenkaiOrHiden", "Kekkei Genkai ou Hiden"],
      ["appearance", "Aparência"],
      ["history", "História"],
      ["equipment", "Equipamentos"],
      ["uniqueTrait", "Traço único"]
    ];

    for (const [field, label] of requiredFields) {
      if (!form[field]?.trim()) {
        return `Preencha o campo: ${label}.`;
      }
    }

    if (
      form.villageOrOrganization === "Outra Organização" &&
      !form.villageOrOrganizationOther.trim()
    ) {
      return "Informe a aldeia ou organização em Outra Organização.";
    }

    if (!isValidInitialChakraNature(form.chakraNatures)) {
      return "Escolha de 1 a 5 elementos básicos para o personagem. O primeiro será o elemento primário.";
    }

    const ninjaStyleValidation =
      getInitialNinjaStyleValidationError(form.ninjaStyleSelections);

    if (ninjaStyleValidation) {
      return ninjaStyleValidation;
    }

    if (form.password.length < 6) {
      return "A senha precisa ter pelo menos 6 caracteres.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não configurado.");
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      setMessage("Informe e-mail e senha.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "create") {
        const validationMessage = validateCreateForm();

        if (validationMessage) {
          setMessage(validationMessage);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              // LN_SIGNUP_FULL_METADATA_V2
              player_name: form.playerName.trim(),
              phone_number: form.phone.trim(),
              character_name: form.characterName.trim(),
              age: form.age.trim(),
              clan_or_kinship: form.clanOrKinship.trim(),
              village_or_organization: getFinalVillage(form),
              kekkei_genkai_or_hiden: form.kekkeiGenkaiOrHiden.trim(),
              chakra_natures: normalizeChakraNatures(form.chakraNatures),
              primary_element:
                getInitialChakraElement(form.chakraNatures)?.name || "",
              ninja_style: buildNinjaStyleSummary(form.ninjaStyleSelections),
              ninja_style_selections: normalizeNinjaStyleSelections(
                form.ninjaStyleSelections
              ),
              epithet: form.epithet.trim(),
              appearance: form.appearance.trim(),
              history: form.history.trim(),
              equipment: form.equipment.trim(),
              selected_traits: form.uniqueTrait.trim()
                ? [form.uniqueTrait.trim()]
                : [],
              portrait_url: form.characterPhotoUrl.trim(),
              icon_url: form.mapIconUrl.trim()
            }
          }
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        const character = makeCharacterRecord(form, data?.user);
        saveCharacterLocally(character);
        localStorage.setItem(CREATE_NINJA_AFTER_AUTH_KEY, "1");

        if (data?.session) {
          onAuthSuccess?.("my-ninja");
          return;
        }

        setMessage(
          "Conta e ninja criados. Confirme o e-mail e depois entre; sua ficha e os Estilos Ninja já estarão preenchidos no Meu Ninja."
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      onAuthSuccess?.("hall");
    } finally {
      setIsLoading(false);
    }
  }

  const isCreateMode = mode === "create";

  return (
    <main className="auth-page ln-auth-screen">
      <PasswordRecoveryWidget session={null} />
      <section className="ln-auth-shell">
        <div className="ln-auth-brand">
          <p className="eyebrow">Legendary Ninja Digital</p>
          <h1>{isCreateMode ? "Criar Ninja" : "Entrar no LN Digital"}</h1>
          <p>
            {isCreateMode
              ? "Crie sua conta e sua ficha inicial. O ninja ficará conectado automaticamente ao seu login."
              : "Acesse sua conta para abrir o Hall, Meu Ninja, mapa de viagens e painel do jogador."}
          </p>
        </div>

        <form
          className={"ln-auth-card " + (isCreateMode ? "is-create-mode" : "is-login-mode")}
          onSubmit={handleSubmit}
        >
          <div className="ln-auth-tabs" role="tablist" aria-label="Modo de autenticação">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={mode === "create" ? "active" : ""}
              onClick={() => {
                setMode("create");
                setMessage("");
              }}
            >
              Criar Ninja
            </button>
          </div>

          <div className="ln-auth-grid two">
            <label>
              <span>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="player@email.com"
                autoComplete="email"
              />
            </label>

            <label>
              <span>Senha</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete={isCreateMode ? "new-password" : "current-password"}
              />
            </label>
          </div>

          {!isCreateMode && (
            <button
              type="button"
              className="login-forgot-password-button"
              onClick={() => {
                window.dispatchEvent(new Event("open-password-recovery"));
              }}
            >
              Esqueci minha senha
            </button>
          )}

          {isCreateMode && (
            <>
              <div className="ln-auth-section-title">
                <span>Dados do player</span>
              </div>
              <p className="ln-auth-section-help">
                Estes dados identificam o responsável pela conta. Eles aparecerão automaticamente no Meu Ninja.
              </p>

              <div className="ln-auth-grid two">
                <label>
                  <span>Nome do player</span>
                  <input
                    value={form.playerName}
                    onChange={(event) => updateField("playerName", event.target.value)}
                    placeholder="Seu nome ou apelido"
                  />
                </label>

                <label>
                  <span>Telefone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </label>
              </div>

              <div className="ln-auth-section-title">
                <span>Ficha do personagem</span>
              </div>
              <p className="ln-auth-section-help">
                Preencha com atenção: esta será a ficha oficial inicial do personagem e não precisará ser digitada novamente.
              </p>

              <div className="ln-auth-grid three">
                <label>
                  <span>Nome do personagem</span>
                  <input
                    value={form.characterName}
                    onChange={(event) => updateField("characterName", event.target.value)}
                    placeholder="Ex: Marik Uchiha"
                  />
                </label>

                <label>
                  <span>Idade</span>
                  <input
                    value={form.age}
                    onChange={(event) => updateField("age", event.target.value)}
                    placeholder="Ex: 17"
                  />
                </label>

                <label>
                  <span>Clã ou Parentesco</span>
                  <input
                    value={form.clanOrKinship}
                    onChange={(event) => updateField("clanOrKinship", event.target.value)}
                    placeholder="Ex: Uchiha, Hyuuga, sem clã"
                  />
                </label>
              </div>

              <div className="ln-auth-grid two">
                <label>
                  <span>Aldeia ou Organização</span>
                  <select
                    value={form.villageOrOrganization}
                    onChange={(event) => updateField("villageOrOrganization", event.target.value)}
                  >
                    {VILLAGE_OPTIONS.map((option) => (
                      <option key={option || "empty"} value={option}>
                        {option || "Selecione"}
                      </option>
                    ))}
                  </select>
                </label>

                {form.villageOrOrganization === "Outra Organização" && (
                  <label>
                    <span>Qual?</span>
                    <input
                      value={form.villageOrOrganizationOther}
                      onChange={(event) =>
                        updateField("villageOrOrganizationOther", event.target.value)
                      }
                      placeholder="Nome da organização"
                    />
                  </label>
                )}

                <label>
                  <span>Kekkei Genkai ou Hiden</span>
                  <input
                    value={form.kekkeiGenkaiOrHiden}
                    onChange={(event) => updateField("kekkeiGenkaiOrHiden", event.target.value)}
                    placeholder="Ex: Sharingan, Byakugan, Nara"
                  />
                </label>

                <label>
                  <span>Epíteto</span>
                  <input
                    value={form.epithet}
                    onChange={(event) => updateField("epithet", event.target.value)}
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <div className="ln-auth-section-title">
                <span>Naturezas Elementais</span>
              </div>
              <p className="ln-auth-section-help">
                Selecione de 1 a 5 elementos básicos. O primeiro que você escolher será o elemento primário; todos os seguintes serão secundários. Clique novamente em um elemento para removê-lo.
              </p>

              <div
                className="ln-chakra-element-grid"
                role="group"
                aria-label="Naturezas elementais do personagem"
              >
                {INITIAL_CHAKRA_ELEMENTS.map((element) => {
                  const selectedNatures = normalizeChakraNatures(
                    form.chakraNatures
                  );
                  const selectedIndex = selectedNatures.indexOf(element.name);
                  const selected = selectedIndex >= 0;
                  const limitReached =
                    selectedNatures.length >= MAX_CHAKRA_NATURES;

                  return (
                    <button
                      key={element.key}
                      type="button"
                      className={selected ? "is-selected" : ""}
                      disabled={!selected && limitReached}
                      onClick={() => {
                        const nextNatures = selected
                          ? selectedNatures.filter(
                              (nature) => nature !== element.name
                            )
                          : [...selectedNatures, element.name];

                        updateField(
                          "chakraNatures",
                          normalizeChakraNatures(nextNatures)
                        );
                      }}
                      aria-pressed={selected}
                    >
                      <strong>{element.name}</strong>
                      <span>{element.label}</span>
                      <small>{element.summary}</small>
                      {selected && (
                        <em className="ln-chakra-element-order">
                          {selectedIndex === 0
                            ? "Primário"
                            : `${selectedIndex + 1}º escolhido · Secundário`}
                        </em>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="ln-chakra-element-count">
                {normalizeChakraNatures(form.chakraNatures).length} de {MAX_CHAKRA_NATURES} elementos selecionados.
                {normalizeChakraNatures(form.chakraNatures).length > 0 &&
                  ` Primário: ${getInitialChakraElement(form.chakraNatures)?.name || "—"}.`}
              </p>

              <div className="ln-auth-section-title">
                <span>Estilos Ninja iniciais</span>
              </div>
              <p className="ln-auth-section-help">
                Você começa com dois E.N. O primeiro sempre inicia no Nível 1. No segundo, escolha outro Estilo no Nível 1 ou continue o primeiro no Nível 2. Cada E.N. concede uma habilidade inicial do nível escolhido.
              </p>

              <div className="ln-initial-style-grid">
                <InitialNinjaStylePicker
                  slot={1}
                  selection={normalizeNinjaStyleSelections(form.ninjaStyleSelections)[0]}
                  onChange={(selection) => updateNinjaStyleSelection(1, selection)}
                />

                <InitialNinjaStylePicker
                  slot={2}
                  selection={normalizeNinjaStyleSelections(form.ninjaStyleSelections)[1]}
                  firstSelection={normalizeNinjaStyleSelections(form.ninjaStyleSelections)[0]}
                  disabled={!normalizeNinjaStyleSelections(form.ninjaStyleSelections)[0]?.ability_key}
                  onChange={(selection) => updateNinjaStyleSelection(2, selection)}
                />
              </div>

              <label className="ln-auth-full">
                <span>Aparência</span>
                <textarea
                  value={form.appearance}
                  onChange={(event) => updateField("appearance", event.target.value)}
                  placeholder="Descreva a aparência do personagem"
                />
              </label>

              <label className="ln-auth-full">
                <span>História</span>
                <textarea
                  value={form.history}
                  onChange={(event) => updateField("history", event.target.value)}
                  placeholder="Conte a história inicial do personagem"
                />
              </label>

              <label className="ln-auth-full">
                <span>Equipamentos</span>
                <textarea
                  value={form.equipment}
                  onChange={(event) => updateField("equipment", event.target.value)}
                  placeholder="Liste equipamentos iniciais, armas, itens..."
                />
              </label>

              <div className="ln-auth-grid three">
                <label>
                  <span>Traço único</span>
                  <select
                    value={form.uniqueTrait}
                    onChange={(event) => updateField("uniqueTrait", event.target.value)}
                  >
                    {UNIQUE_TRAIT_OPTIONS.map((option) => (
                      <option key={option || "empty"} value={option}>
                        {option || "Selecione"}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Foto do personagem</span>
                  <input
                    value={form.characterPhotoUrl}
                    onChange={(event) => updateField("characterPhotoUrl", event.target.value)}
                    placeholder="URL da imagem"
                  />
                </label>

                <label>
                  <span>Ícone do mapa</span>
                  <input
                    value={form.mapIconUrl}
                    onChange={(event) => updateField("mapIconUrl", event.target.value)}
                    placeholder="Opcional"
                  />
                </label>
              </div>
            </>
          )}

          {message && <p className="ln-auth-message">{message}</p>}

          <button className="ln-auth-submit" type="submit" disabled={isLoading}>
            {isLoading
              ? "Processando..."
              : isCreateMode
                ? "Criar conta e conectar Meu Ninja"
                : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
