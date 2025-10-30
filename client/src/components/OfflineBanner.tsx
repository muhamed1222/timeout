/**
 * Offline Banner Component
 * 
 * Shows a banner when the user is offline
 */

import { useNetworkStatus } from "@/lib/errorHandling";
import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

export function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          Нет подключения к интернету. Некоторые функции могут быть недоступны.
        </AlertDescription>
      </Alert>
    </div>
  );
}




