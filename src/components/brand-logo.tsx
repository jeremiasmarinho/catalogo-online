import Image from "next/image";
import { STORE_CONFIG } from "@/config/store";

type BrandLogoProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ inverse = false, compact = false, className = "" }: BrandLogoProps) {
  const whiteUrl = STORE_CONFIG.logoWhiteUrl;
  const src = inverse ? whiteUrl || STORE_CONFIG.logoUrl : STORE_CONFIG.logoUrl;
  const needsChip = Boolean(inverse && !whiteUrl && STORE_CONFIG.logoUrl);

  if (src) {
    const image = (
      <Image
        src={src}
        alt={STORE_CONFIG.name}
        width={1200}
        height={392}
        priority
        className={`${compact ? "h-8" : "h-9 sm:h-10"} w-auto ${className}`}
      />
    );

    if (needsChip) {
      return (
        <span className={`inline-flex rounded-xl bg-surface p-2 ${className}`}>{image}</span>
      );
    }

    return image;
  }

  return (
    <span
      className={`inline-flex flex-col font-display font-bold leading-none tracking-tight ${
        inverse ? "text-surface" : "text-forest"
      } ${className}`}
    >
      <span className={compact ? "text-base" : "text-lg sm:text-xl"}>{STORE_CONFIG.shortName}</span>
      {!compact && <span className="mt-1 text-[9px] font-semibold tracking-[0.22em]">BRASIL</span>}
    </span>
  );
}
