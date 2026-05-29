import { useEffect, useState } from "react";
import CharacterSkillTree from "./CharacterSkillTree";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

function dbToLocalCharacter(character) {
  return {
    id: character.id,
    characterName: character.character_name || "",
    age: character.age || "",
    appearance: character.appearance || "",
    clanOrKinship: character.clan_or_kinship || "",
    history: character.history || "",
    villageOrOrganization: character.village_or_organization || "",
    kekkeiGenkaiOrHiden: character.kekkei_genkai_or_hiden || "",
    equipment: character.equipment || "",
    ninjaStyle: character.ninja_style || "",
    selectedTraits: Array.isArray(character.selected_traits)
      ? character.selected_traits
      : [],
    skill_points: character.skill_points ?? 50,
    createdAt: character.created_at
  };
}

function syncCharacterToLocalStorage(character) {
  if (!character) return;

  localStorage.setItem(
    "legendary-ninja-characters",
    JSON.stringify([dbToLocalCharacter(character)])
  );
}

export default function SkillTreePage() {
  const [user, setUser] = useState(null);
  const [character, setCharacter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlayerTree() {
      if (!isSupabaseConfigured || !supabase) {
        setMessage("Supabase não está configurado.");
        setIsLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        setMessage("Faça login para acessar a teia do personagem.");
        setIsLoading(false);
        return;
      }

      setUser(userData.user);

      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setMessage("Você precisa criar seu ninja em Meu Ninja antes de usar a teia.");
        setIsLoading(false);
        return;
      }

      setCharacter(data);
      syncCharacterToLocalStorage(data);
      setIsLoading(false);
    }

    loadPlayerTree();
  }, []);

  return (
    <section className="skill-tree-page player-skill-tree-page">
      <div className="skill-tree-toolbar player-skill-tree-toolbar">
        <div>
          <p className="eyebrow">LN Digital</p>
          <h1>Teia de Habilidades</h1>
          <p>
            Use seus pontos para desbloquear habilidades do seu personagem.
            Cupons emitidos pelos ADMs podem ser resgatados aqui.
          </p>
        </div>

        {character && (
          <div className="skill-legend">
            <span className="legend unlocked">
              {character.character_name}
            </span>
            <span className="legend available">
              {character.skill_points ?? 50} pontos
            </span>
          </div>
        )}
      </div>

      {message && <p className="auth-message">{message}</p>}

      {isLoading ? (
        <div className="tree-editor-loading">
          <p className="eyebrow">Carregando</p>
          <h2>Buscando árvore do personagem...</h2>
        </div>
      ) : character ? (
        <div className="player-tree-wrapper">
          <CharacterSkillTree
            character={character}
            onCharacterUpdated={(updatedCharacter) => {
              setCharacter(updatedCharacter);
              syncCharacterToLocalStorage(updatedCharacter);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
