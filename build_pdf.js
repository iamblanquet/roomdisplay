const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const logoPath = path.join(__dirname, 'public', 'assets', 'logonegro.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual de Usuario - Reserva de Salas de Juntas ITZ</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');

    @page {
      size: letter portrait;
      margin: 8mm 12mm 8mm 12mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.34;
      font-size: 8.8pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .container {
      width: 100%;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Cabecera Principal */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid #ffc400;
      padding-bottom: 7px;
      margin-bottom: 9px;
    }

    .logo-img {
      height: 44px;
      width: auto;
      object-fit: contain;
      display: block;
    }

    .doc-info {
      text-align: right;
    }

    .doc-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffc400;
      font-weight: 800;
      font-size: 7.5pt;
      padding: 2.5px 8px;
      border-radius: 5px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .doc-meta {
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 600;
    }

    /* Banner de Título */
    .banner {
      background: linear-gradient(135deg, #070c18 0%, #131d36 100%);
      color: #ffffff;
      padding: 10px 15px;
      border-radius: 8px;
      margin-bottom: 9px;
      border-left: 5px solid #ffc400;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .banner-title {
      font-size: 13.5pt;
      font-weight: 900;
      letter-spacing: -0.3px;
      color: #ffffff;
    }

    .banner-subtitle {
      font-size: 8pt;
      color: #cbd5e1;
      margin-top: 1.5px;
    }

    /* Encabezados de Sección */
    .section-title {
      font-size: 9.6pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 7px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-left: 3.5px solid #ffc400;
      padding-left: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Estados del Semáforo */
    .status-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 9px;
    }

    .status-card {
      border-radius: 8px;
      padding: 7px 9px;
      border-width: 1.5px;
      border-style: solid;
      background: #f8fafc;
    }

    .card-free {
      border-color: #00b090;
      background: #f0fdf9;
    }

    .card-upcoming {
      border-color: #f59e0b;
      background: #fffbeb;
    }

    .card-occupied {
      border-color: #e11d48;
      background: #fff1f2;
    }

    .status-badge {
      display: inline-block;
      font-size: 6.8pt;
      font-weight: 800;
      text-transform: uppercase;
      padding: 1.5px 5.5px;
      border-radius: 4px;
      margin-bottom: 2px;
      color: #ffffff;
    }

    .badge-green { background: #00b090; }
    .badge-yellow { background: #d97706; }
    .badge-red { background: #e11d48; }

    .status-name {
      font-weight: 800;
      font-size: 8.8pt;
      color: #0f172a;
      margin-bottom: 1.5px;
    }

    .status-desc {
      font-size: 7.5pt;
      color: #475569;
      line-height: 1.25;
    }

    /* Columnas Dobles para Métodos de Reserva */
    .methods-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-bottom: 8px;
    }

    .method-box {
      background: #f8fafc;
      border: 1.2px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 11px;
    }

    .method-header {
      font-weight: 800;
      font-size: 9pt;
      color: #0f172a;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 5px;
      padding-bottom: 3px;
      border-bottom: 1.5px solid #e2e8f0;
    }

    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 4.5px;
    }

    .step-row {
      display: flex;
      align-items: flex-start;
      gap: 7px;
    }

    .step-circle {
      background: #0f172a;
      color: #ffc400;
      font-weight: 800;
      font-size: 7.8pt;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .step-info {
      font-size: 7.6pt;
      color: #334155;
      line-height: 1.28;
    }

    .step-info strong {
      color: #0f172a;
    }

    /* Destacados en 2 Columnas: Asistentes y Notificaciones */
    .features-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 9px;
      margin-bottom: 8px;
    }

    .callout-assistants {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1.5px solid #3b82f6;
      border-radius: 8px;
      padding: 8px 11px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .callout-notifications {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1.5px solid #00b090;
      border-radius: 8px;
      padding: 8px 11px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .callout-icon {
      font-size: 13.5pt;
      line-height: 1;
      flex-shrink: 0;
    }

    .callout-title {
      font-size: 8.3pt;
      font-weight: 800;
      margin-bottom: 2px;
    }

    .title-blue { color: #1d4ed8; }
    .title-green { color: #047857; }

    .callout-body {
      font-size: 7.5pt;
      line-height: 1.3;
    }

    .body-blue { color: #1e3a8a; }
    .body-green { color: #065f46; }

    /* Tabla de Salas */
    table.rooms-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3px;
      font-size: 7.8pt;
    }

    table.rooms-table th,
    table.rooms-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      text-align: left;
    }

    table.rooms-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
    }

    table.rooms-table tr:nth-child(even) {
      background: #ffffff;
    }

    table.rooms-table tr:nth-child(odd) {
      background: #f1f5f9;
    }

    .code-email {
      font-family: 'JetBrains Mono', monospace;
      background: #ffffff;
      color: #0f172a;
      font-size: 7.6pt;
      padding: 1.5px 5px;
      border-radius: 4px;
      border: 1px solid #94a3b8;
      font-weight: 700;
    }
  </style>
</head>
<body>

  <div class="container">
    
    <!-- CABECERA CON LOGONEGRO OFICIAL -->
    <div class="header">
      <div>
        <img class="logo-img" src="data:image/png;base64,${logoBase64}" alt="ITZ Oil &amp; Gas Logo">
      </div>

      <div class="doc-info">
        <div><span class="doc-badge">GUÍA RÁPIDA DE USUARIO</span></div>
        <div class="doc-meta">Sistemas &amp; TI • Microsoft 365 Kiosk</div>
      </div>
    </div>

    <!-- BANNER -->
    <div class="banner">
      <div>
        <div class="banner-title">Sistema de Reserva de Salas de Juntas</div>
        <div class="banner-subtitle">Consulta de disponibilidad en tiempo real, métodos oficiales de reserva y alertas móviles</div>
      </div>
      <div style="text-align: right; font-size: 8pt; font-weight: 700; color: #ffc400;">
        ITZAMNA.MX
      </div>
    </div>

    <!-- SECCIÓN 1: SEMÁFORO DE ESTADOS -->
    <div class="section-title">1. Interpretación de Estados en la Pantalla Kiosk</div>
    <div class="status-grid">
      <div class="status-card card-free">
        <span class="status-badge badge-green">Disponible</span>
        <div class="status-name">🟢 Pantalla Verde</div>
        <div class="status-desc">
          <strong>Sala libre para uso inmediato.</strong> Muestra el tiempo disponible antes de la próxima sesión. Puedes ingresar o apartarla en el botón <em>"Ocupar Ahora"</em>.
        </div>
      </div>

      <div class="status-card card-upcoming">
        <span class="status-badge badge-yellow">Inicia en Breve</span>
        <div class="status-name">🟡 Pantalla Amarilla</div>
        <div class="status-desc">
          <strong>Faltan &le; 10 min para iniciar.</strong> Alerta para preparar proyectores, recibir asistentes o concluir a tiempo la sesión previa.
        </div>
      </div>

      <div class="status-card card-occupied">
        <span class="status-badge badge-red">En Sesión</span>
        <div class="status-name">🔴 Pantalla Roja</div>
        <div class="status-desc">
          <strong>Reunión en curso.</strong> Muestra el asunto, quién la organizó, la hora exacta en que se desocupa (ej. <em>11:00</em>) y los minutos restantes.
        </div>
      </div>
    </div>

    <!-- SECCIÓN 2: DOS MÉTODOS DE RESERVA -->
    <div class="section-title">2. Métodos para Agendar u Ocupar una Sala</div>
    <div class="methods-grid">
      
      <!-- Método A: En Pantalla -->
      <div class="method-box">
        <div class="method-header">
          <span style="color: #d97706;">⚡ Opción A:</span> Reserva Rápida en Pantalla
        </div>
        <div class="steps-list">
          <div class="step-row">
            <div class="step-circle">1</div>
            <div class="step-info">Toca el botón dorado <strong>«⚡ OCUPAR AHORA»</strong> en la esquina superior derecha de la tablet.</div>
          </div>
          <div class="step-row">
            <div class="step-circle">2</div>
            <div class="step-info">Selecciona la duración deseada: <strong>15, 30, 45 o 60 min</strong> (se deshabilitan duraciones que choquen con citas futuras).</div>
          </div>
          <div class="step-row">
            <div class="step-circle">3</div>
            <div class="step-info">Escribe tu nombre o motivo de la junta (opcional).</div>
          </div>
          <div class="step-row">
            <div class="step-circle">4</div>
            <div class="step-info">Presiona <strong>«Confirmar»</strong>. La pantalla cambiará a <strong>ROJO</strong> y se sincronizará en Outlook para toda la empresa.</div>
          </div>
        </div>
      </div>

      <!-- Método B: Desde Outlook / Teams -->
      <div class="method-box">
        <div class="method-header">
          <span style="color: #1d4ed8;">📅 Opción B:</span> Desde Microsoft Outlook / Teams
        </div>
        <div class="steps-list">
          <div class="step-row">
            <div class="step-circle">1</div>
            <div class="step-info">Abre <strong>Outlook</strong> o <strong>Teams</strong> en tu computadora o celular y crea un <strong>Nuevo Evento</strong>.</div>
          </div>
          <div class="step-row">
            <div class="step-circle">2</div>
            <div class="step-info">Define la fecha, hora de inicio y fin de la reunión.</div>
          </div>
          <div class="step-row">
            <div class="step-circle">3</div>
            <div class="step-info">En el campo <strong>Ubicación / Salas</strong>, selecciona tu sala.</div>
          </div>
          <div class="step-row">
            <div class="step-circle">4</div>
            <div class="step-info">Envía la invitación. La pantalla exterior se actualizará automáticamente en menos de <strong>15 segundos</strong>.</div>
          </div>
        </div>
      </div>

    </div>

    <!-- SECCIÓN 3: TIPS CLAVE (INVITADOS Y NOTIFICACIONES PUSH) -->
    <div class="features-grid">
      
      <!-- Callout: Asistentes requeridos -->
      <div class="callout-assistants">
        <div class="callout-icon">💡</div>
        <div>
          <div class="callout-title title-blue">¿No encuentras la sala en la lista de ubicaciones?</div>
          <div class="callout-body body-blue">
            <strong>¡Invítala como asistente!</strong> Escribe el correo oficial de la sala en el campo <strong>«Invitar asistentes»</strong> (como si fuera un compañero). Microsoft 365 reservará la sala automáticamente y se mostrará en pantalla.
          </div>
        </div>
      </div>

      <!-- Callout: Notificaciones Push -->
      <div class="callout-notifications">
        <div class="callout-icon">🔔</div>
        <div>
          <div class="callout-title title-green">Alertas en tu Móvil / PC</div>
          <div class="callout-body body-green">
            Toca el icono de la <strong>Campana</strong> en la pantalla o en tu navegador web para activar <strong>Alertas Push</strong>. Recibirás un aviso en tiempo real cuando la sala quede <strong>desocupada</strong>.
          </div>
        </div>
      </div>

    </div>

    <!-- SECCIÓN 4: DIRECTORIO OFICIAL DE SALAS -->
    <div class="section-title">3. Directorio de Buzones Oficiales de Salas ITZ</div>
    <table class="rooms-table">
      <thead>
        <tr>
          <th>Sala de Juntas</th>
          <th>Ubicación</th>
          <th>Correo Oficial de Exchange (Para Invitar / Reservar)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Sala de Juntas Campeche</strong></td>
          <td>Piso 1 - Oficinas Campeche</td>
          <td><span class="code-email">SaladeJuntasCamp@itzamna.mx</span></td>
        </tr>
        <tr>
          <td><strong>Sala de Juntas Tabasco</strong></td>
          <td>Piso 1 - Oficinas Tabasco</td>
          <td><span class="code-email">SaladeJuntasTbc@itzamna.mx</span></td>
        </tr>
      </tbody>
    </table>

  </div>

</body>
</html>
`;

const htmlFilePath = path.join(__dirname, 'docs', 'manual_usuario_kiosk.html');
const pdfFilePath = path.join(__dirname, 'docs', 'Manual_Usuario_Kiosk_Salas_ITZ.pdf');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
console.log('1. HTML guardado en:', htmlFilePath);

// Buscar ejecutable de Edge o Chrome
const edgePaths = [
  'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
  'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
  'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe'
];

let browserPath = edgePaths.find(p => fs.existsSync(p));

if (!browserPath) {
  throw new Error('No se encontró navegador Chromium para exportar el PDF.');
}

console.log('2. Utilizando navegador:', browserPath);

const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfFilePath}`,
  `file:///${htmlFilePath.replace(/\\\\/g, '/')}`
];

execFileSync(browserPath, args);
console.log('3. PDF generado limpiamente sin cabeceras/pies de navegador en:', pdfFilePath);
