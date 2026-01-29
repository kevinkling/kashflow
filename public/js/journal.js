// Configuración de cuentas con colores hexadecimales corporativos
const accounts = {
    'BBVA': { name: 'BBVA', class: 'bbva', color: '#072146', textColor: '#ffffff' },
    'UALA': { name: 'Ualá', class: 'uala', color: '#00D4FF', textColor: '#000000' },
    'MP': { name: 'Mercado Pago', class: 'mercadopago', color: '#00A0FF', textColor: '#ffffff' },
    'EFE': { name: 'Efectivo', class: 'efectivo', color: '#28A745', textColor: '#ffffff' },
    'AH': { name: 'Ahorros', class: 'ahorros', color: '#6F42C1', textColor: '#ffffff' },
    'AST': { name: 'Astro', class: 'astro', color: '#E83E8C', textColor: '#ffffff' },
    'NX': { name: 'Naranja X', class: 'naranjax', color: '#FF6600', textColor: '#ffffff' }
};

// Variables globales
let transactions = [];
let filteredTransactions = [];
let runningBalance = 0;

// Cargar datos del servidor
async function loadTransactions() {
    try {
        const response = await fetch('/api/movimientos');
        const data = await response.json();
        
        // Convertir datos al formato del libro diario
        transactions = data.map((item, index) => {
            const monto = parseFloat(item.monto) || 0;
            const esDeuda = item.debeHaber === 'debe';
            
            return {
                id: item.id || index + 1,
                date: parseDate(item.fecha),
                description: item.descripcion,
                account: item.banco,
                banco_destino: item.banco_destino,
                amount: monto,
                type: item.debeHaber, // 'debe' o 'haber'
                debit: esDeuda ? monto : 0,
                credit: !esDeuda ? monto : 0
            };
        });

        // Ordenar por fecha (más recientes primero)
        transactions.sort((a, b) => b.date - a.date);
        
        applyFilters();
        renderTransactions();
        updateBalance();
        
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
        
        return true;
    });
}

// Renderizar transacciones
function renderTransactions() {
    const tbody = document.getElementById('transactionTable');
    const template = document.getElementById('transaction-row-template').content;
    
    tbody.innerHTML = '';
    
    if (filteredTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="bi bi-journal-x fs-1"></i>
                    <br>No hay transacciones para mostrar
                </td>
            </tr>
        `;
        return;
    }

    let balance = calculateInitialBalance();
    
    filteredTransactions.forEach(transaction => {
        const row = document.importNode(template, true);
        
        // Calcular saldo (debe suma, haber resta)
        balance += (transaction.type === 'debe' ? transaction.amount : -transaction.amount);
        
        // Llenar datos
        row.querySelector('.date').textContent = formatDate(transaction.date);
        
        // Descripción con indicador de transferencia
        const description = transaction.banco_destino ? 
            `${transaction.description} → ${accounts[transaction.banco_destino]?.name || transaction.banco_destino}` : 
            transaction.description;
        row.querySelector('.description').textContent = description;
        
        const accountBadge = row.querySelector('.account-badge');
        const accountInfo = accounts[transaction.account];
        
        if (accountInfo) {
            accountBadge.textContent = accountInfo.name;
            accountBadge.style.backgroundColor = accountInfo.color;
            accountBadge.style.color = accountInfo.textColor;
        } else {
            accountBadge.textContent = transaction.account || 'Sin Banco';
            accountBadge.style.backgroundColor = '#6c757d';
            accountBadge.style.color = '#ffffff';
        }
        accountBadge.className = 'badge';
        
        const debitCell = row.querySelector('.debit');
        const creditCell = row.querySelector('.credit');
        
        if (transaction.debit > 0) {
            debitCell.textContent = formatCurrency(transaction.debit);
            debitCell.classList.add('text-success', 'fw-bold');
            creditCell.textContent = '';
        } else {
            debitCell.textContent = '';
            creditCell.textContent = formatCurrency(transaction.credit);
            creditCell.classList.add('text-danger', 'fw-bold');
        }
        
        const balanceCell = row.querySelector('.balance');
        balanceCell.textContent = formatCurrency(balance);
        balanceCell.className = `balance fw-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`;
        
        // Eventos de botones
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.delete-btn');
        
        editBtn.addEventListener('click', () => editTransaction(transaction.id));
        deleteBtn.addEventListener('click', () => deleteTransaction(transaction.id));
        
        tbody.appendChild(row);
    });
}

// Calcular saldo inicial (transacciones no filtradas anteriores a las filtradas)
function calculateInitialBalance() {
    if (filteredTransactions.length === 0) return 0;
    
    const earliestFiltered = Math.min(...filteredTransactions.map(t => t.date));
    
    return transactions
        .filter(t => t.date < earliestFiltered)
        .reduce((sum, t) => sum + t.amount, 0);
}

// Actualizar saldo actual (basado en transacciones filtradas)
function updateBalance() {
    const totalBalance = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const balanceElement = document.getElementById('currentBalance');
    
    balanceElement.textContent = formatCurrency(totalBalance);
    balanceElement.className = totalBalance >= 0 ? 'text-white mb-0' : 'text-warning mb-0';
}

// Inicializar fechas de filtro por defecto
function initializeDateFilters() {
    const now = new Date();
    
    // Último día del mes anterior
    // const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastDayOfPreviousMonth = new Date(now.getFullYear() - 1, 0, 1);
    
    // Anteúltimo día del mes actual (último día del mes menos 1 día)
    const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
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
document.addEventListener('DOMContentLoaded', function() {
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
        updateBalance();
    });
    
    document.getElementById('dateTo').addEventListener('change', () => {
        applyFilters();
        renderTransactions();
        updateBalance();
    });
    
    document.getElementById('searchInput').addEventListener('input', () => {
        applyFilters();
        renderTransactions();
        updateBalance();
    });
    
    // Modal y formularios
    document.querySelector('[data-bs-target="#addTransactionModal"]').addEventListener('click', showAddTransactionModal);
    
    document.getElementById('saveTransactionBtn').addEventListener('click', saveTransaction);
    
    // Limpiar validación del formulario al cerrar modal
    document.getElementById('addTransactionModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('transactionForm').classList.remove('was-validated');
    });
    
    // Validar que solo se llene un campo (debe o haber)
    const debitInput = document.getElementById('transactionDebit');
    const creditInput = document.getElementById('transactionCredit');
    
    debitInput.addEventListener('input', () => {
        if (debitInput.value) creditInput.value = '';
    });
    
    creditInput.addEventListener('input', () => {
        if (creditInput.value) debitInput.value = '';
    });
});