<template lang="pug">
.app-container
  // Studio view 
  ExamBuilder(v-if="store.edxConfig.mode === 'teacher'")
  
  // Student view
  template(v-else)
    // 1. Sảnh chờ (Mặc định)
    StudentLanding(
      v-if="studentView === 'landing'" 
      @enter-exam="studentView = 'exam'"
      @enter-flashcard="studentView = 'flashcard'"
    )
    
    StudentExam(
      v-else-if="studentView === 'exam'"
      @return-landing="studentView = 'landing'"
    )
    
    StudentVocab(
      v-else-if="studentView === 'flashcard'"
      @return-landing="studentView = 'landing'"
    )
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useExamStore } from './store/examStore';

import ExamBuilder from './views/TeacherView/ExamBuilder.vue';
import StudentLanding from './views/StudentView/StudentLanding.vue'; 
import StudentExam from './views/StudentView/StudentExam.vue'; 
import StudentVocab from './views/StudentView/StudentVocab.vue'; 

const store = useExamStore();
const studentView = ref('landing');
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  background-color: #f8fafc;
  overflow: hidden;
}
</style>