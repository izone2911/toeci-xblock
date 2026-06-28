// src/store/appStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  // Mặc định luôn an toàn ở chế độ sinh viên
  const currentMode = ref<'student' | 'teacher'>('student');

  const setMode = (mode: 'student' | 'teacher') => {
    currentMode.value = mode;
  };

  return { currentMode, setMode };
});