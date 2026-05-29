import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

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

function traitsToText(character) {
  const traits = character?.selected_traits;

  if (!Array.isArray(traits)) {
    return "";
  }

  return traits
    .map((trait) => {
      if (typeof trait === "string") return trait;
      return trait?.name || trait?.title || trait?.label || "";
    })
    .filter(Boolean)
    .join(", ");
}

function textToTraits(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildForm(character) {
  return {
    characterName: valueOrEmpty(character?.character_name || character?.name),
    playerName: valueOrEmpty(character?.player_name),
    gender: valueOrEmpty(character?.gender),
    age: valueOrEmpty(character?.age),
    birthday: valueOrEmpty(character?.birthday),
    heightCm: valueOrEmpty(character?.height_cm),
    weightKg: valueOrEmpty(character?.weight_kg),
    villageOrOrganization: valueOrEmpty(character?.village_or_organization),
    clanOrKinship: valueOrEmpty(character?.clan_or_kinship),
    kekkeiGenkaiOrHiden: valueOrEmpty(character?.kekkei_genkai_or_hiden),
    rankTitle: valueOrEmpty(character?.rank_title),
    ninjaStyle: valueOrEmpty(character?.ninja_style),
    epithet: valueOrEmpty(character?.epithet),
    quote: valueOrEmpty(character?.quote),
    uniqueTraits: traitsToText(character),
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

  useEffect(() => {
    setForm(buildForm(character));
    setMessage("");
  }, [character?.id]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
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

    const payload = {
      character_name: form.characterName.trim(),
      player_name: form.playerName.trim(),
      gender: form.gender.trim(),
      age: form.age.trim(),
      birthday: form.birthday.trim(),
      height_cm: numberOrNull(form.heightCm),
      weight_kg: numberOrNull(form.weightKg),
      village_or_organization: form.villageOrOrganization.trim(),
      clan_or_kinship: form.clanOrKinship.trim(),
      kekkei_genkai_or_hiden: form.kekkeiGenkaiOrHiden.trim(),
      rank_title: form.rankTitle.trim(),
      ninja_style: form.ninjaStyle.trim(),
      epithet: form.epithet.trim(),
      quote: form.quote.trim(),
      selected_traits: textToTraits(form.uniqueTraits),
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
    <div className="mnd-info-editor-shell">
      <div className="mnd-character-info-actions">
        <div>
          <span>Dados de criação</span>
          <strong>Informações do personagem</strong>
        </div>

        <button type="button" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "Fechar edição" : "Editar informações"}
        </button>
      </div>

      {message ? <div className="mnd-info-editor-message">{message}</div> : null}

      {isOpen ? (
        <div className="mnd-info-editor-panel">
          <div className="mnd-info-editor-grid">
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
                placeholder="Ex.: 12/04"
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
              <span>Vila / Organização</span>
              <input
                value={form.villageOrOrganization}
                onChange={(event) => updateField("villageOrOrganization", event.target.value)}
              />
            </label>

            <label>
              <span>Clã / Parentesco</span>
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
              <input
                value={form.ninjaStyle}
                onChange={(event) => updateField("ninjaStyle", event.target.value)}
              />
            </label>

            <label>
              <span>Alcunha</span>
              <input
                value={form.epithet}
                onChange={(event) => updateField("epithet", event.target.value)}
              />
            </label>

            <label className="wide">
              <span>Frase</span>
              <input
                value={form.quote}
                onChange={(event) => updateField("quote", event.target.value)}
              />
            </label>

            <label className="wide">
              <span>Traços únicos</span>
              <textarea
                value={form.uniqueTraits}
                onChange={(event) => updateField("uniqueTraits", event.target.value)}
                placeholder="Separe por vírgulas. Ex.: Sensor, Rastreador, Médico"
                rows={3}
              />
            </label>
          </div>

          <div className="mnd-info-editor-footer">
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
