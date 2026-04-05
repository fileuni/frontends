import React, { useEffect, useRef } from 'react';
import type { FileInfo } from '../types/index.ts';
import { Music4 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';
import { clearMediaPlaybackRecords, removeMediaPlaybackRecord, useMediaPlaybackHistory } from '@/lib/mediaPlaybackHistory.ts';
import { FilePreviewHeader } from './FilePreviewHeader.tsx';
import { AudioPreviewMainPanel } from './AudioPreviewMainPanel.tsx';
import { AudioPreviewSidebar } from './AudioPreviewSidebar.tsx';
import { formatTime } from './audioPreviewShared.ts';
import { useAudioPlaybackController } from './useAudioPlaybackController.ts';

const getAudioPlayModeLabel = (
  t: ReturnType<typeof useTranslation>['t'],
  mode: 'list' | 'loop' | 'shuffle' | 'single',
): string => {
  switch (mode) {
    case 'list':
      return t('filemanager.player.playMode.list');
    case 'loop':
      return t('filemanager.player.playMode.loop');
    case 'shuffle':
      return t('filemanager.player.playMode.shuffle');
    case 'single':
      return t('filemanager.player.playMode.single');
  }
};

interface AudioPreviewProps {
  playlist: FileInfo[];
  initialIndex?: number;
  isDark?: boolean;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
}

export const AudioPreview = ({ playlist, initialIndex = 0, isDark, headerExtra, onClose }: AudioPreviewProps) => {
  const { t, i18n } = useTranslation();
  const activeLyricRef = useRef<HTMLButtonElement | null>(null);

  const controller = useAudioPlaybackController({
    playlist,
    initialIndex,
    t,
  });
  const recentRecords = useMediaPlaybackHistory()
    .filter((record) => record.path !== controller.activeFile?.path)
    .slice(0, 12);
  const playModeLabel = getAudioPlayModeLabel(t, controller.playMode);

  const openRecentRecord = (path: string) => {
    const nextIndex = playlist.findIndex((track) => track.path === path);
    if (nextIndex >= 0) {
      controller.selectTrack(nextIndex);
      return;
    }
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    params.set('preview_path', path);
    window.location.hash = params.toString();
  };

  useEffect(() => {
    if (controller.activeLyricIndex < 0) return;
    activeLyricRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [controller.activeLyricIndex]);

  if (!controller.activeFile) return null;

  return (
    <div className={cn('h-screen flex flex-col overflow-hidden', isDark ? 'bg-[#030712] text-white' : 'bg-[#f8fafc] text-slate-900')}>
      <FilePreviewHeader
        path={controller.activeFile.path}
        fileName={controller.display.title}
        isDark={isDark}
        subtitle={t('filemanager.player.audioEngine')}
        icon={<Music4 size={20} />}
        onClose={onClose}
        extra={
          <div className="flex items-center gap-2">
            {headerExtra}
            <span className={cn('inline-flex h-10 items-center rounded-full border px-4 text-xs font-black tracking-[0.28em]', isDark ? 'border-white/10 bg-white/5 text-white/70' : 'border-slate-200 bg-slate-100 text-slate-500')}>
              {controller.currentIndex + 1} / {playlist.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-10 rounded-full border px-3', isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200')}
              onClick={() => controller.setPlayMode((mode) => (mode === 'list' ? 'loop' : mode === 'loop' ? 'shuffle' : mode === 'shuffle' ? 'single' : 'list'))}
              title={playModeLabel}
            >
              {React.createElement(controller.playModeConfig.icon, { size: 16 })}
            </Button>
          </div>
        }
      />

      <main className={cn('flex-1 overflow-y-auto lg:overflow-hidden', isDark ? 'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_36%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]' : 'bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)]')}>
        <div className="grid min-h-full gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:gap-6 md:p-6 lg:h-full lg:grid-cols-[minmax(0,1.65fr)_360px] lg:overflow-hidden">
          <AudioPreviewMainPanel
            bufferedPercent={controller.bufferedPercent}
            coverUrl={controller.display.coverUrl}
            currentExtension={controller.currentExtension}
            currentIndex={controller.currentIndex}
            currentTime={controller.currentTime}
            duration={controller.duration}
            isDark={isDark}
            isMuted={controller.isMuted}
            isPlaying={controller.isPlaying}
            isTrackLoading={controller.isTrackLoading}
            loadError={controller.loadError}
            lyricsState={controller.lyricsState}
            onNext={() => controller.handleNext('manual')}
            onPlayPause={controller.togglePlay}
            onPrev={controller.handlePrev}
            onReload={controller.reloadCurrentTrack}
            onSeek={controller.seekTo}
            onVolumeChange={(nextVolume) => {
              controller.setVolume(nextVolume);
              controller.setIsMuted(nextVolume === 0);
              if (nextVolume > 0) controller.lastVolumeRef.current = nextVolume;
            }}
            onMuteToggle={controller.toggleMute}
            onPlaybackRateChange={controller.setPlaybackRate}
            playedPercent={controller.playedPercent}
            playModeLabel={playModeLabel}
            playbackRate={controller.playbackRate}
            playlistLength={playlist.length}
            progressLabel={t('filemanager.player.play')}
            progressValue={controller.duration > 0 ? controller.currentTime : 0}
            t={t}
            timeLabel={formatTime}
            trackAlbum={controller.display.album}
            trackArtist={controller.display.artist}
            trackTitle={controller.display.title}
            volume={controller.volume}
          />

          <AudioPreviewSidebar
            activeLyricIndex={controller.activeLyricIndex}
            activeLyricRef={activeLyricRef}
            currentIndex={controller.currentIndex}
            currentLyricLine={controller.currentLyricLine}
            isDark={isDark}
            isPlaying={controller.isPlaying}
            lyricsState={controller.lyricsState}
            onClearRecentHistory={(kind) => clearMediaPlaybackRecords(kind)}
            onLyricSeek={controller.jumpToLyric}
            onOpenRecentRecord={openRecentRecord}
            onRemoveRecentRecord={removeMediaPlaybackRecord}
            onTrackSelect={controller.selectTrack}
            playlist={playlist}
            recentLocale={i18n.resolvedLanguage || i18n.language}
            recentRecords={recentRecords}
            t={t}
          />
        </div>
      </main>

      <style>{`
        .music-range { -webkit-appearance: none; appearance: none; background: transparent; }
        .music-range::-webkit-slider-runnable-track { height: 12px; background: transparent; }
        .music-range::-moz-range-track { height: 12px; background: transparent; border: none; }
        .music-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 16px; width: 16px; margin-top: -2px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.9); background: #0f172a; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); }
        .music-range::-moz-range-thumb { height: 16px; width: 16px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.9); background: #0f172a; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); }
        @keyframes music-bar { 0%, 100% { transform: scaleY(0.5); opacity: 0.55; } 50% { transform: scaleY(1.08); opacity: 1; } }
      `}</style>
    </div>
  );
};
