// src/types/global.d.ts
export {};

declare global {
  interface Window {
    EDX_ENV: {
      mode: 'student' | 'teacher';
    };
  }
}