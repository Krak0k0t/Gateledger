import { useEffect, useState } from 'react';
import {
  SOUNDTRACK_TRACKS,
  type DynamicAudioEngine,
  type MusicPlayerState,
} from '../core/music';
import { t, type LanguageCode, type TranslationKey } from '../i18n/translations';

interface MusicMiniPlayerProps {
  audio: DynamicAudioEngine | null;
  lang: LanguageCode;
  variant: 'menu' | 'hud';
  compact?: boolean;
}

const FALLBACK_STATE: MusicPlayerState = {
  trackIndex: 0,
  track: SOUNDTRACK_TRACKS[0],
  isPlaying: false,
  userPaused: false,
  muted: false,
  musicVolume: 0.35,
  autoplayBlocked: false,
};

function MusicNoteGlyph({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function MusicMiniPlayer({
  audio,
  lang,
  variant,
  compact = false,
}: MusicMiniPlayerProps) {
  const [musicState, setMusicState] = useState<MusicPlayerState>(() =>
    audio ? audio.getMusicState() : FALLBACK_STATE,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!audio) return;
    return audio.subscribeMusicState(setMusicState);
  }, [audio]);

  const trackTitle = t(lang, musicState.track.titleKey as TranslationKey);
  const trackMood = t(lang, musicState.track.moodKey as TranslationKey);

  const handlePrev = () => {
    audio?.unlock();
    audio?.playUiClick();
    audio?.prevTrack();
  };

  const handleNext = () => {
    audio?.unlock();
    audio?.playUiClick();
    audio?.nextTrack();
  };

  const handleToggle = () => {
    audio?.unlock();
    audio?.playUiClick();
    audio?.toggleMusicPlayback();
  };

  const handleSelect = (idx: number) => {
    audio?.unlock();
    audio?.playUiClick();
    audio?.selectTrack(idx);
  };

  if (variant === 'menu') {
    return (
      <div
        data-ui-interactive="true"
        data-testid="music-menu-player"
        className="glass-subcard w-full rounded-xl p-3 flex flex-col gap-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <MusicNoteGlyph className="w-3.5 h-3.5 text-[#F4B942] shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#F4B942]">
              {t(lang, 'music_player_title')}
            </span>
          </div>
          <span className="chamfer-badge px-1.5 py-0.5 bg-[#0A1329] border border-[#38E8D8]/40 text-[9px] font-bold text-[#38E8D8] shrink-0">
            {t(lang, 'music_carousel_badge')} · {musicState.trackIndex + 1}/{SOUNDTRACK_TRACKS.length}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-[#070B18]/85 border border-[#F4B942]/25">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                musicState.isPlaying && !musicState.muted
                  ? 'bg-[#38E8D8] shadow-[0_0_8px_#38E8D8]'
                  : 'bg-[#64748B]'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div
                data-testid="music-active-title"
                className="text-xs font-bold text-[#FFF4DC] truncate"
              >
                {trackTitle}
              </div>
              <div className="text-[10px] font-semibold text-[#38E8D8] truncate">
                {trackMood}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid="music-prev-btn"
              aria-label={t(lang, 'music_prev')}
              title={t(lang, 'music_prev')}
              onClick={handlePrev}
              className="glass-btn cursor-pointer w-7 h-7 flex items-center justify-center text-xs font-bold text-[#9EB4DA] hover:text-[#FFF4DC]"
            >
              ‹
            </button>
            <button
              type="button"
              data-testid="music-toggle-btn"
              aria-label={t(lang, musicState.isPlaying ? 'music_pause' : 'music_play')}
              title={t(lang, musicState.isPlaying ? 'music_pause' : 'music_play')}
              onClick={handleToggle}
              className="glass-teal-btn cursor-pointer w-7 h-7 flex items-center justify-center text-[11px] font-bold"
            >
              {musicState.isPlaying ? '❚❚' : '▶'}
            </button>
            <button
              type="button"
              data-testid="music-next-btn"
              aria-label={t(lang, 'music_next')}
              title={t(lang, 'music_next')}
              onClick={handleNext}
              className="glass-btn cursor-pointer w-7 h-7 flex items-center justify-center text-xs font-bold text-[#9EB4DA] hover:text-[#FFF4DC]"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {SOUNDTRACK_TRACKS.map((tr, idx) => {
            const active = idx === musicState.trackIndex;
            return (
              <button
                key={tr.id}
                type="button"
                data-testid={`music-track-${tr.id}`}
                title={t(lang, tr.titleKey as TranslationKey)}
                onClick={() => handleSelect(idx)}
                className={`cursor-pointer px-1.5 py-1 rounded text-[10px] font-bold truncate border transition-colors ${
                  active
                    ? 'bg-[#261B0A] border-[#F4B942] text-[#F4B942]'
                    : 'bg-[#081022] border-[#9EB4DA]/20 text-[#9EB4DA] hover:border-[#38E8D8]/50 hover:text-[#FFF4DC]'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // HUD Mini-Player (compact icon toggle on mobile, sleek inline chip on desktop)
  if (compact) {
    return (
      <div
        data-ui-interactive="true"
        data-testid="music-mini-mobile"
        className="pointer-events-auto relative flex items-center"
      >
        <button
          type="button"
          data-testid="music-mini-toggle"
          aria-label={t(lang, 'music_player_title')}
          title={`${trackTitle} — ${trackMood}`}
          onClick={() => setDrawerOpen((v) => !v)}
          className={`glass-btn cursor-pointer w-9 h-9 rounded-full flex items-center justify-center border ${
            musicState.isPlaying && !musicState.muted
              ? 'border-[#F4B942]/85 text-[#F4B942]'
              : 'border-[#38E8D8]/45 text-[#9EB4DA]'
          }`}
        >
          <MusicNoteGlyph className="w-4 h-4" />
        </button>

        {drawerOpen && (
          <div
            data-testid="music-mini-popover"
            className="glass-panel absolute bottom-11 left-0 w-56 p-2.5 flex flex-col gap-2 z-40"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-[#FFF4DC] truncate">
                  {trackTitle}
                </div>
                <div className="text-[9px] font-semibold text-[#38E8D8] truncate">
                  {trackMood} · {musicState.trackIndex + 1}/{SOUNDTRACK_TRACKS.length}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t(lang, 'close')}
                className="text-[11px] text-[#9EB4DA] px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                data-testid="music-hud-prev"
                onClick={handlePrev}
                className="glass-btn cursor-pointer flex-1 h-7 text-xs font-bold"
              >
                ‹
              </button>
              <button
                type="button"
                data-testid="music-hud-toggle"
                onClick={handleToggle}
                className="glass-teal-btn cursor-pointer flex-1 h-7 text-[11px] font-bold"
              >
                {musicState.isPlaying ? '❚❚' : '▶'}
              </button>
              <button
                type="button"
                data-testid="music-hud-next"
                onClick={handleNext}
                className="glass-btn cursor-pointer flex-1 h-7 text-xs font-bold"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-ui-interactive="true"
      data-testid="music-mini-desktop"
      className="pointer-events-auto relative flex items-center"
    >
      <div className="glass-panel flex items-center gap-2 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          title={`${trackTitle} — ${trackMood}`}
          className="cursor-pointer flex items-center gap-1.5 min-w-0 max-w-[148px] text-left"
        >
          <MusicNoteGlyph
            className={`w-3.5 h-3.5 shrink-0 ${
              musicState.isPlaying && !musicState.muted ? 'text-[#F4B942]' : 'text-[#9EB4DA]'
            }`}
          />
          <span
            data-testid="music-hud-title"
            className="text-[11px] font-bold text-[#FFF4DC] truncate"
          >
            {trackTitle}
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="music-hud-prev"
            aria-label={t(lang, 'music_prev')}
            onClick={handlePrev}
            className="glass-btn cursor-pointer w-6 h-6 flex items-center justify-center text-xs font-bold"
          >
            ‹
          </button>
          <button
            type="button"
            data-testid="music-hud-toggle"
            aria-label={t(lang, musicState.isPlaying ? 'music_pause' : 'music_play')}
            onClick={handleToggle}
            className="glass-teal-btn cursor-pointer w-6 h-6 flex items-center justify-center text-[10px] font-bold"
          >
            {musicState.isPlaying ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            data-testid="music-hud-next"
            aria-label={t(lang, 'music_next')}
            onClick={handleNext}
            className="glass-btn cursor-pointer w-6 h-6 flex items-center justify-center text-xs font-bold"
          >
            ›
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div
          data-testid="music-hud-playlist"
          className="glass-panel absolute bottom-11 left-0 w-60 p-2 flex flex-col gap-1 z-40"
        >
          {SOUNDTRACK_TRACKS.map((tr, idx) => {
            const active = idx === musicState.trackIndex;
            return (
              <button
                key={tr.id}
                type="button"
                onClick={() => handleSelect(idx)}
                className={`cursor-pointer flex items-center justify-between gap-2 px-2 py-1 rounded text-left text-[11px] font-bold ${
                  active
                    ? 'bg-[#261B0A] text-[#F4B942] border border-[#F4B942]/65'
                    : 'text-[#DCE6F7] hover:bg-[#141E3A]'
                }`}
              >
                <span className="truncate">{idx + 1}. {t(lang, tr.titleKey as TranslationKey)}</span>
                <span className="text-[9px] text-[#38E8D8] shrink-0">
                  {t(lang, tr.moodKey as TranslationKey)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
