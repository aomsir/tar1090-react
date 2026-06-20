import { Button, ToggleButton, Tooltip } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';

interface ToolbarButtonProps {
  icon: LucideIcon;
  tooltip: string;
  isActive?: boolean;
  onPress: () => void;
  type?: 'toggle' | 'action';
}

export function ToolbarButton({
  icon: Icon,
  tooltip,
  isActive,
  onPress,
  type = 'toggle',
}: ToolbarButtonProps) {
  const btn =
    type === 'toggle' ? (
      <ToggleButton
        isIconOnly
        isSelected={isActive}
        onChange={() => onPress()}
        aria-label={tooltip}
        size="sm"
        className="h-[34px] w-[34px] min-w-0 rounded-lg border-none bg-white/[0.06] text-slate-400 data-[selected=true]:bg-blue-500/20 data-[selected=true]:text-blue-300"
      >
        <Icon size={16} />
      </ToggleButton>
    ) : (
      <Button
        isIconOnly
        onPress={onPress}
        aria-label={tooltip}
        size="sm"
        variant="ghost"
        className="h-[34px] w-[34px] min-w-0 rounded-lg border-none bg-white/[0.06] text-slate-400 hover:bg-white/[0.12] hover:text-slate-200"
      >
        <Icon size={16} />
      </Button>
    );

  return (
    <Tooltip delay={0}>
      {btn}
      <Tooltip.Content placement="left">
        <p>{tooltip}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
