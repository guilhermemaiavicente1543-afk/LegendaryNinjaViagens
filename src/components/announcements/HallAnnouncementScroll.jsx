import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

export default function HallAnnouncementScroll() {
  const [isOpen, setIsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    if (!isSupabaseConfigured || !supabase) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("site_announcements")
      .select("id,title,body,category,priority,created_at")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    setIsLoading(false);

    if (error) {
      console.warn("Erro ao carregar novidades:", error.message);
      return;
    }

    setAnnouncements(data || []);
  }

  return (
    <section className={`hall-scroll-board ${isOpen ? "open" : "closed"}`}>
      <button
        type="button"
        className="hall-scroll-head"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="hall-scroll-roll left"></span>

        <span className="hall-scroll-title">
          <small>LN Digital</small>
          <strong>NOVIDADES</strong>
        </span>

        <span className="hall-scroll-toggle">
          {isOpen ? "Fechar" : "Abrir"}
        </span>

        <span className="hall-scroll-roll right"></span>
      </button>

      <div className="hall-scroll-body" aria-hidden={!isOpen}>
        <div className="hall-scroll-paper">
          {isLoading ? (
            <p className="hall-scroll-empty">Carregando novidades...</p>
          ) : announcements.length === 0 ? (
            <p className="hall-scroll-empty">
              Nenhum anúncio publicado no momento.
            </p>
          ) : (
            announcements.map((item) => (
              <article key={item.id} className="hall-scroll-announcement">
                <div>
                  <span>{item.category || "geral"}</span>
                  <h3>{item.title}</h3>
                </div>

                <p>{item.body}</p>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="hall-scroll-bottom-roll" />
    </section>
  );
}
