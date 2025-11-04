/**
 * WebSocket connection status indicator
 */

import { useWebSocket } from "@/hooks/useWebSocket";
import { Wifi, WifiOff } from "lucide-react";

interface IWebSocketStatusProps {
  userId?: string;
  companyId?: string;
  employeeId?: string;
}

export function WebSocketStatus({ userId, companyId, employeeId }: IWebSocketStatusProps) {
  const { isConnected } = useWebSocket({
    userId,
    companyId,
    employeeId,
  });

  return (
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-600 dark:text-green-400">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">Offline</span>
        </>
      )}
    </div>
  );
}







