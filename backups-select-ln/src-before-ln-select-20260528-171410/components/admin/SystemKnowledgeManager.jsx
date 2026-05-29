import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const EMPTY_FORM = {
  title: "",
  category: "Geral",
  summary: "",
  content: "",
  tags: "",
  aliases: "",
  related_systems: "",
  is_active: true,
  visibility: "public"
};

const DEFAULT_CATEGORIES = [
  "Geral",
  "Criação de Personagem",
  "Clãs e Kekkei Genkai",
  "Natureza de Chakra",
  "Traços Únicos",
  "Patentes",
  "Missões",
  "Técnicas",
  "ShinobiDex",
  "Inventário",
  "Equipamentos",
  "Contratos",
  "Ciência e Medicina",
  "Adaptações Corporais",
  "Tipagem Sanguínea",
  "Viagens",
  "Mapa",
  "Ações Ocultas",
  "Prints e Provas",
  "Combate",
  "Status",
  "Stamina e Chakra",
  "Organizações",
  "Vilas",
  "Eventos",
  "Lendas",
  "Administração"
];

function textToList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToText(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

export default function SystemKnowledgeManager() {
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...articles]
      .filter((article) => {
        if (!query) return true;

        const haystack = [
          article.title,
          article.category,
          article.summary,
          article.content,
          ...(article.tags || []),
          ...(article.aliases || [])
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || ""), "pt-BR")
      );
  }, [articles, search]);

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("system_articles")
      .select("*")
      .order("updated_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setArticles(data || []);
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function resetForm() {
    setEditingId("");
    setForm(EMPTY_FORM);
  }

  function startEdit(article) {
    setEditingId(article.id);
    setForm({
      title: article.title || "",
      category: article.category || "Geral",
      summary: article.summary || "",
      content: article.content || "",
      tags: listToText(article.tags),
      aliases: listToText(article.aliases),
      related_systems: listToText(article.related_systems),
      is_active: article.is_active !== false,
      visibility: article.visibility || "public"
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("Informe o título do sistema.");
      return;
    }

    if (!form.content.trim()) {
      setMessage("Informe o conteúdo oficial do sistema.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    const payload = {
      title: form.title.trim(),
      category: form.category.trim() || "Geral",
      summary: form.summary.trim(),
      content: form.content.trim(),
      tags: textToList(form.tags),
      aliases: textToList(form.aliases),
      related_systems: textToList(form.related_systems),
      is_active: Boolean(form.is_active),
      visibility: form.visibility,
      updated_at: new Date().toISOString()
    };

    const result = editingId
      ? await supabase
          .from("system_articles")
          .update(payload)
          .eq("id", editingId)
          .select("*")
          .single()
      : await supabase
          .from("system_articles")
          .insert({
            ...payload,
            created_by: userData?.user?.id || null
          })
          .select("*")
          .single();

    setIsLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(editingId ? "Sistema atualizado." : "Sistema cadastrado.");
    resetForm();
    await loadArticles();
  }

  async function deleteArticle(id) {
    if (!confirm("Remover este sistema da base de dúvidas?")) return;

    setIsLoading(true);

    const { error } = await supabase
      .from("system_articles")
      .delete()
      .eq("id", id);

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Sistema removido.");
    await loadArticles();
  }

  return (
    <section className="system-knowledge-admin">
      <div className="admin-card admin-card-wide">
        <p className="eyebrow">Pergaminho de Sistemas</p>
        <h2>{editingId ? "Editar sistema" : "Cadastrar sistema oficial"}</h2>
        <p>
          Cadastre aqui os sistemas oficiais da Legendary Ninja. O Pergaminho de
          Dúvidas dos players buscará respostas nesta base.
        </p>

        {message && <p className="auth-message">{message}</p>}

        <form className="system-knowledge-form" onSubmit={handleSubmit}>
          <label>
            Título do sistema
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Ex: Sistema de Tipagem Sanguínea"
            />
          </label>

          <label>
            Categoria
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
            >
              {DEFAULT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="system-knowledge-form-full">
            Resumo curto
            <textarea
              value={form.summary}
              onChange={(event) => updateField("summary", event.target.value)}
              placeholder="Resumo rápido que aparecerá antes da resposta completa."
              rows={3}
            />
          </label>

          <label className="system-knowledge-form-full">
            Conteúdo oficial
            <textarea
              value={form.content}
              onChange={(event) => updateField("content", event.target.value)}
              placeholder="Cole aqui a regra oficial completa do sistema."
              rows={10}
            />
          </label>

          <label>
            Tags
            <input
              value={form.tags}
              onChange={(event) => updateField("tags", event.target.value)}
              placeholder="Ex: sangue, DNA, implante"
            />
          </label>

          <label>
            Palavras alternativas
            <input
              value={form.aliases}
              onChange={(event) => updateField("aliases", event.target.value)}
              placeholder="Ex: transplante, corpo versátil, adaptação"
            />
          </label>

          <label>
            Sistemas relacionados
            <input
              value={form.related_systems}
              onChange={(event) => updateField("related_systems", event.target.value)}
              placeholder="Ex: Ciência e Medicina, Adaptações Corporais"
            />
          </label>

          <label>
            Visibilidade
            <select
              value={form.visibility}
              onChange={(event) => updateField("visibility", event.target.value)}
            >
              <option value="public">Público</option>
              <option value="admin">Somente ADM</option>
            </select>
          </label>

          <label className="system-knowledge-toggle">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateField("is_active", event.target.checked)}
            />
            Sistema ativo
          </label>

          <div className="system-knowledge-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar sistema"}
            </button>

            {editingId && (
              <button type="button" onClick={resetForm}>
                Cancelar edição
              </button>
            )}

            <button type="button" onClick={loadArticles}>
              Atualizar lista
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card admin-card-wide">
        <p className="eyebrow">Base cadastrada</p>
        <h2>{articles.length} sistema(s)</h2>

        <input
          className="system-knowledge-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar sistema por título, categoria, tag ou conteúdo..."
        />

        <div className="system-knowledge-list">
          {filteredArticles.map((article) => (
            <article key={article.id} className="system-knowledge-row">
              <div>
                <strong>{article.title}</strong>
                <span>
                  {article.category} · {article.is_active ? "ativo" : "inativo"} · {article.visibility}
                </span>

                {article.summary && <p>{article.summary}</p>}
              </div>

              <div className="system-knowledge-row-actions">
                <button type="button" onClick={() => startEdit(article)}>
                  Editar
                </button>
                <button type="button" onClick={() => deleteArticle(article.id)}>
                  Remover
                </button>
              </div>
            </article>
          ))}

          {filteredArticles.length === 0 && (
            <p className="empty-state">Nenhum sistema encontrado.</p>
          )}
        </div>
      </div>
    </section>
  );
}
