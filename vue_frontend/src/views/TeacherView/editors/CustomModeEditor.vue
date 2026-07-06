<template lang="pug">
.custom-editor-page
  .part-config-box.mb-4
    .input-wrapper.mb-4
      label Url audio bài nghe
      .audio-controls
        .player-wrapper(v-if="partData.mediaUrl")
          audio.custom-audio-player(controls :src="partData.mediaUrl")
          button.btn-remove-media(type="button" @click="partData.mediaUrl = ''" title="Xóa tệp âm thanh") ×
        .audio-input-group(v-else)
          input.global-audio-input(
            v-model="tempMediaUrl" 
            @keyup.enter="applyMediaUrl"
            placeholder="Dán link Url audio bài nghe tại đây..."
          )
          button.btn-apply(v-if="tempMediaUrl" @click="applyMediaUrl") Áp dụng

    .input-wrapper
      label Nội dung / Câu hỏi chung cho toàn bộ Phần
      RichTextEditor(v-model="partData.sharedContext" placeholder="Nhập ngữ cảnh, đoạn văn chung hoặc hướng dẫn làm bài cho toàn bộ phần này...")

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
    h4 Phần này chưa có câu hỏi nào.
  
  button.btn-add-large(v-if="!partData.questions || partData.questions.length === 0" @click="addGroupAtEnd") 
    span.add-icon +
    | Thêm đoạn
  button.btn-add-large.mt-4(v-else @click="addGroupAtEnd") 
    span.add-icon +
    | Thêm đoạn
</template>

<script setup lang="ts">
import { ref, toRef, onMounted, nextTick } from 'vue';
import RichTextEditor from '../../../components/RichTextEditor.vue';
import QuestionItemEditor from '../../../components/core/QuestionItemEditor.vue'; 

const props = defineProps<{ 
  modelValue: any, 
  startNumber: number,
  sessionConfig: { skipDeleteConfirm: boolean; skipSwapConfirm: boolean }
}>();

const emit = defineEmits(['update:modelValue', 'request-delete', 'request-swap']);
const partData = toRef(props, 'modelValue');

const tempMediaUrl = ref('');
const applyMediaUrl = () => {
  if (tempMediaUrl.value.trim() !== '') {
    partData.value.mediaUrl = tempMediaUrl.value.trim();
    tempMediaUrl.value = '';
  }
};

onMounted(() => {
  if (partData.value && typeof partData.value.sharedContext === 'undefined') {
    partData.value.sharedContext = '';
  }
});

const expandedIds = ref<string[]>([]);

const isFirstInGroupCheck = (index: number) => {
  if (!partData.value.questions || partData.value.questions.length === 0) return false;
  return index === 0 || partData.value.questions[index - 1].groupId !== partData.value.questions[index].groupId;
};

const showDividerCheck = (index: number) => {
  if (!partData.value.questions || index === partData.value.questions.length - 1) return false;
  return partData.value.questions[index + 1].groupId !== partData.value.questions[index].groupId;
};

const dragEditorIndex = ref<number | null>(null);
const dragEnabledIndex = ref<number | null>(null);

const onDragStartEditor = (index: number, event: DragEvent) => {
  dragEditorIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
  expandedIds.value = []; 
};

const onMouseLeaveEditor = () => {
  if (dragEditorIndex.value === null) dragEnabledIndex.value = null;
};

const onDropEditor = (targetIndex: number, event: DragEvent) => {
  let sourceIndex = dragEditorIndex.value;
  
  if (event && event.dataTransfer) {
    const transferredData = event.dataTransfer.getData('text/plain');
    if (transferredData) sourceIndex = parseInt(transferredData, 10);
  }

  if (sourceIndex !== null && !isNaN(sourceIndex) && sourceIndex !== targetIndex) {
    if (props.sessionConfig.skipSwapConfirm) {
      const item1 = partData.value.questions[sourceIndex];
      const item2 = partData.value.questions[targetIndex];
      const newItem1 = { ...item2, id: item1.id, groupId: item1.groupId };
      const newItem2 = { ...item1, id: item2.id, groupId: item2.groupId };
      partData.value.questions.splice(sourceIndex, 1, newItem1);
      partData.value.questions.splice(targetIndex, 1, newItem2);
    } else {
      emit('request-swap', {
        sourceIndex, targetIndex, 
        message: `Xác nhận hoán đổi nội dung câu ${props.startNumber + sourceIndex} và câu ${props.startNumber + targetIndex}?`,
        partNumber: 'custom'
      });
    }
  }
  dragEditorIndex.value = null;
  dragEnabledIndex.value = null;
};

const onDragEndEditor = () => { dragEditorIndex.value = null; dragEnabledIndex.value = null; };

const createNewQuestionObject = (groupId: string) => ({
  id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  groupId: groupId, 
  type: 'multiple_choice', 
  text: '', 
  explanation: '', 
  options: ['', ''], 
  pairs: [],
  correctAnswer: 'A',
  scoreEnabled: false, 
  score: 1, 
  waitingTime: 0, 
  textPlaceholder: ''
});

const insertQuestionAbove = (index: number) => {
  const groupId = partData.value.questions[index].groupId;
  const newQ = createNewQuestionObject(groupId);
  partData.value.questions.splice(index, 0, newQ);
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const insertQuestionBelow = (index: number) => {
  const groupId = partData.value.questions[index].groupId;
  const newQ = createNewQuestionObject(groupId);
  partData.value.questions.splice(index + 1, 0, newQ);
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const insertNewGroup = (index: number) => {
  const newGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newQ = createNewQuestionObject(newGroupId);
  partData.value.questions.splice(index + 1, 0, newQ);
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const addGroupAtEnd = () => {
  if (!partData.value.questions) partData.value.questions = [];
  const newGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newQ = createNewQuestionObject(newGroupId);
  partData.value.questions.push(newQ);
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const deleteQuestion = (index: number) => { 
  emit('request-delete', { 
    index, 
    message: `Xác nhận xóa câu ${props.startNumber + index}?`, 
    partNumber: 'custom' 
  });
};

const addArrayItem = (q: any, key: 'passages', type: 'text' | 'image') => {
  if (!q[key]) q[key] = [];
  q[key].push(type === 'text' ? { type: 'text', content: '' } : { type: 'image', url: '' });
};

const removeArrayItem = (q: any, key: 'passages', idx: number) => {
  if (q[key] && q[key].length > 1) q[key].splice(idx, 1);
};

const toggleQuestion = (id: string) => {
  const idx = expandedIds.value.indexOf(id);
  if (idx === -1) expandedIds.value.push(id); else expandedIds.value.splice(idx, 1);
};
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
.btn-remove-media { position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

/* 🔥 ĐÃ FIX: Chỉnh margin 12px trên và 24px dưới, bù trừ hoàn hảo với 12px của ô thẻ ghi nhớ */
.group-divider { display: flex; align-items: center; margin: 12px 0 24px 0; }
.divider-line { flex: 1; border-bottom: 2px dashed #cbd5e1; }

.btn-add-large { width: 100%; padding: 14px; background: white; border: 2px dashed #bfdbfe; border-radius: 12px; color: #2563eb; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s; }
.btn-add-large:hover { background: #eff6ff; border-color: #3b82f6; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }
</style>