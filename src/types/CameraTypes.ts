export type CapturedFaceImage = {
  path: string;
  uri: string;
  capturedAt: string;
  source: 'camera' | 'mock';
  width?: number;
  height?: number;
  orientation?: string;
  isMirrored?: boolean;
  metadata?: {
    brightnessValue?: number;
    exposureTime?: number;
    isoSpeedRatings?: number[];
    subjectArea?: number[];
    flash?: number;
  };
};
