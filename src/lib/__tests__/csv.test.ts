import { describe, expect, it } from "vitest";
import { csvEscape, toCsv, istDateToUtc, exportFilename, exportHref } from "../csv";

describe("csvEscape", () => {
  it("leaves a plain value bare", () => {
    expect(csvEscape("Deepanshu")).toBe("Deepanshu");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(csvEscape("Meerut, UP")).toBe('"Meerut, UP"');
    expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null and undefined as empty, never the word", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
    expect(csvEscape(null)).not.toContain("null");
  });

  // Every value in these exports is typed by a stranger into a checkout form.
  it("defuses a formula so a buyer's name cannot execute in Excel", () => {
    expect(csvEscape('=HYPERLINK("http://evil.test","click")')).toBe(
      '"\t=HYPERLINK(""http://evil.test"",""click"")"'
    );
    for (const attack of ["=1+1", "+1", "-1", "@SUM(A1)"]) {
      expect(csvEscape(attack).startsWith("\t")).toBe(true);
    }
  });

  it("does not mangle a legitimate negative amount into a different number", () => {
    expect(csvEscape("-27.00")).toBe("\t-27.00");
    expect(csvEscape("-27.00")).toContain("-27.00");
  });
});

describe("toCsv", () => {
  it("writes a BOM so Excel reads UTF-8, not Latin-1", () => {
    expect(toCsv(["A"], [["x"]]).charCodeAt(0)).toBe(0xfeff);
  });

  it("uses CRLF and ends with one", () => {
    const out = toCsv(["A", "B"], [["1", "2"]]);
    expect(out).toBe("﻿A,B\r\n1,2\r\n");
  });

  it("survives a header with no rows", () => {
    expect(toCsv(["A"], [])).toBe("﻿A\r\n");
  });
});

// This is the bug class that already bit once: a UTC-derived "today" is
// yesterday in India between 00:00 and 05:30 IST.
describe("istDateToUtc", () => {
  it("starts an Indian day at 18:30 UTC the day before", () => {
    expect(istDateToUtc("2026-09-02")).toBe("2026-09-01T18:30:00.000Z");
  });

  it("ends an Indian day at the start of the next one", () => {
    expect(istDateToUtc("2026-09-02", true)).toBe("2026-09-02T18:30:00.000Z");
  });

  it("makes a single-day range cover exactly 24 hours", () => {
    const from = new Date(istDateToUtc("2026-09-02")!).getTime();
    const to = new Date(istDateToUtc("2026-09-02", true)!).getTime();
    expect(to - from).toBe(24 * 60 * 60 * 1000);
  });

  it("includes an order placed at 04:26 IST — the hour that broke the coupon tests", () => {
    const order = new Date("2026-09-02T04:26:00+05:30").getTime();
    const from = new Date(istDateToUtc("2026-09-02")!).getTime();
    const to = new Date(istDateToUtc("2026-09-02", true)!).getTime();
    expect(order).toBeGreaterThanOrEqual(from);
    expect(order).toBeLessThan(to);
  });

  it("excludes 23:59 of the previous Indian day", () => {
    const before = new Date("2026-09-01T23:59:00+05:30").getTime();
    expect(before).toBeLessThan(new Date(istDateToUtc("2026-09-02")!).getTime());
  });

  it("crosses a month and a year boundary correctly", () => {
    expect(istDateToUtc("2026-01-01")).toBe("2025-12-31T18:30:00.000Z");
    expect(istDateToUtc("2026-03-01", true)).toBe("2026-03-01T18:30:00.000Z");
  });

  it("returns null for anything that is not a plain date", () => {
    for (const bad of ["", undefined, "yesterday", "02-09-2026", "2026-9-2", "2026-13-01x"]) {
      expect(istDateToUtc(bad as string | undefined)).toBeNull();
    }
  });
});

describe("exportFilename", () => {
  it("says what is inside it", () => {
    expect(exportFilename({ type: "orders", status: "paid", from: "2026-09-01", to: "2026-09-07" }))
      .toBe("orders-paid-2026-09-01_to_2026-09-07.csv");
  });

  it("names the campaign without punctuation a filesystem dislikes", () => {
    const name = exportFilename({ type: "leads", source: "ad:claude-workshop" });
    expect(name).toBe("leads-ad-claude-workshop.csv");
    expect(name).not.toContain(":");
  });

  it("degrades to something sane with no filters", () => {
    expect(exportFilename({ type: "orders" })).toBe("orders.csv");
  });
});

describe("exportHref", () => {
  it("omits empty filters rather than sending blanks", () => {
    expect(exportHref({ type: "orders", from: "", status: "" })).toBe("/api/admin/export?type=orders");
  });

  it("encodes a campaign tag safely", () => {
    expect(exportHref({ type: "leads", source: "ad:claude-workshop" }))
      .toBe("/api/admin/export?type=leads&source=ad%3Aclaude-workshop");
  });
});
