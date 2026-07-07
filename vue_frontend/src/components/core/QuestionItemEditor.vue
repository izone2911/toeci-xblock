<template lang="pug">
.accordion-item(
  :id="'question-' + question.id" 
  :class="{ 'is-expanded': isExpanded, 'is-dragging': isDragging }"
  :draggable="isDragEnabled"
  @dragstart="$emit('dragstart-item', $event)"
  @dragover.prevent
  @dragenter.prevent
  @drop.prevent="$emit('drop-item', $event)"
  @dragend="$emit('dragend-item')"
)

  .accordion-header(
    @click="$emit('toggle')"
    @mouseenter="$emit('mouseenter')"
    @mouseleave="$emit('mouseleave')"
    title="Nhấn để thu/phóng, kéo thả biểu tượng để di chuyển"
  )
    .header-left
      span.drag-handle ⣿
      span.q-title {{ displayIndex }}
      
      .header-options-badge(v-if="question.type === 'multiple_choice' || !question.type")
        span.mini-circle(
          v-for="(opt, oIdx) in question.options" 
          :key="oIdx"
          :class="{ 'is-correct': question.correctAnswer === getOptionLabel(oIdx) }"
        ) {{ getOptionLabel(oIdx) }}
      
      .header-text-badge(v-else-if="question.type === 'matching'")
        span.text-badge-correct Ghép cặp
      
      .header-text-badge(v-else-if="question.type === 'text_input'")
        span.text-badge-correct Điền từ
        span.text-badge-key(v-if="question.correctAnswer" style="margin-left: 6px; background: #f1f5f9; color: #475569; font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; font-weight: 600;") Chìa khóa: {{ question.correctAnswer }}
    

    .header-actions
      button.btn-add-mini(v-if="[1,2,3,4,5,6,7,'custom'].includes(partNumber)" type="button" @click.stop="$emit('insert-above')" title="Chèn một câu lên trên") + Trên
      button.btn-add-mini(v-if="[1,2,3,4,5,6,7,'custom'].includes(partNumber)" type="button" @click.stop="$emit('insert-below')" title="Chèn một câu xuống dưới") + Dưới
      button.btn-add-mini.new-group-btn(v-if="[3,4,6,7,'custom'].includes(partNumber)" type="button" @click.stop="$emit('insert-group-below')" title="Tạo một nhóm/đoạn mới") + Đoạn mới
      button.btn-del-question(type="button" @click.stop="$emit('delete')" title="Xóa câu hỏi này") Xóa


  .accordion-body(v-show="isExpanded")
    
    template(v-if="partNumber === 1 || partNumber === 2")
      .top-row-grid
        template(v-if="partNumber === 1")
          .editor-card.media-card
            h4 Hình ảnh đính kèm
            .media-section.single-media
              .preview-container(v-if="question.image")
                img.preview-img(:src="question.image")
                button.btn-remove-media(type="button" @click="question.image = ''") ×
              .upload-box.image-box(v-else)
                input.media-input(v-model="question.image" placeholder="URL hình ảnh...")
        
        template(v-if="partNumber === 2")
          .editor-card.transcript-card
            h4 Lời thoại / Transcript 
            RichTextEditor(v-model="question.transcript" placeholder="Transcript")

        .editor-card.options-card
          h4 Cấu hình đáp án
          .options-grid
            .option-row(v-for="(opt, oIdx) in question.options" :key="oIdx" :class="{ 'correct-row': question.correctAnswer === getOptionLabel(oIdx) }")
              button.btn-select-correct(type="button" :class="{ 'is-correct': question.correctAnswer === getOptionLabel(oIdx) }" @click="question.correctAnswer = getOptionLabel(oIdx)") {{ getOptionLabel(oIdx) }}
              textarea.option-textarea(v-model="question.options[oIdx]" rows="1" @input="autoResize")

      .editor-card.transcript-card.mt-4(v-if="partNumber === 1")
        h4 Lời thoại / Transcript
        RichTextEditor(v-model="question.transcript" placeholder="Trình bày lời thoại miêu tả các đáp án A, B, C, D...")

    template(v-if="partNumber === 3 || partNumber === 4")
      .shared-context-box(v-if="isFirstInGroup")
        h3.shared-title {{ partNumber === 3 ? 'Đoạn thoại' : 'Đoạn thoại' }}
        .top-row-grid
          .editor-card.media-card
            h4 Hình ảnh đính kèm
            .media-section.single-media
              .preview-container(v-if="question.image")
                img.preview-img(:src="question.image")
                button.btn-remove-media(type="button" @click="question.image = ''") ×
              .upload-box.image-box(v-else)
                input.media-input(v-model="question.image" placeholder="URL hình ảnh...")
          .editor-card.transcript-card
            h4 Lời thoại / Transcript chung (Bảo mật)
            RichTextEditor(v-model="question.transcript" placeholder="Transcript")
      .question-content-box
        .editor-card.q-text-card
          h4 Văn bản câu hỏi
          div
            RichTextEditor(v-model="question.text" placeholder="Nhập nội dung câu hỏi...")
        .editor-card.options-card.mt-4
          h4 Cấu hình đáp án
          .options-grid
            .option-row(v-for="(opt, oIdx) in question.options" :key="oIdx" :class="{ 'correct-row': question.correctAnswer === getOptionLabel(oIdx) }")
              button.btn-select-correct(type="button" :class="{ 'is-correct': question.correctAnswer === getOptionLabel(oIdx) }" @click="question.correctAnswer = getOptionLabel(oIdx)") {{ getOptionLabel(oIdx) }}
              textarea.option-textarea(v-model="question.options[oIdx]" rows="1" @input="autoResize")

    template(v-if="partNumber === 5")
      .question-content-box
        .shared-context-box.mb-4
          .top-row-grid
            .editor-card.q-content-card
              h4 Văn bản câu hỏi
              div
                RichTextEditor(v-model="question.content" placeholder="Ví dụ: Mr. Smith is currently ________ a meeting in Tokyo.")
            .editor-card.explanation-card
              h4 Giải thích chi tiết đáp án
              RichTextEditor(v-model="question.explanation" placeholder="Giải thích từ khóa là lựa chọn chính xác...")
        .editor-card.options-card.mt-4
          h4 Cấu hình đáp án
          .options-grid
            .option-row(v-for="(opt, oIdx) in question.options" :key="oIdx" :class="{ 'correct-row': question.correctAnswer === getOptionLabel(oIdx) }")
              button.btn-select-correct(type="button" :class="{ 'is-correct': question.correctAnswer === getOptionLabel(oIdx) }" @click="question.correctAnswer = getOptionLabel(oIdx)") {{ getOptionLabel(oIdx) }}
              textarea.option-textarea(v-model="question.options[oIdx]" rows="1" @input="autoResize")

    template(v-if="partNumber === 6")
      .shared-context-box(v-if="isFirstInGroup")
        h3.shared-title Bối cảnh đoạn văn
        .top-row-grid
          .editor-card.passage-card
            h4 Nội dung đoạn văn bản
            div
              RichTextEditor(v-model="question.content" placeholder="Trình bày chi tiết đoạn văn bản có chứa các khoảng trống cần điền...")
          .editor-card.explanation-card
            h4 Giải nghĩa chung / Lời thoại (Bảo mật)
            RichTextEditor(v-model="question.transcript" placeholder="Transcript")
      .question-content-box
        .editor-card.q-text-card
          h4 Giải thích riêng cho câu hỏi này
          RichTextEditor(v-model="question.explanation" placeholder="Giải thích lý do")
        .editor-card.options-card.mt-4
          h4 Cấu hình đáp án
          .options-grid
            .option-row(v-for="(opt, oIdx) in question.options" :key="oIdx" :class="{ 'correct-row': question.correctAnswer === getOptionLabel(oIdx) }")
              button.btn-select-correct(type="button" :class="{ 'is-correct': question.correctAnswer === getOptionLabel(oIdx) }" @click="question.correctAnswer = getOptionLabel(oIdx)") {{ getOptionLabel(oIdx) }}
              textarea.option-textarea(v-model="question.options[oIdx]" rows="1" @input="autoResize")

    template(v-if="partNumber === 7")
      .shared-context-box(v-if="isFirstInGroup")
        h3.shared-title Khối tài liệu đọc hiểu
        .passage-items-list
          .passage-item-card(v-for="(passage, pIdx) in getSafeArray(question, 'passages')" :key="'p' + pIdx")
            .passage-item-header
              span.passage-label Khối thông tin văn bản {{ pIdx + 1 }}
              button.btn-remove-passage(v-if="question.passages && question.passages.length > 1" type="button" @click="$emit('remove-array-item', 'passages', pIdx)") ×
            .passage-item-body
              .text-passage-wrapper(v-if="passage.type === 'text'")
                div
                  RichTextEditor(v-model="passage.content" placeholder="Trình bày chi tiết văn bản tài liệu...")
              .image-passage-wrapper(v-else-if="passage.type === 'image'")
                .preview-container(v-if="passage.url")
                  img.preview-img(:src="passage.url")
                  button.btn-remove-media(type="button" @click="passage.url = ''") ×
                .upload-box.image-box(v-else)
                  input.media-input(v-model="passage.url" placeholder="Nhập đường dẫn hình ảnh tài liệu...")
        .passage-action-bar
          button.btn-add-item-mini(type="button" @click="$emit('add-array-item', 'passages', 'text')") + Thêm Văn Bản
          button.btn-add-item-mini(type="button" @click="$emit('add-array-item', 'passages', 'image')") + Thêm Hình Ảnh

      .shared-context-box(v-if="isFirstInGroup")
        h3.shared-title Giải nghĩa tài liệu / Transcript (Bảo mật)
        .passage-items-list
          .passage-item-card(v-for="(transcript, tIdx) in getSafeArray(question, 'transcripts')" :key="'t' + tIdx")
            .passage-item-header
              span.passage-label Khối giải nghĩa {{ tIdx + 1 }}
              button.btn-remove-passage(v-if="question.transcripts && question.transcripts.length > 1" type="button" @click="$emit('remove-array-item', 'transcripts', tIdx)") ×
            .passage-item-body
              .text-passage-wrapper(v-if="transcript.type === 'text'")
                RichTextEditor(v-model="transcript.content" placeholder="Trình bày bản dịch tương ứng của tài liệu...")
              .image-passage-wrapper(v-else-if="transcript.type === 'image'")
                .preview-container(v-if="transcript.url")
                  img.preview-img(:src="transcript.url")
                  button.btn-remove-media(type="button" @click="transcript.url = ''") ×
                .upload-box.image-box(v-else)
                  input.media-input(v-model="transcript.url" placeholder="Nhập đường dẫn hình ảnh bản dịch...")
        .passage-action-bar
          button.btn-add-item-mini(type="button" @click="$emit('add-array-item', 'transcripts', 'text')") + Thêm Văn Bản
          button.btn-add-item-mini(type="button" @click="$emit('add-array-item', 'transcripts', 'image')") + Thêm Hình Ảnh

      .question-content-box
        .shared-context-box.mb-4
          .top-row-grid
            .editor-card.q-text-card
              h4 Văn bản câu hỏi
              RichTextEditor(v-model="question.text" placeholder="Nhập văn bản hiển thị câu hỏi đọc hiểu...")
            .editor-card.explanation-card
              h4 Giải thích chi tiết đáp án
              RichTextEditor(v-model="question.explanation" placeholder="Trình bày chi tiết lý do và vị trí thông tin trong tài liệu...")
        .editor-card.options-card
          h4 Cấu hình đáp án
          .options-grid
            .option-row(v-for="(opt, oIdx) in question.options" :key="oIdx" :class="{ 'correct-row': question.correctAnswer === getOptionLabel(oIdx) }")
              button.btn-select-correct(type="button" :class="{ 'is-correct': question.correctAnswer === getOptionLabel(oIdx) }" @click="question.correctAnswer = getOptionLabel(oIdx)") {{ getOptionLabel(oIdx) }}
              textarea.option-textarea(v-model="question.options[oIdx]" rows="1" @input="autoResize")

    template(v-if="partNumber === 'custom'")
      .setting-type-row.mb-4
        .type-selector
          label Thiết lập định dạng:
          .radio-group
            label.radio-label
              input(type="radio" :name="'q-type-'+question.id" value="multiple_choice" v-model="question.type" @change="onTypeChange(question)")
              span Trắc nghiệm
            label.radio-label
              input(type="radio" :name="'q-type-'+question.id" value="text_input" v-model="question.type" @change="onTypeChange(question)")
              span Điền từ
            label.radio-label
              input(type="radio" :name="'q-type-'+question.id" value="matching" v-model="question.type" @change="onTypeChange(question)")
              span Ghép cặp
        
        .score-selector
          label.toggle-switch(title="Kích hoạt tính điểm")
            input(type="checkbox" v-model="question.scoreEnabled")
            span.slider
          span.score-label Trọng số điểm:
          // Kiểm tra trường điểm số hợp lệ
          input.score-input(:class="{ 'invalid-border': question.scoreEnabled && isInvalidScore(question.score) }" v-if="question.scoreEnabled" type="number" v-model="question.score" step="0.5" min="0")

      .shared-context-box(v-if="isFirstInGroup")
        h3.shared-title Bối cảnh / Đọc hiểu (Nhóm câu hỏi)
        .passage-items-list
          .passage-item-card(v-for="(passage, pIdx) in getSafeArray(question, 'passages')" :key="'p' + pIdx")
            .passage-item-header
              span.passage-label Khối tài liệu {{ pIdx + 1 }}
              button.btn-remove-passage(v-if="question.passages && question.passages.length > 1" type="button" @click="$emit('remove-array-item', 'passages', pIdx)") ×
            .passage-item-body
              .text-passage-wrapper(v-if="passage.type === 'text'")
                RichTextEditor(v-model="passage.content" placeholder="Nhập nội dung tài liệu đọc hiểu...")
              .image-passage-wrapper(v-else-if="passage.type === 'image'")
                .preview-container(v-if="passage.url")
                  img.preview-img(:src="passage.url")
                  button.btn-remove-media(type="button" @click="passage.url = ''") ×
                .upload-box.image-box(v-else)
                  input.media-input(v-model="passage.url" placeholder="Nhập đường dẫn hình ảnh tài liệu...")
        .passage-action-bar
          button.btn-add-item-mini(type="button" @click="$emit('add-array-item', 'passages', 'text')") + Chèn Văn Bản
          button.btn-add-item-mini(type="button" @click="$emit('add-array-item', 'passages', 'image')") + Chèn Hình Ảnh

      .question-content-box
        .shared-context-box.mb-4(style="background: #e0f2fe; border-color: #bfdbfe;")
          .top-row-grid
            .editor-card.q-text-card
              h4 Nội dung câu hỏi
              RichTextEditor(v-model="question.text" placeholder="Trình bày chi tiết yêu cầu câu hỏi...")
            .editor-card.explanation-card
              h4 Giải thích chi tiết đáp án
              RichTextEditor(v-model="question.explanation" placeholder="Trình bày lý do từ khóa là lựa chọn chính xác...")

        template(v-if="question.type === 'multiple_choice'")
          .editor-card.options-card
            .options-header-flex
              h4 Cấu trúc lựa chọn
              button.btn-add-opt-mini(type="button" @click="question.options.push('')") + Bổ sung biến thể
            .options-grid
              .option-row(v-for="(opt, oIdx) in question.options" :key="oIdx" :class="{ 'correct-row': question.correctAnswer === getOptionLabel(oIdx) }")
                button.btn-select-correct(type="button" :class="{ 'is-correct': question.correctAnswer === getOptionLabel(oIdx) }" @click="question.correctAnswer = getOptionLabel(oIdx)") {{ getOptionLabel(oIdx) }}
                textarea.option-textarea(v-model="question.options[oIdx]" rows="1" @input="autoResize")
                button.btn-remove-opt-cross(v-if="question.options.length > 2" type="button" @click="removeOptionItem(question, oIdx)") ×

        template(v-else-if="question.type === 'matching'")
          .editor-card.matching-card
            .options-header-flex
              h4 Ghép cặp
              button.btn-add-opt-mini(type="button" @click="question.pairs.push({left: '', right: ''})") + Thêm cặp
            .matching-grid
              .matching-row(v-for="(pair, pIdx) in question.pairs" :key="pIdx")
                // Kiểm tra trường dữ liệu rỗng
                input.text-field-input.flex-1(:class="{ 'invalid-border': isInvalidText(pair.left) }" v-model.trim="pair.left" placeholder="Vế trái *")
                span.match-icon ↔
                input.text-field-input.flex-1(:class="{ 'invalid-border': isInvalidText(pair.right) }" v-model.trim="pair.right" placeholder="Vế phải *")
                button.btn-remove-opt-cross.relative-cross(v-if="question.pairs.length > 2" type="button" @click="question.pairs.splice(pIdx, 1)") x

        template(v-else)
          .editor-card.short-answer-card
            h4 Thiết lập hệ số tự luận
            .grid-2
              .input-field-group
                label Biến chuẩn đánh giá 
                  span.required-star *
                // Kiểm tra trường dữ liệu rỗng
                input.text-field-input(:class="{ 'invalid-border': isInvalidText(question.correctAnswer) }" v-model.trim="question.correctAnswer" placeholder="Khởi tạo từ khóa chính xác...")
              .input-field-group
                label Dữ liệu mẫu (Văn bản chìm)
                input.text-field-input(v-model="question.textPlaceholder" placeholder="Văn bản định hướng cho vùng nhập liệu...")
</template>

<script setup lang="ts">
import RichTextEditor from './RichTextEditor.vue';

const props = defineProps<{
  question: any;
  displayIndex: number;
  partNumber: number | string;
  isExpanded: boolean;
  isDragging: boolean;
  isDragEnabled: boolean;
  isFirstInGroup?: boolean;
}>();

defineEmits([
  'toggle', 'mouseenter', 'mouseleave', 'insert-above', 'insert-below', 'insert-group-below',
  'delete', 'dragstart-item', 'drop-item', 'dragend-item', 'add-array-item', 'remove-array-item'
]);

const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

const autoResize = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  target.style.height = 'auto'; 
  target.style.height = target.scrollHeight + 'px'; 
};

// Kiểm tra dữ liệu rỗng -> ko lưu DB
const isInvalidText = (val: any) => {
  return !val || String(val).trim() === '';
};

const isInvalidScore = (val: any) => {
  if (val === '' || val === null || val === undefined) return true;
  const num = Number(val);
  return isNaN(num) || num < 0;
};

const getSafeArray = (q: any, key: 'passages' | 'transcripts') => {
  if (!props.isFirstInGroup) return []; 
  
  if (!q[key] || !Array.isArray(q[key]) || q[key].length === 0) {
    return [{ type: 'text', content: '' }];
  }
  return q[key];
};

const onTypeChange = (q: any) => {
  q.correctAnswer = 'A'; 
  if (q.type === 'multiple_choice') {
    q.options = ['', ''];
    q.pairs = [];
  } else if (q.type === 'matching') {
    q.options = [];
    q.pairs = [{left: '', right: ''}, {left: '', right: ''}];
  } else {
    q.options = [];
    q.pairs = [];
    q.correctAnswer = ''; 
  }
};

const removeOptionItem = (q: any, oIdx: number) => {
  const currentLabel = getOptionLabel(oIdx);
  q.options.splice(oIdx, 1);
  if (q.correctAnswer === currentLabel) {
    q.correctAnswer = 'A';
  } else if (q.correctAnswer > currentLabel) {
    const newCharCode = q.correctAnswer.charCodeAt(0) - 1;
    q.correctAnswer = String.fromCharCode(newCharCode);
  }
};
</script>

<style scoped>
.accordion-item { background: white; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s, opacity 0.2s; }
.accordion-item.is-expanded { border-color: #3b82f6; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.05); }
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
.header-actions { display: flex; gap: 6px; align-items: center; opacity: 0; transition: opacity 0.2s; }
.accordion-header:hover .header-actions { opacity: 1; }
.btn-add-mini { background: white; border: 1px solid #bfdbfe; color: #2563eb; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
.btn-add-mini:hover { background: #eff6ff; border-color: #3b82f6; }
.new-group-btn { border-style: dashed; border-color: #6366f1; color: #16a34a; }
.new-group-btn:hover { background: #f0fdf4; border-color: #16a34a; }
.btn-del-question { background: none; border: 1px solid #fca5a5; color: #ef4444; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; line-height: 1; display: flex; align-items: center; font-weight: 600;}
.btn-del-question:hover { background: #fee2e2; }
.accordion-body { border-top: 1px solid #e2e8f0; padding: 20px; background-color: #f8fafc; }
.top-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: stretch; }
.editor-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
.media-card h4, .options-card h4, .transcript-card h4, .q-text-card h4, .q-content-card h4, .explanation-card h4, .passage-card h4 { margin: 0 0 16px 0; color: #334155; font-size: 1rem; font-weight: 600; }
.mt-4 { margin-top: 16px; }
.mb-4 { margin-bottom: 16px; }

.required-star { color: #ef4444; margin-left: 4px; font-weight: bold; }
.invalid-border { border: 1px solid #ef4444 !important; background-color: #fef2f2 !important; }
.invalid-rich-editor { border: 2px dashed #ef4444 !important; border-radius: 8px; background-color: #fef2f2 !important; padding: 4px; }

.single-media { flex: 1; display: flex; flex-direction: column; justify-content: center; width: 100%; }
.upload-box { flex: 1; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f8fafc; min-height: 160px; }
.media-input { width: 90%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; text-align: center; font-size: 0.9rem; }
.preview-container { position: relative; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background-color: #f8fafc; display: flex; justify-content: center; align-items: center; flex: 1; }
.preview-img { max-height: 240px; object-fit: contain; border-radius: 4px; }
.btn-remove-media { position: absolute; top: -10px; right: -10px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.options-grid { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.option-row { display: flex; align-items: flex-start; gap: 14px; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; background-color: #f8fafc; position: relative;}
.option-row:focus-within { border-color: #3b82f6; background-color: white; }
.option-row.correct-row { border-color: #22c55e; background-color: #f0fdf4; }
.btn-select-correct { width: 32px; height: 32px; margin-top: 2px; border-radius: 50%; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #64748b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.btn-select-correct.is-correct { background: #22c55e; color: white; border-color: #22c55e; }
.option-textarea { flex: 1; border: none; outline: none; background: transparent; font-size: 0.95rem; color: #1e293b; font-family: inherit; resize: none; overflow: hidden; min-height: 28px; line-height: 1.4; padding-top: 6px; padding-right: 20px; }
.options-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.options-header-flex h4 { margin: 0; color: #334155; font-size: 0.95rem; font-weight: 700;}
.btn-add-opt-mini { background: white; border: 1px dashed #3b82f6; color: #3b82f6; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-add-opt-mini:hover { background: #eff6ff; border-color: #2563eb; }
.shared-context-box { background: #e0f2fe; padding: 20px; border-radius: 12px; border: 1px solid #bfdbfe; margin-bottom: 25px; }
.shared-title { margin: 0 0 15px 0; color: #1e3a8a; font-size: 1.05rem; font-weight: 800; }
.passage-items-list { display: flex; flex-direction: column; gap: 16px; }
.passage-item-card { background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.passage-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0; }
.passage-label { font-weight: 700; color: #475569; font-size: 0.9rem; }
.btn-remove-passage { background: none; border: none; color: #ef4444; font-size: 1.3rem; cursor: pointer; line-height: 1; padding: 0 4px; }
.btn-remove-passage:hover { color: #dc2626; }
.passage-action-bar { display: flex; gap: 12px; margin-top: 4px; }
.btn-add-item-mini { background: white; border: 1px dashed #2563eb; color: #2563eb; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-add-item-mini:hover { background: #eff6ff; border-color: #3b82f6; }
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
.btn-remove-opt-cross { background: none; border: none; color: #cbd5e1; font-size: 1.2rem; cursor: pointer; position: absolute; top: 12px; right: 10px; line-height: 1; }
.btn-remove-opt-cross:hover { color: #ef4444; }
.matching-grid { display: flex; flex-direction: column; gap: 10px; }
.matching-row { display: flex; align-items: center; gap: 12px; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; background-color: #f8fafc; position: relative;}
.match-icon { color: #94a3b8; font-weight: bold; font-size: 1.2rem; flex-shrink: 0;}
.flex-1 { flex: 1; }
.relative-cross { position: static !important; margin-left: auto; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.input-field-group { display: flex; flex-direction: column; gap: 6px; }
.input-field-group label { font-size: 0.85rem; font-weight: 700; color: #475569; }
.text-field-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 0.9rem; transition: border-color 0.2s;}

@media (max-width: 1100px) { 
  .top-row-grid, .options-grid, .grid-2 { grid-template-columns: 1fr; gap: 16px; } 
  .setting-type-row { flex-direction: column; align-items: flex-start; gap: 16px; }
  .score-selector { border-left: none; padding-left: 0; margin-left: 0; }
}
</style>