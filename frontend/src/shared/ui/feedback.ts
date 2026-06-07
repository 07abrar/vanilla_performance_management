import { html } from "lit-html";

export function feedbackMessage(feedback: {
  message: string | null;
  isError: boolean;
}) {
  const cls = feedback.isError
    ? "text-sm text-danger-fg"
    : "text-sm text-teal-700";
  return html`
    <p class=${feedback.message ? cls : "text-sm text-muted-strong"}>
      ${feedback.message ?? ""}
    </p>
  `;
}
