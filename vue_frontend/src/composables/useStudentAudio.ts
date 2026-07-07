import { ref, computed, watch, type Ref } from 'vue';

export function useStudentAudio(
  store: any,
  displayedExamSettings: Ref<any>,
  currentAudioUrl: Ref<string>,
  currentAudioKey: Ref<string>, 
  emit: (event: 'audio-violation' | 'return-landing') => void
) {
  const audioRef = ref<HTMLAudioElement | null>(null);
  const isAudioPlaying = ref(false);
  const audioCurrentTime = ref(0);
  const audioDuration = ref(0);
  const globalLastAudioTime = ref(0);


  const lockedAudioUrl = ref('');
  const lockedAudioKey = ref('');
  
  const isReadyToTrack = ref(false); 

  const toggleAudioPlay = () => {
    if (!audioRef.value || store.isKickedOut) return;
    if (isAudioPlaying.value) {
      audioRef.value.pause();
    } else {
      audioRef.value.play().catch(err => console.warn("Trình duyệt chặn autoplay tự phát:", err));
    }
  };

  const handleGlobalAudioTimeUpdate = (e: Event) => {
    if (!isReadyToTrack.value) return;
    const audio = e.target as HTMLAudioElement;
    
    if (!audio.seeking) {
      audioCurrentTime.value = audio.currentTime;
      globalLastAudioTime.value = audio.currentTime;
      
      const keyToSave = lockedAudioKey.value || 'global_media';
      store.saveAudioProgress(keyToSave, audio.currentTime);
    }
  };

  const handleGlobalAudioSeeking = (e: Event) => {
    if (!displayedExamSettings.value?.isAudioSeekEnabled) {
      const audio = e.target as HTMLAudioElement;
      const delta = Math.abs(audio.currentTime - globalLastAudioTime.value);
      if (delta > 1) {
        audio.currentTime = globalLastAudioTime.value; 
        emit('audio-violation'); 
      }
    }
  };

  const restoreGlobalAudioProgress = (e: Event) => {
    const audio = e.target as HTMLAudioElement;
    audioDuration.value = audio.duration || 0;
    
    const keyToLoad = lockedAudioKey.value || 'global_media';
    const savedProgress = store.getAudioProgress(keyToLoad);
    
    if (savedProgress > 0 && Math.abs(audio.currentTime - savedProgress) > 1) {
      globalLastAudioTime.value = savedProgress;
      audio.currentTime = savedProgress;
      audioCurrentTime.value = savedProgress;
    } else {
      globalLastAudioTime.value = 0;
      audioCurrentTime.value = 0;
    }
    
    isReadyToTrack.value = true; // ! Mở khóa lưu dữ liệu khi chuyển đến Part này
  };

  const audioProgressPercent = computed(() => {
    if (!audioDuration.value) return 0;
    return (audioCurrentTime.value / audioDuration.value) * 100;
  });

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleTimelineClick = (e: MouseEvent) => {
    if (!displayedExamSettings.value?.isAudioSeekEnabled || !audioRef.value || !audioDuration.value || store.isKickedOut) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const clickPercent = (e.clientX - rect.left) / rect.width;
    audioRef.value.currentTime = clickPercent * audioDuration.value;
  };

  watch(() => currentAudioKey.value, (newKey) => {
    isReadyToTrack.value = false; // ! Khóa lưu dữ liệu khi chuyển Part -> lưu trạng thái audio
    isAudioPlaying.value = false;
    audioCurrentTime.value = 0;
    audioDuration.value = 0;
    
    lockedAudioKey.value = newKey;
    lockedAudioUrl.value = currentAudioUrl.value;
  }, { immediate: true });

  return {
    audioRef,
    isAudioPlaying,
    audioCurrentTime,
    audioDuration,
    audioProgressPercent,
    toggleAudioPlay,
    handleGlobalAudioTimeUpdate,
    handleGlobalAudioSeeking,
    restoreGlobalAudioProgress,
    handleTimelineClick,
    formatAudioTime
  };
}