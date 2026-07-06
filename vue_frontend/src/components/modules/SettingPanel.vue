<template lang="pug">
.sidebar-header
  .setting-row
    span.setting-label Giới hạn thời gian
    label.toggle-switch(title="Kích hoạt giới hạn thời gian làm bài")
      input(type="checkbox" v-model="settings.isTimeLimitEnabled")
      span.slider
  
  .time-input-group(v-if="settings.isTimeLimitEnabled")
    input.time-input(
      type="text" 
      v-model.lazy="timeLimitFormatted" 
      placeholder="hh:mm:ss"
      title="Định dạng: hh:mm:ss"
    )

  .setting-row.mt-2
    span.setting-label Hiển thị đáp án
    label.toggle-switch(title="Cho phép học viên xem đáp án sau khi nộp bài")
      input(type="checkbox" v-model="settings.isShowAnswerEnabled")
      span.slider

  //- ĐÃ BỔ SUNG: Nút gạt cấu hình tua Audio
  .setting-row.mt-2
    span.setting-label Tua Audio (Nghe)
    label.toggle-switch(title="Cho phép học viên tua/chuyển tiếp Audio bài nghe")
      input(type="checkbox" v-model="settings.isAudioSeekEnabled")
      span.slider
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: {
    globalListeningAudio: string;
    isTimeLimitEnabled: boolean;
    isShowAnswerEnabled: boolean;
    isAudioSeekEnabled: boolean; // Bổ sung biến trạng thái Tua Audio
    timeLimitSeconds: number;
  }
}>();

const emit = defineEmits(['update:modelValue']);

const settings = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const timeLimitFormatted = computed({
  get() {
    const totalSeconds = settings.value.timeLimitSeconds;
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  },
  set(val: string) {
    if (!val) return;
    const parts = val.split(':');
    let hrs = parseInt(parts[0] || '0', 10);
    let mins = parts.length >= 2 ? parseInt(parts[1] || '0', 10) : 0;
    let secs = parts.length === 3 ? parseInt(parts[2] || '0', 10) : 0;
    
    if (isNaN(hrs) || hrs < 0) hrs = 0;
    if (isNaN(mins) || mins < 0) mins = 0;
    if (isNaN(secs) || secs < 0) secs = 0;
    
    settings.value.timeLimitSeconds = (hrs * 3600) + (mins * 60) + secs;
  }
});
</script>

<style scoped>
.sidebar-header { padding: 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 0; z-index: 10; }
.setting-row { display: flex; justify-content: space-between; align-items: center; }
.setting-label { color: #475569; font-weight: 600; font-size: 0.95rem; }
.mt-2 { margin-top: 8px; }

.toggle-switch { position: relative; display: inline-block; width: 42px; height: 22px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: 0.3s; border-radius: 22px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
input:checked + .slider { background-color: #3b82f6; }
input:checked + .slider:before { transform: translateX(20px); }

.time-input-group { display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid #cbd5e1; }
.time-input { background: transparent; border: none; color: #3b82f6; font-size: 1.25rem; width: 100%; outline: none; font-family: monospace; font-weight: bold; text-align: center; letter-spacing: 2px;}
</style>