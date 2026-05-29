import { useEffect, useMemo, useState } from "react";
import { uniqueTraits } from "../../data/uniqueTraits";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

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

const mapIconOptions = [
  { value: "shuriken", label: "Shuriken", glyph: "✦" },
  { value: "village", label: "Vila", glyph: "⌂" },
  { value: "question", label: "Interrogação", glyph: "?" },
  { value: "castle", label: "Castelo", glyph: "♜" },
  { value: "warning", label: "Exclamação", glyph: "!" },
  { value: "paw", label: "Patinha", glyph: "♣" }
];

function valueOrEmpty(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function numberOrNull(value) {
  const clean = String(value || "").trim();

  if (!clean) return null;

  const number = Number(clean);

  return Number.isFinite(number) ? number : null;
}

function normalizeTrait(trait) {
  if (!trait) return null;

  if (typeof trait === "object") {
    const name = trait.name || trait.title || trait.label || "";

    if (!name) return null;

    return {
      ...trait,
      id: trait.id || name,
      name,
    };
  }

  const name = String(trait).trim();

  if (!name) return null;

  const found = uniqueTraits.find((item) => {
    return (
      String(item.id) === name ||
      String(item.name || "").toLowerCase() === name.toLowerCase()
    );
  });

  if (found) return found;

  return {
    id: "custom-" + name,
    name,
    category: "Personalizado",
    type: "Manual",
    requirement: "",
    description: "",
  };
}

function normalizeTraits(character) {
  const raw = character?.selected_traits;

  if (!Array.isArray(raw)) return [];

  return raw.map(normalizeTrait).filter(Boolean);
}

function buildForm(character) {
  const savedVillage = character?.village_or_organization || "";
  const isKnownVillage = villageOptions.includes(savedVillage);

  return {
    characterName: valueOrEmpty(character?.character_name || character?.name),
    playerName: valueOrEmpty(character?.player_name),
    gender: valueOrEmpty(character?.gender),
    age: valueOrEmpty(character?.age),
    birthday: valueOrEmpty(character?.birthday),
    heightCm: valueOrEmpty(character?.height_cm),
    weightKg: valueOrEmpty(character?.weight_kg),
    villageChoice: isKnownVillage ? savedVillage : savedVillage ? "Outros" : "",
    villageOrOrganization: isKnownVillage ? "" : valueOrEmpty(savedVillage),
    origin: valueOrEmpty(character?.origin || character?.history),
    clanOrKinship: valueOrEmpty(character?.clan_or_kinship),
    kekkeiGenkaiOrHiden: valueOrEmpty(character?.kekkei_genkai_or_hiden),
    rankTitle: valueOrEmpty(character?.rank_title),
    ninjaStyle: valueOrEmpty(character?.ninja_style),
    epithet: valueOrEmpty(character?.epithet),
    quote: valueOrEmpty(character?.quote),
    mapIcon: valueOrEmpty(character?.icon_url || "shuriken"),
    selectedTraits: normalizeTraits(character),
  };
}

export default function MyNinjaDesktopInfoEditor({
  character,
  onCharacterUpdated,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(() => buildForm(character));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [traitSearch, setTraitSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("Todos");

  useEffect(() => {
    setForm(buildForm(character));
    setMessage("");
  }, [character?.id, character?.updated_at]);

  const currentMapIcon = useMemo(() => {
    return (
      mapIconOptions.find((option) => option.value === form.mapIcon) ||
      mapIconOptions[0]
    );
  }, [form.mapIcon]);

  const traitCategories = useMemo(() => {
    const all = uniqueTraits.map((trait) => trait.category).filter(Boolean);
    return ["Todos", ...Array.from(new Set(all))];
  }, []);

  const traitTypes = useMemo(() => {
    const all = uniqueTraits.map((trait) => trait.type).filter(Boolean);
    return ["Todos", ...Array.from(new Set(all))];
  }, []);

  const filteredTraits = useMemo(() => {
    const search = traitSearch.trim().toLowerCase();

    return uniqueTraits.filter((trait) => {
      const matchesSearch =
        !search ||
        String(trait.name || "").toLowerCase().includes(search) ||
        String(trait.category || "").toLowerCase().includes(search) ||
        String(trait.type || "").toLowerCase().includes(search) ||
        String(trait.requirement || "").toLowerCase().includes(search) ||
        String(trait.description || "").toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "Todos" || trait.category === categoryFilter;

      const matchesType =
        typeFilter === "Todos" || trait.type === typeFilter;

      const alreadySelected = form.selectedTraits.some((selected) => {
        return String(selected.id) === String(trait.id);
      });

      return matchesSearch && matchesCategory && matchesType && !alreadySelected;
    });
  }, [traitSearch, categoryFilter, typeFilter, form.selectedTraits]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addTrait(trait) {
    setForm((current) => ({
      ...current,
      selectedTraits: [...current.selectedTraits, trait],
    }));

    setTraitSearch("");
  }

  function removeTrait(traitId) {
    setForm((current) => ({
      ...current,
      selectedTraits: current.selectedTraits.filter((trait) => {
        return String(trait.id) !== String(traitId);
      }),
    }));
  }

  async function saveInformation() {
    setMessage("");

    if (!character?.id) {
      setMessage("Crie ou carregue um personagem antes de editar.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    const village =
      form.villageChoice === "Outros"
        ? form.villageOrOrganization.trim()
        : form.villageChoice;

    const payload = {
      character_name: form.characterName.trim(),
      player_name: form.playerName.trim(),
      gender: form.gender.trim(),
      age: form.age.trim(),
      birthday: form.birthday.trim(),
      height_cm: numberOrNull(form.heightCm),
      weight_kg: numberOrNull(form.weightKg),
      village_or_organization: village,
      history: form.origin.trim(),
      clan_or_kinship: form.clanOrKinship.trim(),
      kekkei_genkai_or_hiden: form.kekkeiGenkaiOrHiden.trim(),
      rank_title: form.rankTitle.trim(),
      ninja_style: form.ninjaStyle,
      epithet: form.epithet.trim(),
      quote: form.quote.trim(),
      icon_url: form.mapIcon,
      selected_traits: form.selectedTraits,
      updated_at: new Date().toISOString(),
    };

    if (!payload.character_name) {
      setMessage("O nome do personagem não pode ficar vazio.");
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from("characters")
        .update(payload)
        .eq("id", character.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      if (typeof onCharacterUpdated === "function") {
        onCharacterUpdated(data);
      }

      setMessage("Informações salvas com sucesso.");
      setIsOpen(false);
    } catch (error) {
      setMessage("Erro ao salvar informações: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mnd-creation-editor-shell">
      <div className="mnd-creation-editor-head">
        <div>
          <span>Dados de criação</span>
          <strong>Informações do personagem</strong>
        </div>

        <button type="button" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "Fechar edição" : "Editar informações"}
        </button>
      </div>

      {message ? <div className="mnd-creation-editor-message">{message}</div> : null}

      {isOpen ? (
        <div className="mnd-creation-editor-panel">
          <div className="mnd-creation-editor-grid">
            <label>
              <span>Nome do personagem</span>
              <input
                value={form.characterName}
                onChange={(event) => updateField("characterName", event.target.value)}
              />
            </label>

            <label>
              <span>Player</span>
              <input
                value={form.playerName}
                onChange={(event) => updateField("playerName", event.target.value)}
              />
            </label>

            <label>
              <span>Gênero</span>
              <input
                value={form.gender}
                onChange={(event) => updateField("gender", event.target.value)}
              />
            </label>

            <label>
              <span>Idade</span>
              <input
                value={form.age}
                onChange={(event) => updateField("age", event.target.value)}
              />
            </label>

            <label>
              <span>Aniversário</span>
              <input
                value={form.birthday}
                onChange={(event) => updateField("birthday", event.target.value)}
              />
            </label>

            <label>
              <span>Altura em cm</span>
              <input
                value={form.heightCm}
                onChange={(event) => updateField("heightCm", event.target.value)}
                inputMode="numeric"
              />
            </label>

            <label>
              <span>Peso em kg</span>
              <input
                value={form.weightKg}
                onChange={(event) => updateField("weightKg", event.target.value)}
                inputMode="numeric"
              />
            </label>

            <label>
              <span>Aldeia ou Organização</span>
              <select
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
              </select>
            </label>

            {form.villageChoice === "Outros" ? (
              <label>
                <span>Informe a vila/organização</span>
                <input
                  value={form.villageOrOrganization}
                  onChange={(event) => updateField("villageOrOrganization", event.target.value)}
                />
              </label>
            ) : null}

            <label>
              <span>Origem</span>
              <input
                value={form.origin}
                onChange={(event) => updateField("origin", event.target.value)}
              />
            </label>

            <label>
              <span>Clã ou Parentesco</span>
              <input
                value={form.clanOrKinship}
                onChange={(event) => updateField("clanOrKinship", event.target.value)}
              />
            </label>

            <label>
              <span>Kekkei Genkai / Hiden</span>
              <input
                value={form.kekkeiGenkaiOrHiden}
                onChange={(event) => updateField("kekkeiGenkaiOrHiden", event.target.value)}
              />
            </label>

            <label>
              <span>Graduação</span>
              <input
                value={form.rankTitle}
                onChange={(event) => updateField("rankTitle", event.target.value)}
              />
            </label>

            <label>
              <span>Estilo Ninja</span>
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

            <label>
              <span>Alcunha</span>
              <input
                value={form.epithet}
                onChange={(event) => updateField("epithet", event.target.value)}
              />
            </label>

            <label>
              <span>Frase</span>
              <input
                value={form.quote}
                onChange={(event) => updateField("quote", event.target.value)}
              />
            </label>
          </div>

          <div className="mnd-map-icon-editor-block">
            <span>Ícone do mapa</span>

            <div className="mnd-map-icon-selector">
              {mapIconOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={form.mapIcon === option.value ? "is-active" : ""}
                  onClick={() => updateField("mapIcon", option.value)}
                >
                  <strong>{option.glyph}</strong>
                  <em>{option.label}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="mnd-traits-editor-block">
            <div className="mnd-traits-editor-title">
              <span>Traços Únicos</span>
              <strong>Selecione os traços do personagem</strong>
            </div>

            <div className="mnd-trait-filters">
              <input
                value={traitSearch}
                onChange={(event) => setTraitSearch(event.target.value)}
                placeholder="Buscar traço, requisito, categoria..."
              />

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                {traitCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                {traitTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="mnd-trait-results">
              {filteredTraits.slice(0, 12).map((trait) => (
                <button
                  type="button"
                  key={trait.id}
                  className="mnd-trait-result"
                  onClick={() => addTrait(trait)}
                >
                  <strong>{trait.name}</strong>
                  <span>
                    {trait.category} • {trait.type} • {trait.requirement || "Sem requisito"}
                  </span>
                </button>
              ))}

              {filteredTraits.length === 0 ? (
                <p>Nenhum traço encontrado.</p>
              ) : null}
            </div>

            <div className="mnd-selected-traits">
              {form.selectedTraits.length === 0 ? (
                <p>Nenhum traço selecionado.</p>
              ) : (
                form.selectedTraits.map((trait) => (
                  <button
                    type="button"
                    key={trait.id}
                    className="mnd-selected-trait"
                    onClick={() => removeTrait(trait.id)}
                  >
                    {trait.name} ×
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mnd-creation-editor-footer">
            <button type="button" onClick={() => setIsOpen(false)}>
              Cancelar
            </button>

            <button type="button" onClick={saveInformation} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar informações"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
