import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPositionMap,
  normalizeRawOffset,
  resolveMotion,
  toRenderedOffset,
  type MotionContext,
  type RenderedBuffer,
} from "../src/runtime/rendered-buffer.ts";

const buffer = (...contents: string[]): RenderedBuffer => ({
  blocks: contents.map((content, index) => ({
    uuid: `b${index + 1}`,
    content,
  })),
});
const context = (
  profile: MotionContext["profile"] = "logseq-first",
  preferredColumn: number | null = null,
  viewportBlockUUIDs: readonly string[] = []
): MotionContext => ({ profile, preferredColumn, viewportBlockUUIDs });

test("maps raw DB content offsets onto rendered Markdown text", () => {
  const content = "**bold** and [[Page]] #tag `code`";
  const map = buildPositionMap(content);

  assert.equal(map[0], -1);
  assert.equal(map[2], 0);
  assert.equal(map[9], 5);
  assert.equal(map[15], 9);
  assert.equal(toRenderedOffset("**bold**", 2), 0);
  assert.equal(normalizeRawOffset("**bold**", 0), 2);
  assert.equal(toRenderedOffset("id:: 123\nvalue", 0), 0);
});

test("resolves counted word and line motions using raw offsets", () => {
  const rendered = buffer("alpha beta gamma");

  assert.deepEqual(
    resolveMotion(
      rendered,
      { blockUUID: "b1", offset: 0 },
      "w",
      2,
      context()
    ).point,
    { blockUUID: "b1", offset: 11 }
  );
  assert.equal(
    resolveMotion(
      buffer("  alpha"),
      { blockUUID: "b1", offset: 5 },
      "^",
      1,
      context()
    ).point.offset,
    2
  );
  assert.equal(
    resolveMotion(
      buffer("**bold** and [[Page]]"),
      { blockUUID: "b1", offset: 2 },
      "w",
      1,
      context()
    ).point.offset,
    9
  );
  assert.equal(
    resolveMotion(
      buffer("**bold** and [[Page]]"),
      { blockUUID: "b1", offset: 9 },
      "w",
      1,
      context()
    ).point.offset,
    15
  );
});

test("crosses character and word boundaries only in Vim-first profile", () => {
  const rendered = buffer("one", "two");
  const point = { blockUUID: "b1", offset: 2 };

  assert.equal(
    resolveMotion(rendered, point, "w", 1, context("vim-first")).point
      .blockUUID,
    "b2"
  );
  assert.equal(
    resolveMotion(rendered, point, "w", 1, context("logseq-first")).point
      .blockUUID,
    "b1"
  );
  assert.deepEqual(
    resolveMotion(rendered, point, "l", 1, context("vim-first")).point,
    { blockUUID: "b2", offset: 0 }
  );
});

test("preserves a preferred rendered column across short vertical rows", () => {
  const rendered = buffer("long value", "x", "another row");
  const first = resolveMotion(
    rendered,
    { blockUUID: "b1", offset: 7 },
    "j",
    1,
    context("logseq-first", null)
  );
  assert.equal(first.point.offset, 0);
  assert.equal(first.preferredColumn, 7);

  const second = resolveMotion(
    rendered,
    first.point,
    "j",
    1,
    context("logseq-first", first.preferredColumn)
  );
  assert.equal(second.point.offset, 7);
  assert.equal(second.preferredColumn, 7);
});

test("uses rendered rows for gg, G, and viewport-relative half pages", () => {
  const rendered = buffer("one", "two", "three", "four", "five");
  const point = { blockUUID: "b3", offset: 1 };
  const viewport = ["b2", "b3", "b4", "b4"];

  assert.equal(
    resolveMotion(rendered, point, "gg", 2, context()).point.blockUUID,
    "b2"
  );
  assert.equal(
    resolveMotion(rendered, point, "G", 1, context()).point.blockUUID,
    "b5"
  );
  assert.equal(
    resolveMotion(
      rendered,
      point,
      "ctrl+d",
      2,
      context("logseq-first", null, viewport)
    ).point.blockUUID,
    "b5"
  );
  assert.equal(
    resolveMotion(
      rendered,
      point,
      "ctrl+u",
      1,
      context("logseq-first", null, viewport)
    ).point.blockUUID,
    "b2"
  );
});
