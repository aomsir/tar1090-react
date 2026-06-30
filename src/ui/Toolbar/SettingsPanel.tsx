import { Button, ToggleButtonGroup, ToggleButton, Slider, Switch, Label } from '@heroui/react';
import type { Key } from '@heroui/react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToolbarStore } from '@/store/toolbarStore';
import type { Units } from '@/store/toolbarStore';
import { LANGUAGE_OPTIONS } from '@/i18n/types';
import type { SupportedLanguage } from '@/i18n/types';

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-400">{children}</div>
  );
}

export function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const {
    units,
    setUnits,
    labelScale,
    setLabelScale,
    iconScale,
    setIconScale,
    filterGroundVehicles,
    filterBlockedMLAT,
    coloredPlanes,
    coloredTrails,
    toggle,
    toggleSettings,
    resetAll,
  } = useToolbarStore();

  const unitOptions: { id: Units; label: string }[] = [
    { id: 'nautical', label: t('settings.units.aviation') },
    { id: 'metric', label: t('settings.units.metric') },
    { id: 'imperial', label: t('settings.units.imperial') },
  ];

  const languageLabels: Record<SupportedLanguage, string> = {
    en: t('settings.language.english'),
    'zh-CN': t('settings.language.chinese'),
  };

  // Namespace language ToggleButton ids to avoid generic DOM id collisions
  // while preserving the language id as the selection key payload: the key
  // format is `lang-<languageId>`, so on selection we strip the prefix and
  // cast the remainder to SupportedLanguage.
  const langButtonId = (lang: SupportedLanguage): string => `lang-${lang}`;
  const selectedLanguage: SupportedLanguage = i18n.language?.startsWith('zh')
    ? 'zh-CN'
    : 'en';

  return (
    <div
      data-testid="settings-panel"
      className="glass absolute right-14 top-0 z-20 w-[300px] p-4 text-sm text-slate-200"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[15px] font-semibold">{t('settings.title')}</span>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t('settings.close')}
          onPress={() => toggleSettings()}
          className="h-7 w-7 min-w-0 rounded-md border-none bg-white/[0.08] text-slate-400"
        >
          <X size={14} />
        </Button>
      </div>

      <SectionLabel>{t('settings.language.title')}</SectionLabel>
      <ToggleButtonGroup
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set<Key>([langButtonId(selectedLanguage)])}
        onSelectionChange={(keys) => {
          const key = [...keys][0] as string | undefined;
          if (!key) return;
          const selected = key.replace(/^lang-/, '') as SupportedLanguage;
          if (selected) void i18n.changeLanguage(selected);
        }}
        size="sm"
        className="mb-3"
      >
        {LANGUAGE_OPTIONS.map((opt, i) => (
          <ToggleButton key={langButtonId(opt.id)} id={langButtonId(opt.id)}>
            {i > 0 && <ToggleButtonGroup.Separator />}
            {languageLabels[opt.id]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <hr className="my-3 border-white/[0.08]" />

      <SectionLabel>{t('settings.units.title')}</SectionLabel>
      <ToggleButtonGroup
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set<Key>([units])}
        onSelectionChange={(keys) => {
          const selected = [...keys][0] as Units;
          if (selected) setUnits(selected);
        }}
        size="sm"
        className="mb-3"
      >
        {unitOptions.map((opt, i) => (
          <ToggleButton key={opt.id} id={opt.id}>
            {i > 0 && <ToggleButtonGroup.Separator />}
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <hr className="my-3 border-white/[0.08]" />

      <SectionLabel>{t('settings.scale.title')}</SectionLabel>
      <div className="mb-3 space-y-3">
        <Slider
          value={labelScale}
          onChange={(v) => setLabelScale(v as number)}
          minValue={0.5}
          maxValue={3}
          step={0.1}
        >
          <Label>{t('settings.scale.labelScale')}</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
        <Slider
          value={iconScale}
          onChange={(v) => setIconScale(v as number)}
          minValue={0.1}
          maxValue={3}
          step={0.1}
        >
          <Label>{t('settings.scale.iconScale')}</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      </div>

      <hr className="my-3 border-white/[0.08]" />

      <SectionLabel>{t('settings.filters.title')}</SectionLabel>
      <div className="mb-3 space-y-2">
        <Switch
          isSelected={filterGroundVehicles}
          onChange={() => toggle('filterGroundVehicles')}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            {t('settings.filters.groundVehicles')}
          </Switch.Content>
        </Switch>
        <Switch
          isSelected={filterBlockedMLAT}
          onChange={() => toggle('filterBlockedMLAT')}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            {t('settings.filters.nonIcaoTargets')}
          </Switch.Content>
        </Switch>
      </div>

      <hr className="my-3 border-white/[0.08]" />

      <SectionLabel>{t('settings.display.title')}</SectionLabel>
      <div className="mb-3 space-y-2">
        <Switch
          isSelected={coloredPlanes}
          onChange={() => toggle('coloredPlanes')}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            {t('settings.display.coloredAircraft')}
          </Switch.Content>
        </Switch>
        <Switch
          isSelected={coloredTrails}
          onChange={() => toggle('coloredTrails')}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            {t('settings.display.coloredTracks')}
          </Switch.Content>
        </Switch>
      </div>

      <hr className="my-3 border-white/[0.08]" />

      <div className="text-center">
        <Button
          size="sm"
          variant="ghost"
          onPress={() => resetAll()}
          className="text-red-400 hover:bg-red-500/15"
        >
          {t('settings.resetAll')}
        </Button>
      </div>
    </div>
  );
}
