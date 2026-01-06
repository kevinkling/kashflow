const express = require('express');
const router = express.Router();
const db = require('../services/db.js');


// Endpoint para obtener los movimientos
router.get('/movimientos', (req, res) => {
    try {
        // Consulta SQL para obtener todos los movimientos
        const stmt = db.prepare(`
            SELECT banco, descripcion, monto, fecha 
            FROM movimientos 
            ORDER BY banco,
                strftime('%Y-%m-%d %H:%M:%S',
                    substr(fecha, 7, 4) || '-' || 
                    substr(fecha, 4, 2) || '-' || 
                    substr(fecha, 1, 2) || ' ' || 
                    substr(fecha, 12)
                ) DESC
        `);
        const rows = stmt.all();
        res.json(rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error al obtener los datos' });
    }
});

// Endpoint para crear una nueva transacción TODO: REVISAR
/* router.post('/movimientos', (req, res) => {
    try {
        const { banco, descripcion, monto, fecha } = req.body;
        
        if (!banco || !descripcion || monto === undefined || !fecha) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }
        
        // Formatear fecha al formato esperado DD/MM/YYYY HH:mm:ss
        const formattedDate = new Date(fecha).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
        
        const stmt = db.prepare(`
            INSERT INTO movimientos (banco, descripcion, monto, fecha)
            VALUES (?, ?, ?, ?)
        `);
        
        const result = stmt.run(banco, descripcion, monto, formattedDate);
        
        res.status(201).json({
            id: result.lastInsertRowid,
            banco,
            descripcion,
            monto,
            fecha: formattedDate,
            message: 'Transacción creada correctamente'
        });
        
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error al crear la transacción' });
    }
}); */

// Endpoint para actualizar una transacción TODO: REVISAR
/* router.put('/movimientos/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { banco, descripcion, monto, fecha } = req.body;
        
        if (!banco || !descripcion || monto === undefined || !fecha) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }
        
        // Formatear fecha al formato esperado DD/MM/YYYY HH:mm:ss
        const formattedDate = new Date(fecha).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
        
        const stmt = db.prepare(`
            UPDATE movimientos 
            SET banco = ?, descripcion = ?, monto = ?, fecha = ?
            WHERE rowid = ?
        `);
        
        const result = stmt.run(banco, descripcion, monto, formattedDate, id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Transacción no encontrada' });
        }
        
        res.json({
            id,
            banco,
            descripcion,
            monto,
            fecha: formattedDate,
            message: 'Transacción actualizada correctamente'
        });
        
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error al actualizar la transacción' });
    }
}); */

// Endpoint para eliminar una transacción TODO: REVISAR
/* router.delete('/movimientos/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const stmt = db.prepare('DELETE FROM movimientos WHERE rowid = ?');
        const result = stmt.run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Transacción no encontrada' });
        }
        
        res.json({ message: 'Transacción eliminada correctamente' });
        
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error al eliminar la transacción' });
    }
}); */

module.exports = router;
