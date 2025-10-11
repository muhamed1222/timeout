import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Link } from 'wouter';
import { LogIn, Copy, Check } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const demoCredentials = {
    email: 'demo@timeout.app',
    password: 'Demo1234!',
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: 'Скопировано',
        description: `${field === 'email' ? 'Email' : 'Пароль'} скопирован в буфер обмена`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось скопировать в буфер обмена',
      });
    }
  };

  const fillDemoCredentials = () => {
    form.setValue('email', demoCredentials.email);
    form.setValue('password', demoCredentials.password);
    toast({
      title: 'Данные заполнены',
      description: 'Демо-данные автоматически заполнены',
    });
  };

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Ошибка входа',
          description: error.message,
        });
        return;
      }

      if (data.user) {
        toast({
          title: 'Успешный вход',
          description: 'Добро пожаловать!',
        });
        setLocation('/');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Произошла непредвиденная ошибка',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <LogIn className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold">Вход в систему</CardTitle>
          </div>
          <CardDescription>
            Введите ваши данные для входа в панель управления
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        data-testid="input-email"
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Нет аккаунта?{' '}
            <Link href="/register">
              <span className="text-primary hover:underline cursor-pointer" data-testid="link-register">
                Зарегистрироваться
              </span>
            </Link>
          </div>
          
          {/* Demo Credentials Block */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <h3 className="text-sm font-medium text-muted-foreground">Демо-аккаунт</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <div className="flex items-center gap-1">
                  <code className="bg-background px-2 py-1 rounded text-xs">{demoCredentials.email}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(demoCredentials.email, 'email')}
                  >
                    {copiedField === 'email' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Пароль:</span>
                <div className="flex items-center gap-1">
                  <code className="bg-background px-2 py-1 rounded text-xs">{demoCredentials.password}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(demoCredentials.password, 'password')}
                  >
                    {copiedField === 'password' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={fillDemoCredentials}
            >
              Заполнить демо-данные
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
