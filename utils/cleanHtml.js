import { convert } from "html-to-text";

export function cleanHtml(htmlContent) {
  return convert(htmlContent, {
    wordwrap: false,
    ignoreImage: true,
    ignoreHref: true,
    preserveNewlines: true,
  });
}
