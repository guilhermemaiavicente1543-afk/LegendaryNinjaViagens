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
    description: "Área para registrar comprovações oficiais do personagem: treinos, cenas, aprovações, prints e decisões do mestre.",
    fields: [["confirmationNumber", "Número de confirmação"]]
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
    description: "Chakra, estamina, recuperação e atributos complementares.",
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
  bloodTyping: "Registre sorteios, compatibilidade corporal, implantes de DNA e resultado do bot/ADM.",
  bodyAdaptations: "Descreva adaptações corporais, participantes, data, origem e aprovação.",
  contracts: "Contratos assinados, pactos, acordos e vínculos especiais.",
  summonContracts: "Contrato animal, modo sábio, responsável, data e prova.",
  missionPatent: "Patente/rank de missões.",
  missionsHistory: "Título da missão, rank, participantes, narrador, data e resultado.",
  totalChakra: "Valor total de chakra.",
  totalStamina: "Valor total de estamina.",
  chakraRecovery: "Recuperação de chakra por turno/período.",
  staminaRecovery: "Recuperação de estamina por turno/período.",
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
  const sheet = {
    ...(character?.profile_sheet || {})
  };

  if (!Array.isArray(sheet.academicProofs)) {
    sheet.academicProofs = [];
  }

  return sheet;
}

function createEmptyProof() {
  return {
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
    title: "",
    description: "",
    createdAt: new Date().toISOString()
  };
}

function isNumericSmallField(field) {
  return field === "totalChakra" || field === "totalStamina";
}

function sanitizeFileName(name = "prova") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 70) || "prova";
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

async function compressProofImage(file) {
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
  const [openSection, setOpenSection] = useState("admin");
  const [proofDraft, setProofDraft] = useState(createEmptyProof);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState("");

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

  function handleProofFileChange(event) {
    const file = event.target.files?.[0] || null;

    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl);
    }

    if (!file) {
      setProofFile(null);
      setProofPreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Envie apenas imagem: PNG, JPG, JPEG ou WEBP.");
      event.target.value = "";
      setProofFile(null);
      setProofPreviewUrl("");
      return;
    }

    if (file.size > MAX_PROOF_FILE_SIZE_MB * 1024 * 1024) {
      setMessage(`A imagem é muito pesada (${formatFileSize(file.size)}). Limite: ${MAX_PROOF_FILE_SIZE_MB} MB.`);
      event.target.value = "";
      setProofFile(null);
      setProofPreviewUrl("");
      return;
    }

    setMessage("");
    setProofFile(file);
    setProofPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadProofImage(file, title) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase não está configurado.");
    }

    if (!character?.id) {
      throw new Error("Crie seu ninja antes de enviar provas.");
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      throw new Error("Você precisa estar logado para enviar imagens.");
    }

    const compressedBlob = await compressProofImage(file);
    const safeName = sanitizeFileName(title || file.name);
    const storagePath = `${userData.user.id}/${character.id}/${Date.now()}-${safeName}.webp`;

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
      const uploadResult = await uploadProofImage(proofFile, title);

      const proof = {
        ...proofDraft,
        title,
        description,
        imageUrl: uploadResult.imageUrl,
        storagePath: uploadResult.storagePath,
        originalFileName: uploadResult.originalFileName,
        originalSize: uploadResult.originalSize,
        compressedSize: uploadResult.compressedSize,
        createdAt: new Date().toISOString()
      };

      setSheet((current) => ({
        ...current,
        academicProofs: [
          proof,
          ...(Array.isArray(current.academicProofs) ? current.academicProofs : [])
        ]
      }));

      if (proofPreviewUrl) {
        URL.revokeObjectURL(proofPreviewUrl);
      }

      setProofDraft(createEmptyProof());
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

  function hasSectionContent(section) {
    if (section.id === "admin") {
      return (
        String(sheet.confirmationNumber || "").trim() ||
        (Array.isArray(sheet.academicProofs) && sheet.academicProofs.length > 0)
      );
    }

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
              placeholder={FIELD_HINTS.confirmationNumber}
            />
          </label>
        </div>

        <div className="academic-proof-editor">
          <div className="academic-proof-editor-title">
            <div>
              <h4>Adicionar prova</h4>
              <p>
                Registre a comprovação de treinos, cenas, aprovações ou ações relevantes.
                A imagem será comprimida e enviada para o armazenamento da LN Digital.
              </p>
            </div>
          </div>

          <div className="academic-proof-form">
            <label>
              Título da prova
              <input
                value={proofDraft.title}
                onChange={(event) => updateProofDraft("title", event.target.value)}
                placeholder="Ex.: Comprovação do treino de pesos"
              />
            </label>

            <label>
              Imagem / print da prova
              <input
                key={proofDraft.id}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleProofFileChange}
              />
            </label>

            <label className="academic-proof-form-full">
              Descrição da prova
              <textarea
                value={proofDraft.description}
                onChange={(event) => updateProofDraft("description", event.target.value)}
                placeholder="Ex.: Print da cena fazendo o treino de pesos, data, grupo e contexto."
              />
            </label>

            {proofPreviewUrl && (
              <div className="academic-proof-upload-preview">
                <img src={proofPreviewUrl} alt="Prévia da prova" />
                <div>
                  <strong>{proofFile?.name}</strong>
                  <span>{formatFileSize(proofFile?.size)}</span>
                  <small>A imagem será convertida para WEBP antes do envio.</small>
                </div>
              </div>
            )}

            <button type="button" onClick={addAcademicProof} disabled={isUploadingProof}>
              {isUploadingProof ? "Enviando prova..." : "Adicionar prova"}
            </button>
          </div>
        </div>

        <div className="academic-proof-list">
          <h4>Provas registradas</h4>

          {proofs.length === 0 ? (
            <p className="academic-proof-empty">
              Nenhuma prova registrada. Adicione uma comprovação com título e imagem.
            </p>
          ) : (
            <div className="academic-proof-grid">
              {proofs.map((proof) => (
                <article key={proof.id} className="academic-proof-card">
                  <button
                    type="button"
                    className="academic-proof-remove"
                    onClick={() => removeAcademicProof(proof.id)}
                    aria-label="Remover prova"
                  >
                    ×
                  </button>

                  <a
                    href={proof.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="academic-proof-image"
                  >
                    <img
                      src={proof.imageUrl}
                      alt={proof.title || "Prova do personagem"}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.closest(".academic-proof-image")?.classList.add("is-broken");
                      }}
                    />
                    <span>Imagem indisponível</span>
                  </a>

                  <div className="academic-proof-body">
                    <strong>{proof.title}</strong>
                    {proof.description && <p>{proof.description}</p>}
                    {proof.compressedSize && (
                      <small>Arquivo otimizado: {formatFileSize(proof.compressedSize)}</small>
                    )}
                  </div>
                </article>
              ))}
            </div>
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
            placeholder="0"
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

                {section.id === "admin" ? (
                  renderAdminProofSection()
                ) : (
                  <div className={`full-sheet-fields polished ${section.id === "status" ? "status-compact-fields" : ""}`}>
                    {section.fields.map(([field, label]) => renderField(field, label))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
