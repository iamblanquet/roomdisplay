require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const CacheService = require('./services/cacheService');
const GraphService = require('./services/graphService');
const { calculateRoomStatus } = require('./services/statusCalculator');

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 15;
const DEFAULT_ROOM_EMAIL = process.env.DEFAULT_ROOM_EMAIL || 'SaladeJuntasCamp@itzamna.mx';
const DEFAULT_ROOM_NAME = process.env.DEFAULT_ROOM_NAME || 'Sala de Juntas Campeche';

// Inicializar servicios
const cacheService = new CacheService(CACHE_TTL_SECONDS);
const graphService = new GraphService();
const RoomService = require('./services/roomService');
const roomService = new RoomService();

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
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

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
 * ==========================================
 * RUTAS CRUD DE SALAS (/api/rooms)
 * ==========================================
 */

/**
 * GET /api/rooms
 * Retorna la lista completa de salas disponibles
 */
app.get('/api/rooms', (req, res) => {
  try {
    const rooms = roomService.getAllRooms();
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar salas', message: error.message });
  }
});

/**
 * POST /api/rooms
 * Registra una nueva sala
 */
app.post('/api/rooms', (req, res) => {
  try {
    const { name, email, capacity, location } = req.body;
    const room = roomService.createRoom({ name, email, capacity, location });
    res.status(201).json({
      success: true,
      message: 'Sala creada exitosamente',
      room
    });
  } catch (error) {
    res.status(400).json({ error: 'ROOM_CREATE_FAILED', message: error.message });
  }
});

/**
 * PUT /api/rooms/:id
 * Modifica una sala existente
 */
app.put('/api/rooms/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, capacity, location } = req.body;
    const room = roomService.updateRoom(id, { name, email, capacity, location });
    res.json({
      success: true,
      message: 'Sala actualizada exitosamente',
      room
    });
  } catch (error) {
    res.status(400).json({ error: 'ROOM_UPDATE_FAILED', message: error.message });
  }
});

/**
 * DELETE /api/rooms/:id
 * Elimina una sala existente
 */
app.delete('/api/rooms/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deletedRoom = roomService.deleteRoom(id);
    res.json({
      success: true,
      message: `Sala "${deletedRoom.name}" eliminada exitosamente`,
      room: deletedRoom
    });
  } catch (error) {
    res.status(400).json({ error: 'ROOM_DELETE_FAILED', message: error.message });
  }
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
