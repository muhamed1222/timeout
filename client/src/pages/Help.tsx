import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, BookOpen, MessageSquare, ChevronDown, ChevronUp, Mail, Phone, MapPin, Clock, Download, PlayCircle, FileText, Users, Calendar, Award, Settings } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: "1",
    question: "Как добавить нового сотрудника?",
    answer: "Для добавления нового сотрудника перейдите в раздел 'Сотрудники' и нажмите кнопку 'Добавить сотрудника'. Заполните форму с данными сотрудника (имя, фамилия, должность) и настройте график работы. После создания вы получите QR-код и ссылку для приглашения, которые нужно отправить сотруднику.",
  },
  {
    id: "2",
    question: "Как создать график работы?",
    answer: "Перейдите в раздел 'Настройки' → 'Графики' и нажмите 'Создать график'. Укажите название графика, время начала и окончания смены, выберите рабочие дни недели. После создания графика вы сможете назначить его сотрудникам.",
  },
  {
    id: "3",
    question: "Как работает рейтинг сотрудников?",
    answer: "Рейтинг сотрудников рассчитывается автоматически на основе выполнения смен, наличия нарушений и других факторов. Рейтинг отображается в разделе 'Рейтинг'. Вы можете вручную добавить нарушение или повысить рейтинг сотрудника при необходимости.",
  },
  {
    id: "4",
    question: "Что делать, если сотрудник опоздал?",
    answer: "Система автоматически отслеживает опоздания. Вы можете также вручную добавить нарушение в разделе 'Рейтинг', выбрав сотрудника и нажав 'Добавить нарушение'. Выберите тип нарушения из списка и добавьте комментарий при необходимости.",
  },
  {
    id: "5",
    question: "Как просмотреть отчеты сотрудников?",
    answer: "Все отчеты доступны в разделе 'Отчеты'. Вы можете фильтровать отчеты по датам, используя кнопку 'Выбрать дату'. Отчеты отображаются по датам, с информацией о выполненных задачах и препятствиях.",
  },
  {
    id: "6",
    question: "Как экспортировать данные?",
    answer: "В разделе 'Отчеты' нажмите кнопку 'Экспорт' для скачивания всех отчетов в формате CSV. Данные будут экспортированы с указанием даты, сотрудника, должности, выполненной работы и примечаний.",
  },
  {
    id: "7",
    question: "Как настроить правила нарушений?",
    answer: "Перейдите в 'Настройки' → 'Нарушения'. Здесь вы можете добавить новые правила нарушений, указать штраф в процентах, включить автоматическое определение и настроить активность правила. Каждое правило должно иметь уникальный код и название.",
  },
  {
    id: "8",
    question: "Как изменить пароль?",
    answer: "Перейдите в меню пользователя (правый верхний угол) → 'Пароль и безопасность'. Введите текущий пароль, новый пароль и подтвердите его. Нажмите 'Изменить пароль' для сохранения изменений.",
  },
  {
    id: "9",
    question: "Как сгенерировать смены для сотрудников?",
    answer: "В разделе 'Настройки' → 'Графики' нажмите 'Сгенерировать смены'. Выберите период генерации (дата начала и окончания) и опционально выберите конкретных сотрудников. Система создаст смены на основе назначенных графиков работы.",
  },
  {
    id: "10",
    question: "Как назначить график нескольким сотрудникам одновременно?",
    answer: "В разделе 'Настройки' → 'Графики' нажмите 'Массовое назначение'. Выберите график, период действия и отметьте нужных сотрудников. Вы можете выбрать всех сотрудников сразу или выбрать конкретных. Нажмите 'Назначить' для применения графика.",
  },
];

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

export default function Help() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col gap-5" data-testid="page-help">
      <Tabs defaultValue="faq" className="flex flex-col gap-5">
        <TabsList className="bg-[#f8f8f8] rounded-[20px] p-1 grid w-full grid-cols-3 h-auto">
          <TabsTrigger 
            value="faq" 
            className="rounded-[20px] data-[state=active]:bg-white data-[state=active]:text-[#e16546] data-[state=active]:shadow-none py-2"
          >
            FAQ
          </TabsTrigger>
          <TabsTrigger 
            value="guides"
            className="rounded-[20px] data-[state=active]:bg-white data-[state=active]:text-[#e16546] data-[state=active]:shadow-none py-2"
          >
            Руководства
          </TabsTrigger>
          <TabsTrigger 
            value="contacts"
            className="rounded-[20px] data-[state=active]:bg-white data-[state=active]:text-[#e16546] data-[state=active]:shadow-none py-2"
          >
            Контакты
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="flex flex-col gap-4">
          <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#e16546]" />
              <div>
                <h3 className="text-base font-semibold text-black leading-[1.2]">Вопросы и ответы</h3>
                <p className="text-sm text-[#959595] leading-[1.2]">Часто задаваемые вопросы об использовании сервиса</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {faqItems.map((item, index) => {
                const isOpen = openItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-[12px] p-3 flex flex-col gap-2 ${
                      index < faqItems.length - 1 ? 'mb-0' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="flex items-center justify-between w-full text-left"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${item.id}`}
                    >
                      <span className="text-sm font-medium text-black leading-[1.2] pr-2">
                        {item.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#959595] flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#959595] flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div
                        id={`faq-answer-${item.id}`}
                        className="text-sm text-[#565656] leading-[1.2] pt-2 border-t border-[#eeeeee]"
                      >
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Guides Tab */}
        <TabsContent value="guides" className="flex flex-col gap-4">
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
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex flex-col gap-4">
          <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#e16546]" />
              <div>
                <h3 className="text-base font-semibold text-black leading-[1.2]">Контакты</h3>
                <p className="text-sm text-[#959595] leading-[1.2]">Свяжитесь с нами для получения помощи</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[rgba(225,101,70,0.1)] rounded-full p-2 flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#e16546]" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <h4 className="text-sm font-semibold text-black leading-[1.2]">Электронная почта</h4>
                    <p className="text-sm text-[#565656] leading-[1.2]">support@timeout.app</p>
                    <p className="text-xs text-[#959595] leading-[1.2]">Ответим в течение 24 часов</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[rgba(225,101,70,0.1)] rounded-full p-2 flex-shrink-0">
                    <Phone className="w-5 h-5 text-[#e16546]" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <h4 className="text-sm font-semibold text-black leading-[1.2]">Телефон</h4>
                    <p className="text-sm text-[#565656] leading-[1.2]">+7 (800) 123-45-67</p>
                    <p className="text-xs text-[#959595] leading-[1.2]">Пн-Пт: 9:00 - 18:00 (МСК)</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[rgba(225,101,70,0.1)] rounded-full p-2 flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#e16546]" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <h4 className="text-sm font-semibold text-black leading-[1.2]">Адрес</h4>
                    <p className="text-sm text-[#565656] leading-[1.2]">Москва, ул. Примерная, д. 1</p>
                    <p className="text-xs text-[#959595] leading-[1.2]">Офис открыт для посещения по предварительной записи</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[rgba(225,101,70,0.1)] rounded-full p-2 flex-shrink-0">
                    <Clock className="w-5 h-5 text-[#e16546]" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <h4 className="text-sm font-semibold text-black leading-[1.2]">Время работы</h4>
                    <p className="text-sm text-[#565656] leading-[1.2]">Понедельник - Пятница: 9:00 - 18:00</p>
                    <p className="text-sm text-[#565656] leading-[1.2]">Суббота - Воскресенье: Выходной</p>
                    <p className="text-xs text-[#959595] leading-[1.2] mt-1">Время указано по московскому времени (МСК)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

