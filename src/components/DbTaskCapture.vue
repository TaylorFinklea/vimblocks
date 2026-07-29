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
    window.focus();
    document
      .querySelector<HTMLInputElement>(".db-task-capture input")
      ?.focus();
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
  color-scheme: dark;
  --el-border-color: #475569;
  --el-border-color-hover: #64748b;
  --el-color-primary: #2dd4bf;
  --el-color-primary-light-3: #5eead4;
  --el-color-primary-dark-2: #14b8a6;
  --el-fill-color-blank: #172033;
  --el-text-color-regular: #e2e8f0;
}

.db-task-capture__panel {
  border: 1px solid #334155;
  border-radius: 0.75rem;
  background: #0f172a;
  box-shadow: 0 24px 64px rgb(0 0 0 / 45%);
  color: #f8fafc;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", monospace;
  padding: 1rem;
}

.db-task-capture__title {
  color: #f8fafc;
  font-weight: 700;
}

.db-task-capture__subtitle {
  color: #94a3b8;
  font-size: 0.75rem;
  line-height: 1.25rem;
}

.db-task-capture__input-shell {
  position: relative;
  height: 3rem;
  overflow: hidden;
  border: 1px solid #475569;
  border-radius: 0.5rem;
  background: #080f1d;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease;
}

.db-task-capture__input-shell:focus-within {
  border-color: #2dd4bf;
  box-shadow: 0 0 0 3px rgb(45 212 191 / 16%);
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
  color: #e2e8f0;
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
  background: rgb(45 212 191 / 16%);
  box-shadow: inset 0 -1px 0 rgb(94 234 212 / 65%);
  color: #5eead4;
}

.db-task-capture__input {
  position: relative;
  display: block;
  border: 0;
  outline: 0;
  background: transparent;
  color: transparent;
  caret-color: #f8fafc;
}

.db-task-capture__input::placeholder {
  color: #64748b;
  opacity: 1;
}

.db-task-capture__input::selection {
  background: rgb(45 212 191 / 32%);
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
  color: #94a3b8;
}

.db-task-capture__value {
  color: #e2e8f0;
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
  --el-button-bg-color: #172033;
  --el-button-border-color: #475569;
  --el-button-hover-bg-color: #1e293b;
  --el-button-hover-border-color: #64748b;
  --el-button-hover-text-color: #f8fafc;
  --el-button-text-color: #e2e8f0;
}

.db-task-capture .el-button--primary {
  --el-button-bg-color: #2dd4bf;
  --el-button-border-color: #2dd4bf;
  --el-button-hover-bg-color: #5eead4;
  --el-button-hover-border-color: #5eead4;
  --el-button-hover-text-color: #042f2e;
  --el-button-text-color: #042f2e;
  font-weight: 700;
}
</style>
