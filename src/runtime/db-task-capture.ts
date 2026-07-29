export const DB_TASK_STATUS_PROPERTY = ":logseq.property/status";
export const DB_TASK_PRIORITY_PROPERTY = ":logseq.property/priority";
export const DB_TASK_SCHEDULED_PROPERTY = ":logseq.property/scheduled";
export const DB_TASK_DEADLINE_PROPERTY = ":logseq.property/deadline";

export type DbTaskPriority = "Urgent" | "High" | "Medium" | "Low";

export interface DbTaskCapture {
  title: string;
  status: "Todo";
  priority?: DbTaskPriority;
  scheduledAt?: number;
  deadlineAt?: number;
}

export type DbTaskCaptureResult =
  | { ok: true; value: DbTaskCapture }
  | { ok: false; error: string };

export type DbTaskCaptureSegmentKind =
  | "plain"
  | "date"
  | "deadline"
  | "time"
  | "priority";

export interface DbTaskCaptureSegment {
  text: string;
  kind: DbTaskCaptureSegmentKind;
}

const PRIORITY_BY_TOKEN: Record<string, DbTaskPriority> = {
  p1: "Urgent",
  p2: "High",
  p3: "Medium",
  p4: "Low",
};

const DATE_PATTERN = /\b(today|tod|tomorrow|tom)\b/i;
const DEADLINE_PATTERN = /\bdue\s+(today|tod|tomorrow|tom)\b/i;
const TIME_PATTERN = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
const PRIORITY_PATTERN = /(?:^|\s)(p[1-4])(?=\s|$)/i;

const matchCaptureTokens = (input: string) => {
  const priorityMatch = input.match(PRIORITY_PATTERN);
  const deadlineMatch = input.match(DEADLINE_PATTERN);
  const dateMatch = deadlineMatch ? null : input.match(DATE_PATTERN);
  const timeMatch = input.match(TIME_PATTERN);
  return {
    priorityMatch,
    deadlineMatch,
    dateMatch,
    timeMatch,
    temporalMatch: deadlineMatch || dateMatch,
  };
};

export const segmentDbTaskCaptureInput = (
  input: string
): DbTaskCaptureSegment[] => {
  const {
    priorityMatch,
    deadlineMatch,
    dateMatch,
    timeMatch,
    temporalMatch,
  } = matchCaptureTokens(input);
  const ranges: Array<{
    start: number;
    end: number;
    kind: Exclude<DbTaskCaptureSegmentKind, "plain">;
  }> = [];

  if (deadlineMatch?.index !== undefined) {
    const dateOffset = deadlineMatch[0]
      .toLowerCase()
      .lastIndexOf(deadlineMatch[1].toLowerCase());
    ranges.push({
      start: deadlineMatch.index,
      end: deadlineMatch.index + 3,
      kind: "deadline",
    });
    ranges.push({
      start: deadlineMatch.index + dateOffset,
      end: deadlineMatch.index + dateOffset + deadlineMatch[1].length,
      kind: "date",
    });
  } else if (dateMatch?.index !== undefined) {
    ranges.push({
      start: dateMatch.index,
      end: dateMatch.index + dateMatch[0].length,
      kind: "date",
    });
  }

  if (temporalMatch && timeMatch?.index !== undefined) {
    ranges.push({
      start: timeMatch.index,
      end: timeMatch.index + timeMatch[0].trimEnd().length,
      kind: "time",
    });
  }

  if (priorityMatch?.index !== undefined) {
    const priorityOffset = priorityMatch[0]
      .toLowerCase()
      .lastIndexOf(priorityMatch[1].toLowerCase());
    ranges.push({
      start: priorityMatch.index + priorityOffset,
      end: priorityMatch.index + priorityOffset + priorityMatch[1].length,
      kind: "priority",
    });
  }

  ranges.sort((left, right) => left.start - right.start);
  const segments: DbTaskCaptureSegment[] = [];
  let offset = 0;
  for (const range of ranges) {
    if (range.start > offset) {
      segments.push({ text: input.slice(offset, range.start), kind: "plain" });
    }
    segments.push({
      text: input.slice(range.start, range.end),
      kind: range.kind,
    });
    offset = range.end;
  }
  if (offset < input.length || segments.length === 0) {
    segments.push({ text: input.slice(offset), kind: "plain" });
  }
  return segments;
};

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
  const {
    priorityMatch,
    deadlineMatch,
    dateMatch,
    timeMatch,
    temporalMatch,
  } = matchCaptureTokens(title);
  const priority = priorityMatch
    ? PRIORITY_BY_TOKEN[priorityMatch[1].toLowerCase()]
    : undefined;
  let scheduledAt: number | undefined;
  let deadlineAt: number | undefined;

  if (temporalMatch) {
    let hour = 0;
    let minute = 0;
    if (timeMatch) {
      const rawHour = Number(timeMatch[1]);
      minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
      const resolvedHour = resolveHour(rawHour, timeMatch[3]);
      if (resolvedHour === undefined || minute < 0 || minute > 59) {
        return { ok: false, error: "Use a valid capture time." };
      }
      hour = resolvedHour;
    }

    const temporalValue = new Date(now);
    const dateToken = temporalMatch[1].toLowerCase();
    if (dateToken === "tom" || dateToken === "tomorrow") {
      temporalValue.setDate(temporalValue.getDate() + 1);
    }
    temporalValue.setHours(hour, minute, 0, 0);
    if (deadlineMatch) {
      deadlineAt = temporalValue.getTime();
    } else {
      scheduledAt = temporalValue.getTime();
    }
    title = title.replace(temporalMatch[0], " ");
    if (timeMatch) {
      title = title.replace(timeMatch[0], " ");
    }
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
      ...(deadlineAt !== undefined ? { deadlineAt } : {}),
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
    if (capture.deadlineAt !== undefined) {
      await api.Editor.upsertBlockProperty(
        block.uuid,
        DB_TASK_DEADLINE_PROPERTY,
        capture.deadlineAt
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
