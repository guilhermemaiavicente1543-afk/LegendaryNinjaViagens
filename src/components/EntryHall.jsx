export default function EntryHall({
  userEmail,
  onOpenMyNinja,
  onOpenMap,
  onOpenAdmin,
  onLogout
}) {
  return (
    <section className="ln-bg-home">
      <picture>
        <source
          media="(max-width: 700px)"
          srcSet="/ln-digital-bg-mobile.png"
        />

        <img
          className="ln-bg-home-image"
          src="/ln-digital-bg.png"
          alt="LN Digital"
        />
      </picture>

      <div className="ln-bg-overlay" />

      <header className="ln-bg-nav desktop-only">
        <button type="button" className="ln-bg-logo" onClick={onOpenMyNinja}>
          <strong>LN</strong>
          <span>Digital</span>
        </button>

        <nav className="ln-bg-menu" aria-label="Navegação principal">
          <button type="button" className="active">Início</button>
          <button type="button" onClick={onOpenMap}>Mapa</button>
          <button type="button" onClick={onOpenMyNinja}>Personagens</button>
          <button type="button">Missões</button>
          <button type="button">Arquivo</button>
          <button type="button">Rankings</button>
          <button type="button">Comunidade</button>
        </nav>

        <div className="ln-bg-nav-actions">
          <button type="button" className="ln-bg-icon-button" onClick={onOpenAdmin}>
            忍
          </button>

          <button type="button" className="ln-bg-login-button" onClick={onOpenMyNinja}>
            Entrar
          </button>
        </div>
      </header>

      <main className="ln-bg-content desktop-only">
        <div className="ln-bg-spacer" />

        <div className="ln-bg-actions">
          <button type="button" className="ln-bg-main-button primary" onClick={onOpenMyNinja}>
            <span className="button-symbol">✦</span>
            <span>
              <strong>Entrar</strong>
              <small>Acesse sua jornada</small>
            </span>
          </button>

          <button type="button" className="ln-bg-main-button light" onClick={onOpenMap}>
            <span className="button-symbol">✧</span>
            <span>
              <strong>Explorar</strong>
              <small>Descubra o mundo ninja</small>
            </span>
          </button>

          <button type="button" className="ln-bg-main-button dark" onClick={onOpenAdmin}>
            <span className="button-symbol">◈</span>
            <span>
              <strong>Painel ADM</strong>
              <small>Área administrativa</small>
            </span>
          </button>
        </div>

        <div className="ln-bg-status">
          <div>
            <span className="status-dot" />
            <p>
              <small>Status do sistema</small>
              <strong className="online">Online</strong>
            </p>
          </div>

          <div>
            <span className="status-icon">忍</span>
            <p>
              <small>Usuário</small>
              <strong>{userEmail ? "Logado" : "Visitante"}</strong>
            </p>
          </div>

          <div>
            <span className="status-icon">巻</span>
            <p>
              <small>Missões ativas</small>
              <strong className="orange">35</strong>
            </p>
          </div>
        </div>
      </main>

      <div className="ln-mobile-hitbox-layer">
        <button
          type="button"
          className="ln-mobile-hitbox mobile-enter"
          onClick={onOpenMyNinja}
          aria-label="Entrar"
        >
          <span className="mobile-button-icon">✦</span>
          <span>
            <strong>Entrar</strong>
            <small>Acesse sua jornada</small>
          </span>
        </button>

        <button
          type="button"
          className="ln-mobile-hitbox mobile-map"
          onClick={onOpenMap}
          aria-label="Explorar mapa"
        >
          <span className="mobile-button-icon">✧</span>
          <span>
            <strong>Explorar Mapa</strong>
            <small>Descubra o mundo ninja</small>
          </span>
        </button>

        <button
          type="button"
          className="ln-mobile-hitbox mobile-admin"
          onClick={onOpenAdmin}
          aria-label="Painel ADM"
        >
          <span className="mobile-button-icon">忍</span>
          <span>
            <strong>Painel ADM</strong>
            <small>Área administrativa</small>
          </span>
        </button>

        <button
          type="button"
          className="ln-mobile-logout-button"
          onClick={onLogout}
          aria-label="Sair"
        >
          Sair
        </button>
      </div>

      <button type="button" className="ln-bg-logout desktop-only" onClick={onLogout}>
        Sair
      </button>
    </section>
  );
}
