import { ShieldCheck, Lock, Eye, FileText, UserCheck } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col gap-5" data-testid="page-privacy-policy">
      <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#e16546]" />
          <div>
            <h3 className="text-base font-semibold text-black leading-[1.2]">Политика конфиденциальности</h3>
            <p className="text-sm text-[#959595] leading-[1.2]">Последнее обновление: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div className="flex flex-col gap-5 pt-2">
          <section className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#e16546]" />
              1. Общие положения
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей 
              сервиса OutTime (далее — «Сервис»). Используя Сервис, вы соглашаетесь с условиями настоящей Политики.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#e16546]" />
              2. Сбор персональных данных
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Мы собираем следующие типы персональных данных:
            </p>
            <ul className="list-disc list-inside text-sm text-[#565656] leading-[1.2] space-y-1 ml-2">
              <li>Имя и контактная информация (email, телефон)</li>
              <li>Данные о компании и сотрудниках</li>
              <li>Информация об использовании Сервиса (логи доступа, действия пользователей)</li>
              <li>Техническая информация (IP-адрес, тип браузера, устройство)</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#e16546]" />
              3. Использование персональных данных
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Персональные данные используются для:
            </p>
            <ul className="list-disc list-inside text-sm text-[#565656] leading-[1.2] space-y-1 ml-2">
              <li>Предоставления и улучшения функциональности Сервиса</li>
              <li>Обработки запросов и обращений пользователей</li>
              <li>Отправки уведомлений и важной информации</li>
              <li>Обеспечения безопасности и предотвращения мошенничества</li>
              <li>Соблюдения требований законодательства</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#e16546]" />
              4. Защита персональных данных
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Мы применяем современные технические и организационные меры для защиты персональных данных от несанкционированного доступа, 
              изменения, раскрытия или уничтожения. Все данные передаются по защищенным каналам связи с использованием шифрования.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#e16546]" />
              5. Права пользователей
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Вы имеете право:
            </p>
            <ul className="list-disc list-inside text-sm text-[#565656] leading-[1.2] space-y-1 ml-2">
              <li>Получать информацию о ваших персональных данных</li>
              <li>Требовать исправления неточных данных</li>
              <li>Требовать удаления ваших персональных данных</li>
              <li>Отозвать согласие на обработку персональных данных</li>
              <li>Ограничить обработку персональных данных</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2]">
              6. Передача данных третьим лицам
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Мы не передаем ваши персональные данные третьим лицам, за исключением случаев, когда это необходимо для предоставления Сервиса, 
              требуется по закону или с вашего явного согласия.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2]">
              7. Изменения в Политике конфиденциальности
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. 
              О существенных изменениях мы будем уведомлять вас по email или через Сервис.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2]">
              8. Контакты
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              По всем вопросам, связанным с обработкой персональных данных, вы можете обращаться к нам через раздел 
              «Настройки» → «Уведомления» или отправить запрос на электронную почту, указанную в вашем аккаунте.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

