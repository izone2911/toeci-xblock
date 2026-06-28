<template lang="pug">
.custom-student-part
  //- 1. HIỂN THỊ CÂU HỎI CHUNG / NGỮ CẢNH CHUNG
  .part-intro-box(v-if="partData.sharedContext || partData.mediaUrl")
    .part-context-global(v-if="partData.sharedContext" v-html="partData.sharedContext")
    
    .part-media-centered(v-if="partData.mediaUrl")
      audio.global-audio(controls :src="partData.mediaUrl" v-if="isAudio(partData.mediaUrl)")
      a.video-btn(:href="partData.mediaUrl" target="_blank" v-else) 🎥 Xem Video Đính Kèm

  //- 2. DANH SÁCH BÀI LÀM THEO CỤM
  .questions-list(v-if="groupedQuestions && groupedQuestions.length > 0")
    .editor-card(v-for="(group, gIdx) in groupedQuestions" :key="'group_' + gIdx" :class="{ 'is-split-pane': hasContext(group) }")
      
      .group-body(:class="{ 'has-context': hasContext(group) }")
        
        //- CỘT TRÁI: NGỮ CẢNH
        .context-wrapper(v-if="hasContext(group)")
          .context-col
            .shared-text-box(v-if="group.sharedContext" v-html="group.sharedContext")
            
            .passage-items(v-if="group.passages && group.passages.length > 0")
              .passage-item(
                v-for="(item, pIdx) in group.passages" 
                :key="pIdx"
                :class="{ 'has-divider': pIdx < group.passages.length - 1 }"
              )
                .passage-box(v-if="item.type === 'text'" v-html="item.content")
                img.q-img(v-if="item.type === 'image' && item.url" :src="item.url")

        //- CỘT PHẢI: CÂU HỎI & ĐÁP ÁN
        .questions-col
          .sub-question-block(
            v-for="q in group.questions" 
            :key="q.id"
            :id="'question-' + q.id"
            :class="{ 'block-submitted': store.isSubmitted }"
          )
            //- HEADER CÂU HỎI
            .q-header
              span.q-number {{ q.globalIndex }}.
              span.q-text(v-if="q.text" v-html="q.text")

            //- KHU VỰC TƯƠNG TÁC
            .q-interactive-area
              
              //- TRẮC NGHIỆM
              .options-col(v-if="q.type === 'multiple_choice'")
                label.option-row(
                  v-for="(optText, oIdx) in q.options" 
                  :key="oIdx"
                  :class="getOptionClass(q, getOptionLabel(oIdx))"
                )
                  input.hidden-radio(
                    type="radio" 
                    :name="'group_' + q.id" 
                    :value="getOptionLabel(oIdx)"
                    v-model="store.userAnswers[q.id]"
                    :disabled="store.isSubmitted"
                  )
                  span.btn-select-correct(:class="{ 'is-selected': store.userAnswers[q.id] === getOptionLabel(oIdx) }") {{ getOptionLabel(oIdx) }}
                  span.opt-text {{ optText }}

              //- ĐIỀN TỪ
              .text-input-col(v-else-if="q.type === 'text_input'")
                .input-wrapper
                  input.text-answer-input(
                    type="text" 
                    v-model="store.userAnswers[q.id]" 
                    :placeholder="q.textPlaceholder || 'Nhập câu trả lời của bạn...'"
                    :disabled="store.isSubmitted"
                    :class="getTextInputClass(q)"
                  )
                .review-correct-key-panel(v-if="store.isSubmitted")
                  .key-line
                    span.badge-correct-key Đáp án chuẩn:
                    span.key-string {{ q.correctAnswer }}

              //- GHÉP CẶP
              .matching-col(v-else-if="q.type === 'matching'")
                .matching-list
                  .match-row(
                    v-for="(pair, pIdx) in q.pairs" 
                    :key="pIdx"
                    :class="getMatchingRowClass(q, pair.left)"
                  )
                    .match-left-term {{ pair.left }}
                    .match-connector ➔
                    .match-right-selection
                      select.match-select(
                        v-model="store.userAnswers[q.id][pair.left]"
                        :disabled="store.isSubmitted"
                      )
                        option(value="") -- Chọn đáp án --
                        option(v-for="opt in shuffledMatchingRights[q.id]" :key="opt" :value="opt") {{ opt }}
                    
                    .match-error-fallback(v-if="store.isSubmitted && !isMatchingPairCorrect(q, pair.left)")
                      span.fallback-label Đúng là:
                      span.fallback-value {{ pair.right }}

            //- GIẢI THÍCH CHI TIẾT
            .explanation-box-review(v-if="store.isSubmitted && q.explanation" v-html="q.explanation")

  .empty-state(v-else)
    .empty-icon 📄
    h4 Chưa có dữ liệu câu hỏi cho Phần thi này.
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useExamStore } from '../../../store/examStore';

const props = defineProps<{ partData: any; startNumber: number }>();
const store = useExamStore();

const shuffledMatchingRights = ref<Record<string, string[]>>({});

const isAudio = (url: string) => /\.(mp3|wav|ogg|m4a)$/i.test(url);
const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

const hasContext = (group: any) => {
  if (group.sharedContext && group.sharedContext.trim() !== '') return true;
  if (group.passages && group.passages.length > 0) return true;
  return false;
};

const shuffleArray = (array: string[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const groupedQuestions = computed(() => {
  if (!props.partData || !props.partData.questions) return [];
  const rawData = props.partData.questions;
  const groups: any[] = [];
  
  rawData.forEach((q: any, idx: number) => {
    q.globalIndex = props.startNumber + idx;
    const lastGroup = groups[groups.length - 1];
    
    let validPassages: any[] = [];
    if (q.passages && Array.isArray(q.passages)) {
      validPassages = q.passages.filter((p: any) => {
        if (p.type === 'text') {
          const text = p.content || '';
          const plainText = text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();
          return plainText.length > 0 || text.includes('<img') || text.includes('<iframe');
        }
        if (p.type === 'image') return p.url && p.url.trim() !== '';
        return true;
      });
    }
    
    const contextNotEmpty = (q.sharedContext && q.sharedContext.trim() !== '') || validPassages.length > 0;
    const isNewGroupId = q.groupId && (!lastGroup || q.groupId !== lastGroup.groupId);
    
    if (!lastGroup || isNewGroupId || contextNotEmpty) {
      groups.push({
        groupId: q.groupId || null,
        sharedContext: q.sharedContext || '',
        passages: validPassages, 
        questions: [q]
      });
    } else {
      lastGroup.questions.push(q);
    }
  });
  
  return groups;
});

watch(() => props.partData, (newPart) => {
  if (!newPart || !newPart.questions) return;
  
  newPart.questions.forEach((q: any) => {
    if (!store.userAnswers[q.id]) {
      if (q.type === 'matching') {
        store.userAnswers[q.id] = {};
        if (q.pairs) q.pairs.forEach((p: any) => { store.userAnswers[q.id][p.left] = ''; });
      } else {
        store.userAnswers[q.id] = '';
      }
    }
    if (q.type === 'matching') {
      if (!store.userAnswers[q.id]) store.userAnswers[q.id] = {};
      if (q.pairs) {
        q.pairs.forEach((p: any) => {
          if (store.userAnswers[q.id][p.left] === undefined) {
            store.userAnswers[q.id][p.left] = '';
          }
        });
      }
      
      if (!shuffledMatchingRights.value[q.id]) {
        const rights = q.pairs ? q.pairs.map((p: any) => p.right).filter((v: string) => v.trim() !== '') : [];
        shuffledMatchingRights.value[q.id] = shuffleArray(rights);
      }
    }
  });
}, { immediate: true, deep: true });

// ==========================================
// CHẤM ĐIỂM BỌC LÓT
// ==========================================
const getOptionClass = (q: any, optLabel: string) => {
  const qIdStr = String(q.id);
  const userAnswer = store.userAnswers[qIdStr];
  const isSelected = userAnswer === optLabel;
  if (!store.isSubmitted) return isSelected ? 'is-selected-row' : '';
  
  const correctAns = store.scoreResult?.details?.[qIdStr]?.correctAnswer || q.correctAnswer;
  if (correctAns === optLabel) return 'is-correct-row';
  if (isSelected && correctAns !== optLabel) return 'is-wrong-row';
  return 'is-disabled-row';
};

const getTextInputClass = (q: any) => {
  if (!store.isSubmitted) return '';
  const qIdStr = String(q.id);
  if (store.scoreResult?.details?.[qIdStr]) {
    return store.scoreResult.details[qIdStr].isCorrect ? 'input-correct' : 'input-wrong';
  }
  const userAns = store.userAnswers[qIdStr] || '';
  return userAns.trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase() ? 'input-correct' : 'input-wrong';
};

const isMatchingPairCorrect = (q: any, leftKey: string) => {
  const qIdStr = String(q.id);
  const userSelectedRight = store.userAnswers[qIdStr]?.[leftKey];
  const targetPair = q.pairs.find((p: any) => p.left === leftKey);
  return userSelectedRight === targetPair?.right;
};

const getMatchingRowClass = (q: any, leftKey: string) => {
  const qIdStr = String(q.id);
  const userSelectedRight = store.userAnswers[qIdStr]?.[leftKey];
  if (!userSelectedRight) return ''; 
  if (!store.isSubmitted) return 'row-answered';
  return isMatchingPairCorrect(q, leftKey) ? 'row-correct' : 'row-wrong';
};
</script>

<style scoped>
.custom-student-part { padding-bottom: 20px; }

/* HEADER PART TRUNG TÂM */
.part-intro-box { background: white; padding: 24px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 24px; text-align: center; }

/* CHỐNG TRÀN CHỮ CHO CÂU HỎI CHUNG */
.part-context-global { margin: 0 0 16px 0; font-size: 1.25rem; color: #0f172a; font-weight: 700; word-break: break-word; overflow-wrap: break-word; }
.part-context-global :deep(p) { margin: 0; padding: 0; display: inline; }

.part-media-centered { display: flex; justify-content: center; align-items: center; width: 100%; margin-top: 10px; }
.global-audio { width: 100%; max-width: 540px; height: 44px; border-radius: 30px; box-shadow: 0 3px 12px rgba(15, 23, 42, 0.06); }
.video-btn { display: inline-block; background: #ef4444; color: white; padding: 10px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 0.95rem; transition: background 0.2s;}
.video-btn:hover { background: #dc2626; }

/* KHUNG CARD CHUYÊN DỤNG: TỰ ĐỘNG THU NGẮN VÀ GIÃN DÀI (FIX LỖI THỪA KHOẢNG TRẮNG) */
.editor-card { 
  background: white; padding: 24px; border-radius: 12px; 
  border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
  margin-bottom: 30px; 
  display: flex; flex-direction: column;
}
.editor-card.is-split-pane {
  height: auto;               /* Tự ôm sát nếu nội dung ngắn */
  min-height: 250px;
  max-height: calc(100vh - 160px); /* Bật thanh cuộn nếu quá dài */
}

.group-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.group-body.has-context { flex-direction: row; align-items: stretch; gap: 24px; }

.has-context .context-wrapper { flex: 1.1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.has-context .context-col { flex: 1; overflow-y: auto; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; }

.has-context .questions-col { 
  flex: 0.9; min-width: 0; min-height: 0; overflow-y: auto; overflow-x: hidden; 
  display: flex; flex-direction: column; gap: 16px; padding: 8px; 
}
.questions-col { display: flex; flex-direction: column; gap: 16px; flex: 1; overflow-y: auto; padding: 8px; }

.has-context .context-col::-webkit-scrollbar,
.questions-col::-webkit-scrollbar { width: 6px; }
.has-context .context-col::-webkit-scrollbar-thumb,
.questions-col::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

/* CHỐNG TRÀN CHỮ ĐOẠN VĂN */
.shared-text-box { font-size: 1.05rem; line-height: 1.7; color: #1e293b; margin-bottom: 24px; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;}
.passage-item { margin-bottom: 24px; }
.passage-item.has-divider { border-bottom: 2px dashed #cbd5e1; padding-bottom: 24px; }
.passage-box { font-size: 1.05rem; color: #0f172a; line-height: 1.75; font-family: 'Times New Roman', Times, serif; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;}
:deep(.passage-box p) { margin-top: 0; margin-bottom: 1.1rem; text-align: justify; }
:deep(.passage-box p:last-child) { margin-bottom: 0; }
:deep(.passage-box table) { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
:deep(.passage-box td), :deep(.passage-box th) { border: 1px solid #cbd5e1; padding: 8px 12px; }
.q-img { max-width: 100%; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0; display: block; margin: 0 auto; }

.sub-question-block { background: #ffffff; padding: 18px; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.sub-question-block.block-submitted { background-color: #fafafa; }

.q-header { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 12px; }
.q-number { font-weight: 800; color: #0f172a; font-size: 1.05rem; flex-shrink: 0; }

/* CHỐNG TRÀN CHỮ ĐỀ BÀI CÂU HỎI */
.q-text { font-size: 1rem; font-weight: 600; color: #1e293b; line-height: 1.45; flex: 1; margin-top: 1px; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap; }

/* TRẮC NGHIỆM */
.options-col { display: flex; flex-direction: column; gap: 8px; padding-left: 20px; width: 100%; box-sizing: border-box; }
.option-row { display: flex; align-items: flex-start; gap: 12px; border: 1px solid #f1f5f9; padding: 8px 14px; border-radius: 6px; background-color: #f8fafc; cursor: pointer; transition: all 0.15s ease; flex-wrap: nowrap;}
.option-row:hover:not(.is-disabled-row):not(.is-selected-row) { background-color: #ffffff; border-color: #cbd5e1; }
.hidden-radio { position: absolute; opacity: 0; width: 0; height: 0; }
.btn-select-correct { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; margin-top: 2px;}
.btn-select-correct.is-selected { background: #3b82f6; color: white; border-color: #3b82f6; }

/* CHỐNG TRÀN CHỮ ĐÁP ÁN TRẮC NGHIỆM */
.opt-text { flex: 1; font-size: 0.95rem; color: #1e293b; line-height: 1.5; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap; min-width: 0;}

.option-row.is-selected-row { border-color: #3b82f6; background-color: #eff6ff; }
.option-row.is-correct-row { border-color: #22c55e; background-color: #f0fdf4; cursor: default; }
.option-row.is-correct-row .btn-select-correct { background: #22c55e; color: white; border-color: #22c55e; }
.option-row.is-wrong-row { border-color: #ef4444; background-color: #fef2f2; cursor: default; }
.option-row.is-wrong-row .btn-select-correct { background: #ef4444; color: white; border-color: #ef4444; }
.option-row.is-disabled-row { opacity: 0.5; cursor: default; }

/* ĐIỀN TỪ */
.text-input-col { padding-left: 20px; display: flex; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; }
.text-answer-input { padding: 10px 16px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; width: 100%; max-width: 420px; outline: none; transition: all 0.2s; color: #1e293b; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); }
.text-answer-input:focus:not(:disabled) { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12); }

.input-correct { border-color: #22c55e !important; background-color: #f0fdf4; color: #15803d; font-weight: 700; box-shadow: none; }
.input-wrong { border-color: #ef4444 !important; background-color: #fef2f2; color: #b91c1c; font-weight: 700; text-decoration: line-through; box-shadow: none; }

.review-correct-key-panel { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 14px; border-radius: 6px; max-width: 420px; display: flex; align-items: center; gap: 8px; }
.badge-correct-key { font-size: 0.85rem; font-weight: 700; color: #16a34a; white-space: nowrap; flex-shrink: 0;}
.key-string { font-size: 0.95rem; font-weight: 800; color: #15803d; font-family: monospace; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;}

/* GHÉP CẶP */
.matching-col { padding-left: 20px; width: 100%; box-sizing: border-box; }
.matching-list { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 650px; }
.match-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; background: #ffffff; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; transition: all 0.2s; }

/* CHỐNG TRÀN CHỮ CHO GHÉP CẶP */
.match-left-term { flex: 1 1 auto; font-weight: 700; color: #334155; font-size: 0.95rem; min-width: 0; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;}
.match-connector { color: #94a3b8; font-weight: bold; font-size: 1.1rem; user-select: none; flex-shrink: 0;}
.match-right-selection { flex: 1 1 180px; min-width: 0; }

.match-select { width: 100%; max-width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; outline: none; background: #ffffff; cursor: pointer; color: #1e293b; font-weight: 500; transition: all 0.2s; text-overflow: ellipsis; }
.match-select:focus:not(:disabled) { border-color: #3b82f6; }

.match-row.row-answered { border-color: #93c5fd; background-color: #f8fafc; }
.match-row.row-correct { border-color: #22c55e; background-color: #f0fdf4; }
.match-row.row-correct .match-select { border-color: #22c55e; color: #15803d; font-weight: 700; background-color: transparent; }
.match-row.row-wrong { border-color: #ef4444; background-color: #fef2f2; }
.match-row.row-wrong .match-select { border-color: #ef4444; color: #b91c1c; font-weight: 700; background-color: transparent; text-decoration: line-through; }

.match-error-fallback { flex: 1.4; display: flex; align-items: center; gap: 6px; background: #f0fdf4; border: 1px dashed #22c55e; padding: 6px 12px; border-radius: 6px; min-width: 200px; }
.fallback-label { font-size: 0.8rem; font-weight: 700; color: #16a34a; white-space: nowrap; flex-shrink: 0;}
.fallback-value { font-size: 0.9rem; font-weight: 800; color: #15803d; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;}

/* CHỐNG TRÀN CHỮ GIẢI THÍCH CHI TIẾT */
.explanation-box-review { margin-top: 16px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; font-size: 0.9rem; color: #475569; line-height: 1.5; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;}
.explanation-box-review :deep(strong) { color: #0f172a; font-weight: 700; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }
.empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
</style>