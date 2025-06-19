#!/bin/bash

echo "Setting up environment variables for RAG Database Uploader"
echo "========================================================="
echo ""

# Create .env.local file
cat > .env.local << EOF
# Pinecone Configuration
PINECONE_API_KEY=$PINECONE_API_KEY
PINECONE_INDEX_NAME=$PINECONE_INDEX_NAME

# OpenAI Configuration  
OPENAI_API_KEY=$OPENAI_API_KEY

# Upload Configuration (optional)
MAX_FILE_SIZE=104857600
EOF

echo "Created .env.local file"
echo ""
echo "Please set the following environment variables before running this script:"
echo "  export PINECONE_API_KEY='your_pinecone_api_key'"
echo "  export PINECONE_INDEX_NAME='your_index_name'"
echo "  export OPENAI_API_KEY='your_openai_api_key'"
echo ""
echo "Or edit the .env.local file directly after running this script." 