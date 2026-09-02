export type TimedToken = { id: string; text: string; startMs: number; endMs: number; confidence?: number };
export type TimedLine = { id: string; text: string; startMs: number; endMs: number; tokens: TimedToken[] };

const MANUAL_LINE_PREFIX = "line-manual-";
const MAX_JOIN_DISTANCE_MS = 2000;

function lineWithTokens(line: TimedLine, tokens: TimedToken[]): TimedLine {
  const sorted = [...tokens].sort((first, second) => first.startMs - second.startMs);
  if (!sorted.length) return { ...line, text: "", tokens: sorted };
  return {
    ...line,
    text: sorted.map((token) => token.text.trim()).filter(Boolean).join(" "),
    startMs: sorted[0].startMs,
    endMs: Math.max(...sorted.map((token) => token.endMs)),
    tokens: sorted,
  };
}

function intervalDistance(first: TimedLine, second: TimedLine) {
  if (first.endMs < second.startMs) return second.startMs - first.endMs;
  if (second.endMs < first.startMs) return first.startMs - second.endMs;
  return 0;
}

/**
 * Older editor revisions stored every "Add at playhead" entry as a separate
 * subtitle line. Fold those entries into the nearby transcribed line so the
 * preview and ASS renderer keep the words in chronological sentence order.
 */
export function mergeManualLyricLines(input: TimedLine[]): TimedLine[] {
  const regular = input.filter((line) => !line.id.startsWith(MANUAL_LINE_PREFIX)).map((line) => lineWithTokens(line, line.tokens));
  const manual = input.filter((line) => line.id.startsWith(MANUAL_LINE_PREFIX)).map((line) => lineWithTokens(line, line.tokens));

  if (!regular.length) return manual.sort((first, second) => first.startMs - second.startMs);

  for (const addition of manual) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestCenterDistance = Number.POSITIVE_INFINITY;
    const additionCenter = (addition.startMs + addition.endMs) / 2;

    regular.forEach((line, index) => {
      const distance = intervalDistance(addition, line);
      const centerDistance = Math.abs(additionCenter - (line.startMs + line.endMs) / 2);
      if (distance < bestDistance || (distance === bestDistance && centerDistance < bestCenterDistance)) {
        bestIndex = index;
        bestDistance = distance;
        bestCenterDistance = centerDistance;
      }
    });

    if (bestIndex >= 0 && bestDistance <= MAX_JOIN_DISTANCE_MS) {
      regular[bestIndex] = lineWithTokens(regular[bestIndex], [...regular[bestIndex].tokens, ...addition.tokens]);
    } else {
      regular.push(addition);
    }
  }

  return regular.sort((first, second) => first.startMs - second.startMs);
}

export function addTokensToNearestLine(input: TimedLine[], tokens: TimedToken[], fallbackId: string): TimedLine[] {
  if (!tokens.length) return input;
  const addition = lineWithTokens({ id: fallbackId, text: "", startMs: tokens[0].startMs, endMs: tokens[tokens.length - 1].endMs, tokens: [] }, tokens);
  return mergeManualLyricLines([...input, addition]);
}
