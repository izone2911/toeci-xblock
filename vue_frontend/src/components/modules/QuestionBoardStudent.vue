<template lang="pug">
.question-board-student

  .part-intro-box(v-if="partData?.sharedContext || partData?.mediaUrl")
    .part-context-global(v-if="partData.sharedContext" v-html="partData.sharedContext")
    
    .part-media-centered(v-if="partData.mediaUrl")
      .highlight-audio-container(v-if="isAudio(partData.mediaUrl)")
        audio(
          ref="localAudioRef"
          :src="partData.mediaUrl"
          style="display: none"
          @play="isLocalPlaying = true"
          @pause="isLocalPlaying = false"
          @timeupdate="handleLocalTimeUpdate"
          @loadedmetadata="restoreLocalAudioProgress"
        )
        // Giao diện Audio
        .custom-player-engine
          button.btn-audio-control(@click="toggleLocalPlay" type="button")
            span(v-if="isLocalPlaying") ⏸️
            span(v-else) ▶️
          span.audio-time-txt {{ formatAudioTime(localCurrentTime) }}
          
          .audio-timeline-track(
            :class="{ 'is-locked-fake': !store.examSettings?.isAudioSeekEnabled }"
            @click="handleLocalTimelineClick"
          )
            .audio-timeline-fill(:style="{ width: localProgressPercent + '%' }")
            .audio-timeline-bullet(v-if="store.examSettings?.isAudioSeekEnabled" :style="{ left: localProgressPercent + '%' }")
            
          span.audio-time-txt {{ formatAudioTime(localDuration) }}
      a.video-btn(:href="partData.mediaUrl" target="_blank" v-else) Xem 


  // audio global traditional
  .global-media-box(v-if="!partData?.mediaUrl && partData?.audioUrl")
    .highlight-audio-container
      audio(
        ref="localAudioRef"
        :src="partData.audioUrl"
        style="display: none"
        @play="isLocalPlaying = true"
        @pause="isLocalPlaying = false"
        @timeupdate="handleLocalTimeUpdate"
        @loadedmetadata="restoreLocalAudioProgress"
      )
      .custom-player-engine
        button.btn-audio-control(@click="toggleLocalPlay" type="button")
          span(v-if="isLocalPlaying") ⏸️
          span(v-else) ▶️
        span.audio-time-txt {{ formatAudioTime(localCurrentTime) }}
        
        .audio-timeline-track(
          :class="{ 'is-locked-fake': !store.examSettings?.isAudioSeekEnabled }"
          @click="handleLocalTimelineClick"
        )
          .audio-timeline-fill(:style="{ width: localProgressPercent + '%' }")
          .audio-timeline-bullet(v-if="store.examSettings?.isAudioSeekEnabled" :style="{ left: localProgressPercent + '%' }")
          
        span.audio-time-txt {{ formatAudioTime(localDuration) }}


    //render câu hỏi
  template(v-for="(group, gIdx) in groupedQuestions" :key="group.groupId || gIdx")
    
    // layout 1
    .question-group.split-group(v-if="group.passages && group.passages.length > 0")
      .split-layout
        .left-pane
          .passage-content(v-for="(pass, pIdx) in group.passages" :key="'p_'+pIdx")
            p.text-content(v-if="pass.type === 'text'" v-html="pass.content")
            img.image-content(v-else-if="pass.type === 'image'" :src="pass.url")
            
          // Chỉ hiển thị nội dung giải nghĩa khi bài đã nộp và được cấp quyền xem đáp án
          .transcript-zone(v-if="store.isSubmitted === true && store.examSettings?.isShowAnswerEnabled === true && group.transcripts && group.transcripts.length > 0")
            .transcript-header Transcript / Giải thích:
            .passage-content(v-for="(tr, trIdx) in group.transcripts" :key="'tr_'+trIdx")
              p.text-content(v-if="tr.type === 'text'" v-html="tr.content")
              img.image-content(v-else-if="tr.type === 'image'" :src="tr.url")
        
        .right-pane
          QuestionItemStudent(
            v-for="(q, index) in group.children" 
            :key="q.id"
            :question="q"
            :displayIndex="getQuestionIndex(gIdx, index)"
          )

    // layout 2
    .question-group.vertical-layout(
      v-else 
      :class="{ 'is-standalone-single': isStandaloneSingle(group) }"
    )
      .group-shared-context(v-if="group.image || group.content || group.sharedContext")
        img.shared-img(v-if="group.image" :src="group.image")
        p.shared-text(v-if="group.content" v-html="group.content")
        p.shared-text(v-if="group.sharedContext" v-html="group.sharedContext")

      .vertical-questions-list
        QuestionItemStudent(
          v-for="(q, index) in group.children" 
          :key="q.id"
          :question="q"
          :displayIndex="getQuestionIndex(gIdx, index)"
        )
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useExamStore } from '../../store/examStore';
import QuestionItemStudent from '../core/QuestionItemStudent.vue';

const props = defineProps<{ 
  partData: any,
  startNumber: number 
}>();

const emit = defineEmits(['audio-violation']);
const store = useExamStore();

const isAudio = (url: string) => /\.(mp3|wav|ogg|m4a)$/i.test(url);

const isLocalPlaying = ref(false);
const localCurrentTime = ref(0);
const localDuration = ref(0);
const localAudioRef = ref<HTMLAudioElement | null>(null);

const toggleLocalPlay = () => {
  if (!localAudioRef.value) return;
  if (isLocalPlaying.value) {
    localAudioRef.value.pause();
  } else {
    localAudioRef.value.play().catch(err => console.warn(err));
  }
};

const handleLocalTimeUpdate = (e: Event) => {
  const audio = e.target as HTMLAudioElement;
  if (!audio.seeking) {
    localCurrentTime.value = audio.currentTime;
    const url = props.partData?.mediaUrl || props.partData?.audioUrl || '';
    if (url) store.saveAudioProgress(url, audio.currentTime);
  }
};

const restoreLocalAudioProgress = (e: Event) => {
  const audio = e.target as HTMLAudioElement;
  localDuration.value = audio.duration || 0;
  const url = props.partData?.mediaUrl || props.partData?.audioUrl || '';
  if (url) {
    const savedProgress = store.getAudioProgress(url);
    if (savedProgress > 0 && Math.abs(audio.currentTime - savedProgress) > 1) {
      audio.currentTime = savedProgress;
      localCurrentTime.value = savedProgress;
    }
  }
};

const localProgressPercent = computed(() => {
  if (!localDuration.value) return 0;
  return (localCurrentTime.value / localDuration.value) * 100;
});

const formatAudioTime = (seconds: number) => {
  if (isNaN(seconds) || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const handleLocalTimelineClick = (e: MouseEvent) => {
  if (!store.examSettings?.isAudioSeekEnabled || !localAudioRef.value || !localDuration.value) return;
  const container = e.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  const clickPercent = (e.clientX - rect.left) / rect.width;
  localAudioRef.value.currentTime = clickPercent * localDuration.value;
};



const groupedQuestions = computed(() => {
  const groups: any[] = [];
  let currentGroup: any = null;
  const partId = props.partData?.id || '';
  
  let fixedChunkSize = 0; 
  if (['part_1', 'part_2', 'part_5'].includes(partId)) fixedChunkSize = 1;
  else if (['part_3', 'part_4'].includes(partId)) fixedChunkSize = 3;
  else if (partId === 'part_6') fixedChunkSize = 4;

  (props.partData?.questions || []).forEach((q: any) => {
    let validPassages = [];
    if (q.passages && Array.isArray(q.passages)) {
      validPassages = q.passages.filter((p: any) => p.content?.trim() || p.url);
    }
    if (q.passageText && q.passageText.trim()) {
      validPassages.push({ type: 'text', content: q.passageText });
    }

    const hasContext = !!(q.sharedContext?.trim()) || 
                       validPassages.length > 0 || 
                       !!q.image || !!q.imageUrl || 
                       (!!q.content?.trim() && !q.questionText);

    let shouldCreateNewGroup = false;

    if (!currentGroup) {
      shouldCreateNewGroup = true;
    } else if (q.groupId && q.groupId !== currentGroup.groupId) {
      shouldCreateNewGroup = true;
    } else if (fixedChunkSize > 0 && currentGroup.children.length >= fixedChunkSize) {
      shouldCreateNewGroup = true;
    } else if (fixedChunkSize === 0 && hasContext && currentGroup.children.length > 0) {
      shouldCreateNewGroup = true;
    }

    if (shouldCreateNewGroup) {
      // Đảm bảo không render nội dung transcripts khi câu hỏi chưa được nộp
      let initialTranscripts: any[] = [];
      if (store.isSubmitted) {
         initialTranscripts = q.transcripts || [];
         if (q.transcript) initialTranscripts.push({ type: 'text', content: q.transcript });
      }

      currentGroup = {
        groupId: q.groupId || `temp_${Math.random()}`,
        image: q.image || q.imageUrl || '',
        content: q.content || '',
        sharedContext: q.sharedContext || '',
        passages: validPassages,
        transcripts: initialTranscripts,
        children: [q]
      };
      groups.push(currentGroup);
    } else {
      currentGroup.children.push(q);
      if (!currentGroup.image && (q.image || q.imageUrl)) currentGroup.image = q.image || q.imageUrl;
      if (!currentGroup.content && (q.content?.trim() && !q.questionText)) currentGroup.content = q.content;
      
      // Đảm bảo không render nội dung transcripts khi câu hỏi chưa được nộp
      if (store.isSubmitted && q.transcript) {
          currentGroup.transcripts.push({ type: 'text', content: q.transcript });
      }
    }
  });
  
  return groups;
});

const isStandaloneSingle = (group: any) => {
  const hasContext = !!group.image || !!group.content || !!group.sharedContext || (group.passages && group.passages.length > 0);
  return !hasContext && group.children.length === 1;
};

const getQuestionIndex = (groupIndex: number, childIndex: number) => {
  let count = 0;
  for (let i = 0; i < groupIndex; i++) {
    count += groupedQuestions.value[i].children.length;
  }
  return props.startNumber + count + childIndex;
};
</script>

<style scoped>
.question-board-student { display: flex; flex-direction: column; padding-bottom: 40px; }

.part-intro-box { background: #1e293b; color: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); margin-bottom: 40px; text-align: center; }
.part-context-global { margin: 0 0 16px 0; font-size: 1.25rem; font-weight: 700; word-break: break-word; overflow-wrap: break-word; text-align: left; }
.part-media-centered { display: flex; justify-content: center; align-items: center; width: 100%; margin-top: 10px; }
.video-btn { display: inline-block; background: #ef4444; color: white; padding: 10px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 0.95rem; transition: background 0.2s;}
.video-btn:hover { background: #dc2626; }

.global-media-box { display: flex; justify-content: center; margin-bottom: 40px; width: 100%; }
.highlight-audio-container { width: 100%; display: flex; justify-content: center; }

.custom-player-engine { 
  display: flex; align-items: center; gap: 16px; background: #ffffff; 
  padding: 0 20px; border-radius: 50px; border: none; 
  box-shadow: 0 4px 10px rgba(0,0,0,0.15); width: 100%; max-width: 600px; height: 48px;
}
.btn-audio-control { background: transparent; border: none; font-size: 1.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; width: 32px; height: 32px;}
.audio-time-txt { font-size: 0.85rem; color: #475569; font-family: monospace; font-weight: 700; user-select: none; flex-shrink: 0;}

.audio-timeline-track { 
  flex: 1; height: 6px; background: #e2e8f0; border-radius: 10px; 
  position: relative; cursor: pointer; transition: height 0.2s;
}
.audio-timeline-track:hover:not(.is-locked-fake) { height: 8px; }
.audio-timeline-fill { height: 100%; background: #3b82f6; border-radius: 10px; width: 0%; }
.audio-timeline-bullet { 
  position: absolute; top: 50%; width: 12px; height: 12px; 
  background: #2563eb; border-radius: 50%; transform: translate(-50%, -50%); 
  box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: none;
}

.audio-timeline-track.is-locked-fake { cursor: default; pointer-events: none; }
.audio-timeline-track.is-locked-fake .audio-timeline-fill { background: #94a3b8; }

.question-group { margin-bottom: 40px; }
.split-layout { display: flex; gap: 0; background: white; border: 1px solid #cbd5e1; border-radius: 12px; height: calc(100vh - 180px); min-height: 600px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.left-pane { flex: 1.1; padding: 32px; overflow-y: auto; background: #ffffff; border-right: 1px solid #cbd5e1; font-size: 1.05rem; line-height: 1.8; color: #0f172a; font-family: 'Times New Roman', Times, serif; }
.right-pane { flex: 0.9; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: #f8fafc; scroll-behavior: smooth; }
.left-pane::-webkit-scrollbar, .right-pane::-webkit-scrollbar { width: 6px; }
.left-pane::-webkit-scrollbar-thumb, .right-pane::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.passage-content { margin-bottom: 24px; }
.text-content { margin: 0 0 16px 0; word-wrap: break-word; text-align: justify; }
.image-content { max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; display: block; margin: 16px auto; }
.vertical-layout { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #cbd5e1; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.vertical-layout.is-standalone-single { background: transparent; padding: 0; border: none; box-shadow: none; }
.group-shared-context { margin-bottom: 24px; text-align: center; }
.shared-img { max-width: 100%; max-height: 350px; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1; display: block; margin: 0 auto 16px auto; }
.shared-text { font-size: 1.05rem; color: #1e293b; background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: left; line-height: 1.6; }
.vertical-questions-list { display: flex; flex-direction: column; }
.transcript-zone { margin-top: 20px; padding-top: 16px; border-top: 1px dashed #e2e8f0; background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 0 8px 8px 0; font-family: system-ui, -apple-system, sans-serif;}
.transcript-header { font-weight: 700; color: #166534; margin-bottom: 12px; font-size: 0.95rem; }
</style>