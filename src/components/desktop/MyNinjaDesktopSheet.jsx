import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const PROFILE_SHEET_BUCKET = "character-assets";

const EMPTY_PROOF = {
  title: "",
  status: "Pendente",
  description: "",
  imageUrl: "",
  storagePath: "",
  originalName: "",
  compressedSize: "",
};

const EMPTY_CONTRACT = {
  title: "",
  type: "",
  status: "Ativo",
  description: "",
};

const EMPTY_ITEM = {
  kind: "item",
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
  status: "Não revelada",
  imageUrl: "",
  storagePath: "",
  originalName: "",
  compressedSize: "",
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
  medicalProcedures: [],
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

function getTechniqueRank(technique) {
  return technique?.anced_rank || technique?.wiki_rank || technique?.rank || "";
}

function getTechniquePoints(technique) {
  return technique?.anced_total ?? technique?.total ?? "";
}

function getTechniqueDescription(technique) {
  return technique?.rpg_effect || technique?.summary || technique?.description || technique?.details || "";
}

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

function formatFileSize(size) {
  const number = Number(size || 0);

  if (!number) return "";

  if (number < 1024) return ;

  if (number < 1024 * 1024) return ;

  return ;
}

function slugify(value) {
  return String(value || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível carregar a imagem."));
    };

    image.src = objectUrl;
  });
}

async function compressImage(file) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  const maxSide = 1600;

  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));

  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível preparar a imagem.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível comprimir a imagem."));
      },
      "image/webp",
      0.82
    );
  });
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
  const [uploadingProofIndex, setUploadingProofIndex] = useState(null);
  const [uploadingHiddenActionIndex, setUploadingHiddenActionIndex] = useState(null);
  const [openInventoryIndex, setOpenInventoryIndex] = useState(null);
  const [openHiddenActionIndex, setOpenHiddenActionIndex] = useState(null);
  const [openMedicalProcedureIndex, setOpenMedicalProcedureIndex] = useState(null);
  const [openProofIndex, setOpenProofIndex] = useState(null);

  const [techniques, setTechniques] = useState([]);
  const [techniquesLoading, setTechniquesLoading] = useState(false);
  const [techniqueSearch, setTechniqueSearch] = useState("");
  const [techniqueRankFilter, setTechniqueRankFilter] = useState("Todos");

  useEffect(() => {
    setSheet(normalizeSheet(character?.profile_sheet));
  }, [character?.id, character?.profile_sheet]);

  useEffect(() => {
    let cancelled = false;

    async function loadTechniques() {
      if (!supabase) {
        setTechniques([]);
        setTechniquesLoading(false);
        setMessage("Supabase não está disponível para carregar a Shinobidex.");
        return;
      }

      setTechniquesLoading(true);

      const attempts = [
        () => supabase.from("technique_catalog").select("*").order("name", { ascending: true }),
        () => supabase.from("technique_catalog").select("*").order("created_at", { ascending: false }),
        () => supabase.from("technique_catalog").select("*"),
      ];

      let lastError = null;

      for (const attempt of attempts) {
        const { data, error } = await attempt();

        if (!error) {
          const list = Array.isArray(data) ? data : [];
          setTechniques(list);

          if (list.length === 0) {
            setMessage("Nenhuma técnica foi encontrada na Shinobidex.");
          }

          setTechniquesLoading(false);
          return;
        }

        lastError = error;
      }

      setTechniques([]);
      setTechniquesLoading(false);
      setMessage("Não consegui carregar técnicas da Shinobidex: " + (lastError?.message || "erro desconhecido"));
    }

    loadTechniques();

    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(
    () => [
      ["proofs", "Registro de Provas"],
      ["medicine", "Ciência e Medicina"],
      ["contracts", "Contratos e Vínculos"],
      ["inventory", "Inventário"],
      ["missions", "Atividades e Missões"],
      ["status", "Status do Personagem"],
      ["hidden", "Ações Ocultas"],
      ["narrative", "Desenvolvimento Narrativo"],
    ],
    []
  );

  const techniqueRanks = useMemo(() => {
    const ranks = new Set(["Todos"]);

    techniques.forEach((technique) => {
      const rank = getTechniqueRank(technique);
      if (rank) ranks.add(rank);
    });

    return Array.from(ranks);
  }, [techniques]);

  const filteredTechniques = useMemo(() => {
    const search = techniqueSearch.trim().toLowerCase();

    return techniques.filter((technique) => {
      const text = String((technique.name || "") + " " + (technique.original_name || "") + " " + (technique.classification || "") + " " + (technique.nature || "") + " " + (technique.anced_rank || "") + " " + (technique.wiki_rank || "") + " " + (technique.summary || "") + " " + (technique.rpg_effect || "")).toLowerCase();
      const matchesSearch = !search || text.includes(search);
      const matchesRank = techniqueRankFilter === "Todos" || getTechniqueRank(technique) === techniqueRankFilter;

      return matchesSearch && matchesRank;
    });
  }, [techniques, techniqueSearch, techniqueRankFilter]);

  const updateRootField = (field, value) => {
    setSheet((current) => ({
      ...current,
      [field]: value,
    }));
  };

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

  const patchArrayItem = (key, index, patch) => {
    setSheet((current) => {
      const list = Array.isArray(current[key]) ? [...current[key]] : [];
      list[index] = {
        ...(list[index] || {}),
        ...patch,
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

  async function uploadProofImage(index, file) {
    setMessage("");

    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      setMessage("Envie uma imagem válida.");
      return;
    }

    if (!character?.id) {
      setMessage("Crie ou carregue um ninja antes de anexar imagens.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    setUploadingProofIndex(index);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        throw new Error(userError?.message || "Faça login para enviar imagens.");
      }

      const compressedBlob = await compressImage(file);
      const safeName = slugify(file.name.replace(/\.[^.]+$/, ""));
      const storagePath = `${userData.user.id}/${character.id}/academic-proofs/${Date.now()}-${safeName}.webp`;

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_SHEET_BUCKET)
        .upload(storagePath, compressedBlob, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicData } = supabase.storage
        .from(PROFILE_SHEET_BUCKET)
        .getPublicUrl(storagePath);

      patchArrayItem("academicProofs", index, {
        imageUrl: publicData.publicUrl,
        storagePath,
        originalName: file.name,
        compressedSize: compressedBlob.size,
      });

      setMessage("Imagem anexada à prova. Clique em salvar ficha para gravar.");
    } catch (error) {
      setMessage();
    } finally {
      setUploadingProofIndex(null);
    }
  }

  async function uploadHiddenActionImage(index, file) {
    setMessage("");

    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      setMessage("Envie uma imagem válida.");
      return;
    }

    if (!character?.id) {
      setMessage("Crie ou carregue um ninja antes de anexar imagens.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    setUploadingHiddenActionIndex(index);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        throw new Error(userError?.message || "Faça login para enviar imagens.");
      }

      const compressedBlob = await compressImage(file);
      const safeName = slugify(file.name.replace(/\.[^.]+$/, ""));
      const storagePath =
        userData.user.id +
        "/" +
        character.id +
        "/hidden-actions/" +
        Date.now() +
        "-" +
        safeName +
        ".webp";

      const bucketCandidates = Array.from(
        new Set(
          [
            PROFILE_SHEET_BUCKET,
            "character-assets",
            "character-portraits",
            "profile-sheets",
            "ln-character-assets"
          ].filter(Boolean)
        )
      );

      let usedBucket = "";
      let lastUploadError = null;

      for (const bucketName of bucketCandidates) {
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, compressedBlob, {
            contentType: "image/webp",
            upsert: false,
          });

        if (!uploadError) {
          usedBucket = bucketName;
          break;
        }

        lastUploadError = uploadError;
      }

      if (!usedBucket) {
        throw new Error(lastUploadError?.message || "Nenhum bucket disponível para upload.");
      }

      const { data: publicData } = supabase.storage
        .from(usedBucket)
        .getPublicUrl(storagePath);

      patchArrayItem("hiddenActionRecords", index, {
        imageUrl: publicData.publicUrl,
        storagePath,
        storageBucket: usedBucket,
        originalName: file.name,
        compressedSize: compressedBlob.size,
      });

      setMessage("Imagem anexada à ação oculta. Clique em salvar ficha para gravar.");
    } catch (error) {
      setMessage("Erro ao enviar imagem: " + error.message);
    } finally {
      setUploadingHiddenActionIndex(null);
    }
  }

  function addTechniqueToInventory(technique) {
    const nextIndex = Array.isArray(sheet.inventoryRecords)
      ? sheet.inventoryRecords.length
      : 0;

    const record = {
      kind: "jutsu",
      techniqueId: technique.id,
      name: technique.name || "Técnica sem nome",
      originalName: technique.original_name || "",
      rank: getTechniqueRank(technique),
      classification: technique.classification || "",
      nature: technique.nature || "",
      total: getTechniquePoints(technique),
      description: getTechniqueDescription(technique),
      source: "shinobidex",
      acquisitionMethod: "",
      acquiredAt: "",
      notes: "",
    };

    setSheet((current) => ({
      ...current,
      inventoryRecords: [...(Array.isArray(current.inventoryRecords) ? current.inventoryRecords : []), record],
    }));

    setOpenInventoryIndex(nextIndex);
    setMessage(record.name + " adicionada ao inventário.");
  }

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
      setOpenInventoryIndex(null);
      setOpenMedicalProcedureIndex(null);
      setOpenHiddenActionIndex(null);
    } catch (error) {
      setMessage();
    } finally {
      setIsSaving(false);
    }
  }

  const renderProofs = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Registro de Provas"
        description="Comprovações oficiais do personagem: treinos, cenas, aprovações, prints, imagens e decisões do mestre. Sem número de confirmação."
      />

      <div className="mnds-list">
        {(sheet.academicProofs || []).map((proof, index) => (
          <article className={openProofIndex === index ? "mnds-record mnds-proof-drawer is-open" : "mnds-record mnds-proof-drawer"} key={"proof-" + index}>
            <div className="mnds-record-head">
              <strong>{proof.title || "Prova #" + (index + 1)}</strong>

              <div className="mnds-record-actions">
                <button
                  type="button"
                  onClick={() => setOpenProofIndex(openProofIndex === index ? null : index)}
                >
                  {openProofIndex === index ? "Fechar" : "Abrir"}
                </button>

                <button type="button" onClick={() => removeArrayItem("academicProofs", index)}>
                  Remover
                </button>
              </div>
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

            <Field label="Imagem / Print">
              <div className="mnds-file-row">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadProofImage(index, event.target.files?.[0])}
                />

                <span>
                  {uploadingProofIndex === index
                    ? "Enviando imagem..."
                    : proof.originalName || "Escolha uma imagem/print"}
                </span>
              </div>
            </Field>

            {proof.imageUrl ? (
              <div className="mnds-proof-preview">
                <a href={proof.imageUrl} target="_blank" rel="noreferrer">
                  Abrir imagem anexada
                </a>

                <img src={proof.imageUrl} alt={proof.title || "Prova anexada"} />

                {proof.compressedSize ? (
                  <small>Arquivo otimizado: {formatFileSize(proof.compressedSize)}</small>
                ) : null}
              </div>
            ) : null}

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
        description="Tipo sanguíneo e procedimentos médicos registrados no personagem."
      />

      <Field label="Tipo sanguíneo">
        <TextInput
          value={sheet.scienceMedicine?.bloodTyping}
          onChange={(value) => updateObject("scienceMedicine", "bloodTyping", value)}
          placeholder="Ex.: O+"
        />
      </Field>

      <div className="mnds-list">
        {(sheet.medicalProcedures || []).map((procedure, index) => {
          const isOpen = openMedicalProcedureIndex === index;

          return (
            <article
              className={isOpen ? "mnds-record mnds-medical-drawer is-open" : "mnds-record mnds-medical-drawer"}
              key={"medical-procedure-" + index}
            >
              <div className="mnds-record-head">
                <strong>{procedure.title || "Procedimento #" + (index + 1)}</strong>

                <div className="mnds-record-actions">
                  <button type="button" onClick={() => setOpenMedicalProcedureIndex(isOpen ? null : index)}>
                    {isOpen ? "Fechar" : "Abrir"}
                  </button>

                  <button type="button" onClick={() => removeArrayItem("medicalProcedures", index)}>
                    Remover
                  </button>
                </div>
              </div>

              {isOpen ? (
                <div className="mnds-drawer-body">
                  <div className="mnds-grid two">
                    <Field label="Procedimento">
                      <TextInput
                        value={procedure.title}
                        onChange={(value) => updateArrayItem("medicalProcedures", index, "title", value)}
                        placeholder="Ex.: Implante, cirurgia, exame..."
                      />
                    </Field>

                    <Field label="Data">
                      <TextInput
                        value={procedure.date}
                        onChange={(value) => updateArrayItem("medicalProcedures", index, "date", value)}
                        placeholder="Ex.: 29/05/2026"
                      />
                    </Field>
                  </div>

                  <Field label="Descrição do procedimento">
                    <TextArea
                      value={procedure.description}
                      onChange={(value) => updateArrayItem("medicalProcedures", index, "description", value)}
                      placeholder="Detalhe o procedimento, resultado e observações médicas."
                    />
                  </Field>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className="mnds-add-button"
        onClick={() => {
          const nextIndex = Array.isArray(sheet.medicalProcedures)
            ? sheet.medicalProcedures.length
            : 0;

          addArrayItem("medicalProcedures", { title: "", date: "", description: "" });
          setOpenMedicalProcedureIndex(nextIndex);
        }}
      >
        Adicionar procedimento
      </button>
    </div>
  );

  const renderContracts = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Contratos e Vínculos"
        description="Contratos de invocação, vínculos especiais e casos excepcionais do personagem."
      />

      <Field label="Invocação Mestre">
        <TextArea
          value={sheet.masterContract || sheet.masterSummon || ""}
          onChange={(value) => updateRootField("masterContract", value)}
          placeholder="Contrato principal do personagem. Ex.: invocação mestre, pacto central ou vínculo dominante."
          rows={5}
        />
      </Field>

      <Field label="Invocação secundária">
        <TextArea
          value={sheet.secondaryContract || sheet.secondarySummon || ""}
          onChange={(value) => updateRootField("secondaryContract", value)}
          placeholder="Contrato secundário, vínculo auxiliar, invocação complementar ou pacto menor."
          rows={5}
        />
      </Field>

      <Field label="Casos Especiais">
        <TextArea
          value={sheet.specialContractCases || sheet.specialCases || ""}
          onChange={(value) => updateRootField("specialContractCases", value)}
          placeholder="Casos especiais, exceções, observações administrativas ou vínculos raros."
          rows={5}
        />
      </Field>
    </div>
  );

  const renderInventory = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Inventário"
        description="Itens, equipamentos e jutsus adicionados a partir da Shinobidex / ANCED."
      />

      <div className="mnds-inventory-actions">
        <button type="button" className="mnds-add-button" onClick={() => addArrayItem("inventoryRecords", EMPTY_ITEM)}>
          Adicionar item
        </button>
      </div>

      <div className="mnds-shinobidex-picker">
        <div className="mnds-picker-head">
          <div>
            <strong>Adicionar jutsu da Shinobidex</strong>
            <p>{techniquesLoading ? "Carregando técnicas..." : String(filteredTechniques.length) + " técnica(s) encontrada(s)."}</p>
          </div>
        </div>

        <div className="mnds-grid two">
          <Field label="Buscar técnica">
            <TextInput
              value={techniqueSearch}
              onChange={setTechniqueSearch}
              placeholder="Nome, classificação, natureza..."
            />
          </Field>

          <Field label="Rank">
            <SelectInput
              value={techniqueRankFilter}
              onChange={setTechniqueRankFilter}
              options={techniqueRanks}
            />
          </Field>
        </div>

        <div className="mnds-technique-list">
          {filteredTechniques.slice(0, 12).map((technique) => (
            <article className="mnds-technique-card" key={technique.id}>
              <div>
                <span>{getTechniqueRank(technique) || "—"}</span>
                <strong>{technique.name || "Técnica sem nome"}</strong>
                {technique.original_name ? <small>{technique.original_name}</small> : null}

                <p>
                  {[technique.classification, technique.nature, getTechniquePoints(technique) ? String(getTechniquePoints(technique)) + " pts" : ""]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>

              <button type="button" onClick={() => addTechniqueToInventory(technique)}>
                Adicionar
              </button>
            </article>
          ))}

          {!techniquesLoading && filteredTechniques.length === 0 ? (
            <div className="mnds-empty">Nenhuma técnica encontrada.</div>
          ) : null}
        </div>
      </div>

      <div className="mnds-list">
        {(sheet.inventoryRecords || []).map((item, index) => {
          const isJutsu = item.kind === "jutsu";
          const isOpen = openInventoryIndex === index;

          return (
            <article
              className={isOpen ? "mnds-record mnds-inventory-drawer is-open" : "mnds-record mnds-inventory-drawer"}
              key={"inventory-" + index}
            >
              <div className="mnds-record-head">
                <strong>
                  {item.name || (isJutsu ? "Jutsu sem nome" : "Item sem nome")}
                  {isJutsu && item.rank ? " • " + item.rank : ""}
                </strong>

                <div className="mnds-record-actions">
                  <button type="button" onClick={() => setOpenInventoryIndex(isOpen ? null : index)}>
                    {isOpen ? "Fechar" : "Abrir"}
                  </button>

                  <button type="button" onClick={() => removeArrayItem("inventoryRecords", index)}>
                    Remover
                  </button>
                </div>
              </div>

              {isOpen ? (
                <div className="mnds-drawer-body">
                  {isJutsu ? (
                    <>
                      <div className="mnds-technique-info">
                        <p><strong>Rank:</strong> {item.rank || "—"}</p>
                        <p><strong>Classificação:</strong> {item.classification || "—"}</p>
                        <p><strong>Natureza:</strong> {item.nature || "—"}</p>
                        <p><strong>Pontos ANCED:</strong> {item.total || "—"}</p>
                        <p>{item.description || "Sem descrição cadastrada."}</p>
                      </div>

                      <div className="mnds-grid two">
                        <Field label="Como adquiriu">
                          <TextInput
                            value={item.acquisitionMethod || item.notes || ""}
                            onChange={(value) => updateArrayItem("inventoryRecords", index, "acquisitionMethod", value)}
                            placeholder="Ex.: missão, treino, compra, recompensa..."
                          />
                        </Field>

                        <Field label="Data de aquisição">
                          <TextInput
                            value={item.acquiredAt || item.acquired_date || ""}
                            onChange={(value) => updateArrayItem("inventoryRecords", index, "acquiredAt", value)}
                            placeholder="Ex.: 29/05/2026"
                          />
                        </Field>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mnds-grid two">
                        <Field label="Nome do item">
                          <TextInput
                            value={item.name}
                            onChange={(value) => updateArrayItem("inventoryRecords", index, "name", value)}
                            placeholder="Nome"
                          />
                        </Field>

                        <Field label="Quantidade">
                          <TextInput
                            value={item.quantity}
                            onChange={(value) => updateArrayItem("inventoryRecords", index, "quantity", value)}
                            placeholder="Quantidade"
                          />
                        </Field>
                      </div>

                      <Field label="Descrição">
                        <TextArea
                          value={item.description}
                          onChange={(value) => updateArrayItem("inventoryRecords", index, "description", value)}
                          placeholder="Descrição e função."
                        />
                      </Field>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
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
          <article className="mnds-record" key={"mission-" + index}>
            <div className="mnds-record-head">
              <strong>{mission.title || "Missão #" + (index + 1)}</strong>
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

              <Field label="Rank / Categoria">
                <TextInput
                  value={mission.rank}
                  onChange={(value) => updateArrayItem("missionRecords", index, "rank", value)}
                  placeholder="Ex.: Rank C, evento, treino..."
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
        description="Valores numéricos e atributos complementares do personagem."
      />

      <div className="mnds-grid two">
        <Field label="Chakra total">
          <TextInput
            value={sheet.totalChakra || ""}
            onChange={(value) => updateRootField("totalChakra", value)}
            placeholder="0"
          />
        </Field>

        <Field label="Estamina total">
          <TextInput
            value={sheet.totalStamina || ""}
            onChange={(value) => updateRootField("totalStamina", value)}
            placeholder="0"
          />
        </Field>

        <Field label="Recuperação de chakra">
          <TextInput
            value={sheet.chakraRecovery || ""}
            onChange={(value) => updateRootField("chakraRecovery", value)}
            placeholder="0"
          />
        </Field>

        <Field label="Recuperação de estamina">
          <TextInput
            value={sheet.staminaRecovery || ""}
            onChange={(value) => updateRootField("staminaRecovery", value)}
            placeholder="0"
          />
        </Field>

        <Field label="Velocidade">
          <TextInput
            value={sheet.speed || ""}
            onChange={(value) => updateRootField("speed", value)}
            placeholder="Velocidade atual, bônus e origem."
          />
        </Field>

        <Field label="Percepção">
          <TextInput
            value={sheet.perception || ""}
            onChange={(value) => updateRootField("perception", value)}
            placeholder="Percepção atual, bônus e origem."
          />
        </Field>
      </div>

      <Field label="Outros atributos">
        <TextArea
          value={sheet.otherStats || ""}
          onChange={(value) => updateRootField("otherStats", value)}
          placeholder="Outros atributos, modificadores, bônus e penalidades."
          rows={5}
        />
      </Field>
    </div>
  );

  const renderHidden = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Ações Ocultas"
        description="Ações privadas do personagem com título, imagem e nível de revelação."
      />

      <div className="mnds-list">
        {(sheet.hiddenActionRecords || []).map((action, index) => {
          const isOpen = openHiddenActionIndex === index;

          return (
            <article
              className={isOpen ? "mnds-record mnds-hidden-drawer is-open" : "mnds-record mnds-hidden-drawer"}
              key={"hidden-" + index}
            >
              <div className="mnds-record-head">
                <strong>{action.title || "Ação oculta #" + (index + 1)}</strong>

                <div className="mnds-record-actions">
                  <button type="button" onClick={() => setOpenHiddenActionIndex(isOpen ? null : index)}>
                    {isOpen ? "Fechar" : "Abrir"}
                  </button>

                  <button type="button" onClick={() => removeArrayItem("hiddenActionRecords", index)}>
                    Remover
                  </button>
                </div>
              </div>

              {isOpen ? (
                <div className="mnds-drawer-body">
                  <div className="mnds-grid two">
                    <Field label="Título">
                      <TextInput
                        value={action.title}
                        onChange={(value) => updateArrayItem("hiddenActionRecords", index, "title", value)}
                        placeholder="Nome da ação oculta"
                      />
                    </Field>

                    <Field label="Status">
                      <SelectInput
                        value={action.status || "Não revelada"}
                        onChange={(value) => updateArrayItem("hiddenActionRecords", index, "status", value)}
                        options={["Não revelada", "Parcialmente revelada", "Revelada"]}
                      />
                    </Field>
                  </div>

                  <Field label="Imagem / Print">
                    <div className="mnds-file-row">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => uploadHiddenActionImage(index, event.target.files?.[0])}
                      />

                      <span>
                        {uploadingHiddenActionIndex === index
                          ? "Enviando imagem..."
                          : action.originalName || "Escolha uma imagem/print"}
                      </span>
                    </div>
                  </Field>

                  {action.imageUrl ? (
                    <div className="mnds-hidden-preview">
                      <a href={action.imageUrl} target="_blank" rel="noreferrer">
                        Abrir imagem anexada
                      </a>

                      <img src={action.imageUrl} alt={action.title || "Ação oculta"} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className="mnds-add-button"
        onClick={() => {
          const nextIndex = Array.isArray(sheet.hiddenActionRecords)
            ? sheet.hiddenActionRecords.length
            : 0;

          addArrayItem("hiddenActionRecords", EMPTY_HIDDEN_ACTION);
          setOpenHiddenActionIndex(nextIndex);
        }}
      >
        Adicionar ação oculta
      </button>
    </div>
  );

  const renderNarrative = () => (
    <div className="mnds-section">
      <SectionHeader
        title="Desenvolvimento Narrativo"
        description="Informações de personalidade, motivações, evolução e características únicas."
      />

      <Field label="Motivação">
        <TextArea
          value={sheet.motivation || ""}
          onChange={(value) => updateRootField("motivation", value)}
          placeholder="O que move o personagem?"
          rows={4}
        />
      </Field>

      <Field label="Desenvolvimento">
        <TextArea
          value={sheet.development || sheet.narrativeDevelopment || ""}
          onChange={(value) => updateRootField("development", value)}
          placeholder="Mudanças, aprendizados e evolução ao longo do RPG."
          rows={5}
        />
      </Field>

      <Field label="Peculiaridade(s)">
        <TextArea
          value={sheet.peculiarities || ""}
          onChange={(value) => updateRootField("peculiarities", value)}
          placeholder="Características únicas do personagem."
          rows={4}
        />
      </Field>

      <div className="mnds-grid two">
        <Field label="Mania(s)">
          <TextArea
            value={sheet.manias || ""}
            onChange={(value) => updateRootField("manias", value)}
            placeholder="Hábitos repetitivos ou comportamentos marcantes."
            rows={4}
          />
        </Field>

        <Field label="Defeito(s)">
          <TextArea
            value={sheet.defects || ""}
            onChange={(value) => updateRootField("defects", value)}
            placeholder="Defeitos, fraquezas e pontos negativos."
            rows={4}
          />
        </Field>
      </div>

      <div className="mnds-grid two">
        <Field label="Comida(s) preferida(s)">
          <TextInput
            value={sheet.favoriteFoods || ""}
            onChange={(value) => updateRootField("favoriteFoods", value)}
            placeholder="Comidas preferidas."
          />
        </Field>

        <Field label="Comida que não gosta">
          <TextInput
            value={sheet.dislikedFoods || ""}
            onChange={(value) => updateRootField("dislikedFoods", value)}
            placeholder="Comidas que não aprecia."
          />
        </Field>
      </div>

      <Field label="Informações adicionais">
        <TextArea
          value={sheet.additionalInfo || ""}
          onChange={(value) => updateRootField("additionalInfo", value)}
          placeholder="Qualquer informação extra relevante."
          rows={5}
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
