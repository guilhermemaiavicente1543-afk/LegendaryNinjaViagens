import { useEffect, useMemo, useState } from "react";
import { uniqueTraits } from "../data/uniqueTraits";

const STORAGE_KEY = "legendary-ninja-characters";

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
  characterName: "",
  age: "",
  appearance: "",
  clanOrKinship: "",
  history: "",
  villageOrOrganization: "",
  kekkeiGenkaiOrHiden: "",
  equipment: "",
  ninjaStyle: "",
  selectedTraits: []
};

function readCharacters() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function CharactersPage({
  travels = [],
  now = Date.now(),
  getCoordinate,
  getTravelCurrentPoint,
  getTravelProgress,
  getRemainingTravelHours,
  getUnknownPresencesCount,
  formatUnknownPresences,
  formatTime
}) {
  const [characters, setCharacters] = useState(() => readCharacters());
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [profileTab, setProfileTab] = useState("info");

  const [form, setForm] = useState(initialForm);
  const [traitSearch, setTraitSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("Todos");

  useEffect(() => {
    if (!selectedCharacterId && characters.length > 0) {
      setSelectedCharacterId(characters[0].id);
    }
  }, [characters, selectedCharacterId]);

  const selectedCharacter = useMemo(
    () =>
      characters.find((character) => character.id === selectedCharacterId) ||
      null,
    [characters, selectedCharacterId]
  );

  const selectedCharacterTravel = useMemo(() => {
    if (!selectedCharacter) return null;

    return (
      travels.find((travel) => travel.characterId === selectedCharacter.id) ||
      null
    );
  }, [selectedCharacter, travels]);

  const selectedLocation = useMemo(() => {
    if (
      !selectedCharacterTravel ||
      !getTravelCurrentPoint ||
      !getCoordinate ||
      !getTravelProgress
    ) {
      return null;
    }

    const currentPoint = getTravelCurrentPoint(selectedCharacterTravel, now);
    const currentCoord = getCoordinate({
      lat: currentPoint[0],
      lng: currentPoint[1]
    });

    const progress = getTravelProgress(selectedCharacterTravel, now);
    const remainingHours = getRemainingTravelHours
      ? getRemainingTravelHours(selectedCharacterTravel, now)
      : 0;

    const unknownPresences =
      getUnknownPresencesCount && selectedCharacterTravel
        ? getUnknownPresencesCount(selectedCharacterTravel, travels, now)
        : 0;

    return {
      currentPoint,
      currentCoord,
      progress,
      progressPercent: Math.round(progress * 100),
      remainingHours,
      unknownPresences
    };
  }, [
    selectedCharacterTravel,
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

  function saveCharacter(event) {
    event.preventDefault();

    if (!form.characterName.trim()) {
      alert("Preencha o nome do personagem.");
      return;
    }

    const newCharacter = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...form
    };

    const updatedCharacters = [newCharacter, ...characters];

    setCharacters(updatedCharacters);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCharacters));

    setSelectedCharacterId(newCharacter.id);
    setProfileTab("info");
    setForm(initialForm);
    setTraitSearch("");
  }

  function deleteCharacter(characterId) {
    const updatedCharacters = characters.filter(
      (character) => character.id !== characterId
    );

    setCharacters(updatedCharacters);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCharacters));

    if (selectedCharacterId === characterId) {
      setSelectedCharacterId(updatedCharacters[0]?.id || "");
    }
  }

  function renderInfoTab() {
    if (!selectedCharacter) {
      return <p className="empty-message">Nenhum personagem selecionado.</p>;
    }

    return (
      <div className="profile-tab-content">
        <div className="profile-field">
          <strong>Nome</strong>
          <span>{selectedCharacter.characterName}</span>
        </div>

        <div className="profile-field">
          <strong>Idade</strong>
          <span>{selectedCharacter.age || "Não informada"}</span>
        </div>

        <div className="profile-field">
          <strong>Aldeia ou Organização</strong>
          <span>{selectedCharacter.villageOrOrganization || "Não informada"}</span>
        </div>

        <div className="profile-field">
          <strong>Clã ou Parentesco</strong>
          <span>{selectedCharacter.clanOrKinship || "Não informado"}</span>
        </div>

        <div className="profile-field">
          <strong>Kekkei Genkai ou Hiden</strong>
          <span>{selectedCharacter.kekkeiGenkaiOrHiden || "Nenhum"}</span>
        </div>

        <div className="profile-field">
          <strong>Estilo Ninja</strong>
          <span>{selectedCharacter.ninjaStyle || "Não selecionado"}</span>
        </div>

        <div className="profile-field full">
          <strong>Aparência</strong>
          <p>{selectedCharacter.appearance || "Não informada."}</p>
        </div>

        <div className="profile-field full">
          <strong>História</strong>
          <p>{selectedCharacter.history || "Não informada."}</p>
        </div>

        <div className="profile-field full">
          <strong>Equipamentos</strong>
          <p>{selectedCharacter.equipment || "Nenhum equipamento informado."}</p>
        </div>

        <div className="profile-field full">
          <strong>Traços Únicos</strong>

          <div className="card-traits">
            {selectedCharacter.selectedTraits?.length ? (
              selectedCharacter.selectedTraits.map((trait) => (
                <span key={trait.id}>{trait.name}</span>
              ))
            ) : (
              <p>Nenhum traço selecionado.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderLocationTab() {
    if (!selectedCharacter) {
      return <p className="empty-message">Nenhum personagem selecionado.</p>;
    }

    if (!selectedCharacterTravel || !selectedLocation) {
      return (
        <div className="profile-tab-content">
          <div className="location-status-card stopped">
            <strong>Status</strong>
            <span>Sem viagem ativa registrada.</span>
          </div>

          <p className="empty-message">
            Para registrar a localização, volte ao mapa, clique em origem e
            destino, selecione este personagem e inicie uma viagem.
          </p>
        </div>
      );
    }

    const arrived = selectedLocation.progress >= 1;
    const presenceText = formatUnknownPresences
      ? formatUnknownPresences(selectedLocation.unknownPresences)
      : selectedLocation.unknownPresences === 1
        ? "Há 1 presença desconhecida nesta região."
        : `Há ${selectedLocation.unknownPresences} presenças desconhecidas nesta região.`;

    return (
      <div className="profile-tab-content">
        <div className={`location-status-card ${arrived ? "arrived" : "moving"}`}>
          <strong>Status</strong>
          <span>{arrived ? "Chegou ao destino" : "Em viagem"}</span>
        </div>

        <div className="profile-field">
          <strong>Região atual</strong>
          <span>{selectedLocation.currentCoord?.macroLabel || "-"}</span>
        </div>

        <div className="profile-field">
          <strong>Coordenada atual</strong>
          <span>{selectedLocation.currentCoord?.label || "-"}</span>
        </div>

        <div className="profile-field">
          <strong>Origem</strong>
          <span>{selectedCharacterTravel.startCoord.label}</span>
        </div>

        <div className="profile-field">
          <strong>Destino</strong>
          <span>{selectedCharacterTravel.endCoord.label}</span>
        </div>

        <div className="profile-field">
          <strong>Meio de locomoção</strong>
          <span>{selectedCharacterTravel.modeLabel}</span>
        </div>

        <div className="profile-field">
          <strong>Progresso</strong>
          <span>{selectedLocation.progressPercent}%</span>
        </div>

        <div className="profile-field">
          <strong>Chegada prevista</strong>
          <span>{formatDateTime(selectedCharacterTravel.arrivalAt)}</span>
        </div>

        <div className="profile-field">
          <strong>Tempo restante</strong>
          <span>
            {arrived
              ? "Viagem concluída"
              : formatTime
                ? formatTime(selectedLocation.remainingHours)
                : `${selectedLocation.remainingHours.toFixed(2)}h`}
          </span>
        </div>

        <div className="profile-field full">
          <strong>Presenças na região</strong>
          <p className="presenceNotice">{presenceText}</p>
        </div>
      </div>
    );
  }

  function renderSkillTreeTab() {
    if (!selectedCharacter) {
      return <p className="empty-message">Nenhum personagem selecionado.</p>;
    }

    return (
      <div className="profile-tab-content">
        <div className="skill-placeholder">
          <h3>Árvore de Habilidades</h3>
          <p>
            Esta será a área da teia de habilidades do personagem. Aqui vamos
            conectar estilo ninja, habilidades desbloqueadas, pré-requisitos e
            evolução.
          </p>

          <div className="mini-skill-tree">
            <span>Estilo Ninja</span>
            <span>→</span>
            <span>{selectedCharacter.ninjaStyle || "Não definido"}</span>
            <span>→</span>
            <span>Habilidades futuras</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="characters-page">
      <div className="characters-header">
        <div>
          <p className="eyebrow">Legendary Ninja RPG</p>
          <h1>Perfil do Personagem</h1>
          <p>
            Crie fichas, acompanhe localização, visualize presenças na região e
            prepare a futura árvore de habilidades.
          </p>
        </div>
      </div>

      <div className="characters-layout">
        <form className="character-form" onSubmit={saveCharacter}>
          <h2>Nova Ficha</h2>

          <label>
            Nome do Personagem
            <input
              value={form.characterName}
              onChange={(event) =>
                updateField("characterName", event.target.value)
              }
              placeholder="Ex: Haruto Senju"
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
              onChange={(event) =>
                updateField("clanOrKinship", event.target.value)
              }
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
            <input
              value={form.villageOrOrganization}
              onChange={(event) =>
                updateField("villageOrOrganization", event.target.value)
              }
              placeholder="Ex: Vila Oculta da Folha, Akatsuki, organização própria..."
            />
          </label>

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
            <select
              value={form.ninjaStyle}
              onChange={(event) => updateField("ninjaStyle", event.target.value)}
            >
              <option value="">Selecione um estilo</option>
              {ninjaStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </label>

          <div className="trait-selector">
            <h3>Traços Únicos</h3>

            <div className="trait-filters">
              <input
                value={traitSearch}
                onChange={(event) => setTraitSearch(event.target.value)}
                placeholder="Pesquisar traço único..."
              />

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
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
          </div>

          <button className="save-character-button" type="submit">
            Salvar Personagem
          </button>
        </form>

        <aside className="characters-side-panel">
          <section className="character-profile-panel">
            <h2>Perfil</h2>

            {selectedCharacter ? (
              <>
                <div className="profile-title">
                  <h3>{selectedCharacter.characterName}</h3>
                  <p>
                    {selectedCharacter.villageOrOrganization || "Sem aldeia"} •{" "}
                    {selectedCharacter.ninjaStyle || "Sem estilo"}
                  </p>
                </div>

                <div className="profile-tabs">
                  <button
                    type="button"
                    className={profileTab === "info" ? "active" : ""}
                    onClick={() => setProfileTab("info")}
                  >
                    Informações
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
                    Árvore
                  </button>
                </div>

                {profileTab === "info" && renderInfoTab()}
                {profileTab === "location" && renderLocationTab()}
                {profileTab === "skills" && renderSkillTreeTab()}
              </>
            ) : (
              <p className="empty-message">Nenhum personagem criado ainda.</p>
            )}
          </section>

          <section className="characters-list">
            <h2>Personagens Salvos</h2>

            {characters.length === 0 ? (
              <p className="empty-message">Nenhum personagem criado ainda.</p>
            ) : (
              characters.map((character) => (
                <article
                  className={`character-card ${
                    selectedCharacterId === character.id ? "selected" : ""
                  }`}
                  key={character.id}
                >
                  <div className="character-card-header">
                    <div>
                      <h3>{character.characterName}</h3>
                      <p>
                        {character.villageOrOrganization || "Sem aldeia"} •{" "}
                        {character.ninjaStyle || "Sem estilo"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteCharacter(character.id)}
                    >
                      Apagar
                    </button>
                  </div>

                  <div className="character-card-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCharacterId(character.id);
                        setProfileTab("info");
                      }}
                    >
                      Informações
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCharacterId(character.id);
                        setProfileTab("location");
                      }}
                    >
                      Localização
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCharacterId(character.id);
                        setProfileTab("skills");
                      }}
                    >
                      Árvore
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
