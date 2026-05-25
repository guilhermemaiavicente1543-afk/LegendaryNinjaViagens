import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  ConnectionLineType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

function SkillNode({ data, selected }) {
  const categoryClass = `category-${slugify(data.category || "hibrido")}`;
  const sizeClass = `size-${data.nodeSize || "medium"}`;
  const imageUrl = String(data.imageUrl || "").trim();

  return (
    <div
      className={`ln-circle-skill-node ${categoryClass} ${sizeClass} ${
        selected ? "selected" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} />

      <div className="circle-skill-name">{data.name || "Habilidade"}</div>

      <div className="circle-skill-body">
        <div className="circle-skill-ring">
          {imageUrl ? (
            <img src={imageUrl} alt={data.name || "Habilidade"} />
          ) : (
            <span>{getNodeInitials(data.name)}</span>
          )}
        </div>
      </div>

      <div className="circle-skill-category">{data.category || "Híbrido"}</div>

      <div
        className={`circle-requirement-mode ${
          data.requirementMode === "any" ? "any" : "all"
        }`}
      >
        {data.requirementMode === "any" ? "OU" : "E"}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  skill: SkillNode
};

export default function SkillTreePage() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const flowInstanceRef = useRef(null);
  const didSetInitialViewport = useRef(false);

  const selectedNode = useMemo(() => {
    return nodes.find((node) => node.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

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
          markerEnd: edge.markerEnd || { type: MarkerType.ArrowClosed },
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
        markerEnd: edge.markerEnd || { type: MarkerType.ArrowClosed },
        style: {
          stroke: "#f97316",
          strokeWidth: 3
        }
      };
    });
  }, [edges, nodes]);

  function focusTreeView(zoom = 1.05) {
    if (!flowInstanceRef.current || nodes.length === 0) {
      return;
    }

    const minX = Math.min(...nodes.map((node) => node.position.x));
    const minY = Math.min(...nodes.map((node) => node.position.y));

    flowInstanceRef.current.setViewport(
      {
        x: 150 - minX * zoom,
        y: 120 - minY * zoom,
        zoom
      },
      { duration: 300 }
    );
  }

  useEffect(() => {
    async function loadSkillTree() {
      if (!isSupabaseConfigured || !supabase) {
        setMessage("Supabase não está configurado.");
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

      if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
        setMessage("Nenhuma teia salva pelo ADM ainda.");
        setIsLoading(false);
        return;
      }

      setNodes(normalizeNodes(data.nodes));
      setEdges(Array.isArray(data.edges) ? data.edges : []);
      setIsLoading(false);
    }

    loadSkillTree();
  }, []);

  useEffect(() => {
    if (
      !isLoading &&
      nodes.length > 0 &&
      flowInstanceRef.current &&
      !didSetInitialViewport.current
    ) {
      didSetInitialViewport.current = true;
      window.setTimeout(() => focusTreeView(1.05), 120);
    }
  }, [isLoading, nodes.length]);

  return (
    <section className="skill-tree-page player-skill-tree-page">
      <div className="skill-tree-toolbar player-skill-tree-toolbar">
        <div>
          <p className="eyebrow">LN Digital</p>
          <h1>Teia de Habilidades</h1>
          <p>
            Visualize a teia principal criada pelo ADM. Esta página não altera a
            posição nem a estrutura da árvore.
          </p>
        </div>

        <div className="skill-legend">
          <span className="legend unlocked">E = todos os requisitos</span>
          <span className="legend available">OU = qualquer requisito</span>

          <button
            type="button"
            className="player-tree-focus-button"
            onClick={() => focusTreeView(1.05)}
          >
            Centralizar visão
          </button>
        </div>
      </div>

      {message && <p className="auth-message">{message}</p>}

      <div className="player-skill-tree-stage">
        {isLoading ? (
          <div className="tree-editor-loading">
            <p className="eyebrow">Carregando</p>
            <h2>Buscando teia salva...</h2>
          </div>
        ) : (
          <>
            <ReactFlow
              nodes={nodes}
              edges={displayEdges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId("")}
              connectionLineType={ConnectionLineType.SmoothStep}
              defaultEdgeOptions={{
                type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed }
              }}
              defaultViewport={{ x: 120, y: 100, zoom: 1.05 }}
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

            <aside className="player-skill-inspector">
              {!selectedNode ? (
                <>
                  <p className="eyebrow">Habilidade</p>
                  <h2>Selecione uma habilidade</h2>
                  <p>
                    Clique em um círculo da teia para ver categoria, requisitos e
                    descrição.
                  </p>
                </>
              ) : (
                <>
                  <p className="eyebrow">{selectedNode.data.category}</p>
                  <h2>{selectedNode.data.name}</h2>

                  <div className="player-skill-meta">
                    <span>
                      Modo:{" "}
                      {selectedNode.data.requirementMode === "any"
                        ? "OU / qualquer requisito"
                        : "E / todos os requisitos"}
                    </span>

                    {selectedNode.data.requirements && (
                      <span>Req: {selectedNode.data.requirements}</span>
                    )}
                  </div>

                  <p>
                    {selectedNode.data.description ||
                      "Nenhuma descrição cadastrada."}
                  </p>
                </>
              )}
            </aside>
          </>
        )}
      </div>
    </section>
  );
}
