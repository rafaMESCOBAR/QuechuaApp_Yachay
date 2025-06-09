# Dockerfile optimizado para Yachay Backend Django
FROM python:3.11-slim

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV YOLO_CONFIG_DIR=/tmp

# Crear usuario no-root
RUN groupadd -r yachay && useradd --no-log-init -r -g yachay yachay

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    # Build essentials
    build-essential \
    # PostgreSQL
    libpq-dev \
    postgresql-client \
    # OpenCV y ML dependencies
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    # Audio processing
    ffmpeg \
    # Utilidades
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Directorio de trabajo
WORKDIR /app

# ✅ INSTALACIÓN OPTIMIZADA: PyTorch CPU primero, luego el resto
RUN pip install --no-cache-dir --upgrade pip

# Instalar PyTorch CPU desde el índice oficial (esto evita las librerías NVIDIA)
RUN pip install --no-cache-dir \
    torch==2.1.0+cpu \
    torchvision==0.16.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Copiar requirements.txt (sin las líneas de torch ya que se instalaron arriba)
COPY requirements.txt .

# Instalar el resto de dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copiar aplicación
COPY . .

# Crear directorios y permisos
RUN mkdir -p staticfiles media logs /tmp/matplotlib /tmp/ultralytics \
    && chown -R yachay:yachay /app \
    && chown -R yachay:yachay /tmp/matplotlib \
    && chown -R yachay:yachay /tmp/ultralytics \
    && chmod -R 777 /app/staticfiles \
    && chmod -R 755 /app

# Cambiar a usuario no-root
USER yachay

# Exponer puerto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/detection/status/ || exit 1

# Comando por defecto
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60", "quechua_backend.wsgi:application"]