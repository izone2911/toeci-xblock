<template lang="pug">
.student-layout
  //- ==========================================
  //- 🔥 MODAL KICK (ĐĂNG NHẬP NƠI KHÁC)
  //- ==========================================
  .modal-overlay.kick-overlay(v-if="store.isKickedOut")
    .custom-modal
      .modal-icon-large ⚠️
      h3.modal-title Cảnh báo bảo mật
      p.modal-message Tài khoản của bạn vừa được đăng nhập trên một thiết bị/trình duyệt khác. Để bảo đảm an toàn và tính công bằng, phiên làm bài trên thiết bị này đã bị buộc dừng.
      .modal-actions
        button.btn-confirm.w-100(@click="emit('return-landing')") Quay về màn hình chính

  //- ==========================================
  //- MODAL CHỐNG GIAN LẬN AUDIO
  //- ==========================================
  .modal-overlay(v-if="showAudioWarningModal && !store.isKickedOut")
    .custom-modal
      .modal-icon-large 🚫
      h3.modal-title Cảnh báo
      p.modal-message Bài thi này không cho phép tua âm thanh (cả tiến và lùi). Vui lòng nghe tuần tự để đảm bảo tính công bằng.
      .modal-actions
        button.btn-confirm.w-100(@click="showAudioWarningModal = false") Đã hiểu

  //- ==========================================
  //- MODAL XÁC NHẬN NỘP BÀI
  //- ==========================================
  .modal-overlay(v-if="showSubmitModal && !store.isKickedOut")
    .custom-modal
      h3.modal-title Xác nhận nộp bài
      p.modal-message Bạn đã hoàn thành <b>{{ answeredCount }} / {{ totalQuestionsCount }}</b> câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
      .modal-actions.equal-btns
        button.btn-cancel(@click="showSubmitModal = false") Tiếp tục
        button.btn-confirm(@click="executeSubmit") Nộp bài

  //- ==========================================
  //- MODAL THÔNG BÁO HẾT GIỜ TỰ ĐỘNG
  //- ==========================================
  .modal-overlay(v-if="showTimeoutModal && !store.isKickedOut")
    .custom-modal
      h3.modal-title Hết giờ làm bài
      p.modal-message Thời gian làm bài của bạn đã kết thúc. Hệ thống đã tự động thu bài và lưu lại kết quả.
      .modal-actions
        button.btn-confirm.w-100(@click="handleTimeoutConfirm") Xác nhận & Về sảnh chờ

  //- ==========================================
  //- CỘT TRÁI: SIDEBAR ĐIỀU HƯỚNG BÀI THI
  //- ==========================================
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
            span.score-label Listening:
            span.score-value {{ listeningScore.correct }} / {{ listeningScore.total }}
          .score-row
            span.score-label Reading:
            span.score-value {{ readingScore.correct }} / {{ readingScore.total }}
        template(v-else)
          .score-row
            span.score-label Tổng điểm:
            span.score-value {{ customScore.correct }} / {{ customScore.total }}

    .tree-view
      .part-group(v-for="(part, pIndex) in displayedParts" :key="part.id || pIndex")
        template(v-if="part.questions && part.questions.length > 0")
          .part-header(
            :class="{ active: localActivePartIndex === pIndex }" 
            @click="jumpToPart(pIndex)"
          )
            span.part-name {{ builderMode === 'custom' ? part.title : 'Part ' + (pIndex + 1) }}
            span.badge {{ part.questions.length }}
          
          .sub-questions
            .sub-q-item(
              v-for="(q, index) in part.questions" 
              :key="q.id"
              :class="getQuestionStatusClass(q)"
              @click="scrollToQuestion(q.id, pIndex)"
            )
              span {{ getGlobalNumber(pIndex, index) }}

    .sidebar-footer
      button.btn-submit-large(v-if="!store.isSubmitted" @click="showSubmitModal = true") NỘP BÀI
      button.btn-review-large(v-else @click="emit('return-landing')") VỀ SẢNH CHỜ

  //- ==========================================
  //- CỘT PHẢI: WORKSPACE RENDER BÀI LÀM CHÍNH
  //- ==========================================
  main.workspace
    //- ENGINE AUDIO CUSTOM SỬ DỤNG THANH TUA GIẢ KHÔNG BỊ LỆCH LAYOUT
    .global-audio-bar(v-if="currentAudioUrl")
      .global-audio-content
        .audio-controls
          .player-wrapper.custom-player-engine
            //- Core Audio logic ẩn hoàn toàn khỏi hiển thị mặc định của trình duyệt
            audio(
              ref="audioRef"
              :src="currentAudioUrl"
              style="display: none"
              @play="isAudioPlaying = true"
              @pause="isAudioPlaying = false"
              @timeupdate="handleGlobalAudioTimeUpdate"
              @loadedmetadata="restoreGlobalAudioProgress"
              @seeking="handleGlobalAudioSeeking"
            )
            
            //- Nút Phát/Tạm dừng Custom
            button.btn-audio-control(@click="toggleAudioPlay" type="button" :title="isAudioPlaying ? 'Tạm dừng' : 'Phát'")
              span.icon-state(v-if="isAudioPlaying") ⏸️
              span.icon-state(v-else) ▶️
              
            span.audio-time-txt {{ formatAudioTime(audioCurrentTime) }}
            
            //- Thanh tua thông minh (Nếu khóa tua sẽ tự động kích hoạt pointer-events: none)
            .audio-timeline-track(
              :class="{ 'is-locked-fake': !displayedExamSettings?.isAudioSeekEnabled }"
              @click="handleTimelineClick"
            )
              .audio-timeline-fill(:style="{ width: audioProgressPercent + '%' }")
              .audio-timeline-bullet(v-if="displayedExamSettings?.isAudioSeekEnabled" :style="{ left: audioProgressPercent + '%' }")
              
            span.audio-time-txt {{ formatAudioTime(audioDuration) }}

    .editor-area(ref="editorAreaRef" @scroll="handleScroll")
      .exam-zoom-wrapper
        div.render-container(v-if="displayedCurrentPart?.questions && displayedCurrentPart.questions.length > 0")
          
          QuestionBoardStudent(
            :partData="displayedCurrentPart"
            :startNumber="currentPartStartNumber"
            @audio-violation="showAudioWarningModal = true"
          )
        
        div.empty-state(v-else)
          h4 Phần thi này chưa có dữ liệu câu hỏi.

    .floating-nav-corners
      button.btn-nav-corner(
        :disabled="localActivePartIndex <= 0"
        @click="prevPart" 
        title="Quay lại"
      ) &laquo;
      
      button.btn-nav-corner(
        :disabled="localActivePartIndex >= displayedParts.length - 1"
        @click="nextPart" 
        title="Tiếp theo"
      ) &raquo;
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useExamStore } from '../../store/examStore';
import QuestionBoardStudent from '../../components/modules/QuestionBoardStudent.vue';

const emit = defineEmits(['return-landing']);
const store = useExamStore();

const showSubmitModal = ref(false);
const showTimeoutModal = ref(false);
const showAudioWarningModal = ref(false);

const audioRef = ref<HTMLAudioElement | null>(null);
const localActivePartIndex = ref(0);
const activeQuestionId = ref<string | null>(null);

// Trạng thái Engine Audio Custom
const isAudioPlaying = ref(false);
const audioCurrentTime = ref(0);
const audioDuration = ref(0);
const globalLastAudioTime = ref(0);

// Khi người dùng bị đá, buộc phải dừng mọi audio đang phát
watch(() => store.isKickedOut, (isKicked) => {
  if (isKicked && audioRef.value) {
    audioRef.value.pause();
  }
});

// ==========================================
// THUẬT TOÁN ĐIỀU KHIỂN ENGINE AUDIO CUSTOM
// ==========================================
const toggleAudioPlay = () => {
  if (!audioRef.value || store.isKickedOut) return;
  if (isAudioPlaying.value) {
    audioRef.value.pause();
  } else {
    audioRef.value.play().catch(err => console.warn("Trình duyệt chặn autoplay tự phát:", err));
  }
};

const handleGlobalAudioTimeUpdate = (e: Event) => {
  const audio = e.target as HTMLAudioElement;
  if (!audio.seeking) {
    audioCurrentTime.value = audio.currentTime;
    globalLastAudioTime.value = audio.currentTime;
    store.saveAudioProgress(currentAudioUrl.value || 'global', audio.currentTime);
  }
};

const handleGlobalAudioSeeking = (e: Event) => {
  if (!displayedExamSettings.value?.isAudioSeekEnabled) {
    const audio = e.target as HTMLAudioElement;
    const delta = Math.abs(audio.currentTime - globalLastAudioTime.value);
    if (delta > 1) {
      audio.currentTime = globalLastAudioTime.value; 
      showAudioWarningModal.value = true;
    }
  }
};

const restoreGlobalAudioProgress = (e: Event) => {
  const audio = e.target as HTMLAudioElement;
  audioDuration.value = audio.duration || 0;
  const savedProgress = store.getAudioProgress(currentAudioUrl.value || 'global');
  
  if (savedProgress > 0 && Math.abs(audio.currentTime - savedProgress) > 1) {
    globalLastAudioTime.value = savedProgress;
    audio.currentTime = savedProgress;
    audioCurrentTime.value = savedProgress;
  }
};

const audioProgressPercent = computed(() => {
  if (!audioDuration.value) return 0;
  return (audioCurrentTime.value / audioDuration.value) * 100;
});

const formatAudioTime = (seconds: number) => {
  if (isNaN(seconds) || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const handleTimelineClick = (e: MouseEvent) => {
  if (!displayedExamSettings.value?.isAudioSeekEnabled || !audioRef.value || !audioDuration.value || store.isKickedOut) return;
  const container = e.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  const clickPercent = (e.clientX - rect.left) / rect.width;
  audioRef.value.currentTime = clickPercent * audioDuration.value;
};

// ==========================================
// ĐỒNG BỘ TRẠNG THÁI VÀ DỮ LIỆU TỪ STORE
// ==========================================
const builderMode = computed(() => store.examDataRaw?.builderMode || 'traditional');
const displayedParts = computed(() => store.parts || []);
const displayedCurrentPart = computed(() => displayedParts.value[localActivePartIndex.value] || null);
const displayedExamSettings = computed(() => store.examSettings || {});

const totalQuestionsCount = computed(() => store.totalQuestions);
const answeredCount = computed(() => store.answeredCount);

const currentAudioUrl = computed(() => {
  if (builderMode.value === 'custom') return displayedExamSettings.value?.globalListeningAudio || null;
  return localActivePartIndex.value <= 3 ? displayedExamSettings.value?.globalListeningAudio || store.audioUrl : null;
});

const audioControlsList = computed(() => {
  return displayedExamSettings.value?.isAudioSeekEnabled ? "nodownload" : "nodownload noplaybackrate nofullscreen timeline-hidden";
});

watch(() => displayedParts.value, (parts) => {
  if (parts && parts.length > 0) {
    const firstValidPartIndex = parts.findIndex(p => p.questions && p.questions.length > 0);
    if (firstValidPartIndex !== -1 && localActivePartIndex.value === 0) {
      localActivePartIndex.value = firstValidPartIndex;
      const firstQ = parts[firstValidPartIndex].questions[0];
      if (firstQ && !activeQuestionId.value) {
        activeQuestionId.value = String(firstQ.id);
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

watch(() => store.isSubmitted, (isNowSubmitted) => {
  if (isNowSubmitted) {
    if (audioRef.value) audioRef.value.pause();
    if (store.timeRemaining <= 0 && displayedExamSettings.value?.isTimeLimitEnabled !== false) {
      showTimeoutModal.value = true;
      showSubmitModal.value = false;
    }
  }
});

const jumpToPart = (index: number) => { localActivePartIndex.value = index; };
const nextPart = () => { if (localActivePartIndex.value < displayedParts.value.length - 1) localActivePartIndex.value++; };
const prevPart = () => { if (localActivePartIndex.value > 0) localActivePartIndex.value--; };

const listeningScore = computed(() => {
  let correct = 0, total = 0;
  for (let i = 0; i <= 3; i++) {
    const part = displayedParts.value[i];
    if (part && part.questions) {
      part.questions.forEach((q: any) => { 
        total++; 
        if (store.scoreResult?.details?.[q.id]?.isCorrect) correct++; 
      });
    }
  }
  return { correct, total };
});

const readingScore = computed(() => {
  let correct = 0, total = 0;
  for (let i = 4; i <= 6; i++) {
    const part = displayedParts.value[i];
    if (part && part.questions) {
      part.questions.forEach((q: any) => { 
        total++; 
        if (store.scoreResult?.details?.[q.id]?.isCorrect) correct++; 
      });
    }
  }
  return { correct, total };
});

const customScore = computed(() => {
  let correct = 0, total = 0;
  displayedParts.value.forEach((part: any) => {
    if (part && part.questions) {
      part.questions.forEach((q: any) => { 
        const point = (q.scoreEnabled && !isNaN(q.score)) ? Number(q.score) : 1;
        total += point; 
        if (store.scoreResult?.details?.[q.id]?.isCorrect) correct += point;
      });
    }
  });
  return { correct: Math.round(correct * 100) / 100, total: Math.round(total * 100) / 100 };
});

const getGlobalNumber = (pIndex: number, localIndex: number) => {
  let count = 0;
  for (let i = 0; i < pIndex; i++) { count += (displayedParts.value[i]?.questions?.length || 0); }
  return count + localIndex + 1;
};

const currentPartStartNumber = computed(() => {
  let count = 0;
  for (let i = 0; i < localActivePartIndex.value; i++) { count += (displayedParts.value[i]?.questions?.length || 0); }
  return count + 1;
});

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

const editorAreaRef = ref<HTMLElement | null>(null);
let isAutoScrolling = false;
let scrollTimeout: any = null;

const scrollToQuestion = async (qId: string, targetPartIndex: number) => {
  isAutoScrolling = true;
  if (localActivePartIndex.value !== targetPartIndex) jumpToPart(targetPartIndex);
  
  activeQuestionId.value = qId;
  await nextTick();

  setTimeout(() => {
    const el = document.getElementById(`question-${qId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('pulse-highlight');
      setTimeout(() => el.classList.remove('pulse-highlight'), 1500);
    }
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => { isAutoScrolling = false; }, 800);
  }, 50);
};

const handleScroll = () => {
  if (isAutoScrolling || !editorAreaRef.value) return;
  const container = editorAreaRef.value;
  const questionEls = Array.from(container.querySelectorAll('[id^="question-"]'));
  if (!questionEls.length) return;
  
  const containerRect = container.getBoundingClientRect();
  let closestId = activeQuestionId.value;
  let minDistance = Infinity;

  questionEls.forEach((el: any) => {
    const rect = el.getBoundingClientRect();
    const distance = Math.abs(rect.top - containerRect.top - 150);
    if (distance < minDistance) {
      minDistance = distance;
      closestId = el.id.replace('question-', '');
    }
  });

  if (closestId && closestId !== activeQuestionId.value) activeQuestionId.value = closestId;
};

const executeSubmit = async () => {
  showSubmitModal.value = false;
  await store.submitExam(); 
  emit('return-landing');
};

const handleTimeoutConfirm = () => {
  showTimeoutModal.value = false;
  emit('return-landing');
};
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

/* WORKSPACE & PREMIUM PLAYER ENGINE STYLE */
.workspace { flex: 1; display: flex; flex-direction: column; position: relative; min-width: 0;}
.editor-area { flex: 1; padding: 32px; overflow-y: auto; scroll-behavior: smooth; position: relative; padding-bottom: 100px;}
.exam-zoom-wrapper { max-width: 1200px; margin: 0 auto; transform-origin: top center; }

/* THÀNH PHẦN AUDIO DESIGN KIỂU SPOTIFY SANG TRỌNG */
.global-audio-bar { background: #1e293b; border-bottom: 1px solid #0f172a; padding: 16px 32px; z-index: 9; flex-shrink: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.15);}
.global-audio-content { display: flex; align-items: center; justify-content: center; }
.audio-controls { width: 100%; display: flex; justify-content: center; }

.custom-player-engine { 
  display: flex; align-items: center; gap: 16px; background: #ffffff; 
  padding: 0 20px; border-radius: 50px; border: none; 
  box-shadow: 0 0 0 4px rgba(255,255,255,0.1); width: 100%; max-width: 600px; height: 48px;
}
.btn-audio-control { background: transparent; border: none; font-size: 1.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; width: 32px; height: 32px;}
.audio-time-txt { font-size: 0.85rem; color: #475569; font-family: monospace; font-weight: 700; user-select: none; flex-shrink: 0;}

/* THANH TRACK CHÍNH */
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

/* TRẠNG THÁI KHÓA CHỐNG TUA - BIẾN THÀNH THANH GIẢ */
.audio-timeline-track.is-locked-fake { cursor: default; pointer-events: none; }
.audio-timeline-track.is-locked-fake .audio-timeline-fill { background: #94a3b8; }

.empty-state { text-align: center; color: #94a3b8; padding: 60px 0; }
.floating-nav-corners { position: absolute; bottom: 0; left: 0; right: 0; pointer-events: none; padding: 24px 32px; display: flex; justify-content: space-between; z-index: 20; }
.btn-nav-corner { pointer-events: auto; width: 44px; height: 44px; border-radius: 50%; border: none; font-weight: bold; font-size: 1.5rem; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 10px rgba(59,130,246,0.3); display: flex; align-items: center; justify-content: center; background: #3b82f6; color: white; line-height: 1; padding-bottom: 3px;}
.btn-nav-corner:hover:not(:disabled) { background: #2563eb; box-shadow: 0 6px 15px rgba(59,130,246,0.4); transform: translateY(-3px) scale(1.05);}
.btn-nav-corner:disabled { opacity: 0.4; cursor: not-allowed; background: #94a3b8; box-shadow: none; transform: none; }

:deep(.pulse-highlight) { animation: highlightGlow 1.5s ease-out; position: relative; z-index: 10; }
@keyframes highlightGlow { 
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4), inset 0 0 6px rgba(59, 130, 246, 0.4); border-color: #3b82f6; } 
  100% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0), inset 0 0 6px rgba(59, 130, 246, 0); border-color: #e2e8f0; } 
}

/* MODALS */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(2px); }
.custom-modal { background: white; width: 420px; padding: 32px 24px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); text-align: center;}
.modal-icon-large { font-size: 3rem; margin-bottom: 16px; }
.modal-title { margin: 0 0 16px 0; color: #0f172a; font-size: 1.3rem; font-weight: 700; text-transform: uppercase; }
.modal-message { margin: 0 0 24px 0; color: #475569; font-size: 1rem; line-height: 1.6; }
.modal-actions { display: flex; justify-content: center; gap: 12px; }
.modal-actions.equal-btns { width: 100%; display: flex; }
.modal-actions.equal-btns button { flex: 1; }
.btn-cancel { padding: 12px 20px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: 0.2s;}
.btn-cancel:hover { background: #f1f5f9; }
.btn-confirm { padding: 12px 20px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: 0.2s;}
.btn-confirm:hover { background: #2563eb; }
.w-100 { width: 100%; }

/* 🔥 CSS CHO MODAL ĐÁ VĂNG (KICK) */
.kick-overlay {
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(8px);
}
.kick-overlay .custom-modal {
  border: 2px solid #ef4444;
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);
}
.kick-overlay .modal-title {
  color: #ef4444;
}
</style>