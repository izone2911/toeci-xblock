<template lang="pug">
.rich-text-editor
  // Thanh công cụ (Toolbar)
  .toolbar
    // Nhóm định dạng chữ
    .toolbar-group
      button.tool-btn(type="button" @click="format('bold')" title="In đậm (Ctrl+B)")
        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5")
          path(d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z")
          path(d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z")
      
      button.tool-btn(type="button" @click="format('italic')" title="In nghiêng (Ctrl+I)")
        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5")
          line(x1="19" y1="4" x2="10" y2="4")
          line(x1="14" y1="20" x2="5" y2="20")
          line(x1="15" y1="4" x2="9" y2="20")
      
      button.tool-btn(type="button" @click="format('underline')" title="Gạch chân (Ctrl+U)")
        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5")
          path(d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3")
          line(x1="4" y1="21" x2="20" y2="21")

    .divider

    // Nhóm MÀU SẮC (Màu chữ và Màu Nền)
    .toolbar-group.color-group
      //- Màu chữ (Text Color)
      .color-picker-wrapper(title="Chọn màu chữ")
        svg.color-icon(width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
          path(d="M4 20h16")
          path(d="m6 16 6-12 6 12")
          path(d="M8 12h8")
        input.color-picker(type="color" v-model="selectedTextColor" @input="changeTextColor")
      
      //- Màu nền (Highlight Background Color)
      .color-picker-wrapper(title="Bôi màu nền (Highlight)")
        svg.color-icon(width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
          path(d="m16 4-9 9")
          path(d="m4 16 4 4 9-9-4-4-9 9Z")
          path(d="M20 16v4h-4")
        input.color-picker(type="color" v-model="selectedBgColor" @input="changeBgColor")

    .divider

    // Nhóm căn lề
    .toolbar-group
      button.tool-btn(type="button" @click="format('justifyLeft')" title="Căn trái")
        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
          line(x1="21" y1="6" x2="3" y2="6")
          line(x1="15" y1="12" x2="3" y2="12")
          line(x1="17" y1="18" x2="3" y2="18")
          
      button.tool-btn(type="button" @click="format('justifyCenter')" title="Căn giữa")
        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
          line(x1="21" y1="6" x2="3" y2="6")
          line(x1="19" y1="12" x2="5" y2="12")
          line(x1="17" y1="18" x2="7" y2="18")
          
      button.tool-btn(type="button" @click="format('justifyRight')" title="Căn phải")
        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
          line(x1="21" y1="6" x2="3" y2="6")
          line(x1="21" y1="12" x2="9" y2="12")
          line(x1="21" y1="18" x2="7" y2="18")

    .divider

    // Nhóm chỉ mục (Danh sách)
    .toolbar-group
      button.tool-btn(type="button" @click="format('insertUnorderedList')" title="Dấu chấm đầu dòng")
        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
          line(x1="8" y1="6" x2="21" y2="6")
          line(x1="8" y1="12" x2="21" y2="12")
          line(x1="8" y1="18" x2="21" y2="18")
          line(x1="3" y1="6" x2="3.01" y2="6" stroke-width="3")
          line(x1="3" y1="12" x2="3.01" y2="12" stroke-width="3")
          line(x1="3" y1="18" x2="3.01" y2="18" stroke-width="3")
          
      button.tool-btn(type="button" @click="format('insertOrderedList')" title="Danh sách đánh số")
        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
          line(x1="10" y1="6" x2="21" y2="6")
          line(x1="10" y1="12" x2="21" y2="12")
          line(x1="10" y1="18" x2="21" y2="18")
          path(d="M4 6h1v4")
          path(d="M4 10h2")
          path(d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1")

  // Khu vực gõ chữ (Content Editable)
  .editor-content(
    ref="editorRef"
    contenteditable="true"
    @input="onInput"
    @blur="onInput"
    placeholder="Nhập nội dung vào đây..."
  )
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

const props = defineProps<{
  modelValue: string
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>();

const editorRef = ref<HTMLElement | null>(null);

// Khởi tạo màu mặc định (Đen cho chữ, Vàng chóe cho nền)
const selectedTextColor = ref('#1e293b'); 
const selectedBgColor = ref('#fef08a'); 

// Hàm thực thi các lệnh định dạng văn bản (In đậm, lề, list...)
const format = (command: string, value: string | undefined = undefined) => {
  document.execCommand(command, false, value);
  editorRef.value?.focus(); // Giữ con trỏ chuột ở lại editor sau khi bấm
  onInput(); // Cập nhật lại dữ liệu sau khi format
};

// Đổi màu chữ
const changeTextColor = () => {
  format('foreColor', selectedTextColor.value);
};

// Đổi màu nền (Bôi Highlight)
const changeBgColor = () => {
  // Trình duyệt Firefox và Chrome có thể khác nhau về tên lệnh, hiliteColor là chuẩn webKit
  format('hiliteColor', selectedBgColor.value);
};

// Cập nhật dữ liệu từ Editor đẩy ra ngoài (v-model)
const onInput = () => {
  if (editorRef.value) {
    emit('update:modelValue', editorRef.value.innerHTML);
  }
};

// Theo dõi khi click chọn câu hỏi khác ở Sidebar, nội dung Editor phải tự động thay đổi theo
watch(() => props.modelValue, (newVal) => {
  if (editorRef.value && editorRef.value.innerHTML !== newVal) {
    editorRef.value.innerHTML = newVal || '';
  }
});

// Gán giá trị lần đầu khi load component
onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || '';
  }
});
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
  transition: border-color 0.2s;
}
.rich-text-editor:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* THANH CÔNG CỤ (TOOLBAR) */
.toolbar {
  background-color: #f8fafc;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.divider {
  width: 1px;
  height: 20px;
  background-color: #cbd5e1;
  margin: 0 4px;
}
.tool-btn {
  background: transparent;
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}
.tool-btn:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}
.tool-btn:active {
  background-color: #cbd5e1;
}

/* KHU VỰC CHỌN MÀU MỚI (TÍCH HỢP ICON) */
.color-group {
  padding: 0 2px;
  gap: 12px; /* Tạo khoảng cách giữa nút màu chữ và màu nền */
}
.color-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  border-radius: 6px;
  transition: background-color 0.2s;
}
.color-picker-wrapper:hover {
  background-color: #e2e8f0;
}
.color-icon {
  color: #475569;
  pointer-events: none; /* Tránh click đè lên input color */
}
.color-picker {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: transparent;
  overflow: hidden;
}
.color-picker::-webkit-color-swatch-wrapper { padding: 0; }
.color-picker::-webkit-color-swatch { border: 1px solid #cbd5e1; border-radius: 4px; }
.color-picker::-moz-color-swatch { border: 1px solid #cbd5e1; border-radius: 4px; }

/* KHU VỰC SOẠN THẢO */
.editor-content {
  width: 100%;
  min-height: 150px;
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.6;
  color: #1e293b;
}

/* Xử lý Placeholder giả cho div contenteditable */
.editor-content:empty:before {
  content: attr(placeholder);
  color: #94a3b8;
  pointer-events: none;
  display: block; /* Tránh lỗi nhảy dòng */
}

/* CSS cơ bản cho List và Text xuất ra từ Editor */
:deep(ul), :deep(ol) {
  padding-left: 24px;
  margin-top: 8px;
  margin-bottom: 8px;
}
:deep(ul) { list-style-type: disc; }
:deep(ol) { list-style-type: decimal; }
</style>