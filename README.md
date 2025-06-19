# RAG Database Uploader

A powerful web application for uploading documents, audio files, and video files to a Pinecone vector database for RAG (Retrieval-Augmented Generation) applications.

## 🚀 Features

### Multi-Format Support
- **Text Documents**: `.txt`, `.md`, `.pdf`, `.doc`, `.docx`
- **Audio Files**: `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`
- **Video Files**: `.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`

### Key Capabilities
- **Batch Upload**: Upload multiple files simultaneously for mass data ingestion
- **Single File Upload**: Quick upload for individual files
- **PDF Text Extraction**: Automatically extracts text from PDF files
- **Automatic Conversion**: Video → Audio → Text pipeline
- **Audio Transcription**: Uses OpenAI Whisper for accurate transcription
- **Smart Chunking**: Large documents are split into overlapping chunks for better context
- **1024-Dimensional Embeddings**: Uses OpenAI's text-embedding-3-large model
- **Concurrent Processing**: Processes up to 3 files simultaneously
- **Large Video Support**: Automatically segments videos over 100MB into 10-minute chunks

## 📋 Prerequisites

1. **Node.js**: Version 18.0 or higher
2. **FFmpeg**: Required for audio/video processing
   - Ubuntu/Debian: `sudo apt-get install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org)
3. **Pinecone Account**: Sign up at [pinecone.io](https://www.pinecone.io)
4. **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com)

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd file-rag-uploader
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   # Pinecone Configuration
   PINECONE_API_KEY=your_pinecone_api_key_here
   PINECONE_ENVIRONMENT=your_pinecone_environment_here
   PINECONE_INDEX_NAME=your_index_name_here

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Optional: Upload Configuration
   MAX_FILE_SIZE=104857600  # 100MB in bytes
   MAX_AUDIO_FILE_SIZE=209715200  # 200MB in bytes
   MAX_VIDEO_FILE_SIZE=1073741824  # 1GB in bytes
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Batch Upload (Recommended for Initial Setup)
1. Click on the "Batch Upload" tab
2. Select multiple files using the file picker or drag & drop
3. Review the file list
4. Click "Upload X Files" to start the batch process
5. Monitor progress for each file
6. View statistics when complete

### Single File Upload
1. Click on the "Single File" tab
2. Drag & drop or click to select a file
3. Click "Upload to RAG Database"
4. Wait for processing to complete

### Processing Pipeline
1. **Upload**: Files are uploaded to the server
2. **Processing**:
   - PDFs have their text extracted automatically
   - Videos are converted to audio using FFmpeg
   - Audio files are transcribed using OpenAI Whisper
   - Text is extracted from documents
3. **Chunking**: Large texts are split into manageable chunks with overlap
4. **Embedding**: Each chunk is converted to a 1024-dimensional vector
5. **Storage**: Vectors are stored in Pinecone with metadata

## 🏗️ Architecture

```
src/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   └── page.tsx        # Main UI page
├── components/         # React components
│   ├── FileUploader.tsx      # Single file upload
│   └── MultiFileUploader.tsx # Batch upload
├── services/          # Business logic
│   ├── pinecone.service.ts       # Vector database operations
│   ├── openai.service.ts         # Embeddings & transcription
│   ├── media-processing.service.ts # Audio/video conversion
│   └── document-processing.service.ts # Orchestration
├── lib/              # Configuration & utilities
└── types/           # TypeScript type definitions
```

## 🔧 Configuration

### Pinecone Index
The system automatically creates a Pinecone index with:
- **Dimensions**: 1024 (matching OpenAI's embedding model)
- **Metric**: Cosine similarity
- **Cloud**: AWS
- **Region**: us-east-1

### File Size Limits
- Default: 100MB per file
- Configurable via `MAX_FILE_SIZE` environment variable

### File Size Limits
- **Text files**: 100MB (configurable via `MAX_FILE_SIZE`)
- **Audio files**: 200MB (configurable via `MAX_AUDIO_FILE_SIZE`)
- **Video files**: 1GB (configurable via `MAX_VIDEO_FILE_SIZE`)
- Large videos are automatically segmented into 10-minute chunks for processing

### Concurrent Uploads
- Default: 3 files processed simultaneously
- Prevents API rate limiting
- Balances speed and reliability

## 🚨 Troubleshooting

### FFmpeg Not Found
If you see "ffmpeg is not installed" error:
- Ensure FFmpeg is installed and in your PATH
- Restart your terminal after installation
- Verify with: `ffmpeg -version`

### API Rate Limits
If uploads fail due to rate limits:
- Reduce concurrent uploads in the component
- Add delays between uploads
- Check your OpenAI/Pinecone plan limits

### Large File Processing
For very large files:
- Consider preprocessing files locally
- Split large videos into smaller segments
- Monitor server memory usage

### Large File Processing
- **Automatic Video Segmentation**: Videos over 100MB are automatically split into 10-minute segments
- **Each segment is processed independently**: Ensures reliable processing of large files
- **Transcriptions are combined**: All segments are transcribed and combined into a single document
- **Progress tracking**: Monitor processing of each segment

### PDF Processing
- **Text Extraction**: Uses pdf2json for reliable text extraction in Node.js
- **Page-by-page Processing**: Each page is extracted with page markers
- **Handles Complex PDFs**: Extracts text from various PDF formats
- **Error Handling**: Clear error messages if PDFs are corrupted or password-protected
- **Smart Chunking**: PDFs are split into 8,000 character chunks (≈2,666 tokens) to stay within OpenAI's 8,192 token limit
- **Batch Processing**: Large documents are processed in batches of 5 chunks at a time

## 🔐 Security Considerations

- API keys are stored in environment variables
- Files are temporarily stored and cleaned up after processing
- No permanent file storage on the server
- Input validation on file types and sizes

## 📝 Future Enhancements

- [x] PDF text extraction support (using pdf2json)
- [ ] Word document parsing
- [ ] Progress WebSocket for real-time updates
- [ ] Batch download of processed documents
- [ ] Support for more audio/video formats
- [ ] Custom embedding models
- [ ] Multi-language transcription

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
