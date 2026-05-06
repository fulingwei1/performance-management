const CONTROL_CHARS_EXCEPT_NEWLINES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SCRIPT_OR_STYLE_BLOCK = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_TAG = /<[^>]*>/g;

export function sanitizeUserText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(CONTROL_CHARS_EXCEPT_NEWLINES, '')
    .replace(SCRIPT_OR_STYLE_BLOCK, '')
    .replace(HTML_TAG, '')
    .trim();
}
