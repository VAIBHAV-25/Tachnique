export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[9px] shadow-card"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #5B5BD6 0%, #7C5CFC 100%)",
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="5" height="12" rx="1.5" fill="#fff" />
        <rect x="10" y="3" width="5" height="18" rx="1.5" fill="#fff" opacity="0.85" />
        <rect x="17" y="3" width="4" height="8" rx="1.5" fill="#fff" opacity="0.7" />
      </svg>
    </span>
  );
}
