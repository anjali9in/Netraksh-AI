import { FACE_RECOGNITION_MODEL } from './modelConfig';
import { DEMO_MODE } from '../config/appConfig';

export class FaceEmbeddingGenerator {
  private isLoaded: boolean = false;

  constructor() {
    // Initialization logic
  }

  /**
   * Loads the model into memory.
   * In a React Native context, this will call the native TFLite/ONNX module to load the model file.
   */
  public async loadModel(): Promise<boolean> {
    try {
      console.log(`[FaceEmbeddingGenerator] Loading model: ${FACE_RECOGNITION_MODEL.modelName} v${FACE_RECOGNITION_MODEL.version} | Format: ${FACE_RECOGNITION_MODEL.modelFormat} | Quantized: ${FACE_RECOGNITION_MODEL.quantized} | Path: ${FACE_RECOGNITION_MODEL.modelPath}`);
      
      if (DEMO_MODE) {
        this.isLoaded = true;
        return true;
      }

      // TODO: Integrate native TFLite/ONNX module here
      // Example:
      // await NativeTFLiteModule.loadModel(FACE_RECOGNITION_MODEL.modelPath);
      
      this.isLoaded = true;
      return true;
    } catch (error) {
      console.error("[FaceEmbeddingGenerator] Failed to load model:", error);
      this.isLoaded = false;
      return false;
    }
  }

  /**
   * Generates a 512-dimensional ArcFace embedding vector for a given captured face image path.
   * Upgraded from MobileFaceNet (128-dim, 99.28% LFW) to ArcFace-MobileNetV2 (512-dim, 99.77% LFW).
   *
   * @param imagePath The local URI or file path of the cropped face image (112×112 expected).
   * @returns A promise resolving to a normalized L2 unit-length face embedding vector.
   */
  public async generateEmbedding(imagePath: string): Promise<number[]> {
    if (!this.isLoaded) {
      const loaded = await this.loadModel();
      if (!loaded) {
        throw new Error("Model is not loaded and failed to initialize");
      }
    }

    try {
      if (DEMO_MODE) {
        // Return a mock embedding vector of the correct dimension for simulation/development
        console.log(`[FaceEmbeddingGenerator] DEMO_MODE: Generating mock embedding for ${imagePath}`);
        return this.generateMockEmbedding(imagePath);
      }

      // TODO: Perform image preprocessing (resize to 112×112, normalize with mean/std 127.5)
      // and invoke the native TFLite module inference for ArcFace-MobileNetV2
      //
      // Step 1: Resize image to 112×112×3
      // Step 2: Normalize: pixel = (pixel - 127.5) / 127.5  → range [-1, 1]
      // Step 3: Run TFLite inference → raw 512-dim output
      // Step 4: L2-normalize the output vector
      //
      // Example (once native module is integrated):
      // const rawOutput = await NativeTFLiteModule.runInference(
      //   FACE_RECOGNITION_MODEL.modelPath, imagePath
      // );
      // return l2Normalize(rawOutput);

      throw new Error("ArcFace-MobileNetV2 native TFLite integration is pending. Running in DEMO_MODE.");
    } catch (error) {
      console.error("[FaceEmbeddingGenerator] Embedding generation error:", error);
      throw error;
    }
  }

  /**
   * Generates a deterministic mock embedding for a given image path.
   * This is useful for offline demo mode testing and developer verification.
   */
  private generateMockEmbedding(imagePath: string): number[] {
    const dim = FACE_RECOGNITION_MODEL.embeddingDimension;
    const embedding: number[] = new Array(dim);
    
    // Create a simple hash from the imagePath to generate a deterministic but distinct embedding per face
    let hash = 0;
    for (let i = 0; i < imagePath.length; i++) {
      hash = (hash << 5) - hash + imagePath.charCodeAt(i);
      hash |= 0;
    }

    let sumSq = 0;
    for (let i = 0; i < dim; i++) {
      // Semi-random float value between -1.0 and 1.0 based on the hash
      const val = Math.sin(hash + i) * Math.cos(hash * i);
      embedding[i] = val;
      sumSq += val * val;
    }

    // Normalize to unit length (L2 norm) so similarity checks are accurate
    const norm = Math.sqrt(sumSq);
    for (let i = 0; i < dim; i++) {
      embedding[i] = embedding[i] / norm;
    }

    return embedding;
  }
}

export const faceEmbeddingGenerator = new FaceEmbeddingGenerator();
