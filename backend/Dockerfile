# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Create downloads and temp directories
RUN mkdir -p /app/downloads /app/temp

# Environment variables default
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DOWNLOAD_DIR=/app/downloads
ENV TEMP_DIR=/app/temp

EXPOSE 8000

# Start Uvicorn web server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
