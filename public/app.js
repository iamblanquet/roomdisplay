/**
 * ITZ OIL & GAS - Room Display Kiosk
 * Motor de Sincronización Automática & Renderizado Dinámico (Modo Día / Noche)
 */

const state = {
  roomEmail: 'SaladeJuntasCamp@itzamna.mx',
  roomName: 'Sala de Juntas Campeche',
  capacity: '10',
  currentStatus: 'FREE',
  currentMeeting: null,
  upcomingMeeting: null,
  nextMeetings: [],
  selectedDuration: 30,
  activeScenario: null,
  themeMode: 'auto', // 'auto' | 'light' | 'dark'
  pollIntervalMs: 10000,
  pollTimer: null,
  clockTimer: null,
  isOffline: false,
  // PWA & Push Notifications State
  deferredPwaPrompt: null,
  pushEnabled: localStorage.getItem('kiosk_push_enabled') === 'true',
  lastNotifiedStatus: null,
  lastNotifiedMeetingId: null
};

const elements = {
  bodyRoot: document.getElementById('bodyRoot'),
  metaThemeColor: document.getElementById('metaThemeColor'),
  roomNameDisplay: document.getElementById('roomNameDisplay'),
  roomEmailDisplay: document.getElementById('roomEmailDisplay'),
  digitalClock: document.getElementById('digitalClock'),
  dateDisplay: document.getElementById('dateDisplay'),
  statusCardHero: document.getElementById('statusCardHero'),
  statusTopBarAccent: document.getElementById('statusTopBarAccent'),
  statusIndicatorDot: document.getElementById('statusIndicatorDot'),
  statusMainBadge: document.getElementById('statusMainBadge'),
  statusBadgeContainer: document.getElementById('statusBadgeContainer'),
  liveCountdownBadge: document.getElementById('liveCountdownBadge'),
  liveCountdownText: document.getElementById('liveCountdownText'),
  stateViewFree: document.getElementById('stateViewFree'),
  freeAvailabilitySubtitle: document.getElementById('freeAvailabilitySubtitle'),
  stateViewUpcoming: document.getElementById('stateViewUpcoming'),
  upcomingTitle: document.getElementById('upcomingTitle'),
  upcomingOrganizer: document.getElementById('upcomingOrganizer'),
  upcomingWarningBox: document.getElementById('upcomingWarningBox'),
  upcomingWarningText: document.getElementById('upcomingWarningText'),
  stateViewOccupied: document.getElementById('stateViewOccupied'),
  occupiedTitle: document.getElementById('occupiedTitle'),
  occupiedOrganizer: document.getElementById('occupiedOrganizer'),
  occupiedTimeRange: document.getElementById('occupiedTimeRange'),
  meetingStartTimeText: document.getElementById('meetingStartTimeText'),
  meetingEndTimeText: document.getElementById('meetingEndTimeText'),
  meetingRemainingCountdown: document.getElementById('meetingRemainingCountdown'),
  meetingProgressBar: document.getElementById('meetingProgressBar'),
  agendaListContainer: document.getElementById('agendaListContainer'),
  agendaEmptyState: document.getElementById('agendaEmptyState'),
  meetingsCountBadge: document.getElementById('meetingsCountBadge'),
  connectionDot: document.getElementById('connectionDot'),
  connectionStatusText: document.getElementById('connectionStatusText'),
  cacheBadge: document.getElementById('cacheBadge'),
  demoModeIndicator: document.getElementById('demoModeIndicator'),
  themeIndicatorBadge: document.getElementById('themeIndicatorBadge'),
  lastPollTime: document.getElementById('lastPollTime'),
  modalBooking: document.getElementById('modalBooking'),
  modalSettings: document.getElementById('modalSettings'),
  inputBookingTitle: document.getElementById('inputBookingTitle'),
  inputBookingOrganizer: document.getElementById('inputBookingOrganizer'),
  inputRoomName: document.getElementById('inputRoomName'),
  inputRoomEmail: document.getElementById('inputRoomEmail'),
  inputRoomCapacity: document.getElementById('inputRoomCapacity'),
  selectPresetRoom: document.getElementById('selectPresetRoom'),
  themeBtnAuto: document.getElementById('themeBtnAuto'),
  themeBtnLight: document.getElementById('themeBtnLight'),
  themeBtnDark: document.getElementById('themeBtnDark'),
  themeToggleIcon: document.getElementById('themeToggleIcon'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  btnFullscreen: document.getElementById('btnFullscreen'),
  btnSettings: document.getElementById('btnSettings'),
  btnQuickBook: document.getElementById('btnQuickBook')
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  const nameParam = urlParams.get('name');
  const capacityParam = urlParams.get('capacity');
  const themeParam = urlParams.get('theme');

  const savedRoom = localStorage.getItem('kiosk_room_email');
  const savedName = localStorage.getItem('kiosk_room_name');
  const savedCapacity = localStorage.getItem('kiosk_room_capacity');
  const savedTheme = localStorage.getItem('kiosk_theme_mode');
  
  if (roomParam) {
    state.roomEmail = roomParam;
  } else if (savedRoom) {
    state.roomEmail = savedRoom;
  }

  if (nameParam) {
    state.roomName = nameParam;
  } else if (savedName) {
    state.roomName = savedName;
  }

  if (capacityParam) {
    state.capacity = capacityParam;
  } else if (savedCapacity) {
    state.capacity = savedCapacity;
  } else {
    state.capacity = '10';
  }

  if (themeParam && ['auto', 'light', 'dark'].includes(themeParam)) {
    state.themeMode = themeParam;
  } else if (savedTheme && ['auto', 'light', 'dark'].includes(savedTheme)) {
    state.themeMode = savedTheme;
  } else {
    state.themeMode = 'auto';
  }

  state.activeScenario = urlParams.get('scenario') || null;

  // Actualizar UI inicial con valores cargados
  if (elements.roomNameDisplay) elements.roomNameDisplay.textContent = state.roomName;
  if (elements.roomEmailDisplay) elements.roomEmailDisplay.textContent = state.roomEmail;
  if (elements.capacityValue) elements.capacityValue.textContent = `${state.capacity} personas`;

  // Aplicar tema Día / Noche
  applyTheme(state.themeMode);

  // Reloj local por segundo
  updateClock();
  state.clockTimer = setInterval(() => {
    updateClock();
    updateLiveCountdown();
  }, 1000);

  // Listeners de botones
  if (elements.btnFullscreen) elements.btnFullscreen.addEventListener('click', toggleFullscreen);
  if (elements.btnSettings) elements.btnSettings.addEventListener('click', openSettingsModal);
  if (elements.btnQuickBook) elements.btnQuickBook.addEventListener('click', () => openBookingModal(30));

  // Inicializar PWA y Notificaciones Push
  initPwaAndServiceWorker();
  updatePushNotificationUI();

  // Sondeo inicial
  fetchStatus();

  // Sincronización recurrente cada 30 segundos
  state.pollTimer = setInterval(fetchStatus, state.pollIntervalMs);
});

// ==========================================
// SISTEMA DE TEMA DINÁMICO (DÍA / NOCHE)
// ==========================================
function applyTheme(mode) {
  state.themeMode = mode;
  const now = new Date();
  const currentHour = now.getHours();
  let effectiveTheme = 'dark';

  if (mode === 'auto') {
    // Modo Día de 07:00 a 18:59, Modo Noche de 19:00 a 06:59
    effectiveTheme = (currentHour >= 7 && currentHour < 19) ? 'light' : 'dark';
    if (elements.themeIndicatorBadge) {
      elements.themeIndicatorBadge.innerHTML = `<i class="fa-solid fa-clock-rotate-left mr-1"></i>AUTO (${effectiveTheme === 'light' ? 'DÍA' : 'NOCHE'})`;
    }
    if (elements.themeToggleIcon) {
      elements.themeToggleIcon.className = 'fa-solid fa-circle-half-stroke text-[#ffc400]';
    }
  } else if (mode === 'light') {
    effectiveTheme = 'light';
    if (elements.themeIndicatorBadge) {
      elements.themeIndicatorBadge.innerHTML = '<i class="fa-solid fa-sun mr-1 text-amber-500"></i>DÍA';
    }
    if (elements.themeToggleIcon) {
      elements.themeToggleIcon.className = 'fa-solid fa-sun text-amber-500';
    }
  } else {
    effectiveTheme = 'dark';
    if (elements.themeIndicatorBadge) {
      elements.themeIndicatorBadge.innerHTML = '<i class="fa-solid fa-moon mr-1 text-blue-400"></i>NOCHE';
    }
    if (elements.themeToggleIcon) {
      elements.themeToggleIcon.className = 'fa-solid fa-moon text-blue-400';
    }
  }

  // Aplicar clase CSS al body
  if (effectiveTheme === 'light') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    if (elements.metaThemeColor) elements.metaThemeColor.setAttribute('content', '#f1f5f9');
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
    if (elements.metaThemeColor) elements.metaThemeColor.setAttribute('content', '#060a12');
  }

  // Actualizar botones en modal de configuración
  updateThemeModalButtons(mode);
}

function updateThemeModalButtons(mode) {
  const activeClass = 'py-2 px-3 rounded-xl border border-[#ffc400] bg-[#ffc400]/20 text-[#ffc400] font-bold text-xs flex items-center justify-center space-x-1.5';
  const inactiveClass = 'py-2 px-3 rounded-xl border border-kiosk bg-kiosk-sub text-kiosk-muted font-bold text-xs flex items-center justify-center space-x-1.5';

  if (elements.themeBtnAuto) elements.themeBtnAuto.className = (mode === 'auto') ? activeClass : inactiveClass;
  if (elements.themeBtnLight) elements.themeBtnLight.className = (mode === 'light') ? activeClass : inactiveClass;
  if (elements.themeBtnDark) elements.themeBtnDark.className = (mode === 'dark') ? activeClass : inactiveClass;
}

function cycleThemeMode() {
  const modes = ['auto', 'light', 'dark'];
  const nextIdx = (modes.indexOf(state.themeMode) + 1) % modes.length;
  const nextMode = modes[nextIdx];
  setThemePreference(nextMode);
}

function setThemePreference(mode) {
  state.themeMode = mode;
  localStorage.setItem('kiosk_theme_mode', mode);
  applyTheme(mode);
}

// ==========================================
// RELOJ & CUENTA REGRESIVA AUTÓNOMA
// ==========================================
function updateClock() {
  const now = new Date();

  if (elements.digitalClock) {
    elements.digitalClock.textContent = now.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  if (elements.dateDisplay) {
    elements.dateDisplay.textContent = now.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Re-evaluar tema automático cada minuto
  if (state.themeMode === 'auto' && now.getSeconds() === 0) {
    applyTheme('auto');
  }
}

function updateLiveCountdown() {
  const now = Date.now();

  if (state.currentStatus === 'OCCUPIED' && state.currentMeeting) {
    const endMs = new Date(state.currentMeeting.end_time).getTime();
    const startMs = new Date(state.currentMeeting.start_time).getTime();
    const remainingMs = endMs - now;

    if (remainingMs > 0) {
      const totalSec = Math.floor(remainingMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const formatted = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      if (elements.liveCountdownText) elements.liveCountdownText.textContent = formatted;
      if (elements.meetingRemainingCountdown) elements.meetingRemainingCountdown.textContent = `${min}m ${sec}s restantes`;

      const totalDuration = endMs - startMs;
      const elapsed = now - startMs;
      const pct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      if (elements.meetingProgressBar) {
        elements.meetingProgressBar.style.width = `${pct}%`;
      }
    } else {
      fetchStatus(true);
    }
  } else if (state.currentStatus === 'UPCOMING' && state.upcomingMeeting) {
    const startMs = new Date(state.upcomingMeeting.start_time).getTime();
    const remainingMs = startMs - now;

    if (remainingMs > 0) {
      const totalSec = Math.floor(remainingMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const formatted = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      if (elements.liveCountdownText) elements.liveCountdownText.textContent = formatted;
      if (elements.upcomingWarningText) {
        elements.upcomingWarningText.textContent = `La sesión comienza en ${min}m ${sec}s. Por favor prepare la sala.`;
      }
    } else {
      fetchStatus(true);
    }
  }
}

// ==========================================
// SINCRONIZACIÓN CON BACKEND / GRAPH API
// ==========================================
async function fetchStatus(forceRefresh = false) {
  let url = '/api/status';
  const params = new URLSearchParams();

  if (state.roomEmail) params.append('room', state.roomEmail);
  if (state.activeScenario) params.append('scenario', state.activeScenario);
  if (forceRefresh) params.append('refresh', 'true');
  params.append('_t', Date.now());

  const qs = params.toString();
  if (qs) url += `?${qs}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    setConnectionOnline();
    renderKiosk(data);
  } catch (error) {
    console.warn('[Sync] Fallo en sincronización:', error.message);
    setConnectionOffline();
  }
}

function setConnectionOnline() {
  state.isOffline = false;
  if (elements.connectionDot) {
    elements.connectionDot.className = 'w-2 h-2 rounded-full bg-[#00b090] animate-pulse';
  }
  if (elements.connectionStatusText) {
    elements.connectionStatusText.textContent = 'Conectado a Exchange';
  }
  if (elements.lastPollTime) {
    const now = new Date();
    elements.lastPollTime.textContent = now.toLocaleTimeString('es-MX', { hour12: false });
  }
}

function setConnectionOffline() {
  state.isOffline = true;
  if (elements.connectionDot) {
    elements.connectionDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-ping';
  }
  if (elements.connectionStatusText) {
    elements.connectionStatusText.textContent = 'Reconectando con Exchange...';
  }
}

// ==========================================
// RENDERIZADO VISUAL
// ==========================================
function renderKiosk(data) {
  state.currentStatus = data.current_status || 'FREE';
  state.currentMeeting = data.current_meeting || null;
  state.upcomingMeeting = data.upcoming_meeting || null;
  state.nextMeetings = data.next_meetings || [];
  state.roomName = localStorage.getItem('kiosk_room_name') || state.roomName || data.room_name || 'Sala de Juntas Campeche';

  if (elements.roomNameDisplay) elements.roomNameDisplay.textContent = state.roomName;
  if (elements.roomEmailDisplay) elements.roomEmailDisplay.textContent = data.room;
  if (elements.capacityValue) elements.capacityValue.textContent = `${localStorage.getItem('kiosk_room_capacity') || state.capacity || 10} personas`;
  if (elements.cacheBadge) elements.cacheBadge.textContent = `Caché: ${data.cache_ttl_seconds || 60}s`;

  if (elements.demoModeIndicator) {
    if (data.is_mock) {
      elements.demoModeIndicator.classList.remove('hidden');
    } else {
      elements.demoModeIndicator.classList.add('hidden');
    }
  }

  // Ocultar vistas de estado
  elements.stateViewFree.classList.add('hidden');
  elements.stateViewUpcoming.classList.add('hidden');
  elements.stateViewOccupied.classList.add('hidden');
  elements.statusCardHero.classList.remove('border-glow-free', 'border-glow-upcoming', 'border-glow-occupied');

  switch (state.currentStatus) {
    case 'OCCUPIED':
      renderOccupied(data);
      break;
    case 'UPCOMING':
      renderUpcoming(data);
      break;
    case 'FREE':
    default:
      renderFree(data);
      break;
  }

  renderAgenda(state.nextMeetings);

  // Evaluar y disparar alerta push en cambios de estado
  checkAndTriggerStatusNotification(data);
}

// VERDE: DISPONIBLE
function renderFree(data) {
  elements.stateViewFree.classList.remove('hidden');
  elements.statusCardHero.classList.add('border-glow-free');

  if (elements.statusTopBarAccent) elements.statusTopBarAccent.style.backgroundColor = '#00b090';
  if (elements.statusIndicatorDot) elements.statusIndicatorDot.className = 'w-3 h-3 rounded-full bg-[#00b090]';
  if (elements.statusBadgeContainer) elements.statusBadgeContainer.className = 'inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-[#00b090] font-bold';
  if (elements.statusMainBadge) elements.statusMainBadge.textContent = 'DISPONIBLE';
  if (elements.liveCountdownBadge) elements.liveCountdownBadge.classList.add('hidden');

  if (data.next_meetings && data.next_meetings.length > 0) {
    const next = data.next_meetings[0];
    elements.freeAvailabilitySubtitle.textContent = `Libre durante los próximos ${next.minutes_until_start} minutos. Siguiente sesión programada a las ${formatTime(next.start_time)}.`;
  } else {
    elements.freeAvailabilitySubtitle.textContent = 'Sin más sesiones para hoy. Sala completamente disponible.';
  }
}

// AMARILLO: PRÓXIMO (<= 10 MINUTOS)
function renderUpcoming(data) {
  elements.stateViewUpcoming.classList.remove('hidden');
  elements.statusCardHero.classList.add('border-glow-upcoming');

  const upcoming = data.upcoming_meeting || (data.next_meetings && data.next_meetings[0]);

  if (elements.statusTopBarAccent) elements.statusTopBarAccent.style.backgroundColor = '#f59e0b';
  if (elements.statusIndicatorDot) elements.statusIndicatorDot.className = 'w-3 h-3 rounded-full bg-[#f59e0b] animate-pulse';
  if (elements.statusBadgeContainer) elements.statusBadgeContainer.className = 'inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-[#f59e0b] font-bold';
  if (elements.statusMainBadge) elements.statusMainBadge.textContent = 'INICIA EN BREVE';
  if (elements.liveCountdownBadge) elements.liveCountdownBadge.classList.remove('hidden');

  if (upcoming) {
    if (elements.upcomingTitle) elements.upcomingTitle.textContent = upcoming.title;
    if (elements.upcomingOrganizer) elements.upcomingOrganizer.textContent = upcoming.organizer;
  }
}

// ROJO: OCUPADO
function renderOccupied(data) {
  elements.stateViewOccupied.classList.remove('hidden');
  elements.statusCardHero.classList.add('border-glow-occupied');

  const meeting = data.current_meeting;

  if (elements.statusTopBarAccent) elements.statusTopBarAccent.style.backgroundColor = '#e11d48';
  if (elements.statusIndicatorDot) elements.statusIndicatorDot.className = 'w-3 h-3 rounded-full bg-[#e11d48] animate-ping';
  if (elements.statusBadgeContainer) elements.statusBadgeContainer.className = 'inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-[#e11d48] font-bold';
  if (elements.statusMainBadge) elements.statusMainBadge.textContent = 'SALA OCUPADA';
  if (elements.liveCountdownBadge) elements.liveCountdownBadge.classList.remove('hidden');

  if (meeting) {
    if (elements.occupiedTitle) elements.occupiedTitle.textContent = meeting.title;
    if (elements.occupiedOrganizer) elements.occupiedOrganizer.textContent = meeting.organizer;

    const startStr = formatTime(meeting.start_time);
    const endStr = formatTime(meeting.end_time);
    if (elements.occupiedTimeRange) elements.occupiedTimeRange.textContent = `${startStr} - ${endStr}`;
    if (elements.meetingStartTimeText) elements.meetingStartTimeText.textContent = startStr;
    if (elements.meetingEndTimeText) elements.meetingEndTimeText.textContent = endStr;
    if (elements.meetingRemainingCountdown) elements.meetingRemainingCountdown.textContent = `${meeting.minutes_remaining} min restantes`;
  }
}

// ==========================================
// AGENDA
// ==========================================
function renderAgenda(meetings) {
  elements.agendaListContainer.innerHTML = '';

  if (!meetings || meetings.length === 0) {
    elements.agendaListContainer.classList.add('hidden');
    elements.agendaEmptyState.classList.remove('hidden');
    elements.meetingsCountBadge.textContent = '0 eventos';
    return;
  }

  elements.agendaListContainer.classList.remove('hidden');
  elements.agendaEmptyState.classList.add('hidden');
  elements.meetingsCountBadge.textContent = `${meetings.length} ${meetings.length === 1 ? 'evento' : 'eventos'}`;

  meetings.forEach(item => {
    const startStr = formatTime(item.start_time);
    const endStr = formatTime(item.end_time);

    const card = document.createElement('div');
    card.className = 'p-3.5 rounded-2xl agenda-item border transition flex items-center justify-between space-x-3 animate-fade-in shadow-sm';

    card.innerHTML = `
      <div class="flex items-center space-x-3.5 min-w-0">
        <div class="w-16 text-center py-1.5 px-1 rounded-xl bg-kiosk-sub border border-kiosk font-mono text-xs font-black text-[#ffc400] shrink-0">
          ${startStr}
        </div>
        <div class="min-w-0">
          <h4 class="text-sm font-bold font-brand text-kiosk-main truncate">${escapeHtml(item.title)}</h4>
          <p class="text-xs text-kiosk-muted truncate flex items-center space-x-1.5 mt-0.5">
            <i class="fa-solid fa-user-tie text-[10px]"></i>
            <span>${escapeHtml(item.organizer)}</span>
          </p>
        </div>
      </div>
      <div class="text-right shrink-0">
        <span class="text-[11px] font-bold font-mono text-kiosk-muted bg-kiosk-sub px-2.5 py-1 rounded-lg border border-kiosk">
          ${endStr}
        </span>
      </div>
    `;

    elements.agendaListContainer.appendChild(card);
  });
}

// ==========================================
// RESERVA RÁPIDA (CON VALIDACIÓN DE DISPONIBILIDAD)
// ==========================================
function openBookingModal(preferredDuration = 30) {
  const noticeBox = document.getElementById('bookingAvailabilityNotice');
  const noticeIcon = document.getElementById('bookingNoticeIcon');
  const noticeText = document.getElementById('bookingNoticeText');
  const confirmBtn = document.getElementById('btnConfirmBooking');

  // Limpiar estados previos
  if (noticeBox) noticeBox.classList.add('hidden');

  // 1. Si la sala está ocupada actualmente:
  if (state.currentStatus === 'OCCUPIED' && state.currentMeeting) {
    const endStr = formatTime(state.currentMeeting.end_time);
    if (noticeBox) {
      noticeBox.className = 'p-3.5 rounded-2xl text-xs font-semibold flex items-start space-x-2.5 bg-rose-500/15 border border-rose-500/40 text-[#e11d48]';
      if (noticeIcon) noticeIcon.className = 'fa-solid fa-ban text-base mt-0.5 shrink-0 text-[#e11d48]';
      if (noticeText) {
        noticeText.innerHTML = `<strong>Sala Ocupada:</strong> Hay una sesión activa ("${escapeHtml(state.currentMeeting.title)}") hasta las <strong>${endStr}</strong> (${state.currentMeeting.minutes_remaining} min restantes). No se pueden realizar reservas simultáneas.`;
      }
      noticeBox.classList.remove('hidden');
    }

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.className = 'flex-1 py-3 rounded-xl bg-gray-500/30 text-kiosk-muted font-bold font-brand text-sm cursor-not-allowed opacity-60 flex items-center justify-center space-x-2';
    }

    document.querySelectorAll('.duration-btn').forEach(btn => {
      btn.disabled = true;
      btn.className = 'duration-btn py-2.5 rounded-xl border border-kiosk bg-kiosk-sub text-kiosk-muted/40 font-bold font-brand text-xs cursor-not-allowed line-through';
    });
  } else {
    // 2. Si la sala está libre o próxima a una reunión
    let maxFreeMinutes = Infinity;
    let nextMeetingInfo = null;

    if (state.nextMeetings && state.nextMeetings.length > 0) {
      const next = state.nextMeetings[0];
      maxFreeMinutes = next.minutes_until_start;
      nextMeetingInfo = next;
    }

    if (maxFreeMinutes <= 10) {
      // Inicia en breve (<= 10 min)
      if (noticeBox) {
        noticeBox.className = 'p-3.5 rounded-2xl text-xs font-semibold flex items-start space-x-2.5 bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-[#ffc400]';
        if (noticeIcon) noticeIcon.className = 'fa-solid fa-triangle-exclamation text-base mt-0.5 shrink-0 text-amber-500';
        if (noticeText) {
          noticeText.innerHTML = `<strong>Reunión por comenzar en ${maxFreeMinutes} min</strong> (${formatTime(nextMeetingInfo.start_time)}). No hay tiempo disponible suficiente para una reserva rápida.`;
        }
        noticeBox.classList.remove('hidden');
      }

      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.className = 'flex-1 py-3 rounded-xl bg-gray-500/30 text-kiosk-muted font-bold font-brand text-sm cursor-not-allowed opacity-60 flex items-center justify-center space-x-2';
      }
    } else if (maxFreeMinutes < 60) {
      // Tiempo libre parcial antes de la siguiente reunión
      if (noticeBox) {
        noticeBox.className = 'p-3.5 rounded-2xl text-xs font-semibold flex items-start space-x-2.5 bg-sky-500/15 border border-sky-500/40 text-[#176be0] dark:text-[#38bdf8]';
        if (noticeIcon) noticeIcon.className = 'fa-solid fa-circle-info text-base mt-0.5 shrink-0 text-[#176be0]';
        if (noticeText) {
          noticeText.innerHTML = `Espacio libre durante los próximos <strong>${maxFreeMinutes} min</strong> (próxima cita a las ${formatTime(nextMeetingInfo.start_time)}).`;
        }
        noticeBox.classList.remove('hidden');
      }

      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.className = 'flex-1 py-3 rounded-xl bg-[#ffc400] hover:bg-[#e6b000] text-black font-black font-brand transition shadow-md text-sm flex items-center justify-center space-x-2';
      }
    } else {
      // Completamente libre
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.className = 'flex-1 py-3 rounded-xl bg-[#ffc400] hover:bg-[#e6b000] text-black font-black font-brand transition shadow-md text-sm flex items-center justify-center space-x-2';
      }
    }

    // Configurar botones de duración según el tiempo libre
    const validDurations = [15, 30, 45, 60].filter(d => d <= maxFreeMinutes);
    const chosenDuration = validDurations.includes(preferredDuration) ? preferredDuration : (validDurations[0] || 15);

    document.querySelectorAll('.duration-btn').forEach(btn => {
      const dur = parseInt(btn.getAttribute('data-duration'), 10);
      if (dur > maxFreeMinutes) {
        btn.disabled = true;
        btn.className = 'duration-btn py-2.5 rounded-xl border border-kiosk bg-kiosk-sub text-kiosk-muted/40 font-bold font-brand text-xs cursor-not-allowed line-through';
        btn.title = `Excede el tiempo libre disponible (${maxFreeMinutes} min)`;
      } else {
        btn.disabled = false;
        btn.title = '';
      }
    });

    if (validDurations.length > 0) {
      selectDuration(chosenDuration);
    }
  }

  elements.modalBooking.classList.remove('hidden');
}

function closeBookingModal() {
  elements.modalBooking.classList.add('hidden');
}

function selectDuration(minutes) {
  state.selectedDuration = minutes;
  document.querySelectorAll('.duration-btn').forEach(btn => {
    if (btn.disabled) return;
    const dur = parseInt(btn.getAttribute('data-duration'), 10);
    if (dur === minutes) {
      btn.className = 'duration-btn py-2.5 rounded-xl border border-[#ffc400] bg-[#ffc400]/20 text-[#ffc400] font-black font-brand text-sm';
    } else {
      btn.className = 'duration-btn py-2.5 rounded-xl border border-kiosk bg-kiosk-sub text-kiosk-muted font-bold font-brand text-sm hover:border-[#ffc400]';
    }
  });
}

async function submitQuickBooking() {
  const btn = document.getElementById('btnConfirmBooking');
  const noticeBox = document.getElementById('bookingAvailabilityNotice');
  const noticeIcon = document.getElementById('bookingNoticeIcon');
  const noticeText = document.getElementById('bookingNoticeText');

  const title = (elements.inputBookingTitle.value || 'Reunión Rápida').trim();
  const organizer = (elements.inputBookingOrganizer.value || 'Tablet Kiosk Campeche').trim();

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Validando en Exchange...</span>';

  try {
    const response = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: state.roomEmail,
        title,
        durationMinutes: state.selectedDuration,
        organizer
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        // Conflicto de horario detectado por el backend
        if (noticeBox) {
          noticeBox.className = 'p-3.5 rounded-2xl text-xs font-semibold flex items-start space-x-2.5 bg-rose-500/15 border border-rose-500/40 text-[#e11d48]';
          if (noticeIcon) noticeIcon.className = 'fa-solid fa-triangle-exclamation text-base mt-0.5 shrink-0 text-[#e11d48]';
          if (noticeText) {
            noticeText.innerHTML = `<strong>Conflicto detectado:</strong> ${escapeHtml(data.message || 'La sala ya tiene una reunión agendada en ese horario.')}`;
          }
          noticeBox.classList.remove('hidden');
        }
        await fetchStatus(true);
        return;
      }
      throw new Error(data.message || 'Error al procesar reserva');
    }

    closeBookingModal();
    await fetchStatus(true);
  } catch (error) {
    if (noticeBox) {
      noticeBox.className = 'p-3.5 rounded-2xl text-xs font-semibold flex items-start space-x-2.5 bg-rose-500/15 border border-rose-500/40 text-[#e11d48]';
      if (noticeIcon) noticeIcon.className = 'fa-solid fa-circle-exclamation text-base mt-0.5 shrink-0 text-[#e11d48]';
      if (noticeText) noticeText.textContent = `Error: ${error.message}`;
      noticeBox.classList.remove('hidden');
    } else {
      alert(`Error al reservar: ${error.message}`);
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Confirmar</span><i class="fa-solid fa-check"></i>';
  }
}

// ==========================================
// CONFIGURACIÓN & SIMULADOR
// ==========================================
function openSettingsModal() {
  if (elements.inputRoomName) elements.inputRoomName.value = state.roomName;
  if (elements.inputRoomEmail) elements.inputRoomEmail.value = state.roomEmail;
  if (elements.inputRoomCapacity) elements.inputRoomCapacity.value = state.capacity || 10;

  if (elements.selectPresetRoom) {
    const matchingOption = Array.from(elements.selectPresetRoom.options).find(opt => opt.value.toLowerCase() === state.roomEmail.toLowerCase());
    if (matchingOption) {
      elements.selectPresetRoom.value = matchingOption.value;
    } else {
      elements.selectPresetRoom.value = 'custom';
    }
  }

  updateThemeModalButtons(state.themeMode);
  elements.modalSettings.classList.remove('hidden');
}

function closeSettingsModal() {
  elements.modalSettings.classList.add('hidden');
}

function simulateScenario(scenario) {
  state.activeScenario = scenario;
  closeSettingsModal();
  fetchStatus(true);
}

function onPresetRoomChange(selectedVal) {
  if (selectedVal === 'custom') {
    if (elements.inputRoomName) elements.inputRoomName.focus();
    return;
  }

  const select = elements.selectPresetRoom;
  const selectedOpt = select.options[select.selectedIndex];
  if (selectedOpt) {
    const name = selectedOpt.getAttribute('data-name');
    const capacity = selectedOpt.getAttribute('data-capacity');

    if (elements.inputRoomEmail) elements.inputRoomEmail.value = selectedVal;
    if (elements.inputRoomName && name) elements.inputRoomName.value = name;
    if (elements.inputRoomCapacity && capacity) elements.inputRoomCapacity.value = capacity;
  }
}

function saveRoomSettings() {
  const name = (elements.inputRoomName ? elements.inputRoomName.value : '').trim() || 'Sala de Juntas';
  const email = (elements.inputRoomEmail ? elements.inputRoomEmail.value : '').trim() || state.roomEmail;
  const capacity = (elements.inputRoomCapacity ? elements.inputRoomCapacity.value : '').trim() || '10';

  state.roomName = name;
  state.roomEmail = email;
  state.capacity = capacity;
  state.activeScenario = null;

  localStorage.setItem('kiosk_room_name', name);
  localStorage.setItem('kiosk_room_email', email);
  localStorage.setItem('kiosk_room_capacity', capacity);

  // Actualizar UI inmediatamente
  if (elements.roomNameDisplay) elements.roomNameDisplay.textContent = state.roomName;
  if (elements.roomEmailDisplay) elements.roomEmailDisplay.textContent = state.roomEmail;
  if (elements.capacityValue) elements.capacityValue.textContent = `${state.capacity} personas`;

  closeSettingsModal();
  fetchStatus(true);
}

function toggleFullscreen() {
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (requestMethod) {
        requestMethod.call(el).catch(() => {});
      }
    } else {
      const exitMethod = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (exitMethod) {
        exitMethod.call(document).catch(() => {});
      }
    }
  } catch (err) {
    // Ignorar si el navegador bloquea la acción sin interacción directa
  }
}

function formatTime(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function refreshData() {
  fetchStatus(true);
}

// ==========================================
// PWA (PROGRESSIVE WEB APP) & SERVICE WORKER
// ==========================================
function initPwaAndServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('[PWA] Service Worker registrado exitosamente con alcance:', reg.scope);
        })
        .catch(err => {
          console.warn('[PWA] Fallo al registrar Service Worker:', err);
        });
    });
  }

  // Capturar evento de instalación nativa en el navegador
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    state.deferredPwaPrompt = e;
    console.log('[PWA] Evento beforeinstallprompt capturado, app lista para instalarse.');
    const pwaSection = document.getElementById('pwaInstallSection');
    if (pwaSection) pwaSection.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Aplicación instalada exitosamente en el dispositivo.');
    state.deferredPwaPrompt = null;
    const pwaSection = document.getElementById('pwaInstallSection');
    if (pwaSection) pwaSection.classList.add('hidden');
  });
}

async function triggerPwaInstall() {
  if (!state.deferredPwaPrompt) {
    alert('Para instalar esta app en tu navegador, haz clic en el icono de instalación (o "Instalar aplicación") en la barra de direcciones de tu navegador.');
    return;
  }

  state.deferredPwaPrompt.prompt();
  const { outcome } = await state.deferredPwaPrompt.userChoice;
  console.log(`[PWA] Resultado de instalación: ${outcome}`);
  state.deferredPwaPrompt = null;
}

// ==========================================
// ALERTAS PUSH & NOTIFICACIONES DE ESTADO
// ==========================================
async function togglePushNotifications() {
  if (!('Notification' in window)) {
    alert('Tu navegador no soporta notificaciones de sistema.');
    return;
  }

  if (state.pushEnabled) {
    state.pushEnabled = false;
    localStorage.setItem('kiosk_push_enabled', 'false');
    updatePushNotificationUI();
    return;
  }

  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    state.pushEnabled = true;
    localStorage.setItem('kiosk_push_enabled', 'true');
    updatePushNotificationUI();
    sendSystemNotification(
      `🔔 Notificaciones Activadas - ${state.roomName}`,
      'Recibirás alertas en tiempo real cuando la sala esté ocupada y la hora exacta en que se desocupará.'
    );
  } else {
    state.pushEnabled = false;
    localStorage.setItem('kiosk_push_enabled', 'false');
    updatePushNotificationUI();
    alert('Por favor otorga permisos de notificación en tu navegador para recibir las alertas de sala.');
  }
}

function updatePushNotificationUI() {
  const icon = document.getElementById('pushStatusIcon');
  const text = document.getElementById('pushStatusText');
  const btn = document.getElementById('btnTogglePushNotifications');

  const headerBtn = document.getElementById('btnHeaderPush');
  const headerIcon = document.getElementById('headerPushIcon');
  const headerDot = document.getElementById('headerPushBadgeDot');

  const isGranted = ('Notification' in window) && Notification.permission === 'granted' && state.pushEnabled;

  if (isGranted) {
    if (icon) icon.className = 'fa-solid fa-bell text-[#00b090]';
    if (text) text.textContent = 'Activo';
    if (btn) btn.className = 'px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-bold text-[#00b090] flex items-center space-x-1.5 transition active:scale-95';

    if (headerBtn) {
      headerBtn.className = 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/50 text-[#00b090] transition flex items-center justify-center active:scale-95 shadow-sm shrink-0 relative';
      headerBtn.title = 'Alertas Push de Sala: ACTIVADAS (Clic para desactivar)';
    }
    if (headerIcon) headerIcon.className = 'fa-solid fa-bell text-base text-[#00b090]';
    if (headerDot) headerDot.classList.remove('hidden');
  } else {
    if (icon) icon.className = 'fa-solid fa-bell-slash text-kiosk-muted';
    if (text) text.textContent = 'Desactivado';
    if (btn) btn.className = 'px-3.5 py-1.5 rounded-xl bg-kiosk-card border border-kiosk text-xs font-bold text-kiosk-muted flex items-center space-x-1.5 transition active:scale-95';

    if (headerBtn) {
      headerBtn.className = 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-kiosk-sub hover:opacity-80 border border-kiosk text-kiosk-muted hover:text-[#ffc400] transition flex items-center justify-center active:scale-95 shadow-sm shrink-0 relative';
      headerBtn.title = 'Alertas Push de Sala: DESACTIVADAS (Clic para activar)';
    }
    if (headerIcon) headerIcon.className = 'fa-regular fa-bell text-base';
    if (headerDot) headerDot.classList.add('hidden');
  }
}

function sendSystemNotification(title, body, tag = 'room-alert') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const options = {
    body,
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag,
    renotify: true,
    data: { url: window.location.href }
  };

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, options);
    }).catch(() => {
      new Notification(title, options);
    });
  } else {
    new Notification(title, options);
  }
}

function checkAndTriggerStatusNotification(data) {
  if (!state.pushEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const currentStatus = state.currentStatus;

  if (currentStatus === 'OCCUPIED' && state.currentMeeting) {
    const meetingId = state.currentMeeting.id || state.currentMeeting.title;
    if (state.lastNotifiedStatus !== 'OCCUPIED' || state.lastNotifiedMeetingId !== meetingId) {
      state.lastNotifiedStatus = 'OCCUPIED';
      state.lastNotifiedMeetingId = meetingId;

      const endStr = formatTime(state.currentMeeting.end_time);
      const remainingMin = state.currentMeeting.minutes_remaining || 0;
      const title = `🔴 Sala Ocupada - ${state.roomName}`;
      const body = `La sala está ocupada por "${state.currentMeeting.title}" (${state.currentMeeting.organizer}). Se desocupará a las ${endStr} (${remainingMin} min restantes).`;

      sendSystemNotification(title, body, 'room-status-occupied');
    }
  } else if (currentStatus === 'UPCOMING' && state.upcomingMeeting) {
    const meetingId = state.upcomingMeeting.id || state.upcomingMeeting.title;
    if (state.lastNotifiedStatus !== 'UPCOMING' || state.lastNotifiedMeetingId !== meetingId) {
      state.lastNotifiedStatus = 'UPCOMING';
      state.lastNotifiedMeetingId = meetingId;

      const startStr = formatTime(state.upcomingMeeting.start_time);
      const minUntil = state.upcomingMeeting.minutes_until_start || 0;
      const title = `🟡 Reunión por Iniciar - ${state.roomName}`;
      const body = `La reunión "${state.upcomingMeeting.title}" (${state.upcomingMeeting.organizer}) inicia a las ${startStr} (en ${minUntil} min).`;

      sendSystemNotification(title, body, 'room-status-upcoming');
    }
  } else if (currentStatus === 'FREE') {
    if (state.lastNotifiedStatus === 'OCCUPIED' || state.lastNotifiedStatus === 'UPCOMING') {
      state.lastNotifiedStatus = 'FREE';
      state.lastNotifiedMeetingId = null;

      const title = `🟢 Sala Desocupada - ${state.roomName}`;
      const body = 'La reunión anterior ha finalizado. La sala se encuentra totalmente libre y disponible.';

      sendSystemNotification(title, body, 'room-status-free');
    } else {
      state.lastNotifiedStatus = 'FREE';
    }
  }
}

async function testPushNotification() {
  if (!('Notification' in window)) {
    alert('Tu navegador no soporta notificaciones push.');
    return;
  }

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    alert('Permiso de notificación no otorgado en el navegador.');
    return;
  }

  state.pushEnabled = true;
  localStorage.setItem('kiosk_push_enabled', 'true');
  updatePushNotificationUI();

  if (state.currentStatus === 'OCCUPIED' && state.currentMeeting) {
    const endStr = formatTime(state.currentMeeting.end_time);
    sendSystemNotification(
      `🔴 Sala Ocupada - ${state.roomName}`,
      `La sala está ocupada por "${state.currentMeeting.title}" (${state.currentMeeting.organizer}). Se desocupará a las ${endStr} (${state.currentMeeting.minutes_remaining} min restantes).`,
      'test-notification'
    );
  } else if (state.currentStatus === 'UPCOMING' && state.upcomingMeeting) {
    sendSystemNotification(
      `🟡 Reunión por Iniciar - ${state.roomName}`,
      `La reunión "${state.upcomingMeeting.title}" (${state.upcomingMeeting.organizer}) comenzará a las ${formatTime(state.upcomingMeeting.start_time)} (en ${state.upcomingMeeting.minutes_until_start} min).`,
      'test-notification'
    );
  } else {
    sendSystemNotification(
      `🟢 Sala Libre - ${state.roomName}`,
      'La sala está disponible para uso inmediato sin reuniones activas.',
      'test-notification'
    );
  }
}
