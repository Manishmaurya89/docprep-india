import type { SVGProps } from "react";

/** Small inline icon set (stroke icons on a 24px grid). Decorative unless given a title. */
const paths = {
  upload: "M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  download: "M12 4v12m0 0-4-4m4 4 4-4M4 18v0a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2",
  search: "m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
  shield: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4",
  check: "m5 12 4.5 4.5L19 7",
  x: "M6 6l12 12M18 6 6 18",
  alert: "M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  info: "M12 16v-5m0-3h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z",
  help: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5m.1 3h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  menu: "M4 7h16M4 12h16M4 17h16",
  sun: "M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m0-12.8L7 7m10 10 1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  monitor: "M4 5h16v11H4zM8 20h8m-4-4v4",
  arrowRight: "M5 12h14m0 0-5-5m5 5-5 5",
  arrowLeft: "M19 12H5m0 0 5-5m-5 5 5 5",
  arrowUp: "M12 19V5m0 0-5 5m5-5 5 5",
  arrowDown: "M12 5v14m0 0-5-5m5 5 5-5",
  chevronDown: "m6 9 6 6 6-6",
  trash: "M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  rotateCw: "M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4",
  rotateCcw: "M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4",
  flipH: "M12 3v18M8 7l-5 5 5 5V7Zm8 0 5 5-5 5V7Z",
  flipV: "M3 12h18M7 8l5-5 5 5H7Zm0 8 5 5 5-5H7Z",
  reset: "M4 4v6h6M4.5 15a8 8 0 1 0 1.9-8.3L4 10",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  unlock: "M7 11V8a5 5 0 0 1 9.6-2M6 11h12v9H6z",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5",
  image: "M4 5h16v14H4zM4 15l4-4 5 5m-1-1 2-2 6 6M15 9.5a1.5 1.5 0 1 1 0-.01",
  resize: "M4 14v6h6M20 10V4h-6M4 20l7-7m9-9-7 7",
  compress: "M4 14h6v6m10-10h-6V4m0 6 7-7M10 14l-7 7",
  crop: "M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14",
  convert: "M4 8h13m0 0-3-3m3 3-3 3M20 16H7m0 0 3-3m-3 3 3 3",
  idPhoto: "M4 4h16v16H4zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6a5 5 0 0 1 10 0",
  merge: "M7 3v5a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4v5M17 3v5a4 4 0 0 1-4 4M7 21v-3",
  split: "M12 3v6m0 0-5 5v7m5-12 5 5v7",
  extract: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM9 14l3 3 3-3m-3 3v-6",
  organize: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  imagesPdf: "M3 7h11v13H3zM7 3h11a2 2 0 0 1 2 2v11M3 16l3-3 3 3 2-2 3 3",
  pdfImage: "M10 3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1M10 3l4 4v4M10 3v4h4M10 11h11v10H10zM10 19l3-3 2 2 2-2 4 4M18 14h.01",
  pdfCompress: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM9 12l3-3 3 3M9 16l3 3 3-3",
  checklist: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  zip: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM11 5h1m-1 3h1m-1 3h1m-1 3h2v3h-2z",
  external: "M14 4h6v6m0-6-9 9M10 6H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5",
  grip: "M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01",
  userX: "M15 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-4A4.5 4.5 0 0 0 2 18.5V20M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8l5 5m0-5-5 5",
  tag: "M3 12.2V4a1 1 0 0 1 1-1h8.2l8.8 8.8-9 9zM7.5 7.5h.01",
  cloudOff: "M3 3l18 18M8.5 8.6A5 5 0 0 0 6 18h11m3.4-1.6A4 4 0 0 0 17 10h-1.3A7 7 0 0 0 9.6 5.3",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, title, className, ...props }: { name: IconName; title?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={className ?? "h-5 w-5"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d={paths[name]} />
    </svg>
  );
}
