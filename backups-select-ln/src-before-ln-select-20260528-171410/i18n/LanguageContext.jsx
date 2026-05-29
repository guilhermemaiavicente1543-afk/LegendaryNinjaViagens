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
      chooseOption: "Escolha uma opção",
      update: "Atualizar",
      back: "Voltar",
      backToHall: "← Hall",
      loading: "Carregando...",
      search: "Buscar",
      status: "Status",
      online: "Online",
      user: "Usuário",
      loggedIn: "Logado",
      visitor: "Visitante",
      logout: "Sair",
      adminPanel: "Painel ADM",
      systemStatus: "Status do sistema"
    },
    sound: {
      on: "♪ Som",
      off: "♪ Mudo",
      enable: "Ativar som",
      disable: "Desativar som"
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
    shinobidex: {
      title: "ShinobiDex",
      subtitle: "Biblioteca alternativa de técnicas do RPG, importada como rascunho, calculada pela lógica ANCED e revisável pelo ADM.",
      rank: "Rank",
      classification: "Classificação",
      nature: "Natureza",
      status: "Status",
      technique: "Técnica",
      summary: "Resumo",
      rpgEffect: "Efeito no RPG",
      ancedCalculation: "Cálculo ANCED sugerido",
      originalSource: "Ver fonte original",
      noTechnique: "Selecione uma técnica para ver detalhes.",
      noResults: "Nenhuma técnica encontrada.",
      found: "técnica(s) encontradas",
      loadingTechniques: "Carregando técnicas...",
      searchPlaceholder: "Nome, natureza, usuário, descrição...",
      type: "Tipo",
      users: "Usuários",
      confidence: "Confiança"
    }
  },

  en: {
    common: {
      language: "Language",
      chooseOption: "Choose an option",
      update: "Refresh",
      back: "Back",
      backToHall: "← Hall",
      loading: "Loading...",
      search: "Search",
      status: "Status",
      online: "Online",
      user: "User",
      loggedIn: "Logged in",
      visitor: "Visitor",
      logout: "Logout",
      adminPanel: "Admin Panel",
      systemStatus: "System status"
    },
    sound: {
      on: "♪ Sound",
      off: "♪ Muted",
      enable: "Enable sound",
      disable: "Disable sound"
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
    shinobidex: {
      title: "ShinobiDex",
      subtitle: "Alternative RPG technique library, imported as draft, calculated through ANCED logic and reviewable by admins.",
      rank: "Rank",
      classification: "Classification",
      nature: "Nature",
      status: "Status",
      technique: "Technique",
      summary: "Summary",
      rpgEffect: "RPG effect",
      ancedCalculation: "Suggested ANCED calculation",
      originalSource: "Open original source",
      noTechnique: "Select a technique to view details.",
      noResults: "No technique found.",
      found: "technique(s) found",
      loadingTechniques: "Loading techniques...",
      searchPlaceholder: "Name, nature, user, description...",
      type: "Type",
      users: "Users",
      confidence: "Confidence"
    }
  },

  es: {
    common: {
      language: "Idioma",
      chooseOption: "Elige una opción",
      update: "Actualizar",
      back: "Volver",
      backToHall: "← Hall",
      loading: "Cargando...",
      search: "Buscar",
      status: "Estado",
      online: "En línea",
      user: "Usuario",
      loggedIn: "Conectado",
      visitor: "Visitante",
      logout: "Salir",
      adminPanel: "Panel ADM",
      systemStatus: "Estado del sistema"
    },
    sound: {
      on: "♪ Sonido",
      off: "♪ Silencio",
      enable: "Activar sonido",
      disable: "Desactivar sonido"
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
    shinobidex: {
      title: "ShinobiDex",
      subtitle: "Biblioteca alternativa de técnicas del RPG, importada como borrador, calculada por la lógica ANCED y revisable por ADM.",
      rank: "Rango",
      classification: "Clasificación",
      nature: "Naturaleza",
      status: "Estado",
      technique: "Técnica",
      summary: "Resumen",
      rpgEffect: "Efecto en el RPG",
      ancedCalculation: "Cálculo ANCED sugerido",
      originalSource: "Ver fuente original",
      noTechnique: "Selecciona una técnica para ver detalles.",
      noResults: "No se encontró ninguna técnica.",
      found: "técnica(s) encontrada(s)",
      loadingTechniques: "Cargando técnicas...",
      searchPlaceholder: "Nombre, naturaleza, usuario, descripción...",
      type: "Tipo",
      users: "Usuarios",
      confidence: "Confianza"
    }
  },

  fr: {
    common: {
      language: "Langue",
      chooseOption: "Choisissez une option",
      update: "Actualiser",
      back: "Retour",
      backToHall: "← Hall",
      loading: "Chargement...",
      search: "Rechercher",
      status: "Statut",
      online: "En ligne",
      user: "Utilisateur",
      loggedIn: "Connecté",
      visitor: "Visiteur",
      logout: "Déconnexion",
      adminPanel: "Panneau ADM",
      systemStatus: "État du système"
    },
    sound: {
      on: "♪ Son",
      off: "♪ Muet",
      enable: "Activer le son",
      disable: "Désactiver le son"
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
    shinobidex: {
      title: "ShinobiDex",
      subtitle: "Bibliothèque alternative de techniques du RPG, importée comme brouillon, calculée par la logique ANCED et révisable par l’ADM.",
      rank: "Rang",
      classification: "Classification",
      nature: "Nature",
      status: "Statut",
      technique: "Technique",
      summary: "Résumé",
      rpgEffect: "Effet dans le RPG",
      ancedCalculation: "Calcul ANCED suggéré",
      originalSource: "Voir la source originale",
      noTechnique: "Sélectionnez une technique pour voir les détails.",
      noResults: "Aucune technique trouvée.",
      found: "technique(s) trouvée(s)",
      loadingTechniques: "Chargement des techniques...",
      searchPlaceholder: "Nom, nature, utilisateur, description...",
      type: "Type",
      users: "Utilisateurs",
      confidence: "Confiance"
    }
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "pt";
  });

  function setLanguage(nextLanguage) {
    const exists = LANGUAGES.some((item) => item.code === nextLanguage);
    if (!exists) return;

    localStorage.setItem(STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  }

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : language;
    document.documentElement.dataset.language = language;

    if (document.body) {
      document.body.dataset.language = language;
    }
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
