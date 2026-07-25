import assert from "node:assert/strict";
import test from "node:test";

const loadCaptureModule = async () =>
  import("../src/runtime/db-task-capture.ts").catch(() => null);

test("parses the prototype phrase into DB-native task values", async () => {
  const capture = await loadCaptureModule();
  assert.ok(capture, "DB task capture module should exist");
  if (!capture) return;

  const now = new Date(2026, 6, 25, 14, 30);
  assert.deepEqual(
    capture.parseDbTaskCapture("do this thing tom at 8 p1", now),
    {
      ok: true,
      value: {
        title: "do this thing",
        status: "Todo",
        priority: "Urgent",
        scheduledAt: new Date(2026, 6, 26, 8, 0).getTime(),
      },
    }
  );
});

test("supports explicit meridiem and all compact priority levels", async () => {
  const capture = await loadCaptureModule();
  assert.ok(capture, "DB task capture module should exist");
  if (!capture) return;

  const now = new Date(2026, 6, 25, 9, 0);
  const expectations = [
    ["p1", "Urgent"],
    ["p2", "High"],
    ["p3", "Medium"],
    ["p4", "Low"],
  ] as const;

  for (const [token, priority] of expectations) {
    const result = capture.parseDbTaskCapture(
      `follow up tomorrow at 8:15pm ${token}`,
      now
    );
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.deepEqual(result.value, {
      title: "follow up",
      status: "Todo",
      priority,
      scheduledAt: new Date(2026, 6, 26, 20, 15).getTime(),
    });
  }
});

test("rejects metadata-only input instead of creating an empty task", async () => {
  const capture = await loadCaptureModule();
  assert.ok(capture, "DB task capture module should exist");
  if (!capture) return;

  assert.deepEqual(
    capture.parseDbTaskCapture("tom at 8 p1", new Date(2026, 6, 25)),
    {
      ok: false,
      error: "Enter a task title.",
    }
  );
});

test("writes plain block text and built-in Logseq DB properties", async () => {
  const capture = await loadCaptureModule();
  assert.ok(capture, "DB task capture module should exist");
  if (!capture) return;

  const calls: unknown[][] = [];
  const api = {
    Editor: {
      async insertBlock(
        anchorUUID: string,
        content: string,
        options: Record<string, unknown>
      ) {
        calls.push(["insert", anchorUUID, content, options]);
        return { uuid: "new-task" };
      },
      async upsertBlockProperty(
        blockUUID: string,
        property: string,
        value: string | number
      ) {
        calls.push(["property", blockUUID, property, value]);
      },
      async removeBlock(blockUUID: string) {
        calls.push(["remove", blockUUID]);
      },
    },
  };

  const created = await capture.createDbTaskAfterBlock(api, "anchor", {
    title: "do this thing",
    status: "Todo",
    priority: "Urgent",
    scheduledAt: new Date(2026, 6, 26, 8, 0).getTime(),
  });

  assert.equal(created.uuid, "new-task");
  assert.deepEqual(calls, [
    [
      "insert",
      "anchor",
      "do this thing",
      { sibling: true, before: false },
    ],
    [
      "property",
      "new-task",
      ":logseq.property/status",
      "Todo",
    ],
    [
      "property",
      "new-task",
      ":logseq.property/priority",
      "Urgent",
    ],
    [
      "property",
      "new-task",
      ":logseq.property/scheduled",
      new Date(2026, 6, 26, 8, 0).getTime(),
    ],
  ]);
  assert.doesNotMatch(String(calls[0][2]), /TODO|SCHEDULED|::/);
});

test("removes a newly inserted block when a DB property write fails", async () => {
  const capture = await loadCaptureModule();
  assert.ok(capture, "DB task capture module should exist");
  if (!capture) return;

  const calls: unknown[][] = [];
  const api = {
    Editor: {
      async insertBlock() {
        return { uuid: "partial-task" };
      },
      async upsertBlockProperty(
        _blockUUID: string,
        property: string
      ) {
        if (property === ":logseq.property/priority") {
          throw new Error("priority failed");
        }
      },
      async removeBlock(blockUUID: string) {
        calls.push(["remove", blockUUID]);
      },
    },
  };

  await assert.rejects(
    capture.createDbTaskAfterBlock(api, "anchor", {
      title: "rollback me",
      status: "Todo",
      priority: "High",
    }),
    /priority failed/
  );
  assert.deepEqual(calls, [["remove", "partial-task"]]);
});

test("prefers the Vim-owned cursor block as the capture anchor", async () => {
  const capture = await loadCaptureModule();
  assert.ok(capture, "DB task capture module should exist");
  if (!capture) return;

  assert.equal(
    capture.resolveCaptureAnchorUUID(
      "logseq-selected",
      true,
      "vim-owned"
    ),
    "vim-owned"
  );
  assert.equal(
    capture.resolveCaptureAnchorUUID(
      "logseq-selected",
      false,
      "stale-vim-owned"
    ),
    "logseq-selected"
  );
});
