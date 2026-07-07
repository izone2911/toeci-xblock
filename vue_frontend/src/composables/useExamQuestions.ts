import { ref, type Ref } from 'vue';

export function useExamQuestions(
  examData: Ref<Record<string | number, any>>,
  currentCustomPartId: Ref<string | null>,
  openModal: (message: string, type: 'delete' | 'swap' | 'mode' | 'alert', action?: () => void) => void
) {
  const dragSidebarSource = ref<{ part: string | number; index: number } | null>(null);

  const getGlobalNumber = (targetPart: number, localIndex: number) => {
    let count = 0;
    for (let p = 1; p < targetPart; p++) {
      count += examData.value?.[p]?.length || 0;
    }
    return count + localIndex + 1;
  };

  const getCustomGlobalNumber = (targetPartId: string, localIndex: number) => {
    let count = 0;
    for (const p of examData.value?.custom || []) {
      if (p.id === targetPartId) return count + localIndex + 1;
      count += p.questions?.length || 0;
    }
    return count + localIndex + 1;
  };

  const rebalanceContextsUniversal = (partData: any[], partNumber: number | string) => {
    if (partNumber === 'custom') return;
    if ([1, 2, 5].includes(partNumber as number)) return;

    if (partNumber === 3 || partNumber === 4) {
      for (let i = 0; i < partData.length; i += 3) {
        let foundImage = '';
        let foundContent = '';
        let foundTranscript = '';

        for (let j = 0; j < 3; j++) {
          if (partData[i + j]) {
            if (!foundImage && partData[i + j].image) foundImage = partData[i + j].image;
            if (!foundContent && partData[i + j].content) foundContent = partData[i + j].content;
            if (!foundTranscript && partData[i + j].transcript) foundTranscript = partData[i + j].transcript;

            partData[i + j].image = '';
            partData[i + j].content = '';
            partData[i + j].transcript = '';
          }
        }
        if (partData[i]) {
          partData[i].image = foundImage;
          partData[i].content = foundContent;
          partData[i].transcript = foundTranscript;
        }
      }
      return;
    }

    if (partNumber === 6) {
      for (let i = 0; i < partData.length; i += 4) {
        let foundContent = '';
        let foundImage = '';
        for (let j = 0; j < 4; j++) {
          if (partData[i + j]) {
            if (!foundContent && partData[i + j].content) foundContent = partData[i + j].content;
            if (!foundImage && partData[i + j].image) foundImage = partData[i + j].image;
            partData[i + j].content = '';
            partData[i + j].image = '';
          }
        }
        if (partData[i]) {
          partData[i].content = foundContent;
          partData[i].image = foundImage;
        }
      }
      return;
    }

    if (partNumber === 7) {
      const passageMap = new Map();
      const transcriptMap = new Map();
      partData.forEach((q) => {
        if (q.passages && q.passages.length > 0) {
          if (!passageMap.has(q.groupId)) passageMap.set(q.groupId, JSON.parse(JSON.stringify(q.passages)));
        }
        delete q.passages;
        if (q.transcripts && q.transcripts.length > 0) {
          if (!transcriptMap.has(q.groupId)) transcriptMap.set(q.groupId, JSON.parse(JSON.stringify(q.transcripts)));
        }
        delete q.transcripts;
      });
      partData.forEach((q, index) => {
        const isLeader = index === 0 || partData[index - 1].groupId !== q.groupId;
        if (isLeader) {
          q.passages = passageMap.get(q.groupId) || [{ type: 'text', content: '' }];
          q.transcripts = transcriptMap.get(q.groupId) || [{ type: 'text', content: '' }];
        }
      });
    }
  };

  const onDragStartSidebar = (part: string | number, index: number, event: DragEvent) => {
    dragSidebarSource.value = { part, index };
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };

  const onDropSidebar = (targetPart: string | number, targetIndex: number) => {
    if (!dragSidebarSource.value) return;
    const { part: sourcePart, index: sourceIndex } = dragSidebarSource.value;
    
    if (sourcePart === targetPart && sourceIndex !== targetIndex) {
      const labelSource = typeof sourcePart === 'number' ? getGlobalNumber(sourcePart, sourceIndex) : getCustomGlobalNumber(sourcePart as string, sourceIndex);
      const labelTarget = typeof targetPart === 'number' ? getGlobalNumber(targetPart as number, targetIndex) : getCustomGlobalNumber(targetPart as string, targetIndex);

      const isCustom = typeof sourcePart === 'string';
      const isContentSwap = isCustom || (typeof sourcePart === 'number' && sourcePart >= 6);
      const actionText = isContentSwap ? 'nội dung' : 'vị trí';

      openModal(`Xác nhận hoán đổi ${actionText} câu ${labelSource} và câu ${labelTarget}?`, 'swap', () => {
        let list: any[];
        if (isCustom) {
          const targetPartObj = examData.value?.custom?.find((p: any) => p.id === sourcePart);
          if (!targetPartObj) return;
          list = targetPartObj.questions;
        } else {
          list = examData.value[sourcePart as number];
        }

        if (isContentSwap) {
          const item1 = list[sourceIndex];
          const item2 = list[targetIndex];

          const sourceId = item1.id;
          const sourceGroupId = item1.groupId;
          const targetId = item2.id;
          const targetGroupId = item2.groupId;

          const temp = { ...item1 };
          Object.assign(item1, item2);
          item1.id = sourceId;
          item1.groupId = sourceGroupId;

          Object.assign(item2, temp);
          item2.id = targetId;
          item2.groupId = targetGroupId;
        } else {
          const temp = list[sourceIndex];
          list[sourceIndex] = list[targetIndex];
          list[targetIndex] = temp;
        }

        if (!isCustom) rebalanceContextsUniversal(list, sourcePart);
      });
    }
    dragSidebarSource.value = null;
  };

  const addNewQuestionFromSidebar = (part: string | number) => {
    if (typeof part === 'number') {
      const initialOptions = part === 2 ? ['', '', ''] : ['', '', '', ''];
      const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      let groupId = '';

      if ([3, 4, 6, 7].includes(part)) {
        const list = examData.value[part];
        groupId = list && list.length > 0
          ? String(list[list.length - 1].groupId)
          : `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      const newQ: any = { id: newId, type: 'multiple_choice', text: '', content: '', options: initialOptions, correctAnswer: 'A', explanation: '' };
      if (groupId) newQ.groupId = groupId;
      examData.value[part].push(newQ);
    } else {
      const targetPartObj = examData.value?.custom?.find((p: any) => p.id === part);
      if (!targetPartObj) return;

      const lastGroupId = targetPartObj.questions?.length > 0
        ? String(targetPartObj.questions[targetPartObj.questions.length - 1].groupId)
        : `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const newQ = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        groupId: lastGroupId, type: 'multiple_choice', text: '', content: '', sharedContext: '',
        options: ['', ''], pairs: [], correctAnswer: 'A', explanation: '',
        scoreEnabled: false, score: 1, textPlaceholder: ''
      };
      targetPartObj.questions.push(newQ);
    }
  };

  const deleteQuestion = (part: string | number, index: number) => {
    const label = typeof part === 'number' ? getGlobalNumber(part, index) : getCustomGlobalNumber(part as string, index);
    openModal(`Xác nhận xóa câu hỏi số ${label}?`, 'delete', () => {
      if (typeof part === 'number') {
        examData.value[part].splice(index, 1);
        rebalanceContextsUniversal(examData.value[part], part);
      } else {
        const targetPartObj = examData.value?.custom?.find((p: any) => p.id === part);
        if (targetPartObj) {
          const q = targetPartObj.questions[index];
          if (q.sharedContext && index + 1 < targetPartObj.questions.length && targetPartObj.questions[index + 1].groupId === q.groupId) {
            targetPartObj.questions[index + 1].sharedContext = q.sharedContext;
          }
          targetPartObj.questions.splice(index, 1);
        }
      }
    });
  };

  const handlePartEditorDelete = (payload: { index: number; message: string; partNumber: number | string }) => {
    openModal(payload.message, 'delete', () => {
      let list;
      if (payload.partNumber === 'custom') {
        const customPart = examData.value?.custom?.find((p: any) => p.id === currentCustomPartId.value);
        if (!customPart) return;
        list = customPart.questions;
      } else {
        list = examData.value[payload.partNumber as number];
      }

      list.splice(payload.index, 1);

      if (payload.partNumber !== 'custom') {
        rebalanceContextsUniversal(list, payload.partNumber as number);
      }
    });
  };

  const handlePartEditorSwap = (payload: { sourceIndex: number; targetIndex: number; message: string; partNumber: number | string }) => {
    openModal(payload.message, 'swap', () => {
      let list;
      if (payload.partNumber === 'custom') {
        const customPart = examData.value?.custom?.find((p: any) => p.id === currentCustomPartId.value);
        if (!customPart) return;
        list = customPart.questions;
      } else {
        list = examData.value[payload.partNumber as number];
      }

      if (payload.partNumber === 'custom' || (typeof payload.partNumber === 'number' && payload.partNumber >= 6)) {
        const item1 = list[payload.sourceIndex];
        const item2 = list[payload.targetIndex];

        const newItem1 = { ...item2, id: item1.id, groupId: item1.groupId };
        const newItem2 = { ...item1, id: item2.id, groupId: item2.groupId };

        list.splice(payload.sourceIndex, 1, newItem1);
        list.splice(payload.targetIndex, 1, newItem2);
      } else {
        const temp = list[payload.sourceIndex];
        list[payload.sourceIndex] = list[payload.targetIndex];
        list[payload.targetIndex] = temp;
      }

      if (payload.partNumber !== 'custom') {
        rebalanceContextsUniversal(list, payload.partNumber as number);
      }
    });
  };

  return {
    dragSidebarSource,
    getGlobalNumber,
    getCustomGlobalNumber,
    onDragStartSidebar,
    onDropSidebar,
    addNewQuestionFromSidebar,
    deleteQuestion,
    handlePartEditorDelete,
    handlePartEditorSwap
  };
}