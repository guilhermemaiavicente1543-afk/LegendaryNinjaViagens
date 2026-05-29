import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const initialForm = {
  title: "",
  body: "",
  category: "geral",
  priority: 0,
  is_active: true
};

export default function AdminAnnouncementsPanel() {
  const [form, setForm] = useState(initialForm);
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function loadAnnouncements() {
    if (!isSupabaseConfigured || !supabase) return;

    const { data, error } = await supabase
      .from("site_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setMessage(`Erro ao carregar anúncios: ${error.message}`);
      return;
    }

    setAnnouncements(data || []);
  }

  async function createAnnouncement(event) {
    event.preventDefault();
    setMessage("");

    if (!form.title.trim() || !form.body.trim()) {
      setMessage("Preencha título e texto do anúncio.");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category.trim() || "geral",
      priority: Number(form.priority) || 0,
      is_active: Boolean(form.is_active),
      created_by: authData?.user?.id || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("site_announcements")
      .insert(payload);

    if (error) {
      setMessage(`Erro ao publicar anúncio: ${error.message}`);
      return;
    }

    setForm(initialForm);
    setMessage("Anúncio publicado.");
    loadAnnouncements();
  }

  async function toggleActive(item) {
    const { error } = await supabase
      .from("site_announcements")
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", item.id);

    if (error) {
      setMessage(`Erro ao atualizar anúncio: ${error.message}`);
      return;
    }

    loadAnnouncements();
  }

  async function deleteAnnouncement(item) {
    const { error } = await supabase
      .from("site_announcements")
      .delete()
      .eq("id", item.id);

    if (error) {
      setMessage(`Erro ao apagar anúncio: ${error.message}`);
      return;
    }

    setMessage("Anúncio apagado.");
    loadAnnouncements();
  }

  return (
    <aside className={`admin-announcements-panel ${isOpen ? "open" : "closed"}`}>
      <button
        type="button"
        className="admin-announcements-toggle"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? "Fechar anúncios" : "Anúncios"}
      </button>

      {isOpen && (
        <div className="admin-announcements-content">
          <header>
            <p className="eyebrow">ADM</p>
            <h2>NOVIDADES</h2>
            <span>Gerencie os anúncios do pergaminho do Hall.</span>
          </header>

          {message && <p className="admin-announcements-message">{message}</p>}

          <form onSubmit={createAnnouncement} className="admin-announcements-form">
            <label>
              Título
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Ex.: Evento Chūnin aberto"
              />
            </label>

            <label>
              Texto
              <textarea
                value={form.body}
                onChange={(event) => updateForm("body", event.target.value)}
                placeholder="Escreva o anúncio que aparecerá no Hall."
              />
            </label>

            <div className="admin-announcements-grid">
              <label>
                Categoria
                <input
                  value={form.category}
                  onChange={(event) => updateForm("category", event.target.value)}
                  placeholder="geral, evento, sistema..."
                />
              </label>

              <label>
                Prioridade
                <input
                  type="number"
                  value={form.priority}
                  onChange={(event) => updateForm("priority", event.target.value)}
                />
              </label>
            </div>

            <label className="admin-announcements-check">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => updateForm("is_active", event.target.checked)}
              />
              Publicar ativo
            </label>

            <button type="submit">Publicar anúncio</button>
          </form>

          <div className="admin-announcements-list">
            {announcements.length === 0 ? (
              <p>Nenhum anúncio cadastrado.</p>
            ) : (
              announcements.map((item) => (
                <article key={item.id}>
                  <div>
                    <span>{item.category}</span>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <small>{item.is_active ? "ativo" : "oculto"} · prioridade {item.priority}</small>
                  </div>

                  <div>
                    <button type="button" onClick={() => toggleActive(item)}>
                      {item.is_active ? "Ocultar" : "Ativar"}
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteAnnouncement(item)}
                    >
                      Apagar
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
