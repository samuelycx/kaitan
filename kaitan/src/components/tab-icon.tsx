import type { TabIcon } from "@/lib/app-nav";

export function TabIconSvg({ name }: { name: TabIcon }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-[22px] w-[22px]",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "tonight":
      return (
        <svg {...common}>
          <path d="M4 11h16v8H4z" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <path d="M7 4h10l1 16H6L7 4z" />
          <path d="M9 9h6M9 13h6" />
        </svg>
      );
    case "me":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 19c1.2-3 3.4-4.5 7-4.5S17.8 16 19 19" />
        </svg>
      );
    case "slot":
      return (
        <svg {...common}>
          <path d="M5 7h14v12H5z" />
          <path d="M5 11h14M9 7v12" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M5 7h14M5 12h14M5 17h10" />
        </svg>
      );
    case "desk":
      return (
        <svg {...common}>
          <circle cx="8" cy="16" r="2" />
          <path d="M10 16h9l-2-8H7L5 16" />
        </svg>
      );
    case "today":
      return (
        <svg {...common}>
          <path d="M5 6h14v14H5z" />
          <path d="M5 10h14M9 4v4M15 4v4" />
        </svg>
      );
    case "entry":
      return (
        <svg {...common}>
          <path d="M4 20V8l8-4 8 4v12" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case "license":
      return (
        <svg {...common}>
          <path d="M6 5h12v14H6z" />
          <path d="M9 9h6M9 13h6M9 17h3" />
        </svg>
      );
    case "flow":
      return (
        <svg {...common}>
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );
    case "venue":
      return (
        <svg {...common}>
          <path d="M3 20 12 4l9 16H3z" />
          <path d="M12 14v6" />
        </svg>
      );
  }
}
