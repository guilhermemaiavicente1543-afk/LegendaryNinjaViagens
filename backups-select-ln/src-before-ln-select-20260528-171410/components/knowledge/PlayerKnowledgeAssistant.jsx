import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreArticle(article, query) {
  const q = normalizeText(query);

  if (!q) return 0;

  const words = q
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);

  const title = normalizeText(article.title);
  const category = normalizeText(article.category);
  const summary = normalizeText(article.summary);
  const content = normalizeText(article.content);
  const tags = normalizeText((article.tags || []).join(" "));
  const aliases = normalizeText((article.aliases || []).join(" "));

  let score = 0;

  if (title.includes(q)) score += 80;
  if (tags.includes(q)) score += 60;
  if (aliases.includes(q)) score += 55;
  if (category.includes(q)) score += 35;
  if (summary.includes(q)) score += 30;
  if (content.includes(q)) score += 18;

  for (const word of words) {
    if (title.includes(word)) score += 18;
    if (tags.includes(word)) score += 14;
    if (aliases.includes(word)) score += 12;
    if (category.includes(word)) score += 8;
    if (summary.includes(word)) score += 7;
    if (content.includes(word)) score += 3;
  }

  return score;
}

function createSnippet(text, maxLength = 620) {
  const clean = String(text || "").trim();

  if (clean.length <= maxLength) return clean;

  return `${clean.slice(0, maxLength).trim()}...`;
}

export default function PlayerKnowledgeAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [articles, setArticles] = useState([]);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Base de sistemas indisponível no momento.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("system_articles")
      .select("*")
      .eq("is_active", true)
      .eq("visibility", "public")
      .order("title", { ascending: true });

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setArticles(data || []);
  }

  const results = useMemo(() => {
    const query = submittedQuestion.trim();

    if (!query) return [];

    return articles
      .map((article) => ({
        article,
        score: scoreArticle(article, query)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [articles, submittedQuestion]);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmittedQuestion(question.trim());
  }

  const bestResult = results[0]?.article || null;

  return (
    <>
      <button
        type="button"
        className={`knowledge-floating-button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Abrir Pergaminho de Dúvidas"
      >
        ?
      </button>

      {isOpen && (
        <aside className="knowledge-assistant-panel">
          <div className="knowledge-assistant-header">
            <div>
              <p>Pergaminho de Dúvidas</p>
              <h2>Oráculo dos Sistemas</h2>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar Pergaminho de Dúvidas"
            >
              ×
            </button>
          </div>

          <form className="knowledge-assistant-search" onSubmit={handleSubmit}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Digite sua dúvida sobre regras, ficha, inventário, mapa, técnicas ou sistemas..."
              rows={3}
            />

            <button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? "Carregando..." : "Consultar"}
            </button>
          </form>

          {message && <p className="knowledge-assistant-message">{message}</p>}

          {!submittedQuestion && (
            <div className="knowledge-assistant-empty">
              <strong>Exemplos de pergunta:</strong>
              <button type="button" onClick={() => setQuestion("Como funciona viagem?")}>
                Como funciona viagem?
              </button>
              <button type="button" onClick={() => setQuestion("Como adiciono uma técnica no inventário?")}>
                Como adiciono uma técnica no inventário?
              </button>
              <button type="button" onClick={() => setQuestion("O que é tipagem sanguínea?")}>
                O que é tipagem sanguínea?
              </button>
            </div>
          )}

          {submittedQuestion && !bestResult && (
            <div className="knowledge-answer-card">
              <p>Resposta</p>
              <h3>Não encontrei essa informação</h3>
              <strong>
                Não encontrei essa informação na base oficial da Legendary Ninja.
                Para evitar uma resposta incorreta, consulte um administrador.
              </strong>
            </div>
          )}

          {bestResult && (
            <div className="knowledge-answer-card">
              <p>Fonte oficial encontrada</p>
              <h3>{bestResult.title}</h3>
              <small>{bestResult.category}</small>

              {bestResult.summary && <em>{bestResult.summary}</em>}

              <strong>{createSnippet(bestResult.content)}</strong>

              {Array.isArray(bestResult.tags) && bestResult.tags.length > 0 && (
                <div className="knowledge-tags">
                  {bestResult.tags.slice(0, 8).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {results.length > 1 && (
            <div className="knowledge-related">
              <p>Sistemas relacionados</p>

              {results.slice(1).map(({ article }) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => {
                    setQuestion(article.title);
                    setSubmittedQuestion(article.title);
                  }}
                >
                  {article.title}
                  <span>{article.category}</span>
                </button>
              ))}
            </div>
          )}

          <footer className="knowledge-assistant-footer">
            O Pergaminho consulta sistemas cadastrados. Decisões finais cabem à administração.
          </footer>
        </aside>
      )}
    </>
  );
}
