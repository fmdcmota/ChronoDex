/**
 * The guide's round profile picture, with a period silhouette while the headshot does not exist yet.
 *
 * Owner: Agent 4. Part of A4-07. `Guide.headshotUrl` is null until the pipeline's headshot
 * stage finishes (MASTER.md section 5.1), and the chat must still look finished before that.
 */

/** Props for Avatar. */
export interface AvatarProps {
  name: string;
  url: string | null;
  /** Diameter in CSS pixels. */
  sizePx: number;
}

/**
 * Pixel silhouette of a period figure in a bowler hat, 16 by 16, one rect per run of pixels:
 * [x, y, width, height]. Shown while the headshot does not exist yet (phone test round 1, chat item 1).
 */
const SILHOUETTE: [number, number, number, number][] = [
  [6, 2, 4, 1], // hat crown
  [5, 3, 6, 2],
  [3, 5, 10, 1], // brim
  [5, 6, 6, 3], // head
  [6, 9, 4, 1], // chin
  [7, 10, 2, 1], // neck
  [3, 11, 10, 1], // shoulders
  [2, 12, 12, 1],
  [1, 13, 14, 3],
];

/**
 * Round avatar: the headshot when there is one, otherwise a period silhouette on a warm tone.
 *
 * @param props - Component props.
 * @param props.name - The guide's name, for alt text.
 * @param props.url - Headshot URL, or null while the pipeline has not made it.
 * @param props.sizePx - Diameter in CSS pixels.
 * @returns The avatar element.
 */
export function Avatar({ name, url, sizePx }: AvatarProps) {
  const style = { width: sizePx, height: sizePx };
  // A plain img: headshots come from fal's CDN at many sizes, and next/image would need its domains configured.
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover" />;
  return (
    <svg
      role="img"
      aria-label={`${name} (portrait coming)`}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={style}
      className="shrink-0 rounded-full bg-(--brick) text-(--ink)"
    >
      {SILHOUETTE.map(([x, y, w, h]) => (
        <rect key={`${x},${y}`} x={x} y={y} width={w} height={h} fill="currentColor" />
      ))}
    </svg>
  );
}
