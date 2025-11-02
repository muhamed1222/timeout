import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Lock, Eye, FileText, UserCheck, AlertCircle, Scale, Gavel, Shield, Handshake } from "lucide-react";

export default function Legal() {
  return (
    <div className="flex flex-col gap-5" data-testid="page-legal">
      <Tabs defaultValue="privacy" className="flex flex-col gap-5">
        <TabsList className="bg-[#f8f8f8] rounded-[20px] p-1 grid w-full grid-cols-2 h-auto">
          <TabsTrigger 
            value="privacy" 
            className="rounded-[20px] data-[state=active]:bg-white data-[state=active]:text-[#e16546] data-[state=active]:shadow-none py-2"
          >
            Политика конфиденциальности
          </TabsTrigger>
          <TabsTrigger 
            value="terms"
            className="rounded-[20px] data-[state=active]:bg-white data-[state=active]:text-[#e16546] data-[state=active]:shadow-none py-2"
          >
            Условия использования
          </TabsTrigger>
        </TabsList>

        {/* Privacy Policy Tab */}
        <TabsContent value="privacy" className="flex flex-col gap-4">
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
        </TabsContent>

        {/* Terms of Service Tab */}
        <TabsContent value="terms" className="flex flex-col gap-4">
          <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#e16546]" />
              <div>
                <h3 className="text-base font-semibold text-black leading-[1.2]">Условия использования</h3>
                <p className="text-sm text-[#959595] leading-[1.2]">Последнее обновление: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

