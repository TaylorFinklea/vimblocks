import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTextOperator,
  aroundWordRange,
  deferTrailingWhitespace,
  firstNonBlankPosition,
  innerWordRange,
  lineEndRange,
  lineRange,
  wordEndRange,
  wordForwardRange,
} from "../src/runtime/text-objects.ts";

test("inner word selects words and punctuation as separate Vim tokens", () => {
  assert.deepEqual(innerWordRange("alpha, beta", 2), { start: 0, end: 5 });
  assert.deepEqual(innerWordRange("alpha, beta", 5), { start: 5, end: 6 });
  assert.deepEqual(innerWordRange("alpha, beta", 7), { start: 7, end: 11 });
});

test("inner word resolves whitespace to the following token and line-end whitespace backward", () => {
  assert.deepEqual(innerWordRange("alpha   beta", 6), { start: 8, end: 12 });
  assert.deepEqual(innerWordRange("alpha   ", 7), { start: 0, end: 5 });
  assert.deepEqual(innerWordRange("", 0), { start: 0, end: 0 });
});

test("around word prefers following whitespace and falls back to preceding whitespace", () => {
  assert.deepEqual(aroundWordRange("alpha   beta", 2), {
    start: 0,
    end: 8,
  });
  assert.deepEqual(aroundWordRange("alpha   beta", 9), {
    start: 5,
    end: 12,
  });
});

test("word motions produce operator ranges with Vim-style whitespace behavior", () => {
  assert.deepEqual(wordForwardRange("alpha   beta", 1), {
    start: 1,
    end: 8,
  });
  assert.deepEqual(wordForwardRange("alpha   beta", 5), {
    start: 5,
    end: 8,
  });
  assert.deepEqual(wordEndRange("alpha   beta", 1), {
    start: 1,
    end: 5,
  });
  assert.deepEqual(wordEndRange("alpha   beta", 5), {
    start: 5,
    end: 12,
  });
});

test("line objects and first nonblank position stay within content bounds", () => {
  assert.deepEqual(lineEndRange("  alpha", 3), { start: 3, end: 7 });
  assert.deepEqual(lineRange("  alpha"), { start: 0, end: 7 });
  assert.equal(firstNonBlankPosition("  alpha"), 2);
  assert.equal(firstNonBlankPosition("   "), 0);
});

test("change, delete, and yank expose the selected text and correct cursor outcome", () => {
  const range = innerWordRange("alpha beta", 7);
  assert.deepEqual(applyTextOperator("alpha beta", range, "change"), {
    content: "alpha ",
    selected: "beta",
    cursor: 5,
    entersInsertMode: true,
  });
  assert.deepEqual(applyTextOperator("alpha beta", range, "delete"), {
    content: "alpha ",
    selected: "beta",
    cursor: 5,
    entersInsertMode: false,
  });
  assert.deepEqual(applyTextOperator("alpha beta", range, "yank"), {
    content: "alpha beta",
    selected: "beta",
    cursor: 6,
    entersInsertMode: false,
  });
});

test("end-of-block changes defer separator whitespace for the live editor", () => {
  assert.deepEqual(deferTrailingWhitespace("alpha "), {
    persistedContent: "alpha",
    deferredWhitespace: " ",
  });
  assert.deepEqual(deferTrailingWhitespace("alpha beta"), {
    persistedContent: "alpha beta",
    deferredWhitespace: "",
  });
});
