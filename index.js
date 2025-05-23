// Firebase SDKs (garanta que você os tenha no seu HTML antes deste script)
// <script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// </script>

// Sua configuração do Firebase (MANTENHA A SUA CONFIGURAÇÃO REAL AQUI)
const firebaseConfig = {
    apiKey: "AIzaSyAuutbwYf0ZHatqPGFJCweAmWHq84x9zac", // Substitua pela sua chave
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
} catch (e) {
    console.error("Erro crítico inicializando Firebase:", e);
    // Se o DOM já estiver pronto, você poderia tentar exibir um modal aqui,
    // mas é mais seguro lidar com isso no DOMContentLoaded.
    alert("Falha crítica ao inicializar os serviços base. A aplicação pode não funcionar corretamente.");
}

let userId = null; // ID do usuário autenticado
let races = []; // Array para armazenar as corridas do usuário
let firebaseRacesRef = null; // Referência ao nó das corridas no Firebase
let unsubscribeRacesListener = null; // Função para desregistrar o listener de corridas

// ==== Elementos do DOM (serão atribuídos quando o DOM estiver pronto) ====
let loginButton, logoutButton, raceForm, saveButton, racesTableBody, overallStatsContainer, loadingIndicator, noRacesMessage, authStatusElement, messageModalElement, modalMessageTitleElement, modalMessageTextElement, closeModalButtonElement;

// ==== Funções Auxiliares ====

/**
 * Converte um tempo (HH:MM:SS.ms ou MM:SS.ms ou SS.ms) para segundos.
 * @param {string} timeString
 * @returns {number} Tempo total em segundos.
 */
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

    if (numericParts.length === 3) { // HH:MM:SS
        seconds = numericParts[0] * 3600 + numericParts[1] * 60 + numericParts[2];
    } else if (numericParts.length === 2) { // MM:SS
        seconds = numericParts[0] * 60 + numericParts[1];
    } else if (numericParts.length === 1) { // SS
        seconds = numericParts[0];
    }
    return seconds + milliseconds;
}

/**
 * Formata um tempo em segundos para HH:MM:SS.ms ou MM:SS.ms ou SS.ms.
 * @param {number} totalSeconds
 * @returns {string} Tempo formatado.
 */
function formatTime(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '-'; // Corrigido para < 0, pois 0 é válido

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
         result += String(seconds.toFixed(3)); // Não pad se for só segundos
    }
    return result;
}

/**
 * Exibe um modal de mensagem personalizado.
 * @param {string} title Título da mensagem.
 * @param {string} text Conteúdo da mensagem.
 * @param {string} type Tipo da mensagem (success, error, info).
 */
function showMessageModal(title, text, type = 'info') {
    if (!messageModalElement || !modalMessageTitleElement || !modalMessageTextElement) {
        console.warn("Modal elements not found. Message:", title, text);
        alert(`${title}\n${text}`); // Fallback para alert
        return;
    }

    modalMessageTitleElement.textContent = title;
    modalMessageTextElement.textContent = text;

    modalMessageTitleElement.classList.remove('text-green-600', 'text-red-600', 'text-blue-600');
    if (type === 'success') {
        modalMessageTitleElement.classList.add('text-green-600');
    } else if (type === 'error') {
        modalMessageTitleElement.classList.add('text-red-600');
    } else {
        modalMessageTitleElement.classList.add('text-blue-600');
    }

    messageModalElement.classList.remove('hidden');
    setTimeout(() => messageModalElement.classList.add('show'), 10);
}

/**
 * Fecha o modal de mensagem.
 */
function closeModal() {
    if (!messageModalElement) return;
    messageModalElement.classList.remove('show');
    setTimeout(() => messageModalElement.classList.add('hidden'), 300);
}

/**
 * Adiciona uma linha à tabela de corridas.
 * @param {object} raceData Dados da corrida.
 * @param {number} index Índice da corrida.
 * @param {boolean} isTemporary Indica se é uma linha temporária (da digitação).
 */
function addRaceRowToTable(raceData, index, isTemporary = false) {
    if (!racesTableBody) return;
    const row = racesTableBody.insertRow();
    row.classList.add(
        'bg-white', 'border-b', 'dark:bg-gray-800', 'dark:border-gray-700',
        'hover:bg-gray-50', 'dark:hover:bg-gray-600'
    );
    if (isTemporary) {
        row.id = 'temporary-race-row';
        row.classList.add('opacity-70', 'italic', 'text-gray-500', 'dark:text-gray-400');
    } else {
        row.classList.add('text-gray-900', 'dark:text-white');
    }

    const raceNumberCell = row.insertCell();
    raceNumberCell.textContent = isTemporary ? '...' : (index + 1);
    raceNumberCell.classList.add('px-6', 'py-4', 'font-medium');


    const nameCell = row.insertCell();
    nameCell.textContent = raceData.name || '-';
    nameCell.classList.add('px-6', 'py-4');

    const positionCell = row.insertCell();
    positionCell.textContent = raceData.position || '-';
    positionCell.classList.add('px-6', 'py-4');

    const lapsCell = row.insertCell();
    lapsCell.textContent = raceData.totalLaps || '-';
    lapsCell.classList.add('px-6', 'py-4');

    const timeCell = row.insertCell();
    timeCell.textContent = raceData.time ? formatTime(parseTimeToSeconds(raceData.time)) : '-'; // Formata o tempo aqui
    timeCell.classList.add('px-6', 'py-4');

    const fastestLapCell = row.insertCell();
    fastestLapCell.textContent = raceData.fastestLap ? (raceData.fastestLap === 'sim' ? 'Sim' : 'Não') : '-';
    fastestLapCell.classList.add('px-6', 'py-4');

    const lapsLedCell = row.insertCell();
    lapsLedCell.textContent = raceData.lapsLed || '-';
    lapsLedCell.classList.add('px-6', 'py-4');

    const actionsCell = row.insertCell();
    actionsCell.classList.add('px-6', 'py-4', 'text-right');

    if (!isTemporary && raceData.id) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.classList.add(
            'font-medium', 'text-red-600', 'dark:text-red-500', 'hover:underline', 'ml-2'
        );
        deleteButton.onclick = () => deleteRace(raceData.id);
        actionsCell.appendChild(deleteButton);
    } else if (isTemporary) {
        actionsCell.textContent = '(digitando...)';
        actionsCell.classList.add('text-xs', 'text-gray-400');
    }
}

/**
 * Atualiza as estatísticas exibidas na interface.
 */
function updateStats() {
    if (!racesTableBody || !overallStatsContainer || !noRacesMessage) return;

    let totalRaces = 0;
    let totalPositions = 0;
    let totalFastestLaps = 0;
    let totalLapsLed = 0;
    let totalTimeSeconds = 0;
    let totalCompletedRaces = 0;

    racesTableBody.innerHTML = '';

    races.forEach((race, index) => {
        addRaceRowToTable(race, index, false);
        totalRaces++;

        if (race.position && !isNaN(parseInt(race.position))) {
            totalPositions += parseInt(race.position);
            totalCompletedRaces++;
        }
        if (race.fastestLap === 'sim') {
            totalFastestLaps++;
        }
        if (race.lapsLed && !isNaN(parseInt(race.lapsLed))) {
            totalLapsLed += parseInt(race.lapsLed);
        }
        if (race.time) {
            totalTimeSeconds += parseTimeToSeconds(race.time);
        }
    });

    const currentRaceNameInput = document.getElementById('race-name');
    const currentPositionInput = document.getElementById('position');

    const currentRaceName = currentRaceNameInput ? currentRaceNameInput.value.trim() : '';
    const currentPositionValue = currentPositionInput ? currentPositionInput.value.trim() : '';


    if (currentRaceName || currentPositionValue) {
        const currentRaceData = {
            name: currentRaceName,
            position: currentPositionValue,
            totalLaps: document.getElementById('total-laps')?.value.trim() || '',
            time: document.getElementById('time')?.value.trim() || '',
            fastestLap: document.getElementById('fastest-lap')?.value || 'nao',
            lapsLed: document.getElementById('laps-led')?.value.trim() || ''
        };
        addRaceRowToTable(currentRaceData, races.length, true);
        totalRaces++;

        if (currentRaceData.position && !isNaN(parseInt(currentRaceData.position))) {
            totalPositions += parseInt(currentRaceData.position);
            totalCompletedRaces++;
        }
        if (currentRaceData.fastestLap === 'sim') {
            totalFastestLaps++;
        }
        if (currentRaceData.lapsLed && !isNaN(parseInt(currentRaceData.lapsLed))) {
            totalLapsLed += parseInt(currentRaceData.lapsLed);
        }
        if (currentRaceData.time) {
            totalTimeSeconds += parseTimeToSeconds(currentRaceData.time);
        }
    }

    document.getElementById('stat-total-races').textContent = totalRaces;
    document.getElementById('stat-avg-position').textContent = totalCompletedRaces > 0 ? (totalPositions / totalCompletedRaces).toFixed(2) : '-';
    document.getElementById('stat-fastest-laps').textContent = totalFastestLaps;
    document.getElementById('stat-laps-led').textContent = totalLapsLed;
    document.getElementById('stat-total-time').textContent = formatTime(totalTimeSeconds);

    if (races.length === 0 && !currentRaceName && !currentPositionValue) {
        noRacesMessage.classList.remove('hidden');
    } else {
        noRacesMessage.classList.add('hidden');
    }
}

/**
 * Carrega as corridas do Firebase para o usuário logado.
 */
async function loadRaces() {
    if (!loadingIndicator || !racesTableBody || !noRacesMessage) return;

    loadingIndicator.classList.remove('hidden');
    racesTableBody.innerHTML = '';
    noRacesMessage.classList.add('hidden');

    if (unsubscribeRacesListener) {
        unsubscribeRacesListener(); // Cancela o listener anterior
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
            for (let key in data) {
                races.push({ id: key, ...data[key] });
            }
        }
        updateStats();
        loadingIndicator.classList.add('hidden');
    }, (error) => {
        console.error("Erro ao carregar corridas:", error);
        loadingIndicator.classList.add('hidden');
        showMessageModal('Erro!', 'Não foi possível carregar suas corridas.', 'error');
        races = []; // Garante que races esteja vazio em caso de erro
        updateStats(); // Atualiza a UI para refletir o erro/estado vazio
    });
}

/**
 * Salva uma nova corrida no Firebase.
 * @param {object} raceData
 */
async function saveRace(raceData) {
    if (!userId) {
        showMessageModal('Erro!', 'Você precisa estar logado para salvar corridas.', 'error');
        return;
    }
    if (!database) {
        showMessageModal('Erro!', 'Conexão com o banco de dados não estabelecida.', 'error');
        return;
    }

    try {
        const userRacesRef = ref(database, `users/${userId}/races`);
        const newRaceRef = push(userRacesRef);
        await set(newRaceRef, raceData);
        
        if (raceForm) raceForm.reset(); // Limpa o formulário
        // updateStats() será chamado automaticamente pelo listener onValue após o set.
        showMessageModal('Sucesso!', 'Corrida salva com sucesso!', 'success');
    } catch (error) {
        console.error("Erro ao salvar corrida:", error);
        showMessageModal('Erro!', 'Erro ao salvar corrida. Tente novamente.', 'error');
    }
}

/**
 * Exclui uma corrida do Firebase.
 * @param {string} raceId ID da corrida a ser excluída.
 */
async function deleteRace(raceId) {
    if (!confirm('Tem certeza que deseja excluir esta corrida?')) {
        return;
    }
    if (!userId) {
        showMessageModal('Erro!', 'Você precisa estar logado para excluir corridas.', 'error');
        return;
    }
    if (!database) {
        showMessageModal('Erro!', 'Conexão com o banco de dados não estabelecida.', 'error');
        return;
    }

    try {
        const raceToDeleteRef = ref(database, `users/${userId}/races/${raceId}`);
        await remove(raceToDeleteRef);
        // O onValue em loadRaces() se encarrega de atualizar a UI.
        showMessageModal('Sucesso!', 'Corrida excluída com sucesso!', 'success');
    } catch (error) {
        console.error("Erro ao excluir corrida:", error);
        showMessageModal('Erro!', 'Erro ao excluir corrida. Tente novamente.', 'error');
    }
}

/**
 * Configura os listeners de input para o formulário de corrida.
 */
function setupRaceInputListeners() {
    if (!raceForm) return;
    const inputs = raceForm.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.removeEventListener('input', updateStats); // Evita duplicar listeners
        input.addEventListener('input', updateStats);
    });
}


// ==== Inicialização e Event Listeners (quando o DOM estiver pronto) ====
document.addEventListener('DOMContentLoaded', () => {
    // Atribui elementos do DOM a variáveis
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
    closeModalButtonElement = document.getElementById('close-modal-button'); // Para o botão de fechar no modal

    // Verificação de elementos essenciais
    const essentialElements = { loginButton, logoutButton, raceForm, saveButton, racesTableBody, overallStatsContainer, loadingIndicator, noRacesMessage, authStatusElement, messageModalElement, modalMessageTitleElement, modalMessageTextElement };
    for (const key in essentialElements) {
        if (!essentialElements[key]) {
            console.error(`Elemento do DOM essencial não encontrado: ${key}. Verifique o ID no HTML.`);
            if (authStatusElement) authStatusElement.textContent = "Erro: Falha ao carregar componentes da página.";
            // Poderia mostrar um erro mais visível para o usuário aqui
            return; // Impede a execução do restante do script se algo crítico faltar
        }
    }
    
    // Se o Firebase falhou na inicialização global, tenta de novo ou mostra erro.
    if (!app || !auth || !database) {
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            database = getDatabase(app);
        } catch (e) {
            console.error("Erro na inicialização do Firebase (DOMContentLoaded):", e);
            showMessageModal('Erro Crítico', 'Não foi possível conectar aos serviços Firebase. Tente recarregar a página.', 'error');
            return;
        }
    }

    // Listener de mudança de estado de autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId = user.uid;
            loginButton.classList.add('hidden');
            logoutButton.classList.remove('hidden');
            authStatusElement.textContent = `Logado como: ${user.email || user.displayName || 'Usuário Anônimo'}`;
            authStatusElement.classList.remove('text-red-500');
            authStatusElement.classList.add('text-green-600');
            loadRaces();
            setupRaceInputListeners(); // Reconfigura listeners caso o formulário seja recriado ou modificado
            if (raceForm) raceForm.style.display = ''; // Mostra o formulário
            if (overallStatsContainer) overallStatsContainer.style.display = ''; // Mostra estatísticas
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
            
            updateStats(); // Limpa estatísticas e tabela
            if (racesTableBody) racesTableBody.innerHTML = '';
            if (noRacesMessage) noRacesMessage.classList.remove('hidden');
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            if (raceForm) raceForm.style.display = 'none'; // Esconde o formulário
            if (overallStatsContainer) overallStatsContainer.style.display = 'none'; // Esconde estatísticas
        }
    });

    setupRaceInputListeners(); // Configuração inicial dos listeners do formulário
    // loadRaces(); // Chamado por onAuthStateChanged, não precisa aqui geralmente

    loginButton.addEventListener('click', async () => {
        showMessageModal('Login', 'Para testar, o login anônimo será tentado. Em uma aplicação real, integre com Google, Email, etc.', 'info');
        try {
            await signInAnonymously(auth);
            // onAuthStateChanged irá lidar com as atualizações da UI após o login
        } catch (error) {
            console.error("Erro no login anônimo:", error);
            showMessageModal('Erro de Login', `Falha ao tentar login anônimo: ${error.message}`, 'error');
        }
    });

    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showMessageModal('Logout', 'Você foi desconectado.', 'success');
            // onAuthStateChanged irá lidar com as atualizações da UI
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
        const position = document.getElementById('position')?.value.trim();
        const totalLaps = document.getElementById('total-laps')?.value.trim();
        const time = document.getElementById('time')?.value.trim();
        const fastestLap = document.getElementById('fastest-lap')?.value;
        const lapsLed = document.getElementById('laps-led')?.value.trim();

        if (!raceName) {
            showMessageModal('Atenção', 'O nome da corrida é obrigatório.', 'info');
            return;
        }

        const newRaceData = {
            name: raceName,
            position: position || null,
            totalLaps: totalLaps || null,
            time: time || null,
            fastestLap: fastestLap || 'nao',
            lapsLed: lapsLed || null
        };
        saveRace(newRaceData);
    });

    // Listener para o modal de mensagem (clicar fora fecha)
    messageModalElement.addEventListener('click', (e) => {
        if (e.target.id === 'message-modal') {
            closeModal();
        }
    });
    
    // Listener para o botão de fechar explicitamente no modal (se existir)
    if (closeModalButtonElement) {
        closeModalButtonElement.addEventListener('click', closeModal);
    }
});
