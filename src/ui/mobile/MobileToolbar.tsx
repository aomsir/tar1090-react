import { Home, Shield, LocateFixed, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToolbarStore } from '@/store/toolbarStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useReplay } from '@/features/playback/useReplay';

interface MobileToolbarProps {
  onResetView: () => void;
}

const BTN =
  'flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 active:bg-white/20';

export function MobileToolbar({ onResetView }: MobileToolbarProps) {
  const { t } = useTranslation();
  const onlyMilitary = useToolbarStore((s) => s.onlyMilitary);
  const follow = useToolbarStore((s) => s.follow);
  const toggle = useToolbarStore((s) => s.toggle);
  const mode = usePlaybackStore((s) => s.mode);
  const { enterHistory, exitToLive } = useReplay();
  const historyActive = mode === 'history';

  return (
    <nav
      data-testid="mobile-toolbar"
      className="glass absolute bottom-[3.75rem] right-3 z-10 flex flex-col gap-1 p-1"
    >
      <button
        type="button"
        aria-label={t('toolbar.resetMapView')}
        onClick={onResetView}
        className={BTN}
      >
        <Home size={20} />
      </button>
      <button
        type="button"
        aria-label={t('toolbar.onlyMilitaryAircraft')}
        aria-pressed={onlyMilitary}
        onClick={() => toggle('onlyMilitary')}
        className={`${BTN} ${onlyMilitary ? 'bg-blue-500/25 text-blue-300' : ''}`}
      >
        <Shield size={20} />
      </button>
      <button
        type="button"
        aria-label={t('toolbar.followSelectedAircraft')}
        aria-pressed={follow}
        onClick={() => toggle('follow')}
        className={`${BTN} ${follow ? 'bg-blue-500/25 text-blue-300' : ''}`}
      >
        <LocateFixed size={20} />
      </button>
      <button
        type="button"
        aria-label={t('replay.history')}
        aria-pressed={historyActive}
        onClick={() => {
          if (historyActive) exitToLive();
          else void enterHistory('1d');
        }}
        className={`${BTN} ${historyActive ? 'bg-blue-500/25 text-blue-300' : ''}`}
      >
        <History size={20} />
      </button>
    </nav>
  );
}
