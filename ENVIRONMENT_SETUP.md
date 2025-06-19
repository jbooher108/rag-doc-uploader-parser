# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root directory with the following content:

```env
# Pinecone Configuration
PINECONE_API_KEY=your_actual_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name

# OpenAI Configuration  
OPENAI_API_KEY=your_actual_openai_api_key_here

# Upload Configuration (optional)
MAX_FILE_SIZE=104857600          # 100MB - Default for text files
MAX_VIDEO_FILE_SIZE=1073741824   # 1GB - For video files
MAX_AUDIO_FILE_SIZE=209715200    # 200MB - For audio files
```

## Getting Your API Keys

### 1. Pinecone API Key
1. Go to [https://app.pinecone.io](https://app.pinecone.io)
2. Sign up or log in to your account
3. Navigate to "API Keys" in the console
4. Copy your API key
5. Choose an index name (e.g., "rag-documents")

### 2. OpenAI API Key
1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to "API keys" section
4. Create a new API key
5. Copy the key immediately (it won't be shown again)

## Setup Methods

### Method 1: Manual Creation
Create the `.env.local` file manually in your project root and paste the content above with your actual API keys.

### Method 2: Using the Setup Script
```bash
# Set environment variables
export PINECONE_API_KEY='your_actual_pinecone_api_key'
export PINECONE_INDEX_NAME='your_index_name'
export OPENAI_API_KEY='your_actual_openai_api_key'

# Run the setup script
./setup-env.sh
```

### Method 3: Direct Creation
```bash
cat > .env.local << EOF
PINECONE_API_KEY=your_actual_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
OPENAI_API_KEY=your_actual_openai_api_key
MAX_FILE_SIZE=104857600          # 100MB - Default for text files
MAX_VIDEO_FILE_SIZE=1073741824   # 1GB - For video files
MAX_AUDIO_FILE_SIZE=209715200    # 200MB - For audio files
EOF
```

## Important Notes

1. **Never commit `.env.local` to git** - It's already in .gitignore
2. **Restart the dev server** after creating/modifying `.env.local`
3. **No NEXT_PUBLIC_ prefix needed** - These are server-side only variables
4. **The Pinecone environment parameter is deprecated** - Only API key and index name are needed
5. **PDF Support** - PDF text extraction is built-in using pdf2json
6. **Chunk Size** - Documents are split into 8,000 character chunks to stay within OpenAI's token limits

## Troubleshooting

If you still get API key errors after setting up:

1. **Verify the file exists:**
   ```bash
   ls -la .env.local
   ```

2. **Check file contents (be careful not to expose keys):**
   ```bash
   head -n 5 .env.local
   ```

3. **Restart the development server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

4. **Check server logs for debug output:**
   The API route now logs whether environment variables are detected.

## Example with Real Values

```env
# Pinecone Configuration
PINECONE_API_KEY=pc-abc123def456ghi789jkl012mno345pq
PINECONE_INDEX_NAME=rag-documents

# OpenAI Configuration  
OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456789

# Upload Configuration (optional)
MAX_FILE_SIZE=104857600          # 100MB - Default for text files
MAX_VIDEO_FILE_SIZE=1073741824   # 1GB - For video files
MAX_AUDIO_FILE_SIZE=209715200    # 200MB - For audio files
``` 