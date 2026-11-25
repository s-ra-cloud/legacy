import { useEffect, useState, useCallback } from "react";
import type { RefObject } from "react";

type Params = {
  withinElement?: Element | null;
  withinElementRef?: RefObject<Element>;
};

export default function useSelectedText({ withinElement = null, withinElementRef }: Params = {}) {
  const [selectedText, setSelectedText] = useState("");

  const updateSelection = useCallback(() => {
    // debug
    //console.log("updateSelection fired");
    const sel = (window.getSelection && window.getSelection()) || null;
    if (!sel || sel.rangeCount === 0) {
      setSelectedText("");
      return;
    }

    // Get string
    const text = sel.toString();

    // Resolve target element (prefers ref if provided)
    const targetEl = withinElementRef?.current ?? withinElement;
    //console.log("targetEl", targetEl);

    // Optional: ensure selection is inside target element
    if (targetEl) {
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const inside =
        container.nodeType === Node.ELEMENT_NODE
          ? targetEl.contains(container as Element)
          : container.parentElement && targetEl.contains(container.parentElement);
      if (!inside) {
        setSelectedText("");
        return;
      }
    }

    //console.log("selected text inside hook:", text);
    setSelectedText(text);
  }, [withinElementRef, withinElement]);

  useEffect(() => {
    // Update only after selection is finished (mouseup / keyup)
    const events: Array<[Window | Document, string]> = [
      [window, "mouseup"],
      [window, "keyup"],
    ];

    events.forEach(([target, event]) => target.addEventListener(event, updateSelection));

    return () => {
      events.forEach(([target, event]) => target.removeEventListener(event, updateSelection));
    };
  }, [updateSelection]);

  return selectedText;
}