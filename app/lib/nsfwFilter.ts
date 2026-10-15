/**
 * Master NSFW / SFW Content Filter Engine
 *
 * Enforces strict safety across the application:
 * - Generations (Text-to-Image and Image-to-Image)
 * - Image & Text Uploads
 * - Chatting with AI (Guardian Doctor)
 * - Prompt Enhancer & Brain-Storm
 *
 * In SFW Mode (default):
 * - Attempts to generate, upload, chat, enhance, or brainstorm NSFW content
 *   are blocked with exact message: "NSFW Blocked by Admin".
 * - No technical or extra details are disclosed.
 *
 * In NSFW Mode (when toggled ON in Settings):
 * - Unrestricted adult/creative mode is fully enabled across all components.
 */

export const NSFW_BLOCKED_MESSAGE = "NSFW Blocked by Admin";

// Comprehensive NSFW pattern matching with word boundaries
export const NSFW_REGEX =
  /\b(nsfw|nude|nudity|naked|porn|porno|pornography|xxx|hentai|erotic|erotica|sex|sexy|sexual|explicit|genitals|penis|vagina|boobs|breasts|topless|bottomless|fellatio|blowjob|masturbat\w*|cum|orgasm|bdsm|bondage|fetish|lewd|milf|waifu\s+nude|ecchi|r18|uncensored\s+nudity|uncensored\s+sex|gangbang|hardcore|softcore|anal|penetration|stripper|undressed|unclothed|erotic\s+art|naked\s+body|naked\s+woman|naked\s+man)\b/i;

/**
 * Checks if a given text string contains NSFW content
 */
export function isNsfwContent(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return NSFW_REGEX.test(text.trim());
}

/**
 * Checks if an uploaded filename indicates NSFW content
 */
export function isImageFileNsfw(fileName: string): boolean {
  if (!fileName || typeof fileName !== "string") return false;
  const normalized = fileName.toLowerCase().replace(/[._\-]+/g, " ");
  return NSFW_REGEX.test(normalized);
}

/**
 * Safety evaluator for prompts and user messages
 */
export function checkContentSafety(
  content: string,
  isNsfwAllowed: boolean = false
): { allowed: boolean; safe: boolean; error?: string } {
  if (isNsfwAllowed) {
    return { allowed: true, safe: true };
  }

  if (isNsfwContent(content)) {
    return {
      allowed: false,
      safe: false,
      error: NSFW_BLOCKED_MESSAGE,
    };
  }

  return { allowed: true, safe: true };
}

/**
 * Checks if NSFW mode is currently active in browser storage (defaults to false / SFW)
 */
export function isNsfwModeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("app_nsfw_mode") === "true";
  } catch {
    return false;
  }
}

/**
 * Updates NSFW mode in browser storage and broadcasts event to all listeners
 */
export function setNsfwModeActive(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("app_nsfw_mode", enabled ? "true" : "false");
    window.dispatchEvent(
      new CustomEvent("nsfw-mode-changed", { detail: { enabled } })
    );
  } catch {}
}

/**
 * Triggers the global "NSFW Blocked by Admin" modal pop-up
 */
export function triggerNsfwBlockedModal(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("trigger-nsfw-blocked"));
}
