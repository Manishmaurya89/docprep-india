import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" className="fill-accent" />
      <path d="M10 8h8l5 5v11a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" className="fill-accent-fg" opacity="0.95" />
      <path d="m12.5 18 2.5 2.5 5-5" fill="none" className="stroke-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-md font-semibold tracking-tight text-fg">
      <BrandMark />
      <span className="text-[1.05rem]">{siteConfig.name}</span>
    </Link>
  );
}
