import assert from "node:assert/strict";
import test from "node:test";

import {
  createModeIndicator,
  resolveModeIndicator,
} from "../src/runtime/mode-indicator.ts";

test("reports only the Vim mode that currently owns keyboard input", () => {
  assert.equal(resolveModeIndicator({
    normalModeActive: false,
    insertSessionActive: false,
    visualMode: false,
    visualKind: null,
  }), null);
  assert.equal(resolveModeIndicator({
    normalModeActive: true,
    insertSessionActive: false,
    visualMode: false,
    visualKind: null,
  }), "normal");
  assert.equal(resolveModeIndicator({
    normalModeActive: false,
    insertSessionActive: true,
    visualMode: false,
    visualKind: null,
  }), "insert");
  assert.equal(resolveModeIndicator({
    normalModeActive: true,
    insertSessionActive: false,
    visualMode: true,
    visualKind: "characterwise",
  }), "visual");
  assert.equal(resolveModeIndicator({
    normalModeActive: true,
    insertSessionActive: false,
    visualMode: true,
    visualKind: "linewise",
  }), "visual-line");
  assert.equal(resolveModeIndicator({
    normalModeActive: false,
    insertSessionActive: false,
    visualMode: true,
    visualKind: "linewise",
  }), null);
});

test("renders one minimal status label and removes it when Vimblocks releases input", () => {
  const templates: Array<string | null> = [];
  const indicator = createModeIndicator({
    provideStyle() {},
    provideUI(options) {
      templates.push(options.template);
    },
  });

  indicator.setMode("normal");
  indicator.setMode("normal");
  indicator.setMode("visual-line");
  indicator.setMode(null);

  assert.equal(templates.length, 3);
  assert.match(templates[0] ?? "", /role="status"[^>]*>NORMAL</);
  assert.match(templates[1] ?? "", />V-LINE</);
  assert.equal(templates[2], null);
});
