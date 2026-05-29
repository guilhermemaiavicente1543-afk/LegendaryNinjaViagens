import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import "./LnSelect.css";

function getOptionText(option) {
  const children = option?.props?.children;

  if (Array.isArray(children)) {
    return children.join("");
  }

  return String(children ?? "");
}

function useIsMobileSelect() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");

    function update() {
      setIsMobile(query.matches);
    }

    update();
    query.addEventListener?.("change", update);

    return () => {
      query.removeEventListener?.("change", update);
    };
  }, []);

  return isMobile;
}

export default function LnSelect({
  value,
  onChange,
  children,
  className = "",
  disabled = false,
  "aria-label": ariaLabel,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [desktopPosition, setDesktopPosition] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const isMobile = useIsMobileSelect();

  const options = useMemo(() => {
    return Children.toArray(children)
      .filter(Boolean)
      .filter((child) => isValidElement(child) && child.type === "option")
      .map((option) => {
        const optionValue = option.props.value ?? getOptionText(option);

        return {
          value: String(optionValue),
          label: getOptionText(option),
          disabled: Boolean(option.props.disabled),
        };
      });
  }, [children]);

  const selectedOption =
    options.find((option) => String(option.value) === String(value)) ||
    options[0] ||
    null;

  function updateDesktopPosition() {
    if (!triggerRef.current || isMobile) return;

    const rect = triggerRef.current.getBoundingClientRect();

    setDesktopPosition({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
    });
  }

  useEffect(() => {
    if (!isOpen) return;

    updateDesktopPosition();

    function handleResizeOrScroll() {
      updateDesktopPosition();
    }

    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);

    return () => {
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [isOpen, isMobile]);

  useEffect(() => {
    function handleClickOutside(event) {
      const target = event.target;

      if (rootRef.current?.contains(target)) return;
      if (target?.closest?.(".ln-select-portal")) return;

      setIsOpen(false);
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isMobile]);

  function selectOption(option) {
    if (disabled || option.disabled) return;

    const fakeEvent = {
      target: {
        value: option.value,
        name: props.name,
      },
      currentTarget: {
        value: option.value,
        name: props.name,
      },
    };

    onChange?.(fakeEvent);
    setIsOpen(false);
  }

  const popover = (
    <div className="ln-select-portal">
      {isMobile && (
        <button
          type="button"
          className="ln-select-mobile-backdrop"
          aria-label="Fechar seleção"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`ln-select-popover ${isMobile ? "ln-select-popover-mobile" : "ln-select-popover-desktop"}`}
        role="listbox"
        style={
          !isMobile && desktopPosition
            ? {
                left: `${desktopPosition.left}px`,
                top: `${desktopPosition.top}px`,
                width: `${desktopPosition.width}px`,
              }
            : undefined
        }
      >
        <div className="ln-select-popover-head">
          <span>Selecionar</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Fechar seleção"
          >
            ×
          </button>
        </div>

        <div className="ln-select-options">
          {options.map((option) => {
            const active = String(option.value) === String(value);

            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                className={active ? "active" : ""}
                onClick={() => selectOption(option)}
              >
                <span>{option.label}</span>
                {active && <strong>✓</strong>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`ln-select ${className || ""} ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}
      data-ln-select
    >
      <button
        ref={triggerRef}
        type="button"
        className="ln-select-trigger"
        onClick={() => {
          if (!disabled) {
            updateDesktopPosition();
            setIsOpen((current) => !current);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || props.name || "Selecionar opção"}
        disabled={disabled}
      >
        <span>{selectedOption?.label || "Selecione"}</span>
        <b>⌄</b>
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(popover, document.body)}

      <select
        {...props}
        value={value}
        onChange={onChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="ln-select-native-shadow"
      >
        {children}
      </select>
    </div>
  );
}
