import { Badge } from "@/components/ui/badge";

interface ShiftRow {
  id: string;
  employeeName: string;
  position: string;
  startedAt: string;
  rating: string;
  status: "active" | "break" | "completed";
}

interface ShiftsTableProps {
  title: string;
  shifts: ShiftRow[];
}

export function ShiftsTable({ title, shifts }: ShiftsTableProps) {
  const getStatusBadge = (status: ShiftRow["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-[rgba(52,199,89,0.08)] text-[#34c759] hover:bg-[rgba(52,199,89,0.08)] rounded-full px-6 py-1">
            Активен
          </Badge>
        );
      case "break":
        return (
          <Badge className="bg-[rgba(255,204,0,0.08)] text-[#ffcc00] hover:bg-[rgba(255,204,0,0.08)] rounded-full px-6 py-1">
            Обед
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-[rgba(255,0,0,0.08)] text-[#ff0006] hover:bg-[rgba(255,0,0,0.08)] rounded-full px-6 py-1">
            Завершил
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#f8f8f8] rounded-[20px] p-4">
      <h3 className="text-xl font-semibold text-[#1a1a1a] mb-4">{title}</h3>
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-start w-full">
          <div className="flex-1 text-sm text-neutral-500">ФИО</div>
          <div className="flex-1 text-sm text-neutral-500">Должность</div>
          <div className="flex-1 text-sm text-neutral-500">Начал</div>
          <div className="flex-1 text-sm text-neutral-500">Рейтинг</div>
          <div className="flex-1 text-sm text-neutral-500">Статус</div>
        </div>
        {/* Rows */}
        {shifts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет данных
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="flex items-start w-full">
              <div className="flex-1 flex items-center gap-2">
                <div className="text-base text-[#1a1a1a]">{shift.employeeName}</div>
              </div>
              <div className="flex-1 flex items-center justify-center text-base text-neutral-500">
                {shift.position}
              </div>
              <div className="flex-1 flex items-center justify-center text-base text-neutral-500">
                {shift.startedAt}
              </div>
              <div className="flex-1 flex items-center justify-center text-base text-neutral-500">
                {shift.rating}
              </div>
              <div className="flex-1 flex items-center">
                {getStatusBadge(shift.status)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

