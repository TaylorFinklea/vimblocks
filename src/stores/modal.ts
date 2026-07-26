import { defineStore } from "pinia";
import { ref } from "vue";

import {
  createModalState,
  normalizeBoundaryProfile,
  stepModalKey,
  type BoundaryProfile,
  type ChangeDescriptor,
  type ModalPoint,
  type ModalState,
} from "@/runtime/modal-command";
import {
  getModalCountDigits,
  resetModalCountDigits,
  setModalCountDigits,
} from "@/runtime/modal-count";
import type { NativeHistoryGroup } from "@/runtime/modal-change";

export const useModalStore = defineStore("modal", () => {
  const state = ref<ModalState>(createModalState("logseq-first"));
  const nativeHistoryGroup = ref<NativeHistoryGroup | null>(null);

  const step = (token: string) => {
    state.value = {
      ...state.value,
      countDigits: getModalCountDigits() || state.value.countDigits,
    };
    const result = stepModalKey(state.value, token);
    state.value = result.state;
    setModalCountDigits(result.state.countDigits);
    return result;
  };
  const setProfile = (profile: BoundaryProfile | unknown): void => {
    state.value = {
      ...state.value,
      profile: normalizeBoundaryProfile(profile),
    };
  };
  const setVisualAnchor = (point: ModalPoint | null): void => {
    state.value = { ...state.value, visualAnchor: point };
  };
  const recordChange = (change: ChangeDescriptor | null): void => {
    state.value = { ...state.value, lastChange: change };
  };
  const recordNativeHistoryGroup = (
    group: NativeHistoryGroup | null
  ): void => {
    nativeHistoryGroup.value = group;
  };
  const resetPending = (): void => {
    resetModalCountDigits();
    state.value = {
      ...createModalState(state.value.profile),
      lastChange: state.value.lastChange,
    };
  };

  return {
    state,
    nativeHistoryGroup,
    step,
    setProfile,
    setVisualAnchor,
    recordChange,
    recordNativeHistoryGroup,
    resetPending,
  };
});
