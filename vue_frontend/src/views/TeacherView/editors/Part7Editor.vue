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

          // NHÓM NÚT THAO TÁC
          .header-actions
            button.btn-add-mini(@click.stop="insertQuestionAbove(index)" title="Chèn 1 câu hỏi lên TRÊN (cùng đoạn này)") + Trên
            button.btn-add-mini(@click.stop="insertQuestionBelow(index)" title="Chèn 1 câu hỏi xuống DƯỚI (cùng đoạn này)") + Dưới
            button.btn-add-mini.new-group-btn(@click.stop="insertNewPassage(index)" title="Tạo 1 ĐOẠN VĂN MỚI phía dưới") + Đoạn
            button.btn-del-question(@click.stop="deleteQuestion(index)" title="Xóa câu này") Xóa

        // NỘI DUNG BIÊN SOẠN KHỐI
        .accordion-body(v-show="expandedIds.includes(q.id)")
          
          // ==========================================
          // KHỐI ĐỌC HIỂU (CHỈ HIỂN THỊ Ở CÂU ĐẦU TIÊN CỦA MỖI GROUP)
          // ==========================================
          .shared-context-box(v-if="index === 0 || questions[index - 1].groupId !== q.groupId")
            h3.shared-title Đọc hiểu
            
            .passage-items-list
              .passage-item-card(v-for="(passage, pIdx) in getPassages(q, 'passages')" :key="'p' + pIdx")
                .passage-item-header
                  span.passage-label Đoạn {{ pIdx + 1 }}
                  button.btn-remove-passage(v-if="q.passages && q.passages.length > 1" @click="removePassageItem(q, pIdx, 'passages')" title="Xóa đoạn này") ×
                
                .passage-item-body
                  // KIỂU CHỮ
                  .text-passage-wrapper(v-if="passage.type === 'text'")
                    RichTextEditor(v-model="passage.content" placeholder="Nhập nội dung tài liệu đọc hiểu...")
                  
                  // KIỂU ẢNH
                  .image-passage-wrapper(v-else-if="passage.type === 'image'")
                    .preview-container(v-if="passage.url")
                      img.preview-img(:src="passage.url")
                      button.btn-remove-media(@click="passage.url = ''") ×
                    .upload-box.image-box(v-else)
                      input.media-input(v-model="passage.url" placeholder="URL ảnh")

            // NÚT CHÈN ĐA TẦNG CHO ĐỌC HIỂU
            .passage-action-bar
              button.btn-add-item-mini(@click="addPassageItem(q, 'text', 'passages')") + Thêm Đoạn Văn Bản
              button.btn-add-item-mini(@click="addPassageItem(q, 'image', 'passages')") + Thêm Hình Ảnh

          // ==========================================
          // KHỐI GIẢI THÍCH / TRANSCRIPT ĐA TẦNG (TƯƠNG TỰ ĐỌC HIỂU)
          // ==========================================
          .shared-context-box(v-if="index === 0 || questions[index - 1].groupId !== q.groupId")
            h3.shared-title Giải thích / Transcript
            
            .passage-items-list
              .passage-item-card(v-for="(transcript, tIdx) in getPassages(q, 'transcripts')" :key="'t' + tIdx")
                .passage-item-header
                  span.passage-label Đoạn {{ tIdx + 1 }}
                  button.btn-remove-passage(v-if="q.transcripts && q.transcripts.length > 1" @click="removePassageItem(q, tIdx, 'transcripts')" title="Xóa đoạn này") ×
                
                .passage-item-body
                  // KIỂU CHỮ
                  .text-passage-wrapper(v-if="transcript.type === 'text'")
                    RichTextEditor(v-model="transcript.content" placeholder="Nhập bản dịch, transcript hoặc giải thích chung...")
                  
                  // KIỂU ẢNH
                  .image-passage-wrapper(v-else-if="transcript.type === 'image'")
                    .preview-container(v-if="transcript.url")
                      img.preview-img(:src="transcript.url")
                      button.btn-remove-media(@click="transcript.url = ''") ×
                    .upload-box.image-box(v-else)
                      input.media-input(v-model="transcript.url" placeholder="URL ảnh")

            // NÚT CHÈN ĐA TẦNG CHO TRANSCRIPT
            .passage-action-bar
              button.btn-add-item-mini(@click="addPassageItem(q, 'text', 'transcripts')") + Thêm Đoạn Văn Bản
              button.btn-add-item-mini(@click="addPassageItem(q, 'image', 'transcripts')") + Thêm Hình Ảnh

          // ==========================================
          // CÂU HỎI VÀ ĐÁP ÁN ĐƠN LẺ
          // ==========================================
          .question-content-box
            
            // BỌC CÂU HỎI VÀ GIẢI THÍCH CHI TIẾT TRONG CÙNG KHỐI MÀU #e0f2fe
            .shared-context-box.mb-4
              .top-row-grid
                // Cột trái: Câu hỏi
                .editor-card.q-text-card
                  h4 Câu hỏi
                  RichTextEditor(v-model="q.text" placeholder="Nhập câu hỏi đọc hiểu...")

                // Cột phải: Giải thích chi tiết đáp án
                .editor-card.explanation-card
                  h4 Giải thích chi tiết đáp án
                  RichTextEditor(v-model="q.explanation" placeholder="Nhập giải thích cho câu hỏi này...")

            // LƯỚI ĐÁP ÁN
            .editor-card.options-card
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

      // ĐƯỜNG KẺ PHÂN CÁCH (NẰM Ở CUỐI MỖI GROUP)
      .group-divider(v-if="index !== questions.length - 1 && questions[index + 1].groupId !== q.groupId")
        .divider-line

  .empty-state(v-else)
    h4 Chưa có câu hỏi nào

  button.btn-add-large(v-if="questions.length === 0" @click="addReadingGroupAtEnd") 
    span.add-icon +
    | Bắt đầu thêm Đoạn Đọc Hiểu
  button.btn-add-large(v-else @click="addReadingGroupAtEnd") 
    span.add-icon +
    | Thêm Đoạn Đọc Hiểu Mới

  // MODAL XÁC NHẬN
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
// THUẬT TOÁN QUẢN LÝ TÀI SẢN ĐOẠN VĂN & TRANSCRIPT THEO GROUP ID
// ==========================================
const rebalanceGroupPassages = () => {
  const passageMap = new Map();
  const transcriptMap = new Map();
  
  // Bước 1: Thu gom tất cả dữ liệu của từng Nhóm
  questions.value.forEach(q => {
    // Thu gom Passage
    if (q.passages && q.passages.length > 0) {
      if (!passageMap.has(q.groupId)) {
        passageMap.set(q.groupId, JSON.parse(JSON.stringify(q.passages)));
      }
    }
    delete q.passages; 

    // Thu gom Transcript
    if (q.transcripts && q.transcripts.length > 0) {
      if (!transcriptMap.has(q.groupId)) {
        transcriptMap.set(q.groupId, JSON.parse(JSON.stringify(q.transcripts)));
      }
    }
    delete q.transcripts; 
  });

  // Bước 2: Bàn giao lại tài sản cho NGƯỜI ĐỨNG ĐẦU MỖI NHÓM
  questions.value.forEach((q, index) => {
    const isLeader = index === 0 || questions.value[index - 1].groupId !== q.groupId;
    if (isLeader) {
      q.passages = passageMap.get(q.groupId) || [{ type: 'text', content: '' }];
      q.transcripts = transcriptMap.get(q.groupId) || [{ type: 'text', content: '' }];
    }
  });
};

const getPassages = (q: any, key: 'passages' | 'transcripts') => {
  if (!q[key] || !Array.isArray(q[key]) || q[key].length === 0) {
    q[key] = [{ type: 'text', content: '' }];
  }
  return q[key];
};

const addPassageItem = (q: any, type: 'text' | 'image', key: 'passages' | 'transcripts') => {
  if (!q[key]) q[key] = [];
  if (type === 'text') q[key].push({ type: 'text', content: '' });
  else q[key].push({ type: 'image', url: '' });
};

const removePassageItem = (q: any, idx: number, key: 'passages' | 'transcripts') => {
  if (q[key] && q[key].length > 1) q[key].splice(idx, 1);
};

// ==========================================
// LOGIC MODAL XÁC NHẬN
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
// KÉO THẢ HOÁN ĐỔI: CHỈ ĐỔI NỘI DUNG CHỮ
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
    const qSource = questions.value[sourceIndex];
    const qTarget = questions.value[targetIndex];
    
    openModal(`Bạn muốn hoán đổi nội dung hai câu này?`, 'swap', () => {
      
      const tempText = qSource.text;
      const tempExp = qSource.explanation;
      const tempOptions = [...qSource.options];
      const tempCorrect = qSource.correctAnswer;

      qSource.text = qTarget.text;
      qSource.explanation = qTarget.explanation;
      qSource.options = [...qTarget.options];
      qSource.correctAnswer = qTarget.correctAnswer;

      qTarget.text = tempText;
      qTarget.explanation = tempExp;
      qTarget.options = tempOptions;
      qTarget.correctAnswer = tempCorrect;
    });
  }
  dragEditorIndex.value = null;
};
const onDragEndEditor = () => { dragEditorIndex.value = null; dragEnabledIndex.value = null; };

// ==========================================
// CÁC HÀM THÊM / CHÈN / XÓA THEO NHÓM
// ==========================================
const createNewQuestionObject = (groupId: string) => ({
  id: Date.now() + Math.random(),
  groupId: groupId,
  text: '', 
  explanation: '', 
  options: ['', '', '', ''], 
  correctAnswer: ''
});

// THÊM TRÊN: Cùng Group
const insertQuestionAbove = (index: number) => {
  const groupId = questions.value[index].groupId;
  const newQ = createNewQuestionObject(groupId);
  questions.value.splice(index, 0, newQ);
  rebalanceGroupPassages();
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

// THÊM DƯỚI: Cùng Group
const insertQuestionBelow = (index: number) => {
  const groupId = questions.value[index].groupId;
  const newQ = createNewQuestionObject(groupId);
  questions.value.splice(index + 1, 0, newQ);
  rebalanceGroupPassages();
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

// THÊM ĐOẠN MỚI TẠI CÂU: Tạo đoạn mới có 1 câu
const insertNewPassage = (index: number) => {
  const newGroupId = 'group_' + Date.now();
  const newQ = createNewQuestionObject(newGroupId);
  questions.value.splice(index + 1, 0, newQ);
  rebalanceGroupPassages();
  expandedIds.value.push(newQ.id);
  nextTick(() => { document.getElementById(`question-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

// Bấm nút thêm khối Đọc hiểu ở cuối (3 câu)
const addReadingGroupAtEnd = () => {
  const newGroupId = 'group_' + Date.now();
  questions.value.push(createNewQuestionObject(newGroupId));
  questions.value.push(createNewQuestionObject(newGroupId));
  questions.value.push(createNewQuestionObject(newGroupId));

  rebalanceGroupPassages();
  const firstId = questions.value[questions.value.length - 3].id;
  expandedIds.value.push(firstId);
  nextTick(() => { document.getElementById(`question-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
};

const deleteQuestion = (index: number) => { 
  openModal(`Bạn có chắc chắn muốn xóa câu này không?`, 'delete', () => {
    questions.value.splice(index, 1);
    rebalanceGroupPassages();
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

/* NÚT THAO TÁC HEADER ĐẶC BIỆT PART 7 */
.header-actions { display: flex; gap: 6px; align-items: center; opacity: 0; transition: opacity 0.2s; }
.accordion-header:hover .header-actions { opacity: 1; }
.btn-add-mini { background: white; border: 1px solid #bfdbfe; color: #2563eb; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
.btn-add-mini:hover { background: #eff6ff; border-color: #3b82f6; }
.new-group-btn { border-style: dashed; border-color: #6366f1; color: #16a34a; }
.new-group-btn:hover { background: #f0fdf4; border-color: #16a34a; }
.btn-del-question { background: none; border: 1px solid #fca5a5; color: #ef4444; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; line-height: 1; display: flex; align-items: center; font-weight: 600;}
.btn-del-question:hover { background: #fee2e2; }

.accordion-body { border-top: 1px solid #e2e8f0; padding: 20px; background-color: #f8fafc; }

/* BOX NGỮ CẢNH VÀ BOX CÂU HỎI */
.shared-context-box { background: #e0f2fe; padding: 20px; border-radius: 12px; border: 1px solid #bfdbfe; margin-bottom: 25px; display: flex; flex-direction: column; gap: 16px; }
.shared-title { margin: 0; color: #1e3a8a; font-size: 1.05rem; font-weight: 800; }
.mb-4 { margin-bottom: 16px; }

.passage-items-list { display: flex; flex-direction: column; gap: 16px; }
.passage-item-card { background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.passage-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0; }
.passage-label { font-weight: 700; color: #475569; font-size: 0.9rem; }
.btn-remove-passage { background: none; border: none; color: #ef4444; font-size: 1.3rem; cursor: pointer; line-height: 1; padding: 0 4px; }
.btn-remove-passage:hover { color: #dc2626; }

.upload-box { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f8fafc; min-height: 160px; }
.media-input { width: 80%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; text-align: center; font-size: 0.85rem; }
.preview-container { position: relative; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background-color: #f8fafc; display: inline-flex; justify-content: center; align-items: center; max-width: 100%; }
.preview-img { max-height: 200px; object-fit: contain; border-radius: 4px; }
.btn-remove-media { position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.passage-action-bar { display: flex; gap: 12px; margin-top: 4px; }
.btn-add-item-mini { background: white; border: 1px dashed #2563eb; color: #2563eb; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-add-item-mini:hover { background: #eff6ff; border-color: #3b82f6; }

/* CÁC THÀNH PHẦN INPUT CÂU HỎI (Chia 2 cột) */
.top-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
.editor-card { background: white; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; }
.editor-card h4 { margin: 0 0 16px 0; color: #334155; font-size: 1rem; font-weight: 700; }
.mt-4 { margin-top: 15px; }

.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.option-row { display: flex; align-items: flex-start; gap: 10px; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; background-color: #ffffff; }
.option-row:focus-within { border-color: #3b82f6; }
.option-row.correct-row { border-color: #22c55e; background-color: #f0fdf4; }
.btn-select-correct { width: 30px; height: 30px; margin-top: 2px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.btn-select-correct.is-correct { background: #22c55e; color: white; border-color: #22c55e; }
.option-textarea { flex: 1; border: none; outline: none; background: transparent; font-size: 0.95rem; color: #1e293b; font-family: inherit; resize: none; overflow: hidden; min-height: 28px; line-height: 1.4; padding-top: 6px; }

/* ĐƯỜNG PHÂN CÁCH ĐỘNG (CHỈ HIỂN THỊ HẾT GROUP) */
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

@media (max-width: 1000px) { .top-row-grid, .options-grid { grid-template-columns: 1fr; } }
</style>