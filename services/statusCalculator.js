/**
 * Calcula el estado de disponibilidad en tiempo real de una sala de Exchange
 * basándose en la lista de eventos de Microsoft Graph.
 *
 * Estados posibles:
 * - 'OCCUPIED' (Rojo): Hay una reunión en curso (start <= now < end).
 * - 'UPCOMING' (Amarillo): La próxima reunión inicia en <= 10 minutos.
 * - 'FREE' (Verde): Sala disponible (sin reunión actual ni en los próximos 10 minutos).
 */

function parseGraphDate(val) {
  if (!val) return new Date();
  if (typeof val === 'object' && val.dateTime) {
    val = val.dateTime;
  }
  if (typeof val === 'string') {
    // Si la cadena no contiene 'Z' ni offset (+/-HH:MM), asumir UTC de Microsoft Graph
    if (!val.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(val)) {
      return new Date(val + 'Z');
    }
    return new Date(val);
  }
  return new Date(val);
}

function calculateRoomStatus(events = [], roomEmail, roomName = null, referenceDate = new Date()) {
  const now = new Date(referenceDate);
  const nowMs = now.getTime();

  // Normalizar y ordenar eventos cronológicamente
  const normalizedEvents = events
    .map(evt => {
      const startTime = parseGraphDate(evt.start?.dateTime || evt.start_time || evt.start);
      const endTime = parseGraphDate(evt.end?.dateTime || evt.end_time || evt.end);
      const organizer = evt.organizer?.emailAddress?.name || evt.organizer?.name || evt.organizer || 'Organizador no especificado';
      const title = evt.subject || evt.title || '(Sin título)';

      return {
        id: evt.id || Math.random().toString(36).substring(2),
        title,
        organizer,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        _startMs: startTime.getTime(),
        _endMs: endTime.getTime()
      };
    })
    .sort((a, b) => a._startMs - b._startMs);

  // Buscar si hay reunión activa en este instante
  const activeEvent = normalizedEvents.find(e => e._startMs <= nowMs && nowMs < e._endMs);

  // Filtrar eventos futuros que aún no han comenzado
  const futureEvents = normalizedEvents
    .filter(e => e._startMs > nowMs)
    .map(e => ({
      id: e.id,
      title: e.title,
      organizer: e.organizer,
      start_time: e.start_time,
      end_time: e.end_time,
      minutes_until_start: Math.max(1, Math.ceil((e._startMs - nowMs) / 60000))
    }));

  let current_status = 'FREE';
  let current_meeting = null;
  let upcoming_meeting = null;

  if (activeEvent) {
    current_status = 'OCCUPIED';
    const minutesRemaining = Math.max(1, Math.ceil((activeEvent._endMs - nowMs) / 60000));
    current_meeting = {
      id: activeEvent.id,
      title: activeEvent.title,
      organizer: activeEvent.organizer,
      start_time: activeEvent.start_time,
      end_time: activeEvent.end_time,
      minutes_remaining: minutesRemaining
    };
  } else if (futureEvents.length > 0) {
    const nextEvent = futureEvents[0];
    if (nextEvent.minutes_until_start <= 10) {
      current_status = 'UPCOMING';
      upcoming_meeting = nextEvent;
    }
  }

  return {
    room: roomEmail,
    room_name: roomName || roomEmail.split('@')[0].replace(/[._-]/g, ' ').toUpperCase(),
    timestamp: now.toISOString(),
    current_status,
    current_meeting,
    upcoming_meeting,
    next_meetings: futureEvents
  };
}

module.exports = {
  calculateRoomStatus
};
