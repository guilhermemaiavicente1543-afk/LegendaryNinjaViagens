import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const DOSSIER_SECTIONS = [
  ["proofs", "copy", "Registro de Provas"],
  ["science", "medical", "Ciência e Medicina"],
  ["contracts", "file", "Contratos e Vínculos"],
  ["inventory", "list", "Inventário"],
  ["missions", "grid", "Atividades e Missões"],
  ["status", "globe", "Status do Personagem"],
  ["hidden", "eyeOff", "APA Especial / Ações Ocultas"],
  ["development", "book", "Desenvolvimento Narrativo"]
];

export default function MyNinjaMobilePanel({
  character,
  profileTab,
  setProfileTab,
  onEditProfile,
  onOpenFullSheet
}) {
  const [optionsVisible, setOptionsVisible] = useState(true);

  useEffect(() => {
    return () => {};
  }, []);

  if (!character) return null;

  const heightWeight = `${
    character.height_cm ? `${character.height_cm} cm` : "-"
  } / ${
    character.weight_kg ? `${character.weight_kg} kg` : "-"
  }`;

  const openFullSheet = () => {
    onOpenFullSheet?.();
  };

  const goMobilePage = (target) => {
    const normalized = String(target || "").toLowerCase();
    if (normalized === "meuninja") return;

    const candidates = {
      inicio: ["hall", "início", "inicio", "home"],
      mapa: ["mapa", "map"],
      missoes: ["missões", "missoes", "missions"],
      menu: ["menu"]
    };

    const labels = candidates[normalized] || [];

    for (const label of labels) {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      const found = buttons.find((element) =>
        element.textContent?.trim().toLowerCase().includes(label)
      );

      if (found) {
        found.click();
        return;
      }
    }

    window.location.hash = normalized;
  };

  return (
    <section className="lnm-mobile-shell">
      <header className="lnm-topbar">
        <div className="lnm-topbar-logo">
          <div className="lnm-topbar-kanji">忍</div>

          <div className="lnm-topbar-brand">
            <small>LN Digital</small>
            <strong>Hall</strong>
          </div>
        </div>

        <div className="lnm-topbar-actions">
          <button
            type="button"
            className="lnm-hide-options"
            onClick={() => setOptionsVisible((current) => !current)}
          >
            {optionsVisible ? "Ocultar opções" : "Mostrar opções"}
          </button>

          <button type="button" className="lnm-filter-button" aria-label="Filtros">
            <Icon name="filter" />
          </button>
        </div>
      </header>

      <main className="lnm-page-content">
        <section className="lnm-card lnm-hero-banner">
          <div className="lnm-hero-eyebrow">Meu Ninja</div>
          <div className="lnm-hero-name">{character.character_name}</div>

          <p className="lnm-hero-desc">
            Cada player possui apenas um ninja. Esta página reúne informações,
            localização e árvore de habilidades do personagem.
          </p>

          <Icon name="shuriken" className="lnm-hero-shuriken" />
        </section>

        <nav className="lnm-tab-nav" aria-label="Abas do Meu Ninja">
          <button
            type="button"
            className={`lnm-tab-btn ${profileTab === "info" ? "active" : ""}`}
            onClick={() => setProfileTab("info")}
          >
            <Icon name="users" />
            Perfil
          </button>

          <button
            type="button"
            className={`lnm-tab-btn ${profileTab === "location" ? "active" : ""}`}
            onClick={() => setProfileTab("location")}
          >
            <Icon name="pin" />
            Localização
          </button>

          <button
            type="button"
            className={`lnm-tab-btn ${profileTab === "skills" ? "active" : ""}`}
            onClick={() => setProfileTab("skills")}
          >
            <Icon name="tree" />
            Árvore
          </button>
        </nav>

        {profileTab === "info" && (
          <>
            <section className="lnm-card lnm-profile-card">
              <div className="lnm-profile-card-title">Perfil do Personagem</div>

              <div className="lnm-profile-inner">
                <div className="lnm-portrait-col">
                  <button
                    type="button"
                    className="lnm-portrait-circle"
                    onClick={onEditProfile}
                    aria-label="Alterar foto"
                  >
                    {character.portrait_url ? (
                      <img src={character.portrait_url} alt={character.character_name} />
                    ) : (
                      <Icon name="shuriken" />
                    )}
                  </button>

                  <button type="button" className="lnm-btn-photo" onClick={onEditProfile}>
                    <Icon name="camera" />
                    Alterar foto
                  </button>
                </div>

                <div className="lnm-profile-info">
                  <button type="button" className="lnm-epithet-badge" onClick={onEditProfile}>
                    <Icon name="user" />
                    <span>
                      {character.epithet || character.rank_title || "Ninja sem alcunha definida"}
                    </span>
                  </button>

                  <div className="lnm-info-item">
                    <Icon name="cloud" />
                    <span>{character.village_or_organization || "Sem aldeia"}</span>
                  </div>

                  <div className="lnm-info-item">
                    <Icon name="globe" />
                    <span>{character.ninja_style || "Sem estilo"}</span>
                  </div>

                  <div className="lnm-info-item">
                    <Icon name="star" />
                    <span>{character.rank_title || "Sem graduação"}</span>
                  </div>

                  <div className="lnm-info-item">
                    <Icon name="ruler" />
                    <span>{heightWeight}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="lnm-card lnm-traits-card" onClick={onEditProfile}>
              <div className="lnm-section-label">Traços Únicos</div>
              <div className="lnm-traits-list">
                <span>
                  {character.unique_traits ||
                    character.traits ||
                    character.special_traits ||
                    "Nenhum traço único informado."}
                </span>
              </div>
            </section>

            <section
              className="lnm-card lnm-dossie-card"
              role="button"
              tabIndex={0}
              onClick={openFullSheet}
              onKeyDown={(event) => {
                if (event.key === "Enter") openFullSheet();
              }}
            >
              <div className="lnm-dossie-eyebrow">Dossiê Shinobi</div>
              <div className="lnm-dossie-title">Ficha Complementar</div>

              <p className="lnm-dossie-desc">
                Esta área registra provas, status, ações ocultas, medicina,
                missões, contratos especiais, inventário e desenvolvimento.
              </p>

              <div className="lnm-dossie-arrow">
                <Icon name="chevronRight" />
              </div>
            </section>

            {optionsVisible && (
              <>
                <section className="lnm-menu-grid">
                  {DOSSIER_SECTIONS.map(([id, icon, label]) => (
                    <button
                      type="button"
                      className="lnm-menu-item"
                      key={id}
                      onClick={openFullSheet}
                    >
                      <Icon name={icon} />
                      {label}
                    </button>
                  ))}
                </section>

                <section className="lnm-card lnm-section-row" onClick={onEditProfile}>
                  <div className="lnm-section-icon-col">
                    <div className="lnm-section-icon-wrap">
                      <Icon name="user" />
                    </div>
                  </div>

                  <div className="lnm-section-body">
                    <div className="lnm-section-label">Identidade</div>

                    <div className="lnm-section-fields">
                      <span className="lnm-section-field">Nome</span>
                      <span className="lnm-section-field">Idade</span>
                      <span className="lnm-section-field">Player</span>
                      <span className="lnm-section-field">Aniversário</span>
                      <span className="lnm-section-field">Gênero</span>
                      <span className="lnm-section-field">Altura / Peso</span>
                    </div>
                  </div>

                  <div className="lnm-section-chevron">
                    <Icon name="chevronRight" />
                  </div>
                </section>

                <section className="lnm-card lnm-section-row" onClick={onEditProfile}>
                  <div className="lnm-section-icon-col">
                    <div className="lnm-section-icon-wrap">
                      <Icon name="users" />
                    </div>
                  </div>

                  <div className="lnm-section-body">
                    <div className="lnm-section-label">Afiliação e Origem</div>

                    <div className="lnm-section-fields">
                      <span className="lnm-section-field">Aldeia ou Organização</span>
                      <span className="lnm-section-field">Kekkei Genkai ou Hiden</span>
                      <span className="lnm-section-field">Clã ou Parentesco</span>
                      <span className="lnm-section-field">Pontos de Habilidade</span>
                    </div>
                  </div>

                  <div className="lnm-section-chevron">
                    <Icon name="chevronRight" />
                  </div>
                </section>

                <section className="lnm-card lnm-section-row" onClick={onEditProfile}>
                  <div className="lnm-section-icon-col">
                    <div className="lnm-section-icon-wrap">
                      <Icon name="send" />
                    </div>
                  </div>

                  <div className="lnm-section-body">
                    <div className="lnm-section-label">Ícone do Mapa</div>

                    <div className="lnm-section-fields one-column">
                      <span className="lnm-section-field">
                        {character.icon_url ? "Personalizado" : "Nenhum ícone definido"}
                      </span>
                    </div>
                  </div>

                  <div className="lnm-section-chevron">
                    <Icon name="chevronRight" />
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {profileTab === "location" && (
          <section className="lnm-card lnm-tab-placeholder">
            <div className="lnm-hero-eyebrow">Localização</div>
            <h2>Status de Localização</h2>
            <p>As informações reais de localização aparecem abaixo, conectadas ao sistema do mapa.</p>
          </section>
        )}

        {profileTab === "skills" && (
          <section className="lnm-card lnm-tab-placeholder">
            <div className="lnm-hero-eyebrow">Árvore</div>
            <h2>Árvore de Habilidades</h2>
            <p>A árvore real aparece abaixo, conectada ao sistema de pontos do personagem.</p>
          </section>
        )}
      </main>

      {createPortal(
        <nav className="lnm-bottom-nav lnm-bottom-nav-portal" aria-label="Navegação inferior">
          <button type="button" onClick={() => goMobilePage("inicio")}>
            <Icon name="home" />
            Início
          </button>

          <button type="button" onClick={() => goMobilePage("mapa")}>
            <Icon name="map" />
            Mapa
          </button>

          <button type="button" className="active" onClick={() => goMobilePage("meuninja")}>
            <span className="lnm-nav-icon-wrap">
              <Icon name="shuriken" />
            </span>
            Meu Ninja
          </button>

          <button type="button" onClick={() => goMobilePage("missoes")}>
            <Icon name="monitor" />
            Missões
          </button>

          <button type="button" onClick={() => goMobilePage("menu")}>
            <Icon name="menu" />
            Menu
          </button>
        </nav>,
        document.body
      )}
    </section>
  );
}

function Icon({ name, className = "" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  if (name === "shuriken") {
    return (
      <svg className={className} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
        <polygon points="50,8 60,42 92,38 66,58 80,90 50,72 20,90 34,58 8,38 40,42" />
      </svg>
    );
  }

  const paths = {
    filter: <><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    pin: <><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
    tree: <><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><line x1="12" y1="7" x2="12" y2="13" /><line x1="12" y1="13" x2="5" y2="17" /><line x1="12" y1="13" x2="19" y2="17" /></>,
    cloud: <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />,
    globe: <><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" /><line x1="2" y1="12" x2="22" y2="12" /></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    medical: <><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5m4 0h4m0 0v5m0-5h6v5M9 14h6" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    list: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>,
    grid: <><path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" /></>,
    eyeOff: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><line x1="1" y1="1" x2="23" y2="23" /></>,
    book: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
    send: <polygon points="3 11 22 2 13 21 11 13 3 11" />,
    ruler: <><path d="M4 19L19 4" /><path d="M7 16l2 2" /><path d="M10 13l2 2" /><path d="M13 10l2 2" /><path d="M16 7l2 2" /></>,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>,
    menu: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
  };

  return <svg {...common}>{paths[name] || null}</svg>;
}
