import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useHistoryStatsStore } from '@/store/historyStatsStore';
import { useToolbarStore } from '@/store/toolbarStore';
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

  return (
    <div
      data-testid="stats-dashboard"
      className="fixed inset-0 z-50 overflow-auto bg-[#0f1622]/95 backdrop-blur"
    >
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">History Statistics</h2>
          <button
            type="button"
            aria-label="Close statistics"
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
        />

        <div className="mt-4 grid grid-cols-3 gap-3">
          <TypeChart data={stats.typeDistribution} />
          <AirlineChart data={stats.airlineDistribution} />
          <SourceChart data={stats.sourceDistribution} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <TrafficTimeline data={stats.trafficTimeline} />
          <AltitudeChart data={stats.altitudeBins} />
          <CountryChart data={stats.countryDistribution} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <SpeedChart data={stats.speedBins} />
          <DistanceChart data={stats.distanceBins} />
        </div>
      </div>
    </div>
  );
}
