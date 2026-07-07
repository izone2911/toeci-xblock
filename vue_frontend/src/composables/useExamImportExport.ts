import { ref, type Ref } from 'vue';
import { generateExportJSON, parseImportJSON, generateExportGIFT, parseImportGIFT } from '../utils/data_parser';

export function useExamImportExport(
  examData: Ref<Record<string | number, any>>,
  examSettings: Ref<any>,
  builderMode: Ref<'traditional' | 'custom'>,
  currentCustomPartId: Ref<string | null>,
  tempGlobalAudioUrl: Ref<string>,
  openModal: (message: string, type: 'delete' | 'swap' | 'mode' | 'alert', action?: () => void) => void
) {
  // Tham chiếu DOM ẩn xử lý sự kiện chọn tệp tin
  const fileInputJson = ref<HTMLInputElement | null>(null);
  const fileInputGift = ref<HTMLInputElement | null>(null);

  // Quản lý trạng thái hộp thoại xuất dữ liệu
  const exportModal = ref({ isOpen: false, content: '', filename: '', dataUri: '' });
  const copyButtonText = ref('Sao chép');

  const closeExportModal = () => {
    exportModal.value.isOpen = false;
    copyButtonText.value = 'Sao chép';
    if (exportModal.value.dataUri) {
      URL.revokeObjectURL(exportModal.value.dataUri);
    }
  };

  const copyExportData = () => {
    const content = exportModal.value.content;
    const showSuccess = () => { 
      copyButtonText.value = 'Đã sao chép thành công'; 
      setTimeout(() => { copyButtonText.value = 'Sao chép'; }, 3000); 
    };
    const showError = () => { 
      copyButtonText.value = 'Trình duyệt chặn, sao chép thủ công'; 
      setTimeout(() => { copyButtonText.value = 'Sao chép'; }, 3000); 
    };

    const fallbackCopyTextToClipboard = (text: string) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "-9999px";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) showSuccess(); else showError();
      } catch (err) {
        showError();
      }
      document.body.removeChild(textArea);
    };

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      fallbackCopyTextToClipboard(content);
      return;
    }
    navigator.clipboard.writeText(content).then(showSuccess).catch(() => fallbackCopyTextToClipboard(content));
  };

  // Edx không cho phép dùng JS để tải ???
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

  // JSON
  const exportDataJSON = () => {
    const dataStr = generateExportJSON(examData.value, examSettings.value, builderMode.value);
    downloadFile(dataStr, `exam_${builderMode.value}_data.json`, 'application/json');
  };

  const triggerImportJSON = () => {
    fileInputJson.value?.click();
  };

  const processJSONFile = (event: Event) => {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      openModal('Hệ thống chỉ tiếp nhận tệp định dạng .json', 'alert');
      inputEl.value = '';
      return;
    }

    const executeImport = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = parseImportJSON(e.target?.result as string);
        if (result.success && result.data) {
          examData.value = result.data;
          if (result.settings) examSettings.value = { ...examSettings.value, ...result.settings };
          if (result.mode) builderMode.value = result.mode as 'traditional' | 'custom';
          
          tempGlobalAudioUrl.value = '';
          if (builderMode.value === 'custom' && examData.value.custom?.length > 0) {
            currentCustomPartId.value = examData.value.custom[0].id;
          }
          openModal('Đồng bộ cấu trúc JSON thành công', 'alert');
        } else {
          openModal(result.error || 'Dữ liệu JSON không đúng chuẩn hệ thống', 'alert');
        }
      };
      reader.readAsText(file);
    };

    const isDataExisting = Object.values(examData.value || {}).some((arr: any) => arr && arr.length > 0) || examSettings.value?.globalListeningAudio !== '';
    if (isDataExisting) {
      openModal(`Thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại. Xác nhận tiếp tục?`, 'mode', executeImport);
    } else {
      executeImport();
    }
    inputEl.value = '';
  };

  // GIFT
  const exportDataGIFT = () => {
    const giftText = generateExportGIFT(examData.value, examSettings.value, builderMode.value);
    if (!giftText.trim()) {
      openModal('Dữ liệu trống, yêu cầu khởi tạo câu hỏi trước khi xuất', 'alert');
      return;
    }
    downloadFile(giftText, 'exam_questions.txt', 'text/plain;charset=utf-8');
  };

  const triggerImportGIFT = () => {
    fileInputGift.value?.click();
  };

  const processGIFTFile = (event: Event) => {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.txt')) {
      openModal('Hệ thống phân tích GIFT chỉ tiếp nhận tệp định dạng văn bản .txt', 'alert');
      inputEl.value = '';
      return;
    }

    const executeImport = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = parseImportGIFT(e.target?.result as string);
        if (result.success && result.data) {
          examData.value = result.data;
          if (result.settings) examSettings.value = { ...examSettings.value, ...result.settings };
          if (result.mode) builderMode.value = result.mode as 'traditional' | 'custom';
          
          tempGlobalAudioUrl.value = '';
          if (builderMode.value === 'custom' && examData.value.custom?.length > 0) {
            currentCustomPartId.value = examData.value.custom[0].id;
          }
          openModal(`Đồng bộ dữ liệu định dạng GIFT thành công`, 'alert');
        } else {
          openModal(result.error || 'Dữ liệu không khớp chuẩn cú pháp GIFT', 'alert');
        }
      };
      reader.readAsText(file);
    };

    const isDataExisting = Object.values(examData.value || {}).some((arr: any) => arr && arr.length > 0) || examSettings.value?.globalListeningAudio !== '';
    if (isDataExisting) {
      openModal(`Thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại. Xác nhận tiếp tục?`, 'mode', executeImport);
    } else {
      executeImport();
    }
    inputEl.value = '';
  };

  return {
    fileInputJson,
    fileInputGift,
    exportModal,
    copyButtonText,
    closeExportModal,
    copyExportData,
    exportDataJSON,
    triggerImportJSON,
    processJSONFile,
    exportDataGIFT,
    triggerImportGIFT,
    processGIFTFile
  };
}