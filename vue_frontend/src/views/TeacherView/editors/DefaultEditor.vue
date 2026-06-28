<template lang="pug">
.default-editor
  // Card 1: Nhập câu hỏi
  .editor-card
    h4 Nội dung câu hỏi
    RichTextEditor(v-model="question.content")
  
  // Card 2: Nhập đáp án (Dynamic Options)
  .editor-card.options-card
    h4 Đáp án (Chọn chữ cái đầu dòng để đặt làm đáp án đúng)
    
    .options-grid
      .option-row(
        v-for="(opt, oIdx) in question.options" 
        :key="oIdx"
        :class="{ 'correct-row': question.correctAnswer === getOptionLabel(oIdx) }"
      )
        button.btn-select-correct(
          type="button"
          :class="{ 'is-correct': question.correctAnswer === getOptionLabel(oIdx) }"
          @click="question.correctAnswer = getOptionLabel(oIdx)"
          :title="'Đặt ' + getOptionLabel(oIdx) + ' là đáp án đúng'"
        ) {{ getOptionLabel(oIdx) }}
        
        input.option-input(
          v-model="question.options[oIdx]"
          :placeholder="'Nhập nội dung đáp án ' + getOptionLabel(oIdx) + '...'"
        )

        button.btn-remove-option(
          v-if="question.options.length > 2"
          @click="removeOption(oIdx)"
          title="Xóa đáp án này"
        ) ×
    
    button.btn-add-option(@click="addOption") + Thêm đáp án
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import RichTextEditor from '../../../components/RichTextEditor.vue'; 

const props = defineProps<{ modelValue: any }>();
const emit = defineEmits(['update:modelValue']);

// Trỏ tham chiếu trực tiếp đến biến activeQuestion từ cha truyền xuống
const question = toRef(props, 'modelValue');

const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

const addOption = () => {
  if (question.value) question.value.options.push('');
};

const removeOption = (index: number) => {
  if (question.value) {
    question.value.options.splice(index, 1);
    question.value.correctAnswer = ''; 
  }
};
</script>

<style scoped>
.editor-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;}
.editor-card h4 { margin: 0 0 16px 0; color: #334155; font-size: 1.1rem; }
.options-grid { display: flex; flex-direction: column; gap: 12px; }
.option-row { display: flex; align-items: center; gap: 16px; border: 1px solid #e2e8f0; padding: 10px 16px; border-radius: 8px; background-color: #f8fafc; transition: all 0.2s ease; }
.option-row:focus-within { border-color: #cbd5e1; background-color: white; }
.option-row.correct-row { border-color: #22c55e; background-color: #f0fdf4; }
.btn-select-correct { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #cbd5e1; background-color: white; color: #64748b; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; flex-shrink: 0; }
.btn-select-correct:hover { background-color: #f1f5f9; border-color: #94a3b8; }
.btn-select-correct.is-correct { background-color: #22c55e; border-color: #22c55e; color: white; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3); }
.option-input { flex: 1; border: none; outline: none; font-size: 1rem; font-family: inherit; background: transparent; color: #1e293b; }
.btn-remove-option { background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0 8px; line-height: 1; transition: color 0.2s; }
.btn-remove-option:hover { color: #ef4444; }
.btn-add-option { margin-top: 8px; background: transparent; border: 1px dashed #cbd5e1; color: #64748b; padding: 10px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 0.95rem; font-weight: 500; transition: all 0.2s; }
.btn-add-option:hover { background: #f8fafc; border-color: #94a3b8; color: #0f172a; }
</style>