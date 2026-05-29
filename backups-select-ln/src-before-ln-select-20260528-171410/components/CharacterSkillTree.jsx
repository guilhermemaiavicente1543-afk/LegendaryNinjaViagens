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
    type: "characterSkill",
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

function CharacterSkillNode({ data, selected }) {
  const categoryClass = `category-${slugify(data.category || "hibrido")}`;
  const sizeClass = `size-${data.nodeSize || "medium"}`;
  const statusClass = `skill-${data.skillStatus || "locked"}`;
  const imageUrl = String(data.imageUrl || "").trim();

  return (
    <div
      className={`ln-circle-skill-node ${categoryClass} ${sizeClass} ${statusClass} ${
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
  characterSkill: CharacterSkillNode
};

export default function CharacterSkillTree({ character, onCharacterUpdated }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [unlockedSkills, setUnlockedSkills] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const flowInstanceRef = useRef(null);
  const didSetInitialViewport = useRef(false);

  const unlockedIds = useMemo(() => {
    return new Set(unlockedSkills.map((skill) => skill.skill_node_id));
  }, [unlockedSkills]);

  const incomingByTarget = useMemo(() => {
    const grouped = {};

    for (const edge of edges) {
      if (!grouped[edge.target]) {
        grouped[edge.target] = [];
      }

      grouped[edge.target].push(edge.source);
    }

    return grouped;
  }, [edges]);

  function getRequirementStatus(node) {
    const incoming = incomingByTarget[node.id] || [];

    if (incoming.length === 0) {
      return true;
    }

    const mode = node.data?.requirementMode || "all";

    if (mode === "any") {
      return incoming.some((sourceId) => unlockedIds.has(sourceId));
    }

    return incoming.every((sourceId) => unlockedIds.has(sourceId));
  }

  const displayNodes = useMemo(() => {
    return nodes.map((node) => {
      const isUnlocked = unlockedIds.has(node.id);
      const requirementsMet = getRequirementStatus(node);
      const cost = Number(node.data?.cost || 0);
      const hasPoints = Number(character?.skill_points ?? 0) >= cost;

      let skillStatus = "locked";

      if (isUnlocked) {
        skillStatus = "unlocked";
      } else if (requirementsMet && hasPoints) {
        skillStatus = "available";
      } else if (requirementsMet && !hasPoints) {
        skillStatus = "no-points";
      }

      return {
        ...node,
        data: {
          ...node.data,
          skillStatus
        }
      };
    });
  }, [nodes, unlockedIds, character?.skill_points, incomingByTarget]);

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

  const selectedNode = useMemo(() => {
    return displayNodes.find((node) => node.id === selectedNodeId) || null;
  }, [displayNodes, selectedNodeId]);

  const selectedCost = Number(selectedNode?.data?.cost || 0);
  const selectedUnlocked = selectedNode ? unlockedIds.has(selectedNode.id) : false;
  const selectedRequirementsMet = selectedNode ? getRequirementStatus(selectedNode) : false;
  const selectedHasPoints = Number(character?.skill_points ?? 0) >= selectedCost;
  const canUnlockSelected =
    selectedNode && !selectedUnlocked && selectedRequirementsMet && selectedHasPoints;

  function focusTreeView(zoom = 1.25) {
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

  async function loadData() {
    if (!isSupabaseConfigured || !supabase || !character?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const [treeResult, skillsResult] = await Promise.all([
      supabase
        .from("skill_trees")
        .select("*")
        .eq("name", "Teia Principal")
        .maybeSingle(),
      supabase
        .from("character_skills")
        .select("*")
        .eq("character_id", character.id)
        .order("unlocked_at", { ascending: true })
    ]);

    if (treeResult.error) {
      setMessage(treeResult.error.message);
      setIsLoading(false);
      return;
    }

    if (skillsResult.error) {
      setMessage(skillsResult.error.message);
      setIsLoading(false);
      return;
    }

    if (treeResult.data?.nodes?.length) {
      setNodes(normalizeNodes(treeResult.data.nodes));
      setEdges(Array.isArray(treeResult.data.edges) ? treeResult.data.edges : []);
    } else {
      setMessage("Nenhuma teia principal foi salva pelo ADM ainda.");
    }

    setUnlockedSkills(skillsResult.data || []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [character?.id]);

  useEffect(() => {
    if (
      !isLoading &&
      nodes.length > 0 &&
      flowInstanceRef.current &&
      !didSetInitialViewport.current
    ) {
      didSetInitialViewport.current = true;
      window.setTimeout(() => focusTreeView(1.25), 160);
    }
  }, [isLoading, nodes.length]);

  async function unlockSelectedSkill() {
    if (!selectedNode || !character?.id) return;

    setMessage("");

    const { data, error } = await supabase.rpc("unlock_character_skill", {
      p_character_id: character.id,
      p_skill_node_id: selectedNode.id,
      p_skill_name: selectedNode.data.name,
      p_cost: selectedCost
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const newBalance = Array.isArray(data) ? data[0]?.new_balance : undefined;

    setUnlockedSkills((current) => [
      ...current,
      {
        character_id: character.id,
        skill_node_id: selectedNode.id,
        skill_name: selectedNode.data.name,
        cost_paid: selectedCost,
        unlocked_at: new Date().toISOString()
      }
    ]);

    if (typeof newBalance === "number") {
      onCharacterUpdated?.({
        ...character,
        skill_points: newBalance
      });
    }

    setMessage(`Habilidade desbloqueada: ${selectedNode.data.name}`);
  }

  async function redeemCoupon(event) {
    event.preventDefault();

    const code = couponCode.trim();

    if (!code) {
      setMessage("Digite um cupom.");
      return;
    }

    const { data, error } = await supabase.rpc("redeem_skill_coupon", {
      coupon_code: code
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const result = Array.isArray(data) ? data[0] : null;

    if (result) {
      onCharacterUpdated?.({
        ...character,
        skill_points: result.new_balance
      });

      setMessage(
        `Cupom resgatado: +${result.points_added} pontos. Novo saldo: ${result.new_balance}.`
      );
      setCouponCode("");
    }
  }

  return (
    <div className="character-skill-tree">
      <div className="character-skill-topbar">
        <div>
          <strong>Pontos disponíveis</strong>
          <span>{character?.skill_points ?? 50}</span>
        </div>

        <form onSubmit={redeemCoupon} className="coupon-redeem-form">
          <input
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
            placeholder="Código do cupom"
          />
          <button type="submit">Resgatar</button>
        </form>

        <button type="button" onClick={() => focusTreeView(1.25)}>
          Centralizar visão
        </button>
      </div>

      {message && <p className="auth-message">{message}</p>}

      <div className="character-skill-layout">
        <div className="character-skill-canvas">
          {isLoading ? (
            <div className="tree-editor-loading">
              <p className="eyebrow">Carregando</p>
              <h2>Buscando árvore do personagem...</h2>
            </div>
          ) : (
            <ReactFlow
              nodes={displayNodes}
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
              defaultViewport={{ x: 160, y: 120, zoom: 1.25 }}
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
          )}
        </div>

        <aside className="character-skill-inspector">
          {!selectedNode ? (
            <>
              <p className="eyebrow">Árvore</p>
              <h3>Selecione uma habilidade</h3>
              <p>Clique em um círculo para ver custo, requisitos e descrição.</p>
            </>
          ) : (
            <>
              <p className="eyebrow">{selectedNode.data.category}</p>
              <h3>{selectedNode.data.name}</h3>

              <div className="player-skill-meta">
                <span>Custo: {selectedCost} pontos</span>
                <span>
                  Modo:{" "}
                  {selectedNode.data.requirementMode === "any"
                    ? "OU / qualquer requisito"
                    : "E / todos os requisitos"}
                </span>
                {selectedNode.data.requirements && (
                  <span>Req: {selectedNode.data.requirements}</span>
                )}
                <span>
                  Status:{" "}
                  {selectedUnlocked
                    ? "Desbloqueada"
                    : selectedRequirementsMet
                      ? selectedHasPoints
                        ? "Disponível"
                        : "Sem pontos suficientes"
                      : "Bloqueada"}
                </span>
              </div>

              <p>
                {selectedNode.data.description ||
                  "Nenhuma descrição cadastrada."}
              </p>

              {!selectedUnlocked && (
                <button
                  type="button"
                  className="unlock-skill-button"
                  disabled={!canUnlockSelected}
                  onClick={unlockSelectedSkill}
                >
                  {canUnlockSelected
                    ? "Desbloquear habilidade"
                    : "Não disponível"}
                </button>
              )}
            </>
          )}
        </aside>
      </div>

      <div className="unlocked-skills-list">
        <strong>Habilidades desbloqueadas</strong>
        {unlockedSkills.length === 0 ? (
          <span>Nenhuma habilidade desbloqueada ainda.</span>
        ) : (
          unlockedSkills.map((skill) => (
            <span key={skill.skill_node_id}>{skill.skill_name}</span>
          ))
        )}
      </div>
    </div>
  );
}
