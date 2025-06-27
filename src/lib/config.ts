export const config = {
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    indexName: process.env.PINECONE_INDEX_NAME || '',
    vectorDimension: 1024,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: 'text-embedding-3-large',
    whisperModel: 'whisper-1',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB default
    maxVideoFileSize: parseInt(process.env.MAX_VIDEO_FILE_SIZE || '1073741824'), // 1GB default for videos
    maxAudioFileSize: parseInt(process.env.MAX_AUDIO_FILE_SIZE || '209715200'), // 200MB default for audio
    allowedTextFormats: ['txt', 'md', 'pdf', 'doc', 'docx', 'csv', 'json'],
    allowedAudioFormats: ['mp3', 'wav', 'm4a', 'ogg', 'flac'],
    allowedVideoFormats: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
  },
  processing: {
    chunkSize: 8000, // Reduced to ~2000 tokens (safe for 8192 token limit)
    chunkOverlap: 200, // overlap between chunks
    videoSegmentMinutes: 10, // segment videos into 10-minute chunks
  },
};

export const UPLOAD_DIR = '/tmp/uploads'; 