import { Button, ToggleButtonGroup, ToggleButton, Slider, Switch, Label } from '@heroui/react';
import type { Key } from '@heroui/react';
import { X } from 'lucide-react';
import { useToolbarStore } from '@/store/toolbarStore';
import type { Units } from '@/store/toolbarStore';

const UNIT_OPTIONS: { id: Units; label: string }[] = [
  { id: 'nautical', label: 'Aviation' },
  { id: 'metric', label: 'Metric' },
  { id: 'imperial', label: 'Imperial' },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-400">{children}</div>
  );
}

export function SettingsPanel() {
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

  return (
    <div
      data-testid="settings-panel"
      className="glass absolute right-14 top-0 z-20 w-[300px] p-4 text-sm text-slate-200"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[15px] font-semibold">Settings</span>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Close settings"
          onPress={() => toggleSettings()}
          className="h-7 w-7 min-w-0 rounded-md border-none bg-white/[0.08] text-slate-400"
        >
          <X size={14} />
        </Button>
      </div>

      <SectionLabel>Units</SectionLabel>
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
        {UNIT_OPTIONS.map((opt, i) => (
          <ToggleButton key={opt.id} id={opt.id}>
            {i > 0 && <ToggleButtonGroup.Separator />}
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <hr className="my-3 border-white/[0.08]" />

      <SectionLabel>Scale</SectionLabel>
      <div className="mb-3 space-y-3">
        <Slider
          value={labelScale}
          onChange={(v) => setLabelScale(v as number)}
          minValue={0.5}
          maxValue={3}
          step={0.1}
          aria-label="Label scale"
        >
          <Label>Label scale</Label>
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
          aria-label="Icon scale"
        >
          <Label>Icon scale</Label>
          <Slider.Output />
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      </div>

      <hr className="my-3 border-white/[0.08]" />

      <SectionLabel>Filters</SectionLabel>
      <div className="mb-3 space-y-2">
        <Switch
          isSelected={filterGroundVehicles}
          onChange={() => toggle('filterGroundVehicles')}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Ground vehicles
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
            Non-ICAO targets
          </Switch.Content>
        </Switch>
      </div>

      <hr className="my-3 border-white/[0.08]" />

      <SectionLabel>Display</SectionLabel>
      <div className="mb-3 space-y-2">
        <Switch
          isSelected={coloredPlanes}
          onChange={() => toggle('coloredPlanes')}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Colored aircraft
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
            Colored tracks
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
          Reset all settings
        </Button>
      </div>
    </div>
  );
}
