import type { VirtualAction } from '../core/input';
import type { KeybindMap } from '../core/settings';
import type { LanguageCode } from '../i18n/translations';
import type { LiveHudState } from '../view/gateScene';
import { ActionBarHud } from './ActionBarHud';

interface DesktopControlsProps {
  lang: LanguageCode;
  hud: LiveHudState;
  keybinds: KeybindMap;
  interactLabel: string | null;
  onTriggerAction: (action: VirtualAction) => void;
}

export function DesktopControls({
  lang,
  hud,
  keybinds,
  interactLabel,
  onTriggerAction,
}: DesktopControlsProps) {
  return (
    <div
      data-testid="desktop-controls"
      className="pointer-events-none flex flex-col items-center gap-2"
    >
      {interactLabel && (
        <button
          type="button"
          data-ui-interactive="true"
          data-testid="btn-interact-prompt"
          onClick={() => onTriggerAction('interact')}
          className="glass-teal-btn pointer-events-auto cursor-pointer px-5 py-2 rounded-xl font-bold text-sm"
        >
          {interactLabel}
        </button>
      )}

      <ActionBarHud
        lang={lang}
        hud={hud}
        keybinds={keybinds}
        onTriggerAction={onTriggerAction}
      />
    </div>
  );
}
