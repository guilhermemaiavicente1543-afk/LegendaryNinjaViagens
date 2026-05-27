import { useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const SHEET_SECTIONS = [
  {
    title: "Identidade",
    description: "Dados principais do personagem e do player.",
    fields: [
      ["player", "Player"],
      ["confirmationNumber", "Número de confirmação"],
      ["characterName", "Personagem"],
      ["villageOrganization", "Aldeia / Organização"],
      ["appearance", "Aparência"],
      ["clans", "Clã(s)"],
      ["kekkeiGenkai", "Kekkei Genkai / Hiden"],
      ["ninjaStyle", "Estilo Ninja"],
      ["uniqueTrait", "Traço Único"],
      ["rankPatent", "Patente"],
      ["chakraNature", "Natureza de chakra"]
    ]
  },
  {
    title: "Ciência e Medicina",
    description: "Tipagem, corpo, implantes e adaptações.",
    fields: [
      ["bloodTyping", "Tipagem sanguínea"],
      ["bodyAdaptations", "Adaptações corporais"]
    ]
  },
  {
    title: "Arsenal",
    description: "Equipamentos, contratos e técnicas.",
    fields: [
      ["equipment", "Equipamentos"],
      ["contracts", "Contratos"],
      ["exclusiveTechniques", "Técnicas exclusivas"],
      ["physicalTechniques", "Técnicas físicas"],
      ["clanTechniques", "Técnicas de clãs"],
      ["neutralTechniques", "Técnicas neutras"],
      ["illusionTechniques", "Técnicas ilusórias"],
      ["elementalTechniques", "Técnicas elementares"]
    ]
  },
  {
    title: "Atividades",
    description: "Missões e registros de participação.",
    fields: [
      ["missionPatent", "Patente de missões"],
      ["missionsHistory", "Missões realizadas"]
    ]
  },
  {
    title: "Status do personagem",
    description: "Chakra, stamina, recuperação e atributos.",
    fields: [
      ["totalChakra", "Chakra total"],
      ["totalStamina", "Stamina total"],
      ["chakraRecovery", "Recuperação de chakra"],
      ["staminaRecovery", "Recuperação de stamina"],
      ["speed", "Velocidade"],
      ["perception", "Percepção"],
      ["otherStats", "Outros atributos"]
    ]
  },
  {
    title: "Prints e provas",
    description: "Provas e registros importantes do personagem.",
    fields: [
      ["proofs", "Prints e provas"],
      ["proofLinks", "Links de provas"]
    ]
  },
  {
    title: "APA especial / ações ocultas",
    description: "Ações ocultas enviadas no privado para administradores.",
    fields: [
      ["hiddenActions", "Ações ocultas"],
      ["hiddenActionProofs", "Provas de ações ocultas"]
    ]
  },
  {
    title: "Informações adicionais",
    description: "História, motivação, personalidade e desenvolvimento.",
    fields: [
      ["history", "História"],
      ["motivation", "Motivação"],
      ["personality", "Personalidade"],
      ["development", "Desenvolvimento"],
      ["peculiarities", "Peculiaridade(s)"],
      ["manias", "Mania(s)"],
      ["favoriteFoods", "Comida(s) preferida(s)"],
      ["dislikedFoods", "Comida que não gosta"],
      ["defects", "Defeito(s)"],
      ["additionalInfo", "Informações adicionais"]
    ]
  }
];

function getBaseSheet(character) {
  const chakraNatures = Array.isArray(character?.chakra_natures)
    ? character.chakra_natures.join(", ")
    : "";

  return {
    player: character?.player_name || "",
    characterName: character?.character_name || "",
    villageOrganization: character?.village_or_organization || "",
    appearance: character?.appearance || "",
    clans: character?.clan_or_kinship || "",
    kekkeiGenkai: character?.kekkei_genkai_or_hiden || "",
    ninjaStyle: character?.ninja_style || "",
    uniqueTrait: Array.isArray(character?.selected_traits)
      ? character.selected_traits.map((trait) => trait.name).join(", ")
      : "",
    rankPatent: character?.rank_title || "",
    chakraNature: chakraNatures,
    equipment: character?.equipment || "",
    history: character?.biography || character?.history || "",
    personality: character?.personality || ""
  };
}

export default function CharacterFullSheetPanel({ character, onCharacterUpdated }) {
  const initialSheet = useMemo(() => {
    return {
      ...getBaseSheet(character),
      ...(character?.profile_sheet || {})
    };
  }, [character]);

  const [sheet, setSheet] = useState(initialSheet);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field, value) {
    setSheet((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function saveSheet() {
    setMessage("");

    if (!character?.id) {
      setMessage("Crie seu ninja antes de salvar a ficha.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from("characters")
      .update({
        profile_sheet: sheet,
        updated_at: new Date().toISOString()
      })
      .eq("id", character.id)
      .select("*")
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(`Erro ao salvar ficha: ${error.message}`);
      return;
    }

    setMessage("Ficha completa salva com sucesso.");
    onCharacterUpdated?.(data);
  }

  return (
    <div className="full-sheet-panel">
      <header className="full-sheet-header">
        <div>
          <p className="eyebrow">Dossiê Shinobi</p>
          <h2>Ficha Completa</h2>
          <span>
            Área oficial para registrar técnicas, provas, status, arsenal,
            ações ocultas e desenvolvimento do personagem.
          </span>
        </div>

        <button type="button" onClick={saveSheet} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar ficha"}
        </button>
      </header>

      {message && <p className="full-sheet-message">{message}</p>}

      <div className="full-sheet-sections">
        {SHEET_SECTIONS.map((section) => (
          <section key={section.title} className="full-sheet-section">
            <div className="full-sheet-section-title">
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </div>

            <div className="full-sheet-fields">
              {section.fields.map(([field, label]) => (
                <label key={field} className="full-sheet-field">
                  <span>{label}</span>
                  <textarea
                    value={sheet[field] || ""}
                    onChange={(event) => updateField(field, event.target.value)}
                    placeholder={`Preencha: ${label}`}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
