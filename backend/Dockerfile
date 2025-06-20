# Dockerfile para Docker Compose local (reemplaza el actual)
FROM python:3.11-slim

# Variables de entorno para desarrollo local
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV YOLO_CONFIG_DIR=/tmp

# Crear usuario no-root
RUN groupadd -r yachay && useradd --no-log-init -r -g yachay yachay

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    postgresql-client \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    ffmpeg \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Directorio de trabajo
WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Instalar PyTorch CPU
RUN pip install --no-cache-dir \
    torch==2.1.0+cpu \
    torchvision==0.16.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Copiar requirements y instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar aplicación
COPY . .

# Crear directorios y permisos
RUN mkdir -p staticfiles media logs /tmp/matplotlib /tmp/ultralytics \
    && chown -R yachay:yachay /app \
    && chown -R yachay:yachay /tmp/matplotlib \
    && chown -R yachay:yachay /tmp/ultralytics \
    && chmod -R 755 /app

# Cambiar a usuario no-root
USER yachay

# Exponer puerto estándar para Docker Compose
EXPOSE 8000

# Health check para Docker Compose
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/admin/login/ || exit 1

# NO definir CMD aquí - dejar que docker-compose.yml lo maneje