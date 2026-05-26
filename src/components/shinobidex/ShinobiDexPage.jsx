import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const RANKS = ["Todos", "E", "D", "C", "B", "A", "S", "SS"];
const STATUS = ["Todos", "draft", "approved", "needs_review"];

export default function ShinobiDexPage({ onBack }) {
  const [techniques, setTechniques] = useState([]);
  const [search, setSearch] = useState("");
  const [rank, setRank] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [classification, setClassification] = useState("Todas");
  const [nature, setNature] = useState("Todas");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTechniques();
  }, []);

  async function loadTechniques() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("technique_catalog")
      .select("*")
      .order("name", { ascending: true });

    setIsLoading(false);

    if (error) {
      setMessage(`Erro ao carregar ShinobiDex: ${error.message}`);
      return;
    }

    setTechniques(data || []);
  }

  const classifications = useMemo(() => {
    return ["Todas", ...Array.from(new Set(techniques.map((t) => t.classification).filter(Boolean))).sort()];
  }, [techniques]);

  const natures = useMemo(() => {
    return ["Todas", ...Array.from(new Set(techniques.map((t) => t.nature).filter(Boolean))).sort()];
  }, [techniques]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return techniques.filter((technique) => {
      const text = [
        technique.name,
        technique.original_name,
        technique.english_name,
        technique.classification,
        technique.nature,
        technique.summary,
        technique.users_text
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!q || text.includes(q)) &&
        (rank === "Todos" || technique.anced_rank === rank || technique.wiki_rank === rank) &&
        (status === "Todos" || technique.status === status) &&
        (classification === "Todas" || technique.classification === classification) &&
        (nature === "Todas" || technique.nature === nature)
      );
    });
  }, [techniques, search, rank, status, classification, nature]);

  return (
    <section className="shinobidex-page">
      <header className="shinobidex-hero">
        <div>
          <p className="eyebrow">LN Digital</p>
          <h1>ShinobiDex</h1>
          <p>
            Biblioteca alternativa de técnicas do RPG, importada como rascunho,
            calculada pela lógica ANCED e revisável pelo ADM.
          </p>
        </div>

        <div className="shinobidex-actions">
          <button type="button" onClick={loadTechniques}>Atualizar</button>
          {onBack && <button type="button" onClick={onBack}>Voltar</button>}
        </div>
      </header>

      {message && <p className="shinobidex-message">{message}</p>}

      <div className="shinobidex-filters">
        <label>
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, natureza, usuário, descrição..."
          />
        </label>

        <label>
          Rank
          <select value={rank} onChange={(event) => setRank(event.target.value)}>
            {RANKS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Classificação
          <select value={classification} onChange={(event) => setClassification(event.target.value)}>
            {classifications.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Natureza
          <select value={nature} onChange={(event) => setNature(event.target.value)}>
            {natures.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="shinobidex-count">
        {isLoading ? "Carregando técnicas..." : `${filtered.length} técnica(s) encontradas`}
      </div>

      <div className="shinobidex-layout">
        <div className="shinobidex-list">
          {filtered.map((technique) => (
            <button
              type="button"
              key={technique.id}
              className={`shinobidex-card ${selected?.id === technique.id ? "active" : ""}`}
              onClick={() => setSelected(technique)}
            >
              <span className="shinobidex-rank">
                {technique.anced_rank || technique.wiki_rank || "?"}
              </span>

              <span className="shinobidex-card-body">
                <strong>{technique.name}</strong>
                <small>
                  {technique.classification || "Sem classificação"} ·{" "}
                  {technique.nature || "Sem natureza"} ·{" "}
                  {technique.status || "draft"}
                </small>
              </span>
            </button>
          ))}

          {!isLoading && filtered.length === 0 && (
            <div className="shinobidex-empty">
              Nenhuma técnica encontrada.
            </div>
          )}
        </div>

        <aside className="shinobidex-detail">
          {selected ? (
            <>
              <p className="eyebrow">Técnica</p>
              <h2>{selected.name}</h2>

              {selected.original_name && <p className="shinobidex-original">{selected.original_name}</p>}

              <div className="shinobidex-badges">
                <span>Wiki: {selected.wiki_rank || "?"}</span>
                <span>ANCED: {selected.anced_rank || "?"}</span>
                <span>{selected.anced_total || 0} pts</span>
                <span>Confiança: {selected.anced_confidence || "baixa"}</span>
                <span>{selected.status || "draft"}</span>
              </div>

              <div className="shinobidex-info-grid">
                <p><strong>Classificação</strong><span>{selected.classification || "Não identificada"}</span></p>
                <p><strong>Natureza</strong><span>{selected.nature || "Não identificada"}</span></p>
                <p><strong>Tipo</strong><span>{selected.technique_type || "Não identificado"}</span></p>
                <p><strong>Usuários</strong><span>{selected.users_text || "Não identificados"}</span></p>
              </div>

              <section>
                <h3>Resumo</h3>
                <p>{selected.summary || "Resumo pendente de adaptação para o RPG."}</p>
              </section>

              <section>
                <h3>Efeito no RPG</h3>
                <p>{selected.rpg_effect || "Efeito pendente de revisão ADM."}</p>
              </section>

              <section>
                <h3>Cálculo ANCED sugerido</h3>
                <p>{selected.anced_details || "Sem detalhes de cálculo."}</p>
              </section>

              {selected.source_url && (
                <a
                  className="shinobidex-source"
                  href={selected.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver fonte original
                </a>
              )}
            </>
          ) : (
            <div className="shinobidex-empty detail">
              Selecione uma técnica para ver detalhes.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
