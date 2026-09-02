// Mechanical proof that every field declared on AdPage / LiveSettings /
// LiveSession / LiveBlock is actually assigned by the hand-written map
// that builds it from raw settings-table JSON.
//
// This exists because taxMode was declared on AdPage, written by the admin
// panel, and read by adTaxModeFor() — and getAdPages()'s map, which builds
// a NEW object rather than spreading ...p, silently dropped it on every
// read. The type checker cannot catch this: TypeScript does not complain
// when an object literal omits an optional field, and every field here is
// optional except a handful of required ones the map already has to fill
// in for other reasons. A human re-reading the map missed it once already.
//
// So this reads the actual source with the TypeScript compiler — not a
// regex, which the nested `.faq` map inside AdPage's own object literal
// would trip up — and asserts, mechanically, that the field sets agree.
// Add a field to one of these interfaces without adding it to the
// corresponding map, and this test fails with the exact field name.
import { describe, expect, it } from "vitest";
import * as ts from "typescript";
import fs from "fs";
import path from "path";

const SETTINGS_TYPES_PATH = path.resolve(__dirname, "../settings-types.ts");
const SITE_SETTINGS_PATH = path.resolve(__dirname, "../site-settings.ts");

function parseFile(filePath: string): ts.SourceFile {
  return ts.createSourceFile(filePath, fs.readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true);
}

/** Names of every property signature declared directly on one interface. */
function interfaceFields(source: ts.SourceFile, interfaceName: string): string[] {
  const fields: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) fields.push(member.name.getText(source));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (fields.length === 0) throw new Error(`Interface "${interfaceName}" not found, or has no fields`);
  return fields;
}

function objectKeys(source: ts.SourceFile, obj: ts.ObjectLiteralExpression): string[] {
  return obj.properties
    .map((p) => (p.name ? p.name.getText(source) : null))
    .filter((x): x is string => x !== null);
}

/**
 * Property names in the object literal built by `.map(cb)` where `cb`
 * returns an object literal (concise-body arrow, e.g. `.map(p => ({...}))`).
 * Scoped to the initializer of one named `const` inside one named
 * function, so a nested `.map()` elsewhere in the same object literal
 * (AdPage's own `faq` field maps its entries) can't be mistaken for the
 * outer one.
 */
function mapObjectKeys(source: ts.SourceFile, fnName: string, varName: string): string[] {
  function findMapObject(node: ts.Node): ts.ObjectLiteralExpression | null {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "map"
    ) {
      const cb = node.arguments[0];
      if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb))) {
        const body = cb.body;
        if (ts.isParenthesizedExpression(body) && ts.isObjectLiteralExpression(body.expression)) return body.expression;
        if (ts.isObjectLiteralExpression(body)) return body;
      }
    }
    for (const child of node.getChildren(source)) {
      const found = findMapObject(child);
      if (found) return found;
    }
    return null;
  }

  let result: string[] | null = null;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === fnName && node.body) {
      for (const stmt of node.body.statements) {
        if (!ts.isVariableStatement(stmt)) continue;
        const decl = stmt.declarationList.declarations.find((d) => d.name.getText(source) === varName);
        if (decl?.initializer) {
          const obj = findMapObject(decl.initializer);
          if (obj) result = objectKeys(source, obj);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!result) throw new Error(`No .map() object literal for "${varName}" found inside function "${fnName}"`);
  return result;
}

/**
 * Property names in the object literal of a top-level `return {...}`
 * inside a named function — i.e. only a return statement that is a direct
 * statement of that function's own body, never one nested inside a
 * `.map()` callback (which is a different, nested function).
 */
function returnObjectKeys(source: ts.SourceFile, fnName: string): string[] {
  let result: string[] | null = null;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === fnName && node.body) {
      for (const stmt of node.body.statements) {
        if (ts.isReturnStatement(stmt) && stmt.expression && ts.isObjectLiteralExpression(stmt.expression)) {
          result = objectKeys(source, stmt.expression);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!result) throw new Error(`No top-level return object literal found inside function "${fnName}"`);
  return result;
}

function assertAllMapped(declared: string[], mapped: string[], label: string) {
  const missing = declared.filter((f) => !mapped.includes(f));
  expect(missing, `${label}: field(s) declared but never assigned — ${missing.join(", ") || "(none missing)"}`).toEqual([]);
}

describe("AdPage field coverage (the exact bug that dropped taxMode)", () => {
  const types = parseFile(SETTINGS_TYPES_PATH);
  const impl = parseFile(SITE_SETTINGS_PATH);

  it("getAdPages() assigns every field AdPage declares", () => {
    const declared = interfaceFields(types, "AdPage");
    const mapped = mapObjectKeys(impl, "getAdPages", "pages");
    // A sanity floor, not a magic number: catches this test silently
    // matching the wrong (empty, or nested) object literal.
    expect(declared.length).toBeGreaterThan(20);
    assertAllMapped(declared, mapped, "AdPage");
  });
});

describe("Live settings field coverage (same hand-written-map shape)", () => {
  const types = parseFile(SETTINGS_TYPES_PATH);
  const impl = parseFile(SITE_SETTINGS_PATH);

  it("getLiveSettings() assigns every field LiveSettings itself declares", () => {
    const declared = interfaceFields(types, "LiveSettings");
    const mapped = returnObjectKeys(impl, "getLiveSettings");
    assertAllMapped(declared, mapped, "LiveSettings");
  });

  it("getLiveSettings()'s session map assigns every field LiveSession declares", () => {
    const declared = interfaceFields(types, "LiveSession");
    const mapped = mapObjectKeys(impl, "getLiveSettings", "sessions");
    expect(declared.length).toBeGreaterThan(5);
    assertAllMapped(declared, mapped, "LiveSession");
  });

  it("normaliseBlock() assigns every field LiveBlock declares", () => {
    const declared = interfaceFields(types, "LiveBlock");
    const mapped = returnObjectKeys(impl, "normaliseBlock");
    expect(declared.length).toBeGreaterThan(5);
    assertAllMapped(declared, mapped, "LiveBlock");
  });
});

describe("the tool itself catches a dropped field", () => {
  // Proves the extraction mechanism on a controlled example, not just on
  // files that currently happen to be correct: a synthetic interface with
  // a field the map "forgot", parsed from an in-memory string exactly the
  // way the real files above are parsed from disk.
  const synthetic = ts.createSourceFile(
    "synthetic.ts",
    `
    interface Widget {
      id: string;
      title: string;
      forgotten?: string;
    }
    export function getWidgets() {
      const widgets = raw.map((w: any) => ({
        id: w.id,
        title: w.title,
      }));
      return { widgets };
    }
    `,
    ts.ScriptTarget.Latest,
    true
  );

  it("reports exactly the field a map omits", () => {
    const declared = interfaceFields(synthetic, "Widget");
    const mapped = mapObjectKeys(synthetic, "getWidgets", "widgets");
    expect(declared).toEqual(["id", "title", "forgotten"]);
    expect(mapped).toEqual(["id", "title"]);
    expect(declared.filter((f) => !mapped.includes(f))).toEqual(["forgotten"]);
  });

  it("passes clean when the map genuinely has every field", () => {
    const complete = ts.createSourceFile(
      "synthetic-ok.ts",
      `
      interface Widget { id: string; title: string; }
      export function getWidgets() {
        const widgets = raw.map((w: any) => ({ id: w.id, title: w.title }));
        return { widgets };
      }
      `,
      ts.ScriptTarget.Latest,
      true
    );
    const declared = interfaceFields(complete, "Widget");
    const mapped = mapObjectKeys(complete, "getWidgets", "widgets");
    assertAllMapped(declared, mapped, "Widget");
  });
});
