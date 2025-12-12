document.addEventListener('DOMContentLoaded', () => {
    
    const privilege = localStorage.getItem('userPrivilege'); // Será "0", "1", o "2" (string)
    const usersLink = document.getElementById('main-nav-links'); 

    if (usersLink && privilege == '2') { // Si NO es Admin (0)
        usersLink.style.display = 'none'; // Ocultar el enlace
    }

    function handleLogout() {
        console.log("Cerrando sesión y redirigiendo..."); 
        localStorage.removeItem('token');
        localStorage.removeItem('userPrivilege');
        localStorage.removeItem('userName');
        window.location.replace('/index.html'); 
    }


    const logoutButton = document.getElementById('logout-button'); //

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    } else {
        console.warn("No se encontró el botón con id 'logout-button'");
    }
const INACTIVITY_TIME = 7 * 60 * 1000; // 7 minutos en milisegundos
let inactivityTimer;

// 1. Función que se ejecutará cuando se acabe el tiempo
function logoutDueToInactivity() {
    alert("Se ha cerrado la sesión por inactividad.");
    
    // Reutilizamos la lógica de logout 
    localStorage.removeItem('token');
    localStorage.removeItem('userPrivilege');
    localStorage.removeItem('userName');
    window.location.replace('/index.html');
}

// 2. Función para reiniciar el temporizador
function resetInactivityTimer() {
    clearTimeout(inactivityTimer); // Borra el temporizador anterior
    inactivityTimer = setTimeout(logoutDueToInactivity, INACTIVITY_TIME); // Crea uno nuevo
    // console.log("Timer reiniciado");
}

window.addEventListener('mousemove', resetInactivityTimer);
window.addEventListener('keydown', resetInactivityTimer);
window.addEventListener('click', resetInactivityTimer);
window.addEventListener('scroll', resetInactivityTimer);

// 4. Iniciar el temporizador por primera vez cuando se carga la página
resetInactivityTimer();

// document.getElementById('logout-button').addEventListener('click', handleLogout);
});