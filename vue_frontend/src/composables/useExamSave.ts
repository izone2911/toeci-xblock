import type { Ref } from 'vue';
import { useExamStore } from '../store/examStore';

export function useExamSave(
  examData: Ref<Record<string | number, any>>,
  examSettings: Ref<any>,
  builderMode: Ref<'traditional' | 'custom'>,
  openModal: (message: string, type: 'delete' | 'swap' | 'mode' | 'alert', action?: () => void) => void
) {
  const store = useExamStore();

  const saveDataToDB = async () => {
    let isValid = true;
    let errorMsg = '';

    const validateCommonQuestion = (q: any) => {
      if ((!q.type || q.type === 'multiple_choice') && !q.correctAnswer) {
        isValid = false;
        errorMsg = 'Có câu trắc nghiệm bị trống đáp án đúng.';
      }
      if (q.type === 'text_input' && !q.correctAnswer) {
        isValid = false;
        errorMsg = 'Có câu điền từ bị trống từ khóa chính xác.';
      }
      if (q.type === 'matching' && (!q.pairs || q.pairs.length === 0 || q.pairs.some((p: any) => !p.left || !p.right))) {
        isValid = false;
        errorMsg = 'Có câu ghép cặp chưa điền đủ các vế trái/phải.';
      }
      if (q.scoreEnabled && (typeof q.score !== 'number' || q.score < 0)) {
        isValid = false;
        errorMsg = 'Điểm số không được là số âm.';
      }
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
      openModal('Lưu đề thi vào hệ thống thành công', 'alert');
    } catch (error) {
      openModal('Lỗi', 'alert');
    }
  };

  return { saveDataToDB };
}