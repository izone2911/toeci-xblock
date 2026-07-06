// vue_frontend/src/utils/data_parser.ts

/**
 * ============================================================================
 * 1. BỘ CHUẨN HÓA DỮ LIỆU CÂU HỎI (QUESTION NORMALIZER)
 * ============================================================================
 */
const normalizeQuestionObject = (q: any, partNumber: number | string) => {
  let finalId = String(q.id || '');
  if (!finalId || !finalId.startsWith('q_')) {
    finalId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  const base: any = {
    id: finalId,
    type: q.type || 'multiple_choice',
    text: q.text || '',
    content: q.content || '',
    explanation: q.explanation || '',
    image: q.image || '',
    correctAnswer: q.correctAnswer || '',
    scoreEnabled: !!q.scoreEnabled,
    score: typeof q.score === 'number' ? Math.max(0, q.score) : 1,
    waitingTime: typeof q.waitingTime === 'number' ? q.waitingTime : 0,
    textPlaceholder: q.textPlaceholder || ''
  };

  if (([3, 4, 6, 7, 'custom'] as any[]).includes(partNumber)) {
    let finalGroupId = String(q.groupId || '');
    if (!finalGroupId || !finalGroupId.startsWith('group_')) {
      finalGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    base.groupId = finalGroupId;
  }

  if (base.type === 'multiple_choice') {
    let defaultOpts = ['', '', '', ''];
    if (partNumber === 2) defaultOpts = ['', '', ''];
    if (partNumber === 'custom') defaultOpts = ['', ''];
    base.options = Array.isArray(q.options) && q.options.length > 0 ? q.options : defaultOpts;
    base.pairs = [];
  } else if (base.type === 'matching') {
    base.options = [];
    base.pairs = Array.isArray(q.pairs) && q.pairs.length > 0 ? q.pairs : [{ left: '', right: '' }, { left: '', right: '' }];
  } else {
    base.options = [];
    base.pairs = [];
  }

  if (partNumber === 7 || partNumber === 'custom') {
    base.passages = Array.isArray(q.passages) && q.passages.length > 0 ? q.passages : [{ type: 'text', content: '' }];
    base.transcripts = Array.isArray(q.transcripts) && q.transcripts.length > 0 ? q.transcripts : [{ type: 'text', content: '' }];
  }

  return base;
};

/**
 * ============================================================================
 * 2. CHUYỂN ĐỔI KIẾN TRÚC MẢNG LỒNG NHAU (QUESTION_GROUP -> CHILDREN)
 * ============================================================================
 */
const buildNestedGroups = (flatArray: any[]) => {
  const groups: any[] = [];
  let currentGroup: any = null;
  
  flatArray.forEach(q => {
    if (!currentGroup || currentGroup.groupId !== q.groupId) {
      currentGroup = {
        groupId: q.groupId,
        type: 'QuestionGroup', 
        image: q.image || '',
        content: q.content || '',
        sharedContext: q.sharedContext || '',
        passages: q.passages && q.passages.length ? q.passages : [],
        transcripts: q.transcripts && q.transcripts.length ? q.transcripts : [],
        children: [] 
      };
      groups.push(currentGroup);
    }
    const childQ = { ...q };
    delete childQ.passages; delete childQ.transcripts; delete childQ.sharedContext;
    currentGroup.children.push(childQ);
  });
  return groups;
};

const flattenGroups = (nestedArray: any[], p: number | string) => {
  const flat: any[] = [];
  nestedArray.forEach(group => {
    if (group.children && Array.isArray(group.children)) {
      group.children.forEach((q: any) => {
        q.groupId = group.groupId;
        if (group.image) q.image = group.image;
        if (group.content) q.content = group.content;
        if (group.sharedContext) q.sharedContext = group.sharedContext;
        if (group.passages) q.passages = group.passages;
        if (group.transcripts) q.transcripts = group.transcripts;
        flat.push(normalizeQuestionObject(q, p));
      });
    } else {
      flat.push(normalizeQuestionObject(group, p)); 
    }
  });
  return flat;
};

export const generateExportJSON = (examData: any, examSettings: any, builderMode: string): string => {
  const payloadData: Record<string | number, any> = {};
  
  if (builderMode === 'traditional') {
    let globalIdx = 1;
    for (let p = 1; p <= 7; p++) {
      const flatList = examData[p] && examData[p].length > 0 ? JSON.parse(JSON.stringify(examData[p])) : [];
      flatList.forEach((q: any) => { q.globalIndex = globalIdx++; });
      payloadData[p] = buildNestedGroups(flatList);
    }
  } else {
    if (examData.custom && examData.custom.length > 0) {
      payloadData.custom = JSON.parse(JSON.stringify(examData.custom));
      let customGlobalIdx = 1;
      payloadData.custom.forEach((part: any) => {
        if (part.questions) {
          part.questions.forEach((q: any) => { q.globalIndex = customGlobalIdx++; });
          part.children = buildNestedGroups(part.questions);
          delete part.questions; 
        }
      });
    } else {
      payloadData.custom = [];
    }
  }

  const payload = { version: '3.0_latex_matched', exportedAt: new Date().toISOString(), builderMode, examSettings, examData: payloadData };
  return JSON.stringify(payload, null, 2);
};

export const parseImportJSON = (jsonString: string): { success: boolean; data?: any; settings?: any; mode?: string; error?: string } => {
  try {
    const data = JSON.parse(jsonString);
    const mode = data.builderMode || 'traditional';
    const settings = data.examSettings || {};
    const freshData: Record<string | number, any> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [] };

    if (data.examData) {
      if (mode === 'custom' && data.examData.custom) {
        freshData.custom = data.examData.custom.map((part: any) => {
          let finalPartId = String(part.id || '');
          if (!finalPartId || !finalPartId.startsWith('part_')) {
            finalPartId = `part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          }
          let questionsFlat = part.children ? flattenGroups(part.children, 'custom') : (part.questions ? flattenGroups(part.questions, 'custom') : []);
          return {
            id: finalPartId,
            name: part.name || 'Phần thi tùy chỉnh',
            mediaUrl: part.mediaUrl || '',
            sharedContext: part.sharedContext || '',
            questions: questionsFlat
          };
        });
      } else {
        for (let p = 1; p <= 7; p++) {
          if (Array.isArray(data.examData[p])) {
            freshData[p] = flattenGroups(data.examData[p], p);
          }
        }
      }
    }
    return { success: true, data: freshData, settings, mode };
  } catch (err) {
    return { success: false, error: 'Định dạng tệp tin JSON không hợp lệ.' };
  }
};

/**
 * ============================================================================
 * 3. XUẤT NHẬP ĐỊNH DẠNG GIFT MỞ RỘNG (EXTENDED GIFT)
 * ============================================================================
 */
export const generateExportGIFT = (examData: any, examSettings: any, builderMode: string): string => {
  let giftText = `// ====== SETTINGS ======\n// @Mode: ${builderMode}\n// @TimeLimitEnabled: ${examSettings.isTimeLimitEnabled}\n// @TimeLimit: ${examSettings.timeLimitSeconds}\n// @ShowAnswer: ${examSettings.isShowAnswerEnabled}\n// @AudioSeek: ${examSettings.isAudioSeekEnabled}\n`;
  if (examSettings.globalListeningAudio) { giftText += `// @GlobalAudio: ${examSettings.globalListeningAudio}\n`; }
  giftText += `\n`;

  let globalIdx = 1;

  if (builderMode === 'traditional') {
    for (let p = 1; p <= 7; p++) {
      giftText += `// ====== PART ${p} ======\n\n`;
      
      if (examData[p] && examData[p].length > 0) {
        let lastGroupId: string | null = null;

        examData[p].forEach((q: any, index: number) => {
          const isLeader = index === 0 || q.groupId !== lastGroupId;
          const isLast = index === examData[p].length - 1 || examData[p][index + 1].groupId !== q.groupId;

          if (isLeader) {
            lastGroupId = q.groupId;
            if ([3, 4, 6, 7].includes(p)) giftText += `::Passage-Start::\n`;
          }

          const title = `::Part ${p} - Câu ${globalIdx++}::\n`;
          let contextText = '';
          
          if (p === 1 || p === 2) { 
            if (q.image) contextText += `[img: ${q.image}]\n`; 
          } else if (p === 3 || p === 4) { 
            if (isLeader) { 
              if (q.image) contextText += `[img: ${q.image}]\n`; 
              if (q.content) contextText += `[transcript: ${q.content}]\n`; 
            } 
          } else if (p === 6) { 
            if (isLeader) { 
              if (q.content) contextText += `[text: ${q.content}]\n`; 
              if (q.image) contextText += `[transcript: ${q.image}]\n`; 
            } 
          } else if (p === 7) {
            if (isLeader) {
              if (q.passages) { q.passages.forEach((pass: any) => { if (pass.type === 'text') contextText += `[text: ${pass.content}]\n`; if (pass.type === 'image') contextText += `[img: ${pass.url}]\n`; }); }
              if (q.transcripts) { q.transcripts.forEach((tr: any) => { if (tr.type === 'text') contextText += `[transcript: ${tr.content}]\n`; if (tr.type === 'image') contextText += `[img: ${tr.url}]\n`; }); }
            }
          }
          
          let qText = ''; if (p === 5) qText = q.content || ''; else if (p !== 6) qText = q.text || ''; 
          let optionsText = '';
          if (q.options && q.options.length > 0) { 
            q.options.forEach((opt: string, oIdx: number) => { 
              const label = String.fromCharCode(65 + oIdx); 
              if (label === q.correctAnswer) optionsText += `=${opt}\n`; else optionsText += `~${opt}\n`; 
            }); 
          }
          
          let exp = ''; if (p === 5 || p === 7) exp = q.explanation || ''; else if (p === 6) exp = q.text || ''; 
          if (exp) optionsText += `[exp: ${exp}]\n`;
          
          giftText += `${title}${contextText}${qText} {\n${optionsText}}\n`;

          if (isLast && [3, 4, 6, 7].includes(p)) {
            giftText += `::Passage-End::\n\n`;
          } else {
            giftText += `\n`;
          }
        });
      }
    }
  } else {
    examData.custom.forEach((part: any) => {
      giftText += `// ====== CUSTOM PART :: ${part.name} ======\n`;
      if (part.mediaUrl) giftText += `// @PartMedia: ${part.mediaUrl}\n`;
      if (part.sharedContext) giftText += `[context: ${part.sharedContext}]\n`;
      giftText += `\n`;

      let lastGroupId: string | null = null;

      part.questions.forEach((q: any, index: number) => {
        const isLeader = index === 0 || q.groupId !== lastGroupId;
        const isLast = index === part.questions.length - 1 || part.questions[index + 1].groupId !== q.groupId;

        if (isLeader) {
          lastGroupId = q.groupId;
          giftText += `::Passage-Start::\n`;
        }

        const title = `::Câu ${globalIdx++}::\n`;
        let metaText = `// @QType: ${q.type}\n`;
        if (q.scoreEnabled) metaText += `// @Score: ${q.score}\n`;
        if (q.textPlaceholder) metaText += `// @Placeholder: ${q.textPlaceholder}\n`;

        let contextText = '';
        if (isLeader) {
          if (q.sharedContext) contextText += `[context: ${q.sharedContext}]\n`;
          if (q.passages) { q.passages.forEach((pass: any) => { if (pass.type === 'text') contextText += `[text: ${pass.content}]\n`; if (pass.type === 'image') contextText += `[img: ${pass.url}]\n`; }); }
          // 🔥 ĐÃ FIX: Hỗ trợ xuất Transcript của Custom Mode ra file GIFT
          if (q.transcripts) { q.transcripts.forEach((tr: any) => { if (tr.type === 'text') contextText += `[transcript: ${tr.content}]\n`; if (tr.type === 'image') contextText += `[img: ${tr.url}]\n`; }); }
        }

        let qText = q.text || '';
        let optionsText = '';

        if (q.type === 'multiple_choice') {
          if (q.options && q.options.length > 0) {
            q.options.forEach((opt: string, oIdx: number) => {
              const label = String.fromCharCode(65 + oIdx);
              if (label === q.correctAnswer) optionsText += `=${opt}\n`; else optionsText += `~${opt}\n`;
            });
          }
        } else if (q.type === 'matching') {
          if (q.pairs && q.pairs.length > 0) { q.pairs.forEach((pair: any) => { optionsText += `=${pair.left} -> ${pair.right}\n`; }); }
        } else if (q.type === 'text_input') {
          if (q.correctAnswer) optionsText += `=${q.correctAnswer}\n`;
        }

        let exp = q.explanation || '';
        if (exp) optionsText += `[exp: ${exp}]\n`;

        giftText += `${title}${metaText}${contextText}${qText} {\n${optionsText}}\n`;

        if (isLast) {
          giftText += `::Passage-End::\n\n`;
        } else {
          giftText += `\n`;
        }
      });
    });
  }

  return giftText;
};

export const parseImportGIFT = (content: string): { success: boolean; data?: any; settings?: any; mode?: string; error?: string } => {
  try {
    const modeMatch = content.match(/\/\/\s*@Mode:\s*(traditional|custom)/); 
    const importMode = modeMatch ? modeMatch[1] : 'traditional';
    
    const examSettings: any = { isTimeLimitEnabled: false, timeLimitSeconds: 7200, isShowAnswerEnabled: true, isAudioSeekEnabled: false, globalListeningAudio: '' };

    const timeEnabledMatch = content.match(/\/\/\s*@TimeLimitEnabled:\s*(true|false)/); 
    if (timeEnabledMatch) examSettings.isTimeLimitEnabled = timeEnabledMatch[1] === 'true';

    const timeMatch = content.match(/\/\/\s*@TimeLimit:\s*(\d+)/); if (timeMatch) examSettings.timeLimitSeconds = parseInt(timeMatch[1], 10);
    const answerMatch = content.match(/\/\/\s*@ShowAnswer:\s*(true|false)/); if (answerMatch) examSettings.isShowAnswerEnabled = answerMatch[1] === 'true';
    
    const seekMatch = content.match(/\/\/\s*@AudioSeek:\s*(true|false)/); 
    if (seekMatch) examSettings.isAudioSeekEnabled = seekMatch[1] === 'true';
    
    const audioMatch = content.match(/\/\/\s*@GlobalAudio:\s*(.+)/); 
    examSettings.globalListeningAudio = audioMatch ? audioMatch[1].trim() : '';

    const freshData: Record<string | number, any> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], custom: [] };

    if (importMode === 'traditional') {
      const questionBlocks = content.split(/\n\s*\n/);
      let currentGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      questionBlocks.forEach(block => {
        if (block.startsWith('//') || block.trim() === '') return;
        
        if (block.includes('::Passage-Start::')) {
          currentGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }

        const titleMatch = block.match(/::Part (\d+).*?::/); if (!titleMatch) return; 
        const p = parseInt(titleMatch[1], 10);
        
        let blockWithoutTitle = block.replace('::Passage-Start::', '').replace('::Passage-End::', '').replace(/::.*?::/, '').trim();
        if (!blockWithoutTitle) return;

        const passages: any[] = []; const transcripts: any[] = []; 
        let imagePart1234 = ''; let contentPart346 = '';

        const tagRegex = /\[(img|text|transcript|audio|context|exp):\s*([\s\S]*?)\]/g; let match;
        while ((match = tagRegex.exec(blockWithoutTitle)) !== null) {
          const tag = match[1]; const val = match[2].trim();
          if (p === 7) {
            if (tag === 'text') passages.push({ type: 'text', content: val }); 
            if (tag === 'img') passages.push({ type: 'image', url: val });
            if (tag === 'transcript') transcripts.push({ type: 'text', content: val }); 
          } else {
            if (tag === 'img') imagePart1234 = val; 
            if (tag === 'text') contentPart346 = val;
            if (tag === 'transcript') { if (p === 6) imagePart1234 = val; else contentPart346 = val; }
          }
        }

        let qTextRaw = blockWithoutTitle.replace(tagRegex, '').trim(); 
        const optMatch = qTextRaw.match(/(.*?)\s*\{([^}]*)\}/s); if (!optMatch) return;
        const qText = optMatch[1].trim(); const optionsBlock = optMatch[2];
        
        let exp = ''; 
        const expMatch = optionsBlock.match(/\[exp:\s*([\s\S]*?)\]/); if (expMatch) exp = expMatch[1].trim();
        const cleanOptionsBlock = optionsBlock.replace(/\[exp:\s*[\s\S]*?\]/, '').trim();
        
        const optionLines = cleanOptionsBlock.split('\n').map(o => o.trim()).filter(o => o !== ''); 
        const parsedOptions: string[] = []; let correctLabel = '';
        
        optionLines.forEach(line => {
          if (line.startsWith('=')) { parsedOptions.push(line.substring(1).trim()); correctLabel = String.fromCharCode(65 + parsedOptions.length - 1); } 
          else if (line.startsWith('~')) { parsedOptions.push(line.substring(1).trim()); }
        });
        
        const targetCount = (p === 2) ? 3 : 4; 
        while (parsedOptions.length < targetCount) parsedOptions.push(''); 
        const finalOptions = parsedOptions.slice(0, targetCount);

        const qObj: any = { 
          id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, 
          options: finalOptions, 
          correctAnswer: correctLabel, 
          groupId: currentGroupId 
        };

        if (p === 1 || p === 2) { qObj.text = qText; if (imagePart1234) qObj.image = imagePart1234; } 
        else if (p === 3 || p === 4) { qObj.text = qText; if (imagePart1234) qObj.image = imagePart1234; if (contentPart346) qObj.content = contentPart346; } 
        else if (p === 5) { qObj.content = qText; qObj.explanation = exp; } 
        else if (p === 6) { qObj.text = exp; if (contentPart346) qObj.content = contentPart346; if (imagePart1234) qObj.image = imagePart1234; } 
        else if (p === 7) { qObj.text = qText; qObj.explanation = exp; if (passages.length > 0) qObj.passages = passages; if (transcripts.length > 0) qObj.transcripts = transcripts; }
        
        freshData[p].push(normalizeQuestionObject(qObj, p));
      });

    } else {
      let currentPart: any = null;
      let currentGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const blocks = content.split(/\n\s*\n/);
      
      blocks.forEach(block => {
        block = block.trim(); if (!block) return;

        const partMatch = block.match(/\/\/\s*====== CUSTOM PART :: (.*?) ======/);
        if (partMatch) {
          currentPart = { 
            id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, 
            name: partMatch[1].trim(), 
            mediaUrl: '', 
            sharedContext: '', 
            questions: [] 
          };
          freshData.custom.push(currentPart);

          const mediaMatch = block.match(/\/\/\s*@PartMedia:\s*(.*)/); if (mediaMatch) currentPart.mediaUrl = mediaMatch[1].trim();
          const contextMatch = block.match(/\[context:\s*([\s\S]*?)\]/); if (contextMatch) currentPart.sharedContext = contextMatch[1].trim();

          block = block.replace(/\/\/\s*====== CUSTOM PART :: .*? ======/, '').replace(/\/\/\s*@PartMedia:.*?(\n|$)/, '').replace(/\[context:\s*[\s\S]*?\]/, '');
          if (block.trim() === '') return;
        }

        if (!currentPart) return;

        if (block.includes('::Passage-Start::')) {
          currentGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
        
        block = block.replace('::Passage-Start::', '').replace('::Passage-End::', '').trim();
        if (!block) return;

        let qType = 'multiple_choice'; const typeMatch = block.match(/\/\/\s*@QType:\s*(multiple_choice|matching|text_input)/); if (typeMatch) qType = typeMatch[1];
        let scoreEnabled = false; let score = 1; const scoreMatch = block.match(/\/\/\s*@Score:\s*([\d.]+)/); if (scoreMatch) { scoreEnabled = true; score = parseFloat(scoreMatch[1]); }
        let textPlaceholder = ''; const placeMatch = block.match(/\/\/\s*@Placeholder:\s*(.*)/); if (placeMatch) textPlaceholder = placeMatch[1].trim();

        const passages: any[] = [];
        const transcripts: any[] = []; // 🔥 ĐÃ BỔ SUNG: Mảng hứng transcript cho Custom Mode

        const tagRegex = /\[(img|text|transcript|audio|context|exp):\s*([\s\S]*?)\]/g; let match;
        while ((match = tagRegex.exec(block)) !== null) {
          if (match[1] === 'text') passages.push({ type: 'text', content: match[2].trim() });
          if (match[1] === 'img') passages.push({ type: 'image', url: match[2].trim() });
          // 🔥 ĐÃ BỔ SUNG: Parse Transcript từ text thuần
          if (match[1] === 'transcript') transcripts.push({ type: 'text', content: match[2].trim() });
        }

        let sharedContext = ''; const groupCtxMatch = block.match(/\[context:\s*([\s\S]*?)\]/);
        if (groupCtxMatch) sharedContext = groupCtxMatch[1].trim();

        let cleanBlock = block.replace(/\/\/.*$/gm, '').replace(/::.*?::/, '').replace(/\[context:\s*[\s\S]*?\]/, '').replace(tagRegex, '').trim();
        const optMatch = cleanBlock.match(/(.*?)\s*\{([^}]*)\}/s); if (!optMatch) return;

        const qText = optMatch[1].trim(); const optionsBlock = optMatch[2];
        let exp = ''; const expMatch = optionsBlock.match(/\[exp:\s*([\s\S]*?)\]/); if (expMatch) exp = expMatch[1].trim();
        const cleanOptionsBlock = optionsBlock.replace(/\[exp:\s*[\s\S]*?\]/, '').trim();
        const optionLines = cleanOptionsBlock.split('\n').map(o => o.trim()).filter(o => o !== '');
        
        let options = ['', '', '', '']; let pairs: any[] = []; let correctAnswer = '';

        if (qType === 'multiple_choice') {
          let parsedOptions: string[] = [];
          optionLines.forEach(line => {
            if (line.startsWith('=')) { parsedOptions.push(line.substring(1).trim()); correctAnswer = String.fromCharCode(65 + parsedOptions.length - 1); }
            else if (line.startsWith('~')) { parsedOptions.push(line.substring(1).trim()); }
          });
          while (parsedOptions.length < 2) parsedOptions.push(''); options = parsedOptions;
        } else if (qType === 'matching') {
          optionLines.forEach(line => {
            if (line.startsWith('=')) { const parts = line.substring(1).split('->'); if (parts.length === 2) pairs.push({ left: parts[0].trim(), right: parts[1].trim() }); }
          });
        } else if (qType === 'text_input') {
          const firstOpt = optionLines.find(l => l.startsWith('=')); if (firstOpt) correctAnswer = firstOpt.substring(1).trim();
        }

        const rawCustomQ = { 
          id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, 
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
          textPlaceholder, 
          passages,
          transcripts // 🔥 ĐÃ BỔ SUNG: Truyền transcript vào object
        };
        currentPart.questions.push(normalizeQuestionObject(rawCustomQ, 'custom'));
      });
    }

    Object.keys(freshData).forEach(key => {
      if (key !== 'custom') {
        let lastGId = '';
        const partList = freshData[key];
        if (Array.isArray(partList)) {
          partList.forEach((q: any) => {
            if (q.groupId === lastGId) {
              if (key === '7') { q.passages = []; q.transcripts = []; } else { q.image = ''; q.content = ''; }
            } else {
              lastGId = q.groupId;
            }
          });
        }
      } else {
        if (Array.isArray(freshData.custom)) {
          freshData.custom.forEach((part: any) => {
            let lastGId = '';
            if (Array.isArray(part.questions)) {
              part.questions.forEach((q: any) => {
                // 🔥 ĐÃ FIX: Reset cả mảng transcripts ở các câu hỏi nối đuôi nhau trong Custom Mode
                if (q.groupId === lastGId) { q.passages = []; q.transcripts = []; q.sharedContext = ''; } else { lastGId = q.groupId; }
              });
            }
          });
        }
      }
    });

    return { success: true, data: freshData, settings: examSettings, mode: importMode };
  } catch (err) {
    return { success: false, error: 'Định dạng file GIFT không tương thích.' };
  }
};