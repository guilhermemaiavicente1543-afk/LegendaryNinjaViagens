import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ln-digital-language";

export const LANGUAGES = [
  { code: "pt", label: "PT-BR" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" }
];

const translations = {
  pt: {
    common: {
      language: "Idioma",
      backToHall: "← Hall",
      logout: "Sair",
      loading: "Carregando...",
      update: "Atualizar",
      back: "Voltar",
      search: "Buscar",
      status: "Status",
      online: "Online",
      user: "Usuário",
      loggedIn: "Logado",
      visitor: "Visitante",
      adminPanel: "Painel ADM",
      systemStatus: "Status do sistema"
    },

    auth: {
      eyebrow: "LN Digital",
      title: "Legendary Ninja Digital",
      subtitle: "Entre ou crie sua conta para acessar seu ninja, acompanhar localização, viagens e evolução.",
      login: "Login",
      register: "Cadastro",
      playerName: "Nome de jogador",
      email: "E-mail",
      password: "Senha",
      enter: "Entrar",
      createAccount: "Criar conta",
      loading: "Carregando...",
      forgotPassword: "Esqueci minha senha",
      demoTitle: "Modo demonstração",
      demoText: "O Supabase ainda não foi conectado. Você pode continuar testando localmente enquanto configuramos o banco online.",
      enterDemo: "Entrar em modo demonstração"
    },

    hall: {
      home: "Início",
      map: "Mapa",
      characters: "Personagens",
      shinobidex: "ShinobiDex",
      rankings: "Rankings",
      community: "Comunidade",
      myNinja: "Meu Ninja",
      accessJourney: "Acesse sua jornada",
      explore: "Explorar",
      exploreMap: "Explorar Mapa",
      discoverWorld: "Descubra o mundo ninja",
      adminArea: "Área administrativa",
      systemShinobi: "Sistema Shinobi",
      travelMap: "Mapa de Viagem"
    },

    sound: {
      on: "♪ Som",
      off: "♪ Mudo",
      enable: "Ativar som",
      disable: "Desativar som"
    },

    map: {
      controls: "☰ Controles do Mapa",
      settings: "☰ Configurações",
      travelMode: "Meio de locomoção:",
      cleanPoints: "Limpar pontos",
      useCleanMap: "Usar mapa limpo",
      useGridMap: "Usar mapa com grade",
      hideSystemGrid: "Ocultar grade do sistema",
      showSystemGrid: "Mostrar grade do sistema",
      characterTravel: "Viagem do Personagem",
      character: "Personagem:",
      startTravel: "Iniciar viagem",
      selectedDestination: "Destino selecionado",
      distance: "Distância",
      crossedRegions: "Regiões atravessadas",
      time: "Tempo",
      days: "Dias",
      currentRegion: "Região atual",
      currentLocation: "Localização inicial",
      province: "Província"
    },

    shinobidex: {
      title: "ShinobiDex",
      subtitle: "Biblioteca alternativa de técnicas do RPG, importada como rascunho, calculada pela lógica ANCED e revisável pelo ADM.",
      library: "Biblioteca de técnicas",
      technique: "Técnica",
      rank: "Rank",
      classification: "Classificação",
      nature: "Natureza",
      status: "Status",
      summary: "Resumo",
      rpgEffect: "Efeito no RPG",
      ancedCalculation: "Cálculo ANCED sugerido",
      originalSource: "Ver fonte original",
      noTechnique: "Selecione uma técnica para ver detalhes.",
      noResults: "Nenhuma técnica encontrada.",
      found: "técnica(s) encontradas",
      wiki: "Wiki",
      confidence: "Confiança",
      users: "Usuários",
      type: "Tipo"
    },

    admin: {
      title: "Painel ADM",
      masterPanel: "Painel do Mestre",
      overview: "Visão Geral",
      appearances: "Aparências",
      coupons: "Cupons",
      skillTreeEditor: "Editor da Teia",
      shinobidex: "ShinobiDex",
      players: "Players cadastrados",
      ninjas: "Ninjas criados",
      travels: "Viagens registradas",
      regions: "Regiões ocupadas"
    }
  },

  en: {
    common: {
      language: "Language",
      backToHall: "← Hall",
      logout: "Logout",
      loading: "Loading...",
      update: "Refresh",
      back: "Back",
      search: "Search",
      status: "Status",
      online: "Online",
      user: "User",
      loggedIn: "Logged in",
      visitor: "Visitor",
      adminPanel: "Admin Panel",
      systemStatus: "System status"
    },

    auth: {
      eyebrow: "LN Digital",
      title: "Legendary Ninja Digital",
      subtitle: "Sign in or create your account to access your ninja, track location, travel and progression.",
      login: "Login",
      register: "Sign up",
      playerName: "Player name",
      email: "Email",
      password: "Password",
      enter: "Enter",
      createAccount: "Create account",
      loading: "Loading...",
      forgotPassword: "Forgot password",
      demoTitle: "Demo mode",
      demoText: "Supabase has not been connected yet. You can keep testing locally while the online database is configured.",
      enterDemo: "Enter demo mode"
    },

    hall: {
      home: "Home",
      map: "Map",
      characters: "Characters",
      shinobidex: "ShinobiDex",
      rankings: "Rankings",
      community: "Community",
      myNinja: "My Ninja",
      accessJourney: "Access your journey",
      explore: "Explore",
      exploreMap: "Explore Map",
      discoverWorld: "Discover the ninja world",
      adminArea: "Administrative area",
      systemShinobi: "Shinobi System",
      travelMap: "Travel Map"
    },

    sound: {
      on: "♪ Sound",
      off: "♪ Muted",
      enable: "Enable sound",
      disable: "Disable sound"
    },

    map: {
      controls: "☰ Map Controls",
      settings: "☰ Settings",
      travelMode: "Travel mode:",
      cleanPoints: "Clear points",
      useCleanMap: "Use clean map",
      useGridMap: "Use grid map",
      hideSystemGrid: "Hide system grid",
      showSystemGrid: "Show system grid",
      characterTravel: "Character Travel",
      character: "Character:",
      startTravel: "Start travel",
      selectedDestination: "Selected destination",
      distance: "Distance",
      crossedRegions: "Crossed regions",
      time: "Time",
      days: "Days",
      currentRegion: "Current region",
      currentLocation: "Initial location",
      province: "Province"
    },

    shinobidex: {
      title: "ShinobiDex",
      subtitle: "Alternative RPG technique library, imported as draft, calculated through ANCED logic and reviewable by admins.",
      library: "Technique library",
      technique: "Technique",
      rank: "Rank",
      classification: "Classification",
      nature: "Nature",
      status: "Status",
      summary: "Summary",
      rpgEffect: "RPG effect",
      ancedCalculation: "Suggested ANCED calculation",
      originalSource: "Open original source",
      noTechnique: "Select a technique to view details.",
      noResults: "No technique found.",
      found: "technique(s) found",
      wiki: "Wiki",
      confidence: "Confidence",
      users: "Users",
      type: "Type"
    },

    admin: {
      title: "Admin Panel",
      masterPanel: "Master Panel",
      overview: "Overview",
      appearances: "Appearances",
      coupons: "Coupons",
      skillTreeEditor: "Skill Tree Editor",
      shinobidex: "ShinobiDex",
      players: "Registered players",
      ninjas: "Created ninjas",
      travels: "Registered travels",
      regions: "Occupied regions"
    }
  },

  es: {
    common: {
      language: "Idioma",
      backToHall: "← Hall",
      logout: "Salir",
      loading: "Cargando...",
      update: "Actualizar",
      back: "Volver",
      search: "Buscar",
      status: "Estado",
      online: "En línea",
      user: "Usuario",
      loggedIn: "Conectado",
      visitor: "Visitante",
      adminPanel: "Panel ADM",
      systemStatus: "Estado del sistema"
    },

    auth: {
      eyebrow: "LN Digital",
      title: "Legendary Ninja Digital",
      subtitle: "Inicia sesión o crea tu cuenta para acceder a tu ninja, seguir ubicación, viajes y evolución.",
      login: "Login",
      register: "Registro",
      playerName: "Nombre de jugador",
      email: "Correo electrónico",
      password: "Contraseña",
      enter: "Entrar",
      createAccount: "Crear cuenta",
      loading: "Cargando...",
      forgotPassword: "Olvidé mi contraseña",
      demoTitle: "Modo demostración",
      demoText: "Supabase aún no está conectado. Puedes seguir probando localmente mientras configuramos la base de datos online.",
      enterDemo: "Entrar en modo demostración"
    },

    hall: {
      home: "Inicio",
      map: "Mapa",
      characters: "Personajes",
      shinobidex: "ShinobiDex",
      rankings: "Rankings",
      community: "Comunidad",
      myNinja: "Mi Ninja",
      accessJourney: "Accede a tu jornada",
      explore: "Explorar",
      exploreMap: "Explorar Mapa",
      discoverWorld: "Descubre el mundo ninja",
      adminArea: "Área administrativa",
      systemShinobi: "Sistema Shinobi",
      travelMap: "Mapa de Viaje"
    },

    sound: {
      on: "♪ Sonido",
      off: "♪ Silencio",
      enable: "Activar sonido",
      disable: "Desactivar sonido"
    },

    map: {
      controls: "☰ Controles del Mapa",
      settings: "☰ Configuración",
      travelMode: "Medio de locomoción:",
      cleanPoints: "Limpiar puntos",
      useCleanMap: "Usar mapa limpio",
      useGridMap: "Usar mapa con cuadrícula",
      hideSystemGrid: "Ocultar cuadrícula del sistema",
      showSystemGrid: "Mostrar cuadrícula del sistema",
      characterTravel: "Viaje del Personaje",
      character: "Personaje:",
      startTravel: "Iniciar viaje",
      selectedDestination: "Destino seleccionado",
      distance: "Distancia",
      crossedRegions: "Regiones atravesadas",
      time: "Tiempo",
      days: "Días",
      currentRegion: "Región actual",
      currentLocation: "Ubicación inicial",
      province: "Provincia"
    },

    shinobidex: {
      title: "ShinobiDex",
      subtitle: "Biblioteca alternativa de técnicas del RPG, importada como borrador, calculada por la lógica ANCED y revisable por ADM.",
      library: "Biblioteca de técnicas",
      technique: "Técnica",
      rank: "Rango",
      classification: "Clasificación",
      nature: "Naturaleza",
      status: "Estado",
      summary: "Resumen",
      rpgEffect: "Efecto en el RPG",
      ancedCalculation: "Cálculo ANCED sugerido",
      originalSource: "Ver fuente original",
      noTechnique: "Selecciona una técnica para ver detalles.",
      noResults: "No se encontró ninguna técnica.",
      found: "técnica(s) encontrada(s)",
      wiki: "Wiki",
      confidence: "Confianza",
      users: "Usuarios",
      type: "Tipo"
    },

    admin: {
      title: "Panel ADM",
      masterPanel: "Panel del Maestro",
      overview: "Vista general",
      appearances: "Apariencias",
      coupons: "Cupones",
      skillTreeEditor: "Editor de la Red",
      shinobidex: "ShinobiDex",
      players: "Jugadores registrados",
      ninjas: "Ninjas creados",
      travels: "Viajes registrados",
      regions: "Regiones ocupadas"
    }
  },

  fr: {
    common: {
      language: "Langue",
      backToHall: "← Hall",
      logout: "Déconnexion",
      loading: "Chargement...",
      update: "Actualiser",
      back: "Retour",
      search: "Rechercher",
      status: "Statut",
      online: "En ligne",
      user: "Utilisateur",
      loggedIn: "Connecté",
      visitor: "Visiteur",
      adminPanel: "Panneau ADM",
      systemStatus: "État du système"
    },

    auth: {
      eyebrow: "LN Digital",
      title: "Legendary Ninja Digital",
      subtitle: "Connectez-vous ou créez votre compte pour accéder à votre ninja, suivre sa position, ses voyages et son évolution.",
      login: "Connexion",
      register: "Inscription",
      playerName: "Nom du joueur",
      email: "E-mail",
      password: "Mot de passe",
      enter: "Entrer",
      createAccount: "Créer un compte",
      loading: "Chargement...",
      forgotPassword: "Mot de passe oublié",
      demoTitle: "Mode démonstration",
      demoText: "Supabase n’est pas encore connecté. Vous pouvez continuer à tester localement pendant la configuration de la base en ligne.",
      enterDemo: "Entrer en mode démonstration"
    },

    hall: {
      home: "Accueil",
      map: "Carte",
      characters: "Personnages",
      shinobidex: "ShinobiDex",
      rankings: "Classements",
      community: "Communauté",
      myNinja: "Mon Ninja",
      accessJourney: "Accéder à votre parcours",
      explore: "Explorer",
      exploreMap: "Explorer la carte",
      discoverWorld: "Découvrez le monde ninja",
      adminArea: "Zone administrative",
      systemShinobi: "Système Shinobi",
      travelMap: "Carte de voyage"
    },

    sound: {
      on: "♪ Son",
      off: "♪ Muet",
      enable: "Activer le son",
      disable: "Désactiver le son"
    },

    map: {
      controls: "☰ Contrôles de la carte",
      settings: "☰ Paramètres",
      travelMode: "Mode de déplacement :",
      cleanPoints: "Effacer les points",
      useCleanMap: "Utiliser la carte propre",
      useGridMap: "Utiliser la carte avec grille",
      hideSystemGrid: "Masquer la grille du système",
      showSystemGrid: "Afficher la grille du système",
      characterTravel: "Voyage du personnage",
      character: "Personnage :",
      startTravel: "Démarrer le voyage",
      selectedDestination: "Destination sélectionnée",
      distance: "Distance",
      crossedRegions: "Régions traversées",
      time: "Temps",
      days: "Jours",
      currentRegion: "Région actuelle",
      currentLocation: "Position initiale",
      province: "Province"
    },

    shinobidex: {
      title: "ShinobiDex",
      subtitle: "Bibliothèque alternative de techniques du RPG, importée comme brouillon, calculée par la logique ANCED et révisable par l’ADM.",
      library: "Bibliothèque de techniques",
      technique: "Technique",
      rank: "Rang",
      classification: "Classification",
      nature: "Nature",
      status: "Statut",
      summary: "Résumé",
      rpgEffect: "Effet dans le RPG",
      ancedCalculation: "Calcul ANCED suggéré",
      originalSource: "Voir la source originale",
      noTechnique: "Sélectionnez une technique pour voir les détails.",
      noResults: "Aucune technique trouvée.",
      found: "technique(s) trouvée(s)",
      wiki: "Wiki",
      confidence: "Confiance",
      users: "Utilisateurs",
      type: "Type"
    },

    admin: {
      title: "Panneau ADM",
      masterPanel: "Panneau du Maître",
      overview: "Vue générale",
      appearances: "Apparences",
      coupons: "Coupons",
      skillTreeEditor: "Éditeur de l’Arbre",
      shinobidex: "ShinobiDex",
      players: "Joueurs inscrits",
      ninjas: "Ninjas créés",
      travels: "Voyages enregistrés",
      regions: "Régions occupées"
    }
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "pt";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === "pt" ? "pt-BR" : language;
  }, [language]);

  const value = useMemo(() => {
    function t(path) {
      const keys = path.split(".");
      let current = translations[language];

      for (const key of keys) {
        current = current?.[key];
      }

      if (typeof current === "string") return current;

      let fallback = translations.pt;
      for (const key of keys) {
        fallback = fallback?.[key];
      }

      return typeof fallback === "string" ? fallback : path;
    }

    return {
      language,
      setLanguage,
      languages: LANGUAGES,
      t
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage precisa ser usado dentro de LanguageProvider.");
  }

  return context;
}
