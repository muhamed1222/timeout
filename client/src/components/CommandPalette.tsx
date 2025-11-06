/**
 * Command Palette Component
 *
 * Provides a command palette for quick actions (triggered with Ctrl+K / Cmd+K)
 */

import { useState, useEffect, useRef, type ElementType } from "react";
import { Dialog, DialogContent } from "@/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/ui/command";
import {
  useCommandPalette,
  useEscapeShortcut,
} from "@/hooks/useKeyboardShortcuts";
import { useLocation } from "wouter";
import {
  Home,
  Users,
  BarChart3,
  AlertTriangle,
  FileText,
  Calendar,
  Settings,
} from "lucide-react";

interface CommandAction {
  id: string;
  label: string;
  icon: ElementType;
  keywords: string[];
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useCommandPalette(() => setIsOpen(true));
  useEscapeShortcut(() => setIsOpen(false), isOpen);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const navigationActions: CommandAction[] = [
    {
      id: "dashboard",
      label: "Дашборд",
      icon: Home,
      keywords: ["дашборд", "dashboard", "главная", "home"],
      action: () => {
        setLocation("/");
        setIsOpen(false);
      },
    },
    {
      id: "employees",
      label: "Сотрудники",
      icon: Users,
      keywords: ["сотрудники", "employees", "люди", "people"],
      action: () => {
        setLocation("/employees");
        setIsOpen(false);
      },
    },
    {
      id: "rating",
      label: "Рейтинг",
      icon: BarChart3,
      keywords: ["рейтинг", "rating", "оценка", "score"],
      action: () => {
        setLocation("/rating");
        setIsOpen(false);
      },
    },
    {
      id: "exceptions",
      label: "Нарушения",
      icon: AlertTriangle,
      keywords: ["нарушения", "exceptions", "проблемы", "issues"],
      action: () => {
        setLocation("/exceptions");
        setIsOpen(false);
      },
    },
    {
      id: "reports",
      label: "Отчеты",
      icon: FileText,
      keywords: ["отчеты", "reports", "документы", "documents"],
      action: () => {
        setLocation("/reports");
        setIsOpen(false);
      },
    },
    {
      id: "schedules",
      label: "Графики",
      icon: Calendar,
      keywords: ["графики", "schedules", "расписание", "timetable"],
      action: () => {
        setLocation("/schedules");
        setIsOpen(false);
      },
    },
    {
      id: "settings",
      label: "Настройки",
      icon: Settings,
      keywords: ["настройки", "settings", "конфигурация", "config"],
      action: () => {
        setLocation("/settings");
        setIsOpen(false);
      },
    },
  ];

  const filteredActions = navigationActions.filter((action) => {
    if (!search.trim()) {
      return true;
    }
    const searchLower = search.toLowerCase();
    return (
      action.label.toLowerCase().includes(searchLower) ||
      action.keywords.some((keyword) => keyword.includes(searchLower))
    );
  });

  const handleSelect = (action: CommandAction) => {
    action.action();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-[600px] p-0"
        aria-label="Command Palette"
      >
        <Command className="rounded-lg border-none">
          <CommandInput
            ref={inputRef}
            placeholder="Введите команду или найдите страницу..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Команда не найдена.</CommandEmpty>
            <CommandGroup heading="Навигация">
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    value={action.id}
                    onSelect={() => handleSelect(action)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{action.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
