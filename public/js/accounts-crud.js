// accounts-crud.js - Funcionalidad CRUD para gestión de cuentas

// Variables globales
let allAccounts = [];
let allUsers = [];
let currentEditingAccountId = null;

/**
 * Cargar todas las cuentas desde el API
 */
async function loadAllAccounts() {
    try {
        const response = await fetch('/api/cuentas');
        if (!response.ok) throw new Error('Error al cargar cuentas');
        allAccounts = await response.json();
        renderAccountsManagementTable();
    } catch (error) {
        console.error('Error al cargar cuentas:', error);
        showAlert('Error al cargar las cuentas', 'danger');
    }
}

/**
 * Cargar todos los usuarios desde el API
 */
async function loadAllUsers() {
    try {
        const response = await fetch('/api/cuentas/usuarios');
        if (!response.ok) throw new Error('Error al cargar usuarios');
        allUsers = await response.json();
        populateUserSelect();
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        showAlert('Error al cargar los usuarios', 'danger');
    }
}

/**
 * Poblar el select de usuarios en el formulario
 */
function populateUserSelect() {
    const select = document.getElementById('accountUsuario');
    if (!select) return;

    // Limpiar opciones existentes excepto la primera
    select.innerHTML = '<option value="">Seleccionar usuario...</option>';

    // Agregar usuarios
    allUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.nombre;
        select.appendChild(option);
    });
}

/**
 * Renderizar tabla de gestión de cuentas
 */
function renderAccountsManagementTable() {
    const tbody = document.getElementById('accountsManagementTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (allAccounts.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-1"></i>
          <p class="mt-2">No hay cuentas registradas</p>
        </td>
      </tr>
    `;
        return;
    }

    allAccounts.forEach(account => {
        const row = document.createElement('tr');

        const balanceColor = account.saldo_actual >= 0 ? 'text-success' : 'text-danger';
        const statusBadge = account.saldo_actual >= 0
            ? '<span class="badge bg-success">Activa</span>'
            : '<span class="badge bg-warning">Saldo Negativo</span>';

        row.innerHTML = `
      <td>${account.cuenta}</td>
      <td><code>${account.alias}</code></td>
      <td>
        <span class="badge" style="background-color: ${account.color}; color: ${getContrastTextColor(account.color)}">
          ${account.color}
        </span>
      </td>
      <td>${account.moneda}</td>
      <td>${account.usuario}</td>
      <td class="text-end ${balanceColor} fw-bold">${formatCurrency(account.saldo_actual)}</td>
      <td class="text-center">${statusBadge}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-warning me-1" onclick="openEditAccountModal(${account.cuenta_id})" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmArchiveAccount(${account.cuenta_id}, '${account.alias}')" title="Archivar">
          <i class="bi bi-archive"></i>
        </button>
      </td>
    `;

        tbody.appendChild(row);
    });
}

/**
 * Abrir modal para crear nueva cuenta
 */
function openCreateAccountModal() {
    currentEditingAccountId = null;

    // Cambiar título del modal
    document.getElementById('accountFormModalLabel').innerHTML =
        '<i class="bi bi-plus-circle me-2"></i>Nueva Cuenta';

    // Limpiar formulario
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    document.getElementById('accountColor').value = '#4CAF50';

    // Cargar usuarios si no están cargados
    if (allUsers.length === 0) {
        loadAllUsers();
    }

    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('accountFormModal'));
    modal.show();
}

/**
 * Abrir modal para editar cuenta existente
 */
async function openEditAccountModal(accountId) {
    currentEditingAccountId = accountId;

    try {
        // Obtener datos de la cuenta
        const response = await fetch(`/api/cuentas/${accountId}`);
        if (!response.ok) throw new Error('Error al cargar cuenta');
        const account = await response.json();

        // Cambiar título del modal
        document.getElementById('accountFormModalLabel').innerHTML =
            '<i class="bi bi-pencil me-2"></i>Editar Cuenta';

        // Llenar formulario
        document.getElementById('accountId').value = account.id;
        document.getElementById('accountUsuario').value = account.usuario_id;
        document.getElementById('accountNombre').value = account.nombre;
        document.getElementById('accountAlias').value = account.alias;
        document.getElementById('accountColor').value = account.color;
        document.getElementById('accountMoneda').value = account.moneda;

        // Cargar usuarios si no están cargados
        if (allUsers.length === 0) {
            await loadAllUsers();
        }

        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('accountFormModal'));
        modal.show();
    } catch (error) {
        console.error('Error al cargar cuenta:', error);
        showAlert('Error al cargar los datos de la cuenta', 'danger');
    }
}

/**
 * Guardar cuenta (crear o actualizar)
 */
async function saveAccount() {
    const form = document.getElementById('accountForm');

    // Validar formulario
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const accountId = document.getElementById('accountId').value;
    const usuarioId = document.getElementById('accountUsuario').value;
    const nombre = document.getElementById('accountNombre').value.trim();
    const alias = document.getElementById('accountAlias').value.trim();
    const color = document.getElementById('accountColor').value;
    const moneda = document.getElementById('accountMoneda').value;

    const accountData = {
        usuario_id: parseInt(usuarioId),
        nombre,
        alias,
        color,
        moneda
    };

    try {
        let response;

        if (accountId) {
            // Actualizar cuenta existente
            delete accountData.usuario_id; // No se puede cambiar el usuario
            response = await fetch(`/api/cuentas/${accountId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(accountData)
            });
        } else {
            // Crear nueva cuenta
            response = await fetch('/api/cuentas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(accountData)
            });
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error al guardar la cuenta');
        }

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('accountFormModal'));
        modal.hide();

        // Mostrar mensaje de éxito
        showAlert(result.message || 'Cuenta guardada exitosamente', 'success');

        // Recargar cuentas
        await loadAllAccounts();

        // Recargar transacciones para actualizar colores
        if (typeof loadTransactions === 'function') {
            loadTransactions();
        }
    } catch (error) {
        console.error('Error al guardar cuenta:', error);
        showAlert(error.message, 'danger');
    }
}

/**
 * Confirmar archivado de cuenta
 */
function confirmArchiveAccount(accountId, alias) {
    if (confirm(`¿Estás seguro de que deseas archivar la cuenta "${alias}"?\n\nLa cuenta se marcará como inactiva y no aparecerá en las listas, pero sus transacciones se conservarán.`)) {
        archiveAccount(accountId);
    }
}

/**
 * Archivar cuenta
 */
async function archiveAccount(accountId) {
    try {
        const response = await fetch(`/api/cuentas/${accountId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error al archivar la cuenta');
        }

        // Mostrar mensaje de éxito
        showAlert(result.message || 'Cuenta archivada exitosamente', 'success');

        // Recargar cuentas
        await loadAllAccounts();

        // Recargar transacciones
        if (typeof loadTransactions === 'function') {
            loadTransactions();
        }
    } catch (error) {
        console.error('Error al archivar cuenta:', error);
        showAlert(error.message, 'danger');
    }
}

/**
 * Inicializar event listeners para CRUD de cuentas
 */
function initializeAccountsCRUDListeners() {
    // Botón "Gestionar Cuentas" en el header
    const manageAccountsBtn = document.getElementById('manage-accounts-button');
    if (manageAccountsBtn) {
        manageAccountsBtn.addEventListener('click', () => {
            loadAllAccounts();
            loadAllUsers();
            const modal = new bootstrap.Modal(document.getElementById('manageAccountsModal'));
            modal.show();
        });
    }

    // Botón "Nueva Cuenta" en el modal de gestión
    const newAccountBtn = document.getElementById('newAccountBtn');
    if (newAccountBtn) {
        newAccountBtn.addEventListener('click', openCreateAccountModal);
    }

    // Botón "Guardar" en el formulario
    const saveAccountBtn = document.getElementById('saveAccountBtn');
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', saveAccount);
    }

    // Permitir guardar con Enter en el formulario
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveAccount();
        });
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAccountsCRUDListeners);
} else {
    initializeAccountsCRUDListeners();
}
