import type { FormattedTranscript } from '@/lib/types';

// These patterns indicate the ACTUAL transition to Q&A, not just a mention of it.
// The operator's opening always says "a question and answer session will follow" —
// we must NOT match that. Only match when Q&A is actually beginning.
const QA_TRANSITION_PATTERNS = [
  /we\s+will\s+now\s+begin\s+the\s+question/i,
  /we\s+will\s+now\s+open\s+the\s+line/i,
  /open\s+the\s+line\s+for\s+questions/i,
  /open\s+it\s+up\s+for\s+questions/i,
  /open\s+the\s+floor\s+for\s+questions/i,
  /begin\s+the\s+question[- ]and[- ]answer/i,
  /begin\s+the\s+q\s*&\s*a/i,
  /before\s+we\s+start\s+q\s*&?\s*a/i,
  /first\s+question\s+comes\s+from/i,
  /first\s+question\s+is\s+from/i,
  /first\s+question\s+today\s+comes/i,
  /first\s+question\s+today\s+is/i,
  /our\s+first\s+question\s+is/i,
  /our\s+first\s+question\s+comes/i,
  /take\s+our\s+first\s+question/i,
  /proceed\s+to\s+the\s+question/i,
  /at\s+this\s+time.*questions/i,
  /\[operator\s+instructions\].*first\s+question/i,
];

// These patterns should NOT trigger Q&A detection (future tense mentions)
const QA_FALSE_POSITIVE = [
  /will\s+follow/i,
  /will\s+be\s+held/i,
  /will\s+begin\s+after/i,
  /will\s+be\s+conducted/i,
];

export function formatTranscript(raw: string): FormattedTranscript {
  const turns = raw.split('\n').filter((line) => line.trim().length > 0);

  let qaStartIndex = -1;

  // Find the Q&A boundary — skip the first few turns (operator intro)
  // and avoid false positives from future-tense mentions
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];

    // Skip if this is a false positive (mentions Q&A will happen later)
    if (QA_FALSE_POSITIVE.some((p) => p.test(turn))) continue;

    if (QA_TRANSITION_PATTERNS.some((p) => p.test(turn))) {
      qaStartIndex = i;
      break;
    }
  }

  // If no explicit transition found, try a heuristic:
  // Look for the pattern where Operator introduces a questioner by name
  // (typically "Your next question comes from X at Y" or "X from Y, your line is open")
  if (qaStartIndex < 0) {
    for (let i = Math.max(3, Math.floor(turns.length * 0.2)); i < turns.length; i++) {
      const turn = turns[i];
      if (
        /your\s+(next\s+)?question\s+(comes?\s+from|is\s+from)/i.test(turn) ||
        /your\s+line\s+is\s+(now\s+)?open/i.test(turn)
      ) {
        // Back up one turn to include the operator's transition
        qaStartIndex = Math.max(0, i - 1);
        break;
      }
    }
  }

  const prepared: FormattedTranscript['sections'][0] = {
    type: qaStartIndex >= 0 ? 'prepared' : 'unknown',
    sentences: [],
  };

  const qa: FormattedTranscript['sections'][0] = {
    type: 'qa',
    sentences: [],
  };

  let totalSentences = 0;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i].trim();
    if (!turn) continue;

    totalSentences++;
    const id = `s-${String(totalSentences).padStart(4, '0')}`;

    // Extract speaker from "SpeakerName: text" pattern
    const colonIdx = turn.indexOf(':');
    let speaker: string | undefined;
    let text = turn;

    if (colonIdx > 0 && colonIdx < 80) {
      const potentialSpeaker = turn.slice(0, colonIdx).trim();
      if (
        potentialSpeaker.length < 60 &&
        !potentialSpeaker.includes('.') &&
        !potentialSpeaker.includes('?')
      ) {
        speaker = potentialSpeaker;
        text = turn.slice(colonIdx + 1).trim();
      }
    }

    const sentence = { id, text, speaker };

    if (qaStartIndex >= 0 && i >= qaStartIndex) {
      qa.sentences.push(sentence);
    } else {
      prepared.sentences.push(sentence);
    }
  }

  const sections: FormattedTranscript['sections'] = [];
  if (prepared.sentences.length > 0) sections.push(prepared);
  if (qa.sentences.length > 0) sections.push(qa);

  // If everything ended up in one section with type 'unknown', label it as full transcript
  return { sections, total_sentences: totalSentences };
}
