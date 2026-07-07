import { ref, nextTick, type Ref } from 'vue';


export function useCustomEditor(
  partData: Ref<any>,
  props: any,
  emit: any
) {

  const expandedIds = ref<string[]>([]);
  
  const dragEditorIndex = ref<number | null>(null);
  const dragEnabledIndex = ref<number | null>(null);

  const isFirstInGroupCheck = (index: number) => {
    if (!partData.value.questions || partData.value.questions.length === 0) return false;
    return index === 0 || partData.value.questions[index - 1].groupId !== partData.value.questions[index].groupId;
  };

  const showDividerCheck = (index: number) => {
    if (!partData.value.questions || index === partData.value.questions.length - 1) return false;
    return partData.value.questions[index + 1].groupId !== partData.value.questions[index].groupId;
  };

  const onDragStartEditor = (index: number, event: DragEvent) => {
    dragEditorIndex.value = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
    expandedIds.value = []; 
  };


  const onMouseLeaveEditor = () => {
    if (dragEditorIndex.value === null) dragEnabledIndex.value = null;
  };

  const onDropEditor = (targetIndex: number, event: DragEvent) => {
    let sourceIndex = dragEditorIndex.value;
    
    if (event && event.dataTransfer) {
      const transferredData = event.dataTransfer.getData('text/plain');
      if (transferredData) sourceIndex = parseInt(transferredData, 10);
    }

    if (sourceIndex !== null && !isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      if (props.sessionConfig.skipSwapConfirm) {
        const item1 = partData.value.questions[sourceIndex];
        const item2 = partData.value.questions[targetIndex];
        const newItem1 = { ...item2, id: item1.id, groupId: item1.groupId };
        const newItem2 = { ...item1, id: item2.id, groupId: item2.groupId };
        partData.value.questions.splice(sourceIndex, 1, newItem1);
        partData.value.questions.splice(targetIndex, 1, newItem2);
      } else {
        emit('request-swap', {
          sourceIndex, targetIndex, 
          message: `Xác nhận hoán đổi nội dung câu ${props.startNumber + sourceIndex} và câu ${props.startNumber + targetIndex}?`,
          partNumber: 'custom'
        });
      }
    }
    dragEditorIndex.value = null;
    dragEnabledIndex.value = null;
  };

  const onDragEndEditor = () => { 
    dragEditorIndex.value = null; 
    dragEnabledIndex.value = null; 
  };


  const createNewQuestionObject = (groupId: string) => ({
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    groupId: groupId, 
    type: 'multiple_choice', 
    text: '', 
    transcript: '', 
    explanation: '', 
    options: ['', ''], 
    pairs: [],
    correctAnswer: 'A',
    scoreEnabled: false, 
    score: 1, 
    waitingTime: 0, 
    textPlaceholder: ''
  });


  const insertQuestionAbove = (index: number) => {
    const groupId = partData.value.questions[index].groupId;
    const newQ = createNewQuestionObject(groupId);
    partData.value.questions.splice(index, 0, newQ);
    expandedIds.value.push(newQ.id);
    nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  };

  const insertQuestionBelow = (index: number) => {
    const groupId = partData.value.questions[index].groupId;
    const newQ = createNewQuestionObject(groupId);
    partData.value.questions.splice(index + 1, 0, newQ);
    expandedIds.value.push(newQ.id);
    nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  };

  const insertNewGroup = (index: number) => {
    const newGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newQ = createNewQuestionObject(newGroupId);
    partData.value.questions.splice(index + 1, 0, newQ);
    expandedIds.value.push(newQ.id);
    nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  };


  const addGroupAtEnd = () => {
    if (!partData.value.questions) partData.value.questions = [];
    const newGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newQ = createNewQuestionObject(newGroupId);
    partData.value.questions.push(newQ);
    expandedIds.value.push(newQ.id);
    nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  };

  const deleteQuestion = (index: number) => { 
    emit('request-delete', { 
      index, 
      message: `Xác nhận xóa câu ${props.startNumber + index}?`, 
      partNumber: 'custom' 
    });
  };

  const addArrayItem = (q: any, key: 'passages' | 'transcripts', type: 'text' | 'image') => {
    if (!q[key]) q[key] = [];
    q[key].push(type === 'text' ? { type: 'text', content: '' } : { type: 'image', url: '' });
  };

  const removeArrayItem = (q: any, key: 'passages' | 'transcripts', idx: number) => {
    if (q[key] && q[key].length > 1) q[key].splice(idx, 1);
  };

  const toggleQuestion = (id: string) => {
    const idx = expandedIds.value.indexOf(id);
    if (idx === -1) expandedIds.value.push(id); else expandedIds.value.splice(idx, 1);
  };

  return {
    expandedIds,
    dragEditorIndex,
    dragEnabledIndex,
    isFirstInGroupCheck,
    showDividerCheck,
    onDragStartEditor,
    onMouseLeaveEditor,
    onDropEditor,
    onDragEndEditor,
    insertQuestionAbove,
    insertQuestionBelow,
    insertNewGroup,
    addGroupAtEnd,
    deleteQuestion,
    addArrayItem,
    removeArrayItem,
    toggleQuestion
  };
}