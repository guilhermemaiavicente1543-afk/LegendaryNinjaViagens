import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  isSupabaseConfigured,
  supabase
} from "../../lib/supabaseClient";

const LAST_READ_STORAGE_KEY =
  "ln-hall-announcements-last-read";

const ACTION_LABELS = {
  "my-ninja": "Abrir Meu Ninja",
  map: "Abrir Mapa",
  shinobidex: "Abrir ShinobiDex",
  anced: "Abrir ANCED",
  legends: "Abrir Hall das Lendas",
  admin: "Abrir Painel ADM",
  external: "Saiba mais"
};

function readLastAnnouncementDate() {
  if (typeof window === "undefined") return "";

  try {
    return (
      window.localStorage.getItem(
        LAST_READ_STORAGE_KEY
      ) || ""
    );
  } catch {
    return "";
  }
}

function formatAnnouncementDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function isAnnouncementVisible(announcement) {
  const now = Date.now();

  if (
    announcement.starts_at &&
    Date.parse(announcement.starts_at) > now
  ) {
    return false;
  }

  if (
    announcement.ends_at &&
    Date.parse(announcement.ends_at) < now
  ) {
    return false;
  }

  return true;
}

function DrawerArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="m7 9 5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HallAnnouncementScroll({
  onOpenMyNinja,
  onOpenMap,
  onOpenShinobiDex,
  onOpenAnced,
  onOpenLegends,
  onOpenAdmin
}) {
  const [isOpen, setIsOpen] = useState(false);

  const [
    openAnnouncementId,
    setOpenAnnouncementId
  ] = useState("");

  const [announcements, setAnnouncements] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [lastReadAt, setLastReadAt] =
    useState(readLastAnnouncementDate);

  async function loadAnnouncements() {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);

      setLoadError(
        "As novidades estão temporariamente indisponíveis."
      );

      return;
    }

    setIsLoading(true);
    setLoadError("");

    let result = await supabase
      .from("site_announcements")
      .select(`
        id,
        title,
        body,
        category,
        priority,
        is_active,
        image_url,
        action_target,
        action_label,
        action_url,
        starts_at,
        ends_at,
        created_at,
        updated_at
      `)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);

    if (
      result.error &&
      (
        result.error.code === "42703" ||
        result.error.message
          ?.toLowerCase()
          .includes("column")
      )
    ) {
      result = await supabase
        .from("site_announcements")
        .select(`
          id,
          title,
          body,
          category,
          priority,
          is_active,
          created_at,
          updated_at
        `)
        .eq("is_active", true)
        .order("priority", {
          ascending: false
        })
        .order("created_at", {
          ascending: false
        })
        .limit(30);
    }

    setIsLoading(false);

    if (result.error) {
      console.warn(
        "Erro ao carregar novidades:",
        result.error.message
      );

      setLoadError(
        "Não foi possível carregar as novidades."
      );

      return;
    }

    setAnnouncements(
      (result.data || []).filter(
        isAnnouncementVisible
      )
    );
  }

  useEffect(() => {
    loadAnnouncements();

    function handleAnnouncementsUpdated() {
      loadAnnouncements();
    }

    window.addEventListener(
      "ln-announcements-updated",
      handleAnnouncementsUpdated
    );

    return () => {
      window.removeEventListener(
        "ln-announcements-updated",
        handleAnnouncementsUpdated
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeAnnouncements();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen]);

  const latestAnnouncementDate = useMemo(() => {
    return announcements.reduce(
      (latest, announcement) => {
        const candidate =
          announcement.updated_at ||
          announcement.created_at ||
          "";

        if (!candidate) return latest;
        if (!latest) return candidate;

        return Date.parse(candidate) >
          Date.parse(latest)
          ? candidate
          : latest;
      },
      ""
    );
  }, [announcements]);

  const hasUnreadAnnouncement = Boolean(
    latestAnnouncementDate &&
      (
        !lastReadAt ||
        Date.parse(latestAnnouncementDate) >
          Date.parse(lastReadAt)
      )
  );

  function markAnnouncementsAsRead() {
    if (!latestAnnouncementDate) return;

    try {
      window.localStorage.setItem(
        LAST_READ_STORAGE_KEY,
        latestAnnouncementDate
      );
    } catch {
      // O pergaminho funciona sem localStorage.
    }

    setLastReadAt(latestAnnouncementDate);
  }

  function openAnnouncements() {
    markAnnouncementsAsRead();
    setOpenAnnouncementId("");
    setIsOpen(true);
  }

  function closeAnnouncements() {
    setIsOpen(false);
    setOpenAnnouncementId("");
  }

  function toggleAnnouncement(announcementId) {
    setOpenAnnouncementId((current) =>
      current === announcementId
        ? ""
        : announcementId
    );
  }

  function executeAnnouncementAction(
    announcement
  ) {
    const target =
      announcement.action_target || "none";

    const handlers = {
      "my-ninja": onOpenMyNinja,
      map: onOpenMap,
      shinobidex: onOpenShinobiDex,
      anced: onOpenAnced,
      legends: onOpenLegends,
      admin: onOpenAdmin
    };

    if (
      target === "external" &&
      announcement.action_url
    ) {
      window.open(
        announcement.action_url,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    const handler = handlers[target];

    if (typeof handler === "function") {
      closeAnnouncements();
      handler();
    }
  }

  const popup =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="hall-news-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget
              ) {
                closeAnnouncements();
              }
            }}
          >
            <section
              className="hall-news-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="hall-news-modal-title"
            >
              <div className="hall-news-modal-top-roll" />

              <div className="hall-news-modal-paper">
                <header className="hall-news-modal-header">
                  <div>
                    <small>LN DIGITAL</small>

                    <h2 id="hall-news-modal-title">
                      Novidades
                    </h2>

                    <p>
                      Avisos e atualizações oficiais
                    </p>
                  </div>

                  <button
                    type="button"
                    className="hall-news-modal-close"
                    onClick={closeAnnouncements}
                    aria-label="Fechar novidades"
                  >
                    ×
                  </button>
                </header>

                <div className="hall-news-modal-list">
                  {isLoading ? (
                    <p className="hall-news-modal-empty">
                      Carregando novidades...
                    </p>
                  ) : loadError ? (
                    <p className="hall-news-modal-empty">
                      {loadError}
                    </p>
                  ) : announcements.length === 0 ? (
                    <p className="hall-news-modal-empty">
                      Nenhuma novidade publicada no momento.
                    </p>
                  ) : (
                    announcements.map(
                      (announcement) => {
                        const isExpanded =
                          openAnnouncementId ===
                          announcement.id;

                        const actionTarget =
                          announcement.action_target ||
                          "none";

                        const hasAction =
                          actionTarget !== "none" &&
                          (
                            actionTarget !==
                              "external" ||
                            announcement.action_url
                          );

                        const contentId =
                          `hall-news-content-${announcement.id}`;

                        return (
                          <article
                            key={announcement.id}
                            className={
                              `hall-news-drawer ${
                                isExpanded
                                  ? "open"
                                  : "closed"
                              }`
                            }
                          >
                            <button
                              type="button"
                              className="hall-news-drawer-toggle"
                              onClick={() =>
                                toggleAnnouncement(
                                  announcement.id
                                )
                              }
                              aria-expanded={
                                isExpanded
                              }
                              aria-controls={
                                contentId
                              }
                            >
                              <span className="hall-news-drawer-heading">
                                <small>
                                  {announcement.category ||
                                    "geral"}
                                </small>

                                <strong>
                                  {announcement.title}
                                </strong>
                              </span>

                              <span className="hall-news-drawer-side">
                                <time
                                  dateTime={
                                    announcement.updated_at ||
                                    announcement.created_at ||
                                    undefined
                                  }
                                >
                                  {formatAnnouncementDate(
                                    announcement.updated_at ||
                                      announcement.created_at
                                  )}
                                </time>

                                <span className="hall-news-drawer-arrow">
                                  <DrawerArrow />
                                </span>
                              </span>
                            </button>

                            {isExpanded && (
                              <div
                                id={contentId}
                                className="hall-news-drawer-content"
                              >
                                {announcement.image_url && (
                                  <div className="hall-news-modal-image-frame">
                                    <img
                                      src={
                                        announcement.image_url
                                      }
                                      alt=""
                                      loading="lazy"
                                    />
                                  </div>
                                )}

                                <p className="hall-news-drawer-text">
                                  {announcement.body}
                                </p>

                                {hasAction && (
                                  <button
                                    type="button"
                                    className="hall-news-modal-action"
                                    onClick={() =>
                                      executeAnnouncementAction(
                                        announcement
                                      )
                                    }
                                  >
                                    {announcement.action_label ||
                                      ACTION_LABELS[
                                        actionTarget
                                      ] ||
                                      "Abrir"}
                                  </button>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      }
                    )
                  )}
                </div>
              </div>

              <div className="hall-news-modal-bottom-roll" />
            </section>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <aside
        className="hall-news-widget"
        aria-label="Novidades da LN Digital"
      >
        <button
          type="button"
          className="hall-news-trigger"
          onClick={openAnnouncements}
          aria-expanded={isOpen}
          aria-label="Abrir novidades"
        >
          <span
            className="hall-news-image-crop"
            aria-hidden="true"
          >
            <img
              className="hall-news-image"
              src="/hall/pergaminho-novidades-fechado.png"
              alt=""
              draggable="false"
            />
          </span>

          <strong className="hall-news-trigger-label">
            NOVIDADES
          </strong>

          {hasUnreadAnnouncement && (
            <span className="hall-news-new-badge">
              NOVO
            </span>
          )}
        </button>
      </aside>

      {popup}
    </>
  );
}
