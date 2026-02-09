import { useCallback, useEffect, useState } from "react";
import type { ContextMenuAction } from "../types";

interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
  actions: ContextMenuAction[];
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    visible: false,
    actions: [],
  });

  const showContextMenu = useCallback(
    (e: React.MouseEvent, actions: ContextMenuAction[]) => {
      e.preventDefault();
      e.stopPropagation();
      setMenu({
        x: e.clientX,
        y: e.clientY,
        visible: true,
        actions,
      });
    },
    [],
  );

  const hideContextMenu = useCallback(() => {
    setMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const handleClick = () => hideContextMenu();
    const handleScroll = () => hideContextMenu();
    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [hideContextMenu]);

  return { menu, showContextMenu, hideContextMenu };
}
