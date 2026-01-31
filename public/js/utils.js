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

