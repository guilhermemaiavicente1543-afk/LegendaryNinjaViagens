import { useState } from "react";

export default function EntryHall({
  userEmail,
  onOpenMyNinja,
  onOpenMap,
  onOpenShinobiDex,
  onOpenAdmin,
  onLogout
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function goTo(action) {
    setIsMobileMenuOpen(false);
    action?.();
  }

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
          <button type="button" className="active">
            Início
          </button>

          <button type="button" onClick={onOpenMap}>
            Mapa
          </button>

          <button type="button" onClick={onOpenMyNinja}>
            Personagens
          </button>

          <button type="button" onClick={onOpenShinobiDex}>
            ShinobiDex
          </button>

          <button type="button">
            Rankings
          </button>

          <button type="button">
            Comunidade
          </button>
        </nav>

        <div className="ln-bg-nav-actions">
          <button type="button" className="ln-bg-icon-button" onClick={onOpenAdmin}>
            忍
          </button>

          <button type="button" className="ln-bg-login-button" onClick={onOpenMyNinja}>
            Meu Ninja
          </button>
        </div>
      </header>

      <button
        type="button"
        className={`ln-mobile-menu-button ${isMobileMenuOpen ? "active" : ""}`}
        onClick={() => setIsMobileMenuOpen((current) => !current)}
        aria-label="Abrir menu"
      >
        <span />
        <span />
        <span />
      </button>

      {isMobileMenuOpen && (
        <>
          <button
            type="button"
            className="ln-mobile-menu-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Fechar menu"
          />

          <nav className="ln-mobile-menu-panel" aria-label="Menu mobile">
            <div className="ln-mobile-menu-title">
              <strong>LN Digital</strong>
              <span>Sistema Shinobi</span>
            </div>

            <button type="button" onClick={() => goTo(onOpenMyNinja)}>
              <span>✦</span>
              Meu Ninja
            </button>

            <button type="button" onClick={() => goTo(onOpenMap)}>
              <span>✧</span>
              Mapa de Viagem
            </button>

            <button type="button" onClick={() => goTo(onOpenShinobiDex)}>
              <span>巻</span>
              ShinobiDex
            </button>

            <button type="button" onClick={() => goTo(onOpenAdmin)}>
              <span>忍</span>
              Painel ADM
            </button>

            <button type="button" className="disabled">
              <span>榜</span>
              Rankings
            </button>

            <button type="button" className="disabled">
              <span>衆</span>
              Comunidade
            </button>

            <button type="button" className="logout" onClick={() => goTo(onLogout)}>
              <span>×</span>
              Sair
            </button>
          </nav>
        </>
      )}

      <main className="ln-bg-content desktop-only">
        <div className="ln-bg-spacer" />

        <div className="ln-bg-actions">
          <button type="button" className="ln-bg-main-button primary" onClick={onOpenMyNinja}>
            <span className="button-symbol">✦</span>
            <span>
              <strong>Meu Ninja</strong>
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
        </div>
      </main>

      <div className="ln-mobile-hitbox-layer">
        <button
          type="button"
          className="ln-mobile-hitbox mobile-enter"
          onClick={onOpenMyNinja}
          aria-label="Meu Ninja"
        >
          <span className="mobile-button-icon">✦</span>
          <span>
            <strong>Meu Ninja</strong>
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
