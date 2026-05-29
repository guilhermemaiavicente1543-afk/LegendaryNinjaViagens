import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import SkillTreeEditor from "./SkillTreeEditor";
import CouponManager from "./CouponManager";
import AppearanceManager from "./AppearanceManager";
import AdminWorldMap from "./AdminWorldMap";
import ShinobiDexAdmin from "./ShinobiDexAdmin";
import MapPingManager from "./MapPingManager";

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
  return Array.isArray(character?.selected_traits)
    ? character.selected_traits
    : [];
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

            <button type="button" onClick={() => setAdminView("coupons")}>
              Cupons
            </button>

            <button type="button" onClick={() => setAdminView("tree-editor")}>
              Editor da Teia
            </button>
          </div>
        </div>

        <AdminWorldMap travelRows={[]} enablePingPicker />
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
              className={adminView === "map-pings" ? "active" : ""}
              onClick={() => setAdminView("map-pings")}
            >
              Cartografia
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

        <AdminWorldMap travelRows={travelRows} />

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
                      <button
                        type="button"
                        className="admin-action-button"
                        onClick={() => setSelectedCharacterId(character.id)}
                      >
                        Ver perfil
                      </button>
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
      </div>
    </section>
  );
}
