// Variables globales
let transactions = [];
let filteredTransactions = [];
let selectedAccount = null; // Cuenta seleccionada para filtrar

// Cargar datos del servidor
async function loadTransactions() {
    try {
        const response = await fetch('/api/movimientos');
        const data = await response.json();

        console.log('Datos recibidos del servidor:', data); // Debug

        // Convertir datos al formato del libro diario
        transactions = data.map((item, index) => {
            const monto = parseFloat(item.monto) || 0;
            const esDebito = item.debeHaber === 'debe';

            return {
                id: item.id || index + 1,
                date: parseDate(item.fecha),
                description: item.descripcion,
                account: item.banco,
                account_name: item.banco_nombre || item.banco,
                account_color: item.banco_color || '#6c757d',
                banco_destino: item.banco_destino,
                amount: monto, // Ya viene con el signo correcto del backend
                type: item.debeHaber, // 'debe' o 'haber'
                debit: esDebito ? Math.abs(monto) : 0,
                credit: !esDebito ? Math.abs(monto) : 0
            };
        });

        console.log('Transacciones procesadas:', transactions); // Debug

        // Ordenar por fecha (más recientes primero)
        transactions.sort((a, b) => b.date - a.date);

        applyFilters();
        renderTransactions();
        updateIndicators();
        renderTopAccounts(transactions); // Renderizar cuentas solo una vez al cargar

    } catch (error) {
        console.error('Error al cargar transacciones:', error);
        showAlert('Error al cargar los datos', 'danger');
    }
}

// Aplicar filtros
function applyFilters() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    filteredTransactions = transactions.filter(transaction => {
        // Filtro por fecha
        const transactionDate = transaction.date.toISOString().split('T')[0];
        if (dateFrom && transactionDate < dateFrom) return false;
        if (dateTo && transactionDate > dateTo) return false;

        // Filtro por búsqueda
        if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Filtro por cuenta seleccionada
        if (selectedAccount && transaction.account !== selectedAccount) {
            return false;
        }

        return true;
    });
}

/**
 * Establece el filtro por cuenta
 * @param {string|null} accountId - ID de la cuenta a filtrar, null para limpiar
 */
function filterByAccount(accountId) {
    selectedAccount = accountId;
    applyFilters();
    renderTransactions();
    updateIndicators(); // Actualizar indicadores con el filtro aplicado
    updateAccountFilterBadge();
}

/**
 * Actualiza el badge visual que indica el filtro activo
 */
function updateAccountFilterBadge() {
    const searchInput = document.getElementById('searchInput');
    let badge = document.getElementById('accountFilterBadge');

    if (selectedAccount) {
        // Encontrar el nombre de la cuenta
        const transaction = transactions.find(t => t.account === selectedAccount);
        const accountName = transaction ? transaction.account_name : selectedAccount;
        const accountColor = transaction ? transaction.account_color : '#6c757d';

        if (!badge) {
            // Crear el badge si no existe
            badge = document.createElement('div');
            badge.id = 'accountFilterBadge';
            badge.className = 'mt-2';
            searchInput.parentElement.appendChild(badge);
        }

        badge.innerHTML = `
            <span class="badge d-inline-flex align-items-center" style="background-color: ${accountColor}; color: ${getContrastTextColor(accountColor)}; font-size: 0.875rem;">
                <i class="bi bi-funnel-fill me-2"></i>
                Filtrando por: ${accountName}
                <button type="button" class="btn-close btn-close-white btn-sm ms-2" 
                        onclick="filterByAccount(null)" 
                        style="font-size: 0.6rem; opacity: 0.8;"
                        title="Limpiar filtro"></button>
            </span>
        `;
    } else if (badge) {
        // Remover el badge si no hay filtro
        badge.remove();
    }
}

// Aplicar filtros
function renderTransactions() {
    const tbody = document.getElementById('transactionTable');
    const template = document.getElementById('transaction-row-template').content;

    tbody.innerHTML = '';

    if (filteredTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-journal-x fs-1"></i>
                    <br>No hay transacciones para mostrar
                </td>
            </tr>
        `;
        return;
    }

    filteredTransactions.forEach(transaction => {
        const row = document.importNode(template, true);

        // Llenar datos
        row.querySelector('.date').textContent = formatDate(transaction.date);

        // Descripción con indicador de transferencia
        const description = transaction.banco_destino ?
            `${transaction.description} → ${transaction.banco_destino}` :
            transaction.description;
        row.querySelector('.description').textContent = description;

        const accountBadge = row.querySelector('.account-badge');

        // Usar los datos que vienen del backend
        accountBadge.textContent = transaction.account_name || transaction.account || 'Sin Banco';
        accountBadge.style.backgroundColor = transaction.account_color || '#6c757d';

        // Calcular color de texto según el brillo del color de fondo
        accountBadge.style.color = getContrastTextColor(transaction.account_color || '#6c757d');
        accountBadge.className = 'badge';

        // Columna de monto unificada con signo, color e ícono
        const amountCell = row.querySelector('.amount');
        const isPositive = transaction.debit > 0;
        const amountValue = isPositive ? transaction.debit : transaction.credit;
        const sign = isPositive ? '+' : '−';
        const icon = isPositive ? '<i class="bi bi-arrow-up-circle me-1"></i>' : '<i class="bi bi-arrow-down-circle me-1"></i>';
        const colorClass = isPositive ? 'text-success' : 'text-danger';

        amountCell.innerHTML = `${icon}<span class="${colorClass} fw-bold">${sign} ${formatCurrency(amountValue)}</span>`;

        // Eventos de botones
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        editBtn.addEventListener('click', () => editTransaction(transaction.id));
        deleteBtn.addEventListener('click', () => deleteTransaction(transaction.id));

        tbody.appendChild(row);
    });
}

// Actualizar indicadores principales y secundarios
function updateIndicators() {
    // IMPORTANTE: Usar filteredTransactions para que los indicadores se adapten al filtro
    const transactionsToUse = filteredTransactions.length > 0 || selectedAccount ||
        document.getElementById('dateFrom').value ||
        document.getElementById('dateTo').value ||
        document.getElementById('searchInput').value
        ? filteredTransactions
        : transactions;

    // Calcular saldo total (transacciones filtradas o todas)
    const totalBalance = transactionsToUse.reduce((sum, t) => sum + t.amount, 0);

    // Obtener mes actual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtrar transacciones del mes actual dentro del conjunto filtrado
    const currentMonthTransactions = transactionsToUse.filter(t => {
        return t.date.getMonth() === currentMonth && t.date.getFullYear() === currentYear;
    });

    // Calcular ingresos y gastos del mes
    const monthlyIncome = currentMonthTransactions
        .filter(t => t.debit > 0)
        .reduce((sum, t) => sum + t.debit, 0);

    const monthlyExpenses = currentMonthTransactions
        .filter(t => t.credit > 0)
        .reduce((sum, t) => sum + t.credit, 0);

    // Actualizar indicadores principales
    const totalBalanceEl = document.getElementById('totalBalance');
    totalBalanceEl.textContent = formatCurrency(totalBalance);
    totalBalanceEl.className = `mb-0 fw-bold ${totalBalance >= 0 ? 'text-white' : 'text-warning'}`;

    document.getElementById('monthlyIncome').textContent = formatCurrency(monthlyIncome);
    document.getElementById('monthlyExpenses').textContent = formatCurrency(monthlyExpenses);

    // Renderizar top 3 cuentas (siempre usa todas las transacciones para el contexto general)
    // renderTopAccounts(transactions); // MOVIDO: Se llama solo en loadTransactions para evitar re-render innecesario
}

// Inicializar fechas de filtro por defecto
function initializeDateFilters() {
    const now = new Date();

    // Último día del mes anterior (día de cobro)
    const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Último día del mes actual
    const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Anteúltimo día del mes actual (último día menos 1)
    const secondToLastDayOfCurrentMonth = new Date(lastDayOfCurrentMonth);
    secondToLastDayOfCurrentMonth.setDate(lastDayOfCurrentMonth.getDate() - 1);

    // Formatear fechas para input type="date" (YYYY-MM-DD)
    const dateFrom = lastDayOfPreviousMonth.toISOString().split('T')[0];
    const dateTo = secondToLastDayOfCurrentMonth.toISOString().split('T')[0];

    // Establecer valores en los campos
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');

    if (dateFromInput && !dateFromInput.value) {
        dateFromInput.value = dateFrom;
    }

    if (dateToInput && !dateToInput.value) {
        dateToInput.value = dateTo;
    }
}

// Mostrar modal para nueva transacción
function showAddTransactionModal() {
    document.getElementById('addTransactionModalLabel').textContent = 'Nueva Transacción';
    document.getElementById('transactionForm').reset();
    document.getElementById('transactionId').value = '';
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];

    const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    modal.show();
}

// Editar transacción TODO: REVISAR
/* function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    document.getElementById('addTransactionModalLabel').textContent = 'Editar Transacción';
    document.getElementById('transactionId').value = transaction.id;
    document.getElementById('transactionDate').value = transaction.date.toISOString().split('T')[0];
    document.getElementById('transactionDescription').value = transaction.description;
    document.getElementById('transactionAccount').value = transaction.account;
    document.getElementById('transactionDebit').value = transaction.debit || '';
    document.getElementById('transactionCredit').value = transaction.credit || '';
    
    const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    modal.show();
} */

// Eliminar transacción TODO: REVISAR
/* async function deleteTransaction(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta transacción?')) return;
    
    try {
        const response = await fetch(`/api/movimientos/${id}`, { 
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar la transacción');
        }
        
        const result = await response.json();
        
        // Remover del array local
        const index = transactions.findIndex(t => t.id === id);
        if (index > -1) {
            transactions.splice(index, 1);
            applyFilters();
            renderTransactions();
            updateBalance();
            showAlert(result.message || 'Transacción eliminada correctamente', 'success');
        }
        
    } catch (error) {
        console.error('Error al eliminar transacción:', error);
        showAlert('Error al eliminar la transacción', 'danger');
    }
} */

// Guardar transacción TODO: REVISAR
/* async function saveTransaction() {
    const form = document.getElementById('transactionForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const id = document.getElementById('transactionId').value;
    const date = new Date(document.getElementById('transactionDate').value);
    const description = document.getElementById('transactionDescription').value;
    const account = document.getElementById('transactionAccount').value;
    const debit = parseFloat(document.getElementById('transactionDebit').value) || 0;
    const credit = parseFloat(document.getElementById('transactionCredit').value) || 0;
    
    // Validar que solo se ingrese un valor
    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        showAlert('Debe ingresar un valor en Debe O Haber, no en ambos', 'warning');
        return;
    }
    
    const amount = debit > 0 ? debit : -credit;
    
    const transactionData = {
        banco: account,
        descripcion: description,
        monto: amount,
        fecha: date.toISOString()
    };
    
    try {
        let response;
        let result;
        
        if (id) {
            // Editar transacción existente
            response = await fetch(`/api/movimientos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });
        } else {
            // Crear nueva transacción
            response = await fetch('/api/movimientos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });
        }
        
        if (!response.ok) {
            throw new Error('Error al guardar la transacción');
        }
        
        result = await response.json();
        
        // Recargar los datos desde el servidor
        await loadTransactions();
        
        showAlert(result.message || 'Transacción guardada correctamente', 'success');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
        modal.hide();
        
    } catch (error) {
        console.error('Error al guardar transacción:', error);
        showAlert('Error al guardar la transacción', 'danger');
    }
} */

// Mostrar alerta
function showAlert(message, type = 'info') {
    // Crear elemento de alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // Auto-remover después de 3 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Eventos
document.addEventListener('DOMContentLoaded', function () {
    // Inicializar fechas de filtro por defecto
    initializeDateFilters();

    // Cargar datos iniciales
    loadTransactions();

    // Inicializar partículas
    if (typeof particlesJS !== 'undefined') {
        particlesJS.load('particles-js', 'js/particles/particlesjs-config.json');
    }

    // Event listeners
    document.getElementById('refresh-button').addEventListener('click', loadTransactions);

    // Filtros
    document.getElementById('dateFrom').addEventListener('change', () => {
        applyFilters();
        renderTransactions();
        updateIndicators(); // Actualizar indicadores cuando cambian los filtros
    });

    document.getElementById('dateTo').addEventListener('change', () => {
        applyFilters();
        renderTransactions();
        updateIndicators(); // Actualizar indicadores cuando cambian los filtros
    });

    document.getElementById('searchInput').addEventListener('input', () => {
        applyFilters();
        renderTransactions();
        updateIndicators(); // Actualizar indicadores cuando cambian los filtros
    });

    // Inicializar listeners de cuentas (definido en accounts.js)
    if (typeof initializeAccountsListeners === 'function') {
        initializeAccountsListeners();
    }

    // Modal y formularios
    /* const addTransactionBtn = document.querySelector('[data-bs-target="#addTransactionModal"]');
    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', showAddTransactionModal);
    }
    
    const saveTransactionBtn = document.getElementById('saveTransactionBtn');
    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', saveTransaction);
    }
    
    // Limpiar validación del formulario al cerrar modal
    const addTransactionModal = document.getElementById('addTransactionModal');
    if (addTransactionModal) {
        addTransactionModal.addEventListener('hidden.bs.modal', () => {
            const transactionForm = document.getElementById('transactionForm');
            if (transactionForm) {
                transactionForm.classList.remove('was-validated');
            }
        });
    }
    
    // Validar que solo se llene un campo (debe o haber)
    const debitInput = document.getElementById('transactionDebit');
    const creditInput = document.getElementById('transactionCredit');
    
    if (debitInput && creditInput) {
        debitInput.addEventListener('input', () => {
            if (debitInput.value) creditInput.value = '';
        });
        
        creditInput.addEventListener('input', () => {
            if (creditInput.value) debitInput.value = '';
        });
    } */
});