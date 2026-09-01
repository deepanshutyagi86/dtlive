import { describe, it, expect } from "vitest";
import { SECTION_GROUPS, type SettingsSectionKey } from "../settings-sections";

// This module exists because of a shipped outage: SECTION_GROUPS used to
// live inside SettingsForm.tsx, a "use client" module, and the six
// settings PAGES are server components. In the App Router every export of
// a client module becomes a client reference on the server, so reading
// `.title` off it threw and all six pages rendered the error boundary.
//
// A unit test cannot catch a server/client boundary error — only a build
// or a page load can. What it CAN do is guarantee this module stays plain
// data, and that the config behind those pages is complete: a group with
// a typo'd section key renders a page with nothing on it and no error,
// which is the quiet version of the same failure.

const ALL_KEYS: SettingsSectionKey[] = [
  "hero", "ticker", "testimonials", "starter", "stream",
  "bio", "branding", "nav", "footer",
  "emails", "notify",
  "coupons", "tax", "invoice", "business",
  "syllabus", "guideCta", "booth",
];

describe("SECTION_GROUPS", () => {
  it("is plain data — importable with no React and no client runtime", () => {
    expect(typeof SECTION_GROUPS).toBe("object");
    expect(Object.keys(SECTION_GROUPS).length).toBeGreaterThan(0);
  });

  it("has the six pages the admin sidebar links to", () => {
    expect(Object.keys(SECTION_GROUPS).sort()).toEqual(
      ["appearance", "business", "emails", "extras", "homepage", "pricing"]
    );
  });

  it("gives every group a title, a blurb and at least one section", () => {
    for (const [name, group] of Object.entries(SECTION_GROUPS)) {
      expect(group.title, name).toBeTruthy();
      expect(group.blurb, name).toBeTruthy();
      expect(group.sections.length, name).toBeGreaterThan(0);
    }
  });

  // A section that exists in the form but on no page is unreachable — the
  // setting is still saved and still live, with no way to change it.
  it("places every known section on exactly one page", () => {
    const placed = Object.values(SECTION_GROUPS).flatMap((g) => g.sections);
    for (const key of ALL_KEYS) {
      expect(placed.filter((k) => k === key), `section "${key}"`).toHaveLength(1);
    }
    expect(placed).toHaveLength(ALL_KEYS.length);
  });

  it("has no section key outside the known set", () => {
    for (const key of Object.values(SECTION_GROUPS).flatMap((g) => g.sections)) {
      expect(ALL_KEYS, `unknown section "${key}"`).toContain(key);
    }
  });
});
