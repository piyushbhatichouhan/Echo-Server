import "./ContextMenu.css";
import { useEffect, useRef, useState } from "react";

export default function ContextMenu({ x, y, visible, items, onClose }) {
  if (!visible) return null;

  const menuRef = useRef(null);

  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const menu = menuRef.current;

    let left = x;
    let top = y;

    const padding = 8;

    const rect = menu.getBoundingClientRect();

    if (left + rect.width > window.innerWidth - padding) {
      left = window.innerWidth - rect.width - padding;
    }

    if (top + rect.height > window.innerHeight - padding) {
      top = window.innerHeight - rect.height - padding;
    }

    if (left < padding) left = padding;
    if (top < padding) top = padding;

    setPosition({
      left,
      top,
    });
  }, [visible, x, y]);

  return (
    <>
      <div className="eh-context-backdrop" onClick={onClose} />

      <div className="eh-context-menu" ref={menuRef} style={position}>
        {items.map((item) => (
          <button
            key={item.label}
            className="eh-context-item"
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            <item.icon size={16} />

            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
