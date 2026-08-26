/**
 * Typed references to the Convex `profiles` functions this feature uses.
 * Components never import from convex/_generated directly — only this
 * file does (ADR 0004 feature-boundary rule, same as features/submissions).
 *
 * Contract as consumed by the UI:
 *   myProfile (query, reactive)
 *     args: {} → { email, displayName, language, goal, updatedAt,
 *                  deckCount }
 *     Preference fields are null until first saved; email and deckCount
 *     always reflect current account state (deckCount is own decks only).
 *   updateProfile (mutation)
 *     args: { displayName?, language?, goal? } → updated profiles doc.
 *     Omitted args leave stored values untouched; an empty/whitespace
 *     displayName clears it. Errors surface through each editor's local
 *     error state.
 */

import { api } from "../../../convex/_generated/api";

export const myProfileRef = api.profiles.myProfile;
export const updateProfileRef = api.profiles.updateProfile;
