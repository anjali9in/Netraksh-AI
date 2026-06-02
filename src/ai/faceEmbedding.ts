import { FACE_RECOGNITION_MODEL } from './modelConfig';
import { DEMO_MODE } from '../config/appConfig';

export class FaceEmbeddingGenerator {
  private isLoaded: boolean = false;
  private model: any = null;

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

      // Load model using react-native-fast-tflite
      const { loadTensorflowModel } = require('react-native-fast-tflite');
      this.model = await loadTensorflowModel(FACE_RECOGNITION_MODEL.modelPath);
      
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

      // 1. Load image using react-native-nitro-image
      const { loadImage } = require('react-native-nitro-image');
      const img = await loadImage({ filePath: imagePath });

      // 2. Resize to model expectations (112x112)
      const resized = await img.resizeAsync(
        FACE_RECOGNITION_MODEL.inputWidth,
        FACE_RECOGNITION_MODEL.inputHeight
      );

      // 3. Extract raw pixel data
      const pixelData = await resized.toRawPixelDataAsync();

      // 4. Preprocess pixels (convert format to RGB and scale to [-1.0, 1.0])
      const floatData = this.preprocessPixels(pixelData);

      // 5. Run inference
      if (!this.model) {
        throw new Error("Tensorflow model is not initialized");
      }
      
      const output = await this.model.run([floatData.buffer]);
      if (!output || output.length === 0) {
        throw new Error("Model inference returned no outputs");
      }

      // output[0] is a Float32Array (or Uint8Array if quantized output) containing the 512-dim embedding.
      const rawVector = new Float32Array(output[0]);
      const embedding = Array.from(rawVector) as number[];

      // 6. L2-Normalize the output vector to ensure accurate cosine similarity matching
      return this.l2Normalize(embedding);
    } catch (error) {
      console.error("[FaceEmbeddingGenerator] Embedding generation error:", error);
      throw error;
    }
  }

  /**
   * Preprocesses raw pixel data into a normalized Float32Array scaled to [-1.0, 1.0] in RGB format.
   */
  private preprocessPixels(pixelData: any): Float32Array {
    const { buffer, pixelFormat, width, height } = pixelData;
    const data = new Uint8Array(buffer);
    const totalPixels = width * height;
    const floatData = new Float32Array(totalPixels * 3);

    let stride = 4;
    let rOffset = 0;
    let gOffset = 1;
    let bOffset = 2;

    switch (pixelFormat) {
      case 'RGBA':
      case 'RGBX':
        stride = 4;
        rOffset = 0;
        gOffset = 1;
        bOffset = 2;
        break;
      case 'BGRA':
      case 'BGRX':
        stride = 4;
        rOffset = 2;
        gOffset = 1;
        bOffset = 0;
        break;
      case 'ARGB':
      case 'XRGB':
        stride = 4;
        rOffset = 1;
        gOffset = 2;
        bOffset = 3;
        break;
      case 'ABGR':
      case 'XBGR':
        stride = 4;
        rOffset = 3;
        gOffset = 2;
        bOffset = 1;
        break;
      case 'RGB':
        stride = 3;
        rOffset = 0;
        gOffset = 1;
        bOffset = 2;
        break;
      case 'BGR':
        stride = 3;
        rOffset = 2;
        gOffset = 1;
        bOffset = 0;
        break;
      default:
        stride = 4;
        rOffset = 0;
        gOffset = 1;
        bOffset = 2;
        break;
    }

    for (let i = 0; i < totalPixels; i++) {
      const srcIndex = i * stride;
      const dstIndex = i * 3;

      const r = data[srcIndex + rOffset];
      const g = data[srcIndex + gOffset];
      const b = data[srcIndex + bOffset];

      floatData[dstIndex] = (r - 127.5) / 127.5;
      floatData[dstIndex + 1] = (g - 127.5) / 127.5;
      floatData[dstIndex + 2] = (b - 127.5) / 127.5;
    }

    return floatData;
  }

  /**
   * L2 Normalization helper to map any vector to a unit-length vector.
   */
  private l2Normalize(vector: number[]): number[] {
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq);
    if (norm === 0) return vector;
    return vector.map(v => v / norm);
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
