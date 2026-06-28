<template lang="pug">
.part-page
  .questions-list(v-if="questions && questions.length > 0")
    
    // Đã gỡ bỏ :class is-active để tắt tính năng nhảy viền xanh
    .editor-card(
      v-for="(q, index) in questions" 
      :key="q.id"
      :id="'question-' + q.id"
    )
      .q-header
        // Ưu tiên dùng globalIndex (đã được tạo lúc export), nếu không có thì tự tính
        span.q-number {{ q.globalIndex || (startNumber + index) }}.
        // Lời thoại Transcript chỉ lộ ra khi đã nộp bài
        span.q-transcript(v-if="store.isSubmitted && q.content") {{ q.content }}

      .q-body
        // Hỗ trợ cả 2 chuẩn trường dữ liệu ảnh là image và imageUrl
        .image-col(v-if="q.image || q.imageUrl")
          img.q-img(:src="q.image || q.imageUrl" alt="Question Image")
        
        .options-col
          // Đảm bảo luôn có 4 đáp án kể cả khi dữ liệu mảng options bị thiếu
          label.option-row(
            v-for="(optText, oIdx) in (q.options && q.options.length ? q.options : ['', '', '', ''])" 
            :key="oIdx"
            :class="getOptionClass(q, getOptionLabel(oIdx))"
          )
            // Input ẩn đi để dùng toàn bộ diện tích thẻ label click cho dễ
            input.hidden-radio(
              type="radio" 
              :name="'group_' + q.id" 
              :value="getOptionLabel(oIdx)"
              :checked="getUserAnswer(q.id) === getOptionLabel(oIdx)"
              @change="store.saveAnswer(String(q.id), getOptionLabel(oIdx))"
              :disabled="store.isSubmitted"
            )
            
            // Vòng tròn đáp án (A, B, C, D) chuẩn Teacher
            span.btn-select-correct(:class="{ 'is-selected': getUserAnswer(q.id) === getOptionLabel(oIdx) }") {{ getOptionLabel(oIdx) }}
            
            // Text đáp án (ẩn đi nếu đang thi TOEIC thật, hiện ra khi nộp bài)
            span.opt-text(v-if="store.isSubmitted && optText") {{ optText }}

  .empty-state(v-else)
    .empty-icon 📝
    h4 Chưa có câu hỏi nào trong Part 1
</template>

<script setup lang="ts">
import { useExamStore } from '../../../store/examStore';

const props = defineProps<{
  questions: any[];
  startNumber: number;
}>();

const store = useExamStore();

// Chuyển 0, 1, 2, 3 thành A, B, C, D
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

/* CARD CÂU HỎI */
.editor-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; transition: all 0.2s; border: 1px solid #cbd5e1; scroll-margin-top: 100px; }

.q-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 20px; }
.q-number { font-weight: 800; color: #0f172a; font-size: 1.2rem; flex-shrink: 0; }
.q-transcript { font-size: 1.05rem; color: #334155; font-weight: 500; line-height: 1.5; padding-top: 2px; }

/* BỐ CỤC CHIA ĐÔI */
.q-body { display: flex; flex-direction: column; gap: 24px; }
@media (min-width: 800px) {
  .q-body { flex-direction: row; align-items: center; }
  .image-col { width: 45%; flex-shrink: 0; }
  .options-col { flex: 1; }
}

/* KHU VỰC ẢNH */
.image-col { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; }
.q-img { max-width: 100%; max-height: 350px; object-fit: contain; border-radius: 4px; }

/* KHU VỰC ĐÁP ÁN */
.options-col { display: flex; flex-direction: column; gap: 12px; }

.option-row { display: flex; align-items: center; gap: 14px; border: 1px solid #e2e8f0; padding: 12px 14px; border-radius: 8px; background-color: #f8fafc; cursor: pointer; transition: all 0.2s; }

/* Thêm :not(.is-selected-row) để đảm bảo không bị đổi màu khi di chuột vào đáp án ĐÃ CHỌN */
.option-row:hover:not(.is-disabled-row):not(.is-selected-row) { background-color: white; border-color: #cbd5e1; }

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

/* TRẠNG THÁI TRỐNG */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }
.empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
</style>