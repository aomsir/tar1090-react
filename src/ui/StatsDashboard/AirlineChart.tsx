import { useTranslation } from 'react-i18next';
import { ChartCard } from './ChartCard';
import { RankedBarList } from './RankedBarList';

interface AirlineChartProps {
  data: { name: string; count: number }[];
}

export function AirlineChart({ data }: AirlineChartProps) {
  const { t } = useTranslation();
  return (
    <ChartCard title={t('stats.charts.airlineDistribution')} contentClassName="overflow-hidden">
      <RankedBarList
        items={data}
        emptyText={t('stats.noData')}
        scrollable
        scrollLabel={t('stats.charts.airlineDistribution')}
      />
    </ChartCard>
  );
}
