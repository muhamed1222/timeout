import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  confirmPassword: z.string().min(1, "Подтвердите новый пароль"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function Security() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      // Проверяем текущий пароль
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: data.currentPassword,
      });

      if (signInError) {
        toast({
          title: "Ошибка",
          description: "Текущий пароль неверен",
          variant: "destructive",
        });
        setIsChangingPassword(false);
        return;
      }

      // Обновляем пароль
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) {
        toast({
          title: "Ошибка",
          description: updateError.message || "Не удалось изменить пароль",
          variant: "destructive",
        });
        setIsChangingPassword(false);
        return;
      }

      toast({
        title: "Пароль изменен",
        description: "Ваш пароль успешно обновлен",
      });

      form.reset();
      setIsChangingPassword(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при изменении пароля",
        variant: "destructive",
      });
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-5" data-testid="page-security">
      {/* Смена пароля */}
      <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#e16546]" />
          <div>
            <h3 className="text-base font-semibold text-black leading-[1.2]">Смена пароля</h3>
            <p className="text-sm text-[#959595] leading-[1.2]">Измените ваш текущий пароль</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-sm font-medium text-black leading-[1.2]">Текущий пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        {...field}
                        className="bg-white border-0 rounded-[12px] px-[14px] py-3 pr-10 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                        placeholder="Введите текущий пароль"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#959595] hover:text-black transition-colors"
                        aria-label={showCurrentPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-sm font-medium text-black leading-[1.2]">Новый пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        {...field}
                        className="bg-white border-0 rounded-[12px] px-[14px] py-3 pr-10 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                        placeholder="Введите новый пароль"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#959595] hover:text-black transition-colors"
                        aria-label={showNewPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-sm font-medium text-black leading-[1.2]">Подтвердите новый пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        {...field}
                        className="bg-white border-0 rounded-[12px] px-[14px] py-3 pr-10 focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                        placeholder="Повторите новый пароль"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#959595] hover:text-black transition-colors"
                        aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Изменить пароль"
                )}
              </button>
            </div>
          </form>
        </Form>
      </div>

      {/* Безопасность аккаунта */}
      <div className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#e16546]" />
          <div>
            <h3 className="text-base font-semibold text-black leading-[1.2]">Безопасность аккаунта</h3>
            <p className="text-sm text-[#959595] leading-[1.2]">Дополнительные настройки безопасности</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pt-2 border-t border-[#eeeeee]">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-medium text-black leading-[1.2]">Email</Label>
              <p className="text-sm text-[#565656] leading-[1.2]">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#eeeeee]">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-medium text-black leading-[1.2]">User ID</Label>
              <p className="text-xs text-[#565656] font-mono leading-[1.2]">{user?.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

