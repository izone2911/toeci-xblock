<template lang="pug">
.vocab-container
  //- HEADER
  .vocab-header
    .header-left
      button.btn-back(@click="$emit('return-landing')" title="Quay lại sảnh chờ")
        svg(width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round")
          line(x1="19" y1="12" x2="5" y2="12")
          polyline(points="12 19 5 12 12 5")
      
      .title-group
        h2.title 
          span 🗂️ Thẻ Từ Vựng (Flashcards)
          span.count-badge(v-if="cards.length > 0") {{ cards.length }} thẻ
        p.subtitle Ôn tập từ vựng mỗi ngày để nâng cao kết quả thi!
    button.btn-add(@click="openAddModal") + Thêm từ vựng

  //- CONTENT AREA
  .vocab-content
    //- TRẠNG THÁI TRỐNG (EMPTY STATE)
    .empty-state(v-if="cards.length === 0")
      .empty-icon
      h3 Chưa có từ vựng nào
      // -p Bạn chưa thêm từ vựng nào vào danh sách ôn tập. Hãy thêm từ vựng mới ngay nhé!
    //-   button.btn-add-large(@click="openAddModal") Thêm từ đầu tiên

    //- LƯỚI FLASHCARD (4 thẻ hàng ngang, thẻ dọc)
    .flashcard-grid(v-else)
      .flashcard-wrapper(
        v-for="card in cards" 
        :key="card.id"
      )
        .flashcard(
          :class="{ 'is-flipped': flippedCards[card.id] }"
          @click="toggleFlip(card.id)"
        )
          //- MẶT TRƯỚC (TỪ VỰNG & IPA)
          .flashcard-front
            button.btn-delete(@click.stop="requestDelete(card.id)" title="Xóa từ này") ×
            h3.term {{ card.term }}
            p.ipa(v-if="card.ipa") /{{ card.ipa }}/
            span.hint 👆 Chạm để xem nghĩa

          //- MẶT SAU (Ý NGHĨA & VÍ DỤ)
          .flashcard-back
            button.btn-delete.back-delete(@click.stop="requestDelete(card.id)" title="Xóa từ này") ×
            .back-content
              .definition-box
                span.badge Nghĩa
                p.def-text {{ card.definition }}
              
              .example-box(v-if="card.example")
                span.badge.badge-example Ví dụ
                p.ex-text "{{ card.example }}"

  //- ==========================================
  //- MODAL THÊM TỪ VỰNG
  //- ==========================================
  .modal-overlay(v-if="showAddModal" @click.self="closeAddModal")
    .custom-modal
      h3.modal-title Thêm từ vựng mới
      
      .form-row
        .form-group.flex-1
          label Từ vựng (Tiếng Anh) <span class="required">*</span>
          input.text-input(
            v-model="newCard.term" 
            placeholder="VD: Abandon" 
            ref="termInputRef"
            @keyup.enter="focusNext(ipaInputRef)"
          )
        .form-group.flex-1
          label Phiên âm IPA (Tùy chọn)
          input.text-input(
            v-model="newCard.ipa" 
            placeholder="VD: əˈbændən" 
            ref="ipaInputRef"
            @keyup.enter="focusNext(defInputRef)"
          )
      
      .form-group
        label Ý nghĩa (Tiếng Việt) <span class="required">*</span>
        textarea.text-input.textarea-sm(
          v-model="newCard.definition" 
          placeholder="VD: Từ bỏ, bỏ rơi"
          ref="defInputRef"
        )
      
      .form-group
        label Ví dụ minh họa (Tùy chọn)
        textarea.text-input.textarea-sm(
          v-model="newCard.example" 
          placeholder="VD: He abandoned his car."
        )

      .modal-actions
        button.btn-cancel(@click="closeAddModal") Hủy bỏ
        button.btn-confirm(@click="saveNewCard") Lưu thẻ

  //- ==========================================
  //- MODAL XÁC NHẬN XÓA THẺ
  //- ==========================================
  .modal-overlay(v-if="showDeleteModal" @click.self="showDeleteModal = false")
    .custom-modal.delete-modal
      .modal-icon-large 🗑️
      h3.modal-title Xác nhận xóa thẻ
      p.modal-message Bạn có chắc chắn muốn xóa thẻ từ vựng này không? Hành động này không thể hoàn tác.
      
      label.checkbox-label
        input(type="checkbox" v-model="skipDeleteConfirm")
        span Không nhắc lại vào lần sau
        
      .modal-actions
        button.btn-cancel(@click="showDeleteModal = false") Hủy
        button.btn-confirm.btn-danger(@click="confirmDelete") Xóa thẻ
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick } from 'vue';

// Khai báo emit
defineEmits(['return-landing']);

// Cấu trúc dữ liệu của một thẻ Flashcard
interface Flashcard {
  id: string;
  term: string;
  ipa?: string;
  definition: string;
  example: string;
}

const STORAGE_KEY = 'edx_student_vocab_data';
const SKIP_CONFIRM_KEY = 'edx_vocab_skip_delete_confirm';

const cards = ref<Flashcard[]>([]);
const flippedCards = ref<Record<string, boolean>>({});

// Modal States
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const cardToDelete = ref<string | null>(null);
const skipDeleteConfirm = ref(false);

const termInputRef = ref<HTMLInputElement | null>(null);
const ipaInputRef = ref<HTMLInputElement | null>(null);
const defInputRef = ref<HTMLTextAreaElement | null>(null);

const newCard = reactive({ term: '', ipa: '', definition: '', example: '' });

// Nạp dữ liệu
onMounted(() => {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try { cards.value = JSON.parse(savedData); } catch (e) { console.error('Lỗi đọc dữ liệu Flashcard:', e); }
  }
  
  const skipConfirm = localStorage.getItem(SKIP_CONFIRM_KEY);
  if (skipConfirm === 'true') {
    skipDeleteConfirm.value = true;
  }
});

// Lưu dữ liệu tự động
watch(cards, (newVal) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal)); }, { deep: true });
watch(skipDeleteConfirm, (newVal) => { localStorage.setItem(SKIP_CONFIRM_KEY, String(newVal)); });

// Hàm lật thẻ
const toggleFlip = (id: string) => {
  flippedCards.value[id] = !flippedCards.value[id];
};

// Modal Thêm Thẻ
const openAddModal = () => {
  showAddModal.value = true;
  nextTick(() => { termInputRef.value?.focus(); });
};

const closeAddModal = () => {
  showAddModal.value = false;
  newCard.term = '';
  newCard.ipa = '';
  newCard.definition = '';
  newCard.example = '';
};

const focusNext = (el: HTMLElement | null) => { el?.focus(); };

const saveNewCard = () => {
  if (!newCard.term.trim() || !newCard.definition.trim()) {
    alert('Vui lòng nhập đầy đủ Từ vựng và Ý nghĩa!');
    return;
  }
  
  cards.value.unshift({
    id: 'vocab_' + Date.now(),
    term: newCard.term.trim(),
    ipa: newCard.ipa.trim(),
    definition: newCard.definition.trim(),
    example: newCard.example.trim()
  });
  
  closeAddModal();
};

// Logic Xóa Thẻ an toàn
const requestDelete = (id: string) => {
  if (skipDeleteConfirm.value) {
    executeDelete(id);
  } else {
    cardToDelete.value = id;
    showDeleteModal.value = true;
  }
};

const confirmDelete = () => {
  if (cardToDelete.value) {
    executeDelete(cardToDelete.value);
    cardToDelete.value = null;
  }
  showDeleteModal.value = false;
};

const executeDelete = (id: string) => {
  cards.value = cards.value.filter(c => c.id !== id);
};
</script>

<style scoped>
.vocab-container {
  padding: 32px;
  background-color: transparent;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* HEADER */
.vocab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 24px 32px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  margin-bottom: 32px;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.header-left { display: flex; align-items: center; gap: 16px; }

.btn-back { 
  background: #ffffff; border: 1px solid #e2e8f0; color: #64748b; 
  width: 44px; height: 44px; border-radius: 50%;
  cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.btn-back:hover { 
  background: #eff6ff; 
  color: #2563eb; 
  border-color: #bfdbfe;
  transform: translateX(-4px); 
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.15);
}

.btn-back:active {
  transform: translateX(-2px) scale(0.95);
}

.title-group { display: flex; flex-direction: column; }
.count-badge { font-size: 0.9rem; background: #eff6ff; color: #3b82f6; padding: 4px 12px; border-radius: 20px; margin-left: 12px; font-weight: 700; }
.subtitle { margin: 0; color: #64748b; font-size: 0.95rem; }

.btn-add {
  background: #3b82f6; color: white; border: none; padding: 12px 24px;
  border-radius: 8px; font-weight: bold; font-size: 1rem; cursor: pointer;
  transition: all 0.2s; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); flex-shrink: 0;
}
.btn-add:hover { background: #2563eb; transform: translateY(-2px); }

/* EMPTY STATE */
.empty-state {
  text-align: center; padding: 80px 20px; background: white;
  border-radius: 16px; border: 2px dashed #cbd5e1; color: #475569;
}
.empty-icon { font-size: 4rem; margin-bottom: 16px; }
.empty-state h3 { margin: 0 0 8px 0; color: #1e293b; font-size: 1.3rem; }
.empty-state p { margin: 0 0 24px 0; color: #64748b; }
.btn-add-large {
  background: #10b981; color: white; border: none; padding: 14px 28px;
  border-radius: 8px; font-weight: bold; font-size: 1.05rem; cursor: pointer;
  transition: all 0.2s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
}
.btn-add-large:hover { background: #059669; transform: translateY(-2px); }

/* GRID & 3D ANIMATION - FIX 4 THẺ VÀ THẺ DỌC */
.flashcard-grid {
  display: grid;
  /* Min width khoảng 240px để đảm bảo luôn có 4 thẻ trên hàng (1200px / 4 - gap) */
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
}
.flashcard-wrapper {
  perspective: 1000px;
  height: 320px; /* Thẻ dọc: Chiều cao lớn hơn chiều rộng */
}
.flashcard {
  position: relative; width: 100%; height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d; cursor: pointer;
}
.flashcard.is-flipped { transform: rotateY(180deg); }

/* THẺ TRƯỚC VÀ SAU */
.flashcard-front, .flashcard-back {
  position: absolute; width: 100%; height: 100%;
  backface-visibility: hidden; border-radius: 16px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  padding: 24px; display: flex; flex-direction: column;
  box-sizing: border-box;
}

.flashcard-front {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white; justify-content: center; align-items: center; text-align: center;
}
.term { font-size: 2rem; font-weight: 800; margin: 0 0 8px 0; word-break: break-word; }
.ipa { font-size: 1.1rem; color: #93c5fd; margin: 0 0 16px 0; font-family: "Lucida Sans Unicode", "Lucida Grande", sans-serif; letter-spacing: 1px;}
.hint { font-size: 0.9rem; opacity: 0.8; font-weight: 500; margin-top: auto; padding-top: 16px;}

.flashcard-back {
  background: white; color: #0f172a; transform: rotateY(180deg);
  border: 2px solid #e2e8f0; align-items: flex-start; overflow-y: auto;
}
.back-content { width: 100%; margin-top: 16px;}
.badge { display: inline-block; background: #eff6ff; color: #2563eb; font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px;}
.badge-example { background: #f0fdf4; color: #16a34a; margin-top: 16px; }
.def-text { font-size: 1.1rem; font-weight: 600; line-height: 1.5; margin: 0; word-break: break-word;}
.ex-text { font-size: 0.95rem; font-style: italic; color: #475569; line-height: 1.5; margin: 0; word-break: break-word;}

/* NÚT XÓA TRÊN THẺ */
.btn-delete {
  position: absolute; top: 12px; right: 12px; background: rgba(255, 255, 255, 0.2);
  color: white; border: none; width: 28px; height: 28px; border-radius: 50%;
  font-size: 1.2rem; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; z-index: 10;
}
.btn-delete:hover { background: rgba(255, 255, 255, 0.4); transform: scale(1.1); }
.back-delete { background: #f1f5f9; color: #94a3b8; }
.back-delete:hover { background: #fee2e2; color: #ef4444; }

/* SCROLLBAR MẶT SAU THẺ */
.flashcard-back::-webkit-scrollbar { width: 4px; }
.flashcard-back::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

/* MODAL FORM */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center;
  z-index: 1000; backdrop-filter: blur(2px);
}
.custom-modal { background: white; width: 450px; padding: 32px; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
.delete-modal { text-align: center; }
.modal-icon-large { font-size: 3rem; margin-bottom: 16px; }
.modal-title { margin: 0 0 24px 0; color: #0f172a; font-size: 1.3rem; font-weight: 800; }
.delete-modal .modal-title { margin-bottom: 12px; }
.modal-message { color: #475569; line-height: 1.6; margin-bottom: 24px; }

.form-row { display: flex; gap: 16px; }
.flex-1 { flex: 1; }
.form-group { margin-bottom: 20px; text-align: left; }
.form-group label { display: block; font-weight: 600; color: #475569; margin-bottom: 8px; font-size: 0.95rem;}
.required { color: #ef4444; }
.text-input {
  width: 100%; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px;
  font-size: 1rem; color: #1e293b; outline: none; transition: all 0.2s; box-sizing: border-box;
}
.text-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
.textarea-sm { min-height: 80px; resize: vertical; }

.checkbox-label { display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-size: 0.95rem; color: #64748b; margin-bottom: 16px;}

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.delete-modal .modal-actions { justify-content: center; }
.btn-cancel { padding: 10px 20px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s;}
.btn-cancel:hover { background: #f1f5f9; }
.btn-confirm { padding: 10px 20px; border: none; background: #3b82f6; color: white; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s;}
.btn-confirm:hover { background: #2563eb; }
.btn-danger { background: #ef4444; }
.btn-danger:hover { background: #dc2626; }
</style>