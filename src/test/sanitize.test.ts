import { describe, it, expect } from "vitest";
import { toSafeHtml } from "@/lib/sanitize";

describe("toSafeHtml", () => {
  it("removes scripts and event handlers but keeps formatting", () => {
    const out = toSafeHtml('<p onclick="x()">Hi <b>there</b></p><script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(out).toContain("<b>there</b>");
    expect(out).not.toContain("script");
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("onclick");
  });

  it("keeps line breaks in plain-text submissions and escapes angle brackets", () => {
    const out = toSafeHtml("line one\nif (a < b) {}");
    expect(out).toContain("line one<br>");
    expect(out).toContain("&lt;");
  });

  it("shows a placeholder for empty content", () => {
    expect(toSafeHtml("")).toBe("<p>No content available</p>");
  });
});
