/**
 * Accessibility Utilities
 * 
 * Provides helpers for improving accessibility (a11y) across the application
 */

/**
 * Generate unique ID for aria-labelledby
 */
export function generateA11yId(prefix: string = "a11y"): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Keyboard navigation helpers
 */
export const Keys = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  TAB: "Tab",
  HOME: "Home",
  END: "End",
} as const;

/**
 * Check if key matches
 */
export function isKey(event: React.KeyboardEvent, key: string): boolean {
  return event.key === key;
}

/**
 * Check if keyboard event should trigger action (Enter or Space)
 */
export function isActionKey(event: React.KeyboardEvent): boolean {
  return isKey(event, Keys.ENTER) || isKey(event, Keys.SPACE);
}

/**
 * Handle keyboard activation (for custom interactive elements)
 */
export function handleKeyboardActivation(
  event: React.KeyboardEvent,
  callback: () => void,
): void {
  if (isActionKey(event)) {
    event.preventDefault();
    callback();
  }
}

/**
 * Focus trap for modals/dialogs
 */
export class FocusTrap {
  private element: HTMLElement;
  private focusableElements: HTMLElement[] = [];
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private previouslyFocused: HTMLElement | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    this.updateFocusableElements();
  }

  private updateFocusableElements(): void {
    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    this.focusableElements = Array.from(
      this.element.querySelectorAll<HTMLElement>(focusableSelectors),
    );

    this.firstFocusable = this.focusableElements[0] || null;
    this.lastFocusable =
      this.focusableElements[this.focusableElements.length - 1] || null;
  }

  public activate(): void {
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.firstFocusable?.focus();
    document.addEventListener("keydown", this.handleKeyDown);
  }

  public deactivate(): void {
    document.removeEventListener("keydown", this.handleKeyDown);
    this.previouslyFocused?.focus();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== Keys.TAB) {
      return;
    }

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusable) {
        event.preventDefault();
        this.lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusable) {
        event.preventDefault();
        this.firstFocusable?.focus();
      }
    }
  };
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite",
): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Get accessible name for element
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    return ariaLabel;
  }

  // Check aria-labelledby
  const labelledby = element.getAttribute("aria-labelledby");
  if (labelledby) {
    const labelElement = document.getElementById(labelledby);
    if (labelElement) {
      return labelElement.textContent || "";
    }
  }

  // Check label element (for inputs)
  if (element instanceof HTMLInputElement) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent || "";
    }
  }

  // Fallback to text content
  return element.textContent || "";
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  // Check aria-hidden
  if (element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  // Check if element or ancestors have display: none or visibility: hidden
  let current: HTMLElement | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

/**
 * Skip links helper
 */
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
  const skipLink = document.createElement("a");
  skipLink.href = `#${targetId}`;
  skipLink.className = "skip-link";
  skipLink.textContent = label;
  skipLink.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  });
  return skipLink;
}

/**
 * Roving tabindex manager (for arrow key navigation in lists)
 */
export class RovingTabIndex {
  private items: HTMLElement[] = [];
  private currentIndex: number = 0;

  constructor(items: HTMLElement[]) {
    this.items = items;
    this.updateTabIndex();
  }

  private updateTabIndex(): void {
    this.items.forEach((item, index) => {
      item.setAttribute("tabindex", index === this.currentIndex ? "0" : "-1");
    });
  }

  public focus(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
      this.updateTabIndex();
      this.items[index]?.focus();
    }
  }

  public focusNext(): void {
    this.focus((this.currentIndex + 1) % this.items.length);
  }

  public focusPrevious(): void {
    this.focus((this.currentIndex - 1 + this.items.length) % this.items.length);
  }

  public focusFirst(): void {
    this.focus(0);
  }

  public focusLast(): void {
    this.focus(this.items.length - 1);
  }

  public handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case Keys.ARROW_DOWN:
      case Keys.ARROW_RIGHT:
        event.preventDefault();
        this.focusNext();
        break;
      case Keys.ARROW_UP:
      case Keys.ARROW_LEFT:
        event.preventDefault();
        this.focusPrevious();
        break;
      case Keys.HOME:
        event.preventDefault();
        this.focusFirst();
        break;
      case Keys.END:
        event.preventDefault();
        this.focusLast();
        break;
    }
  }
}

/**
 * React hook for focus trap
 */
import { useEffect, useRef } from "react";

export function useFocusTrap(isActive: boolean) {
  const elementRef = useRef<HTMLElement | null>(null);
  const trapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }

    if (isActive) {
      trapRef.current = new FocusTrap(elementRef.current);
      trapRef.current.activate();
    }

    return () => {
      trapRef.current?.deactivate();
    };
  }, [isActive]);

  return elementRef;
}

/**
 * React hook for announcements
 */
export function useAnnouncement() {
  return (message: string, priority: "polite" | "assertive" = "polite") => {
    announceToScreenReader(message, priority);
  };
}

/**
 * React hook for roving tabindex
 */
export function useRovingTabIndex(itemsCount: number) {
  const rovingTabIndexRef = useRef<RovingTabIndex | null>(null);
  const itemsRef = useRef<HTMLElement[]>([]);

  const registerItem = (element: HTMLElement | null, index: number) => {
    if (element) {
      itemsRef.current[index] = element;
      
      if (itemsRef.current.length === itemsCount && !rovingTabIndexRef.current) {
        rovingTabIndexRef.current = new RovingTabIndex(itemsRef.current);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    rovingTabIndexRef.current?.handleKeyDown(event.nativeEvent);
  };

  return { registerItem, handleKeyDown };
}

/**
 * Accessible button props
 */
export function getAccessibleButtonProps(
  label: string,
  onClick: () => void,
): React.ButtonHTMLAttributes<HTMLButtonElement> {
  return {
    type: "button",
    "aria-label": label,
    onClick,
  };
}

/**
 * Accessible link props
 */
export function getAccessibleLinkProps(
  label: string,
  href: string,
): React.AnchorHTMLAttributes<HTMLAnchorElement> {
  return {
    href,
    "aria-label": label,
    rel: href.startsWith("http") ? "noopener noreferrer" : undefined,
  };
}







