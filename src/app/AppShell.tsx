import { useEffect, useRef } from 'react';
import { CommandBar } from '@/ui/CommandBar/CommandBar';
import { ListPanel } from '@/ui/ListPanel/ListPanel';
import { DetailCard } from '@/ui/DetailCard/DetailCard';
import { ReplayBar } from '@/ui/ReplayBar/ReplayBar';
import { MapView } from '@/map/MapView';
import { useLiveData } from '@/features/live/useLiveData';
import { useUrlSync } from '@/app/useUrlSync';
import { useSelectionStore } from '@/store/selectionStore';
import type { MapController } from '@/map/MapController';

export function AppShell() {
  const controllerRef = useRef<MapController | null>(null);
  const selectedHex = useSelectionStore((s) => s.selectedHex);

  useLiveData(controllerRef);
  useUrlSync();

  useEffect(() => {
    controllerRef.current?.setSelected(selectedHex);
  }, [selectedHex]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0f1622]">
      <MapView
        onReady={(controller) => {
          controllerRef.current = controller;
          controller.onSelect((hex) => useSelectionStore.getState().select(hex));
          controller.setSelected(useSelectionStore.getState().selectedHex);
        }}
      />
      <CommandBar />
      <DetailCard />
      <ListPanel />
      <ReplayBar />
    </div>
  );
}
