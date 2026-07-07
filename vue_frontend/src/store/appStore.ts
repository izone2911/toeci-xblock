import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const currentMode = ref<'student' | 'teacher'>('student');

  const setMode = (mode: 'student' | 'teacher') => {
    currentMode.value = mode;
  };

  return { currentMode, setMode };
});