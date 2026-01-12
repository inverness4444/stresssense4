const UNSAFE_TAGS = /<(script|style|iframe|object|embed|link|meta)[\s\S]*?>[\s\S]*?<\/\1>/gi;
const SELF_CLOSING_UNSAFE = /<(script|style|iframe|object|embed|link|meta)([\s\S]*?)\/?>/gi;
const EVENT_HANDLER_ATTR = /\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_PROTOCOL = /javascript:/gi;

export function sanitizeHtml(input: string) {
  if (!input) return "";
  let output = input;
  output = output.replace(UNSAFE_TAGS, "");
  output = output.replace(SELF_CLOSING_UNSAFE, "");
  output = output.replace(EVENT_HANDLER_ATTR, "");
  output = output.replace(JS_PROTOCOL, "");
  return output;
}
