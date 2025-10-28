import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, User, Bell, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// Типы для настроек пользователя
interface UserSettings {
  notifications: boolean;
  language: string;
  emailNotifications: boolean;
  desktopNotifications: boolean;
}

// Ключ для localStorage
const SETTINGS_KEY = 'user-settings';

// Получить настройки из localStorage
function getStoredSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  // Значения по умолчанию
  return {
    notifications: true,
    language: 'ru',
    emailNotifications: true,
    desktopNotifications: false,
  };
}

// Сохранить настройки в localStorage
function saveSettings(settings: UserSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Загрузка настроек из localStorage при монтировании
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings());
  const [hasChanges, setHasChanges] = useState(false);

  // Обработчики изменений настроек
  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    saveSettings(settings);
    setHasChanges(false);
    toast({
      title: "Настройки сохранены",
      description: "Ваши настройки успешно обновлены"
    });
  };

  const handleResetSettings = () => {
    const defaultSettings = getStoredSettings();
    setSettings(defaultSettings);
    setHasChanges(false);
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
              checked={settings.notifications}
              onCheckedChange={(checked) => updateSetting('notifications', checked)}
              data-testid="switch-notifications"
            />
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="space-y-1">
              <Label>Email уведомления</Label>
              <p className="text-sm text-muted-foreground">
                Получать уведомления на почту
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
              data-testid="switch-email-notifications"
            />
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="space-y-1">
              <Label>Desktop уведомления</Label>
              <p className="text-sm text-muted-foreground">
                Показывать уведомления на рабочем столе
              </p>
            </div>
            <Switch
              checked={settings.desktopNotifications}
              onCheckedChange={(checked) => updateSetting('desktopNotifications', checked)}
              data-testid="switch-desktop-notifications"
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
            <Select 
              value={settings.language} 
              onValueChange={(value) => updateSetting('language', value)}
            >
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.language === 'en' && 'English translation will be available in the next version'}
              {settings.language === 'ru' && 'Перевод на английский будет доступен в следующей версии'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={handleResetSettings}
          disabled={!hasChanges}
        >
          Отмена
        </Button>
        <Button 
          onClick={handleSaveSettings} 
          data-testid="button-save-settings"
          disabled={!hasChanges}
        >
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
}
