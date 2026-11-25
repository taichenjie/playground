import type { SectionSlug } from "@/features/sections";

type Props = {
  slug: SectionSlug;
  className?: string;
};

/** Simple original line icons, one per section. Decorative only. */
export function SectionIcon({ slug, className = "size-6" }: Props) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (slug) {
    case "daily-games":
      // A 3x3 puzzle grid with two filled tiles.
      return (
        <svg {...common}>
          <rect x="3" y="3" width="5" height="5" rx="1.2" fill="currentColor" />
          <rect x="9.5" y="3" width="5" height="5" rx="1.2" />
          <rect x="16" y="3" width="5" height="5" rx="1.2" />
          <rect x="3" y="9.5" width="5" height="5" rx="1.2" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1.2" fill="currentColor" />
          <rect x="16" y="9.5" width="5" height="5" rx="1.2" />
          <rect x="3" y="16" width="5" height="5" rx="1.2" />
          <rect x="9.5" y="16" width="5" height="5" rx="1.2" />
          <rect x="16" y="16" width="5" height="5" rx="1.2" />
        </svg>
      );
    case "music-tv":
      // A screen with a music note.
      return (
        <svg {...common}>
          <rect x="2.5" y="4" width="19" height="13" rx="2.5" />
          <path d="M8 21h8" />
          <path d="M13.5 7.5v5.2" />
          <path d="M13.5 7.5l2.5.8" />
          <circle cx="12" cy="12.8" r="1.6" fill="currentColor" />
        </svg>
      );
    case "sports":
      // A ball with seams.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.8 2.4 4.2 5.4 4.2 9s-1.4 6.6-4.2 9" />
          <path d="M12 3c-2.8 2.4-4.2 5.4-4.2 9s1.4 6.6 4.2 9" />
        </svg>
      );
    case "whos-that":
      // A head with a question mark.
      return (
        <svg {...common}>
          <circle cx="10" cy="8" r="4.5" />
          <path d="M2.5 21c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7" />
          <path d="M17.5 4.2c.5-1 1.5-1.7 2.6-1.7 1.5 0 2.6 1.1 2.6 2.4 0 1.9-2.5 2-2.5 3.8" />
          <circle cx="20.2" cy="11.3" r=".9" fill="currentColor" />
        </svg>
      );
    case "casino":
      // A playing card with a diamond pip.
      return (
        <svg {...common}>
          <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
          <path d="M12 7.5l3 4.5-3 4.5-3-4.5z" fill="currentColor" />
        </svg>
      );
  }
}
