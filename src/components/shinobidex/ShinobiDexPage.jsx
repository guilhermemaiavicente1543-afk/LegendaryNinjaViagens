import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const PAGE_SIZE = 40;

const RANK_ORDER = {
  SS: 7,
  S: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
};

const RANGE_FILTERS = [
  { label: "Sem alcance", points: 0 },
  { label: "Corpo a corpo", points: 8 },
  { label: "Curto (1-10m)", points: 20 },
  { label: "Médio (10-30m)", points: 26 },
  { label: "Longo (30-100m)", points: 38 },
  { label: "Todos os alcances", points: 44 },
];

const USERS_FILTERS = [
  { label: "0 usuários válidos", points: 0 },
  { label: "1 usuário", points: 42 },
  { label: "2 usuários", points: 34 },
  { label: "4/3 usuários", points: 24 },
  { label: "5 usuários", points: 12 },
  { label: "6+ usuários", points: 4 },
];

const CLASS_FILTERS = [
  { label: "Defensivo", points: 10 },
  { label: "Ofensivo", points: 18 },
  { label: "Suporte", points: 30 },
  { label: "Selamento", points: 32 },
  { label: "Preparação", points: 46 },
];

const STRUCTURE_FILTERS = [
  { label: "Taijutsu/Bukijutsu", points: 6 },
  { label: "Hiden/Yang", points: 14 },
  { label: "Elemental/Yin", points: 24 },
  { label: "Não elemental/Kekkei Genkai", points: 40 },
  { label: "Kinjutsu/Kekkei Tōta/Exclusivo", points: 48 },
];

const DAMAGE_FILTERS = [
  { label: "Não causa/Incapacitação", points: 2 },
  { label: "Ferimentos leves", points: 16 },
  { label: "Ferimentos moderados", points: 22 },
  { label: "Ferimentos graves/mortais", points: 34 },
  { label: "Dizimação/Obliteração", points: 50 },
];

function getRankClass(rank) {
  return `shinobidex-public-v2__rank rank-${String(rank || "none").toLowerCase()}`;
}

function formatPoints(label, points) {
  if (!label && points === null) return "—";
  if (!label && points === undefined) return "—";
  return `${label || "—"} ${points !== null && points !== undefined ? `[+${points}]` : ""}`;
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatUser(user) {
  if (!user) return "—";
  if (typeof user === "string") return user;
  return user.label ? `${user.name || user.raw} (${user.label})` : user.name || user.raw || "—";
}

async function fetchRankTechniqueIds({
  rankFilter,
  statusFilter,
  rangeFilter,
  usersFilter,
  classFilter,
  structureFilter,
  damageFilter,
}) {
  if (
    !rankFilter &&
    !statusFilter &&
    !rangeFilter &&
    !usersFilter &&
    !classFilter &&
    !structureFilter &&
    !damageFilter
  ) {
    return null;
  }

  let query = supabase
    .from("anced_curated_ranks")
    .select("technique_id")
    .not("technique_id", "is", null)
    .limit(5000);

  if (rankFilter) {
    query = query.eq("rank", rankFilter);
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (rangeFilter !== "") {
    query = query.eq("range_points", Number(rangeFilter));
  }

  if (usersFilter !== "") {
    query = query.eq("users_points", Number(usersFilter));
  }

  if (classFilter !== "") {
    query = query.eq("class_points", Number(classFilter));
  }

  if (structureFilter !== "") {
    query = query.eq("structure_points", Number(structureFilter));
  }

  if (damageFilter !== "") {
    query = query.eq("damage_points", Number(damageFilter));
  }

  const { data, error } = await query;

  if (error) throw error;

  return [...new Set((data || []).map((row) => row.technique_id).filter(Boolean))];
}

function getRankSortValue(rank) {
  return RANK_ORDER[rank] || 0;
}

export default function ShinobiDexPage({ onBack }) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedRank, setSelectedRank] = useState(null);
  const [selectedRaw, setSelectedRaw] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rangeFilter, setRangeFilter] = useState("");
  const [usersFilter, setUsersFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [structureFilter, setStructureFilter] = useState("");
  const [damageFilter, setDamageFilter] = useState("");
  const [page, setPage] = useState(1);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [message, setMessage] = useState("");

  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("anced");
  const [reportText, setReportText] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportMessage, setReportMessage] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    rankFilter,
    statusFilter,
    rangeFilter,
    usersFilter,
    classFilter,
    structureFilter,
    damageFilter,
  ]);

  useEffect(() => {
    let isMounted = true;

    async function loadList() {
      setLoadingList(true);
      setMessage("");

      try {
        const filterIds = await fetchRankTechniqueIds({
          rankFilter,
          statusFilter,
          rangeFilter,
          usersFilter,
          classFilter,
          structureFilter,
          damageFilter,
        });

        if (Array.isArray(filterIds) && filterIds.length === 0) {
          if (!isMounted) return;
          setItems([]);
          setTotalCount(0);
          setSelectedId("");
          setSelected(null);
          setSelectedRank(null);
          setSelectedRaw(null);
          setLoadingList(false);
          return;
        }

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("shinobidex_techniques")
          .select("id,name,slug,summary,status,updated_at", { count: "exact" })
          .order("name", { ascending: true })
          .range(from, to);

        if (debouncedSearch) {
          query = query.ilike("name", `%${debouncedSearch}%`);
        }

        if (Array.isArray(filterIds)) {
          query = query.in("id", filterIds);
        }

        const { data: techniqueRows, error, count } = await query;

        if (error) throw error;

        const techniqueIds = (techniqueRows || []).map((row) => row.id);

        let rankRows = [];

        if (techniqueIds.length > 0) {
          const { data: ranksData, error: ranksError } = await supabase
            .from("anced_curated_ranks")
            .select("id,technique_id,total,rank,status,users_label,users_points,updated_at")
            .in("technique_id", techniqueIds);

          if (ranksError) throw ranksError;

          rankRows = ranksData || [];
        }

        const rankByTechniqueId = new Map(
          rankRows.map((rank) => [rank.technique_id, rank])
        );

        const merged = (techniqueRows || [])
          .map((technique) => ({
            ...technique,
            anced: rankByTechniqueId.get(technique.id) || null,
          }))
          .sort((a, b) => {
            if (rankFilter) return a.name.localeCompare(b.name, "pt-BR");

            const rankDiff =
              getRankSortValue(b.anced?.rank) - getRankSortValue(a.anced?.rank);

            if (rankDiff !== 0) return rankDiff;

            return a.name.localeCompare(b.name, "pt-BR");
          });

        if (!isMounted) return;

        setItems(merged);
        setTotalCount(count || 0);

        if (merged.length > 0) {
          const selectedStillVisible = merged.some((item) => item.id === selectedId);

          if (!selectedId || !selectedStillVisible) {
            setSelectedId(merged[0].id);
          }
        } else {
          setSelectedId("");
          setSelected(null);
          setSelectedRank(null);
          setSelectedRaw(null);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(`Erro ao carregar ShinobiDex: ${error.message}`);
        }
      } finally {
        if (isMounted) {
          setLoadingList(false);
        }
      }
    }

    loadList();

    return () => {
      isMounted = false;
    };
  }, [
    page,
    debouncedSearch,
    rankFilter,
    statusFilter,
    rangeFilter,
    usersFilter,
    classFilter,
    structureFilter,
    damageFilter,
  ]);

  useEffect(() => {
    if (!selectedId) return;

    let isMounted = true;

    async function loadDetail() {
      setLoadingDetail(true);
      setMessage("");

      try {
        const { data: technique, error: techniqueError } = await supabase
          .from("shinobidex_techniques")
          .select("*")
          .eq("id", selectedId)
          .single();

        if (techniqueError) throw techniqueError;

        const { data: rankRows, error: rankError } = await supabase
          .from("anced_curated_ranks")
          .select("*")
          .eq("technique_id", selectedId)
          .limit(1);

        if (rankError) throw rankError;

        const { data: rawRows, error: rawError } = await supabase
          .from("shinobidex_raw_sources")
          .select("*")
          .eq("technique_id", selectedId)
          .limit(1);

        if (rawError) throw rawError;

        if (!isMounted) return;

        setSelected(technique);
        setSelectedRank(rankRows?.[0] || null);
        setSelectedRaw(rawRows?.[0] || null);
      } catch (error) {
        if (isMounted) {
          setMessage(`Erro ao abrir técnica: ${error.message}`);
        }
      } finally {
        if (isMounted) {
          setLoadingDetail(false);
        }
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  const stats = useMemo(() => {
    const withRankOnPage = items.filter((item) => item.anced?.rank).length;

    return {
      total: totalCount,
      pageCount: items.length,
      withRankOnPage,
      page,
      totalPages,
    };
  }, [items, totalCount, page, totalPages]);

  const selectedWithData = useMemo(() => {
    if (!selected) return null;

    return {
      ...selected,
      anced: selectedRank,
      raw: selectedRaw,
    };
  }, [selected, selectedRank, selectedRaw]);

  const validUsers = safeArray(selectedWithData?.anced?.valid_users);
  const rawUsers = safeArray(selectedWithData?.raw?.raw_users_labeled);

  function selectTechnique(id) {
    setSelectedId(id);
    setIsMobileDetailOpen(true);
  }

  function clearAncedFilters() {
    setSearch("");
    setDebouncedSearch("");
    setRankFilter("");
    setStatusFilter("");
    setRangeFilter("");
    setUsersFilter("");
    setClassFilter("");
    setStructureFilter("");
    setDamageFilter("");
    setPage(1);
  }

  async function submitAncedReport() {
    if (!selectedWithData?.id) return;

    const text = reportText.trim();

    if (!text) {
      setReportMessage("Descreva o erro antes de enviar.");
      return;
    }

    setReportSending(true);
    setReportMessage("");

    const payload = {
      technique_id: selectedWithData.id,
      technique_name: selectedWithData.name,
      report_type: reportType || "anced",
      message: text,
      status: "open",
      page_context: {
        anced: selectedWithData.anced || null,
        raw: selectedWithData.raw
          ? {
              raw_classification: selectedWithData.raw.raw_classification,
              raw_nature: selectedWithData.raw.raw_nature,
              raw_type: selectedWithData.raw.raw_type,
              raw_range: selectedWithData.raw.raw_range,
              raw_rank: selectedWithData.raw.raw_rank,
            }
          : null,
      },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("anced_error_reports")
      .insert(payload);

    if (error) {
      setReportMessage(`Erro ao enviar report: ${error.message}`);
      setReportSending(false);
      return;
    }

    setReportMessage("Report enviado. A administração poderá revisar esse ANCED.");
    setReportText("");

    setTimeout(() => {
      setReportOpen(false);
      setReportMessage("");
    }, 900);

    setReportSending(false);
  }

  return (
    <main className="shinobidex-public-v2">
      <header className="shinobidex-public-v2__hero">
        <div>
          <p className="shinobidex-public-v2__kicker">Legendary Ninja Digital</p>
          <h1>ShinobiDex</h1>
          <p>
            Catálogo oficial de técnicas com descrição, evidências da Wiki e cálculo ANCED.
          </p>
        </div>

        <div className="shinobidex-public-v2__actions">
          {onBack && (
            <button type="button" onClick={onBack}>
              Voltar ao Hall
            </button>
          )}

          <button type="button" onClick={() => window.location.reload()}>
            Atualizar
          </button>
        </div>
      </header>

      {message && <div className="shinobidex-public-v2__message">{message}</div>}

      <section className="shinobidex-public-v2__stats">
        <div>
          <span>Total filtrado</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>Nesta página</span>
          <strong>{stats.pageCount}</strong>
        </div>
        <div>
          <span>Com rank na página</span>
          <strong>{stats.withRankOnPage}</strong>
        </div>
        <div>
          <span>Página</span>
          <strong>
            {stats.page}/{stats.totalPages}
          </strong>
        </div>
      </section>

      <section className="shinobidex-public-v2__filters shinobidex-public-v2__filters--anced">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar técnica..."
        />

        <select value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}>
          <option value="">Todos os ranks</option>
          {["SS", "S", "A", "B", "C", "D", "E"].map((rank) => (
            <option key={rank} value={rank}>
              Rank {rank}
            </option>
          ))}
        </select>

        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">Todos os status</option>
          <option value="approved">Aprovado</option>
          <option value="reviewed">Revisado</option>
          <option value="reviewing">Em revisão</option>
          <option value="draft_mixed_scraper_users_anced_reference">Draft da lista</option>
          <option value="draft_manual_lote_scraper_users">Draft manual</option>
          <option value="needs_anced_manual_curation">Precisa curadoria</option>
        </select>

        <select value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value)}>
          <option value="">Todos os alcances</option>
          {RANGE_FILTERS.map((option) => (
            <option key={option.label} value={option.points}>
              {option.label} [+{option.points}]
            </option>
          ))}
        </select>

        <select value={usersFilter} onChange={(event) => setUsersFilter(event.target.value)}>
          <option value="">Todas as quantidades</option>
          {USERS_FILTERS.map((option) => (
            <option key={option.label} value={option.points}>
              {option.label} [+{option.points}]
            </option>
          ))}
        </select>

        <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
          <option value="">Todas as classes</option>
          {CLASS_FILTERS.map((option) => (
            <option key={option.label} value={option.points}>
              {option.label} [+{option.points}]
            </option>
          ))}
        </select>

        <select value={structureFilter} onChange={(event) => setStructureFilter(event.target.value)}>
          <option value="">Todas as estruturas</option>
          {STRUCTURE_FILTERS.map((option) => (
            <option key={option.label} value={option.points}>
              {option.label} [+{option.points}]
            </option>
          ))}
        </select>

        <select value={damageFilter} onChange={(event) => setDamageFilter(event.target.value)}>
          <option value="">Todos os danos</option>
          {DAMAGE_FILTERS.map((option) => (
            <option key={option.label} value={option.points}>
              {option.label} [+{option.points}]
            </option>
          ))}
        </select>

        <button
          type="button"
          className="shinobidex-public-v2__clear-filters"
          onClick={clearAncedFilters}
        >
          Limpar filtros
        </button>
      </section>

      <section className="shinobidex-public-v2__pagination">
        <button
          type="button"
          disabled={page <= 1 || loadingList}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Página anterior
        </button>

        <span>
          Página {page} de {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages || loadingList}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Próxima página
        </button>
      </section>

      {loadingList ? (
        <section className="shinobidex-public-v2__loading">
          Carregando página da ShinobiDex...
        </section>
      ) : (
        <section className="shinobidex-public-v2__layout">
          <aside className="shinobidex-public-v2__list">
            <p className="shinobidex-public-v2__count">
              {items.length} técnicas nesta página
            </p>

            {items.map((technique) => (
              <button
                key={technique.id}
                type="button"
                onClick={() => selectTechnique(technique.id)}
                className={
                  selectedId === technique.id
                    ? "shinobidex-public-v2__item active"
                    : "shinobidex-public-v2__item"
                }
              >
                <strong>{technique.name}</strong>
                <span>
                  {technique.anced?.rank ? `Rank ${technique.anced.rank}` : "Sem rank"} ·{" "}
                  {technique.anced?.total ?? "—"} pts
                </span>
              </button>
            ))}
          </aside>

          <article
            className={
              isMobileDetailOpen
                ? "shinobidex-public-v2__detail is-open"
                : "shinobidex-public-v2__detail"
            }
          >
            <button
              type="button"
              className="shinobidex-public-v2__mobile-close"
              onClick={() => setIsMobileDetailOpen(false)}
            >
              Fechar técnica
            </button>

            {!selectedWithData ? (
              <div className="shinobidex-public-v2__empty">
                Selecione uma técnica.
              </div>
            ) : loadingDetail ? (
              <div className="shinobidex-public-v2__empty">
                Carregando técnica...
              </div>
            ) : (
              <>
                <section className="shinobidex-public-v2__card main-card">
                  <div className="shinobidex-public-v2__title-row">
                    <div>
                      <p className="shinobidex-public-v2__kicker">Técnica</p>
                      <h2>{selectedWithData.name}</h2>
                    </div>

                    <div className={getRankClass(selectedWithData.anced?.rank)}>
                      <span>Rank</span>
                      <strong>{selectedWithData.anced?.rank || "—"}</strong>
                      <em>{selectedWithData.anced?.total ?? "—"} pts</em>
                    </div>
                  </div>

                  <p className="shinobidex-public-v2__description">
                    {selectedWithData.description ||
                      selectedWithData.summary ||
                      "Sem descrição cadastrada."}
                  </p>

                  {selectedWithData.source_url && (
                    <a href={selectedWithData.source_url} target="_blank" rel="noreferrer">
                      Abrir fonte na Wiki
                    </a>
                  )}
                </section>

                <section className="shinobidex-public-v2__card">
                  <p className="shinobidex-public-v2__kicker">ANCED</p>

                  <div className="shinobidex-public-v2__anced-grid">
                    <div>
                      <span>Alcance</span>
                      <strong>
                        {formatPoints(
                          selectedWithData.anced?.range_label,
                          selectedWithData.anced?.range_points
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Nº de usuários</span>
                      <strong>
                        {formatPoints(
                          selectedWithData.anced?.users_label,
                          selectedWithData.anced?.users_points
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Classe</span>
                      <strong>
                        {formatPoints(
                          selectedWithData.anced?.class_label,
                          selectedWithData.anced?.class_points
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Estrutura</span>
                      <strong>
                        {formatPoints(
                          selectedWithData.anced?.structure_label,
                          selectedWithData.anced?.structure_points
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Danos</span>
                      <strong>
                        {formatPoints(
                          selectedWithData.anced?.damage_label,
                          selectedWithData.anced?.damage_points
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Bônus</span>
                      <strong>
                        {selectedWithData.anced?.bonus_label || "Sem bônus"}{" "}
                        {selectedWithData.anced?.bonus_points
                          ? `[+${selectedWithData.anced.bonus_points}]`
                          : ""}
                      </strong>
                    </div>
                  </div>

                  <div className="shinobidex-public-v2__status">
                    Status: <strong>{selectedWithData.anced?.status || "sem registro"}</strong>
                  </div>

                  <button
                    type="button"
                    className="shinobidex-public-v2__report-button"
                    onClick={() => {
                      setReportOpen(true);
                      setReportMessage("");
                    }}
                  >
                    Reportar erro no ANCED
                  </button>
                </section>

                <section className="shinobidex-public-v2__card">
                  <p className="shinobidex-public-v2__kicker">Evidência da Wiki</p>

                  <div className="shinobidex-public-v2__raw-grid">
                    <span>
                      Classificação: <strong>{selectedWithData.raw?.raw_classification || "—"}</strong>
                    </span>
                    <span>
                      Natureza: <strong>{selectedWithData.raw?.raw_nature || "—"}</strong>
                    </span>
                    <span>
                      Tipo: <strong>{selectedWithData.raw?.raw_type || "—"}</strong>
                    </span>
                    <span>
                      Alcance Wiki: <strong>{selectedWithData.raw?.raw_range || "—"}</strong>
                    </span>
                    <span>
                      Rank Wiki: <strong>{selectedWithData.raw?.raw_rank || "—"}</strong>
                    </span>
                  </div>
                </section>

                <section className="shinobidex-public-v2__card">
                  <p className="shinobidex-public-v2__kicker">Usuários válidos ANCED</p>

                  <div className="shinobidex-public-v2__chips">
                    {validUsers.length ? (
                      validUsers.map((user, index) => (
                        <span key={`${formatUser(user)}-${index}`}>
                          {formatUser(user)}
                        </span>
                      ))
                    ) : (
                      <span>Nenhum usuário válido registrado.</span>
                    )}
                  </div>
                </section>

                <details className="shinobidex-public-v2__card">
                  <summary>Ver usuários brutos capturados</summary>

                  <div className="shinobidex-public-v2__chips muted">
                    {rawUsers.length ? (
                      rawUsers.map((user, index) => (
                        <span key={`${formatUser(user)}-raw-${index}`}>
                          {formatUser(user)}
                        </span>
                      ))
                    ) : (
                      <span>Nenhum usuário bruto registrado.</span>
                    )}
                  </div>
                </details>
              </>
            )}
          </article>
        </section>
      )}

      {reportOpen && (
        <div className="shinobidex-public-v2__report-overlay">
          <section className="shinobidex-public-v2__report-modal">
            <div className="shinobidex-public-v2__report-head">
              <div>
                <p className="shinobidex-public-v2__kicker">Report de erro</p>
                <h2>{selectedWithData?.name || "Técnica"}</h2>
              </div>

              <button type="button" onClick={() => setReportOpen(false)}>
                Fechar
              </button>
            </div>

            <label>
              Tipo de erro
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value)}
              >
                <option value="anced">Erro no cálculo ANCED</option>
                <option value="users">Erro nos usuários</option>
                <option value="description">Erro na descrição</option>
                <option value="wiki_evidence">Erro na evidência da Wiki</option>
                <option value="other">Outro</option>
              </select>
            </label>

            <label>
              Explique o problema
              <textarea
                rows={6}
                value={reportText}
                onChange={(event) => setReportText(event.target.value)}
                placeholder="Ex: A quantidade de usuários deveria ser 2 porque usuários Apenas Game não entram..."
              />
            </label>

            {reportMessage && (
              <div className="shinobidex-public-v2__report-message">
                {reportMessage}
              </div>
            )}

            <button
              type="button"
              className="shinobidex-public-v2__report-submit"
              onClick={submitAncedReport}
              disabled={reportSending}
            >
              {reportSending ? "Enviando..." : "Enviar report"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
