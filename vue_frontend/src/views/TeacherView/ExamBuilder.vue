<template lang="pug">
.builder-layout(ref="builderLayoutRef")
  // ==========================================
  // THANH CÔNG CỤ TOÀN CỤC (TOPBAR)
  // ==========================================
  HeaderControl(
    :builderMode="builderMode"
    :isFullscreen="isFullscreen"
    @switch-mode="handleModeSwitch"
    @import-json-trigger="triggerImportJSON"
    @import-gift-trigger="triggerImportGIFT"
    @export-json="exportDataJSON"
    @export-gift="exportDataGIFT"
    @toggle-fullscreen="toggleFullscreen"
    @save-data="saveDataToDB"
  )

  // ==========================================
  // KHU VỰC SOẠN ĐỀ THI
  // ==========================================
  .main-body
    // CỘT TRÁI: CẤU TRÚC ĐỀ THI
    aside.sidebar
      // CẤU HÌNH THỜI GIAN/ĐÁP ÁN VÀ AUDIO
      SettingPanel(v-model="examSettings")
      
      // DIỆN MẠO 1: SIDEBAR TRUYỀN THỐNG (7 PARTS)
      .tree-view(v-if="builderMode === 'traditional'")
        .part-group(v-for="part in 7" :key="part")
          .part-header(:class="{ active: currentPart === part }" @click="currentPart = part")
            span.part-name Part {{ part }}
            span.badge {{ examData[part]?.length || 0 }}
            
          .sub-questions
            .sub-q-item(
              v-for="(q, index) in (examData[part] || [])" 
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
        .part-group(v-for="(pCustom, pIdx) in (examData.custom || [])" :key="pCustom.id")
          .part-header(:class="{ active: currentCustomPartId === pCustom.id }" @click="currentCustomPartId = pCustom.id")
            .part-name-wrapper
              span.part-name {{ pCustom.name }}
            
            span.badge {{ pCustom.questions?.length || 0 }}

            .part-manage-dropdown
              button.btn-kebab(@click.stop="toggleDropdown(pCustom.id)") ⋮
              .dropdown-menu(v-if="activeDropdown === pCustom.id")
                button.dropdown-item(@click.stop="handleEditPart(pCustom)") Đổi tên
                button.dropdown-item.text-danger(@click.stop="handleDeletePart(pIdx)") Xóa phần thi
            
          .sub-questions
            .sub-q-item(
              v-for="(q, index) in (pCustom.questions || [])" 
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
                  placeholder="Url audio bài nghe..."
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
              @request-delete="handlePartEditorDelete"
              @request-swap="handlePartEditorSwap"
            )

      template(v-else)
        .editor-area(v-if="currentCustomPart")
          .builder-zoom-wrapper
            CustomModeEditor(
              v-model="currentCustomPart"
              :sessionConfig="sessionConfig"
              :startNumber="currentCustomPartStartNumber"
              @request-delete="handlePartEditorDelete"
              @request-swap="handlePartEditorSwap"
            )
        .custom-mode-placeholder(v-else)
          h2 Chọn hoặc tạo phần thi mới
          p Chọn phần thi từ danh sách bên trái hoặc chọn "Thêm phần thi" để bắt đầu.

  // MODALS TẬP TRUNG
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

  //- 🔥 MODAL XUẤT DỮ LIỆU BYPASS SANDBOX (CHUỘT PHẢI)
  .modal-overlay(v-if="exportModal.isOpen" @click.self="closeExportModal")
    .custom-modal.export-modal
      h3.modal-title 🎉 Tệp tin đã sẵn sàng!
      .instruction-box
        p Do chính sách bảo mật Sandbox của Open edX, tính năng tự động tải bị vô hiệu hóa.
        p 👉 Hãy <b>CLICK CHUỘT PHẢI</b> vào nút bên dưới và chọn <b>"Save link as..." (Lưu liên kết thành...)</b> để tải file về máy.
      
      .download-action-area
        a.btn-download-massive(
          :href="exportModal.dataUri" 
          :download="exportModal.filename"
          title="Click Chuột Phải -> Save link as..."
        ) 📥 CHUỘT PHẢI -> SAVE LINK AS...
      
      .input-wrapper.mt-3
        textarea.text-input.export-textarea(readonly v-model="exportModal.content" @focus="$event.target.select()")
      .modal-actions.mt-4
        button.btn-cancel(@click="closeExportModal") Đóng
        button.btn-confirm(@click="copyExportData") {{ copyButtonText }}

  // THẺ INPUT ẨN NHẬN FILE (Được gọi qua Ref)
  input(type="file" ref="fileInputJson" style="display: none" accept=".json" @change="processJSONFile")
  input(type="file" ref="fileInputGift" style="display: none" accept=".txt" @change="processGIFTFile")
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useExamStore } from '../../store/examStore';

import HeaderControl from '../../components/layout/HeaderControl.vue';
import SettingPanel from '../../components/modules/SettingPanel.vue';
import QuestionBoard from '../../components/modules/QuestionBoard.vue';
import CustomModeEditor from './editors/CustomModeEditor.vue';

import { generateExportJSON, parseImportJSON, generateExportGIFT, parseImportGIFT } from '../../utils/data_parser';

const store = useExamStore();

const builderMode = ref<'traditional' | 'custom'>('traditional');
const examSettings = ref({ globalListeningAudio: '', isTimeLimitEnabled: false, isShowAnswerEnabled: true, isAudioSeekEnabled: false, timeLimitSeconds: 7200 });
const examData = ref<Record<string | number, any>>({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [] });

const currentPart = ref(1);
const currentCustomPartId = ref<string | null>(null);
const tempGlobalAudioUrl = ref('');

const fileInputJson = ref<HTMLInputElement | null>(null);
const fileInputGift = ref<HTMLInputElement | null>(null);

const sessionConfig = ref({ skipDeleteConfirm: false, skipSwapConfirm: false });
const builderLayoutRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

const currentCustomPart = computed({
  get() {
    return examData.value?.custom?.find((p: any) => p.id === currentCustomPartId.value) || null;
  },
  set(newValue) {
    if (!examData.value?.custom || !newValue) return;
    const index = examData.value.custom.findIndex((p: any) => p.id === currentCustomPartId.value);
    if (index !== -1) {
      examData.value.custom[index] = newValue;
    }
  }
});

// Dropdown & Modals
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

const handleEditPart = (pCustom: any) => { activeDropdown.value = null; openPartNameModal(pCustom); };
const handleDeletePart = (pIdx: number) => { activeDropdown.value = null; deleteCustomPart(pIdx); };
const openPartNameModal = (partObj: any | null) => { partNameModal.value = { isOpen: true, inputName: partObj ? partObj.name : '', error: '', editingId: partObj ? partObj.id : null }; };
const closePartNameModal = () => { partNameModal.value.isOpen = false; };

const savePartName = () => {
  const nameTrimmed = partNameModal.value.inputName.trim();
  if (!nameTrimmed) { partNameModal.value.error = 'Vui lòng nhập tên phần thi.'; return; }
  const isDuplicate = examData.value?.custom?.some((p: any) => p.name.toLowerCase() === nameTrimmed.toLowerCase() && p.id !== partNameModal.value.editingId);
  if (isDuplicate) { partNameModal.value.error = 'Tên phần thi đã tồn tại.'; return; }

  if (!examData.value.custom) examData.value.custom = [];

  if (partNameModal.value.editingId) {
    const target = examData.value.custom.find((p: any) => p.id === partNameModal.value.editingId);
    if (target) target.name = nameTrimmed;
  } else {
    const newId = `part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    examData.value.custom.push({ id: newId, name: nameTrimmed, mediaUrl: '', sharedContext: '', questions: [] });
    currentCustomPartId.value = newId; 
  }
  closePartNameModal();
};

const deleteCustomPart = (index: number) => {
  const targetPart = examData.value?.custom?.[index];
  if(!targetPart) return;
  openModal(`Xác nhận xóa phần thi <b>"${targetPart.name}"</b> và toàn bộ câu hỏi trực thuộc?`, 'mode', () => {
    if (currentCustomPartId.value === targetPart.id) currentCustomPartId.value = null;
    examData.value.custom.splice(index, 1);
  });
};

watch(() => store.isLoading, (isLoading) => {
  if (!isLoading) { 
    builderMode.value = store.builderMode || 'traditional';
    
    examSettings.value = {
      globalListeningAudio: store.examSettings.globalListeningAudio || '',
      isTimeLimitEnabled: !!store.examSettings.isTimeLimitEnabled,
      isShowAnswerEnabled: store.examSettings.isShowAnswerEnabled !== undefined ? !!store.examSettings.isShowAnswerEnabled : true,
      isAudioSeekEnabled: !!store.examSettings.isAudioSeekEnabled,
      timeLimitSeconds: Number(store.examSettings.timeLimitSeconds) || 7200
    };

    examData.value = JSON.parse(JSON.stringify(store.examDataRaw || { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [] }));

    if (builderMode.value === 'custom' && examData.value?.custom?.length > 0 && !currentCustomPartId.value) {
      currentCustomPartId.value = examData.value.custom[0].id;
    }
  }
}, { immediate: true });

const handleOffline = () => { openModal('Mất kết nối mạng. Đừng lo, toàn bộ tiến trình của bạn đang được tự động lưu an toàn trên máy ảo.', 'alert'); };
const handleOnline = () => { openModal('Đã kết nối mạng trở lại. Hệ thống đang tự động đồng bộ dữ liệu lên máy chủ...', 'alert'); saveDataToDB(); };

onMounted(() => { 
  document.addEventListener('click', closeDropdown); 
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
});

onUnmounted(() => { 
  document.removeEventListener('click', closeDropdown); 
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('online', handleOnline);
});

const handleModeSwitch = (mode: 'traditional' | 'custom') => {
  if (builderMode.value === mode) return;
  const hasData = Object.values(examData.value || {}).some((arr: any) => arr && arr.length > 0) || examSettings.value?.globalListeningAudio !== '';
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
  let isValid = true;
  let errorMsg = '';
  
  const validateCommonQuestion = (q: any) => {
    if ((!q.type || q.type === 'multiple_choice') && !q.correctAnswer) { isValid = false; errorMsg = 'Có câu trắc nghiệm bị trống đáp án đúng.'; }
    if (q.type === 'text_input' && !q.correctAnswer) { isValid = false; errorMsg = 'Có câu điền từ bị trống từ khóa chính xác.'; }
    if (q.type === 'matching' && (!q.pairs || q.pairs.length === 0 || q.pairs.some((p: any) => !p.left || !p.right))) { isValid = false; errorMsg = 'Có câu ghép cặp chưa điền đủ các vế trái/phải.'; }
    if (q.scoreEnabled && (typeof q.score !== 'number' || q.score < 0)) { isValid = false; errorMsg = 'Điểm số không được là số âm.'; }
  };

  if (builderMode.value === 'traditional') {
    for (let p = 1; p <= 7; p++) {
      for (const q of (examData.value[p] || [])) {
        validateCommonQuestion(q);
      }
    }
  } else {
    for (const part of (examData.value.custom || [])) {
      for (const q of (part.questions || [])) {
        validateCommonQuestion(q);
      }
    }
  }

  if (!isValid) {
    openModal(`<b>Không thể lưu đề thi:</b><br>${errorMsg}<br><br>Vui lòng điền đủ các trường bắt buộc (Chìa khóa đáp án, Ghép cặp, Điểm số >= 0) trước khi thực hiện Lưu đề thi.`, 'alert');
    return;
  }

  try {
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

    await store.saveToEdx(payload);
    openModal('Lưu đề thi vào hệ thống thành công.', 'alert');
  } catch (error) {
    openModal('Lỗi kết nối. Không thể lưu dữ liệu trực tiếp, bản lưu nháp nội bộ vẫn an toàn.', 'alert');
  }
};

// ==========================================
// 5. CÁC HÀM XỬ LÝ KÉO THẢ, FULLSCREEN, XUẤT NHẬP DỮ LIỆU... 
// ==========================================

const toggleFullscreen = () => {
  const appContainer = document.querySelector('.builder-layout');
  const edxModal = appContainer?.closest('.modal-window') as HTMLElement | null;
  if (!edxModal) return;

  if (!isFullscreen.value) {
    edxModal.dataset.originalStyle = edxModal.getAttribute('style') || '';
    Object.assign(edxModal.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh',
      margin: '0', borderRadius: '0', zIndex: '200000', display: 'flex', flexDirection: 'column'
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
    if (modalContent) { modalContent.style.height = ''; modalContent.style.maxHeight = ''; }
    isFullscreen.value = false;
  }
};

const applyGlobalAudioUrl = () => { if (tempGlobalAudioUrl.value.trim() !== '') { examSettings.value.globalListeningAudio = tempGlobalAudioUrl.value.trim(); tempGlobalAudioUrl.value = ''; } };

const editorMap: Record<number, any> = { 1: QuestionBoard, 2: QuestionBoard, 3: QuestionBoard, 4: QuestionBoard, 5: QuestionBoard, 6: QuestionBoard, 7: QuestionBoard };
const currentEditorComponent = computed(() => editorMap[currentPart.value]);

const getGlobalNumber = (targetPart: number, localIndex: number) => { let count = 0; for (let p = 1; p < targetPart; p++) { count += (examData.value?.[p]?.length || 0); } return count + localIndex + 1; };
const currentPartStartNumber = computed(() => { let count = 0; for (let p = 1; p < currentPart.value; p++) { count += (examData.value?.[p]?.length || 0); } return count + 1; });

const getCustomGlobalNumber = (targetPartId: string, localIndex: number) => {
  let count = 0;
  for (const p of (examData.value?.custom || [])) {
    if (p.id === targetPartId) return count + localIndex + 1;
    count += (p.questions?.length || 0);
  }
  return count + localIndex + 1;
};
const currentCustomPartStartNumber = computed(() => {
  if (!currentCustomPartId.value) return 1;
  let count = 0;
  for (const p of (examData.value?.custom || [])) {
    if (p.id === currentCustomPartId.value) return count + 1;
    count += (p.questions?.length || 0);
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

    const isCustom = typeof sourcePart === 'string';
    const isContentSwap = isCustom || (typeof sourcePart === 'number' && sourcePart >= 6);
    const actionText = isContentSwap ? 'nội dung' : 'vị trí';

    openModal(`Xác nhận hoán đổi ${actionText} câu ${labelSource} và câu ${labelTarget}?`, 'swap', () => {
      let list: any[];
      if (isCustom) {
        const targetPartObj = examData.value?.custom?.find((p: any) => p.id === sourcePart);
        if (!targetPartObj) return;
        list = targetPartObj.questions;
      } else {
        list = examData.value[sourcePart as number];
      }

      if (isContentSwap) {
        const item1 = list[sourceIndex];
        const item2 = list[targetIndex];
        
        const sourceId = item1.id;
        const sourceGroupId = item1.groupId;
        const targetId = item2.id;
        const targetGroupId = item2.groupId;

        const temp = { ...item1 };
        Object.assign(item1, item2);
        item1.id = sourceId; item1.groupId = sourceGroupId;

        Object.assign(item2, temp);
        item2.id = targetId; item2.groupId = targetGroupId;
      } else {
        const temp = list[sourceIndex]; 
        list[sourceIndex] = list[targetIndex]; 
        list[targetIndex] = temp;
      }

      if (!isCustom) rebalanceContextsUniversal(list, sourcePart);
    });
  } 
  dragSidebarSource.value = null; 
};

const addNewQuestionFromSidebar = (part: string | number) => { 
  if (typeof part === 'number') {
    const initialOptions = part === 2 ? ['', '', ''] : ['', '', '', '']; 
    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let groupId = '';
    
    if ([3, 4, 6, 7].includes(part)) {
      const list = examData.value[part];
      groupId = list && list.length > 0 
        ? String(list[list.length - 1].groupId) 
        : `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    const newQ: any = { id: newId, type: 'multiple_choice', text: '', content: '', options: initialOptions, correctAnswer: 'A', explanation: '' };
    if (groupId) newQ.groupId = groupId;
    examData.value[part].push(newQ); 
  } else {
    const targetPartObj = examData.value?.custom?.find((p: any) => p.id === part);
    if (!targetPartObj) return;

    const lastGroupId = targetPartObj.questions?.length > 0 
      ? String(targetPartObj.questions[targetPartObj.questions.length - 1].groupId) 
      : `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newQ = { 
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, 
      groupId: lastGroupId, type: 'multiple_choice', text: '', content: '', sharedContext: '', 
      options: ['', ''], pairs: [], correctAnswer: 'A', explanation: '', 
      scoreEnabled: false, score: 1, textPlaceholder: ''
    };
    targetPartObj.questions.push(newQ);
  }
};

const selectQuestionFromSidebar = (part: string | number, qId: string) => { 
  if (typeof part === 'number') { currentPart.value = part; } else { currentCustomPartId.value = part; }
  nextTick(() => { const el = document.getElementById(`question-${qId}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); 
};

const deleteQuestion = (part: string | number, index: number) => { 
  const label = typeof part === 'number' ? getGlobalNumber(part, index) : getCustomGlobalNumber(part as string, index);
  openModal(`Xác nhận xóa câu hỏi số ${label}?`, 'delete', () => { 
    if (typeof part === 'number') {
      examData.value[part].splice(index, 1);
      rebalanceContextsUniversal(examData.value[part], part);
    } else {
      const targetPartObj = examData.value?.custom?.find((p: any) => p.id === part);
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

// ==========================================
// 🔥 ĐÃ FIX: SỬ DỤNG BLOB URL + CLICK CHUỘT PHẢI
// ==========================================
const exportModal = ref({ isOpen: false, content: '', filename: '', dataUri: '' });
const copyButtonText = ref('📋 Sao chép');
const closeExportModal = () => { 
  exportModal.value.isOpen = false; 
  copyButtonText.value = '📋 Sao chép'; 
  if (exportModal.value.dataUri) {
    URL.revokeObjectURL(exportModal.value.dataUri);
  }
};

const copyExportData = () => {
  const content = exportModal.value.content;
  const showSuccess = () => { copyButtonText.value = '✔️ Đã sao chép thành công!'; setTimeout(() => { copyButtonText.value = '📋 Sao chép'; }, 3000); };
  const showError = () => { copyButtonText.value = '❌ Bị chặn! Hãy bôi đen thủ công'; setTimeout(() => { copyButtonText.value = '📋 Sao chép'; }, 3000); };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea"); textArea.value = text; textArea.style.position = "fixed"; textArea.style.top = "-9999px"; textArea.style.left = "-9999px";
    document.body.appendChild(textArea); textArea.focus(); textArea.select();
    try { const successful = document.execCommand('copy'); if (successful) showSuccess(); else showError(); } catch (err) { showError(); }
    document.body.removeChild(textArea);
  };

  if (!navigator.clipboard || !navigator.clipboard.writeText) { fallbackCopyTextToClipboard(content); return; }
  navigator.clipboard.writeText(content).then(() => { showSuccess(); }).catch(() => { fallbackCopyTextToClipboard(content); });
};

// Sử dụng Blob giúp vượt rào URL length, click chuột phải "Save link as" sẽ thả thẳng file nguyên vẹn
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const utf8BOM = "\uFEFF"; 
  const finalContent = utf8BOM + content;

  const blob = new Blob([finalContent], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);

  exportModal.value = { 
    isOpen: true, 
    content: content,
    filename: filename,
    dataUri: blobUrl
  };
};

const exportDataJSON = () => {
  const dataStr = generateExportJSON(examData.value, examSettings.value, builderMode.value);
  downloadFile(dataStr, `exam_${builderMode.value}_data.json`, 'application/json');
};

const triggerImportJSON = () => { fileInputJson.value?.click(); };

const processJSONFile = (event: Event) => {
  const inputEl = event.target as HTMLInputElement;
  const file = inputEl.files?.[0]; if (!file) return;

  if (!file.name.toLowerCase().endsWith('.json')) {
    openModal('Tệp tin không đúng định dạng. Hệ thống chế độ JSON chỉ chấp nhận tệp có đuôi mở rộng <span style="color:#ef4444;font-weight:bold;">.json</span>.', 'alert');
    inputEl.value = '';
    return;
  }

  const doImport = () => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseImportJSON(e.target?.result as string);
      if (result.success && result.data) {
        examData.value = result.data;
        if (result.settings) examSettings.value = { ...examSettings.value, ...result.settings };
        if (result.mode) builderMode.value = result.mode as 'traditional' | 'custom';
        tempGlobalAudioUrl.value = '';
        if (builderMode.value === 'custom' && examData.value.custom?.length > 0) { currentCustomPartId.value = examData.value.custom[0].id; }
        openModal('Nhập dữ liệu JSON thành công.', 'alert');
      } else {
        openModal(result.error || 'Lỗi định dạng file JSON.', 'alert');
      }
    }; 
    reader.readAsText(file);
  };

  const hasData = Object.values(examData.value || {}).some((arr: any) => arr && arr.length > 0) || examSettings.value?.globalListeningAudio !== '';
  if (hasData) {
    openModal(`Việc nhập dữ liệu mới sẽ ghi đè toàn bộ nội dung hiện tại. Xác nhận tiếp tục?`, 'mode', doImport);
  } else {
    doImport();
  }
  inputEl.value = '';
};

const exportDataGIFT = () => {
  const giftText = generateExportGIFT(examData.value, examSettings.value, builderMode.value);
  if (!giftText.trim()) { openModal('Không có dữ liệu để xuất.', 'alert'); return; }
  downloadFile(giftText, 'exam_questions.txt', 'text/plain;charset=utf-8');
};

const triggerImportGIFT = () => { fileInputGift.value?.click(); };
const processGIFTFile = (event: Event) => {
  const inputEl = event.target as HTMLInputElement;
  const file = inputEl.files?.[0]; if (!file) return;

  if (!file.name.toLowerCase().endsWith('.txt')) {
    openModal('Tệp tin không đúng định dạng. Hệ thống phân tích GIFT chỉ chấp nhận tệp văn bản chuẩn cấu trúc có đuôi mở rộng <span style="color:#ef4444;font-weight:bold;">.txt</span>.', 'alert');
    inputEl.value = '';
    return;
  }

  const doImport = () => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseImportGIFT(e.target?.result as string);
      if (result.success && result.data) {
        examData.value = result.data;
        if (result.settings) examSettings.value = { ...examSettings.value, ...result.settings };
        if (result.mode) builderMode.value = result.mode as 'traditional' | 'custom';
        tempGlobalAudioUrl.value = '';
        if (builderMode.value === 'custom' && examData.value.custom?.length > 0) { currentCustomPartId.value = examData.value.custom[0].id; }
        openModal(`Nhập thành công dữ liệu từ file GIFT.`, 'alert');
      } else {
        openModal(result.error || 'Không tìm thấy dữ liệu hợp lệ.', 'alert');
      }
    }; 
    reader.readAsText(file);
  };

  const hasData = Object.values(examData.value || {}).some((arr: any) => arr && arr.length > 0) || examSettings.value?.globalListeningAudio !== '';
  if (hasData) {
    openModal(`Việc nhập dữ liệu mới sẽ ghi đè toàn bộ nội dung hiện tại. Xác nhận tiếp tục?`, 'mode', doImport);
  } else {
    doImport();
  }
  inputEl.value = '';
};

const rebalanceContextsUniversal = (partData: any[], partNumber: number | string) => {
  if (partNumber === 'custom') return; 
  if ([1, 2, 5].includes(partNumber as number)) return;

  if (partNumber === 3 || partNumber === 4) {
    for (let i = 0; i < partData.length; i += 3) {
      let foundImage = ''; let foundContent = '';
      for (let j = 0; j < 3; j++) {
        if (partData[i + j]) {
          if (!foundImage && partData[i + j].image) foundImage = partData[i + j].image;
          if (!foundContent && partData[i + j].content) foundContent = partData[i + j].content;
          partData[i + j].image = ''; partData[i + j].content = '';
        }
      }
      if (partData[i]) { partData[i].image = foundImage; partData[i].content = foundContent; }
    }
    return;
  }

  if (partNumber === 6) {
    for (let i = 0; i < partData.length; i += 4) {
      let foundContent = ''; let foundImage = '';
      for (let j = 0; j < 4; j++) {
        if (partData[i + j]) {
          if (!foundContent && partData[i + j].content) foundContent = partData[i + j].content;
          if (!foundImage && partData[i + j].image) foundImage = partData[i + j].image;
          partData[i + j].content = ''; partData[i + j].image = '';
        }
      }
      if (partData[i]) { partData[i].content = foundContent; partData[i].image = foundImage; }
    }
    return;
  }

  if (partNumber === 7) {
    const passageMap = new Map();
    const transcriptMap = new Map();
    partData.forEach(q => {
      if (q.passages && q.passages.length > 0) {
        if (!passageMap.has(q.groupId)) passageMap.set(q.groupId, JSON.parse(JSON.stringify(q.passages)));
      }
      delete q.passages; 
      if (q.transcripts && q.transcripts.length > 0) {
        if (!transcriptMap.has(q.groupId)) transcriptMap.set(q.groupId, JSON.parse(JSON.stringify(q.transcripts)));
      }
      delete q.transcripts; 
    });
    partData.forEach((q, index) => {
      const isLeader = index === 0 || partData[index - 1].groupId !== q.groupId;
      if (isLeader) {
        q.passages = passageMap.get(q.groupId) || [{ type: 'text', content: '' }];
        q.transcripts = transcriptMap.get(q.groupId) || [{ type: 'text', content: '' }];
      }
    });
  }
};

const handlePartEditorDelete = (payload: { index: number, message: string, partNumber: number | string }) => {
  openModal(payload.message, 'delete', () => {
    let list;
    if (payload.partNumber === 'custom') {
      const customPart = examData.value?.custom?.find((p: any) => p.id === currentCustomPartId.value);
      if (!customPart) return;
      list = customPart.questions;
    } else {
      list = examData.value[currentPart.value];
    }
    
    list.splice(payload.index, 1);
    
    if (payload.partNumber !== 'custom') {
      rebalanceContextsUniversal(list, payload.partNumber as number);
    }
  });
};

const handlePartEditorSwap = (payload: { sourceIndex: number, targetIndex: number, message: string, partNumber: number | string }) => {
  openModal(payload.message, 'swap', () => {
    let list;
    if (payload.partNumber === 'custom') {
      const customPart = examData.value?.custom?.find((p: any) => p.id === currentCustomPartId.value);
      if (!customPart) return;
      list = customPart.questions;
    } else {
      list = examData.value[currentPart.value]; 
    }

    if (payload.partNumber === 'custom' || (typeof payload.partNumber === 'number' && payload.partNumber >= 6)) {
      const item1 = list[payload.sourceIndex];
      const item2 = list[payload.targetIndex];

      const newItem1 = { ...item2, id: item1.id, groupId: item1.groupId };
      const newItem2 = { ...item1, id: item2.id, groupId: item2.groupId };

      list.splice(payload.sourceIndex, 1, newItem1);
      list.splice(payload.targetIndex, 1, newItem2);
    } else {
      const temp = list[payload.sourceIndex]; 
      list[payload.sourceIndex] = list[payload.targetIndex]; 
      list[payload.targetIndex] = temp;
    }

    if (payload.partNumber !== 'custom') {
      rebalanceContextsUniversal(list, payload.partNumber as number);
    }
  });
};

const timeLimitFormatted = computed({
  get() {
    const totalSeconds = Number(examSettings.value.timeLimitSeconds) || 0; 
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  },
  set(val: string) {
    if (!val) return; 
    const parts = val.split(':');
    let hrs = parseInt(parts[0] || '0', 10); 
    let mins = parts.length >= 2 ? parseInt(parts[1] || '0', 10) : 0; 
    let secs = parts.length === 3 ? parseInt(parts[2] || '0', 10) : 0;
    
    if (isNaN(hrs) || hrs < 0) hrs = 0; 
    if (isNaN(mins) || mins < 0) mins = 0; 
    if (isNaN(secs) || secs < 0) secs = 0;
    
    examSettings.value.timeLimitSeconds = (hrs * 3600) + (mins * 60) + secs;
  }
});
</script>

<style scoped>
.builder-layout { display: flex; flex-direction: column; height: 100%; font-family: system-ui, -apple-system, sans-serif; background-color: #f1f5f9; }
.main-body { display: flex; flex: 1; overflow: hidden; width: 100%; }
.sidebar { width: 300px; flex-shrink: 0; background: #ffffff; color: #0f172a; display: flex; flex-direction: column; overflow-y: auto; border-right: 1px solid #e2e8f0; }
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
.dropdown-menu { position: absolute; right: 0; top: 100%; margin-top: 4px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 6px; z-index: 9999; min-width: 130px; display: flex; flex-direction: column; overflow: hidden; }
.dropdown-item { background: transparent; border: none; padding: 10px 14px; text-align: left; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
.dropdown-item:hover { background: #f8fafc; color: #0f172a; }
.dropdown-item.text-danger { color: #ef4444; border-top: 1px solid #f1f5f9; }
.dropdown-item.text-danger:hover { background: #fef2f2; color: #dc2626; }
.btn-add-custom-part { width: calc(100% - 24px); padding: 10px; margin: 12px; background: transparent; border: 1px dashed #3b82f6; border-radius: 8px; color: #3b82f6; font-weight: 700; cursor: pointer; font-size: 0.9rem; text-align: center; }
.btn-add-custom-part:hover { background: #eff6ff; }
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
.text-input { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; box-sizing: border-box; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }

/* CSS MỚI CHO MODAL EXPORT CÓ NÚT TẢI XUỐNG VẬT LÝ */
.export-modal { width: 450px; max-width: 90vw; text-align: center; }

/* Thêm css cho bảng hướng dẫn */
.instruction-box { background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: left; }
.instruction-box p { margin: 0 0 8px 0; font-size: 0.9rem; color: #92400e; line-height: 1.5; }
.instruction-box p:last-child { margin-bottom: 0; font-weight: bold; }

.download-action-area { margin: 20px 0 10px 0; display: flex; justify-content: center; }
.btn-download-massive { display: inline-flex; align-items: center; justify-content: center; padding: 12px 24px; background: #10b981; color: white; border-radius: 8px; font-weight: 800; font-size: 1.05rem; text-decoration: none; transition: all 0.3s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); width: 100%; box-sizing: border-box;}
.btn-download-massive:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.4); }
.btn-download-massive:active { transform: translateY(0); }
.export-textarea { height: 150px; font-family: monospace; font-size: 0.85rem; resize: none; background: #f8fafc; line-height: 1.4; color: #334155; box-sizing: border-box; width: 100%; }
</style>