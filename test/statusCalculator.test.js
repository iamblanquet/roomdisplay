const assert = require('assert');
const { calculateRoomStatus } = require('../services/statusCalculator');

function runTests() {
  console.log('--- Iniciando pruebas de statusCalculator ---');

  const now = new Date('2026-08-25T14:00:00.000Z');
  const roomEmail = 'sala-juntas@empresa.com';
  const roomName = 'Sala Principal';

  // Caso 1: Sala completamente libre
  {
    const result = calculateRoomStatus([], roomEmail, roomName, now);
    assert.strictEqual(result.current_status, 'FREE', 'Caso 1: Estado debe ser FREE sin eventos');
    assert.strictEqual(result.current_meeting, null);
    assert.strictEqual(result.next_meetings.length, 0);
    console.log('✔ Caso 1 superado: Sala libre sin eventos');
  }

  // Caso 2: Reunión activa en este momento (OCCUPIED)
  {
    const events = [
      {
        subject: 'Comité de Dirección',
        organizer: { emailAddress: { name: 'Mauricio Blanquet' } },
        start: { dateTime: '2026-08-25T13:30:00.000Z' },
        end: { dateTime: '2026-08-25T14:30:00.000Z' }
      }
    ];
    const result = calculateRoomStatus(events, roomEmail, roomName, now);
    assert.strictEqual(result.current_status, 'OCCUPIED', 'Caso 2: Estado debe ser OCCUPIED');
    assert.strictEqual(result.current_meeting.title, 'Comité de Dirección');
    assert.strictEqual(result.current_meeting.organizer, 'Mauricio Blanquet');
    assert.strictEqual(result.current_meeting.minutes_remaining, 30, 'Deben restar 30 minutos');
    console.log('✔ Caso 2 superado: Sala ocupada con cálculo de minutos restantes');
  }

  // Caso 3: Próxima reunión en 5 minutos (UPCOMING)
  {
    const events = [
      {
        subject: 'Demo de Producto',
        organizer: { emailAddress: { name: 'Ana Gómez' } },
        start: { dateTime: '2026-08-25T14:05:00.000Z' },
        end: { dateTime: '2026-08-25T15:00:00.000Z' }
      }
    ];
    const result = calculateRoomStatus(events, roomEmail, roomName, now);
    assert.strictEqual(result.current_status, 'UPCOMING', 'Caso 3: Estado debe ser UPCOMING para <= 10 min');
    assert.strictEqual(result.upcoming_meeting.minutes_until_start, 5);
    console.log('✔ Caso 3 superado: Sala en estado próximo (<= 10 min)');
  }

  // Caso 4: Próxima reunión en 45 minutos (FREE con agenda futura)
  {
    const events = [
      {
        subject: 'Sprint Planning',
        organizer: { emailAddress: { name: 'Roberto Díaz' } },
        start: { dateTime: '2026-08-25T14:45:00.000Z' },
        end: { dateTime: '2026-08-25T15:45:00.000Z' }
      }
    ];
    const result = calculateRoomStatus(events, roomEmail, roomName, now);
    assert.strictEqual(result.current_status, 'FREE', 'Caso 4: Estado debe ser FREE para > 10 min');
    assert.strictEqual(result.next_meetings.length, 1);
    assert.strictEqual(result.next_meetings[0].minutes_until_start, 45);
    console.log('✔ Caso 4 superado: Sala libre con reunión futura a más de 10 min');
  }

  console.log('--- Todas las pruebas pasaron satisfactoriamente ---');
}

runTests();
