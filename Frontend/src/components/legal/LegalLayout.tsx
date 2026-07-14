import type { ReactNode } from "react";

export default function LegalLayout({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-white px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#5B4FE9]">Legal</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-3 text-xs text-foreground/45">Last updated: {lastUpdated}</p>
        {intro && <p className="mt-5 text-sm leading-relaxed text-foreground/60">{intro}</p>}

        <div
          className="mt-10 flex flex-col gap-8
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground
          [&_p]:mt-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/60
          [&_ul]:mt-2 [&_ul]:ml-5 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5
          [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-foreground/60
          [&_a]:text-[#5B4FE9] [&_a]:underline [&_a]:underline-offset-2"
        >
          {children}
        </div>
      </div>
    </main>
  );
}
