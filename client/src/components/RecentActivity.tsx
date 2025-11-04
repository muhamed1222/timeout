import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, LogIn, LogOut, Coffee } from "lucide-react";
import EmployeeAvatar from "./EmployeeAvatar";

export type ActivityType = "shift_start" | "shift_end" | "break_start" | "break_end" | "report_submitted";

export interface ActivityItem {
  id: string;
  employeeName: string;
  employeeImage?: string;
  type: ActivityType;
  description: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  className?: string;
}

const activityConfig = {
  shift_start: {
    icon: LogIn,
    color: "text-shift-active",
    bgColor: "bg-shift-active/10",
  },
  shift_end: {
    icon: LogOut,
    color: "text-shift-done",
    bgColor: "bg-shift-done/10",
  },
  break_start: {
    icon: Coffee,
    color: "text-shift-break",
    bgColor: "bg-shift-break/10",
  },
  break_end: {
    icon: Coffee,
    color: "text-shift-active",
    bgColor: "bg-shift-active/10",
  },
  report_submitted: {
    icon: MessageSquare,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
};

export default function RecentActivity({ activities, className = "" }: RecentActivityProps) {
  return (
    <Card className={className} data-testid="card-recent-activity">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Последняя активность
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-sm">Нет активности</p>
          ) : (
            activities.map((activity) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              
              return (
                <div key={activity.id} className="flex items-start gap-3" data-testid={`activity-${activity.type}`}>
                  <div className={`p-1.5 rounded-lg ${config.bgColor} flex-shrink-0`}>
                    <Icon className={`w-3 h-3 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <EmployeeAvatar name={activity.employeeName} image={activity.employeeImage} size="sm" />
                      <span className="font-medium text-sm">{activity.employeeName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {activity.timestamp}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}