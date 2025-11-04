/**
 * Компонент карточки приглашения
 * Отображает информацию о приглашении с возможностью копирования и удаления
 */

import { memo } from "react";
import { QrCode, Copy, Trash2 } from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import type { EmployeeInvite } from "@/types";

export interface IInviteCardProps {
  /** Данные приглашения */
  invite: EmployeeInvite;
  /** Показывать ли QR код для этого приглашения */
  isQRCodeVisible?: boolean;
  /** Обработчик показа QR кода */
  onShowQR?: (inviteId: string) => void;
  /** Обработчик копирования кода */
  onCopyCode?: (code: string) => void;
  /** Обработчик удаления */
  onDelete?: (inviteId: string) => void;
}

export const InviteCard = memo(function InviteCard({
  invite,
  onShowQR,
  onCopyCode,
  onDelete,
}: IInviteCardProps) {
  return (
    <Card
      key={invite.id}
      className="hover-elevate"
      data-testid={`invite-card-${invite.id}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{invite.full_name}</CardTitle>
        <p className="text-sm text-muted-foreground">{invite.position}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono">
            {invite.code}
          </code>
          {onCopyCode && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => onCopyCode(invite.code)}
              data-testid={`button-copy-invite-${invite.id}`}
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => onDelete(invite.id)}
              data-testid={`button-delete-invite-${invite.id}`}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        {onShowQR && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onShowQR(invite.code)}
            data-testid={`button-show-qr-${invite.id}`}
          >
            <QrCode className="w-4 h-4 mr-2" />
            Показать QR-код
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

