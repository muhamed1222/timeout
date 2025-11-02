import { Mail, Phone, MapPin, Clock, MessageSquare } from "lucide-react";

export default function Contacts() {
  return (
    <div className="flex flex-col gap-5" data-testid="page-contacts">
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
    </div>
  );
}

