import React from 'react';

import type {CapturedFaceImage} from '../types/CameraTypes';
import {CameraCaptureCard} from './CameraCaptureCard';

type FaceCapturePanelProps = {
  title: string;
  description: string;
  controlsDisabled?: boolean;
  validationMessages?: string[];
  onPhotoCaptured?: (image: CapturedFaceImage) => void;
  onPhotoCleared?: () => void;
};

export function FaceCapturePanel(
  props: FaceCapturePanelProps,
): React.JSX.Element {
  return <CameraCaptureCard {...props} />;
}
