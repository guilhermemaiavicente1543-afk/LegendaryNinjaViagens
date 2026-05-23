import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

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

export default function AdminPanel({
  now = Date.now(),
  getCoordinate,
  getTravelCurrentPoint,
  getTravelProgress,
  formatTime
}) {
  const [currentProfile, setCurrentProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [travels, setTravels] = useState([]);
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

      const [profilesResult, charactersResult, travelsResult] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("characters").select("*").order("created_at", { ascending: false }),
        supabase.from("travels").select("*").order("created_at", { ascending: false })
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

  return (
    <section className="admin-page">
      <div className="admin-card">
        <p className="eyebrow">Painel do Mestre</p>
        <h1>Painel ADM</h1>
        <p>
          Área do mestre para visualizar ninjas cadastrados, players, viagens
          ativas e localização real dos personagens.
        </p>

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
          <h2>Ninjas cadastrados</h2>

          {characters.length === 0 ? (
            <p className="empty-message">Nenhum ninja criado ainda.</p>
          ) : (
            <div className="admin-table">
              {characters.map((character) => {
                const owner = profileById[character.user_id];

                return (
                  <article key={character.id} className="admin-row">
                    <div>
                      <strong>{character.character_name}</strong>
                      <span>
                        {character.village_or_organization || "Sem aldeia"} •{" "}
                        {character.ninja_style || "Sem estilo"}
                      </span>
                    </div>

                    <div>
                      <small>Player</small>
                      <span>{owner?.display_name || owner?.email || "Desconhecido"}</span>
                    </div>

                    <div>
                      <small>Traços</small>
                      <span>
                        {Array.isArray(character.selected_traits)
                          ? character.selected_traits.length
                          : 0}
                      </span>
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
