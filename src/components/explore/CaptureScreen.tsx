/**
 * The Capture screen: rear camera, take the picture, upload it, ask the server whether the player
 * is close enough, and award the badge (MASTER.md section 1.1 and 1.2 steps 2 to 4, task A3-06).
 *
 * Owner: Agent 3 (Explorer).
 *
 * Flow: camera (or the phone's camera app through a file input when the live camera is not
 * available) -> review -> sending (upload, then `POST /api/captures`) -> result. The server decides
 * the capture; this screen only shows the outcome. A refused capture says how far and which way the
 * nearest landmark is (MASTER.md 1.2 step 4). A successful one plays the badge award and offers the
 * Time Machine.
 *
 * Camera facts this relies on:
 * - `getUserMedia` works only in a secure context (HTTPS or localhost), so plain-HTTP phones get the
 *   file-input fallback with a message saying why.
 * - The video element is `playsInline` and `muted`, or iOS Safari opens it full screen / refuses to
 *   autoplay.
 * - The stream stays open while the player reviews a photo or sees a result, so "Retake" does not
 *   prompt again. The <video> element is re-pointed at it when the camera view comes back.
 */
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, getPlayerId } from '@/lib/client';
import { withinCaptureRange, type Capture, type Landmark } from '@/lib/contracts';
import { Button, Card, ProgressList, Sheet, Spinner, type ProgressItem } from '@/components/ui';
import { describeApiFailure, describeCaptureFailure } from './lib/capture-messages';
import { clearFix, loadFix } from './lib/fix-store';
import { directionHint, formatDistance, nearestLandmark } from './lib/geo-format';
import { MemoryBox } from './MemoryBox';
import { AwardEffects } from './AwardEffects';
import { Sparks } from './Sparks';
import { rememberPhoto } from './lib/remember-photo';
import { useUnavailableTimeMachines } from './lib/use-era-ready';
import { encodeJpeg, resizeFileToJpeg } from './lib/image-resize';
import { LocationTracker, locationMessage, type LocationState, type PlayerFix } from './lib/location';

/** True when the location-spoof tools may be used (MASTER.md section 8.2). */
const DEV_TOOLS = process.env.NEXT_PUBLIC_DEV_TOOLS === '1';

/** A photo the player has taken, with a temporary address to show it. */
interface Photo {
  blob: Blob;
  /** `blob:` URL for the preview. Revoked when the photo is replaced or the screen closes. */
  previewUrl: string;
}

/** Why the live camera is not running. */
type CameraState =
  | { status: 'starting' }
  | { status: 'live' }
  | { status: 'unavailable'; message: string };

/** What the screen is doing. */
type Phase = 'camera' | 'review' | 'sending' | 'result';

/** How a capture ended. */
type Outcome =
  | { kind: 'collected'; capture: Capture; landmark: Landmark; alreadyCollected: boolean }
  | { kind: 'refused'; message: string }
  | { kind: 'error'; message: string };

/**
 * Explain why the live camera could not start, in words a player can act on.
 *
 * @param error - What `getUserMedia` threw, or null when the API itself is missing.
 * @returns A sentence that also points at the fallback.
 */
function cameraMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (!window.isSecureContext) {
    return 'The camera needs a secure (https) link. Use your phone’s camera app instead.';
  }
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access is blocked. Allow it in your browser settings, or use your phone’s camera app instead.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found. You can pick a photo instead.';
  }
  return 'The camera could not start. Use your phone’s camera app instead.';
}

/**
 * The capture screen body.
 *
 * @returns The screen: a full-viewport camera with controls, or a centred result panel.
 */
export default function CaptureScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackerRef = useRef<LocationTracker | null>(null);
  /** Latest position, read when the shutter is pressed. A ref, so a GPS update never re-renders. */
  const fixRef = useRef<PlayerFix | null>(null);
  /** Position at the moment the photo was taken: what the server is asked about. */
  const shotFixRef = useRef<PlayerFix | null>(null);
  /** Upload result for the current photo, so "Try again" never uploads the same photo twice. */
  const uploadedUrlRef = useRef<string | null>(null);

  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });
  const [camera, setCamera] = useState<CameraState>({ status: 'starting' });
  const [phase, setPhase] = useState<Phase>('camera');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Whether the collected landmark has a generated era to open (task A3-r2-4).
  const collectedId = outcome?.kind === 'collected' ? outcome.landmark.id : undefined;
  const collectedIds = useMemo(() => (collectedId ? [collectedId] : undefined), [collectedId]);
  const noTimeMachine = useUnavailableTimeMachines(collectedIds);
  const [steps, setSteps] = useState<ProgressItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // The landmarks, to name the target and to word a refusal. Failure is fine: names just go missing.
  useEffect(() => {
    let alive = true;
    api.listLandmarks().then(
      (list) => alive && setLandmarks(list),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);

  // Track the player's position. A dev spoof set on the map carries over; real GPS starts at once
  // if permission was already granted (the player pressed Capture on the map, so it normally is).
  useEffect(() => {
    let cancelled = false;
    const tracker = new LocationTracker();
    trackerRef.current = tracker;
    const unsubscribe = tracker.subscribe((state) => {
      setLocation(state);
      // 'idle' and 'locating' keep what we have, so the recent map fix below is not wiped the
      // moment tracking starts. Only a state that rules a position out clears it.
      if (state.status === 'ready') fixRef.current = state.fix;
      else if (state.status === 'timeout' || state.status === 'unavailable') fixRef.current = state.lastFix ?? fixRef.current;
      else if (state.status === 'denied' || state.status === 'unsupported' || state.status === 'insecure') fixRef.current = null;
    });
    const stored = loadFix(Date.now(), DEV_TOOLS);
    if (stored?.source === 'spoof') {
      tracker.spoof(stored.position, stored.accuracyM);
    } else {
      // A recent GPS fix from the map is a fallback if the first reading here is slow.
      if (stored) fixRef.current = stored;
      void (async () => {
        try {
          const status = await navigator.permissions?.query({ name: 'geolocation' });
          // The screen may have closed (or React re-run this effect) while the query was pending;
          // starting then would leave a GPS watch running that nothing can stop.
          if (!cancelled && status?.state === 'granted') tracker.start();
        } catch {
          // Older Safari has no Permissions API for geolocation: the player taps "Share location".
        }
      })();
    }
    return () => {
      cancelled = true;
      unsubscribe();
      tracker.stop();
      trackerRef.current = null;
    };
  }, []);

  // Open the rear camera, and close it when the screen goes away.
  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera({ status: 'unavailable', message: cameraMessage(null) });
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // `ideal`, not `exact`: a laptop with only a front camera still works.
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setCamera({ status: 'live' });
      } catch (err) {
        if (!cancelled) setCamera({ status: 'unavailable', message: cameraMessage(err) });
      }
    }
    void start();
    return () => {
      cancelled = true;
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
    };
  }, []);

  // The result and sending views replace the whole camera view, so the <video> element is a new one
  // when the player comes back (Retake). Point it at the stream that is still open.
  useEffect(() => {
    if (phase !== 'camera' && phase !== 'review') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      void video.play().catch(() => undefined);
    }
  }, [phase, camera.status]);

  // Free the preview picture when it is replaced or the screen closes.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.previewUrl);
    };
  }, [photo]);

  /** Keep a new photo and move to the review step. */
  const keepPhoto = useCallback((blob: Blob) => {
    shotFixRef.current = fixRef.current;
    uploadedUrlRef.current = null;
    setPhotoError(null);
    setPhoto({ blob, previewUrl: URL.createObjectURL(blob) });
    setPhase('review');
  }, []);

  /** Shutter: grab the current video frame. */
  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || busy) return;
    setBusy(true);
    try {
      keepPhoto(await encodeJpeg(video, { widthPx: video.videoWidth, heightPx: video.videoHeight }));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'The photo could not be taken. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, keepPhoto]);

  /** Fallback: a photo from the phone's camera app or library. */
  const onFilePicked = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setBusy(true);
      try {
        keepPhoto(await resizeFileToJpeg(file));
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : 'That photo could not be read. Try another.');
      } finally {
        setBusy(false);
        // Clear the input so picking the same file again still fires a change event.
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [keepPhoto],
  );

  /** Upload the photo (once), then ask the server to resolve the capture. */
  const submit = useCallback(async () => {
    if (!photo) return;
    const fix = shotFixRef.current ?? fixRef.current;
    setPhase('sending');
    setOutcome(null);

    if (!fix) {
      // No point uploading a photo the server will refuse for lack of a position.
      setOutcome({ kind: 'refused', message: describeCaptureFailure({ ok: false, reason: 'location_missing', nearest: null }, landmarks, null) });
      setPhase('result');
      return;
    }

    const step = (upload: ProgressItem['state'], check: ProgressItem['state']): ProgressItem[] => [
      { key: 'upload', label: 'Sending your photo', state: upload },
      { key: 'check', label: 'Checking where you are', state: check },
    ];
    /** Which request is in flight, so a failure is worded for the right one. */
    let current: 'upload' | 'capture' = 'upload';
    try {
      let photoUrl = uploadedUrlRef.current;
      if (!photoUrl) {
        setSteps(step('running', 'pending'));
        photoUrl = await api.uploadPhoto(photo.blob);
        uploadedUrlRef.current = photoUrl;
      }
      current = 'capture';
      setSteps(step('done', 'running'));
      const result = await api.postCapture({
        playerId: getPlayerId(),
        photoUrl,
        location: fix.position,
        accuracyM: fix.accuracyM,
        spoofed: fix.source === 'spoof' ? true : undefined,
      });
      if (result.ok) {
        setOutcome({ kind: 'collected', capture: result.capture, landmark: result.landmark, alreadyCollected: result.alreadyCollected });
        // Keep a small copy of the photo in the memory box (and note a first-time badge for the Dex to twirl).
        void rememberPhoto(photo.blob, result.capture, result.landmark, !result.alreadyCollected, getPlayerId());
      } else {
        setOutcome({ kind: 'refused', message: describeCaptureFailure(result, landmarks, fix.position) });
      }
    } catch (err) {
      setOutcome({ kind: 'error', message: describeApiFailure(err, current) });
    }
    setPhase('result');
  }, [photo, landmarks, setSteps]);

  /** Back to the camera for another shot. */
  const retake = useCallback(() => {
    setPhoto(null);
    setOutcome(null);
    setPhase('camera');
  }, []);

  const fix = location.status === 'ready' ? location.fix : location.status === 'timeout' || location.status === 'unavailable' ? location.lastFix : null;
  /** The landmark the player is standing at, used as the label on the viewfinder. */
  const target = useMemo(() => {
    if (!fix || landmarks.length === 0) return null;
    const near = nearestLandmark(fix.position, landmarks);
    return near && withinCaptureRange(near.distanceM, fix.accuracyM, near.landmark.captureRadiusM) ? near : null;
  }, [fix, landmarks]);
  const nearest = useMemo(
    () => (fix && landmarks.length > 0 ? nearestLandmark(fix.position, landmarks) : null),
    [fix, landmarks],
  );

  const locationNote = fix
    ? target
      ? `You are at ${target.landmark.name}.`
      : nearest
        ? `Not at a landmark yet: ${directionHint(nearest)}.`
        : `Position found, accurate to ${formatDistance(fix.accuracyM)}.`
    : (locationMessage(location) ?? 'Finding you…');
  const needsLocationButton = location.status === 'idle' || location.status === 'unavailable' || location.status === 'timeout';

  // ---- Result: badge award, refusal or error ----

  if (phase === 'result' && outcome) {
    return (
      <div className="cap-root">
        <div className="cap-panel">
          {outcome.kind === 'collected' ? (
            <>
              <h1 className="award-title">{outcome.alreadyCollected ? 'Already collected' : 'Badge collected!'}</h1>
              <div className="award-stage">
                {!outcome.alreadyCollected && <AwardEffects />}
                <Sparks delayS={0.43} />
                <Sparks count={8} radiusPx={112} delayS={1.5} />
                {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must stay crisp; next/image would re-encode it */}
                <img
                  className={outcome.alreadyCollected ? 'award-badge' : 'award-badge award-twirl'}
                  src={outcome.landmark.badgeUrl}
                  alt={`${outcome.landmark.name} badge`}
                />
              </div>
              <Card title={outcome.landmark.name}>
                <span className={`rarity rarity-${outcome.landmark.rarity}`}>{outcome.landmark.rarity.toUpperCase()}</span>
                <p>{outcome.landmark.blurb}</p>
                <p className="muted">
                  {noTimeMachine.has(outcome.landmark.id)
                    ? 'Time Machine: coming soon'
                    : `Step back in time: ${outcome.landmark.eraYears.join(', ')}`}
                </p>
              </Card>
              <div className="cap-actions">
                {!noTimeMachine.has(outcome.landmark.id) && (
                  <Button href={`/time/${outcome.landmark.id}`}>Open Time Machine</Button>
                )}
                <Button href="/" variant={noTimeMachine.has(outcome.landmark.id) ? 'primary' : 'quiet'}>
                  Back to the map
                </Button>
              </div>
              {photo && <div className="award-photo" aria-hidden="true" style={{ backgroundImage: `url(${photo.previewUrl})` }} />}
              <MemoryBox />
            </>
          ) : (
            <>
              <h1 className="award-title">{outcome.kind === 'refused' ? 'Not quite' : 'Could not finish'}</h1>
              <Card>
                <p>{outcome.message}</p>
              </Card>
              <div className="cap-actions">
                {outcome.kind === 'error' && <Button onClick={() => void submit()}>Try again</Button>}
                <Button variant={outcome.kind === 'error' ? 'quiet' : 'primary'} onClick={retake}>
                  Retake photo
                </Button>
                <Button href="/" variant="quiet">
                  Back to the map
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Sending ----

  if (phase === 'sending') {
    return (
      <div className="cap-root">
        <div className="cap-panel">
          <Spinner label="Sending your photo" />
          <ProgressList items={steps} />
        </div>
      </div>
    );
  }

  // ---- Camera and review ----

  const reviewing = phase === 'review' && photo;
  const clearSpoofAndStart = () => {
    clearFix();
    fixRef.current = null;
    trackerRef.current?.clearSpoof();
    trackerRef.current?.start();
  };

  return (
    <div className="cap-root">
      <div className="cap-top">
        <Button href="/" variant="quiet" size="small">
          ← Map
        </Button>
        <span className="chip" aria-live="polite">
          {fix ? `GPS ±${formatDistance(fix.accuracyM)}` : 'No GPS yet'}
          {fix?.source === 'spoof' ? ' (fake)' : ''}
        </span>
      </div>

      <div className="cap-stage">
        {/* Always mounted so the stream survives the review step; hidden, not removed. */}
        <video
          ref={videoRef}
          className="cap-video"
          playsInline
          muted
          autoPlay
          style={{ display: reviewing || camera.status !== 'live' ? 'none' : 'block' }}
        />
        {reviewing && (
          // eslint-disable-next-line @next/next/no-img-element -- a blob: preview of the player's own photo
          <img className="cap-preview" src={photo.previewUrl} alt="The photo you just took" />
        )}
        {camera.status === 'starting' && (
          <div className="cap-panel">
            <Spinner label="Opening the camera" />
          </div>
        )}
        {camera.status === 'unavailable' && !reviewing && (
          <div className="cap-panel">
            <Card title="No live camera">
              <p>{camera.message}</p>
            </Card>
          </div>
        )}
        {camera.status === 'live' && !reviewing && (
          <>
            <span className="cap-corner tl" />
            <span className="cap-corner tr" />
            <span className="cap-corner bl" />
            <span className="cap-corner br" />
            {target && (
              <div className="cap-target">
                <span>{target.landmark.name}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="cap-bottom">
        <p className="cap-note" aria-live="polite">
          {photoError ?? (reviewing ? 'Happy with it? Send it to collect the badge.' : locationNote)}
        </p>
        <div className="cap-actions">
          {reviewing ? (
            <>
              <Button onClick={() => void submit()}>Use this photo</Button>
              <Button variant="quiet" onClick={retake}>
                Retake
              </Button>
            </>
          ) : (
            <>
              {camera.status === 'live' && (
                <button
                  type="button"
                  className="cap-shutter"
                  aria-label="Take the photo"
                  disabled={busy}
                  onClick={() => void takePhoto()}
                />
              )}
              <Button variant="quiet" size="small" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                {camera.status === 'live' ? 'Use camera app' : 'Take or pick a photo'}
              </Button>
              {needsLocationButton && (
                <Button variant="quiet" size="small" onClick={() => trackerRef.current?.start()}>
                  Share location
                </Button>
              )}
              {DEV_TOOLS && fix?.source === 'spoof' && (
                <Button variant="quiet" size="small" onClick={clearSpoofAndStart}>
                  Use real GPS
                </Button>
              )}
            </>
          )}
        </div>
        {/* The phone's camera app or photo library. `capture` asks for the rear camera on phones. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void onFilePicked(event.target.files?.[0])}
        />
      </div>

      {location.status === 'denied' && (
        <Sheet title="Location is blocked">
          <p>{locationMessage(location)}</p>
          <Link className="btn btn-quiet" href="/">
            Back to the map
          </Link>
        </Sheet>
      )}
    </div>
  );
}
