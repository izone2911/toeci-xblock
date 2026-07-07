/// <reference types="vite/client" />
import { defineStore } from 'pinia';

const getCsrfToken = () => {
  const match = document.cookie.match(new RegExp('(^| )csrftoken=([^;]+)'));
  return match ? match[2] : '';
};

const getEdxHeaders = () => ({
  'Content-Type': 'application/json',
  'X-CSRFToken': getCsrfToken()
});

export interface ExamProgress {
  answers: Record<string, any>;
  audioProgressMap: Record<string, number>; 
  isSubmitted: boolean;
  hasStarted: boolean;
  endTime: number | null;
  timeRemaining?: number;
  scoreResult?: any;
}

export const useExamStore = defineStore('exam', {
  state: () => ({
    edxConfig: {
      mode: 'student' as 'student' | 'teacher',
      getUrl: '',
      saveUrl: '',
      submitUrl: '',
      downloadUrl: '',
      heartbeatUrl: '' 
    },

    config: {
      examId: 'default' as string,
      mode: 'exam' as 'exam' | 'exercise',
      showScore: true,
      showReview: true,
      allowFlashcard: false,
      hasTimer: true
    },
    
    examSettings: {
      globalListeningAudio: '',
      isTimeLimitEnabled: false,
      isShowAnswerEnabled: true,
      isAudioSeekEnabled: false,
      timeLimitSeconds: 7200
    } as any,
    examDataRaw: {} as any, 
    builderMode: 'traditional' as 'traditional' | 'custom',
    
    saveStatus: 'idle' as 'idle' | 'saving' | 'success' | 'error',
    _debounceTimer: null as ReturnType<typeof setTimeout> | null,
    _audioSyncTimer: null as ReturnType<typeof setTimeout> | null, // 🔥 BỔ SUNG: Timer cho Audio
    _isSubscribed: false,
    
    audioProgressMap: {} as Record<string, number>, 
    
    parts: [] as any[],
    activePartIndex: 0,
    activeQuestionId: '' as string,
    
    userAnswers: {} as Record<string, any>, 
    timeRemaining: 0,
    endTime: null as number | null, 
    
    hasStarted: false,
    isRunning: false,
    timerInterval: null as ReturnType<typeof setInterval> | null,
    
    isLoading: true, 
    isSubmitted: false,
    scrollTrigger: 0,
    
    scoreResult: null as any,

    deviceToken: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
    heartbeatInterval: null as ReturnType<typeof setInterval> | null,
    isKickedOut: false
  }),
  
  getters: {
    currentPart: (state) => state.parts[state.activePartIndex] || { id: '', title: '', questions: [] },
    
    questionMap: (state) => {
      let map: any[] = [];
      (state.parts || []).forEach((part, pIdx) => {
        (part?.questions || []).forEach((q: any) => {
          map.push({ ...q, partIndex: pIdx });
        });
      });
      return map;
    },
    
    totalQuestions(): number { return this.questionMap.length; },
    
    correctAnswersCount: (state) => {
      return state.scoreResult?.correctCount || 0;
    },
    
    answeredCount: (state) => Object.keys(state.userAnswers).length,
    
    formattedTime: (state) => {
      if (state.timeRemaining == null || state.timeRemaining <= 0) return "00:00:00";
      const h = Math.floor(state.timeRemaining / 3600);
      const m = Math.floor((state.timeRemaining % 3600) / 60);
      const s = state.timeRemaining % 60;
      if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  },

  actions: {
    setEdxRuntime(config: any) {
      this.edxConfig = { ...this.edxConfig, ...config };
    },

    sanitizeExamData(rawData: any) {
      const sanitized = rawData ? { ...rawData } : {};
      for (let i = 1; i <= 7; i++) {
        sanitized[i] = Array.isArray(sanitized[i]) ? sanitized[i] : [];
      }
      sanitized.custom = Array.isArray(sanitized.custom) ? sanitized.custom : [];
      return sanitized;
    },

    async saveToEdx(payload: any) {
      if (this.edxConfig.saveUrl) {
        try {
          const res = await fetch(this.edxConfig.saveUrl, {
            method: 'POST',
            headers: getEdxHeaders(),
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error("Máy chủ từ chối tiếp nhận yêu cầu");
        } catch (error) {
          console.error("Lỗi đồng bộ cấu hình lên máy chủ edX:", error);
          throw error;
        }
      } else {
        console.info("Môi trường phát triển nội bộ: Tiến trình đã được lưu cục bộ.", payload);
      }
    },

    async initExam(examId: string = 'default') {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      
      this.hasStarted = false;
      this.isRunning = false;
      this.isSubmitted = false;
      this.userAnswers = {};
      this.audioProgressMap = {};
      this.scoreResult = null;
      this.endTime = null;
      this.isKickedOut = false; 

      this.isLoading = true;
      this.config.examId = examId;

      try {
        let rawData: any = null;

        if (this.edxConfig.getUrl) {
          const res = await fetch(this.edxConfig.getUrl, { 
            method: 'POST', 
            headers: getEdxHeaders(),
            body: JSON.stringify({}) 
          });
          
          if (!res.ok) {
            console.warn("Máy chủ chưa có dữ liệu. Sử dụng cấu trúc hệ thống rỗng.");
            rawData = {}; 
          } else {
            rawData = await res.json();
          }
          
          if (rawData.userAnswers && Object.keys(rawData.userAnswers).length > 0) {
            rawData.progress = {
              answers: rawData.userAnswers,
              isSubmitted: rawData.isSubmitted || false,
              hasStarted: true
            };
          }
        } else {
          const res = await fetch('/exam_data.json');
          if (!res.ok) throw new Error("Yêu cầu dữ liệu hệ thống cục bộ thất bại.");
          rawData = await res.json();
        }

        const draftKey = `xblock_exam_draft_${examId}`;
        const localDraft = localStorage.getItem(draftKey);
        
        if (localDraft) {
          try {
            const parsedDraft = JSON.parse(localDraft);
            if (!rawData.progress?.isSubmitted) {
              rawData.progress = parsedDraft;
            } else {
              localStorage.removeItem(draftKey);
            }
          } catch (e) {
            console.error("Lỗi giải mã cấu trúc dữ liệu nháp cục bộ:", e);
          }
        }

        const fetchedSettings = rawData.examSettings || {};
        this.examSettings = {
          globalListeningAudio: fetchedSettings.globalListeningAudio || '',
          isTimeLimitEnabled: !!fetchedSettings.isTimeLimitEnabled,
          isShowAnswerEnabled: fetchedSettings.isShowAnswerEnabled !== undefined ? !!fetchedSettings.isShowAnswerEnabled : true,
          isAudioSeekEnabled: !!fetchedSettings.isAudioSeekEnabled,
          timeLimitSeconds: Number(fetchedSettings.timeLimitSeconds) || 7200
        };

        this.builderMode = rawData.builderMode || 'traditional';
        this.examDataRaw = this.sanitizeExamData(rawData.examData); 

        const examDataMap = this.examDataRaw;

        if (this.builderMode === 'custom' && examDataMap.custom) {
          this.parts = examDataMap.custom.map((p: any) => ({
            id: p.id,
            title: p.name,
            mediaUrl: p.mediaUrl || '',
            sharedContext: p.sharedContext || '',
            questions: p.questions || []
          }));
        } else {
          const partTitles = [
            "Part 1: Photographs", "Part 2: Question-Response", "Part 3: Conversations", 
            "Part 4: Talks", "Part 5: Incomplete Sentences", "Part 6: Text Completion", "Part 7: Reading Comprehension"
          ];
          this.parts = [1, 2, 3, 4, 5, 6, 7].map((pNum, index) => ({
            id: `part_${pNum}`,
            title: partTitles[index],
            questions: examDataMap[pNum] || []
          }));
        }

        const progress = rawData.progress as ExamProgress | null;
        if (progress) {
          this.userAnswers = progress.answers || {};
          this.audioProgressMap = progress.audioProgressMap || {};
          
          this.isSubmitted = progress.isSubmitted || false;
          this.hasStarted = progress.hasStarted || false;
          this.endTime = progress.endTime || null;
          
          if (progress.timeRemaining !== undefined) {
            this.timeRemaining = progress.timeRemaining;
          } else {
            this.timeRemaining = this.examSettings.timeLimitSeconds || 0;
          }
          
          if (progress.scoreResult) {
            this.scoreResult = progress.scoreResult;
          }
        } else {
          this.timeRemaining = this.examSettings.timeLimitSeconds || 0;
        }

        if (this.config.mode === 'exam' && this.endTime && !this.isSubmitted) {
          this.timeRemaining = Math.max(0, Math.floor((this.endTime - Date.now()) / 1000));
        }

        if (this.questionMap.length > 0 && !this.activeQuestionId) {
          this.activeQuestionId = this.questionMap[0].id;
          this.activePartIndex = this.questionMap[0].partIndex;
        }
        
        if (!this.isSubmitted && this.config.hasTimer && this.hasStarted) {
          this.startTimer();
        }

        if (this.edxConfig.mode === 'student' && !this.isSubmitted) {
          this.startHeartbeat();
        }

      } catch (error) {
        console.error("Lỗi khi tải cấu hình đề thi:", error);
      } finally {
        this.isLoading = false;
      }
    },

    jumpToPart(index: number) {
      if (index >= 0 && index < this.parts.length) {
        this.activePartIndex = index;
      }
    },
    nextPart() {
      if (this.activePartIndex < this.parts.length - 1) this.activePartIndex++;
    },
    prevPart() {
      if (this.activePartIndex > 0) this.activePartIndex--;
    },
    jumpToQuestion(globalIndex: number) {
      const target = this.questionMap.find(q => q.globalIndex === globalIndex);
      if (target) {
        this.activePartIndex = target.partIndex;
        this.scrollTrigger++; 
      }
    },

    saveAnswer(questionId: string, answerData: any) {
      if (this.isSubmitted) return; 
      this.userAnswers[questionId] = answerData;
      this.syncProgressToBackend();
    },

    // 🔥 ĐÃ FIX: Áp dụng cơ chế Debounce tự lưu ngầm mượt mà, không phụ thuộc đồng hồ
    saveAudioProgress(url: string, time: number) {
      if (this.isSubmitted) return;
      const cleanUrl = url || 'global_media';
      
      this.audioProgressMap[cleanUrl] = time;

      if (this._audioSyncTimer) clearTimeout(this._audioSyncTimer);
      this._audioSyncTimer = setTimeout(() => {
        this.syncProgressToBackend();
      }, 1500); // Tự động lưu tiến trình mỗi 1.5 giây
    },

    getAudioProgress(url: string): number {
      const cleanUrl = url || 'global_media';
      return this.audioProgressMap[cleanUrl] || 0;
    },

    async syncProgressToBackend() {
      const payload: ExamProgress = { 
        answers: this.userAnswers, 
        isSubmitted: this.isSubmitted, 
        timeRemaining: this.timeRemaining,
        endTime: this.endTime,
        hasStarted: this.hasStarted,
        audioProgressMap: this.audioProgressMap,
        scoreResult: this.scoreResult
      };

      localStorage.setItem(`xblock_exam_draft_${this.config.examId}`, JSON.stringify(payload));
    },

    startTimer() {
      this.isRunning = true; 
      this.hasStarted = true;
      if (this.timerInterval) clearInterval(this.timerInterval);
      
      if (this.config.mode === 'exam' && !this.endTime) {
        this.endTime = Date.now() + this.timeRemaining * 1000;
        this.syncProgressToBackend(); 
      }

      this.timerInterval = setInterval(() => {
        if (this.config.mode === 'exam' && this.endTime) {
          this.timeRemaining = Math.max(0, Math.floor((this.endTime - Date.now()) / 1000));
        } else {
          if (this.timeRemaining > 0) this.timeRemaining--;
        }

        if (this.timeRemaining <= 0) {
          this.stopTimer();
          if(!this.isSubmitted) this.submitExam();
        } else if (this.timeRemaining % 5 === 0) {
          this.syncProgressToBackend();
        }
      }, 1000);
    },

    stopTimer() {
      this.isRunning = false;
      if (this.timerInterval) { 
        clearInterval(this.timerInterval); 
        this.timerInterval = null; 
        this.syncProgressToBackend(); 
      }
    },

    async submitExam() {
      this.stopTimer();
      this.isSubmitted = true;
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      let correctCount = 0;
      let totalCount = 0;
      let totalScore = 0;
      const details: Record<string, any> = {};

      this.parts.forEach((part: any) => {
        if (!part.questions) return;
        part.questions.forEach((q: any) => {
          totalCount++;
          const qIdStr = String(q.id);
          const rawAns = this.userAnswers[qIdStr];
          
          let userAnswer = typeof rawAns === 'object' && rawAns !== null && rawAns.selectedAnswer 
            ? rawAns.selectedAnswer 
            : rawAns;
            
          let isCorrect = false;

          if (q.type === 'matching' && typeof userAnswer === 'object') {
            isCorrect = true;
            (q.pairs || []).forEach((p: any) => {
              if (userAnswer[p.left] !== p.right) isCorrect = false;
            });
          } else if (q.type === 'text_input') {
            const cleanUserAns = String(userAnswer || '').trim().toLowerCase();
            const cleanTarget = String(q.correctAnswer || '').trim().toLowerCase();
            isCorrect = cleanUserAns === cleanTarget;
          } else {
            isCorrect = userAnswer === q.correctAnswer;
          }
          
          if (isCorrect && userAnswer) correctCount++;

          const point = (q.scoreEnabled && !isNaN(q.score)) ? Number(q.score) : 1;
          if (isCorrect && userAnswer) totalScore += point;

          details[qIdStr] = {
            userAnswer: userAnswer || null,
            correctAnswer: q.correctAnswer || null,
            isCorrect: isCorrect,
            score: isCorrect ? point : 0
          };
        });
      });

      this.scoreResult = {
        score: totalScore,
        totalQuestions: totalCount,
        correctCount: correctCount,
        details: details 
      };

      this.syncProgressToBackend();
      localStorage.removeItem(`xblock_exam_draft_${this.config.examId}`);

      if (this.edxConfig.submitUrl) {
        try {
          await fetch(this.edxConfig.submitUrl, {
            method: 'POST',
            headers: getEdxHeaders(),
            body: JSON.stringify({
              userAnswers: this.userAnswers,
              score: totalScore,
              maxScore: totalCount
            })
          });
        } catch (error) {
          console.error("Lỗi kết xuất điểm lên hệ thống:", error);
        }
      } else {
        console.info(`Đã nộp bài giả lập. Điểm: ${totalScore}/${totalCount}`);
      }
    },

    async startHeartbeat() {
      await this.pingDeviceToken(true);
      
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = setInterval(() => {
        this.pingDeviceToken(false);
      }, 15000);
    },

    async pingDeviceToken(isInitialLoad = false) {
      if (!this.edxConfig.heartbeatUrl || this.isSubmitted || this.isKickedOut) return;
      
      try {
        const res = await fetch(this.edxConfig.heartbeatUrl, {
          method: 'POST',
          headers: getEdxHeaders(),
          body: JSON.stringify({
            deviceToken: this.deviceToken,
            isInitialLoad: isInitialLoad
          })
        });
        
        if (res.ok) {
          const result = await res.json();
          if (result.action === 'kick') {
            this.isKickedOut = true;
            if (this.heartbeatInterval) {
              clearInterval(this.heartbeatInterval);
              this.heartbeatInterval = null;
            }
          }
        }
      } catch (error) {
        console.warn("Lỗi kiểm tra nhịp tim thiết bị", error);
      }
    }
  }
});