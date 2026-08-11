import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import SkillTreeEditor from "./SkillTreeEditor";
import CouponManager from "./CouponManager";
import AppearanceManager from "./AppearanceManager";
import ShinobiDexAdmin from "./ShinobiDexAdmin";
import SystemKnowledgeManager from "./SystemKnowledgeManager";
import MapPingManager from "./MapPingManager";
import AdminWorldMap from "./AdminWorldMap";
import AdminAnnouncementsPanel from "../announcements/AdminAnnouncementsPanel";
import MyNinjaCleanPage from "../MyNinjaCleanPage";
import CharacterSkillTree from "../CharacterSkillTree";
import { dbCharacterToAppCharacter } from "../../lib/characters/characterMappers";
import HallLegendsAdmin from "./HallLegendsAdmin";

function dbTravelToAppTravel(row) {
  return {
    id: row.id,
    characterId: row.character_id,
    characterName: row.character_name || "Ninja sem nome",
    travelMode: row.travel_mode,
    modeLabel: row.mode_label,
    startCoord: row.start_coord,
    endCoord: row.end_coord,
    startCenter: row.start_center,
    endCenter: row.end_center,
    durationHours: Number(row.duration_hours),
    durationDays: Number(row.duration_days),
    distanceFeet: Number(row.distance_feet),
    startedAt: row.started_at,
    arrivalAt: row.arrival_at,
    createdAt: row.created_at
  };
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function getTraitList(character) {
  if (!Array.isArray(character?.selected_traits)) return [];

  return character.selected_traits
    .map((trait) => {
      if (typeof trait === "string") {
        return { id: trait, name: trait };
      }

      return trait;
    })
    .filter((trait) => trait?.name);
}

function getAccountLabel(profile, character) {
  return (
    character?.character_name ||
    profile?.email ||
    profile?.display_name ||
    profile?.id ||
    ""
  );
}

export default function AdminPanel({
  now = Date.now(),
  getCoordinate,
  getTravelCurrentPoint,
  getTravelProgress,
  formatTime
}) {
  const [adminView, setAdminView] = useState("overview");
  const [currentProfile, setCurrentProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [travels, setTravels] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [characterSearch, setCharacterSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAdminData() {
      if (!isSupabaseConfigured || !supabase) {
        setMessage("Supabase não está configurado.");
        setIsLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        setMessage("Sessão não encontrada. Faça login novamente.");
        setIsLoading(false);
        return;
      }

      const { data: myProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profileError) {
        setMessage(profileError.message);
        setIsLoading(false);
        return;
      }

      setCurrentProfile(myProfile);

      if (myProfile?.role !== "admin") {
        setMessage("Acesso restrito ao mestre/administrador.");
        setIsLoading(false);
        return;
      }

      const [profilesResult, charactersResult, travelsResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("characters")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("travels")
            .select("*")
            .order("created_at", { ascending: false })
        ]);

      if (profilesResult.error) {
        setMessage(profilesResult.error.message);
        setIsLoading(false);
        return;
      }

      if (charactersResult.error) {
        setMessage(charactersResult.error.message);
        setIsLoading(false);
        return;
      }

      if (travelsResult.error) {
        setMessage(travelsResult.error.message);
        setIsLoading(false);
        return;
      }

      setProfiles(profilesResult.data || []);
      setCharacters(charactersResult.data || []);
      setTravels((travelsResult.data || []).map(dbTravelToAppTravel));
      setIsLoading(false);
    }

    loadAdminData();
  }, []);

  const profileById = useMemo(() => {
    return profiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
  }, [profiles]);

  const characterById = useMemo(() => {
    return characters.reduce((acc, character) => {
      acc[character.id] = character;
      return acc;
    }, {});
  }, [characters]);

  const travelRows = useMemo(() => {
    return travels.map((travel) => {
      const progress = getTravelProgress ? getTravelProgress(travel, now) : 0;

      const currentPoint = getTravelCurrentPoint
        ? getTravelCurrentPoint(travel, now)
        : null;

      const currentCoord =
        currentPoint && getCoordinate
          ? getCoordinate({
              lat: currentPoint[0],
              lng: currentPoint[1]
            })
          : null;

      const character = characterById[travel.characterId];

      return {
        ...travel,
        progress,
        progressPercent: Math.round(progress * 100),
        currentPoint,
        currentCoord,
        character,
        owner: character ? profileById[character.user_id] : null,
        arrived: progress >= 1
      };
    });
  }, [
    travels,
    now,
    getTravelProgress,
    getTravelCurrentPoint,
    getCoordinate,
    characterById,
    profileById
  ]);

  const regions = useMemo(() => {
    const grouped = {};

    for (const travel of travelRows) {
      const region = travel.currentCoord?.macroLabel || "Sem região";

      if (!grouped[region]) {
        grouped[region] = [];
      }

      grouped[region].push(travel);
    }

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [travelRows]);

  const selectedCharacter = useMemo(() => {
    return characters.find((character) => character.id === selectedCharacterId);
  }, [characters, selectedCharacterId]);

  const selectedOwner = selectedCharacter
    ? profileById[selectedCharacter.user_id]
    : null;

  const selectedTravel = selectedCharacter
    ? travelRows.find((travel) => travel.characterId === selectedCharacter.id)
    : null;

  const selectedRegionPresences =
    selectedTravel?.currentCoord?.macroLabel
      ? travelRows.filter(
          (travel) =>
            travel.currentCoord?.macroLabel === selectedTravel.currentCoord.macroLabel &&
            travel.characterId !== selectedCharacter.id
        )
      : [];

  const filteredCharacters = useMemo(() => {
    const search = characterSearch.trim().toLowerCase();

    if (!search) {
      return characters;
    }

    return characters.filter((character) => {
      const owner = profileById[character.user_id];

      const traitsText = getTraitList(character)
        .map((trait) => trait.name)
        .join(" ");

      const searchableText = [
        character.character_name,
        character.village_or_organization,
        character.clan_or_kinship,
        character.kekkei_genkai_or_hiden,
        character.ninja_style,
        character.age,
        owner?.display_name,
        owner?.email,
        traitsText
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [characters, characterSearch, profileById]);

  const charactersByUserId = useMemo(() => {
    return characters.reduce((acc, character) => {
      const userId = character.user_id;

      if (!userId) return acc;

      if (!acc[userId]) {
        acc[userId] = [];
      }

      acc[userId].push(character);
      return acc;
    }, {});
  }, [characters]);

  const filteredAccounts = useMemo(() => {
    const search = accountSearch.trim().toLowerCase();

    if (!search) return profiles;

    return profiles.filter((profile) => {
      const accountCharacters = charactersByUserId[profile.id] || [];
      const searchableText = [
        profile.display_name,
        profile.email,
        profile.role,
        ...accountCharacters.map((character) => character.character_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [profiles, accountSearch, charactersByUserId]);

  const selectedNinjaCharacter = useMemo(() => {
    if (!selectedCharacter) return null;

    return dbCharacterToAppCharacter(selectedCharacter, {
      id: selectedOwner?.id || selectedCharacter.user_id,
      email: selectedOwner?.email || "",
    });
  }, [selectedCharacter, selectedOwner]);

  async function saveAdminNinja(nextCharacter) {
    if (!selectedCharacter?.id || !nextCharacter) return;

    const selectedTraits = Array.isArray(nextCharacter.selectedTraits)
      ? nextCharacter.selectedTraits.filter(Boolean)
      : [];

    const nextProfileSheet = {
      ...(selectedCharacter.profile_sheet || {}),
      playerName: nextCharacter.playerName || "",
      phone: nextCharacter.phone || "",
      characterName: nextCharacter.characterName || "",
      age: nextCharacter.age || "",
      clanOrKinship: nextCharacter.clanOrKinship || "",
      villageOrOrganization: nextCharacter.villageOrOrganization || "",
      kekkeiGenkaiOrHiden: nextCharacter.kekkeiGenkaiOrHiden || "",
      epithet: nextCharacter.epithet || "",
      appearance: nextCharacter.appearance || "",
      history: nextCharacter.history || "",
      equipment: nextCharacter.equipment || "",
      selectedTraits,
      uniqueTrait: selectedTraits[0] || nextCharacter.uniqueTrait || "",
      characterPhotoUrl: nextCharacter.characterPhotoUrl || "",
      mapIconUrl: nextCharacter.mapIconUrl || "",
    };

    const payload = {
      player_name: nextCharacter.playerName || "",
      phone: nextCharacter.phone || "",
      character_name: nextCharacter.characterName || "",
      age: nextCharacter.age || "",
      clan_or_kinship: nextCharacter.clanOrKinship || "",
      village_or_organization: nextCharacter.villageOrOrganization || "",
      kekkei_genkai_or_hiden: nextCharacter.kekkeiGenkaiOrHiden || "",
      epithet: nextCharacter.epithet || "",
      appearance: nextCharacter.appearance || "",
      history: nextCharacter.history || "",
      equipment: nextCharacter.equipment || "",
      unique_trait: selectedTraits[0] || nextCharacter.uniqueTrait || "",
      selected_traits: selectedTraits,
      character_photo_url: nextCharacter.characterPhotoUrl || "",
      map_icon_url: nextCharacter.mapIconUrl || "",
      profile_sheet: nextProfileSheet,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("characters")
      .update(payload)
      .eq("id", selectedCharacter.id)
      .select("*")
      .single();

    if (error) {
      setMessage(`Não foi possível salvar o Meu Ninja: ${error.message}`);
      return;
    }

    setCharacters((current) =>
      current.map((character) =>
        character.id === selectedCharacter.id ? data : character
      )
    );
    setMessage(`Meu Ninja de ${data.character_name} atualizado pelo ADM.`);
  }

  function openDeleteAccount(profile, character = null) {
    setAccountToDelete({
      profile,
      character,
      confirmationLabel: getAccountLabel(profile, character),
    });
    setDeleteConfirmation("");
    setMessage("");
  }

  function closeDeleteAccount() {
    if (deletingUserId) return;
    setAccountToDelete(null);
    setDeleteConfirmation("");
  }

  async function confirmDeleteAccount() {
    const targetProfile = accountToDelete?.profile;
    const expectedConfirmation = accountToDelete?.confirmationLabel || "";

    if (!targetProfile?.id || deleteConfirmation.trim() !== expectedConfirmation) {
      return;
    }

    setDeletingUserId(targetProfile.id);
    setMessage("");

    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { userId: targetProfile.id },
    });

    if (error || data?.error) {
      let detail = data?.error || error?.message || "Falha desconhecida.";

      if (error?.context && typeof error.context.json === "function") {
        try {
          const responseBody = await error.context.json();
          detail = responseBody?.error || detail;
        } catch {
          // Mantém a mensagem original quando a resposta não é JSON.
        }
      }

      setMessage(`Não foi possível excluir a conta: ${detail}`);
      setDeletingUserId("");
      return;
    }

    const deletedCharacterIds = new Set(
      (charactersByUserId[targetProfile.id] || []).map((character) => character.id)
    );

    setProfiles((current) =>
      current.filter((profile) => profile.id !== targetProfile.id)
    );
    setCharacters((current) =>
      current.filter((character) => character.user_id !== targetProfile.id)
    );
    setTravels((current) =>
      current.filter((travel) => !deletedCharacterIds.has(travel.characterId))
    );

    if (deletedCharacterIds.has(selectedCharacterId)) {
      setSelectedCharacterId("");
      setAdminView("overview");
    }

    setMessage(`Conta ${expectedConfirmation} excluída com sucesso.`);
    setDeletingUserId("");
    setAccountToDelete(null);
    setDeleteConfirmation("");
  }

  if (isLoading) {
    return (
      <section className="admin-page">
        <div className="admin-card">
          <p className="eyebrow">Painel do Mestre</p>
          <h1>Carregando...</h1>
          <p>Buscando dados dos ninjas, players e viagens.</p>
        </div>
      </section>
    );
  }

  if (currentProfile?.role !== "admin") {
    return (
      <section className="admin-page">
        <div className="admin-card">
          <p className="eyebrow">Acesso restrito</p>
          <h1>Painel ADM</h1>
          <p>{message || "Você não possui permissão de administrador."}</p>
        </div>
      </section>
    );
  }

  if (adminView === "player-ninja" && selectedCharacter && selectedNinjaCharacter) {
    return (
      <section className="admin-ninja-access-page">
        <header className="admin-ninja-access-header">
          <div>
            <p className="eyebrow">Acesso administrativo</p>
            <h1>Meu Ninja de {selectedCharacter.character_name}</h1>
            <p>
              Player: {selectedOwner?.display_name || selectedOwner?.email || "Desconhecido"}
            </p>
          </div>

          <button type="button" onClick={() => setAdminView("overview")}>
            Voltar ao Painel ADM
          </button>
        </header>

        {message && <p className="admin-ninja-access-message">{message}</p>}

        <MyNinjaCleanPage
          character={selectedNinjaCharacter}
          persistLocally={false}
          onNavigate={() => setAdminView("overview")}
          onSaveSheet={saveAdminNinja}
          locationSlot={(
            <AdminWorldMap
              characterRows={[selectedCharacter]}
              travelRows={selectedTravel ? [selectedTravel] : []}
              title={`Localização de ${selectedCharacter.character_name}`}
              description="Visão administrativa da posição salva e da viagem ativa deste personagem."
            />
          )}
          skillTreeSlot={(
            <CharacterSkillTree
              character={selectedCharacter}
              onCharacterUpdated={(updatedCharacter) => {
                setCharacters((current) =>
                  current.map((character) =>
                    character.id === updatedCharacter.id
                      ? { ...character, ...updatedCharacter }
                      : character
                  )
                );
              }}
            />
          )}
        />
      </section>
    );
  }


  if (adminView === "hall-legends") {
    return (
      <section className="admin-page">
        <div className="admin-card admin-card-wide">
          <p className="eyebrow">Painel do Mestre</p>
          <h1>Editor do Hall das Lendas</h1>
          <p>
            Edite os textos exibidos nos dossiês e gerencie
            as fotografias oficiais de cada lenda.
          </p>

          <div className="admin-mode-tabs">
            <button
              type="button"
              onClick={() => setAdminView("overview")}
            >
              Visão Geral
            </button>

            <button
              type="button"
              className="active"
              onClick={() => setAdminView("hall-legends")}
            >
              Hall das Lendas
            </button>
          </div>
        </div>

        <HallLegendsAdmin />
      </section>
    );
  }

  if (adminView === "announcements") {
    return (
      <section className="admin-page">
        <div className="admin-card admin-card-wide">
          <p className="eyebrow">Painel do Mestre</p>
          <h1>Novidades do Hall</h1>
          <p>
            Publique e organize os avisos exibidos no pergaminho
            de novidades da entrada do LN Digital.
          </p>

          <div className="admin-mode-tabs">
            <button
              type="button"
              onClick={() => setAdminView("overview")}
            >
              Visão Geral
            </button>

            <button
              type="button"
              className="active"
              onClick={() => setAdminView("announcements")}
            >
              Novidades
            </button>
          </div>
        </div>

        <AdminAnnouncementsPanel />
      </section>
    );
  }

  if (adminView === "appearances") {
    return (
      <section className="admin-page">
        <div className="admin-card admin-card-wide">
          <p className="eyebrow">Painel do Mestre</p>
          <h1>Aparências</h1>

          <div className="admin-mode-tabs">
            <button
              type="button"
              className={adminView === "map-pings" ? "active" : ""}
              onClick={() => setAdminView("map-pings")}
            >
              Cartografia
            </button>

          <button
            type="button"
            className={adminView === "system-knowledge" ? "active" : ""}
            onClick={() => setAdminView("system-knowledge")}
          >
            Base de Sistemas
          </button>


            <button
              type="button"
              onClick={() => setAdminView("overview")}
            >
              Visão Geral
            </button>

            <button
              type="button"
              className="active"
              onClick={() => setAdminView("appearances")}
            >
              Aparências
            </button>

            <button
              type="button"
              onClick={() => setAdminView("coupons")}
            >
              Cupons
            </button>

            <button
              type="button"
              onClick={() => setAdminView("tree-editor")}
            >
              Editor da Teia
            </button>
          </div>
        </div>

        <AppearanceManager />
      </section>
    );
  }

  if (adminView === "coupons") {
    return (
      <section className="admin-page">
        <div className="admin-card admin-card-wide">
          <p className="eyebrow">Painel do Mestre</p>
          <h1>Cupons de Pontos</h1>

          <div className="admin-mode-tabs">
            <button
              type="button"
              className={adminView === "map-pings" ? "active" : ""}
              onClick={() => setAdminView("map-pings")}
            >
              Cartografia
            </button>

          <button
            type="button"
            className={adminView === "system-knowledge" ? "active" : ""}
            onClick={() => setAdminView("system-knowledge")}
          >
            Base de Sistemas
          </button>


            <button
              type="button"
              onClick={() => setAdminView("overview")}
            >
              Visão Geral
            </button>

            <button
              type="button"
              className="active"
              onClick={() => setAdminView("coupons")}
            >
              Cupons
            </button>

            <button
              type="button"
              onClick={() => setAdminView("tree-editor")}
            >
              Editor da Teia
            </button>
          </div>
        </div>

        <CouponManager />
      </section>
    );
  }

  if (adminView === "shinobidex") {
    return (
      <section className="admin-page">
        <div className="admin-card admin-card-wide">
          <p className="eyebrow">Painel do Mestre</p>
          <h1>ShinobiDex ADM</h1>
          <p>
            Revise, corrija e aprove as técnicas importadas para a biblioteca oficial do RPG.
          </p>

          <div className="admin-mode-tabs">
            <button
              type="button"
              className={adminView === "map-pings" ? "active" : ""}
              onClick={() => setAdminView("map-pings")}
            >
              Cartografia
            </button>

          <button
            type="button"
            className={adminView === "system-knowledge" ? "active" : ""}
            onClick={() => setAdminView("system-knowledge")}
          >
            Base de Sistemas
          </button>


            <button
              type="button"
              onClick={() => setAdminView("overview")}
            >
              Visão Geral
            </button>

            <button
              type="button"
              onClick={() => setAdminView("appearances")}
            >
              Aparências
            </button>

            <button
              type="button"
              className="active"
              onClick={() => setAdminView("shinobidex")}
            >
              ShinobiDex
            </button>

            <button
              type="button"
              onClick={() => setAdminView("coupons")}
            >
              Cupons
            </button>

            <button
              type="button"
              onClick={() => setAdminView("tree-editor")}
            >
              Editor da Teia
            </button>
          </div>
        </div>

        <ShinobiDexAdmin />
      </section>
    );
  }

  if (adminView === "system-knowledge") {
    return (
      <section className="admin-page">
        <div className="admin-card admin-card-wide">
          <p className="eyebrow">Painel do Mestre</p>
          <h1>Base de Sistemas</h1>
          <p>
            Cadastre os sistemas oficiais que serão usados pelo Pergaminho de Dúvidas dos players.
          </p>

          <div className="admin-mode-tabs">
            <button type="button" onClick={() => setAdminView("overview")}>
              Visão Geral
            </button>

            <button type="button" onClick={() => setAdminView("appearances")}>
              Aparências
            </button>

            <button type="button" onClick={() => setAdminView("shinobidex")}>
              ShinobiDex
            </button>

            <button type="button" onClick={() => setAdminView("map-pings")}>
              Cartografia
            </button>

            <button type="button" className="active" onClick={() => setAdminView("system-knowledge")}>
              Base de Sistemas
            </button>

            <button type="button" onClick={() => setAdminView("coupons")}>
              Cupons
            </button>

            <button type="button" onClick={() => setAdminView("tree-editor")}>
              Editor da Teia
            </button>
          </div>
        </div>

        <SystemKnowledgeManager />
      </section>
    );
  }

  if (adminView === "map-pings") {
    return (
      <section className="admin-page">
        <div className="admin-card admin-card-wide">
          <p className="eyebrow">Painel do Mestre</p>
          <h1>Cartografia ADM</h1>
          <p>
            Crie e gerencie pings oficiais do mapa: vilas, países, bases, ruínas,
            eventos e locais importantes do mundo ninja.
          </p>

          <div className="admin-mode-tabs">
            <button type="button" onClick={() => setAdminView("overview")}>
              Visão Geral
            </button>

            <button type="button" onClick={() => setAdminView("appearances")}>
              Aparências
            </button>

            <button type="button" onClick={() => setAdminView("shinobidex")}>
              ShinobiDex
            </button>

            <button type="button" className="active" onClick={() => setAdminView("map-pings")}>
              Cartografia
            </button>

          <button
            type="button"
            className={adminView === "system-knowledge" ? "active" : ""}
            onClick={() => setAdminView("system-knowledge")}
          >
            Base de Sistemas
          </button>


            <button type="button" onClick={() => setAdminView("coupons")}>
              Cupons
            </button>

            <button type="button" onClick={() => setAdminView("tree-editor")}>
              Editor da Teia
            </button>
          </div>
        </div>
        <MapPingManager />
      </section>
    );
  }

  if (adminView === "tree-editor") {
    return (
      <section className="admin-page">
        <div className="admin-card admin-card-wide">
          <p className="eyebrow">Painel do Mestre</p>
          <h1>Editor da Teia</h1>
          <p>
            Crie, mova, conecte e edite as habilidades da teia principal do LN Digital.
          </p>

          <div className="admin-mode-tabs">
            <button
              type="button"
              className={adminView === "map-pings" ? "active" : ""}
              onClick={() => setAdminView("map-pings")}
            >
              Cartografia
            </button>

          <button
            type="button"
            className={adminView === "system-knowledge" ? "active" : ""}
            onClick={() => setAdminView("system-knowledge")}
          >
            Base de Sistemas
          </button>


            <button
              type="button"
              onClick={() => setAdminView("overview")}
            >
              Visão Geral
            </button>

            <button
              type="button"
              onClick={() => setAdminView("coupons")}
            >
              Cupons
            </button>

            <button
              type="button"
              className="active"
              onClick={() => setAdminView("tree-editor")}
            >
              Editor da Teia
            </button>
          </div>
        </div>

        <SkillTreeEditor />
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="admin-card">
        <p className="eyebrow">Painel do Mestre</p>
        <h1>Painel ADM</h1>
        <p>
          Área do mestre para visualizar ninjas cadastrados, players, viagens
          ativas e localização real dos personagens.
        </p>

        <div className="admin-mode-tabs">
          <button
            type="button"
            className={adminView === "announcements" ? "active" : ""}
            onClick={() => setAdminView("announcements")}
          >
            Novidades
          </button>

            <button
              type="button"
              className={adminView === "map-pings" ? "active" : ""}
              onClick={() => setAdminView("map-pings")}
            >
              Cartografia
            </button>

          <button
            type="button"
            className={adminView === "system-knowledge" ? "active" : ""}
            onClick={() => setAdminView("system-knowledge")}
          >
            Base de Sistemas
          </button>


          <button
            type="button"
            className={adminView === "overview" ? "active" : ""}
            onClick={() => setAdminView("overview")}
          >
            Visão Geral
          </button>

          <button
            type="button"
            className={adminView === "appearances" ? "active" : ""}
            onClick={() => setAdminView("appearances")}
          >
            Aparências
          </button>

          <button
            type="button"
            className={adminView === "shinobidex" ? "active" : ""}
            onClick={() => setAdminView("shinobidex")}
          >
            ShinobiDex
          </button>

          <button
            type="button"
            className={adminView === "coupons" ? "active" : ""}
            onClick={() => setAdminView("coupons")}
          >
            Cupons
          </button>

          <button
            type="button"
            className={adminView === "tree-editor" ? "active" : ""}
            onClick={() => setAdminView("tree-editor")}
          >
            Editor da Teia
          </button>
          <button
            type="button"
            className={adminView === "hall-legends" ? "active" : ""}
            onClick={() => setAdminView("hall-legends")}
          >
            Hall das Lendas
          </button>
        </div>

        {message && <p className="auth-message">{message}</p>}

        <div className="admin-stats">
          <article>
            <strong>{profiles.length}</strong>
            <span>Players cadastrados</span>
          </article>

          <article>
            <strong>{characters.length}</strong>
            <span>Ninjas criados</span>
          </article>

          <article>
            <strong>{travels.length}</strong>
            <span>Viagens registradas</span>
          </article>

          <article>
            <strong>{regions.length}</strong>
            <span>Regiões ocupadas</span>
          </article>
        </div>

        <div className="admin-section">
          <h2>Contas e jogadores</h2>
          <p>
            Abra o Meu Ninja completo de qualquer jogador ou exclua uma conta.
            Senhas nunca são exibidas ao administrador.
          </p>

          <div className="admin-search-box">
            <input
              value={accountSearch}
              onChange={(event) => setAccountSearch(event.target.value)}
              placeholder="Pesquisar por player, e-mail ou personagem..."
            />

            <span>{filteredAccounts.length} de {profiles.length} contas</span>
          </div>

          {filteredAccounts.length === 0 ? (
            <p className="empty-message">Nenhuma conta encontrada.</p>
          ) : (
            <div className="admin-table">
              {filteredAccounts.map((profile) => {
                const accountCharacters = charactersByUserId[profile.id] || [];
                const accountCharacter = accountCharacters[0] || null;
                const isCurrentAccount = profile.id === currentProfile.id;
                const isProtectedAdmin = profile.role === "admin";

                return (
                  <article key={profile.id} className="admin-row admin-account-row">
                    <div>
                      <strong>
                        {profile.display_name || accountCharacter?.player_name || "Player sem nome"}
                      </strong>
                      <span>{profile.email || "E-mail não disponível"}</span>
                    </div>

                    <div>
                      <small>Meu Ninja</small>
                      <span>{accountCharacter?.character_name || "Nenhum ninja vinculado"}</span>
                    </div>

                    <div>
                      <small>Tipo de conta</small>
                      <span>{isProtectedAdmin ? "Administrador" : "Jogador"}</span>
                    </div>

                    <div className="admin-account-actions">
                      <button
                        type="button"
                        className="admin-action-button"
                        disabled={!accountCharacter}
                        onClick={() => {
                          setSelectedCharacterId(accountCharacter.id);
                          setAdminView("player-ninja");
                          setMessage("");
                        }}
                      >
                        Abrir Meu Ninja
                      </button>

                      <button
                        type="button"
                        className="admin-danger-button"
                        disabled={isCurrentAccount || isProtectedAdmin}
                        onClick={() => openDeleteAccount(profile, accountCharacter)}
                        title={
                          isCurrentAccount
                            ? "Você não pode excluir a conta usada nesta sessão."
                            : isProtectedAdmin
                              ? "Contas administrativas são protegidas."
                              : "Excluir conta"
                        }
                      >
                        {isCurrentAccount ? "Conta atual" : isProtectedAdmin ? "Protegida" : "Excluir conta"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        {selectedCharacter && (
          <div className="admin-profile-view">
            <div className="admin-profile-header">
              <div>
                <p className="eyebrow">Perfil completo</p>
                <h2>{selectedCharacter.character_name}</h2>
                <p>
                  Player:{" "}
                  {selectedOwner?.display_name ||
                    selectedOwner?.email ||
                    "Desconhecido"}
                </p>
              </div>

              <button type="button" onClick={() => setSelectedCharacterId("")}>
                Fechar perfil
              </button>
            </div>

            <div className="admin-profile-grid">
              <article>
                <strong>Idade</strong>
                <span>{selectedCharacter.age || "Não informada"}</span>
              </article>

              <article>
                <strong>Aldeia/Organização</strong>
                <span>
                  {selectedCharacter.village_or_organization || "Não informada"}
                </span>
              </article>

              <article>
                <strong>Clã/Parentesco</strong>
                <span>{selectedCharacter.clan_or_kinship || "Não informado"}</span>
              </article>

              <article>
                <strong>Kekkei Genkai/Hiden</strong>
                <span>{selectedCharacter.kekkei_genkai_or_hiden || "Nenhum"}</span>
              </article>

              <article>
                <strong>Estilo Ninja</strong>
                <span>{selectedCharacter.ninja_style || "Não definido"}</span>
              </article>

              <article>
                <strong>Criado em</strong>
                <span>{formatDateTime(selectedCharacter.created_at)}</span>
              </article>
            </div>

            <div className="admin-profile-section">
              <h3>Aparência</h3>
              <p>{selectedCharacter.appearance || "Não informada."}</p>
            </div>

            <div className="admin-profile-section">
              <h3>História</h3>
              <p>{selectedCharacter.history || "Não informada."}</p>
            </div>

            <div className="admin-profile-section">
              <h3>Equipamentos</h3>
              <p>{selectedCharacter.equipment || "Nenhum equipamento informado."}</p>
            </div>

            <div className="admin-profile-section">
              <h3>Traços Únicos</h3>

              {getTraitList(selectedCharacter).length === 0 ? (
                <p>Nenhum traço selecionado.</p>
              ) : (
                <div className="admin-traits-list">
                  {getTraitList(selectedCharacter).map((trait) => (
                    <span key={trait.id || trait.name}>{trait.name}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-profile-section">
              <h3>Localização e Viagem</h3>

              {!selectedTravel ? (
                <p>Este ninja não possui viagem ativa registrada.</p>
              ) : (
                <div className="admin-profile-grid">
                  <article>
                    <strong>Status</strong>
                    <span>
                      {selectedTravel.arrived ? "Chegou ao destino" : "Em viagem"}
                    </span>
                  </article>

                  <article>
                    <strong>Região atual</strong>
                    <span>{selectedTravel.currentCoord?.macroLabel || "-"}</span>
                  </article>

                  <article>
                    <strong>Coordenada atual</strong>
                    <span>{selectedTravel.currentCoord?.label || "-"}</span>
                  </article>

                  <article>
                    <strong>Progresso</strong>
                    <span>{selectedTravel.progressPercent}%</span>
                  </article>

                  <article>
                    <strong>Rota</strong>
                    <span>
                      {selectedTravel.startCoord?.label} →{" "}
                      {selectedTravel.endCoord?.label}
                    </span>
                  </article>

                  <article>
                    <strong>Chegada prevista</strong>
                    <span>{formatDateTime(selectedTravel.arrivalAt)}</span>
                  </article>

                  <article>
                    <strong>Tempo restante</strong>
                    <span>
                      {selectedTravel.arrived
                        ? "Viagem concluída"
                        : formatTime
                          ? formatTime(
                              selectedTravel.durationHours *
                                (1 - selectedTravel.progress)
                            )
                          : "-"}
                    </span>
                  </article>

                  <article>
                    <strong>Presenças reais na região</strong>
                    <span>{selectedRegionPresences.length}</span>
                  </article>
                </div>
              )}

              {selectedRegionPresences.length > 0 && (
                <div className="admin-region-presences">
                  <strong>Outros personagens na mesma região:</strong>

                  {selectedRegionPresences.map((presence) => (
                    <span key={presence.id}>
                      {presence.characterName} —{" "}
                      {presence.currentCoord?.macroLabel || "-"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="admin-section">
          <h2>Ninjas cadastrados</h2>

          <div className="admin-search-box">
            <input
              value={characterSearch}
              onChange={(event) => setCharacterSearch(event.target.value)}
              placeholder="Pesquisar por ninja, player, aldeia, clã, estilo, kekkei genkai ou traço..."
            />

            <span>
              {filteredCharacters.length} de {characters.length} ninjas
            </span>
          </div>

          {characters.length === 0 ? (
            <p className="empty-message">Nenhum ninja criado ainda.</p>
          ) : filteredCharacters.length === 0 ? (
            <p className="empty-message">Nenhum ninja encontrado para essa busca.</p>
          ) : (
            <div className="admin-table">
              {filteredCharacters.map((character) => {
                const owner = profileById[character.user_id];

                return (
                  <article key={character.id} className="admin-row ninja-row">
                    <div>
                      <strong>{character.character_name}</strong>
                      <span>
                        {character.village_or_organization || "Sem aldeia"} •{" "}
                        {character.ninja_style || "Sem estilo"}
                      </span>
                    </div>

                    <div>
                      <small>Player</small>
                      <span>
                        {owner?.display_name || owner?.email || "Desconhecido"}
                      </span>
                    </div>

                    <div>
                      <small>Traços</small>
                      <span>{getTraitList(character).length}</span>
                    </div>

                    <div>
                      <div className="admin-account-actions">
                        <button
                          type="button"
                          className="admin-action-button"
                          onClick={() => setSelectedCharacterId(character.id)}
                        >
                          Ver resumo
                        </button>

                        <button
                          type="button"
                          className="admin-action-button admin-action-button-secondary"
                          onClick={() => {
                            setSelectedCharacterId(character.id);
                            setAdminView("player-ninja");
                            setMessage("");
                          }}
                        >
                          Abrir Meu Ninja
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="admin-section">
          <h2>Viagens ativas e localização real</h2>

          {travelRows.length === 0 ? (
            <p className="empty-message">Nenhuma viagem registrada ainda.</p>
          ) : (
            <div className="admin-table">
              {travelRows.map((travel) => (
                <article key={travel.id} className="admin-row">
                  <div>
                    <strong>{travel.characterName}</strong>
                    <span>
                      {travel.arrived ? "Chegou ao destino" : "Em viagem"} •{" "}
                      {travel.progressPercent}%
                    </span>
                  </div>

                  <div>
                    <small>Região atual</small>
                    <span>{travel.currentCoord?.macroLabel || "-"}</span>
                  </div>

                  <div>
                    <small>Coordenada</small>
                    <span>{travel.currentCoord?.label || "-"}</span>
                  </div>

                  <div>
                    <small>Rota</small>
                    <span>
                      {travel.startCoord?.label} → {travel.endCoord?.label}
                    </span>
                  </div>

                  <div>
                    <small>Chegada</small>
                    <span>{formatDateTime(travel.arrivalAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="admin-section">
          <h2>Personagens por região</h2>

          {regions.length === 0 ? (
            <p className="empty-message">Nenhuma região ocupada.</p>
          ) : (
            <div className="region-grid">
              {regions.map(([region, regionTravels]) => (
                <article key={region} className="region-card">
                  <strong>Região {region}</strong>

                  {regionTravels.map((travel) => (
                    <span key={travel.id}>
                      {travel.characterName} —{" "}
                      {travel.arrived ? "parado/destino" : "em viagem"}
                    </span>
                  ))}
                </article>
              ))}
            </div>
          )}
        </div>

        {accountToDelete && (
          <div
            className="admin-delete-overlay"
            role="presentation"
            onClick={closeDeleteAccount}
          >
            <section
              className="admin-delete-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-delete-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="eyebrow">Ação irreversível</p>
              <h2 id="admin-delete-title">Excluir esta conta?</h2>
              <p>
                A autenticação, o personagem, as viagens, a teia, o inventário e
                os arquivos vinculados serão removidos. A senha nunca é acessada.
              </p>

              <label>
                Para confirmar, digite exatamente:
                <strong>{accountToDelete.confirmationLabel}</strong>
                <input
                  autoFocus
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  disabled={Boolean(deletingUserId)}
                />
              </label>

              <div className="admin-delete-actions">
                <button
                  type="button"
                  className="admin-cancel-button"
                  onClick={closeDeleteAccount}
                  disabled={Boolean(deletingUserId)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="admin-danger-button"
                  onClick={confirmDeleteAccount}
                  disabled={
                    Boolean(deletingUserId) ||
                    deleteConfirmation.trim() !== accountToDelete.confirmationLabel
                  }
                >
                  {deletingUserId ? "Excluindo..." : "Excluir permanentemente"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
