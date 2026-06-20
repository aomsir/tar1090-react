import {
  Home,
  Sun,
  Moon,
  Maximize,
  Minimize,
  Tag,
  Tags,
  TextCursorInput,
  Route,
  Pin,
  Focus,
  ListChecks,
  ScanEye,
  Shield,
  LocateFixed,
  Shuffle,
  Settings,
} from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';
import { useToolbarStore } from '@/store/toolbarStore';
import { SettingsPanel } from './SettingsPanel';

interface ToolbarProps {
  onResetView: () => void;
  onRandomPlane: () => void;
}

function Separator() {
  return <div className="mx-auto h-px w-6 bg-white/10" />;
}

function GroupLabel({ children, color }: { children: string; color: string }) {
  return (
    <span className={`mt-1 text-[9px] tracking-wider ${color}`}>{children}</span>
  );
}

export function Toolbar({ onResetView, onRandomPlane }: ToolbarProps) {
  const state = useToolbarStore();

  return (
    <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2">
      <nav
        data-testid="toolbar"
        className="glass flex flex-col items-center gap-0.5 p-2"
      >
        {/* MAP group */}
        <GroupLabel color="text-emerald-300">MAP</GroupLabel>
        <ToolbarButton icon={Home} tooltip="Reset map view" onPress={onResetView} type="action" />
        <ToolbarButton
          icon={state.mapDim ? Moon : Sun}
          tooltip="Map brightness"
          isActive={state.mapDim}
          onPress={() => state.toggle('mapDim')}
        />
        <ToolbarButton
          icon={state.fullscreen ? Minimize : Maximize}
          tooltip="Fullscreen mode"
          isActive={state.fullscreen}
          onPress={() => useToolbarStore.setState((s) => ({ fullscreen: !s.fullscreen }))}
        />

        <Separator />

        {/* LABEL group */}
        <GroupLabel color="text-blue-300">LABEL</GroupLabel>
        <ToolbarButton
          icon={Tag}
          tooltip="Aircraft labels"
          isActive={state.enableLabels}
          onPress={() => state.toggle('enableLabels')}
        />
        <ToolbarButton
          icon={Tags}
          tooltip="Extended label details"
          isActive={state.extendedLabels > 0}
          onPress={() => state.cycleExtendedLabels()}
        />
        <ToolbarButton
          icon={TextCursorInput}
          tooltip="Track point labels"
          isActive={state.trackLabels}
          onPress={() => state.toggle('trackLabels')}
        />

        <Separator />

        {/* TRACK group */}
        <GroupLabel color="text-amber-300">TRACK</GroupLabel>
        <ToolbarButton
          icon={Route}
          tooltip="Show all tracks"
          isActive={state.allTracks}
          onPress={() => state.toggle('allTracks')}
        />
        <ToolbarButton
          icon={Pin}
          tooltip="Keep stale aircraft"
          isActive={state.persistence}
          onPress={() => state.toggle('persistence')}
        />
        <ToolbarButton
          icon={Focus}
          tooltip="Only selected aircraft"
          isActive={state.isolation}
          onPress={() => state.toggle('isolation')}
        />

        <Separator />

        {/* SELECT group */}
        <GroupLabel color="text-pink-300">SELECT</GroupLabel>
        <ToolbarButton
          icon={ListChecks}
          tooltip="Multi-select mode"
          isActive={state.multiSelect}
          onPress={() => state.toggle('multiSelect')}
        />
        <ToolbarButton
          icon={ScanEye}
          tooltip="Only aircraft in view"
          isActive={state.inViewOnly}
          onPress={() => state.toggle('inViewOnly')}
        />
        <ToolbarButton
          icon={Shield}
          tooltip="Only military aircraft"
          isActive={state.onlyMilitary}
          onPress={() => state.toggle('onlyMilitary')}
        />
        <ToolbarButton
          icon={LocateFixed}
          tooltip="Follow selected aircraft"
          isActive={state.follow}
          onPress={() => state.toggle('follow')}
        />
        <ToolbarButton icon={Shuffle} tooltip="Random aircraft" onPress={onRandomPlane} type="action" />

        <Separator />

        {/* SYSTEM group */}
        <GroupLabel color="text-slate-300">SYSTEM</GroupLabel>
        <ToolbarButton icon={Settings} tooltip="Open settings panel" onPress={() => state.toggleSettings()} type="action" />
      </nav>

      {state.settingsOpen && <SettingsPanel />}
    </div>
  );
}
