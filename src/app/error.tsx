"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-20">
      <p className="text-sm font-medium text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        We could not load this page.
      </h1>
      <p className="mt-4 text-muted-foreground">
        Try the action again. If the problem continues, the error can be traced
        through the project monitoring pack when that capability is enabled.
      </p>
      <div className="mt-8">
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
