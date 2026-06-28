<template lang="pug">
.part-page
  .questions-list(v-if="questions.length > 0")
    template(v-for="(q, index) in questions" :key="q.id")
      
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
        
        // THANH HEADER TỐI GIẢN
        .accordion-header(
          @click="toggleQuestion(q.id)"
          @mouseenter="dragEnabledIndex = index"
          @mouseleave="dragEnabledIndex = null"
          title="Bấm để mở rộng/thu gọn, kéo thả để hoán đổi vị trí"
        )
          .header-left
            span.drag-handle ⣿
            span.q-title {{ startNumber + index }}
            
            // Vòng tròn đáp án LUÔN HIỂN THỊ
            .header-options-badge
              span.mini-circle(
                v-for="(opt, oIdx) in q.options" 
                :key="oIdx"
                :class="{ 'is-correct': q.correctAnswer === getOptionLabel(oIdx) }"
              ) {{ getOptionLabel(oIdx) }}
          
          // NÚT THAO TÁC
          .header-actions
            button.btn-add-mini(@click.stop="insertQuestion(index)" title="Chèn câu lên trên") + Trên
            button.btn-add-mini(@click.stop="insertQuestion(index + 1)" title="Chèn câu xuống dưới") + Dưới
            button.btn-del-question(@click.stop="deleteQuestion(index)" title="Xóa câu này") Xóa

        .accordion-body(v-show="expandedIds.includes(q.id)")
          .top-row-grid
            // CỘT TRÁI: HÌNH ẢNH
            .editor-card.media-card
              h4 Hình ảnh
              .media-section.single-media
                .preview-container(v-if="q.image")
                  img.preview-img(:src="q.image" alt="Preview Part 1")
                  button.btn-remove-media(@click="q.image = ''") ×
                .upload-box.image-box(v-else)
                  input.media-input(v-model="q.image" placeholder="URL ảnh")

            // CỘT PHẢI: ĐÁP ÁN
            .editor-card.options-card
              h4 Đáp án
              .options-grid
                .option-row(v-for="(opt, oIdx) in q.options" :key="oIdx" :class="{ 'correct-row': q.correctAnswer === getOptionLabel(oIdx) }")
                  button.btn-select-correct(type="button" :class="{ 'is-correct': q.correctAnswer === getOptionLabel(oIdx) }" @click="q.correctAnswer = getOptionLabel(oIdx)") {{ getOptionLabel(oIdx) }}
                  
                  textarea.option-textarea(
                    v-model="q.options[oIdx]" 
                    rows="1"
                    @input="autoResize"
                    placeholder=""
                  )

          .editor-card.transcript-card.mt-4
            h4 Transcript
            RichTextEditor(v-model="q.content")

      .group-divider(v-if="index !== questions.length - 1")
        .divider-line

  .empty-state(v-else)
    h4 Chưa có câu hỏi nào
    button.btn-add-large.mt-4(@click="addNewQuestion") + Thêm câu hỏi

  button.btn-add-large(v-if="questions.length > 0" @click="addNewQuestion") 
    span.add-icon +
    | Thêm câu hỏi

  // MODAL XÁC NHẬN TÙY CHỈNH
  .modal-overlay(v-if="confirmModal.isOpen" @click.self="closeModal")
    .custom-modal
      h3.modal-title Cảnh báo
      p.modal-message {{ confirmModal.message }}
      
      label.checkbox-label
        input(type="checkbox" v-model="confirmModal.dontShowAgain")
        span Không hiển thị lại trong bài sửa này
      
      .modal-actions
        button.btn-cancel(@click="closeModal") Hủy
        button.btn-confirm(@click="executePendingAction") OK
</template>

<script setup lang="ts">
import { ref, toRef, nextTick } from 'vue';
import RichTextEditor from '../../../components/RichTextEditor.vue';

const props = defineProps<{ 
  modelValue: any[], 
  partNumber: number, 
  startNumber: number,
  sessionConfig: { skipDeleteConfirm: boolean; skipSwapConfirm: boolean }
}>();

const emit = defineEmits(['update:modelValue']);
const questions = toRef(props, 'modelValue');

const expandedIds = ref<number[]>([]);

const autoResize = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  target.style.height = 'auto'; 
  target.style.height = target.scrollHeight + 'px'; 
};

// ==========================================
// LOGIC MODAL XÁC NHẬN (IN-MEMORY STATE)
// ==========================================
const confirmModal = ref({
  isOpen: false,
  message: '',
  dontShowAgain: false,
  type: '' as 'delete' | 'swap' | '',
  pendingAction: null as (() => void) | null
});

const openModal = (message: string, type: 'delete' | 'swap', action: () => void) => {
  const shouldSkip = type === 'delete' ? props.sessionConfig.skipDeleteConfirm : props.sessionConfig.skipSwapConfirm;
  if (shouldSkip) {
    action();
    return;
  }
  confirmModal.value = {
    isOpen: true,
    message,
    dontShowAgain: false,
    type,
    pendingAction: action
  };
};

const closeModal = () => {
  confirmModal.value.isOpen = false;
  confirmModal.value.pendingAction = null;
};

const executePendingAction = () => {
  if (confirmModal.value.dontShowAgain) {
    if (confirmModal.value.type === 'delete') {
      props.sessionConfig.skipDeleteConfirm = true;
    } else if (confirmModal.value.type === 'swap') {
      props.sessionConfig.skipSwapConfirm = true;
    }
  }
  if (confirmModal.value.pendingAction) confirmModal.value.pendingAction();
  closeModal();
};

// ==========================================
// LOGIC KÉO THẢ HOÁN ĐỔI VỊ TRÍ
// ==========================================
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
    openModal(`Bạn muốn đổi vị trí giữa câu ${props.startNumber + sourceIndex} và câu ${props.startNumber + targetIndex}?`, 'swap', () => {
      const temp = questions.value[sourceIndex];
      questions.value[sourceIndex] = questions.value[targetIndex];
      questions.value[targetIndex] = temp;
    });
  }
  dragEditorIndex.value = null;
};

const onDragEndEditor = () => {
  dragEditorIndex.value = null;
  dragEnabledIndex.value = null; 
};

// ==========================================
// LOGIC THÊM, CHÈN, XÓA CÂU HỎI
// ==========================================
const createNewObject = () => ({
  id: Date.now() + Math.random(),
  content: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  image: ''
});

const addNewQuestion = () => {
  const newQ = createNewObject();
  questions.value.push(newQ);
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const insertQuestion = (index: number) => {
  const newQ = createNewObject();
  questions.value.splice(index, 0, newQ);
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const deleteQuestion = (index: number) => {
  openModal(`Bạn có chắc chắn muốn xóa câu ${props.startNumber + index} không?`, 'delete', () => {
    questions.value.splice(index, 1);
  });
};

// ==========================================
// CÁC HÀM TIỆN ÍCH KHÁC
// ==========================================
const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

const toggleQuestion = (id: number) => {
  const idx = expandedIds.value.indexOf(id);
  if (idx === -1) expandedIds.value.push(id); else expandedIds.value.splice(idx, 1);
};
</script>

<style scoped>
.part-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }

/* CSS KHỐI ACCORDION */
.accordion-item { background: white; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s, opacity 0.2s; }
.accordion-item.is-expanded { border-color: #3b82f6; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.05); }
.accordion-item.is-dragging { opacity: 0.4; border: 2px dashed #3b82f6; background-color: #eff6ff; }

/* CSS HEADER */
.accordion-header { padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: white; cursor: grab; }
.accordion-header:active { cursor: grabbing; }
.accordion-header:hover { background: #f8fafc; }
.header-left { display: flex; gap: 12px; align-items: center; flex: 1; overflow: hidden; }
.drag-handle { color: #94a3b8; font-size: 1.2rem; padding-right: 4px; user-select: none; }
.q-title { font-weight: 800; color: #0f172a; flex-shrink: 0; font-size: 1.1rem;}

/* CSS VÒNG TRÒN ĐÁP ÁN TRÊN HEADER */
.header-options-badge { display: flex; gap: 6px; margin-left: 10px; align-items: center; }
.mini-circle { width: 20px; height: 20px; border-radius: 50%; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: #94a3b8; background: #ffffff; transition: all 0.2s ease; }
.mini-circle.is-correct { background: #22c55e; border-color: #22c55e; color: white; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3); }

/* CSS NÚT THAO TÁC TRÊN HEADER (ẨN/HIỆN KHI HOVER) */
.header-actions { display: flex; gap: 6px; align-items: center; opacity: 0; transition: opacity 0.2s; }
.accordion-header:hover .header-actions { opacity: 1; }
.btn-add-mini { background: white; border: 1px solid #bfdbfe; color: #2563eb; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
.btn-add-mini:hover { background: #eff6ff; border-color: #3b82f6; }
.btn-del-question { background: none; border: 1px solid #fca5a5; color: #ef4444; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; line-height: 1; display: flex; align-items: center; font-weight: 600;}
.btn-del-question:hover { background: #fee2e2; }

/* CSS BODY */
.accordion-body { border-top: 1px solid #e2e8f0; padding: 20px; background-color: #f8fafc; }
.top-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: stretch; }
.editor-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
.media-card h4, .options-card h4, .transcript-card h4 { margin: 0 0 16px 0; color: #334155; font-size: 1rem; font-weight: 600; }
.mt-4 { margin-top: 16px; }

/* CÁC THÀNH PHẦN UPLOAD ẢNH & ĐÁP ÁN */
.single-media { flex: 1; display: flex; flex-direction: column; justify-content: center; width: 100%; }
.upload-box { flex: 1; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f8fafc; min-height: 260px; }
.media-input { width: 90%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; text-align: center; font-size: 0.9rem; }
.preview-container { position: relative; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background-color: #f8fafc; display: flex; justify-content: center; align-items: center; flex: 1; }
.preview-img { max-height: 240px; object-fit: contain; border-radius: 4px; }
.btn-remove-media { position: absolute; top: -10px; right: -10px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.options-grid { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.option-row { display: flex; align-items: flex-start; gap: 14px; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; background-color: #f8fafc; }
.option-row:focus-within { border-color: #3b82f6; background-color: white; }
.option-row.correct-row { border-color: #22c55e; background-color: #f0fdf4; }
.btn-select-correct { width: 32px; height: 32px; margin-top: 2px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.btn-select-correct.is-correct { background: #22c55e; color: white; border-color: #22c55e; }
.option-textarea { flex: 1; border: none; outline: none; background: transparent; font-size: 0.95rem; color: #1e293b; font-family: inherit; resize: none; overflow: hidden; min-height: 28px; line-height: 1.4; padding-top: 6px; }

/* CSS PHÂN TRANG VÀ EMPTY STATE */
.group-divider { display: flex; align-items: center; margin: 16px 0; }
.divider-line { flex: 1; border-bottom: 1px solid #e2e8f0; }
.btn-add-large { width: 100%; padding: 14px; margin-top: 4px; background: white; border: 2px dashed #bfdbfe; border-radius: 12px; color: #2563eb; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.btn-add-large:hover { background: #eff6ff; border-color: #3b82f6; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }

/* MODAL TÙY CHỈNH */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.custom-modal { background: white; width: 400px; padding: 24px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
.modal-title { margin: 0 0 12px 0; color: #0f172a; font-size: 1.2rem; font-weight: 700; }
.modal-message { margin: 0 0 20px 0; color: #475569; font-size: 0.95rem; line-height: 1.5; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; color: #64748b; margin-bottom: 24px; }
.checkbox-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
.btn-cancel { padding: 8px 16px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-cancel:hover { background: #f1f5f9; }
.btn-confirm { padding: 8px 16px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-confirm:hover { background: #2563eb; }

@media (max-width: 1100px) { .top-row-grid { grid-template-columns: 1fr; gap: 16px; } }
</style>