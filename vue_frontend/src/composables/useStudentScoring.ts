import { computed, type Ref } from 'vue';

export function useStudentScoring(store: any, displayedParts: Ref<any[]>) {
  
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

  return {
    listeningScore,
    readingScore,
    customScore
  };
}