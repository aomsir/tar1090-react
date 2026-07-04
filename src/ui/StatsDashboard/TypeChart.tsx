import { useTranslation } from 'react-i18next';
import { ChartCard } from './ChartCard';
import { RankedBarList } from './RankedBarList';

interface TypeChartProps {
  data: { name: string; count: number }[];
}

export function TypeChart({ data }: TypeChartProps) {
  const { t } = useTranslation();
  return (
    <ChartCard title={t('stats.charts.typeDistribution')} contentClassName="overflow-hidden">
      <RankedBarList
        items={data}
        emptyText={t('stats.noData')}
        scrollable
        scrollLabel={t('stats.charts.typeDistribution')}
      />
    </ChartCard>
  );
}
