import { ref, computed, nextTick, type Ref } from 'vue';

export function useStudentNavigation(displayedParts: Ref<any[]>) {
  const localActivePartIndex = ref(0);
  const activeQuestionId = ref<string | null>(null);
  const editorAreaRef = ref<HTMLElement | null>(null);
  
  let isAutoScrolling = false;
  let scrollTimeout: any = null;

  const displayedCurrentPart = computed(() => {
    return displayedParts.value[localActivePartIndex.value] || null;
  });

  const jumpToPart = (index: number) => { 
    if (index >= 0 && index < displayedParts.value.length) {
      localActivePartIndex.value = index; 
      const targetPart = displayedParts.value[index];
      if (targetPart && targetPart.questions && targetPart.questions.length > 0) {
        activeQuestionId.value = String(targetPart.questions[0].id);
      } else {
        activeQuestionId.value = null;
      }
    }
  };

  const nextPart = () => { if (localActivePartIndex.value < displayedParts.value.length - 1) jumpToPart(localActivePartIndex.value + 1); };
  const prevPart = () => { if (localActivePartIndex.value > 0) jumpToPart(localActivePartIndex.value - 1); };

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

  const scrollToQuestion = async (qId: string, targetPartIndex: number) => {
    isAutoScrolling = true;
    if (localActivePartIndex.value !== targetPartIndex) {
      localActivePartIndex.value = targetPartIndex;
    }
    
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

  return {
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
  };
}