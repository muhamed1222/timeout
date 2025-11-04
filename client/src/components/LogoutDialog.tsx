import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutDialog({ open, onOpenChange }: LogoutDialogProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      queryClient.clear();
      setLocation("/login");
      toast({ 
        title: "Вы вышли из аккаунта",
        description: "Сеанс завершен",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось выйти из аккаунта",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0 max-w-md [&>button]:hidden">
        <div className="flex flex-col gap-5 items-center">
          <div className="size-[120px] rounded-full bg-[rgba(255,59,48,0.1)] flex items-center justify-center">
            <LogOut className="w-12 h-12 text-[#ff3b30]" />
          </div>

          <div className="flex flex-col items-center gap-2 w-full">
            <h3 className="text-xl font-semibold text-[#1a1a1a] text-center leading-[1.2]">
              Выйти из системы?
            </h3>
            <p className="text-sm text-[#565656] text-center leading-[1.2]">
              Вы уверены, что хотите выйти из системы? Вам нужно будет снова войти в систему, чтобы получить доступ к своей учетной записи.
            </p>
          </div>

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoggingOut}
              className="flex-1 bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отменить
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 bg-[#ff3b30] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#ff2b20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Выход...
                </>
              ) : (
                "Выйти"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

