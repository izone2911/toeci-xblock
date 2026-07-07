<template lang="pug">
.custom-editor-page
  .part-config-box.mb-4
    .input-wrapper.mb-4
      label Đường dẫn tệp âm thanh...
      .audio-controls
        .player-wrapper(v-if="partData.mediaUrl")
          audio.custom-audio-player(controls :src="partData.mediaUrl")
          button.btn-remove-media(type="button" @click="partData.mediaUrl = ''" title="Gỡ bỏ file âm thanh") ×
        .audio-input-group(v-else)
          input.global-audio-input(
            v-model="tempMediaUrl" 
            @keyup.enter="applyMediaUrl"
            placeholder="Đường dẫn tệp âm thanh..."
          )
          button.btn-apply(v-if="tempMediaUrl" @click="applyMediaUrl") Áp dụng

    .input-wrapper
      label Nội dung hướng dẫn hoặc ngữ cảnh dùng chung cho phần thi này
      RichTextEditor(v-model="partData.sharedContext" placeholder="Câu hỏi chung cho toàn bộ phần thi")

  .questions-list(v-if="partData.questions && partData.questions.length > 0")
    template(v-for="(q, index) in partData.questions" :key="q.id")
      
      QuestionItemEditor(
        :question="q"
        :displayIndex="startNumber + index"
        partNumber="custom"
        :isExpanded="expandedIds.includes(q.id)"
        :isDragging="dragEditorIndex === index"
        :isDragEnabled="dragEnabledIndex === index"
        :isFirstInGroup="isFirstInGroupCheck(index)"
        @toggle="toggleQuestion(q.id)"
        @mouseenter="dragEnabledIndex = index"
        @mouseleave="onMouseLeaveEditor"
        @insert-above="insertQuestionAbove(index)"
        @insert-below="insertQuestionBelow(index)"
        @insert-group-below="insertNewGroup(index)"
        @delete="deleteQuestion(index)"
        @dragstart-item="onDragStartEditor(index, $event)"
        @drop-item="onDropEditor(index, $event)"
        @dragend-item="onDragEndEditor"
        @add-array-item="(key, type) => addArrayItem(q, key, type)"
        @remove-array-item="(key, idx) => removeArrayItem(q, key, idx)"
      )

      .group-divider(v-if="showDividerCheck(index)")
        .divider-line


  .empty-state(v-else)
    h4 Phần thi hiện tại chưa có dữ liệu câu hỏi

  button.btn-add-large(v-if="!partData.questions || partData.questions.length === 0" @click="addGroupAtEnd") 
    span.add-icon +
    | Thêm nhóm câu hỏi mới
  button.btn-add-large.mt-4(v-else @click="addGroupAtEnd") 
    span.add-icon +
    | Thêm nhóm câu hỏi mới
</template>

<script setup lang="ts">
import { ref, toRef, onMounted } from 'vue';
import RichTextEditor from '../../components/RichTextEditor.vue';
import QuestionItemEditor from '../../components/core/QuestionItemEditor.vue'; 
import { useCustomEditor } from '../../composables/useCustomEditor.ts';




// Định nghĩa giao tiếp dữ liệu đầu vào và các sự kiện phát ra của component soạn thảo
const props = defineProps<{ 
  modelValue: any, 
  startNumber: number,
  sessionConfig: { skipDeleteConfirm: boolean; skipSwapConfirm: boolean }
}>();

const emit = defineEmits(['update:modelValue', 'request-delete', 'request-swap']);

// twoways binding modelValue
const partData = toRef(props, 'modelValue');
const tempMediaUrl = ref('');

const applyMediaUrl = () => {
  if (tempMediaUrl.value.trim() !== '') {
    partData.value.mediaUrl = tempMediaUrl.value.trim();
    tempMediaUrl.value = '';
  }
};

// kiểm tra nếu thiếu shareContext 
onMounted(() => {
  if (partData.value && typeof partData.value.sharedContext === 'undefined') {
    partData.value.sharedContext = '';
  }
});

const {
  expandedIds,
  dragEditorIndex,
  dragEnabledIndex,
  isFirstInGroupCheck,
  showDividerCheck,
  onDragStartEditor,
  onMouseLeaveEditor,
  onDropEditor,
  onDragEndEditor,
  insertQuestionAbove,
  insertQuestionBelow,
  insertNewGroup,
  addGroupAtEnd,
  deleteQuestion,
  addArrayItem,
  removeArrayItem,
  toggleQuestion
} = useCustomEditor(partData, props, emit);
</script>

<style scoped>
.custom-editor-page { display: flex; flex-direction: column; padding-bottom: 40px; }
.part-config-box { background: white; padding: 24px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.input-wrapper { display: flex; flex-direction: column; gap: 8px; }
.input-wrapper label { font-size: 0.95rem; font-weight: 700; color: #334155; }
.text-input { padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; font-size: 0.95rem; transition: border-color 0.2s; }
.text-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
.mb-4 { margin-bottom: 20px; }
.mt-4 { margin-top: 20px; }
.questions-list { display: flex; flex-direction: column; }

.audio-controls { width: 100%; display: flex; justify-content: center; align-items: center; margin-top: 8px; } 
.player-wrapper { position: relative; display: flex; align-items: center; background: transparent; padding: 0; border-radius: 50px; border: none; }
.custom-audio-player { height: 44px; width: 600px; outline: none; border-radius: 30px;} 
.audio-input-group { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; max-width: 600px; }
.global-audio-input { flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 0.95rem; }
.global-audio-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
.btn-apply { background: #3b82f6; border: none; color: white; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; white-space: nowrap; }
.btn-remove-media { position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 14px; cursor: pointer; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

.group-divider { display: flex; align-items: center; margin: 12px 0 24px 0; }
.divider-line { flex: 1; border-bottom: 2px dashed #cbd5e1; }

.btn-add-large { width: 100%; padding: 14px; background: white; border: 2px dashed #bfdbfe; border-radius: 12px; color: #2563eb; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s; }
.btn-add-large:hover { background: #eff6ff; border-color: #3b82f6; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }
</style>