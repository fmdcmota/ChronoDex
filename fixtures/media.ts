/**
 * Placeholder media URLs used by fixtures and mock mode.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 4.5 (mock mode) and task A1-04.
 *
 * Local SVGs live in public/mock/. The panorama, audio and video are small sample files on
 * third-party hosts, chosen because they are openly licensed, allow CORS from any origin
 * (checked 14 Nov 2026) and have the right format for Agent 4's players:
 * - Panorama: Photo Sphere Viewer's demo image, 2000 x 1000 equirectangular.
 * - Audio and video: MDN's CC0 samples.
 * None of this is ever fed to a model.
 */

/** Map marker placeholder. Agent 3 replaces it with /sprites/<id>.png art. */
export const MOCK_SPRITE_URL = '/mock/sprite.svg';
/** Dex badge placeholder. */
export const MOCK_BADGE_URL = '/mock/badge.svg';
/** Present-day reference photo placeholder, 16:9. */
export const MOCK_REFERENCE_URL = '/mock/reference.svg';
/** Era scene placeholder, 16:9. */
export const MOCK_SCENE_URL = '/mock/scene.svg';
/** Guide headshot placeholder, square. */
export const MOCK_HEADSHOT_URL = '/mock/headshot.svg';

/** Equirectangular sample panorama. */
export const MOCK_PANORAMA = {
  url: 'https://photo-sphere-viewer-data.netlify.app/assets/sphere-small.jpg',
  widthPx: 2000,
  heightPx: 1000,
  vFovDeg: 180,
  centreBearingDeg: 0,
} as const;

/** Short CC0 audio clip standing in for the narration. */
export const MOCK_AUDIO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

/** Short CC0 video clip standing in for each guide video segment. */
export const MOCK_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/** Approximate length of MOCK_VIDEO_URL in seconds. */
export const MOCK_VIDEO_DURATION_S = 5;
