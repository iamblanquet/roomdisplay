# 📅 Guía de Usuario: Cómo Reservar la Sala de Juntas desde Microsoft Teams y Outlook
### Sala: Sala de Juntas Campeche (`SaladeJuntasCamp@itzamna.mx`) — Organización: itzamna.mx

Esta guía explica a cualquier miembro del equipo cómo agendar y apartar la **Sala de Juntas Campeche** directamente desde **Microsoft Teams** y **Outlook**, reflejándose automáticamente en la pantalla de la tablet en la entrada de la sala.

---

## 📌 Datos de la Sala
* **Nombre de la Sala:** `Sala de Juntas Campeche`
* **Correo del Recurso:** `SaladeJuntasCamp@itzamna.mx`
* **Capacidad:** 10 personas
* **Ubicación:** Oficinas itzamna.mx

---

## 💻 1. Cómo Reservar desde Microsoft Teams (PC, Web o Móvil)

### Método A: Agregando la Sala en "Ubicación" (Recomendado)
1. Abre **Microsoft Teams**.
2. En la barra lateral izquierda, entra a **Calendario**.
3. Haz clic en el botón superior **`+ Nueva reunión`**.
4. Escribe el **Título de la reunión** y define la fecha y rango de horario.
5. En el campo **"Agregar ubicación"** (o *"Buscar una sala"*):
   * Empieza a teclear: **`Sala de Juntas Campeche`** (o `SaladeJuntasCamp@itzamna.mx`).
   * Selecciónala de la lista desplegable.
6. Agrega a los compañeros que asistirán en *"Agregar asistentes obligatorios"*.
7. Haz clic en **Enviar / Guardar**.

---

### Método B: Usando el "Asistente de Programación" (Sin Empalmes)
Si necesitas verificar antes qué horarios están libres tanto de las personas como de la sala:
1. Al crear la reunión en Teams, haz clic en la pestaña superior **Asistente de programación** (*Scheduling Assistant*).
2. Haz clic en **`+ Agregar sala`** y selecciona **Sala de Juntas Campeche**.
3. Verás una cuadrícula visual:
   * 🟩 **Espacio en blanco / Verde:** Sala y asistentes libres.
   * 🟥 **Espacio sombreado:** Sala ocupada por otra reunión.
4. Selecciona con el cursor el bloque de horario disponible.
5. Regresa a la pestaña *Detalles* y haz clic en **Enviar**.

---

### Método C: Invitando a la Sala como Asistente
1. En la ventana de nueva reunión de Teams, en el campo **"Agregar asistentes obligatorios"**:
2. Escribe directamente: `SaladeJuntasCamp@itzamna.mx`.
3. Haz clic en **Enviar**.

---

## 📧 2. Cómo Reservar desde Microsoft Outlook (PC, Web o App Móvil)

1. Abre **Outlook** y ve a tu **Calendario**.
2. Haz clic en **`Nueva reunión`** o haz doble clic sobre la hora deseada.
3. En el campo **Ubicación** / **Salas**:
   * Selecciona **`Sala de Juntas Campeche`** del buscador de salas.
4. Invita a los participantes y haz clic en **Enviar**.

---

## ⚡ 3. ¿Qué ocurre automáticamente tras enviar la invitación?

```
┌───────────────────────────┐
│ Usuario agenda en Teams   │
└─────────────┬─────────────┘
              │ 1. Envía invitación con Sala Campeche
              ▼
┌───────────────────────────┐
│  Exchange Online Auto     │ ──> Si está libre: Responde "Aceptada" por correo
│ (Set-CalendarProcessing)  │ ──> Si está ocupada: Rechaza por empalme
└─────────────┬─────────────┘
              │ 2. Sincronización silenciosa (≤ 30s)
              ▼
┌───────────────────────────┐
│   Tablet Kiosk Exterior   │
│   (Sala de Juntas)        │ ──> Cambia a 🔴 OCUPADO / 🟡 PRÓXIMO / Actualiza Agenda
└───────────────────────────┘
```

1. **Confirmación por Correo:** En segundos, el organizador recibe un correo automático de Exchange confirmando:
   > *"Sala de Juntas Campeche ha aceptado esta reunión."*
2. **Prevención de Conflictos:** Si otra persona intenta apartar la sala en el mismo horario, Exchange rechazará la solicitud automáticamente avisando que la sala ya está reservada.
3. **Actualización en la Tablet (30 a 60 seg):**
   * Si la reunión es para **este momento**: La tablet afuera de la sala cambia de inmediato a **🔴 Rojo (SALA OCUPADA)** con el asunto, organizador y cuenta regresiva.
   * Si la reunión es para **más tarde**: Aparece automáticamente en el panel de **Agenda de Hoy** de la tablet.

---

## 🔄 4. Modificaciones y Cancelaciones

* **Si cambias la hora o fecha de la reunión en Teams:** La tablet reacomoda el evento en la agenda automáticamente.
* **Si cancelas o eliminas la reunión en Teams:** El buzón de la sala se libera al instante y la tablet regresa a **🟢 Verde (SALA LIBRE)**.
