import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const PING_ICONS = [
  {
    key: "invocacao",
    label: "Invocação",
    src: "/map-ping-icons/iconinvoc.png"
  },
  {
    key: "vila",
    label: "Vila",
    src: "/map-ping-icons/iconvila.png"
  },
  {
    key: "construcao",
    label: "Construção",
    src: "/map-ping-icons/iconconstr.png"
  },
  {
    key: "desconhecido",
    label: "Desconhecido",
    src: "/map-ping-icons/iconinterrogacao.png"
  },
  {
    key: "alerta",
    label: "Alerta",
    src: "/map-ping-icons/iconexcla.png"
  }
];

const EMPTY_FORM = {
  title: "",
  type: "Vila Oculta",
  icon_key: "vila",
  description: "",
  image_url: "",
  lat: "",
  lng: "",
  coord_label: "",
  macro_label: "",
  visibility: "public",
  status: "active"
};

const PING_TYPES = [
  "Vila Oculta",
  "País",
  "Cidade",
  "Organização",
  "Base secreta",
  "Campo de batalha",
  "Ruína",
  "Laboratório",
  "Templo",
  "Porto",
  "Zona perigosa",
  "Evento ativo",
  "Dimensão",
  "Mundo da Invocação",
  "Kamui"
];

export default function MapPingManager() {
  const [pings, setPings] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sortedPings = useMemo(() => {
    return [...pings].sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""), "pt-BR")
    );
  }, [pings]);

  useEffect(() => {
    loadPings();
  }, []);

  useEffect(() => {
    function applyPickedPoint(event) {
      const point = event.detail;

      if (!point) return;

      setForm((current) => ({
        ...current,
        lat: String(point.lat ?? ""),
        lng: String(point.lng ?? "")
      }));

      setMessage("Coordenada capturada pelo mapa ADM.");
    }

    window.addEventListener("ln-admin-map-ping-point", applyPickedPoint);

    const savedPoint = localStorage.getItem("ln-admin-map-last-ping-point");

    if (savedPoint) {
      try {
        const point = JSON.parse(savedPoint);

        if (point?.lat !== undefined && point?.lng !== undefined) {
          setForm((current) => ({
            ...current,
            lat: String(point.lat),
            lng: String(point.lng)
          }));
        }
      } catch {
        // ignora coordenada inválida
      }
    }

    return () => {
      window.removeEventListener("ln-admin-map-ping-point", applyPickedPoint);
    };
  }, []);

  async function loadPings() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("map_pings")
      .select("*")
      .order("created_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPings(data || []);
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function startEdit(ping) {
    setEditingId(ping.id);

    setForm({
      title: ping.title || "",
      type: ping.type || "Vila Oculta",
      icon_key: ping.icon_key || "vila",
      description: ping.description || "",
      image_url: ping.image_url || "",
      lat: String(ping.lat ?? ""),
      lng: String(ping.lng ?? ""),
      coord_label: ping.coord_label || "",
      macro_label: ping.macro_label || "",
      visibility: ping.visibility || "public",
      status: ping.status || "active"
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const lat = Number(form.lat);
    const lng = Number(form.lng);

    if (!form.title.trim()) {
      setMessage("Informe o nome do local.");
      return;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMessage("Clique no mapa ADM para capturar uma coordenada válida.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    const payload = {
      title: form.title.trim(),
      type: form.type,
      icon_key: form.icon_key || "vila",
      description: form.description.trim(),
      image_url: form.image_url.trim(),
      lat,
      lng,
      coord_label: form.coord_label.trim(),
      macro_label: form.macro_label.trim(),
      visibility: form.visibility,
      status: form.status,
      updated_at: new Date().toISOString()
    };

    const result = editingId
      ? await supabase
          .from("map_pings")
          .update(payload)
          .eq("id", editingId)
          .select("*")
          .single()
      : await supabase
          .from("map_pings")
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

    setMessage(editingId ? "Ping atualizado." : "Ping criado.");
    resetForm();
    await loadPings();
  }

  async function deletePing(id) {
    if (!confirm("Remover este ping do mapa?")) return;

    setIsLoading(true);

    const { error } = await supabase
      .from("map_pings")
      .delete()
      .eq("id", id);

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Ping removido.");
    await loadPings();
  }

  return (
    <section className="admin-map-pings">
      <div className="admin-card admin-card-wide">
        <p className="eyebrow">Cartografia ADM</p>
        <h2>{editingId ? "Editar ping do mapa" : "Criar ping oficial"}</h2>
        <p>
          Clique no mapa ADM para capturar a posição, escolha o ícone e cadastre
          o local oficial do mundo ninja.
        </p>

        {message && <p className="auth-message">{message}</p>}

        <form className="map-ping-form" onSubmit={handleSubmit}>
          <label>
            Nome do local
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Ex: Vila Oculta da Folha"
            />
          </label>

          <label>
            Tipo
            <select
              value={form.type}
              onChange={(event) => updateField("type", event.target.value)}
            >
              {PING_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <fieldset className="map-ping-icon-picker">
            <legend>Ícone do ping</legend>

            <div>
              {PING_ICONS.map((icon) => (
                <label
                  key={icon.key}
                  className={form.icon_key === icon.key ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="map-ping-icon"
                    value={icon.key}
                    checked={form.icon_key === icon.key}
                    onChange={(event) => updateField("icon_key", event.target.value)}
                  />

                  <img src={icon.src} alt={icon.label} />
                  <span>{icon.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            URL da imagem do painel
            <input
              value={form.image_url}
              onChange={(event) => updateField("image_url", event.target.value)}
              placeholder="Ex: /map-pings/konoha.png"
            />
          </label>

          <label>
            Coordenada textual
            <input
              value={form.coord_label}
              onChange={(event) => updateField("coord_label", event.target.value)}
              placeholder="Ex: D4-P22"
            />
          </label>

          <label>
            Região macro
            <input
              value={form.macro_label}
              onChange={(event) => updateField("macro_label", event.target.value)}
              placeholder="Ex: D4"
            />
          </label>

          <label>
            Latitude do mapa
            <input
              value={form.lat}
              onChange={(event) => updateField("lat", event.target.value)}
              placeholder="Clique no mapa ADM"
            />
          </label>

          <label>
            Longitude do mapa
            <input
              value={form.lng}
              onChange={(event) => updateField("lng", event.target.value)}
              placeholder="Clique no mapa ADM"
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
              <option value="hidden">Oculto</option>
            </select>
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </label>

          <label className="map-ping-form-full">
            Descrição
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Descreva o local, sua função, história e relevância."
              rows={5}
            />
          </label>

          <div className="map-ping-form-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : editingId ? "Salvar alterações" : "Criar ping"}
            </button>

            {editingId && (
              <button type="button" onClick={resetForm}>
                Cancelar edição
              </button>
            )}

            <button type="button" onClick={loadPings}>
              Atualizar lista
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card admin-card-wide">
        <p className="eyebrow">Locais cadastrados</p>
        <h2>{sortedPings.length} ping(s)</h2>

        <div className="map-ping-list">
          {sortedPings.map((ping) => {
            const icon = PING_ICONS.find((item) => item.key === ping.icon_key) || PING_ICONS[1];

            return (
              <article key={ping.id} className="map-ping-row">
                <img className="map-ping-row-icon" src={icon.src} alt={icon.label} />

                <div>
                  <strong>{ping.title}</strong>
                  <span>
                    {ping.type} · {ping.coord_label || "sem coordenada"} · {ping.visibility} · {ping.status}
                  </span>
                </div>

                <div className="map-ping-row-actions">
                  <button type="button" onClick={() => startEdit(ping)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => deletePing(ping.id)}>
                    Remover
                  </button>
                </div>
              </article>
            );
          })}

          {sortedPings.length === 0 && (
            <p className="empty-state">Nenhum ping cadastrado ainda.</p>
          )}
        </div>
      </div>
    </section>
  );
}
