import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  MarkerType,
  Handle,
  Position,
  ConnectionLineType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const categoryOptions = [
  "Base",
  "Ninjutsu",
  "Genjutsu",
  "Taijutsu",
  "Nintaijutsu",
  "Fuinjutsu",
  "Iryo Ninjutsu",
  "Bukijutsu",
  "Kenjutsu",
  "Tansakujutsu",
  "Kekkaijutsu",
  "Juinjutsu",
  "Marionetismo",
  "Robótica",
  "Híbrido",
  "Avançado"
];

const defaultNodes = [
  {
    id: "inicio",
    type: "skill",
    position: { x: 0, y: 260 },
    data: {
      name: "Início",
      category: "Base",
      cost: 0,
      requirements: "",
      description: "Ponto inicial da progressão ninja.",
      source: "Manual"
    }
  },
  {
    id: "ninjutsu",
    type: "skill",
    position: { x: 320, y: 80 },
    data: {
      name: "Ninjutsu",
      category: "Ninjutsu",
      cost: 0,
      requirements: "Inicial",
      description: "Caminho das técnicas ninja e manipulação de chakra.",
      source: "Manual"
    }
  },
  {
    id: "genjutsu",
    type: "skill",
    position: { x: 320, y: 280 },
    data: {
      name: "Genjutsu",
      category: "Genjutsu",
      cost: 0,
      requirements: "Inicial",
      description: "Caminho das ilusões e manipulação sensorial.",
      source: "Manual"
    }
  },
  {
    id: "taijutsu",
    type: "skill",
    position: { x: 320, y: 480 },
    data: {
      name: "Taijutsu",
      category: "Taijutsu",
      cost: 0,
      requirements: "Inicial",
      description: "Caminho do combate corporal.",
      source: "Manual"
    }
  }
];

const defaultEdges = [
  {
    id: "inicio-ninjutsu",
    source: "inicio",
    target: "ninjutsu",
    animated: true,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed }
  },
  {
    id: "inicio-genjutsu",
    source: "inicio",
    target: "genjutsu",
    animated: true,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed }
  },
  {
    id: "inicio-taijutsu",
    source: "inicio",
    target: "taijutsu",
    animated: true,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed }
  }
];

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanName(value) {
  return String(value || "").trim();
}

function cleanDescription(value) {
  const description = String(value || "").trim();

  if (!description || description === "Click to edit skill description.") {
    return "";
  }

  return description;
}

function cleanPrerequisite(value) {
  const prerequisite = String(value || "").trim();

  if (!prerequisite || prerequisite === "-") {
    return "";
  }

  return prerequisite;
}

function extractPrerequisiteName(value) {
  const cleaned = cleanPrerequisite(value);

  if (!cleaned) {
    return "";
  }

  return cleaned.replace(/\s*\(\d+\)\s*$/g, "").trim();
}

function inferCategory(name, prerequisite = "") {
  const text = `${name} ${prerequisite}`.toLowerCase();

  if (text.includes("nintaijutsu")) return "Nintaijutsu";
  if (text.includes("genjutsu")) return "Genjutsu";
  if (text.includes("taijutsu")) return "Taijutsu";
  if (text.includes("ninjutsu")) return "Ninjutsu";
  if (text.includes("fuinjutsu") || text.includes("fuuinjutsu")) return "Fuinjutsu";
  if (text.includes("iryo") || text.includes("iryō")) return "Iryo Ninjutsu";
  if (text.includes("bukijutsu")) return "Bukijutsu";
  if (text.includes("kenjutsu")) return "Kenjutsu";
  if (text.includes("tansakujutsu")) return "Tansakujutsu";
  if (text.includes("kekkaijutsu")) return "Kekkaijutsu";
  if (text.includes("juinjutsu")) return "Juinjutsu";
  if (text.includes("marionetismo")) return "Marionetismo";
  if (text.includes("robótica") || text.includes("robotica")) return "Robótica";
  if (text.includes("inicial") || text.includes("início") || text.includes("inicio")) return "Base";

  return "Híbrido";
}

function getImportedSkills(json) {
  if (Array.isArray(json?.Skills)) {
    return json.Skills;
  }

  if (Array.isArray(json?.FullData?.skills)) {
    return json.FullData.skills.map((skill) => ({
      "Skill Name": skill.name,
      "Skill Position Exact": { x: skill.x, y: skill.y },
      "Skill Description": skill.description,
      "Skill Dependencies": [],
      "Skill Prerequisite": "-"
    }));
  }

  return [];
}

function convertTalentTreeJson(json) {
  const skills = getImportedSkills(json);

  if (!skills.length) {
    throw new Error("Nenhuma habilidade encontrada no JSON.");
  }

  const nameToId = new Map();

  skills.forEach((skill, index) => {
    const name = cleanName(skill["Skill Name"] || skill.name || `Skill ${index + 1}`);
    nameToId.set(name, `skill-${slugify(name)}-${index + 1}`);
  });

  const nodes = skills.map((skill, index) => {
    const name = cleanName(skill["Skill Name"] || skill.name || `Skill ${index + 1}`);
    const prerequisite = cleanPrerequisite(skill["Skill Prerequisite"]);
    const category = inferCategory(name, prerequisite);
    const positionExact = skill["Skill Position Exact"] || {};

    const x = Number(positionExact.x ?? skill.x ?? 120 + index * 80);
    const y = Number(positionExact.y ?? skill.y ?? 120 + index * 40);

    return {
      id: nameToId.get(name),
      type: "skill",
      position: { x, y },
      data: {
        name,
        category,
        cost: 0,
        requirements: prerequisite,
        description: cleanDescription(skill["Skill Description"] || skill.description),
        source: "Importado",
        nodeSize: "medium",
        imageUrl:
          String(skill["Skill Image"] || "").startsWith("http") ||
          String(skill["Skill Image"] || "").startsWith("/")
            ? String(skill["Skill Image"])
            : "",
        requirementMode: "all"
      }
    };
  });

  const edgeMap = new Map();

  skills.forEach((skill, index) => {
    const sourceName = cleanName(skill["Skill Name"] || skill.name || `Skill ${index + 1}`);
    const sourceId = nameToId.get(sourceName);

    const dependencies = Array.isArray(skill["Skill Dependencies"])
      ? skill["Skill Dependencies"]
      : [];

    dependencies.forEach((dependencyNameRaw) => {
      const dependencyName = cleanName(dependencyNameRaw);
      const targetId = nameToId.get(dependencyName);

      if (!sourceId || !targetId || sourceId === targetId) {
        return;
      }

      const edgeId = `edge-${sourceId}-${targetId}`;

      edgeMap.set(edgeId, {
        id: edgeId,
        source: sourceId,
        target: targetId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed }
      });
    });

    const prerequisiteName = extractPrerequisiteName(skill["Skill Prerequisite"]);
    const prerequisiteId = nameToId.get(prerequisiteName);

    if (prerequisiteId && sourceId && prerequisiteId !== sourceId) {
      const edgeId = `edge-${prerequisiteId}-${sourceId}`;

      edgeMap.set(edgeId, {
        id: edgeId,
        source: prerequisiteId,
        target: sourceId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed }
      });
    }
  });

  return {
    nodes: autoLayoutNodes(nodes, Array.from(edgeMap.values())),
    edges: Array.from(edgeMap.values())
  };
}

function normalizeNodes(nodes) {
  return nodes.map((node) => ({
    ...node,
    type: "skill",
    data: {
      name: node.data?.name || node.data?.label || "Habilidade",
      category: node.data?.category || "Híbrido",
      cost: Number(node.data?.cost || 0),
      requirements: node.data?.requirements || "",
      description: node.data?.description || "",
      source: node.data?.source || "Manual",
      nodeSize: node.data?.nodeSize || "medium",
      imageUrl: node.data?.imageUrl || "",
      requirementMode: node.data?.requirementMode || "all"
    }
  }));
}

function autoLayoutNodes(nodes, edges) {
  const incoming = new Map();
  const outgoing = new Map();

  nodes.forEach((node) => {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  });

  edges.forEach((edge) => {
    if (incoming.has(edge.target)) {
      incoming.get(edge.target).push(edge.source);
    }

    if (outgoing.has(edge.source)) {
      outgoing.get(edge.source).push(edge.target);
    }
  });

  const levelById = new Map();
  const queue = [];

  nodes.forEach((node) => {
    if ((incoming.get(node.id) || []).length === 0) {
      levelById.set(node.id, 0);
      queue.push(node.id);
    }
  });

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentLevel = levelById.get(currentId) || 0;

    for (const targetId of outgoing.get(currentId) || []) {
      const nextLevel = Math.max(levelById.get(targetId) || 0, currentLevel + 1);
      levelById.set(targetId, nextLevel);
      queue.push(targetId);
    }
  }

  const categoryOrder = [
    "Base",
    "Genjutsu",
    "Tansakujutsu",
    "Fuinjutsu",
    "Ninjutsu",
    "Iryo Ninjutsu",
    "Marionetismo",
    "Nintaijutsu",
    "Taijutsu",
    "Bukijutsu",
    "Kenjutsu",
    "Robótica",
    "Híbrido",
    "Avançado"
  ];

  const categoryIndex = (category) => {
    const index = categoryOrder.indexOf(category);
    return index === -1 ? categoryOrder.length : index;
  };

  const grouped = new Map();

  nodes.forEach((node) => {
    const level = levelById.get(node.id) ?? 0;

    if (!grouped.has(level)) {
      grouped.set(level, []);
    }

    grouped.get(level).push(node);
  });

  const nextNodes = [];

  Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([level, levelNodes]) => {
      levelNodes
        .sort((a, b) => {
          const categoryDiff =
            categoryIndex(a.data?.category) - categoryIndex(b.data?.category);

          if (categoryDiff !== 0) {
            return categoryDiff;
          }

          return String(a.data?.name || "").localeCompare(String(b.data?.name || ""));
        })
        .forEach((node, index) => {
          nextNodes.push({
            ...node,
            position: {
              x: level * 260,
              y: index * 105
            }
          });
        });
    });

  return nextNodes;
}

function getNodeInitials(name) {
  return String(name || "H")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SkillNode({ data, selected }) {
  const categoryClass = `category-${slugify(data.category || "hibrido")}`;
  const sizeClass = `size-${data.nodeSize || "medium"}`;
  const imageUrl = String(data.imageUrl || "").trim();

  return (
    <div className={`ln-circle-skill-node ${categoryClass} ${sizeClass} ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Top} />

      <div className="circle-skill-name">
        {data.name || "Habilidade"}
      </div>

      <div className="circle-skill-body">
        <div className="circle-skill-ring">
          {imageUrl ? (
            <img src={imageUrl} alt={data.name || "Habilidade"} />
          ) : (
            <span>{getNodeInitials(data.name)}</span>
          )}
        </div>
      </div>

      <div className="circle-skill-category">
        {data.category || "Híbrido"}
      </div>

      <div className={`circle-requirement-mode ${data.requirementMode === "any" ? "any" : "all"}`}>
        {data.requirementMode === "any" ? "OU" : "E"}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  skill: SkillNode
};

export default function SkillTreeEditor() {
  const [treeId, setTreeId] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const flowInstanceRef = useRef(null);
  const didSetInitialViewport = useRef(false);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;

  const selectedNodeData = selectedNode?.data || {};

  const onConnect = useCallback(
    (params) =>
      setEdges((currentEdges) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed }
          },
          currentEdges
        )
      ),
    [setEdges]
  );

  const categoryCounts = useMemo(() => {
    return nodes.reduce((acc, node) => {
      const category = node.data?.category || "Híbrido";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }, [nodes]);

  const displayEdges = useMemo(() => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    return edges.map((edge) => {
      const targetNode = nodeById.get(edge.target);
      const mode = targetNode?.data?.requirementMode || "all";

      if (mode === "any") {
        return {
          ...edge,
          type: "smoothstep",
          animated: true,
          style: {
            stroke: "#38bdf8",
            strokeWidth: 3,
            strokeDasharray: "7 6"
          }
        };
      }

      return {
        ...edge,
        type: "smoothstep",
        style: {
          stroke: "#f97316",
          strokeWidth: 3
        }
      };
    });
  }, [edges, nodes]);

  useEffect(() => {
    if (
      !isLoading &&
      nodes.length > 0 &&
      flowInstanceRef.current &&
      !didSetInitialViewport.current
    ) {
      didSetInitialViewport.current = true;
      window.setTimeout(() => focusTreeView(1.15), 120);
    }
  }, [isLoading, nodes.length]);

  useEffect(() => {
    async function loadTree() {
      if (!isSupabaseConfigured || !supabase) {
        setMessage("Supabase não configurado.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("skill_trees")
        .select("*")
        .eq("name", "Teia Principal")
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        setTreeId(data.id);

        if (Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(normalizeNodes(data.nodes));
        }

        if (Array.isArray(data.edges) && data.edges.length > 0) {
          setEdges(data.edges);
        }
      }

      setIsLoading(false);
    }

    loadTree();
  }, [setNodes, setEdges]);

  function focusTreeView(zoom = 1.15) {
    if (!flowInstanceRef.current || nodes.length === 0) {
      return;
    }

    const minX = Math.min(...nodes.map((node) => node.position.x));
    const minY = Math.min(...nodes.map((node) => node.position.y));

    flowInstanceRef.current.setViewport(
      {
        x: 160 - minX * zoom,
        y: 130 - minY * zoom,
        zoom
      },
      { duration: 300 }
    );
  }

  function addSkillNode() {
    const id = `skill-${crypto.randomUUID()}`;

    const newNode = {
      id,
      type: "skill",
      position: { x: 120, y: 120 },
      data: {
        name: "Nova Habilidade",
        category: "Ninjutsu",
        cost: 0,
        requirements: "",
        description: "Descreva a habilidade.",
        source: "Manual",
        nodeSize: "medium",
        imageUrl: "",
        requirementMode: "all"
      }
    };

    setNodes((currentNodes) => [...currentNodes, newNode]);
    setSelectedNodeId(id);
  }

  function updateSelectedNode(field, value) {
    if (!selectedNode) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== selectedNode.id) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            [field]: value
          }
        };
      })
    );
  }

  function deleteSelectedNode() {
    if (!selectedNode) return;

    setNodes((currentNodes) =>
      currentNodes.filter((node) => node.id !== selectedNode.id)
    );

    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          edge.source !== selectedNode.id && edge.target !== selectedNode.id
      )
    );

    setSelectedNodeId("");
  }

  function deleteSelectedEdge() {
    if (!selectedEdgeId) return;

    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.id !== selectedEdgeId)
    );

    setSelectedEdgeId("");
    setMessage("Ligação removida. Clique em Salvar Teia para confirmar.");
  }

  function handleAutoLayout() {
    setNodes((currentNodes) => autoLayoutNodes(currentNodes, edges));
    setMessage("Teia auto-organizada. Revise visualmente antes de salvar.");
  }

  async function importJsonFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const converted = convertTalentTreeJson(json);

      setNodes(converted.nodes);
      setEdges(converted.edges);
      setSelectedNodeId("");
      setMessage(
        `JSON importado: ${converted.nodes.length} habilidades e ${converted.edges.length} conexões. Pontos, níveis e limites do arquivo foram ignorados.`
      );
    } catch (error) {
      setMessage(error.message || "Erro ao importar JSON.");
    } finally {
      event.target.value = "";
    }
  }

  async function saveTree() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não configurado.");
      return;
    }

    const payload = {
      name: "Teia Principal",
      nodes,
      edges,
      updated_at: new Date().toISOString()
    };

    if (treeId) {
      const { error } = await supabase
        .from("skill_trees")
        .update(payload)
        .eq("id", treeId);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Teia salva com sucesso.");
      return;
    }

    const { data, error } = await supabase
      .from("skill_trees")
      .insert(payload)
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setTreeId(data.id);
    setMessage("Teia criada e salva com sucesso.");
  }

  if (isLoading) {
    return (
      <section className="tree-editor-page">
        <div className="tree-editor-loading">
          <p className="eyebrow">Editor da Teia</p>
          <h2>Carregando teia...</h2>
        </div>
      </section>
    );
  }

  return (
    <section className="tree-editor-page">
      <div className="tree-editor-toolbar">
        <div>
          <p className="eyebrow">Painel ADM</p>
          <h2>Editor da Teia de Habilidades</h2>
          <p>
            Importe, organize, mova e conecte habilidades. O visual agora é
            otimizado para uma árvore grande de RPG.
          </p>
        </div>

        <div className="tree-editor-actions">
          <label className="import-json-button">
            Importar JSON
            <input type="file" accept=".json,application/json" onChange={importJsonFile} />
          </label>

          <button type="button" onClick={() => focusTreeView(1.15)}>
            Centralizar visão
          </button>

          <button type="button" onClick={handleAutoLayout} title="Altera a posição dos nós">
            Auto-organizar posições
          </button>

          {selectedEdgeId && (
            <button
              type="button"
              className="danger-button-inline"
              onClick={deleteSelectedEdge}
            >
              Remover ligação selecionada
            </button>
          )}

          <button type="button" onClick={addSkillNode}>
            + Habilidade
          </button>

          <button type="button" onClick={saveTree}>
            Salvar Teia
          </button>
        </div>
      </div>

      {message && <p className="auth-message">{message}</p>}

      <div className="tree-editor-categories">
        {Object.entries(categoryCounts).map(([category, count]) => (
          <span key={category}>
            {category}: {count}
          </span>
        ))}
      </div>

      <div className="tree-editor-layout">
        <div className="tree-editor-canvas">
          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId("");
            }}
            onEdgeClick={(event, edge) => {
              event.stopPropagation();
              setSelectedEdgeId(edge.id);
              setSelectedNodeId("");
            }}
            onPaneClick={() => {
              setSelectedNodeId("");
              setSelectedEdgeId("");
            }}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed }
            }}
            defaultViewport={{ x: 120, y: 100, zoom: 1.15 }}
            minZoom={0.2}
            maxZoom={2}
            onInit={(instance) => {
              flowInstanceRef.current = instance;
            }}
          >
            <Background color="#334155" gap={24} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        <aside className="tree-editor-panel">
          <h3>Editar Habilidade</h3>

          {!selectedNode ? (
            <p className="empty-message">
              Clique em uma habilidade da teia para editar.
            </p>
          ) : (
            <>
              <label>
                Nome
                <input
                  value={selectedNodeData.name || ""}
                  onChange={(event) =>
                    updateSelectedNode("name", event.target.value)
                  }
                />
              </label>

              <label>
                Categoria
                <select
                  value={selectedNodeData.category || ""}
                  onChange={(event) =>
                    updateSelectedNode("category", event.target.value)
                  }
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Modo de requisito
                <select
                  value={selectedNodeData.requirementMode || "all"}
                  onChange={(event) =>
                    updateSelectedNode("requirementMode", event.target.value)
                  }
                >
                  <option value="all">E / precisa de todos os requisitos</option>
                  <option value="any">OU / precisa de qualquer requisito</option>
                </select>
              </label>

              <label>
                Tamanho do círculo
                <select
                  value={selectedNodeData.nodeSize || "medium"}
                  onChange={(event) =>
                    updateSelectedNode("nodeSize", event.target.value)
                  }
                >
                  <option value="small">Pequeno</option>
                  <option value="medium">Médio</option>
                  <option value="large">Grande</option>
                  <option value="special">Especial</option>
                </select>
              </label>

              <label>
                Imagem da habilidade
                <input
                  value={selectedNodeData.imageUrl || ""}
                  onChange={(event) =>
                    updateSelectedNode("imageUrl", event.target.value)
                  }
                  placeholder="Cole uma URL de imagem aqui"
                />
              </label>

              <label>
                Custo
                <input
                  type="number"
                  min="0"
                  value={selectedNodeData.cost || 0}
                  onChange={(event) =>
                    updateSelectedNode("cost", Number(event.target.value))
                  }
                />
              </label>

              <label>
                Requisitos
                <textarea
                  value={selectedNodeData.requirements || ""}
                  onChange={(event) =>
                    updateSelectedNode("requirements", event.target.value)
                  }
                  placeholder="Ex: Ninjutsu II + Taijutsu II"
                />
              </label>

              <label>
                Descrição
                <textarea
                  value={selectedNodeData.description || ""}
                  onChange={(event) =>
                    updateSelectedNode("description", event.target.value)
                  }
                />
              </label>

              <button
                type="button"
                className="danger-button"
                onClick={deleteSelectedNode}
              >
                Remover habilidade
              </button>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
