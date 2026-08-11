import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getLegendKey } from "../../lib/legends/legendKeys";

const LEGENDS = [
  ["Primeira Temporada", "Loky Yomi"],
  ["Primeira Temporada", "Ryu Uchiha"],
  ["Primeira Temporada", "Avatar Senju"],
  ["Primeira Temporada", "Damon Hyuuga"],

  ["Segunda Temporada", "Rasaki Kazekage"],
  ["Segunda Temporada", "Ezelta Kazekage Maito"],
  ["Segunda Temporada", "Loki Hyuuga"],
  ["Segunda Temporada", "Kirin"],
  ["Segunda Temporada", "Edward Uchiha"],
  ["Segunda Temporada", "Yomi Shinno"],
  ["Segunda Temporada", "Azazel Hyuuga"],
  ["Segunda Temporada", "Zacht Bell"],

  ["Terceira Temporada", "Ita Uchiha"],
  ["Terceira Temporada", "Karma Hyuuga"],
  ["Terceira Temporada", "Cronos"],
  ["Terceira Temporada", "Hans-Ulrich"],
  ["Terceira Temporada", "Aleister Otenki Tsuchigumo"],
  ["Terceira Temporada", "Ezelta Maito"],

  ["Quarta Temporada", "Zeus Chinoike"],
  ["Quarta Temporada", "Bakuto Uchiha"],

  ["Quinta Temporada", "Ōtsuki Uchiha"],

  ["Sexta Temporada", "Yoto Shidai"]
].map(([season, name]) => ({
  season,
  name,
  key: getLegendKey(name)
}));

const EMPTY_DRAFT = {
  dossier_description: "",
  importance_text: "",
  appearance_note: "",
  portrait_url: "",
  portrait_path: ""
};

export default function HallLegendsAdmin() {
  const [rows, setRows] = useState([]);
  const [selectedKey, setSelectedKey] = useState(LEGENDS[0]?.key || "");
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectedLegend =
    LEGENDS.find((legend) => legend.key === selectedKey) || LEGENDS[0];

  const overrideByKey = useMemo(() => {
    return Object.fromEntries(
      rows.map((row) => [row.legend_key, row])
    );
  }, [rows]);

  const filteredLegends = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return LEGENDS;

    return LEGENDS.filter((legend) =>
      `${legend.name} ${legend.season}`
        .toLowerCase()
        .includes(term)
    );
  }, [search]);

  async function loadRows() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("hall_legend_overrides")
      .select("*")
      .order("legend_name", { ascending: true });

    if (error) {
      setMessage(`Erro ao carregar Hall: ${error.message}`);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    if (!selectedLegend) return;

    const row = overrideByKey[selectedLegend.key];

    setDraft({
      dossier_description: row?.dossier_description || "",
      importance_text: row?.importance_text || "",
      appearance_note: row?.appearance_note || "",
      portrait_url: row?.portrait_url || "",
      portrait_path: row?.portrait_path || ""
    });

    setMessage("");
  }, [selectedLegend?.key, overrideByKey]);

  function updateDraft(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function saveLegend() {
    if (!selectedLegend) return;

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Sessão administrativa não encontrada.");
      }

      const payload = {
        legend_key: selectedLegend.key,
        legend_name: selectedLegend.name,

        dossier_description:
          draft.dossier_description.trim() || null,

        importance_text:
          draft.importance_text.trim() || null,

        appearance_note:
          draft.appearance_note.trim() || null,

        portrait_url:
          draft.portrait_url || null,

        portrait_path:
          draft.portrait_path || null,

        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("hall_legend_overrides")
        .upsert(payload, {
          onConflict: "legend_key"
        })
        .select()
        .single();

      if (error) throw error;

      setRows((current) => {
        const exists = current.some(
          (row) => row.legend_key === data.legend_key
        );

        if (exists) {
          return current.map((row) =>
            row.legend_key === data.legend_key ? data : row
          );
        }

        return [...current, data];
      });

      setMessage("Dossiê salvo com sucesso.");
    } catch (error) {
      setMessage(
        `Erro ao salvar dossiê: ${error?.message || error}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadPortrait(file) {
    if (!file || !selectedLegend) return;

    setMessage("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 10 MB.");
      return;
    }

    setUploading(true);

    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const filePath =
        `${selectedLegend.key}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("hall-legends")
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("hall-legends")
        .getPublicUrl(filePath);

      const oldPath = draft.portrait_path;

      setDraft((current) => ({
        ...current,
        portrait_url: data.publicUrl,
        portrait_path: filePath
      }));

      if (oldPath && oldPath !== filePath) {
        await supabase.storage
          .from("hall-legends")
          .remove([oldPath]);
      }

      setMessage(
        'Imagem carregada. Clique em "Salvar dossiê" para confirmar.'
      );
    } catch (error) {
      setMessage(
        `Erro ao enviar imagem: ${error?.message || error}`
      );
    } finally {
      setUploading(false);
    }
  }

  async function removePortrait() {
    setMessage("");

    try {
      if (draft.portrait_path) {
        const { error } = await supabase.storage
          .from("hall-legends")
          .remove([draft.portrait_path]);

        if (error) throw error;
      }

      setDraft((current) => ({
        ...current,
        portrait_url: "",
        portrait_path: ""
      }));

      setMessage(
        'Foto removida do formulário. Clique em "Salvar dossiê".'
      );
    } catch (error) {
      setMessage(
        `Erro ao remover imagem: ${error?.message || error}`
      );
    }
  }

  async function clearOverride() {
    if (!selectedLegend) return;

    const confirmed = window.confirm(
      `Restaurar ${selectedLegend.name} para o conteúdo padrão do site?`
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      if (draft.portrait_path) {
        await supabase.storage
          .from("hall-legends")
          .remove([draft.portrait_path]);
      }

      const { error } = await supabase
        .from("hall_legend_overrides")
        .delete()
        .eq("legend_key", selectedLegend.key);

      if (error) throw error;

      setRows((current) =>
        current.filter(
          (row) => row.legend_key !== selectedLegend.key
        )
      );

      setDraft(EMPTY_DRAFT);
      setMessage("Conteúdo personalizado removido.");
    } catch (error) {
      setMessage(
        `Erro ao restaurar conteúdo: ${error?.message || error}`
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="hla-shell">
        <p>Carregando editor do Hall das Lendas...</p>
      </section>
    );
  }

  return (
    <section className="hla-shell">
      <aside className="hla-sidebar">
        <div className="hla-sidebar-header">
          <strong>Lendas</strong>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar lenda..."
          />
        </div>

        <div className="hla-list">
          {filteredLegends.map((legend) => {
            const customized = Boolean(
              overrideByKey[legend.key]
            );

            return (
              <button
                key={legend.key}
                type="button"
                className={
                  selectedKey === legend.key
                    ? "hla-legend-button active"
                    : "hla-legend-button"
                }
                onClick={() => setSelectedKey(legend.key)}
              >
                <span>{legend.name}</span>
                <small>{legend.season}</small>

                {customized && (
                  <em>editado</em>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <main className="hla-editor">
        <header className="hla-editor-header">
          <div>
            <p className="eyebrow">Hall das Lendas</p>
            <h2>{selectedLegend?.name}</h2>
            <span>{selectedLegend?.season}</span>
          </div>

          <button
            type="button"
            className="hla-reset"
            disabled={saving}
            onClick={clearOverride}
          >
            Restaurar padrão
          </button>
        </header>

        <section className="hla-photo-section">
          <div className="hla-photo-preview">
            {draft.portrait_url ? (
              <img
                src={draft.portrait_url}
                alt={selectedLegend?.name}
              />
            ) : (
              <div className="hla-photo-empty">
                <strong>Sem foto personalizada</strong>
                <span>
                  O dossiê continuará usando a imagem padrão
                  enquanto nenhuma foto for salva.
                </span>
              </div>
            )}
          </div>

          <div className="hla-photo-actions">
            <label className="hla-upload">
              {uploading
                ? "Enviando..."
                : draft.portrait_url
                  ? "Trocar foto"
                  : "Inserir foto"}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    uploadPortrait(file);
                  }

                  event.target.value = "";
                }}
              />
            </label>

            {draft.portrait_url && (
              <button
                type="button"
                onClick={removePortrait}
              >
                Remover foto
              </button>
            )}
          </div>
        </section>

        <label className="hla-field">
          <span>Registro histórico / descrição principal</span>

          <textarea
            rows={12}
            value={draft.dossier_description}
            onChange={(event) =>
              updateDraft(
                "dossier_description",
                event.target.value
              )
            }
            placeholder="Se vazio, o Hall usa a descrição original cadastrada no código."
          />

          <small>
            Este é o texto principal exibido no dossiê da lenda.
          </small>
        </label>

        <label className="hla-field">
          <span>Importância para o RPG</span>

          <textarea
            rows={6}
            value={draft.importance_text}
            onChange={(event) =>
              updateDraft(
                "importance_text",
                event.target.value
              )
            }
            placeholder="Se vazio, permanece o texto padrão."
          />
        </label>

        <label className="hla-field">
          <span>Nota sobre aparência</span>

          <textarea
            rows={5}
            value={draft.appearance_note}
            onChange={(event) =>
              updateDraft(
                "appearance_note",
                event.target.value
              )
            }
            placeholder="Se vazio, permanece a nota padrão sobre aparências protegidas."
          />
        </label>

        {message && (
          <p className="hla-message">
            {message}
          </p>
        )}

        <div className="hla-save-bar">
          <button
            type="button"
            className="hla-save"
            disabled={saving || uploading}
            onClick={saveLegend}
          >
            {saving ? "Salvando..." : "Salvar dossiê"}
          </button>
        </div>
      </main>
    </section>
  );
}
