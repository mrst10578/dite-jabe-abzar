import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const principles = [
  {
    icon: Layers3,
    title: "Small core",
    description:
      "Start with the web foundation only. Product capabilities are added later as feature packs.",
  },
  {
    icon: ShieldCheck,
    title: "Production baseline",
    description:
      "Strict typing, linting, build checks, unit tests, E2E smoke tests, and explicit error states are already wired.",
  },
  {
    icon: Sparkles,
    title: "AI-friendly",
    description:
      "AGENTS.md and clear repository boundaries make the starter predictable for AI-assisted implementation.",
  },
];

export default function Home() {
  return (
    <main id="main-content">
      <section className="mx-auto flex min-h-[72vh] max-w-6xl flex-col justify-center px-6 py-20 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Starter is running
          </div>

          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Build client websites from a clean baseline.
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
            A deliberately small Next.js foundation with professional defaults.
            Add business capabilities only when the client brief requires them.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#principles"
              className={cn(buttonVariants({ size: "lg" }), "group")}
            >
              See the baseline
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <a
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Next.js docs
            </a>
          </div>
        </div>
      </section>

      <section
        id="principles"
        aria-labelledby="principles-title"
        className="border-y bg-card"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">
              Starter contract
            </p>
            <h2
              id="principles-title"
              className="mt-2 text-3xl font-semibold tracking-tight"
            >
              Enough foundation. No speculative stack.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-xl border bg-background p-6 shadow-sm"
              >
                <div className="mb-5 inline-flex rounded-lg bg-secondary p-2">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:px-8 lg:px-10">
        <p>Professional Web Toolkit · starter-web</p>
        <p>Next.js + TypeScript + Tailwind</p>
      </footer>
    </main>
  );
}
