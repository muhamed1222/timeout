import { Link } from "wouter";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="h-full pt-5 pr-5 pb-5 flex items-center justify-center bg-[#FFFFFF]">
      <div className="text-center flex flex-col gap-5 items-center max-w-md">
        <div className="size-[120px] rounded-full bg-[rgba(225,101,70,0.1)] flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-[#e16546]" />
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-[30px] font-semibold text-[#1a1a1a]">404</h1>
          <h2 className="text-xl font-semibold text-[#1a1a1a]">
            Страница не найдена
          </h2>
          <p className="text-sm text-[#565656] leading-[1.2]">
            Запрашиваемая страница не существует или была перемещена.
          </p>
        </div>

        <Link href="/">
          <button
            data-testid="button-home"
            className="inline-flex items-center gap-2 bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors"
          >
            <Home className="w-4 h-4" />
            На главную
          </button>
        </Link>
      </div>
    </div>
  );
}