<template lang="pug">
.part-page
  // PHẦN TIÊU ĐỀ TẠM ẨN THEO YÊU CẦU
  // .part-direction
  //   h2.part-title Part 6: Text Completion
  //   p.dir-text Directions: Read the texts that follow. A word, phrase, or sentence is missing in parts of each text. Four answer choices for each blank are given below the text. Select the best answer to complete the text.

  .questions-list(v-if="groupedQuestions && groupedQuestions.length > 0")
    
    // MỖI CARD SẼ LÀ MỘT KHUNG MÀN HÌNH ĐỘC LẬP (CỐ ĐỊNH CHIỀU CAO)
    .editor-card(v-for="(group, gIdx) in groupedQuestions" :key="'group_' + gIdx")
      .group-body(:class="{ 'has-context': group.passageText || group.imageUrl }")
        
        // CỘT TRÁI: KHU VỰC ĐOẠN VĂN
        .context-wrapper(v-if="group.passageText || group.imageUrl")
          .context-col
            .passage-box(v-if="group.passageText" v-html="group.passageText")
            img.q-img(v-if="group.imageUrl" :src="group.imageUrl" alt="Part 6 Reading Context")
        
        // CỘT PHẢI: KHU VỰC CÂU HỎI
        .questions-col
          // Từng câu hỏi giữ nguyên border tĩnh an toàn, không nhảy màu khi focus
          .sub-question-block(
            v-for="q in group.questions" 
            :key="q.id"
            :id="'question-' + q.id"
          )
            .q-header
              span.q-number {{ q.globalIndex }}.
              span.q-text(v-if="q.questionText || q.content && !group.passageText") {{ q.questionText || q.content }}
            
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
                span.opt-text {{ optText }}

  .empty-state(v-else)
    .empty-icon 📄
    h4 Chưa có dữ liệu câu hỏi cho Part 6
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useExamStore } from '../../../store/examStore';

const props = defineProps<{
  questions: any[];
  startNumber: number;
}>();

const store = useExamStore();

const groupedQuestions = computed(() => {
  const rawData = props.questions || [];
  const groups = [];
  
  for (let i = 0; i < rawData.length; i += 4) {
    const chunk = rawData.slice(i, i + 4);
    const contextTarget = chunk.find(q => q.passageText || q.content); 
    const imageTarget = chunk.find(q => q.image || q.imageUrl);
    
    groups.push({
      questions: chunk,
      passageText: contextTarget ? (contextTarget.passageText || contextTarget.content) : null,
      imageUrl: imageTarget ? (imageTarget.image || imageTarget.imageUrl) : null,
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

// Hàm getOptionClass nhận diện chính xác cấu trúc đáp án để tô màu trực quan
const getOptionClass = (q: any, optLabel: string) => {
  const qIdStr = String(q.id);
  const userAnswer = getUserAnswer(qIdStr);
  const isSelected = userAnswer === optLabel;
  
  if (!store.isSubmitted) return isSelected ? 'is-selected-row' : '';
  
  // Trạng thái đã nộp bài (Chấm điểm đúng sai kết hợp Local với JSON fallback)
  const correctAns = store.scoreResult?.details?.[qIdStr]?.correctAnswer || q.correctAnswer;
  
  if (correctAns === optLabel) return 'is-correct-row';
  if (isSelected && correctAns !== optLabel) return 'is-wrong-row';
  return 'is-disabled-row';
};
</script>

<style scoped>
.part-page { padding-bottom: 20px; }

/* ==========================================
   KHUNG CARD ĐẢM BẢO AN TOÀN LAYOUT (SPLIT-PANE GỐC)
========================================== */
.editor-card { 
  background: white; 
  padding: 24px; 
  border-radius: 12px; 
  border: 1px solid #cbd5e1; 
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
  margin-bottom: 30px;
  
  height: calc(100vh - 160px); 
  min-height: 500px; 
  display: flex;
  flex-direction: column;
}

.group-body { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  min-height: 0; 
}

@media (min-width: 900px) {
  .group-body.has-context { 
    flex-direction: row; 
    align-items: stretch; 
    gap: 20px;
  }
  
  /* CỘT TRÁI ĐOẠN VĂN */
  .has-context .context-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0; 
  }
  
  .has-context .context-col { 
    flex: 1;
    overflow-y: auto; 
    background: #ffffff; 
    padding: 24px; 
    border-radius: 8px; 
    border: 1px solid #e2e8f0; 
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
  }
  
  /* CỘT PHẢI CÂU HỎI (Đã đồng bộ với Part 7) */
  .has-context .questions-col { 
    flex: 1; 
    min-width: 0;
    min-height: 0; 
    overflow-y: auto;
    overflow-x: hidden; /* Khóa cuộn ngang để giữ an toàn cho layout */
    display: flex; 
    flex-direction: column; 
    gap: 16px; /* Tăng khoảng cách cho thoáng */
    padding: 10px; /* Thêm padding 10px để bóng đổ không bị cắt */
  }
}

/* Kiểu dáng thanh cuộn cho cả 2 bên */
.has-context .context-col::-webkit-scrollbar,
.has-context .questions-col::-webkit-scrollbar { width: 6px; }
.has-context .context-col::-webkit-scrollbar-thumb,
.has-context .questions-col::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

/* ĐỊNH DẠNG ĐOẠN VĂN */
.passage-box { 
  font-size: 1.05rem; 
  color: #0f172a; 
  line-height: 1.8; 
  font-family: 'Times New Roman', Times, serif; 
}
:deep(.passage-box p) {
  margin-top: 0;
  margin-bottom: 1.25rem; 
  text-align: justify; 
}
:deep(.passage-box p:last-child) { margin-bottom: 0; }
:deep(.passage-box b), :deep(.passage-box strong) { font-weight: 700; color: #000; }
:deep(.passage-box i), :deep(.passage-box em) { font-style: italic; }

.q-img { max-width: 100%; object-fit: contain; border-radius: 6px; margin-top: 16px; border: 1px solid #e2e8f0;}

/* KHỐI CÂU HỎI BORDER CỐ ĐỊNH (Đã đồng bộ với Part 7) */
.sub-question-block { 
  background: #ffffff;
  padding: 16px; /* Tăng padding */
  border: 1px solid #cbd5e1; /* Viền đậm đà, sắc nét hơn */
  border-radius: 8px; 
  box-shadow: 0 1px 2px rgba(0,0,0,0.02); /* Thêm đổ bóng nhẹ */
}

.q-header { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 12px; }
.q-number { font-weight: 800; color: #0f172a; font-size: 1.05rem; }
.q-text { font-size: 1rem; font-weight: 600; color: #1e293b; line-height: 1.4; }

.options-col { display: flex; flex-direction: column; gap: 8px; padding-left: 24px; }

.option-row { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  border: 1px solid #f1f5f9; 
  padding: 8px 14px; 
  border-radius: 6px; 
  background-color: #f8fafc; 
  cursor: pointer; 
  transition: all 0.15s ease; 
}

/* CỐ ĐỊNH MÀU HOVER: Tuyệt đối không thay đổi trạng thái khi dòng đáp án đã được chọn */
.option-row:hover:not(.is-disabled-row):not(.is-selected-row) { background-color: #ffffff; border-color: #cbd5e1; }

.hidden-radio { position: absolute; opacity: 0; width: 0; height: 0; }

.btn-select-correct { 
  width: 28px; 
  height: 28px; 
  border-radius: 50%; 
  border: 1px solid #cbd5e1; 
  background: white; 
  font-weight: bold; 
  color: #64748b; 
  flex-shrink: 0; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 0.85rem; 
}
.btn-select-correct.is-selected { background: #3b82f6; color: white; border-color: #3b82f6; }

.opt-text { flex: 1; font-size: 0.95rem; color: #1e293b; }

.option-row.is-selected-row { border-color: #3b82f6; background-color: #eff6ff; }
.option-row.is-correct-row { border-color: #22c55e; background-color: #f0fdf4; cursor: default; }
.option-row.is-correct-row .btn-select-correct { background: #22c55e; color: white; border-color: #22c55e; }
.option-row.is-wrong-row { border-color: #ef4444; background-color: #fef2f2; cursor: default; }
.option-row.is-wrong-row .btn-select-correct { background: #ef4444; color: white; border-color: #ef4444; }
.option-row.is-disabled-row { opacity: 0.5; cursor: default; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0; color: #64748b; }
.empty-icon { font-size: 2rem; margin-bottom: 8px; }
</style>