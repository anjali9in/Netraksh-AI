import RNFS from 'react-native-fs';

const DEFAULT_TEMP_IMAGE_RETENTION_MS = 24 * 60 * 60 * 1000;
const TEMP_CAPTURE_FILE_PATTERN =
  /^(liveness-final-|vision-camera-|react-native-image-resizer|resized|cropped|normalized).*\.(jpg|jpeg|png)$/i;

type TempReadDirItem = {
  path: string;
  mtime?: Date | null;
};

export function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/** Writable app-private directory (react-native-fs uses *Path suffixes). */
export function getWritableAppDirectory(): string {
  return (
    RNFS.CachesDirectoryPath ||
    RNFS.TemporaryDirectoryPath ||
    RNFS.DocumentDirectoryPath
  );
}

export function joinFilePath(directory: string, fileName: string): string {
  const base = directory.replace(/\/$/, '');
  return `${base}/${fileName}`;
}

export function stripFileScheme(uriOrPath: string): string {
  return uriOrPath.replace(/^file:\/\//, '');
}

export async function deleteTemporaryImage(
  uriOrPath: string | null | undefined,
): Promise<void> {
  if (!uriOrPath || uriOrPath.startsWith('mock://')) {
    return;
  }

  await RNFS.unlink(stripFileScheme(uriOrPath)).catch(() => undefined);
}

export async function cleanupTemporaryCaptureImages(
  retentionMs: number = DEFAULT_TEMP_IMAGE_RETENTION_MS,
): Promise<number> {
  const directory = getWritableAppDirectory();
  const readDir = RNFS.readDir;

  if (!readDir) {
    return 0;
  }

  const cutoffMs = Date.now() - retentionMs;
  const entries = await readDir(directory).catch(() => []);
  let deletedCount = 0;

  await Promise.all(
    entries.map(async entry => {
      const name = getEntryName(entry.path);

      if (!TEMP_CAPTURE_FILE_PATTERN.test(name)) {
        return;
      }

      const modifiedAtMs = getModifiedAtMs(entry);

      if (modifiedAtMs > cutoffMs) {
        return;
      }

      await RNFS.unlink(entry.path)
        .then(() => {
          deletedCount += 1;
        })
        .catch(() => undefined);
    }),
  );

  return deletedCount;
}

function getEntryName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

function getModifiedAtMs(entry: TempReadDirItem): number {
  const mtime = entry.mtime;

  if (mtime instanceof Date) {
    return mtime.getTime();
  }

  return 0;
}
