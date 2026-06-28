<template lang="pug">
.part-page
  // PHẦN TIÊU ĐỀ TẠM ẨN THEO YÊU CẦU
  // .part-direction
  //   h2.part-title Part 5: Incomplete Sentences
  //   p.dir-text Directions: A word or phrase is missing in each of the sentences below. Four answer choices are given below each sentence. Select the best answer to complete the sentence.

  .questions-list(v-if="questions && questions.length > 0")
    
    // Mỗi câu hỏi là một card độc lập, đã có border mặc định
    .editor-card(
      v-for="(q, index) in questions" 
      :key="q.id"
      :id="'question-' + q.id"
    )
      .q-header
        span.q-number {{ q.globalIndex || (startNumber + index) }}.
        // Hiển thị nội dung câu hỏi (chứa chỗ trống ___)
        span.q-text(v-html="q.content")

      .q-body
        .options-col
          // Hiển thị 4 đáp án
          label.option-row(
            v-for="(optText, oIdx) in q.options" 
            :key="oIdx"
            :class="getOptionClass(q, getOptionLabel(oIdx))"
          )
            input.hidden-radio(
              type="radio" 
              :name="'group_' + q.id" 
              :value="getOptionLabel(oIdx)"
              :checked="getUserAnswer(q.id) === getOptionLabel(oIdx)"
              @change="store.saveAnswer(String(q.id), getOptionLabel(oIdx))"
              :disabled="store.isSubmitted"
            )
            
            // Vòng tròn đáp án A, B, C, D
            span.btn-select-correct(:class="{ 'is-selected': getUserAnswer(q.id) === getOptionLabel(oIdx) }") {{ getOptionLabel(oIdx) }}
            
            // Text của đáp án
            span.opt-text {{ optText }}

  .empty-state(v-else)
    .empty-icon 📝
    h4 Chưa có dữ liệu câu hỏi cho Part 5
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

// Cập nhật hàm getOptionClass truyền vào toàn bộ object `q` để xử lý logic chấm điểm
const getOptionClass = (q: any, optLabel: string) => {
  const qIdStr = String(q.id);
  const userAnswer = getUserAnswer(qIdStr);
  const isSelected = userAnswer === optLabel;
  
  // Trạng thái đang làm bài
  if (!store.isSubmitted) return isSelected ? 'is-selected-row' : '';
  
  // Trạng thái đã nộp bài (Chấm điểm đúng sai kết hợp Local fallback)
  const correctAns = store.scoreResult?.details?.[qIdStr]?.correctAnswer || q.correctAnswer;
  
  if (correctAns === optLabel) return 'is-correct-row';
  if (isSelected && correctAns !== optLabel) return 'is-wrong-row';
  return 'is-disabled-row';
};
</script>

<style scoped>
.part-page { padding-bottom: 40px; }

/* TIÊU ĐỀ & HƯỚNG DẪN (Đang ẩn nhưng giữ lại CSS cho gọn) */
.part-title { font-size: 1.4rem; color: #0f172a; margin-bottom: 8px; font-weight: 800;}
.dir-text { color: #475569; font-size: 0.95rem; margin-bottom: 24px; font-style: italic; border-bottom: 1px solid #cbd5e1; padding-bottom: 16px;}

/* CARD CÂU HỎI */
.editor-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; border: 1px solid #cbd5e1; scroll-margin-top: 100px;}

.q-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 20px; }
.q-number { font-weight: 800; color: #0f172a; font-size: 1.1rem; flex-shrink: 0; }
.q-text { font-size: 1.05rem; font-weight: 500; color: #1e293b; line-height: 1.5; padding-top: 1px; }

/* KHU VỰC ĐÁP ÁN */
.options-col { display: flex; flex-direction: column; gap: 12px; padding-left: 32px; }

.option-row { display: flex; align-items: center; gap: 14px; border: 1px solid #e2e8f0; padding: 12px 14px; border-radius: 8px; background-color: #f8fafc; cursor: pointer; transition: all 0.2s; }

/* CỐ ĐỊNH MÀU HOVER KHI ĐÃ CHỌN ĐÁP ÁN */
.option-row:hover:not(.is-disabled-row):not(.is-selected-row) { background-color: #ffffff; border-color: #cbd5e1; }

.hidden-radio { position: absolute; opacity: 0; width: 0; height: 0; }

.btn-select-correct { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; transition: all 0.2s; }
.btn-select-correct.is-selected { background: #3b82f6; color: white; border-color: #3b82f6; }

.opt-text { flex: 1; font-size: 1rem; color: #1e293b; line-height: 1.4; }

/* TRẠNG THÁI UI KHI LÀM BÀI / CHẤM BÀI */
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