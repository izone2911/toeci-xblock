import { ref, reactive, onMounted, watch, nextTick } from 'vue';

export interface Flashcard {
  id: string;
  term: string;
  ipa?: string;
  definition: string;
  example: string;
}


export function useStudentVocab() {
  const STORAGE_KEY = 'edx_student_vocab_data';
  const SKIP_CONFIRM_KEY = 'edx_vocab_skip_delete_confirm';
  const cards = ref<Flashcard[]>([]);
  const flippedCards = ref<Record<string, boolean>>({});

  const showAddModal = ref(false);
  const showDeleteModal = ref(false);
  const cardToDelete = ref<string | null>(null);
  const skipDeleteConfirm = ref(false);

  const termInputRef = ref<HTMLInputElement | null>(null);
  const ipaInputRef = ref<HTMLInputElement | null>(null);
  const defInputRef = ref<HTMLTextAreaElement | null>(null);


  const newCard = reactive({ term: '', ipa: '', definition: '', example: '' });

  // init từ Local Storage
  onMounted(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try { 
        cards.value = JSON.parse(savedData); 
      } catch (e) { 
        console.error('Lỗi giải mã cấu trúc dữ liệu Flashcard cục bộ:', e); 
      }
    }
    
    const skipConfirm = localStorage.getItem(SKIP_CONFIRM_KEY);
    if (skipConfirm === 'true') {
      skipDeleteConfirm.value = true;
    }
  });

  // Đồng bộ hóa cấu trúc xuống Local Storage
  watch(cards, (newVal) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal)); }, { deep: true });
  watch(skipDeleteConfirm, (newVal) => { localStorage.setItem(SKIP_CONFIRM_KEY, String(newVal)); });

  const toggleFlip = (id: string) => {
    flippedCards.value[id] = !flippedCards.value[id];
  };

  // Quản lý hộp thoại khởi tạo
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

  // Tab -> điều hướng
  const focusNext = (el: HTMLElement | null) => { el?.focus(); };

  // Lưu trữ cấu hình thẻ mới vào bộ nhớ
  const saveNewCard = () => {
    if (!newCard.term.trim() || !newCard.definition.trim()) {
      alert('Vui lòng nhập đầy đủ Từ vựng và Nội dung định nghĩa!');
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

  // Xóa 
  const executeDelete = (id: string) => {
    cards.value = cards.value.filter(c => c.id !== id);
  };

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

  return {
    cards,
    flippedCards,
    showAddModal,
    showDeleteModal,
    skipDeleteConfirm,
    termInputRef,
    ipaInputRef,
    defInputRef,
    newCard,
    toggleFlip,
    openAddModal,
    closeAddModal,
    focusNext,
    saveNewCard,
    requestDelete,
    confirmDelete
  };
}