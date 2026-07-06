<template lang="pug">
header.global-topbar
  .topbar-left
    .mode-switch
      button.mode-btn(type="button" :class="{ active: builderMode === 'traditional' }" @click.prevent="$emit('switch-mode', 'traditional')") Truyền thống
      button.mode-btn(type="button" :class="{ active: builderMode === 'custom' }" @click.prevent="$emit('switch-mode', 'custom')") Tùy chỉnh

  .topbar-right
    .actions
      button.btn-action.btn-import(type="button" @click.prevent="$emit('import-json-trigger')" title="Nhập dữ liệu từ file JSON") Nhập JSON
      button.btn-action.btn-import(type="button" @click.prevent="$emit('import-gift-trigger')" title="Nhập dữ liệu từ file GIFT (.txt)") Nhập GIFT
      button.btn-action.btn-export(type="button" @click.prevent="$emit('export-json')" title="Xuất dữ liệu ra file JSON") Xuất JSON
      button.btn-action.btn-export(type="button" @click.prevent="$emit('export-gift')" title="Xuất dữ liệu ra file GIFT (.txt)") Xuất GIFT
      
      button.btn-action.btn-fullscreen(
        type="button"
        @click.prevent="$emit('toggle-fullscreen')" 
        :title="isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to tối đa'"
      ) {{ isFullscreen ? '🗗 Thu nhỏ' : '🖵 Toàn màn hình nè' }}

      button.btn-action.btn-save(
        type="button" 
        @click.prevent="$emit('save-data')" 
        :disabled="store.saveStatus === 'saving'"
        :class="saveButtonClass"
        title="Lưu đề thi vào hệ thống"
      ) {{ saveButtonText }}
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useExamStore } from '../../store/examStore';

const store = useExamStore();

const props = defineProps<{
  builderMode: 'traditional' | 'custom';
  isFullscreen: boolean;
}>();

const emit = defineEmits([
  'switch-mode', 
  'import-json-trigger', 
  'import-gift-trigger', 
  'export-json', 
  'export-gift', 
  'toggle-fullscreen', 
  'save-data'
]);

// Đồng bộ text của nút Save theo trạng thái mạng từ Store
const saveButtonText = computed(() => {
  switch (store.saveStatus) {
    case 'saving': return 'Đang lưu...';
    case 'success': return 'Đã lưu thành công';
    case 'error': return 'Lưu thất bại';
    default: return 'Lưu đề thi';
  }
});

// Đồng bộ class CSS của nút Save để đổi màu sắc tương ứng
const saveButtonClass = computed(() => {
  return {
    'is-saving': store.saveStatus === 'saving',
    'is-success': store.saveStatus === 'success',
    'is-error': store.saveStatus === 'error'
  };
});
</script>

<style scoped>
.global-topbar { display: flex; justify-content: space-between; align-items: center; background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 0 24px; height: 56px; z-index: 20; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.topbar-left, .topbar-right { display: flex; align-items: center; }

.mode-switch { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; border: 1px solid #e2e8f0; }
.mode-btn { border: none; background: transparent; padding: 6px 16px; border-radius: 6px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
.mode-btn.active { background: white; color: #2563eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.mode-btn:hover:not(.active) { color: #0f172a; }

.actions { display: flex; gap: 8px; align-items: center; }
.btn-action { padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
.btn-import { background-color: #ffffff; color: #475569; border-color: #cbd5e1; }
.btn-import:hover { background-color: #f1f5f9; color: #0f172a; }
.btn-export { background-color: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
.btn-export:hover { background-color: #dbeafe; border-color: #3b82f6; }

.btn-fullscreen { background-color: #f1f5f9; color: #475569; border-color: #cbd5e1; }
.btn-fullscreen:hover { background-color: #e2e8f0; color: #0f172a; }

/* Trạng thái nút Lưu mặc định */
.btn-save { background-color: #10b981; color: white; border-color: #059669; margin-left: 12px; }
.btn-save:hover:not(:disabled) { background-color: #059669; }

/* Trạng thái tương tác động của nút Lưu */
.btn-save.is-saving { background-color: #fbbf24; border-color: #d97706; cursor: wait; opacity: 0.8; }
.btn-save.is-success { background-color: #3b82f6; border-color: #2563eb; pointer-events: none; }
.btn-save.is-error { background-color: #ef4444; border-color: #dc2626; }
</style>