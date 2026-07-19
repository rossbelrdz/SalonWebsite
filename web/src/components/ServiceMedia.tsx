import type { CSSProperties } from "react";
import Image from "next/image";

/** Card media for a service: optimized photo (next/image + sharp) or gradient fallback. */
export function ServiceMedia({
  mediaClass,
  imageUrl,
  name,
  className = "",
  style,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: {
  mediaClass: string;
  imageUrl?: string | null;
  name: string;
  className?: string;
  style?: CSSProperties;
  /** Responsive sizes for next/image (default: 3-col cards). */
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={`media ${mediaClass} ${className}`.trim()} style={style}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes={sizes}
          className="media-img"
          priority={priority}
        />
      ) : (
        <span className="media-icon" aria-hidden>
          ✦
        </span>
      )}
    </div>
  );
}
