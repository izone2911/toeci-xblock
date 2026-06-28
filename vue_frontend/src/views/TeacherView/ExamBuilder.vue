<template lang="pug">
.builder-layout(ref="builderLayoutRef")
  // ==========================================
  // THANH CÔNG CỤ TOÀN CỤC (TOPBAR)
  // ==========================================
  header.global-topbar
    .topbar-left
      .mode-switch
        button.mode-btn(type="button" :class="{ active: builderMode === 'traditional' }" @click.prevent="handleModeSwitch('traditional')") Truyền thống
        button.mode-btn(type="button" :class="{ active: builderMode === 'custom' }" @click.prevent="handleModeSwitch('custom')") Tùy chỉnh

    .topbar-right
      .actions
        input(type="file" ref="fileInputJson" accept=".json" style="display: none" @change="handleImportJSON")
        input(type="file" ref="fileInputGift" accept=".txt" style="display: none" @change="handleImportGIFT")
        
        button.btn-action.btn-import(type="button" @click.prevent="triggerImportJSON" title="Nhập dữ liệu từ file JSON") Nhập JSON
        button.btn-action.btn-import(type="button" @click.prevent="triggerImportGIFT" title="Nhập dữ liệu từ file GIFT (.txt)") Nhập GIFT
        button.btn-action.btn-export(type="button" @click.prevent="exportDataJSON" title="Xuất dữ liệu ra file JSON") Xuất JSON
        button.btn-action.btn-export(type="button" @click.prevent="exportDataGIFT" title="Xuất dữ liệu ra file GIFT (.txt)") Xuất GIFT
        
        button.btn-action.btn-fullscreen(
          type="button"
          @click.prevent="toggleFullscreen" 
          :title="isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to tối đa'"
        ) {{ isFullscreen ? '🗗 Thu nhỏ' : '🖵 Toàn màn hình' }}

        button.btn-action.btn-save(type="button" @click.prevent="saveDataToDB" title="Lưu đề thi vào hệ thống") Lưu đề thi

  // ==========================================
  // KHU VỰC SOẠN ĐỀ THI
  // ==========================================
  .main-body
    // CỘT TRÁI: CẤU TRÚC ĐỀ THI
    aside.sidebar
      .sidebar-header
        .setting-row
          span.setting-label Giới hạn thời gian
          label.toggle-switch(title="Kích hoạt giới hạn thời gian làm bài")
            input(type="checkbox" v-model="examSettings.isTimeLimitEnabled")
            span.slider
        
        .time-input-group(v-if="examSettings.isTimeLimitEnabled")
          input.time-input(
            type="text" 
            v-model.lazy="timeLimitFormatted" 
            placeholder="hh:mm:ss"
            title="Định dạng: hh:mm:ss"
          )

        .setting-row.mt-2
          span.setting-label Hiển thị đáp án
          label.toggle-switch(title="Cho phép học viên xem đáp án sau khi nộp bài")
            input(type="checkbox" v-model="examSettings.isShowAnswerEnabled")
            span.slider
      
      // DIỆN MẠO 1: SIDEBAR TRUYỀN THỐNG (7 PARTS)
      .tree-view(v-if="builderMode === 'traditional'")
        .part-group(v-for="part in 7" :key="part")
          .part-header(:class="{ active: currentPart === part }" @click="currentPart = part")
            span.part-name Part {{ part }}
            span.badge {{ examData[part].length }}
            
          .sub-questions
            .sub-q-item(
              v-for="(q, index) in examData[part]" 
              :key="q.id"
              :class="{ 'is-dragging': dragSidebarSource?.part === part && dragSidebarSource?.index === index }"
              draggable="true"
              @dragstart="onDragStartSidebar(part, index, $event)"
              @dragover.prevent
              @dragenter.prevent
              @drop="onDropSidebar(part, index)"
              @dragend="dragSidebarSource = null"
              @click="selectQuestionFromSidebar(part, q.id)"
              title="Kéo để đổi thứ tự"
            )
              span {{ getGlobalNumber(part, index) }}
              button.btn-del-mini(@click.stop="deleteQuestion(part, index)" title="Xóa câu hỏi") ×
            
            .sub-q-item.add-box(@click="addNewQuestionFromSidebar(part)" title="Thêm câu hỏi")
              span +
              
      // DIỆN MẠO 2: SIDEBAR TÙY CHỈNH
      .tree-view(v-else)
        .part-group(v-for="(pCustom, pIdx) in examData.custom" :key="pCustom.id")
          .part-header(:class="{ active: currentCustomPartId === pCustom.id }" @click="currentCustomPartId = pCustom.id")
            .part-name-wrapper
              span.part-name {{ pCustom.name }}
            
            span.badge {{ pCustom.questions.length }}

            .part-manage-dropdown
              button.btn-kebab(@click.stop="toggleDropdown(pCustom.id)") ⋮
              .dropdown-menu(v-if="activeDropdown === pCustom.id")
                button.dropdown-item(@click.stop="handleEditPart(pCustom)") Đổi tên
                button.dropdown-item.text-danger(@click.stop="handleDeletePart(pIdx)") Xóa phần thi
            
          .sub-questions
            .sub-q-item(
              v-for="(q, index) in pCustom.questions" 
              :key="q.id"
              :class="{ 'is-dragging': dragSidebarSource?.part === pCustom.id && dragSidebarSource?.index === index }"
              draggable="true"
              @dragstart="onDragStartSidebar(pCustom.id, index, $event)"
              @dragover.prevent
              @dragenter.prevent
              @drop="onDropSidebar(pCustom.id, index)"
              @dragend="dragSidebarSource = null"
              @click="selectQuestionFromSidebar(pCustom.id, q.id)"
              title="Kéo để đổi thứ tự"
            )
              span {{ getCustomGlobalNumber(pCustom.id, index) }}
              button.btn-del-mini(@click.stop="deleteQuestion(pCustom.id, index)" title="Xóa câu hỏi") ×
            
            .sub-q-item.add-box(@click="addNewQuestionFromSidebar(pCustom.id)" title="Thêm câu hỏi")
              span +

        button.btn-add-custom-part(@click="openPartNameModal(null)") + Thêm phần thi

    // CỘT PHẢI: WORKSPACE
    main.workspace
      template(v-if="builderMode === 'traditional'")
        .global-audio-bar(v-if="currentPart <= 4")
          .global-audio-content
            .audio-controls
              .player-wrapper(v-if="examSettings.globalListeningAudio")
                audio.custom-audio-player(controls :src="examSettings.globalListeningAudio")
                button.btn-remove-media(@click="examSettings.globalListeningAudio = ''" title="Xóa tệp âm thanh") ×
              .audio-input-group(v-else)
                input.global-audio-input(
                  v-model="tempGlobalAudioUrl" 
                  @keyup.enter="applyGlobalAudioUrl"
                  placeholder="Đường dẫn âm thanh toàn bài (.mp3)..."
                )
                button.btn-apply(v-if="tempGlobalAudioUrl" @click="applyGlobalAudioUrl") Áp dụng

        .editor-area
          .builder-zoom-wrapper
            component(
              :is="currentEditorComponent"
              v-model="examData[currentPart]"
              :partNumber="currentPart"
              :startNumber="currentPartStartNumber"
              :sessionConfig="sessionConfig"
            )

      template(v-else)
        .editor-area(v-if="currentCustomPart")
          .builder-zoom-wrapper
            CustomModeEditor(
              v-model="currentCustomPart"
              :sessionConfig="sessionConfig"
              :startNumber="currentCustomPartStartNumber"
            )
        .custom-mode-placeholder(v-else)
          h2 Chọn hoặc tạo phần thi mới
          p Chọn phần thi từ danh sách bên trái hoặc chọn "Thêm phần thi" để bắt đầu.

  // MODALS
  .modal-overlay(v-if="confirmModal.isOpen" @click.self="closeModal")
    .custom-modal
      h3.modal-title Thông báo
      p.modal-message(v-html="confirmModal.message")
      
      label.checkbox-label(v-if="confirmModal.type !== 'mode' && confirmModal.type !== 'alert'")
        input(type="checkbox" v-model="confirmModal.dontShowAgain")
        span Không hiển thị lại
      
      .modal-actions
        button.btn-cancel(v-if="confirmModal.type !== 'alert'" @click="closeModal") Hủy bỏ
        button.btn-confirm(:class="{ 'btn-danger': confirmModal.type === 'mode' || confirmModal.type === 'delete' }" @click="executePendingAction") {{ confirmModal.type === 'alert' ? 'Đóng' : 'Xác nhận' }}

  .modal-overlay(v-if="partNameModal.isOpen" @click.self="closePartNameModal")
    .custom-modal
      h3.modal-title {{ partNameModal.editingId ? 'Đổi tên phần thi' : 'Thêm phần thi' }}
      .input-wrapper.mt-3
        input.text-input(v-model="partNameModal.inputName" placeholder="Nhập tên phần thi..." @keyup.enter="savePartName" @input="partNameModal.error = ''")
        p.error-text(v-if="partNameModal.error") {{ partNameModal.error }}
      .modal-actions.mt-4
        button.btn-cancel(@click="closePartNameModal") Hủy bỏ
        button.btn-confirm(@click="savePartName") Lưu

  //- 🔥 MODAL XUẤT DỮ LIỆU (CHỐNG CHẶN IFRAME)
  .modal-overlay(v-if="exportModal.isOpen" @click.self="closeExportModal")
    .custom-modal.export-modal
      h3.modal-title Hệ thống đang xuất dữ liệu
      p.modal-message Đang xử lý file <b>{{ exportModal.filename }}</b>...
      p.text-warning NẾU FILE KHÔNG TỰ ĐỘNG TẢI XUỐNG, bấm <b>Sao chép</b> để sao chép nội dung file.
      .input-wrapper.mt-3
        textarea.text-input.export-textarea(readonly v-model="exportModal.content" @focus="$event.target.select()")
      .modal-actions.mt-4
        button.btn-cancel(@click="closeExportModal") Đóng
        //- button.btn-confirm(@click="copyExportData") Sao chép
        button.btn-confirm(@click="copyExportData") {{ copyButtonText }}
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useExamStore } from '../../store/examStore';

import Part1Editor from './editors/Part1Editor.vue';
import Part2Editor from './editors/Part2Editor.vue';
import Part3Editor from './editors/Part3Editor.vue';
import Part4Editor from './editors/Part4Editor.vue';
import Part5Editor from './editors/Part5Editor.vue';
import Part6Editor from './editors/Part6Editor.vue';
import Part7Editor from './editors/Part7Editor.vue';
import CustomModeEditor from './editors/CustomModeEditor.vue';

const CACHE_KEY = 'edx_toeic_builder_cache';
const store = useExamStore();

const builderMode = ref<'traditional' | 'custom'>('traditional');
const currentPart = ref(1);
const currentCustomPartId = ref<string | null>(null);
const tempGlobalAudioUrl = ref('');

const fileInputJson = ref<HTMLInputElement | null>(null);
const fileInputGift = ref<HTMLInputElement | null>(null);

const examSettings = ref({ globalListeningAudio: '', isTimeLimitEnabled: false, isShowAnswerEnabled: true, timeLimitSeconds: 7200 });
const sessionConfig = ref({ skipDeleteConfirm: false, skipSwapConfirm: false });

const examData = ref<Record<string | number, any>>({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [] });

const builderLayoutRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

const currentCustomPart = computed(() => {
  return examData.value.custom.find((p: any) => p.id === currentCustomPartId.value) || null;
});

const activeDropdown = ref<string | null>(null);
const toggleDropdown = (id: string) => { activeDropdown.value = activeDropdown.value === id ? null : id; };
const closeDropdown = () => { activeDropdown.value = null; };

const confirmModal = ref({ isOpen: false, message: '', dontShowAgain: false, type: '' as 'delete' | 'swap' | 'mode' | 'alert', pendingAction: null as (() => void) | null });
const openModal = (message: string, type: 'delete' | 'swap' | 'mode' | 'alert', action: () => void = () => {}) => {
  if (type === 'delete' && sessionConfig.value.skipDeleteConfirm) { action(); return; }
  if (type === 'swap' && sessionConfig.value.skipSwapConfirm) { action(); return; }
  confirmModal.value = { isOpen: true, message, dontShowAgain: false, type, pendingAction: action };
};
const closeModal = () => { confirmModal.value.isOpen = false; confirmModal.value.pendingAction = null; };
const executePendingAction = () => {
  if (confirmModal.value.dontShowAgain) {
    if (confirmModal.value.type === 'delete') sessionConfig.value.skipDeleteConfirm = true;
    if (confirmModal.value.type === 'swap') sessionConfig.value.skipSwapConfirm = true;
  }
  if (confirmModal.value.pendingAction) confirmModal.value.pendingAction();
  closeModal();
};

const partNameModal = ref({ isOpen: false, inputName: '', error: '', editingId: null as string | null });

const handleEditPart = (pCustom: any) => {
  activeDropdown.value = null;
  openPartNameModal(pCustom);
};

const handleDeletePart = (pIdx: number) => {
  activeDropdown.value = null;
  deleteCustomPart(pIdx);
};

const openPartNameModal = (partObj: any | null) => {
  partNameModal.value = { isOpen: true, inputName: partObj ? partObj.name : '', error: '', editingId: partObj ? partObj.id : null };
};
const closePartNameModal = () => { partNameModal.value.isOpen = false; };
const savePartName = () => {
  const nameTrimmed = partNameModal.value.inputName.trim();
  if (!nameTrimmed) { partNameModal.value.error = 'Vui lòng nhập tên phần thi.'; return; }
  const isDuplicate = examData.value.custom.some((p: any) => p.name.toLowerCase() === nameTrimmed.toLowerCase() && p.id !== partNameModal.value.editingId);
  if (isDuplicate) { partNameModal.value.error = 'Tên phần thi đã tồn tại.'; return; }

  if (partNameModal.value.editingId) {
    const target = examData.value.custom.find((p: any) => p.id === partNameModal.value.editingId);
    if (target) target.name = nameTrimmed;
  } else {
    const newId = 'part_' + Date.now() + Math.random();
    examData.value.custom.push({ id: newId, name: nameTrimmed, mediaUrl: '', sharedContext: '', questions: [] });
    currentCustomPartId.value = newId; 
  }
  closePartNameModal();
};

const deleteCustomPart = (index: number) => {
  const targetPart = examData.value.custom[index];
  openModal(`Xác nhận xóa phần thi <b>"${targetPart.name}"</b> và toàn bộ câu hỏi trực thuộc?`, 'mode', () => {
    if (currentCustomPartId.value === targetPart.id) currentCustomPartId.value = null;
    examData.value.custom.splice(index, 1);
  });
};

// ĐỒNG BỘ DỮ LIỆU TỪ EDX
watch(() => store.isLoading, (isLoading) => {
  if (!isLoading) {
    if (store.edxConfig.getUrl) {
      const data = store.examDataRaw || {};
      if (data.builderMode) builderMode.value = data.builderMode;
      if (data.examSettings) examSettings.value = { ...examSettings.value, ...data.examSettings };
      
      const freshData: Record<string | number, any> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [] };
      if (data.examData) {
        if (data.builderMode === 'custom' && data.examData.custom) {
          freshData.custom = data.examData.custom;
          if (freshData.custom.length > 0) currentCustomPartId.value = freshData.custom[0].id;
        } else {
          for (let p = 1; p <= 7; p++) {
            if (data.examData[p]) freshData[p] = data.examData[p];
          }
        }
      }
      examData.value = freshData;
    } else {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed.examData) examData.value = parsed.examData;
          if (parsed.examSettings) examSettings.value = { ...examSettings.value, ...parsed.examSettings };
          if (parsed.builderMode) builderMode.value = parsed.builderMode;
        } catch (e) { console.error("Lỗi dữ liệu:", e); }
      }
    }
  }
}, { immediate: true });

const toggleFullscreen = () => {
  const appContainer = document.querySelector('.builder-layout');
  const edxModal = appContainer?.closest('.modal-window') as HTMLElement | null;
  
  if (!edxModal) return;

  if (!isFullscreen.value) {
    edxModal.dataset.originalStyle = edxModal.getAttribute('style') || '';

    Object.assign(edxModal.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      margin: '0',
      borderRadius: '0',
      zIndex: '200000',
      display: 'flex',
      flexDirection: 'column'
    });

    const modalHeader = edxModal.querySelector('.modal-header') as HTMLElement | null;
    const modalContent = edxModal.querySelector('.modal-content') as HTMLElement | null;
    
    if (modalContent) {
      const headerHeight = modalHeader?.offsetHeight || 65;
      modalContent.style.height = `calc(100vh - ${headerHeight}px)`;
      modalContent.style.maxHeight = 'none';
      modalContent.style.overflowY = 'auto'; 
    }

    isFullscreen.value = true;
  } else {
    const originalStyle = edxModal.dataset.originalStyle || '';
    edxModal.setAttribute('style', originalStyle);
    
    const modalContent = edxModal.querySelector('.modal-content') as HTMLElement | null;
    if (modalContent) {
      modalContent.style.height = '';
      modalContent.style.maxHeight = '';
    }
    
    isFullscreen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeDropdown);
});

onUnmounted(() => { 
  document.removeEventListener('click', closeDropdown); 
});

watch([examData, examSettings, builderMode], () => {
  if (!store.edxConfig.getUrl) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ examData: examData.value, examSettings: examSettings.value, builderMode: builderMode.value }));
  }
}, { deep: true });

const timeLimitFormatted = computed({
  get() {
    const totalSeconds = examSettings.value.timeLimitSeconds;
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  },
  set(val: string) {
    if (!val) return; const parts = val.split(':');
    let hrs = parseInt(parts[0] || '0', 10); let mins = parts.length >= 2 ? parseInt(parts[1] || '0', 10) : 0; let secs = parts.length === 3 ? parseInt(parts[2] || '0', 10) : 0;
    if (isNaN(hrs) || hrs < 0) hrs = 0; if (isNaN(mins) || mins < 0) mins = 0; if (isNaN(secs) || secs < 0) secs = 0;
    examSettings.value.timeLimitSeconds = (hrs * 3600) + (mins * 60) + secs;
  }
});

const applyGlobalAudioUrl = () => { if (tempGlobalAudioUrl.value.trim() !== '') { examSettings.value.globalListeningAudio = tempGlobalAudioUrl.value.trim(); tempGlobalAudioUrl.value = ''; } };

const editorMap: Record<number, any> = { 1: Part1Editor, 2: Part2Editor, 3: Part3Editor, 4: Part4Editor, 5: Part5Editor, 6: Part6Editor, 7: Part7Editor };
const currentEditorComponent = computed(() => editorMap[currentPart.value]);

const getGlobalNumber = (targetPart: number, localIndex: number) => { let count = 0; for (let p = 1; p < targetPart; p++) { count += examData.value[p].length; } return count + localIndex + 1; };
const currentPartStartNumber = computed(() => { let count = 0; for (let p = 1; p < currentPart.value; p++) { count += examData.value[p].length; } return count + 1; });

const getCustomGlobalNumber = (targetPartId: string, localIndex: number) => {
  let count = 0;
  for (const p of examData.value.custom) {
    if (p.id === targetPartId) return count + localIndex + 1;
    count += p.questions.length;
  }
  return count + localIndex + 1;
};
const currentCustomPartStartNumber = computed(() => {
  if (!currentCustomPartId.value) return 1;
  let count = 0;
  for (const p of examData.value.custom) {
    if (p.id === currentCustomPartId.value) return count + 1;
    count += p.questions.length;
  }
  return 1;
});

const dragSidebarSource = ref<{part: string | number, index: number} | null>(null);

const onDragStartSidebar = (part: string | number, index: number, event: DragEvent) => { dragSidebarSource.value = { part, index }; if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'; };

const onDropSidebar = (targetPart: string | number, targetIndex: number) => { 
  if (!dragSidebarSource.value) return; 
  const { part: sourcePart, index: sourceIndex } = dragSidebarSource.value; 
  if (sourcePart === targetPart && sourceIndex !== targetIndex) { 
    const labelSource = typeof sourcePart === 'number' ? getGlobalNumber(sourcePart, sourceIndex) : getCustomGlobalNumber(sourcePart as string, sourceIndex);
    const labelTarget = typeof targetPart === 'number' ? getGlobalNumber(targetPart as number, targetIndex) : getCustomGlobalNumber(targetPart as string, targetIndex);

    openModal(`Xác nhận hoán đổi vị trí câu ${labelSource} và câu ${labelTarget}?`, 'swap', () => {
      if (typeof sourcePart === 'number') {
        const list = examData.value[sourcePart]; 
        const temp = list[sourceIndex]; list[sourceIndex] = list[targetIndex]; list[targetIndex] = temp;
      } else {
        const targetPartObj = examData.value.custom.find((p: any) => p.id === sourcePart);
        if (targetPartObj) {
          const temp = targetPartObj.questions[sourceIndex]; targetPartObj.questions[sourceIndex] = targetPartObj.questions[targetIndex]; targetPartObj.questions[targetIndex] = temp;
        }
      }
    });
  } 
  dragSidebarSource.value = null; 
};

const addNewQuestionFromSidebar = (part: string | number) => { 
  if (typeof part === 'number') {
    const initialOptions = part === 2 ? ['', '', ''] : ['', '', '', '']; 
    const newQ = { id: Date.now() + Math.random(), type: 'multiple_choice', text: '', content: '', options: initialOptions, correctAnswer: '', explanation: '' };
    examData.value[part].push(newQ); 
  } else {
    const newQ = { 
      id: Date.now() + Math.random(), 
      groupId: 'group_' + Date.now(), 
      type: 'multiple_choice', 
      text: '',
      content: '', 
      sharedContext: '', 
      options: ['', '', '', ''], 
      pairs: [],
      correctAnswer: '', 
      explanation: '', 
      scoreEnabled: false, 
      score: 1,
      textPlaceholder: ''
    };
    const targetPartObj = examData.value.custom.find((p: any) => p.id === part);
    if (targetPartObj) targetPartObj.questions.push(newQ);
  }
};

const selectQuestionFromSidebar = (part: string | number, qId: number) => { 
  if (typeof part === 'number') { currentPart.value = part; } else { currentCustomPartId.value = part; }
  nextTick(() => { const el = document.getElementById(`question-${qId}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); 
};

const deleteQuestion = (part: string | number, index: number) => { 
  const label = typeof part === 'number' ? getGlobalNumber(part, index) : getCustomGlobalNumber(part as string, index);
  openModal(`Xác nhận xóa câu hỏi số ${label}?`, 'delete', () => { 
    if (typeof part === 'number') {
      examData.value[part].splice(index, 1); 
    } else {
      const targetPartObj = examData.value.custom.find((p: any) => p.id === part);
      if (targetPartObj) {
         const q = targetPartObj.questions[index];
         if (q.sharedContext && index + 1 < targetPartObj.questions.length && targetPartObj.questions[index + 1].groupId === q.groupId) {
             targetPartObj.questions[index + 1].sharedContext = q.sharedContext;
         }
         targetPartObj.questions.splice(index, 1);
      }
    }
  });
};

const handleModeSwitch = (mode: 'traditional' | 'custom') => {
  if (builderMode.value === mode) return;
  const hasData = Object.values(examData.value).some(arr => arr && arr.length > 0) || examSettings.value.globalListeningAudio !== '';
  if (!hasData) { builderMode.value = mode; return; }
  openModal(`Việc chuyển đổi chế độ sẽ xóa toàn bộ nội dung hiện tại. Xác nhận tiếp tục?`, 'mode', () => {
    builderMode.value = mode; 
    currentCustomPartId.value = null; 
    examData.value = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [] };
    examSettings.value.globalListeningAudio = ''; 
    tempGlobalAudioUrl.value = '';
  });
};

const saveDataToDB = async () => { 
  const payloadData: Record<string | number, any> = {};
  if (builderMode.value === 'traditional') {
    for (let p = 1; p <= 7; p++) {
      if (examData.value[p]) payloadData[p] = examData.value[p];
    }
  } else {
    if (examData.value.custom) payloadData.custom = examData.value.custom;
  }

  const payload = { 
    examSettings: examSettings.value, 
    examData: payloadData, 
    builderMode: builderMode.value 
  };
  
  try {
    await store.saveToEdx(payload);
    openModal('Lưu đề thi vào hệ thống thành công.', 'alert');
  } catch (error) {
    openModal('Lỗi kết nối. Không thể lưu dữ liệu.', 'alert');
  }
};

const checkDataAndImport = (inputRef: HTMLInputElement | null) => {
  const hasData = Object.values(examData.value).some(arr => arr && arr.length > 0) || examSettings.value.globalListeningAudio !== '';
  if (hasData) { openModal(`Việc nhập dữ liệu mới sẽ ghi đè toàn bộ nội dung hiện tại. Xác nhận tiếp tục?`, 'mode', () => { inputRef?.click(); }); } else { inputRef?.click(); }
};

// =========================================================================
// 🔥 HỆ THỐNG XUẤT DỮ LIỆU AN TOÀN TRONG IFRAME (CÓ FALLBACK COPY)
// =========================================================================
const exportModal = ref({ isOpen: false, content: '', filename: '' });
const copyButtonText = ref('📋 Sao chép');

const closeExportModal = () => { 
  exportModal.value.isOpen = false; 
  copyButtonText.value = '📋 Sao chép'; // Reset lại nút khi đóng
};

const copyExportData = () => {
  const content = exportModal.value.content;

  // Hiệu ứng UX trên nút bấm
  const showSuccess = () => {
    copyButtonText.value = '✔️ Đã sao chép thành công!';
    setTimeout(() => { copyButtonText.value = '📋 Sao chép'; }, 3000);
  };

  const showError = () => {
    copyButtonText.value = '❌ Bị chặn! Hãy bôi đen thủ công';
    setTimeout(() => { copyButtonText.value = '📋 Sao chép'; }, 3000);
  };

  // HÀM FALLBACK: Dùng kỹ thuật cổ điển chống nghẽn Iframe
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Đặt thẻ ra ngoài tầm nhìn để không gây giật màn hình
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) showSuccess();
      else showError();
    } catch (err) {
      showError();
    }
    document.body.removeChild(textArea);
  };

  // Ưu tiên API hiện đại, nếu trình duyệt/iframe chặn thì dùng Fallback
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    fallbackCopyTextToClipboard(content);
    return;
  }

  navigator.clipboard.writeText(content).then(() => {
    showSuccess();
  }).catch(() => {
    fallbackCopyTextToClipboard(content);
  });
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  // BƯỚC 1: Ép trình duyệt tải file (Có thể bị edX chặn)
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    a.target = '_top'; // Cố lách luật iframe
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  } catch (e) {
    console.warn("Tiến trình tải file bị gián đoạn", e);
  }

  // BƯỚC 2: Mở LUÔN Cửa sổ dự phòng (Đảm bảo 100% không bị "im re")
  exportModal.value = {
    isOpen: true,
    content: content,
    filename: filename
  };
};

const exportDataJSON = () => {
  const payloadData: Record<string | number, any> = {};
  
  if (builderMode.value === 'traditional') {
    let globalIdx = 1;
    for (let p = 1; p <= 7; p++) {
      if (examData.value[p]) {
        payloadData[p] = JSON.parse(JSON.stringify(examData.value[p]));
        payloadData[p].forEach((q: any) => { q.globalIndex = globalIdx++; });
      }
    }
  } else {
    if (examData.value.custom) {
      payloadData.custom = JSON.parse(JSON.stringify(examData.value.custom));
      let customGlobalIdx = 1;
      payloadData.custom.forEach((part: any) => {
        if (part.questions) {
          part.questions.forEach((q: any) => { q.globalIndex = customGlobalIdx++; });
        }
      });
    }
  }

  const payload = { examSettings: examSettings.value, examData: payloadData, builderMode: builderMode.value };
  const dataStr = JSON.stringify(payload, null, 2); 
  
  // GỌI HÀM AN TOÀN
  downloadFile(dataStr, `exam_${builderMode.value}_data.json`, 'application/json');
};

const triggerImportJSON = () => checkDataAndImport(fileInputJson.value);
const handleImportJSON = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      if (data.builderMode) builderMode.value = data.builderMode;
      
      const freshData: Record<string | number, any> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [] };
      
      if (data.examData) {
        if (data.builderMode === 'custom' && data.examData.custom) {
          freshData.custom = data.examData.custom;
        } else {
          for (let p = 1; p <= 7; p++) {
            if (data.examData[p]) freshData[p] = data.examData[p];
          }
        }
      }
      examData.value = freshData;
      
      if (data.examSettings) {
         examSettings.value = { ...examSettings.value, ...data.examSettings };
         if (!data.examSettings.globalListeningAudio) examSettings.value.globalListeningAudio = '';
      }
      tempGlobalAudioUrl.value = '';

      if (builderMode.value === 'custom' && examData.value.custom.length > 0) { 
        currentCustomPartId.value = examData.value.custom[0].id; 
      }
      openModal('Nhập dữ liệu JSON thành công.', 'alert');
    } catch (err) { openModal('Lỗi định dạng file JSON.', 'alert'); }
    if (fileInputJson.value) fileInputJson.value.value = '';
  }; reader.readAsText(file);
};

const exportDataGIFT = () => {
  let giftText = ''; let globalIdx = 1;
  giftText += `// ====== SETTINGS ======\n// @Mode: ${builderMode.value}\n// @TimeLimitEnabled: ${examSettings.value.isTimeLimitEnabled}\n// @TimeLimit: ${examSettings.value.timeLimitSeconds}\n// @ShowAnswer: ${examSettings.value.isShowAnswerEnabled}\n`;
  if (examSettings.value.globalListeningAudio) { giftText += `// @GlobalAudio: ${examSettings.value.globalListeningAudio}\n`; }
  giftText += `\n`;

  if (builderMode.value === 'traditional') {
    for (let p = 1; p <= 7; p++) {
      if (examData.value[p] && examData.value[p].length > 0) {
        giftText += `// ====== PART ${p} ======\n\n`;
        examData.value[p].forEach((q: any, index: number) => {
          const title = `::Part ${p} - Câu ${globalIdx++}::\n`;
          let contextText = '';
          if (p === 1 || p === 2) { if (q.image) contextText += `[PASSAGE_IMG]${q.image}[/PASSAGE_IMG]\n`; } 
          else if (p === 3 || p === 4) { if (index % 3 === 0) { if (q.image) contextText += `[PASSAGE_IMG]${q.image}[/PASSAGE_IMG]\n`; if (q.content) contextText += `[TRANSCRIPT_TEXT]${q.content}[/TRANSCRIPT_TEXT]\n`; } } 
          else if (p === 6) { if (index % 4 === 0) { if (q.content) contextText += `[PASSAGE_TEXT]${q.content}[/PASSAGE_TEXT]\n`; if (q.image) contextText += `[TRANSCRIPT_TEXT]${q.image}[/TRANSCRIPT_TEXT]\n`; } } 
          else if (p === 7) {
            if (q.passages && (index === 0 || examData.value[p][index - 1].groupId !== q.groupId)) { q.passages.forEach((pass: any) => { if (pass.type === 'text') contextText += `[PASSAGE_TEXT]${pass.content}[/PASSAGE_TEXT]\n`; if (pass.type === 'image') contextText += `[PASSAGE_IMG]${pass.url}[/PASSAGE_IMG]\n`; }); }
            if (q.transcripts && (index === 0 || examData.value[p][index - 1].groupId !== q.groupId)) { q.transcripts.forEach((tr: any) => { if (tr.type === 'text') contextText += `[TRANSCRIPT_TEXT]${tr.content}[/TRANSCRIPT_TEXT]\n`; if (tr.type === 'image') contextText += `[TRANSCRIPT_IMG]${tr.url}[/TRANSCRIPT_IMG]\n`; }); }
          }
          let qText = ''; if (p === 5) qText = q.content || ''; else if (p !== 6) qText = q.text || ''; 
          let optionsText = '';
          if (q.options && q.options.length > 0) { q.options.forEach((opt: string, oIdx: number) => { const label = String.fromCharCode(65 + oIdx); if (label === q.correctAnswer) optionsText += `=${opt}\n`; else optionsText += `~${opt}\n`; }); }
          let exp = ''; if (p === 5 || p === 7) exp = q.explanation || ''; else if (p === 6) exp = q.text || ''; 
          if (exp) optionsText += `[EXP]${exp}[/EXP]\n`;
          giftText += `${title}${contextText}${qText} {\n${optionsText}}\n\n`;
        });
      }
    }
  } else {
    examData.value.custom.forEach((part: any, pIdx: number) => {
      giftText += `// ====== CUSTOM PART :: ${part.name} ======\n`;
      if (part.mediaUrl) giftText += `// @PartMedia: ${part.mediaUrl}\n`;
      if (part.sharedContext) giftText += `[PART_CONTEXT]${part.sharedContext}[/PART_CONTEXT]\n`;
      giftText += `\n`;

      part.questions.forEach((q: any, index: number) => {
        const title = `::Câu ${globalIdx++}::\n`;
        let metaText = `// @QType: ${q.type}\n`;
        if (q.scoreEnabled) metaText += `// @Score: ${q.score}\n`;
        if (q.textPlaceholder) metaText += `// @Placeholder: ${q.textPlaceholder}\n`;

        let contextText = '';
        if (index === 0 || part.questions[index - 1].groupId !== q.groupId) {
          if (q.sharedContext) contextText += `[GROUP_CONTEXT]${q.sharedContext}[/GROUP_CONTEXT]\n`;
        }

        let qText = q.text || '';
        let optionsText = '';

        if (q.type === 'multiple_choice') {
          if (q.options && q.options.length > 0) {
            q.options.forEach((opt: string, oIdx: number) => {
              const label = String.fromCharCode(65 + oIdx);
              if (label === q.correctAnswer) optionsText += `=${opt}\n`;
              else optionsText += `~${opt}\n`;
            });
          }
        } else if (q.type === 'matching') {
          if (q.pairs && q.pairs.length > 0) {
            q.pairs.forEach((pair: any) => { optionsText += `=${pair.left} -> ${pair.right}\n`; });
          }
        } else if (q.type === 'text_input') {
          if (q.correctAnswer) optionsText += `=${q.correctAnswer}\n`;
        }

        let exp = q.explanation || '';
        if (exp) optionsText += `[EXP]${exp}[/EXP]\n`;

        giftText += `${title}${metaText}${contextText}${qText} {\n${optionsText}}\n\n`;
      });
    });
  }

  if (!giftText.trim()) { openModal('Không có dữ liệu để xuất.', 'alert'); return; }
  
  // GỌI HÀM AN TOÀN
  downloadFile(giftText, 'exam_questions.txt', 'text/plain;charset=utf-8');
};

const triggerImportGIFT = () => checkDataAndImport(fileInputGift.value);
const handleImportGIFT = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    const modeMatch = content.match(/\/\/\s*@Mode:\s*(traditional|custom)/); 
    const importMode = modeMatch ? modeMatch[1] : 'traditional';
    builderMode.value = importMode as 'traditional' | 'custom';

    const timeEnabledMatch = content.match(/\/\/\s*@TimeLimitEnabled:\s*(true|false)/); 
    if (timeEnabledMatch) examSettings.value.isTimeLimitEnabled = timeEnabledMatch[1] === 'true';
    else examSettings.value.isTimeLimitEnabled = false;

    const timeMatch = content.match(/\/\/\s*@TimeLimit:\s*(\d+)/); if (timeMatch) examSettings.value.timeLimitSeconds = parseInt(timeMatch[1], 10);
    const answerMatch = content.match(/\/\/\s*@ShowAnswer:\s*(true|false)/); if (answerMatch) examSettings.value.isShowAnswerEnabled = answerMatch[1] === 'true';
    
    const audioMatch = content.match(/\/\/\s*@GlobalAudio:\s*(.+)/); 
    examSettings.value.globalListeningAudio = audioMatch ? audioMatch[1].trim() : '';
    tempGlobalAudioUrl.value = '';

    let importedCount = 0;

    if (importMode === 'traditional') {
      const newExamData: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
      const questionBlocks = content.split(/\n\s*\n/);
      questionBlocks.forEach(block => {
        if (block.startsWith('//') || block.trim() === '') return;
        const titleMatch = block.match(/::Part (\d+).*?::/); if (!titleMatch) return; const p = parseInt(titleMatch[1], 10);
        let blockWithoutTitle = block.replace(/::.*?::/, '').trim();
        const passages: any[] = []; const transcripts: any[] = []; let imagePart1234 = ''; let contentPart346 = '';

        const tagRegex = /\[(PASSAGE_TEXT|PASSAGE_IMG|TRANSCRIPT_TEXT|TRANSCRIPT_IMG)\]([\s\S]*?)\[\/\1\]/g; let match;
        while ((match = tagRegex.exec(blockWithoutTitle)) !== null) {
          const tag = match[1]; const val = match[2].trim();
          if (p === 7) {
            if (tag === 'PASSAGE_TEXT') passages.push({type: 'text', content: val}); if (tag === 'PASSAGE_IMG') passages.push({type: 'image', url: val});
            if (tag === 'TRANSCRIPT_TEXT') transcripts.push({type: 'text', content: val}); if (tag === 'TRANSCRIPT_IMG') transcripts.push({type: 'image', url: val});
          } else {
            if (tag === 'PASSAGE_IMG') imagePart1234 = val; if (tag === 'PASSAGE_TEXT') contentPart346 = val;
            if (tag === 'TRANSCRIPT_TEXT') { if (p === 6) imagePart1234 = val; else contentPart346 = val; }
          }
        }
        let qTextRaw = blockWithoutTitle.replace(tagRegex, '').trim(); const optMatch = qTextRaw.match(/(.*?)\s*\{([^}]*)\}/s); if (!optMatch) return;
        const qText = optMatch[1].trim(); const optionsBlock = optMatch[2];
        let exp = ''; const expMatch = optionsBlock.match(/\[EXP\]([\s\S]*?)\[\/EXP\]/); if (expMatch) exp = expMatch[1].trim();
        const cleanOptionsBlock = optionsBlock.replace(/\[EXP\][\s\S]*?\[\/EXP\]/, '').trim();
        const optionLines = cleanOptionsBlock.split('\n').map(o => o.trim()).filter(o => o !== ''); const parsedOptions: string[] = []; let correctLabel = '';
        optionLines.forEach(line => {
          if (line.startsWith('=')) { parsedOptions.push(line.substring(1).trim()); correctLabel = String.fromCharCode(65 + parsedOptions.length - 1); } 
          else if (line.startsWith('~')) { parsedOptions.push(line.substring(1).trim()); }
        });
        const targetCount = (p === 2) ? 3 : 4; while (parsedOptions.length < targetCount) parsedOptions.push(''); const finalOptions = parsedOptions.slice(0, targetCount);

        const qObj: any = { id: Date.now() + Math.random(), options: finalOptions, correctAnswer: correctLabel };
        if (p === 1 || p === 2) { qObj.text = qText; if (imagePart1234) qObj.image = imagePart1234; } 
        else if (p === 3 || p === 4) { qObj.text = qText; if (imagePart1234) qObj.image = imagePart1234; if (contentPart346) qObj.content = contentPart346; } 
        else if (p === 5) { qObj.content = qText; qObj.explanation = exp; } 
        else if (p === 6) { qObj.text = exp; if (contentPart346) qObj.content = contentPart346; if (imagePart1234) qObj.image = imagePart1234; } 
        else if (p === 7) { qObj.text = qText; qObj.explanation = exp; if (passages.length > 0) qObj.passages = passages; if (transcripts.length > 0) qObj.transcripts = transcripts; }
        newExamData[p].push(qObj); importedCount++;
      });

      let currentGroupId = '';
      newExamData[7].forEach(q => {
        if (q.passages && q.passages.length > 0) currentGroupId = 'group_' + Date.now() + Math.random();
        if (!currentGroupId) currentGroupId = 'group_' + Date.now() + Math.random();
        q.groupId = currentGroupId;
      });

      if (importedCount > 0) { 
        examData.value = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [], ...newExamData }; 
        openModal(`Nhập thành công ${importedCount} câu hỏi từ file GIFT.`, 'alert'); 
      } 
      else { openModal('Không tìm thấy dữ liệu hợp lệ.', 'alert'); }
    
    } else {
      const newCustomData: any[] = [];
      let currentPart: any = null;
      let currentGroupId = 'group_' + Date.now();
      
      const blocks = content.split(/\n\s*\n/);
      blocks.forEach(block => {
        block = block.trim();
        if (!block) return;

        const partMatch = block.match(/\/\/\s*====== CUSTOM PART :: (.*?) ======/);
        if (partMatch) {
          currentPart = {
            id: 'part_' + Date.now() + Math.random(),
            name: partMatch[1].trim(),
            mediaUrl: '',
            sharedContext: '',
            questions: []
          };
          newCustomData.push(currentPart);

          const mediaMatch = block.match(/\/\/\s*@PartMedia:\s*(.*)/);
          if (mediaMatch) currentPart.mediaUrl = mediaMatch[1].trim();

          const contextMatch = block.match(/\[PART_CONTEXT\]([\s\S]*?)\[\/PART_CONTEXT\]/);
          if (contextMatch) currentPart.sharedContext = contextMatch[1].trim();

          block = block.replace(/\/\/\s*====== CUSTOM PART :: .*? ======/, '');
          block = block.replace(/\/\/\s*@PartMedia:.*?(\n|$)/, '');
          block = block.replace(/\[PART_CONTEXT\][\s\S]*?\[\/PART_CONTEXT\]/, '');
          if (block.trim() === '') return;
        }

        if (!currentPart) return;

        let qType = 'multiple_choice';
        const typeMatch = block.match(/\/\/\s*@QType:\s*(multiple_choice|matching|text_input)/);
        if (typeMatch) qType = typeMatch[1];

        let scoreEnabled = false; let score = 1;
        const scoreMatch = block.match(/\/\/\s*@Score:\s*([\d.]+)/);
        if (scoreMatch) { scoreEnabled = true; score = parseFloat(scoreMatch[1]); }

        let textPlaceholder = '';
        const placeMatch = block.match(/\/\/\s*@Placeholder:\s*(.*)/);
        if (placeMatch) textPlaceholder = placeMatch[1].trim();

        let sharedContext = '';
        const groupCtxMatch = block.match(/\[GROUP_CONTEXT\]([\s\S]*?)\[\/GROUP_CONTEXT\]/);
        if (groupCtxMatch) {
          sharedContext = groupCtxMatch[1].trim();
          currentGroupId = 'group_' + Date.now() + Math.random();
        }

        let cleanBlock = block.replace(/\/\/.*$/gm, '').replace(/::.*?::/, '').replace(/\[GROUP_CONTEXT\][\s\S]*?\[\/GROUP_CONTEXT\]/, '').trim();
        const optMatch = cleanBlock.match(/(.*?)\s*\{([^}]*)\}/s);
        if (!optMatch) return;

        const qText = optMatch[1].trim();
        const optionsBlock = optMatch[2];

        let exp = '';
        const expMatch = optionsBlock.match(/\[EXP\]([\s\S]*?)\[\/EXP\]/);
        if (expMatch) exp = expMatch[1].trim();
        const cleanOptionsBlock = optionsBlock.replace(/\[EXP\][\s\S]*?\[\/EXP\]/, '').trim();

        const optionLines = cleanOptionsBlock.split('\n').map(o => o.trim()).filter(o => o !== '');
        let options = ['', '', '', ''];
        let pairs: any[] = [];
        let correctAnswer = '';

        if (qType === 'multiple_choice') {
          let parsedOptions: string[] = [];
          optionLines.forEach(line => {
            if (line.startsWith('=')) { parsedOptions.push(line.substring(1).trim()); correctAnswer = String.fromCharCode(65 + parsedOptions.length - 1); }
            else if (line.startsWith('~')) { parsedOptions.push(line.substring(1).trim()); }
          });
          while (parsedOptions.length < 4) parsedOptions.push('');
          options = parsedOptions.slice(0, 4);
        } else if (qType === 'matching') {
          optionLines.forEach(line => {
            if (line.startsWith('=')) {
              const parts = line.substring(1).split('->');
              if (parts.length === 2) pairs.push({ left: parts[0].trim(), right: parts[1].trim() });
            }
          });
          if (pairs.length === 0) pairs = [{left:'', right:''}, {left:'', right:''}];
        } else if (qType === 'text_input') {
          const firstOpt = optionLines.find(l => l.startsWith('='));
          if (firstOpt) correctAnswer = firstOpt.substring(1).trim();
        }

        currentPart.questions.push({
          id: Date.now() + Math.random(),
          groupId: currentGroupId,
          type: qType,
          text: qText,
          content: '',
          sharedContext,
          options,
          pairs,
          correctAnswer,
          explanation: exp,
          scoreEnabled,
          score,
          textPlaceholder
        });
        importedCount++;
      });

      if (importedCount > 0) {
        examData.value = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: newCustomData };
        currentCustomPartId.value = newCustomData[0]?.id || null;
        openModal(`Nhập thành công ${newCustomData.length} phần thi và ${importedCount} câu hỏi từ file GIFT.`, 'alert');
      } else {
        openModal('Không tìm thấy dữ liệu hợp lệ.', 'alert');
      }
    }

    if (fileInputGift.value) fileInputGift.value.value = '';
  }; reader.readAsText(file);
};
</script>

<style scoped>
.builder-layout { display: flex; flex-direction: column; height: 100%; font-family: system-ui, -apple-system, sans-serif; background-color: #f1f5f9; }

.global-topbar { display: flex; justify-content: space-between; align-items: center; background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 0 24px; height: 56px; z-index: 20; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.topbar-left, .topbar-right { display: flex; align-items: center; }

.mode-switch { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; border: 1px solid #e2e8f0; }
.mode-btn { border: none; background: transparent; padding: 6px 16px; border-radius: 6px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
.mode-btn.active { background: white; color: #2563eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.mode-btn:hover:not(.active) { color: #0f172a; }

.actions { display: flex; gap: 8px; align-items: center; }
.btn-action { padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
.btn-import { background-color: #ffffff; color: #475569; border-color: #cbd5e1; }
.btn-import:hover { background-color: #f1f5f9; color: #0f172a; }
.btn-export { background-color: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
.btn-export:hover { background-color: #dbeafe; border-color: #3b82f6; }

/* Style cho nút Fullscreen */
.btn-fullscreen { background-color: #f1f5f9; color: #475569; border-color: #cbd5e1; }
.btn-fullscreen:hover { background-color: #e2e8f0; color: #0f172a; }

.btn-save { background-color: #10b981; color: white; border-color: #059669; margin-left: 12px; }
.btn-save:hover { background-color: #059669; }

.main-body { display: flex; flex: 1; overflow: hidden; width: 100%; }

.sidebar { width: 300px; flex-shrink: 0; background: #ffffff; color: #0f172a; display: flex; flex-direction: column; overflow-y: auto; border-right: 1px solid #e2e8f0; }
.sidebar-header { padding: 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 0; z-index: 10; }
.setting-row { display: flex; justify-content: space-between; align-items: center; }
.setting-label { color: #475569; font-weight: 600; font-size: 0.95rem; }
.mt-2 { margin-top: 8px; }

.toggle-switch { position: relative; display: inline-block; width: 42px; height: 22px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: 0.3s; border-radius: 22px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
input:checked + .slider { background-color: #3b82f6; }
input:checked + .slider:before { transform: translateX(20px); }

.time-input-group { display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid #cbd5e1; }
.time-input { background: transparent; border: none; color: #3b82f6; font-size: 1.25rem; width: 100%; outline: none; font-family: monospace; font-weight: bold; text-align: center; letter-spacing: 2px;}

.tree-view { padding: 12px; }
.part-group { margin-bottom: 4px; }
.part-header { display: flex; align-items: center; padding: 10px 14px; cursor: pointer; border-radius: 6px; color: #475569; font-weight: 600; transition: all 0.2s; position: relative; gap: 8px;}
.part-header:hover { background: #f1f5f9; color: #0f172a; }
.part-header.active { background: #10b981; color: white; }

.badge { background: rgba(0, 0, 0, 0.08); color: #475569; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; flex-shrink: 0; margin-left: auto;}
.part-header.active .badge { background: rgba(255, 255, 255, 0.25); color: white; }

.sub-questions { padding: 12px 16px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.sub-q-item { position: relative; aspect-ratio: 1 / 1; display: flex; justify-content: center; align-items: center; background: #ffffff; color: #475569; border-radius: 6px; font-size: 0.95rem; font-weight: 500; cursor: grab; border: 1px solid #cbd5e1; transition: all 0.2s; }
.sub-q-item:active { cursor: grabbing; } 
.sub-q-item:hover { background: #f8fafc; }
.sub-q-item.is-dragging { opacity: 0.4; border: 1px dashed #3b82f6; transform: scale(0.95); background: #eff6ff; color: #1e3a8a; }

.btn-del-mini { position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 12px; line-height: 16px; text-align: center; cursor: pointer; opacity: 0; transform: scale(0.8); transition: all 0.2s; z-index: 2;}
.sub-q-item:hover .btn-del-mini { opacity: 1; transform: scale(1); }
.btn-del-mini:hover { background: #dc2626; }
.add-box { background: transparent; border: 1px dashed #cbd5e1; color: #94a3b8; font-size: 1.2rem; cursor: pointer;}
.add-box:hover { background: #f1f5f9; color: #0f172a; }

.part-name-wrapper { display: flex; align-items: center; flex: 1; overflow: hidden;}
.part-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;}

.part-manage-dropdown { position: relative; display: flex; align-items: center; flex-shrink: 0; }
.btn-kebab { background: transparent; border: none; cursor: pointer; font-size: 1.2rem; font-weight: bold; color: inherit; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s; }
.btn-kebab:hover { background: rgba(0,0,0,0.05); color: #0f172a; }
.part-header.active .btn-kebab:hover { background: rgba(255,255,255,0.2); color: white; }

.dropdown-menu { position: absolute; right: 0; top: 100%; margin-top: 4px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border-radius: 6px; z-index: 9999; min-width: 130px; display: flex; flex-direction: column; overflow: hidden; }
.dropdown-item { background: transparent; border: none; padding: 10px 14px; text-align: left; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
.dropdown-item:hover { background: #f8fafc; color: #0f172a; }
.dropdown-item.text-danger { color: #ef4444; border-top: 1px solid #f1f5f9; }
.dropdown-item.text-danger:hover { background: #fef2f2; color: #dc2626; }

.btn-add-custom-part { width: calc(100% - 24px); padding: 10px; margin: 12px; background: transparent; border: 1px dashed #3b82f6; border-radius: 8px; color: #3b82f6; font-weight: 700; cursor: pointer; font-size: 0.9rem; text-align: center; }
.btn-add-custom-part:hover { background: #eff6ff; }

/* --- WORKSPACE CHUNG --- */
.workspace { flex: 1; padding: 32px; overflow-y: auto; scroll-behavior: smooth; }
.global-audio-bar { background: linear-gradient(to right, #eff6ff, #f8fafc); border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02); }
.global-audio-content { display: flex; align-items: center; justify-content: center; } 
.audio-controls { width: 100%; display: flex; justify-content: center; } 
.player-wrapper { position: relative; display: flex; align-items: center; background: transparent; padding: 0; border-radius: 50px; border: none; }
.custom-audio-player { height: 44px; width: 600px; outline: none; border-radius: 30px;} 
.audio-input-group { display: flex; align-items: center; gap: 12px; width: 100%; max-width: 600px; }
.global-audio-input { flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 0.95rem; }
.global-audio-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
.btn-apply { background: #3b82f6; border: none; color: white; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-remove-media { position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

.builder-zoom-wrapper { zoom: 0.8; max-width: 100%; transform-origin: top left; }
.custom-mode-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 350px; color: #64748b; background: white; border: 2px dashed #cbd5e1; border-radius: 12px; margin-top: 20px; }
.custom-mode-placeholder h2 { color: #0f172a; margin-bottom: 8px; }

/* MODALS */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.custom-modal { background: white; width: 420px; padding: 24px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
.modal-title { margin: 0; color: #0f172a; font-size: 1.15rem; font-weight: 700; }
.modal-message { margin: 12px 0 20px 0; color: #475569; font-size: 0.95rem; line-height: 1.5; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; color: #64748b; margin-bottom: 20px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
.btn-cancel { padding: 8px 16px; border: 1px solid #cbd5e1; background: white; color: #475569; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-confirm { padding: 8px 16px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.error-text { color: #ef4444; font-size: 0.8rem; margin: 4px 0 0 2px; font-weight: 600; }
.text-input { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }

/* 🔥 CSS CHO MODAL EXPORT */
.export-modal { width: 550px; max-width: 90vw; text-align: left; }
.export-textarea { height: 250px; font-family: monospace; font-size: 0.85rem; resize: none; background: #f8fafc; line-height: 1.4; color: #334155; }
.text-warning { color: #d97706; font-size: 0.85rem; background: #fef3c7; padding: 8px 12px; border-radius: 6px; margin-top: 12px; font-weight: 500;}
</style>