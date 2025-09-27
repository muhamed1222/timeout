import DashboardStats from '../DashboardStats';

export default function DashboardStatsExample() {
  //todo: remove mock functionality
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">Статистика дашборда</h2>
      <DashboardStats
        totalEmployees={24}
        activeShifts={12}
        completedShifts={8}
        exceptions={3}
      />
    </div>
  );
}