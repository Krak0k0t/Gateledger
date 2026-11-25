import { useEffect, useState } from 'react';
import {
  DEFAULT_KEYBINDS,
  formatKeybindLabel,
  KEYBIND_ACTIONS,
  rebindKeyAction,
  type GameSettings,
  type KeybindAction,
} from '../core/settings';
import { exportSavePayload, importSavePayload, type CampaignRecords } from '../systems/meta';
import { t, type LanguageCode, type TranslationKey } from '../i18n/translations';
import { GraphicsQualitySwitch } from './GraphicsQualitySwitch';

interface SettingsModalProps {
  lang: LanguageCode;
  settings: GameSettings;
  records: CampaignRecords;
  gamepadConnected: boolean;
  onUpdateSettings: (next: GameSettings) => void;
  onImportRecords: (next: CampaignRecords) => void;
  onRebindCaptureChange?: (capturing: boolean) => void;
  onClose: () => void;
}

export function SettingsModal({
  lang,
  settings,
  records,
  gamepadConnected,
  onUpdateSettings,
  onImportRecords,
  onRebindCaptureChange,
  onClose,
}: SettingsModalProps) {
  const [importText, setImportText] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [listeningAction, setListeningAction] = useState<KeybindAction | null>(null);
  const saveCode = exportSavePayload(records);

  useEffect(() => {
    onRebindCaptureChange?.(listeningAction !== null);
    if (!listeningAction) return;

    const finishBind = (code: string) => {
      const nextBinds = rebindKeyAction(settings.keybinds, listeningAction, code);
      onUpdateSettings({ ...settings, keybinds: nextBinds });
      setListeningAction(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }
      if (e.code) {
        finishBind(e.code);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement | null;
      if (
        targetEl?.closest(
          '[data-testid="btn-close-settings"], [data-testid="btn-reset-keybinds"], [data-testid^="rebind-"]',
        )
      ) {
        setListeningAction(null);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.button >= 0 && e.button <= 4) {
        finishBind(`Mouse${e.button}`);
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('mousedown', onMouseDown, { capture: true });
    window.addEventListener('contextmenu', onContextMenu, { capture: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('mousedown', onMouseDown, { capture: true });
      window.removeEventListener('contextmenu', onContextMenu, { capture: true });
    };
  }, [listeningAction, onRebindCaptureChange, onUpdateSettings, settings]);

  useEffect(() => {
    return () => {
      onRebindCaptureChange?.(false);
    };
  }, [onRebindCaptureChange]);

  const handleCopySave = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(saveCode);
      }
      setStatusMsg(t(lang, 'save_copied'));
    } catch {
      setStatusMsg(t(lang, 'save_copied'));
    }
  };

  const handleImport = () => {
    const parsed = importSavePayload(importText);
    if (!parsed) {
      setStatusMsg(t(lang, 'save_invalid'));
      return;
    }
    onImportRecords(parsed);
    setImportText('');
    setStatusMsg(t(lang, 'save_imported'));
  };

  return (
    <div
      data-ui-interactive="true"
      data-testid="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'settings_title')}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#040712]/88 p-3 sm:p-5"
    >
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 border-b border-[#F4B942]/30 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-ledger text-2xl font-bold text-[#FFF4DC]">
              ⚙ {t(lang, 'settings_title')}
            </h2>
            {gamepadConnected && (
              <span className="px-2 py-0.5 rounded bg-[#38E8D8]/20 border border-[#38E8D8]/60 text-[10px] font-bold text-[#38E8D8]">
                🎮 {t(lang, 'gamepad_ready')}
              </span>
            )}
          </div>
          <button
            type="button"
            data-testid="btn-close-settings"
            onClick={onClose}
            className="glass-btn cursor-pointer px-3 py-1 rounded-lg font-bold text-xs"
          >
            {t(lang, 'close')}
          </button>
        </div>

        {/* Keyboard & Mouse Keybinds */}
        <div
          data-testid="settings-keybinds-section"
          className="glass-subcard rounded-lg p-3 flex flex-col gap-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-[#F4B942]">
                ⌨ {t(lang, 'keybinds_title')}
              </h3>
              <p className="text-[11px] text-[#9EB4DA]">{t(lang, 'keybinds_subtitle')}</p>
            </div>
            <button
              type="button"
              data-testid="btn-reset-keybinds"
              onClick={() => {
                setListeningAction(null);
                onUpdateSettings({
                  ...settings,
                  keybinds: { ...DEFAULT_KEYBINDS },
                });
              }}
              className="glass-btn cursor-pointer px-2.5 py-1 rounded text-[11px] font-bold text-[#38E8D8]"
            >
              {t(lang, 'keybinds_reset')}
            </button>
          </div>

          {listeningAction && (
            <div
              data-testid="keybind-listening-banner"
              className="px-3 py-1.5 rounded bg-[#1E1633] border border-[#F4B942] text-xs font-bold text-[#F4B942] flex items-center justify-between"
            >
              <span>{t(lang, 'keybinds_listening')}</span>
              <button
                type="button"
                onClick={() => setListeningAction(null)}
                className="text-[10px] px-2 py-0.5 rounded bg-[#0A1022] text-[#FFF4DC] cursor-pointer"
              >
                Esc
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {KEYBIND_ACTIONS.map((action) => {
              const isListening = listeningAction === action;
              const code = settings.keybinds[action];
              const labelKey = `kb_${action}` as TranslationKey;
              return (
                <div
                  key={action}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#070B18] border border-[#9EB4DA]/20"
                >
                  <span className="text-[11px] font-semibold text-[#FFF4DC] truncate">
                    {t(lang, labelKey)}
                  </span>
                  <button
                    type="button"
                    data-testid={`rebind-${action}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setListeningAction(isListening ? null : action);
                    }}
                    className={`cursor-pointer min-w-[74px] px-2 py-1 rounded text-[11px] font-bold tabular-nums border transition-colors ${
                      isListening
                        ? 'bg-[#F4B942] text-[#070B18] border-[#FFF4DC]'
                        : 'bg-[#101833] text-[#38E8D8] border-[#38E8D8]/45 hover:border-[#F4B942]'
                    }`}
                  >
                    {isListening ? '...' : formatKeybindLabel(code)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio & Graphics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Audio Sliders */}
          <div className="glass-subcard rounded-lg p-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold text-[#FFF4DC]">
                <span>🎵 {t(lang, 'settings_music_vol')}</span>
                <span className="tabular-nums text-[#F4B942]">
                  {Math.round(settings.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.musicVolume * 100)}
                data-testid="slider-music-vol"
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    musicVolume: Number(e.target.value) / 100,
                  })
                }
                className="ledger-slider w-full"
              />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold text-[#FFF4DC]">
                <span>🔊 {t(lang, 'settings_sfx_vol')}</span>
                <span className="tabular-nums text-[#38E8D8]">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.sfxVolume * 100)}
                data-testid="slider-sfx-vol"
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    sfxVolume: Number(e.target.value) / 100,
                  })
                }
                className="ledger-slider w-full"
              />
            </label>
          </div>

          {/* Graphics Quality + Day 1 Route Guide */}
          <div className="flex flex-col gap-3">
            <div className="glass-subcard rounded-lg p-3 flex flex-col gap-2">
              <span className="text-xs font-bold text-[#FFF4DC]">✨ {t(lang, 'settings_gfx')}</span>
              <GraphicsQualitySwitch
                lang={lang}
                value={settings.graphicsQuality}
                testIdPrefix="btn-gfx"
                onChange={(nextQuality) =>
                  onUpdateSettings({ ...settings, graphicsQuality: nextQuality })
                }
              />
            </div>

            <label className="glass-subcard rounded-lg p-3 flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-[#FFF4DC]">🧭 {t(lang, 'settings_guide_toggle')}</span>
              <input
                type="checkbox"
                checked={settings.showDay1Guide}
                data-testid="toggle-day1-guide"
                onChange={(e) => onUpdateSettings({ ...settings, showDay1Guide: e.target.checked })}
                className="w-4 h-4 accent-[#38E8D8] cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Save Export / Import */}
        <div className="glass-subcard rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#F4B942]">💾 {t(lang, 'save_section')}</span>
            <button
              type="button"
              data-testid="btn-export-save"
              onClick={handleCopySave}
              className="glass-gold-btn cursor-pointer px-2.5 py-1 rounded text-[11px] font-bold"
            >
              {t(lang, 'save_export')}
            </button>
          </div>
          <input
            type="text"
            readOnly
            value={saveCode}
            data-testid="input-save-code-readonly"
            onFocus={(e) => e.currentTarget.select()}
            className="w-full px-2.5 py-1.5 rounded bg-[#070B18] border border-[#9EB4DA]/25 text-[11px] font-mono text-[#9EB4DA]"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={importText}
              data-testid="input-save-import"
              onChange={(e) => setImportText(e.target.value)}
              placeholder="GL1:..."
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-[#070B18] border border-[#38E8D8]/35 text-xs text-[#FFF4DC]"
            />
            <button
              type="button"
              data-testid="btn-import-save"
              onClick={handleImport}
              className="glass-btn cursor-pointer px-3 py-1.5 rounded font-bold text-xs text-[#38E8D8]"
            >
              {t(lang, 'save_import')}
            </button>
          </div>
          {statusMsg && (
            <p data-testid="save-status-msg" className="text-[11px] font-bold text-[#38E8D8]">
              {statusMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
