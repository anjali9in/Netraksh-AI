export function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}
