/**
 * axe emits its rule tags as `wcagNNN` (e.g. `wcag143` for SC 1.4.3), alongside
 * level/version tags (`wcag2aa`, `wcag21a`), category tags (`cat.color`), and
 * `best-practice`. Only the `wcagNNN` tags that name an actual success criterion are
 * citable in a compliance report. We map them from a fixed table rather than parsing the
 * digits — `wcag1411` is 1.4.11, not 1.41.1, and guessing would fabricate criteria. Any
 * tag not in the table is dropped, never invented.
 *
 * Covers WCAG 2.0 / 2.1 Level A + AA — the criteria axe-core actually emits.
 */

export interface Criterion {
  code: string;
  name: string;
}

const TAG_TO_CRITERION: Record<string, Criterion> = {
  wcag111: { code: "1.1.1", name: "Non-text Content" },
  wcag121: { code: "1.2.1", name: "Audio-only and Video-only (Prerecorded)" },
  wcag122: { code: "1.2.2", name: "Captions (Prerecorded)" },
  wcag123: { code: "1.2.3", name: "Audio Description or Media Alternative (Prerecorded)" },
  wcag124: { code: "1.2.4", name: "Captions (Live)" },
  wcag125: { code: "1.2.5", name: "Audio Description (Prerecorded)" },
  wcag131: { code: "1.3.1", name: "Info and Relationships" },
  wcag132: { code: "1.3.2", name: "Meaningful Sequence" },
  wcag133: { code: "1.3.3", name: "Sensory Characteristics" },
  wcag134: { code: "1.3.4", name: "Orientation" },
  wcag135: { code: "1.3.5", name: "Identify Input Purpose" },
  wcag141: { code: "1.4.1", name: "Use of Color" },
  wcag142: { code: "1.4.2", name: "Audio Control" },
  wcag143: { code: "1.4.3", name: "Contrast (Minimum)" },
  wcag144: { code: "1.4.4", name: "Resize Text" },
  wcag145: { code: "1.4.5", name: "Images of Text" },
  wcag1410: { code: "1.4.10", name: "Reflow" },
  wcag1411: { code: "1.4.11", name: "Non-text Contrast" },
  wcag1412: { code: "1.4.12", name: "Text Spacing" },
  wcag1413: { code: "1.4.13", name: "Content on Hover or Focus" },
  wcag211: { code: "2.1.1", name: "Keyboard" },
  wcag212: { code: "2.1.2", name: "No Keyboard Trap" },
  wcag214: { code: "2.1.4", name: "Character Key Shortcuts" },
  wcag221: { code: "2.2.1", name: "Timing Adjustable" },
  wcag222: { code: "2.2.2", name: "Pause, Stop, Hide" },
  wcag231: { code: "2.3.1", name: "Three Flashes or Below Threshold" },
  wcag241: { code: "2.4.1", name: "Bypass Blocks" },
  wcag242: { code: "2.4.2", name: "Page Titled" },
  wcag243: { code: "2.4.3", name: "Focus Order" },
  wcag244: { code: "2.4.4", name: "Link Purpose (In Context)" },
  wcag245: { code: "2.4.5", name: "Multiple Ways" },
  wcag246: { code: "2.4.6", name: "Headings and Labels" },
  wcag247: { code: "2.4.7", name: "Focus Visible" },
  wcag251: { code: "2.5.1", name: "Pointer Gestures" },
  wcag252: { code: "2.5.2", name: "Pointer Cancellation" },
  wcag253: { code: "2.5.3", name: "Label in Name" },
  wcag254: { code: "2.5.4", name: "Motion Actuation" },
  wcag311: { code: "3.1.1", name: "Language of Page" },
  wcag312: { code: "3.1.2", name: "Language of Parts" },
  wcag321: { code: "3.2.1", name: "On Focus" },
  wcag322: { code: "3.2.2", name: "On Input" },
  wcag324: { code: "3.2.4", name: "Consistent Identification" },
  wcag331: { code: "3.3.1", name: "Error Identification" },
  wcag332: { code: "3.3.2", name: "Labels or Instructions" },
  wcag333: { code: "3.3.3", name: "Error Suggestion" },
  wcag334: { code: "3.3.4", name: "Error Prevention (Legal, Financial, Data)" },
  wcag411: { code: "4.1.1", name: "Parsing" },
  wcag412: { code: "4.1.2", name: "Name, Role, Value" },
  wcag413: { code: "4.1.3", name: "Status Messages" },
};

function compareCode(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Map a finding's axe tags to the WCAG success criteria it violates. Unmappable tags are
 * dropped; the result is deduped and sorted by criterion number.
 */
export function wcagTagsToCriteria(tags: string[] | null | undefined): Criterion[] {
  const byCode = new Map<string, Criterion>();
  for (const tag of tags ?? []) {
    const criterion = TAG_TO_CRITERION[tag];
    if (criterion) byCode.set(criterion.code, criterion);
  }
  return [...byCode.values()].sort((a, b) => compareCode(a.code, b.code));
}
