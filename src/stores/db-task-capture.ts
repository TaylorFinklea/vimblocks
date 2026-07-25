import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { parseDbTaskCapture } from "@/runtime/db-task-capture";

export const useDbTaskCaptureStore = defineStore("db-task-capture", () => {
  const visible = ref(false);
  const input = ref("");
  const anchorBlockUUID = ref("");
  const capturedAt = ref(Date.now());
  const focusRequest = ref(0);
  const busy = ref(false);
  const error = ref("");

  const preview = computed(() =>
    parseDbTaskCapture(input.value, new Date(capturedAt.value))
  );

  const show = (anchorUUID: string) => {
    anchorBlockUUID.value = anchorUUID;
    capturedAt.value = Date.now();
    input.value = "";
    error.value = "";
    busy.value = false;
    visible.value = true;
  };

  const hide = () => {
    visible.value = false;
    input.value = "";
    anchorBlockUUID.value = "";
    error.value = "";
    busy.value = false;
  };

  const requestFocus = () => {
    focusRequest.value += 1;
  };

  return {
    visible,
    input,
    anchorBlockUUID,
    focusRequest,
    busy,
    error,
    preview,
    show,
    hide,
    requestFocus,
  };
});
