# Guía de Instalación de PostgreSQL para Windows

## Paso 1: Descargar PostgreSQL

1. Ve a: https://www.postgresql.org/download/windows/
2. Click en "Download the installer"
3. Descarga la versión más reciente (16.x)

## Paso 2: Instalar

1. Ejecuta el instalador descargado
2. **Componentes a instalar:**
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (interfaz gráfica)
   - ✅ Command Line Tools
   - ❌ Stack Builder (opcional)

3. **Configuración:**
   - Puerto: `5432` (default)
   - Locale: `Spanish, Peru` o `Default locale`
   - **Password para usuario postgres**: Anota este password, lo necesitarás

   123456

## Paso 3: Verificar Instalación

Abre PowerShell y ejecuta:
```powershell
# Agregar PostgreSQL al PATH (si no se agregó automáticamente)
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"

# Verificar versión
psql --version
```

## Paso 4: Crear Base de Datos

```powershell
# Conectar como postgres
psql -U postgres

# En el prompt de PostgreSQL:
CREATE DATABASE it_inventory;
\q
```

## Paso 5: Configurar Credenciales

Crea archivo `.env` en la carpeta `backend/`:

```env
# PostgreSQL Configuration
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
DB_HOST=localhost
DB_PORT=5432
DB_NAME=it_inventory
```

## Siguiente Paso

Una vez instalado PostgreSQL, ejecuta:
```powershell
python backend/migrate_to_postgres.py
```

Este script migrará todos los datos de SQLite a PostgreSQL.
