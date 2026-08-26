/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as cards from "../cards.js";
import type * as crons from "../crons.js";
import type * as decks from "../decks.js";
import type * as dictionary from "../dictionary.js";
import type * as http from "../http.js";
import type * as moderation from "../moderation.js";
import type * as packets from "../packets.js";
import type * as phrases from "../phrases.js";
import type * as profiles from "../profiles.js";
import type * as seed_phrases from "../seed/phrases.js";
import type * as seed_sampleSubmissions from "../seed/sampleSubmissions.js";
import type * as srs from "../srs.js";
import type * as submissionTypes from "../submissionTypes.js";
import type * as submissions from "../submissions.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authz: typeof authz;
  cards: typeof cards;
  crons: typeof crons;
  decks: typeof decks;
  dictionary: typeof dictionary;
  http: typeof http;
  moderation: typeof moderation;
  packets: typeof packets;
  phrases: typeof phrases;
  profiles: typeof profiles;
  "seed/phrases": typeof seed_phrases;
  "seed/sampleSubmissions": typeof seed_sampleSubmissions;
  srs: typeof srs;
  submissionTypes: typeof submissionTypes;
  submissions: typeof submissions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;

export declare const components: {};
