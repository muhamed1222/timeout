import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteData: {
    id: string;
    code: string;
    full_name: string;
    position: string;
    link: string;
  } | null;
}

export function QRCodeModal({
  open,
  onOpenChange,
  inviteData,
}: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = useCallback(async () => {
    if (inviteData?.link) {
      try {
        await navigator.clipboard.writeText(inviteData.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Скопировано",
          description: "Ссылка скопирована в буфер обмена",
        });
      } catch {
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать ссылку",
          variant: "destructive",
        });
      }
    }
  }, [inviteData?.link, toast]);

  const handleClose = useCallback(() => {
    setCopied(false);
    onOpenChange(false);
  }, [onOpenChange]);

  if (!inviteData) {
    return null;
  }

  // Генерируем QR-код через API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteData.link)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR-код приглашения</DialogTitle>
          <DialogDescription>
            Отсканируйте QR-код для подключения сотрудника
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-48 h-48 border rounded-lg flex items-center justify-center bg-gray-50">
              <img
                src={qrCodeUrl}
                alt="QR код для подключения"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">
                Сотрудник: {inviteData.full_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Должность: {inviteData.position || "Не указана"}
              </p>
              <p className="text-xs text-muted-foreground">
                Код приглашения: {inviteData.code}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ссылка для подключения</Label>
            <div className="flex gap-2">
              <Input
                value={inviteData.link}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                disabled={copied}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">
              Инструкция для сотрудника:
            </h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Отсканируйте QR-код или перейдите по ссылке</li>
              <li>2. Откроется Telegram с ботом</li>
              <li>3. Нажмите "Начать" в боте</li>
              <li>4. Сотрудник будет автоматически подключен к системе</li>
            </ol>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Готово</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QRCodeModal;



