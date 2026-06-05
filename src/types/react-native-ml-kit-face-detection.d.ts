declare module '@react-native-ml-kit/face-detection' {
  export type Point = {
    x: number;
    y: number;
  };

  export type Frame = {
    left: number;
    top: number;
    width: number;
    height: number;
  };

  export type FaceLandmark = {
    position: Point;
  };

  export type FaceContour = {
    points: Point[];
  };

  export type Face = {
    frame: Frame;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    leftEyeOpenProbability?: number;
    rightEyeOpenProbability?: number;
    smilingProbability?: number;
    landmarks?: {
      leftCheek?: FaceLandmark;
      mouthBottom?: FaceLandmark;
      mouthLeft?: FaceLandmark;
      mouthRight?: FaceLandmark;
      noseBase?: FaceLandmark;
      rightCheek?: FaceLandmark;
    };
    contours?: {
      leftEye?: FaceContour;
      rightEye?: FaceContour;
      upperLipTop?: FaceContour;
    };
  };

  export type FaceDetectionOptions = {
    classificationMode?: 'all' | 'none';
    contourMode?: 'all' | 'none';
    landmarkMode?: 'all' | 'none';
    minFaceSize?: number;
    performanceMode?: 'accurate' | 'fast';
  };

  const FaceDetection: {
    detect(
      imagePath: string,
      options?: FaceDetectionOptions,
    ): Promise<Face[]>;
  };

  export default FaceDetection;
}
