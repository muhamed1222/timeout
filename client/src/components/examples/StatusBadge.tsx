import StatusBadge from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      <StatusBadge status="planned" />
      <StatusBadge status="active" />
      <StatusBadge status="break" />
      <StatusBadge status="done" />
      <StatusBadge status="missed" />
      <StatusBadge status="late" />
    </div>
  );
}