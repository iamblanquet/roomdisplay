const assert = require('assert');
const RoomService = require('../services/roomService');

console.log('--- Iniciando pruebas de RoomService (CRUD) ---');

const roomService = new RoomService();

// 1. Obtener salas
const initialRooms = roomService.getAllRooms();
assert(Array.isArray(initialRooms), 'Debe retornar un arreglo');
assert(initialRooms.length >= 1, 'Debe tener al menos una sala configurada');
console.log('✔ Caso 1: Obtener salas iniciales (READ)');

// 2. Crear nueva sala
const testEmail = `sala.testing.${Date.now()}@itzamna.mx`;
const created = roomService.createRoom({
  name: 'Sala de Pruebas Automatizadas',
  email: testEmail,
  location: 'Piso 3 - Test Lab'
});

assert.strictEqual(created.email, testEmail);
assert.strictEqual(created.name, 'Sala de Pruebas Automatizadas');
console.log('✔ Caso 2: Crear nueva sala (CREATE)');

// 3. Modificar sala
const updated = roomService.updateRoom(created.id, {
  name: 'Sala de Pruebas Renombrada',
  location: 'Piso 3 - Sala Ejecutiva'
});

assert.strictEqual(updated.name, 'Sala de Pruebas Renombrada');
assert.strictEqual(updated.location, 'Piso 3 - Sala Ejecutiva');
console.log('✔ Caso 3: Modificar sala existente (UPDATE)');

// 4. Eliminar sala
const deleted = roomService.deleteRoom(created.id);
assert.strictEqual(deleted.id, created.id);
assert(!roomService.getAllRooms().some(r => r.id === created.id), 'La sala no debe existir tras eliminación');
console.log('✔ Caso 4: Eliminar sala (DELETE)');

// 5. Validaciones y rechazo de duplicados
assert.throws(() => {
  roomService.createRoom({ name: '', email: 'invalido' });
}, /nombre de la sala es obligatorio|correo/);
console.log('✔ Caso 5: Validaciones de campos obligatorios');

console.log('--- Todas las pruebas de RoomService CRUD pasaron exitosamente ---');
