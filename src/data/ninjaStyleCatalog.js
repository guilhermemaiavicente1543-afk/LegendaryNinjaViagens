const ability = (key, name, summary) => ({ key, name, summary });

export const NINJA_STYLE_CATALOG = {
  ninjutsu: {
    key: "ninjutsu",
    name: "Ninjutsu",
    shortDescription: "Manipulação de chakra para produzir efeitos reais, elementais ou não elementais.",
    levels: {
      1: [
        ability("tonjutsu", "Tonjutsu", "Permite aprender um elemento secundário adicional ou tornar primário um elemento já possuído."),
        ability("konbijutsu", "Konbijutsu", "Permite técnicas colaborativas, inclusive combinando técnicas que normalmente se anulariam."),
        ability("fluxo-chakra-expansao", "Fluxo de Chakra: Expansão", "Amplia para 1,3x a capacidade corporal de sustentar chakra, sem fornecer chakra adicional."),
        ability("convulsao-chakra", "Convulsão de Chakra", "Permite treinar com NPC para dominar um chakra ou energia específica sem risco de morte, exceto energia natural."),
      ],
      2: [
        ability("ninjutsu-aprimorado-1", "Ninjutsu Aprimorado¹", "Concede um desconto extra aplicável a uma técnica elemental por turno."),
        ability("bunshinjutsu", "Bunshinjutsu", "Amplia alcance e quantidade de clones e melhora sua resistência e realismo."),
        ability("invocacao-humana-ninjutsu", "Invocação: Humana", "Permite invocar uma pessoa por contrato usando sangue fresco dentro das regras do sistema."),
        ability("kekkaijutsu", "Kekkaijutsu", "Aprimora resistência e alcance de barreiras sem classificação principal específica."),
      ],
      3: [
        ability("ninjutsu-aprimorado-2", "Ninjutsu Aprimorado²", "Dobra sem custo adicional a área de técnicas de Ninjutsu de curto ou médio alcance."),
        ability("kyuuinjutsu", "Kyuuinjutsu", "Aprimora extração de chakra, absorção de Stamina em contato e reduz o gasto das técnicas de absorção."),
        ability("senjutsu", "Senjutsu", "Aprimora o domínio de energia natural e reduz os riscos do aprendizado de Modo Sábio."),
        ability("invocacao-intersecao", "Invocação: Interseção", "Amplia contratos de invocação e contratos de sangue com armas, objetos e criaturas."),
      ],
      4: [
        ability("kekkei-genkai-ninjutsu", "Kekkei Genkai", "Aprimora o acesso e o aprendizado de Kekkei Genkai conforme pureza, elementos revelados e treinamento."),
        ability("hiden-ninjutsu", "Hiden", "Amplia o alcance de Hiden e permite ensinar uma Hiden sob as regras do sistema."),
        ability("yuugoujutsu", "Yuugoujutsu", "Permite adicionar um segundo elemento a uma técnica elemental para gerar efeitos combinados."),
        ability("doujutsu-deteccao-clone-ninjutsu", "Doujutsu: Detecção de Clone", "Permite reconhecer clones por Doujutsu capaz de visualizar fluxo de chakra ou interior do alvo."),
      ],
      5: [
        ability("ninjutsu-aprimorado-3", "Ninjutsu Aprimorado³", "Multiplica por 1,3 a velocidade, força e resistência das técnicas primariamente classificadas como Ninjutsu."),
        ability("ninjutsu-medico", "Ninjutsu Médico", "Concede acesso funcional a capacidades médicas de até Iryoninjutsu 3, com limitações próprias."),
        ability("ninjutsu-vertentes", "Ninjutsu: Vertentes", "Permite aprender variações e aprimoramentos de um jutsu principal mediante treinamento."),
        ability("fluxo-chakra", "Fluxo de Chakra", "Concede desconto de chakra e permite aplicar elementos compatíveis diretamente em armamentos."),
      ],
    },
  },
  genjutsu: {
    key: "genjutsu",
    name: "Genjutsu",
    shortDescription: "Criação de ilusões e interferências mentais por controle de chakra e Estilo Yin.",
    levels: {
      1: [
        ability("genjutsu-visual", "Genjutsu: Visual", "Adquire o Elemento Yin e habilita genjutsus visuais comuns."),
        ability("melhoria-sinfonica", "Melhoria Sinfônica", "Usa instrumento e aptidão sonora para alterar temporariamente o fluxo de chakra do alvo."),
        ability("aplicacao-objetiva", "Aplicação Objetiva", "Permite implantar um genjutsu pré-pronto em objeto, som, alimento, toque ou local."),
        ability("modificacao-area", "Modificação de Área", "Permite manter por dias genjutsus de área ou visuais sem dano mental, pagando chakra extra."),
      ],
      2: [
        ability("genjutsu-sonoro", "Genjutsu: Sonoro", "Adquire o Elemento Yin, instrumento musical e acesso a genjutsus sonoros comuns."),
        ability("correlacao-visual", "Correlação Visual", "Amplia genjutsus visuais de curto alcance para até 30 metros sem custo extra."),
        ability("quebra-instantanea", "Quebra-Instantânea", "Reduz em um nível a eficácia considerada de uma barreira mental adversária."),
        ability("ilusoes-demoniacas", "Ilusões Demoníacas", "Após dois turnos consecutivos, o genjutsu passa a causar dano físico crescente."),
      ],
      3: [
        ability("genjutsu-area", "Genjutsu: Área", "Adquire o Elemento Yin e habilita genjutsus em área comuns."),
        ability("amplificadores", "Amplificadores", "Eleva para longo alcance genjutsus sonoros originalmente curtos ou médios."),
        ability("genjutsu-programado", "Genjutsu Programado", "Permite programar um genjutsu em alvo único com condição de ativação e prazo definido."),
        ability("penitencia", "Penitência", "Permite aplicar genjutsu visual ao visualizar o corpo ou a rede de chakra, dentro do limite próprio."),
      ],
      4: [
        ability("genjutsu-tatil", "Genjutsu: Tátil", "Adquire o Elemento Yin e habilita genjutsus táteis comuns."),
        ability("doujutsu-deteccao-clone-genjutsu", "Doujutsu: Detecção de Clone", "Permite reconhecer clones por Doujutsu capaz de visualizar fluxo de chakra ou interior do alvo."),
        ability("hiden-genjutsu", "Hiden", "Amplia o alcance de Hiden e concede expansão especial a Hiden classificadas como Genjutsu."),
        ability("kekkei-genkai-genjutsu", "Kekkei Genkai", "Aprimora o acesso e o aprendizado de Kekkei Genkai conforme as regras de pureza e treinamento."),
      ],
      5: [
        ability("contra-genjutsu", "Contra-Genjutsu", "Permite sobrepor e romper genjutsus usando outro genjutsu, chakra extra ou superioridade de E.N."),
        ability("sinfonia-morte", "Sinfonia da Morte", "Permite replicar imediatamente genjutsus sonoros ouvidos quando houver meio sonoro compatível."),
        ability("permanencia-sombria", "Permanência Sombria", "Transforma permanência em genjutsu danoso em progressão de dano capaz de causar coma ou morte cerebral."),
        ability("dominacao-imperial", "Dominação Imperial", "Permite atingir e dominar criaturas, invocações, monstros, demônios e Bijuu por genjutsu."),
      ],
    },
  },
  taijutsu: {
    key: "taijutsu",
    name: "Taijutsu",
    shortDescription: "Artes marciais, resistência física e otimização direta das capacidades corporais.",
    levels: {
      1: [
        ability("metodo-punho", "Método do Punho", "Evita a redução de Stamina provocada por quem não possui Taijutsu como Estilo Ninja."),
        ability("pratica-imparavel", "Prática Imparável", "Remove o gasto de Stamina de taijutsus básicos, saltos, acrobacias, esquivas e arremessos."),
        ability("peregrino", "Peregrino", "Impede redução de Stamina durante viagens."),
        ability("arte-respiracao", "Arte da Respiração", "Duplica a taxa de recuperação de Stamina durante o combate."),
      ],
      2: [
        ability("estilo-duas-maos", "Estilo de Duas Mãos", "Permite coordenar as duas mãos em ataques, jutsus ou armas de modo individual."),
        ability("shinken-shirahadori", "Shinken Shirahadori", "Concede percepção temporária contra lâminas e permite segurá-las sem se cortar."),
        ability("arte-com-armas", "Arte com Armas", "Concede uma especialização inicial de Bukijutsu prevista pelo sistema."),
        ability("impacto-molecular", "Impacto Molecular", "Armazena chakra em punhos ou pernas para produzir impactos destrutivos ou arremessos."),
      ],
      3: [
        ability("movimento-taijutsu-alta-velocidade", "Movimento de Taijutsu em Alta Velocidade", "Torna passiva a velocidade do MTVA e adiciona progressão por patente."),
        ability("metodo-intersecao", "Método de Interseção", "Permite interceptar e prender membros usados em técnicas de Taijutsu para contra-atacar."),
        ability("caminhada-ritmada", "Caminhada Ritmada", "Reduz o gasto de Stamina necessário para correr."),
        ability("treinamento-intenso", "Treinamento Intenso", "Permite usar Pesos de Treinamento Especial ao abdicar de estilos voltados ao uso de chakra."),
      ],
      4: [
        ability("fluxo-agua", "Fluxo de Água", "Concede flexibilidade extrema, movimentos não anatômicos e deslocamento limitado de órgãos."),
        ability("resistencia-residual", "Resistência Residual", "Concede resistências físicas, mantém consciência e reduz limitações causadas por ferimentos graves."),
        ability("arte-estilo-oculto", "Arte ao Estilo Oculto", "Permite combater observando os pés do adversário para evitar contato visual direto."),
        ability("arte-liberacao-corporal", "Arte da Liberação Corporal", "Multiplica por 1,3 a força física e a resistência corporal de base."),
      ],
      5: [
        ability("nintaijutsu", "Nintaijutsu", "Permite cumprir até dois níveis de requisitos de Ninjutsu sem adquirir o Estilo Ninja."),
        ability("mestre-combate", "Mestre em Combate", "Permite aprender outro Estilo de Luta que forneça Taijutsu, sem adquirir o E.N. correspondente."),
        ability("frenesia", "Frenesia", "Ativa estado de fúria que duplica atributos básicos e restringe o usuário a ataques físicos."),
        ability("resistencia-util", "Resistência Útil", "Cria uma reserva defensiva calculada sobre a resistência para absorver danos antes de ferimentos reais."),
      ],
    },
  },
  fuinjutsu: {
    key: "fuinjutsu",
    name: "Fuinjutsu",
    shortDescription: "Selamento de objetos, seres, chakra e restrições por fórmulas e transcrições.",
    levels: {
      1: [
        ability("succao-aprimorada", "Sucção Aprimorada", "Concede sucção de curto alcance a selos que normalmente exigem contato."),
        ability("extensao-corporea", "Extensão Corpórea", "Cria transcrições que ampliam em 10 metros o alcance do Fuinjutsu."),
        ability("temporizador-selos", "Temporizador de Selos", "Permite programar data, hora ou condição física para ativação do selamento."),
        ability("nulificacao", "Nulificação", "Permite definir no inventário se cada Fuinjutsu é Ímpar ou Par."),
      ],
      2: [
        ability("armadilha-fuinjutsu", "Armadilha de Fuinjutsu", "Permite criar armadilhas de contato e alocá-las em províncias segundo as regras."),
        ability("kaijutsu-1", "Kaijutsu ¹", "Permite usar Genjutsu Kai para romper o próprio fluxo e resistir a genjutsus conforme o E.N."),
        ability("selo-eternidade", "Selo da Eternidade", "Torna permanente um pacto de invocação e remove seu limite comum de duração."),
        ability("interligacao-armeira", "Interligação Armeira", "Concede uma habilidade de Bukijutsu de até o Nível 2."),
      ],
      3: [
        ability("folego-vida", "Fôlego da Vida", "Sacrifica vida, energia e alma para multiplicar por dez o poder de um selamento."),
        ability("invocacao-humana-fuinjutsu", "Invocação: Humana", "Permite invocar o dono de sangue retirado dentro do prazo próprio do sistema."),
        ability("invocacao-impacto-vida", "Invocação: Impacto de Vida", "Amplia contratos secundários, mestres e contratos com objetos, armas e criaturas."),
        ability("selamento-jutsus", "Selamento de Jutsus", "Permite selar técnicas de até Rank A em pergaminhos, com peso definido por Rank."),
      ],
      4: [
        ability("kaijutsu-2", "Kaijutsu ²", "Permite revogar contratos de invocação e romper barreiras por contato com vantagem no desempate."),
        ability("selamento-impuro", "Selamento Impuro", "Permite selar animais e criaturas no próprio corpo para acessar seus jutsus, com consequências permanentes."),
        ability("hiden-fuinjutsu", "Hiden", "Amplia para a próxima classificação o alcance de Hiden curtas ou médias."),
        ability("kekkei-genkai-fuinjutsu", "Kekkei Genkai", "Aprimora o acesso e o aprendizado de Kekkei Genkai conforme as regras de pureza e treinamento."),
      ],
      5: [
        ability("ultimo-recurso", "Último Recurso", "Permite selar chakra em pergaminhos para uso posterior, consumindo espaço de inventário."),
        ability("kaijutsu-3", "Kaijutsu ³", "Permite romper selamentos ao manter concentração sobre alvo incapaz de resistir."),
        ability("juinjutsu-fuinjutsu", "Juinjutsu", "Permite dominar e criar selos amaldiçoados e ampliar seus efeitos."),
        ability("selamento-etereo", "Selamento Etéreo", "Permite selar criaturas gigantescas, demônios e Bijuu no corpo de pessoas sem matá-las."),
      ],
    },
  },
  tansakujutsu: {
    key: "tansakujutsu",
    name: "Kanchijutsu (Tansakujutsu)",
    shortName: "Kanchijutsu",
    shortDescription: "Rastreamento, percepção sensorial, perseguição e elaboração tática por informação obtida.",
    levels: {
      1: [
        ability("kanchi-expansivo", "Kanchi Expansivo", "Amplia técnicas sensoriais para 3 km com o custo padrão da técnica."),
        ability("reducao-triangular", "Redução Triangular", "Reduz pela metade o gasto de criação de barreiras e dobra sua expansão máxima."),
        ability("detector-mentira", "Detector de Mentira", "Permite reconhecer mentira, hesitação e pavor mantendo contato sensorial com o alvo."),
        ability("ricochete", "Ricochete", "Permite que barreiras resistentes ricocheteiem ataques para uma direção definida pela narração."),
      ],
      2: [
        ability("supressao-total", "Supressão Total", "Suprime completamente a assinatura de chakra por até três turnos."),
        ability("sentidos-amplificados", "Sentidos Amplificados", "Multiplica por cinco o alcance de técnicas que aprimoram visão, olfato, audição ou tato."),
        ability("interceptacao", "Interceptação", "Permite focar em até duas fontes e compreender comunicações por chakra ou pessoais."),
        ability("ligacao-harmonica", "Ligação Harmônica", "Permite sobrepor até três barreiras ou Tansakujutsus sem destruição mútua."),
      ],
      3: [
        ability("analise-estilo", "Análise de Estilo", "Revela informações de estilo, chakra, Doujutsu e Kekkei Genkai após rastreamento contínuo."),
        ability("barragem-incredula", "Barragem Incrédula", "Permite erguer sozinho barreiras que exigiriam até três pessoas, pagando gasto único."),
        ability("colapso-iminente", "Colapso Iminente", "Evita morte por esgotamento ou desequilíbrio de chakra e energia, provocando desmaio prolongado."),
        ability("barreira-viva", "Barreira Viva", "Transforma barreiras em sensores que notificam dano, invasão ou passagem independentemente da distância."),
      ],
      4: [
        ability("aumento-assinatura-chakra", "Aumento de Assinatura de Chakra", "Amplia para cinco o número de alvos acompanhados e permite armazenar assinaturas conhecidas."),
        ability("sinfonia-detectiva", "Sinfonia Detectiva", "Permite detectar clones, transformações, ilusões em área e formas de ludibriar o sensorial."),
        ability("kekkei-genkai-tansakujutsu", "Kekkei Genkai", "Aprimora o acesso e o aprendizado de Kekkei Genkai conforme as regras de pureza e treinamento."),
        ability("hiden-tansakujutsu", "Hiden", "Amplia para a próxima classificação o alcance de Hiden curtas ou médias."),
      ],
      5: [
        ability("visao-sensorial", "Visão Sensorial", "Permite ver fluxo de chakra, energias e irregularidades internas sem sofrer efeitos acionados pelo ato de sentir."),
        ability("sensorial-corporal", "Sensorial Corporal", "Aprimora percepção e reação instintiva a ameaças dentro do sensorial, impedindo TMID."),
        ability("deteccao-interna", "Detecção Interna", "Detecta energias e chakras que entram no corpo, inclusive fontes quase indetectáveis ou invisíveis."),
        ability("equivalencia-forca", "Equivalência de Força", "Faz barreiras e Kanchi assumirem equivalência ao E.N. que enfrentam ou utilizam."),
      ],
    },
  },
  iryoninjutsu: {
    key: "iryoninjutsu",
    name: "Iryoninjutsu",
    shortDescription: "Ninjutsu médico voltado a cura, anatomia, procedimentos, patologias e manipulação corporal.",
    levels: {
      1: [
        ability("aprimoramento-regenerativo", "Aprimoramento Regenerativo", "Reduz pela metade o gasto extra de chakra usado no processo de cura."),
        ability("resistencia-patologica", "Resistência Patológica", "Evita sintomas relacionados a modificações corporais e transplantes médicos."),
        ability("diagnostico-avancado", "Diagnóstico Avançado", "Diagnostica instantaneamente lesões, venenos e condições fisiológicas por contato."),
        ability("transplante-ocular", "Transplante Ocular", "Permite transplante ocular fora de laboratório, mantendo sorteio e consequências específicas."),
      ],
      2: [
        ability("estudo-anatomico-perfeito", "Estudo Anatômico Perfeito", "Reduz pela metade o tempo de recuperação de qualquer procedimento."),
        ability("banco-genetico", "Banco Genético", "Permite conservar DNA por nove meses em laboratório máximo com os métodos exigidos."),
        ability("isolamento-patologico", "Isolamento Patológico", "Permite isolar patologias em Cápsula de Indução produzida conforme o sistema."),
        ability("engenharia-orgaos", "Engenharia de Órgãos", "Permite desenvolver órgãos artificiais e corpos sintéticos em laboratório adequado."),
      ],
      3: [
        ability("juinjutsu-iryoninjutsu", "Juinjutsu", "Habilita o desenvolvimento e o uso pleno de Marca da Maldição própria."),
        ability("ginjutsu", "Ginjutsu", "Permite criar ferramentas científicas ninjas e replicar equipamentos tecnológicos dentro das limitações."),
        ability("saisenjutsu", "Saisenjutsu", "Habilita aprendizado de Byakugou e transforma técnicas de autocura em regeneração."),
        ability("tenseijutsu", "Tenseijutsu", "Habilita jutsus classificados como Tenseijutsu quando não forem inerentes a Hiden ou Kekkei Genkai."),
      ],
      4: [
        ability("experiente-medico", "Experiente Médico", "Impede a morte do paciente durante procedimentos, sem eliminar complicações posteriores."),
        ability("inducao-coma", "Indução de Coma", "Permite manter vivo em laboratório um alvo com resquício mínimo de vida."),
        ability("kekkei-genkai-iryoninjutsu", "Kekkei Genkai", "Aprimora o acesso e o aprendizado de Kekkei Genkai conforme as regras de pureza e treinamento."),
        ability("hiden-iryoninjutsu", "Hiden", "Amplia para a próxima classificação o alcance de Hiden curtas ou médias."),
      ],
      5: [
        ability("estabilizacao-chakra", "Estabilização de Chakra", "Estabiliza fluxo de chakra crítico e pode impedir morte recente por esgotamento total."),
        ability("ninjutsu-aprimorado-iryoninjutsu", "Ninjutsu Aprimorado", "Permite escolher uma habilidade de qualquer nível de Ninjutsu sem adquirir o E.N."),
        ability("codificacao-genetica", "Codificação Genética", "Permite compatibilização celular e elimina o sorteio específico de rejeição em transplante de células."),
        ability("autopsia-instantanea", "Autópsia Instantânea", "Permite analisar cadáver fresco e aprender técnicas por estudo completo em laboratório máximo."),
      ],
    },
  },
  bukijutsu: {
    key: "bukijutsu",
    name: "Bukijutsu",
    shortDescription: "Domínio de armas, ferramentas, estilos de manejo, arremessos, armadilhas e marionetes.",
    levels: {
      1: [
        ability("peso-pena", "Peso Pena", "Reduz pela metade o custo de inventário de equipamentos, itens e armas carregados."),
        ability("boujutsu", "Boujutsu", "Aprimora o uso de bastões e armas de contusão alongadas, com aumento de força e integração compatível de chakra."),
        ability("kusarigamajutsu", "Kusarigamajutsu", "Transforma a kusarigama em extensão do corpo e permite desarme e uso de técnicas compatíveis."),
        ability("dupla-empunhadura", "Dupla Empunhadura", "Permite usar duas armas de empunhadura de forma coordenada e simultânea."),
      ],
      2: [
        ability("coracao-armas", "Coração das Armas", "Permite usar imediatamente habilidades e jutsus de armas mantidas em posse."),
        ability("shurikenjutsu", "Shurikenjutsu", "Remove gasto de Stamina de arremessos comuns, amplia alcance, controle de trajetória e velocidade."),
        ability("kenjutsu", "Kenjutsu", "Concede domínio de espadas e acesso às posturas Espada Forte e Xeque."),
        ability("controle-respiratorio-bukijutsu", "Controle Respiratório", "Remove gasto natural de Stamina de movimentos e ataques básicos previstos pelo sistema."),
      ],
      3: [
        ability("aprimoramento-fuinjutsu", "Aprimoramento Fuinjutsu", "Permite selar armas e equipamentos de qualquer Rank consumindo apenas 1% de inventário por item."),
        ability("arte-explosiva", "Arte Explosiva", "Dobra alcance e poder destrutivo de explosivos ao anexar chakra."),
        ability("versatilidade", "Versatilidade", "Permite usar qualquer arma compatível e combinar bônus e jutsus coerentes com sua natureza."),
        ability("tecnica-cordame", "Técnica de Cordame", "Amplia o uso de cordas, fios, arcos e armas de longa distância com gasto progressivo de Stamina."),
      ],
      4: [
        ability("fuinjutsu-objecao", "Fuinjutsu: Objeção", "Permite selar objetos em roupas e liberá-los instantaneamente em posição previamente definida."),
        ability("golpe-fantasma", "Golpe Fantasma", "Permite ludibriar percepção e previsões para atingir pontos cegos com movimentos traiçoeiros."),
        ability("capacidade-desarme", "Capacidade de Desarme", "Permite desarmar adversários por superioridade de Bukijutsu ou força."),
        ability("kuchiyose-armas", "Kuchiyose: Armas", "Permite contratos de invocação com armas, estruturas e invocações inanimadas."),
      ],
      5: [
        ability("pilhagem", "Pilhagem", "Acelera buscas de armas e equipamentos, levando o usuário diretamente ao confronto final sob regras próprias."),
        ability("kugutsujutsu", "Kugutsujutsu", "Permite criar Marionetes Automatizadas e marionetes do tipo Oni."),
        ability("saturacao-armas", "Saturação de Armas", "Permite manipular centenas de armas, fios e liberações simultâneas."),
        ability("armadilha-bukijutsu", "Armadilha", "Aprimora ocultação e implantação de armadilhas, inclusive em províncias."),
      ],
    },
  },
};

export const INITIAL_NINJA_STYLE_KEYS = [
  "ninjutsu",
  "genjutsu",
  "taijutsu",
  "fuinjutsu",
  "tansakujutsu",
  "iryoninjutsu",
];

export const PROGRESSION_NINJA_STYLE_KEYS = [
  "ninjutsu",
  "genjutsu",
  "taijutsu",
  "fuinjutsu",
  "tansakujutsu",
  "iryoninjutsu",
  "bukijutsu",
];


export function getNinjaStyleDefinition(styleKey) {
  return NINJA_STYLE_CATALOG[String(styleKey || "").trim()] || null;
}

export function getNinjaStyleAbilities(styleKey, level) {
  const style = getNinjaStyleDefinition(styleKey);
  return style?.levels?.[Number(level)] || [];
}

export function getNinjaStyleAbility(styleKey, level, abilityKey) {
  return getNinjaStyleAbilities(styleKey, level)
    .find((item) => item.key === abilityKey) || null;
}

export function createNinjaStyleSelection({
  slot,
  order,
  styleKey,
  styleName = "",
  level,
  abilityKey = "",
  abilityName = "",
  acquisitionType = "",
  sourceType = "",
  sourceKey = "",
  sourceName = "",
  acquiredAt = "",
}) {
  const style = getNinjaStyleDefinition(styleKey);
  const abilityDefinition = getNinjaStyleAbility(styleKey, level, abilityKey);
  const normalizedSlot = Number(slot ?? order) || 0;

  return {
    slot: normalizedSlot,
    order: Number(order ?? slot) || normalizedSlot,
    style_key: style?.key || String(styleKey || "").trim(),
    style_name:
      style?.shortName ||
      style?.name ||
      String(styleName || "").trim(),
    level: Number(level) || 0,
    ability_key:
      abilityDefinition?.key ||
      String(abilityKey || "").trim(),
    ability_name:
      abilityDefinition?.name ||
      String(abilityName || "").trim(),
    acquisition_type:
      String(acquisitionType || "").trim() ||
      (normalizedSlot <= 2 ? "initial" : "progression"),
    source_type:
      String(sourceType || "").trim(),
    source_key:
      String(sourceKey || "").trim(),
    source_name:
      String(sourceName || "").trim(),
    acquired_at:
      String(acquiredAt || "").trim(),
  };
}

export function normalizeNinjaStyleSelections(value) {
  let raw = value;

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) =>
      createNinjaStyleSelection({
        slot: item?.slot ?? item?.order ?? index + 1,
        order: item?.order ?? item?.slot ?? index + 1,
        styleKey: item?.style_key ?? item?.styleKey,
        styleName: item?.style_name ?? item?.styleName,
        level: item?.level,
        abilityKey: item?.ability_key ?? item?.abilityKey,
        abilityName: item?.ability_name ?? item?.abilityName,
        acquisitionType:
          item?.acquisition_type ??
          item?.acquisitionType,
        sourceType:
          item?.source_type ??
          item?.sourceType,
        sourceKey:
          item?.source_key ??
          item?.sourceKey,
        sourceName:
          item?.source_name ??
          item?.sourceName,
        acquiredAt:
          item?.acquired_at ??
          item?.acquiredAt,
      })
    )
    .filter((item) => item.style_key && item.level > 0)
    .sort((a, b) => (a.order || a.slot) - (b.order || b.slot));
}

export function formatNinjaStyleSelection(selection) {
  const normalized = normalizeNinjaStyleSelections([selection])[0];
  if (!normalized) return "—";

  const abilityText = normalized.ability_name
    ? ` — ${normalized.ability_name}`
    : "";

  return `${normalized.style_name} ${normalized.level}${abilityText}`;
}

export function buildNinjaStyleSummary(value) {
  return normalizeNinjaStyleSelections(value)
    .map((item) => `${item.style_name} ${item.level}`)
    .join(" + ");
}

export function getSecondInitialStyleOptions(firstSelection) {
  const first = normalizeNinjaStyleSelections([firstSelection])[0];
  if (!first?.style_key) return [];

  return INITIAL_NINJA_STYLE_KEYS.map((styleKey) => ({
    styleKey,
    level: styleKey === first.style_key ? 2 : 1,
  }));
}

export function getNextNinjaStyleOptions(value) {
  const selections = normalizeNinjaStyleSelections(value);

  return PROGRESSION_NINJA_STYLE_KEYS.flatMap((styleKey) => {
    const style = getNinjaStyleDefinition(styleKey);
    if (!style) return [];

    const ownedLevels = selections
      .filter((selection) => selection.style_key === styleKey)
      .map((selection) => Number(selection.level) || 0)
      .filter((level) => level > 0);

    const currentLevel = ownedLevels.length > 0
      ? Math.max(...ownedLevels)
      : 0;

    const nextLevel = currentLevel + 1;

    if (nextLevel > 5 || !style.levels?.[nextLevel]) {
      return [];
    }

    return [{
      styleKey,
      styleName: style.shortName || style.name,
      currentLevel,
      level: nextLevel,
      isNewStyle: currentLevel === 0,
    }];
  });
}

export function getInitialNinjaStyleValidationError(value) {
  const selections = normalizeNinjaStyleSelections(value);

  if (selections.length !== 2) {
    return "Escolha os dois Estilos Ninja iniciais e uma habilidade para cada um.";
  }

  const [first, second] = selections;

  if (first.slot !== 1 || first.level !== 1 || !first.ability_key) {
    return "O primeiro Estilo Ninja deve estar no Nível 1 e possuir uma habilidade selecionada.";
  }

  const expectedSecondLevel = second.style_key === first.style_key ? 2 : 1;

  if (second.slot !== 2 || second.level !== expectedSecondLevel || !second.ability_key) {
    return second.style_key === first.style_key
      ? "Ao continuar o primeiro Estilo Ninja, o segundo deve ser o Nível 2 com uma habilidade desse nível."
      : "Ao escolher outro Estilo Ninja, o segundo deve começar no Nível 1 com uma habilidade desse nível.";
  }

  return "";
}
