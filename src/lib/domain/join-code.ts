// Join codes (docs/PRD.md §4.1): 6 characters without look-alikes (0/O, 1/I/L), shown as K7Q-2XM.
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

const VALID_CODE = new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`);

/** `random` returns numbers in [0, 1), like Math.random; injected so tests are deterministic. */
export function generateJoinCode(random: () => number): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    const index = Math.min(Math.floor(random() * JOIN_CODE_ALPHABET.length), JOIN_CODE_ALPHABET.length - 1);
    code += JOIN_CODE_ALPHABET[index];
  }
  return code;
}

/** Turns what people type ("k7q 2xm", "K7Q-2XM") into the stored form, or null if it can't be a code. */
export function normalizeJoinCode(input: string): string | null {
  const code = input.replace(/[\s-]/g, "").toUpperCase();
  return VALID_CODE.test(code) ? code : null;
}

export function formatJoinCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}
