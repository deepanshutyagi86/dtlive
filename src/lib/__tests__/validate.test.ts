import { describe, expect, it } from "vitest";
import { isValidEmail, isValidPhone, normalisePhone, validateContact } from "@/lib/validate";

describe("isValidEmail", () => {
  it("accepts a normal address", () => expect(isValidEmail("you@example.com")).toBe(true));
  it("accepts a plus-tag", () => expect(isValidEmail("you+orders@example.com")).toBe(true));
  it("rejects missing @", () => expect(isValidEmail("youexample.com")).toBe(false));
  it("rejects consecutive dots", () => expect(isValidEmail("you..me@example.com")).toBe(false));
  it("rejects whitespace", () => expect(isValidEmail("you @example.com")).toBe(false));
  it("rejects no TLD", () => expect(isValidEmail("you@example")).toBe(false));
});

describe("isValidPhone", () => {
  it("accepts a bare 10-digit Indian mobile", () => expect(isValidPhone("9876543210")).toBe(true));
  it("accepts a +91-prefixed number", () => expect(isValidPhone("+91 98765 43210")).toBe(true));
  it("rejects a 10-digit number starting 0-5", () => expect(isValidPhone("1234567890")).toBe(false));
  it("rejects too short", () => expect(isValidPhone("12345")).toBe(false));
  it("rejects too long", () => expect(isValidPhone("1".repeat(16))).toBe(false));
});

describe("normalisePhone", () => {
  it("strips spaces and dashes", () => expect(normalisePhone("098706-00903")).toBe("09870600903"));
  it("keeps a leading +", () => expect(normalisePhone("+91 98706 00903")).toBe("+919870600903"));
});

describe("validateContact", () => {
  it("passes clean input", () => expect(validateContact({ email: "you@example.com", phone: "9876543210" })).toEqual({}));
  it("flags a bad email only", () => {
    const errors = validateContact({ email: "bad", phone: "9876543210" });
    expect(errors.email).toBeTruthy();
    expect(errors.phone).toBeUndefined();
  });
  it("ignores absent fields rather than flagging them", () => {
    expect(validateContact({})).toEqual({});
  });
});
