import { useState } from "react";
import LanguageSwitcher from "./i18n/LanguageSwitcher";
import { useLanguage } from "../i18n/LanguageContext";

export default function EntryHall({
  userEmail,
  onOpenMyNinja,
  onOpenMap,
  onOpenShinobiDex,
  onOpenAnced,
  onOpenAdmin,
  onLogout,
  onOpenLegends
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  function goTo(action) {
    setIsMobileMenuOpen(false);
    action?.();
  }

  return (
    <section className="ln-bg-home">
      <picture>
        <source media="(max-width: 700px)" srcSet="/ln-digital-bg-mobile.png" />
        <img className="ln-bg-home-image" src="/ln-digital-bg.png" alt="LN Digital" />
      </picture>

      <div className="ln-bg-overlay" />

      <header className="ln-bg-nav desktop-only">
        <button type="button" className="ln-bg-logo" onClick={onOpenMyNinja}>
          <strong>LN</strong>
          <span>Digital</span>
        </button>

        <nav className="ln-bg-menu" aria-label="Navegação principal">
          <button type="button" className="active">
            {t("hall.home")}
          </button>

          <button type="button" onClick={onOpenMap}>
            {t("hall.map")}
          </button>

          <button
            type="button"
            className="hall-action-card hall-legends-card"
            onClick={onOpenLegends}
          >
            <span className="hall-action-icon">本</span>
            <strong>Hall das Lendas</strong>
          </button>

          <button type="button" onClick={onOpenMyNinja}>
            {t("hall.characters")}
          </button>

          <button type="button" onClick={onOpenShinobiDex}>
            {t("hall.shinobidex")}
          </button>

          <button type="button" onClick={onOpenAnced}>
            ANCED
          </button>

          <button
            type="button"
            onClick={onOpenLegends}
          >
            Hall das Lendas
          </button>

          <button type="button">
            {t("hall.community")}
          </button>
        </nav>

        <div className="ln-bg-nav-actions">
          <LanguageSwitcher />

          <button type="button" className="ln-bg-icon-button" onClick={onOpenAdmin}>
            忍
          </button>

          <button type="button" className="ln-bg-login-button" onClick={onOpenMyNinja}>
            {t("hall.myNinja")}
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
              <span>{t("hall.systemShinobi")}</span>
            </div>

            <LanguageSwitcher />

            <button type="button" onClick={() => goTo(onOpenMyNinja)}>
              <span>✦</span>
              {t("hall.myNinja")}
            </button>

            <button type="button" onClick={() => goTo(onOpenMap)}>
              <span>✧</span>
              {t("hall.travelMap")}
            </button>

            <button type="button" onClick={() => goTo(onOpenShinobiDex)}>
              <span>巻</span>
              {t("hall.shinobidex")}
            </button>

            <button type="button" onClick={() => goTo(onOpenAnced)}>
              <span>術</span>
              ANCED
            </button>

            <button type="button" onClick={() => goTo(onOpenAdmin)}>
              <span>忍</span>
              {t("common.adminPanel")}
            </button>

            <button
            type="button"
            onClick={onOpenLegends}
          >
            Hall das Lendas
          </button>

            <button type="button" className="disabled">
              <span>衆</span>
              {t("hall.community")}
            </button>

            <button type="button" className="logout" onClick={() => goTo(onLogout)}>
              <span>×</span>
              {t("common.logout")}
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
              <strong>{t("hall.myNinja")}</strong>
              <small>{t("hall.accessJourney")}</small>
            </span>
          </button>

          <button type="button" className="ln-bg-main-button light" onClick={onOpenMap}>
            <span className="button-symbol">✧</span>
            <span>
              <strong>{t("hall.explore")}</strong>
              <small>{t("hall.discoverWorld")}</small>
            </span>
          </button>

          <button type="button" className="ln-bg-main-button dark" onClick={onOpenAdmin}>
            <span className="button-symbol">◈</span>
            <span>
              <strong>{t("common.adminPanel")}</strong>
              <small>{t("hall.adminArea")}</small>
            </span>
          </button>
        </div>

        <div className="ln-bg-status">
          <div>
            <span className="status-dot" />
            <p>
              <small>{t("common.systemStatus")}</small>
              <strong className="online">{t("common.online")}</strong>
            </p>
          </div>

          <div>
            <span className="status-icon">忍</span>
            <p>
              <small>{t("common.user")}</small>
              <strong>{userEmail ? t("common.loggedIn") : t("common.visitor")}</strong>
            </p>
          </div>
        </div>
      </main>

      <div className="ln-mobile-hitbox-layer">
        <button
          type="button"
          className="ln-mobile-hitbox mobile-enter"
          onClick={onOpenMyNinja}
          aria-label={t("hall.myNinja")}
        >
          <span className="mobile-button-icon">✦</span>
          <span>
            <strong>{t("hall.myNinja")}</strong>
            <small>{t("hall.accessJourney")}</small>
          </span>
        </button>

        <button
          type="button"
          className="ln-mobile-hitbox mobile-map"
          onClick={onOpenMap}
          aria-label={t("hall.exploreMap")}
        >
          <span className="mobile-button-icon">✧</span>
          <span>
            <strong>{t("hall.exploreMap")}</strong>
            <small>{t("hall.discoverWorld")}</small>
          </span>
        </button>

        <button
          type="button"
          className="ln-mobile-hitbox mobile-admin"
          onClick={onOpenAdmin}
          aria-label={t("common.adminPanel")}
        >
          <span className="mobile-button-icon">忍</span>
          <span>
            <strong>{t("common.adminPanel")}</strong>
            <small>{t("hall.adminArea")}</small>
          </span>
        </button>

        <button
          type="button"
          className="ln-mobile-logout-button"
          onClick={onLogout}
          aria-label={t("common.logout")}
        >
          {t("common.logout")}
        </button>
      </div>

      <button type="button" className="ln-bg-logout desktop-only" onClick={onLogout}>
        {t("common.logout")}
      </button>
    </section>
  );
}
