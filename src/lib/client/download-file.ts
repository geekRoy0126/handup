// Saves generated text as a file in the browser (used by the report's "Download as Markdown").
export function downloadTextFile(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Firefox and Safari may start the download after click() returns; revoking right away can cancel it (#61).
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
