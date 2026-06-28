/// <reference types="vite/client" />
import { defineStore } from 'pinia';

// ============================================================================
// HÀM BỔ SUNG: BẢO MẬT API CHO EDX
// ============================================================================
// Lấy "thẻ thông hành" bảo mật từ cookie của edX
const getCsrfToken = () => {
  const match = document.cookie.match(new RegExp('(^| )csrftoken=([^;]+)'));
  return match ? match[2] : '';
};

// Tạo cấu hình Header chuẩn cho mọi gói tin gửi đi
const getEdxHeaders = () => ({
  'Content-Type': 'application/json',
  'X-CSRFToken': getCsrfToken()
});

// Khai báo Interface chuẩn
export interface ExamProgress {
  answers: Record<string, any>;
  audioCurrentTime: number;
  isSubmitted: boolean;
  hasStarted: boolean;
  endTime: number | null;
  timeRemaining?: number;
  scoreResult?: any;
}

// ============================================================================
// EXAM STORE (DUAL ENGINE: LOCAL & PYTHON EDX)
// ============================================================================
export const useExamStore = defineStore('exam', {
  state: () => ({
    // Cấu hình môi trường edX Runtime (Tiếp nhận từ main.ts)
    edxConfig: {
      mode: 'student' as 'student' | 'teacher',
      getUrl: '',
      saveUrl: '',
      submitUrl: ''
    },

    // Cấu hình môi trường thi UI
    config: {
      examId: 'default' as string,
      mode: 'exam' as 'exam' | 'exercise',
      showScore: true,
      showReview: true,
      allowFlashcard: false,
      hasTimer: true
    },
    
    // Dữ liệu gốc
    examSettings: {} as any,
    examDataRaw: {} as any, // Lưu trữ tạm data thô (hỗ trợ custom mode)
    
    // Dữ liệu UI
    audioUrl: '' as string,
    audioCurrentTime: 0 as number,
    parts: [] as any[],
    activePartIndex: 0,
    activeQuestionId: '' as string,
    
    // Dữ liệu người dùng & Thời gian
    userAnswers: {} as Record<string, any>, 
    timeRemaining: 0,
    endTime: null as number | null, 
    
    // Trạng thái hệ thống
    hasStarted: false,
    isRunning: false,
    timerInterval: null as ReturnType<typeof setInterval> | null,
    isLoading: true,
    isSubmitted: false,
    scrollTrigger: 0,
    
    // Kết quả trả về
    scoreResult: null as any 
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
      if (state.scoreResult?.correctCount !== undefined) return state.scoreResult.correctCount;
      return Object.values(state.userAnswers).filter((ans: any) => ans.isCorrect).length;
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
    // ==========================================
    // CẤU HÌNH API RUNTIME EDX
    // ==========================================
    setEdxRuntime(config: any) {
      this.edxConfig = { ...this.edxConfig, ...config };
    },

    // ==========================================
    // LƯU ĐỀ THI LÊN EDX (GIÁO VIÊN)
    // ==========================================
    async saveToEdx(payload: any) {
      if (this.edxConfig.saveUrl) {
        try {
          const res = await fetch(this.edxConfig.saveUrl, {
            method: 'POST',
            headers: getEdxHeaders(), // <--- Bổ sung Headers bảo mật
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error("Edx từ chối kết nối");
        } catch (error) {
          console.error("Lỗi đồng bộ cấu hình lên edX:", error);
          throw error;
        }
      } else {
        console.info("Local Dev: Cấu hình đề thi đã được lưu giả lập.", payload);
      }
    },

    // ==========================================
    // KHỞI TẠO BÀI THI & NẠP DỮ LIỆU
    // ==========================================
    async initExam(examId: string = 'default') {
      // ---------------------------------------------------------
      // TRẠM GÁC SỐ 2: Kiểm tra cấu hình URL bên trong Store
      console.log("🛑 [TEST 2] Cấu hình edxConfig hiện tại:", this.edxConfig);
      // ---------------------------------------------------------

      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.hasStarted = false;
      this.isRunning = false;
      this.isSubmitted = false;
      this.userAnswers = {};
      this.audioCurrentTime = 0;
      this.scoreResult = null;
      this.endTime = null;

      this.isLoading = true;
      this.config.examId = examId;

      try {
        let rawData: any = null;

        if (this.edxConfig.getUrl) {
          // [MÔI TRƯỜNG PYTHON] Đọc từ API edX
          const res = await fetch(this.edxConfig.getUrl, { 
            method: 'POST', 
            headers: getEdxHeaders(), // <--- Bổ sung Headers bảo mật
            body: JSON.stringify({}) 
          });
          
          if (!res.ok) {
            console.warn("API edX trả về lỗi. Khởi tạo dữ liệu rỗng.");
            rawData = {}; 
          } else {
            rawData = await res.json();
          }
          
          // Tái cấu trúc progress từ user_state của edX
          if (rawData.userAnswers && Object.keys(rawData.userAnswers).length > 0) {
            rawData.progress = {
              answers: rawData.userAnswers,
              isSubmitted: rawData.isSubmitted || false,
              hasStarted: true
            };
          }
        } else {
          // [MÔI TRƯỜNG LOCAL] Đọc file tĩnh và LocalStorage
          const res = await fetch('/exam_data.json');
          if (!res.ok) throw new Error("Yêu cầu file exam_data.json trong thư mục public/");
          rawData = await res.json();
          
          const localProgress = localStorage.getItem('toeic_progress_' + examId);
          if (localProgress) rawData.progress = JSON.parse(localProgress);
        }

        // Cập nhật Settings
        this.examSettings = rawData.examSettings || {};
        this.examDataRaw = rawData;
        this.audioUrl = this.examSettings.globalListeningAudio || '';

        // Phân rã dữ liệu từ JSON thành mảng Parts (Ưu tiên hỗ trợ cả 2 chế độ)
        const builderMode = rawData.builderMode || 'traditional';
        const examDataMap = rawData.examData || {};

        if (builderMode === 'custom' && examDataMap.custom) {
          this.parts = examDataMap.custom.map((p: any) => ({
            id: p.id,
            title: p.name,
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

        // Phục hồi Tiến độ học viên (Progress)
        const progress = rawData.progress as ExamProgress | null;
        if (progress) {
          this.userAnswers = progress.answers || {};
          this.audioCurrentTime = progress.audioCurrentTime || 0;
          this.isSubmitted = progress.isSubmitted || false;
          this.hasStarted = progress.hasStarted || false;
          this.endTime = progress.endTime || null;
          if (progress.timeRemaining !== undefined) this.timeRemaining = progress.timeRemaining;
          
          if (progress.scoreResult) {
            this.scoreResult = progress.scoreResult;
          }
        } else {
          this.timeRemaining = this.examSettings.timeLimitSeconds || 0;
        }

        // Tính lại thời gian cho chống gian lận
        if (this.config.mode === 'exam' && this.endTime && !this.isSubmitted) {
          this.timeRemaining = Math.max(0, Math.floor((this.endTime - Date.now()) / 1000));
        }

        // Kích hoạt câu đầu tiên
        if (this.questionMap.length > 0 && !this.activeQuestionId) {
          this.activeQuestionId = this.questionMap[0].id;
          this.activePartIndex = this.questionMap[0].partIndex;
        }
        
        // Bắt đầu đếm giờ nếu cần (đang làm dở)
        if (!this.isSubmitted && this.config.hasTimer && this.hasStarted) {
          this.startTimer();
        }

      } catch (error) {
        console.error("Lỗi hệ thống khi tải cấu trúc đề thi:", error);
      } finally {
        this.isLoading = false;
      }
    },

    // ==========================================
    // ĐIỀU HƯỚNG BÀI THI
    // ==========================================
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

    // ==========================================
    // LƯU ĐÁP ÁN & ĐỒNG BỘ PYTHON/LOCAL
    // ==========================================
    saveAnswer(questionId: string, answerId: string, isCorrect: boolean = false) {
      if (this.isSubmitted) return; 
      
      this.userAnswers[questionId] = { questionId, selectedAnswer: answerId, isCorrect };
      this.syncProgressToBackend();
    },

    async syncProgressToBackend() {
      const payload: ExamProgress = { 
        answers: this.userAnswers, 
        isSubmitted: this.isSubmitted, 
        timeRemaining: this.timeRemaining,
        endTime: this.endTime,
        hasStarted: this.hasStarted,
        audioCurrentTime: this.audioCurrentTime,
        scoreResult: this.scoreResult
      };

      if (!this.edxConfig.getUrl) {
        localStorage.setItem('toeic_progress_' + this.config.examId, JSON.stringify(payload));
      }
      // edX mặc định không gọi API lưu quá thường xuyên tránh quá tải, tiến độ sẽ được nộp tập trung tại submitExam.
    },

    // ==========================================
    // ĐỒNG HỒ CHỐNG GIAN LẬN THỜI GIAN
    // ==========================================
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
        } else if (this.timeRemaining % 10 === 0) {
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

    // ==========================================
    // NỘP BÀI VÀ GHI ĐIỂM SỔ ĐIỂM EDX (GRADEBOOK)
    // ==========================================
    async submitExam() {
      this.stopTimer();
      this.isSubmitted = true;

      let correctCount = 0;
      let totalCount = 0;
      let totalScore = 0;
      const details: Record<string, any> = {};

      // Thuật toán chấm điểm cục bộ
      this.parts.forEach((part: any) => {
        if (!part.questions) return;
        part.questions.forEach((q: any) => {
          totalCount++;
          const qIdStr = String(q.id);
          const rawAns = this.userAnswers[qIdStr];
          const userAnswer = typeof rawAns === 'object' ? rawAns?.selectedAnswer : rawAns;
          const correctAnswer = q.correctAnswer;
          const isCorrect = userAnswer === correctAnswer;
          
          if (isCorrect && userAnswer) correctCount++;

          // Xử lý hệ số điểm cho Custom mode
          const point = (q.scoreEnabled && !isNaN(q.score)) ? Number(q.score) : 1;
          if (isCorrect && userAnswer) totalScore += point;

          details[qIdStr] = {
            userAnswer: userAnswer || null,
            correctAnswer: correctAnswer || null,
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

      // Ghi nhận trạng thái hoàn thành vĩnh viễn
      this.syncProgressToBackend();

      if (this.edxConfig.submitUrl) {
        try {
          await fetch(this.edxConfig.submitUrl, {
            method: 'POST',
            headers: getEdxHeaders(), // <--- Bổ sung Headers bảo mật
            body: JSON.stringify({
              userAnswers: this.userAnswers,
              score: totalScore,
              maxScore: totalCount // Định mức quy chuẩn tổng điểm tối đa
            })
          });
        } catch (error) {
          console.error("Lỗi giao tiếp kết nối điểm lên hệ thống edX:", error);
        }
      } else {
        console.info(`Local Dev: Đã nộp bài giả lập. Điểm thi đạt: ${totalScore}/${totalCount}`);
      }
    }
  }
});