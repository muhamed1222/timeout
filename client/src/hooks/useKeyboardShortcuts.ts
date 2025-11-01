/**
 * Keyboard Shortcuts Hook
 * 
 * Provides global keyboard shortcuts for improved accessibility and UX
 * - `/` - Focus search input
 * - `Ctrl+K` / `Cmd+K` - Command palette / Quick actions
 * - `Esc` - Close modals/dialogs
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
  description?: string;
  preventDefault?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcutsRef.current) {
        const keyMatches = event.key === shortcut.key || event.code === shortcut.key;
        const ctrlMatches = shortcut.ctrlKey === undefined ? true : event.ctrlKey === shortcut.ctrlKey;
        const metaMatches = shortcut.metaKey === undefined ? true : event.metaKey === shortcut.metaKey;
        const shiftMatches = shortcut.shiftKey === undefined ? true : event.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined ? true : event.altKey === shortcut.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          // Check if we're in an input/textarea/contenteditable
          const target = event.target as HTMLElement;
          const isInputElement =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

          // Skip if shortcut key is `/` or `Ctrl+K` and we're in an input (to allow typing)
          if (
            (shortcut.key === '/' || shortcut.key === 'Slash') &&
            isInputElement
          ) {
            continue;
          }

          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }

          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

/**
 * Hook for focusing search input with `/` key
 */
export function useSearchShortcut(searchInputRef: React.RefObject<HTMLInputElement>) {
  useKeyboardShortcuts([
    {
      key: '/',
      description: 'Focus search input',
      callback: () => {
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus();
        }
      },
    },
  ]);
}

/**
 * Hook for command palette with Ctrl+K / Cmd+K
 */
export function useCommandPalette(onOpen: () => void) {
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrlKey: true,
      description: 'Open command palette',
      callback: onOpen,
    },
    {
      key: 'k',
      metaKey: true,
      description: 'Open command palette (Mac)',
      callback: onOpen,
    },
  ]);
}

/**
 * Hook for closing modals/dialogs with Esc
 */
export function useEscapeShortcut(onClose: () => void, enabled: boolean = true) {
  useKeyboardShortcuts([
    {
      key: 'Escape',
      description: 'Close modal/dialog',
      callback: onClose,
      preventDefault: enabled,
    },
  ]);
}

/**
 * Common keyboard shortcuts configuration
 */
export const commonShortcuts = {
  focusSearch: {
    key: '/',
    description: 'Focus search input',
  },
  openCommandPalette: {
    key: 'k',
    ctrlKey: true,
    description: 'Open command palette',
  },
  closeModal: {
    key: 'Escape',
    description: 'Close modal/dialog',
  },
} as const;

