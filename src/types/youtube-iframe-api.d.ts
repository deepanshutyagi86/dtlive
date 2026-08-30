// Minimal ambient types for the YouTube IFrame Player API — just the
// surface BoothRoom.tsx actually calls. Same reasoning as razorpay.d.ts:
// this is a script-injected global, not an npm package, so there's no
// @types package to install.

declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    enablejsapi?: 0 | 1;
    list?: string;
    listType?: "playlist";
    modestbranding?: 0 | 1;
    mute?: 0 | 1;
    origin?: string;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
  }

  interface VideoData {
    video_id: string;
    title: string;
  }

  interface OnStateChangeEvent {
    data: PlayerState;
    target: Player;
  }

  interface OnAutoplayBlockedEvent {
    target: Player;
  }

  interface OnErrorEvent {
    data: number;
    target: Player;
  }

  interface PlayerEvents {
    onReady?: (event: { target: Player }) => void;
    onStateChange?: (event: OnStateChangeEvent) => void;
    onAutoplayBlocked?: (event: OnAutoplayBlockedEvent) => void;
    onError?: (event: OnErrorEvent) => void;
  }

  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    playerVars?: PlayerVars;
    events?: PlayerEvents;
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    loadPlaylist(options: { list?: string; listType?: string; index?: number; startSeconds?: number }): void;
    playVideoAt(index: number): void;
    getPlaylist(): string[] | undefined;
    getPlaylistIndex(): number;
    getCurrentTime(): number;
    getDuration(): number;
    getVideoData(): VideoData;
    getPlayerState(): PlayerState;
    destroy(): void;
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
