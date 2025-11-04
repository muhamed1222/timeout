import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/form";
import { Link } from "wouter";
import { UserPlus, Loader2 } from "lucide-react";

const registerSchema = z.object({
  full_name: z.string().min(1, "Введите полное имя"),
  company_name: z.string().min(1, "Введите название компании"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  password_confirm: z.string().min(6, "Подтвердите пароль"),
}).refine((data) => data.password === data.password_confirm, {
  message: "Пароли не совпадают",
  path: ["password_confirm"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      company_name: "",
      email: "",
      password: "",
      password_confirm: "",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          company_name: values.company_name,
          full_name: values.full_name,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: data.error,
        });
        return;
      }

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Ошибка регистрации",
          description: "Произошла ошибка при регистрации",
        });
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) {
        toast({
          variant: "destructive",
          title: "Ошибка входа",
          description: authError.message,
        });
        return;
      }

      if (authData.user) {
        toast({
          title: "Регистрация успешна",
          description: "Добро пожаловать!",
        });
        setLocation("/");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Произошла непредвиденная ошибка",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] p-4">
      <div className="w-full max-w-md bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-[#e16546]" />
              <h1 className="text-[30px] font-semibold text-[#1a1a1a]">Регистрация</h1>
            </div>
            <p className="text-sm text-[#565656] leading-[1.2]">
              Создайте аккаунт администратора и компанию
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#959595] leading-[1.2]">Полное имя</FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        placeholder="Иван Иванов"
                        data-testid="input-fullname"
                        className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0 w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#959595] leading-[1.2]">Название компании</FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        placeholder="ООО Компания"
                        data-testid="input-companyname"
                        className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0 w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#959595] leading-[1.2]">Email</FormLabel>
                    <FormControl>
                      <input
                        type="email"
                        placeholder="admin@example.com"
                        data-testid="input-email"
                        className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0 w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#959595] leading-[1.2]">Пароль</FormLabel>
                    <FormControl>
                      <input
                        type="password"
                        placeholder="••••••"
                        data-testid="input-password"
                        className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0 w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password_confirm"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#959595] leading-[1.2]">Подтверждение пароля</FormLabel>
                    <FormControl>
                      <input
                        type="password"
                        placeholder="••••••"
                        data-testid="input-password-confirm"
                        className="bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0 w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <button
                type="submit"
                className="w-full bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                disabled={isPending}
                data-testid="button-submit"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Регистрация...
                  </>
                ) : (
                  "Зарегистрироваться"
                )}
              </button>
            </form>
          </Form>

          <div className="text-center text-sm text-[#565656]">
            Уже есть аккаунт?{" "}
            <Link href="/login">
              <span className="text-[#e16546] hover:underline cursor-pointer" data-testid="link-login">
                Войти
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
