<template lang="pug">
.part-page
  .questions-list(v-if="questions?.length > 0")
    template(v-for="(q, index) in questions" :key="q.id")
      
      QuestionItemEditor(
        :question="q"
        :displayIndex="startNumber + index"
        :partNumber="partNumber"
        :isExpanded="expandedIds.includes(q.id)"
        :isDragging="dragEditorIndex === index"
        :isDragEnabled="dragEnabledIndex === index"
        :isFirstInGroup="isFirstInGroupCheck(index)"
        @toggle="toggleQuestion(q.id)"
        @mouseenter="dragEnabledIndex = index"
        @mouseleave="onMouseLeaveEditor"
        @insert-above="insertQuestionAbove(index)"
        @insert-below="insertQuestionBelow(index)"
        @insert-group-below="insertNewGroup(index)"
        @delete="deleteQuestion(index)"
        @dragstart-item="onDragStartEditor(index, $event)"
        @drop-item="onDropEditor(index, $event)"
        @dragend-item="onDragEndEditor"
        @add-array-item="(key, type) => addArrayItem(q, key, type)"
        @remove-array-item="(key, idx) => removeArrayItem(q, key, idx)"
      )

      .group-divider(v-if="showDividerCheck(index)")
        .divider-line

  .empty-state(v-else)
    h4 Chưa có câu hỏi nào
    button.btn-add-large.mt-4(v-if="[1,2,5].includes(pNum)" @click="addNewQuestion") + Thêm câu
    button.btn-add-large.mt-4(v-else @click="addSpecificGroupAtEnd") + Thêm đoạn

  template(v-if="questions?.length > 0")
    button.btn-add-large(v-if="[1,2,5].includes(pNum)" @click="addNewQuestion") 
      span.add-icon + 
      | Thêm câu
    button.btn-add-large(v-else @click="addSpecificGroupAtEnd") 
      span.add-icon + 
      | Thêm đoạn
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import QuestionItemEditor from '../core/QuestionItemEditor.vue';

const props = defineProps<{ 
  modelValue: any[], 
  partNumber: number | string, 
  startNumber: number,
  sessionConfig: { skipDeleteConfirm: boolean; skipSwapConfirm: boolean }
}>();

const emit = defineEmits(['update:modelValue', 'request-delete', 'request-swap']);

// 🔥 ĐÃ FIX: Chống lỗi v-model readonly
const questions = computed({
  get() { return props.modelValue || []; },
  set(val) { emit('update:modelValue', val); }
});

// 🔥 ĐÃ FIX: Ép kiểu cứng sang Number để tránh Vue dính lỗi "chuỗi === số"
const pNum = computed(() => Number(props.partNumber));

const expandedIds = ref<string[]>([]);

onMounted(() => {
  const p = pNum.value;
  if ([3, 4, 6].includes(p)) {
    const chunkSize = p === 6 ? 4 : 3;
    const newList = [...questions.value];
    let changed = false;
    
    newList.forEach((q, idx) => {
      if (!q.groupId) {
        const groupIndex = Math.floor(idx / chunkSize);
        q.groupId = `auto_group_${groupIndex}_${Date.now()}`;
        changed = true;
      }
    });
    
    if (changed) questions.value = newList;
  }
});

const isFirstInGroupCheck = (index: number) => {
  if (!questions.value || questions.value.length === 0) return false;
  const p = pNum.value;
  if ([1, 2, 5].includes(p)) return false;
  if (p === 3 || p === 4) return index % 3 === 0;
  if (p === 6) return index % 4 === 0;
  if (p === 7) return index === 0 || questions.value[index - 1]?.groupId !== questions.value[index]?.groupId;
  return false;
};

const showDividerCheck = (index: number) => {
  if (!questions.value || index === questions.value.length - 1) return false;
  const p = pNum.value;
  if ([1, 2, 5].includes(p)) return true;
  if (p === 3 || p === 4) return (index + 1) % 3 === 0;
  if (p === 6) return (index + 1) % 4 === 0;
  if (p === 7) return questions.value[index + 1]?.groupId !== questions.value[index]?.groupId;
  return true;
};

const rebalanceContexts = (listToBalance: any[]) => {
  if (!listToBalance || listToBalance.length === 0) return;
  const p = pNum.value;
  if ([1, 2, 5].includes(p)) return;

  if (p === 3 || p === 4) {
    for (let i = 0; i < listToBalance.length; i += 3) {
      let foundImage = ''; let foundContent = '';
      for (let j = 0; j < 3; j++) {
        if (listToBalance[i + j]) {
          if (!foundImage && listToBalance[i + j].image) foundImage = listToBalance[i + j].image;
          if (!foundContent && listToBalance[i + j].content) foundContent = listToBalance[i + j].content;
          listToBalance[i + j].image = ''; listToBalance[i + j].content = '';
        }
      }
      if (listToBalance[i]) { listToBalance[i].image = foundImage; listToBalance[i].content = foundContent; }
    }
    return;
  }

  if (p === 6) {
    for (let i = 0; i < listToBalance.length; i += 4) {
      let foundContent = ''; let foundImage = '';
      for (let j = 0; j < 4; j++) {
        if (listToBalance[i + j]) {
          if (!foundContent && listToBalance[i + j].content) foundContent = listToBalance[i + j].content;
          if (!foundImage && listToBalance[i + j].image) foundImage = listToBalance[i + j].image;
          listToBalance[i + j].content = ''; listToBalance[i + j].image = '';
        }
      }
      if (listToBalance[i]) { listToBalance[i].content = foundContent; listToBalance[i].image = foundImage; }
    }
    return;
  }

  if (p === 7) {
    const passageMap = new Map();
    const transcriptMap = new Map();
    
    listToBalance.forEach(q => {
      if (q.passages && q.passages.length > 0) {
        if (!passageMap.has(q.groupId)) passageMap.set(q.groupId, JSON.parse(JSON.stringify(q.passages)));
      }
      delete q.passages; 
      
      if (q.transcripts && q.transcripts.length > 0) {
        if (!transcriptMap.has(q.groupId)) transcriptMap.set(q.groupId, JSON.parse(JSON.stringify(q.transcripts)));
      }
      delete q.transcripts; 
    });

    listToBalance.forEach((q, index) => {
      const isLeader = index === 0 || listToBalance[index - 1]?.groupId !== q.groupId;
      if (isLeader) {
        q.passages = passageMap.get(q.groupId) || [{ type: 'text', content: '' }];
        q.transcripts = transcriptMap.get(q.groupId) || [{ type: 'text', content: '' }];
      }
    });
  }
};

const dragEditorIndex = ref<number | null>(null);
const dragEnabledIndex = ref<number | null>(null);

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
      const newList = [...questions.value];
      const p = pNum.value;
      
      if (p >= 6) {
        const item1 = newList[sourceIndex];
        const item2 = newList[targetIndex];
        const newItem1 = { ...item2, id: item1.id, groupId: item1.groupId };
        const newItem2 = { ...item1, id: item2.id, groupId: item2.groupId };
        newList.splice(sourceIndex, 1, newItem1);
        newList.splice(targetIndex, 1, newItem2);
      } else {
        const temp = newList[sourceIndex];
        newList[sourceIndex] = newList[targetIndex];
        newList[targetIndex] = temp;
      }
      
      rebalanceContexts(newList);
      questions.value = newList;
    } else {
      const actionText = (pNum.value >= 6) ? 'nội dung' : 'vị trí';
      emit('request-swap', {
        sourceIndex, targetIndex,
        message: `Xác nhận hoán đổi ${actionText} câu ${props.startNumber + sourceIndex} và câu ${props.startNumber + targetIndex}?`,
        partNumber: props.partNumber
      });
    }
  }
  dragEditorIndex.value = null;
  dragEnabledIndex.value = null;
};

const onDragEndEditor = () => { dragEditorIndex.value = null; dragEnabledIndex.value = null; };

const createNewObject = (groupId?: string) => {
  const p = pNum.value;
  const base: any = {
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    text: '', content: '', explanation: '', image: '',
    options: p === 2 ? ['', '', ''] : ['', '', '', ''],
    correctAnswer: 'A' 
  };
  if (groupId) base.groupId = groupId;
  return base;
};

const addNewQuestion = () => {
  const newQ = createNewObject();
  const newList = [...questions.value, newQ];
  questions.value = newList;
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const insertQuestionAbove = (index: number) => {
  const newList = [...questions.value];
  const currentGroupId = newList[index]?.groupId;
  const newQ = createNewObject(currentGroupId);
  newList.splice(index, 0, newQ);
  rebalanceContexts(newList);
  questions.value = newList;
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const insertQuestionBelow = (index: number) => {
  const newList = [...questions.value];
  const currentGroupId = newList[index]?.groupId;
  const newQ = createNewObject(currentGroupId);
  newList.splice(index + 1, 0, newQ);
  rebalanceContexts(newList);
  questions.value = newList;
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const insertNewGroup = (index: number) => {
  const newGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  let count = 1;
  const p = pNum.value;
  if (p === 3 || p === 4) count = 3;
  if (p === 6) count = 4;
  
  const newQuestions = Array.from({length: count}).map((_, i) => ({
    ...createNewObject(newGroupId), 
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`
  }));

  const newList = [...questions.value];
  newList.splice(index + 1, 0, ...newQuestions);
  rebalanceContexts(newList);
  questions.value = newList;
  expandedIds.value.push(newQuestions[0].id);
  nextTick(() => { document.getElementById(`question-${newQuestions[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const addSpecificGroupAtEnd = () => {
  const newGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  let count = 1;
  const p = pNum.value;
  if (p === 3 || p === 4) count = 3;
  if (p === 6) count = 4;
  
  const newQuestions = Array.from({length: count}).map((_, i) => ({
    ...createNewObject(newGroupId), 
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`
  }));

  const newList = [...questions.value, ...newQuestions];
  rebalanceContexts(newList);
  questions.value = newList;
  expandedIds.value.push(newQuestions[0].id);
  nextTick(() => { document.getElementById(`question-${newQuestions[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const deleteQuestion = (index: number) => {
  if (props.sessionConfig.skipDeleteConfirm) {
    const newList = [...questions.value];
    newList.splice(index, 1);
    rebalanceContexts(newList);
    questions.value = newList;
  } else {
    emit('request-delete', { 
      index, 
      message: `Xác nhận xóa câu ${props.startNumber + index}?`, 
      partNumber: props.partNumber 
    });
  }
};

const addArrayItem = (q: any, key: 'passages' | 'transcripts', type: 'text' | 'image') => {
  const newList = [...questions.value];
  const targetQ = newList.find(item => item.id === q.id);
  if (targetQ) {
    if (!targetQ[key]) targetQ[key] = [];
    targetQ[key].push(type === 'text' ? { type: 'text', content: '' } : { type: 'image', url: '' });
  }
  questions.value = newList;
};

const removeArrayItem = (q: any, key: 'passages' | 'transcripts', idx: number) => {
  const newList = [...questions.value];
  const targetQ = newList.find(item => item.id === q.id);
  if (targetQ && targetQ[key] && targetQ[key].length > 1) {
    targetQ[key].splice(idx, 1);
  }
  questions.value = newList;
};

const toggleQuestion = (id: string) => {
  const idx = expandedIds.value.indexOf(id);
  if (idx === -1) expandedIds.value.push(id); else expandedIds.value.splice(idx, 1);
};
</script>

<style scoped>
.part-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }
/* 🔥 ĐÃ FIX: Chỉnh margin 12px trên và 24px dưới, bù trừ hoàn hảo với 12px của ô thẻ ghi nhớ */
.group-divider { display: flex; align-items: center; margin: 12px 0 24px 0; }
.divider-line { flex: 1; border-bottom: 2px dashed #cbd5e1; }
.btn-add-large { width: 100%; padding: 14px; margin-top: 4px; background: white; border: 2px dashed #bfdbfe; border-radius: 12px; color: #2563eb; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.btn-add-large:hover { background: #eff6ff; border-color: #3b82f6; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }
</style>