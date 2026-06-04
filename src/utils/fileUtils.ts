import RNFS from 'react-native-fs';

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
