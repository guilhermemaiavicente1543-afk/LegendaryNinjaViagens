import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const RANKS = ["E", "D", "C", "B", "A", "S", "SS"];

const OPTIONS = {
  range: [
    ["Corpo a corpo", 8],
    ["Curto alcance", 20],
    ["Médio alcance", 26],
    ["Longo alcance", 38],
    ["Todos os alcances", 44]
  ],
  users: [
    ["6+ usuários", 4],
    ["5 usuários", 12],
    ["3–4 usuários", 24],
    ["2 usuários", 34],
    ["1 usuário", 42]
  ],
  classType: [
    ["Defensiva", 10],
    ["Ofensiva", 18],
    ["Suporte", 30],
    ["Selamento", 32],
    ["Preparação", 46]
  ],
  structure: [
    ["Taijutsu/Bukijutsu", 6],
    ["Hiden/Yang", 14],
    ["Elemental/Yin", 24],
    ["Não elemental/Kekkei Genkai", 40],
    ["Kinjutsu/Exclusiva", 48]
  ],
  damage: [
    ["Não causa dano/Incapacitante", 2],
    ["Ferimentos leves", 16],
    ["Ferimentos moderados", 22],
    ["Ferimentos graves/mortais", 34],
    ["Dizimação/obliteração", 50]
  ]
};

const CLASSIFICATIONS = [
  "Ninjutsu",
  "Taijutsu",
  "Genjutsu",
  "Fuinjutsu",
  "Senjutsu",
  "Kenjutsu",
  "Bukijutsu",
  "Kekkei Genkai",
  "Dōjutsu",
  "Hiden",
  "Kinjutsu",
  "Outro"
];

const NATURES = [
  "Sem natureza definida",
  "Katon",
  "Suiton",
  "Raiton",
  "Doton",
  "Fuuton",
  "Hyoton",
  "Mokuton",
  "Youton",
  "Futton",
  "Bakuton",
  "Shoton",
  "Jiton",
  "Enton",
  "Yin",
  "Yang",
  "Yin-Yang"
];

const initialForm = {
  name: "",
  originalName: "",
  classification: "Ninjutsu",
  nature: "Sem natureza definida",
  techniqueType: "",
  description: "",
  range: 0,
  users: 0,
  classType: 0,
  structure: 0,
  damage: 0,
  isHealing: false,
  usesSenjutsu: false,
  isFillerBoruto: false,
  speedBonus: 0
};

function getRank(total) {
  if (total >= 204) return "SS";
  if (total >= 175) return "S";
  if (total >= 146) return "A";
  if (total >= 117) return "B";
  if (total >= 88) return "C";
  if (total >= 59) return "D";
  return "E";
}

function calculate(form) {
  const range = OPTIONS.range[Number(form.range)];
  const users = OPTIONS.users[Number(form.users)];
  const classType = OPTIONS.classType[Number(form.classType)];
  const structure = OPTIONS.structure[Number(form.structure)];
  const damage = OPTIONS.damage[Number(form.damage)];

  const speedRaw = Number(form.speedBonus || 0);
  const speedPoints = Number.isFinite(speedRaw) ? Math.floor(speedRaw / 5) : 0;

  let total = range[1] + users[1] + classType[1] + structure[1] + damage[1];

  const parts = [
    `${range[0]}: +${range[1]}`,
    `${users[0]}: +${users[1]}`,
    `${classType[0]}: +${classType[1]}`,
    `${structure[0]}: +${structure[1]}`,
    `${damage[0]}: +${damage[1]}`
  ];

  if (form.isHealing) {
    total += 43;
    parts.push("Técnica de cura: +43");
  }

  if (form.usesSenjutsu) {
    total += 50;
    parts.push("Usa Senjutsu: +50");
  }

  if (form.isFillerBoruto) {
    total += 20;
    parts.push("Filler Boruto: +20");
  }

  if (speedPoints > 0) {
    total += speedPoints;
    parts.push(`Bônus de velocidade: +${speedPoints}`);
  }

  return {
    total,
    rank: getRank(total),
    details: parts.join(" | "),
    labels: {
      range: range[0],
      users: users[0],
      classType: classType[0],
      structure: structure[0],
      damage: damage[0]
    }
  };
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="anced-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([name, points], index) => (
          <option key={name} value={index}>
            {name} (+{points})
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AncedTechniquesPanel({ user, character }) {
  const [tab, setTab] = useState("dex");
  const [form, setForm] = useState(initialForm);
  const [techniques, setTechniques] = useState([]);
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState("Todos");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const result = useMemo(() => calculate(form), [form]);

  useEffect(() => {
    loadTechniques();
  }, [user?.id, character?.id]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function loadTechniques() {
    if (!isSupabaseConfigured || !supabase || !user?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("techniques")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMessage(`Erro ao carregar ShinobiDex: ${error.message}`);
      return;
    }

    setTechniques(data || []);
  }

  async function saveTechnique() {
    if (!form.name.trim()) {
      setMessage("Informe o nome da técnica.");
      return;
    }

    if (!user?.id || !isSupabaseConfigured || !supabase) {
      setMessage("Você precisa estar logado para salvar técnicas.");
      return;
    }

    setLoading(true);
    setMessage("");

    const payload = {
      owner_id: user.id,
      character_id: character?.id || null,
      name: form.name.trim(),
      original_name: form.originalName.trim(),
      rank: result.rank,
      total: result.total,
      details: result.details,
      description: form.description.trim(),
      classification: form.classification,
      nature: form.nature,
      technique_type: form.techniqueType.trim(),
      range_label: result.labels.range,
      users_label: result.labels.users,
      class_label: result.labels.classType,
      structure_label: result.labels.structure,
      damage_label: result.labels.damage,
      is_healing: form.isHealing,
      uses_senjutsu: form.usesSenjutsu,
      is_filler_boruto: form.isFillerBoruto,
      speed_bonus: Math.floor(Number(form.speedBonus || 0) / 5),
      source: "anced-calculator",
      visibility: "private",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("techniques").insert(payload);

    setLoading(false);

    if (error) {
      setMessage(`Erro ao salvar técnica: ${error.message}`);
      return;
    }

    setMessage("Técnica salva no Inventário/ShinobiDex.");
    setForm(initialForm);
    setTab("dex");
    loadTechniques();
  }

  async function removeTechnique(id) {
    if (!window.confirm("Remover esta técnica?")) return;

    const { error } = await supabase
      .from("techniques")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id);

    if (error) {
      setMessage(`Erro ao remover técnica: ${error.message}`);
      return;
    }

    setTechniques((current) => current.filter((item) => item.id !== id));
  }

  const filtered = techniques.filter((technique) => {
    const text = `${technique.name || ""} ${technique.original_name || ""}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesRank = rankFilter === "Todos" || technique.rank === rankFilter;
    return matchesSearch && matchesRank;
  });

  return (
    <section className="anced-panel">
      <header className="anced-header">
        <div>
          <p className="eyebrow">Inventário</p>
          <h2>ShinobiDex</h2>
          <span>Arquivo de técnicas do personagem e Calculadora ANCED.</span>
        </div>

        <div className="anced-tabs">
          <button
            type="button"
            className={tab === "dex" ? "active" : ""}
            onClick={() => setTab("dex")}
          >
            ShinobiDex
          </button>

          <button
            type="button"
            className={tab === "calculator" ? "active" : ""}
            onClick={() => setTab("calculator")}
          >
            Calculadora ANCED
          </button>
        </div>
      </header>

      {message && <p className="anced-message">{message}</p>}

      {tab === "calculator" ? (
        <div className="anced-calculator">
          <div className="anced-card">
            <h3>Criar técnica</h3>

            <div className="anced-grid two">
              <label className="anced-field">
                <span>Nome da técnica</span>
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Ex.: Chama Fantasma"
                />
              </label>

              <label className="anced-field">
                <span>Nome original</span>
                <input
                  value={form.originalName}
                  onChange={(event) => update("originalName", event.target.value)}
                  placeholder="Opcional"
                />
              </label>

              <label className="anced-field">
                <span>Classificação</span>
                <select
                  value={form.classification}
                  onChange={(event) => update("classification", event.target.value)}
                >
                  {CLASSIFICATIONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="anced-field">
                <span>Natureza</span>
                <select
                  value={form.nature}
                  onChange={(event) => update("nature", event.target.value)}
                >
                  {NATURES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="anced-field">
              <span>Tipo / observação</span>
              <input
                value={form.techniqueType}
                onChange={(event) => update("techniqueType", event.target.value)}
                placeholder="Ex.: ofensiva, defensiva, suporte..."
              />
            </label>

            <label className="anced-field">
              <span>Descrição</span>
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Descreva funcionamento, efeito, limitações e condições de uso."
              />
            </label>

            <div className="anced-grid">
              <SelectField label="Alcance" value={form.range} options={OPTIONS.range} onChange={(v) => update("range", v)} />
              <SelectField label="Usuários" value={form.users} options={OPTIONS.users} onChange={(v) => update("users", v)} />
              <SelectField label="Classe" value={form.classType} options={OPTIONS.classType} onChange={(v) => update("classType", v)} />
              <SelectField label="Estrutura" value={form.structure} options={OPTIONS.structure} onChange={(v) => update("structure", v)} />
              <SelectField label="Danos" value={form.damage} options={OPTIONS.damage} onChange={(v) => update("damage", v)} />

              <label className="anced-field">
                <span>Bônus de velocidade</span>
                <input
                  type="number"
                  min="0"
                  value={form.speedBonus}
                  onChange={(event) => update("speedBonus", event.target.value)}
                  placeholder="Valor dividido por 5"
                />
              </label>
            </div>

            <div className="anced-checks">
              <label>
                <input
                  type="checkbox"
                  checked={form.isHealing}
                  onChange={(event) => update("isHealing", event.target.checked)}
                />
                Técnica de Cura (+43)
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.usesSenjutsu}
                  onChange={(event) => update("usesSenjutsu", event.target.checked)}
                />
                Usa Senjutsu (+50)
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.isFillerBoruto}
                  onChange={(event) => update("isFillerBoruto", event.target.checked)}
                />
                Filler Boruto (+20)
              </label>
            </div>
          </div>

          <aside className="anced-card anced-result-card">
            <p>Resultado ANCED</p>
            <strong>{result.rank}</strong>
            <span>{result.total} pontos</span>

            <div className="anced-details">
              {result.details.split(" | ").map((item) => (
                <small key={item}>{item}</small>
              ))}
            </div>

            <button type="button" onClick={saveTechnique} disabled={loading}>
              {loading ? "Salvando..." : "Salvar técnica"}
            </button>
          </aside>
        </div>
      ) : (
        <div className="anced-dex">
          <div className="anced-card anced-filters">
            <label className="anced-field">
              <span>Buscar</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome da técnica..."
              />
            </label>

            <label className="anced-field">
              <span>Rank</span>
              <select value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}>
                <option>Todos</option>
                {RANKS.map((rank) => (
                  <option key={rank}>{rank}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="anced-message">
            {loading ? "Carregando técnicas..." : `${filtered.length} técnica(s) no inventário.`}
          </p>

          <div className="anced-technique-list">
            {filtered.map((technique) => (
              <article key={technique.id} className="anced-technique-card">
                <div className="anced-technique-rank">{technique.rank}</div>

                <div>
                  <h3>{technique.name}</h3>
                  {technique.original_name && <p>{technique.original_name}</p>}

                  <div className="anced-tags">
                    <span>{technique.total} pts</span>
                    {technique.classification && <span>{technique.classification}</span>}
                    {technique.nature && <span>{technique.nature}</span>}
                  </div>

                  {technique.description && <p>{technique.description}</p>}

                  {technique.details && (
                    <details>
                      <summary>Ver cálculo</summary>
                      <p>{technique.details}</p>
                    </details>
                  )}
                </div>

                <button type="button" className="anced-delete" onClick={() => removeTechnique(technique.id)}>
                  Remover
                </button>
              </article>
            ))}

            {!loading && filtered.length === 0 && (
              <div className="anced-empty">
                Nenhuma técnica salva ainda.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
