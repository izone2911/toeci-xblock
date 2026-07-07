<template lang="pug">
.question-item-student(:id="'question-' + question.id")
  .q-header
    span.q-number {{ question.globalIndex || displayIndex }}.
    span.q-text(v-if="question.text || question.questionText" v-html="question.text || question.questionText")
  

  .q-body
    .unanswered-notice(v-if="store.isSubmitted && !currentAnswer")
      span.notice-text Trạng thái: Chưa chọn đáp án
      
    // Layout câu hỏi trắc nghiệm
    .options-grid(v-if="!question.type || question.type === 'multiple_choice'")
      label.option-label(
        v-for="(opt, index) in safeOptions" 
        :key="index"
        :class="getOptionClass(index)"
      )
        input.hidden-radio(
          type="radio"
          :name="'group_' + question.id"
          :value="getOptionChar(index)"
          :checked="currentAnswer === getOptionChar(index)"
          :disabled="store.isSubmitted"
          @change="handleSelect(getOptionChar(index))"
        )
        span.opt-char {{ getOptionChar(index) }}
        span.opt-text(v-if="opt" v-html="opt")
        
    .text-input-wrapper(v-else-if="question.type === 'text_input'")
      input.q-text-input(
        type="text"
        :placeholder="question.textPlaceholder || 'Nhập câu trả lời...'"
        :value="currentAnswer"
        :disabled="store.isSubmitted"
        :class="getTextInputClass()"
        @input="handleTextInput"
      )
      .correct-badge(v-if="store.isSubmitted && isShowAnswer && !isCorrectResult")
        span Đáp án đúng: 
        b {{ question.correctAnswer }}

    .matching-wrapper(v-else-if="question.type === 'matching'")
      p.text-muted(v-if="!store.isSubmitted") Chọn câu trả lời tương ứng.
      .match-row(v-for="(pair, idx) in question.pairs" :key="idx")
        .match-left(v-html="pair.left")
        .match-right
          select.match-select(
            :disabled="store.isSubmitted"
            :value="getMatchingAnswer(pair.left)"
            :class="getMatchingClass(pair.left, pair.right)"
            @change="handleMatchingSelect(pair.left, $event)"
          )
            option(value="") -- Chọn --
            option(v-for="opt in shuffledMatchingRights" :key="opt" :value="opt") {{ opt }}

  .q-explanation(v-if="store.isSubmitted && isShowAnswer && question.explanation")
    .exp-title Giải thích chi tiết:
    .exp-content(v-html="question.explanation")
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useExamStore } from '../../store/examStore';

const props = defineProps<{
  question: any;
  displayIndex: number;
}>();

const store = useExamStore();
const isShowAnswer = computed(() => store.examSettings?.isShowAnswerEnabled !== false);

const safeOptions = computed(() => {
  if (props.question.options && props.question.options.length > 0) return props.question.options;
  return ['', '', '', ''];
});

const currentAnswer = computed(() => {
  const rawAns = store.userAnswers[String(props.question.id)];
  return typeof rawAns === 'object' ? rawAns?.selectedAnswer : rawAns;
});

const isCorrectResult = computed(() => {
  return store.scoreResult?.details?.[String(props.question.id)]?.isCorrect || false;
});

const getOptionChar = (index: number) => String.fromCharCode(65 + index);

const handleSelect = (val: string) => {
  if (store.isSubmitted) return;
  store.saveAnswer(String(props.question.id), val);
};

const getOptionClass = (index: number) => {
  const char = getOptionChar(index);
  const isSelected = currentAnswer.value === char;
  
  if (!store.isSubmitted) return isSelected ? 'is-selected' : '';
  if (!isShowAnswer.value) return isSelected ? 'is-selected-locked' : 'is-disabled-faded';

  const correctAns = store.scoreResult?.details?.[String(props.question.id)]?.correctAnswer || props.question.correctAnswer;
  const isCorrect = char === correctAns;

  if (isCorrect) return 'is-correct';
  if (isSelected && !isCorrect) return 'is-wrong';
  return 'is-disabled-faded';
};

const handleTextInput = (e: Event) => {
  if (store.isSubmitted) return;
  const val = (e.target as HTMLInputElement).value;
  store.saveAnswer(String(props.question.id), val);
};

const getTextInputClass = () => {
  if (!store.isSubmitted) return '';
  if (!isShowAnswer.value) return 'is-locked';
  return isCorrectResult.value ? 'is-correct-input' : 'is-wrong-input';
};

const shuffledMatchingRights = ref<string[]>([]);
watch(() => props.question.pairs, (pairs) => {
  if (pairs && pairs.length > 0) {
    const rights = pairs.map((p: any) => p.right).filter((r: string) => !!r);
    for (let i = rights.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rights[i], rights[j]] = [rights[j], rights[i]];
    }
    shuffledMatchingRights.value = rights;
  }
}, { immediate: true });

const getMatchingAnswer = (leftKey: string) => {
  const ansObj = store.userAnswers[String(props.question.id)];
  return (typeof ansObj === 'object' && ansObj !== null) ? ansObj[leftKey] : '';
};

const handleMatchingSelect = (leftKey: string, e: Event) => {
  if (store.isSubmitted) return;
  const val = (e.target as HTMLSelectElement).value;
  const currentObj = typeof store.userAnswers[String(props.question.id)] === 'object' 
    ? { ...store.userAnswers[String(props.question.id)] } 
    : {};
  currentObj[leftKey] = val;
  store.saveAnswer(String(props.question.id), currentObj);
};

const getMatchingClass = (leftKey: string, correctRight: string) => {
  if (!store.isSubmitted) return '';
  if (!isShowAnswer.value) return 'is-locked';
  
  const userAns = getMatchingAnswer(leftKey);
  if (!userAns) return 'is-wrong-input';
  return userAns === correctRight ? 'is-correct-input' : 'is-wrong-input';
};
</script>

<style scoped>
.question-item-student { 
  background: #ffffff; 
  padding: 24px; 
  border: 1px solid #cbd5e1; 
  border-radius: 12px; 
  margin-bottom: 16px; 
  scroll-margin-top: 100px; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.question-item-student:last-child { margin-bottom: 0; }

.q-header { display: flex; gap: 10px; font-size: 1.05rem; color: #0f172a; margin-bottom: 16px; line-height: 1.5; }
.q-number { font-weight: 800; white-space: nowrap; font-size: 1.1rem;}
.q-text { font-weight: 500; word-wrap: break-word;}
:deep(.q-text p) { margin: 0; display: inline; }

.unanswered-notice {
  margin-bottom: 14px;
  padding-left: 12px;
}
.notice-text {
  display: inline-block;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fee2e2;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
}

.options-grid { display: flex; flex-direction: column; gap: 10px; padding-left: 12px;}
.option-label { display: flex; align-items: flex-start; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: #f8fafc; }
.hidden-radio { position: absolute; opacity: 0; height: 0; width: 0; }

.opt-char { display: flex; justify-content: center; align-items: center; width: 28px; height: 28px; border-radius: 50%; border: 1px solid #cbd5e1; background: #ffffff; color: #64748b; font-weight: 700; font-size: 0.9rem; margin-right: 12px; transition: all 0.2s; flex-shrink: 0; margin-top: 2px;}
.opt-text { font-size: 1rem; color: #1e293b; flex: 1; line-height: 1.5; word-wrap: break-word;}
:deep(.opt-text p) { margin: 0; display: inline; }

.option-label:hover:not(.is-disabled):not(.is-disabled-faded) { border-color: #cbd5e1; background: #ffffff; }
.option-label.is-selected { border-color: #3b82f6; background: #eff6ff; }
.option-label.is-selected .opt-char { background: #3b82f6; color: white; border-color: #3b82f6; }

.option-label.is-selected-locked { border-color: #94a3b8; background: #f1f5f9; cursor: default; }
.option-label.is-selected-locked .opt-char { background: #64748b; color: white; border-color: #64748b;}

.option-label.is-correct { border-color: #22c55e; background: #f0fdf4; cursor: default; }
.option-label.is-correct .opt-char { background: #22c55e; color: white; border-color: #22c55e;}

.option-label.is-wrong { border-color: #ef4444; background: #fef2f2; cursor: default; }
.option-label.is-wrong .opt-char { background: #ef4444; color: white; border-color: #ef4444;}

.option-label.is-disabled-faded { opacity: 0.5; cursor: default; border-color: #e2e8f0; }

.text-input-wrapper { display: flex; flex-direction: column; gap: 8px; max-width: 400px; padding-left: 12px;}
.q-text-input { padding: 10px 16px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 1rem; color: #0f172a; outline: none; transition: 0.2s; }
.q-text-input:focus:not(:disabled) { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.q-text-input:disabled { background: #f8fafc; color: #475569; }
.is-correct-input { border-color: #22c55e !important; background: #ecfdf5 !important; color: #15803d !important; font-weight: bold;}
.is-wrong-input { border-color: #ef4444 !important; background: #fef2f2 !important; color: #b91c1c !important; text-decoration: line-through;}
.correct-badge { font-size: 0.9rem; color: #15803d; background: #dcfce7; padding: 6px 12px; border-radius: 6px; display: inline-block; align-self: flex-start; }

.matching-wrapper { display: flex; flex-direction: column; gap: 12px; padding-left: 12px;}
.text-muted { color: #64748b; font-size: 0.9rem; margin: 0 0 8px 0; }
.match-row { display: flex; align-items: center; gap: 16px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
.match-left { flex: 1; font-weight: 600; color: #334155; }
.match-right { flex: 1; }
.match-select { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 0.95rem; cursor: pointer; color: #1e293b;}
.match-select:disabled { cursor: default; background: #f1f5f9; }

.q-explanation { margin-top: 20px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 0 8px 8px 0; padding: 12px 16px; }
.exp-title { font-weight: 700; color: #166534; margin-bottom: 6px; font-size: 0.95rem; }
.exp-content { color: #334155; font-size: 0.95rem; line-height: 1.6; }
</style>