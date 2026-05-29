import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

export default function AppearanceManager() {
  const [characters, setCharacters] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadCharacters() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .order("character_name", { ascending: true });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    setCharacters(data || []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadCharacters();
  }, []);

  const filteredCharacters = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return characters;
    }

    return characters.filter((character) => {
      const searchableText = [
        character.character_name,
        character.player_name,
        character.phone_number,
        character.village_or_organization,
        character.clan_or_kinship,
        character.kekkei_genkai_or_hiden,
        character.ninja_style,
        character.appearance
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [characters, search]);

  return (
    <div className="appearance-manager">
      <div className="appearance-manager-header">
        <div>
          <p className="eyebrow">Registro visual</p>
          <h2>Aparências dos Personagens</h2>
          <p>
            Consulte rapidamente a descrição física dos personagens cadastrados.
          </p>
        </div>

        <button type="button" onClick={loadCharacters}>
          Atualizar
        </button>
      </div>

      <div className="appearance-search-box">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar por personagem, player, vila, clã, estilo ou aparência..."
        />

        <span>
          {filteredCharacters.length} de {characters.length} personagens
        </span>
      </div>

      {message && <p className="auth-message">{message}</p>}

      {isLoading ? (
        <p className="empty-message">Carregando aparências...</p>
      ) : filteredCharacters.length === 0 ? (
        <p className="empty-message">Nenhum personagem encontrado.</p>
      ) : (
        <div className="appearance-grid">
          {filteredCharacters.map((character) => (
            <article key={character.id} className="appearance-card">
              <header>
                {character.icon_url ? (
                  <img
                    src={character.icon_url}
                    alt={character.character_name || "Personagem"}
                  />
                ) : (
                  <div className="appearance-avatar-fallback">
                    {(character.character_name || "N")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <h3>{character.character_name || "Personagem sem nome"}</h3>
                  <span>{character.player_name || "Player não informado"}</span>
                </div>
              </header>

              <div className="appearance-meta">
                <span>
                  <strong>Vila/Org.:</strong>{" "}
                  {character.village_or_organization || "Não informada"}
                </span>

                <span>
                  <strong>Clã:</strong>{" "}
                  {character.clan_or_kinship || "Não informado"}
                </span>

                <span>
                  <strong>Estilo:</strong>{" "}
                  {character.ninja_style || "Não informado"}
                </span>
              </div>

              <div className="appearance-text">
                <strong>Aparência</strong>
                <p>{character.appearance || "Aparência não informada."}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
