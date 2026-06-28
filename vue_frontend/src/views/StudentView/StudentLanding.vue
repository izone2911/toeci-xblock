<template lang="pug">
.landing-wrapper
  // ==========================================
  // KHU VỰC CHỌN CHỨC NĂNG
  // ==========================================
  .landing-container
    .header-section
      h1.page-title Chào mừng!
      //- p.page-subtitle Hôm nay bạn muốn tập trung vào kỹ năng nào?

    .cards-grid
      // THẺ 1: BÀI TẬP / THI THỬ
      .feature-card.exam-card(
        :class="examCardClasses"
        @click="handleExamClick"
      )
        .card-icon {{ examCardState.icon }}
        .card-content
          h3 {{ examCardState.title }}
          p {{ examCardState.desc }}
          
        .card-action
          span.action-text(v-if="examCardState.action") {{ examCardState.action }}
          span.card-arrow(v-if="examCardState.action") &rarr;

      // THẺ 2: TỪ VỰNG / FLASHCARD
      .feature-card.flashcard-card(
        :class="{ 'is-disabled': isVocabLocked }"
        @click="handleFlashcardClick"
      )
        .card-icon 📚
        .card-content
          h3 Từ Vựng
          p Ôn tập từ vựng với các thẻ Flashcard.
        
        .card-action
          span.action-text.text-success(v-if="!isVocabLocked") Xem ngay
          span.action-text.text-danger(v-else) Đang khóa
          span.card-arrow &rarr;

  // ==========================================
  // MODAL XÁC NHẬN BÀI THI TÍNH GIỜ
  // ==========================================
  .modal-overlay(v-if="showTimerWarning")
    .custom-modal
      .modal-icon-large ⏳
      h3.modal-title Bài thi tính giờ
      p.modal-message Bài tập này được giới hạn thời gian làm bài là <b>{{ formattedTimeLimit }}</b>. Khi bạn bấm bắt đầu, thời gian sẽ được tính và không thể tạm dừng. Bạn đã sẵn sàng chưa?
      .modal-actions
        button.btn-cancel(@click="showTimerWarning = false") Quay lại
        button.btn-confirm(@click="startExam") Bắt đầu

  // ==========================================
  // MODAL CHẶN XEM KẾT QUẢ
  // ==========================================
  .modal-overlay(v-if="showBlockedModal")
    .custom-modal
      .modal-icon-large 🔒
      h3.modal-title Không thể xem lại
      p.modal-message Bạn đã hoàn thành bài làm. Bài tập này không cho phép xem lại.
      .modal-actions
        button.btn-confirm.w-100(@click="showBlockedModal = false") Đã hiểu
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useExamStore } from '../../store/examStore';

const emit = defineEmits(['enter-exam', 'enter-flashcard']);
const store = useExamStore();

const showTimerWarning = ref(false);
const showBlockedModal = ref(false);

// ==========================================
// ĐỒNG BỘ DỮ LIỆU TỪ STORE (SẠCH & TỐI ƯU)
// ==========================================
// Dữ liệu đã được nạp sẵn từ main.js -> examStore.ts, không cần fetch lại
const activeSettings = computed(() => store.examSettings || {});

// Đọc thời gian (Bắt buộc phải có cờ TRUE mới trả về số giây)
const getInitialTimeLimit = () => {
  const settings = activeSettings.value;
  if (settings?.isTimeLimitEnabled !== true) return 0; // Chốt chặn an toàn tuyệt đối
  return settings?.timeLimitSeconds || store.timeRemaining || 0;
};

const formattedTimeLimit = computed(() => {
  const totalSeconds = getInitialTimeLimit();
  if (totalSeconds === 0) return 'Không giới hạn';
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes} phút`;
});

// Tính toán trạng thái UI theo Settings
const examCardState = computed(() => {
  if (store.isLoading) {
    return { title: 'Đang tải...', desc: 'Vui lòng chờ trong giây lát.', icon: '⏳', action: '' };
  }
  if (store.isSubmitted) {
    const settings = activeSettings.value;
    if (settings?.isShowAnswerEnabled === false) {
      return { title: 'Đã nộp bài', desc: 'Hoàn thành. Bài tập này không cho phép xem lại kết quả chi tiết.', icon: '🔒', action: '' };
    }
    return { title: 'Xem kết quả', desc: 'Bạn đã hoàn thành bài thi này. Nhấn vào để xem điểm và chi tiết bài làm.', icon: '📊', action: 'Xem chi tiết' };
  }
  if (store.hasStarted) {
    return { title: 'Tiếp tục', desc: 'Bạn đang có một bài thi đang làm.', icon: '▶️', action: 'Tiếp tục' };
  }
  return { title: 'Bắt đầu', desc: 'Bạn có một bài kiểm tra. Ấn để bắt đầu', icon: '⏱️', action: 'Bắt đầu' };
});

const examCardClasses = computed(() => {
  const isAnswerHidden = activeSettings.value?.isShowAnswerEnabled === false;
  return {
    'is-loading': store.isLoading,
    'is-completed': store.isSubmitted && !isAnswerHidden,
    'is-locked': store.isSubmitted && isAnswerHidden,
    'is-ongoing': store.hasStarted && !store.isSubmitted
  };
});

// ==========================================
// THUẬT TOÁN KHÓA THẺ TỪ VỰNG
// ==========================================
const isVocabLocked = computed(() => {
  // 1. Nếu chưa bắt đầu làm bài, hoặc đã nộp bài rồi -> THẢ GA, KHÔNG KHÓA
  if (!store.hasStarted || store.isSubmitted) return false;
  
  // 2. Nếu đang làm bài dở -> CHỈ KHÓA NẾU BÀI ĐÓ BẬT TÍNH GIỜ
  const isTimedExam = activeSettings.value?.isTimeLimitEnabled === true;
  return isTimedExam;
});

// ==========================================
// XỬ LÝ SỰ KIỆN CLICK
// ==========================================
const handleExamClick = () => {
  if (store.isLoading) return;

  if (store.isSubmitted) {
    if (activeSettings.value?.isShowAnswerEnabled === false) {
      showBlockedModal.value = true;
      return;
    }
    emit('enter-exam');
    return;
  }

  const timeLimit = getInitialTimeLimit();

  // CHỈ HIỆN MODAL NẾU: Bài có tính giờ VÀ chưa từng bắt đầu
  if (timeLimit > 0 && !store.hasStarted) {
    showTimerWarning.value = true;
  } else {
    // Đang làm dở hoặc bài không tính giờ -> Vào thẳng
    startExam();
  }
};

const startExam = () => {
  showTimerWarning.value = false;
  const timeLimit = getInitialTimeLimit();
  
  if (timeLimit > 0 && !store.hasStarted) {
    store.startTimer();
  }
  
  emit('enter-exam');
};

const handleFlashcardClick = () => {
  // Nếu khóa thì cấm emit, nếu không khóa thì emit bình thường
  if (isVocabLocked.value) return; 
  emit('enter-flashcard');
};
</script>

<style scoped>
/* FIX: Thay min-height: 100vh thành min-height: 500px và height: 100% để an toàn trên edX */
.landing-wrapper { display: flex; align-items: center; justify-content: center; height: 100%; background-color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; padding: 24px; }
.landing-container { max-width: 800px; width: 100%; }
.header-section { text-align: center; margin-bottom: 48px; }
.page-title { font-size: 2.2rem; color: #0f172a; font-weight: 800; margin-bottom: 12px; }
.page-subtitle { font-size: 1.1rem; color: #64748b; }

/* LAYOUT THẺ */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
.feature-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); position: relative; overflow: hidden; }

.feature-card.is-loading { opacity: 0.6; cursor: wait; pointer-events: none; }

.feature-card:hover:not(.is-disabled):not(.is-loading) { transform: translateY(-6px); box-shadow: 0 12px 20px -5px rgba(59, 130, 246, 0.15); border-color: #3b82f6;}
.feature-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #3b82f6; transform: scaleX(0); transition: transform 0.3s ease; }
.feature-card:hover:not(.is-disabled):not(.is-loading)::before { transform: scaleX(1); }

/* MÀU SẮC ĐẶC TRƯNG THEO TRẠNG THÁI */
.feature-card.is-ongoing:hover:not(.is-disabled) { border-color: #f59e0b; box-shadow: 0 12px 20px -5px rgba(245, 158, 11, 0.15); }
.feature-card.is-ongoing::before { background: #f59e0b; }
.feature-card.is-ongoing .action-text { color: #f59e0b; }

.feature-card.is-completed:hover:not(.is-disabled) { border-color: #10b981; box-shadow: 0 12px 20px -5px rgba(16, 185, 129, 0.15); }
.feature-card.is-completed::before { background: #10b981; }
.feature-card.is-completed .action-text { color: #10b981; }

/* Trạng thái Bị Khóa kết quả */
.feature-card.is-locked:hover:not(.is-disabled) { border-color: #94a3b8; box-shadow: 0 12px 20px -5px rgba(148, 163, 184, 0.15); }
.feature-card.is-locked::before { background: #94a3b8; }

/* CSS trạng thái của Thẻ Flashcard */
.feature-card.flashcard-card::before { background: #10b981; }
.feature-card.flashcard-card .text-success { color: #10b981; }
.feature-card.flashcard-card .text-danger { color: #ef4444; }
.feature-card.flashcard-card:hover:not(.is-disabled) { border-color: #10b981; box-shadow: 0 12px 20px -5px rgba(16, 185, 129, 0.15); }

.card-icon { font-size: 3.5rem; margin-bottom: 20px; line-height: 1; }
.card-content h3 { font-size: 1.3rem; color: #0f172a; margin-bottom: 12px; font-weight: 700; }
.card-content p { color: #475569; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px; }

/* Khu vực Action Text & Arrow */
.card-action { margin-top: auto; display: flex; align-items: center; gap: 8px; justify-content: center; }
.action-text { font-weight: 600; font-size: 0.95rem; color: #3b82f6; transition: all 0.3s ease; opacity: 0.8; }
.card-arrow { font-size: 1.5rem; color: #94a3b8; transition: all 0.3s ease; }

.feature-card:hover:not(.is-disabled):not(.is-loading) .card-arrow { color: inherit; transform: translateX(6px); }
.feature-card:hover:not(.is-disabled):not(.is-loading) .action-text { opacity: 1; }

.flashcard-card.is-disabled { opacity: 0.5; cursor: not-allowed; background: #f1f5f9; }
.flashcard-card.is-disabled .card-arrow { opacity: 0; }

/* MODALS DESIGN CLEAN */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.custom-modal { background: white; width: 420px; padding: 32px 24px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); text-align: center;}
.modal-icon-large { font-size: 3rem; margin-bottom: 16px; }
.modal-title { margin: 0 0 12px 0; color: #0f172a; font-size: 1.3rem; font-weight: 700; }
.modal-message { margin: 0 0 24px 0; color: #475569; font-size: 1rem; line-height: 1.6; }
.modal-actions { display: flex; justify-content: center; gap: 12px; }
.btn-cancel { padding: 12px 24px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: 0.2s;}
.btn-cancel:hover { background: #f1f5f9; }
.btn-confirm { padding: 12px 24px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: 0.2s;}
.btn-confirm:hover { background: #2563eb; }
.w-100 { width: 100%; }
</style>