import type { VirtualAction } from '../core/input';
import type { DynamicAudioEngine } from '../core/music';
import type { KeybindMap } from '../core/settings';
import type { LanguageCode } from '../i18n/translations';
import type { LiveHudState } from '../view/gateScene';
import { DesktopControls } from './DesktopControls';
import { MobileControls } from './MobileControls';
import { MusicMiniPlayer } from './MusicMiniPlayer';

interface HUDProps {
  isMobile: boolean;
  lang: LanguageCode;
  hud: LiveHudState;
  keybinds: KeybindMap;
  interactLabel: string | null;
  audio: DynamicAudioEngine | null;
  onMoveVector: (x: number, z: number) => void;
  onTriggerAction: (action: VirtualAction) => void;
  onCycleTarget: () => void;
  onOpenBag: () => void;
}

export function HUD({
  isMobile,
  lang,
  hud,
  keybinds,
  interactLabel,
  audio,
  onMoveVector,
  onTriggerAction,
  onCycleTarget,
  onOpenBag,
}: HUDProps) {
  return (
    <div data-testid="adaptive-hud" className="pointer-events-none">
      {/* Persistent Subdued Soundtrack Mini-Player */}
      <div
        className={`pointer-events-none fixed z-20 ${
          isMobile ? 'bottom-[118px] left-2.5' : 'bottom-[116px] left-3 xl:bottom-4 xl:left-4'
        }`}
      >
        <MusicMiniPlayer
          audio={audio}
          lang={lang}
          variant="hud"
          compact={isMobile}
        />
      </div>

      {/* Adaptive Desktop vs Mobile Controls */}
      {isMobile ? (
        <MobileControls
          lang={lang}
          hud={hud}
          interactLabel={interactLabel}
          onMoveVector={onMoveVector}
          onTriggerAction={onTriggerAction}
          onCycleTarget={onCycleTarget}
          onOpenBag={onOpenBag}
        />
      ) : (
        <DesktopControls
          lang={lang}
          hud={hud}
          keybinds={keybinds}
          interactLabel={interactLabel}
          onTriggerAction={onTriggerAction}
        />
      )}
    </div>
  );
}
