import { describe, it, expect } from "vitest";
import { parseAttribution, sanitiseAttribution } from "../attribution";

describe("parseAttribution", () => {
  it("reads the tags off an ad link", () => {
    const a = parseAttribution("?utm_source=fb&utm_medium=paid&utm_campaign=aug-webinar&fbclid=xyz");
    expect(a?.params).toEqual({
      utm_source: "fb",
      utm_medium: "paid",
      utm_campaign: "aug-webinar",
      fbclid: "xyz",
    });
  });

  it("ignores anything not on the allowlist", () => {
    const a = parseAttribution("?utm_source=fb&password=hunter2&note=whatever");
    expect(a?.params).toEqual({ utm_source: "fb" });
  });

  it("returns null for an ordinary visit, rather than an empty shell", () => {
    expect(parseAttribution("")).toBeNull();
    expect(parseAttribution("?page=2")).toBeNull();
  });

  // Your own site is not a traffic source. Counting it as one makes it
  // look like your best-performing channel.
  it("drops a same-site referrer but keeps an off-site one", () => {
    const internal = parseAttribution("", {
      referrer: "https://deepanshutyagi.live/courses",
      host: "deepanshutyagi.live",
    });
    expect(internal).toBeNull();

    const external = parseAttribution("", {
      referrer: "https://www.instagram.com/",
      host: "deepanshutyagi.live",
    });
    expect(external?.referrer).toBe("https://www.instagram.com/");
  });

  it("caps every value, because a URL is attacker-controlled", () => {
    const a = parseAttribution(`?utm_campaign=${"x".repeat(5000)}`);
    expect(a!.params.utm_campaign!.length).toBe(200);
  });
});

describe("sanitiseAttribution", () => {
  it("rebuilds from the allowlist instead of trusting what was posted", () => {
    const a = sanitiseAttribution({
      params: { utm_source: "fb", evil: "x".repeat(9000) },
      landing: "https://deepanshutyagi.live/live",
      extra: { nested: "junk" },
    });
    expect(a?.params).toEqual({ utm_source: "fb" });
    expect(a).not.toHaveProperty("extra");
  });

  it("refuses non-string values", () => {
    expect(sanitiseAttribution({ params: { utm_source: { $ne: null } } })).toBeNull();
  });

  it("overwrites any timestamp the browser supplied", () => {
    const a = sanitiseAttribution({ params: { utm_source: "fb" }, at: "1990-01-01T00:00:00.000Z" });
    expect(a!.at! > "2020-01-01").toBe(true);
  });

  it("returns null for junk", () => {
    for (const bad of [null, undefined, "string", 42, {}, { params: {} }]) {
      expect(sanitiseAttribution(bad)).toBeNull();
    }
  });
});
