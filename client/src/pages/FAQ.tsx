import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

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
    answer: "Перейдите в раздел 'Редакция' и нажмите 'Создать график'. Укажите название графика, время начала и окончания смены, выберите рабочие дни недели. После создания графика вы сможете назначить его сотрудникам.",
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
    answer: "В разделе 'Редакция' нажмите 'Сгенерировать смены'. Выберите период генерации (дата начала и окончания) и опционально выберите конкретных сотрудников. Система создаст смены на основе назначенных графиков работы.",
  },
  {
    id: "10",
    question: "Как назначить график нескольким сотрудникам одновременно?",
    answer: "В разделе 'Редакция' нажмите 'Массовое назначение'. Выберите график, период действия и отметьте нужных сотрудников. Вы можете выбрать всех сотрудников сразу или выбрать конкретных. Нажмите 'Назначить' для применения графика.",
  },
];

export default function FAQ() {
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
    <div className="flex flex-col gap-5" data-testid="page-faq">
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
                  index < faqItems.length - 1 ? "mb-0" : ""
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
    </div>
  );
}

