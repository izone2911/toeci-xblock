<template lang="pug">
.builder-layout(ref="builderLayoutRef")
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

  .main-body
    aside.sidebar
      SettingPanel(v-model="examSettings")
      
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
              title="Kéo để hoán đổi vị trí"
            )
              span {{ getGlobalNumber(part, index) }}
              button.btn-del-mini(@click.stop="deleteQuestion(part, index)" title="Xóa câu hỏi") ×
            
            .sub-q-item.add-box(@click="addNewQuestionFromSidebar(part)" title="Thêm câu hỏi")
              span +
              
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
              title="Kéo để hoán đổi vị trí"
            )
              span {{ getCustomGlobalNumber(pCustom.id, index) }}
              button.btn-del-mini(@click.stop="deleteQuestion(pCustom.id, index)" title="Xóa câu hỏi") x
            
            .sub-q-item.add-box(@click="addNewQuestionFromSidebar(pCustom.id)" title="Thêm câu hỏi")
              span +

        button.btn-add-custom-part(@click="openPartNameModal(null)") Thêm phần thi

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
                  placeholder="Đường dẫn tệp âm thanh..."
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

  .modal-overlay(v-if="confirmModal.isOpen" @click.self="closeModal")
    .custom-modal
      h3.modal-title Thông báo
      p.modal-message(v-html="confirmModal.message")
      
      label.checkbox-label(v-if="confirmModal.type !== 'mode' && confirmModal.type !== 'alert'")
        input(type="checkbox" v-model="confirmModal.dontShowAgain")
        span Không hiển thị lại thông báo này
      
      .modal-actions
        button.btn-cancel(v-if="confirmModal.type !== 'alert'" @click="closeModal") Hủy
        button.btn-confirm(:class="{ 'btn-danger': confirmModal.type === 'mode' || confirmModal.type === 'delete' }" @click="executePendingAction") {{ confirmModal.type === 'alert' ? 'Đóng' : 'Xác nhận' }}

  .modal-overlay(v-if="partNameModal.isOpen" @click.self="closePartNameModal")
    .custom-modal
      h3.modal-title {{ partNameModal.editingId ? 'Đổi tên phần thi' : 'Thêm phần thi' }}
      .input-wrapper.mt-3
        input.text-input(v-model="partNameModal.inputName" placeholder="Nhập tên phần thi..." @keyup.enter="savePartName" @input="partNameModal.error = ''")
        p.error-text(v-if="partNameModal.error") {{ partNameModal.error }}
      .modal-actions.mt-4
        button.btn-cancel(@click="closePartNameModal") Hủy
        button.btn-confirm(@click="savePartName") Lưu

  .modal-overlay(v-if="exportModal.isOpen" @click.self="closeExportModal")
    .custom-modal.export-modal
      h3.modal-title Tệp tin đã sẵn sàng
      .instruction-box
        p <b>CLICK CHUỘT PHẢI</b> và chọn <b>"Save link as..."</b> để tải dữ liệu.
      
      .download-action-area
        a.btn-download-massive(
          :href="exportModal.dataUri" 
          :download="exportModal.filename"
          title="Click Chuột Phải -> Save link as..."
        ) Tải Xuống
      
      .input-wrapper.mt-3
        textarea.text-input.export-textarea(readonly v-model="exportModal.content" @focus="$event.target.select()")
      .modal-actions.mt-4
        button.btn-cancel(@click="closeExportModal") Đóng
        button.btn-confirm(@click="copyExportData") {{ copyButtonText }}

  input(type="file" ref="fileInputJson" style="display: none" accept=".json" @change="processJSONFile")
  input(type="file" ref="fileInputGift" style="display: none" accept=".txt" @change="processGIFTFile")
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useExamStore } from '../../store/examStore';

// Modules Giao Diện
import HeaderControl from '../../components/layout/HeaderControl.vue';
import SettingPanel from '../../components/modules/SettingPanel.vue';
import QuestionBoard from '../../components/modules/QuestionBoard.vue';
import CustomModeEditor from './CustomModeEditor.vue';

// Composables Tách Lớp Nghiệp Vụ
import { useExamImportExport } from '../../composables/useExamImportExport';
import { useExamQuestions } from '../../composables/useExamQuestions';
import { useExamSave } from '../../composables/useExamSave';

const store = useExamStore();

// Khởi tạo trạng thái ban đầu
const builderMode = ref<'traditional' | 'custom'>('traditional');
const examSettings = ref({ globalListeningAudio: '', isTimeLimitEnabled: false, isShowAnswerEnabled: true, isAudioSeekEnabled: false, timeLimitSeconds: 7200 });
const examData = ref<Record<string | number, any>>({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [] });

const currentPart = ref(1);
const currentCustomPartId = ref<string | null>(null);
const tempGlobalAudioUrl = ref('');

const sessionConfig = ref({ skipDeleteConfirm: false, skipSwapConfirm: false });
const builderLayoutRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

const currentCustomPart = computed({
  get() { return examData.value?.custom?.find((p: any) => p.id === currentCustomPartId.value) || null; },
  set(newValue) {
    if (!examData.value?.custom || !newValue) return;
    const index = examData.value.custom.findIndex((p: any) => p.id === currentCustomPartId.value);
    if (index !== -1) examData.value.custom[index] = newValue;
  }
});

// Trạng thái cục bộ điều khiển giao diện (Dropdown & Modal)
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
  openModal(`Xác nhận xóa phần thi <b>"${targetPart.name}"</b> và toàn bộ câu hỏi bên trong?`, 'mode', () => {
    if (currentCustomPartId.value === targetPart.id) currentCustomPartId.value = null;
    examData.value.custom.splice(index, 1);
  });
};

// Liên kết các Composables
const {
  fileInputJson, fileInputGift, exportModal, copyButtonText, closeExportModal, 
  copyExportData, exportDataJSON, triggerImportJSON, processJSONFile, 
  exportDataGIFT, triggerImportGIFT, processGIFTFile
} = useExamImportExport(examData, examSettings, builderMode, currentCustomPartId, tempGlobalAudioUrl, openModal);

const {
  dragSidebarSource, getGlobalNumber, getCustomGlobalNumber, onDragStartSidebar, 
  onDropSidebar, addNewQuestionFromSidebar, deleteQuestion, handlePartEditorDelete, handlePartEditorSwap
} = useExamQuestions(examData, currentCustomPartId, openModal);

const { saveDataToDB } = useExamSave(examData, examSettings, builderMode, openModal);

// Đồng bộ trạng thái Pinia
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

// Xử lý sự kiện ngoại tuyến
const handleOffline = () => { openModal('Mất kết nối mạng', 'alert'); };
const handleOnline = () => { openModal('Đã kết nối mạng trở lại', 'alert'); saveDataToDB(); };

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

const currentPartStartNumber = computed(() => { let count = 0; for (let p = 1; p < currentPart.value; p++) { count += (examData.value?.[p]?.length || 0); } return count + 1; });
const currentCustomPartStartNumber = computed(() => {
  if (!currentCustomPartId.value) return 1;
  let count = 0;
  for (const p of (examData.value?.custom || [])) {
    if (p.id === currentCustomPartId.value) return count + 1;
    count += (p.questions?.length || 0);
  }
  return 1;
});

const selectQuestionFromSidebar = (part: string | number, qId: string) => { 
  if (typeof part === 'number') { currentPart.value = part; } else { currentCustomPartId.value = part; }
  nextTick(() => { const el = document.getElementById(`question-${qId}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); 
};
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
.export-modal { width: 450px; max-width: 90vw; text-align: center; }
.instruction-box { background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: left; }
.instruction-box p { margin: 0 0 8px 0; font-size: 0.9rem; color: #92400e; line-height: 1.5; }
.instruction-box p:last-child { margin-bottom: 0; font-weight: bold; }
.download-action-area { margin: 20px 0 10px 0; display: flex; justify-content: center; }
.btn-download-massive { display: inline-flex; align-items: center; justify-content: center; padding: 12px 24px; background: #10b981; color: white; border-radius: 8px; font-weight: 800; font-size: 1.05rem; text-decoration: none; transition: all 0.3s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); width: 100%; box-sizing: border-box;}
.btn-download-massive:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.4); }
.btn-download-massive:active { transform: translateY(0); }
.export-textarea { height: 150px; font-family: monospace; font-size: 0.85rem; resize: none; background: #f8fafc; line-height: 1.4; color: #334155; box-sizing: border-box; width: 100%; }
</style>