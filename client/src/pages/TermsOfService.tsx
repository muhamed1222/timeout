import { AlertCircle, FileText, Scale, Gavel, Shield, Handshake } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="flex flex-col gap-5" data-testid="page-terms-of-service">
      <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#e16546]" />
          <div>
            <h3 className="text-base font-semibold text-black leading-[1.2]">Условия использования</h3>
            <p className="text-sm text-[#959595] leading-[1.2]">Последнее обновление: {new Date().toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </div>

        <div className="flex flex-col gap-5 pt-2">
          <section className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#e16546]" />
              1. Принятие условий
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Используя сервис OutTime (далее — «Сервис»), вы принимаете настоящие Условия использования. 
              Если вы не согласны с какими-либо условиями, пожалуйста, не используйте Сервис.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#e16546]" />
              2. Описание Сервиса
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              OutTime — это платформа для управления сотрудниками, отслеживания рабочего времени, контроля соблюдения 
              графика работы и управления рейтингом сотрудников. Сервис предоставляется в режиме «как есть» и может изменяться 
              или прерываться без предварительного уведомления.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#e16546]" />
              3. Регистрация и учетная запись
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Для использования Сервиса необходимо создать учетную запись. Вы обязуетесь:
            </p>
            <ul className="list-disc list-inside text-sm text-[#565656] leading-[1.2] space-y-1 ml-2">
              <li>Предоставлять точную и актуальную информацию</li>
              <li>Поддерживать безопасность вашей учетной записи и пароля</li>
              <li>Нести ответственность за все действия, совершенные под вашей учетной записью</li>
              <li>Немедленно уведомлять нас о любом несанкционированном использовании вашей учетной записи</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <Gavel className="w-4 h-4 text-[#e16546]" />
              4. Права и ограничения
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Вам предоставляется ограниченное, неисключительное, непередаваемое право на использование Сервиса 
              в личных или коммерческих целях. Вы не имеете права:
            </p>
            <ul className="list-disc list-inside text-sm text-[#565656] leading-[1.2] space-y-1 ml-2">
              <li>Использовать Сервис для незаконных целей</li>
              <li>Пытаться получить несанкционированный доступ к Сервису или связанным системам</li>
              <li>Копировать, модифицировать, распространять или создавать производные работы на основе Сервиса</li>
              <li>Использовать автоматизированные средства для доступа к Сервису без нашего разрешения</li>
              <li>Передавать доступ к вашей учетной записи третьим лицам</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2]">
              5. Интеллектуальная собственность
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Все материалы, включая, но не ограничиваясь текстом, графикой, логотипами, иконками, изображениями, 
              аудиоклипами, цифровыми загрузками, являются собственностью Сервиса или его поставщиков контента и защищены 
              законами об авторском праве и товарных знаках.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2]">
              6. Ответственность пользователя
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Вы несете полную ответственность за данные, которые загружаете, публикуете, передаете или иным образом 
              используете через Сервис. Вы гарантируете, что имеете все необходимые права на такие данные и что их использование 
              не нарушает права третьих лиц.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2] flex items-center gap-2">
              <Handshake className="w-4 h-4 text-[#e16546]" />
              7. Ограничение ответственности
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Сервис предоставляется «как есть» без каких-либо гарантий. Мы не гарантируем, что Сервис будет работать 
              непрерывно, безопасно или без ошибок. В максимальной степени, разрешенной законом, мы не несем ответственности 
              за любые прямые, косвенные, случайные или последующие убытки, возникшие в результате использования или 
              невозможности использования Сервиса.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2]">
              8. Изменение условий
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Мы оставляем за собой право изменять настоящие Условия использования в любое время. О существенных изменениях 
              мы будем уведомлять вас по email или через Сервис. Продолжение использования Сервиса после внесения изменений 
              означает ваше согласие с новыми условиями.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2]">
              9. Прекращение использования
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Мы оставляем за собой право приостановить или прекратить доступ к вашей учетной записи и Сервису в любое время, 
              по любой причине, включая нарушение настоящих Условий использования, без предварительного уведомления.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2]">
              10. Применимое право
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Настоящие Условия использования регулируются и толкуются в соответствии с законодательством Российской Федерации. 
              Любые споры, возникающие в связи с использованием Сервиса, подлежат разрешению в судах по месту нахождения 
              правообладателя Сервиса.
            </p>
          </section>

          <section className="flex flex-col gap-3 pt-2 border-t border-[#eeeeee]">
            <h4 className="text-sm font-semibold text-black leading-[1.2]">
              11. Контакты
            </h4>
            <p className="text-sm text-[#565656] leading-[1.2]">
              По всем вопросам, связанным с настоящими Условиями использования, вы можете обращаться к нам через раздел 
              «Настройки» → «Уведомления» или отправить запрос на электронную почту, указанную в вашем аккаунте.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

