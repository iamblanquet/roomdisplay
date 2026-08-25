# 🏢 Room Display Kiosk (Exchange Online / Microsoft Graph)

Web App ligera de alto rendimiento optimizada para tablets en modo kiosco montadas en el exterior de salas de reuniones. Se integra con **Buzones de Recursos de Sala (Room Mailboxes)** de **Microsoft 365 / Exchange Online** mediante **Microsoft Graph API** para reflejar la disponibilidad en tiempo real, detalles de la reunión actual y la agenda del día.

---

## 🎨 Estados Visuales en Pantalla

| Estado | Color | Condición | Comportamiento en Pantalla |
| :--- | :---: | :--- | :--- |
| **LIBRE / DISPONIBLE** | 🟢 Verde (`#16a34a`) | No hay reuniones activas ni próximas en $\le 10$ min | Muestra "SALA LIBRE", tiempo disponible y botón de reserva rápida de 15/30 min. |
| **PRÓXIMO** | 🟡 Amarillo (`#d97706`) | La siguiente reunión inicia en $\le 10$ minutos | Alerta visual "INICIA EN BREVE", cuenta regresiva en vivo, título y organizador. |
| **OCUPADO** | 🔴 Rojo (`#dc2626`) | Reunión en curso en este momento | Muestra "SALA OCUPADA", título, organizador, rango horario, barra de progreso y tiempo restante. |

---

## 🏗️ Arquitectura de la Solución

```
┌──────────────────────────────────────┐
│       Microsoft Entra ID             │
│  (OAuth 2.0 / Client Credentials)    │
└──────────────────┬───────────────────┘
                   │ Token JWT
                   ▼
┌──────────────────────────────────────┐
│        Backend Proxy API             │ ──> Caché en memoria (TTL: 60s)
│        (Node.js / Express)           │ <── Microsoft Graph API (/calendarView)
└──────────────────┬───────────────────┘
                   │ JSON normalizado (/api/status?room=...)
                   │ Polling HTTP cada 30s
                   ▼
┌──────────────────────────────────────┐
│         Tablet Frontend              │
│    (HTML5 / Tailwind CSS / JS)       │ ──> Reloj autónomo + cuenta regresiva 1s
└──────────────────────────────────────┘
```

---

## 🚀 Inicio Rápido

### 1. Requisitos Previos
* **Node.js** v18 o superior instalado.

### 2. Instalación y Ejecución
```bash
# 1. Clonar o ingresar al proyecto
cd agitated-meitner

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm start
```
Abre en tu navegador o tablet: **[http://localhost:3000](http://localhost:3000)**

> [!NOTE]
> Por defecto, la aplicación arranca con `DEMO_MODE=true` en `.env`. Esto permite probar inmediatamente la interfaz y cambiar entre estados (Verde, Amarillo, Rojo) desde el botón de configuración (⚙️) o pasando parámetros en la URL sin requerir credenciales de Azure de inmediato.

---

## 🔑 Configuración con Microsoft 365 y Exchange Online

Cuando estés listo para conectar buzones de salas reales de tu tenant de Microsoft 365, sigue estos sencillos pasos:

### Paso 1: Registrar Aplicación en Microsoft Entra ID (Azure AD)
1. Ve al portal de **[Microsoft Entra admin center](https://entra.microsoft.com/)** > **Aplicaciones** > **Registros de aplicaciones** > **Nuevo registro**.
2. Nombre: `Room Display Kiosk Service`.
3. Tipos de cuenta: *Solo cuentas de este directorio de organización*.
4. Guarda el **Application (client) ID** y el **Directory (tenant) ID**.
5. Ve a **Certificados y secretos** > **Nuevo secreto de cliente** > Copia el valor del secreto.
6. Ve a **Permisos de API** > **Agregar un permiso** > **Microsoft Graph** > **Permisos de aplicación**:
   * Selecciona `Calendars.Read` (o `Calendars.ReadWrite` si deseas habilitar reservas directas desde la tablet).
   * Haz clic en **Conceder consentimiento de administrador**.

### Paso 2: Restringir Acceso a Buzones de Sala en Exchange Online (Seguridad)
Para cumplir con las mejores prácticas de seguridad de Microsoft y evitar que la aplicación lea los correos o calendarios personales de los empleados, ejecuta nuestro script automatizado de PowerShell:

```powershell
# Ejecutar desde PowerShell como Administrador
cd scripts
.\setup-exchange.ps1 -AzureAppId "<TU_AZURE_CLIENT_ID>" -RoomEmail "sala-juntas@tudominio.com" -RoomName "Sala de Juntas Principal"
```

El script se encarga de:
1. Conectar con Exchange Online (`Connect-ExchangeOnline`).
2. Configurar el procesamiento automático de calendario (`Set-CalendarProcessing -AutomateProcessing AutoAccept -DeleteSubject $false`).
3. Crear un grupo de seguridad de buzones autorizados y aplicar la directiva de acceso:
   ```powershell
   New-ApplicationAccessPolicy -AppId "<CLIENT_ID>" -PolicyScopeGroupId "SalasKioskGroup@tudominio.com" -AccessRight RestrictAccess
   ```
4. Validar la política con `Test-ApplicationAccessPolicy`.

### Paso 3: Configurar el archivo `.env`
Edita el archivo `.env` en la raíz del proyecto:
```env
PORT=3000
NODE_ENV=production
DEMO_MODE=false

AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

DEFAULT_ROOM_EMAIL=sala-juntas@tudominio.com
DEFAULT_ROOM_NAME=Sala de Juntas Principal
CACHE_TTL_SECONDS=60
TIMEZONE=America/Mexico_City
```

---

## 📱 Opciones para Generar e Instalar la APK en Tablets Android

Hemos incluido **3 alternativas** para correr la app en tablets como APK:

### 🛠️ Opción 1: Compilar la APK con Android Studio (Proyecto Nativo Incluido)
Dentro del repositorio se encuentra la carpeta [`android/`](file:///c:/Users/Soporte%20TI%20Junior/Documents/antigravity/agitated-meitner/android) lista para compilar:
1. Abre **Android Studio**.
2. Selecciona **Open** y abre la carpeta `android`.
3. Ve al menú superior: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
4. Android Studio generará el archivo `.apk` en: `android/app/build/outputs/apk/debug/app-debug.apk`.
5. Transfiere el `.apk` a tu tablet por USB, Google Drive o con `adb install app-debug.apk`.

*Características del APK nativo:*
* 🔒 **Bloqueo Kiosco Inmersivo:** Oculta barras del sistema (navegación y notificaciones).
* ⚡ **Pantalla Siempre Activa:** `FLAG_KEEP_SCREEN_ON` para evitar que la tablet se suspenda.
* 🔄 **Auto-inicio al encender:** Se ejecuta automáticamente si la tablet se reinicia.
* ⚙️ **Configuración Dinámica de URL:** Permite cambiar la dirección IP o correo de sala en cualquier momento.

---

### 🌐 Opción 2: Generar APK en 1 Minuto con PWABuilder
El proyecto incluye [`manifest.json`](file:///c:/Users/Soporte%20TI%20Junior/Documents/antigravity/agitated-meitner/public/manifest.json) preconfigurado:
1. Publica el backend en tu red local o nube (ej. `https://kiosk.tudominio.com`).
2. Entra a **[PWABuilder.com](https://www.pwabuilder.com/)**.
3. Pega la URL de tu Kiosk (`https://kiosk.tudominio.com/?room=SaladeJuntasCamp@itzamna.mx`).
4. Haz clic en **Package for Android** y descarga el APK firmado listo para instalar.

---

### 📲 Opción 3: Fully Kiosk Browser APK (Modo Kiosco Profesional)
Si deseas gestión remota MDM de la tablet:
1. Descarga el APK de **[Fully Kiosk Browser](https://www.fully-kiosk.com/#download-box)**.
2. Configura la URL inicial: `http://<IP_SERVIDOR>:3000/?room=SaladeJuntasCamp@itzamna.mx`
3. Activa: *Keep Screen On*, *Kiosk Mode*, *Autostart on Boot*.

---

## 🔌 Especificación de la API Backend

### `GET /api/status`
Retorna el estado calculado de la sala en tiempo real.

**Query Parameters:**
* `room`: Correo del buzón de sala de Exchange (ej. `?room=sala-innovacion@empresa.com`).
* `scenario`: (Opcional, para pruebas) `occupied` | `upcoming` | `free`.
* `refresh`: `true` para invalidar la caché de 60 segundos.

**Ejemplo de Respuesta:**
```json
{
  "room": "sala-juntas@empresa.com",
  "room_name": "Sala de Juntas Principal",
  "timestamp": "2026-08-25T14:00:00.000Z",
  "current_status": "OCCUPIED",
  "current_meeting": {
    "id": "demo-1",
    "title": "Reunión de Estrategia Trimestral",
    "organizer": "Mauricio Blanquet",
    "start_time": "2026-08-25T13:45:00.000Z",
    "end_time": "2026-08-25T14:45:00.000Z",
    "minutes_remaining": 45
  },
  "upcoming_meeting": null,
  "next_meetings": [
    {
      "id": "demo-2",
      "title": "Revisión de Arquitectura Cloud",
      "organizer": "Ana Gómez",
      "start_time": "2026-08-25T15:00:00.000Z",
      "end_time": "2026-08-25T16:00:00.000Z",
      "minutes_until_start": 60
    }
  ],
  "is_mock": false,
  "cache_ttl_seconds": 60,
  "_from_cache": false
}
```

### `POST /api/book`
Permite crear una reserva rápida ad-hoc directamente desde la tablet táctil.

**Body:**
```json
{
  "room": "sala-juntas@empresa.com",
  "title": "Reunión Rápida",
  "durationMinutes": 30,
  "organizer": "Tablet Kiosk"
}
```

---

## 🛡️ Matriz de Resiliencia y Rendimiento

1. **Cero exposición de credenciales:** El secreto de cliente de Azure vive estrictamente en las variables de entorno del backend; la tablet solo interactúa con la API normalizada.
2. **Caché en memoria (TTL 60s):** Evita el error HTTP 429 (*Too Many Requests*) de Microsoft Graph, asegurando que múltiples tablets o recargas no agoten la cuota de la API.
3. **Reloj y Cuenta Regresiva Autónomos:** El reloj digital y los segundos de cuenta regresiva se calculan localmente en el cliente con `setInterval(..., 1000)`, eliminando la necesidad de realizar peticiones de red segundo a segundo.
4. **Tolerancia a Fallos de Red:** Si la red sufre un microcorte, la tablet mantiene el último estado conocido con un discreto badge de "Reconectando..." sin mostrar pantallas de error ni romper la experiencia de usuario.
