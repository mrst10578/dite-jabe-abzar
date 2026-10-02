import { describe, expect, it } from "vitest";
import { guideSearchText } from "./flow-guide-browser.mjs";

describe("guide search preparation", () => {
  it("indexes body prose with native Persian normalization, omitting scripts, styles and injected search tools", () => {
    const index = guideSearchText('<html><head><title>head-only-title</title><style>style-sentinel</style></head><body><h1>كتاب و يار</h1><p>پذيرش ۱۴۰۵ <strong>دائم</strong></p><script>script-sentinel</script><noscript>noscript-sentinel</noscript><div class="aris-inline-search-tools">search-tool-sentinel</div><div class="aris-article-tools">article-tool-sentinel</div></body></html>');
    expect(index).toContain("کتاب و یار");
    expect(index).toContain("پذیرش ۱۴۰۵ دائم");
    for (const excluded of ["head", "style", "script", "noscript", "sentinel"]) expect(index).not.toContain(excluded);
  });
});
