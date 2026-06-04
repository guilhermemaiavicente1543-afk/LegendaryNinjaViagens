import { useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const RANGE_OPTIONS = [
  { label: "Sem alcance", points: 0 },
  { label: "Corpo a corpo", points: 8 },
  { label: "Curto (1-10m)", points: 20 },
  { label: "Médio (10-30m)", points: 26 },
  { label: "Longo (30-100m)", points: 38 },
  { label: "Todos os alcances", points: 44 },
];

const USERS_OPTIONS = [
  { label: "0 usuários válidos", points: 0 },
  { label: "1 usuário", points: 42 },
  { label: "2 usuários", points: 34 },
  { label: "4/3 usuários", points: 24 },
  { label: "5 usuários", points: 12 },
  { label: "6+ usuários", points: 4 },
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

function optionByPoints(options, points) {
  return options.find((option) => Number(option.points) === Number(points)) || null;
}

export default function AncedCalculatorPage({ user, onBack }) {
  const [form, setForm] = useState({
    techniqueName: "",
    description: "",
    rangePoints: 0,
    usersPoints: 42,
    classPoints: 18,
    structurePoints: 40,
    damagePoints: 34,
    healingBonus: false,
    senjutsuBonus: false,
    borutoFillerBonus: false,
    speedPercent: 0,
    manualBonusLabel: "",
    manualBonusPoints: 0,
    notes: "",
  });

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const calculated = useMemo(() => {
    const speedBonus = Math.floor(Math.max(0, Number(form.speedPercent || 0)) / 5);
    const healingBonus = form.healingBonus ? 43 : 0;
    const senjutsuBonus = form.senjutsuBonus ? 50 : 0;
    const borutoFillerBonus = form.borutoFillerBonus ? 20 : 0;
    const manualBonus = Number(form.manualBonusPoints || 0);

    const bonusPoints =
      healingBonus +
      senjutsuBonus +
      borutoFillerBonus +
      speedBonus +
      manualBonus;

    const total =
      Number(form.rangePoints || 0) +
      Number(form.usersPoints || 0) +
      Number(form.classPoints || 0) +
      Number(form.structurePoints || 0) +
      Number(form.damagePoints || 0) +
      bonusPoints;

    const bonusLabels = [
      form.healingBonus ? "Cura +43" : "",
      form.senjutsuBonus ? "Senjutsu +50" : "",
      form.borutoFillerBonus ? "Filler Boruto +20" : "",
      speedBonus ? `Velocidade +${speedBonus}` : "",
      manualBonus ? `${form.manualBonusLabel || "Bônus manual"} +${manualBonus}` : "",
    ].filter(Boolean);

    return {
      speedBonus,
      bonusPoints,
      bonusLabel: bonusLabels.join("; "),
      total,
      rank: getRank(total),
    };
  }, [form]);

  async function submitCalculation() {
    setMessage("");

    if (!form.techniqueName.trim()) {
      setMessage("Informe o nome da técnica antes de enviar.");
      return;
    }

    const range = optionByPoints(RANGE_OPTIONS, form.rangePoints);
    const users = optionByPoints(USERS_OPTIONS, form.usersPoints);
    const classOption = optionByPoints(CLASS_OPTIONS, form.classPoints);
    const structure = optionByPoints(STRUCTURE_OPTIONS, form.structurePoints);
    const damage = optionByPoints(DAMAGE_OPTIONS, form.damagePoints);

    const payload = {
      user_id: user?.id || null,
      technique_name: form.techniqueName.trim(),
      description: form.description.trim() || null,

      range_label: range?.label || null,
      range_points: Number(form.rangePoints || 0),

      users_label: users?.label || null,
      users_points: Number(form.usersPoints || 0),

      class_label: classOption?.label || null,
      class_points: Number(form.classPoints || 0),

      structure_label: structure?.label || null,
      structure_points: Number(form.structurePoints || 0),

      damage_label: damage?.label || null,
      damage_points: Number(form.damagePoints || 0),

      bonus_label: calculated.bonusLabel || null,
      bonus_points: Number(calculated.bonusPoints || 0),

      total: calculated.total,
      rank: calculated.rank,
      notes: form.notes.trim() || null,
      status: "pending",
      source: "anced_calculator_v2",
      updated_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não configurado. Cálculo feito localmente, mas não enviado.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("anced_submissions")
      .insert(payload);

    setSaving(false);

    if (error) {
      setMessage(`Erro ao enviar ANCED: ${error.message}`);
      return;
    }

    setMessage("ANCED enviado para revisão da administração.");
  }

  return (
    <main className="anced-page-v2">
      <header className="anced-page-v2__hero">
        <div>
          <p className="anced-page-v2__kicker">Legendary Ninja Digital</p>
          <h1>Calculadora ANCED</h1>
          <p>
            Calcule o rank de uma técnica usando os critérios oficiais da 6ª Temporada.
          </p>
        </div>


      </header>

      {message && <div className="anced-page-v2__message">{message}</div>}

      <section className="anced-page-v2__layout">
        <form className="anced-page-v2__card" onSubmit={(event) => event.preventDefault()}>
          <h2>Dados da técnica</h2>

          <label>
            Nome da técnica
            <input
              value={form.techniqueName}
              onChange={(event) => updateField("techniqueName", event.target.value)}
              placeholder="Ex: Técnica da Prisão de Água"
            />
          </label>

          <label>
            Descrição / observação
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Descreva funcionamento, condição de uso, dano e fonte."
            />
          </label>

          <div className="anced-page-v2__grid">
            <label>
              Alcance
              <select
                value={form.rangePoints}
                onChange={(event) => updateField("rangePoints", Number(event.target.value))}
              >
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
                value={form.usersPoints}
                onChange={(event) => updateField("usersPoints", Number(event.target.value))}
              >
                {USERS_OPTIONS.map((option) => (
                  <option key={option.label} value={option.points}>
                    {option.label} [+{option.points}]
                  </option>
                ))}
              </select>
            </label>

            <label>
              Classe
              <select
                value={form.classPoints}
                onChange={(event) => updateField("classPoints", Number(event.target.value))}
              >
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
                onChange={(event) => updateField("structurePoints", Number(event.target.value))}
              >
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
                onChange={(event) => updateField("damagePoints", Number(event.target.value))}
              >
                {DAMAGE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.points}>
                    {option.label} [+{option.points}]
                  </option>
                ))}
              </select>
            </label>

            <label>
              Velocidade extra %
              <input
                type="number"
                min="0"
                value={form.speedPercent}
                onChange={(event) => updateField("speedPercent", Number(event.target.value))}
              />
            </label>
          </div>

          <div className="anced-page-v2__checks">
            <label>
              <input
                type="checkbox"
                checked={form.healingBonus}
                onChange={(event) => updateField("healingBonus", event.target.checked)}
              />
              Cura [+43]
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.senjutsuBonus}
                onChange={(event) => updateField("senjutsuBonus", event.target.checked)}
              />
              Necessita Senjutsu [+50]
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.borutoFillerBonus}
                onChange={(event) => updateField("borutoFillerBonus", event.target.checked)}
              />
              Filler de Boruto [+20]
            </label>
          </div>

          <div className="anced-page-v2__grid">
            <label>
              Nome do bônus manual
              <input
                value={form.manualBonusLabel}
                onChange={(event) => updateField("manualBonusLabel", event.target.value)}
                placeholder="Opcional"
              />
            </label>

            <label>
              Pontos de bônus manual
              <input
                type="number"
                value={form.manualBonusPoints}
                onChange={(event) => updateField("manualBonusPoints", Number(event.target.value))}
              />
            </label>
          </div>

          <label>
            Observações para ADM
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Explique dúvidas, fontes ou justificativa do cálculo."
            />
          </label>

          <button
            type="button"
            className="anced-page-v2__submit"
            onClick={submitCalculation}
            disabled={saving}
          >
            {saving ? "Enviando..." : "Enviar para revisão"}
          </button>
        </form>

        <aside className="anced-page-v2__result">
          <p className="anced-page-v2__kicker">Resultado</p>
          <strong>{calculated.rank}</strong>
          <span>{calculated.total} pontos</span>

          <div className="anced-page-v2__sum">
            <p>Alcance: +{form.rangePoints}</p>
            <p>Usuários: +{form.usersPoints}</p>
            <p>Classe: +{form.classPoints}</p>
            <p>Estrutura: +{form.structurePoints}</p>
            <p>Danos: +{form.damagePoints}</p>
            <p>Bônus: +{calculated.bonusPoints}</p>
          </div>

          <small>
            Ranks: E 0–58, D 59–87, C 88–116, B 117–145, A 146–174, S 175–203, SS 204–230.
          </small>
        </aside>
      </section>
    </main>
  );
}
