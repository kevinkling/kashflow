function formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function parseDate(dateString) {
    // Validar que dateString existe y no es null/undefined
    if (!dateString) {
        return new Date('1900-01-01'); // Fecha muy antigua para identificar datos inválidos
    }
    
    // Convertir formato DD/MM/YYYY HH:mm:ss a Date
    if (dateString.includes('/')) {
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        const timeStr = timePart || '00:00:00';
        return new Date(`${year}-${month}-${day}T${timeStr}`);
    }
    return new Date(dateString);
}

/**
 * Calcula el color de texto (blanco o negro) óptimo según el brillo del color de fondo
 * @param {string} hexColor - Color hexadecimal (ej: '#FF5733')
 * @returns {string} '#ffffff' para fondos oscuros, '#000000' para fondos claros
 */
function getContrastTextColor(hexColor) {
    // Remover el # si existe
    const hex = hexColor.replace('#', '');
    
    // Convertir a RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calcular luminancia relativa (percepción de brillo)
    // Fórmula: https://www.w3.org/TR/WCAG20/#relativeluminancedef
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Si la luminancia es mayor a 0.5, usar texto negro, sino blanco
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

