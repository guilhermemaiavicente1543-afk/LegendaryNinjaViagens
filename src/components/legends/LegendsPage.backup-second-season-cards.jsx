import { useMemo, useState } from "react";

const LEGEND_PLACEHOLDER = "/legend-placeholder.svg";

const LEGEND_SEASONS = [
  {
    id: "season-1",
    title: "Primeira Temporada",
    years: "2012–2014",
    description:
      "A era de origem do RPG, marcada por poucos jogadores, formação das primeiras grandes ameaças e feitos que inauguraram o conceito de lenda.",
    legends: [
      {
        name: "Loky Yomi",
        cardArt: "/legends/loky-yomi-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2012–2013",
        village: "Konoha / Akatsuki",
        type: "Ciência shinobi",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Figura associada à ressurreição da Akatsuki, domínio científico e contenção das Bijuus, inaugurando uma era de medo no mundo ninja."
      },
      {
        name: "Ryu Uchiha",
        cardArt: "/legends/ryu-uchiha-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2013",
        village: "Konoha",
        type: "Vingança e libertação",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Sobrevivente de uma tragédia causada por Loky, tornou-se uma das figuras mais velozes do mundo ninja e encerrou a ameaça de seu rival."
      },
      {
        name: "Avatar Senju",
        cardArt: "/legends/avatar-senju-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2013",
        village: "Kirigakure",
        type: "Destruição de vila",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Mestre de Suiton ligado à destruição de Konoha e a um confronto decisivo no Vale do Fim."
      },
      {
        name: "Damon Hyuuga",
        cardArt: "/legends/damon-hyuuga-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2014",
        village: "Konoha",
        type: "Taijutsu e sobrevivência",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Exímio combatente Hyuuga, lembrado por enfrentar inimigos de alto escalão, obter olhos raros e tornar-se uma figura temida."
      }
    ]
  },
  {
    id: "season-2",
    title: "Segunda Temporada",
    years: "2015–2018",
    description:
      "Período de expansão do RPG, grandes guerras, destruições de vilas, ascensão de organizações e estratégias que moldaram a geopolítica ninja.",
    legends: [
      {
        name: "Rasaki Kazekage",
        year: "2015–2016",
        village: "Sunagakure",
        type: "Caçador de Uchihas",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Lembrado por feitos contra numerosos Uchihas e por participar de destruições decisivas ao lado de Ezelta."
      },
      {
        name: "Ezelta Kazekage Maito",
        year: "2015, 2017–2018",
        village: "Sunagakure",
        type: "Liderança e guerra",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Kazekage lendário, figura central de Suna, associado a batalhas prolongadas, vitórias contra Bijuus e defesa estratégica da vila."
      },
      {
        name: "Loki Hyuuga",
        year: "2016",
        village: "Hebi",
        type: "Diplomacia e ciência",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Fundador da Hebi, mestre de alianças e técnicas, lembrado por manipular conhecimento, chakra das caudas e destinos de vilas."
      },
      {
        name: "Kirin",
        year: "2016",
        village: "Sunagakure / Kumogakure",
        type: "Renegado destruidor",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Aluno de Ezelta, marcado por vingança, destruição de Kirigakure e confrontos contra líderes de grande relevância."
      },
      {
        name: "Edward Uchiha",
        year: "2017",
        village: "Monastério / Taka",
        type: "Fundação política",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Figura lendária por unificar selos feudais na criação do Monastério e assumir papéis políticos raros no mundo ninja."
      },
      {
        name: "Yomi Shinno",
        year: "2018",
        village: "Ciência shinobi",
        type: "Vida e morte",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Cientista lembrado por feitos extremos envolvendo destruição, ressurreição, domínio de Bijuus e derrota de figuras notáveis."
      },
      {
        name: "Azazel Hyuuga",
        year: "2018",
        village: "Estratégia",
        type: "Maior estrategista",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Humano-artificial reconhecido por uma estratégia de guerra capaz de abalar uma das maiores potências do período."
      },
      {
        name: "Zacht Bell",
        year: "2018",
        village: "Sunagakure",
        type: "Izanagi e guerra",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Discípulo de Ezelta, associado à queda de inimigos, manipulação da vida e morte e participação decisiva na sobrevivência de Suna."
      }
    ]
  },
  {
    id: "season-3",
    title: "Terceira Temporada",
    years: "2019",
    description:
      "Uma das fases mais intensas do mundo ninja, com guerra ampla, colapso de vilas, ameaças lunares, sistemas de inteligência e dominação territorial.",
    legends: [
      {
        name: "Ita Uchiha",
        year: "2019",
        village: "Kumogakure / Akatsuki",
        type: "Destruição silenciosa",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Uchiha envolto em mistério, ligado à destruição de Kumogakure durante conflito entre grandes facções."
      },
      {
        name: "Karma Hyuuga",
        year: "2019",
        village: "Hyuuga",
        type: "Ameaça cósmica",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Figura enigmática lembrada por uma ameaça de escala mundial envolvendo a lua e o equilíbrio do planeta."
      },
      {
        name: "Cronos",
        year: "2019",
        village: "Konohagakure",
        type: "Defensor oculto",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Estrategista de Konoha associado à defesa contra desastre lunar, captura de Bijuus e ações silenciosas de proteção."
      },
      {
        name: "Hans-Ulrich",
        year: "2019",
        village: "Sunagakure",
        type: "Inteligência militar",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Líder de inteligência de Suna, lembrado por sistemas de controle, manipulação estratégica e bastidores de grandes guerras."
      },
      {
        name: "Aleister Otenki Tsuchigumo",
        year: "2019",
        village: "Sunagakure / Amegakure",
        type: "Kinjutsu e sacrifício",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Ninja Tsuchigumo que buscou ser lembrado pela eternidade através de uma explosão devastadora em Amegakure."
      },
      {
        name: "Ezelta Maito",
        year: "2019",
        village: "Sunagakure / A Sombra",
        type: "Domínio e captura de Bijuus",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Retorna ao Livro como uma das maiores lendas, associado à destruição de vilas, captura de Bijuus e domínio político do País do Vento."
      }
    ]
  },
  {
    id: "season-4",
    title: "Quarta Temporada",
    years: "2020–2021",
    description:
      "Fase de reconstrução, ressurreição, imortalidade e ascensão de organizações capazes de mudar a ordem do mundo ninja.",
    legends: [
      {
        name: "Zeus Chinoike",
        year: "2020",
        village: "Iwagakure",
        type: "Reconstrução e imortalidade",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Reconstrutor de Iwagakure, estrategista da Pedra e figura associada à glória, guerra, ciência, ressurreição e imortalidade."
      },
      {
        name: "Bakuto Uchiha",
        year: "2021",
        village: "Kumogakure / Sora no Seishin",
        type: "Redenção e ressurreição",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Figura marcada por culpa, pacifismo e feitos extraordinários ligados ao retorno de Orochimaru e dos antigos Hokages."
      }
    ]
  },
  {
    id: "season-5",
    title: "Quinta Temporada",
    years: "2022",
    description:
      "Período de afirmação da liderança de Konoha e do País do Fogo, com feitos ligados à supremacia política e militar.",
    legends: [
      {
        name: "Ōtsuki Uchiha",
        year: "2022",
        village: "Konohagakure / País do Fogo",
        type: "Liderança nacional",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Líder de Konoha e do País do Fogo, lembrado por derrotar ameaças superiores, manipular a política entre nações e consolidar a vontade do fogo."
      }
    ]
  },
  {
    id: "season-6",
    title: "Sexta Temporada",
    years: "2023",
    description:
      "Fase de expansão territorial, militarização e domínio político em escala continental.",
    legends: [
      {
        name: "Yoto Shidai",
        year: "2023",
        village: "Konohagakure",
        type: "Dominação territorial",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Kage de Konoha associado à militarização da vila, conquista de territórios, destruição e reconstrução de vilas."
      }
    ]
  }
];

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "season-1", label: "1ª Temp." },
  { id: "season-2", label: "2ª Temp." },
  { id: "season-3", label: "3ª Temp." },
  { id: "season-4", label: "4ª Temp." },
  { id: "season-5", label: "5ª Temp." },
  { id: "season-6", label: "6ª Temp." }
];

export default function LegendsPage({ onBack }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLegend, setSelectedLegend] = useState(null);

  const visibleSeasons = useMemo(() => {
    const term = search.trim().toLowerCase();

    return LEGEND_SEASONS
      .filter((season) => activeFilter === "all" || season.id === activeFilter)
      .map((season) => {
        const legends = season.legends.filter((legend) => {
          if (!term) return true;

          return [
            legend.name,
            legend.year,
            legend.village,
            legend.type,
            legend.summary,
            season.title,
            season.years
          ]
            .join(" ")
            .toLowerCase()
            .includes(term);
        });

        return {
          ...season,
          legends
        };
      })
      .filter((season) => season.legends.length > 0);
  }, [activeFilter, search]);

  function openLegend(legend, season) {
    setSelectedLegend({
      ...legend,
      seasonTitle: season.title,
      seasonYears: season.years
    });
  }

  function renderLegendCard(legend, season) {
    if (legend.cardArt) {
      return (
        <article
          key={`${season.id}-${legend.name}`}
          className="legend-art-card"
          role="button"
          tabIndex={0}
          onClick={() => openLegend(legend, season)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openLegend(legend, season);
            }
          }}
        >
          <img
            className="legend-art-card-bg"
            src={legend.cardArt}
            alt={`${legend.name} — card`}
          />

          <button
            type="button"
            className="legend-art-card-button"
            onClick={(event) => {
              event.stopPropagation();
              openLegend(legend, season);
            }}
            aria-label={`Ver dossiê de ${legend.name}`}
          >
            <img
              src={legend.cardButtonArt || "/legends/legend-dossier-button.png"}
              alt=""
              aria-hidden="true"
            />
          </button>
        </article>
      );
    }

    return (
      <article
        key={`${season.id}-${legend.name}`}
        className="cinematic-legend-card"
        role="button"
        tabIndex={0}
        onClick={() => openLegend(legend, season)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLegend(legend, season);
          }
        }}
      >
        <div className="cinematic-card-ornament">
          <span>忍</span>
          <i />
          <i />
          <i />
        </div>

        <div className="cinematic-card-info">
          <p>{legend.year}</p>
          <h3>{legend.name}</h3>

          <div className="legend-card-tags">
            <span>{legend.village}</span>
            <span>{legend.type}</span>
          </div>

          <p>{legend.summary}</p>

          <button
            type="button"
            className="legend-card-open"
            onClick={(event) => {
              event.stopPropagation();
              openLegend(legend, season);
            }}
          >
            Ver dossiê <span>✦</span>
          </button>
        </div>

        <div className="cinematic-card-image">
          <img src={legend.image || LEGEND_PLACEHOLDER} alt={legend.name} />
        </div>
      </article>
    );
  }

  return (
    <main className="legends-page hall-of-legends-page">
      <aside className="legends-side-banner">
        <div className="legends-side-logo">
          <strong>LN</strong>
          <span>伝説</span>
        </div>

        <p>伝説は始まった</p>

        <div className="legends-side-mark">木ノ葉</div>
      </aside>

      <section className="legends-main-stage">
        <header className="legends-topbar">
          <div className="legends-brand-chip">
            <span>忍</span>
            <div>
              <small>LN Digital</small>
              <strong>Hall of Legends</strong>
            </div>
          </div>

          <button type="button" onClick={onBack}>
            Voltar ao Hall
          </button>
        </header>

        <section className="legends-toolbar legends-toolbar-cinematic">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar lenda, vila, feito, temporada..."
          />

          <div className="legends-filter-buttons">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={activeFilter === filter.id ? "active" : ""}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section className="legends-timeline cinematic-legends-timeline">
          {visibleSeasons.map((season) => (
            <article key={season.id} className="legend-season-block cinematic-season">
              <header className="cinematic-season-header">
                <p>{season.years}</p>
                <h2>{season.title}</h2>
                <div className="season-divider">
                  <span />
                  <strong>✦</strong>
                  <span />
                </div>
                <small>{season.description}</small>
              </header>

              <div className="cinematic-legend-grid">
                {season.legends.map((legend) => renderLegendCard(legend, season))}
                {/* legacy-card-disabled
                  <article
                    key={`${season.id}-${legend.name}`}
                    className="cinematic-legend-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => openLegend(legend, season)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openLegend(legend, season);
                      }
                    }}
                  >
                    <div className="cinematic-card-ornament">
                      <span>忍</span>
                      <i />
                      <i />
                      <i />
                    </div>

                    <div className="cinematic-card-info">
                      <p>{legend.year}</p>
                      <h3>{legend.name}</h3>

                      <div className="legend-card-tags">
                        <span>{legend.village}</span>
                        <span>{legend.type}</span>
                      </div>

                      <p>{legend.summary}</p>

                      <button
                        type="button"
                        className="legend-card-open"
                        onClick={(event) => {
                          event.stopPropagation();
                          openLegend(legend, season);
                        }}
                      >
                        Ver dossiê <span>✦</span>
                      </button>
                    </div>

                    <div className="cinematic-card-image">
                      <img src={legend.image || LEGEND_PLACEHOLDER} alt={legend.name} />
                    </div>
                  </article>
                */}
              </div>
            </article>
          ))}

          <article className="legend-season-block cinematic-season loading-season">
            <header className="cinematic-season-header">
              <p>2024...</p>
              <h2>Próximas Lendas</h2>
              <div className="season-divider">
                <span />
                <strong>✦</strong>
                <span />
              </div>
              <small>
                O livro continua em construção. Novos feitos ainda serão registrados
                na história da Legendary Ninja.
              </small>
            </header>
          </article>
        </section>
      </section>

      {selectedLegend && (
        <div
          className="legend-detail-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Dossiê de ${selectedLegend.name}`}
          onClick={() => setSelectedLegend(null)}
        >
          <article
            className="legend-detail-card cinematic-detail-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="legend-detail-close"
              onClick={() => setSelectedLegend(null)}
              aria-label="Fechar dossiê"
            >
              ×
            </button>

            <div className="legend-detail-portrait">
              <img
                src={selectedLegend.image || LEGEND_PLACEHOLDER}
                alt={selectedLegend.name}
              />
            </div>

            <div className="legend-detail-content">
              <p className="eyebrow">
                {selectedLegend.seasonTitle} · {selectedLegend.seasonYears}
              </p>

              <h2>{selectedLegend.name}</h2>

              <div className="legend-detail-tags">
                <span>{selectedLegend.year}</span>
                <span>{selectedLegend.village}</span>
                <span>{selectedLegend.type}</span>
              </div>

              <section>
                <h3>Registro histórico</h3>
                <p>{selectedLegend.summary}</p>
              </section>

              <section>
                <h3>Importância para o RPG</h3>
                <p>
                  Esta lenda representa um feito que marcou a história da Legendary Ninja,
                  seja por impacto militar, político, científico, estratégico ou narrativo.
                  O registro completo pode ser expandido futuramente com provas, imagens
                  autorizadas, feitos detalhados e vínculo com personagens cadastrados.
                </p>
              </section>

              <section>
                <h3>Aparência protegida</h3>
                <p>
                  A imagem exibida nesta página deve ser autorizada pela administração.
                  Aparências de lendas são tratadas como registros exclusivos do RPG.
                </p>
              </section>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
