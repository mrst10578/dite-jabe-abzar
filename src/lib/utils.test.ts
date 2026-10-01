import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges conditional classes", () => {
    expect(cn("px-2", false && "hidden", "py-2")).toBe("px-2 py-2");
  });

  it("resolves conflicting Tailwind utilities", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
