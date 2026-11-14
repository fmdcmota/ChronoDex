/**
 * The guide's round profile picture, with an initials fallback while the headshot does not exist yet.
 *
 * Owner: Agent 4. Spike for A4-07. `Guide.headshotUrl` is null until the pipeline's headshot
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
 * Round avatar: the headshot when there is one, otherwise the guide's initials on a warm tone.
 *
 * @param props - Name (for alt text and initials), headshot URL or null, and size.
 * @returns The avatar element.
 */
export function Avatar({ name, url, sizePx }: AvatarProps) {
  const style = { width: sizePx, height: sizePx };
  if (url) return <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover" />;
  const initials = name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  return (
    <div
      role="img"
      aria-label={name}
      style={{ ...style, fontSize: sizePx * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-amber-700 font-semibold text-amber-50"
    >
      {initials}
    </div>
  );
}
