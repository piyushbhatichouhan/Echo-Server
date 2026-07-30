import { useEffect, useRef, useState } from "react";
import "./Dropdown.css";

export default function Dropdown({ trigger, children }) {
  const [open, setOpen] = useState(false);

  const ref = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (!ref.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  return (
    <div className="eh-dropdown" ref={ref}>
      <div
        className="eh-dropdown-trigger"
        onClick={() => setOpen((previous) => !previous)}
      >
        {trigger}
      </div>

      {open && <div className="eh-dropdown-menu">{children}</div>}
    </div>
  );
}

Dropdown.Item = function DropdownItem({ icon, children, onClick }) {
  return (
    <button
      className="eh-dropdown-item"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {icon && <span className="eh-dropdown-icon">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
