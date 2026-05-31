import { useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../i18n/LanguageContext";
import LnSelect from "../ui/LnSelect";

const RANKS = ["Todos", "E", "D", "C", "B", "A", "S", "SS"];
const STATUS = ["Todos", "draft", "approved", "needs_review"];
const PAGE_SIZE = 80;

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
  const [page, setPage] = useState(1);
  const [resultTotal, setResultTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState({
    classifications: [],
    natures: []
  });
  const [selected, setSelected] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const pointerStartRef = useRef(null);
  const touchStartRef = useRef(null);
  const didScrollGestureRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const listScrollTimerRef = useRef(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadTechniques();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search, rank, status, classification, nature, page]);

  useEffect(() => {
    setIsDetailOpen(false);
  }, [search, rank, status, classification, nature, page]);

  useEffect(() => {
    if (!isDetailOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDetailOpen]);

  useEffect(() => {
    return () => {
      if (listScrollTimerRef.current) {
        window.clearTimeout(listScrollTimerRef.current);
      }
    };
  }, []);


  async function loadFilterOptions() {
    if (!isSupabaseConfigured || !supabase) return;

    const pageSize = 1000;
    let from = 0;
    const classificationsSet = new Set();
    const naturesSet = new Set();

    while (true) {
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("technique_catalog")
        .select("classification,nature")
        .order("name", { ascending: true })
        .range(from, to);

      if (error) return;

      const rows = data || [];

      for (const item of rows) {
        if (item.classification) classificationsSet.add(item.classification);
        if (item.nature) naturesSet.add(item.nature);
      }

      if (rows.length < pageSize) break;
      from += pageSize;
    }

    setFilterOptions({
      classifications: Array.from(classificationsSet).sort(),
      natures: Array.from(naturesSet).sort()
    });
  }

  async function loadTechniques() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const safePage = Math.max(1, Number(page || 1));
    const from = (safePage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("technique_catalog")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(from, to);

    const q = search.trim();

    if (q) {
      const safe = q.replace(/[%_]/g, "");
      query = query.or(
        `name.ilike.%${safe}%,name_pt.ilike.%${safe}%,name_en.ilike.%${safe}%,name_es.ilike.%${safe}%,name_fr.ilike.%${safe}%,original_name.ilike.%${safe}%,english_name.ilike.%${safe}%,summary.ilike.%${safe}%,nature.ilike.%${safe}%,classification.ilike.%${safe}%,users_text.ilike.%${safe}%`
      );
    }

    if (rank !== "Todos") {
      query = query.or(`anced_rank.eq.${rank},wiki_rank.eq.${rank}`);
    }

    if (status !== "Todos") {
      query = query.eq("status", status);
    }

    if (classification !== "Todas") {
      query = query.eq("classification", classification);
    }

    if (nature !== "Todas") {
      query = query.eq("nature", nature);
    }

    const { data, error, count } = await query;

    setIsLoading(false);

    if (error) {
      setMessage(`Erro ao carregar ShinobiDex: ${error.message}`);
      return;
    }

    const nextData = data || [];

    setTechniques(nextData);
    setResultTotal(count ?? nextData.length);

    if (nextData.length) {
      const selectedStillVisible = selected?.id
        ? nextData.some((item) => item.id === selected.id)
        : false;

      if (!selectedStillVisible) {
        setSelected(nextData[0]);
      }
    } else {
      setSelected(null);
    }
  }

  const classifications = useMemo(() => {
    return ["Todas", ...filterOptions.classifications];
  }, [filterOptions.classifications]);

  const natures = useMemo(() => {
    return ["Todas", ...filterOptions.natures];
  }, [filterOptions.natures]);

  const filtered = techniques;

  function blockTechniqueTap(duration = 420) {
    didScrollGestureRef.current = true;
    suppressClickUntilRef.current = Date.now() + duration;
  }

  function isTechniqueTapBlocked() {
    return didScrollGestureRef.current || Date.now() < suppressClickUntilRef.current;
  }

  function handleTechniquePointerDown(event) {
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY
    };
    didScrollGestureRef.current = false;
  }

  function handleTechniquePointerMove(event) {
    if (!pointerStartRef.current) return;

    const deltaX = Math.abs(event.clientX - pointerStartRef.current.x);
    const deltaY = Math.abs(event.clientY - pointerStartRef.current.y);

    if (deltaX > 6 || deltaY > 6) {
      blockTechniqueTap();
    }
  }

  function handleTechniquePointerCancel() {
    blockTechniqueTap();
    pointerStartRef.current = null;
  }

  function handleTechniqueTouchStart(event) {
    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    didScrollGestureRef.current = false;
  }

  function handleTechniqueTouchMove(event) {
    const touch = event.touches?.[0];

    if (!touch || !touchStartRef.current) {
      blockTechniqueTap();
      return;
    }

    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    if (deltaX > 6 || deltaY > 6) {
      blockTechniqueTap();
    }
  }

  function handleTechniqueTouchEnd() {
    touchStartRef.current = null;
  }

  function handleTechniqueListScroll() {
    blockTechniqueTap(520);

    if (listScrollTimerRef.current) {
      window.clearTimeout(listScrollTimerRef.current);
    }

    listScrollTimerRef.current = window.setTimeout(() => {
      didScrollGestureRef.current = false;
    }, 520);
  }

  function handleTechniqueSelect(event, technique) {
    if (isTechniqueTapBlocked()) {
      event.preventDefault();
      event.stopPropagation();
      pointerStartRef.current = null;
      touchStartRef.current = null;
      return;
    }

    pointerStartRef.current = null;
    touchStartRef.current = null;
    setSelected(technique);
    setIsReportOpen(false);
    setReportText("");
    setReportMessage("");
    setIsDetailOpen(true);
  }

  function handleTechniqueKeyDown(event, technique) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    setSelected(technique);
    setIsReportOpen(false);
    setReportText("");
    setReportMessage("");
    setIsDetailOpen(true);
  }

  async function submitAncedReport() {
    if (!selected || !supabase) return;

    const cleanText = reportText.trim();

    if (cleanText.length < 10) {
      setReportMessage("Explique o erro com pelo menos 10 caracteres.");
      return;
    }

    setIsReportSubmitting(true);
    setReportMessage("");

    const { error } = await supabase.from("anced_error_reports").insert({
      technique_id: String(selected.id || ""),
      technique_name: getTechniqueName(selected, language) || selected.name || "Técnica sem nome",
      anced_rank: selected.anced_rank || selected.wiki_rank || "",
      anced_total: Number(selected.anced_total || 0),
      anced_details: selected.anced_details || "",
      report_text: cleanText,
      status: "open"
    });

    setIsReportSubmitting(false);

    if (error) {
      setReportMessage(`Erro ao enviar denúncia: ${error.message}`);
      return;
    }

    setReportText("");
    setReportMessage("Denúncia enviada para a equipe ADM da ShinobiDex.");
    setIsReportOpen(false);
  }

  const totalPages = Math.max(1, Math.ceil(resultTotal / PAGE_SIZE));
  const firstResult = resultTotal === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, resultTotal);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

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
        </div>
      </header>

      {message && <p className="shinobidex-message">{message}</p>}

      <div className="shinobidex-filters">
        <label>
          {t("common.search")}
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Nome, natureza, usuário, descrição..."
          />
        </label>

        <label>
          {t("shinobidex.rank")}
          <LnSelect
            value={rank}
            onChange={(event) => {
              setRank(event.target.value);
              setPage(1);
            }}
          >
            {RANKS.map((item) => <option key={item}>{item}</option>)}
          </LnSelect>
        </label>

        <label>
          {t("shinobidex.classification")}
          <LnSelect
            value={classification}
            onChange={(event) => {
              setClassification(event.target.value);
              setPage(1);
            }}
          >
            {classifications.map((item) => <option key={item}>{item}</option>)}
          </LnSelect>
        </label>

        <label>
          {t("shinobidex.nature")}
          <LnSelect
            value={nature}
            onChange={(event) => {
              setNature(event.target.value);
              setPage(1);
            }}
          >
            {natures.map((item) => <option key={item}>{item}</option>)}
          </LnSelect>
        </label>

        <label>
          {t("shinobidex.status")}
          <LnSelect
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            {STATUS.map((item) => <option key={item}>{item}</option>)}
          </LnSelect>
        </label>
      </div>

      <div className="shinobidex-count">
        {isLoading
          ? "Carregando técnicas..."
          : resultTotal === 0
            ? `0 ${t("shinobidex.found")}`
            : `${resultTotal} ${t("shinobidex.found")} · Mostrando ${firstResult}–${lastResult} de ${resultTotal}`}
      </div>

      <div className="shinobidex-pagination">
        <button
          type="button"
          disabled={!canGoPrevious || isLoading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Anterior
        </button>

        <span>
          Página {page} de {totalPages}
        </span>

        <button
          type="button"
          disabled={!canGoNext || isLoading}
          onClick={() => setPage((current) => current + 1)}
        >
          Próxima
        </button>
      </div>

      <div className="shinobidex-layout">
        <div className="shinobidex-list" onScroll={handleTechniqueListScroll}>
          {filtered.map((technique) => (
            <div
              key={technique.id}
              role="button"
              tabIndex={0}
              className={`shinobidex-card ${selected?.id === technique.id ? "active" : ""}`}
              onPointerDown={handleTechniquePointerDown}
              onPointerMove={handleTechniquePointerMove}
              onPointerCancel={handleTechniquePointerCancel}
              onTouchStart={handleTechniqueTouchStart}
              onTouchMove={handleTechniqueTouchMove}
              onTouchEnd={handleTechniqueTouchEnd}
              onClick={(event) => handleTechniqueSelect(event, technique)}
              onKeyDown={(event) => handleTechniqueKeyDown(event, technique)}
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
            </div>
          ))}

          {!isLoading && filtered.length === 0 && (
            <div className="shinobidex-empty">
              {t("shinobidex.noResults")}
            </div>
          )}
        </div>

        <aside className={`shinobidex-detail ${isDetailOpen ? "is-open" : ""}`}>
          <div className="shinobidex-detail-scroll">
          {selected ? (
            <>
              <button
                type="button"
                className="shinobidex-detail-close"
                onClick={() => setIsDetailOpen(false)}
              >
                Fechar
              </button>

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

              <section className="shinobidex-anced-report">
                <h3>Encontrou erro no ANCED?</h3>
                <p>
                  Use este campo para avisar a equipe sobre rank, pontuação ou cálculo incorreto.
                </p>

                {!isReportOpen ? (
                  <button
                    type="button"
                    className="shinobidex-report-toggle"
                    onClick={() => {
                      setIsReportOpen(true);
                      setReportMessage("");
                    }}
                  >
                    Denunciar erro no ANCED
                  </button>
                ) : (
                  <div className="shinobidex-report-form">
                    <textarea
                      value={reportText}
                      onChange={(event) => setReportText(event.target.value)}
                      placeholder="Explique qual é o erro no ANCED desta técnica..."
                      rows={5}
                    />

                    <div className="shinobidex-report-actions">
                      <button
                        type="button"
                        onClick={submitAncedReport}
                        disabled={isReportSubmitting}
                      >
                        {isReportSubmitting ? "Enviando..." : "Enviar denúncia"}
                      </button>

                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setIsReportOpen(false);
                          setReportText("");
                          setReportMessage("");
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {reportMessage && <p className="shinobidex-report-message">{reportMessage}</p>}
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
          </div>
        </aside>
      </div>
    </section>
  );
}
