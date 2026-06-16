import { CommandBar } from '@/ui/CommandBar/CommandBar';
import { ListPanel } from '@/ui/ListPanel/ListPanel';
import { DetailCard } from '@/ui/DetailCard/DetailCard';
import { ReplayBar } from '@/ui/ReplayBar/ReplayBar';

export function AppShell() {
  return (
    <div className="bg-background relative h-full w-full overflow-hidden">
      <div data-testid="map-root" className="absolute inset-0" />
      <CommandBar />
      <DetailCard />
      <ListPanel />
      <ReplayBar />
    </div>
  );
}
