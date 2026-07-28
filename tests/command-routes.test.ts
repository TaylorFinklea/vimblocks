import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

import { NORMAL_MODE_CAPTURE_TOKENS } from "../src/runtime/modal-command.ts";

const literalValue = (node: ts.Expression): string[] => {
  if (ts.isStringLiteral(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.flatMap((item) =>
      literalValue(item as ts.Expression)
    );
  }
  throw new Error(`Unsupported binding literal: ${node.getText()}`);
};
const propertyName = (node: ts.PropertyName): string =>
  ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : node.getText();

const defaultBindings = (): Map<string, string[]> => {
  const source = readFileSync(
    new URL("../src/common/funcs.ts", import.meta.url),
    "utf8"
  );
  const ast = ts.createSourceFile("funcs.ts", source, ts.ScriptTarget.Latest);
  const defaults = new Map<string, string[]>();
  const visit = (node: ts.Node): void => {
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
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return defaults;
};

// Setting keys whose module still hands Logseq a `keybinding`, i.e. commands
// that are still reachable through Logseq's own shortcut system.
const paletteBoundSettings = (): Set<string> => {
  const bound = new Set<string>();
  const directory = new URL("../src/keybindings/", import.meta.url);
  for (const entry of readdirSync(directory)) {
    if (!entry.endsWith(".ts")) continue;
    const source = readFileSync(new URL(entry, directory), "utf8");
    if (!/\bkeybinding\s*:/.test(source)) continue;
    const ast = ts.createSourceFile(
      entry,
      source,
      ts.ScriptTarget.Latest,
      true
    );

    const referenced = new Set<string>();
    const collect = (node: ts.Node): void => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "keyBindings"
      ) {
        referenced.add(node.name.text);
      }
      ts.forEachChild(node, collect);
    };
    collect(ast);

    // Resolve `<variable>.forEach(... keybinding ...)` back to the setting the
    // variable was built from. Modules register several commands and may strip
    // the keybinding from only some of them, so each one must be attributed
    // individually rather than to the whole file.
    const settingFromDeclaration = (
      name: string,
      from: ts.Node
    ): string | null => {
      for (
        let current: ts.Node | undefined = from;
        current;
        current = current.parent
      ) {
        if (!ts.isBlock(current) && !ts.isSourceFile(current)) continue;
        for (const statement of current.statements) {
          if (!ts.isVariableStatement(statement)) continue;
          for (const declaration of statement.declarationList.declarations) {
            if (
              !ts.isIdentifier(declaration.name) ||
              declaration.name.text !== name ||
              !declaration.initializer
            ) {
              continue;
            }
            let found: string | null = null;
            const scan = (node: ts.Node): void => {
              if (
                !found &&
                ts.isPropertyAccessExpression(node) &&
                ts.isPropertyAccessExpression(node.expression) &&
                node.expression.name.text === "keyBindings"
              ) {
                found = node.name.text;
              }
              ts.forEachChild(node, scan);
            };
            scan(declaration.initializer);
            if (found) return found;
          }
        }
      }
      return null;
    };

    const settingFor = (node: ts.Node): string | null => {
      for (
        let current: ts.Node | undefined = node;
        current;
        current = current.parent
      ) {
        if (
          ts.isCallExpression(current) &&
          ts.isPropertyAccessExpression(current.expression) &&
          current.expression.name.text === "forEach" &&
          ts.isIdentifier(current.expression.expression)
        ) {
          return settingFromDeclaration(
            current.expression.expression.text,
            current
          );
        }
      }
      return null;
    };

    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAssignment(node) &&
        propertyName(node.name) === "keybinding"
      ) {
        const setting = settingFor(node);
        if (setting) bound.add(setting);
        // Modules that register a single command without the forEach idiom.
        else if (referenced.size === 1) bound.add([...referenced][0]);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return bound;
};

test("every default binding has exactly one dispatch route", () => {
  // Two generations of key routing coexist: Logseq palette keybindings and the
  // host-capture modal engine. A binding served by both can execute twice; a
  // binding served by neither silently stops working. The parity wave stripped
  // palette keybindings module by module, so both mistakes are easy to make.
  const captured = new Set(NORMAL_MODE_CAPTURE_TOKENS);
  const paletteBound = paletteBoundSettings();

  const both: string[] = [];
  const neither: string[] = [];
  for (const [name, bindings] of defaultBindings()) {
    const firstTokens = bindings.map((binding) => binding.split(" ")[0]);
    const hostRoute = firstTokens.some((token) => captured.has(token));
    const paletteRoute = paletteBound.has(name);
    if (hostRoute && paletteRoute) both.push(`${name} (${bindings.join(", ")})`);
    if (!hostRoute && !paletteRoute) {
      neither.push(`${name} (${bindings.join(", ")})`);
    }
  }

  assert.deepEqual(both, [], "bindings reachable through both routes");
  assert.deepEqual(neither, [], "bindings reachable through neither route");
});
