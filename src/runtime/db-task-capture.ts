export const DB_TASK_STATUS_PROPERTY = ":logseq.property/status";
export const DB_TASK_PRIORITY_PROPERTY = ":logseq.property/priority";
export const DB_TASK_SCHEDULED_PROPERTY = ":logseq.property/scheduled";

export type DbTaskPriority = "Urgent" | "High" | "Medium" | "Low";

export interface DbTaskCapture {
  title: string;
  status: "Todo";
  priority?: DbTaskPriority;
  scheduledAt?: number;
}

export type DbTaskCaptureResult =
  | { ok: true; value: DbTaskCapture }
  | { ok: false; error: string };

const PRIORITY_BY_TOKEN: Record<string, DbTaskPriority> = {
  p1: "Urgent",
  p2: "High",
  p3: "Medium",
  p4: "Low",
};

const DATE_PATTERN = /\b(today|tod|tomorrow|tom)\b/i;
const TIME_PATTERN = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
const PRIORITY_PATTERN = /(?:^|\s)(p[1-4])(?=\s|$)/i;

const normalizeTitle = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const resolveHour = (
  rawHour: number,
  meridiem: string | undefined
): number | undefined => {
  if (!meridiem) {
    return rawHour >= 0 && rawHour <= 23 ? rawHour : undefined;
  }
  if (rawHour < 1 || rawHour > 12) {
    return undefined;
  }
  if (meridiem.toLowerCase() === "am") {
    return rawHour === 12 ? 0 : rawHour;
  }
  return rawHour === 12 ? 12 : rawHour + 12;
};

export const parseDbTaskCapture = (
  input: string,
  now: Date = new Date()
): DbTaskCaptureResult => {
  let title = normalizeTitle(input);
  const priorityMatch = title.match(PRIORITY_PATTERN);
  const dateMatch = title.match(DATE_PATTERN);
  const timeMatch = title.match(TIME_PATTERN);
  const priority = priorityMatch
    ? PRIORITY_BY_TOKEN[priorityMatch[1].toLowerCase()]
    : undefined;
  let scheduledAt: number | undefined;

  if (dateMatch && timeMatch) {
    const rawHour = Number(timeMatch[1]);
    const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    const hour = resolveHour(rawHour, timeMatch[3]);
    if (hour === undefined || minute < 0 || minute > 59) {
      return { ok: false, error: "Use a valid capture time." };
    }

    const scheduled = new Date(now);
    const dateToken = dateMatch[1].toLowerCase();
    if (dateToken === "tom" || dateToken === "tomorrow") {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    scheduled.setHours(hour, minute, 0, 0);
    scheduledAt = scheduled.getTime();
    title = title.replace(dateMatch[0], " ").replace(timeMatch[0], " ");
  }

  if (priorityMatch) {
    title = title.replace(priorityMatch[0], " ");
  }
  title = normalizeTitle(title);
  if (!title) {
    return { ok: false, error: "Enter a task title." };
  }

  return {
    ok: true,
    value: {
      title,
      status: "Todo",
      ...(priority ? { priority } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt } : {}),
    },
  };
};

interface DbTaskCaptureEditor {
  insertBlock(
    anchorUUID: string,
    content: string,
    options: { sibling: true; before: false }
  ): Promise<{ uuid: string } | null>;
  upsertBlockProperty(
    blockUUID: string,
    property: string,
    value: string | number
  ): Promise<unknown>;
  removeBlock(blockUUID: string): Promise<unknown>;
}

export interface DbTaskCaptureApi {
  Editor: DbTaskCaptureEditor;
}

export const createDbTaskAfterBlock = async (
  api: DbTaskCaptureApi,
  anchorUUID: string,
  capture: DbTaskCapture
): Promise<{ uuid: string }> => {
  const block = await api.Editor.insertBlock(anchorUUID, capture.title, {
    sibling: true,
    before: false,
  });
  if (!block?.uuid) {
    throw new Error("Logseq did not create the task block.");
  }

  try {
    await api.Editor.upsertBlockProperty(
      block.uuid,
      DB_TASK_STATUS_PROPERTY,
      capture.status
    );
    if (capture.priority) {
      await api.Editor.upsertBlockProperty(
        block.uuid,
        DB_TASK_PRIORITY_PROPERTY,
        capture.priority
      );
    }
    if (capture.scheduledAt !== undefined) {
      await api.Editor.upsertBlockProperty(
        block.uuid,
        DB_TASK_SCHEDULED_PROPERTY,
        capture.scheduledAt
      );
    }
  } catch (error) {
    try {
      await api.Editor.removeBlock(block.uuid);
    } catch {
      // Preserve the property-write failure for the caller.
    }
    throw error;
  }

  return block;
};

export const resolveCaptureAnchorUUID = (
  selectedBlockUUID: string | undefined,
  cursorMode: boolean,
  cursorBlockUUID: string | undefined
): string | undefined =>
  cursorMode && cursorBlockUUID ? cursorBlockUUID : selectedBlockUUID;
