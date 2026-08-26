const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'rooms.json');

const DEFAULT_ROOMS = [
  {
    id: 'saladejuntascamp-itzamna-mx',
    email: 'SaladeJuntasCamp@itzamna.mx',
    name: 'Sala de Juntas Campeche',
    location: 'Piso 1 - Campeche'
  },
  {
    id: 'saladejuntasvsa-itzamna-mx',
    email: 'SalaDeJuntasVsa@itzamna.mx',
    name: 'Sala de Juntas Villahermosa',
    location: 'Piso 1 - Villahermosa'
  }
];

class RoomService {
  constructor() {
    this._ensureStorage();
  }

  _ensureStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_ROOMS, null, 2), 'utf-8');
      }
    } catch (error) {
      console.warn('[RoomService] No se pudo inicializar archivo en disco, usando memoria:', error.message);
    }
  }

  _generateId(email) {
    return email.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  getAllRooms() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (error) {
      console.error('[RoomService] Error al leer data/rooms.json:', error.message);
    }
    return DEFAULT_ROOMS;
  }

  getRoomById(id) {
    const rooms = this.getAllRooms();
    const searchId = (id || '').toString().toLowerCase().trim();
    return rooms.find(r => r.id.toLowerCase() === searchId || r.email.toLowerCase() === searchId) || null;
  }

  createRoom({ name, email, location }) {
    if (!name || !name.trim()) {
      throw new Error('El nombre de la sala es obligatorio');
    }
    if (!email || !email.trim() || !email.includes('@')) {
      throw new Error('El correo del buzón de Exchange es inválido');
    }

    const rooms = this.getAllRooms();
    const cleanEmail = email.trim();
    const cleanName = name.trim();
    const cleanLocation = (location || '').trim() || 'Oficinas ITZ';

    // Verificar si ya existe una sala con ese correo
    const exists = rooms.some(r => r.email.toLowerCase() === cleanEmail.toLowerCase());
    if (exists) {
      throw new Error(`Ya existe una sala registrada con el correo ${cleanEmail}`);
    }

    const newId = this._generateId(cleanEmail) || `room-${Date.now()}`;
    const newRoom = {
      id: newId,
      email: cleanEmail,
      name: cleanName,
      location: cleanLocation
    };

    rooms.push(newRoom);
    this._saveRooms(rooms);
    return newRoom;
  }

  updateRoom(id, { name, email, location }) {
    const rooms = this.getAllRooms();
    const searchId = (id || '').toString().toLowerCase().trim();
    const index = rooms.findIndex(r => r.id.toLowerCase() === searchId || r.email.toLowerCase() === searchId);

    if (index === -1) {
      throw new Error(`Sala no encontrada con ID "${id}"`);
    }

    const current = rooms[index];

    if (email && email.trim()) {
      const cleanEmail = email.trim();
      const duplicate = rooms.some((r, i) => i !== index && r.email.toLowerCase() === cleanEmail.toLowerCase());
      if (duplicate) {
        throw new Error(`El correo ${cleanEmail} ya está siendo usado por otra sala`);
      }
      current.email = cleanEmail;
      current.id = this._generateId(cleanEmail) || current.id;
    }

    if (name && name.trim()) {
      current.name = name.trim();
    }

    if (location !== undefined) {
      current.location = location.trim();
    }

    rooms[index] = current;
    this._saveRooms(rooms);
    return current;
  }

  deleteRoom(id) {
    const rooms = this.getAllRooms();
    const searchId = (id || '').toString().toLowerCase().trim();

    if (rooms.length <= 1) {
      throw new Error('No se puede eliminar la única sala registrada en el sistema');
    }

    const index = rooms.findIndex(r => r.id.toLowerCase() === searchId || r.email.toLowerCase() === searchId);
    if (index === -1) {
      throw new Error(`Sala no encontrada con ID "${id}"`);
    }

    const deletedRoom = rooms.splice(index, 1)[0];
    this._saveRooms(rooms);
    return deletedRoom;
  }

  _saveRooms(rooms) {
    try {
      this._ensureStorage();
      fs.writeFileSync(DATA_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
    } catch (error) {
      console.error('[RoomService] Error al persistir salas en disco:', error.message);
    }
  }
}

module.exports = RoomService;
