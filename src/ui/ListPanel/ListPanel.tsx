export function ListPanel({ onSelect }: { onSelect: (hex: string) => void }) {
  void onSelect;
  return (
    <aside data-testid="list-panel" className="glass absolute bottom-16 right-4 top-16 w-60 p-3">
      <div className="text-muted text-sm">Aircraft list</div>
    </aside>
  );
}
