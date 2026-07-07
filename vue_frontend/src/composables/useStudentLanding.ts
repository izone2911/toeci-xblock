import { ref, computed } from 'vue';

export function useStudentLanding(store: any, emit: any) {
  const showTimerWarning = ref(false);
  const showBlockedModal = ref(false);

  const activeSettings = computed(() => store.examSettings || {});

  const getInitialTimeLimit = () => {
    const settings = activeSettings.value;
    if (settings?.isTimeLimitEnabled !== true) return 0; 
    return settings?.timeLimitSeconds || store.timeRemaining || 0;
  };

  // Tính toán và định dạng thời lượng làm bài
  const formattedTimeLimit = computed(() => {
    const totalSeconds = getInitialTimeLimit();
    if (totalSeconds === 0) return 'Không giới hạn';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (seconds > 0) return `${minutes} phút ${seconds} giây`;
    return `${minutes} phút`;
  });

  // 
  const examCardState = computed(() => {
    if (store.isLoading) {
      return { 
        title: 'Đang tải dữ liệu...', 
        desc: 'Vui lòng chờ', 
        action: '' 
      };
    }
    if (store.isSubmitted) {
      const settings = activeSettings.value;
      if (settings?.isShowAnswerEnabled === false) {
        return { 
          title: 'Đã nộp bài', 
          desc: 'Thời gian làm bài đã kết thúc', 
          action: '' 
        };
      }
      return { 
        title: 'Kết quả bài làm', 
        desc: 'Thời gian làm bài đã kết thúc. Nhấn vào để xem báo cáo điểm số và đáp án chi tiết', 
        action: 'Xem chi tiết' 
      };
    }
    if (store.hasStarted) {
      return { 
        title: 'Tiếp tục bài làm', 
        desc: 'Thời gian làm bài đang diễn ra. Nhấn để tiếp tục', 
        action: 'Tiếp tục' 
      };
    }
    return { 
      title: 'Bắt đầu bài thi', 
      desc: 'Nhấn vào để bắt đầu thi', 
      action: 'Bắt đầu' 
    };
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

  // Khóa Flashcard
  const isVocabLocked = computed(() => {
    if (!store.hasStarted || store.isSubmitted) return false;
    return true; 
  });

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
    if (timeLimit > 0 && !store.hasStarted) {
      showTimerWarning.value = true;
    } else {
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
    if (isVocabLocked.value) return; 
    emit('enter-flashcard');
  };

  return {
    showTimerWarning,
    showBlockedModal,
    formattedTimeLimit,
    examCardState,
    examCardClasses,
    isVocabLocked,
    handleExamClick,
    startExam,
    handleFlashcardClick
  };
}