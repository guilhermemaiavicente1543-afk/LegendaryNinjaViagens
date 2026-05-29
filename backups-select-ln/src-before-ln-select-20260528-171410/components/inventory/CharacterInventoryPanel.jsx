import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const ITEM_TYPES = [
  { value: "technique", label: "Técnicas possuídas" },
  { value: "equipment", label: "Equipamentos" },
  { value: "consumable", label: "Consumíveis" },
  { value: "resource", label: "Recursos" },
  { value: "special", label: "Especiais" },
  { value: "note", label: "Anotações" }
];

const RARITIES = ["comum", "incomum", "raro", "épico", "lendário"];

const initialForm = {
  item_type: "technique",
  technique_id: "",
  acquisition_method: "",
  acquired_at: "",
  name: "",
  rarity: "comum",
  quantity: 1,
  description: "",
  source: "",
  equipped: false
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function getTechniqueName(technique) {
  return technique?.name || technique?.name_pt || technique?.title || "Técnica sem nome";
}

function getTechniqueMeta(technique) {
  return [
    technique?.rank ? `Rank ${technique.rank}` : "",
    technique?.classification || "",
    technique?.nature || "",
    technique?.status || ""
  ]
    .filter(Boolean)
    .join(" · ");
}

function getTypeLabel(type) {
  return ITEM_TYPES.find((item) => item.value === type)?.label || "Item";
}

export default function CharacterInventoryPanel({ user, character }) {
  const [items, setItems] = useState([]);
  const [techniques, setTechniques] = useState([]);
  const [techniqueSearch, setTechniqueSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState("technique");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTechniques, setIsLoadingTechniques] = useState(false);

  const selectedTechnique = useMemo(() => {
    return techniques.find((technique) => String(technique.id) === String(form.technique_id));
  }, [techniques, form.technique_id]);

  const visibleTechniques = useMemo(() => {
    const search = normalizeText(techniqueSearch);

    if (!search) return [];

    return techniques
      .filter((technique) => {
        const haystack = normalizeText(
          [
            getTechniqueName(technique),
            technique.rank,
            technique.classification,
            technique.nature,
            technique.status
          ]
            .filter(Boolean)
            .join(" ")
        );

        return haystack.includes(search);
      })
      .slice(0, 80);
  }, [techniques, techniqueSearch]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => item.item_type === filter);
  }, [items, filter]);

  useEffect(() => {
    loadInventory();
    loadTechniques();
  }, [character?.id, user?.id]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function changeType(nextType) {
    setFilter(nextType);
    setForm({
      ...initialForm,
      item_type: nextType
    });
    setTechniqueSearch("");
  }

  async function loadTechniques() {
    if (!isSupabaseConfigured || !supabase) return;

    setIsLoadingTechniques(true);
    setMessage("");

    const pageSize = 1000;
    let from = 0;
    let allTechniques = [];
    let keepLoading = true;

    while (keepLoading) {
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("technique_catalog")
        .select("*")
        .order("name", { ascending: true })
        .range(from, to);

      if (error) {
        setIsLoadingTechniques(false);
        setMessage(`Erro ao carregar técnicas da ShinobiDex: ${error.message}`);
        return;
      }

      const batch = data || [];
      allTechniques = [...allTechniques, ...batch];

      if (batch.length < pageSize) {
        keepLoading = false;
      } else {
        from += pageSize;
      }
    }

    setIsLoadingTechniques(false);

    const sorted = allTechniques.sort((a, b) =>
      getTechniqueName(a).localeCompare(getTechniqueName(b), "pt-BR")
    );

    setTechniques(sorted);
  }

  async function loadInventory() {
    if (!user?.id || !character?.id) return;
    if (!isSupabaseConfigured || !supabase) return;

    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("character_inventory_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("character_id", character.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      setMessage(`Erro ao carregar inventário: ${error.message}`);
      return;
    }

    setItems(data || []);
  }

  async function addItem(event) {
    event.preventDefault();
    setMessage("");

    if (!user?.id || !character?.id) {
      setMessage("Crie seu ninja e faça login antes de usar o inventário.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    let payload;

    if (form.item_type === "technique") {
      if (!selectedTechnique) {
        setMessage("Selecione uma técnica da ShinobiDex.");
        return;
      }

      if (!form.acquisition_method.trim()) {
        setMessage("Informe como a técnica foi adquirida.");
        return;
      }

      if (!form.acquired_at) {
        setMessage("Informe a data de aquisição.");
        return;
      }

      payload = {
        user_id: user.id,
        character_id: character.id,
        item_type: "technique",
        technique_id: String(selectedTechnique.id),
        name: getTechniqueName(selectedTechnique),
        category: "",
        rarity: selectedTechnique.rank || "comum",
        quantity: 1,
        description: getTechniqueMeta(selectedTechnique),
        source: form.acquisition_method.trim(),
        acquisition_method: form.acquisition_method.trim(),
        acquired_at: form.acquired_at,
        equipped: false,
        status: "active",
        updated_at: new Date().toISOString()
      };
    } else {
      if (!form.name.trim()) {
        setMessage("Informe o nome do registro.");
        return;
      }

      payload = {
        user_id: user.id,
        character_id: character.id,
        item_type: form.item_type,
        technique_id: "",
        name: form.name.trim(),
        category: "",
        rarity: form.rarity,
        quantity: Number(form.quantity) || 1,
        description: form.description.trim(),
        source: form.source.trim(),
        acquisition_method: form.source.trim(),
        acquired_at: form.acquired_at || null,
        equipped: Boolean(form.equipped),
        status: "active",
        updated_at: new Date().toISOString()
      };
    }

    const { error } = await supabase
      .from("character_inventory_items")
      .insert(payload);

    if (error) {
      setMessage(`Erro ao adicionar ao inventário: ${error.message}`);
      return;
    }

    setForm({
      ...initialForm,
      item_type: form.item_type
    });
    setTechniqueSearch("");
    setMessage(form.item_type === "technique" ? "Técnica adicionada." : "Registro adicionado.");
    loadInventory();
  }

  async function updateQuantity(item, nextQuantity) {
    const quantity = Math.max(1, Number(nextQuantity) || 1);

    const { error } = await supabase
      .from("character_inventory_items")
      .update({
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq("id", item.id);

    if (error) {
      setMessage(`Erro ao atualizar quantidade: ${error.message}`);
      return;
    }

    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, quantity } : entry))
    );
  }

  async function toggleEquipped(item) {
    const { error } = await supabase
      .from("character_inventory_items")
      .update({
        equipped: !item.equipped,
        updated_at: new Date().toISOString()
      })
      .eq("id", item.id);

    if (error) {
      setMessage(`Erro ao atualizar registro: ${error.message}`);
      return;
    }

    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, equipped: !entry.equipped } : entry
      )
    );
  }

  async function removeItem(item) {
    const { error } = await supabase
      .from("character_inventory_items")
      .update({
        status: "archived",
        updated_at: new Date().toISOString()
      })
      .eq("id", item.id);

    if (error) {
      setMessage(`Erro ao remover registro: ${error.message}`);
      return;
    }

    setItems((current) => current.filter((entry) => entry.id !== item.id));
  }

  if (!character) {
    return (
      <div className="inventory-panel">
        <p className="empty-message">Crie seu ninja antes de organizar o inventário.</p>
      </div>
    );
  }

  return (
    <div className="inventory-panel smart-inventory-panel">
      <div className="inventory-header">
        <div>
          <strong>Inventário</strong>
          <span>{items.length} registro(s)</span>
        </div>

        <button type="button" onClick={loadInventory}>
          Atualizar
        </button>
      </div>

      {message && <p className="inventory-message">{message}</p>}

      <div className="inventory-filters smart-inventory-tabs">
        {ITEM_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            className={filter === type.value ? "active" : ""}
            onClick={() => changeType(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      <form className="inventory-form smart-inventory-form" onSubmit={addItem}>
        {form.item_type === "technique" ? (
          <>
            <div className="inventory-wide technique-picker-block technique-search-picker">
              <label className="technique-search-field">
                Buscar técnica na ShinobiDex
                <input
                  value={techniqueSearch}
                  onChange={(event) => {
                    setTechniqueSearch(event.target.value);
                    updateForm("technique_id", "");
                  }}
                  placeholder="Digite o nome da técnica, rank, natureza ou classificação..."
                />
              </label>

              <div className="technique-search-status">
                {isLoadingTechniques ? (
                  <span>Carregando técnicas da ShinobiDex...</span>
                ) : (
                  <span>{techniques.length} técnicas disponíveis</span>
                )}
              </div>

              <div className="technique-search-results">
                {!techniqueSearch.trim() ? (
                  <p>Digite no campo acima para procurar uma técnica.</p>
                ) : visibleTechniques.length === 0 ? (
                  <p>Nenhuma técnica encontrada com esse termo.</p>
                ) : (
                  visibleTechniques.map((technique) => {
                    const isSelected = String(form.technique_id) === String(technique.id);

                    return (
                      <button
                        key={technique.id}
                        type="button"
                        className={isSelected ? "selected" : ""}
                        onClick={() => {
                          updateForm("technique_id", String(technique.id));
                          setTechniqueSearch(getTechniqueName(technique));
                        }}
                      >
                        <strong>{getTechniqueName(technique)}</strong>
                        <small>{getTechniqueMeta(technique) || "Sem metadados identificados"}</small>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedTechnique && (
                <div className="selected-technique-preview">
                  <span>Técnica selecionada</span>
                  <strong>{getTechniqueName(selectedTechnique)}</strong>
                  <small>{getTechniqueMeta(selectedTechnique) || "Sem metadados identificados"}</small>
                </div>
              )}
            </div>

            <label className="inventory-wide">
              Como adquiriu
              <textarea
                value={form.acquisition_method}
                onChange={(event) => updateForm("acquisition_method", event.target.value)}
                placeholder="Ex.: ensinada por Marik; treino aprovado por ADM; recompensa de missão; compra; busca narrada..."
              />
            </label>

            <label>
              Data de aquisição
              <input
                type="date"
                value={form.acquired_at}
                onChange={(event) => updateForm("acquired_at", event.target.value)}
              />
            </label>

            <button type="submit" className="inventory-submit">
              Adicionar técnica possuída
            </button>
          </>
        ) : (
          <>
            <label>
              Nome
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Ex.: Kunai especial, pergaminho, antídoto..."
              />
            </label>

            <label>
              Raridade
              <select
                value={form.rarity}
                onChange={(event) => updateForm("rarity", event.target.value)}
              >
                {RARITIES.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Quantidade
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(event) => updateForm("quantity", event.target.value)}
              />
            </label>

            <label className="inventory-wide">
              Origem
              <input
                value={form.source}
                onChange={(event) => updateForm("source", event.target.value)}
                placeholder="Ex.: missão, treino, compra, recompensa ADM..."
              />
            </label>

            <label className="inventory-wide">
              Descrição
              <textarea
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder="Descreva efeito, uso, restrição ou observação do mestre."
              />
            </label>

            <label className="inventory-check">
              <input
                type="checkbox"
                checked={form.equipped}
                onChange={(event) => updateForm("equipped", event.target.checked)}
              />
              Equipado / Ativo
            </label>

            <button type="submit" className="inventory-submit">
              Adicionar ao inventário
            </button>
          </>
        )}
      </form>

      <div className="inventory-list">
        {isLoading ? (
          <p className="empty-message">Carregando inventário...</p>
        ) : filteredItems.length === 0 ? (
          <p className="empty-message">Nenhum registro encontrado nesta aba.</p>
        ) : (
          filteredItems.map((item) => (
            <article key={item.id} className={`inventory-item-card item-${item.item_type}`}>
              <div className="inventory-item-main">
                <span className={`inventory-type type-${item.item_type}`}>
                  {getTypeLabel(item.item_type)}
                </span>

                <h3>{item.name}</h3>

                {item.item_type === "technique" ? (
                  <>
                    <p>{item.description || "Técnica vinculada à ShinobiDex"}</p>
                    <small>Adquirida em: {item.acquired_at || "data não informada"}</small>
                    <em>Origem: {item.acquisition_method || item.source || "não informada"}</em>
                  </>
                ) : (
                  <>
                    <p>
                      {item.rarity || "comum"}
                      {item.equipped ? " · equipado" : ""}
                    </p>

                    {item.description && <small>{item.description}</small>}
                    {item.source && <em>Origem: {item.source}</em>}
                  </>
                )}
              </div>

              <div className="inventory-item-actions">
                {item.item_type !== "technique" && (
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) => updateQuantity(item, event.target.value)}
                  />
                )}

                {item.item_type !== "technique" && (
                  <button type="button" onClick={() => toggleEquipped(item)}>
                    {item.equipped ? "Desativar" : "Equipar"}
                  </button>
                )}

                <button type="button" className="danger" onClick={() => removeItem(item)}>
                  Remover
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
