# 🏢 Guía de Configuración en Microsoft 365 y Entra ID (Azure AD)
### Proyecto: Room Display Kiosk — Sala de Juntas Campeche

Esta guía detalla los pasos exactos para autorizar y conectar la aplicación con el buzón de sala **`SaladeJuntasCamp@itzamna.mx`** en tu tenant de **Microsoft 365**.

---

## 📌 Datos de la Sala en tu Tenant
* **Nombre de la Sala:** `Sala de Juntas Campeche`
* **Correo del Buzón de Recurso:** `SaladeJuntasCamp@itzamna.mx`
* **Dominio:** `itzamna.mx`

---

## 🚀 Paso a Paso en el Portal de Microsoft

### Paso 1: Ingresar a Microsoft Entra ID
1. Abre tu navegador e ingresa a: **[https://entra.microsoft.com/](https://entra.microsoft.com/)** (Centro de administración de Microsoft Entra).
2. Inicia sesión con tu cuenta de **Administrador Global** o **Administrador de Aplicaciones de la Nube** de `itzamna.mx`.

---

### Paso 2: Registrar la Aplicación del Kiosk
1. En el menú de navegación de la izquierda, dirígete a:
   👉 **Identidad** > **Aplicaciones** > **Registros de aplicaciones**
2. Haz clic en el botón superior **`+ Nuevo registro`**.
3. Completa el formulario:
   * **Nombre:** `Room Display Kiosk Campeche`
   * **Tipos de cuenta admitidos:** Selecciona la primera opción:
     > 🔘 *Solo las cuentas de este directorio organizativo (itzamna.mx - Inquilino único)*
   * **URI de redirección (opcional):** Déjalo completamente en blanco.
4. Haz clic en el botón **Registrar** en la parte inferior.

---

### Paso 3: Copiar los Identificadores Principales
En la pantalla de **Información general** de la aplicación que se acaba de crear, copia y guarda estos 2 valores:

| Campo en Pantalla | Nombre de Variable en `.env` | Ejemplo de Formato |
| :--- | :--- | :--- |
| **Id. de aplicación (cliente)** | `AZURE_CLIENT_ID` | `e2a1b3c4-5678-90ab-cdef-1234567890ab` |
| **Id. de directorio (inquilino)** | `AZURE_TENANT_ID` | `89abcdef-0123-4567-89ab-cdef01234567` |

---

### Paso 4: Generar el Secreto de Cliente (*Client Secret*)
1. En el menú lateral izquierdo de la aplicación, haz clic en **Certificados y secretos**.
2. Selecciona la pestaña **Secretos de cliente**.
3. Haz clic en **`+ Nuevo secreto de cliente`**.
4. Rellena los datos:
   * **Descripción:** `KioskSecretCampeche2026`
   * **Expiración:** Selecciona **24 meses** (o el plazo máximo de tu política).
5. Haz clic en **Agregar**.
6. ⚠️ **ADVERTENCIA CRÍTICA:** En la tabla inferior, copia inmediatamente el texto que aparece en la columna **`Valor`** *(NO copies el 'Id. de secreto')*.
   * *Variable en `.env`:* `AZURE_CLIENT_SECRET`
   * *Nota:* Este valor solo se muestra una vez al crearlo. Si sales de la página ya no podrás verlo.

---

### Paso 5: Asignar Permisos de Microsoft Graph
1. En el menú lateral izquierdo, haz clic en **Permisos de API**.
2. Haz clic en el botón **`+ Agregar un permiso`**.
3. En la ventana lateral, selecciona el recuadro grande **Microsoft Graph**.
4. Selecciona la opción de la derecha: **Permisos de aplicación** (*Application permissions*).
5. En la barra de búsqueda escribe `Calendars` y despliega la sección **Calendars**.
6. Marca la casilla:
   * ☑️ **`Calendars.Read`** *(Permite leer la agenda del buzón de la sala)*.
   * *(Opcional)*: Si deseas habilitar la reserva inmediata desde la pantalla táctil de la tablet, marca también **`Calendars.ReadWrite`**.
7. Haz clic en **Agregar permisos** abajo.
8. **Otorgar Consentimiento de Administrador:**
   * En la misma pantalla de Permisos de API, haz clic en el botón superior:
     👉 **`Conceder consentimiento de administrador para itzamna.mx`**
   * Confirma seleccionando **Sí**.
   * Verifica que la columna *Estado* muestre una palomita verde ✔️ (*Concedido para itzamna.mx*).

---

## 💻 Paso 6: Configurar el archivo `.env` en tu Proyecto
Abre el archivo [`.env`](file:///c:/Users/Soporte%20TI%20Junior/Documents/antigravity/agitated-meitner/.env) ubicado en la raíz del proyecto y reemplaza los valores:

```env
PORT=3000
NODE_ENV=production
DEMO_MODE=false

# ============================================================
# CREDENCIALES DE MICROSOFT ENTRA ID (PASOS 3 Y 4)
# ============================================================
AZURE_TENANT_ID=pega_aqui_tu_id_de_directorio_inquilino
AZURE_CLIENT_ID=pega_aqui_tu_id_de_aplicacion_cliente
AZURE_CLIENT_SECRET=pega_aqui_el_valor_del_secreto_de_cliente

# ============================================================
# DATOS DE LA SALA DE JUNTAS
# ============================================================
DEFAULT_ROOM_EMAIL=SaladeJuntasCamp@itzamna.mx
DEFAULT_ROOM_NAME=Sala de Juntas Campeche

# Caché en segundos para consultas a Graph API (mitigación error 429)
CACHE_TTL_SECONDS=60
TIMEZONE=America/Mexico_City
```

---

## ⚡ Paso 7 (Recomendado): Configuración de Exchange Online (PowerShell)

Por directiva predeterminada, Exchange Online suele ocultar el asunto (*Subject*) de las reuniones en buzones de sala para proteger la privacidad. Para que la tablet muestre el título de la reunión y el nombre del organizador correctamente:

1. Abre **PowerShell** en tu computadora como Administrador.
2. Ejecuta los siguientes comandos:

```powershell
# 1. Instalar módulo de Exchange (solo si no lo tienes instalado)
Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser -Force

# 2. Conectar con tus credenciales de Administrador de itzamna.mx
Connect-ExchangeOnline

# 3. Configurar el procesamiento de calendario de la Sala Campeche
Set-CalendarProcessing -Identity "SaladeJuntasCamp@itzamna.mx" `
    -AutomateProcessing AutoAccept `
    -AllowConflicts $false `
    -DeleteSubject $false `
    -AddOrganizerToSubject $false `
    -DeleteComments $false `
    -RemovePrivateProperty $false
```

---

## 🔒 Paso 8 (Opcional - Máxima Seguridad): Restringir la App solo a esta Sala

Si deseas garantizar por política de seguridad que la aplicación **NUNCA** pueda consultar los calendarios de los directores o usuarios personales de `itzamna.mx`, ejecuta en el mismo PowerShell:

```powershell
# Restringe el acceso del App Registration exclusivamente a la Sala de Juntas Campeche
New-ApplicationAccessPolicy -AppId "<PEGA_TU_AZURE_CLIENT_ID>" `
    -PolicyScopeGroupId "SaladeJuntasCamp@itzamna.mx" `
    -AccessRight RestrictAccess `
    -Description "Restringe lectura de Kiosk únicamente a la Sala de Juntas Campeche"

# Probar la política
Test-ApplicationAccessPolicy -AppId "<PEGA_TU_AZURE_CLIENT_ID>" -Identity "SaladeJuntasCamp@itzamna.mx"
```

---

## ▶️ Puesta en Marcha

Una vez guardado el archivo `.env`:

1. Inicia el servicio backend:
   ```powershell
   npm start
   ```
2. En la tablet (o navegador), abre:
   👉 **`http://<IP_DE_TU_SERVIDOR>:3000/?room=SaladeJuntasCamp@itzamna.mx`**

Cualquier reunión agendada en **Outlook** o **Teams** que incluya a `SaladeJuntasCamp@itzamna.mx` se reflejará de forma automática en la pantalla con el estado correspondiente:
* 🟢 **Verde:** Sala libre.
* 🟡 **Amarillo:** Próxima sesión en 10 minutos o menos.
* 🔴 **Rojo:** Sesión en curso con cuenta regresiva.
