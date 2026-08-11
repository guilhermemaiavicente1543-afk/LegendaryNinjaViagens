import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabaseClient";
import { getLegendKey } from "../../lib/legends/legendKeys";

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
        dossierDescription: "Loky Yomi se auto-intitulava o mais eminente cientista do mundo e tornou-se a mente por trás da ressurreição da antiga Akatsuki. Tratado como a reencarnação de Orochimaru, espalhou medo pelo mundo ninja e exerceu enorme domínio em sua era. Chegou a conter as nove Bijuus, impedindo que o restante do mundo tivesse acesso aos poderes dessas criaturas. Nascido e criado em Konoha, abandonou sua origem para tornar-se um errante e seguir seus próprios planos. Sua trajetória marcou a primeira temporada como uma das primeiras grandes ameaças de escala mundial da Legendary Ninja.",
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
        dossierDescription: "Ryu iniciou sua trajetória em Konoha movido por um desejo profundo de vingança e por uma busca incessante por poder. Treinou simultaneamente sob a tutela do Raikage e do Hokage, alcançando um nível tão elevado que passou a ser reconhecido como o ninja mais veloz do mundo. Sua história mudou quando Loky massacrou uma tropa de gennins durante uma missão de escolta e Ryu esteve entre os sobreviventes. A partir daí, perseguiu Loky até derrotá-lo, encerrando sua ameaça e libertando as Bijuus. Mais tarde, descobriu-se ainda que Ryu era a reencarnação de Hamura, consolidando definitivamente seu nome entre as primeiras grandes lendas do RPG.",
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
        dossierDescription: "Avatar Senju foi um mestre de Suiton oriundo de Kirigakure. Tornou-se infame ao destruir Konoha e, durante o ataque, matar também o Raikage que se encontrava visitando a vila. Sua capacidade de manipulação da água e suas estratégias foram destacadas como parte central de sua força. Posteriormente, desafiou Ryu Uchiha para um confronto no Vale do Fim. Após uma longa batalha e já próximo da derrota, Avatar recorreu à Técnica de Selamento Reversa dos Quatro Símbolos. O golpe suicida levou consigo tanto Avatar quanto Ryu, fazendo com que o mundo ninja perdesse duas de suas figuras mais poderosas no mesmo acontecimento.",
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
        dossierDescription: "Damon Hyuuga, inicialmente conhecido como Janks Pendragon, destacou-se em Konoha como um exímio usuário de taijutsu e tornou-se parceiro de Ryu Uchiha. Juntos enfrentaram sannins lendários da Akatsuki. Ao longo de sua jornada, Damon acumulou jutsus exclusivos e poderes oculares, tornando-se conhecido por derrotar vinte ninjas de alto escalão da Akatsuki. Também derrotou Zack, antiga reencarnação de Sasuke, tomando seus olhos. Quando descobriu uma trama contra si dentro de Konoha, retaliou destruindo a vila e eliminando sannins que tentaram detê-lo. Depois refugiou-se em uma floresta, onde defendeu seu território derrotando aproximadamente quatorze sannins lendários, tornando-se uma figura temida e enigmática.",
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
        dossierDescription: "Rasaki Kazekage construiu sua lenda principalmente através de feitos militares de escala extraordinária. Durante sua trajetória, derrotou oitenta e oito Uchihas, destruiu Kumogakure sozinho e, ao lado de Ezelta, participou da destruição de Konoha. A atuação dos dois fez nascer o título de Irmãos da Areia Sangrenta. Rasaki chegou a afirmar que havia caçado cento e treze jogadores Uchihas em determinada fase do RPG; o livro registra, porém, que cento e três dessas caçadas puderam ser comprovadas através de prints. Sua história tornou-se também um exemplo da importância das provas para a validação dos grandes feitos dentro da Legendary Ninja.",
        cardArt: "/legends/rasaki-kazekage-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2015–2016",
        village: "Sunagakure",
        type: "Caçador de Uchihas",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Lembrado por feitos contra numerosos Uchihas e por participar de destruições decisivas ao lado de Ezelta."
      },
      {
        name: "Ezelta Kazekage Maito",
        dossierDescription: "Ezelta reinou como Kazekage de Sunagakure e construiu uma das trajetórias mais extensas da história do RPG. Ao lado de sua lendária invocação, o macaco Daranto, enfrentou um complô da Akatsuki em uma batalha que durou nove dias e terminou com a queda de trinta e seis membros da organização. Ezelta também derrotou três Bijuus e desfez a Taka, restando apenas Alek, seu aliado. Ao lado de Rasaki, participou da destruição de Konoha e recebeu o título de Irmão da Areia Sangrenta. Posteriormente, a estratégia de Azazel levou Sunagakure à destruição, mas nenhum shinobi sob o comando de Ezelta morreu. Mesmo diante desse ataque, ele manteve a reputação de Suna como uma potência que não havia sido derrotada em guerra.",
        cardArt: "/legends/ezelta-kazekage-maito-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2015, 2017–2018",
        village: "Sunagakure",
        type: "Liderança e guerra",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Kazekage lendário, figura central de Suna, associado a batalhas prolongadas, vitórias contra Bijuus e defesa estratégica da vila."
      },
      {
        name: "Loki Hyuuga",
        dossierDescription: "Loki Hyuuga tornou-se conhecido por alcançar feitos que, em sua época, pareciam inalcançáveis. Foi o primeiro a estabelecer vínculos entre todas as grandes aldeias, com exceção de Sunagakure, utilizando diplomacia e alianças como instrumentos de poder. Dominou técnicas exclusivas e de clã e, em 2016, fundou a Hebi. Seu peso militar era tamanho que sua presença nas guerras podia definir o resultado de um conflito. Também foi descrito como o primeiro a utilizar o Tenseigan com tamanha eficiência que três jogadores de nível semelhante foram derrotados por um único ataque. Loki ainda conquistou chakra relacionado a cada uma das caudas e levou seus estudos da ciência shinobi ao extremo, inclusive concedendo ressurreição a membros leais da Hebi. Seu legado combina ciência, diplomacia, guerra e manipulação da própria vida.",
        cardArt: "/legends/loki-hyuuga-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2016",
        village: "Hebi",
        type: "Diplomacia e ciência",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Fundador da Hebi, mestre de alianças e técnicas, lembrado por manipular conhecimento, chakra das caudas e destinos de vilas."
      },
      {
        name: "Kirin",
        dossierDescription: "Kirin surgiu em Sunagakure como aluno de Ezelta e posteriormente tornou-se um ninja renegado. Entre seus principais feitos está a morte de Rasaki, executada como vingança pela morte de seu irmão Yomi. Kirin também destruiu Kirigakure sozinho e matou o Mizukage durante o ataque. Em outros momentos de sua trajetória, enfrentou e derrotou um Hokage e um ex-Raikage. Durante seu período em Kumogakure, a Akatsuki tentou invadir a vila com sete membros, mas apenas três conseguiram escapar, graças ao uso de Izanagi por um Uchiha do grupo. Esses episódios consolidaram Kirin como uma ameaça capaz de desafiar diretamente a ordem existente entre as grandes vilas.",
        cardArt: "/legends/kirin-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2016",
        village: "Sunagakure / Kumogakure",
        type: "Renegado destruidor",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Aluno de Ezelta, marcado por vingança, destruição de Kirigakure e confrontos contra líderes de grande relevância."
      },
      {
        name: "Edward Uchiha",
        dossierDescription: "Edward Uchiha tornou-se uma lenda ao realizar um feito político sem precedentes: unificou sozinho os selos de doze senhores feudais para permitir a criação do Monastério. Seu prestígio cresceu ainda mais quando passou a ocupar simultaneamente as posições de Raikage e Kazekage. Paralelamente à vida pública, Edward também atuou nas sombras como um dos líderes secretos da Taka ao lado de Yori, participando de conspirações e manipulações que influenciaram o curso político do mundo ninja. Sua importância histórica está ligada sobretudo à combinação incomum entre influência institucional, liderança e atuação clandestina.",
        cardArt: "/legends/edward-uchiha-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2017",
        village: "Monastério / Taka",
        type: "Fundação política",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Figura lendária por unificar selos feudais na criação do Monastério e assumir papéis políticos raros no mundo ninja."
      },
      {
        name: "Yomi Shinno",
        dossierDescription: "Yomi Shinno tornou-se um dos cientistas mais temidos de sua geração. Em um único ataque, exterminou todos os habitantes da Aldeia da Folha e, posteriormente, realizou o feito ainda mais extraordinário de trazer todos de volta à vida. Também conseguiu subjugar mais de três Bijuus e derrotou duas figuras já reconhecidas como lendas: o Kazekage Rasa e Edward Uchiha, líder do Monastério. Durante sua ascensão, chegou muito perto de reunir todas as Bijuus existentes, restando apenas uma localizada em Sunagakure. Sua capacidade de manipular vida, morte e criaturas de enorme poder tornou seu nome central na história da ciência shinobi da Legendary Ninja.",
        cardArt: "/legends/yomi-shinno-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2018",
        village: "Ciência shinobi",
        type: "Vida e morte",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Cientista lembrado por feitos extremos envolvendo destruição, ressurreição, domínio de Bijuus e derrota de figuras notáveis."
      },
      {
        name: "Azazel Hyuuga",
        dossierDescription: "Azazel Hyuuga foi reconhecido principalmente por sua capacidade estratégica. Descrito como um humano-artificial de inteligência excepcional, conquistou a reputação de maior estrategista ao conceber uma operação destinada a destruir Sunagakure, então uma das maiores potências do mundo ninja. Seu plano explorou alianças da própria vila e utilizou marcas de Hiraishin para transportar ataques de Bijuu para o interior de Suna. A execução do ataque acabou envolvida em controvérsias administrativas e discussões sobre a segunda marca utilizada na estratégia. O primeiro ataque devastou a vila; Ezelta sobreviveu graças à intervenção de Zacht Bell e Todoroki morreu durante os acontecimentos. Mesmo diante das controvérsias, o livro reconhece Azazel como lenda pela concepção estratégica do plano.",
        cardArt: "/legends/azazel-hyuuga-card-base.png",
        cardButtonArt: "/legends/legend-dossier-button.png",
        year: "2018",
        village: "Estratégia",
        type: "Maior estrategista",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Humano-artificial reconhecido por uma estratégia de guerra capaz de abalar uma das maiores potências do período."
      },
      {
        name: "Zacht Bell",
        dossierDescription: "Discípulo de Ezelta, Zacht Bell percorreu uma trajetória marcada por assassinatos, guerra e manipulação dos limites entre vida e morte. Ele matou três líderes da Akatsuki, levando a organização à falência, e posteriormente, sob ordens de Sunagakure, eliminou Kirin, acontecimento associado também à destruição de Kumogakure. Durante o grande ataque contra Suna, Zacht utilizou Izanagi para salvar grande parte dos ninjas da vila. O livro também lhe atribui a ressurreição de Ezelta Kazekage através de sua marca da maldição, impedindo a morte definitiva do líder de Suna. Esses feitos fizeram de Bell uma figura decisiva tanto na destruição quanto na sobrevivência de grandes forças do mundo ninja.",

        cardArt: "/legends/zacht-bell-card-base.png",

        cardButtonArt: "/legends/legend-dossier-button.png",
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
        dossierDescription: "Ita Uchiha ganhou notoriedade durante a Quinta Grande Guerra Ninja, quando Suna, Taka e Hebi enfrentavam Konoha, Kumo e Iwa. Sua missão foi impedir que Kumogakure interferisse no principal campo de batalha. Utilizando o Rinnegan, Ita lançou um Shinra Tensei sobre a vila e provocou sua destruição. Após o massacre, surgiram rumores de que ele teria se aliado à Akatsuki e de que a própria organização estaria apoiando Suna durante a guerra. O livro não apresenta essas informações como fatos confirmados, mantendo parte de sua trajetória envolta em mistério. O feito incontestável que o levou ao registro histórico foi a destruição de Kumogakure durante o conflito.",
        cardArt: "/legends/ita-uchiha-card-base.png",
        cardHasBuiltInButton: true,
        year: "2019",
        village: "Kumogakure / Akatsuki",
        type: "Destruição silenciosa",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Uchiha envolto em mistério, ligado à destruição de Kumogakure durante conflito entre grandes facções."
      },
      {
        name: "Karma Hyuuga",
        dossierDescription: "Karma Hyuuga tornou-se um dos ninjas mais procurados e enigmáticos de sua era. Após reduzir suas ações hostis, continuou sendo provocado e perseguido por Konoha, que temia seu poder e buscava capturá-lo. Em resposta, Karma enviou a Ezelta um aviso para que ninjas e civis fossem levados a um local seguro. Dois dias depois, colocou um selo na Lua, teleportou-se até o satélite e utilizou o poder de seu doujutsu para lançá-lo em direção à Terra. A comunidade ninja se uniu para impedir a colisão, mas não conseguiu reunir força suficiente para destruir a Lua. O livro registra que muitos especularam que Karma teria deliberadamente poupado o mundo no último momento, deixando o verdadeiro motivo do desfecho envolto em mistério.",
        cardArt: "/legends/karma-hyuuga-card-base.png",
        cardHasBuiltInButton: true,
        year: "2019",
        village: "Konoha",
        type: "Fúria e domínio",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Combatente Hyuuga de presença feroz, lembrado por sua imponência em batalha, brutalidade controlada e força esmagadora em confrontos decisivos."
      },
      {
        name: "Cronos",
        dossierDescription: "Cronos era considerado o grande estrategista de Konohagakure. Quando Karma ameaçou o mundo lançando a Lua em direção ao planeta, Cronos e dois aliados canalizaram quase todo o próprio chakra para criar um enorme Canhão de Chakra, impedindo a colisão. Posteriormente, por ordem do Hokage, atacou Iwagakure utilizando seu poder ocular, o Teisengan, destruiu a vila e capturou Akise, Jinchuuriki da Sanbi, aumentando o poder militar de Konoha. Mais tarde entregou as Bijuus a seu irmão Moriaty Hyuuga. Quando Moriaty, sob influência de Kirigakure, destruiu Konoha para transformar o País do Fogo em vassalo da Névoa, Cronos reapareceu. Após uma batalha, derrotou o próprio irmão e, incapaz de matá-lo, transformou-o em servo através de um jutsu. Depois de salvar Konoha, desapareceu novamente.",
        cardArt: "/legends/cronos-card-base.png",
        cardHasBuiltInButton: true,
        year: "2019",
        village: "Konohagakure",
        type: "Defensor oculto",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Estrategista de Konoha associado à defesa contra desastre lunar, captura de Bijuus e ações silenciosas de proteção."
      },
      {
        name: "Hans-Ulrich",
        dossierDescription: "Hans-Ulrich foi líder da inteligência de Sunagakure e sucessor de Ezelta, tornando-se conhecido como o estrategista mestre da vila. Criou um sistema de segurança e controle extremamente rígido, projetado para impedir atentados e garantir lealdade absoluta. Sob sua administração, Suna adotou uma política brutal de seleção de seus habitantes, mantendo apenas aqueles considerados fortes e saudáveis. Nas sombras, Hans participou das guerras que culminaram na destruição de Konoha, Iwagakure, Kumogakure e Kirigakure; embora outras forças recebessem os créditos públicos, o livro atribui a ele a elaboração das estratégias. Sua influência também alcançou Ita Uchiha em Kumogakure. Na Sala de Inteligência de Suna, o sangue dos ninjas era armazenado, alimentando rumores sobre um executor conhecido como Carrasco, ligado aos poderes de Jashin e encarregado de punir qualquer traição.",
        cardArt: "/legends/hans-ulrich-card-base.png",
        cardHasBuiltInButton: true,
        year: "2019",
        village: "Sunagakure",
        type: "Inteligência militar",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Líder de inteligência de Suna, lembrado por sistemas de controle, manipulação estratégica e bastidores de grandes guerras."
      },
      {
        name: "Aleister Otenki Tsuchigumo",
        dossierDescription: "Aleister Otenki Tsuchigumo pertencia a uma família importante na hierarquia militar de Sunagakure, mas sentia que sua força e seu nome permaneciam eclipsados por outras figuras mais famosas. Obcecado pela ideia de ser lembrado eternamente, infiltrou-se em Amegakure e preparou cuidadosamente seu ato final. Utilizando o Estilo Tsuchigumo: Liberação da Técnica Proibida da Vida: Criação do Céu e da Terra, reuniu uma quantidade colossal de chakra e então empregou o Kinjutsu Fúria, uma antiga técnica de seu clã. Aleister sacrificou a própria vida em uma explosão que destruiu Amegakure por completo e não deixou sobreviventes. Antes do ataque, deixou uma carta para Ezelta explicando que desejava alcançar a eternidade através de um feito que jamais fosse esquecido.",
        cardArt: "/legends/aleister-otenki-tsuchigumo-card-base.png",
        cardHasBuiltInButton: true,
        year: "2019",
        village: "Sunagakure / Amegakure",
        type: "Kinjutsu e sacrifício",
        image: LEGEND_PLACEHOLDER,
        summary:
          "Ninja Tsuchigumo que buscou ser lembrado pela eternidade através de uma explosão devastadora em Amegakure."
      },
      {
        name: "Ezelta Maito",
        dossierDescription: "Em 2019, Ezelta Maito entrou novamente para o Livro de Lendas, alcançando o status pela quarta vez. Ainda como uma das figuras centrais de Sunagakure, comandou operações que resultaram na destruição de Iwagakure, Konoha e Kirigakure, além da morte de diversos ninjas importantes. Reivindicou para si a chamada Zero Caudas e posteriormente abandonou o posto de Kazekage para liderar a organização de assassinos A Sombra. Nesse período capturou sozinho três Bijuus, assassinou um conselheiro de Kirigakure e tornou-se o homem mais procurado do mundo ninja no Livro Bingo. Ezelta também consolidou domínio sobre todo o País do Vento e protagonizou um dos atos políticos mais incomuns do RPG ao elevar sua invocação, o macaco Daranto, ao posto de Feudal do país.",
        cardArt: "/legends/ezelta-maito-card-base.png",
        cardHasBuiltInButton: true,
        year: "2019",
        village: "Sunagakure",
        type: "Kazekage e A Sombra",
        summary:
          "Lenda suprema de Suna, liderou destruições de grandes vilas, abandonou o posto de Kazekage para chefiar A Sombra e consolidou seu domínio como uma das maiores figuras do mundo shinobi.",
        image: LEGEND_PLACEHOLDER,}
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
        dossierDescription: "Zeus Chinoike foi o primeiro e único membro do Clã Chinoike registrado como lenda no livro, tornando o próprio clã uma das forças mais temidas de sua era. Ainda como Chunnin, assumiu o posto de Tsuchikage e reconstruiu Iwagakure a partir das ruínas, transformando-a novamente em uma grande potência e em seu chamado Olimpo, onde treinou várias futuras lendas. Restabeleceu alianças com Suna, Kumo e Shisengumi, tornou Getsugakure independente e matou seu antigo mestre, o ex-Tsuchikage Fasu, durante uma negociação no País do Ferro. Quando a Akatsuki Revolução destruiu Iwa em sua ausência, Zeus retaliou destruindo Otogakure e Amegakure com auxílio de seu Hiraishin. Ao lado de Bakuto, trouxe de volta à vida o verdadeiro Orochimaru e os quatro antigos Hokages. Mais tarde completou no Monte Shumisen o ritual da Quimera iniciado por Hiruko, alcançando aquilo que o livro descreve como imortalidade real, além de derrotar um Otsutsuki. Sua trajetória é apresentada sobretudo como a de um estrategista que não se enquadrava inteiramente como herói nem como vilão.",
        cardArt: "/legends/zeus-chinoike-card-base.png",
        cardHasBuiltInButton: true,
        year: "2020",
        village: "Iwagakure",
        type: "Estratégia e imortalidade",
        summary:
          "Líder lendário da Pedra, reconstruiu Iwagakure, guiou alianças decisivas e alcançou a imortalidade como uma das mentes mais brilhantes do mundo shinobi.",
        image: LEGEND_PLACEHOLDER,},
      {
        name: "Bakuto Uchiha",
        dossierDescription: "Bakuto Uchiha construiu sua lenda a partir de uma jornada marcada por audácia, culpa e redenção. Ainda jovem, no Relâmpago, desobedeceu advertências do Centro de Inteligência para cumprir uma missão do Raikage e conseguiu escapar de uma emboscada de um caçador ANBU da Folha. Mais tarde, enganado pelo próprio Raikage, disparou o Canhão de Chakra contra Kirigakure acreditando que apenas neutralizaria suas defesas. O peso desse acontecimento transformou Bakuto em um pacifista determinado a buscar outras formas de vencer conflitos. Tornou-se também um grande caçador de Bijuus, capturando a terceira com ajuda final do Raikage e a quarta com Zacht Bell. Sua trajetória passou por morte e ressurreição e alcançou o ápice quando, ao lado de Zeus, trouxe Orochimaru de volta à vida em seu corpo verdadeiro. Bakuto ainda ressuscitou Hashirama, Tobirama, Hiruzen e Minato, conduzindo os antigos Hokages para ajudar na restauração da paz entre as vilas.",
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
        dossierDescription: "Nascido no País do Fogo, Ōtsuki Uchiha tornou-se uma das principais figuras de Konoha em 2022. Sob os ensinamentos dos sapos guerreiros, de sua invocação Nue e posteriormente da reencarnação de Tobirama Senju, desenvolveu um poder extraordinário. Ainda como Gennin derrotou o Hokage anterior e assumiu o comando da vila. Encerrou a influência da Shinsengumi sobre o País do Fogo, derrotou o Mizukage Saksu e tomou as Espadas da Névoa, além de vencer um Otsutsuki. Também planejou a destruição de Sunagakure e conquistou a Caixa da Felicidade Suprema. Após resgatar o Feudal do Fogo, sequestrou a Mizukage Sakura Haruno e utilizou esse acontecimento para ampliar sua influência sobre Kirigakure. Mais tarde tornou-se ele próprio Feudal do Fogo, unificando a nação sob seu comando. Seu confronto contra Bakuto e Zeus é apresentado como parte do processo que encerrou as grandes ameaças contra Konoha e consolidou o País do Fogo como a potência dominante daquele período.",
        cardArt: "/legends/otsuki-uchiha-card-base.png",
        cardHasBuiltInButton: true,
        year: "2022",
        village: "Konoha",
        type: "Vontade do fogo",
        summary:
          "Herói da Folha e líder supremo do fogo, derrotou inimigos decisivos, conquistou poder sem precedentes e marcou sua era com coragem, liderança e supremacia.",
        image: LEGEND_PLACEHOLDER,}
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
        dossierDescription: "Yoto Shidai nasceu e cresceu em Konoha e teve uma infância marcada por violência familiar, culminando na morte de seus próprios pais. Depois de entrar na Academia Ninja, ascendeu rapidamente até tornar-se Kage. Como governante, reformulou toda a estrutura de Konoha e transformou a vila em uma potência militar, criando uma hierarquia que ia dos soldados, representados pelos gennins, até sua própria posição de almirante, equivalente ao Kage. Convencido de que a paz só seria possível através de um único núcleo de poder, iniciou uma expansão territorial agressiva. Tomou Sunagakure, onde matou a Kazekage e sua conselheira com um único golpe; destruiu completamente Iwagakure e depois a reconstruiu; e dominou Kumogakure, onde quatro conselheiros foram mortos e sua filha Aurora Shidai matou a Raikage. Sua morte misteriosa ocorreu antes da conquista de Kirigakure, mas até então Yoto já havia colocado aproximadamente oitenta por cento do mundo sob seu domínio, eliminado feudais, mantido seis corpos lendários no laboratório de Konoha e sustentado cerca de oito meses de expansão sem oposição significativa.",
        cardArt: "/legends/yoto-shindai-card-base.png",
        cardHasBuiltInButton: true,
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

  const [legendOverrides, setLegendOverrides] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadLegendOverrides() {
      const { data, error } = await supabase
        .from("hall_legend_overrides")
        .select("*");

      if (!active) return;

      if (error) {
        console.error(
          "Erro ao carregar personalizações do Hall:",
          error
        );

        return;
      }

      setLegendOverrides(data || []);
    }

    loadLegendOverrides();

    return () => {
      active = false;
    };
  }, []);

  const legendOverridesByKey = useMemo(
    () =>
      Object.fromEntries(
        legendOverrides.map((row) => [
          row.legend_key,
          row
        ])
      ),
    [legendOverrides]
  );

  const resolvedLegendSeasons = useMemo(
    () =>
      LEGEND_SEASONS.map((season) => ({
        ...season,

        legends: season.legends.map((legend) => {
          const override =
            legendOverridesByKey[getLegendKey(legend.name)];

          if (!override) {
            return legend;
          }

          return {
            ...legend,

            dossierDescription:
              override.dossier_description ||
              legend.dossierDescription ||
              legend.summary,

            importanceText:
              override.importance_text ||
              legend.importanceText,

            appearanceNote:
              override.appearance_note ||
              legend.appearanceNote,

            image:
              override.portrait_url ||
              legend.image
          };
        })
      })),
    [legendOverridesByKey]
  );

  const visibleSeasons = useMemo(() => {
    const term = search.trim().toLowerCase();

    return resolvedLegendSeasons
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
  }, [activeFilter, search, resolvedLegendSeasons]);

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
            className={`legend-art-card-button${legend.cardHasBuiltInButton ? " legend-art-card-button--built-in" : ""}`}
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
    <main
      className={`legends-page hall-of-legends-page${
        selectedLegend ? " legend-popup-open" : ""
      }`}
    >
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
          <div
            className="legends-brand-chip"
            role="button"
            tabIndex={0}
            title="Voltar para a página inicial"
            aria-label="Voltar para a página inicial"
            style={{ cursor: "pointer" }}
            onClick={() => onBack?.()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onBack?.();
              }
            }}
          >
            <span>忍</span>
            <div>
              <small>LN Digital</small>
              <strong>Hall of Legends</strong>
            </div>
          </div>
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

      {selectedLegend &&
        typeof document !== "undefined" &&
        createPortal(
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
                  <p>
                    {selectedLegend.dossierDescription ||
                      selectedLegend.summary}
                  </p>
                </section>

                <section>
                  <h3>Importância para o RPG</h3>
                  <p>
                    Esta lenda representa um feito que marcou a história da
                    Legendary Ninja, seja por impacto militar, político,
                    científico, estratégico ou narrativo. O registro completo
                    pode ser expandido futuramente com provas, imagens
                    autorizadas, feitos detalhados e vínculo com personagens
                    cadastrados.
                  </p>
                </section>

                <section>
                  <h3>Aparência protegida</h3>
                  <p>
                    A imagem exibida nesta página deve ser autorizada pela
                    administração. Aparências de lendas são tratadas como
                    registros exclusivos do RPG.
                  </p>
                </section>
              </div>
            </article>
          </div>,
          document.body
        )}

    </main>
  );
}
