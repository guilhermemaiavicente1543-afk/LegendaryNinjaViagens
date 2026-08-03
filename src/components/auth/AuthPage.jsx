import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import { uniqueTraits } from "../../data/uniqueTraits";

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
    clanOrKinship: form.clanOrKinship.trim(),
    villageOrOrganization: getFinalVillage(form),
    kekkeiGenkaiOrHiden: form.kekkeiGenkaiOrHiden.trim(),
    epithet: form.epithet.trim(),
    appearance: form.appearance.trim(),
    history: form.history.trim(),
    equipment: form.equipment.trim(),
    uniqueTrait: form.uniqueTrait.trim(),
    characterPhotoUrl: form.characterPhotoUrl.trim(),
    mapIconUrl: form.mapIconUrl.trim(),

    skillPoints: 50,
    unlockedSkillIds: [],
    currentLocation: null,
    profileSheet: {
      playerName: form.playerName.trim(),
      phone: form.phone.trim(),
      characterName: form.characterName.trim(),
      age: form.age.trim(),
      clanOrKinship: form.clanOrKinship.trim(),
      villageOrOrganization: getFinalVillage(form),
      kekkeiGenkaiOrHiden: form.kekkeiGenkaiOrHiden.trim(),
      epithet: form.epithet.trim(),
      appearance: form.appearance.trim(),
      history: form.history.trim(),
      equipment: form.equipment.trim(),
      uniqueTrait: form.uniqueTrait.trim(),
      characterPhotoUrl: form.characterPhotoUrl.trim(),
      mapIconUrl: form.mapIconUrl.trim(),
      currentLocation: null
    }
  };
}

async function trySaveCharacterToSupabase(character) {
  if (!isSupabaseConfigured || !supabase || !character.userId) {
    return;
  }

  const payload = {
    user_id: character.userId,
    player_name: character.playerName,
    phone: character.phone,
    character_name: character.characterName,
    age: character.age,
    clan_or_kinship: character.clanOrKinship,
    village_or_organization: character.villageOrOrganization,
    kekkei_genkai_or_hiden: character.kekkeiGenkaiOrHiden,
    epithet: character.epithet,
    appearance: character.appearance,
    history: character.history,
    equipment: character.equipment,
    unique_trait: character.uniqueTrait,
    character_photo_url: character.characterPhotoUrl,
    map_icon_url: character.mapIconUrl,
    profile_sheet: character.profileSheet,
    skill_points: character.skillPoints
  };

  const { error } = await supabase.from("characters").insert(payload);

  if (error) {
    console.warn("Não foi possível salvar personagem no Supabase:", error.message);
  }
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
              player_name: form.playerName.trim(),
              phone: form.phone.trim(),
              character_name: form.characterName.trim()
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
          await trySaveCharacterToSupabase(character);
          onAuthSuccess?.("my-ninja");
          return;
        }

        const { error: loginAfterSignupError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password
        });

        await trySaveCharacterToSupabase(character);

        if (!loginAfterSignupError) {
          onAuthSuccess?.("my-ninja");
          return;
        }

        setMessage(
          "Conta criada e ninja salvo. Confirme o e-mail se necessário; ao entrar, você será levado ao Meu Ninja."
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
