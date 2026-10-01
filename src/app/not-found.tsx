import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-20">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-4 text-muted-foreground">
        The page may have moved, been removed, or never existed.
      </p>
      <div className="mt-8">
        <Link href="/" className={buttonVariants()}>
          Return home
        </Link>
      </div>
    </main>
  );
}
