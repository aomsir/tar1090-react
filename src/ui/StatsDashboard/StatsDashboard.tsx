import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useHistoryStatsStore } from '@/store/historyStatsStore';
import { useToolbarStore } from '@/store/toolbarStore';
import { formatShortTime } from '@/i18n/format';
import { SummaryCards } from './SummaryCards';
import { TypeChart } from './TypeChart';
import { AirlineChart } from './AirlineChart';
import { CountryChart } from './CountryChart';
import { AltitudeChart } from './AltitudeChart';
import { SpeedChart } from './SpeedChart';
import { DistanceChart } from './DistanceChart';
import { TrafficTimeline } from './TrafficTimeline';
import { SourceChart } from './SourceChart';

export function StatsDashboard() {
  const { t, i18n } = useTranslation();
  const stats = useHistoryStatsStore((s) => s.stats);
  const toggle = useToolbarStore((s) => s.toggleStatsDashboard);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggle]);

  if (!stats) return null;

  const timeline = stats.trafficTimeline;
  const timeRange =
    timeline.length > 0
      ? `${formatShortTime(timeline[0].time, i18n.language)} – ${formatShortTime(
          timeline[timeline.length - 1].time,
          i18n.language,
        )}`
      : '';

  return (
    <div
      data-testid="stats-dashboard"
      className="fixed inset-0 z-50 overflow-auto bg-[#0d131d]/95 backdrop-blur"
    >
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold text-slate-200">{t('stats.title')}</h2>
            <span data-testid="stats-time-range" className="font-mono text-xs text-slate-500">
              {timeRange}
            </span>
          </div>
          <button
            type="button"
            aria-label={t('stats.close')}
            onClick={toggle}
            className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <SummaryCards
          totalAircraft={stats.totalAircraft}
          uniqueCallsigns={stats.uniqueCallsigns}
          militaryCount={stats.militaryCount}
          peakOnline={stats.peakOnline}
          peakTime={stats.peakTime}
        />

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <TrafficTimeline data={stats.trafficTimeline} />
          <AltitudeChart data={stats.altitudeBins} />
          <CountryChart data={stats.countryDistribution} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SpeedChart data={stats.speedBins} />
          <DistanceChart data={stats.distanceBins} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <TypeChart data={stats.typeDistribution} />
          <AirlineChart data={stats.airlineDistribution} />
          <SourceChart data={stats.sourceDistribution} />
        </div>
      </div>
    </div>
  );
}
