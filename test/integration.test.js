const assert = require('assert');
const express = require('express');
const CacheService = require('../services/cacheService');
const GraphService = require('../services/graphService');
const { calculateRoomStatus } = require('../services/statusCalculator');

async function runIntegrationTests() {
  console.log('--- Iniciando pruebas de Integración y API ---');

  // Configurar app de pruebas en puerto 3099
  const app = express();
  const PORT = 3099;
  const cacheService = new CacheService(60);
  const graphService = new GraphService();

  app.use(express.json());

  app.get('/api/status', async (req, res) => {
    try {
      const roomEmail = (req.query.room || 'sala-juntas@empresa.com').trim();
      const scenario = req.query.scenario || null;
      const forceRefresh = req.query.refresh === 'true';
      const cacheKey = `room_status_${roomEmail}_${scenario || 'default'}`;

      if (!forceRefresh && !scenario) {
        const cached = cacheService.get(cacheKey);
        if (cached) {
          return res.json({ ...cached, _from_cache: true });
        }
      }

      const events = await graphService.getRoomCalendarView(roomEmail, null, null, scenario);
      const statusPayload = calculateRoomStatus(events, roomEmail, 'Sala de Juntas', new Date());
      statusPayload.is_mock = true;
      statusPayload.cache_ttl_seconds = 60;

      if (!scenario) {
        cacheService.set(cacheKey, statusPayload, 60);
      }

      return res.json({ ...statusPayload, _from_cache: false });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/book', async (req, res) => {
    try {
      const { room, title, durationMinutes, organizer } = req.body;
      const event = await graphService.createQuickBooking(room || 'sala-juntas@empresa.com', {
        title,
        durationMinutes,
        organizer
      });
      return res.status(201).json({ success: true, event });
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.code || 'BOOKING_FAILED', message: err.message, conflict: err.conflictEvent });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'UP', demo_mode: true });
  });

  app.get('/api/rooms', (req, res) => {
    res.json({ rooms: [{ email: 'sala-juntas@empresa.com', name: 'Sala Principal', capacity: 12 }] });
  });

  const server = app.listen(PORT, async () => {
    try {
      // 1. Probar Healthcheck
      const resHealth = await fetch(`http://localhost:${PORT}/api/health`);
      const healthData = await resHealth.json();
      assert.strictEqual(healthData.status, 'UP');
      console.log('✔ GET /api/health: OK');

      // 2. Probar GET /api/status (Escenario Occupied)
      const resOcc = await fetch(`http://localhost:${PORT}/api/status?scenario=occupied`);
      const dataOcc = await resOcc.json();
      assert.strictEqual(dataOcc.current_status, 'OCCUPIED');
      assert.ok(dataOcc.current_meeting, 'Debe incluir current_meeting');
      assert.ok(dataOcc.current_meeting.title);
      assert.ok(dataOcc.current_meeting.minutes_remaining > 0);
      console.log('✔ GET /api/status?scenario=occupied: OK (OCCUPIED)');

      // 3. Probar GET /api/status (Escenario Upcoming)
      const resUpc = await fetch(`http://localhost:${PORT}/api/status?scenario=upcoming`);
      const dataUpc = await resUpc.json();
      assert.strictEqual(dataUpc.current_status, 'UPCOMING');
      assert.ok(dataUpc.upcoming_meeting);
      assert.ok(dataUpc.upcoming_meeting.minutes_until_start <= 10);
      console.log('✔ GET /api/status?scenario=upcoming: OK (UPCOMING)');

      // 4. Probar GET /api/status (Escenario Free)
      const resFree = await fetch(`http://localhost:${PORT}/api/status?scenario=free`);
      const dataFree = await resFree.json();
      assert.strictEqual(dataFree.current_status, 'FREE');
      console.log('✔ GET /api/status?scenario=free: OK (FREE)');

      // 5. Probar Caché en memoria (llamadas repetidas)
      const resCache1 = await fetch(`http://localhost:${PORT}/api/status?room=test-cache@empresa.com`);
      const dataCache1 = await resCache1.json();
      assert.strictEqual(dataCache1._from_cache, false);

      const resCache2 = await fetch(`http://localhost:${PORT}/api/status?room=test-cache@empresa.com`);
      const dataCache2 = await resCache2.json();
      assert.strictEqual(dataCache2._from_cache, true, 'La segunda llamada debe venir del caché');
      console.log('✔ Caché en memoria con TTL: OK (Hit comprobado)');

      // 6. Probar POST /api/book (Reserva Rápida Exitosa en sala libre)
      const freeRoomEmail = 'sala-disponible@itzamna.mx';
      // Asignar eventos vacíos en la tienda simulada
      graphService.mockEventsStore.set(freeRoomEmail, []);
      
      const resBook = await fetch(`http://localhost:${PORT}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: freeRoomEmail,
          title: 'Sesión de Prueba de Kiosk',
          durationMinutes: 15,
          organizer: 'Tablet Administrador'
        })
      });
      const dataBook = await resBook.json();
      assert.strictEqual(dataBook.success, true);
      assert.strictEqual(dataBook.event.subject, 'Sesión de Prueba de Kiosk');
      console.log('✔ POST /api/book: OK (Reserva rápida creada con éxito)');

      // 7. Probar POST /api/book con Conflicto de Horario (Debe rechazar con 409)
      const resConflict = await fetch(`http://localhost:${PORT}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: freeRoomEmail, // Misma sala con evento recién creado
          title: 'Intento de Sobre-reserva Solapada',
          durationMinutes: 30,
          organizer: 'Usuario No Autorizado'
        })
      });
      const dataConflict = await resConflict.json();
      assert.strictEqual(resConflict.status, 409, 'Debe retornar status 409 Conflict');
      assert.strictEqual(dataConflict.error, 'SCHEDULE_CONFLICT');
      console.log('✔ POST /api/book con conflicto: OK (409 SCHEDULE_CONFLICT rechazado correctamente)');

      console.log('\n--- Todas las pruebas de integración pasaron con éxito ---');
      server.close();
    } catch (err) {
      console.error('❌ Error en pruebas:', err);
      server.close();
      process.exitCode = 1;
    }
  });
}

runIntegrationTests();
