<script lang="ts" setup>
import {
  computed,
  nextTick,
  watch,
} from "vue";

import { hideMainUI } from "@/common/funcs";
import { createDbTaskAfterBlock } from "@/runtime/db-task-capture";
import { useDbTaskCaptureStore } from "@/stores/db-task-capture";

const captureStore = useDbTaskCaptureStore();

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
    <div
      class="rounded-lg border border-gray-300 bg-white p-4 font-mono shadow-2xl dark:border-gray-700 dark:bg-gray-900"
    >
      <div class="mb-3 flex items-center justify-between">
        <div>
          <div class="font-bold">Capture Logseq DB task</div>
          <div class="text-xs text-gray-500">
            Plain title + DB Status, Priority, and Scheduled properties
          </div>
        </div>
        <el-button title="Cancel (Esc)" @click="close">Esc</el-button>
      </div>

      <el-input
        v-model="captureStore.input"
        autofocus
        placeholder="do this thing tom at 8 p1"
        size="large"
        @keydown.enter.stop.prevent="createTask"
        @keydown.esc.stop.prevent="close"
      />

      <div
        v-if="captureStore.preview.ok"
        class="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm"
      >
        <span class="text-gray-500">Title</span>
        <span>{{ captureStore.preview.value.title }}</span>
        <span class="text-gray-500">Status</span>
        <span>{{ captureStore.preview.value.status }}</span>
        <span class="text-gray-500">Priority</span>
        <span>{{ captureStore.preview.value.priority || "Not set" }}</span>
        <span class="text-gray-500">Scheduled</span>
        <span>{{ scheduledLabel }}</span>
        <span class="text-gray-500">Destination</span>
        <span>After selected block</span>
      </div>
      <div v-else class="mt-3 text-sm text-amber-600">
        {{ captureStore.preview.error }}
      </div>

      <div v-if="captureStore.error" class="mt-2 text-sm text-red-600">
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
