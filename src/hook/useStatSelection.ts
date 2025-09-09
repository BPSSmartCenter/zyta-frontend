import { useState, useEffect } from "react";

const bus = new EventTarget();
const EVT = "stat-selection-change";
let current: string | null = null;

export function setSelectedStat(id: string | null) {
  current = id;
  bus.dispatchEvent(new CustomEvent(EVT, { detail: id }));
}

export function getSelectedStat() {
  return current;
}

export function useStatSelection() {
  const [selected, setSelected] = useState<string | null>(getSelectedStat());

  useEffect(() => {
    const onChange = (e: Event) => {
      setSelected((e as CustomEvent<string | null>).detail ?? null);
    };
    bus.addEventListener(EVT, onChange);
    return () => bus.removeEventListener(EVT, onChange);
  }, []);

  return { selected, setSelected: setSelectedStat };
}
