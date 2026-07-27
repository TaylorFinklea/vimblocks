import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRenderedBlocksQuery,
  findRenderedMatches,
  moveRenderedMatch,
  planRenderedSearch,
  resolveCharacterFind,
} from "../src/runtime/rendered-search.ts";

const buffer = {
  blocks: [
    { uuid: "jul24-a", content: "Alpha alpha" },
    { uuid: "jul24-b", content: "**alpha**" },
    { uuid: "jul23-a", content: "beta ALPHA alpha" },
  ],
};

test("finds every rendered match in display order with current case behavior", () => {
  assert.deepEqual(findRenderedMatches(buffer, "alpha"), [
    { blockUUID: "jul24-a", offset: 0, length: 5 },
    { blockUUID: "jul24-a", offset: 6, length: 5 },
    { blockUUID: "jul24-b", offset: 2, length: 5 },
    { blockUUID: "jul23-a", offset: 5, length: 5 },
    { blockUUID: "jul23-a", offset: 11, length: 5 },
  ]);
  assert.deepEqual(findRenderedMatches(buffer, "Alpha"), [
    { blockUUID: "jul24-a", offset: 0, length: 5 },
  ]);
  assert.deepEqual(findRenderedMatches(buffer, ""), []);
});

test("moves through counted matches and reports wrap", () => {
  const matches = findRenderedMatches(buffer, "alpha");
  assert.deepEqual(moveRenderedMatch(matches, 3, "next", 2), {
    index: 0,
    wrapped: true,
  });
  assert.deepEqual(moveRenderedMatch(matches, 1, "previous", 3), {
    index: 3,
    wrapped: true,
  });
  assert.deepEqual(moveRenderedMatch([], -1, "next", 1), {
    index: -1,
    wrapped: false,
  });
});

test("plans rendered search from one batch while preserving host order", async () => {
  let fetches = 0;
  const clock = [10, 47.5];
  const result = await planRenderedSearch(
    ["jul24-b", "jul24-a", "jul23-a", "jul24-b"],
    "alpha",
    async (uuids) => {
      fetches += 1;
      assert.deepEqual(uuids, ["jul24-b", "jul24-a", "jul23-a"]);
      return [
        ["jul23-a", "beta ALPHA alpha"],
        ["jul24-a", "Alpha alpha"],
        ["jul24-b", "**alpha**"],
      ];
    },
    () => clock.shift() ?? 47.5
  );

  assert.equal(fetches, 1);
  assert.equal(result.fetchAndMatchMs, 37.5);
  assert.deepEqual(result.buffer.blocks, [
    { uuid: "jul24-b", content: "**alpha**" },
    { uuid: "jul24-a", content: "Alpha alpha" },
    { uuid: "jul23-a", content: "beta ALPHA alpha" },
  ]);
  assert.deepEqual(result.matches, [
    { blockUUID: "jul24-b", offset: 2, length: 5 },
    { blockUUID: "jul24-a", offset: 0, length: 5 },
    { blockUUID: "jul24-a", offset: 6, length: 5 },
    { blockUUID: "jul23-a", offset: 5, length: 5 },
    { blockUUID: "jul23-a", offset: 11, length: 5 },
  ]);
});

test("queries DB titles with typed visible UUID literals", () => {
  const query = buildRenderedBlocksQuery([
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "not-a-uuid",
  ]);

  assert.match(query, /:block\/title/);
  assert.doesNotMatch(query, /:block\/content/);
  assert.doesNotMatch(query, /:in/);
  assert.match(query, /#uuid "11111111-1111-4111-8111-111111111111"/);
  assert.match(query, /#uuid "22222222-2222-4222-8222-222222222222"/);
  assert.doesNotMatch(query, /not-a-uuid/);
});

test("resolves counted f F t and T motions", () => {
  const content = "a-b-a-b";
  assert.equal(resolveCharacterFind(content, 0, "f", "b", 2), 6);
  assert.equal(resolveCharacterFind(content, 7, "F", "a", 2), 0);
  assert.equal(resolveCharacterFind(content, 0, "t", "b", 2), 5);
  assert.equal(resolveCharacterFind(content, 7, "T", "a", 2), 1);
});

test("returns null when a character find cannot satisfy its count", () => {
  assert.equal(resolveCharacterFind("alpha", 0, "f", "z", 1), null);
  assert.equal(resolveCharacterFind("alpha", 0, "F", "a", 1), null);
  assert.equal(resolveCharacterFind("alpha", 0, "f", "", 1), null);
});
