import { useMemo, useState } from "react";

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
        year: "2012–2013",
        village: "Konoha / Akatsuki",
        type: "Ciência shinobi",
        summary:
          "Figura associada à ressurreição da Akatsuki, domínio científico e contenção das Bijuus, inaugurando uma era de medo no mundo ninja."
      },
      {
        name: "Ryu Uchiha",
        year: "2013",
        village: "Konoha",
        type: "Vingança e libertação",
        summary:
          "Sobrevivente de uma tragédia causada por Loky, tornou-se uma das figuras mais velozes do mundo ninja e encerrou a ameaça de seu rival."
      },
      {
        name: "Avatar Senju",
        year: "2013",
        village: "Kirigakure",
        type: "Destruição de vila",
        summary:
          "Mestre de Suiton ligado à destruição de Konoha e a um confronto decisivo no Vale do Fim."
      },
      {
        name: "Damon Hyuuga",
        year: "2014",
        village: "Konoha",
        type: "Taijutsu e sobrevivência",
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
        summary:
          "Lembrado por feitos contra numerosos Uchihas e por participar de destruições decisivas ao lado de Ezelta."
      },
      {
        name: "Ezelta Kazekage Maito",
        year: "2015, 2017–2018",
        village: "Sunagakure",
        type: "Liderança e guerra",
        summary:
          "Kazekage lendário, figura central de Suna, associado a batalhas prolongadas, vitórias contra Bijuus e defesa estratégica da vila."
      },
      {
        name: "Loki Hyuuga",
        year: "2016",
        village: "Hebi",
        type: "Diplomacia e ciência",
        summary:
          "Fundador da Hebi, mestre de alianças e técnicas, lembrado por manipular conhecimento, chakra das caudas e destinos de vilas."
      },
      {
        name: "Kirin",
        year: "2016",
        village: "Sunagakure / Kumogakure",
        type: "Renegado destruidor",
        summary:
          "Aluno de Ezelta, marcado por vingança, destruição de Kirigakure e confrontos contra líderes de grande relevância."
      },
      {
        name: "Edward Uchiha",
        year: "2017",
        village: "Monastério / Taka",
        type: "Fundação política",
        summary:
          "Figura lendária por unificar selos feudais na criação do Monastério e assumir papéis políticos raros no mundo ninja."
      },
      {
        name: "Yomi Shinno",
        year: "2018",
        village: "Ciência shinobi",
        type: "Vida e morte",
        summary:
          "Cientista lembrado por feitos extremos envolvendo destruição, ressurreição, domínio de Bijuus e derrota de figuras notáveis."
      },
      {
        name: "Azazel Hyuuga",
        year: "2018",
        village: "Estratégia",
        type: "Maior estrategista",
        summary:
          "Humano-artificial reconhecido por uma estratégia de guerra capaz de abalar uma das maiores potências do período."
      },
      {
        name: "Zacht Bell",
        year: "2018",
        village: "Sunagakure",
        type: "Izanagi e guerra",
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
        summary:
          "Uchiha envolto em mistério, ligado à destruição de Kumogakure durante conflito entre grandes facções."
      },
      {
        name: "Karma Hyuuga",
        year: "2019",
        village: "Hyuuga",
        type: "Ameaça cósmica",
        summary:
          "Figura enigmática lembrada por uma ameaça de escala mundial envolvendo a lua e o equilíbrio do planeta."
      },
      {
        name: "Cronos",
        year: "2019",
        village: "Konohagakure",
        type: "Defensor oculto",
        summary:
          "Estrategista de Konoha associado à defesa contra desastre lunar, captura de Bijuus e ações silenciosas de proteção."
      },
      {
        name: "Hans-Ulrich",
        year: "2019",
        village: "Sunagakure",
        type: "Inteligência militar",
        summary:
          "Líder de inteligência de Suna, lembrado por sistemas de controle, manipulação estratégica e bastidores de grandes guerras."
      },
      {
        name: "Aleister Otenki Tsuchigumo",
        year: "2019",
        village: "Sunagakure / Amegakure",
        type: "Kinjutsu e sacrifício",
        summary:
          "Ninja Tsuchigumo que buscou ser lembrado pela eternidade através de uma explosão devastadora em Amegakure."
      },
      {
        name: "Ezelta Maito",
        year: "2019",
        village: "Sunagakure / A Sombra",
        type: "Domínio e captura de Bijuus",
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
        summary:
          "Reconstrutor de Iwagakure, estrategista da Pedra e figura associada à glória, guerra, ciência, ressurreição e imortalidade."
      },
      {
        name: "Bakuto Uchiha",
        year: "2021",
        village: "Kumogakure / Sora no Seishin",
        type: "Redenção e ressurreição",
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

  return (
    <main className="legends-page">
      <section className="legends-hero">
        <div>
          <p className="eyebrow">LN Digital</p>
          <h1>Livro de Lendas</h1>
          <p>
            O panteão histórico da Legendary Ninja: shinobis cujos feitos
            mudaram vilas, organizações, guerras e o equilíbrio do mundo ninja.
          </p>
        </div>

        <button type="button" onClick={onBack}>
          Voltar ao Hall
        </button>
      </section>

      <section className="legend-definition-card">
        <span>伝説</span>
        <div>
          <h2>O que torna alguém uma lenda?</h2>
          <p>
            Uma lenda não é apenas um personagem forte. É alguém que realizou
            feitos irrepetíveis, influenciou a história do RPG e deixou marcas
            permanentes no mundo shinobi.
          </p>
        </div>
      </section>

      <section className="legends-toolbar">
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

      <section className="legends-timeline">
        {visibleSeasons.map((season) => (
          <article key={season.id} className="legend-season-block">
            <header>
              <div>
                <p>{season.years}</p>
                <h2>{season.title}</h2>
                <span>{season.description}</span>
              </div>
            </header>

            <div className="legend-card-grid">
              {season.legends.map((legend) => (
                <article key={`${season.id}-${legend.name}`} className="legend-card">
                  <div className="legend-card-seal">忍</div>

                  <div className="legend-card-content">
                    <p>{legend.year}</p>
                    <h3>{legend.name}</h3>

                    <div className="legend-card-tags">
                      <span>{legend.village}</span>
                      <span>{legend.type}</span>
                    </div>

                    <p>{legend.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}

        <article className="legend-season-block loading-season">
          <header>
            <div>
              <p>2024...</p>
              <h2>Próximas Lendas</h2>
              <span>
                O livro continua em construção. Novos feitos ainda serão
                registrados na história da Legendary Ninja.
              </span>
            </div>
          </header>
        </article>
      </section>
    </main>
  );
}
