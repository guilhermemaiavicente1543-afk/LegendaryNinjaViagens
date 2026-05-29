export default function MyNinjaMobilePanel({
  character,
  profileTab,
  setProfileTab,
  onEditProfile,
  onOpenFullSheet
}) {
  if (!character) return null;

  const display = (value, fallback = "Não informado") => {
    if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
    return value || fallback;
  };

  const heightWeight = `${
    character.height_cm ? `${character.height_cm} cm` : "-"
  } / ${
    character.weight_kg ? `${character.weight_kg} kg` : "-"
  }`;

  const sheetItems = [
    ["🎒", "Registro de Provas"],
    ["🧪", "Ciência e Medicina"],
    ["📜", "Contratos e Vínculos"],
    ["📦", "Inventário"],
    ["⚔️", "Atividades e Missões"],
    ["🧬", "Status de Personagem"],
    ["🛡️", "APR Especial / Ações Ocultas"],
    ["📖", "Desenvolvimento Narrativo"]
  ];

  return (
    <section className="mnm-page shinobidex-mobile">
      <header className="mnm-simple-header">
        <h1>{character.character_name}</h1>

        <div className="mnm-simple-meta">
          <span>📍 {character.village_or_organization || "Sem aldeia"}</span>
          <span>🌀 {character.ninja_style || "Sem estilo"}</span>
        </div>
      </header>

      <nav className="mnm-simple-tabs" aria-label="Abas do Meu Ninja">
        <button
          type="button"
          className={profileTab === "info" ? "active" : ""}
          onClick={() => setProfileTab("info")}
        >
          👥 Perfil
        </button>

        <button
          type="button"
          className={profileTab === "location" ? "active" : ""}
          onClick={() => setProfileTab("location")}
        >
          📍 Localização
        </button>

        <button
          type="button"
          className={profileTab === "skills" ? "active" : ""}
          onClick={() => setProfileTab("skills")}
        >
          🕸️ Teia
        </button>
      </nav>

      {profileTab === "info" && (
        <>
          <section className="mnm-box mnm-box-glow mnm-profile-card-simple">
            <div className="mnm-profile-photo-wrap">
              {character.portrait_url ? (
                <img
                  className="mnm-profile-photo"
                  src={character.portrait_url}
                  alt={character.character_name}
                />
              ) : (
                <div className="mnm-profile-photo mnm-profile-photo-empty">✦</div>
              )}

              <button type="button" className="mnm-btn mnm-btn-primary" onClick={onEditProfile}>
                Alterar foto
              </button>
            </div>

            <div className="mnm-profile-main-info">
              <h2>Perfil do Personagem</h2>

              <h1>{character.character_name}</h1>

              <div className="mnm-alcunha">
                {character.epithet || character.rank_title || "Ninja sem alcunha definida"}
              </div>

              <div className="mnm-tags">
                <span>{character.village_or_organization || "Sem aldeia"}</span>
                <span>{character.ninja_style || "Sem estilo"}</span>
                <span>{character.rank_title || "Sem graduação"}</span>
              </div>
            </div>
          </section>

          <section className="mnm-box mnm-grid-card">
            <h2>👤 Identidade</h2>

            <div>
              <span className="mnm-label">Nome</span>
              <span className="mnm-value">{character.character_name}</span>
            </div>

            <div>
              <span className="mnm-label">Player</span>
              <span className="mnm-value">{character.player_name || "Não informado"}</span>
            </div>

            <div>
              <span className="mnm-label">Gênero</span>
              <span className="mnm-value">{display(character.gender)}</span>
            </div>

            <div>
              <span className="mnm-label">Idade</span>
              <span className="mnm-value">{display(character.age, "Não informada")}</span>
            </div>

            <div>
              <span className="mnm-label">Aniversário</span>
              <span className="mnm-value">{display(character.birthday)}</span>
            </div>

            <div>
              <span className="mnm-label">Altura / Peso</span>
              <span className="mnm-value">{heightWeight}</span>
            </div>
          </section>

          <section className="mnm-box mnm-stack-card">
            <h2>👥 Afiliação e Origem</h2>

            <div>
              <span className="mnm-label">Aldeia ou Organização</span>
              <span className="mnm-value">{display(character.village_or_organization)}</span>
            </div>

            <div>
              <span className="mnm-label">Clã ou Parentesco</span>
              <span className="mnm-value">{display(character.clan_or_kinship)}</span>
            </div>

            <div>
              <span className="mnm-label">Kekkei Genkai ou Hiden</span>
              <span className="mnm-value">{character.kekkei_genkai_or_hiden || "Nenhum"}</span>
            </div>

            <div>
              <span className="mnm-label">Pontos de Habilidade</span>
              <span className="mnm-value">{character.skill_points ?? 50}</span>
            </div>
          </section>

          <section className="mnm-box mnm-map-card-simple">
            <h2>📍 Ícone do Mapa</h2>

            {character.icon_url ? (
              <img src={character.icon_url} alt={character.character_name} />
            ) : (
              <div className="mnm-map-icon-empty">✦</div>
            )}

            <p>{character.icon_url ? "Personalizado" : "Nenhum ícone definido"}</p>
          </section>

          <section className="mnm-box mnm-dossie-card-simple">
            <h2>Dossiê Shinobi</h2>
            <h1>Ficha Complementar</h1>

            <p>
              Esta área registra apenas dados que não aparecem no perfil principal nem no
              inventário: provas, status, ações ocultas, medicina, missões, contratos
              especiais e desenvolvimento.
            </p>

            <button type="button" className="mnm-btn mnm-btn-primary" onClick={onOpenFullSheet}>
              💾 Abrir / salvar ficha
            </button>
          </section>

          <nav className="mnm-mobile-scroll-menu" aria-label="Menu da Ficha Complementar">
            {sheetItems.map(([icon, label]) => (
              <button type="button" key={label} onClick={onOpenFullSheet}>
                <span>{icon}</span>
                {label}
                {label === "Inventário" && <i>●</i>}
              </button>
            ))}
          </nav>

          <section className="mnm-box mnm-stack-card">
            <h2>🕸️ História e Personalidade</h2>

            <div>
              <span className="mnm-label">Aparência</span>
              <span className="mnm-value">{character.appearance || "Não informada."}</span>
            </div>

            <div>
              <span className="mnm-label">Personalidade</span>
              <span className="mnm-value">{character.personality || "Não informada."}</span>
            </div>

            <div>
              <span className="mnm-label">Objetivos</span>
              <span className="mnm-value">{character.goals || "Não informados."}</span>
            </div>

            <div>
              <span className="mnm-label">Medos / Fraquezas Emocionais</span>
              <span className="mnm-value">{character.fears || "Não informados."}</span>
            </div>

            <div>
              <span className="mnm-label">Biografia</span>
              <span className="mnm-value">{character.biography || character.history || "Não informada."}</span>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
