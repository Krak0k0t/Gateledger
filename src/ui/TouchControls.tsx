import { useRef, useState } from 'react';
import type { VirtualAction } from '../core/input';
import { t, type LanguageCode } from '../i18n/translations';

interface TouchControlsProps {
  lang: LanguageCode;
  visible: boolean;
  inDungeon: boolean;
  hasInteract: boolean;
  onMoveVector: (x: number, z: number) => void;
  onAction: (action: VirtualAction) => void;
  onOpenBag: () => void;
}

export function TouchControls({
  lang,
  visible,
  inDungeon,
  hasInteract,
  onMoveVector,
  onAction,
  onOpenBag,
}: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  if (!visible) return null;

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR && dist > 0) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    onMoveVector(dx / maxR, dy / maxR);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onMoveVector(0, 0);
  };

  const btnSizeClass =
    'w-12 h-12 sm:w-13 sm:h-13 [@media(max-height:700px)]:w-10 [@media(max-height:700px)]:h-10 [@media(max-height:520px)]:w-7 [@media(max-height:520px)]:h-7 px-0.5 text-[10px] sm:text-[11px] [@media(max-height:520px)]:text-[8px] leading-none flex items-center justify-center text-center';
  const columnGapClass =
    'gap-2.5 sm:gap-3 [@media(max-height:700px)]:gap-2 [@media(max-height:520px)]:gap-1.5';

  return (
    <div
      data-ui-interactive="true"
      data-testid="touch-controls"
      className="pointer-events-none fixed inset-x-0 bottom-2.5 z-30 flex items-end justify-between pl-4 pr-1.5 sm:pl-6 sm:pr-2.5"
    >
      {/* Left Virtual Thumbstick */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          activePointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current === e.pointerId) {
            updateStick(e.clientX, e.clientY);
          }
        }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        className="pointer-events-auto relative w-28 h-28 rounded-full bg-[#0B1124]/86 border-2 border-[#38E8D8]/60 shadow-[0_0_22px_rgba(56,232,216,0.22)] touch-none flex items-center justify-center"
      >
        <div
          className="w-11 h-11 rounded-full bg-gradient-to-b from-[#F8C957] to-[#DE9728] border-2 border-[#FFF4DC] shadow-[0_0_16px_rgba(244,185,66,0.65)]"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Right Action Column */}
      <div
        data-testid="touch-action-cluster"
        className={`pointer-events-auto flex flex-col items-end ${columnGapClass}`}
      >
        {inDungeon && (
          <>
            <button
              type="button"
              onClick={() => onAction('attack')}
              className={`${btnSizeClass} rounded-full bg-gradient-to-b from-[#D95B43] to-[#9E3422] text-[#FFF4DC] font-bold border border-[#FF9E44]/75 shadow-[0_0_16px_rgba(255,123,66,0.4)] active:scale-95`}
            >
              {t(lang, 'touch_hit')}
            </button>
            <button
              type="button"
              onClick={() => onAction('special')}
              className={`${btnSizeClass} rounded-full bg-gradient-to-b from-[#49EFE0] to-[#23B7AB] text-[#08121E] font-bold border border-[#A3FFF6] shadow-[0_0_18px_rgba(56,232,216,0.5)] active:scale-95`}
            >
              {t(lang, 'touch_spec')}
            </button>
            <button
              type="button"
              onClick={() => onAction('heal')}
              className={`${btnSizeClass} rounded-full bg-gradient-to-b from-[#FF5470] to-[#BD1F36] text-white font-bold border border-[#FFA6B5] shadow-[0_0_16px_rgba(255,59,92,0.45)] active:scale-95`}
            >
              {t(lang, 'touch_heal')}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onAction('jump')}
          className={`${btnSizeClass} rounded-full bg-gradient-to-b from-[#F8C957] to-[#DE9728] text-[#0B1020] font-bold border border-[#FFE7A3] shadow-[0_0_18px_rgba(244,185,66,0.5)] active:scale-95`}
        >
          {t(lang, 'touch_jump')}
        </button>
        {hasInteract && (
          <button
            type="button"
            onClick={() => onAction('interact')}
            className={`${btnSizeClass} rounded-full bg-gradient-to-b from-[#49EFE0] to-[#23B7AB] text-[#08121E] font-bold border border-[#A3FFF6] shadow-[0_0_18px_rgba(56,232,216,0.5)] active:scale-95`}
          >
            {t(lang, 'touch_use')}
          </button>
        )}
        <button
          type="button"
          onClick={onOpenBag}
          className={`glass-btn ${btnSizeClass} rounded-full font-bold active:scale-95`}
        >
          {t(lang, 'touch_bag')}
        </button>
      </div>
    </div>
  );
}
