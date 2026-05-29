import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../i18n/LanguageContext";

const RANKS = ["Todos", "E", "D", "C", "B", "A", "S", "SS"];
const STATUS = ["Todos", "draft", "approved", "needs_review"];

const LANGUAGES = [
  { code: "pt", label: "PT-BR" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" }
];

function getTechniqueName(technique, language) {
  if (!technique) return "";

  if (language === "en") return technique.name_en || technique.name_pt || technique.name;
  if (language === "es") return technique.name_es || technique.name_pt || technique.name;
  if (language === "fr") return technique.name_fr || technique.name_pt || technique.name;

  return technique.name_pt || technique.name;
}


function getTechniqueSourceUrl(technique, language) {
  if (!technique) return "";

  if (language === "en") return technique.source_url_en || technique.source_url_pt || technique.source_url || "";
  if (language === "es") return technique.source_url_es || technique.source_url_pt || technique.source_url || "";
  if (language === "fr") return technique.source_url_fr || technique.source_url_pt || technique.source_url || "";

  return technique.source_url_pt || technique.source_url || "";
}

export default function ShinobiDexPage({ onBack }) {
  const { language, t } = useLanguage();
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
    setMessage("");

    const pageSize = 1000;
    let from = 0;
    let allTechniques = [];
    let totalCount = null;

    while (true) {
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("technique_catalog")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, to);

      if (error) {
        setIsLoading(false);
        setMessage(`Erro ao carregar ShinobiDex: ${error.message}`);
        return;
      }

      if (typeof count === "number") {
        totalCount = count;
      }

      const rows = data || [];
      allTechniques = [...allTechniques, ...rows];

      setTechniques(allTechniques);

      if (rows.length < pageSize) {
        break;
      }

      from += pageSize;

      if (totalCount !== null && from >= totalCount) {
        break;
      }
    }

    setIsLoading(false);
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
        technique.name_pt,
        technique.name_en,
        technique.name_es,
        technique.name_fr,
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
          <h1>{t("shinobidex.title")}</h1>
          <p>
{t("shinobidex.subtitle")}
          </p>
        </div>

        <div className="shinobidex-actions">

          <button type="button" onClick={loadTechniques}>{t("common.update")}</button>
          {onBack && <button type="button" onClick={onBack}>{t("common.back")}</button>}
        </div>
      </header>

      {message && <p className="shinobidex-message">{message}</p>}

      <div className="shinobidex-filters">
        <label>
          {t("common.search")}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, natureza, usuário, descrição..."
          />
        </label>

        <label>
          {t("shinobidex.rank")}
          <select value={rank} onChange={(event) => setRank(event.target.value)}>
            {RANKS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          {t("shinobidex.classification")}
          <select value={classification} onChange={(event) => setClassification(event.target.value)}>
            {classifications.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          {t("shinobidex.nature")}
          <select value={nature} onChange={(event) => setNature(event.target.value)}>
            {natures.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          {t("shinobidex.status")}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="shinobidex-count">
        {isLoading ? "Carregando técnicas..." : `${filtered.length} ${t("shinobidex.found")}`}
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
                <strong>{getTechniqueName(technique, language)}</strong>
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
              {t("shinobidex.noResults")}
            </div>
          )}
        </div>

        <aside className="shinobidex-detail">
          {selected ? (
            <>
              <p className="eyebrow">{t("shinobidex.technique")}</p>
              <h2>{getTechniqueName(selected, language)}</h2>

              {selected.original_name && <p className="shinobidex-original">{selected.original_name}</p>}

              <div className="shinobidex-badges">
                <span>Wiki: {selected.wiki_rank || "?"}</span>
                <span>ANCED: {selected.anced_rank || "?"}</span>
                <span>{selected.anced_total || 0} pts</span>
                <span>Confiança: {selected.anced_confidence || "baixa"}</span>
                <span>{selected.status || "draft"}</span>
              </div>

              <div className="shinobidex-info-grid">
                <p><strong>{t("shinobidex.classification")}</strong><span>{selected.classification || "Não identificada"}</span></p>
                <p><strong>{t("shinobidex.nature")}</strong><span>{selected.nature || "Não identificada"}</span></p>
                <p><strong>Tipo</strong><span>{selected.technique_type || "Não identificado"}</span></p>
                <p><strong>Usuários</strong><span>{selected.users_text || "Não identificados"}</span></p>
              </div>

              <section>
                <h3>{t("shinobidex.summary")}</h3>
                <p>{selected.summary || "Resumo pendente de adaptação para o RPG."}</p>
              </section>

              <section>
                <h3>{t("shinobidex.rpgEffect")}</h3>
                <p>{selected.rpg_effect || "Efeito pendente de revisão ADM."}</p>
              </section>

              <section>
                <h3>{t("shinobidex.ancedCalculation")}</h3>
                <p>{selected.anced_details || "Sem detalhes de cálculo."}</p>
              </section>

              {selected.source_url && (
                <a
                  className="shinobidex-source"
                  href={getTechniqueSourceUrl(selected, language) || selected.source_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("shinobidex.originalSource")}
                </a>
              )}
            </>
          ) : (
            <div className="shinobidex-empty detail">
              {t("shinobidex.noTechnique")}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
