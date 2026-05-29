import { useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import LnSelect from "../ui/LnSelect";

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
  classification: "Ninjutsu",
  nature: "Sem natureza definida",
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
    parts.push("Técnica de Cura: +43");
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
    details: parts,
    selected: {
      range,
      users,
      classType,
      structure,
      damage,
      speedPoints
    }
  };
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="anced-calc-field">
      <span>{label}</span>
      <LnSelect value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([name, points], index) => (
          <option key={name} value={index}>
            {name} (+{points})
          </option>
        ))}
      </LnSelect>
    </label>
  );
}

export default function AncedCalculatorPage({ user, onBack }) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const result = useMemo(() => calculate(form), [form]);

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setMessage("");
  }

  async function submitForReview() {
    setMessage("");

    if (!user?.id) {
      setMessage("Você precisa estar logado para enviar uma técnica para revisão.");
      return;
    }

    if (!form.name.trim()) {
      setMessage("Informe o nome da técnica antes de enviar.");
      return;
    }

    if (!form.description.trim()) {
      setMessage("Descreva a técnica antes de enviar para revisão.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      classification: form.classification,
      nature: form.nature,
      description: form.description.trim(),

      calculated_rank: result.rank,
      calculated_total: result.total,
      calculation_details: result.details.join(" | "),

      range_label: result.selected.range[0],
      users_label: result.selected.users[0],
      class_label: result.selected.classType[0],
      structure_label: result.selected.structure[0],
      damage_label: result.selected.damage[0],

      is_healing: form.isHealing,
      uses_senjutsu: form.usesSenjutsu,
      is_filler_boruto: form.isFillerBoruto,
      speed_bonus: result.selected.speedPoints,

      status: "pending",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("anced_submissions").insert(payload);

    setIsSubmitting(false);

    if (error) {
      setMessage(`Erro ao enviar técnica: ${error.message}`);
      return;
    }

    setMessage("Técnica enviada para revisão do ADM.");
    setForm(initialForm);
  }

  return (
    <section className="anced-calc-page">
      <header className="anced-calc-hero">
        <div>
          <p className="eyebrow">Sistema ANCED</p>
          <h1>Calculadora ANCED</h1>
          <p>
            Ferramenta de balanceamento para criação, classificação e ranqueamento
            de técnicas do RPG.
          </p>
        </div>

        {onBack && (
          <button type="button" onClick={onBack}>
            Voltar ao Hall
          </button>
        )}
      </header>

      {message && <p className="anced-calc-message">{message}</p>}

      <main className="anced-calc-layout">
        <section className="anced-calc-card">
          <h2>Dados da técnica</h2>

          <div className="anced-calc-grid two">
            <label className="anced-calc-field">
              <span>Nome da técnica</span>
              <input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Ex.: Katon: Chama Fantasma"
              />
            </label>

            <label className="anced-calc-field">
              <span>Classificação</span>
              <LnSelect
                value={form.classification}
                onChange={(event) => update("classification", event.target.value)}
              >
                {CLASSIFICATIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </LnSelect>
            </label>

            <label className="anced-calc-field">
              <span>Natureza</span>
              <LnSelect
                value={form.nature}
                onChange={(event) => update("nature", event.target.value)}
              >
                {NATURES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </LnSelect>
            </label>

            <label className="anced-calc-field">
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

          <label className="anced-calc-field">
            <span>Descrição</span>
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Descreva funcionamento, efeito, custo, limitação e condição de uso."
            />
          </label>

          <div className="anced-calc-grid">
            <SelectField
              label="Alcance"
              value={form.range}
              options={OPTIONS.range}
              onChange={(value) => update("range", value)}
            />

            <SelectField
              label="Usuários"
              value={form.users}
              options={OPTIONS.users}
              onChange={(value) => update("users", value)}
            />

            <SelectField
              label="Classe"
              value={form.classType}
              options={OPTIONS.classType}
              onChange={(value) => update("classType", value)}
            />

            <SelectField
              label="Estrutura"
              value={form.structure}
              options={OPTIONS.structure}
              onChange={(value) => update("structure", value)}
            />

            <SelectField
              label="Danos"
              value={form.damage}
              options={OPTIONS.damage}
              onChange={(value) => update("damage", value)}
            />
          </div>

          <div className="anced-calc-checks">
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
        </section>

        <aside className="anced-calc-result">
          <p>Resultado</p>
          <strong>{result.rank}</strong>
          <span>{result.total} pontos</span>

          <div className="anced-calc-details">
            {result.details.map((item) => (
              <small key={item}>{item}</small>
            ))}
          </div>

          <div className="anced-calc-actions">
            <button type="button" onClick={resetForm}>
              Limpar
            </button>

            <button
              type="button"
              className="primary"
              onClick={submitForReview}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar para revisão"}
            </button>
          </div>

          <small className="anced-calc-note">
            Técnicas enviadas ficam pendentes até análise do ADM.
          </small>
        </aside>
      </main>
    </section>
  );
}
