<script lang="ts" setup>
import {
  computed,
  nextTick,
  ref,
  watch,
} from "vue";

import { hideMainUI } from "@/common/funcs";
import {
  createDbTaskAfterBlock,
  focusDbTaskCaptureInput,
  segmentDbTaskCaptureInput,
} from "@/runtime/db-task-capture";
import { useDbTaskCaptureStore } from "@/stores/db-task-capture";

const captureStore = useDbTaskCaptureStore();
const inputScrollLeft = ref(0);
const inputSegments = computed(() =>
  segmentDbTaskCaptureInput(captureStore.input)
);

const scheduledLabel = computed(() => {
  const preview = captureStore.preview;
  if (!preview.ok || preview.value.scheduledAt === undefined) {
    return "Not set";
  }
  return new Date(preview.value.scheduledAt).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
});

const deadlineLabel = computed(() => {
  const preview = captureStore.preview;
  if (!preview.ok || preview.value.deadlineAt === undefined) {
    return "Not set";
  }
  return new Date(preview.value.deadlineAt).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
});

const focusInput = async () => {
  if (!captureStore.visible) return;
  await nextTick();
  requestAnimationFrame(() => {
    if (!captureStore.visible) return;
    focusDbTaskCaptureInput(document, window);
  });
};

watch(() => captureStore.visible, focusInput);
watch(() => captureStore.focusRequest, focusInput);

const syncInputScroll = (event: Event) => {
  const input = event.currentTarget as HTMLInputElement;
  requestAnimationFrame(() => {
    inputScrollLeft.value = input.scrollLeft;
  });
};

const close = () => {
  captureStore.hide();
  hideMainUI();
};

const createTask = async () => {
  if (captureStore.busy) return;
  const preview = captureStore.preview;
  if (!preview.ok) {
    captureStore.error = preview.error;
    return;
  }
  if (!captureStore.anchorBlockUUID) {
    captureStore.error = "The destination block is no longer available.";
    return;
  }

  captureStore.busy = true;
  captureStore.error = "";
  try {
    const block = await createDbTaskAfterBlock(
      logseq,
      captureStore.anchorBlockUUID,
      preview.value
    );
    captureStore.hide();
    hideMainUI();
    await logseq.Editor.editBlock(block.uuid, { pos: 0 });
    await logseq.Editor.exitEditingMode(true);
    logseq.UI.showMsg("DB task captured.", "success");
  } catch (error) {
    captureStore.error =
      error instanceof Error ? error.message : "Could not create the DB task.";
    captureStore.busy = false;
  }
};
</script>

<template>
  <div
    v-show="captureStore.visible"
    class="db-task-capture fixed inset-x-0 bottom-6 z-50 mx-auto w-[min(680px,calc(100%-2rem))]"
  >
    <div class="db-task-capture__panel">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <div class="db-task-capture__title">Capture Logseq DB task</div>
          <div class="db-task-capture__subtitle">
            Plain title + DB Status, Priority, Scheduled, and Deadline properties
          </div>
        </div>
        <el-button title="Cancel (Esc)" @click="close">Esc</el-button>
      </div>

      <div class="db-task-capture__input-shell">
        <div
          v-if="captureStore.input"
          aria-hidden="true"
          class="db-task-capture__input-highlight"
          :style="{ transform: `translateX(-${inputScrollLeft}px)` }"
        >
          <span
            v-for="(segment, index) in inputSegments"
            :key="index"
            :class="[
              'db-task-capture__input-segment',
              `db-task-capture__input-segment--${segment.kind}`,
            ]"
          >{{ segment.text }}</span>
        </div>
        <input
          v-model="captureStore.input"
          aria-label="DB task capture"
          autocomplete="off"
          autofocus
          class="db-task-capture__input"
          placeholder="do this thing tom at 8 p1"
          spellcheck="false"
          @input="syncInputScroll"
          @scroll="syncInputScroll"
          @keydown.enter.stop.prevent="createTask"
          @keydown.esc.stop.prevent="close"
        />
      </div>

      <div
        v-if="captureStore.preview.ok"
        class="db-task-capture__preview"
      >
        <span class="db-task-capture__label">Title</span>
        <span class="db-task-capture__value">{{ captureStore.preview.value.title }}</span>
        <span class="db-task-capture__label">Status</span>
        <span class="db-task-capture__value">{{ captureStore.preview.value.status }}</span>
        <span class="db-task-capture__label">Priority</span>
        <span class="db-task-capture__value">{{ captureStore.preview.value.priority || "Not set" }}</span>
        <span class="db-task-capture__label">Scheduled</span>
        <span class="db-task-capture__value">{{ scheduledLabel }}</span>
        <span class="db-task-capture__label">Deadline</span>
        <span class="db-task-capture__value">{{ deadlineLabel }}</span>
        <span class="db-task-capture__label">Destination</span>
        <span class="db-task-capture__value">After selected block</span>
      </div>
      <div v-else class="db-task-capture__warning">
        {{ captureStore.preview.error }}
      </div>

      <div v-if="captureStore.error" class="db-task-capture__error">
        {{ captureStore.error }}
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <el-button @click="close">Cancel</el-button>
        <el-button
          type="primary"
          :loading="captureStore.busy"
          @click="createTask"
        >
          Create DB task
        </el-button>
      </div>
    </div>
  </div>
</template>

<style>
.db-task-capture {
  color-scheme: var(--vb-color-scheme, dark);
  --el-border-color: hsl(var(--vb-border, 215 20% 35%));
  --el-border-color-hover: var(
    --vb-accent-color,
    hsl(var(--vb-ring, 173 80% 40%))
  );
  --el-color-primary: var(
    --vb-accent-color,
    hsl(var(--vb-accent, 173 80% 40%))
  );
  --el-color-primary-light-3: var(
    --vb-accent-hover-color,
    hsl(var(--vb-accent, 173 80% 45%))
  );
  --el-color-primary-dark-2: var(
    --vb-accent-hover-color,
    hsl(var(--vb-accent, 173 80% 32%))
  );
  --el-fill-color-blank: hsl(var(--vb-popover, 222 47% 11%));
  --el-text-color-regular: hsl(var(--vb-popover-foreground, 210 40% 96%));
}

.db-task-capture__panel {
  border: 1px solid hsl(var(--vb-border, 215 20% 35%));
  border-radius: calc(var(--vb-radius, 0.5rem) + 0.25rem);
  background: hsl(var(--vb-popover, 222 47% 11%));
  box-shadow: 0 24px 64px rgb(0 0 0 / 45%);
  color: hsl(var(--vb-popover-foreground, 210 40% 96%));
  font-family: var(
    --vb-font-family,
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
  );
  padding: 1rem;
}

.db-task-capture__title {
  color: hsl(var(--vb-popover-foreground, 210 40% 96%));
  font-weight: 700;
}

.db-task-capture__subtitle {
  color: hsl(var(--vb-muted-foreground, 215 16% 65%));
  font-size: 0.75rem;
  line-height: 1.25rem;
}

.db-task-capture__input-shell {
  position: relative;
  height: 3rem;
  overflow: hidden;
  border: 1px solid hsl(var(--vb-input, 215 20% 35%));
  border-radius: var(--vb-radius, 0.5rem);
  background: hsl(var(--vb-background, 222 47% 7%));
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease;
}

.db-task-capture__input-shell:focus-within {
  border-color: var(
    --vb-accent-color,
    hsl(var(--vb-ring, 173 80% 40%))
  );
  box-shadow: 0 0 0 3px var(
    --vb-accent-soft-color,
    hsl(var(--vb-ring, 173 80% 40%) / 0.18)
  );
}

.db-task-capture__input-highlight,
.db-task-capture__input {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 0 0.875rem;
  font: inherit;
  font-size: 1rem;
  line-height: 3rem;
  white-space: pre;
}

.db-task-capture__input-highlight {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  width: max-content;
  min-width: 100%;
  color: hsl(var(--vb-foreground, 210 40% 96%));
  pointer-events: none;
}

.db-task-capture__input-segment {
  line-height: 1.5rem;
}

.db-task-capture__input-segment--date,
.db-task-capture__input-segment--deadline,
.db-task-capture__input-segment--time,
.db-task-capture__input-segment--priority {
  border-radius: 0.25rem;
  background: var(
    --vb-accent-soft-color,
    hsl(var(--vb-accent, 173 80% 40%) / 0.16)
  );
  box-shadow: inset 0 -1px 0 var(
    --vb-accent-color,
    hsl(var(--vb-accent, 173 80% 40%) / 0.7)
  );
  color: var(
    --vb-accent-color,
    hsl(var(--vb-accent, 173 80% 40%))
  );
}

.db-task-capture__input {
  position: relative;
  display: block;
  border: 0;
  outline: 0;
  background: transparent;
  color: transparent;
  caret-color: hsl(var(--vb-foreground, 210 40% 96%));
}

.db-task-capture__input::placeholder {
  color: hsl(var(--vb-muted-foreground, 215 16% 47%));
  opacity: 1;
}

.db-task-capture__input::selection {
  background: var(
    --vb-accent-soft-color,
    hsl(var(--vb-accent, 173 80% 40%) / 0.32)
  );
}

.db-task-capture__preview {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 0.25rem 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.db-task-capture__label {
  color: hsl(var(--vb-muted-foreground, 215 16% 65%));
}

.db-task-capture__value {
  color: hsl(var(--vb-foreground, 210 40% 96%));
}

.db-task-capture__warning {
  margin-top: 0.75rem;
  color: #fbbf24;
  font-size: 0.875rem;
}

.db-task-capture__error {
  margin-top: 0.5rem;
  color: #f87171;
  font-size: 0.875rem;
}

.db-task-capture .el-button {
  --el-button-bg-color: hsl(var(--vb-muted, 215 28% 17%));
  --el-button-border-color: hsl(var(--vb-border, 215 20% 35%));
  --el-button-hover-bg-color: var(
    --vb-accent-soft-color,
    hsl(var(--vb-accent, 173 80% 40%) / 0.12)
  );
  --el-button-hover-border-color: var(
    --vb-accent-color,
    hsl(var(--vb-ring, 173 80% 40%))
  );
  --el-button-hover-text-color: hsl(var(--vb-popover-foreground, 210 40% 96%));
  --el-button-text-color: hsl(var(--vb-popover-foreground, 210 40% 96%));
}

.db-task-capture .el-button--primary {
  --el-button-bg-color: var(
    --vb-accent-color,
    hsl(var(--vb-accent, 173 80% 40%))
  );
  --el-button-border-color: var(
    --vb-accent-color,
    hsl(var(--vb-accent, 173 80% 40%))
  );
  --el-button-hover-bg-color: var(
    --vb-accent-hover-color,
    hsl(var(--vb-accent, 173 80% 45%))
  );
  --el-button-hover-border-color: var(
    --vb-accent-hover-color,
    hsl(var(--vb-accent, 173 80% 45%))
  );
  --el-button-hover-text-color: hsl(var(--vb-accent-foreground, 173 80% 10%));
  --el-button-text-color: hsl(var(--vb-accent-foreground, 173 80% 10%));
  font-weight: 700;
}
</style>
