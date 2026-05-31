import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import { uniqueTraits } from "../../data/uniqueTraits";

const CHARACTER_STORAGE_KEY = "legendary-ninja-characters";

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
  if (form.villageOrOrganization === "Outro") {
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

    skillPoints: 0,
    unlockedSkillIds: [],
    currentLocation: null
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
    map_icon_url: character.mapIconUrl
  };

  const { error } = await supabase.from("characters").insert(payload);

  if (error) {
    console.warn("Não foi possível salvar personagem no Supabase:", error.message);
  }
}

export default function AuthPage({ onDemoEnter }) {
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

    if (form.villageOrOrganization === "Outro" && !form.villageOrOrganizationOther.trim()) {
      return "Informe a aldeia ou organização em Outro.";
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

    if (mode === "create") {
      const validationMessage = validateCreateForm();

      if (validationMessage) {
        setIsLoading(false);
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
        setIsLoading(false);
        setMessage(error.message);
        return;
      }

      const character = makeCharacterRecord(form, data?.user);
      saveCharacterLocally(character);
      await trySaveCharacterToSupabase(character);

      setIsLoading(false);
      setMessage(
        "Ninja criado. Se o login não entrar automaticamente, confirme o e-mail e depois use Entrar."
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password
    });

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Entrando...");
  }

  const isCreateMode = mode === "create";

  return (
    <main className="ln-auth-page-v2">
      <section className="ln-auth-card-v2">
        <div className="ln-auth-brand-v2">
          <span>忍</span>
          <div>
            <small>LN Digital</small>
            <strong>Hall</strong>
          </div>
        </div>

        <div className="ln-auth-heading-v2">
          <p>{mode === "login" ? "Acesso do Player" : "Cadastro Shinobi"}</p>
          <h1>{mode === "login" ? "Entrar" : "Criar Ninja"}</h1>
          <span>
            {mode === "login"
              ? "Entre com sua conta para continuar sua jornada."
              : "O cadastro já é a criação oficial do personagem. Cada player terá apenas um ninja."}
          </span>
        </div>

        <div className="ln-auth-mode-tabs-v2">
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

        <form className="ln-auth-form-v2 ln-auth-form-ninja" onSubmit={handleSubmit}>
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="player@email.com"
              autoComplete="email"
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {isCreateMode && (
            <>
              <div className="ln-auth-form-section-title">Dados do player</div>

              <label>
                Nome do player
                <input
                  value={form.playerName}
                  onChange={(event) => updateField("playerName", event.target.value)}
                  placeholder="Seu nome ou apelido"
                />
              </label>

              <label>
                Telefone
                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </label>

              <div className="ln-auth-form-section-title">Ficha do personagem</div>

              <label>
                Nome do personagem
                <input
                  value={form.characterName}
                  onChange={(event) => updateField("characterName", event.target.value)}
                  placeholder="Ex: Marik Uchiha"
                />
              </label>

              <label>
                Idade
                <input
                  value={form.age}
                  onChange={(event) => updateField("age", event.target.value)}
                  placeholder="Ex: 17"
                />
              </label>

              <label>
                Clã ou Parentesco
                <input
                  value={form.clanOrKinship}
                  onChange={(event) => updateField("clanOrKinship", event.target.value)}
                  placeholder="Ex: Uchiha, Hyuuga, sem clã..."
                />
              </label>

              <label>
                Aldeia ou Organização
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

              <label>
                Kekkei Genkai ou Hiden
                <input
                  value={form.kekkeiGenkaiOrHiden}
                  onChange={(event) => updateField("kekkeiGenkaiOrHiden", event.target.value)}
                  placeholder="Ex: Sharingan, Byakugan, Nara..."
                />
              </label>

              <label>
                Alcunha / Epíteto
                <input
                  value={form.epithet}
                  onChange={(event) => updateField("epithet", event.target.value)}
                  placeholder="Opcional"
                />
              </label>

              <label>
                Aparência
                <textarea
                  value={form.appearance}
                  onChange={(event) => updateField("appearance", event.target.value)}
                  placeholder="Descreva a aparência do personagem"
                  rows={4}
                />
              </label>

              <label>
                História
                <textarea
                  value={form.history}
                  onChange={(event) => updateField("history", event.target.value)}
                  placeholder="Conte a história inicial do personagem"
                  rows={5}
                />
              </label>

              <label>
                Equipamentos
                <textarea
                  value={form.equipment}
                  onChange={(event) => updateField("equipment", event.target.value)}
                  placeholder="Liste equipamentos iniciais, armas, itens..."
                  rows={4}
                />
              </label>

              <label>
                Traço único
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
                URL da foto do personagem
                <input
                  value={form.characterPhotoUrl}
                  onChange={(event) => updateField("characterPhotoUrl", event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label>
                URL do ícone do mapa
                <input
                  value={form.mapIconUrl}
                  onChange={(event) => updateField("mapIconUrl", event.target.value)}
                  placeholder="https://..."
                />
              </label>
            </>
          )}

          {message && <p className="ln-auth-message-v2">{message}</p>}

          <button type="submit" disabled={isLoading}>
            {isLoading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta e ninja"}
          </button>
        </form>

        {typeof onDemoEnter === "function" && (
          <button
            type="button"
            className="ln-auth-demo-v2"
            onClick={onDemoEnter}
          >
            Entrar em modo demonstração
          </button>
        )}
      </section>
    </main>
  );
}
