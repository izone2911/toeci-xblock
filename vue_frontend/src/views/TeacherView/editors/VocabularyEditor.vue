<template lang="pug">
.vocab-page
  // ==========================================
  // THANH CÔNG CỤ TỪ VỰNG
  // ==========================================
  header.vocab-toolbar
    .toolbar-left
      h3 Danh sách Từ vựng
    .toolbar-right
      input(type="file" ref="vocabFileInput" accept=".json" style="display: none" @change="importVocab")
      button.btn-outline(@click="triggerVocabImport") 📥 Import JSON
      button.btn-outline(@click="exportVocab") 📤 Export JSON

  // ==========================================
  // KHÔNG GIAN LÀM VIỆC CHÍNH (CHIA 2 CỘT)
  // ==========================================
  .vocab-workspace(v-if="vocabList.length > 0")
    
    // CỘT TRÁI: BẢNG NHẬP LIỆU
    .vocab-table-container
      .vocab-table
        .table-header
          .col-word Từ vựng / Phiên âm
          .col-type Từ loại
          .col-meaning Định nghĩa
          .col-example Câu ví dụ / Dịch nghĩa
          .col-action

        .table-body
          .vocab-row(
            v-for="(item, index) in vocabList" 
            :key="item.id"
            :class="{ 'is-active': activeRowIndex === index }"
            @click="activeRowIndex = index"
            @focusin="activeRowIndex = index"
          )
            // CỘT 1: TỪ & PHIÊN ÂM
            .col-word
              input.input-field(v-model="item.word" type="text" placeholder="Từ mới...")
              input.input-field.mt-2(v-model="item.phonetic" type="text" placeholder="/Phiên âm/...")
            
            // CỘT 2: TỪ LOẠI
            .col-type
              select.select-field(v-model="item.type")
                option(value="noun") Danh từ (n)
                option(value="verb") Động từ (v)
                option(value="adj") Tính từ (adj)
                option(value="adv") Trạng từ (adv)
                option(value="phrase") Cụm từ (Phrase)
                option(value="idiom") Thành ngữ (Idiom)
            
            // CỘT 3: ĐỊNH NGHĨA
            .col-meaning
              textarea.textarea-field(
                v-model="item.meaning" 
                rows="2" 
                @input="autoResize" 
                placeholder="Nhập định nghĩa..."
              )
            
            // CỘT 4: VÍ DỤ
            .col-example
              textarea.textarea-field(
                v-model="item.example" 
                rows="1" 
                @input="autoResize" 
                placeholder="Câu ví dụ..."
              )
              textarea.textarea-field.mt-2(
                v-model="item.exampleMeaning" 
                rows="1" 
                @input="autoResize" 
                placeholder="Dịch nghĩa câu ví dụ..."
              )
            
            // CỘT 5: XÓA
            .col-action
              button.btn-del-row(@click.stop="deleteVocab(index)") ×

      button.btn-add-large(@click="addVocabRow") + Thêm từ vựng mới

    // CỘT PHẢI: BẢN XEM TRƯỚC FLASHCARD (LIVE PREVIEW 3D LẬT)
    aside.vocab-preview-panel
      h4.preview-title 👀 XEM TRƯỚC FLASHCARD
      
      // KHUNG CHỨA THẺ 3D (Bấm vào để lật)
      .flashcard-container(v-if="activeItem" @click="toggleFlip")
        .flashcard-inner(:class="{ 'is-flipped': isFlipped }")
          
          // MẶT TRƯỚC (Từ vựng & Phiên âm)
          .fc-face.fc-front
            .fc-type {{ formatTypeLabel(activeItem.type) }}
            h2.fc-word {{ activeItem.word || 'Từ vựng...' }}
            p.fc-phonetic {{ activeItem.phonetic || '/Phiên âm/' }}
            .flip-hint 👆 Nhấn để lật thẻ
          
          // MẶT SAU (Nghĩa & Ví dụ)
          .fc-face.fc-back
            .fc-meaning
              span.meaning-label Nghĩa của từ:
              .meaning-text {{ activeItem.meaning || 'Chưa nhập định nghĩa' }}
            
            .fc-divider(v-if="activeItem.example || activeItem.exampleMeaning")
            
            .fc-example(v-if="activeItem.example || activeItem.exampleMeaning")
              strong Ví dụ:
              p.en {{ activeItem.example }}
              p.vi {{ activeItem.exampleMeaning }}
            
            .flip-hint 👆 Nhấn để lật úp thẻ

  // ==========================================
  // TRẠNG THÁI TRỐNG
  // ==========================================
  .empty-state(v-else)
    h4 Chưa có từ vựng nào trong danh sách
    button.btn-add-large.mt-4(@click="addVocabRow") + Bắt đầu thêm từ vựng
</template>

<script setup lang="ts">
import { ref, toRef, nextTick, computed, watch } from 'vue';

const props = defineProps<{ modelValue: any[] }>();
const emit = defineEmits(['update:modelValue']);
const vocabList = toRef(props, 'modelValue');

const vocabFileInput = ref<HTMLInputElement | null>(null);

// Trạng thái Focus và Lật thẻ
const activeRowIndex = ref(0);
const isFlipped = ref(false);

const activeItem = computed(() => vocabList.value[activeRowIndex.value]);

// Khi Giảng viên bấm sang hàng từ vựng khác, tự động úp thẻ về mặt trước
watch(activeRowIndex, () => {
  isFlipped.value = false;
});

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value;
};

const autoResize = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  target.style.height = 'auto';
  target.style.height = target.scrollHeight + 'px';
};

const formatTypeLabel = (type: string) => {
  const map: Record<string, string> = { 
    noun: 'Danh từ (n)', verb: 'Động từ (v)', adj: 'Tính từ (adj)', 
    adv: 'Trạng từ (adv)', phrase: 'Cụm từ', idiom: 'Thành ngữ' 
  };
  return map[type] || 'Từ loại';
};

const addVocabRow = () => {
  vocabList.value.push({
    id: Date.now() + Math.random(),
    word: '',
    phonetic: '',
    type: 'noun',
    meaning: '',
    example: '',
    exampleMeaning: ''
  });
  
  activeRowIndex.value = vocabList.value.length - 1;

  nextTick(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
};

const deleteVocab = (index: number) => {
  if (confirm('Xóa từ vựng này?')) {
    vocabList.value.splice(index, 1);
    if (activeRowIndex.value >= vocabList.value.length) {
      activeRowIndex.value = Math.max(0, vocabList.value.length - 1);
    }
  }
};

const exportVocab = () => {
  const dataStr = JSON.stringify(vocabList.value, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'toeic_vocabulary.json';
  a.click();
  URL.revokeObjectURL(url);
};

const triggerVocabImport = () => { vocabFileInput.value?.click(); };

const importVocab = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsedData = JSON.parse(e.target?.result as string);
      if (Array.isArray(parsedData)) {
        vocabList.value = parsedData;
        activeRowIndex.value = 0; 
      } else {
        alert("File không hợp lệ! Vui lòng chọn file JSON mảng từ vựng.");
      }
    } catch (err) {
      alert("Lỗi đọc file JSON!");
    }
    if (vocabFileInput.value) vocabFileInput.value.value = '';
  };
  reader.readAsText(file);
};
</script>

<style scoped>
.vocab-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; height: 100%; }

/* TOOLBAR */
.vocab-toolbar { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
.toolbar-left h3 { margin: 0; color: #0f172a; font-size: 1.1rem; }
.toolbar-right { display: flex; gap: 10px; }
.btn-outline { background: white; color: #0f172a; padding: 6px 14px; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 0.85rem; }
.btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }

/* BỐ CỤC CHIA 2 CỘT */
.vocab-workspace { display: flex; gap: 24px; align-items: flex-start; }
.vocab-table-container { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 15px;}

/* Đã chỉnh top margin để Flashcard luôn giữ ở vị trí đẹp khi cuộn chuột */
.vocab-preview-panel { width: 340px; flex-shrink: 0; position: sticky; top: 32px; perspective: 1000px; }

/* BẢNG LƯỚI TỪ VỰNG */
.vocab-table { background: white; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

.table-header, .vocab-row { display: grid; grid-template-columns: 180px 140px 1.2fr 1.5fr 40px; gap: 16px; align-items: start; padding: 16px 20px; }

.table-header { background: #f8fafc; border-bottom: 1px solid #cbd5e1; color: #475569; font-weight: 700; font-size: 0.85rem; }
.vocab-row { border-bottom: 1px solid #e2e8f0; background: white; transition: all 0.2s; cursor: text; }
.vocab-row:last-child { border-bottom: none; }
.vocab-row:hover { background: #f8fafc; }
.vocab-row.is-active { border-left: 3px solid #3b82f6; background: #eff6ff; }

/* Ô NHẬP LIỆU GỌN GÀNG */
.input-field, .select-field, .textarea-field { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 0.9rem; color: #1e293b; outline: none; background: white; font-family: inherit; box-sizing: border-box; }
.textarea-field { resize: none; overflow: hidden; line-height: 1.4; }
.input-field:focus, .select-field:focus, .textarea-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }

/* NÚT XÓA HÀNG */
.col-action { display: flex; justify-content: center; align-items: center; height: 100%; min-height: 38px; }
.btn-del-row { background: white; border: 1px solid #fca5a5; color: #ef4444; padding: 6px; border-radius: 4px; font-size: 1rem; font-weight: bold; cursor: pointer; transition: all 0.2s; line-height: 1;}
.btn-del-row:hover { background: #fee2e2; }

/* NÚT THÊM LỚN TRẢI DÀI DƯỚI BẢNG */
.btn-add-large { width: 100%; padding: 14px; background: white; border: 2px dashed #bfdbfe; border-radius: 8px; color: #2563eb; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-add-large:hover { background: #eff6ff; border-color: #3b82f6; }

/* ==========================================
   UI THẺ FLASHCARD 3D LẬT (MỚI: NỀN XANH CHỮ TRẮNG)
   ========================================== */
.preview-title { margin: 0 0 12px 0; color: #475569; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;}

.flashcard-container {
  width: 100%;
  height: 360px; /* Tăng chiều cao một chút để chữ lớn không bị tràn */
  perspective: 1000px; 
  cursor: pointer;
}

.flashcard-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
  transform-style: preserve-3d;
}

/* Lật thẻ 180 độ khi có class is-flipped */
.flashcard-inner.is-flipped {
  transform: rotateY(180deg);
}

.fc-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  
  /* CẬP NHẬT NỀN XANH SANG TRỌNG */
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white; 
  
  border-radius: 16px;
  box-shadow: 0 15px 30px -5px rgba(37, 99, 235, 0.4);
  padding: 30px 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center; /* Căn giữa nội dung theo chiều dọc */
}

/* --- MẶT TRƯỚC --- */
.fc-front {
  align-items: center;
  text-align: center;
}

/* Nền mờ cho Từ loại để nổi trên nền xanh */
.fc-type { 
  display: inline-block; 
  background: rgba(255, 255, 255, 0.2); 
  color: white; 
  padding: 6px 14px; 
  border-radius: 20px; 
  font-size: 0.85rem; 
  font-weight: bold; 
  margin-bottom: 20px; 
  backdrop-filter: blur(4px);
}

/* TỪ VỰNG TIẾNG ANH: To và Đậm */
.fc-word { 
  font-size: 2.5rem; 
  color: white; 
  margin: 0 0 10px 0; 
  font-weight: 900; 
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Phiên âm */
.fc-phonetic { 
  color: rgba(255, 255, 255, 0.8); 
  font-size: 1.2rem; 
  margin: 0; 
  font-family: 'Times New Roman', Times, serif; 
}

/* --- MẶT SAU --- */
.fc-back {
  transform: rotateY(180deg);
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow-y: auto; 
}

.fc-meaning { 
  margin-bottom: 20px; 
  width: 100%;
}

.meaning-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  font-weight: 700;
  display: block;
  margin-bottom: 8px;
}

/* NGHĨA CỦA TỪ: To và Đậm */
.meaning-text {
  font-size: 1.8rem;
  font-weight: 800;
  color: white;
  line-height: 1.3;
}

.fc-divider { 
  width: 100%;
  height: 0; 
  border-bottom: 1px dashed rgba(255, 255, 255, 0.3); 
  margin: 15px 0; 
}

.fc-example { 
  background: rgba(255, 255, 255, 0.1); 
  padding: 14px; 
  border-radius: 8px; 
  border-left: 4px solid #93c5fd; 
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}

.fc-example strong { 
  display: block; 
  font-size: 0.8rem; 
  color: #93c5fd; 
  margin-bottom: 6px; 
  text-transform: uppercase;
}

.fc-example .en { 
  font-weight: 600; 
  color: white; 
  margin: 0 0 6px 0; 
  font-style: italic; 
  line-height: 1.4;
  font-size: 1rem;
}

.fc-example .vi { 
  color: rgba(255, 255, 255, 0.8); 
  margin: 0; 
  font-size: 0.9rem; 
  line-height: 1.4;
}

/* Chữ gợi ý bấm để lật */
.flip-hint { 
  margin-top: auto; 
  font-size: 0.85rem; 
  color: rgba(255, 255, 255, 0.6); 
  padding-top: 20px; 
  font-weight: 600;
}

/* TRẠNG THÁI TRỐNG */
.empty-state { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px 0; color: #64748b; background: white; border: 1px solid #e2e8f0; border-radius: 8px; }
.empty-state h4 { margin: 0; font-weight: 500; }

@media (max-width: 1200px) {
  .vocab-workspace { flex-direction: column; }
  .vocab-preview-panel { width: 100%; position: static; }
}
</style>