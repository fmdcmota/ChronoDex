/**
 * The guide's round profile picture, with an initials fallback while the headshot does not exist yet.
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
 * Round avatar: the headshot when there is one, otherwise the guide's initials on a warm tone.
 *
 * @param props - Component props.
 * @param props.name - The guide's name, for alt text and initials.
 * @param props.url - Headshot URL, or null while the pipeline has not made it.
 * @param props.sizePx - Diameter in CSS pixels.
 * @returns The avatar element.
 */
export function Avatar({ name, url, sizePx }: AvatarProps) {
  const style = { width: sizePx, height: sizePx };
  // A plain img: headshots come from fal's CDN at many sizes, and next/image would need its domains configured.
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover" />;
  const initials = name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  return (
    <div
      role="img"
      aria-label={name}
      style={{ ...style, fontSize: sizePx * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-(--brick) font-semibold text-(--paper)"
    >
      {initials}
    </div>
  );
}
