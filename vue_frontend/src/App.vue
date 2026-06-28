<template lang="pug">
.app-container
  // ==========================================
  // GIAO DIỆN GIÁO VIÊN
  // ==========================================
  ExamBuilder(v-if="store.edxConfig.mode === 'teacher'")
  
  // ==========================================
  // GIAO DIỆN HỌC VIÊN (Được chia làm nhiều màn hình)
  // ==========================================
  template(v-else)
    // 1. Sảnh chờ (Mặc định)
    StudentLanding(
      v-if="studentView === 'landing'" 
      @enter-exam="studentView = 'exam'"
      @enter-flashcard="studentView = 'flashcard'"
    )
    
    // 2. Không gian làm bài thi
    StudentExam(
      v-else-if="studentView === 'exam'"
      @return-landing="studentView = 'landing'"
    )
    
    // 3. Không gian học từ vựng (Đã tích hợp Flashcard)
    StudentVocab(
      v-else-if="studentView === 'flashcard'"
      @return-landing="studentView = 'landing'"
    )
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useExamStore } from './store/examStore'; // Import Store trung tâm

// IMPORT CÁC GIAO DIỆN (Hãy đảm bảo đường dẫn này khớp với cấu trúc thư mục thực tế của bạn)
import ExamBuilder from './views/TeacherView/ExamBuilder.vue';
import StudentLanding from './views/StudentView/StudentLanding.vue'; 
import StudentExam from './views/StudentView/StudentExam.vue'; 
import StudentVocab from './views/StudentView/components/StudentVocab.vue'; 

const store = useExamStore();
const studentView = ref('landing'); // Mặc định học viên sẽ vào sảnh chờ đầu tiên
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  background-color: #f8fafc;
  overflow: hidden; /* Cắt đứt mọi nỗ lực tràn viền của khung edX */
}
</style>