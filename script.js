// Verificar conexión con Firebase
document.addEventListener('DOMContentLoaded', function() {
    if (typeof db !== 'undefined') {
        console.log('✅ Firebase conectado correctamente');
    } else {
        console.error('❌ Error: Firebase no está conectado');
    }
});


// Variables globales
let currentSlide = 0;
let bookingData = {
    service: '',
    serviceType: '', // 'barberia' o 'tatuaje'
    price: '',
    professional: '',
    date: '',
    dateKey: '', // Clave única para la fecha (día-mes-año)
    time: ''
};
 

// Horarios disponibles
const timeSlots = [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30'
];

// Objeto para almacenar reservas
// Estructura: { "15-11-2024-Eduardo": ["10:00", "11:30"], ... }
let bookedSlots = {};

/**
 * Navega a un slide específico
 */
function goToSlide(slideIndex) {
    currentSlide = slideIndex;
    const track = document.getElementById('carouselTrack');
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
}

/**
 * Vuelve al slide anterior dependiendo del tipo de servicio
 */
function goBack() {
    if (bookingData.serviceType === 'tatuaje') {
        goToSlide(3); // Volver a selección de tatuador
    } else {
        goToSlide(2); // Volver a selección de barberos
    }
}

/**
 * Selecciona un servicio y determina a qué slide ir
 */
function selectService(serviceName, price) {
    bookingData.service = serviceName;
    bookingData.price = price;
    
    // Remover selecciones previas
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Agregar selección a la tarjeta clickeada
    event.target.closest('.service-card').classList.add('selected');
    
    // Determinar el tipo de servicio y navegar
    setTimeout(() => {
        if (serviceName === 'Tatuaje') {
            bookingData.serviceType = 'tatuaje';
            goToSlide(3); // Ir a selección de tatuador
        } else {
            bookingData.serviceType = 'barberia';
            goToSlide(2); // Ir a selección de barberos
        }
    }, 300);
}

/**
 * Selecciona un profesional
 */
function selectProfessional(professionalName) {
    bookingData.professional = professionalName;
    
    // Remover selecciones previas
    document.querySelectorAll('.professional-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Agregar selección a la tarjeta clickeada
    event.target.closest('.professional-card').classList.add('selected');
    
    // Generar calendario y navegar
    setTimeout(() => {
        generateCalendar();
        goToSlide(4);
    }, 300);
}

/**
 * Genera el calendario del mes actual
 */
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    
    // Obtener primer día del mes y cantidad de días
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Limpiar días existentes (mantener headers)
    const headers = calendar.querySelectorAll('.header');
    calendar.innerHTML = '';
    headers.forEach(h => calendar.appendChild(h));
    
    // Ajustar para que la semana empiece en lunes
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    
    // Agregar celdas vacías antes del primer día
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendar.appendChild(emptyDay);
    }
    
    // Agregar días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Deshabilitar días pasados (antes del día actual)
        if (day < currentDay) {
            dayElement.style.opacity = '0.3';
            dayElement.style.cursor = 'not-allowed';
            dayElement.style.pointerEvents = 'none'; // Evitar que se pueda hacer clic
        } else {
            dayElement.onclick = () => selectDate(day, currentMonth, currentYear);
        }
        
        calendar.appendChild(dayElement);
    }
}

/**
 * Selecciona una fecha
 */
function selectDate(day, month, year) {
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const selectedDate = new Date(year, month, day);
    const dayName = dayNames[selectedDate.getDay()];
    
    bookingData.date = `${dayName} ${day} de ${monthNames[month]} ${year}`;
    
    // Remover selecciones previas
    document.querySelectorAll('.calendar-day:not(.header)').forEach(d => {
        d.classList.remove('selected');
    });
    
    // Agregar selección
    event.target.classList.add('selected');
    
    // Generar horarios y navegar
    setTimeout(() => {
        generateTimeSlots();
        goToSlide(5);
    }, 300);
}

/**
 * Genera los horarios disponibles y marca los ocupados
 */
async function generateTimeSlots() {
    const container = document.getElementById('timeSlots');
    container.innerHTML = '<p style="color: #c084fc;">Cargando horarios disponibles...</p>';
    
    try {
        // Obtener la fecha seleccionada como objeto Date
        const fechaSeleccionada = parseFechaSeleccionada(bookingData.date);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        // Verificar si la fecha seleccionada es HOY
        const esHoy = fechaSeleccionada.getTime() === hoy.getTime();
        
        // Obtener hora actual si es hoy
        const horaActual = new Date();
        const horaActualMinutos = horaActual.getHours() * 60 + horaActual.getMinutes();
        
        // Obtener todas las reservas del profesional para la fecha seleccionada
        const reservasSnapshot = await db.collection('reservas')
            .where('profesional', '==', bookingData.professional)
            .where('fecha', '==', bookingData.date)
            .get();
        
        // Crear array con horarios ocupados
        const horariosOcupados = [];
        reservasSnapshot.forEach(doc => {
            horariosOcupados.push(doc.data().horario);
        });
        
        console.log('Horarios ocupados:', horariosOcupados);
        
        // Limpiar contenedor
        container.innerHTML = '';
        
        // Verificar si la fecha ya pasó
        const fechaPasada = fechaSeleccionada < hoy;
        
        // Generar slots de horario
        timeSlots.forEach(time => {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = time;
            
            // Convertir horario a minutos (ej: "10:30" -> 630)
            const [hora, minutos] = time.split(':').map(Number);
            const horarioMinutos = hora * 60 + minutos;
            
            // Verificar si el horario ya pasó (solo si es HOY)
            const horarioPasado = esHoy && horarioMinutos <= horaActualMinutos;
            
            // Si la fecha ya pasó, bloquear todos los horarios
            if (fechaPasada) {
                slot.classList.add('booked');
                slot.style.cursor = 'not-allowed';
                slot.style.opacity = '0.5';
                slot.onclick = () => {
                    alert('No podés reservar en una fecha pasada.');
                };
            }
            // Si el horario ya pasó HOY
            else if (horarioPasado) {
                slot.classList.add('booked');
                slot.style.cursor = 'not-allowed';
                slot.style.opacity = '0.3';
                slot.onclick = () => {
                    alert('Este horario ya pasó. Por favor elegí un horario más tarde.');
                };
            }
            // Si el horario está ocupado
            else if (horariosOcupados.includes(time)) {
                slot.classList.add('booked');
                slot.style.cursor = 'not-allowed';
                slot.style.opacity = '0.5';
                slot.onclick = () => {
                    alert('Este horario ya está reservado. Por favor elegí otro.');
                };
            }
            // Horario disponible
            else {
                slot.onclick = () => selectTime(time);
            }
            
            container.appendChild(slot);
        });
        
    } catch (error) {
        console.error('Error al cargar horarios:', error);
        container.innerHTML = '<p style="color: #ef4444;">Error al cargar horarios. Intentá de nuevo.</p>';
    }
}

/**
 * Convierte el string de fecha a objeto Date
 */
function parseFechaSeleccionada(fechaStr) {
    // Formato: "Miércoles 11 de Diciembre 2024"
    const meses = {
        'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3,
        'Mayo': 4, 'Junio': 5, 'Julio': 6, 'Agosto': 7,
        'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
    };
    
    const partes = fechaStr.split(' ');
    const dia = parseInt(partes[1]);
    const mes = meses[partes[3]];
    const anio = parseInt(partes[4]);
    
    return new Date(anio, mes, dia);
}


/**
 * Selecciona un horario
 */
function selectTime(time) {
    bookingData.time = time;
    
    // Remover selecciones previas
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Agregar selección
    event.target.classList.add('selected');
}

/**
 * Confirma la reserva y la guarda en Firebase
 */
async function confirmBooking() {
    if (!bookingData.time) {
        alert('Por favor selecciona un horario antes de confirmar tu reserva');
        return;
    }
    
    try {
        // Crear clave única para la reserva: fecha-profesional-hora
        const reservaKey = `${bookingData.date}-${bookingData.professional}-${bookingData.time}`;
        
        // Verificar si ya existe una reserva para ese horario
        const reservaRef = db.collection('reservas').doc(reservaKey);
        const doc = await reservaRef.get();
        
        if (doc.exists) {
            alert('❌ Lo sentimos, ese horario ya fue reservado por otra persona. Por favor elegí otro horario.');
            return;
        }
        
        // Guardar la reserva en Firebase
        await reservaRef.set({
            servicio: bookingData.service,
            precio: bookingData.price,
            profesional: bookingData.professional,
            fecha: bookingData.date,
            horario: bookingData.time,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            estado: 'confirmada'
        });
        
        console.log('✅ Reserva guardada exitosamente en Firebase');
        
        // Mostrar resumen de la reserva
        displayBookingSummary();
        
        // Navegar a confirmación
        goToSlide(6);
        
    } catch (error) {
        console.error('Error al guardar la reserva:', error);
        alert('Hubo un error al confirmar tu reserva. Por favor intentá de nuevo.');
    }
}


/**
 * Muestra el resumen de la reserva
 */
function displayBookingSummary() {
    const summaryContainer = document.getElementById('bookingSummary');
    
    summaryContainer.innerHTML = `
        <h3>Resumen de tu Reserva</h3>
        <p><strong>Servicio:</strong> ${bookingData.service}</p>
        <p><strong>Precio:</strong> ${bookingData.price}</p>
        <p><strong>Profesional:</strong> ${bookingData.professional}</p>
        <p><strong>Fecha:</strong> ${bookingData.date}</p>
        <p><strong>Horario:</strong> ${bookingData.time}</p>
    `;
}

/**
 * Reinicia la reserva y vuelve al inicio
 */
function resetBooking() {
    // Limpiar datos de reserva
    bookingData = {
        service: '',
        serviceType: '',
        price: '',
        professional: '',
        date: '',
        time: ''
    };
    
    // Remover todas las selecciones
    document.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Volver al inicio
    goToSlide(0);
}
/**
 * Abre WhatsApp con mensaje de confirmación
 */
function sendWhatsAppConfirmation() {
    // Número de WhatsApp
    const phoneNumber = '543442502803';
    
    // Mensaje automático
    const message = `Hola! Confirmo mi reserva en Los Santos:

Servicio: ${bookingData.service}
Precio: ${bookingData.price}
Profesional: ${bookingData.professional}
Fecha: ${bookingData.date}
Horario: ${bookingData.time}

Gracias!`;
    
    // Codificar mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    
    // URL de WhatsApp
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    console.log('URL generada:', whatsappURL);
    
    // Abrir WhatsApp
    window.open(whatsappURL, '_blank');
}
/**
 * Selecciona al tatuador y va directo a pantalla de contacto
 */
function selectTattooArtist(artistName) {
    bookingData.professional = artistName;
    bookingData.service = 'Tatuaje';
    bookingData.price = 'A consultar';
    
    // Ir directamente a la pantalla de contacto (slide 7)
    goToSlide(7);
}

/**
 * Abre WhatsApp para contactar al tatuador
 */
function contactTattooArtist() {
    const phoneNumber = '543442502803'; // Número del tatuador
    
    const message = `Hola! Quiero hacer una reserva para tatuarme con vos (${bookingData.professional}).

Quisiera saber qué días y horarios tenés disponibles.

¡Gracias!`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    console.log('Contactando tatuador:', whatsappURL);
    window.open(whatsappURL, '_blank');
}


// Inicializar la aplicación cuando cargue la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Los Santos - Sistema de reservas cargado');
});