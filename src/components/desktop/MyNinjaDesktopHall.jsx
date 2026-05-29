import { useMemo, useState, useEffect, useRef } from "react";
import MyNinjaDesktopSheet from "./MyNinjaDesktopSheet";
import CharacterSkillTree from "../CharacterSkillTree";
import CharacterPortraitUploader from "../profile/CharacterPortraitUploader";

function valueFrom(character, keys, fallback = "—") {
  for (const key of keys) {
    const value = character?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return fallback;
}

function ShurikenIcon({ className = "" }) {
  return (
    <span className={`mnd-shuriken ${className}`} aria-hidden="true">
      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="#b8b8b8"
          stroke="#333"
          strokeWidth="10"
          strokeLinejoin="round"
          d="M324.52 191.715a97.542 97.542 0 0 0-4.228-4.229L256 22.303l-64.291 165.183a93.225 93.225 0 0 0-4.222 4.224L22.301 255.998l165.179 64.291a97.542 97.542 0 0 0 4.229 4.229L256 489.697l64.284-165.174a95.208 95.208 0 0 0 4.237-4.233l165.178-64.287z"
        />
        <path
          fill="#d4d4d4"
          stroke="#555"
          strokeWidth="4"
          d="M324.52 191.715a97.542 97.542 0 0 0-4.228-4.229L256 22.303l-64.291 165.183a93.225 93.225 0 0 0-4.222 4.224L22.301 255.998l165.179 64.291a97.542 97.542 0 0 0 4.229 4.229L256 489.697l64.284-165.174a95.208 95.208 0 0 0 4.237-4.233l165.178-64.287z"
        />
        <circle cx="256" cy="256" r="52" fill="#1a1a1a" stroke="#444" strokeWidth="14" />
        <circle cx="256" cy="256" r="38" fill="none" stroke="#888" strokeWidth="6" />
        <circle cx="256" cy="78" r="10" fill="#444" />
        <circle cx="256" cy="434" r="10" fill="#444" />
        <circle cx="78" cy="256" r="10" fill="#444" />
        <circle cx="434" cy="256" r="10" fill="#444" />
      </svg>
    </span>
  );
}

function NavIcon({ type }) {
  if (type === "home") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M3 12 12 3l9 9" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  }

  if (type === "map") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
        <path d="M9 4v14" />
        <path d="M15 6v14" />
      </svg>
    );
  }

  if (type === "missions") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M4 4h12l4 4v12H4z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (type === "heart") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M11 20s-7-4-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-7 11-7 11" />
      </svg>
    );
  }

  if (type === "rank") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M6 9V4h12v5a6 6 0 0 1-12 0Z" />
        <path d="M4 6H2v2a4 4 0 0 0 4 4M20 6h2v2a4 4 0 0 1-4 4M10 18h4v3h-4z" />
      </svg>
    );
  }

  if (type === "shop") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M5 7h14l-1 13H6z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
    );
  }

  if (type === "settings") {
    return (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </svg>
    );
  }

  if (type === "logout") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    );
  }

  return <ShurikenIcon />;
}

const sheetSections = {
  proofs: {
    title: "Registro de Provas",
    description:
      "Comprovações oficiais do personagem: treinos, cenas, aprovações, prints e decisões do mestre.",
    body: "Use esta área para registrar prints, links, cenas, anexos e decisões administrativas. O campo de número de confirmação foi removido.",
  },
  medicine: {
    title: "Ciência e Medicina",
    description:
      "Registros de corpo, compatibilidade, implantes, DNA, procedimentos e limitações médicas.",
    body: "Tipagem sanguínea, compatibilidade, procedimentos, experimentos, implantes e observações médicas.",
  },
  contracts: {
    title: "Contratos e Vínculos",
    description:
      "Pactos, invocações, laços especiais, vínculos políticos e relações narrativas.",
    body: "Contratos, organizações, pactos, mestres, invocações e relações importantes.",
  },
  inventory: {
    title: "Inventário",
    description:
      "Itens e equipamentos ficam dentro da Ficha Complementar, sem sistema de raridade.",
    body: "Inventário integrado à ficha. A raridade do equipamento permanece removida.",
  },
  missions: {
    title: "Atividades e Missões",
    description:
      "Histórico de missões, cenas, atividades concluídas e registros de participação.",
    body: "Registre missões, atividades, tarefas narrativas e recompensas aprovadas.",
  },
  status: {
    title: "Status do Personagem",
    description:
      "Condição atual, bloqueios, disponibilidade narrativa, ferimentos e restrições.",
    body: "Condição atual, ferimentos, bloqueios, restrições e disponibilidade narrativa.",
  },
  hidden: {
    title: "APR Especial / Ações Ocultas",
    description:
      "Ações sigilosas, APR especial, decisões ocultas e registros privados.",
    body: "Área para ações ocultas e registros sensíveis. Em produção, pode exigir permissão de ADM.",
  },
  narrative: {
    title: "Desenvolvimento Narrativo",
    description:
      "Evolução do personagem, arcos, marcos históricos e progressão narrativa.",
    body: "Marcos narrativos, arcos, evolução psicológica, conquistas e mudanças relevantes.",
  },
};

export default function MyNinjaDesktopHall({
  character,
  user,
  onEditProfile,
  onOpenFullSheet,
  onCharacterUpdated,
}) {
  const [activeTab, setActiveTab] = useState("profile");
  const [activeSheetSection, setActiveSheetSection] = useState("proofs");

  const data = useMemo(() => {
    const name = valueFrom(character, ["name", "character_name", "nome"], "Ninja sem nome");
    const village = valueFrom(character, ["village_or_organization", "village", "current_village", "aldeia", "vila"], "Aldeia não informada");
    const style = valueFrom(character, ["ninja_style", "style", "estilo"], "Estilo não informado");
    const rank = valueFrom(character, ["rank_title", "rank", "graduation", "graduacao", "graduação"], "Sem graduação");
    const epithet = valueFrom(character, ["epithet", "nickname", "alcunha", "title"], "Ninja sem alcunha definida");
    const clan = valueFrom(character, ["clan_or_kinship", "clan", "clã", "cla"], "—");
    const player = valueFrom(character, ["player", "player_name", "user_name"], "—");
    const gender = valueFrom(character, ["gender", "genero", "gênero"], "—");
    const age = valueFrom(character, ["age", "idade"], "—");
    const birthday = valueFrom(character, ["birthday", "birthdate", "aniversario", "aniversário"], "—");
    const heightWeight =
      character?.height_cm || character?.weight_kg
        ? String(character?.height_cm ? character.height_cm + " cm" : "-") +
          " / " +
          String(character?.weight_kg ? character.weight_kg + " kg" : "-")
        : valueFrom(character, ["height_weight", "altura_peso"], "—");
    const organization = valueFrom(character, ["village_or_organization", "organization", "affiliation", "organizacao", "afiliacao"], village);
    const kekkei = valueFrom(character, ["kekkei_genkai_or_hiden", "kekkei_genkai", "hiden", "bloodline"], "—");
    const skillPoints = character?.skill_points ?? valueFrom(character, ["skill_points", "pontos_habilidade"], 50);
    const country = valueFrom(character, ["country", "pais", "país", "land", "land_name"], "—");
    const origin = valueFrom(character, ["origin", "origem", "birthplace", "history"], "—");

    return {
      name,
      village,
      style,
      rank,
      epithet,
      clan,
      player,
      gender,
      age,
      birthday,
      heightWeight,
      organization,
      kekkei,
      skillPoints,
      country,
      origin,
    };
  }, [character]);

  const selectedSection = sheetSections[activeSheetSection] || sheetSections.proofs;

  const handleOpenSheet = () => {
    let opened = false;

    if (typeof onOpenFullSheet === "function") {
      onOpenFullSheet();
      opened = true;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ln-open-character-full-sheet"));
      window.dispatchEvent(new CustomEvent("ln-open-ficha-complementar"));
      opened = true;
    }

    if (typeof document !== "undefined") {
      const legacyButtons = Array.from(
        document.querySelectorAll(
          ".ln-meu-ninja-legacy-content button, .ln-meu-ninja-legacy-content [role='button']"
        )
      );

      const legacySheetButton = legacyButtons.find((button) => {
        const text = String(button.textContent || "").toLowerCase();

        return (
          text.includes("ficha complementar") ||
          text.includes("dossiê shinobi") ||
          text.includes("dossie shinobi") ||
          text.includes("abrir ficha") ||
          text.includes("editar ficha")
        );
      });

      if (legacySheetButton) {
        legacySheetButton.click();
        opened = true;
      }
    }

    return opened;
  };

  const handleEdit = () => {
    if (typeof onEditProfile === "function") {
      onEditProfile();
    }
  };

  return (
    <section className="mnd-desktop-shell">
      <aside className="mnd-sidebar">
        <div className="mnd-brand">
          <div className="mnd-brand-icon">
            <ShurikenIcon />
          </div>
          <div>
            <div className="mnd-brand-kicker">LN DIGITAL</div>
            <div className="mnd-brand-title">HALL</div>
          </div>
        </div>

        <nav className="mnd-nav" aria-label="Navegação lateral">
          <a><NavIcon type="home" />Início</a>
          <a><NavIcon type="map" />Mapa</a>
          <a className="active"><ShurikenIcon />Meu Ninja</a>
          <a><NavIcon type="missions" />Missões</a>
          <a><NavIcon type="heart" />Vila da Folha</a>
          <a><NavIcon type="rank" />Rankings</a>
          <a><NavIcon type="shop" />Loja</a>
          <a><NavIcon type="settings" />Configurações</a>
          <a><NavIcon type="logout" />Sair</a>
        </nav>
      </aside>

      <div className="mnd-page">
        <header className="mnd-topbar">
          <div className="mnd-topbar-title">Dossiê pessoal do personagem</div>

          <div className="mnd-topbar-actions">
            <button type="button" aria-label="Buscar">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>

            <button type="button" aria-label="Notificações">
              <svg viewBox="0 0 24 24">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
            </button>

            <div className="mnd-avatar-mini">
              <ShurikenIcon />
              <span />
            </div>
          </div>
        </header>

        <main className="mnd-content">
          <section className="mnd-hero">
            <div>
              <h1>
                MEU NINJA <ShurikenIcon />
              </h1>
              <p>
                Cada player possui apenas um ninja. Esta página reúne informações,
                localização, teia de habilidades e a Ficha Complementar do personagem.
              </p>
            </div>

            <div className="mnd-hero-watermark">
              <ShurikenIcon />
            </div>
          </section>

          <section className="mnd-character-header">
            <div className="mnd-character-header-top">
              <h2>{data.name}</h2>

              <div className="mnd-character-meta">
                <span>{data.village}</span>
                <b>•</b>
                <span>{data.style}</span>
                <b>•</b>
                <span>{data.rank}</span>
              </div>
            </div>

            <div className="mnd-tabs">
              <button
                type="button"
                className={activeTab === "profile" ? "active" : ""}
                onClick={() => setActiveTab("profile")}
              >
                Perfil
              </button>
              <button
                type="button"
                className={activeTab === "location" ? "active" : ""}
                onClick={() => setActiveTab("location")}
              >
                Localização
              </button>
              <button
                type="button"
                className={activeTab === "tree" ? "active" : ""}
                onClick={() => setActiveTab("tree")}
              >
                Teia de Habilidades
              </button>
            </div>
          </section>

          {activeTab === "profile" && (
            <>
              <section className="mnd-main-grid">
                <article className="mnd-card mnd-profile-card">
                  <div className="mnd-profile-grid">
                    <div>
                      <div className="mnd-photo-placeholder mnd-photo-uploader-real">
                        <CharacterPortraitUploader
                          character={character}
                          value={character?.portrait_url}
                          onUploaded={(portraitUrl, updatedCharacterFromDb) => {
                            const updatedCharacter =
                              updatedCharacterFromDb || {
                                ...character,
                                portrait_url: portraitUrl,
                              };

                            if (typeof onCharacterUpdated === "function") {
                              onCharacterUpdated(updatedCharacter);
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mnd-section-kicker">PERFIL DO PERSONAGEM</div>

                      <div className="mnd-epithet">
                        <ShurikenIcon />
                        {data.epithet}
                      </div>

                      <div className="mnd-pills">
                        <span>{data.village}</span>
                        <span>{data.style}</span>
                        <span>{data.rank}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mnd-character-info-board">
                    <article>
                      <span>Nome do personagem</span>
                      <strong>{data.name}</strong>
                    </article>

                    <article>
                      <span>Player</span>
                      <strong>{data.player}</strong>
                    </article>

                    <article>
                      <span>Gênero</span>
                      <strong>{data.gender}</strong>
                    </article>

                    <article>
                      <span>Idade</span>
                      <strong>{data.age}</strong>
                    </article>

                    <article>
                      <span>Aniversário</span>
                      <strong>{data.birthday}</strong>
                    </article>

                    <article>
                      <span>Altura / Peso</span>
                      <strong>{data.heightWeight}</strong>
                    </article>

                    <article>
                      <span>Aldeia / Organização</span>
                      <strong>{data.organization}</strong>
                    </article>

                    <article>
                      <span>País</span>
                      <strong>{data.country}</strong>
                    </article>

                    <article>
                      <span>Origem</span>
                      <strong>{data.origin}</strong>
                    </article>

                    <article>
                      <span>Clã / Parentesco</span>
                      <strong>{data.clan}</strong>
                    </article>

                    <article>
                      <span>Kekkei Genkai / Hiden</span>
                      <strong>{data.kekkei}</strong>
                    </article>

                    <article>
                      <span>Pontos de habilidade</span>
                      <strong>{data.skillPoints}</strong>
                    </article>
                  </div>

                </article>

                <article className="mnd-card mnd-sheet-card">
                  <div className="mnd-sheet-head">
                    <div>
                      <div className="mnd-section-kicker">DOSSIÊ SHINOBI</div>
                      <h3>Ficha Complementar</h3>
                      <p>
                        Esta área registra dados que não aparecem no perfil principal:
                        provas, status, ações ocultas, medicina, missões, contratos
                        especiais, inventário e desenvolvimento.
                      </p>
                    </div>

                    <span className="mnd-sheet-badge">Ficha integrada</span>
                  </div>

                  <MyNinjaDesktopSheet
                    character={character}
                    user={user}
                    onCharacterUpdated={onCharacterUpdated}
                  />
                </article>
              </section>

              <section className="mnd-bottom-grid">
                <article className="mnd-card">
                  <div className="mnd-section-kicker">IDENTIDADE</div>
                  <dl className="mnd-data-list">
                    <div><dt>Nome</dt><dd>{data.name}</dd></div>
                    <div><dt>Player</dt><dd>{data.player}</dd></div>
                    <div><dt>Gênero</dt><dd>{data.gender}</dd></div>
                    <div><dt>Idade</dt><dd>{data.age}</dd></div>
                    <div><dt>Aniversário</dt><dd>{data.birthday}</dd></div>
                    <div><dt>Altura / Peso</dt><dd>{data.heightWeight}</dd></div>
                  </dl>
                </article>

                <article className="mnd-card">
                  <div className="mnd-section-kicker">AFILIAÇÃO E ORIGEM</div>
                  <dl className="mnd-data-list">
                    <div><dt>Aldeia ou Organização</dt><dd>{data.organization}</dd></div>
                    <div><dt>Clã ou Parentesco</dt><dd>{data.clan}</dd></div>
                    <div><dt>Kekkei Genkai ou Hiden</dt><dd>{data.kekkei}</dd></div>
                    <div><dt>Pontos de Habilidade</dt><dd>{data.skillPoints}</dd></div>
                  </dl>
                </article>

                <article className="mnd-card">
                  <div className="mnd-section-kicker">ÍCONE DO MAPA</div>

                  <div className="mnd-map-icon-box">
                    <div>
                      <ShurikenIcon />
                    </div>
                    <span>Personalizado</span>
                  </div>
                </article>
              </section>
            </>
          )}

          {activeTab === "location" && (
            <section className="mnd-location-grid">
              <article className="mnd-card mnd-location-board">
                <div className="mnd-section-kicker">LOCALIZAÇÃO</div>
                <h3>Registro territorial</h3>
                <p>
                  Board integrado ao visual cinza escuro da página. Aqui entram vila,
                  país, origem, organização e observações territoriais do personagem.
                </p>

                <div className="mnd-map-board">
                  <span className="marker one"><ShurikenIcon /></span>
                  <span className="marker two"><ShurikenIcon /></span>
                  <span className="marker three"><ShurikenIcon /></span>
                </div>
              </article>

              <article className="mnd-card">
                <div className="mnd-section-kicker">DADOS TERRITORIAIS</div>
                <dl className="mnd-data-list">
                  <div><dt>Vila atual</dt><dd>{data.village}</dd></div>
                  <div><dt>País</dt><dd>{data.country}</dd></div>
                  <div><dt>Origem</dt><dd>{data.origin}</dd></div>
                  <div><dt>Organização</dt><dd>{data.organization}</dd></div>
                  <div><dt>Estado de viagem</dt><dd>Disponível</dd></div>
                </dl>

                <button type="button" className="mnd-ghost-button" onClick={handleEdit}>
                  Editar localização
                </button>
              </article>
            </section>
          )}

          {activeTab === "tree" && (
            <section className="mnd-real-teia-section">
              <article className="mnd-card mnd-real-teia-card">
                <div className="mnd-section-kicker">TEIA DE HABILIDADES</div>
                <h3>Teia Shinobi</h3>
                <p>
                  Use seus pontos para desbloquear habilidades do personagem.
                </p>

                <div className="mnd-real-teia-wrapper">
                  <CharacterSkillTree
                    character={character}
                    onCharacterUpdated={onCharacterUpdated}
                  />
                </div>
              </article>
            </section>
          )}
        </main>
      </div>
    </section>
  );
}
