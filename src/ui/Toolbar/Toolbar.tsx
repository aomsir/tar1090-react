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
  BarChart3,
} from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';
import { useToolbarStore } from '@/store/toolbarStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useHistoryStatsStore } from '@/store/historyStatsStore';
import { SettingsPanel } from './SettingsPanel';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const state = useToolbarStore();
  const isHistory = usePlaybackStore((s) => s.mode) === 'history';
  const hasStats = useHistoryStatsStore((s) => s.stats !== null);

  return (
    <div data-testid="toolbar-shell" className="relative">
      <nav
        data-testid="toolbar"
        className="glass flex flex-col items-center gap-0.5 p-2"
      >
        {/* MAP group */}
        <GroupLabel color="text-emerald-300">{t('toolbar.groups.map')}</GroupLabel>
        <ToolbarButton icon={Home} tooltip={t('toolbar.resetMapView')} onPress={onResetView} type="action" />
        <ToolbarButton
          icon={state.mapDim ? Moon : Sun}
          tooltip={t('toolbar.mapBrightness')}
          isActive={state.mapDim}
          onPress={() => state.toggle('mapDim')}
        />
        {/* fullscreen is transient UI state, excluded from persisted toggle keys */}
        <ToolbarButton
          icon={state.fullscreen ? Minimize : Maximize}
          tooltip={t('toolbar.fullscreenMode')}
          isActive={state.fullscreen}
          onPress={() => useToolbarStore.setState((s) => ({ fullscreen: !s.fullscreen }))}
        />

        <Separator />

        {/* LABEL group */}
        <GroupLabel color="text-blue-300">{t('toolbar.groups.label')}</GroupLabel>
        <ToolbarButton
          icon={Tag}
          tooltip={t('toolbar.aircraftLabels')}
          isActive={state.enableLabels}
          onPress={() => state.toggle('enableLabels')}
        />
        <ToolbarButton
          icon={Tags}
          tooltip={t('toolbar.extendedLabelDetails')}
          isActive={state.extendedLabels > 0}
          onPress={() => state.cycleExtendedLabels()}
        />
        <ToolbarButton
          icon={TextCursorInput}
          tooltip={t('toolbar.trackPointLabels')}
          isActive={state.trackLabels}
          onPress={() => state.toggle('trackLabels')}
        />

        <Separator />

        {/* TRACK group */}
        <GroupLabel color="text-amber-300">{t('toolbar.groups.track')}</GroupLabel>
        <ToolbarButton
          icon={Route}
          tooltip={t('toolbar.showAllTracks')}
          isActive={state.allTracks}
          onPress={() => state.toggle('allTracks')}
        />
        <ToolbarButton
          icon={Pin}
          tooltip={t('toolbar.keepStaleAircraft')}
          isActive={state.persistence}
          onPress={() => state.toggle('persistence')}
        />
        <ToolbarButton
          icon={Focus}
          tooltip={t('toolbar.onlySelectedAircraft')}
          isActive={state.isolation}
          onPress={() => state.toggle('isolation')}
        />

        <Separator />

        {/* SELECT group */}
        <GroupLabel color="text-pink-300">{t('toolbar.groups.select')}</GroupLabel>
        <ToolbarButton
          icon={ListChecks}
          tooltip={t('toolbar.multiSelectMode')}
          isActive={state.multiSelect}
          onPress={() => state.toggle('multiSelect')}
        />
        <ToolbarButton
          icon={ScanEye}
          tooltip={t('toolbar.onlyAircraftInView')}
          isActive={state.inViewOnly}
          onPress={() => state.toggle('inViewOnly')}
        />
        <ToolbarButton
          icon={Shield}
          tooltip={t('toolbar.onlyMilitaryAircraft')}
          isActive={state.onlyMilitary}
          onPress={() => state.toggle('onlyMilitary')}
        />
        <ToolbarButton
          icon={LocateFixed}
          tooltip={t('toolbar.followSelectedAircraft')}
          isActive={state.follow}
          onPress={() => state.toggle('follow')}
        />
        <ToolbarButton icon={Shuffle} tooltip={t('toolbar.randomAircraft')} onPress={onRandomPlane} type="action" />

        <Separator />

        {/* SYSTEM group */}
        <GroupLabel color="text-slate-300">{t('toolbar.groups.system')}</GroupLabel>
        <ToolbarButton icon={Settings} tooltip={t('toolbar.openSettingsPanel')} onPress={() => state.toggleSettings()} type="action" />

        {isHistory && hasStats && (
          <>
            <Separator />
            <GroupLabel color="text-slate-300">{t('toolbar.groups.stats')}</GroupLabel>
            <ToolbarButton
              icon={BarChart3}
              tooltip={t('toolbar.statisticsDashboard')}
              onPress={() => state.toggleStatsDashboard()}
              type="action"
            />
          </>
        )}
      </nav>

      {state.settingsOpen && <SettingsPanel />}
    </div>
  );
}
