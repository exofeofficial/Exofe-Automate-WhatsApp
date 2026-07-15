import Link from "next/link";

export default function BrandLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className ?? ""}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 18L12 10L16 14L20 10L28 18"
          stroke="#5B4FE9"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 24L12 16L16 20L20 16L28 24"
          stroke="#5B4FE9"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
      <span className="text-xl font-bold tracking-tight text-foreground">Exofe</span>
    </Link>
  );
}
