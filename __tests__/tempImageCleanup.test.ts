import RNFS from 'react-native-fs';

import {
  cleanupTemporaryCaptureImages,
  deleteTemporaryImage,
} from '../src/utils/fileUtils';

describe('temporary image cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes exact temporary image paths and skips mock captures', async () => {
    await deleteTemporaryImage('file:///tmp/liveness-final-1.jpg');
    await deleteTemporaryImage('mock://captured-face.jpg');

    expect(RNFS.unlink).toHaveBeenCalledTimes(1);
    expect(RNFS.unlink).toHaveBeenCalledWith('/tmp/liveness-final-1.jpg');
  });

  it('deletes only stale known capture artifacts from the cache directory', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    (RNFS.readDir as jest.Mock).mockResolvedValueOnce([
      {
        path: '/mock-caches/liveness-final-old.jpg',
        mtime: new Date(now - 48 * 60 * 60 * 1000),
      },
      {
        path: '/mock-caches/liveness-final-new.jpg',
        mtime: new Date(now),
      },
      {
        path: '/mock-caches/profile-photo.jpg',
        mtime: new Date(now - 48 * 60 * 60 * 1000),
      },
    ]);

    const deletedCount = await cleanupTemporaryCaptureImages();

    expect(deletedCount).toBe(1);
    expect(RNFS.unlink).toHaveBeenCalledWith(
      '/mock-caches/liveness-final-old.jpg',
    );
    expect(RNFS.unlink).not.toHaveBeenCalledWith(
      '/mock-caches/liveness-final-new.jpg',
    );
    expect(RNFS.unlink).not.toHaveBeenCalledWith(
      '/mock-caches/profile-photo.jpg',
    );
  });
});
