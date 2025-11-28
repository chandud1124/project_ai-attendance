import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs';

let model: blazeface.BlazeFaceModel | null = null;

/**
 * Load the BlazeFace model for face detection
 */
export async function loadFaceDetectionModel(): Promise<blazeface.BlazeFaceModel> {
  if (model) {
    return model;
  }
  
  console.log('Loading BlazeFace model...');
  model = await blazeface.load();
  console.log('BlazeFace model loaded successfully');
  return model;
}

/**
 * Detect faces in a video element
 * @param video - The video element to analyze
 * @param returnTensors - Whether to return tensors (default: false)
 * @returns Array of face predictions with bounding boxes
 */
export async function detectFaces(
  video: HTMLVideoElement,
  returnTensors = false
): Promise<blazeface.NormalizedFace[]> {
  try {
    if (!model) {
      await loadFaceDetectionModel();
    }

    if (!model) {
      throw new Error('Failed to load face detection model');
    }

    if (!video || !(video instanceof HTMLVideoElement)) {
      throw new Error('Invalid video element provided');
    }

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Video element has no dimensions - ensure video is playing');
    }

    const predictions = await model.estimateFaces(video, returnTensors);
    return predictions;
  } catch (error) {
    console.error('Face detection error:', error);
    throw new Error(`Face detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Start continuous face detection on a video element
 * @param video - The video element to monitor
 * @param onFaceDetected - Callback when face(s) are detected
 * @param onNoFace - Callback when no faces are detected
 * @param interval - Detection interval in milliseconds (default: 300ms)
 */
export function startFaceDetection(
  video: HTMLVideoElement,
  onFaceDetected: (faceCount: number, faces: blazeface.NormalizedFace[]) => void,
  onNoFace: () => void,
  interval = 300
): () => void {
  let isRunning = true;

  const detect = async () => {
    if (!isRunning) return;

    try {
      const faces = await detectFaces(video);

      if (faces.length > 0) {
        onFaceDetected(faces.length, faces);
      } else {
        onNoFace();
      }
    } catch (error) {
      console.error('Face detection error:', error);
      onNoFace();
    }

    if (isRunning) {
      setTimeout(detect, interval);
    }
  };

  // Start detection after model loads
  loadFaceDetectionModel().then(() => {
    detect();
  }).catch((error) => {
    console.error('Failed to load face detection model:', error);
    onNoFace();
  });

  // Return stop function
  return () => {
    isRunning = false;
  };
}

/**
 * Draw face detection boxes on a canvas
 * @param canvas - Canvas to draw on
 * @param faces - Array of detected faces
 */
export function drawFaceBoxes(
  canvas: HTMLCanvasElement,
  faces: blazeface.NormalizedFace[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw each face
  faces.forEach((face) => {
    const start = face.topLeft as [number, number];
    const end = face.bottomRight as [number, number];
    const width = end[0] - start[0];
    const height = end[1] - start[1];
    
    // Draw green box around face
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.strokeRect(start[0], start[1], width, height);
    
    // Draw facial landmarks (eyes, nose, mouth) if available
    if (face.landmarks && Array.isArray(face.landmarks)) {
      ctx.fillStyle = '#10B981';
      (face.landmarks as number[][]).forEach((landmark) => {
        ctx.beginPath();
        ctx.arc(landmark[0], landmark[1], 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  });
}
