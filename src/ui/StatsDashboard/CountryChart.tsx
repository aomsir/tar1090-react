import { useTranslation } from 'react-i18next';
import { ChartCard } from './ChartCard';
import { RankedBarList } from './RankedBarList';

interface CountryChartProps {
  data: { name: string; count: number }[];
}

export function CountryChart({ data }: CountryChartProps) {
  const { t } = useTranslation();
  return (
    <ChartCard title={t('stats.charts.countryDistribution')}>
      <RankedBarList items={data} emptyText={t('stats.noData')} />
    </ChartCard>
  );
}
