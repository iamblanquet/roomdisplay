const msal = require('@azure/msal-node');

/**
 * Servicio para interactuar con Microsoft Graph API y buzones de Exchange Online.
 * Implementa el flujo OAuth 2.0 Client Credentials Grant.
 */
class GraphService {
  constructor(config = {}) {
    this.tenantId = config.tenantId || process.env.AZURE_TENANT_ID;
    this.clientId = config.clientId || process.env.AZURE_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.AZURE_CLIENT_SECRET;
    this.timeZone = config.timeZone || process.env.TIMEZONE || 'America/Mexico_City';
    this.isDemoMode = (process.env.DEMO_MODE === 'true') || (!this.tenantId || !this.clientId || !this.clientSecret);

    // Almacén en memoria de reservas para modo demo
    this.mockEventsStore = new Map();

    this.cca = null;
    if (!this.isDemoMode && this.tenantId && this.clientId && this.clientSecret) {
      this.initMsalClient();
    }
  }

  /**
   * Inicializa el cliente confidencial de MSAL
   */
  initMsalClient() {
    const msalConfig = {
      auth: {
        clientId: this.clientId,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
        clientSecret: this.clientSecret
      }
    };
    this.cca = new msal.ConfidentialClientApplication(msalConfig);
  }

  /**
   * Obtiene un token de acceso OAuth 2.0 para Microsoft Graph
   */
  async getAccessToken() {
    if (this.isDemoMode) {
      return 'MOCK_ACCESS_TOKEN';
    }

    if (!this.cca) {
      this.initMsalClient();
    }

    const clientCredentialRequest = {
      scopes: ['https://graph.microsoft.com/.default']
    };

    try {
      const response = await this.cca.acquireTokenByClientCredential(clientCredentialRequest);
      if (!response || !response.accessToken) {
        throw new Error('No se pudo obtener el token de acceso de Microsoft Entra ID');
      }
      return response.accessToken;
    } catch (error) {
      console.error('[GraphService] Error al adquirir token de Entra ID:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene la vista de calendario de un buzón de sala de Exchange Online (/calendarView)
   * @param {string} roomEmail Correo del buzón de recursos de Exchange
   * @param {Date} [startDateTime]
   * @param {Date} [endDateTime]
   * @param {string} [scenario] 'occupied' | 'upcoming' | 'free' | 'busy_day' para pruebas
   */
  async getRoomCalendarView(roomEmail, startDateTime, endDateTime, scenario = null) {
    // Si estamos en modo demo o no hay credenciales, retornamos eventos simulados realistas
    if (this.isDemoMode || scenario) {
      return this.generateMockEvents(roomEmail, scenario);
    }

    const token = await this.getAccessToken();

    // Rango de consulta: inicio del día actual a fin del día actual (o 24 horas)
    const now = new Date();
    const start = startDateTime ? new Date(startDateTime) : new Date(now.setHours(0, 0, 0, 0));
    const end = endDateTime ? new Date(endDateTime) : new Date(now.setHours(23, 59, 59, 999));

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/calendarView` +
      `?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}` +
      `&$orderby=start/dateTime&$top=50&$select=id,subject,organizer,start,end,location,isAllDay,showAs`;

    try {
      const response = await fetch(graphUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Prefer': `outlook.timezone="${this.timeZone}"`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GraphService] Error en Graph API (${response.status}):`, errorText);
        throw new Error(`Microsoft Graph API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('[GraphService] Error al consultar calendario de Exchange:', error.message);
      throw error;
    }
  }

  /**
   * Crea una reserva rápida directa en el buzón de la sala previa validación de disponibilidad
   */
  async createQuickBooking(roomEmail, { title = 'Reserva Rápida - Kiosk', durationMinutes = 30, organizer = 'Tablet Kiosk' }) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now.getTime() + durationMinutes * 60000);
    const reqStartMs = start.getTime();
    const reqEndMs = end.getTime();

    // 1. Obtener eventos actuales de la sala
    const currentEvents = await this.getRoomCalendarView(roomEmail);

    // 2. Comprobar si existe solapamiento con alguna reunión existente
    for (const evt of currentEvents) {
      const evtStart = new Date(evt.start?.dateTime || evt.start_time || evt.start).getTime();
      const evtEnd = new Date(evt.end?.dateTime || evt.end_time || evt.end).getTime();

      // Condición estricta de colisión horaria: (StartA < EndB) y (EndA > StartB)
      if (reqStartMs < evtEnd && reqEndMs > evtStart) {
        const evtTitle = evt.subject || evt.title || 'Reunión agendada';
        const startStr = new Date(evtStart).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
        const endStr = new Date(evtEnd).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
        const organizerName = evt.organizer?.emailAddress?.name || evt.organizer?.name || 'Organizador';

        const conflictError = new Error(`La sala no está disponible: Ya existe una reunión agendada ("${evtTitle}" por ${organizerName}) de ${startStr} a ${endStr}.`);
        conflictError.status = 409;
        conflictError.code = 'SCHEDULE_CONFLICT';
        conflictError.conflictEvent = {
          title: evtTitle,
          organizer: organizerName,
          start: new Date(evtStart).toISOString(),
          end: new Date(evtEnd).toISOString(),
          startFormatted: startStr,
          endFormatted: endStr
        };
        throw conflictError;
      }
    }

    // 3. Crear el evento si el horario está 100% libre
    if (this.isDemoMode) {
      const newEvent = {
        id: `mock-event-${Date.now()}`,
        subject: title,
        organizer: { emailAddress: { name: organizer } },
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() }
      };

      const existing = this.mockEventsStore.get(roomEmail) || [];
      existing.push(newEvent);
      this.mockEventsStore.set(roomEmail, existing);

      return newEvent;
    }

    const token = await this.getAccessToken();
    const eventPayload = {
      subject: title,
      start: {
        dateTime: start.toISOString(),
        timeZone: this.timeZone
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: this.timeZone
      },
      location: {
        displayName: roomEmail
      }
    };

    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error al crear reserva en Exchange: ${err}`);
    }

    return await response.json();
  }

  /**
   * Genera eventos de calendario simulados relativos a la hora actual
   */
  generateMockEvents(roomEmail, scenario = null) {
    const now = new Date();

    if (scenario === 'occupied') {
      // Reunión activa: empezó hace 15 min, termina en 45 min
      return [
        {
          id: 'demo-1',
          subject: 'Reunión de Estrategia Trimestral',
          organizer: { emailAddress: { name: 'Mauricio Blanquet' } },
          start: { dateTime: new Date(now.getTime() - 15 * 60000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 45 * 60000).toISOString() }
        },
        {
          id: 'demo-2',
          subject: 'Revisión de Arquitectura Cloud',
          organizer: { emailAddress: { name: 'Ana Gómez' } },
          start: { dateTime: new Date(now.getTime() + 60 * 60000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 120 * 60000).toISOString() }
        }
      ];
    }

    if (scenario === 'upcoming') {
      // Próxima reunión en 7 minutos
      return [
        {
          id: 'demo-upcoming-1',
          subject: 'Sync Diario de Desarrollo',
          organizer: { emailAddress: { name: 'Carlos Morales' } },
          start: { dateTime: new Date(now.getTime() + 7 * 60000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 37 * 60000).toISOString() }
        },
        {
          id: 'demo-upcoming-2',
          subject: 'Entrevista de Candidato',
          organizer: { emailAddress: { name: 'Recursos Humanos' } },
          start: { dateTime: new Date(now.getTime() + 60 * 60000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 110 * 60000).toISOString() }
        }
      ];
    }

    if (scenario === 'free') {
      // Libre por el resto del día o próxima reunión en 3 horas
      return [
        {
          id: 'demo-free-1',
          subject: 'Sesión de Cierre Semanal',
          organizer: { emailAddress: { name: 'Dirección General' } },
          start: { dateTime: new Date(now.getTime() + 180 * 60000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 240 * 60000).toISOString() }
        }
      ];
    }

    // Si la sala tiene eventos explícitamente asignados en el almacén en memoria
    if (this.mockEventsStore.has(roomEmail)) {
      return this.mockEventsStore.get(roomEmail) || [];
    }

    // Escenario por defecto dinámico: Reunión actual en progreso
    return [
      {
        id: 'demo-def-1',
        subject: 'Comité Operativo & TI',
        organizer: { emailAddress: { name: 'Mauricio Blanquet' } },
        start: { dateTime: new Date(now.getTime() - 10 * 60000).toISOString() },
        end: { dateTime: new Date(now.getTime() + 35 * 60000).toISOString() }
      },
      {
        id: 'demo-def-2',
        subject: 'Revisión de Seguridad & Cumplimiento',
        organizer: { emailAddress: { name: 'Ana Gómez' } },
        start: { dateTime: new Date(now.getTime() + 50 * 60000).toISOString() },
        end: { dateTime: new Date(now.getTime() + 110 * 60000).toISOString() }
      },
      {
        id: 'demo-def-3',
        subject: 'Demostración de Nuevas Funcionalidades',
        organizer: { emailAddress: { name: 'Roberto Díaz' } },
        start: { dateTime: new Date(now.getTime() + 130 * 60000).toISOString() },
        end: { dateTime: new Date(now.getTime() + 180 * 60000).toISOString() }
      }
    ];
  }
}

module.exports = GraphService;
