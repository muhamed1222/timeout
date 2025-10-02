import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, User, Bell, Globe, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("ru");

  const handleSaveSettings = () => {
    toast({
      title: "Настройки сохранены",
      description: "Ваши настройки успешно обновлены"
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-muted-foreground">Необходимо войти в систему</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" data-testid="page-settings">
      <div>
        <h1 className="text-3xl font-bold">Настройки пользователя</h1>
        <p className="text-muted-foreground">Управление личными настройками</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-lg">
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Профиль</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <div>
              <CardTitle>Уведомления</CardTitle>
              <CardDescription>Настройка оповещений</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Уведомления о событиях</Label>
              <p className="text-sm text-muted-foreground">
                Получать уведомления о новых событиях
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
              data-testid="switch-notifications"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <div>
              <CardTitle>Локализация</CardTitle>
              <CardDescription>Язык и региональные настройки</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Язык интерфейса</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Отмена
        </Button>
        <Button onClick={handleSaveSettings} data-testid="button-save-settings">
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
}
