import { BookOpen, PlayCircle, FileText, Download, Users, Calendar, Award, Settings } from "lucide-react";

interface Guide {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}

const guides: Guide[] = [
  {
    id: "1",
    title: "Начало работы",
    description: "Пошаговое руководство для новых пользователей. Настройка компании, добавление сотрудников и создание первых графиков работы.",
    category: "Основы",
    icon: PlayCircle,
  },
  {
    id: "2",
    title: "Управление сотрудниками",
    description: "Полное руководство по добавлению, редактированию и удалению сотрудников. Настройка графиков работы и отслеживание активности.",
    category: "Управление",
    icon: Users,
  },
  {
    id: "3",
    title: "Настройка графиков",
    description: "Создание шаблонов графиков, назначение графиков сотрудникам и массовое назначение. Генерация смен на основе графиков.",
    category: "Расписание",
    icon: Calendar,
  },
  {
    id: "4",
    title: "Рейтинг и нарушения",
    description: "Как работает система рейтинга сотрудников. Добавление нарушений, повышение рейтинга и настройка правил нарушений.",
    category: "Рейтинг",
    icon: Award,
  },
  {
    id: "5",
    title: "Отчеты и аналитика",
    description: "Просмотр и экспорт отчетов сотрудников. Фильтрация по датам и аналитика работы команды.",
    category: "Отчеты",
    icon: FileText,
  },
  {
    id: "6",
    title: "Настройки системы",
    description: "Настройка компании, правил нарушений и уведомлений. Управление профилем и безопасностью аккаунта.",
    category: "Настройки",
    icon: Settings,
  },
];

export default function Guides() {
  return (
    <div className="flex flex-col gap-5" data-testid="page-guides">
      <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#e16546]" />
          <div>
            <h3 className="text-base font-semibold text-black leading-[1.2]">Руководства</h3>
            <p className="text-sm text-[#959595] leading-[1.2]">Подробные инструкции по использованию системы</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <div
                key={guide.id}
                className="bg-white rounded-[12px] p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-[rgba(225,101,70,0.1)] rounded-full p-2 flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#e16546]" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-black leading-[1.2] mb-1">
                          {guide.title}
                        </h4>
                        <p className="text-xs text-[#959595] leading-[1.2] mb-2">
                          {guide.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#565656] bg-[#f8f8f8] px-2 py-1 rounded-[8px]">
                        {guide.category}
                      </span>
                      <button className="text-xs text-[#e16546] hover:text-[#d15536] transition-colors flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        Открыть
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

