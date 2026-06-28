<template lang="pug">
.part-page
  // PHẦN TIÊU ĐỀ TẠM ẨN THEO YÊU CẦU
  // .part-direction
  //   h2.part-title Part 7: Reading Comprehension
  //   p.dir-text Directions: In this part you will read a selection of texts, such as magazine and newspaper articles, e-mails, and instant messages. Each text or set of texts is followed by several questions. Select the best answer for each question and complete the text.

  .questions-list(v-if="groupedQuestions && groupedQuestions.length > 0")
    
    // MỖI CARD LÀ MỘT CỤM BÀI ĐỌC
    .editor-card(v-for="(group, gIdx) in groupedQuestions" :key="'group_' + gIdx")
      .group-body(:class="{ 'has-context': group.passages && group.passages.length > 0 }")
        
        // CỘT TRÁI: ĐA ĐOẠN VĂN
        .context-wrapper(v-if="group.passages && group.passages.length > 0")
          .context-col
            .passage-item(
              v-for="(item, idx) in group.passages" 
              :key="idx"
              :class="{ 'has-divider': idx < group.passages.length - 1 }"
            )
              .passage-box(v-if="item.type === 'text'" v-html="item.content")
              img.q-img(v-if="item.type === 'image'" :src="item.url" alt="Part 7 Context")
        
        // CỘT PHẢI: CÁC CÂU HỎI LIÊN QUAN
        .questions-col
          // Từng câu hỏi đã có border, KHÔNG CÓ class nhảy viền active
          .sub-question-block(
            v-for="q in group.questions" 
            :key="q.id"
            :id="'question-' + q.id"
          )
            .q-header
              span.q-number {{ q.globalIndex || q.index }}.
              span.q-text(v-if="q.text || q.content") {{ q.text || q.content }}
            
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
    h4 Chưa có dữ liệu câu hỏi cho Part 7
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useExamStore } from '../../../store/examStore';

const props = defineProps<{
  questions: any[];
  startNumber?: number;
}>();

const store = useExamStore();

/**
 * THUẬT TOÁN NHÓM CÓ BỘ LỌC DỮ LIỆU RỖNG THÔNG MINH
 */
const groupedQuestions = computed(() => {
  const rawData = props.questions || [];
  const groups: any[] = [];
  
  rawData.forEach((q) => {
    const lastGroup = groups[groups.length - 1];
    
    // 1. TIỀN XỬ LÝ: Lọc bỏ các passage bị rỗng (chỉ có space hoặc thẻ HTML trống)
    let validPassages: any[] = [];
    if (q.passages && Array.isArray(q.passages)) {
      validPassages = q.passages.filter((p: any) => {
        if (p.type === 'text') {
          const text = p.content || '';
          // Loại bỏ toàn bộ thẻ HTML và các ký tự space đặc biệt (&nbsp;) để xét lõi
          const plainText = text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();
          
          // Trả về true (giữ lại) nếu có chữ, hoặc nếu bên trong có nhúng thẻ hình/video
          return plainText.length > 0 || text.includes('<img') || text.includes('<iframe');
        }
        if (p.type === 'image') {
          return p.url && p.url.trim() !== '';
        }
        return true;
      });
    }
    
    // 2. PHÂN LOẠI NHÓM DỰA TRÊN DỮ LIỆU ĐÃ ĐƯỢC LÀM SẠCH
    const hasPassages = validPassages.length > 0;
    const isNewGroupId = q.groupId && (!lastGroup || q.groupId !== lastGroup.groupId);
    
    if (!lastGroup || isNewGroupId || hasPassages) {
      // TẠO CỤM MỚI
      groups.push({
        groupId: q.groupId || null,
        passages: validPassages, 
        questions: [q]
      });
    } else {
      // KẾ THỪA (Nhét các câu theo sau vào cụm trước đó)
      lastGroup.questions.push(q);
    }
  });
  
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
.part-page { padding-bottom: 20px; }
/* .part-title { font-size: 1.3rem; color: #0f172a; margin-bottom: 6px; font-weight: 800; }
.dir-text { color: #475569; font-size: 0.9rem; margin-bottom: 20px; font-style: italic; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; } */

/* KHUNG CARD FIXED-HEIGHT CHUYÊN DỤNG (SPLIT-PANE) */
.editor-card { 
  background: white; padding: 24px; border-radius: 12px; 
  border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
  margin-bottom: 30px; height: calc(100vh - 160px); min-height: 540px;
  display: flex; flex-direction: column;
}

.group-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.group-body.has-context { flex-direction: row; align-items: stretch; gap: 24px; }

.has-context .context-wrapper { flex: 1.1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.has-context .context-col { flex: 1; overflow-y: auto; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.01); }

/* Đã thêm padding 10px để viền pulse-highlight không bị xén khi focus */
.has-context .questions-col { 
  flex: 0.9; min-width: 0; min-height: 0; overflow-y: auto; overflow-x: hidden; 
  display: flex; flex-direction: column; gap: 16px; padding: 10px; 
}

.has-context .context-col::-webkit-scrollbar,
.has-context .questions-col::-webkit-scrollbar { width: 6px; }
.has-context .context-col::-webkit-scrollbar-thumb,
.has-context .questions-col::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

/* PHÂN TÁCH CÁC ĐOẠN VĂN TRONG DOUBLE/TRIPLE PASSAGES */
.passage-item { margin-bottom: 24px; }
.passage-item.has-divider { border-bottom: 2px dashed #cbd5e1; padding-bottom: 24px; }

.passage-box { font-size: 1.05rem; color: #0f172a; line-height: 1.75; font-family: 'Times New Roman', Times, serif; }
:deep(.passage-box p) { margin-top: 0; margin-bottom: 1.1rem; text-align: justify; }
:deep(.passage-box p:last-child) { margin-bottom: 0; }
:deep(.passage-box b), :deep(.passage-box strong) { font-weight: 700; color: #000; }
:deep(.passage-box i), :deep(.passage-box em) { font-style: italic; }
:deep(.passage-box table) { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
:deep(.passage-box td), :deep(.passage-box th) { border: 1px solid #cbd5e1; padding: 8px 12px; }

.q-img { max-width: 100%; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0; display: block; margin: 0 auto; }

/* KHỐI CÂU HỎI */
.sub-question-block { background: #ffffff; padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.q-header { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 12px; }
.q-number { font-weight: 800; color: #0f172a; font-size: 1.05rem; }
.q-text { font-size: 1rem; font-weight: 600; color: #1e293b; line-height: 1.4; }
.options-col { display: flex; flex-direction: column; gap: 8px; padding-left: 24px; }

.option-row { display: flex; align-items: center; gap: 12px; border: 1px solid #f1f5f9; padding: 8px 14px; border-radius: 6px; background-color: #f8fafc; cursor: pointer; transition: all 0.15s ease; }

/* CỐ ĐỊNH MÀU HOVER: Đáp án đã chọn sẽ không bị đổi màu khi rê chuột */
.option-row:hover:not(.is-disabled-row):not(.is-selected-row) { background-color: #ffffff; border-color: #cbd5e1; }
.hidden-radio { position: absolute; opacity: 0; width: 0; height: 0; }

.btn-select-correct { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; }
.btn-select-correct.is-selected { background: #3b82f6; color: white; border-color: #3b82f6; }
.opt-text { flex: 1; font-size: 0.95rem; color: #1e293b; }

.option-row.is-selected-row { border-color: #3b82f6; background-color: #eff6ff; }
.option-row.is-correct-row { border-color: #22c55e; background-color: #f0fdf4; cursor: default; }
.option-row.is-correct-row .btn-select-correct { background: #22c55e; color: white; border-color: #22c55e; }
.option-row.is-wrong-row { border-color: #ef4444; background-color: #fef2f2; cursor: default; }
.option-row.is-wrong-row .btn-select-correct { background: #ef4444; color: white; border-color: #ef4444; }
.option-row.is-disabled-row { opacity: 0.5; cursor: default; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }
.empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
</style>