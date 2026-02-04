// Variables globales
let allReservations = [];
let filteredReservations = [];

// Cargar reservas al iniciar
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Panel de administración cargado');
    loadReservations();
    
    // Event listeners para filtros
    document.getElementById('filterDate').addEventListener('change', applyFilters);
    document.getElementById('filterProfessional').addEventListener('change', applyFilters);
    document.getElementById('filterService').addEventListener('change', applyFilters);
});

/**
 * Carga todas las reservas desde Firebase
 */
async function loadReservations() {
    const container = document.getElementById('reservationsList');
    container.innerHTML = '<div class="loading">Cargando reservas...</div>';
    
    try {
        const snapshot = await db.collection('reservas')
            .orderBy('timestamp', 'desc')
            .get();
        
        allReservations = [];
        
        snapshot.forEach(doc => {
            allReservations.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`📋 ${allReservations.length} reservas cargadas`);
        
        // Aplicar filtros y mostrar
        filteredReservations = [...allReservations];
        updateStats();
        displayReservations();
        
    } catch (error) {
        console.error('Error al cargar reservas:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error al cargar las reservas</p></div>';
    }
}

/**
 * Aplica los filtros seleccionados
 */
function applyFilters() {
    const dateFilter = document.getElementById('filterDate').value;
    const professionalFilter = document.getElementById('filterProfessional').value;
    const serviceFilter = document.getElementById('filterService').value;
    
    filteredReservations = allReservations.filter(reserva => {
        let matches = true;
        
        // Filtro por fecha
        if (dateFilter) {
            const reservaDate = parseDateString(reserva.fecha);
            const filterDate = new Date(dateFilter);
            matches = matches && isSameDay(reservaDate, filterDate);
        }
        
        // Filtro por profesional
        if (professionalFilter) {
            matches = matches && reserva.profesional === professionalFilter;
        }
        
        // Filtro por servicio
        if (serviceFilter) {
            matches = matches && reserva.servicio === serviceFilter;
        }
        
        return matches;
    });
    
    console.log(`🔍 Filtros aplicados: ${filteredReservations.length} resultados`);
    displayReservations();
}

/**
 * Convierte string de fecha a objeto Date
 */
function parseDateString(dateStr) {
    const months = {
        'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3,
        'Mayo': 4, 'Junio': 5, 'Julio': 6, 'Agosto': 7,
        'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
    };
    
    const parts = dateStr.split(' ');
    const day = parseInt(parts[1]);
    const month = months[parts[3]];
    const year = parseInt(parts[4]);
    
    return new Date(year, month, day);
}

/**
 * Verifica si dos fechas son el mismo día
 */
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Actualiza las estadísticas
 */
function updateStats() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Total de reservas
    document.getElementById('totalReservations').textContent = allReservations.length;
    
    // Reservas de hoy
    const todayCount = allReservations.filter(reserva => {
        const reservaDate = parseDateString(reserva.fecha);
        return isSameDay(reservaDate, today);
    }).length;
    document.getElementById('todayReservations').textContent = todayCount;
    
    // Reservas de esta semana
    const weekCount = allReservations.filter(reserva => {
        const reservaDate = parseDateString(reserva.fecha);
        return reservaDate >= startOfWeek && reservaDate <= today;
    }).length;
    document.getElementById('weekReservations').textContent = weekCount;
}

/**
 * Muestra las reservas en el DOM
 */
function displayReservations() {
    const container = document.getElementById('reservationsList');
    
    if (filteredReservations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <p>No hay reservas para mostrar</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    filteredReservations.forEach(reserva => {
        const card = document.createElement('div');
        card.className = 'reservation-card';
        
        card.innerHTML = `
            <div class="reservation-info">
                <div class="info-item">
                    <span class="info-label">Servicio</span>
                    <span class="info-value highlight">${reserva.servicio}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Profesional</span>
                    <span class="info-value">${reserva.profesional}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Fecha</span>
                    <span class="info-value">${reserva.fecha}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Horario</span>
                    <span class="info-value highlight">${reserva.horario}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Precio</span>
                    <span class="info-value">${reserva.precio}</span>
                </div>
            </div>
            <button class="btn-delete" onclick="deleteReservation('${reserva.id}', '${reserva.fecha}', '${reserva.horario}')">
                🗑️ Cancelar
            </button>
        `;
        container.appendChild(card);
    });
}

/**
 * Elimina una reserva
 */
async function deleteReservation(reservaId, fecha, horario) {
    const confirmDelete = confirm(`¿Estás seguro de cancelar esta reserva?\n\nFecha: ${fecha}\nHorario: ${horario}`);
    
    if (!confirmDelete) return;
    
    try {
        await db.collection('reservas').doc(reservaId).delete();
        console.log('✅ Reserva eliminada:', reservaId);
        
        await loadReservations();
        alert('✅ Reserva cancelada exitosamente');
        
    } catch (error) {
        console.error('Error al eliminar reserva:', error);
        alert('❌ Error al cancelar la reserva. Intentá de nuevo.');
    }
}

/**
 * Muestra el formulario para crear reserva manual
 */
function showManualReservationForm() {
    document.getElementById('manualReservationModal').style.display = 'flex';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('manualDate').value = today;
}

/**
 * Cierra el modal de reserva manual
 */
function closeManualReservationModal() {
    document.getElementById('manualReservationModal').style.display = 'none';
}

/**
 * Crea una reserva manual
 */
async function createManualReservation() {
    const service = document.getElementById('manualService').value;
    const professional = document.getElementById('manualProfessional').value;
    const dateInput = document.getElementById('manualDate').value;
    const time = document.getElementById('manualTime').value;
    const client = 'Reserva Manual';
    
    if (!dateInput) {
        alert('Por favor seleccioná una fecha');
        return;
    }
    
    try {
        const date = new Date(dateInput + 'T00:00:00');
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        const dayName = dayNames[date.getDay()];
        const day = date.getDate();
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        
        const fechaFormateada = `${dayName} ${day} de ${month} ${year}`;
        let precio;
if (service === 'Corte de Pelo') {
    precio = '$10.000';
} else if (service === 'Corte + Barba') {
    precio = '$13.000';
} else if (service === 'Tatuaje') {
    precio = 'A consultar';
}
        const reservaKey = `${fechaFormateada}-${professional}-${time}`;
        
        const reservaRef = db.collection('reservas').doc(reservaKey);
        const doc = await reservaRef.get();
        
        if (doc.exists) {
            const confirmar = confirm('⚠️ Ya existe una reserva para ese horario. ¿Querés reemplazarla?');
            if (!confirmar) return;
        }
        
        await reservaRef.set({
            servicio: service,
            precio: precio,
            profesional: professional,
            fecha: fechaFormateada,
            horario: time,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            estado: 'confirmada',
            cliente: client,
            origen: 'manual'
        });
        
        console.log('✅ Reserva manual creada exitosamente');
        alert(`✅ Reserva creada:\n${service} - ${professional}\n${fechaFormateada} - ${time}`);
        
        closeManualReservationModal();
        await loadReservations();
        
    } catch (error) {
        console.error('Error al crear reserva:', error);
        alert('❌ Error al crear la reserva. Intentá de nuevo.');
    }
}