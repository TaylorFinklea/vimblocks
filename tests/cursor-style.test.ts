import assert from "node:assert/strict";
import test from "node:test";

import {
  cursorHighlightStyle,
  highlightPseudoStyle,
  normalizeCursorColor,
} from "../src/runtime/cursor-style.ts";

test("accepts short and long hexadecimal cursor colors", () => {
  assert.equal(normalizeCursorColor("#0af"), "#0af");
  assert.equal(normalizeCursorColor("#1a2b3c"), "#1a2b3c");
  assert.equal(normalizeCursorColor("#1a2b3c80"), "#1a2b3c80");
});

test("uses the configured cursor color for custom highlights and fallback marks", () => {
  const style = highlightPseudoStyle("#123456");

  assert.match(style, /::highlight\(vimblocks-cursor\)/);
  assert.match(style, /::highlight\(vimblocks-visual\)/);
  assert.match(style, /vimblocks-cursor[\s\S]*#123456/);
  assert.match(style, /vimblocks-visual[\s\S]*#123456/);
});

test("falls back to the current yellow cursor for invalid CSS input", () => {
  assert.equal(normalizeCursorColor("red; display: none"), "#ffff00");
  assert.equal(normalizeCursorColor(undefined), "#ffff00");
});

test("builds a scoped cursor rule from the validated color", () => {
  const style = cursorHighlightStyle("#123456");

  assert.match(style, /mark\.vim-shortcuts-highlight/);
  assert.match(style, /background-color: #123456 !important/);
});
