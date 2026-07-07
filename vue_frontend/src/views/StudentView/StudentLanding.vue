<template lang="pug">
.landing-wrapper

  .landing-container
    .header-section
      h1.page-title Sảnh chờ
      p.page-subtitle Chọn chức năng để tiếp tục

    .cards-grid
      .feature-card.exam-card(
        :class="examCardClasses"
        @click="handleExamClick"
      )
        .card-content
          h3 {{ examCardState.title }}
          p {{ examCardState.desc }}
          
        .card-action
          span.action-text(v-if="examCardState.action") {{ examCardState.action }}
          //- span.card-arrow(v-if="examCardState.action") &rarr;

      .feature-card.flashcard-card(
        :class="{ 'is-disabled': isVocabLocked }"
        @click="handleFlashcardClick"
      )
        .card-content
          h3 Từ vựng
          p Tạo thẻ ghi nhớ (Flashcard) để củng cố kiến thức.
        
        .card-action
          span.action-text.text-success(v-if="!isVocabLocked") Truy cập
          span.action-text.text-danger(v-else) Đang khóa
          span.card-arrow &rarr;


  .modal-overlay(v-if="showTimerWarning")
    .custom-modal
      h3.modal-title BÀI THI CÓ TÍNH GIỜ
      p.modal-message Bài tập này được thiết lập giới hạn thời gian làm bài là <b>{{ formattedTimeLimit }}</b>. Khi ấn xác nhận, đồng hồ đếm ngược sẽ bắt đầu và tiến trình làm bài không thể tạm dừng. Xác nhận truy cập?
      .modal-actions
        button.btn-cancel(@click="showTimerWarning = false") Hủy
        button.btn-confirm(@click="startExam") Xác nhận



  .modal-overlay(v-if="showBlockedModal")
    .custom-modal
      h3.modal-title Không xem được kết quả
      p.modal-message Thời gian làm bài của bạn đã kết thúc. Bài tập không cho phép xem lại chi tiết bài làm và đáp án.
      .modal-actions
        button.btn-confirm.w-100(@click="showBlockedModal = false") Đã hiểu
</template>

<script setup lang="ts">
import { useExamStore } from '../../store/examStore';
import { useStudentLanding } from '../../composables/useStudentLanding';

const emit = defineEmits(['enter-exam', 'enter-flashcard']);
const store = useExamStore();


const {
  showTimerWarning,
  showBlockedModal,
  formattedTimeLimit,
  examCardState,
  examCardClasses,
  isVocabLocked,
  handleExamClick,
  startExam,
  handleFlashcardClick
} = useStudentLanding(store, emit);

</script>

<style scoped>

.landing-wrapper { display: flex; align-items: center; justify-content: center; min-height: 500px; padding: 40px 24px; background-color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
.landing-container { max-width: 800px; width: 100%; margin: auto; }
.header-section { text-align: center; margin-bottom: 48px; }
.page-title { font-size: 2.2rem; color: #0f172a; font-weight: 800; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;}
.page-subtitle { font-size: 1.1rem; color: #64748b; font-weight: 500;}

.cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
.feature-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); position: relative; overflow: hidden; min-height: 220px;}

.feature-card.is-loading { opacity: 0.6; cursor: wait; pointer-events: none; }
.feature-card:hover:not(.is-disabled):not(.is-loading) { transform: translateY(-6px); box-shadow: 0 12px 20px -5px rgba(59, 130, 246, 0.15); border-color: #10b981;}
.feature-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #10b981; transform: scaleX(0); transition: transform 0.3s ease; }
.feature-card:hover:not(.is-disabled):not(.is-loading)::before { transform: scaleX(1); }

.feature-card.is-ongoing:hover:not(.is-disabled) { border-color: #f59e0b; box-shadow: 0 12px 20px -5px rgba(245, 158, 11, 0.15); }
.feature-card.is-ongoing::before { background: #f59e0b; }
.feature-card.is-ongoing .action-text { color: #f59e0b; }

.feature-card.is-completed:hover:not(.is-disabled) { border-color: #10b981; box-shadow: 0 12px 20px -5px rgba(16, 185, 129, 0.15); }
.feature-card.is-completed::before { background: #10b981; }
.feature-card.is-completed .action-text { color: #10b981; }

.feature-card.is-locked:hover:not(.is-disabled) { border-color: #94a3b8; box-shadow: 0 12px 20px -5px rgba(148, 163, 184, 0.15); }
.feature-card.is-locked::before { background: #94a3b8; }

.feature-card.flashcard-card::before { background: #10b981; }
.feature-card.flashcard-card .text-success { color: #10b981; }
.feature-card.flashcard-card .text-danger { color: #ef4444; }
.feature-card.flashcard-card:hover:not(.is-disabled) { border-color: #10b981; box-shadow: 0 12px 20px -5px rgba(16, 185, 129, 0.15); }

.card-content h3 { font-size: 1.35rem; color: #0f172a; margin-bottom: 16px; font-weight: 700; text-transform: uppercase;}
.card-content p { color: #475569; font-size: 1rem; line-height: 1.6; margin-bottom: 24px; }

.card-action { margin-top: auto; display: flex; align-items: center; gap: 8px; justify-content: center; }
.action-text { font-weight: 600; font-size: 1rem; color: #10b981 ; transition: all 0.3s ease; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;}
.card-arrow { font-size: 1.5rem; color: #94a3b8; transition: all 0.3s ease; }

.feature-card:hover:not(.is-disabled):not(.is-loading) .card-arrow { color: inherit; transform: translateX(6px); }
.feature-card:hover:not(.is-disabled):not(.is-loading) .action-text { opacity: 1; }

.flashcard-card.is-disabled { opacity: 0.5; cursor: not-allowed; background: #f1f5f9; }
.flashcard-card.is-disabled .card-arrow { opacity: 0; }

/* modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(2px); }
.custom-modal { background: white; width: 440px; padding: 32px 28px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); text-align: center;}
.modal-title { margin: 0 0 16px 0; color: #0f172a; font-size: 1.3rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.modal-message { margin: 0 0 24px 0; color: #475569; font-size: 1rem; line-height: 1.6; }
.modal-actions { display: flex; justify-content: center; gap: 12px; }
.btn-cancel { padding: 12px 24px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: 0.2s;}
.btn-cancel:hover { background: #f1f5f9; }
.btn-confirm { padding: 12px 24px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: 0.2s;}
.btn-confirm:hover { background: #2563eb; }
.w-100 { width: 100%; }
</style>