import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const EMPTY_PROOF = {
  title: "",
  status: "Pendente",
  description: "",
  imageUrl: "",
};

const EMPTY_CONTRACT = {
  title: "",
  type: "",
  status: "Ativo",
  description: "",
};

const EMPTY_ITEM = {
  name: "",
  quantity: "",
  description: "",
  notes: "",
};

const EMPTY_MISSION = {
  title: "",
  rank: "",
  status: "Em andamento",
  description: "",
};

const EMPTY_HIDDEN_ACTION = {
  title: "",
  status: "Sigiloso",
  description: "",
};

const DEFAULT_SHEET = {
  academicProofs: [],
  scienceMedicine: {
    bloodTyping: "",
    compatibility: "",
    procedures: "",
    notes: "",
  },
  contracts: [],
  inventoryRecords: [],
  missionRecords: [],
  characterStatus: {
    condition: "",
    location: "",
    restrictions: "",
    notes: "",
  },
  hiddenActionRecords: [],
  narrativeDevelopment: "",
};

function normalizeSheet(profileSheet) {
  const raw = profileSheet && typeof profileSheet === "object" ? profileSheet : {};

  return {
    ...DEFAULT_SHEET,
    ...raw,

    academicProofs: Array.isArray(raw.academicProofs)
      ? raw.academicProofs
      : Array.isArray(raw.proofs)
        ? raw.proofs
        : [],

    scienceMedicine: {
      ...DEFAULT_SHEET.scienceMedicine,
      ...(raw.scienceMedicine || raw.medicine || raw.medicalRecords || {}),
    },

    contracts: Array.isArray(raw.contracts)
      ? raw.contracts
      : Array.isArray(raw.contractRecords)
        ? raw.contractRecords
        : [],

    inventoryRecords: Array.isArray(raw.inventoryRecords)
      ? raw.inventoryRecords
      : Array.isArray(raw.inventory)
        ? raw.inventory
        : [],

    missionRecords: Array.isArray(raw.missionRecords)
      ? raw.missionRecords
      : Array.isArray(raw.missions)
        ? raw.missions
        : [],

    characterStatus: {
      ...DEFAULT_SHEET.characterStatus,
      ...(raw.characterStatus || raw.status || {}),
    },

    hiddenActionRecords: Array.isArray(raw.hiddenActionRecords)
      ? raw.hiddenActionRecords
      : Array.isArray(raw.hiddenActions)
        ? raw.hiddenActions
        : [],

    narrativeDevelopment:
      raw.narrativeDevelopment ||
      raw.development ||
      raw.narrative ||
      "",
  };
}

function Field({ label, children }) {
  return (
    <label className="mnds-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder = "" }) {
  return (
    <input
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

function TextArea({ value, onChange, placeholder = "", rows = 4 }) {
  return (
    <textarea
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mnds-section-header">
      <div>
        <span>Dossiê Shinobi</span>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function MyNinjaDesktopSheet({
  character,
  onCharacterUpdated,
}) {
  const [activeSection, setActiveSection] = useState("proofs");
  const [sheet, setSheet] = useState(() => normalizeSheet(character?.profile_sheet));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSheet(normalizeSheet(character?.profile_sheet));
  }, [character?.id, character?.profile_sheet]);

  const sections = useMemo(
    () => [
      ["proofs", "Registro de Provas"],
      ["medicine", "Ciência e Medicina"],
      ["contracts", "Contratos e Vínculos"],
      ["inventory", "Inventário"],
      ["missions", "Atividades e Missões"],
      ["status", "Status do Personagem"],
      ["hidden", "APR Especial / Ações Ocultas"],
      ["narrative", "Desenvolvimento Narrativo"],
    ],
    []
  );

  const updateObject = (key, field, value) => {
    setSheet((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        [field]: value,
      },
    }));
  };

  const updateArrayItem = (key, index, field, value) => {
    setSheet((current) => {
      const list = Array.isArray(current[key]) ? [...current[key]] : [];
      list[index] = {
        ...(list[index] || {}),
        [field]: value,
      };

      return {
        ...current,
        [key]: list,
      };
    });
  };

  const addArrayItem = (key, emptyItem) => {
    setSheet((current) => ({
      ...current,
      [key]: [...(Array.isArray(current[key]) ? current[key] : []), { ...emptyItem }],
    }));
  };

  const removeArrayItem = (key, index) => {
    setSheet((current) => ({
      ...current,
      [key]: (Array.isArray(current[key]) ? current[key] : []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  async function saveSheet() {
    setMessage("");

    if (!character?.id) {
      setMessage("Crie ou carregue um ninja antes de salvar a ficha.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from("characters")
        .update({
          profile_sheet: sheet,
        })
        .eq("id", character.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      if (typeof onCharacterUpdated === "function") {
        onCharacterUpdated(data);
      }

      setMessage("Ficha complementar salva com sucesso.");
    } catch (error) {
      setMessage(`Erro ao salvar ficha: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  const renderProofs = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Registro de Provas"
        description="Comprovações oficiais do personagem: treinos, cenas, aprovações, prints e decisões do mestre. Sem número de confirmação."
      />

      <div className="mnds-list">
        {(sheet.academicProofs || []).map((proof, index) => (
          <article className="mnds-record" key={`proof-${index}`}>
            <div className="mnds-record-head">
              <strong>Prova #{index + 1}</strong>
              <button type="button" onClick={() => removeArrayItem("academicProofs", index)}>
                Remover
              </button>
            </div>

            <div className="mnds-grid two">
              <Field label="Título">
                <TextInput
                  value={proof.title}
                  onChange={(value) => updateArrayItem("academicProofs", index, "title", value)}
                  placeholder="Ex.: Treino de Genjutsu"
                />
              </Field>

              <Field label="Status">
                <SelectInput
                  value={proof.status}
                  onChange={(value) => updateArrayItem("academicProofs", index, "status", value)}
                  options={["Pendente", "Validado", "Recusado", "Arquivado"]}
                />
              </Field>
            </div>

            <Field label="Imagem / Print / Link">
              <TextInput
                value={proof.imageUrl || proof.image_url || proof.url}
                onChange={(value) => updateArrayItem("academicProofs", index, "imageUrl", value)}
                placeholder="Cole aqui o link da imagem, print ou referência"
              />
            </Field>

            <Field label="Descrição">
              <TextArea
                value={proof.description}
                onChange={(value) => updateArrayItem("academicProofs", index, "description", value)}
                placeholder="Contexto da prova, cena, data, grupo e decisão."
              />
            </Field>
          </article>
        ))}
      </div>

      <button type="button" className="mnds-add-button" onClick={() => addArrayItem("academicProofs", EMPTY_PROOF)}>
        Adicionar prova
      </button>
    </div>
  );

  const renderMedicine = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Ciência e Medicina"
        description="Registros de corpo, compatibilidade, implantes, DNA, procedimentos e limitações médicas."
      />

      <div className="mnds-grid two">
        <Field label="Tipagem sanguínea">
          <TextInput
            value={sheet.scienceMedicine?.bloodTyping}
            onChange={(value) => updateObject("scienceMedicine", "bloodTyping", value)}
            placeholder="Ex.: O+"
          />
        </Field>

        <Field label="Compatibilidade">
          <TextInput
            value={sheet.scienceMedicine?.compatibility}
            onChange={(value) => updateObject("scienceMedicine", "compatibility", value)}
            placeholder="Ex.: Compatível com transplantes"
          />
        </Field>
      </div>

      <Field label="Procedimentos / Implantes / DNA">
        <TextArea
          value={sheet.scienceMedicine?.procedures}
          onChange={(value) => updateObject("scienceMedicine", "procedures", value)}
          placeholder="Procedimentos médicos, implantes, alterações corporais ou experimentos."
        />
      </Field>

      <Field label="Observações médicas">
        <TextArea
          value={sheet.scienceMedicine?.notes}
          onChange={(value) => updateObject("scienceMedicine", "notes", value)}
          placeholder="Ferimentos, limitações, recuperação, riscos e observações."
        />
      </Field>
    </div>
  );

  const renderContracts = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Contratos e Vínculos"
        description="Pactos, invocações, laços especiais, vínculos políticos e relações narrativas."
      />

      <div className="mnds-list">
        {(sheet.contracts || []).map((contract, index) => (
          <article className="mnds-record" key={`contract-${index}`}>
            <div className="mnds-record-head">
              <strong>Contrato #{index + 1}</strong>
              <button type="button" onClick={() => removeArrayItem("contracts", index)}>
                Remover
              </button>
            </div>

            <div className="mnds-grid two">
              <Field label="Título">
                <TextInput
                  value={contract.title}
                  onChange={(value) => updateArrayItem("contracts", index, "title", value)}
                  placeholder="Ex.: Contrato de invocação"
                />
              </Field>

              <Field label="Tipo">
                <TextInput
                  value={contract.type}
                  onChange={(value) => updateArrayItem("contracts", index, "type", value)}
                  placeholder="Invocação, pacto, vínculo, organização..."
                />
              </Field>
            </div>

            <Field label="Descrição">
              <TextArea
                value={contract.description}
                onChange={(value) => updateArrayItem("contracts", index, "description", value)}
                placeholder="Detalhe o vínculo, condição, origem e validade."
              />
            </Field>
          </article>
        ))}
      </div>

      <button type="button" className="mnds-add-button" onClick={() => addArrayItem("contracts", EMPTY_CONTRACT)}>
        Adicionar contrato ou vínculo
      </button>
    </div>
  );

  const renderInventory = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Inventário"
        description="Itens e equipamentos dentro da Ficha Complementar, sem sistema de raridade."
      />

      <div className="mnds-list">
        {(sheet.inventoryRecords || []).map((item, index) => (
          <article className="mnds-record" key={`item-${index}`}>
            <div className="mnds-record-head">
              <strong>Item #{index + 1}</strong>
              <button type="button" onClick={() => removeArrayItem("inventoryRecords", index)}>
                Remover
              </button>
            </div>

            <div className="mnds-grid two">
              <Field label="Nome do item">
                <TextInput
                  value={item.name}
                  onChange={(value) => updateArrayItem("inventoryRecords", index, "name", value)}
                  placeholder="Ex.: Kunai especial"
                />
              </Field>

              <Field label="Quantidade">
                <TextInput
                  value={item.quantity}
                  onChange={(value) => updateArrayItem("inventoryRecords", index, "quantity", value)}
                  placeholder="Ex.: 3"
                />
              </Field>
            </div>

            <Field label="Descrição">
              <TextArea
                value={item.description}
                onChange={(value) => updateArrayItem("inventoryRecords", index, "description", value)}
                placeholder="Descrição e função do item."
              />
            </Field>

            <Field label="Observações">
              <TextInput
                value={item.notes}
                onChange={(value) => updateArrayItem("inventoryRecords", index, "notes", value)}
                placeholder="Origem, restrição, observação administrativa..."
              />
            </Field>
          </article>
        ))}
      </div>

      <button type="button" className="mnds-add-button" onClick={() => addArrayItem("inventoryRecords", EMPTY_ITEM)}>
        Adicionar item
      </button>
    </div>
  );

  const renderMissions = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Atividades e Missões"
        description="Histórico de missões, cenas, atividades concluídas e registros de participação."
      />

      <div className="mnds-list">
        {(sheet.missionRecords || []).map((mission, index) => (
          <article className="mnds-record" key={`mission-${index}`}>
            <div className="mnds-record-head">
              <strong>Missão #{index + 1}</strong>
              <button type="button" onClick={() => removeArrayItem("missionRecords", index)}>
                Remover
              </button>
            </div>

            <div className="mnds-grid two">
              <Field label="Título">
                <TextInput
                  value={mission.title}
                  onChange={(value) => updateArrayItem("missionRecords", index, "title", value)}
                  placeholder="Nome da missão ou atividade"
                />
              </Field>

              <Field label="Status">
                <SelectInput
                  value={mission.status}
                  onChange={(value) => updateArrayItem("missionRecords", index, "status", value)}
                  options={["Em andamento", "Concluída", "Falhou", "Arquivada"]}
                />
              </Field>
            </div>

            <Field label="Descrição">
              <TextArea
                value={mission.description}
                onChange={(value) => updateArrayItem("missionRecords", index, "description", value)}
                placeholder="Resumo da missão, resultado e recompensa."
              />
            </Field>
          </article>
        ))}
      </div>

      <button type="button" className="mnds-add-button" onClick={() => addArrayItem("missionRecords", EMPTY_MISSION)}>
        Adicionar missão ou atividade
      </button>
    </div>
  );

  const renderStatus = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Status do Personagem"
        description="Condição atual, bloqueios, disponibilidade narrativa, ferimentos e restrições."
      />

      <div className="mnds-grid two">
        <Field label="Condição atual">
          <TextInput
            value={sheet.characterStatus?.condition}
            onChange={(value) => updateObject("characterStatus", "condition", value)}
            placeholder="Ex.: Disponível, ferido, preso..."
          />
        </Field>

        <Field label="Localização narrativa">
          <TextInput
            value={sheet.characterStatus?.location}
            onChange={(value) => updateObject("characterStatus", "location", value)}
            placeholder="Ex.: Amegakure"
          />
        </Field>
      </div>

      <Field label="Restrições">
        <TextArea
          value={sheet.characterStatus?.restrictions}
          onChange={(value) => updateObject("characterStatus", "restrictions", value)}
          placeholder="Bloqueios, punições, limitações ou condições especiais."
        />
      </Field>

      <Field label="Observações">
        <TextArea
          value={sheet.characterStatus?.notes}
          onChange={(value) => updateObject("characterStatus", "notes", value)}
          placeholder="Observações gerais de status."
        />
      </Field>
    </div>
  );

  const renderHidden = () => (
    <div className="mnds-section">
      <SectionHeader
        title="APR Especial / Ações Ocultas"
        description="Ações sigilosas, APR especial, decisões ocultas e registros privados."
      />

      <div className="mnds-list">
        {(sheet.hiddenActionRecords || []).map((action, index) => (
          <article className="mnds-record" key={`hidden-${index}`}>
            <div className="mnds-record-head">
              <strong>Ação oculta #{index + 1}</strong>
              <button type="button" onClick={() => removeArrayItem("hiddenActionRecords", index)}>
                Remover
              </button>
            </div>

            <div className="mnds-grid two">
              <Field label="Título">
                <TextInput
                  value={action.title}
                  onChange={(value) => updateArrayItem("hiddenActionRecords", index, "title", value)}
                  placeholder="Nome da ação ou APR"
                />
              </Field>

              <Field label="Status">
                <SelectInput
                  value={action.status}
                  onChange={(value) => updateArrayItem("hiddenActionRecords", index, "status", value)}
                  options={["Sigiloso", "Pendente", "Validado", "Arquivado"]}
                />
              </Field>
            </div>

            <Field label="Descrição">
              <TextArea
                value={action.description}
                onChange={(value) => updateArrayItem("hiddenActionRecords", index, "description", value)}
                placeholder="Detalhes sigilosos da ação."
              />
            </Field>
          </article>
        ))}
      </div>

      <button type="button" className="mnds-add-button" onClick={() => addArrayItem("hiddenActionRecords", EMPTY_HIDDEN_ACTION)}>
        Adicionar ação oculta
      </button>
    </div>
  );

  const renderNarrative = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Desenvolvimento Narrativo"
        description="Evolução do personagem, arcos, marcos históricos e progressão narrativa."
      />

      <Field label="Resumo narrativo">
        <TextArea
          value={sheet.narrativeDevelopment}
          onChange={(value) =>
            setSheet((current) => ({
              ...current,
              narrativeDevelopment: value,
            }))
          }
          placeholder="Arcos, marcos, evolução, conflitos, mudanças importantes e conquistas."
          rows={8}
        />
      </Field>
    </div>
  );

  const currentSection = {
    proofs: renderProofs,
    medicine: renderMedicine,
    contracts: renderContracts,
    inventory: renderInventory,
    missions: renderMissions,
    status: renderStatus,
    hidden: renderHidden,
    narrative: renderNarrative,
  }[activeSection];

  return (
    <div className="mnds-shell">
      <div className="mnds-menu">
        {sections.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={activeSection === key ? "active" : ""}
            onClick={() => setActiveSection(key)}
          >
            <span>{label}</span>
            {key === "inventory" || key === "narrative" ? <i /> : null}
          </button>
        ))}
      </div>

      <div className="mnds-board">
        <div className="mnds-top-actions">
          <div>
            <span>Ficha Complementar</span>
            <strong>{character?.name || "Ninja sem nome"}</strong>
          </div>

          <button type="button" onClick={saveSheet} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar ficha"}
          </button>
        </div>

        {message ? <div className="mnds-message">{message}</div> : null}

        {currentSection ? currentSection() : null}

        <div className="mnds-bottom-save">
          <button type="button" onClick={saveSheet} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Ficha Complementar"}
          </button>
        </div>
      </div>
    </div>
  );
}
