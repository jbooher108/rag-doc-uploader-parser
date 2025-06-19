import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/config';

const execAsync = promisify(exec);

export class MediaProcessingService {
  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  async extractAudioFromVideo(videoPath: string): Promise<string> {
    const audioPath = videoPath.replace(/\.[^/.]+$/, '.mp3');
    
    try {
      // Check if ffmpeg is installed
      await execAsync('which ffmpeg');
      
      // Extract audio using ffmpeg
      const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ac 2 -ab 192k -ar 48000 "${audioPath}" -y`;
      
      await execAsync(command);
      
      // Verify audio file was created
      await fs.access(audioPath);
      
      return audioPath;
    } catch (error) {
      console.error('Error extracting audio from video:', error);
      
      // If ffmpeg is not installed, provide instructions
      if (error instanceof Error && error.message.includes('which ffmpeg')) {
        throw new Error(
          'ffmpeg is not installed. Please install it using: sudo apt-get install ffmpeg (Ubuntu/Debian) or brew install ffmpeg (macOS)'
        );
      }
      
      throw new Error('Failed to extract audio from video');
    }
  }

  async segmentVideo(
    videoPath: string,
    segmentDurationMinutes: number = 10
  ): Promise<string[]> {
    const segmentPaths: string[] = [];
    const baseDir = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const extension = path.extname(videoPath);

    try {
      // Get video duration
      const duration = await this.getMediaDuration(videoPath);
      const segmentDurationSeconds = segmentDurationMinutes * 60;
      const numSegments = Math.ceil(duration / segmentDurationSeconds);

      console.log(`Video duration: ${duration}s, creating ${numSegments} segments`);

      // Create segments
      for (let i = 0; i < numSegments; i++) {
        const startTime = i * segmentDurationSeconds;
        const segmentPath = path.join(
          baseDir,
          `${baseName}_segment_${i + 1}${extension}`
        );

        // Use ffmpeg to create segment
        const command = `ffmpeg -i "${videoPath}" -ss ${startTime} -t ${segmentDurationSeconds} -c copy "${segmentPath}" -y`;
        
        await execAsync(command);
        segmentPaths.push(segmentPath);

        console.log(`Created segment ${i + 1}/${numSegments}: ${segmentPath}`);
      }

      return segmentPaths;
    } catch (error) {
      console.error('Error segmenting video:', error);
      // Clean up any created segments on error
      await this.cleanupFiles(segmentPaths);
      throw new Error('Failed to segment video');
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  async getMediaDuration(filePath: string): Promise<number> {
    try {
      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
      const { stdout } = await execAsync(command);
      return parseFloat(stdout.trim());
    } catch (error) {
      console.error('Error getting media duration:', error);
      return 0;
    }
  }

  async convertAudioFormat(
    inputPath: string,
    outputFormat: 'mp3' | 'wav' = 'mp3'
  ): Promise<string> {
    const outputPath = inputPath.replace(/\.[^/.]+$/, `.${outputFormat}`);
    
    if (inputPath === outputPath) {
      return inputPath; // Already in desired format
    }
    
    try {
      const command = outputFormat === 'mp3'
        ? `ffmpeg -i "${inputPath}" -acodec libmp3lame -ab 192k "${outputPath}" -y`
        : `ffmpeg -i "${inputPath}" -acodec pcm_s16le -ar 44100 "${outputPath}" -y`;
      
      await execAsync(command);
      
      // Verify output file was created
      await fs.access(outputPath);
      
      return outputPath;
    } catch (error) {
      console.error('Error converting audio format:', error);
      throw new Error('Failed to convert audio format');
    }
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  async cleanupFiles(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map((path) => this.cleanupFile(path)));
  }

  isVideoFile(filename: string): boolean {
    const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'];
    const extension = filename.split('.').pop()?.toLowerCase();
    return videoExtensions.includes(extension || '');
  }

  isAudioFile(filename: string): boolean {
    const audioExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma'];
    const extension = filename.split('.').pop()?.toLowerCase();
    return audioExtensions.includes(extension || '');
  }

  async saveUploadedFile(
    buffer: Buffer,
    filename: string
  ): Promise<string> {
    const filePath = path.join(UPLOAD_DIR, `${Date.now()}-${filename}`);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }
}

// Singleton instance
let mediaProcessingService: MediaProcessingService | null = null;

export const getMediaProcessingService = (): MediaProcessingService => {
  if (!mediaProcessingService) {
    mediaProcessingService = new MediaProcessingService();
  }
  return mediaProcessingService;
}; 