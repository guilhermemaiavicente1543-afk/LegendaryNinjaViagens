import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes = [
  {
    id: "chakra-base",
    position: { x: 0, y: 260 },
    data: {
      label: (
        <div className="skill-node unlocked">
          <strong>Controle de Chakra</strong>
          <span>Base inicial</span>
        </div>
      )
    },
    type: "default"
  },
  {
    id: "ninjutsu-01",
    position: { x: 280, y: 80 },
    data: {
      label: (
        <div className="skill-node available">
          <strong>Ninjutsu I</strong>
          <span>Disponível</span>
        </div>
      )
    }
  },
  {
    id: "taijutsu-01",
    position: { x: 280, y: 260 },
    data: {
      label: (
        <div className="skill-node available">
          <strong>Taijutsu I</strong>
          <span>Disponível</span>
        </div>
      )
    }
  },
  {
    id: "genjutsu-01",
    position: { x: 280, y: 440 },
    data: {
      label: (
        <div className="skill-node locked">
          <strong>Genjutsu I</strong>
          <span>Bloqueado</span>
        </div>
      )
    }
  },
  {
    id: "mestre-selos",
    position: { x: 620, y: 20 },
    data: {
      label: (
        <div className="skill-node locked">
          <strong>Mestre de Selos</strong>
          <span>Requer Ninjutsu I</span>
        </div>
      )
    }
  },
  {
    id: "elemental",
    position: { x: 620, y: 140 },
    data: {
      label: (
        <div className="skill-node locked">
          <strong>Elemental</strong>
          <span>Requer Ninjutsu II</span>
        </div>
      )
    }
  },
  {
    id: "meditacao",
    position: { x: 620, y: 320 },
    data: {
      label: (
        <div className="skill-node locked">
          <strong>Meditação</strong>
          <span>Requer Taijutsu I</span>
        </div>
      )
    }
  },
  {
    id: "memoria-muscular",
    position: { x: 620, y: 440 },
    data: {
      label: (
        <div className="skill-node locked">
          <strong>Memória Muscular</strong>
          <span>Requer Taijutsu I</span>
        </div>
      )
    }
  },
  {
    id: "chakra-sombrio",
    position: { x: 620, y: 580 },
    data: {
      label: (
        <div className="skill-node locked">
          <strong>Chakra Sombrio</strong>
          <span>Requer Genjutsu II</span>
        </div>
      )
    }
  }
];

const initialEdges = [
  {
    id: "chakra-ninjutsu",
    source: "chakra-base",
    target: "ninjutsu-01",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed }
  },
  {
    id: "chakra-taijutsu",
    source: "chakra-base",
    target: "taijutsu-01",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed }
  },
  {
    id: "chakra-genjutsu",
    source: "chakra-base",
    target: "genjutsu-01",
    markerEnd: { type: MarkerType.ArrowClosed }
  },
  {
    id: "ninjutsu-mestre-selos",
    source: "ninjutsu-01",
    target: "mestre-selos",
    markerEnd: { type: MarkerType.ArrowClosed }
  },
  {
    id: "ninjutsu-elemental",
    source: "ninjutsu-01",
    target: "elemental",
    markerEnd: { type: MarkerType.ArrowClosed }
  },
  {
    id: "taijutsu-meditacao",
    source: "taijutsu-01",
    target: "meditacao",
    markerEnd: { type: MarkerType.ArrowClosed }
  },
  {
    id: "taijutsu-memoria",
    source: "taijutsu-01",
    target: "memoria-muscular",
    markerEnd: { type: MarkerType.ArrowClosed }
  },
  {
    id: "genjutsu-chakra-sombrio",
    source: "genjutsu-01",
    target: "chakra-sombrio",
    markerEnd: { type: MarkerType.ArrowClosed }
  }
];

const skillDetails = {
  "chakra-base": {
    name: "Controle de Chakra",
    status: "Desbloqueado",
    description:
      "Base inicial para a progressão ninja. Serve como ponto de partida para vários estilos."
  },
  "ninjutsu-01": {
    name: "Ninjutsu I",
    status: "Disponível",
    description:
      "Primeiro nível do caminho de Ninjutsu. Libera técnicas básicas e pré-requisitos para ramos elementais."
  },
  "taijutsu-01": {
    name: "Taijutsu I",
    status: "Disponível",
    description:
      "Primeiro nível do caminho corporal. Serve como base para técnicas físicas, resistência e meditação."
  },
  "genjutsu-01": {
    name: "Genjutsu I",
    status: "Bloqueado",
    description:
      "Primeiro nível do caminho ilusório. Será desbloqueado conforme os requisitos definidos pelo mestre."
  },
  "mestre-selos": {
    name: "Mestre de Selos",
    status: "Bloqueado",
    description:
      "Reduz a exigência de selos manuais e melhora a execução de técnicas de Ninjutsu."
  },
  elemental: {
    name: "Elemental",
    status: "Bloqueado",
    description:
      "Aprimora afinidades elementais e reduz custos relacionados a elementos."
  },
  meditacao: {
    name: "Meditação",
    status: "Bloqueado",
    description:
      "Permite recuperar recursos através de concentração e treinamento corporal."
  },
  "memoria-muscular": {
    name: "Memória Muscular",
    status: "Bloqueado",
    description:
      "Permite assimilar técnicas corporais observando sua execução."
  },
  "chakra-sombrio": {
    name: "Chakra Sombrio",
    status: "Bloqueado",
    description:
      "Manifestação aterrorizante de chakra ligada a efeitos mentais e medo."
  }
};

export default function SkillTreePage() {
  const [selectedSkillId, setSelectedSkillId] = useState("chakra-base");

  const selectedSkill = useMemo(() => {
    return skillDetails[selectedSkillId] || skillDetails["chakra-base"];
  }, [selectedSkillId]);

  return (
    <section className="skill-tree-page">
      <div className="skill-tree-toolbar">
        <div>
          <p className="eyebrow">LN Digital</p>
          <h1>Teia de Habilidades</h1>
          <p>
            Visualize os caminhos de evolução do seu ninja. Esta versão é de
            visualização; o editor do mestre será criado no Painel ADM.
          </p>
        </div>

        <div className="skill-legend">
          <span className="legend unlocked">Desbloqueado</span>
          <span className="legend available">Disponível</span>
          <span className="legend locked">Bloqueado</span>
        </div>
      </div>

      <div className="skill-tree-stage">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => setSelectedSkillId(node.id)}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>

        <aside className="skill-inspector">
          <p className="eyebrow">Habilidade</p>
          <h2>{selectedSkill.name}</h2>
          <span className={`skill-status ${selectedSkill.status.toLowerCase()}`}>
            {selectedSkill.status}
          </span>
          <p>{selectedSkill.description}</p>
        </aside>
      </div>
    </section>
  );
}
