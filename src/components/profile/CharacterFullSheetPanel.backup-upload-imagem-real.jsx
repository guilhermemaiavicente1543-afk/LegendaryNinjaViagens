import { useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const SHEET_SECTIONS = [
  {
    id: "admin",
    icon: "巻",
    title: "Registro Administrativo",
    description: "Dados de confirmação, provas e registros oficiais do personagem.",
    fields: [
      ["confirmationNumber", "Número de confirmação"],
      ["proofs", "Prints e provas"],
      ["proofLinks", "Links de provas"]
    ]
  },
  {
    id: "science",
    icon: "医",
    title: "Ciência e Medicina",
    description: "Informações corporais, implantes, sorteios e alterações físicas.",
    fields: [
      ["bloodTyping", "Tipagem sanguínea"],
      ["bodyAdaptations", "Adaptações corporais"]
    ]
  },
  {
    id: "arsenal",
    icon: "武",
    title: "Contratos e Vínculos Especiais",
    description: "Contratos, modo sábio, pactos e vínculos especiais que não funcionam como item comum de inventário.",
    fields: [
      ["contracts", "Contratos especiais"],
      ["summonContracts", "Contratos de invocação / modo sábio"]
    ]
  },
  {
    id: "activities",
    icon: "任",
    title: "Atividades e Missões",
    description: "Histórico de missões, patentes de missão e participação em eventos.",
    fields: [
      ["missionPatent", "Patente de missões"],
      ["missionsHistory", "Missões realizadas"]
    ]
  },
  {
    id: "status",
    icon: "気",
    title: "Status do Personagem",
    description: "Chakra, stamina, recuperação e atributos complementares.",
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
    id: "hidden",
    icon: "影",
    title: "APA Especial / Ações Ocultas",
    description: "Ações enviadas no privado para administradores, com data, horário e prova.",
    fields: [
      ["hiddenActions", "Ações ocultas"],
      ["hiddenActionProofs", "Provas de ações ocultas"]
    ]
  },
  {
    id: "development",
    icon: "心",
    title: "Desenvolvimento Narrativo",
    description: "Informações de personalidade, motivações, evolução e características únicas.",
    fields: [
      ["motivation", "Motivação"],
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

const FIELD_HINTS = {
  confirmationNumber: "Ex.: 1837",
  proofs: "Cole aqui prints, datas, nomes de ADM, decisões, aprovações e registros importantes.",
  proofLinks: "Links de imagens, documentos, posts ou provas externas.",
  bloodTyping: "Registre sorteios, compatibilidade corporal, implantes de DNA e resultado do bot/ADM.",
  bodyAdaptations: "Descreva adaptações corporais, participantes, data, origem e aprovação.",
  contracts: "Contratos assinados, pactos, acordos e vínculos especiais.",
  summonContracts: "Contrato animal, modo sábio, responsável, data e prova.",
  missionPatent: "Patente/rank de missões.",
  missionsHistory: "Título da missão, rank, participantes, narrador, data e resultado.",
  totalChakra: "Valor total de chakra.",
  totalStamina: "Valor total de stamina.",
  chakraRecovery: "Recuperação de chakra por turno/período.",
  staminaRecovery: "Recuperação de stamina por turno/período.",
  speed: "Velocidade atual, bônus e origem.",
  perception: "Percepção atual, bônus e origem.",
  otherStats: "Outros atributos, modificadores, bônus e penalidades.",
  hiddenActions: "Ex.: Enviado para Ezelta às 23:03 no dia 31/01/2024.",
  hiddenActionProofs: "Prints, links e provas das ações ocultas.",
  motivation: "O que move o personagem?",
  development: "Mudanças, aprendizados e evolução ao longo do RPG.",
  peculiarities: "Características únicas do personagem.",
  manias: "Hábitos repetitivos ou comportamentos marcantes.",
  favoriteFoods: "Comidas preferidas.",
  dislikedFoods: "Comidas que não aprecia.",
  defects: "Defeitos, fraquezas e pontos negativos.",
  additionalInfo: "Qualquer informação extra relevante."
};

function buildInitialSheet(character) {
  return {
    ...(character?.profile_sheet || {})
  };
}

export default function CharacterFullSheetPanel({ character, onCharacterUpdated }) {
  const initialSheet = useMemo(() => buildInitialSheet(character), [character]);

  const [sheet, setSheet] = useState(initialSheet);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [openSection, setOpenSection] = useState("admin");

  function updateField(field, value) {
    setSheet((current) => ({
      ...current,
      [field]: value
    }));
  }

  function hasSectionContent(section) {
    return section.fields.some(([field]) => String(sheet[field] || "").trim());
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
    <div className="full-sheet-panel full-sheet-polished">
      <header className="full-sheet-header polished">
        <div>
          <p className="eyebrow">Dossiê Shinobi</p>
          <h2>Ficha Complementar</h2>
          <span>
            Esta área registra apenas dados que não aparecem no perfil principal
            nem no inventário: provas, status, ações ocultas, medicina, missões,
            contratos especiais e desenvolvimento.
          </span>
        </div>

        <button type="button" onClick={saveSheet} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar ficha"}
        </button>
      </header>

      {message && <p className="full-sheet-message">{message}</p>}

      <div className="full-sheet-layout">
        <aside className="full-sheet-nav">
          {SHEET_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`${openSection === section.id ? "active" : ""} ${
                hasSectionContent(section) ? "filled" : ""
              }`}
              onClick={() => setOpenSection(section.id)}
            >
              <span>{section.icon}</span>
              <strong>{section.title}</strong>
              {hasSectionContent(section) && <em>●</em>}
            </button>
          ))}
        </aside>

        <div className="full-sheet-content">
          {SHEET_SECTIONS.map((section) => {
            if (section.id !== openSection) return null;

            return (
              <section key={section.id} className="full-sheet-section polished">
                <div className="full-sheet-section-title">
                  <span className="full-sheet-section-icon">{section.icon}</span>
                  <div>
                    <h3>{section.title}</h3>
                    <p>{section.description}</p>
                  </div>
                </div>

                <div className="full-sheet-fields polished">
                  {section.fields.map(([field, label]) => (
                    <label key={field} className="full-sheet-field polished">
                      <span>{label}</span>
                      <textarea
                        value={sheet[field] || ""}
                        onChange={(event) => updateField(field, event.target.value)}
                        placeholder={FIELD_HINTS[field] || `Preencha: ${label}`}
                      />
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
