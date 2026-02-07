const express = require('express');
const router = express.Router();
const {
    obtenerTodasLasCuentasConSaldos,
    obtenerCuentaPorId,
    crearCuenta,
    actualizarCuenta,
    archivarCuenta,
    validarAliasUnico,
    obtenerCuentasUsuario
} = require('../services/dbHelper.js');
const pool = require('../services/db.js');

// ============================================================================
// GET /api/cuentas - Listar todas las cuentas activas con sus saldos
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const cuentas = await obtenerTodasLasCuentasConSaldos();
        res.json(cuentas);
    } catch (error) {
        console.error('Error al obtener cuentas:', error);
        res.status(500).json({ error: 'Error al obtener las cuentas' });
    }
});

// ============================================================================
// GET /api/cuentas/usuarios - Listar todos los usuarios
// ============================================================================
router.get('/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM usuarios ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

// ============================================================================
// GET /api/cuentas/:id - Obtener una cuenta específica
// ============================================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cuenta = await obtenerCuentaPorId(id);

        if (!cuenta) {
            return res.status(404).json({ error: 'Cuenta no encontrada' });
        }

        res.json(cuenta);
    } catch (error) {
        console.error('Error al obtener cuenta:', error);
        res.status(500).json({ error: 'Error al obtener la cuenta' });
    }
});

// ============================================================================
// POST /api/cuentas - Crear una nueva cuenta
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const { usuario_id, nombre, alias, color, moneda } = req.body;

        // Validaciones
        if (!usuario_id || !nombre || !alias) {
            return res.status(400).json({
                error: 'Faltan campos requeridos: usuario_id, nombre, alias'
            });
        }

        // Validar que el alias sea único
        const aliasUnico = await validarAliasUnico(alias);
        if (!aliasUnico) {
            return res.status(400).json({
                error: `El alias "${alias}" ya está en uso`
            });
        }

        // Validar formato de color (opcional)
        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({
                error: 'El color debe estar en formato hexadecimal (#RRGGBB)'
            });
        }

        // Crear la cuenta
        await crearCuenta(
            usuario_id,
            nombre,
            alias,
            color || '#4CAF50',
            moneda || 'ARS'
        );

        res.status(201).json({
            message: 'Cuenta creada exitosamente',
            cuenta: { usuario_id, nombre, alias, color: color || '#4CAF50', moneda: moneda || 'ARS' }
        });
    } catch (error) {
        console.error('Error al crear cuenta:', error);
        res.status(500).json({ error: 'Error al crear la cuenta' });
    }
});

// ============================================================================
// PUT /api/cuentas/:id - Actualizar una cuenta existente
// ============================================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, alias, color, moneda, activa } = req.body;

        // Verificar que la cuenta existe
        const cuentaExistente = await obtenerCuentaPorId(id);
        if (!cuentaExistente) {
            return res.status(404).json({ error: 'Cuenta no encontrada' });
        }

        // Validar alias único si se está cambiando
        if (alias && alias !== cuentaExistente.alias) {
            const aliasUnico = await validarAliasUnico(alias, id);
            if (!aliasUnico) {
                return res.status(400).json({
                    error: `El alias "${alias}" ya está en uso`
                });
            }
        }

        // Validar formato de color si se proporciona
        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({
                error: 'El color debe estar en formato hexadecimal (#RRGGBB)'
            });
        }

        // Actualizar la cuenta
        await actualizarCuenta(id, { nombre, alias, color, moneda, activa });

        res.json({
            message: 'Cuenta actualizada exitosamente',
            cuenta: { id, nombre, alias, color, moneda, activa }
        });
    } catch (error) {
        console.error('Error al actualizar cuenta:', error);
        res.status(500).json({ error: 'Error al actualizar la cuenta' });
    }
});

// ============================================================================
// DELETE /api/cuentas/:id - Archivar una cuenta (soft delete)
// ============================================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la cuenta existe
        const cuenta = await obtenerCuentaPorId(id);
        if (!cuenta) {
            return res.status(404).json({ error: 'Cuenta no encontrada' });
        }

        // Archivar la cuenta (soft delete)
        await archivarCuenta(id);

        res.json({
            message: 'Cuenta archivada exitosamente',
            cuenta_id: id
        });
    } catch (error) {
        console.error('Error al archivar cuenta:', error);
        res.status(500).json({ error: 'Error al archivar la cuenta' });
    }
});

module.exports = router;
