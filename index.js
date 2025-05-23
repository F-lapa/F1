// Firebase SDKs (importações modulares)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAuutbwYf0ZHatqPGFJCweAmWHq84x9zac",
    authDomain: "formula-1-4d935.firebaseapp.com",
    projectId: "formula-1-4d935",
    storageBucket: "formula-1-4d935.firebasestorage.app",
    messagingSenderId: "451569681777",
    appId: "1:451569681777:web:4bfcc9d590d480965c22d0",
    measurementId: "G-2JTBM17G1T"
};

// Inicializa Firebase
let app;
let auth;
let database;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    database = getDatabase(app);
    console.log("Firebase inicializado com sucesso");
} catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
    alert("Falha ao inicializar o Firebase. Verifique a configuração.");
    throw e; // Impede execução se Firebase não inicializar
}

// Variáveis globais
let userId = null;
let races = [];
let firebaseRacesRef = null;
let unsubscribeRacesListener = null;

// Elementos do DOM
let loginButton, logoutButton, raceForm, saveButton, racesTableBody, overallStatsContainer, loadingIndicator, noRacesMessage, authStatusElement, messageModalElement, modalMessageTitleElement, modalMessageTextElement, closeModalButtonElement;

// Funções auxiliares
function parseTimeToSeconds(timeString) {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    let seconds = 0;
    let milliseconds = 0;

    if (parts[parts.length - 1].includes('.')) {
        const lastPart = parts[parts.length - 1].split('.');
        parts[parts.length - 1] = lastPart[0];
        milliseconds = parseFloat('0.' + (lastPart[1] || '0'));
    }

    const numericParts = parts.map(Number);
    if (numericParts.length === 3) {
        seconds = numericParts[0] * 3600 + numericParts[1] * 60 + numericParts[2];
    } else if (numericParts.length === 2) {
        seconds = numericParts[0] * 60 + numericParts[1];
    } else if (numericParts.length === 1) {
        seconds = numericParts[0];
    }
    return seconds + milliseconds;
}

function formatTime(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '-';
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    let result = '';
    if (hours > 0) {
        result += String(hours).padStart(2, '0') + ':';
        result += String(minutes).padStart(2, '0') + ':';
        result += String(seconds.toFixed(3)).padStart(6, '0');
    } else if (minutes > 0) {
        result += String(minutes).padStart(2, '0') + ':';
        result += String(seconds.toFixed(3)).padStart(6, '0');
    } else {
        result += String(seconds.toFixed(3));
    }
    return result;
}

function showMessageModal(title, text, type = 'info') {
    if (!messageModalElement || !modalMessageTitleElement || !modalMessageTextElement) {
        console.warn("Modal elements not found:", title, text);
        alert(`${title}\n${text}`);
        return;
    }

    modalMessageTitleElement.textContent = title;
    modalMessageTextElement.textContent = text;
    modalMessageTitleElement.classList.remove('text-green-600', 'text-red-600', 'text-blue-600');
    if (type === 'success') modalMessageTitleElement.classList.add('text-green-600');
    else if (type === 'error') modalMessageTitleElement.classList.add('text-red-600');
    else modalMessageTitleElement.classList.add('text-blue-600');

    messageModalElement.classList.remove('hidden');
    setTimeout(() => messageModalElement.classList.add('show'), 10);
}

function closeModal() {
    if (!messageModalElement) return;
    messageModalElement.classList.remove('show');
    setTimeout(() => messageModalElement.classList.add('hidden'), 300);
}

function addRaceRowToTable(raceData, index, isTemporary = false) {
    if (!racesTableBody) return;
    const row = racesTableBody.insertRow();
    row.classList.add('bg-white', 'border-b', 'dark:bg-gray-800', 'dark:border-gray-700', 'hover:bg-gray-50', 'dark:hover:bg-gray-600');
    if (isTemporary) {
        row.id = 'temporary-race-row';
        row.classList.add('opacity-70', 'italic', 'text-gray-500', 'dark:text-gray-400');
    } else {
        row.classList.add('text-gray-900', 'dark:text-white');
    }

    const cells = [
        isTemporary ? '...' : (index + 1),
        raceData.name || '-',
        raceData.position || '-',
        raceData.totalLaps || '-',
        raceData.time ? formatTime(parseTimeToSeconds(raceData.time)) : '-',
        raceData.fastestLap ? (raceData.fastestLap === 'sim' ? 'Sim' : 'Não') : '-',
        raceData.lapsLed || '-'
    ];

    cells.forEach((content, i) => {
        const cell = row.insertCell();
        cell.textContent = content;
        cell.classList.add('px-6', 'py-4');
        if (i === 0) cell.classList.add('font-medium');
    });

    const actionsCell = row.insertCell();
    actionsCell.classList.add('px-6', 'py-4', 'text-right');
    if (!isTemporary && raceData.id) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.classList.add('font-medium', 'text-red-600', 'dark:text-red-500', 'hover:underline', 'ml-2');
        deleteButton.onclick = () => deleteRace(raceData.id);
        actionsCell.appendChild(deleteButton);
    } else if (isTemporary) {
        actionsCell.textContent = '(digitando...)';
        actionsCell.classList.add('text-xs', 'text-gray-400');
    }
}

function updateStats() {
    if (!racesTableBody || !overallStatsContainer || !noRacesMessage) return;

    let totalRaces = 0, totalPositions = 0, totalFastestLaps = 0, totalLapsLed = 0, totalTimeSeconds = 0, totalCompletedRaces = 0;
    racesTableBody.innerHTML = '';

    races.forEach((race, index) => {
        addRaceRowToTable(race, index, false);
        totalRaces++;
        if (race.position && !isNaN(parseInt(race.position))) {
            totalPositions += parseInt(race.position);
            totalCompletedRaces++;
        }
        if (race.fastestLap === 'sim') totalFastestLaps++;
        if (race.lapsLed && !isNaN(parseInt(race.lapsLed))) totalLapsLed += parseInt(race.lapsLed);
        if (race.time) totalTimeSeconds += parseTimeToSeconds(race.time);
    });

    const inputs = {
        raceName: document.getElementById('race-name')?.value.trim(),
        position: document.getElementById('position')?.value.trim(),
        totalLaps: document.getElementById('total-laps')?.value.trim(),
        time: document.getElementById('time')?.value.trim(),
        fastestLap: document.getElementById('fastest-lap')?.value,
        lapsLed: document.getElementById('laps-led')?.value.trim()
    };

    if (Object.values(inputs).some(val => val)) {
        const currentRaceData = {
            name: inputs.raceName || '',
            position: inputs.position || '',
            totalLaps: inputs.totalLaps || '',
            time: inputs.time || '',
            fastestLap: inputs.fastestLap || 'nao',
            lapsLed: inputs.lapsLed || ''
        };
        addRaceRowToTable(currentRaceData, races.length, true);
        totalRaces++;
        if (currentRaceData.position && !isNaN(parseInt(currentRaceData.position))) {
            totalPositions += parseInt(currentRaceData.position);
            totalCompletedRaces++;
        }
        if (currentRaceData.fastestLap === 'sim') totalFastestLaps++;
        if (currentRaceData.lapsLed && !isNaN(parseInt(currentRaceData.lapsLed))) totalLapsLed += parseInt(currentRaceData.lapsLed);
        if (currentRaceData.time) totalTimeSeconds += parseTimeToSeconds(currentRaceData.time);
    }

    document.getElementById('stat-total-races').textContent = totalRaces;
    document.getElementById('stat-avg-position').textContent = totalCompletedRaces > 0 ? (totalPositions / totalCompletedRaces).toFixed(2) : '-';
    document.getElementById('stat-fastest-laps').textContent = totalFastestLaps;
    document.getElementById('stat-laps-led').textContent = totalLapsLed;
    document.getElementById('stat-total-time').textContent = formatTime(totalTimeSeconds);

    noRacesMessage.classList.toggle('hidden', races.length > 0 || Object.values(inputs).some(val => val));
}

async function loadRaces() {
    if (!loadingIndicator || !racesTableBody || !noRacesMessage) return;

    loadingIndicator.classList.remove('hidden');
    racesTableBody.innerHTML = '';
    noRacesMessage.classList.add('hidden');

    if (unsubscribeRacesListener) {
        unsubscribeRacesListener();
        unsubscribeRacesListener = null;
    }

    if (!userId) {
        races = [];
        updateStats();
        loadingIndicator.classList.add('hidden');
        noRacesMessage.classList.remove('hidden');
        return;
    }

    firebaseRacesRef = ref(database, `users/${userId}/races`);
    unsubscribeRacesListener = onValue(firebaseRacesRef, (snapshot) => {
        races = [];
        const data = snapshot.val();
        if (data) {
            for (let key in data) races.push({ id: key, ...data[key] });
        }
        updateStats();
        loadingIndicator.classList.add('hidden');
    }, (error) => {
        console.error("Erro ao carregar corridas:", error);
        loadingIndicator.classList.add('hidden');
        showMessageModal('Erro!', 'Não foi possível carregar suas corridas.', 'error');
        races = [];
        updateStats();
    });
}

async function saveRace(raceData) {
    if (!userId || !database) {
        showMessageModal('Erro!', 'Você precisa estar logado e conectado ao banco de dados.', 'error');
        return;
    }

    try {
        const userRacesRef = ref(database, `users/${userId}/races`);
        const newRaceRef = push(userRacesRef);
        await set(newRaceRef, raceData);
        raceForm?.reset();
        showMessageModal('Sucesso!', 'Corrida salva com sucesso!', 'success');
    } catch (error) {
        console.error("Erro ao salvar corrida:", error);
        showMessageModal('Erro!', 'Erro ao salvar corrida. Tente novamente.', 'error');
    }
}

async function deleteRace(raceId) {
    if (!confirm('Tem certeza que deseja excluir esta corrida?') || !userId || !database) return;

    try {
        const raceToDeleteRef = ref(database, `users/${userId}/races/${raceId}`);
        await remove(raceToDeleteRef);
        showMessageModal('Sucesso!', 'Corrida excluída com sucesso!', 'success');
    } catch (error) {
        console.error("Erro ao excluir corrida:", error);
        showMessageModal('Erro!', 'Erro ao excluir corrida. Tente novamente.', 'error');
    }
}

function setupRaceInputListeners() {
    if (!raceForm) return;
    raceForm.querySelectorAll('input, select').forEach(input => {
        input.removeEventListener('input', updateStats);
        input.addEventListener('input', updateStats);
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Atribuir elementos do DOM
    loginButton = document.getElementById('login-button');
    logoutButton = document.getElementById('logout-button');
    raceForm = document.getElementById('race-form');
    saveButton = document.getElementById('save-race-button');
    racesTableBody = document.getElementById('races-table-body');
    overallStatsContainer = document.getElementById('overall-stats');
    loadingIndicator = document.getElementById('loading-indicator');
    noRacesMessage = document.getElementById('no-races-message');
    authStatusElement = document.getElementById('auth-status');
    messageModalElement = document.getElementById('message-modal');
    modalMessageTitleElement = document.getElementById('modal-message-title');
    modalMessageTextElement = document.getElementById('modal-message-text');
    closeModalButtonElement = document.getElementById('close-modal-button');

    // Verificar elementos essenciais
    const elements = [loginButton, logoutButton, raceForm, saveButton, racesTableBody, overallStatsContainer, loadingIndicator, noRacesMessage, authStatusElement, messageModalElement, modalMessageTitleElement, modalMessageTextElement];
    if (elements.some(el => !el)) {
        console.error("Elementos do DOM faltando. Verifique os IDs no HTML.");
        authStatusElement.textContent = "Erro: Componentes da página não encontrados.";
        showMessageModal('Erro!', 'Falha ao carregar a página. Verifique o HTML.', 'error');
        return;
    }

    // Configurar autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId = user.uid;
            loginButton.classList.add('hidden');
            logoutButton.classList.remove('hidden');
            authStatusElement.textContent = `Logado como: Usuário Anônimo (${user.uid.slice(0, 8)})`;
            authStatusElement.classList.remove('text-red-500');
            authStatusElement.classList.add('text-green-600');
            loadRaces();
            setupRaceInputListeners();
            raceForm.style.display = '';
            overallStatsContainer.style.display = '';
        } else {
            userId = null;
            if (unsubscribeRacesListener) {
                unsubscribeRacesListener();
                unsubscribeRacesListener = null;
            }
            races = [];
            firebaseRacesRef = null;
            loginButton.classList.remove('hidden');
            logoutButton.classList.add('hidden');
            authStatusElement.textContent = 'Não logado';
            authStatusElement.classList.remove('text-green-600');
            authStatusElement.classList.add('text-red-500');
            updateStats();
            racesTableBody.innerHTML = '';
            noRacesMessage.classList.remove('hidden');
            loadingIndicator.classList.add('hidden');
            raceForm.style.display = 'none';
            overallStatsContainer.style.display = 'none';
        }
    });

    loginButton.addEventListener('click', async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Erro no login anônimo:", error);
            showMessageModal('Erro de Login', `Falha ao tentar login anônimo: ${error.message}`, 'error');
        }
    });

    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showMessageModal('Logout', 'Você foi desconectado.', 'success');
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            showMessageModal('Erro!', 'Erro ao fazer logout. Tente novamente.', 'error');
        }
    });

    saveButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (!userId) {
            showMessageModal('Atenção', 'Você precisa estar logado para salvar uma corrida.', 'info');
            return;
        }

        const raceName = document.getElementById('race-name')?.value.trim();
        if (!raceName) {
            showMessageModal('Atenção', 'O nome da corrida é obrigatório.', 'info');
            return;
        }

        const newRaceData = {
            name: raceName,
            position: document.getElementById('position')?.value.trim() || null,
            totalLaps: document.getElementById('total-laps')?.value.trim() || null,
            time: document.getElementById('time')?.value.trim() || null,
            fastestLap: document.getElementById('fastest-lap')?.value || 'nao',
            lapsLed: document.getElementById('laps-led')?.value.trim() || null
        };
        saveRace(newRaceData);
    });

    messageModalElement.addEventListener('click', (e) => {
        if (e.target.id === 'message-modal') closeModal();
    });

    if (closeModalButtonElement) closeModalButtonElement.addEventListener('click', closeModal);
});
