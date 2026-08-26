# 🛡️ Guía Técnica de Administración: Exchange Online, Seguridad y Gestión de Salas

Esta guía documenta los procedimientos de administración de **Microsoft 365 / Exchange Online** y **Microsoft Entra ID** para el sistema **Room Display Kiosk** de ITZ OIL & GAS.

---

## 📑 Tabla de Contenidos
1. [Visibilidad de Asuntos en Pantalla (Set-CalendarProcessing)](#1-visibilidad-de-asuntos-en-pantalla)
2. [Seguridad y Restricción de Acceso por Ámbito (ApplicationAccessPolicy)](#2-seguridad-y-restricción-de-acceso-por-ámbito)
3. [Procedimiento para Agregar Nuevas Salas en el Futuro](#3-procedimiento-para-agregar-nuevas-salas-en-el-futuro)
4. [Referencia de Variables de Entorno (.env)](#4-referencia-de-variables-de-entorno-env)

---

## 1. Visibilidad de Asuntos en Pantalla

### 🔍 Diagnóstico
Por política de privacidad predeterminada en Microsoft 365, los buzones de recursos de tipo sala tienen activadas dos propiedades:
* `DeleteSubject = $true`: Elimina el asunto original de la reunión.
* `AddOrganizerToSubject = $true`: Reemplaza el asunto por el nombre del organizador.

### 🛠️ Solución en PowerShell
Para que el sistema Kiosk muestre el nombre/motivo real de las reuniones en pantalla, el administrador de TI debe ejecutar:

```powershell
# 1. Conectar a Exchange Online
Connect-ExchangeOnline

# 2. Configurar buzones de recursos actuales
Set-CalendarProcessing -Identity "SaladeJuntasCamp@itzamna.mx" -DeleteSubject $false -AddOrganizerToSubject $false
Set-CalendarProcessing -Identity "SalaDeJuntasVsa@itzamna.mx" -DeleteSubject $false -AddOrganizerToSubject $false
```

---

## 2. Seguridad y Restricción de Acceso por Ámbito

### 🛡️ Principio de Menor Privilegio
Por defecto, el permiso de aplicación `Calendars.Read` o `Calendars.ReadWrite` en Azure Entra ID tiene alcance a nivel de todo el Tenant (toda la organización).

Para garantizar que la aplicación **NUNCA** pueda consultar buzones personales, directivos ni correos de colaboradores, se aplica una directiva **`ApplicationAccessPolicy`** en Exchange Online.

```
[ App Registration (Azure Client ID) ]
                   │
                   ▼
  [ ApplicationAccessPolicy (RestrictAccess) ]
          │                           │
   (Permitido 200 OK)          (Bloqueado 403 Forbidden)
          ▼                           ▼
[ Grupo: salas-kiosk@itzamna.mx ]   [ Buzones Personales / Dirección ]
  ├─ SaladeJuntasCamp@itzamna.mx
  └─ SalaDeJuntasVsa@itzamna.mx
```

### 📋 Pasos de Implementación en PowerShell:

#### Paso 1: Crear el Grupo de Seguridad de Salas
```powershell
Connect-ExchangeOnline

# Crear grupo de seguridad habilitado para correo
New-DistributionGroup -Name "Salas-Kiosk-Display" -Alias "salas-kiosk" -PrimarySmtpAddress "salas-kiosk@itzamna.mx" -Type "Security"

# Agregar los buzones de salas autorizados
Add-DistributionGroupMember -Identity "salas-kiosk@itzamna.mx" -Member "SaladeJuntasCamp@itzamna.mx"
Add-DistributionGroupMember -Identity "salas-kiosk@itzamna.mx" -Member "SalaDeJuntasVsa@itzamna.mx"
```

#### Paso 2: Crear la Directiva de Restricción
Reemplaza `<TU_AZURE_CLIENT_ID>` por el valor de `AZURE_CLIENT_ID` registrado en tu `.env`:

```powershell
New-ApplicationAccessPolicy `
  -AppId "<TU_AZURE_CLIENT_ID>" `
  -PolicyScopeGroupId "salas-kiosk@itzamna.mx" `
  -AccessRight RestrictAccess `
  -Description "Restringir Kiosk unicamente a buzones del grupo de salas de juntas"
```

#### Paso 3: Verificar la Seguridad
```powershell
# Probar acceso a sala autorizada (Resultado esperado: Granted)
Test-ApplicationAccessPolicy -AppId "<TU_AZURE_CLIENT_ID>" -Identity "SaladeJuntasCamp@itzamna.mx"

# Probar acceso a cualquier buzón de usuario o director (Resultado esperado: Denied)
Test-ApplicationAccessPolicy -AppId "<TU_AZURE_CLIENT_ID>" -Identity "director@itzamna.mx"
```

---

## 3. Procedimiento para Agregar Nuevas Salas en el Futuro

Cuando se inaugure una nueva oficina o sala de juntas:

### A. En Microsoft 365 / Exchange Online
1. Crear el nuevo buzón de sala en **Admin Center** $\rightarrow$ **Recursos** $\rightarrow$ **Salas y equipamiento** (ej. `SalaMerida@itzamna.mx`).
2. Configurar la retención de asuntos:
   ```powershell
   Set-CalendarProcessing -Identity "SalaMerida@itzamna.mx" -DeleteSubject $false -AddOrganizerToSubject $false
   ```
3. Agregar la sala al grupo de seguridad autorizado:
   ```powershell
   Add-DistributionGroupMember -Identity "salas-kiosk@itzamna.mx" -Member "SalaMerida@itzamna.mx"
   ```

### B. En el Sistema Room Display Kiosk (2 Alternativas)

#### Opción 1: Desde la Interfaz Táctil (Sin tocar código)
1. Tocar el símbolo **`π`** en la esquina inferior derecha de cualquier pantalla.
2. Ingresar el PIN administrativo (por defecto `1234` o el configurado en `ADMIN_PIN`).
3. Presionar **«+ Nueva Sala»**.
4. Llenar los datos:
   * **Nombre:** `Sala de Juntas Mérida`
   * **Buzón:** `SalaMerida@itzamna.mx`
   * **Ubicación:** `Piso 2 - Mérida`
5. Presionar **Guardar**. La sala queda guardada permanentemente en el servidor.

#### Opción 2: Configuración Automática por Tablet (URL)
Al montar una nueva tablet en la pared exterior de la sala, abrir el navegador o PWA con los parámetros de la sala:
```text
http://IP_SERVIDOR:3000/?room=SalaMerida@itzamna.mx&name=Sala%20de%20Juntas%20Mérida
```
La tablet memorizará automáticamente su configuración de forma local y persistente.

---

## 4. Referencia de Variables de Entorno (.env)

| Variable | Descripción | Ejemplo / Valor |
| :--- | :--- | :--- |
| `PORT` | Puerto del servidor web | `3000` |
| `DEMO_MODE` | `false` para conexión real a Microsoft 365, `true` para simulación | `false` |
| `AZURE_TENANT_ID` | Directory (Tenant) ID de Microsoft Entra | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_CLIENT_ID` | Application (Client) ID de la App registrada | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_CLIENT_SECRET` | Valor del secreto del cliente generado en Entra ID | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `DEFAULT_ROOM_EMAIL` | Buzón principal por defecto | `SaladeJuntasCamp@itzamna.mx` |
| `DEFAULT_ROOM_NAME` | Nombre visible principal | `Sala de Juntas Campeche` |
| `ADMIN_PIN` | PIN de seguridad para acceder a la configuración del Kiosk | `1234` |
| `CACHE_TTL_SECONDS` | Tiempo de vida de la memoria caché de consultas | `15` |
| `TIMEZONE` | Zona horaria para Microsoft Graph API | `America/Mexico_City` |

---

*Documento técnico elaborado para el área de Soporte Técnico y Sistemas de ITZ OIL & GAS.*
