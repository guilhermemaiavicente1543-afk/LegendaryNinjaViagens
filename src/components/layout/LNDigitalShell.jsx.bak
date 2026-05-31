export default function LNDigitalShell({
  activePage,
  setActivePage,
  children,
  user,
  onLogout
}) {
  return (
    <main className="ln-shell">
      <aside className="ln-sidebar">
        <div className="ln-brand">
          <span>LN</span>
          <div>
            <strong>LN Digital</strong>
            <small>Legendary Ninja Digital</small>
          </div>
        </div>

        <nav className="ln-nav">
          <button
            type="button"
            className={activePage === "my-ninja" ? "active" : ""}
            onClick={() => setActivePage("my-ninja")}
          >
            Meu Ninja
          </button>

          <button
            type="button"
            className={activePage === "map" ? "active" : ""}
            onClick={() => setActivePage("map")}
          >
            Mapa de Viagem
          </button>

          <button
            type="button"
            className={activePage === "admin" ? "active" : ""}
            onClick={() => setActivePage("admin")}
          >
            Painel ADM
          </button>
        </nav>

        <div className="ln-user-box">
          <small>Conta conectada</small>
          <strong>{user?.email || "Modo demonstração"}</strong>
          <button type="button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </aside>

      <section className="ln-content">{children}</section>
    </main>
  );
}
