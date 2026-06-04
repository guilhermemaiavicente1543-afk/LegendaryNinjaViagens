import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const RANGE_OPTIONS = [
  { label: "Sem alcance", points: 0 },
  { label: "Corpo a corpo", points: 8 },
  { label: "Curto (1-10m)", points: 20 },
  { label: "Médio (10-30m)", points: 26 },
  { label: "Longo (30-100m)", points: 38 },
  { label: "Todos os alcances", points: 44 },
];

const USER_OPTIONS = [
  { label: "0 usuários válidos", count: 0, points: 0 },
  { label: "1 usuário", count: 1, points: 42 },
  { label: "2 usuários", count: 2, points: 34 },
  { label: "4/3 usuários", count: 3, points: 24 },
  { label: "5 usuários", count: 5, points: 12 },
  { label: "6+ usuários", count: 6, points: 4 },
];

const CLASS_OPTIONS = [
  { label: "Defensivo", points: 10 },
  { label: "Ofensivo", points: 18 },
  { label: "Suporte", points: 30 },
  { label: "Selamento", points: 32 },
  { label: "Preparação", points: 46 },
];

const STRUCTURE_OPTIONS = [
  { label: "Taijutsu/Bukijutsu", points: 6 },
  { label: "Hiden/Yang", points: 14 },
  { label: "Elemental/Yin", points: 24 },
  { label: "Não elemental/Kekkei Genkai", points: 40 },
  { label: "Kinjutsu/Kekkei Tōta/Exclusivo", points: 48 },
];

const DAMAGE_OPTIONS = [
  { label: "Não causa/Incapacitação", points: 2 },
  { label: "Ferimentos leves", points: 16 },
  { label: "Ferimentos moderados", points: 22 },
  { label: "Ferimentos graves/mortais", points: 34 },
  { label: "Dizimação/Obliteração", points: 50 },
];

const STATUS_OPTIONS = [
  { label: "Rascunho misto", value: "draft_mixed_scraper_users_anced_reference" },
  { label: "Lote manual", value: "draft_manual_lote_scraper_users" },
  { label: "Precisa curadoria manual", value: "needs_anced_manual_curation" },
  { label: "Em revisão", value: "reviewing" },
  { label: "Revisado", value: "reviewed" },
  { label: "Aprovado", value: "approved" },
];

function getRank(total) {
  const value = Number(total || 0);
  if (value >= 204) return "SS";
  if (value >= 175) return "S";
  if (value >= 146) return "A";
  if (value >= 117) return "B";
  if (value >= 88) return "C";
  if (value >= 59) return "D";
  return "E";
}

function optionFromPoints(options, points) {
  return options.find((option) => Number(option.points) === Number(points)) || null;
}

function userOptionFromCount(count) {
  const value = Number(count || 0);
  if (value >= 6) return USER_OPTIONS.find((option) => option.count === 6);
  if (value === 5) return USER_OPTIONS.find((option) => option.count === 5);
  if (value === 4 || value === 3) return USER_OPTIONS.find((option) => option.count === 3);
  if (value === 2) return USER_OPTIONS.find((option) => option.count === 2);
  if (value === 1) return USER_OPTIONS.find((option) => option.count === 1);
  return USER_OPTIONS.find((option) => option.count === 0);
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
  if (typeof user === "string") return user;
  if (!user) return "—";
  return user.label ? `${user.name || user.raw} (${user.label})` : user.name || user.raw || "—";
}

export default function ShinobiDexAdmin() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [techniques, setTechniques] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [rawSource, setRawSource] = useState(null);
  const [rankRow, setRankRow] = useState(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    rangePoints: "",
    usersCount: 0,
    classPoints: "",
    structurePoints: "",
    damagePoints: "",
    bonusLabel: "",
    bonusPoints: 0,
    status: "reviewing",
    reviewNotes: "",
  });

  async function loadTechniques() {
    setLoadingList(true);
    setMessage("");

    let query = supabase
      .from("shinobidex_techniques")
      .select("id,name,slug,status,updated_at")
      .order("name", { ascending: true })
      .limit(180);

    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      setMessage(`Erro ao carregar técnicas: ${error.message}`);
      setLoadingList(false);
      return;
    }

    let rows = data || [];

    if (statusFilter) {
      const ids = rows.map((row) => row.id);

      if (ids.length > 0) {
        const { data: rankRows, error: rankError } = await supabase
          .from("anced_curated_ranks")
          .select("technique_id,status")
          .in("technique_id", ids);

        if (!rankError) {
          const statusById = new Map((rankRows || []).map((row) => [row.technique_id, row.status]));
          rows = rows.filter((row) => statusById.get(row.id) === statusFilter);
        }
      }
    }

    setTechniques(rows);
    setLoadingList(false);
  }

  async function loadTechniqueDetail(id) {
    if (!id) return;

    setLoadingDetail(true);
    setMessage("");

    const { data: technique, error: techniqueError } = await supabase
      .from("shinobidex_techniques")
      .select("*")
      .eq("id", id)
      .single();

    if (techniqueError) {
      setMessage(`Erro ao abrir técnica: ${techniqueError.message}`);
      setLoadingDetail(false);
      return;
    }

    const { data: rawRows, error: rawError } = await supabase
      .from("shinobidex_raw_sources")
      .select("*")
      .eq("technique_id", id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (rawError) {
      setMessage(`Erro ao abrir fonte bruta: ${rawError.message}`);
      setLoadingDetail(false);
      return;
    }

    const { data: rankRows, error: rankError } = await supabase
      .from("anced_curated_ranks")
      .select("*")
      .eq("technique_id", id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (rankError) {
      setMessage(`Erro ao abrir ANCED: ${rankError.message}`);
      setLoadingDetail(false);
      return;
    }

    const raw = rawRows?.[0] || null;
    const rank = rankRows?.[0] || null;

    const userOpt = userOptionFromCount(rank?.users_count || 0);

    setSelected(technique);
    setRawSource(raw);
    setRankRow(rank);

    setForm({
      rangePoints: rank?.range_points ?? "",
      usersCount: userOpt?.count ?? 0,
      classPoints: rank?.class_points ?? "",
      structurePoints: rank?.structure_points ?? "",
      damagePoints: rank?.damage_points ?? "",
      bonusLabel: rank?.bonus_label || "",
      bonusPoints: Number(rank?.bonus_points || 0),
      status: rank?.status || "reviewing",
      reviewNotes: rank?.review_notes || "",
    });

    setLoadingDetail(false);
  }

  useEffect(() => {
    loadTechniques();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTechniques();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  useEffect(() => {
    if (selectedId) {
      loadTechniqueDetail(selectedId);
    }
  }, [selectedId]);

  const userOption = useMemo(() => userOptionFromCount(form.usersCount), [form.usersCount]);

  const calculated = useMemo(() => {
    const total =
      Number(form.rangePoints || 0) +
      Number(userOption?.points || 0) +
      Number(form.classPoints || 0) +
      Number(form.structurePoints || 0) +
      Number(form.damagePoints || 0) +
      Number(form.bonusPoints || 0);

    return {
      total,
      rank: getRank(total),
    };
  }, [form, userOption]);

  const rawUsers = safeArray(rawSource?.raw_users_labeled);
  const validUsers = safeArray(rankRow?.valid_users);

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveAnced() {
    if (!selected?.id) return;

    setSaving(true);
    setMessage("");

    const rangeOption = optionFromPoints(RANGE_OPTIONS, form.rangePoints);
    const classOption = optionFromPoints(CLASS_OPTIONS, form.classPoints);
    const structureOption = optionFromPoints(STRUCTURE_OPTIONS, form.structurePoints);
    const damageOption = optionFromPoints(DAMAGE_OPTIONS, form.damagePoints);

    const payload = {
      technique_id: selected.id,

      range_label: rangeOption?.label || null,
      range_points: form.rangePoints === "" ? null : Number(form.rangePoints),

      users_count: Number(form.usersCount || 0),
      users_label: userOption?.label || "0 usuários válidos",
      users_points: Number(userOption?.points || 0),
      valid_users: rankRow?.valid_users || [],

      class_label: classOption?.label || null,
      class_points: form.classPoints === "" ? null : Number(form.classPoints),

      structure_label: structureOption?.label || null,
      structure_points: form.structurePoints === "" ? null : Number(form.structurePoints),

      damage_label: damageOption?.label || null,
      damage_points: form.damagePoints === "" ? null : Number(form.damagePoints),

      bonus_label: form.bonusLabel || null,
      bonus_points: Number(form.bonusPoints || 0),

      total: calculated.total,
      rank: calculated.rank,

      differs_from_pdf:
        rankRow?.source_pdf_total !== null &&
        rankRow?.source_pdf_total !== undefined
          ? Number(rankRow.source_pdf_total) !== Number(calculated.total)
          : false,

      status: form.status,
      review_notes: form.reviewNotes,
      updated_at: new Date().toISOString(),
    };

    let response;

    if (rankRow?.id) {
      response = await supabase
        .from("anced_curated_ranks")
        .update(payload)
        .eq("id", rankRow.id)
        .select("*")
        .single();
    } else {
      response = await supabase
        .from("anced_curated_ranks")
        .insert(payload)
        .select("*")
        .single();
    }

    if (response.error) {
      setMessage(`Erro ao salvar ANCED: ${response.error.message}`);
      setSaving(false);
      return;
    }

    setRankRow(response.data);
    setMessage("ANCED salvo com sucesso.");
    setSaving(false);
  }

  return (
    <section className="shinobidex-v2-admin">
      <header className="shinobidex-v2-admin__header">
        <div>
          <p className="shinobidex-v2-admin__kicker">ShinobiDex V2</p>
          <h1>Curadoria ANCED</h1>
          <p>
            Edite os eixos oficiais. Usuários válidos vêm do scraper/Supabase; total e rank são recalculados automaticamente.
          </p>
        </div>

        <div className="shinobidex-v2-admin__rankbox">
          <span>Total</span>
          <strong>{calculated.total}</strong>
          <em>Rank {calculated.rank}</em>
        </div>
      </header>

      {message && <div className="shinobidex-v2-admin__message">{message}</div>}

      <div className="shinobidex-v2-admin__layout">
        <aside className="shinobidex-v2-admin__sidebar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar técnica..."
            className="shinobidex-v2-admin__input"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="shinobidex-v2-admin__input"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="shinobidex-v2-admin__list">
            {loadingList ? (
              <p>Carregando...</p>
            ) : (
              techniques.map((technique) => (
                <button
                  key={technique.id}
                  type="button"
                  onClick={() => setSelectedId(technique.id)}
                  className={
                    selectedId === technique.id
                      ? "shinobidex-v2-admin__list-item active"
                      : "shinobidex-v2-admin__list-item"
                  }
                >
                  <strong>{technique.name}</strong>
                  <span>{technique.status || "—"}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="shinobidex-v2-admin__main">
          {!selected ? (
            <div className="shinobidex-v2-admin__empty">
              Selecione uma técnica para revisar.
            </div>
          ) : loadingDetail ? (
            <div className="shinobidex-v2-admin__empty">
              Carregando técnica...
            </div>
          ) : (
            <>
              <section className="shinobidex-v2-admin__card">
                <p className="shinobidex-v2-admin__kicker">Técnica</p>
                <h2>{selected.name}</h2>

                {selected.source_url && (
                  <a href={selected.source_url} target="_blank" rel="noreferrer">
                    Abrir página da Wiki
                  </a>
                )}

                <p>{selected.description || "Sem descrição registrada."}</p>
              </section>

              <section className="shinobidex-v2-admin__card">
                <p className="shinobidex-v2-admin__kicker">Evidência bruta</p>

                <div className="shinobidex-v2-admin__raw-grid">
                  <span>Classificação: <strong>{rawSource?.raw_classification || "—"}</strong></span>
                  <span>Natureza: <strong>{rawSource?.raw_nature || "—"}</strong></span>
                  <span>Tipo Wiki: <strong>{rawSource?.raw_type || "—"}</strong></span>
                  <span>Alcance Wiki: <strong>{rawSource?.raw_range || "—"}</strong></span>
                  <span>Rank Wiki: <strong>{rawSource?.raw_rank || "—"}</strong></span>
                </div>

                <h3>Usuários capturados</h3>
                <div className="shinobidex-v2-admin__chips">
                  {rawUsers.length ? rawUsers.map((user, index) => (
                    <span key={`${formatUser(user)}-${index}`}>{formatUser(user)}</span>
                  )) : <span>Nenhum usuário bruto registrado.</span>}
                </div>

                <h3>Usuários válidos ANCED</h3>
                <div className="shinobidex-v2-admin__chips valid">
                  {validUsers.length ? validUsers.map((user, index) => (
                    <span key={`${formatUser(user)}-${index}`}>{formatUser(user)}</span>
                  )) : <span>Nenhum usuário válido registrado.</span>}
                </div>
              </section>

              <section className="shinobidex-v2-admin__card">
                <p className="shinobidex-v2-admin__kicker">Ranqueamento ANCED</p>

                <div className="shinobidex-v2-admin__form-grid">
                  <label>
                    Alcance
                    <select
                      value={form.rangePoints}
                      onChange={(event) => updateForm("rangePoints", event.target.value)}
                    >
                      <option value="">Selecionar</option>
                      {RANGE_OPTIONS.map((option) => (
                        <option key={option.label} value={option.points}>
                          {option.label} [+{option.points}]
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Nº de usuários
                    <select
                      value={form.usersCount}
                      onChange={(event) => updateForm("usersCount", Number(event.target.value))}
                    >
                      {USER_OPTIONS.map((option) => (
                        <option key={option.label} value={option.count}>
                          {option.label} [+{option.points}]
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Classe
                    <select
                      value={form.classPoints}
                      onChange={(event) => updateForm("classPoints", event.target.value)}
                    >
                      <option value="">Selecionar</option>
                      {CLASS_OPTIONS.map((option) => (
                        <option key={option.label} value={option.points}>
                          {option.label} [+{option.points}]
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Estrutura
                    <select
                      value={form.structurePoints}
                      onChange={(event) => updateForm("structurePoints", event.target.value)}
                    >
                      <option value="">Selecionar</option>
                      {STRUCTURE_OPTIONS.map((option) => (
                        <option key={option.label} value={option.points}>
                          {option.label} [+{option.points}]
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Danos
                    <select
                      value={form.damagePoints}
                      onChange={(event) => updateForm("damagePoints", event.target.value)}
                    >
                      <option value="">Selecionar</option>
                      {DAMAGE_OPTIONS.map((option) => (
                        <option key={option.label} value={option.points}>
                          {option.label} [+{option.points}]
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Bônus / ajuste
                    <input
                      value={form.bonusLabel}
                      onChange={(event) => updateForm("bonusLabel", event.target.value)}
                      placeholder="Ex: Cura, Senjutsu, Filler Boruto..."
                    />
                  </label>

                  <label>
                    Pontos de bônus
                    <input
                      type="number"
                      value={form.bonusPoints}
                      onChange={(event) => updateForm("bonusPoints", Number(event.target.value))}
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={form.status}
                      onChange={(event) => updateForm("status", event.target.value)}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="shinobidex-v2-admin__total">
                  <span>Usuários usados: {userOption?.label} [+{userOption?.points}]</span>
                  <span>Bônus: +{Number(form.bonusPoints || 0)}</span>
                  <strong>Total {calculated.total} | Rank {calculated.rank}</strong>
                </div>

                <label className="shinobidex-v2-admin__notes">
                  Observações
                  <textarea
                    rows={6}
                    value={form.reviewNotes}
                    onChange={(event) => updateForm("reviewNotes", event.target.value)}
                  />
                </label>

                <button
                  type="button"
                  onClick={saveAnced}
                  disabled={saving}
                  className="shinobidex-v2-admin__save"
                >
                  {saving ? "Salvando..." : "Salvar ANCED"}
                </button>
              </section>
            </>
          )}
        </main>
      </div>
    </section>
  );
}
