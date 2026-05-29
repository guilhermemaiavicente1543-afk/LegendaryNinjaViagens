import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import LnSelect from "../ui/LnSelect";

const STATUS_OPTIONS = ["draft", "approved", "needs_review", "archived"];
const RANK_OPTIONS = ["", "E", "D", "C", "B", "A", "S", "SS"];
const CONFIDENCE_OPTIONS = ["baixa", "média", "alta"];

const emptyForm = {
  name: "",
  original_name: "",
  english_name: "",
  wiki_rank: "",
  anced_rank: "",
  anced_total: 0,
  anced_confidence: "baixa",
  anced_details: "",
  classification: "",
  nature: "",
  technique_type: "",
  users_text: "",
  summary: "",
  rpg_effect: "",
  requirements: "",
  limitations: "",
  status: "draft"
};

export default function ShinobiDexAdmin() {
  const [techniques, setTechniques] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    approved: 0,
    needs_review: 0,
    archived: 0,
    baixa: 0,
    media: 0,
    alta: 0
  });

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("draft");
  const [confidenceFilter, setConfidenceFilter] = useState("Todas");
  const [rankFilter, setRankFilter] = useState("Todos");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadStats();
    loadTechniques();
  }, [statusFilter, confidenceFilter, rankFilter]);

  async function loadStats() {
    if (!isSupabaseConfigured || !supabase) return;

    const { data, error } = await supabase
      .from("technique_catalog")
      .select("id,status,anced_confidence");

    if (error) return;

    const nextStats = {
      total: data.length,
      draft: 0,
      approved: 0,
      needs_review: 0,
      archived: 0,
      baixa: 0,
      media: 0,
      alta: 0
    };

    for (const item of data) {
      if (item.status && nextStats[item.status] !== undefined) {
        nextStats[item.status] += 1;
      }

      if (item.anced_confidence === "baixa") nextStats.baixa += 1;
      if (item.anced_confidence === "média") nextStats.media += 1;
      if (item.anced_confidence === "alta") nextStats.alta += 1;
    }

    setStats(nextStats);
  }

  async function loadTechniques() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    let query = supabase
      .from("technique_catalog")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(120);

    if (statusFilter !== "Todos") {
      query = query.eq("status", statusFilter);
    }

    if (confidenceFilter !== "Todas") {
      query = query.eq("anced_confidence", confidenceFilter);
    }

    if (rankFilter !== "Todos") {
      query = query.eq("anced_rank", rankFilter);
    }

    const q = search.trim();

    if (q) {
      const safe = q.replace(/[%_]/g, "");
      query = query.or(
        `name.ilike.%${safe}%,original_name.ilike.%${safe}%,summary.ilike.%${safe}%,nature.ilike.%${safe}%,classification.ilike.%${safe}%`
      );
    }

    const { data, error } = await query;

    setIsLoading(false);

    if (error) {
      setMessage(`Erro ao carregar técnicas: ${error.message}`);
      return;
    }

    setTechniques(data || []);

    if (!selected && data?.length) {
      selectTechnique(data[0]);
    }
  }

  function selectTechnique(technique) {
    setSelected(technique);
    setForm({
      name: technique.name || "",
      original_name: technique.original_name || "",
      english_name: technique.english_name || "",
      wiki_rank: technique.wiki_rank || "",
      anced_rank: technique.anced_rank || "",
      anced_total: technique.anced_total || 0,
      anced_confidence: technique.anced_confidence || "baixa",
      anced_details: technique.anced_details || "",
      classification: technique.classification || "",
      nature: technique.nature || "",
      technique_type: technique.technique_type || "",
      users_text: technique.users_text || "",
      summary: technique.summary || "",
      rpg_effect: technique.rpg_effect || "",
      requirements: technique.requirements || "",
      limitations: technique.limitations || "",
      status: technique.status || "draft"
    });
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function saveTechnique(nextStatus = null) {
    if (!selected?.id || !supabase) return;

    setIsSaving(true);
    setMessage("");

    const payload = {
      ...form,
      status: nextStatus || form.status,
      anced_total: Number(form.anced_total || 0),
      reviewed_at:
        nextStatus === "approved" || form.status === "approved"
          ? new Date().toISOString()
          : selected.reviewed_at,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("technique_catalog")
      .update(payload)
      .eq("id", selected.id)
      .select("*")
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(`Erro ao salvar técnica: ${error.message}`);
      return;
    }

    setMessage("Técnica atualizada com sucesso.");
    setSelected(data);
    selectTechnique(data);

    setTechniques((current) =>
      current.map((item) => (item.id === data.id ? data : item))
    );

    loadStats();
  }

  async function deleteTechnique() {
    if (!selected?.id || !supabase) return;

    const confirmed = window.confirm(
      `Arquivar "${selected.name}"? Ela sairá da ShinobiDex pública.`
    );

    if (!confirmed) return;

    await saveTechnique("archived");
  }

  const statusLabel = useMemo(() => {
    return {
      draft: "Rascunho",
      approved: "Aprovada",
      needs_review: "Precisa revisão",
      archived: "Arquivada"
    };
  }, []);

  return (
    <section className="shinobidex-admin">
      <div className="shinobidex-admin-stats">
        <article>
          <strong>{stats.total}</strong>
          <span>Total importado</span>
        </article>

        <article>
          <strong>{stats.draft}</strong>
          <span>Rascunhos</span>
        </article>

        <article>
          <strong>{stats.approved}</strong>
          <span>Aprovadas</span>
        </article>

        <article>
          <strong>{stats.baixa}</strong>
          <span>Confiança baixa</span>
        </article>

        <article>
          <strong>{stats.media}</strong>
          <span>Confiança média</span>
        </article>
      </div>

      <div className="shinobidex-admin-toolbar">
        <label>
          Buscar técnica
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadTechniques();
            }}
            placeholder="Nome, natureza, classificação..."
          />
        </label>

        <label>
          Status
          <LnSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option>Todos</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {statusLabel[item] || item}
              </option>
            ))}
          </LnSelect>
        </label>

        <label>
          Confiança
          <LnSelect
            value={confidenceFilter}
            onChange={(event) => setConfidenceFilter(event.target.value)}
          >
            <option>Todas</option>
            {CONFIDENCE_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </LnSelect>
        </label>

        <label>
          Rank ANCED
          <LnSelect
            value={rankFilter}
            onChange={(event) => setRankFilter(event.target.value)}
          >
            <option>Todos</option>
            {RANK_OPTIONS.filter(Boolean).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </LnSelect>
        </label>

        <button type="button" onClick={loadTechniques}>
          Filtrar
        </button>
      </div>

      {message && <p className="auth-message">{message}</p>}

      <div className="shinobidex-admin-layout">
        <aside className="shinobidex-admin-list">
          <div className="shinobidex-admin-list-header">
            <strong>{isLoading ? "Carregando..." : `${techniques.length} resultado(s)`}</strong>
            <small>Mostrando até 120 por vez</small>
          </div>

          {techniques.map((technique) => (
            <button
              type="button"
              key={technique.id}
              className={selected?.id === technique.id ? "active" : ""}
              onClick={() => selectTechnique(technique)}
            >
              <span>{technique.anced_rank || technique.wiki_rank || "?"}</span>

              <div>
                <strong>{technique.name}</strong>
                <small>
                  {statusLabel[technique.status] || technique.status} ·{" "}
                  {technique.anced_confidence || "baixa"} ·{" "}
                  {technique.nature || "sem natureza"}
                </small>
              </div>
            </button>
          ))}

          {!isLoading && techniques.length === 0 && (
            <p className="empty-message">Nenhuma técnica encontrada.</p>
          )}
        </aside>

        <main className="shinobidex-admin-editor">
          {selected ? (
            <>
              <div className="shinobidex-admin-editor-head">
                <div>
                  <p className="eyebrow">Editar técnica</p>
                  <h2>{selected.name}</h2>
                  <span>
                    Fonte: {selected.source_name || "Wiki"} ·{" "}
                    {selected.source_license || "CC BY-SA 3.0"}
                  </span>
                </div>

                {selected.source_url && (
                  <a href={selected.source_url} target="_blank" rel="noreferrer">
                    Abrir fonte
                  </a>
                )}
              </div>

              <div className="shinobidex-admin-grid two">
                <label>
                  Nome
                  <input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                  />
                </label>

                <label>
                  Nome original
                  <input
                    value={form.original_name}
                    onChange={(event) =>
                      updateForm("original_name", event.target.value)
                    }
                  />
                </label>

                <label>
                  Classificação
                  <input
                    value={form.classification}
                    onChange={(event) =>
                      updateForm("classification", event.target.value)
                    }
                  />
                </label>

                <label>
                  Natureza
                  <input
                    value={form.nature}
                    onChange={(event) => updateForm("nature", event.target.value)}
                  />
                </label>

                <label>
                  Tipo
                  <input
                    value={form.technique_type}
                    onChange={(event) =>
                      updateForm("technique_type", event.target.value)
                    }
                  />
                </label>

                <label>
                  Usuários
                  <input
                    value={form.users_text}
                    onChange={(event) => updateForm("users_text", event.target.value)}
                  />
                </label>
              </div>

              <div className="shinobidex-admin-grid four">
                <label>
                  Rank Wiki
                  <LnSelect
                    value={form.wiki_rank}
                    onChange={(event) => updateForm("wiki_rank", event.target.value)}
                  >
                    {RANK_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item || "Não definido"}
                      </option>
                    ))}
                  </LnSelect>
                </label>

                <label>
                  Rank ANCED
                  <LnSelect
                    value={form.anced_rank}
                    onChange={(event) => updateForm("anced_rank", event.target.value)}
                  >
                    {RANK_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item || "Não definido"}
                      </option>
                    ))}
                  </LnSelect>
                </label>

                <label>
                  Pontos ANCED
                  <input
                    type="number"
                    value={form.anced_total}
                    onChange={(event) =>
                      updateForm("anced_total", event.target.value)
                    }
                  />
                </label>

                <label>
                  Confiança
                  <LnSelect
                    value={form.anced_confidence}
                    onChange={(event) =>
                      updateForm("anced_confidence", event.target.value)
                    }
                  >
                    {CONFIDENCE_OPTIONS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </LnSelect>
                </label>
              </div>

              <label>
                Resumo da técnica
                <textarea
                  value={form.summary}
                  onChange={(event) => updateForm("summary", event.target.value)}
                />
              </label>

              <label>
                Efeito adaptado para o RPG
                <textarea
                  value={form.rpg_effect}
                  onChange={(event) => updateForm("rpg_effect", event.target.value)}
                  placeholder="Escreva aqui o efeito oficial adaptado para o RPG."
                />
              </label>

              <div className="shinobidex-admin-grid two">
                <label>
                  Requisitos
                  <textarea
                    value={form.requirements}
                    onChange={(event) =>
                      updateForm("requirements", event.target.value)
                    }
                    placeholder="Rank, clã, natureza, doujutsu, treinamento..."
                  />
                </label>

                <label>
                  Limitações
                  <textarea
                    value={form.limitations}
                    onChange={(event) =>
                      updateForm("limitations", event.target.value)
                    }
                    placeholder="Custos, riscos, alcance, restrições..."
                  />
                </label>
              </div>

              <label>
                Detalhes do cálculo ANCED
                <textarea
                  value={form.anced_details}
                  onChange={(event) =>
                    updateForm("anced_details", event.target.value)
                  }
                />
              </label>

              <label>
                Status
                <LnSelect
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {statusLabel[item] || item}
                    </option>
                  ))}
                </LnSelect>
              </label>

              <div className="shinobidex-admin-actions">
                <button
                  type="button"
                  onClick={() => saveTechnique()}
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar alterações"}
                </button>

                <button
                  type="button"
                  className="approve"
                  onClick={() => saveTechnique("approved")}
                  disabled={isSaving}
                >
                  Aprovar
                </button>

                <button
                  type="button"
                  className="review"
                  onClick={() => saveTechnique("needs_review")}
                  disabled={isSaving}
                >
                  Marcar revisão
                </button>

                <button
                  type="button"
                  className="archive"
                  onClick={deleteTechnique}
                  disabled={isSaving}
                >
                  Arquivar
                </button>
              </div>
            </>
          ) : (
            <p className="empty-message">Selecione uma técnica para editar.</p>
          )}
        </main>
      </div>
    </section>
  );
}
