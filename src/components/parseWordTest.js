// src/components/parseWordTest.js
export const parseInlineOptionsAndAnswer = (text) => {
  if (!text || typeof text !== 'string') return null;

  const answerSplitRegex = /\b(?:To'?g['`ʼ]ri\s+javob|Тўғри\s+жавоб|Tog'ri\s+javob)\b\s*[:\-]?\s*/i;
  const parts = text.split(answerSplitRegex);
  const optionsPart = (parts[0] || '').trim();
  const answerPart = (parts[1] || '').trim();

  const answerLetterMatch = answerPart.match(/^([A-D])\b/i);
  const correctLetter = answerLetterMatch ? answerLetterMatch[1].toUpperCase() : null;

  const splitRegex = /(?=[A-D][\)\.\:])/g;
  const rawOptions = optionsPart.split(splitRegex).map(s => s.trim()).filter(Boolean);

  const optionsMap = {};
  const optionsArray = [];
  rawOptions.forEach(raw => {
    const m = raw.match(/^\s*([A-D])[\)\.\:]\s*(.*)$/i);
    if (m) {
      const letter = m[1].toUpperCase();
      const txt = m[2].trim();
      optionsMap[letter] = txt;
      optionsArray.push({ letter, text: txt });
    } else if (raw) {
      optionsArray.push({ letter: null, text: raw });
    }
  });

  let correctAnswer = '';
  if (correctLetter && optionsMap[correctLetter]) correctAnswer = optionsMap[correctLetter];
  else if (answerPart && !correctLetter) {
    const mText = answerPart.match(/^([A-D])\)?\s*(.+)$/i);
    if (mText && mText[2]) correctAnswer = mText[2].trim();
    else correctAnswer = answerPart;
  }

  return { optionsMap, optionsArray, correctLetter, correctAnswer };
};

export const parseWordDocument = (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error("Bo'sh yoki noto'g'ri matn");
  }

  const tests = [];
  const lines = text.split(/\r?\n/);
  let current = null;

  const questionRegex = /^\s*(?:Savol|Савол)\s*:?\s*(.+)$/i;
  const optionLineRegex = /^\s*([A-D])\s*[\)\.\-:]?\s*(.+)$/i;
  const answerRegex = /^\s*(?:To'?g['`ʼ]ri\s+javob|Тўғри\s+жавоб|Tog'ri\s+javob)\s*:?\s*(.+)$/i;
  const inlineOptionsSplitRegex = /(?=[A-D]\))/g;

  const pushIfValid = (t) => {
    const minOptions = 2; // change to 4 if required
    if (t && t.question && Array.isArray(t.options) && t.options.length >= minOptions && t.correctAnswer) {
      tests.push({
        question: t.question,
        options: t.options,
        correctAnswer: t.correctAnswer,
        correctLetter: t.correctLetter || ''
      });
    }
  };

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const qMatch = line.match(questionRegex);
    if (qMatch) {
      let after = qMatch[1].trim();

      if (/[A-D]\)/.test(after)) {
        const parts = after.split(inlineOptionsSplitRegex).map(p => p.trim()).filter(Boolean);
        const first = parts.shift();
        if (current) pushIfValid(current);
        current = { question: first, options: [], correctAnswer: '', correctLetter: '' };
        for (let part of parts) {
          const m = part.match(/^\s*([A-D])\)\s*(.*)$/i);
          if (m) {
            const letter = m[1].toUpperCase();
            const textOption = m[2].trim();
            const idx = 'ABCD'.indexOf(letter);
            while (current.options.length <= idx) current.options.push('');
            current.options[idx] = textOption;
          } else if (part) {
            current.options.push(part);
          }
        }
        continue;
      } else {
        if (current) pushIfValid(current);
        current = { question: after, options: [], correctAnswer: '', correctLetter: '' };
        continue;
      }
    }

    const oMatch = line.match(optionLineRegex);
    if (oMatch && current) {
      const letter = oMatch[1].toUpperCase();
      const txt = oMatch[2].trim();
      const idx = 'ABCD'.indexOf(letter);
      while (current.options.length <= idx) current.options.push('');
      current.options[idx] = txt;
      continue;
    }

    const aMatch = line.match(answerRegex);
    if (aMatch && current) {
      const answerText = aMatch[1].trim();
      const letterOnly = answerText.match(/^([A-D])$/i);
      if (letterOnly) {
        const letter = letterOnly[1].toUpperCase();
        current.correctLetter = letter;
        const idx = 'ABCD'.indexOf(letter);
        if (idx !== -1 && current.options[idx]) current.correctAnswer = current.options[idx];
      } else {
        const mText = answerText.match(/^([A-D])\)?\s*(.+)$/i);
        if (mText) {
          const letter = mText[1].toUpperCase();
          current.correctLetter = letter;
          const idx = 'ABCD'.indexOf(letter);
          if (idx !== -1 && current.options[idx]) current.correctAnswer = current.options[idx];
          else current.correctAnswer = mText[2].trim();
        } else {
          current.correctAnswer = answerText;
        }
      }
      continue;
    }

    if (/([A-D]\))/i.test(line) && /(To'?g|Тўғри|Tog'ri)/i.test(line)) {
      const parsed = parseInlineOptionsAndAnswer(line);
      if (parsed) {
        if (!current) current = { question: '', options: [], correctAnswer: '', correctLetter: '' };
        ['A','B','C','D'].forEach((L, idx) => {
          if (parsed.optionsMap && parsed.optionsMap[L]) {
            while (current.options.length <= idx) current.options.push('');
            current.options[idx] = parsed.optionsMap[L];
          }
        });
        if (parsed.correctLetter) {
          current.correctLetter = parsed.correctLetter;
          if (parsed.correctAnswer) current.correctAnswer = parsed.correctAnswer;
          else {
            const idx = 'ABCD'.indexOf(parsed.correctLetter);
            if (idx !== -1 && current.options[idx]) current.correctAnswer = current.options[idx];
          }
        }
      }
      continue;
    }
  }

  if (current) {
    if (!current.correctAnswer && current.correctLetter) {
      const idx = 'ABCD'.indexOf(current.correctLetter);
      if (idx !== -1 && current.options[idx]) current.correctAnswer = current.options[idx];
    }
    pushIfValid(current);
  }

  if (tests.length === 0) throw new Error("Faylda to'g'ri formatda testlar topilmadi");

  return tests;
};

export default parseWordDocument;