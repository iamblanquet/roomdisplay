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
  lastNotifiedMeetingId: null,
  // Always-On Display (AOD) Anti-Burn-In Protection State
  aodEnabled: localStorage.getItem('kiosk_aod_enabled') !== 'false',
  aodIdleTimeoutMs: 180000, // 3 minutos de inactividad
  aodIdleTimer: null,
  aodShiftTimer: null,
  isAodDimmed: false,
  isTestingAod: false,
  aodTestCooldownUntil: 0,
  aodTestStepTimer: null
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

  // Inicializar Protección de Pantalla Always-On (Anti-Burn-In)
  initAodProtection();
  updateAodUI();

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
// CONFIGURACIÓN & GESTOR CRUD DE SALAS
// ==========================================
async function openSettingsModal() {
  updateThemeModalButtons(state.themeMode);
  updateAodUI();
  cancelRoomForm();
  await loadRooms();
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

// Cargar lista de salas desde el Backend / LocalStorage
async function loadRooms() {
  try {
    const response = await fetch('/api/rooms', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      state.roomsList = data.rooms || [];
    }
  } catch (err) {
    console.warn('[Rooms] Error al consultar /api/rooms, usando lista local:', err);
  }

  if (!state.roomsList || state.roomsList.length === 0) {
    state.roomsList = [
      { id: 'saladejuntascamp-itzamna-mx', email: 'SaladeJuntasCamp@itzamna.mx', name: 'Sala de Juntas Campeche', capacity: 10, location: 'Piso 1 - Campeche' },
      { id: 'salamerida-itzamna-mx', email: 'SalaMerida@itzamna.mx', name: 'Sala de Juntas Mérida', capacity: 14, location: 'Piso 2 - Mérida' },
      { id: 'salacancun-itzamna-mx', email: 'SalaCancun@itzamna.mx', name: 'Sala Ejecutiva Cancún', capacity: 8, location: 'Piso 1 - Cancún' }
    ];
  }

  renderRoomsList();
}

// Renderizar tarjetas de salas en la vista del modal
function renderRoomsList() {
  const container = document.getElementById('roomsListContainer');
  if (!container) return;

  container.innerHTML = '';

  state.roomsList.forEach(room => {
    const isActive = room.email.toLowerCase() === state.roomEmail.toLowerCase();
    const card = document.createElement('div');
    card.className = `p-3 rounded-2xl border transition-all ${
      isActive 
        ? 'bg-[#00b090]/10 border-[#00b090]/50 shadow-sm' 
        : 'bg-kiosk-sub border-kiosk hover:border-[#ffc400]/40'
    }`;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-2 flex-wrap">
            <h4 class="text-xs sm:text-sm font-black font-brand text-kiosk-main truncate">${escapeHtml(room.name)}</h4>
            ${isActive ? '<span class="px-2 py-0.5 rounded-full bg-[#00b090] text-black text-[9px] font-black uppercase tracking-wider">Activa Aquí</span>' : ''}
          </div>
          <p class="text-[11px] font-mono text-kiosk-muted truncate mt-0.5 flex items-center space-x-1">
            <i class="fa-solid fa-envelope text-[9px] text-[#ffc400]"></i>
            <span class="truncate">${escapeHtml(room.email)}</span>
          </p>
          <div class="flex items-center space-x-3 text-[10px] text-kiosk-muted font-medium mt-1">
            <span><i class="fa-solid fa-users text-[#ffc400] mr-1"></i>${room.capacity || 10} personas</span>
            <span><i class="fa-solid fa-location-dot text-[#ffc400] mr-1"></i>${escapeHtml(room.location || 'Oficinas ITZ')}</span>
          </div>
        </div>

        <div class="flex items-center space-x-1 shrink-0">
          ${!isActive ? `
            <button type="button" onclick="selectActiveRoom('${escapeHtml(room.id || room.email)}')" class="px-2.5 py-1.5 rounded-xl bg-kiosk-card hover:bg-[#ffc400] hover:text-black border border-kiosk text-kiosk-main text-[11px] font-bold font-brand transition shadow-sm" title="Mostrar esta sala en este Kiosk">
              Usar
            </button>
          ` : ''}
          <button type="button" onclick="openEditRoomForm('${escapeHtml(room.id || room.email)}')" class="w-7 h-7 rounded-xl bg-kiosk-card hover:bg-[#ffc400]/20 border border-kiosk text-kiosk-muted hover:text-[#ffc400] text-xs flex items-center justify-center transition" title="Editar Sala">
            <i class="fa-solid fa-pen text-[10px]"></i>
          </button>
          <button type="button" onclick="deleteRoom('${escapeHtml(room.id || room.email)}')" class="w-7 h-7 rounded-xl bg-kiosk-card hover:bg-rose-500/20 border border-kiosk text-kiosk-muted hover:text-[#e11d48] text-xs flex items-center justify-center transition" title="Eliminar Sala">
            <i class="fa-solid fa-trash text-[10px]"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Abrir formulario para crear sala
function openCreateRoomForm() {
  document.getElementById('inputCrudRoomId').value = '';
  document.getElementById('crudFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i><span>Registrar Nueva Sala</span>';
  document.getElementById('btnSaveCrudRoomText').textContent = 'Crear Sala';

  document.getElementById('inputCrudRoomName').value = '';
  document.getElementById('inputCrudRoomEmail').value = '';
  document.getElementById('inputCrudRoomCapacity').value = '10';
  document.getElementById('inputCrudRoomLocation').value = 'Oficinas ITZ';

  document.getElementById('roomsListView').classList.add('hidden');
  document.getElementById('btnOpenCreateRoom').classList.add('hidden');
  document.getElementById('roomsFormView').classList.remove('hidden');
}

// Abrir formulario para editar sala
function openEditRoomForm(roomId) {
  const room = (state.roomsList || []).find(r => r.id === roomId || r.email === roomId);
  if (!room) return;

  document.getElementById('inputCrudRoomId').value = room.id || room.email;
  document.getElementById('crudFormTitle').innerHTML = `<i class="fa-solid fa-pen-to-square"></i><span>Editar Sala: ${escapeHtml(room.name)}</span>`;
  document.getElementById('btnSaveCrudRoomText').textContent = 'Guardar Cambios';

  document.getElementById('inputCrudRoomName').value = room.name;
  document.getElementById('inputCrudRoomEmail').value = room.email;
  document.getElementById('inputCrudRoomCapacity').value = room.capacity || 10;
  document.getElementById('inputCrudRoomLocation').value = room.location || 'Oficinas ITZ';

  document.getElementById('roomsListView').classList.add('hidden');
  document.getElementById('btnOpenCreateRoom').classList.add('hidden');
  document.getElementById('roomsFormView').classList.remove('hidden');
}

// Cancelar formulario y volver a lista
function cancelRoomForm() {
  const formView = document.getElementById('roomsFormView');
  const listView = document.getElementById('roomsListView');
  const btnOpen = document.getElementById('btnOpenCreateRoom');
  if (formView) formView.classList.add('hidden');
  if (listView) listView.classList.remove('hidden');
  if (btnOpen) btnOpen.classList.remove('hidden');
}

// Enviar formulario (Crear o Actualizar Sala)
async function submitRoomForm() {
  const id = (document.getElementById('inputCrudRoomId').value || '').trim();
  const name = (document.getElementById('inputCrudRoomName').value || '').trim();
  const email = (document.getElementById('inputCrudRoomEmail').value || '').trim();
  const capacity = parseInt(document.getElementById('inputCrudRoomCapacity').value, 10) || 10;
  const location = (document.getElementById('inputCrudRoomLocation').value || '').trim() || 'Oficinas ITZ';

  if (!name) {
    alert('Por favor introduce el nombre visible de la sala.');
    return;
  }
  if (!email || !email.includes('@')) {
    alert('Por favor introduce un correo válido del buzón de Exchange.');
    return;
  }

  const isEdit = Boolean(id);
  const url = isEdit ? `/api/rooms/${encodeURIComponent(id)}` : '/api/rooms';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, capacity, location })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al guardar sala');
    }

    // Si modificamos la sala que actualmente está activa en la pantalla, actualizar UI principal
    if (isEdit && (id === state.roomEmail || id === state.roomName)) {
      state.roomName = name;
      state.roomEmail = email;
      state.capacity = capacity;
      localStorage.setItem('kiosk_room_name', name);
      localStorage.setItem('kiosk_room_email', email);
      localStorage.setItem('kiosk_room_capacity', capacity);
      if (elements.roomNameDisplay) elements.roomNameDisplay.textContent = state.roomName;
      if (elements.roomEmailDisplay) elements.roomEmailDisplay.textContent = state.roomEmail;
      fetchStatus(true);
    }

    cancelRoomForm();
    await loadRooms();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

// Eliminar sala
async function deleteRoom(roomId) {
  const room = (state.roomsList || []).find(r => r.id === roomId || r.email === roomId);
  const roomName = room ? room.name : roomId;

  if (!confirm(`¿Estás seguro de que deseas eliminar la sala "${roomName}"?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al eliminar sala');
    }

    // Si la sala eliminada era la que estaba activa, cambiar a la primera sala disponible
    await loadRooms();
    if (room && room.email.toLowerCase() === state.roomEmail.toLowerCase()) {
      if (state.roomsList.length > 0) {
        selectActiveRoom(state.roomsList[0].id || state.roomsList[0].email);
      }
    }
  } catch (error) {
    alert(`Error al eliminar: ${error.message}`);
  }
}

// Seleccionar sala para mostrar en este Kiosk
function selectActiveRoom(roomId) {
  const room = (state.roomsList || []).find(r => r.id === roomId || r.email === roomId);
  if (!room) return;

  state.roomEmail = room.email;
  state.roomName = room.name;
  state.capacity = room.capacity || '10';
  state.activeScenario = null;

  localStorage.setItem('kiosk_room_name', room.name);
  localStorage.setItem('kiosk_room_email', room.email);
  localStorage.setItem('kiosk_room_capacity', room.capacity || '10');

  if (elements.roomNameDisplay) elements.roomNameDisplay.textContent = state.roomName;
  if (elements.roomEmailDisplay) elements.roomEmailDisplay.textContent = state.roomEmail;
  if (elements.capacityValue) elements.capacityValue.textContent = `${state.capacity} personas`;

  renderRoomsList();
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

// ==========================================
// PROTECCIÓN ANTI-BURN-IN ALWAYS-ON DISPLAY (AOD)
// ==========================================
function initAodProtection() {
  // 1. Escuchar eventos de interacción del usuario para salir del modo atenuado y resetear timer
  const activityEvents = ['touchstart', 'touchend', 'mousedown', 'mousemove', 'keydown', 'scroll', 'click'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, handleUserActivity, { passive: true });
  });

  // 2. Iniciar timer de desplazamiento de píxeles (cada 60 segundos)
  if (state.aodShiftTimer) clearInterval(state.aodShiftTimer);
  state.aodShiftTimer = setInterval(applyPixelShift, 60000);

  // 3. Iniciar temporizador de inactividad
  resetAodIdleTimer();
}

function handleUserActivity() {
  // Ignorar eventos durante el periodo de protección de la prueba demo (1.8s)
  if (Date.now() < state.aodTestCooldownUntil) {
    return;
  }

  if (state.isTestingAod) {
    stopAodTestDemo();
    return;
  }

  if (state.isAodDimmed) {
    exitAodDimmedMode();
  }
  resetAodIdleTimer();
}

function resetAodIdleTimer() {
  if (state.aodIdleTimer) clearTimeout(state.aodIdleTimer);
  if (!state.aodEnabled || state.isTestingAod) return;

  state.aodIdleTimer = setTimeout(() => {
    enterAodDimmedMode();
  }, state.aodIdleTimeoutMs);
}

function enterAodDimmedMode() {
  if (!state.aodEnabled || state.isAodDimmed) return;
  state.isAodDimmed = true;
  document.body.classList.add('aod-dimmed-active');

  const badge = document.getElementById('aodActiveBadge');
  const badgeText = document.getElementById('aodActiveBadgeText');
  if (badge) {
    badge.classList.remove('opacity-0', 'pointer-events-none');
    badge.classList.add('opacity-100');
  }
  if (badgeText) {
    badgeText.textContent = 'Protección AOD Activa • Toca la pantalla para interactuar';
  }

  // Aplicar micro-desplazamiento preventivo
  applyPixelShift();
}

function exitAodDimmedMode() {
  state.isAodDimmed = false;
  document.body.classList.remove('aod-dimmed-active');

  const badge = document.getElementById('aodActiveBadge');
  if (badge) {
    badge.classList.remove('opacity-100');
    badge.classList.add('opacity-0', 'pointer-events-none');
  }
}

function applyPixelShift() {
  if (!state.aodEnabled) {
    resetPixelShift();
    return;
  }

  // Desplazamiento pseudo-aleatorio suave de -3px a +3px
  const offsets = [-3, -2, -1, 1, 2, 3];
  const dx = offsets[Math.floor(Math.random() * offsets.length)];
  const dy = offsets[Math.floor(Math.random() * offsets.length)];

  applyCustomPixelShift(dx, dy);
}

function applyCustomPixelShift(dx, dy) {
  const targets = document.querySelectorAll('.aod-shift-target');
  targets.forEach(el => {
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  });
}

function resetPixelShift() {
  const targets = document.querySelectorAll('.aod-shift-target');
  targets.forEach(el => {
    el.style.transform = 'none';
  });
}

function toggleAodProtection() {
  state.aodEnabled = !state.aodEnabled;
  localStorage.setItem('kiosk_aod_enabled', state.aodEnabled ? 'true' : 'false');

  if (state.aodEnabled) {
    initAodProtection();
  } else {
    if (state.aodIdleTimer) clearTimeout(state.aodIdleTimer);
    if (state.aodShiftTimer) clearInterval(state.aodShiftTimer);
    if (state.isTestingAod) stopAodTestDemo();
    exitAodDimmedMode();
    resetPixelShift();
  }

  updateAodUI();
}

function updateAodUI() {
  const icon = document.getElementById('aodStatusIcon');
  const text = document.getElementById('aodStatusText');
  const btn = document.getElementById('btnToggleAodProtection');

  if (!btn) return;

  if (state.aodEnabled) {
    if (icon) icon.className = 'fa-solid fa-circle-check text-[#00b090]';
    if (text) text.textContent = 'Activo';
    btn.className = 'px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-bold text-[#00b090] flex items-center space-x-1.5 transition active:scale-95';
  } else {
    if (icon) icon.className = 'fa-solid fa-circle-xmark text-kiosk-muted';
    if (text) text.textContent = 'Desactivado';
    btn.className = 'px-3 py-1.5 rounded-xl bg-kiosk-card border border-kiosk text-xs font-bold text-kiosk-muted flex items-center space-x-1.5 transition active:scale-95';
  }
}

function testAodProtectionEffect() {
  closeSettingsModal();
  state.aodEnabled = true;
  localStorage.setItem('kiosk_aod_enabled', 'true');
  updateAodUI();

  state.isTestingAod = true;
  state.aodTestCooldownUntil = Date.now() + 1800; // 1.8s de inmunidad para evitar que el mismo toque cancele la demo

  // Entrar en modo atenuado visible de demostración
  state.isAodDimmed = true;
  document.body.classList.add('aod-dimmed-active', 'aod-testing-active');

  const badge = document.getElementById('aodActiveBadge');
  const badgeText = document.getElementById('aodActiveBadgeText');
  if (badge) {
    badge.classList.remove('opacity-0', 'pointer-events-none');
    badge.classList.add('opacity-100');
  }
  if (badgeText) {
    badgeText.innerHTML = '<span class="text-[#ffc400] font-black mr-1">[DEMO ANTI-QUEMADO]</span> Atenuación activa + Pixel-Shift en curso • <u class="cursor-pointer font-bold">Toca para finalizar</u>';
  }

  // Secuencia de demostración en vivo de micro-desplazamiento de píxeles
  let step = 0;
  const sequence = [
    { x: 5, y: -4 },
    { x: -5, y: 5 },
    { x: 4, y: 4 },
    { x: -4, y: -3 },
    { x: 0, y: 0 }
  ];

  if (state.aodTestStepTimer) clearInterval(state.aodTestStepTimer);
  applyCustomPixelShift(sequence[0].x, sequence[0].y);

  state.aodTestStepTimer = setInterval(() => {
    step++;
    if (step < sequence.length) {
      applyCustomPixelShift(sequence[step].x, sequence[step].y);
    } else {
      applyPixelShift();
    }
  }, 1200);
}

function stopAodTestDemo() {
  state.isTestingAod = false;
  if (state.aodTestStepTimer) {
    clearInterval(state.aodTestStepTimer);
    state.aodTestStepTimer = null;
  }
  document.body.classList.remove('aod-testing-active');
  const badgeText = document.getElementById('aodActiveBadgeText');
  if (badgeText) {
    badgeText.textContent = 'Protección AOD Activa • Toca la pantalla para interactuar';
  }
  exitAodDimmedMode();
  resetPixelShift();
  resetAodIdleTimer();
}

