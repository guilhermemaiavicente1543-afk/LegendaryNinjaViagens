import { useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const PROOF_BUCKET = "character-proofs";
const MAX_PROOF_FILE_SIZE_MB = 6;
const MAX_PROOF_IMAGE_WIDTH = 1600;
const PROOF_IMAGE_QUALITY = 0.78;

const SHEET_SECTIONS = [
  {
    id: "admin",
    icon: "巻",
    title: "Registro de Provas",
    description: "Comprovações oficiais do personagem: treinos, cenas, aprovações, prints e decisões do mestre."
  },
  {
    id: "science",
    icon: "医",
    title: "Ciência e Medicina",
    description: "Tipagem sanguínea, adaptações corporais, implantes, alterações físicas e registros médicos."
  },
  {
    id: "arsenal",
    icon: "武",
    title: "Contratos e Vínculos",
    description: "Contratos principais e secundários do personagem."
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
    description: "Valores numéricos e atributos complementares do personagem.",
    fields: [
      ["totalChakra", "Chakra total"],
      ["totalStamina", "Estamina total"],
      ["chakraRecovery", "Recuperação de chakra"],
      ["staminaRecovery", "Recuperação de estamina"],
      ["speed", "Velocidade"],
      ["perception", "Percepção"],
      ["otherStats", "Outros atributos"]
    ]
  },
  {
    id: "hidden",
    icon: "影",
    title: "APA Especial / Ações Ocultas",
    description: "Ações enviadas no privado para administradores, com data, descrição e prova em imagem."
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
  missionPatent: "Patente/rank de missões.",
  missionsHistory: "Título da missão, rank, participantes, narrador, data e resultado.",
  totalChakra: "0",
  totalStamina: "0",
  chakraRecovery: "0",
  staminaRecovery: "0",
  speed: "0",
  perception: "0",
  otherStats: "Outros atributos, modificadores, bônus e penalidades.",
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
  const sheet = {
    ...(character?.profile_sheet || {})
  };

  if (!Array.isArray(sheet.academicProofs)) sheet.academicProofs = [];
  if (!Array.isArray(sheet.bodyAdaptationRecords)) sheet.bodyAdaptationRecords = [];
  if (!Array.isArray(sheet.hiddenActionRecords)) sheet.hiddenActionRecords = [];

  return sheet;
}

function createEmptyRecord() {
  return {
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
    title: "",
    description: "",
    createdAt: new Date().toISOString()
  };
}

function createEmptyImageRecord() {
  return {
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
    title: "",
    description: "",
    createdAt: new Date().toISOString()
  };
}

function isNumericSmallField(field) {
  return [
    "totalChakra",
    "totalStamina",
    "chakraRecovery",
    "staminaRecovery",
    "speed",
    "perception"
  ].includes(field);
}

function sanitizeFileName(name = "registro") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 70) || "registro";
}

function formatFileSize(bytes = 0) {
  if (!bytes) return "-";
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };

    image.src = url;
  });
}

async function compressImage(file) {
  const image = await loadImageFromFile(file);

  const scale = Math.min(1, MAX_PROOF_IMAGE_WIDTH / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Não foi possível comprimir a imagem."));
      },
      "image/webp",
      PROOF_IMAGE_QUALITY
    );
  });

  return blob;
}

export default function CharacterFullSheetPanel({ character, onCharacterUpdated }) {
  const initialSheet = useMemo(() => buildInitialSheet(character), [character]);

  const [sheet, setSheet] = useState(initialSheet);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isUploadingHiddenAction, setIsUploadingHiddenAction] = useState(false);
  const [openSection, setOpenSection] = useState("admin");

  const [proofDraft, setProofDraft] = useState(createEmptyImageRecord);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState("");

  const [adaptationDraft, setAdaptationDraft] = useState(createEmptyRecord);

  const [hiddenActionDraft, setHiddenActionDraft] = useState(createEmptyImageRecord);
  const [hiddenActionFile, setHiddenActionFile] = useState(null);
  const [hiddenActionPreviewUrl, setHiddenActionPreviewUrl] = useState("");

  function updateField(field, value) {
    setSheet((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateProofDraft(field, value) {
    setProofDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateAdaptationDraft(field, value) {
    setAdaptationDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateHiddenActionDraft(field, value) {
    setHiddenActionDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleImageFileChange(event, setFile, setPreviewUrl, currentPreviewUrl) {
    const file = event.target.files?.[0] || null;

    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
    }

    if (!file) {
      setFile(null);
      setPreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Envie apenas imagem: PNG, JPG, JPEG ou WEBP.");
      event.target.value = "";
      setFile(null);
      setPreviewUrl("");
      return;
    }

    if (file.size > MAX_PROOF_FILE_SIZE_MB * 1024 * 1024) {
      setMessage(`A imagem é muito pesada (${formatFileSize(file.size)}). Limite: ${MAX_PROOF_FILE_SIZE_MB} MB.`);
      event.target.value = "";
      setFile(null);
      setPreviewUrl("");
      return;
    }

    setMessage("");
    setFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadImage(file, title, folder) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase não está configurado.");
    }

    if (!character?.id) {
      throw new Error("Crie seu ninja antes de enviar imagens.");
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      throw new Error("Você precisa estar logado para enviar imagens.");
    }

    const compressedBlob = await compressImage(file);
    const safeName = sanitizeFileName(title || file.name);
    const storagePath = `${userData.user.id}/${character.id}/${folder}/${Date.now()}-${safeName}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(storagePath, compressedBlob, {
        contentType: "image/webp",
        upsert: false
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicData } = supabase.storage
      .from(PROOF_BUCKET)
      .getPublicUrl(storagePath);

    return {
      imageUrl: publicData.publicUrl,
      storagePath,
      originalFileName: file.name,
      originalSize: file.size,
      compressedSize: compressedBlob.size
    };
  }

  async function addAcademicProof() {
    const title = proofDraft.title.trim();
    const description = proofDraft.description.trim();

    if (!title) {
      setMessage("Informe o título da prova antes de adicionar.");
      return;
    }

    if (!proofFile) {
      setMessage("Selecione a imagem/print da prova.");
      return;
    }

    setIsUploadingProof(true);
    setMessage("Enviando imagem da prova...");

    try {
      const uploadResult = await uploadImage(proofFile, title, "academic-proofs");

      const proof = {
        ...proofDraft,
        title,
        description,
        ...uploadResult,
        createdAt: new Date().toISOString()
      };

      setSheet((current) => ({
        ...current,
        academicProofs: [
          proof,
          ...(Array.isArray(current.academicProofs) ? current.academicProofs : [])
        ]
      }));

      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);

      setProofDraft(createEmptyImageRecord());
      setProofFile(null);
      setProofPreviewUrl("");
      setMessage("Prova enviada e adicionada. Clique em “Salvar ficha” para gravar no personagem.");
    } catch (error) {
      setMessage(`Erro ao enviar prova: ${error.message}`);
    } finally {
      setIsUploadingProof(false);
    }
  }

  function removeAcademicProof(proofId) {
    setSheet((current) => ({
      ...current,
      academicProofs: (Array.isArray(current.academicProofs) ? current.academicProofs : []).filter(
        (proof) => proof.id !== proofId
      )
    }));

    setMessage("Prova removida da ficha. Clique em “Salvar ficha” para gravar.");
  }

  function addBodyAdaptation() {
    const title = adaptationDraft.title.trim();
    const description = adaptationDraft.description.trim();

    if (!title) {
      setMessage("Informe o título da adaptação corporal.");
      return;
    }

    const record = {
      ...adaptationDraft,
      title,
      description,
      createdAt: new Date().toISOString()
    };

    setSheet((current) => ({
      ...current,
      bodyAdaptationRecords: [
        record,
        ...(Array.isArray(current.bodyAdaptationRecords) ? current.bodyAdaptationRecords : [])
      ]
    }));

    setAdaptationDraft(createEmptyRecord());
    setMessage("Adaptação corporal adicionada. Clique em “Salvar ficha” para gravar.");
  }

  function removeBodyAdaptation(recordId) {
    setSheet((current) => ({
      ...current,
      bodyAdaptationRecords: (Array.isArray(current.bodyAdaptationRecords) ? current.bodyAdaptationRecords : []).filter(
        (record) => record.id !== recordId
      )
    }));

    setMessage("Adaptação corporal removida. Clique em “Salvar ficha” para gravar.");
  }

  async function addHiddenAction() {
    const title = hiddenActionDraft.title.trim();
    const description = hiddenActionDraft.description.trim();

    if (!title) {
      setMessage("Informe o título da ação oculta.");
      return;
    }

    if (!hiddenActionFile) {
      setMessage("Selecione a imagem/print da ação oculta.");
      return;
    }

    setIsUploadingHiddenAction(true);
    setMessage("Enviando imagem da ação oculta...");

    try {
      const uploadResult = await uploadImage(hiddenActionFile, title, "hidden-actions");

      const record = {
        ...hiddenActionDraft,
        title,
        description,
        ...uploadResult,
        createdAt: new Date().toISOString()
      };

      setSheet((current) => ({
        ...current,
        hiddenActionRecords: [
          record,
          ...(Array.isArray(current.hiddenActionRecords) ? current.hiddenActionRecords : [])
        ]
      }));

      if (hiddenActionPreviewUrl) URL.revokeObjectURL(hiddenActionPreviewUrl);

      setHiddenActionDraft(createEmptyImageRecord());
      setHiddenActionFile(null);
      setHiddenActionPreviewUrl("");
      setMessage("Ação oculta enviada e adicionada. Clique em “Salvar ficha” para gravar.");
    } catch (error) {
      setMessage(`Erro ao enviar ação oculta: ${error.message}`);
    } finally {
      setIsUploadingHiddenAction(false);
    }
  }

  function removeHiddenAction(recordId) {
    setSheet((current) => ({
      ...current,
      hiddenActionRecords: (Array.isArray(current.hiddenActionRecords) ? current.hiddenActionRecords : []).filter(
        (record) => record.id !== recordId
      )
    }));

    setMessage("Ação oculta removida. Clique em “Salvar ficha” para gravar.");
  }

  function hasSectionContent(section) {
    if (section.id === "admin") {
      return (
        String(sheet.confirmationNumber || "").trim() ||
        (Array.isArray(sheet.academicProofs) && sheet.academicProofs.length > 0)
      );
    }

    if (section.id === "science") {
      return (
        String(sheet.bloodTyping || "").trim() ||
        (Array.isArray(sheet.bodyAdaptationRecords) && sheet.bodyAdaptationRecords.length > 0)
      );
    }

    if (section.id === "arsenal") {
      return (
        String(sheet.masterContract || "").trim() ||
        String(sheet.secondaryContract || "").trim()
      );
    }

    if (section.id === "hidden") {
      return Array.isArray(sheet.hiddenActionRecords) && sheet.hiddenActionRecords.length > 0;
    }

    return section.fields?.some(([field]) => String(sheet[field] || "").trim());
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

  function renderImageRecordGrid(records, onRemove, emptyMessage) {
    if (!records.length) {
      return <p className="academic-proof-empty">{emptyMessage}</p>;
    }

    return (
      <div className="academic-proof-grid">
        {records.map((record) => (
          <article key={record.id} className="academic-proof-card">
            <button
              type="button"
              className="academic-proof-remove"
              onClick={() => onRemove(record.id)}
              aria-label="Remover registro"
            >
              ×
            </button>

            <a
              href={record.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="academic-proof-image"
            >
              <img
                src={record.imageUrl}
                alt={record.title || "Imagem do registro"}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(event) => {
                  event.currentTarget.closest(".academic-proof-image")?.classList.add("is-broken");
                }}
              />
              <span>Imagem indisponível</span>
            </a>

            <div className="academic-proof-body">
              <strong>{record.title}</strong>
              {record.description && <p>{record.description}</p>}
              {record.compressedSize && (
                <small>Arquivo otimizado: {formatFileSize(record.compressedSize)}</small>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  }

  function renderSimpleRecordGrid(records, onRemove, emptyMessage) {
    if (!records.length) {
      return <p className="academic-proof-empty">{emptyMessage}</p>;
    }

    return (
      <div className="sheet-simple-record-grid">
        {records.map((record) => (
          <article key={record.id} className="sheet-simple-record-card">
            <button
              type="button"
              onClick={() => onRemove(record.id)}
              aria-label="Remover registro"
            >
              ×
            </button>

            <strong>{record.title}</strong>
            {record.description && <p>{record.description}</p>}
          </article>
        ))}
      </div>
    );
  }

  function renderImageUploader({
    title,
    description,
    draft,
    updateDraft,
    file,
    previewUrl,
    onFileChange,
    onAdd,
    isUploading,
    buttonLabel,
    uploadingLabel,
    titlePlaceholder,
    descriptionPlaceholder
  }) {
    return (
      <div className="academic-proof-editor">
        <div className="academic-proof-editor-title">
          <div>
            <h4>{title}</h4>
            <p>{description}</p>
          </div>
        </div>

        <div className="academic-proof-form">
          <label>
            Título
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder={titlePlaceholder}
            />
          </label>

          <label>
            Imagem / print
            <input
              key={draft.id}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={onFileChange}
            />
          </label>

          <label className="academic-proof-form-full">
            Descrição
            <textarea
              value={draft.description}
              onChange={(event) => updateDraft("description", event.target.value)}
              placeholder={descriptionPlaceholder}
            />
          </label>

          {previewUrl && (
            <div className="academic-proof-upload-preview">
              <img src={previewUrl} alt="Prévia da imagem" />
              <div>
                <strong>{file?.name}</strong>
                <span>{formatFileSize(file?.size)}</span>
                <small>A imagem será convertida para WEBP antes do envio.</small>
              </div>
            </div>
          )}

          <button type="button" onClick={onAdd} disabled={isUploading}>
            {isUploading ? uploadingLabel : buttonLabel}
          </button>
        </div>
      </div>
    );
  }

  function renderAdminProofSection() {
    const proofs = Array.isArray(sheet.academicProofs) ? sheet.academicProofs : [];

    return (
      <>
        <div className="full-sheet-fields polished compact-admin-fields">
          <label className="full-sheet-field polished compact-number-field">
            <span>Número de confirmação</span>
            <input
              value={sheet.confirmationNumber || ""}
              onChange={(event) => updateField("confirmationNumber", event.target.value)}
              placeholder="Ex.: 1837"
            />
          </label>
        </div>

        {renderImageUploader({
          title: "Adicionar prova",
          description: "Registre a comprovação de treinos, cenas, aprovações ou ações relevantes.",
          draft: proofDraft,
          updateDraft: updateProofDraft,
          file: proofFile,
          previewUrl: proofPreviewUrl,
          onFileChange: (event) =>
            handleImageFileChange(event, setProofFile, setProofPreviewUrl, proofPreviewUrl),
          onAdd: addAcademicProof,
          isUploading: isUploadingProof,
          buttonLabel: "Adicionar prova",
          uploadingLabel: "Enviando prova...",
          titlePlaceholder: "Ex.: Comprovação do treino de pesos",
          descriptionPlaceholder: "Ex.: Print da cena fazendo o treino, data, grupo e contexto."
        })}

        <div className="academic-proof-list">
          <h4>Provas registradas</h4>
          {renderImageRecordGrid(
            proofs,
            removeAcademicProof,
            "Nenhuma prova registrada. Adicione uma comprovação com título e imagem."
          )}
        </div>
      </>
    );
  }

  function renderScienceSection() {
    const records = Array.isArray(sheet.bodyAdaptationRecords) ? sheet.bodyAdaptationRecords : [];

    return (
      <>
        <div className="full-sheet-fields polished compact-admin-fields">
          <label className="full-sheet-field polished compact-number-field">
            <span>Tipagem sanguínea</span>
            <input
              value={sheet.bloodTyping || ""}
              onChange={(event) => updateField("bloodTyping", event.target.value)}
              placeholder="Ex.: A+, O-, AB..."
            />
          </label>
        </div>

        <div className="academic-proof-editor">
          <div className="academic-proof-editor-title">
            <div>
              <h4>Adicionar adaptação corporal</h4>
              <p>Registre implantes, alterações físicas, sorteios corporais, cirurgias e aprovações.</p>
            </div>
          </div>

          <div className="academic-proof-form">
            <label>
              Título da adaptação
              <input
                value={adaptationDraft.title}
                onChange={(event) => updateAdaptationDraft("title", event.target.value)}
                placeholder="Ex.: Implante ocular aprovado"
              />
            </label>

            <label className="academic-proof-form-full">
              Descrição
              <textarea
                value={adaptationDraft.description}
                onChange={(event) => updateAdaptationDraft("description", event.target.value)}
                placeholder="Descreva participantes, data, origem, efeito e aprovação."
              />
            </label>

            <button type="button" onClick={addBodyAdaptation}>
              Adicionar adaptação
            </button>
          </div>
        </div>

        <div className="academic-proof-list">
          <h4>Adaptações registradas</h4>
          {renderSimpleRecordGrid(
            records,
            removeBodyAdaptation,
            "Nenhuma adaptação corporal registrada."
          )}
        </div>
      </>
    );
  }

  function renderContractsSection() {
    return (
      <div className="contract-category-grid">
        <label className="full-sheet-field polished contract-category-card">
          <span>Contrato Mestre</span>
          <textarea
            value={sheet.masterContract || ""}
            onChange={(event) => updateField("masterContract", event.target.value)}
            placeholder="Contrato principal do personagem. Ex.: contrato mestre de invocação, pacto central ou vínculo dominante."
          />
        </label>

        <label className="full-sheet-field polished contract-category-card">
          <span>Contrato Secundário</span>
          <textarea
            value={sheet.secondaryContract || ""}
            onChange={(event) => updateField("secondaryContract", event.target.value)}
            placeholder="Contrato secundário, vínculo auxiliar, pacto menor ou relação complementar."
          />
        </label>
      </div>
    );
  }

  function renderHiddenSection() {
    const records = Array.isArray(sheet.hiddenActionRecords) ? sheet.hiddenActionRecords : [];

    return (
      <>
        {renderImageUploader({
          title: "Adicionar ação oculta",
          description: "Registre ações enviadas no privado para administradores, com print de comprovação.",
          draft: hiddenActionDraft,
          updateDraft: updateHiddenActionDraft,
          file: hiddenActionFile,
          previewUrl: hiddenActionPreviewUrl,
          onFileChange: (event) =>
            handleImageFileChange(event, setHiddenActionFile, setHiddenActionPreviewUrl, hiddenActionPreviewUrl),
          onAdd: addHiddenAction,
          isUploading: isUploadingHiddenAction,
          buttonLabel: "Adicionar ação oculta",
          uploadingLabel: "Enviando ação oculta...",
          titlePlaceholder: "Ex.: APA enviada ao mestre",
          descriptionPlaceholder: "Ex.: Enviado para Ezelta às 23:03 no dia 31/01/2024."
        })}

        <div className="academic-proof-list">
          <h4>Ações ocultas registradas</h4>
          {renderImageRecordGrid(
            records,
            removeHiddenAction,
            "Nenhuma ação oculta registrada. Adicione uma ação com imagem de comprovação."
          )}
        </div>
      </>
    );
  }

  function renderField(field, label) {
    if (isNumericSmallField(field)) {
      return (
        <label key={field} className="full-sheet-field polished compact-number-field">
          <span>{label}</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={sheet[field] || ""}
            onChange={(event) => updateField(field, event.target.value)}
            placeholder={FIELD_HINTS[field] || "0"}
          />
        </label>
      );
    }

    return (
      <label key={field} className="full-sheet-field polished">
        <span>{label}</span>
        <textarea
          value={sheet[field] || ""}
          onChange={(event) => updateField(field, event.target.value)}
          placeholder={FIELD_HINTS[field] || `Preencha: ${label}`}
        />
      </label>
    );
  }

  function renderSectionContent(section) {
    if (section.id === "admin") return renderAdminProofSection();
    if (section.id === "science") return renderScienceSection();
    if (section.id === "arsenal") return renderContractsSection();
    if (section.id === "hidden") return renderHiddenSection();

    return (
      <div className={`full-sheet-fields polished ${section.id === "status" ? "status-compact-fields" : ""}`}>
        {section.fields.map(([field, label]) => renderField(field, label))}
      </div>
    );
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

                {renderSectionContent(section)}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
