function parsearMensaje(mensaje) {
    try {

        if (typeof mensaje !== 'string' || mensaje.trim() === '') {
            // Validar que sea texto no vacío
            throw new Error('El mensaje debe ser un texto no vacío');
        }

        console.log('Mensaje recibido para parsear:', mensaje);
        const patrones = [
            {
                tipo: 'egreso',
                regex: /^gaste de (\w+) (\d+([.,]\d{1,3})?) para (.+)$/i,
                parse: (match) => ({
                    tipo: 'egreso',
                    banco: match[1],
                    monto: parseFloat(match[2].replace(',', '.')),
                    descripcion: match[4]
                })
            },
            {
                tipo: 'ingreso',
                regex: /^recibi en (\w+) (\d+([.,]\d{1,3})?) de (.+)$/i,
                parse: (match) => ({
                    tipo: 'ingreso',
                    banco: match[1],
                    monto: parseFloat(match[2].replace(',', '.')),
                    descripcion: match[4]
                })
            },
            {
                tipo: 'movimiento',
                regex: /^movi de (\w+) a (\w+) (\d+([.,]\d{1,3})?)$/i,
                parse: (match) => ({
                    tipo: 'movimiento',
                    banco: match[1],
                    bancoDestino: match[2],
                    monto: parseFloat(match[3].replace(',', '.'))
                })
            },
            {
                tipo: 'deposito de sueldo',
                regex: /^sueldo (\d+([.,]\d{1,3})?)$/i,
                parse: (match) => ({
                    tipo: 'deposito de sueldo',
                    banco: 'BBVA',
                    monto: parseFloat(match[1].replace(',', '.')),
                    descripcion: 'Depósito de sueldo'
                })
            }
        ];

        for (const patron of patrones) {
            const match = mensaje.match(patron.regex);
            if (match) {
                const resultado = patron.parse(match);
                // console.log('Mensaje parseado:', resultado);
                return resultado;
            }
        }

        return { error: 'Formato de mensaje no reconocido' };
    } catch (error) {
        console.error('Error al parsear el mensaje:', error.message);
        return { error: error.message };
    }
};

module.exports = { parsearMensaje };