/**
 * A helper function that generates a unique random string (nonce).
 *
 * @remarks
 * This is used for Content Security Policy (CSP) to allow only specific scripts to run.
 *
 * @returns A 32-character random string
 */
export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
