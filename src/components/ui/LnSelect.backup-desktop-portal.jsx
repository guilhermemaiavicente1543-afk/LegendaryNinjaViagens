import {
  Children,
  cloneElement,
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
  const rootRef = useRef(null);
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (isMobile) return;

      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
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
  }, [isMobile]);

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
    <>
      {isMobile && (
        <button
          type="button"
          className="ln-select-mobile-backdrop"
          aria-label="Fechar seleção"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`ln-select-popover ${isMobile ? "ln-select-popover-mobile" : ""}`}
        role="listbox"
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
    </>
  );

  return (
    <div
      ref={rootRef}
      className={`ln-select ${className || ""} ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}
      data-ln-select
    >
      <button
        type="button"
        className="ln-select-trigger"
        onClick={() => {
          if (!disabled) setIsOpen((current) => !current);
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
        (isMobile && typeof document !== "undefined"
          ? createPortal(
              <div className="ln-select-mobile-portal">{popover}</div>,
              document.body
            )
          : popover)}

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
