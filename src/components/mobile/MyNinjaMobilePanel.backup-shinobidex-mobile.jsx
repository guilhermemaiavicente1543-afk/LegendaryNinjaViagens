export default function MyNinjaMobilePanel({
  character,
  profileTab,
  setProfileTab,
  onEditProfile,
  onOpenFullSheet
}) {
  if (!character) return null;

  return (
    <section className="mnm-page">
      <header className="mnm-topbar">
        <div className="mnm-logo">
          <span>忍</span>
          <strong>
            <small>LN Digital</small>
            Hall
          </strong>
        </div>

        <div className="mnm-actions">
          <button type="button">Ocultar opções</button>
          <button type="button" aria-label="Opções">☷</button>
        </div>
      </header>

      <section className="mnm-intro">
        <p>Meu Ninja</p>
        <h1>{character.character_name}</h1>
        <span>
          Cada player possui apenas um ninja. Esta página reúne informações,
          localização e árvore de habilidades do personagem.
        </span>
        <i>✦</i>
      </section>

      <nav className="mnm-tabs">
        <button
          type="button"
          className={profileTab === "info" ? "active" : ""}
          onClick={() => setProfileTab("info")}
        >
          <span>♙</span>
          Perfil
        </button>

        <button
          type="button"
          className={profileTab === "location" ? "active" : ""}
          onClick={() => setProfileTab("location")}
        >
          <span>⌖</span>
          Localização
        </button>

        <button
          type="button"
          className={profileTab === "skills" ? "active" : ""}
          onClick={() => setProfileTab("skills")}
        >
          <span>⌘</span>
          Árvore
        </button>
      </nav>

      {profileTab === "info" && (
        <>
          <section className="mnm-character-card">
            <div className="mnm-photo-area">
              <div className="mnm-photo-ring">
                {character.portrait_url ? (
                  <img src={character.portrait_url} alt={character.character_name} />
                ) : (
                  <span>✦</span>
                )}
              </div>

              <button type="button" onClick={onEditProfile}>
                <span>▣</span>
                Alterar foto
              </button>
            </div>

            <div className="mnm-character-info">
              <p>Perfil do personagem</p>

              <strong>
                {character.epithet || character.rank_title || "Ninja sem alcunha definida"}
              </strong>

              <ul>
                <li><span>⌂</span>{character.village_or_organization || "Sem aldeia"}</li>
                <li><span>◎</span>{character.ninja_style || "Sem estilo"}</li>
                <li><span>☆</span>{character.rank_title || "Sem graduação"}</li>
              </ul>
            </div>
          </section>

          <section className="mnm-sheet-card">
            <div>
              <p>Dossiê Shinobi</p>
              <h2>Ficha Complementar</h2>
              <span>
                Esta área registra apenas dados que não aparecem no perfil principal
                nem no inventário: provas, status, ações ocultas, medicina, missões,
                contratos especiais e desenvolvimento.
              </span>
            </div>

            <button type="button" onClick={onOpenFullSheet} aria-label="Abrir ficha">
              ›
            </button>
          </section>

          <section className="mnm-sheet-buttons">
            <button type="button" onClick={onOpenFullSheet}><span>⚙</span>Registro de Provas</button>
            <button type="button" onClick={onOpenFullSheet}><span>⚗</span>Ciência e Medicina</button>
            <button type="button" onClick={onOpenFullSheet}><span>巻</span>Contratos e Vínculos</button>
            <button type="button" onClick={onOpenFullSheet}><span>▱</span>Inventário</button>
            <button type="button" onClick={onOpenFullSheet}><span>門</span>Atividades e Missões</button>
            <button type="button" onClick={onOpenFullSheet}><span>◎</span>Status do Personagem</button>
            <button type="button" onClick={onOpenFullSheet}><span>◈</span>APA Especial / Ações Ocultas</button>
            <button type="button" onClick={onOpenFullSheet}><span>〽</span>Desenvolvimento Narrativo</button>
          </section>

          <section className="mnm-summary">
            <article>
              <span className="mnm-summary-icon">♙</span>
              <div>
                <h3>Identidade</h3>
                <p>• Nome &nbsp; • Player &nbsp; • Gênero</p>
                <p>• Idade &nbsp; • Aniversário &nbsp; • Altura / Peso</p>
              </div>
              <b>›</b>
            </article>

            <article>
              <span className="mnm-summary-icon">♧</span>
              <div>
                <h3>Afiliação e origem</h3>
                <p>• Aldeia ou Organização &nbsp; • Clã ou Parentesco</p>
                <p>• Kekkei Genkai ou Hiden &nbsp; • Pontos de Habilidade</p>
              </div>
              <b>›</b>
            </article>

            <article>
              <span className="mnm-summary-icon">⌖</span>
              <div>
                <h3>Ícone do mapa</h3>
                <p>• {character.icon_url ? "Personalizado" : "Nenhum ícone definido"}</p>
              </div>
              <b>›</b>
            </article>
          </section>
        </>
      )}
    </section>
  );
}
