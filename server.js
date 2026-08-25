require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const CacheService = require('./services/cacheService');
const GraphService = require('./services/graphService');
const { calculateRoomStatus } = require('./services/statusCalculator');

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 60;
const DEFAULT_ROOM_EMAIL = process.env.DEFAULT_ROOM_EMAIL || 'SaladeJuntasCamp@itzamna.mx';
const DEFAULT_ROOM_NAME = process.env.DEFAULT_ROOM_NAME || 'Sala de Juntas Campeche';

// Inicializar servicios
const cacheService = new CacheService(CACHE_TTL_SECONDS);
const graphService = new GraphService();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * GET /api/status
 * Consulta el estado en tiempo real de una sala de Exchange Online
 * Parámetros query:
 *  - room: correo del buzón de la sala (opcional, usa DEFAULT_ROOM_EMAIL)
 *  - scenario: 'occupied' | 'upcoming' | 'free' para pruebas interactivas en modo demo
 *  - refresh: 'true' para ignorar la caché
 */
app.get('/api/status', async (req, res) => {
  try {
    const roomEmail = (req.query.room || DEFAULT_ROOM_EMAIL).trim();
    const scenario = req.query.scenario || null;
    const forceRefresh = req.query.refresh === 'true';

    const cacheKey = `room_status_${roomEmail}_${scenario || 'default'}`;

    // Verificar caché en memoria si no se fuerza el refresco ni es escenario específico
    if (!forceRefresh && !scenario) {
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return res.json({
          ...cached,
          _from_cache: true
        });
      }
    }

    // Consultar eventos desde Microsoft Graph o Mock
    const events = await graphService.getRoomCalendarView(roomEmail, null, null, scenario);

    const customRoomName = req.query.room_name || (roomEmail === DEFAULT_ROOM_EMAIL ? DEFAULT_ROOM_NAME : null);

    // Calcular estado en tiempo real
    const statusPayload = calculateRoomStatus(
      events,
      roomEmail,
      customRoomName,
      new Date()
    );

    // Adjuntar metadatos útiles
    statusPayload.is_mock = graphService.isDemoMode || Boolean(scenario);
    statusPayload.cache_ttl_seconds = CACHE_TTL_SECONDS;

    // Guardar en caché solo para consultas normales
    if (!scenario) {
      cacheService.set(cacheKey, statusPayload, CACHE_TTL_SECONDS);
    }

    return res.json({
      ...statusPayload,
      _from_cache: false
    });
  } catch (error) {
    console.error('[API /api/status] Error:', error.message);
    return res.status(500).json({
      error: 'Error al consultar disponibilidad de la sala',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/book
 * Permite reservar la sala inmediatamente desde la tablet (Ad-hoc Quick Booking)
 */
app.post('/api/book', async (req, res) => {
  try {
    const { room, title, durationMinutes, organizer } = req.body;
    const targetRoom = (room || DEFAULT_ROOM_EMAIL).trim();
    const duration = parseInt(durationMinutes, 10) || 30;

    const event = await graphService.createQuickBooking(targetRoom, {
      title: title || 'Reserva Rápida - Kiosk',
      durationMinutes: duration,
      organizer: organizer || 'Tablet Kiosk'
    });

    // Invalidar caché de la sala para que el próximo sondeo refleje el nuevo evento de inmediato
    cacheService.delete(`room_status_${targetRoom}_default`);

    return res.status(201).json({
      success: true,
      message: `Sala reservada con éxito por ${duration} minutos`,
      event
    });
  } catch (error) {
    console.error('[API /api/book] Error:', error.message);
    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      error: error.code || 'BOOKING_FAILED',
      message: error.message,
      conflict: error.conflictEvent || null
    });
  }
});

/**
 * GET /api/rooms
 * Lista salas preconfiguradas para selector rápido en tablets
 */
app.get('/api/rooms', (req, res) => {
  let rooms = [];
  if (process.env.ROOMS_CONFIG) {
    try {
      rooms = JSON.parse(process.env.ROOMS_CONFIG);
    } catch (e) {
      console.warn('[Rooms] Error al parsear ROOMS_CONFIG, usando lista por defecto');
    }
  }

  if (!rooms || rooms.length === 0) {
    rooms = [
      { email: DEFAULT_ROOM_EMAIL, name: DEFAULT_ROOM_NAME, capacity: 10, location: 'Piso 1 - Campeche' },
      { email: 'SalaMerida@itzamna.mx', name: 'Sala de Juntas Mérida', capacity: 14, location: 'Piso 2 - Mérida' },
      { email: 'SalaCancun@itzamna.mx', name: 'Sala Ejecutiva Cancún', capacity: 8, location: 'Piso 1 - Cancún' }
    ];
  }

  res.json({ rooms });
});

/**
 * GET /api/health
 * Estado del servicio
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    server_time: new Date().toISOString(),
    demo_mode: graphService.isDemoMode,
    cache_ttl_seconds: CACHE_TTL_SECONDS,
    default_room: DEFAULT_ROOM_EMAIL
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(` Room Display Kiosk activo en http://localhost:${PORT}`);
  console.log(` Modo Demo: ${graphService.isDemoMode ? 'ACTIVADO (Simulación)' : 'DESACTIVADO (Conectado a Entra ID / Exchange)'}`);
  console.log(` Sala por defecto: ${DEFAULT_ROOM_EMAIL} (${DEFAULT_ROOM_NAME})`);
  console.log(` TTL de Caché: ${CACHE_TTL_SECONDS}s`);
  console.log('====================================================');
});
