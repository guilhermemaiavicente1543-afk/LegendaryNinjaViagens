import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const ITEM_TYPES = [
  { value: "technique", label: "Técnica" },
  { value: "equipment", label: "Equipamento" },
  { value: "consumable", label: "Consumível" },
  { value: "resource", label: "Recurso" },
  { value: "special", label: "Especial" },
  { value: "note", label: "Anotação" }
];

const RARITIES = ["comum", "incomum", "raro", "épico", "lendário"];

const initialForm = {
  item_type: "item",
  name: "",
  category: "",
  rarity: "comum",
  quantity: 1,
  description: "",
  source: "",
  equipped: false
};

function getTypeLabel(type) {
  return ITEM_TYPES.find((item) => item.value === type)?.label || "Item";
}

export default function CharacterInventoryPanel({ user, character }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState("technique");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;

    return items.filter((item) => item.item_type === filter);
  }, [items, filter]);

  useEffect(() => {
    loadInventory();
  }, [character?.id, user?.id]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
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

    if (!user?.id) {
      setMessage("Você precisa estar logado.");
      return;
    }

    if (!character?.id) {
      setMessage("Crie seu ninja antes de usar o inventário.");
      return;
    }

    if (!form.name.trim()) {
      setMessage("Informe o nome do item.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    const payload = {
      user_id: user.id,
      character_id: character.id,
      item_type: form.item_type,
      name: form.name.trim(),
      category: form.category.trim(),
      rarity: form.rarity,
      quantity: Number(form.quantity) || 1,
      description: form.description.trim(),
      source: form.source.trim(),
      equipped: Boolean(form.equipped),
      status: "active",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("character_inventory_items")
      .insert(payload);

    if (error) {
      setMessage(`Erro ao adicionar item: ${error.message}`);
      return;
    }

    setForm(initialForm);
    setMessage("Item adicionado ao inventário.");
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
      current.map((entry) =>
        entry.id === item.id ? { ...entry, quantity } : entry
      )
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
      setMessage(`Erro ao equipar item: ${error.message}`);
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
      setMessage(`Erro ao remover item: ${error.message}`);
      return;
    }

    setItems((current) => current.filter((entry) => entry.id !== item.id));
  }

  if (!character) {
    return (
      <div className="inventory-panel">
        <p className="empty-message">
          Crie seu ninja antes de organizar o inventário.
        </p>
      </div>
    );
  }

  return (
    <div className="inventory-panel">
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

      <div className="inventory-filters">
        <button
          type="button"
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Todos
        </button>

        {ITEM_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            className={filter === type.value ? "active" : ""}
            onClick={() => setFilter(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      <form className="inventory-form" onSubmit={addItem}>
        <label>
          Tipo
          <select
            value={form.item_type}
            onChange={(event) => updateForm("item_type", event.target.value)}
          >
            {ITEM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Nome
          <input
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            placeholder="Ex.: Kunai especial, Katon, pergaminho..."
          />
        </label>

        <label>
          Categoria
          <input
            value={form.category}
            onChange={(event) => updateForm("category", event.target.value)}
            placeholder="Ex.: arma, jutsu, cura, missão..."
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
      </form>

      <div className="inventory-list">
        {isLoading ? (
          <p className="empty-message">Carregando inventário...</p>
        ) : filteredItems.length === 0 ? (
          <p className="empty-message">Nenhum item encontrado.</p>
        ) : (
          filteredItems.map((item) => (
            <article key={item.id} className="inventory-item-card">
              <div className="inventory-item-main">
                <span className={`inventory-type type-${item.item_type}`}>
                  {getTypeLabel(item.item_type)}
                </span>

                <h3>{item.name}</h3>

                <p>
                  {item.category || "Sem categoria"} · {item.rarity}
                  {item.equipped ? " · equipado" : ""}
                </p>

                {item.description && <small>{item.description}</small>}
                {item.source && <em>Origem: {item.source}</em>}
              </div>

              <div className="inventory-item-actions">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item, event.target.value)}
                />

                <button type="button" onClick={() => toggleEquipped(item)}>
                  {item.equipped ? "Desativar" : "Equipar"}
                </button>

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
