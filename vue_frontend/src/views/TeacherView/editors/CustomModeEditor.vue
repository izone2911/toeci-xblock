<template lang="pug">
.custom-editor-page
  // ==========================================
  // KHU VỰC 1: CẤU HÌNH PART TOÀN CỤC
  // ==========================================
  .part-config-box.mb-4
    .input-wrapper.mb-4
      label URL Audio / Video (Duy nhất 1 cho toàn phần)
      input.text-input(v-model="partData.mediaUrl" placeholder="Dán link Audio hoặc Video tại đây...")
    .input-wrapper
      label Nội dung / Câu hỏi chung cho toàn bộ Phần
      RichTextEditor(v-model="partData.sharedContext" placeholder="Nhập ngữ cảnh, đoạn văn chung hoặc hướng dẫn làm bài cho toàn bộ phần này...")

  // ==========================================
  // KHU VỰC 2: DANH SÁCH CÂU HỎI THEO ĐOẠN
  // ==========================================
  .questions-list(v-if="partData.questions && partData.questions.length > 0")
    template(v-for="(q, index) in partData.questions" :key="q.id")
      
      .accordion-item(
        :id="'question-' + q.id" 
        :class="{ 'is-expanded': expandedIds.includes(q.id), 'is-dragging': dragEditorIndex === index }"
        :draggable="dragEnabledIndex === index"
        @dragstart="onDragStartEditor(index, $event)"
        @dragover.prevent
        @dragenter.prevent
        @drop="onDropEditor(index)"
        @dragend="onDragEndEditor"
      )
        
        // THANH TIÊU ĐỀ TỐI GIẢN
        .accordion-header(
          @click="toggleQuestion(q.id)"
          @mouseenter="dragEnabledIndex = index"
          @mouseleave="dragEnabledIndex = null"
          title="Bấm để mở rộng/thu gọn, kéo thả để hoán đổi vị trí"
        )
          .header-left
            span.drag-handle ⣿
            span.q-title {{ startNumber + index }}
            
            // BADGE ĐÁP ÁN
            .header-options-badge(v-if="q.type === 'multiple_choice'")
              span.mini-circle(
                v-for="(opt, oIdx) in q.options" 
                :key="oIdx"
                :class="{ 'is-correct': q.correctAnswer === getOptionLabel(oIdx) }"
              ) {{ getOptionLabel(oIdx) }}
            .header-text-badge(v-else-if="q.type === 'matching'")
              span.text-badge-correct Ghép cặp
            .header-text-badge(v-else-if="q.correctAnswer")
              span.text-badge-correct Key: {{ q.correctAnswer }}

          .header-actions
            button.btn-add-mini(@click.stop="insertQuestionAbove(index)" title="Chèn 1 câu hỏi lên TRÊN") + Trên
            button.btn-add-mini(@click.stop="insertQuestionBelow(index)" title="Chèn 1 câu hỏi xuống DƯỚI") + Dưới
            button.btn-add-mini.new-group-btn(@click.stop="insertNewPassage(index)" title="Tạo 1 ĐOẠN MỚI phía dưới") + Đoạn
            button.btn-del-question(@click.stop="deleteQuestion(index)" title="Xóa câu này") Xóa

        // NỘI DUNG BIÊN SOẠN KHỐI
        .accordion-body(v-show="expandedIds.includes(q.id)")
          
          // KHỐI ĐỌC HIỂU (CHỈ HIỂN THỊ CÂU ĐẦU TIÊN CỦA GROUP)
          .shared-context-box(v-if="index === 0 || partData.questions[index - 1].groupId !== q.groupId")
            h3.shared-title Bối cảnh / Đọc hiểu (Nhóm câu hỏi)
            
            .passage-items-list
              .passage-item-card(v-for="(passage, pIdx) in getPassages(q, 'passages')" :key="'p' + pIdx")
                .passage-item-header
                  span.passage-label Đoạn {{ pIdx + 1 }}
                  button.btn-remove-passage(v-if="q.passages && q.passages.length > 1" @click="removePassageItem(q, pIdx, 'passages')" title="Xóa đoạn này") ×
                
                .passage-item-body
                  .text-passage-wrapper(v-if="passage.type === 'text'")
                    RichTextEditor(v-model="passage.content" placeholder="Nhập nội dung tài liệu đọc hiểu...")
                  .image-passage-wrapper(v-else-if="passage.type === 'image'")
                    .preview-container(v-if="passage.url")
                      img.preview-img(:src="passage.url")
                      button.btn-remove-media(@click="passage.url = ''") ×
                    .upload-box.image-box(v-else)
                      input.media-input(v-model="passage.url" placeholder="URL ảnh")

            .passage-action-bar
              button.btn-add-item-mini(@click="addPassageItem(q, 'text', 'passages')") + Thêm Đoạn Văn Bản
              button.btn-add-item-mini(@click="addPassageItem(q, 'image', 'passages')") + Thêm Hình Ảnh

          // BAR THIẾT LẬP DẠNG THỨC, ĐIỂM SỐ & THỜI GIAN CHỜ
          .setting-type-row.mb-4
            .type-selector
              label Chọn dạng thức:
              .radio-group
                label.radio-label
                  input(type="radio" :name="'q-type-'+q.id" value="multiple_choice" v-model="q.type" @change="onTypeChange(q)")
                  span Trắc nghiệm
                label.radio-label
                  input(type="radio" :name="'q-type-'+q.id" value="text_input" v-model="q.type" @change="onTypeChange(q)")
                  span Điền từ
                label.radio-label
                  input(type="radio" :name="'q-type-'+q.id" value="matching" v-model="q.type" @change="onTypeChange(q)")
                  span Ghép cặp
            
            .score-selector
              label.toggle-switch(title="Bật tính điểm cho câu này")
                input(type="checkbox" v-model="q.scoreEnabled")
                span.slider
              span.score-label Điểm:
              input.score-input(v-if="q.scoreEnabled" type="number" v-model="q.score" step="0.5" min="0")
            

          // CÂU HỎI VÀ GIẢI THÍCH CHUNG
          .question-content-box
            .shared-context-box.mb-4(style="background: #e0f2fe; border-color: #bfdbfe;")
              .top-row-grid
                .editor-card.q-text-card
                  h4 Nội dung câu hỏi
                  RichTextEditor(v-model="q.text" placeholder="Nhập câu hỏi chi tiết...")
                .editor-card.explanation-card
                  h4 Giải thích chi tiết đáp án
                  RichTextEditor(v-model="q.explanation" placeholder="Nhập giải thích cho câu hỏi này...")

            // LƯỚI ĐÁP ÁN (Dựa theo Type)
            template(v-if="q.type === 'multiple_choice'")
              .editor-card.options-card
                .options-header-flex
                  h4 Danh sách lựa chọn đáp án
                  button.btn-add-opt-mini(@click="q.options.push('')") + Thêm đáp án (E, F...)
                
                .options-grid
                  .option-row(
                    v-for="(opt, oIdx) in q.options" 
                    :key="oIdx" 
                    :class="{ 'correct-row': q.correctAnswer === getOptionLabel(oIdx) }"
                  )
                    button.btn-select-correct(
                      type="button" 
                      :class="{ 'is-correct': q.correctAnswer === getOptionLabel(oIdx) }" 
                      @click="q.correctAnswer = getOptionLabel(oIdx)"
                    ) {{ getOptionLabel(oIdx) }}
                    
                    textarea.option-textarea(
                      v-model="q.options[oIdx]" 
                      rows="1"
                      @input="autoResize"
                    )
                    button.btn-remove-opt-cross(v-if="q.options.length > 2" @click="removeOptionItem(q, oIdx)") ×

            template(v-else-if="q.type === 'matching'")
              .editor-card.matching-card
                .options-header-flex
                  h4 Cấu hình cặp ghép nối (Học viên nối Trái với Phải)
                  button.btn-add-opt-mini(@click="q.pairs.push({left: '', right: ''})") + Thêm cặp
                
                .matching-grid
                  .matching-row(v-for="(pair, pIdx) in q.pairs" :key="pIdx")
                    input.text-field-input.flex-1(v-model="pair.left" placeholder="Vế trái (VD: Arrive)")
                    span.match-icon ↔
                    input.text-field-input.flex-1(v-model="pair.right" placeholder="Vế phải (VD: Đến)")
                    button.btn-remove-opt-cross.relative-cross(v-if="q.pairs.length > 2" @click="q.pairs.splice(pIdx, 1)") ×

            template(v-else)
              .editor-card.short-answer-card
                h4 Cấu hình đáp án điền từ
                .grid-2
                  .input-field-group
                    label Từ khóa chính xác
                    input.text-field-input(v-model="q.correctAnswer" placeholder="Ví dụ: transformation")
                  .input-field-group
                    label Placeholder hiển thị (Nếu có)
                    input.text-field-input(v-model="q.textPlaceholder" placeholder="Ví dụ: Nhập một danh từ...")

      // ĐƯỜNG KẺ PHÂN CÁCH (NẰM Ở CUỐI MỖI GROUP)
      .group-divider(v-if="index !== partData.questions.length - 1 && partData.questions[index + 1].groupId !== q.groupId")
        .divider-line

  .empty-state(v-else)
    h4 Phần này chưa có câu hỏi nào.
  
  // NÚT THÊM ĐOẠN Ở ĐÁY
  button.btn-add-large(v-if="!partData.questions || partData.questions.length === 0" @click="addReadingGroupAtEnd") 
    span.add-icon +
    | Bắt đầu thêm Đoạn mới
  button.btn-add-large.mt-4(v-else @click="addReadingGroupAtEnd") 
    span.add-icon +
    | Thêm Đoạn mới ở dưới cùng

  // MODAL XÁC NHẬN CHO EDITOR
  .modal-overlay(v-if="confirmModal.isOpen" @click.self="closeModal")
    .custom-modal
      h3.modal-title Cảnh báo
      p.modal-message {{ confirmModal.message }}
      label.checkbox-label
        input(type="checkbox" v-model="confirmModal.dontShowAgain")
        span Không hiển thị lại trong phiên này
      .modal-actions
        button.btn-cancel(@click="closeModal") Hủy
        button.btn-confirm.btn-danger(@click="executePendingAction") OK
</template>

<script setup lang="ts">
import { ref, toRef, watch, nextTick } from 'vue';
import RichTextEditor from '../../../components/RichTextEditor.vue';

const props = defineProps<{ 
  modelValue: any, 
  startNumber: number,
  sessionConfig: { skipDeleteConfirm: boolean; skipSwapConfirm: boolean }
}>();

const emit = defineEmits(['update:modelValue']);
const partData = toRef(props, 'modelValue');

// Khởi tạo sharedContext cho Part nếu chưa có
watch(() => partData.value, (val) => {
  if (val && typeof val.sharedContext === 'undefined') {
    val.sharedContext = '';
  }
}, { immediate: true, deep: true });

const expandedIds = ref<number[]>([]);

// Cập nhật mô hình dữ liệu câu hỏi để đảm bảo tính tương thích ngược
watch(() => partData.value.questions, (qs) => {
  if (!qs) return;
  qs.forEach((q: any) => {
    if (!q.groupId) q.groupId = 'group_' + q.id;
    if (typeof q.scoreEnabled === 'undefined') q.scoreEnabled = false;
    if (typeof q.score === 'undefined') q.score = 1;
    if (typeof q.waitingTime === 'undefined') q.waitingTime = 0;
    if (q.type === 'matching' && !q.pairs) q.pairs = [{left: '', right: ''}, {left: '', right: ''}];
  });
}, { immediate: true, deep: true });

const autoResize = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  target.style.height = 'auto'; 
  target.style.height = target.scrollHeight + 'px'; 
};

// ==========================================
// QUẢN LÝ PASSAGES CHO GROUP
// ==========================================
const rebalanceGroupPassages = () => {
  const passageMap = new Map();
  partData.value.questions.forEach((q: any) => {
    if (q.passages && q.passages.length > 0) {
      if (!passageMap.has(q.groupId)) passageMap.set(q.groupId, JSON.parse(JSON.stringify(q.passages)));
    }
    delete q.passages; 
  });

  partData.value.questions.forEach((q: any, index: number) => {
    const isLeader = index === 0 || partData.value.questions[index - 1].groupId !== q.groupId;
    if (isLeader) {
      q.passages = passageMap.get(q.groupId) || [{ type: 'text', content: '' }];
    }
  });
};

const getPassages = (q: any, key: 'passages') => {
  if (!q[key] || !Array.isArray(q[key]) || q[key].length === 0) {
    q[key] = [{ type: 'text', content: '' }];
  }
  return q[key];
};

const addPassageItem = (q: any, type: 'text' | 'image', key: 'passages') => {
  if (!q[key]) q[key] = [];
  if (type === 'text') q[key].push({ type: 'text', content: '' });
  else q[key].push({ type: 'image', url: '' });
};

const removePassageItem = (q: any, idx: number, key: 'passages') => {
  if (q[key] && q[key].length > 1) q[key].splice(idx, 1);
};

// ==========================================
// MODAL & SWAP LOGIC
// ==========================================
const confirmModal = ref({ isOpen: false, message: '', dontShowAgain: false, type: '' as 'delete' | 'swap' | '', pendingAction: null as (() => void) | null });
const openModal = (message: string, type: 'delete' | 'swap', action: () => void) => {
  const shouldSkip = type === 'delete' ? props.sessionConfig.skipDeleteConfirm : props.sessionConfig.skipSwapConfirm;
  if (shouldSkip) { action(); return; }
  confirmModal.value = { isOpen: true, message, dontShowAgain: false, type, pendingAction: action };
};
const closeModal = () => { confirmModal.value.isOpen = false; confirmModal.value.pendingAction = null; };
const executePendingAction = () => {
  if (confirmModal.value.dontShowAgain) {
    if (confirmModal.value.type === 'delete') props.sessionConfig.skipDeleteConfirm = true;
    else if (confirmModal.value.type === 'swap') props.sessionConfig.skipSwapConfirm = true;
  }
  if (confirmModal.value.pendingAction) confirmModal.value.pendingAction();
  closeModal();
};

const dragEditorIndex = ref<number | null>(null);
const dragEnabledIndex = ref<number | null>(null);

const onDragStartEditor = (index: number, event: DragEvent) => {
  dragEditorIndex.value = index;
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  expandedIds.value = []; 
};

const onDropEditor = (targetIndex: number) => {
  if (dragEditorIndex.value !== null && dragEditorIndex.value !== targetIndex) {
    const sourceIndex = dragEditorIndex.value;
    const qSource = partData.value.questions[sourceIndex];
    const qTarget = partData.value.questions[targetIndex];
    
    openModal(`Bạn muốn hoán đổi nội dung hai câu này?`, 'swap', () => {
      const temp = {
        text: qSource.text, explanation: qSource.explanation,
        options: [...(qSource.options || [])], pairs: [...(qSource.pairs || [])],
        correctAnswer: qSource.correctAnswer, type: qSource.type,
        scoreEnabled: qSource.scoreEnabled, score: qSource.score,
        waitingTime: qSource.waitingTime, textPlaceholder: qSource.textPlaceholder
      };

      qSource.text = qTarget.text; qSource.explanation = qTarget.explanation;
      qSource.options = [...(qTarget.options || [])]; qSource.pairs = [...(qTarget.pairs || [])];
      qSource.correctAnswer = qTarget.correctAnswer; qSource.type = qTarget.type;
      qSource.scoreEnabled = qTarget.scoreEnabled; qSource.score = qTarget.score;
      qSource.waitingTime = qTarget.waitingTime; qSource.textPlaceholder = qTarget.textPlaceholder;

      qTarget.text = temp.text; qTarget.explanation = temp.explanation;
      qTarget.options = temp.options; qTarget.pairs = temp.pairs;
      qTarget.correctAnswer = temp.correctAnswer; qTarget.type = temp.type;
      qTarget.scoreEnabled = temp.scoreEnabled; qTarget.score = temp.score;
      qTarget.waitingTime = temp.waitingTime; qTarget.textPlaceholder = temp.textPlaceholder;
    });
  }
  dragEditorIndex.value = null;
};
const onDragEndEditor = () => { dragEditorIndex.value = null; dragEnabledIndex.value = null; };

// ==========================================
// CÁC HÀM CRUD CÂU HỎI
// ==========================================
const createNewQuestionObject = (groupId: string) => ({
  id: Date.now() + Math.random(),
  groupId: groupId,
  type: 'multiple_choice',
  text: '', 
  explanation: '', 
  options: ['', '', '', ''], 
  pairs: [],
  correctAnswer: '',
  scoreEnabled: false,
  score: 1,
  waitingTime: 0,
  textPlaceholder: ''
});

const insertQuestionAbove = (index: number) => {
  const groupId = partData.value.questions[index].groupId;
  const newQ = createNewQuestionObject(groupId);
  partData.value.questions.splice(index, 0, newQ);
  rebalanceGroupPassages();
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const insertQuestionBelow = (index: number) => {
  const groupId = partData.value.questions[index].groupId;
  const newQ = createNewQuestionObject(groupId);
  partData.value.questions.splice(index + 1, 0, newQ);
  rebalanceGroupPassages();
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const insertNewPassage = (index: number) => {
  const newGroupId = 'group_' + Date.now();
  const newQ = createNewQuestionObject(newGroupId);
  partData.value.questions.splice(index + 1, 0, newQ);
  rebalanceGroupPassages();
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const addReadingGroupAtEnd = () => {
  if (!partData.value.questions) partData.value.questions = [];
  const newGroupId = 'group_' + Date.now();
  const newQ = createNewQuestionObject(newGroupId);
  partData.value.questions.push(newQ);
  rebalanceGroupPassages();
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const deleteQuestion = (index: number) => { 
  openModal(`Bạn có chắc chắn muốn xóa câu này không?`, 'delete', () => {
    partData.value.questions.splice(index, 1);
    rebalanceGroupPassages();
  });
};

const getOptionLabel = (index: number) => String.fromCharCode(65 + index);
const toggleQuestion = (id: number) => {
  const idx = expandedIds.value.indexOf(id);
  if (idx === -1) expandedIds.value.push(id); else expandedIds.value.splice(idx, 1);
};

const onTypeChange = (q: any) => {
  q.correctAnswer = '';
  if (q.type === 'multiple_choice') {
    q.options = ['', '', '', ''];
    q.pairs = [];
  } else if (q.type === 'matching') {
    q.options = [];
    q.pairs = [{left: '', right: ''}, {left: '', right: ''}];
  } else {
    q.options = [];
    q.pairs = [];
  }
};

const removeOptionItem = (q: any, oIdx: number) => {
  const currentLabel = getOptionLabel(oIdx);
  q.options.splice(oIdx, 1);
  if (q.correctAnswer === currentLabel) {
    q.correctAnswer = '';
  } else if (q.correctAnswer > currentLabel) {
    const newCharCode = q.correctAnswer.charCodeAt(0) - 1;
    q.correctAnswer = String.fromCharCode(newCharCode);
  }
};
</script>

<style scoped>
.custom-editor-page { display: flex; flex-direction: column; padding-bottom: 40px; }

/* CONFIG TOÀN PART */
.part-config-box { background: white; padding: 24px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.input-wrapper { display: flex; flex-direction: column; gap: 8px; }
.input-wrapper label { font-size: 0.95rem; font-weight: 700; color: #334155; }
.text-input { padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; font-size: 0.95rem; transition: border-color 0.2s; }
.text-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
.mb-4 { margin-bottom: 20px; }
.ml-4 { margin-left: 20px; }
.mt-4 { margin-top: 20px; }

.questions-list { display: flex; flex-direction: column; }

/* ACCORDION */
.accordion-item { background: white; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s, opacity 0.2s; }
.accordion-item.is-expanded { border-color: #3b82f6; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.05); margin-bottom: 24px; }
.accordion-item.is-dragging { opacity: 0.4; border: 2px dashed #3b82f6; background-color: #eff6ff; }

.accordion-header { padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: white; cursor: grab; }
.accordion-header:active { cursor: grabbing; }
.accordion-header:hover { background: #f8fafc; }
.header-left { display: flex; gap: 12px; align-items: center; flex: 1; overflow: hidden; }
.drag-handle { color: #94a3b8; font-size: 1.2rem; padding-right: 4px; user-select: none; }
.q-title { font-weight: 800; color: #0f172a; flex-shrink: 0; font-size: 1.1rem;}

.header-options-badge { display: flex; gap: 6px; margin-left: 10px; align-items: center; }
.mini-circle { width: 20px; height: 20px; border-radius: 50%; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: #94a3b8; background: #ffffff; transition: all 0.2s ease; }
.mini-circle.is-correct { background: #22c55e; border-color: #22c55e; color: white; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3); }
.header-text-badge { margin-left: 12px; }
.text-badge-correct { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; }

/* NÚT THAO TÁC HEADER */
.header-actions { display: flex; gap: 6px; align-items: center; opacity: 0; transition: opacity 0.2s; }
.accordion-header:hover .header-actions { opacity: 1; }
.btn-add-mini { background: white; border: 1px solid #bfdbfe; color: #2563eb; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
.btn-add-mini:hover { background: #eff6ff; border-color: #3b82f6; }
.new-group-btn { border-style: dashed; border-color: #6366f1; color: #16a34a; }
.new-group-btn:hover { background: #f0fdf4; border-color: #16a34a; }
.btn-del-question { background: none; border: 1px solid #fca5a5; color: #ef4444; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; line-height: 1; display: flex; align-items: center; font-weight: 600;}
.btn-del-question:hover { background: #fee2e2; }

.accordion-body { border-top: 1px solid #e2e8f0; padding: 20px; background-color: #f8fafc; }

/* TYPE & SCORE SWITCH */
.setting-type-row { display: flex; justify-content: space-between; align-items: center; background: white; padding: 16px 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.type-selector { display: flex; align-items: center; gap: 16px; font-size: 0.95rem; font-weight: 700; color: #475569; }
.radio-group { display: flex; gap: 20px; }
.radio-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 600; }
.radio-label input { accent-color: #3b82f6; cursor: pointer; width: 16px; height: 16px;}

.score-selector { display: flex; align-items: center; border-left: 2px dashed #e2e8f0; padding-left: 20px; }
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: 0.3s; border-radius: 20px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; }
input:checked + .slider { background-color: #10b981; }
input:checked + .slider:before { transform: translateX(16px); }
.score-label { font-size: 0.9rem; font-weight: 700; color: #10b981; margin: 0 12px 0 8px; }
.score-input { width: 70px; padding: 6px 10px; border: 1px solid #10b981; border-radius: 6px; outline: none; font-weight: 700; color: #047857; background: #ecfdf5; }
.score-input:focus { box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }

/* BOX NGỮ CẢNH VÀ BOX CÂU HỎI */
.shared-context-box { background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #cbd5e1; margin-bottom: 25px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);}
.shared-title { margin: 0; color: #1e3a8a; font-size: 1.05rem; font-weight: 800; }

.passage-items-list { display: flex; flex-direction: column; gap: 16px; }
.passage-item-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
.passage-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #cbd5e1; }
.passage-label { font-weight: 700; color: #475569; font-size: 0.9rem; }
.btn-remove-passage { background: none; border: none; color: #ef4444; font-size: 1.3rem; cursor: pointer; line-height: 1; padding: 0 4px; }
.btn-remove-passage:hover { color: #dc2626; }

.upload-box { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #ffffff; min-height: 160px; }
.media-input { width: 80%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; text-align: center; font-size: 0.85rem; }
.preview-container { position: relative; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background-color: #ffffff; display: inline-flex; justify-content: center; align-items: center; max-width: 100%; }
.preview-img { max-height: 200px; object-fit: contain; border-radius: 4px; }
.btn-remove-media { position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.passage-action-bar { display: flex; gap: 12px; margin-top: 4px; }
.btn-add-item-mini { background: white; border: 1px dashed #2563eb; color: #2563eb; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-add-item-mini:hover { background: #eff6ff; border-color: #3b82f6; }

/* CÁC THÀNH PHẦN INPUT CÂU HỎI */
.top-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
.editor-card { background: white; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; }
.editor-card h4 { margin: 0 0 16px 0; color: #334155; font-size: 0.95rem; font-weight: 700; }

.options-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.options-header-flex h4 { margin: 0; color: #334155; font-size: 0.95rem; font-weight: 700;}
.btn-add-opt-mini { background: white; border: 1px dashed #3b82f6; color: #3b82f6; padding: 4px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.btn-add-opt-mini:hover { background: #eff6ff; }

/* TRẮC NGHIỆM GRID */
.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.option-row { display: flex; align-items: flex-start; gap: 10px; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; background-color: #ffffff; position: relative; }
.option-row.correct-row { border-color: #22c55e; background-color: #f0fdf4; }
.btn-select-correct { width: 30px; height: 30px; margin-top: 2px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.btn-select-correct.is-correct { background: #22c55e; color: white; border-color: #22c55e; }
.option-textarea { flex: 1; border: none; outline: none; background: transparent; font-size: 0.95rem; color: #1e293b; font-family: inherit; resize: none; overflow: hidden; min-height: 28px; padding-top: 6px; padding-right: 20px; }
.btn-remove-opt-cross { background: none; border: none; color: #cbd5e1; font-size: 1.2rem; cursor: pointer; position: absolute; top: 12px; right: 10px; line-height: 1; }
.btn-remove-opt-cross:hover { color: #ef4444; }

/* GHÉP CẶP GRID */
.matching-grid { display: flex; flex-direction: column; gap: 10px; }
.matching-row { display: flex; align-items: center; gap: 12px; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; background-color: #f8fafc; position: relative;}
.match-icon { color: #94a3b8; font-weight: bold; font-size: 1.2rem; flex-shrink: 0;}
.flex-1 { flex: 1; }
.relative-cross { position: static !important; margin-left: auto; }

/* ĐIỀN TỪ GRID */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.input-field-group { display: flex; flex-direction: column; gap: 6px; }
.input-field-group label { font-size: 0.85rem; font-weight: 700; color: #475569; }
.text-field-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 0.9rem; transition: border-color 0.2s;}
.text-field-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }

/* ĐƯỜNG PHÂN CÁCH ĐỘNG */
.group-divider { display: flex; align-items: center; margin: 16px 0 32px 0; }
.divider-line { flex: 1; border-bottom: 2px dashed #cbd5e1; }

.btn-add-large { width: 100%; padding: 14px; background: white; border: 2px dashed #bfdbfe; border-radius: 12px; color: #2563eb; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s; }
.btn-add-large:hover { background: #eff6ff; border-color: #3b82f6; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }

/* MODALS */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.custom-modal { background: white; width: 400px; padding: 24px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
.modal-title { margin: 0 0 12px 0; color: #0f172a; font-size: 1.2rem; font-weight: 700; }
.modal-message { margin: 0 0 20px 0; color: #475569; font-size: 0.95rem; line-height: 1.5; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; color: #64748b; margin-bottom: 24px; }
.checkbox-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
.btn-cancel { padding: 8px 16px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-cancel:hover { background: #f1f5f9; }
.btn-confirm { padding: 8px 16px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-confirm:hover { background: #2563eb; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }

@media (max-width: 1000px) { 
  .top-row-grid, .options-grid, .grid-2 { grid-template-columns: 1fr; } 
  .setting-type-row { flex-direction: column; align-items: flex-start; gap: 16px; }
  .score-selector { border-left: none; padding-left: 0; margin-left: 0; }
}
</style>