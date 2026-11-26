import { useRef, useState } from 'react';
import type { VirtualAction } from '../core/input';
import { t, type LanguageCode, type TranslationKey } from '../i18n/translations';
import { HERO_ABILITIES, type AbilityDef } from '../systems/abilities';
import type { LiveHudState } from '../view/gateScene';
import { AbilityIconSvg } from './ActionBarHud';

interface MobileControlsProps {
  lang: LanguageCode;
  hud: LiveHudState;
  interactLabel: string | null;
  onMoveVector: (x: number, z: number) => void;
  onTriggerAction: (action: VirtualAction) => void;
  onCycleTarget: () => void;
  onOpenBag: () => void;
}

function getRadialPetalOffset(index: number): { x: number; y: number } {
  // Inner ring (0..2 = physical skills): 3 petals from 174° to 266° at r = 70px
  // Outer ring (3..7 = magic spells): 5 petals from 166° to 274° at r = 120px
  if (index < 3) {
    const deg = 174 + index * 46;
    const rad = (deg * Math.PI) / 180;
    return { x: Math.round(Math.cos(rad) * 70), y: Math.round(Math.sin(rad) * 70) };
  }
  const outerIdx = index - 3;
  const deg = 166 + outerIdx * 27;
  const rad = (deg * Math.PI) / 180;
  return { x: Math.round(Math.cos(rad) * 120), y: Math.round(Math.sin(rad) * 120) };
}

export function MobileControls({
  lang,
  hud,
  interactLabel,
  onMoveVector,
  onTriggerAction,
  onCycleTarget,
  onOpenBag,
}: MobileControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  const [wheelOpen, setWheelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const swipeStartX = useRef<number | null>(null);

  const inDungeon = hud.zone === 'dungeon';
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const manaPct = Math.max(0, Math.min(100, (hud.mana / Math.max(1, hud.maxMana)) * 100));
  const atkCd = hud.attackCooldown;
  const atkRatio =
    atkCd > 0.02 && hud.attackMaxCooldown > 0
      ? Math.max(0, Math.min(1, atkCd / hud.attackMaxCooldown))
      : 0;

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

  const renderRadialPetal = (ab: AbilityDef, index: number) => {
    const { x, y } = getRadialPetalOffset(index);
    const cd = hud.abilityCooldowns[ab.id] ?? 0;
    const ratio = hud.abilityCdRatios[ab.id] ?? 0;
    const onCd = cd > 0.05;
    const noMana = inDungeon && hud.mana < ab.manaCost;
    const abName = t(lang, ab.nameKey as TranslationKey);

    return (
      <button
        key={ab.id}
        type="button"
        data-ui-interactive="true"
        data-testid={`mobile-wheel-ability-${ab.id}`}
        aria-label={abName}
        title={`${abName} (${ab.manaCost} MP)`}
        onClick={() => {
          onTriggerAction(ab.actionKey as VirtualAction);
          setWheelOpen(false);
        }}
        style={{
          transform: wheelOpen
            ? `translate(${x}px, ${y}px) scale(1)`
            : 'translate(0px, 0px) scale(0.25)',
          borderColor: onCd ? '#364469' : ab.accent,
        }}
        className={`absolute left-1/2 top-1/2 -ml-5 -mt-5 w-10 h-10 rounded-full bg-[#081022]/96 border-2 flex items-center justify-center shadow-[0_4px_14px_rgba(4,7,18,0.85)] transition-transform duration-200 ease-out overflow-hidden ${
          wheelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } ${noMana ? 'opacity-60' : ''}`}
      >
        <AbilityIconSvg id={ab.id} color={onCd ? '#64748B' : ab.accent} className="w-4 h-4" />
        {onCd && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `conic-gradient(rgba(4,7,18,0.84) ${Math.round(ratio * 360)}deg, transparent ${Math.round(ratio * 360)}deg)`,
            }}
          />
        )}
        {onCd && (
          <span className="pointer-events-none relative z-10 text-[9px] font-bold text-[#FFF4DC] tabular-nums">
            {cd.toFixed(0)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      data-testid="mobile-controls"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-2.5 pb-2.5 select-none"
    >
      {/* Left: Virtual Thumbstick */}
      <div
        ref={padRef}
        data-ui-interactive="true"
        data-testid="mobile-thumbstick"
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
        className="pointer-events-auto relative w-24 h-24 rounded-full bg-[#0B1124]/86 border-2 border-[#38E8D8]/60 shadow-[0_0_22px_rgba(56,232,216,0.22)] touch-none flex items-center justify-center shrink-0"
      >
        <div
          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#F8C957] to-[#DE9728] border-2 border-[#FFF4DC] shadow-[0_0_16px_rgba(244,185,66,0.65)]"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Bottom-Center: Compact HP / Mana Micro-Bars */}
      <div className="pointer-events-none flex flex-col items-center gap-1 mb-1">
        <div className="chamfer-badge flex items-center gap-1.5 px-2.5 py-1 bg-[#081022]/92 border border-[#38E8D8]/35">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-[#FF6B81] tabular-nums">
              {hud.hp}/{hud.maxHp}
            </span>
            <div className="w-12 h-1.5 rounded-sm bg-[#040712] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#BE123C] to-[#FB7185]"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-12 h-1.5 rounded-sm bg-[#040712] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1D4ED8] to-[#38E8D8]"
                style={{ width: `${manaPct}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-[#93C5FD] tabular-nums">
              {hud.mana}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Uncluttered Attack + Radial Ability Wheel + Swipe Quick-Action Drawer */}
      <div className="pointer-events-none flex items-end gap-2 shrink-0">
        {/* Contextual Interact Button */}
        {interactLabel && (
          <button
            type="button"
            data-ui-interactive="true"
            data-testid="btn-interact-prompt"
            onClick={() => onTriggerAction('interact')}
            className="glass-teal-btn pointer-events-auto cursor-pointer px-3 py-2 rounded-full font-bold text-[11px] max-w-[128px] truncate"
          >
            {interactLabel}
          </button>
        )}

        {/* Swipe / Toggle Quick-Action Drawer */}
        <div
          data-ui-interactive="true"
          onPointerDown={(e) => {
            swipeStartX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (swipeStartX.current !== null) {
              const delta = e.clientX - swipeStartX.current;
              if (delta < -26) setDrawerOpen(true);
              else if (delta > 26) setDrawerOpen(false);
            }
            swipeStartX.current = null;
          }}
          className="pointer-events-auto relative flex items-center"
        >
          {drawerOpen && (
            <div
              data-testid="mobile-quick-drawer"
              className="glass-panel absolute bottom-12 right-0 p-1.5 grid grid-cols-3 gap-1.5 w-40 z-30"
            >
              <button
                type="button"
                data-testid="mobile-drawer-jump"
                onClick={() => onTriggerAction('jump')}
                className="glass-btn cursor-pointer h-9 rounded text-[10px] font-bold text-[#F4B942]"
              >
                {t(lang, 'touch_jump')}
              </button>
              <button
                type="button"
                data-testid="mobile-drawer-dodge"
                onClick={() => onTriggerAction('dodge')}
                className="glass-btn cursor-pointer h-9 rounded text-[10px] font-bold text-[#38E8D8]"
              >
                {t(lang, 'hud_dodge')}
              </button>
              <button
                type="button"
                data-testid="mobile-drawer-block"
                onClick={() => onTriggerAction('block')}
                className="glass-btn cursor-pointer h-9 rounded text-[10px] font-bold text-[#38E8D8]"
              >
                {t(lang, 'hud_block')}
              </button>
              <button
                type="button"
                data-testid="mobile-drawer-heal"
                onClick={() => onTriggerAction('heal')}
                className="glass-btn cursor-pointer h-9 rounded text-[10px] font-bold text-[#FF6B81]"
              >
                {t(lang, 'touch_heal')} ({hud.potions})
              </button>
              <button
                type="button"
                data-testid="mobile-drawer-bag"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenBag();
                }}
                className="glass-btn cursor-pointer h-9 rounded text-[10px] font-bold text-[#F4B942]"
              >
                {t(lang, 'touch_bag')}
              </button>
              {inDungeon && (
                <button
                  type="button"
                  data-testid="mobile-drawer-target"
                  onClick={onCycleTarget}
                  className="glass-btn cursor-pointer h-9 rounded text-[10px] font-bold text-[#FFF4DC]"
                >
                  TAB
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            data-testid="mobile-drawer-toggle"
            aria-label={t(lang, 'mobile_actions_more')}
            onClick={() => {
              setWheelOpen(false);
              setDrawerOpen((v) => !v);
            }}
            className={`glass-btn cursor-pointer w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border ${
              drawerOpen ? 'border-[#F4B942] text-[#F4B942]' : 'border-[#38E8D8]/50 text-[#9EB4DA]'
            }`}
          >
            {drawerOpen ? '✕' : '⋯'}
          </button>
        </div>

        {/* Right Primary Column: Radial Ability Wheel Toggle (top) + Large Attack Button (bottom) */}
        <div className="pointer-events-none flex flex-col items-center gap-2">
          {/* Radial Ability Wheel Anchor */}
          <div className="relative w-11 h-11 flex items-center justify-center">
            {HERO_ABILITIES.map((ab, idx) => renderRadialPetal(ab, idx))}

            <button
              type="button"
              data-ui-interactive="true"
              data-testid="mobile-wheel-toggle"
              aria-label={t(lang, 'mobile_wheel_title')}
              onClick={() => {
                setDrawerOpen(false);
                setWheelOpen((v) => !v);
              }}
              className={`pointer-events-auto relative z-10 cursor-pointer w-11 h-11 rounded-full font-bold text-[10px] border-2 flex flex-col items-center justify-center transition-transform duration-200 ${
                wheelOpen
                  ? 'bg-[#F4B942] text-[#081022] border-[#FFF4DC] scale-105'
                  : 'bg-gradient-to-b from-[#49EFE0] to-[#1FA89D] text-[#08121E] border-[#A3FFF6]'
              }`}
            >
              <span>{wheelOpen ? '✕' : '✦'}</span>
              <span className="leading-none text-[8px] font-extrabold">
                {t(lang, 'mobile_wheel_title')}
              </span>
            </button>
          </div>

          {/* Primary Large Attack Button */}
          <button
            type="button"
            data-ui-interactive="true"
            data-testid="mobile-attack-btn"
            aria-label={t(lang, 'hud_attack')}
            onClick={() => onTriggerAction('attack')}
            className="pointer-events-auto relative overflow-hidden cursor-pointer w-14 h-14 rounded-full bg-gradient-to-b from-[#D95B43] to-[#9E3422] text-[#FFF4DC] font-bold text-xs border-2 border-[#FF9E44]/85 shadow-[0_0_18px_rgba(255,123,66,0.45)] active:scale-95 flex items-center justify-center"
          >
            <span className={atkCd > 0.02 ? 'opacity-50' : ''}>{t(lang, 'touch_hit')}</span>
            {atkCd > 0.02 && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `conic-gradient(rgba(4,7,18,0.8) ${Math.round(atkRatio * 360)}deg, transparent ${Math.round(atkRatio * 360)}deg)`,
                }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
