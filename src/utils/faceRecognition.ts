import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs';
import { supabase } from '../lib/supabase';

interface StudentFaceData {
  student_id: string;
  student_name: string;
  roll_number: string;
  photo_url: string;
  face_descriptor?: number[]; // Face encoding/embedding
}

export interface RecognizedFace {
  student_id: string;
  student_name: string;
  roll_number: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// In-memory cache of student face data
let studentFaceDatabase: StudentFaceData[] = [];

/**
 * Get the current student face database (for testing/debugging)
 */
export function getStudentFaceDatabase(): StudentFaceData[] {
  return studentFaceDatabase;
}

/**
 * Load student face database from API
 */
export async function loadStudentFaceDatabase(): Promise<void> {
  try {
    console.log('Loading student face database...');

    // Use Supabase client to get users who have photos (for face recognition)
    const { data, error } = await supabase.from('users').select('id, full_name, email, photo').not('photo', 'is', null);

    if (error) {
      console.warn('Error fetching students from Supabase:', error.message);
      studentFaceDatabase = [];
      return;
    }

    if (!data || !Array.isArray(data)) {
      console.warn('No student data available');
      studentFaceDatabase = [];
      return;
    }

    // Filter users who have photos and validate photo format
    const validStudents = data.filter((user: any) => {
      if (!user.photo) {
        console.warn(`Student ${user.full_name} has no photo`);
        return false;
      }
      if (!user.photo.startsWith('data:image/')) {
        console.warn(`Student ${user.full_name} has invalid photo format: ${user.photo.substring(0, 50)}...`);
        return false;
      }
      return true;
    });

    studentFaceDatabase = validStudents.map((user: any) => ({
      student_id: user.id,
      student_name: user.full_name,
      roll_number: user.email, // Use email as roll number for now
      photo_url: user.photo
    }));

    console.log(`Loaded ${studentFaceDatabase.length} students with valid photos for face recognition`);
  } catch (error) {
    console.error('Error loading student database:', error);
    // Don't throw - just use empty database
    studentFaceDatabase = [];
  }
}

/**
 * Extract face descriptor from image
 * Note: This is a simplified version. For production, use face-api.js or similar
 */
async function extractFaceDescriptor(imageElement: HTMLImageElement): Promise<number[]> {
  try {
    // Validate image element
    if (!imageElement) {
      throw new Error('Image element is null or undefined');
    }

    if (!(imageElement instanceof HTMLImageElement)) {
      throw new Error('Invalid image element type');
    }

    if (!imageElement.complete || imageElement.naturalWidth === 0) {
      throw new Error('Image not fully loaded or has zero dimensions');
    }

    // Convert image to tensor
    const tensor = tf.browser.fromPixels(imageElement);
    const resized = tf.image.resizeBilinear(tensor, [128, 128]);
    const normalized = resized.div(255.0);

    // Flatten to 1D array (simplified descriptor)
    const flattened = normalized.reshape([128 * 128 * 3]);
    const descriptor = await flattened.array() as number[];

    // Cleanup tensors
    tensor.dispose();
    resized.dispose();
    normalized.dispose();
    flattened.dispose();

    return descriptor;
  } catch (error) {
    console.error('Error extracting face descriptor:', error);
    throw new Error(`Face descriptor extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compare two face descriptors and return similarity score (0-1)
 */
function compareFaceDescriptors(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return 0;
  
  // Calculate Euclidean distance
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  const distance = Math.sqrt(sum);
  
  // Convert distance to similarity (0-1)
  const similarity = 1 / (1 + distance);
  return similarity;
}

/**
 * Crop face from video frame using bounding box
 */
function cropFaceFromVideo(
  video: HTMLVideoElement,
  face: blazeface.NormalizedFace
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const start = face.topLeft as [number, number];
  const end = face.bottomRight as [number, number];
  const width = end[0] - start[0];
  const height = end[1] - start[1];
  
  // Add padding
  const padding = 20;
  const x = Math.max(0, start[0] - padding);
  const y = Math.max(0, start[1] - padding);
  const w = Math.min(video.videoWidth - x, width + padding * 2);
  const h = Math.min(video.videoHeight - y, height + padding * 2);
  
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, x, y, w, h, 0, 0, w, h);
  
  return canvas;
}

/**
 * Recognize faces in video against student database
 * @param video - Video element
 * @param detectedFaces - Faces detected by BlazeFace
 * @param threshold - Minimum confidence threshold (0-1)
 */
export async function recognizeFaces(
  video: HTMLVideoElement,
  detectedFaces: blazeface.NormalizedFace[],
  threshold = 0.6
): Promise<RecognizedFace[]> {
  // Load database if empty
  if (studentFaceDatabase.length === 0) {
    await loadStudentFaceDatabase();
    
    // If still empty after loading, return early with helpful message
    if (studentFaceDatabase.length === 0) {
      console.log('No students with photos in database. Add student photos to enable recognition.');
      return [];
    }
  }
  
  const recognizedFaces: RecognizedFace[] = [];
  
  for (const face of detectedFaces) {
    try {
      // Crop face from video
      const faceCanvas = cropFaceFromVideo(video, face);
      const faceImage = new Image();
      faceImage.src = faceCanvas.toDataURL();

      // Wait for image to load with timeout
      await new Promise((resolve, reject) => {
        faceImage.onload = resolve;
        faceImage.onerror = () => reject(new Error('Failed to load face image from canvas'));
        setTimeout(() => reject(new Error('Face image loading timeout')), 5000);
      });

      // Extract descriptor
      const faceDescriptor = await extractFaceDescriptor(faceImage);

      // Compare with database
      let bestMatch: StudentFaceData | null = null;
      let bestScore = 0;

      for (const student of studentFaceDatabase) {
        try {
          // Load student photo if not cached
          if (!student.face_descriptor) {
            if (!student.photo_url) {
              console.warn(`Student ${student.student_name} has no photo URL`);
              continue;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = student.photo_url;

            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => reject(new Error(`Failed to load photo for student ${student.student_name}`));
              setTimeout(() => reject(new Error('Student photo loading timeout')), 10000);
            });

            student.face_descriptor = await extractFaceDescriptor(img);
          }

          // Compare descriptors
          const score = compareFaceDescriptors(faceDescriptor, student.face_descriptor);

          if (score > bestScore && score >= threshold) {
            bestScore = score;
            bestMatch = student;
          }
        } catch (studentError) {
          console.warn(`Error processing student ${student.student_name}:`, studentError);
          continue;
        }
      }

      if (bestMatch) {
        const start = face.topLeft as [number, number];
        const end = face.bottomRight as [number, number];

        recognizedFaces.push({
          student_id: bestMatch.student_id,
          student_name: bestMatch.student_name,
          roll_number: bestMatch.roll_number,
          confidence: bestScore,
          boundingBox: {
            x: start[0],
            y: start[1],
            width: end[0] - start[0],
            height: end[1] - start[1]
          }
        });
      }
    } catch (faceError) {
      console.error('Error processing face:', faceError);
      continue;
    }
  }
  
  return recognizedFaces;
}

/**
 * Draw recognized faces with names on canvas
 */
export function drawRecognizedFaces(
  canvas: HTMLCanvasElement,
  recognizedFaces: RecognizedFace[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  recognizedFaces.forEach((face) => {
    const { boundingBox, student_name, roll_number, confidence } = face;
    
    // Draw bounding box
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height
    );
    
    // Draw label background
    const label = `${student_name} (${roll_number})`;
    const confidenceText = `${(confidence * 100).toFixed(0)}%`;
    ctx.font = 'bold 14px Inter, sans-serif';
    const labelWidth = Math.max(
      ctx.measureText(label).width,
      ctx.measureText(confidenceText).width
    ) + 16;
    
    const labelX = boundingBox.x;
    const labelY = boundingBox.y - 50;
    
    // Background
    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
    ctx.fillRect(labelX, labelY, labelWidth, 45);
    
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, labelX + 8, labelY + 20);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(confidenceText, labelX + 8, labelY + 37);
  });
}

/**
 * Start continuous face recognition on a video element
 */
export function startFaceRecognition(
  video: HTMLVideoElement,
  detectFaces: (video: HTMLVideoElement) => Promise<blazeface.NormalizedFace[]>,
  onRecognized: (faces: RecognizedFace[]) => void,
  interval = 500
): () => void {
  let isRunning = true;
  
  const recognize = async () => {
    if (!isRunning) return;
    
    try {
      const detectedFaces = await detectFaces(video);
      
      if (detectedFaces.length > 0) {
        const recognizedFaces = await recognizeFaces(video, detectedFaces);
        onRecognized(recognizedFaces);
      } else {
        onRecognized([]);
      }
    } catch (error) {
      console.error('Face recognition error:', error);
      onRecognized([]);
    }
    
    if (isRunning) {
      setTimeout(recognize, interval);
    }
  };
  
  // Start recognition
  loadStudentFaceDatabase().then(() => {
    recognize();
  });
  
  return () => {
    isRunning = false;
  };
}
