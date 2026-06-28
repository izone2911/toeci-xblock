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
        
        // THANH TIÊU ĐỀ TỐI GIẢN CHUẨN UX
        .accordion-header(
          @click="toggleQuestion(q.id)"
          @mouseenter="dragEnabledIndex = index"
          @mouseleave="dragEnabledIndex = null"
          title="Bấm để mở rộng/thu gọn, kéo thả để hoán đổi vị trí"
        )
          .header-left
            span.drag-handle ⣿
            span.q-title {{ startNumber + index }}
            
            // VÒNG TRÒN ĐÁP ÁN LUÔN HIỂN THỊ (A, B, C, D)
            .header-options-badge
              span.mini-circle(
                v-for="(opt, oIdx) in q.options" 
                :key="oIdx"
                :class="{ 'is-correct': q.correctAnswer === getOptionLabel(oIdx) }"
              ) {{ getOptionLabel(oIdx) }}

          // NHÓM NÚT THAO TÁC (Chỉ hiện khi Hover)
          .header-actions
            button.btn-add-mini(@click.stop="insertQuestion(index)" title="Chèn 1 câu lên trên") + Trên
            button.btn-add-mini(@click.stop="insertQuestion(index + 1)" title="Chèn 1 câu xuống dưới") + Dưới
            button.btn-del-question(@click.stop="deleteQuestion(index)" title="Xóa câu này") Xóa

        // NỘI DUNG BIÊN SOẠN KHỐI
        .accordion-body(v-show="expandedIds.includes(q.id)")
          
          // ==========================================
          // ĐOẠN VĂN CHUNG (CHỈ HIỂN THỊ Ở ĐẦU CỤM 4 CÂU: INDEX % 4 === 0)
          // ==========================================
          .shared-context-box(v-if="index % 4 === 0")
            h3.shared-title Đoạn văn
            .top-row-grid
              // Cột trái: Nội dung đoạn văn
              .editor-card.passage-card
                h4 Nội dung đoạn văn
                RichTextEditor(v-model="q.content" placeholder="Nhập nội dung đoạn văn chứa các khoảng trống cần điền vào đây...")
              
              // Cột phải: Transcript / Giải thích đoạn văn
              .editor-card.explanation-card
                h4 Giải thích / Transcript
                RichTextEditor(v-model="q.image" placeholder="Dịch nghĩa toàn bộ đoạn văn hoặc thêm chú thích chung...")

          // ==========================================
          // CÂU HỎI & ĐÁP ÁN ĐƠN LẺ TRONG ĐOẠN VĂN
          // ==========================================
          .question-content-box
            .editor-card.q-text-card
              h4 Giải thích chi tiết đáp án
              RichTextEditor(v-model="q.text" placeholder="Nhập phần giải thích tại sao chọn đáp án này, từ vựng liên quan...")

            .editor-card.options-card.mt-4
              h4 Đáp án
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
                    placeholder=""
                  )

      // ĐƯỜNG KẺ PHÂN CÁCH NÉT LIỀN ĐỒNG BỘ ĐỦ 4 CÂU MỘT ĐOẠN
      .group-divider(v-if="(index + 1) % 4 === 0 && index !== questions.length - 1")
        .divider-line

  .empty-state(v-else)
    h4 Chưa có câu hỏi nào
    button.btn-add-large.mt-4(@click="addPassageGroup") + Bắt đầu thêm khối đoạn văn

  // NÚT THÊM CHÙM NGUYÊN KHỐI 4 CÂU
  button.btn-add-large(v-if="questions.length > 0" @click="addPassageGroup") 
    span.add-icon +
    | Thêm đoạn văn

  // MODAL XÁC NHẬN TÙY CHỈNH QUA STATE RAM
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
// THUẬT TOÁN AUTO-REBALANCE CHO KHỐI 4 CÂU
// ==========================================
const rebalanceContexts = () => {
  for (let i = 0; i < questions.value.length; i += 4) {
    let foundContent = '';
    let foundImage = ''; // Dùng trường image làm Transcript/Giải thích chung
    
    // Tìm văn bản đoạn văn đang nằm ở bất kỳ đâu trong cụm 4 câu
    for (let j = 0; j < 4; j++) {
      const q = questions.value[i + j];
      if (q) {
        if (!foundContent && q.content) foundContent = q.content;
        if (!foundImage && q.image) foundImage = q.image;
        q.content = ''; 
        q.image = '';
      }
    }
    
    // Đẩy trả văn bản về đúng vị trí đầu tiên của khối (index % 4 === 0)
    if (questions.value[i]) {
      questions.value[i].content = foundContent;
      questions.value[i].image = foundImage;
    }
  }
};

// ==========================================
// LOGIC MODAL XÁC NHẬN CHỐNG LỖI IFRAME
// ==========================================
const confirmModal = ref({
  isOpen: false, message: '', dontShowAgain: false, type: '' as 'delete' | 'swap' | '', pendingAction: null as (() => void) | null
});

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
      rebalanceContexts(); // Sắp xếp lại văn bản nền
    });
  }
  dragEditorIndex.value = null;
};

const onDragEndEditor = () => { dragEditorIndex.value = null; dragEnabledIndex.value = null; };

// ==========================================
// THAO TÁC DỮ LIỆU
// ==========================================
const createNewQuestion = () => ({
  id: Date.now() + Math.random(), 
  text: '', // Trường này giờ chứa "Giải thích chi tiết đáp án"
  content: '', 
  image: '', // Trường này giờ chứa "Transcript chung đoạn văn"
  options: ['', '', '', ''], 
  correctAnswer: ''
});

const insertQuestion = (index: number) => {
  const newQ = createNewQuestion();
  questions.value.splice(index, 0, newQ);
  rebalanceContexts();
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const addPassageGroup = () => {
  const baseId = Date.now();
  questions.value.push(createNewQuestion());
  questions.value.push(createNewQuestion());
  questions.value.push(createNewQuestion());
  questions.value.push(createNewQuestion());
  
  rebalanceContexts();
  expandedIds.value.push(questions.value[questions.value.length - 4].id);
  nextTick(() => { document.getElementById(`question-${questions.value[questions.value.length - 4].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const deleteQuestion = (index: number) => { 
  openModal(`Bạn có chắc chắn muốn xóa câu này không?`, 'delete', () => {
    questions.value.splice(index, 1);
    rebalanceContexts();
  });
};

const getOptionLabel = (index: number) => String.fromCharCode(65 + index);
const toggleQuestion = (id: number) => {
  const idx = expandedIds.value.indexOf(id);
  if (idx === -1) expandedIds.value.push(id); else expandedIds.value.splice(idx, 1);
};
</script>

<style scoped>
.part-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }

/* ACCORDION CÂU HỎI */
.accordion-item { background: white; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s, opacity 0.2s; }
.accordion-item.is-expanded { border-color: #3b82f6; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.05); margin-bottom: 24px; }
.accordion-item.is-dragging { opacity: 0.4; border: 2px dashed #3b82f6; background-color: #eff6ff; }

/* HEADER TỐI GIẢN */
.accordion-header { padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: white; cursor: grab; }
.accordion-header:active { cursor: grabbing; }
.accordion-header:hover { background: #f8fafc; }
.header-left { display: flex; gap: 12px; align-items: center; flex: 1; overflow: hidden; }
.drag-handle { color: #94a3b8; font-size: 1.2rem; padding-right: 4px; user-select: none; }
.q-title { font-weight: 800; color: #0f172a; flex-shrink: 0; font-size: 1.1rem;}

.header-options-badge { display: flex; gap: 6px; margin-left: 10px; align-items: center; }
.mini-circle { width: 20px; height: 20px; border-radius: 50%; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: #94a3b8; background: #ffffff; transition: all 0.2s ease;}
.mini-circle.is-correct { background: #22c55e; border-color: #22c55e; color: white; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3); }

/* NÚT THAO TÁC HEADER */
.header-actions { display: flex; gap: 6px; align-items: center; opacity: 0; transition: opacity 0.2s; }
.accordion-header:hover .header-actions { opacity: 1; }
.btn-add-mini { background: white; border: 1px solid #bfdbfe; color: #2563eb; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
.btn-add-mini:hover { background: #eff6ff; border-color: #3b82f6; }
.btn-del-question { background: none; border: 1px solid #fca5a5; color: #ef4444; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; line-height: 1; display: flex; align-items: center; font-weight: 600;}
.btn-del-question:hover { background: #fee2e2; }

.accordion-body { border-top: 1px solid #e2e8f0; padding: 25px; background-color: #f8fafc; }

/* KHỐI ĐOẠN VĂN DÙNG CHUNG */
.shared-context-box { background: #e0f2fe; padding: 20px; border-radius: 12px; border: 1px solid #bfdbfe; margin-bottom: 25px; }
.shared-title { margin: 0 0 15px 0; color: #1e3a8a; font-size: 1.05rem; font-weight: 800; }
.passage-card { border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; background: white; }

/* CÁC THÀNH PHẦN INPUT CÂU HỎI */
.editor-card { background: white; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; }
.editor-card h4 { margin: 0 0 16px 0; color: #334155; font-size: 1rem; font-weight: 700; }
.q-text-input { width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.05rem; color: #1e293b; outline: none; box-sizing: border-box; }
.q-text-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
.mt-4 { margin-top: 15px; }
.top-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }

/* LƯỚI ĐÁP ÁN ĐỒNG BỘ */
.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.option-row { display: flex; align-items: flex-start; gap: 10px; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; background-color: #ffffff; }
.option-row:focus-within { border-color: #3b82f6; }
.option-row.correct-row { border-color: #22c55e; background-color: #f0fdf4; }
.btn-select-correct { width: 30px; height: 30px; margin-top: 2px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.btn-select-correct.is-correct { background: #22c55e; color: white; border-color: #22c55e; }
.option-textarea { flex: 1; border: none; outline: none; background: transparent; font-size: 0.95rem; color: #1e293b; font-family: inherit; resize: none; overflow: hidden; min-height: 28px; line-height: 1.4; padding-top: 6px; }

/* ĐƯỜNG PHÂN CÁCH NÉT LIỀN ĐỒNG BỘ */
.group-divider { display: flex; align-items: center; margin: 16px 0; }
.divider-line { flex: 1; border-bottom: 1px solid #e2e8f0; }

.btn-add-large { width: 100%; padding: 14px; margin-top: 10px; background: white; border: 2px dashed #bfdbfe; border-radius: 12px; color: #2563eb; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.2s; }
.btn-add-large:hover { background: #eff6ff; border-color: #3b82f6; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #64748b; }

/* MODAL TÙY CHỈNH */
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

@media (max-width: 1000px) { .top-row-grid, .options-grid { grid-template-columns: 1fr; gap: 16px; } }
</style>