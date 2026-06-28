<template lang="pug">
.part-page
  .questions-list(v-if="questions.length > 0")
    
    // Bỏ tính năng nhảy màu xanh khi active
    .editor-card(
      v-for="(q, index) in questions" 
      :key="q.id"
      :id="'question-' + q.id"
    )
      .q-header
        // Ưu tiên dùng globalIndex (đã được tạo lúc export)
        span.q-number {{ q.globalIndex || (startNumber + index) }}.
        // Lời thoại chỉ lộ ra khi giảng viên chấm xong
        span.q-transcript(v-if="store.isSubmitted && q.content") {{ q.content }}

      .q-body
        .options-col
          // Part 2 thường chỉ có 3 đáp án A, B, C nên ta dùng v-show="oIdx < 3"
          label.option-row(
            v-for="(optText, oIdx) in q.options" 
            :key="oIdx"
            :class="getOptionClass(q, getOptionLabel(oIdx))"
            v-show="oIdx < 3"
          )
            // Input ẩn đi để dùng toàn bộ diện tích thẻ label
            input.hidden-radio(
              type="radio" 
              :name="'group_' + q.id" 
              :value="getOptionLabel(oIdx)"
              :checked="getUserAnswer(q.id) === getOptionLabel(oIdx)"
              @change="store.saveAnswer(String(q.id), getOptionLabel(oIdx))"
              :disabled="store.isSubmitted"
            )
            
            // Vòng tròn đáp án (A, B, C) chuẩn Teacher
            span.btn-select-correct(:class="{ 'is-selected': getUserAnswer(q.id) === getOptionLabel(oIdx) }") {{ getOptionLabel(oIdx) }}
            
            // Text đáp án (hiện ra khi nộp bài)
            span.opt-text(v-if="store.isSubmitted && optText") {{ optText }}

  .empty-state(v-else)
    .empty-icon 🎧
    h4 Chưa có câu hỏi nào trong Part 2
</template>

<script setup lang="ts">
import { useExamStore } from '../../../store/examStore';

const props = defineProps<{
  questions: any[];
  startNumber: number;
}>();

const store = useExamStore();

const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

// Hàm Helper lấy đáp án người dùng (Hỗ trợ cả dạng Object và String)
const getUserAnswer = (qId: string | number) => {
  const rawAns = store.userAnswers[String(qId)];
  return typeof rawAns === 'object' ? rawAns?.selectedAnswer : rawAns;
};

// Cập nhật hàm getOptionClass truyền vào toàn bộ object `q` để khắc phục lỗi màu Đỏ
const getOptionClass = (q: any, optLabel: string) => {
  const qIdStr = String(q.id);
  const userAnswer = getUserAnswer(qIdStr);
  const isSelected = userAnswer === optLabel;
  
  // Trạng thái đang làm bài
  if (!store.isSubmitted) {
    return isSelected ? 'is-selected-row' : '';
  }
  
  // Trạng thái đã nộp bài (Chấm điểm đúng sai)
  // Ưu tiên đọc từ Server, nếu không có thì lấy trực tiếp từ dữ liệu câu hỏi
  const correctAns = store.scoreResult?.details?.[qIdStr]?.correctAnswer || q.correctAnswer;
  
  if (correctAns === optLabel) return 'is-correct-row';
  if (isSelected && correctAns !== optLabel) return 'is-wrong-row';
  return 'is-disabled-row';
};
</script>

<style scoped>
.part-page { padding-bottom: 40px; }

/* KẾ THỪA CSS CARD TỪ PART 1 */
.editor-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; transition: all 0.2s; border: 1px solid #cbd5e1; scroll-margin-top: 100px; }

.q-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 20px; }
.q-number { font-weight: 800; color: #0f172a; font-size: 1.2rem; flex-shrink: 0; }
.q-transcript { font-size: 1.05rem; color: #334155; font-weight: 500; line-height: 1.5; padding-top: 2px; }

.q-body { display: flex; flex-direction: column; gap: 24px; }

/* ĐÁP ÁN: SỬ DỤNG VÒNG TRÒN */
.options-col { display: flex; flex-direction: column; gap: 12px; }

.option-row { display: flex; align-items: center; gap: 14px; border: 1px solid #e2e8f0; padding: 12px 14px; border-radius: 8px; background-color: #f8fafc; cursor: pointer; transition: all 0.2s; }

/* Thêm :not(.is-selected-row) để đảm bảo không bị đổi màu khi di chuột vào đáp án ĐÃ CHỌN */
.option-row:hover:not(.is-disabled-row):not(.is-selected-row) { background-color: white; border-color: #cbd5e1; }

.hidden-radio { position: absolute; opacity: 0; width: 0; height: 0; }

.btn-select-correct { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; transition: all 0.2s; }
.btn-select-correct.is-selected { background: #3b82f6; color: white; border-color: #3b82f6; }

.opt-text { flex: 1; font-size: 1rem; color: #1e293b; line-height: 1.4; }

/* TRẠNG THÁI UI */
.option-row.is-selected-row { border-color: #3b82f6; background-color: #eff6ff; }
.option-row.is-selected-row .btn-select-correct { background: #3b82f6; color: white; border-color: #3b82f6; }

.option-row.is-correct-row { border-color: #22c55e; background-color: #f0fdf4; cursor: default; }
.option-row.is-correct-row .btn-select-correct { background: #22c55e; color: white; border-color: #22c55e; }

.option-row.is-wrong-row { border-color: #ef4444; background-color: #fef2f2; cursor: default; }
.option-row.is-wrong-row .btn-select-correct { background: #ef4444; color: white; border-color: #ef4444; }

.option-row.is-disabled-row { opacity: 0.6; cursor: default; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }
.empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
</style>