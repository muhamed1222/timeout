import { useState, useEffect } from "react";
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
import { LogIn, Copy, Check, Loader2, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

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

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"oauth" | "manual">("oauth");
  const [manualMode, setManualMode] = useState<"login" | "register">("login");

  // Обработка возврата из OAuth потока
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Проверяем наличие параметров OAuth callback в URL (query или hash)
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const error = urlParams.get("error") || hashParams.get("error");
      const errorDescription = urlParams.get("error_description") || hashParams.get("error_description");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      console.log("OAuth callback params:", { 
        error, 
        accessToken: accessToken ? "present" : "missing", 
        refreshToken: refreshToken ? "present" : "missing",
        type,
        hash: window.location.hash.substring(0, 100),
      });

      // Обработка ошибок
      if (error) {
        // Маппинг кодов ошибок на понятные сообщения
        const errorMessages: Record<string, string> = {
          "invalid_state": "Неверный запрос. Попробуйте войти снова.",
          "missing_code": "Не получен код авторизации от Яндекс.",
          "server_config": "OAuth не настроен на сервере. Обратитесь к администратору.",
          "token_exchange_failed": "Не удалось обменять код на токен. Проверьте настройки OAuth.",
          "no_access_token": "Не получен токен доступа от Яндекс.",
          "user_info_failed": "Не удалось получить информацию о пользователе из Яндекс.",
          "no_email": "В вашем аккаунте Яндекс не указан email. Укажите email в настройках аккаунта.",
          "user_creation_failed": "Не удалось создать пользователя. Попробуйте позже.",
          "session_creation_failed": "Не удалось создать сессию. Попробуйте войти снова.",
          "session_failed": "Не удалось создать сессию. Попробуйте войти снова.",
          "server_error": "Ошибка на сервере. Попробуйте позже.",
          "unknown_error": "Произошла неизвестная ошибка. Попробуйте позже.",
        };
        
        const errorMessage = errorMessages[error] || errorDescription || "Не удалось авторизоваться через Яндекс";
        
        console.error("Yandex OAuth error:", { error, errorDescription });
        
        toast({
          variant: "destructive",
          title: "Ошибка авторизации",
          description: errorMessage,
        });
        // Очищаем URL от параметров ошибки
        window.history.replaceState({}, "", "/login");
        setIsLoading(false);
        return;
      }

      // Если есть токен в hash (возврат с сервера после OAuth)
      // Обрабатываем токены независимо от типа, так как сервер может вернуть разные форматы
      if (accessToken) {
        console.log("Setting session with access token", { 
          hasRefreshToken: !!refreshToken,
          type, 
        });
        
        try {
          // Устанавливаем сессию через Supabase
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (sessionError) {
            console.error("Session error:", sessionError);
            toast({
              variant: "destructive",
              title: "Ошибка",
              description: sessionError.message || "Не удалось установить сессию",
            });
            window.history.replaceState({}, "", "/login");
            setIsLoading(false);
            return;
          }

          if (session?.user) {
            console.log("Session established successfully", { userId: session.user.id });
            toast({
              title: "Успешный вход",
              description: "Добро пожаловать!",
            });
            // Очищаем URL от OAuth параметров
            window.history.replaceState({}, "", "/");
            setLocation("/");
          } else {
            console.warn("No user in session after setSession");
            toast({
              variant: "destructive",
              title: "Ошибка",
              description: "Сессия не содержит данные пользователя",
            });
            window.history.replaceState({}, "", "/login");
          }
        } catch (err: any) {
          console.error("Exception setting session:", err);
          toast({
            variant: "destructive",
            title: "Ошибка",
            description: err.message || "Не удалось установить сессию",
          });
          window.history.replaceState({}, "", "/login");
        } finally {
          setIsLoading(false);
        }
      } else {
        // Нет токена и нет ошибки - возможно, пользователь просто открыл страницу
        // Сбрасываем loading state на всякий случай
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [toast, setLocation]);

  const demoCredentials = {
    email: "demo@timeout.app",
    password: "Demo1234!",
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Скопировано",
        description: `${field === "email" ? "Email" : "Пароль"} скопирован в буфер обмена`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось скопировать в буфер обмена",
      });
    }
  };

  const fillDemoCredentials = () => {
    loginForm.setValue("email", demoCredentials.email);
    loginForm.setValue("password", demoCredentials.password);
    toast({
      title: "Данные заполнены",
      description: "Демо-данные автоматически заполнены",
    });
  };

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      company_name: "",
      email: "",
      password: "",
      password_confirm: "",
    },
  });

  async function onLoginSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Ошибка входа",
          description: error.message,
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Успешный вход",
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
      setIsLoading(false);
    }
  }

  async function onRegisterSubmit(values: RegisterFormValues) {
    setIsLoading(true);
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

      // Проверяем статус и Content-Type перед парсингом JSON
      if (!response.ok) {
        // Пытаемся прочитать JSON с ошибкой, если есть
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            toast({
              variant: "destructive",
              title: "Ошибка регистрации",
              description: errorData.error || "Произошла ошибка при регистрации",
            });
            return;
          } catch (jsonError) {
            // Не удалось распарсить JSON
            console.error("Failed to parse error response:", jsonError);
          }
        }
        
        // Если JSON не удалось прочитать или это не JSON
        toast({
          variant: "destructive",
          title: "Ошибка регистрации",
          description: `Ошибка сервера: ${response.status} ${response.statusText}`,
        });
        return;
      }

      // Теперь безопасно читаем JSON успешного ответа
      const data = await response.json();

      if (data.error) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: data.error,
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
      setIsLoading(false);
    }
  }

  const handleYandexOAuth = async () => {
    try {
      setIsLoading(true);
      
      // Редиректим на серверный endpoint для OAuth
      window.location.href = "/api/auth/yandex";
      
      // Пользователь будет перенаправлен на Яндекс, затем обратно на callback
      // Loading state будет сброшен после возврата
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Произошла непредвиденная ошибка при авторизации",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] p-4">
      <div className="w-full max-w-md bg-white rounded-[20px] p-5 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)] border-0">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <LogIn className="h-6 w-6 text-[#e16546]" />
              <h1 className="text-[30px] font-semibold text-[#1a1a1a]">
                {authMode === "oauth" ? "Вход в систему" : manualMode === "login" ? "Вход в систему" : "Регистрация"}
              </h1>
            </div>
            <p className="text-sm text-[#565656] leading-[1.2]">
              {authMode === "oauth" 
                ? "Войдите через Яндекс или используйте ручной ввод"
                : manualMode === "login"
                  ? "Введите ваши данные для входа в панель управления"
                  : "Создайте аккаунт администратора и компанию"}
            </p>
          </div>

          {/* OAuth Section */}
          {authMode === "oauth" && (
            <>
              <button
                type="button"
                onClick={handleYandexOAuth}
                disabled={isLoading}
                className="w-full bg-[#fc3f1d] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#e5391c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                data-testid="button-yandex-oauth"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Перенаправление...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.5 0C5.6 0 0 5.1 0 11.4c0 3.6 2.1 6.8 5.3 8.7.6.3.1.5-.3.3-1.7-1-2.5-2.3-2.5-4.3 0-3.1 2.7-5.6 6-5.6s6 2.5 6 5.6c0 2-.8 3.3-2.5 4.3-.4.2-.9 0-.3-.3 3.2-1.9 5.3-5.1 5.3-8.7C19 5.1 16.5 0 12.5 0z"/>
                    </svg>
                    Войти через Яндекс
                  </>
                )}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#eeeeee]"></div>
                <span className="text-xs text-[#959595]">или</span>
                <div className="flex-1 h-px bg-[#eeeeee]"></div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("manual");
                  setManualMode("login");
                }}
                className="w-full bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm font-medium text-[#565656] leading-[1.2] hover:bg-[#eeeeee] transition-colors inline-flex items-center justify-center gap-2"
                data-testid="button-manual-auth"
              >
                <Mail className="w-4 h-4" />
                Ввести почту вручную
              </button>
            </>
          )}

          {/* Manual Auth Section */}
          {authMode === "manual" && (
            <>
              {/* Toggle between login and register */}
              <div className="flex items-center gap-2 bg-[#f8f8f8] rounded-[20px] p-1">
                <button
                  type="button"
                  onClick={() => setManualMode("login")}
                  className={`flex-1 px-4 py-2 rounded-[20px] text-sm font-medium transition-colors ${
                    manualMode === "login"
                      ? "bg-white text-[#e16546] shadow-sm"
                      : "bg-transparent text-[#565656] hover:text-[#1a1a1a]"
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => setManualMode("register")}
                  className={`flex-1 px-4 py-2 rounded-[20px] text-sm font-medium transition-colors ${
                    manualMode === "register"
                      ? "bg-white text-[#e16546] shadow-sm"
                      : "bg-transparent text-[#565656] hover:text-[#1a1a1a]"
                  }`}
                >
                  Регистрация
                </button>
              </div>

              {/* Login Form */}
              {manualMode === "login" && (
                <>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="flex flex-col gap-4">
                      <FormField
                        control={loginForm.control}
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
                        control={loginForm.control}
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
                      <button
                        type="submit"
                        className="w-full bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        disabled={isLoading}
                        data-testid="button-submit"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Вход...
                          </>
                        ) : (
                          "Войти"
                        )}
                      </button>
                    </form>
                  </Form>

                  {/* Demo Credentials Block */}
                  <div className="mt-2 p-4 bg-[#f8f8f8] rounded-[12px] border border-dashed border-[#e0e0e0]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 bg-[#4ade80] rounded-full"></div>
                      <h3 className="text-sm font-medium text-[#1a1a1a]">Демо-аккаунт</h3>
                    </div>
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#565656]">Email:</span>
                        <div className="flex items-center gap-1">
                          <code className="bg-white px-2 py-1 rounded-[8px] text-xs text-[#1a1a1a]">{demoCredentials.email}</code>
                          <button
                            className="h-6 w-6 p-0 hover:bg-white/50 rounded transition-colors flex items-center justify-center"
                            onClick={() => copyToClipboard(demoCredentials.email, "email")}
                          >
                            {copiedField === "email" ? (
                              <Check className="h-3 w-3 text-[#4ade80]" />
                            ) : (
                              <Copy className="h-3 w-3 text-[#565656]" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#565656]">Пароль:</span>
                        <div className="flex items-center gap-1">
                          <code className="bg-white px-2 py-1 rounded-[8px] text-xs text-[#1a1a1a]">{demoCredentials.password}</code>
                          <button
                            className="h-6 w-6 p-0 hover:bg-white/50 rounded transition-colors flex items-center justify-center"
                            onClick={() => copyToClipboard(demoCredentials.password, "password")}
                          >
                            {copiedField === "password" ? (
                              <Check className="h-3 w-3 text-[#4ade80]" />
                            ) : (
                              <Copy className="h-3 w-3 text-[#565656]" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      className="w-full mt-3 bg-white border border-[#e0e0e0] px-[17px] py-2 rounded-[40px] text-xs font-medium text-[#1a1a1a] leading-[1.2] hover:bg-[#f0f0f0] transition-colors"
                      onClick={fillDemoCredentials}
                    >
                      Заполнить демо-данные
                    </button>
                  </div>
                </>
              )}

              {/* Register Form */}
              {manualMode === "register" && (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="flex flex-col gap-4">
                    <FormField
                      control={registerForm.control}
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
                      control={registerForm.control}
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
                      control={registerForm.control}
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
                      control={registerForm.control}
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
                      control={registerForm.control}
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
                      disabled={isLoading}
                      data-testid="button-submit"
                    >
                      {isLoading ? (
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
              )}

              {/* Back to OAuth button */}
              <button
                type="button"
                onClick={() => setAuthMode("oauth")}
                className="text-center text-sm text-[#565656] hover:text-[#1a1a1a] transition-colors"
              >
                ← Вернуться к выбору способа входа
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
