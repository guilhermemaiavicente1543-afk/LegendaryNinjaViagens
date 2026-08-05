import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  isSupabaseConfigured,
  supabase
} from "../../lib/supabaseClient";

const IMAGE_BUCKET = "announcement-images";
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

const CATEGORIES = [
  "geral",
  "sistema",
  "evento",
  "manutenção",
  "importante"
];

const ACTION_OPTIONS = [
  ["none", "Sem botão"],
  ["my-ninja", "Meu Ninja"],
  ["map", "Mapa"],
  ["shinobidex", "ShinobiDex"],
  ["anced", "ANCED"],
  ["legends", "Hall das Lendas"],
  ["admin", "Painel ADM"],
  ["external", "Link externo"]
];

const ACTION_LABELS = {
  "my-ninja": "Abrir Meu Ninja",
  map: "Abrir Mapa",
  shinobidex: "Abrir ShinobiDex",
  anced: "Abrir ANCED",
  legends: "Abrir Hall das Lendas",
  admin: "Abrir Painel ADM",
  external: "Saiba mais"
};

const INITIAL_FORM = {
  title: "",
  body: "",
  category: "geral",
  priority: 0,
  is_active: true,
  image_url: "",
  image_path: "",
  action_target: "none",
  action_label: "",
  action_url: "",
  starts_at: "",
  ends_at: ""
};

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function toInputDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const adjusted = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return adjusted.toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function sanitizeFileName(value) {
  return String(value || "imagem")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export default function AdminAnnouncementsPanel() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [announcements, setAnnouncements] =
    useState([]);

  const [editingId, setEditingId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] =
    useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] =
    useState("");

  const [removeExistingImage, setRemoveExistingImage] =
    useState(false);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    return () => {
      if (
        imagePreview &&
        imagePreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const previewImage = useMemo(() => {
    if (removeExistingImage) {
      return imagePreview || "";
    }

    return imagePreview || form.image_url || "";
  }, [
    imagePreview,
    form.image_url,
    removeExistingImage
  ]);

  const previewActionLabel =
    form.action_label.trim() ||
    ACTION_LABELS[form.action_target] ||
    "";

  function notifyHall() {
    window.dispatchEvent(
      new Event("ln-announcements-updated")
    );
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function clearImagePreview() {
    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview("");
    setImageFile(null);
  }

  function resetForm() {
    clearImagePreview();
    setForm(INITIAL_FORM);
    setEditingId("");
    setPendingDeleteId("");
    setRemoveExistingImage(false);
  }

  async function loadAnnouncements() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("site_announcements")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    setIsLoading(false);

    if (error) {
      setMessage(
        `Erro ao carregar novidades: ${error.message}`
      );
      return;
    }

    setAnnouncements(data || []);
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione um arquivo de imagem.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage(
        "A imagem deve possuir no máximo 6 MB."
      );
      event.target.value = "";
      return;
    }

    clearImagePreview();

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
    setMessage("");
  }

  function removeImage() {
    clearImagePreview();

    if (form.image_path || form.image_url) {
      setRemoveExistingImage(true);
    }
  }

  async function uploadSelectedImage() {
    if (!imageFile) return null;

    const {
      data: authData,
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      throw new Error(
        "Sessão administrativa não encontrada."
      );
    }

    const originalName =
      sanitizeFileName(imageFile.name) ||
      "novidade.webp";

    const extension =
      originalName.includes(".")
        ? originalName.split(".").pop()
        : "webp";

    const filePath = [
      authData.user.id,
      `${Date.now()}-${crypto.randomUUID()}.${extension}`
    ].join("/");

    const { error: uploadError } =
      await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: imageFile.type
        });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicData } =
      supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(filePath);

    return {
      image_url: publicData.publicUrl,
      image_path: filePath
    };
  }

  async function saveAnnouncement(event) {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    if (!form.title.trim() || !form.body.trim()) {
      setMessage(
        "Preencha o título e o texto da novidade."
      );
      return;
    }

    if (
      form.action_target === "external" &&
      !form.action_url.trim()
    ) {
      setMessage(
        "Informe o endereço do link externo."
      );
      return;
    }

    const startsAt = toIsoDateTime(form.starts_at);
    const endsAt = toIsoDateTime(form.ends_at);

    if (
      startsAt &&
      endsAt &&
      Date.parse(endsAt) <= Date.parse(startsAt)
    ) {
      setMessage(
        "O encerramento precisa ocorrer depois do início."
      );
      return;
    }

    setIsSaving(true);
    setMessage("");

    let uploadedImage = null;

    try {
      uploadedImage = await uploadSelectedImage();
    } catch (error) {
      setIsSaving(false);
      setMessage(
        `Erro ao enviar imagem: ${error.message}`
      );
      return;
    }

    const previousImagePath = form.image_path || "";

    const nextImageUrl = uploadedImage
      ? uploadedImage.image_url
      : removeExistingImage
        ? null
        : form.image_url || null;

    const nextImagePath = uploadedImage
      ? uploadedImage.image_path
      : removeExistingImage
        ? null
        : form.image_path || null;

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      category:
        form.category.trim() || "geral",
      priority: Number(form.priority) || 0,
      is_active: Boolean(form.is_active),
      image_url: nextImageUrl,
      image_path: nextImagePath,
      action_target:
        form.action_target || "none",
      action_label:
        form.action_label.trim() || null,
      action_url:
        form.action_target === "external"
          ? form.action_url.trim() || null
          : null,
      starts_at: startsAt,
      ends_at: endsAt,
      updated_at: new Date().toISOString()
    };

    let result;

    if (editingId) {
      result = await supabase
        .from("site_announcements")
        .update(payload)
        .eq("id", editingId);
    } else {
      const { data: authData } =
        await supabase.auth.getUser();

      result = await supabase
        .from("site_announcements")
        .insert({
          ...payload,
          created_by: authData?.user?.id || null
        });
    }

    setIsSaving(false);

    if (result.error) {
      if (uploadedImage?.image_path) {
        await supabase.storage
          .from(IMAGE_BUCKET)
          .remove([uploadedImage.image_path]);
      }

      setMessage(
        `Erro ao salvar novidade: ${result.error.message}`
      );

      return;
    }

    const shouldDeletePreviousImage =
      previousImagePath &&
      (
        removeExistingImage ||
        (
          uploadedImage?.image_path &&
          uploadedImage.image_path !==
            previousImagePath
        )
      );

    if (shouldDeletePreviousImage) {
      await supabase.storage
        .from(IMAGE_BUCKET)
        .remove([previousImagePath]);
    }

    setMessage(
      editingId
        ? "Novidade atualizada com sucesso."
        : "Novidade publicada com sucesso."
    );

    resetForm();
    await loadAnnouncements();
    notifyHall();
  }

  function startEditing(item) {
    resetForm();

    setEditingId(item.id);
    setForm({
      title: item.title || "",
      body: item.body || "",
      category: item.category || "geral",
      priority: Number(item.priority) || 0,
      is_active: Boolean(item.is_active),
      image_url: item.image_url || "",
      image_path: item.image_path || "",
      action_target:
        item.action_target || "none",
      action_label:
        item.action_label || "",
      action_url:
        item.action_url || "",
      starts_at: toInputDateTime(
        item.starts_at
      ),
      ends_at: toInputDateTime(
        item.ends_at
      )
    });

    requestAnimationFrame(() => {
      document
        .querySelector(
          ".admin-announcements-editor-card"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    });
  }

  async function toggleActive(item) {
    const { error } = await supabase
      .from("site_announcements")
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", item.id);

    if (error) {
      setMessage(
        `Erro ao atualizar novidade: ${error.message}`
      );
      return;
    }

    setMessage(
      item.is_active
        ? "Novidade ocultada."
        : "Novidade ativada."
    );

    await loadAnnouncements();
    notifyHall();
  }

  async function deleteAnnouncement(item) {
    const { error } = await supabase
      .from("site_announcements")
      .delete()
      .eq("id", item.id);

    if (error) {
      setMessage(
        `Erro ao apagar novidade: ${error.message}`
      );
      return;
    }

    if (item.image_path) {
      await supabase.storage
        .from(IMAGE_BUCKET)
        .remove([item.image_path]);
    }

    if (editingId === item.id) {
      resetForm();
    }

    setPendingDeleteId("");
    setMessage("Novidade apagada.");

    await loadAnnouncements();
    notifyHall();
  }

  return (
    <section className="admin-announcements-manager">
      <header className="admin-announcements-manager-header">
        <div>
          <p className="eyebrow">
            Comunicação oficial
          </p>

          <h2>Central de Novidades</h2>

          <span>
            Publique avisos conectados às páginas do
            LN Digital e acompanhe a aparência antes
            de exibi-los aos jogadores.
          </span>
        </div>

        {editingId && (
          <span className="admin-announcements-edit-badge">
            Editando publicação
          </span>
        )}
      </header>

      {message && (
        <p className="admin-announcements-message">
          {message}
        </p>
      )}

      <div className="admin-announcements-workspace">
        <form
          className="admin-announcements-form admin-announcements-editor-card"
          onSubmit={saveAnnouncement}
        >
          <div className="admin-announcements-form-heading">
            <div>
              <small>
                {editingId
                  ? "ALTERAR AVISO"
                  : "NOVO AVISO"}
              </small>

              <h3>
                {editingId
                  ? "Editar novidade"
                  : "Criar novidade"}
              </h3>
            </div>

            <span>
              Campos com texto e imagem refletirão
              diretamente no pergaminho do Hall.
            </span>
          </div>

          <label>
            Título
            <input
              value={form.title}
              maxLength={120}
              onChange={(event) =>
                updateForm(
                  "title",
                  event.target.value
                )
              }
              placeholder="Ex.: Novo evento disponível"
            />
          </label>

          <label>
            Texto do aviso
            <textarea
              value={form.body}
              maxLength={4000}
              onChange={(event) =>
                updateForm(
                  "body",
                  event.target.value
                )
              }
              placeholder="Explique a novidade de forma clara e objetiva."
            />
          </label>

          <div className="admin-announcements-grid">
            <label>
              Categoria
              <select
                value={form.category}
                onChange={(event) =>
                  updateForm(
                    "category",
                    event.target.value
                  )
                }
              >
                {!CATEGORIES.includes(
                  form.category
                ) && (
                  <option value={form.category}>
                    {form.category}
                  </option>
                )}

                {CATEGORIES.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Prioridade
              <input
                type="number"
                min="0"
                max="999"
                value={form.priority}
                onChange={(event) =>
                  updateForm(
                    "priority",
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <fieldset className="admin-announcements-fieldset">
            <legend>Imagem do aviso</legend>

            <label className="admin-announcements-image-picker">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageChange}
              />

              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Prévia da imagem selecionada"
                />
              ) : (
                <div>
                  <strong>Adicionar imagem</strong>

                  <span>
                    PNG, JPG, WEBP ou GIF, até 6 MB
                  </span>
                </div>
              )}
            </label>

            {previewImage && (
              <button
                type="button"
                className="secondary"
                onClick={removeImage}
              >
                Remover imagem
              </button>
            )}
          </fieldset>

          <fieldset className="admin-announcements-fieldset">
            <legend>Conectar aviso</legend>

            <label>
              Destino do botão
              <select
                value={form.action_target}
                onChange={(event) =>
                  updateForm(
                    "action_target",
                    event.target.value
                  )
                }
              >
                {ACTION_OPTIONS.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            {form.action_target !== "none" && (
              <label>
                Texto do botão
                <input
                  value={form.action_label}
                  maxLength={60}
                  onChange={(event) =>
                    updateForm(
                      "action_label",
                      event.target.value
                    )
                  }
                  placeholder={
                    ACTION_LABELS[
                      form.action_target
                    ] || "Abrir"
                  }
                />
              </label>
            )}

            {form.action_target ===
              "external" && (
              <label>
                Endereço externo
                <input
                  type="url"
                  value={form.action_url}
                  onChange={(event) =>
                    updateForm(
                      "action_url",
                      event.target.value
                    )
                  }
                  placeholder="https://..."
                />
              </label>
            )}
          </fieldset>

          <fieldset className="admin-announcements-fieldset">
            <legend>Período de exibição</legend>

            <div className="admin-announcements-grid">
              <label>
                Exibir a partir de
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) =>
                    updateForm(
                      "starts_at",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Encerrar em
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(event) =>
                    updateForm(
                      "ends_at",
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            <small className="admin-announcements-hint">
              Deixe vazio para não limitar o período.
            </small>
          </fieldset>

          <label className="admin-announcements-check">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                updateForm(
                  "is_active",
                  event.target.checked
                )
              }
            />

            Exibir esta novidade no Hall
          </label>

          <div className="admin-announcements-form-actions">
            <button
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Salvando..."
                : editingId
                  ? "Salvar alterações"
                  : "Publicar novidade"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary"
                onClick={resetForm}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <aside className="admin-announcements-preview">
          <header>
            <small>PRÉ-VISUALIZAÇÃO</small>
            <h3>Como aparecerá no Hall</h3>
          </header>

          <article className="admin-announcements-preview-paper">
            {previewImage && (
              <div className="admin-announcements-preview-image">
                <img
                  src={previewImage}
                  alt=""
                />
              </div>
            )}

            <div className="admin-announcements-preview-meta">
              <span>
                {form.category || "geral"}
              </span>

              <small>Agora</small>
            </div>

            <h4>
              {form.title ||
                "Título da novidade"}
            </h4>

            <p>
              {form.body ||
                "O conteúdo do aviso será exibido aqui, dentro do pergaminho de novidades."}
            </p>

            {form.action_target !== "none" && (
              <button type="button" tabIndex={-1}>
                {previewActionLabel || "Abrir"}
              </button>
            )}
          </article>
        </aside>
      </div>

      <div className="admin-announcements-list">
        <header>
          <div>
            <small>HISTÓRICO</small>
            <h3>Publicações cadastradas</h3>
          </div>

          <span>
            {announcements.length} registros
          </span>
        </header>

        {isLoading ? (
          <p>Carregando publicações...</p>
        ) : announcements.length === 0 ? (
          <p>Nenhuma novidade cadastrada.</p>
        ) : (
          announcements.map((item) => (
            <article
              key={item.id}
              className={
                item.is_active
                  ? "announcement-active"
                  : "announcement-hidden"
              }
            >
              {item.image_url && (
                <img
                  className="admin-announcement-thumbnail"
                  src={item.image_url}
                  alt=""
                  loading="lazy"
                />
              )}

              <div className="admin-announcement-description">
                <div className="admin-announcement-meta">
                  <span>
                    {item.category || "geral"}
                  </span>

                  <small>
                    {formatDateTime(
                      item.updated_at ||
                        item.created_at
                    )}
                  </small>
                </div>

                <strong>{item.title}</strong>
                <p>{item.body}</p>

                <small>
                  {item.is_active
                    ? "visível"
                    : "oculta"}
                  {" · "}
                  prioridade{" "}
                  {Number(item.priority) || 0}
                  {item.action_target &&
                  item.action_target !== "none"
                    ? ` · conectada a ${item.action_target}`
                    : ""}
                </small>
              </div>

              <div className="admin-announcement-buttons">
                <button
                  type="button"
                  onClick={() =>
                    startEditing(item)
                  }
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleActive(item)
                  }
                >
                  {item.is_active
                    ? "Ocultar"
                    : "Ativar"}
                </button>

                {pendingDeleteId === item.id ? (
                  <>
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        deleteAnnouncement(item)
                      }
                    >
                      Confirmar exclusão
                    </button>

                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setPendingDeleteId("")
                      }
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="danger"
                    onClick={() =>
                      setPendingDeleteId(item.id)
                    }
                  >
                    Apagar
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
