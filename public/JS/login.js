document.addEventListener('DOMContentLoaded', () => {
    // Referencias
    const scannerInput = document.getElementById('scanner-input');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const employeeDisplay = document.getElementById('employee-number-display');
    const passwordForm = document.getElementById('passwordForm');
    const passwordInput = document.getElementById('password');
    const backButton = document.getElementById('backButton');
    const scanningIndicator = document.querySelector('.scanning-pulse'); // Referencia visual (opcional)

    let isScanning = true;
    let lastKeyTime = 0;
    const SCAN_SPEED_THRESHOLD = 50; // milisegundos (Humano > 50ms | Scanner < 50ms)

    // 1. LÓGICA DE LIMPIEZA
    function parseScannedEmployee(rawCode) {
        if (!rawCode) return null;
        // Solo números (borra la "A" y otros caracteres)
        const numbersOnly = rawCode.replace(/\D/g, ''); 
        const cleanNumber = parseInt(numbersOnly, 10);
        if (isNaN(cleanNumber) || cleanNumber === 0) return null;
        return cleanNumber.toString();
    }

    // 2. FOCO AGRESIVO (Para que el escáner siempre escriba en el input oculto)
    function maintainFocus() {
        if (isScanning && document.activeElement !== scannerInput) {
            scannerInput.focus();
        }
    }
    
    // Intervalo de seguridad por si se pierde el foco
    setInterval(maintainFocus, 500);
    document.addEventListener('click', maintainFocus);
    scannerInput.focus();

    // 3. DETECTOR ANTI-TECLADO (La magia está aquí)
    scannerInput.addEventListener('keydown', (e) => {
        const now = Date.now();
        const timeGap = now - lastKeyTime;
        lastKeyTime = now;

        // Si es ENTER, intentamos procesar lo que haya sobrevivido en el input
        if (e.key === 'Enter') {
            e.preventDefault();
            finishScan();
            return;
        }

        // BLOQUEO DE ESCRITURA MANUAL
        // Si el tiempo entre tecla y tecla es mayor a 50ms (velocidad humana),
        // asumimos que es el INICIO de un nuevo intento y borramos lo anterior.
        // Esto hace imposible escribir una palabra completa manualmente.
        if (timeGap > SCAN_SPEED_THRESHOLD) {
            // Si tardaste mucho, borramos todo lo anterior.
            // Solo se guarda la tecla actual como "inicio" de una posible ráfaga.
            scannerInput.value = ''; 
        }
        
        // Visual: Si quieres que el usuario vea que está escaneando, puedes cambiar el borde
        if (scanningIndicator) {
            scanningIndicator.style.borderColor = '#00C2FF';
            setTimeout(() => scanningIndicator.style.borderColor = '#E0E0E0', 200);
        }
    });

    function finishScan() {
        // Pequeño delay para asegurar que el input se llenó con la ráfaga completa
        setTimeout(() => {
            const raw = scannerInput.value;
            const employeeId = parseScannedEmployee(raw);

            scannerInput.value = ''; // Limpiar siempre

            if (!employeeId) {
                console.log("Lectura inválida o manual detectada");
                // Opcional: Mostrar error visual
                return;
            }

            console.log("Escaneo válido:", employeeId);
            goToStep2(employeeId);
        }, 50); // 50ms de gracia
    }

    // 4. TRANSICIÓN Y RESTO DE LÓGICA
    function goToStep2(employeeId) {
        isScanning = false;
        employeeDisplay.value = employeeId; 
        step1.style.display = 'none';
        step2.style.display = 'block';
        setTimeout(() => passwordInput.focus(), 100);
    }

    backButton.addEventListener('click', (e) => {
        e.preventDefault();
        resetLogin();
    });

    function resetLogin() {
        step2.style.display = 'none';
        step1.style.display = 'block';
        passwordInput.value = '';
        employeeDisplay.value = '';
        isScanning = true;
        scannerInput.value = '';
        scannerInput.focus();
    }

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const no_employee = employeeDisplay.value;
        const password = passwordInput.value;

        if (!no_employee || !password) return;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ no_employee, password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('userPrivilege', result.user.privilege);
                window.location.href = '/adminIndex.html'; 
            } else {
                alert(result.message || 'Credenciales incorrectas');
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        }
    });
});