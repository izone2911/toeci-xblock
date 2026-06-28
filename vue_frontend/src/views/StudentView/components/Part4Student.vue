<template lang="pug">
.part-page
  .questions-list(v-if="groupedQuestions && groupedQuestions.length > 0")
    
    // MỖI CARD LÀ MỘT CỤM 3 CÂU HỎI CHUNG NGỮ CẢNH
    .editor-card(v-for="(group, gIdx) in groupedQuestions" :key="'group_' + gIdx")
      .group-body(:class="{ 'has-graphic': group.imageUrl }")
        
        // CỘT ẢNH MINH HỌA
        .image-col(v-if="group.imageUrl")
          img.q-img(:src="group.imageUrl" alt="Part 4 Graphic")
        
        // CỘT DANH SÁCH 3 CÂU HỎI
        .questions-col
          // Từng câu hỏi đã có border bo góc rõ ràng
          .sub-question-block(
            v-for="q in group.questions" 
            :key="q.id"
            :id="'question-' + q.id"
          )
            .q-header
              span.q-number {{ q.globalIndex }}.
              span.q-text {{ q.questionText || q.content || 'Question' }}
            
            .options-col
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
                span.btn-select-correct(:class="{ 'is-selected': getUserAnswer(q.id) === getOptionLabel(oIdx) }") {{ getOptionLabel(oIdx) }}
                span.opt-text(v-if="optText") {{ optText }}

      // HIỂN THỊ TRANSCRIPT KHI ĐÃ NỘP BÀI THI
      .transcript-zone(v-if="store.isSubmitted && group.transcript")
        .transcript-header 📖 Bài nói (Transcript):
        .transcript-text {{ group.transcript }}

  .empty-state(v-else)
    .empty-icon 📢
    h4 Chưa có dữ liệu câu hỏi cho Part 4
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useExamStore } from '../../../store/examStore';

const props = defineProps<{
  questions: any[];
  startNumber?: number;
}>();

const store = useExamStore();

const groupedQuestions = computed(() => {
  const rawData = props.questions || [];
  const groups = [];
  
  for (let i = 0; i < rawData.length; i += 3) {
    const chunk = rawData.slice(i, i + 3);
    const imageTarget = chunk.find(q => q.image || q.imageUrl);
    const transcriptTarget = chunk.find(q => q.content && q.content.trim().length > 0 && !q.questionText);
    
    groups.push({
      questions: chunk,
      imageUrl: imageTarget ? (imageTarget.image || imageTarget.imageUrl) : null,
      transcript: transcriptTarget ? transcriptTarget.content : null
    });
  }
  return groups;
});

const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

// Hàm Helper lấy đáp án người dùng (Hỗ trợ cả dạng Object và String)
const getUserAnswer = (qId: string | number) => {
  const rawAns = store.userAnswers[String(qId)];
  return typeof rawAns === 'object' ? rawAns?.selectedAnswer : rawAns;
};

// Cập nhật hàm getOptionClass truyền vào toàn bộ object `q`
const getOptionClass = (q: any, optLabel: string) => {
  const qIdStr = String(q.id);
  const userAnswer = getUserAnswer(qIdStr);
  const isSelected = userAnswer === optLabel;
  
  if (!store.isSubmitted) return isSelected ? 'is-selected-row' : '';
  
  const correctAns = store.scoreResult?.details?.[qIdStr]?.correctAnswer || q.correctAnswer;
  
  if (correctAns === optLabel) return 'is-correct-row';
  if (isSelected && correctAns !== optLabel) return 'is-wrong-row';
  return 'is-disabled-row';
};
</script>

<style scoped>
.part-page { padding-bottom: 40px; }

/* CARD LỚN CHỨA CỤM CÂU HỎI */
.editor-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; border: 1px solid #cbd5e1; }

.group-body { display: flex; flex-direction: column; gap: 24px; }

/* BỐ CỤC CHIA CỘT & CĂN GIỮA (SMART LAYOUT) */
@media (min-width: 850px) {
  .group-body.has-graphic { flex-direction: row; align-items: stretch; }
  
  .has-graphic .image-col { 
    width: 40%; 
    flex-shrink: 0; 
    background: #f8fafc; 
    padding: 16px; 
    border-radius: 8px; 
    border: 1px solid #e2e8f0; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
  }
  
  .has-graphic .questions-col { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    justify-content: center; 
  }
}

.q-img { max-width: 100%; max-height: 320px; object-fit: contain; border-radius: 4px; }

/* TỪNG CÂU HỎI NHỎ BÊN TRONG CARD ĐÃ CÓ BORDER */
.sub-question-block { 
  padding: 16px; 
  border-radius: 8px; 
  border: 1px solid #cbd5e1; 
  background-color: #ffffff;
  margin-bottom: 16px; 
  scroll-margin-top: 120px; 
  transition: all 0.2s; 
}

.q-header { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; }
.q-number { font-weight: 800; color: #0f172a; font-size: 1.1rem; }
.q-text { font-size: 1rem; font-weight: 600; color: #1e293b; line-height: 1.4; }

/* ĐÁP ÁN VÒNG TRÒN ĐỒNG BỘ */
.options-col { display: flex; flex-direction: column; gap: 10px; padding-left: 12px; }
.option-row { display: flex; align-items: center; gap: 12px; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; background-color: #f8fafc; cursor: pointer; transition: all 0.2s; }

/* CỐ ĐỊNH MÀU HOVER KHI ĐÃ CHỌN ĐÁP ÁN */
.option-row:hover:not(.is-disabled-row):not(.is-selected-row) { background-color: #ffffff; border-color: #cbd5e1; }

.hidden-radio { position: absolute; opacity: 0; width: 0; height: 0; }
.btn-select-correct { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.btn-select-correct.is-selected { background: #3b82f6; color: white; border-color: #3b82f6; }

.opt-text { flex: 1; font-size: 0.95rem; color: #1e293b; }

/* TRẠNG THÁI MÀU SẮC ĐÁP ÁN */
.option-row.is-selected-row { border-color: #3b82f6; background-color: #eff6ff; }
.option-row.is-correct-row { border-color: #22c55e; background-color: #f0fdf4; cursor: default; }
.option-row.is-correct-row .btn-select-correct { background: #22c55e; color: white; border-color: #22c55e; }
.option-row.is-wrong-row { border-color: #ef4444; background-color: #fef2f2; cursor: default; }
.option-row.is-wrong-row .btn-select-correct { background: #ef4444; color: white; border-color: #ef4444; }
.option-row.is-disabled-row { opacity: 0.6; cursor: default; }

/* TRANSCRIPT ZONE */
.transcript-zone { margin-top: 20px; padding-top: 16px; border-top: 1px dashed #e2e8f0; background: #fef08a; border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 0 8px 8px 0; }
.transcript-header { font-weight: 700; color: #854d0e; margin-bottom: 6px; font-size: 0.9rem; }
.transcript-text { font-size: 0.95rem; color: #334155; line-height: 1.5; white-space: pre-line; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }
.empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
</style>