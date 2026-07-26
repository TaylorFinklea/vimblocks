import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const literalValue = (node: ts.Expression): unknown => {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((item) => literalValue(item as ts.Expression));
  }
  throw new Error(`Unsupported binding literal: ${node.getText()}`);
};
const propertyName = (node: ts.PropertyName): string =>
  ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : node.getText();

test("binding metadata stays in parity with defaults", () => {
  const funcs = readFileSync(
    new URL("../src/common/funcs.ts", import.meta.url),
    "utf8"
  );
  const type = readFileSync(
    new URL("../src/common/type.ts", import.meta.url),
    "utf8"
  );
  const funcsAst = ts.createSourceFile("funcs.ts", funcs, ts.ScriptTarget.Latest);
  const defaults = new Map<string, unknown>();
  const visitDefaults = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      propertyName(node.name) === "keyBindings" &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const item of node.initializer.properties) {
        if (ts.isPropertyAssignment(item)) {
          defaults.set(propertyName(item.name), literalValue(item.initializer));
        }
      }
    }
    ts.forEachChild(node, visitDefaults);
  };
  visitDefaults(funcsAst);

  const typeAst = ts.createSourceFile("type.ts", type, ts.ScriptTarget.Latest);
  const metadata = new Map<string, unknown>();
  const visitMetadata = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const properties = new Map<string, ts.Expression>();
      for (const item of node.properties) {
        if (ts.isPropertyAssignment(item)) {
          properties.set(propertyName(item.name), item.initializer);
        }
      }
      const key = properties.get("key");
      const binding = properties.get("defaultBinding");
      if (key && binding && ts.isStringLiteral(key)) {
        metadata.set(key.text, literalValue(binding));
      }
    }
    ts.forEachChild(node, visitMetadata);
  }
  visitMetadata(typeAst);
  assert.deepEqual(
    [...metadata.keys()].sort(),
    [...defaults.keys()].sort()
  );
  for (const [key, value] of metadata) {
    assert.deepEqual(value, defaults.get(key), key);
  }
});
