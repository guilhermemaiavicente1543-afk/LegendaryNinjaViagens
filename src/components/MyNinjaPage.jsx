import { useEffect, useMemo, useState } from "react";

const CHARACTER_STORAGE_KEY = "legendary-ninja-characters";

const EMPTY_CHARACTER = {
  id: "",
  playerName: "",
  phone: "",
  characterName: "",
  age: "",
  gender: "",
  birthday: "",
  height: "",
  weight: "",
  villageOrOrganization: "",
  clanOrKinship: "",
  kekkeiGenkaiOrHiden: "",
  ninjaStyle: "",
  rank: "",
  epithet: "",
  appearance: "",
  history: "",
  equipment: "",
  uniqueTrait: "",
  portraitUrl: "",
  iconUrl: ""
};

const FORM_FIELDS = [
  ["playerName", "Nome do player"],
  ["phone", "Telefone"],
  ["characterName", "Nome do personagem"],
  ["age", "Idade"],
  ["gender", "Gênero"],
  ["birthday", "Aniversário"],
  ["height", "Altura"],
  ["weight", "Peso"],
  ["villageOrOrganization", "Aldeia ou Organização"],
  ["clanOrKinship", "Clã ou Parentesco"],
  ["kekkeiGenkaiOrHiden", "Kekkei Genkai ou Hiden"],
  ["ninjaStyle", "Estilo Ninja"],
  ["rank", "Graduação"],
  ["epithet", "Alcunha"],
  ["portraitUrl", "URL da foto do personagem"],
  ["iconUrl", "URL do ícone no mapa"]
];

const TEXTAREA_FIELDS = [
  ["appearance", "Aparência"],
  ["history", "História"],
  ["equipment", "Equipamentos"],
  ["uniqueTrait", "Traço único"]
];

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `character-${Date.now()}`;
}

function readCharacters() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHARACTER_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCharacter(character) {
  const nextCharacter = {
    ...character,
    id: character.id || makeId(),
    characterName: character.characterName || "Ninja sem nome",
    iconUrl: character.iconUrl || character.portraitUrl || "",
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify([nextCharacter]));
  window.dispatchEvent(new Event("storage"));

  return nextCharacter;
}

function valueOrDash(value) {
  return value && String(value).trim() ? value : "—";
}

export default function MyNinjaPage({ session }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [character, setCharacter] = useState(null);
  const [form, setForm] = useState(EMPTY_CHARACTER);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = readCharacters()[0] || null;

    if (saved) {
      setCharacter(saved);
      setForm({ ...EMPTY_CHARACTER, ...saved });
      setIsEditing(false);
    } else {
      setIsEditing(true);
      setForm((current) => ({
        ...current,
        playerName: session?.user?.user_metadata?.player_name || ""
      }));
    }
  }, [session?.user?.id]);

  const displayCharacter = character || form;
  const hasCharacter = Boolean(character?.id);

  const badges = useMemo(() => {
    return [
      displayCharacter.villageOrOrganization,
      displayCharacter.ninjaStyle,
      displayCharacter.rank || "Sem graduação"
    ].filter(Boolean);
  }, [displayCharacter]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSave(event) {
    event.preventDefault();

    if (!form.characterName.trim()) {
      setMessage("Informe o nome do personagem.");
      return;
    }

    const saved = saveCharacter({
      ...form,
      characterName: form.characterName.trim()
    });

    setCharacter(saved);
    setForm({ ...EMPTY_CHARACTER, ...saved });
    setIsEditing(false);
    setMessage("Ficha salva.");
  }

  return (
    <section className="ln-my-ninja-v2">
      <aside className="lnmn-sidebar">
        <div className="lnmn-brand">
          <span>忍</span>
          <div>
            <small>LN Digital</small>
            <strong>Hall</strong>
          </div>
        </div>

        <nav>
          <button type="button">Início</button>
          <button type="button">Mapa</button>
          <button type="button" className="active">Meu Ninja</button>
          <button type="button">Missões</button>
          <button type="button">Rankings</button>
          <button type="button">Loja</button>
        </nav>
      </aside>

      <main className="lnmn-main">
        <header className="lnmn-hero">
          <div>
            <p>Área do Player</p>
            <h1>MEU NINJA <span>✦</span></h1>
            <strong>
              Cada player possui apenas um ninja. Esta página reúne informações,
              localização e desenvolvimento do personagem.
            </strong>
          </div>
        </header>

        {!hasCharacter || isEditing ? (
          <form className="lnmn-create-card" onSubmit={handleSave}>
            <div className="lnmn-section-heading">
              <p>{hasCharacter ? "Editar Ficha" : "Criar Ninja"}</p>
              <h2>{hasCharacter ? "Atualize seu personagem" : "Preencha a ficha inicial"}</h2>
              <span>
                Depois de salvar, seu personagem aparecerá no Meu Ninja e poderá ser usado no mapa.
              </span>
            </div>

            {message && <div className="lnmn-message">{message}</div>}

            <div className="lnmn-form-grid">
              {FORM_FIELDS.map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    value={form[field] || ""}
                    onChange={(event) => updateField(field, event.target.value)}
                    required={field === "characterName"}
                  />
                </label>
              ))}

              {TEXTAREA_FIELDS.map(([field, label]) => (
                <label key={field} className="full">
                  {label}
                  <textarea
                    value={form[field] || ""}
                    onChange={(event) => updateField(field, event.target.value)}
                    rows={field === "history" ? 5 : 4}
                  />
                </label>
              ))}
            </div>

            <div className="lnmn-form-actions">
              <button type="submit">Salvar ficha</button>

              {hasCharacter && (
                <button type="button" onClick={() => setIsEditing(false)}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        ) : (
          <>
            <section className="lnmn-character-header">
              <div>
                <h2>{displayCharacter.characterName || "Ninja sem nome"}</h2>
                <p>
                  {valueOrDash(displayCharacter.villageOrOrganization)}
                  <span>•</span>
                  {valueOrDash(displayCharacter.ninjaStyle)}
                </p>
              </div>

              <button type="button" onClick={() => setIsEditing(true)}>
                Editar ficha
              </button>
            </section>

            <nav className="lnmn-tabs">
              <button
                type="button"
                className={activeTab === "profile" ? "active" : ""}
                onClick={() => setActiveTab("profile")}
              >
                Perfil
              </button>

              <button
                type="button"
                className={activeTab === "location" ? "active" : ""}
                onClick={() => setActiveTab("location")}
              >
                Localização
              </button>

              <button
                type="button"
                className={activeTab === "tree" ? "active" : ""}
                onClick={() => setActiveTab("tree")}
              >
                Árvore de Habilidades
              </button>
            </nav>

            {message && <div className="lnmn-message">{message}</div>}

            {activeTab === "profile" && (
              <>
                <section className="lnmn-profile-grid">
                  <article className="lnmn-profile-card">
                    <div className="lnmn-portrait">
                      {displayCharacter.portraitUrl ? (
                        <img src={displayCharacter.portraitUrl} alt={displayCharacter.characterName} />
                      ) : (
                        <span>✦</span>
                      )}
                    </div>

                    <div>
                      <p>Perfil do Personagem</p>
                      <h3>{displayCharacter.epithet || "Ninja sem alcunha definida"}</h3>

                      <div className="lnmn-badges">
                        {badges.map((badge) => (
                          <span key={badge}>{badge}</span>
                        ))}
                      </div>
                    </div>
                  </article>

                  <article className="lnmn-dossier-card">
                    <p>Dossiê Shinobi</p>
                    <h3>Ficha Complementar</h3>
                    <span>
                      Área para organizar provas, medicina, vínculos, inventário,
                      atividades, status, ações ocultas e desenvolvimento narrativo.
                    </span>

                    <div className="lnmn-dossier-menu">
                      <button type="button" className="active">Registro de Provas</button>
                      <button type="button">Ciência e Medicina</button>
                      <button type="button">Contratos e Vínculos</button>
                      <button type="button">Inventário</button>
                      <button type="button">Atividades e Missões</button>
                      <button type="button">Status do Personagem</button>
                    </div>
                  </article>
                </section>

                <section className="lnmn-bottom-grid">
                  <article>
                    <p>Identidade</p>
                    <dl>
                      <div><dt>Nome</dt><dd>{valueOrDash(displayCharacter.characterName)}</dd></div>
                      <div><dt>Player</dt><dd>{valueOrDash(displayCharacter.playerName)}</dd></div>
                      <div><dt>Gênero</dt><dd>{valueOrDash(displayCharacter.gender)}</dd></div>
                      <div><dt>Idade</dt><dd>{valueOrDash(displayCharacter.age)}</dd></div>
                      <div><dt>Aniversário</dt><dd>{valueOrDash(displayCharacter.birthday)}</dd></div>
                      <div><dt>Altura / Peso</dt><dd>{valueOrDash([displayCharacter.height, displayCharacter.weight].filter(Boolean).join(" / "))}</dd></div>
                    </dl>
                  </article>

                  <article>
                    <p>Afiliação e Origem</p>
                    <dl>
                      <div><dt>Aldeia ou Organização</dt><dd>{valueOrDash(displayCharacter.villageOrOrganization)}</dd></div>
                      <div><dt>Clã ou Parentesco</dt><dd>{valueOrDash(displayCharacter.clanOrKinship)}</dd></div>
                      <div><dt>Kekkei Genkai ou Hiden</dt><dd>{valueOrDash(displayCharacter.kekkeiGenkaiOrHiden)}</dd></div>
                      <div><dt>Graduação</dt><dd>{valueOrDash(displayCharacter.rank)}</dd></div>
                    </dl>
                  </article>

                  <article className="lnmn-map-icon-card">
                    <p>Ícone do Mapa</p>
                    <div className="lnmn-map-icon-preview">
                      {displayCharacter.iconUrl ? (
                        <img src={displayCharacter.iconUrl} alt="Ícone do mapa" />
                      ) : (
                        <span>✦</span>
                      )}
                    </div>
                    <strong>Personalizado</strong>
                  </article>
                </section>

                <section className="lnmn-story-card">
                  <article>
                    <p>Aparência</p>
                    <span>{valueOrDash(displayCharacter.appearance)}</span>
                  </article>

                  <article>
                    <p>História</p>
                    <span>{valueOrDash(displayCharacter.history)}</span>
                  </article>

                  <article>
                    <p>Equipamentos</p>
                    <span>{valueOrDash(displayCharacter.equipment)}</span>
                  </article>

                  <article>
                    <p>Traço único</p>
                    <span>{valueOrDash(displayCharacter.uniqueTrait)}</span>
                  </article>
                </section>
              </>
            )}

            {activeTab === "location" && (
              <section className="lnmn-placeholder-card">
                <p>Localização</p>
                <h3>Mapa e viagem serão reconectados aqui</h3>
                <span>
                  Primeiro vamos estabilizar o perfil leve. Depois encaixamos localização sem trazer o peso antigo.
                </span>
              </section>
            )}

            {activeTab === "tree" && (
              <section className="lnmn-placeholder-card">
                <p>Árvore de Habilidades</p>
                <h3>Teia será reconectada depois</h3>
                <span>
                  A teia oficial será integrada depois, sem duplicar componentes pesados.
                </span>
              </section>
            )}
          </>
        )}
      </main>
    </section>
  );
}
