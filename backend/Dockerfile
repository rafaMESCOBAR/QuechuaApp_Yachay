# Dockerfile optimizado para Render basado en tu configuración actual
FROM python:3.11-slim

# Variables de entorno (manteniendo las tuyas + PORT para Render)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV YOLO_CONFIG_DIR=/tmp
ENV PORT=8000

# Crear usuario no-root (manteniendo tu configuración)
RUN groupadd -r yachay && useradd --no-log-init -r -g yachay yachay

# Instalar dependencias del sistema (las mismas que tienes)
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

# Upgrade pip (como lo tienes)
RUN pip install --no-cache-dir --upgrade pip

# Instalar PyTorch CPU (exactamente como lo tienes)
RUN pip install --no-cache-dir \
    torch==2.1.0+cpu \
    torchvision==0.16.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Copiar requirements y instalar (manteniendo tu flujo)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar aplicación
COPY . .

# Crear directorios (los mismos que tienes)
RUN mkdir -p staticfiles media logs /tmp/matplotlib /tmp/ultralytics \
    && chown -R yachay:yachay /app \
    && chown -R yachay:yachay /tmp/matplotlib \
    && chown -R yachay:yachay /tmp/ultralytics \
    && chmod -R 777 /app/staticfiles \
    && chmod -R 755 /app

# Cambiar a usuario no-root
USER yachay

# 🔧 CAMBIO PARA RENDER: Puerto dinámico
EXPOSE $PORT

# 🔧 CAMBIO PARA RENDER: Health check adaptado
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/detection/status/ || exit 1

# 🔧 CAMBIO PARA RENDER: CMD con puerto dinámico
CMD gunicorn --bind 0.0.0.0:$PORT --workers 3 --timeout 120 quechua_backend.wsgi:application