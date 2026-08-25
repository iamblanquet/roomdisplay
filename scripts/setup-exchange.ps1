<#
.SYNOPSIS
    Script de configuración de Exchange Online y Microsoft 365 para Room Display Kiosk.

.DESCRIPTION
    Este script guía al administrador de Exchange Online para:
    1. Conectar a Exchange Online PowerShell.
    2. Crear o configurar un buzón de recursos de tipo Sala (Room Mailbox).
    3. Configurar el procesamiento automático de calendario (AutoAccept, conservar asunto y detalles).
    4. Crear un Grupo de Seguridad para buzones de salas permitidos.
    5. Crear la directiva de acceso a la aplicación (New-ApplicationAccessPolicy) para limitar el permiso Calendars.Read exclusivamente a las salas autorizadas.
    6. Probar y validar la política con Test-ApplicationAccessPolicy.

.PARAMETER AzureAppId
    El Application (Client) ID del App Registration creado en Microsoft Entra ID.

.PARAMETER RoomEmail
    El correo del buzón de recursos de la sala (ej. sala-juntas@tudominio.com).

.PARAMETER RoomName
    El nombre visible de la sala (ej. "Sala de Juntas Principal").

.EXAMPLE
    .\setup-exchange.ps1 -AzureAppId "11111111-2222-3333-4444-555555555555" -RoomEmail "sala-juntas@empresa.com" -RoomName "Sala Principal"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Application (Client) ID del App Registration en Azure")]
    [string]$AzureAppId,

    [Parameter(Mandatory = $true, HelpMessage = "Correo electrónico del buzón de sala")]
    [string]$RoomEmail,

    [Parameter(Mandatory = $false)]
    [string]$RoomName = "Sala de Juntas Principal",

    [Parameter(Mandatory = $false)]
    [string]$SecurityGroupName = "SalasKioskAuthorizedGroup@tudominio.com"
)

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  ROOM DISPLAY KIOSK - CONFIGURACIÓN DE EXCHANGE ONLINE Y SEGURIDAD" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# 1. Verificar módulo de Exchange Online
if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
    Write-Warning "El módulo 'ExchangeOnlineManagement' no está instalado. Instalando..."
    Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser -Force
}

# 2. Conectar a Exchange Online
Write-Host "`n[Paso 1/5] Conectando a Exchange Online..." -ForegroundColor Yellow
Connect-ExchangeOnline -ShowBanner:$false

# 3. Verificar o crear el Buzón de Sala
Write-Host "`n[Paso 2/5] Verificando buzón de recursos de sala ($RoomEmail)..." -ForegroundColor Yellow
$mailbox = Get-Mailbox -Identity $RoomEmail -ErrorAction SilentlyContinue

if (-not $mailbox) {
    Write-Host "Creando nuevo buzón de recursos de tipo Sala: $RoomName ($RoomEmail)..." -ForegroundColor Green
    New-Mailbox -Room -Name $RoomName -PrimarySmtpAddress $RoomEmail
} else {
    Write-Host "Buzón encontrado. Tipo: $($mailbox.RecipientTypeDetails)" -ForegroundColor Green
    if ($mailbox.RecipientTypeDetails -ne "RoomMailbox") {
        Write-Warning "AVISO: El buzón no es de tipo 'RoomMailbox'. Considere convertirlo con: Set-Mailbox -Identity '$RoomEmail' -Type Room"
    }
}

# 4. Configurar el procesamiento automático de calendario (CalendarProcessing)
Write-Host "`n[Paso 3/5] Configurando directivas de calendario (Set-CalendarProcessing)..." -ForegroundColor Yellow
Set-CalendarProcessing -Identity $RoomEmail `
    -AutomateProcessing AutoAccept `
    -AllowConflicts $false `
    -BookingWindowInDays 180 `
    -MaximumDurationInMinutes 1440 `
    -AllowRecurringMeetings $true `
    -DeleteSubject $false `
    -AddOrganizerToSubject $false `
    -DeleteComments $false `
    -RemovePrivateProperty $false

Write-Host "✔ Procesamiento automático configurado exitosamente:" -ForegroundColor Green
Write-Host "  - AutoAccept activado (rechaza conflictos automáticamente)."
Write-Host "  - Preservación de asuntos, organizador y comentarios para visualización en pantalla."

# 5. Crear Grupo de Seguridad para limitar acceso del App Registration (Principio de menor privilegio)
Write-Host "`n[Paso 4/5] Configurando grupo de seguridad y directiva de acceso (ApplicationAccessPolicy)..." -ForegroundColor Yellow

$group = Get-DistributionGroup -Identity $SecurityGroupName -ErrorAction SilentlyContinue
if (-not $group) {
    Write-Host "Creando grupo de seguridad habilitado para correo: $SecurityGroupName..." -ForegroundColor Green
    New-DistributionGroup -Name "SalasKioskAuthorizedGroup" `
        -PrimarySmtpAddress $SecurityGroupName `
        -Type "Security" `
        -Members $RoomEmail
} else {
    Write-Host "Agregando buzón de la sala al grupo de seguridad..." -ForegroundColor Green
    Add-DistributionGroupMember -Identity $SecurityGroupName -Member $RoomEmail -ErrorAction SilentlyContinue
}

# 6. Aplicar New-ApplicationAccessPolicy
Write-Host "Creando/Actualizando directiva New-ApplicationAccessPolicy para App ID: $AzureAppId..." -ForegroundColor Green
$policy = Get-ApplicationAccessPolicy -AppId $AzureAppId -ErrorAction SilentlyContinue

if (-not $policy) {
    New-ApplicationAccessPolicy -AppId $AzureAppId `
        -PolicyScopeGroupId $SecurityGroupName `
        -AccessRight RestrictAccess `
        -Description "Restringe la lectura de calendarios del Kiosk únicamente a buzones de salas autorizadas."
} else {
    Write-Host "La directiva de acceso para la aplicación ya existe." -ForegroundColor Green
}

# 7. Validar política
Write-Host "`n[Paso 5/5] Probando directiva de acceso con Test-ApplicationAccessPolicy..." -ForegroundColor Yellow
$testResult = Test-ApplicationAccessPolicy -AppId $AzureAppId -Identity $RoomEmail
Write-Host "Resultado de prueba de acceso:" -ForegroundColor Cyan
$testResult | Format-List AppId, Identity, AccessCheckResult

Write-Host "`n==========================================================================" -ForegroundColor Cyan
Write-Host "✔ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "  Ahora configure su archivo .env con el AZURE_CLIENT_ID, AZURE_CLIENT_SECRET y AZURE_TENANT_ID."
Write-Host "==========================================================================" -ForegroundColor Cyan
