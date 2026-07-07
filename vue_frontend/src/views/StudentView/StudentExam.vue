<template lang="pug">
.student-layout

  
  .modal-overlay.kick-overlay(v-if="store.isKickedOut")
    .custom-modal
      h3.modal-title CẢNH BÁO
      p.modal-message Tài khoản của bạn vừa được đăng nhập trên một thiết bị hoặc trình duyệt khác.
        button.btn-confirm.w-100(@click="emit('return-landing')") Quay về màn hình chính

  .modal-overlay(v-if="showAudioWarningModal && !store.isKickedOut")
    .custom-modal
      h3.modal-title CẢNH BÁO
      p.modal-message Bài thi này thiết lập cấu hình không cho phép tua âm thanh.
      .modal-actions
        button.btn-confirm.w-100(@click="showAudioWarningModal = false") Xác nhận

  .modal-overlay(v-if="showSubmitModal && !store.isKickedOut")
    .custom-modal
      h3.modal-title XÁC NHẬN NỘP BÀI
      p.modal-message Bạn đã hoàn thành bài làm <b>{{ store.answeredCount }} / {{ store.totalQuestions }}</b> câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
      .modal-actions.equal-btns
        button.btn-cancel(@click="showSubmitModal = false") Tiếp tục làm bài
        button.btn-confirm(@click="executeSubmit") Xác nhận nộp

  .modal-overlay(v-if="showTimeoutModal && !store.isKickedOut")
    .custom-modal
      h3.modal-title HẾT GIỜ LÀM BÀI
      p.modal-message Thời gian làm bài của bạn đã kết thúc.
      .modal-actions
        button.btn-confirm.w-100(@click="handleTimeoutConfirm") Xem kết quả



  aside.sidebar
    .sidebar-header
      .time-input-group(
        v-if="!store.isSubmitted && displayedExamSettings?.isTimeLimitEnabled !== false && displayedExamSettings?.timeLimitSeconds > 0" 
        :class="{ 'is-warning': store.timeRemaining <= 300 && store.timeRemaining > 0 }"
      )
        span.time-input {{ store.formattedTime }}
      
      .score-summary-group(v-if="store.isSubmitted && displayedExamSettings?.isShowAnswerEnabled !== false")
        template(v-if="builderMode === 'traditional'")
          .score-row
            span.score-label Phần nghe (Listening):
            span.score-value {{ listeningScore.correct }} / {{ listeningScore.total }}
          .score-row
            span.score-label Phần đọc (Reading):
            span.score-value {{ readingScore.correct }} / {{ readingScore.total }}
        template(v-else)
          .score-row
            span.score-label Tổng điểm kết quả:
            span.score-value {{ customScore.correct }} / {{ customScore.total }}

    .tree-view
      .part-group(v-for="(part, pIndex) in displayedParts" :key="part.id || pIndex")
        .part-header(
          :class="{ active: localActivePartIndex === pIndex }" 
          @click="jumpToPart(pIndex)"
        )
          span.part-name {{ builderMode === 'custom' ? (part.name || part.title || 'Phần ' + (pIndex + 1)) : 'Part ' + (pIndex + 1) }}
          span.badge {{ part.questions ? part.questions.length : 0 }}
        
        .sub-questions(v-if="part.questions && part.questions.length > 0")
          .sub-q-item(
            v-for="(q, index) in part.questions" 
            :key="q.id"
            :class="getQuestionStatusClass(q)"
            @click="scrollToQuestion(q.id, pIndex)"
          )
            span {{ getGlobalNumber(pIndex, index) }}

    .sidebar-footer
      button.btn-submit-large(v-if="!store.isSubmitted" @click="showSubmitModal = true") NỘP BÀI THI
      button.btn-review-large(v-else @click="emit('return-landing')") VỀ SẢNH CHỜ



  main.workspace
    .global-audio-bar(v-if="currentAudioUrl")
      .global-audio-content
        .audio-controls
          .player-wrapper.custom-player-engine

            audio(
              ref="audioRef"
              :key="currentAudioKey"
              :src="currentAudioUrl"
              style="display: none"
              @play="isAudioPlaying = true"
              @pause="isAudioPlaying = false"
              @timeupdate="handleGlobalAudioTimeUpdate"
              @loadedmetadata="restoreGlobalAudioProgress"
              @seeking="handleGlobalAudioSeeking"
            )
            
            button.btn-audio-control(@click="toggleAudioPlay" type="button" :title="isAudioPlaying ? 'Pause' : 'Resume'")
              span.icon-state(v-if="isAudioPlaying") ⏸️
              span.icon-state(v-else) ▶️
              
            span.audio-time-txt {{ formatAudioTime(audioCurrentTime) }}
            
            .audio-timeline-track(
              :class="{ 'is-locked-fake': !displayedExamSettings?.isAudioSeekEnabled }"
              @click="handleTimelineClick"
            )
              .audio-timeline-fill(:style="{ width: audioProgressPercent + '%' }")
              .audio-timeline-bullet(v-if="displayedExamSettings?.isAudioSeekEnabled" :style="{ left: audioProgressPercent + '%' }")
              
            span.audio-time-txt {{ formatAudioTime(audioDuration) }}

    .editor-area(ref="editorAreaRef" @scroll="handleScroll")
      .exam-zoom-wrapper
        .part-custom-intro-card(v-if="builderMode === 'custom' && displayedCurrentPart && displayedCurrentPart.sharedContext")
          //- .part-context-title Nội dung hướng dẫn chung: {{ displayedCurrentPart.name || displayedCurrentPart.title }}
          .part-context-body(v-html="displayedCurrentPart.sharedContext")

        .render-container(v-if="sanitizedPartDataForBoard")
          QuestionBoardStudent(
            :partData="sanitizedPartDataForBoard"
            :startNumber="currentPartStartNumber"
            @audio-violation="showAudioWarningModal = true"
          )
          
          .empty-state(v-if="!sanitizedPartDataForBoard.questions || sanitizedPartDataForBoard.questions.length === 0")
            h4 Phần thi này hiện chưa có câu hỏi.

    .navigation-action-bar
      button.btn-nav-edge(
        type="button" 
        :disabled="localActivePartIndex === 0" 
        @click="prevPart"
      ) <<
      button.btn-nav-edge(
        type="button" 
        :disabled="localActivePartIndex === displayedParts.length - 1" 
        @click="nextPart"
      ) >>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useExamStore } from '../../store/examStore';
import QuestionBoardStudent from '../../components/modules/QuestionBoardStudent.vue';

import { useStudentAudio } from '../../composables/useStudentAudio';
import { useStudentNavigation } from '../../composables/useStudentNavigation';
import { useStudentScoring } from '../../composables/useStudentScoring';

const emit = defineEmits(['return-landing', 'audio-violation']);
const store = useExamStore();

const showAudioWarningModal = ref(false);
const showSubmitModal = ref(false);
const showTimeoutModal = ref(false);

const builderMode = computed(() => store.builderMode || store.examDataRaw?.builderMode || 'traditional');
const displayedExamSettings = computed(() => store.examSettings || {});
const displayedParts = computed(() => store.parts || []);

const { 
  localActivePartIndex, 
  activeQuestionId, 
  displayedCurrentPart, 
  editorAreaRef, 
  jumpToPart, 
  nextPart, 
  prevPart, 
  getGlobalNumber, 
  currentPartStartNumber, 
  scrollToQuestion, 
  handleScroll 
} = useStudentNavigation(displayedParts);

const currentAudioUrl = computed(() => {
  if (builderMode.value === 'custom') {
    return displayedCurrentPart.value?.mediaUrl || '';
  }
  const partNum = localActivePartIndex.value + 1;
  return partNum <= 4 ? displayedExamSettings.value?.globalListeningAudio : '';
});

// lưu thời gian audio = key
const currentAudioKey = computed(() => {
  if (builderMode.value === 'custom' && displayedCurrentPart.value) {
    return `custom_part_${displayedCurrentPart.value.id}`;
  }
  return 'global_media';
});

const sanitizedPartDataForBoard = computed(() => {
  if (!displayedCurrentPart.value) return null;
  const clone = { ...displayedCurrentPart.value };
  if (builderMode.value === 'custom') {
    clone.mediaUrl = '';
    clone.sharedContext = '';
  }
  return clone;
});

const {
  audioRef,
  isAudioPlaying,
  audioCurrentTime,
  audioDuration,
  audioProgressPercent,
  toggleAudioPlay,
  handleGlobalAudioTimeUpdate,
  handleGlobalAudioSeeking,
  restoreGlobalAudioProgress,
  handleTimelineClick,
  formatAudioTime
} = useStudentAudio(
  store, 
  displayedExamSettings, 
  currentAudioUrl, 
  currentAudioKey, 
  (event) => {
    if (event === 'audio-violation') showAudioWarningModal.value = true;
    else emit(event);
  }
);

const { listeningScore, readingScore, customScore } = useStudentScoring(store, displayedParts);

const getQuestionStatusClass = (q: any) => {
  const qIdStr = String(q.id);
  const rawUserAns = store.userAnswers[qIdStr];
  
  let isSelected = false;
  if (typeof rawUserAns === 'object' && rawUserAns !== null && !rawUserAns.selectedAnswer) {
    isSelected = Object.values(rawUserAns).some(val => val !== '');
  } else {
    const userAnswer = typeof rawUserAns === 'object' ? rawUserAns?.selectedAnswer : rawUserAns;
    isSelected = !!userAnswer;
  }
  
  const isActive = String(activeQuestionId.value) === qIdStr;
  let classes = [];
  if (isActive) classes.push('is-active');

  if (!store.isSubmitted) {
    if (isSelected) classes.push('is-answered');
  } else {
    let isCorrect = store.scoreResult?.details?.[qIdStr]?.isCorrect || false;
    if (displayedExamSettings.value?.isShowAnswerEnabled === false) {
      if (isSelected) classes.push('is-answered');
    } else {
      if (isCorrect) classes.push('is-correct');
      else classes.push('is-wrong');
    }
  }
  return classes.join(' ');
};

watch(() => store.isSubmitted, (isNowSubmitted) => {
  if (isNowSubmitted) {
    if (audioRef.value) audioRef.value.pause();
    if (store.timeRemaining <= 0 && displayedExamSettings.value?.isTimeLimitEnabled !== false) {
      showTimeoutModal.value = true;
      showSubmitModal.value = false;
    }
  }
});

const executeSubmit = async () => {
  showSubmitModal.value = false;
  await store.submitExam(); 
  emit('return-landing');
};

const handleTimeoutConfirm = () => {
  showTimeoutModal.value = false;
  emit('return-landing');
};

watch(() => store.isLoading, (isLoading) => {
  if (!isLoading) {
    // khởi tạo dữ liệu
  }
}, { immediate: true });

watch(() => displayedParts.value, (parts) => {
  if (parts && parts.length > 0) {
    if (localActivePartIndex.value === 0 && activeQuestionId.value === null) {
      const firstPart = parts[0];
      if (firstPart && firstPart.questions && firstPart.questions.length > 0) {
        activeQuestionId.value = String(firstPart.questions[0].id);
      }
    }
  }
}, { immediate: true });

onMounted(() => {
  if (!displayedExamSettings.value?.isAudioSeekEnabled) {
    const style = document.createElement('style');
    style.innerHTML = `
      audio::-webkit-media-controls-timeline,
      audio::-webkit-media-controls-seek-back-button,
      audio::-webkit-media-controls-seek-forward-button {
          display: none !important;
      }
    `;
    document.head.appendChild(style);
  }
});

watch(() => store.isKickedOut, (isKicked) => {
  if (isKicked && audioRef.value) {
    audioRef.value.pause();
  }
});
</script>

<style scoped>
.student-layout { display: flex; min-height: 750px; height: 85vh; max-height: 900px; font-family: system-ui, -apple-system, sans-serif; background-color: #f1f5f9; overflow: hidden; border-radius: 8px; border: 1px solid #e2e8f0; }

.sidebar { width: 280px; flex-shrink: 0; background: #ffffff; color: #0f172a; display: flex; flex-direction: column; overflow-y: auto; border-right: 1px solid #e2e8f0;}
.sidebar-header { padding: 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 0; z-index: 10; }

.time-input-group { display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid #cbd5e1; transition: border-color 0.2s; }
.time-input-group.is-warning { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2); }
.time-input { background: transparent; border: none; color: #3b82f6; font-size: 1.25rem; width: 100%; outline: none; font-family: monospace; font-weight: bold; text-align: center; letter-spacing: 2px; }
.time-input-group.is-warning .time-input { color: #f87171; }

.score-summary-group { background: #f0fdf4; padding: 14px 16px; border-radius: 8px; border: 1px dashed #22c55e; display: flex; flex-direction: column; gap: 10px; }
.score-row { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 0.95rem; }
.score-label { color: #16a34a; }
.score-value { color: #15803d; font-size: 1.1rem; font-weight: 800;}

.tree-view { padding: 12px; flex: 1; overflow-y: auto;}
.part-group { margin-bottom: 4px; }
.part-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; border-radius: 6px; color: #475569; font-weight: 600; transition: all 0.2s; }
.part-header:hover { background: #f1f5f9; color: #0f172a; }
.part-header.active { background: #10b981; color: white; }
.part-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
.badge { background: rgba(0, 0, 0, 0.08); color: #475569; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; flex-shrink: 0; margin-left: auto;}
.part-header.active .badge { background: rgba(255, 255, 255, 0.25); color: white;}

.sub-questions { padding: 12px 16px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.sub-q-item { position: relative; aspect-ratio: 1 / 1; display: flex; justify-content: center; align-items: center; background: #ffffff; color: #475569; border-radius: 6px; font-size: 0.95rem; font-weight: 500; cursor: pointer; border: 1px solid #cbd5e1; transition: all 0.2s; }
.sub-q-item:hover { background: #f8fafc; }
.sub-q-item.is-answered { background: #3b82f6; color: white; border-color: #3b82f6; }
.sub-q-item.is-active { border: 2px solid #3b82f6; color: #0f172a; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.sub-q-item.is-answered.is-active { border: 2px solid #1e3a8a; color: white; }
.sub-q-item.is-correct { background: #10b981; color: white; border-color: #10b981; }
.sub-q-item.is-wrong { background: #ef4444; color: white; border-color: #ef4444; }
.sub-q-item.is-correct.is-active { border: 2px solid #064e3b; }
.sub-q-item.is-wrong.is-active { border: 2px solid #7f1d1d; }

.sidebar-footer { padding: 20px; background: #ffffff; border-top: 1px solid #e2e8f0; position: sticky; bottom: 0; z-index: 10;}
.btn-submit-large { width: 100%; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
.btn-submit-large:hover { background: #dc2626; }
.btn-review-large { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
.btn-review-large:hover { background: #2563eb; }

.workspace { flex: 1; padding: 0; position: relative; background: #f1f5f9; min-width: 0; display: flex; flex-direction: column; }
.editor-area { flex: 1; padding: 24px 32px 100px 32px; overflow-y: auto; scroll-behavior: smooth; position: relative; }
.exam-zoom-wrapper { max-width: 1200px; margin: 0 auto; transform-origin: top center; }

.global-audio-bar { background: #1e293b; border-bottom: 1px solid #0f172a; padding: 16px 32px; z-index: 9; flex-shrink: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
.global-audio-content { display: flex; align-items: center; justify-content: center; }
.audio-controls { width: 100%; display: flex; justify-content: center; }

.custom-player-engine { 
  display: flex; align-items: center; gap: 16px; background: #ffffff; 
  padding: 0 20px; border-radius: 50px; border: none; 
  box-shadow: 0 0 0 4px rgba(255,255,255,0.1); width: 100%; max-width: 600px; height: 48px;
}
.btn-audio-control { background: transparent; border: none; font-size: 1.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; width: 32px; height: 32px; transition: transform 0.2s; }
.btn-audio-control:hover { transform: scale(1.1); }
.audio-time-txt { font-size: 0.85rem; color: #475569; font-family: monospace; font-weight: 700; user-select: none; flex-shrink: 0;}

.audio-timeline-track { 
  flex: 1; height: 6px; background: #e2e8f0; border-radius: 10px; 
  position: relative; cursor: pointer; transition: height 0.2s;
}
.audio-timeline-track:hover:not(.is-locked-fake) { height: 8px; }
.audio-timeline-fill { height: 100%; background: #3b82f6; border-radius: 10px; width: 0%; }
.audio-timeline-bullet { 
  position: absolute; top: 50%; width: 12px; height: 12px; 
  background: #2563eb; border-radius: 50%; transform: translate(-50%, -50%); 
  box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: none;
}

.audio-timeline-track.is-locked-fake { cursor: default; pointer-events: none; }
.audio-timeline-track.is-locked-fake .audio-timeline-fill { background: #94a3b8; }

.part-custom-intro-card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #10b981;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  text-align: left;
}
.part-context-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}
.part-context-body {
  font-size: 1rem;
  color: #334155;
  line-height: 1.6;
}

.empty-state { text-align: center; color: #94a3b8; padding: 60px 0; }

.navigation-action-bar { position: absolute; bottom: 0; left: 0; right: 0; pointer-events: none; padding: 24px 32px; display: flex; justify-content: space-between; z-index: 20; }
.btn-nav-edge { pointer-events: auto; padding: 10px 20px; border-radius: 6px; border: none; font-weight: bold; font-size: 0.9rem; cursor: pointer; transition: all 0.2s ease-in-out; box-shadow: 0 4px 10px rgba(59,130,246,0.2); background: #3b82f6; color: white; }
.btn-nav-edge:hover:not(:disabled) { background: #2563eb; transform: translateY(-2px); }
.btn-nav-edge:disabled { opacity: 0.4; cursor: not-allowed; background: #94a3b8; box-shadow: none; transform: none; }

:deep(.pulse-highlight) { animation: highlightGlow 1.5s ease-out; position: relative; z-index: 10; }
@keyframes highlightGlow { 
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4), inset 0 0 6px rgba(59, 130, 246, 0.4); border-color: #3b82f6; } 
  100% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0), inset 0 0 6px rgba(59, 130, 246, 0); border-color: #e2e8f0; } 
}

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(2px); }
.custom-modal { background: white; width: 420px; padding: 32px 24px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); text-align: center;}
.modal-title { margin: 0 0 16px 0; color: #0f172a; font-size: 1.25rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.modal-message { margin: 0 0 24px 0; color: #475569; font-size: 0.95rem; line-height: 1.6; }
.modal-actions { display: flex; justify-content: center; gap: 12px; }
.modal-actions.equal-btns { width: 100%; display: flex; }
.modal-actions.equal-btns button { flex: 1; }
.btn-cancel { padding: 12px 20px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: 0.2s;}
.btn-cancel:hover { background: #f1f5f9; }
.btn-confirm { padding: 12px 20px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: 0.2s;}
.btn-confirm:hover { background: #2563eb; }
.w-100 { width: 100%; }

.kick-overlay { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); }
.kick-overlay .custom-modal { border: 2px solid #ef4444; box-shadow: 0 0 30px rgba(239, 68, 68, 0.3); }
.kick-overlay .modal-title { color: #ef4444; }
</style>