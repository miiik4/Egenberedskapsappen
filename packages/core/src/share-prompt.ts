import { daysBetween } from './dates';
import type { IsoDate } from './types';

/** Days of use before the app asks whether the user wants to share it. */
export const SHARE_PROMPT_AFTER_DAYS = 14;
/** Days from «Senere» until it asks again. */
export const SHARE_PROMPT_AGAIN_DAYS = 90;

export interface SharePrompt {
  /** «Ikke spør igjen», or the user has shared from the question: it never comes back. */
  hidden: boolean;
  /** The day it was last shown, or null when it never has been. */
  askedOn: IsoDate | null;
}

/**
 * Whether to ask «Vil du dele appen med en venn?» now. Only someone who has used the app for a
 * while and has something in the stockpile is asked, never more often than every
 * `SHARE_PROMPT_AGAIN_DAYS`, and never again once it's hidden.
 */
export function shouldAskToShare(
  prompt: SharePrompt,
  onboardedOn: IsoDate | null,
  hasStock: boolean,
  today: IsoDate,
): boolean {
  if (prompt.hidden || onboardedOn === null || !hasStock) return false;
  if (daysBetween(onboardedOn, today) < SHARE_PROMPT_AFTER_DAYS) return false;
  return prompt.askedOn === null || daysBetween(prompt.askedOn, today) >= SHARE_PROMPT_AGAIN_DAYS;
}
