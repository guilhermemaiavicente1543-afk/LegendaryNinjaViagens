import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function CustomSelect({
  label,
  value,
  options = [],
  onChange,
  className = "",
  align = "right"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value) || options[0];
  }, [options, value]);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 10;
    const width = Math.min(280, window.innerWidth - 28);

    let left = align === "right" ? rect.right - width : rect.left;
    left = Math.max(14, Math.min(left, window.innerWidth - width - 14));

    setPopoverStyle({
      position: "fixed",
      top: `${rect.bottom + gap}px`,
      left: `${left}px`,
      width: `${width}px`
    });
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;

    updatePopoverPosition();

    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    function handleClickOutside(event) {
      const target = event.target;

      if (rootRef.current?.contains(target)) return;

      if (target.closest?.(".ln-custom-select-popover")) return;

      setIsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function selectOption(option) {
    onChange?.(option.value);
    setIsOpen(false);
  }

  const popover = isOpen ? (
    <div
      className={`ln-custom-select-popover align-${align}`}
      role="listbox"
      style={popoverStyle}
    >
      <div className="ln-custom-select-popover-head">
        <strong>{label || "Selecionar"}</strong>
        <small>Escolha uma opção</small>
      </div>

      <div className="ln-custom-select-options">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              className={active ? "active" : ""}
              onClick={() => selectOption(option)}
              role="option"
              aria-selected={active}
            >
              {option.icon && (
                <span className="ln-custom-select-option-icon">
                  {option.icon}
                </span>
              )}

              <span>
                <strong>{option.label}</strong>
                {option.description && <small>{option.description}</small>}
              </span>

              {active && <em>✓</em>}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`ln-custom-select ${className} ${isOpen ? "open" : ""}`}
    >
      {label && <span className="ln-custom-select-label">{label}</span>}

      <button
        ref={triggerRef}
        type="button"
        className="ln-custom-select-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="ln-custom-select-current">
          {selectedOption?.icon && (
            <span className="ln-custom-select-icon">{selectedOption.icon}</span>
          )}

          <span>
            <strong>{selectedOption?.label || "Selecionar"}</strong>
            {selectedOption?.description && (
              <small>{selectedOption.description}</small>
            )}
          </span>
        </span>

        <span className="ln-custom-select-arrow">⌄</span>
      </button>

      {typeof document !== "undefined" && createPortal(popover, document.body)}
    </div>
  );
}
