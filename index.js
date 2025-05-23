// Firebase SDKs (garanta que você os tenha no seu HTML antes deste script)
// <script type="module">
//   import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
//   import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
//   import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
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
// Certifique-se de que 'initializeApp', 'getAuth', 'getDatabase' estão importados corretamente
// se estiver usando módulos ES6 (type="module" no script tag).
let app;
let auth;
let database;
let userId = null; // ID do usuário autenticado
let races = []; // Array para armazenar as corridas do usuário
let firebaseRacesRef = null; // Referência ao nó das corridas no Firebase

// ==== Elementos do DOM ====
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const raceForm = document.getElementById('race-form');
const saveButton = document.getElementById('save-race-button');
const racesTableBody = document.getElementById('races-table-body');
const overallStatsContainer = document.getElementById('overall-stats');
const loadingIndicator = document.getElementById('loading-indicator');
const noRacesMessage = document.getElementById('no-races-message');
const authStatusElement = document.getElementById('auth-status'); // Elemento para mostrar status de login

// ==== Funções Auxiliares ====

/**
 * Converte um tempo (HH:MM:SS.ms ou MM:SS.ms ou SS.ms) para segundos.
 * @param {string} timeString
 * @returns {number} Tempo total em segundos.
 */
function parseTimeToSeconds(timeString) {
    if (!timeString) return 0;
    const parts = timeString.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) { // HH:MM:SS
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // MM:SS
        seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 1) { // SS (ou SS.ms)
        seconds = parts[0];
    }
    // Considerar milissegundos se houver (ex: "1.234")
    if (timeString.includes('.')) {
        seconds += parseFloat('0.' + timeString.split('.')[1] || '0');
    }
    return seconds;
}

/**
 * Formata um tempo em segundos para HH:MM:SS.ms ou MM:SS.ms ou SS.ms.
 * @param {number} totalSeconds
 * @returns {string} Tempo formatado.
 */
function formatTime(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '-';

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    let result = '';
    if (hours > 0) {
        result += String(hours).padStart(2, '0') + ':';
    }
    result += String(minutes).padStart(2, '0') + ':';
    result += String(seconds.toFixed(3)).padStart(6, '0'); // Garante 3 casas decimais

    return result;
}

/**
 * Exibe um modal de mensagem personalizado.
 * @param {string} title Título da mensagem.
 * @param {string} text Conteúdo da mensagem.
 * @param {string} type Tipo da mensagem (success, error, info).
 */
function showMessageModal(title, text, type = 'info') {
    const modal = document.getElementById('message-modal');
    document.getElementById('modal-message-title').textContent = title;
    document.getElementById('modal-message-text').textContent = text;

    const titleElement = document.getElementById('modal-message-title');
    titleElement.classList.remove('text-green-600', 'text-red-600', 'text-blue-600');
    if (type === 'success') {
        titleElement.classList.add('text-green-600');
    } else if (type === 'error') {
        titleElement.classList.add('text-red-600');
    } else {
        titleElement.classList.add('text-blue-600');
    }

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Fecha o modal de mensagem.
 */
function closeModal() {
    const modal = document.getElementById('message-modal');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 300);
}


/**
 * Adiciona uma linha à tabela de corridas.
 * @param {object} raceData Dados da corrida.
 * @param {number} index Índice da corrida.
 * @param {boolean} isTemporary Indica se é uma linha temporária (da digitação).
 */
function addRaceRowToTable(raceData, index, isTemporary = false) {
    const row = racesTableBody.insertRow();
    row.classList.add(
        'bg-white', 'border-b', 'dark:bg-gray-800', 'dark:border-gray-700',
        'hover:bg-gray-50', 'dark:hover:bg-gray-600',
        isTemporary ? 'text-gray-500' : 'text-gray-900' // Cor mais clara para temporário
    );
    if (isTemporary) {
        row.id = 'temporary-race-row'; // ID para fácil remoção/atualização
        row.classList.add('opacity-70', 'italic'); // Destaca como temporário
    }

    // Adiciona células com os dados da corrida
    // 'index + 1' para começar a contagem da corrida em 1
    const raceNumberCell = row.insertCell();
    raceNumberCell.textContent = isTemporary ? '...' : (index + 1); // Mostra '...' para temporário

    const nameCell = row.insertCell();
    nameCell.textContent = raceData.name || '-';

    const positionCell = row.insertCell();
    positionCell.textContent = raceData.position || '-';

    const lapsCell = row.insertCell();
    lapsCell.textContent = raceData.totalLaps || '-';

    const timeCell = row.insertCell();
    timeCell.textContent = raceData.time || '-';

    const fastestLapCell = row.insertCell();
    fastestLapCell.textContent = raceData.fastestLap ? (raceData.fastestLap === 'sim' ? 'Sim' : 'Não') : '-';

    const lapsLedCell = row.insertCell();
    lapsLedCell.textContent = raceData.lapsLed || '-';


    const actionsCell = row.insertCell();
    actionsCell.classList.add('px-6', 'py-4', 'text-right');

    if (!isTemporary) { // Botões de ação apenas para corridas salvas
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.classList.add(
            'font-medium', 'text-red-600', 'dark:text-red-500', 'hover:underline', 'ml-2'
        );
        deleteButton.onclick = () => deleteRace(raceData.id); // raceData.id deve vir do Firebase
        actionsCell.appendChild(deleteButton);
    } else {
        actionsCell.textContent = '(digitando...)';
        actionsCell.classList.add('text-xs', 'text-gray-400');
    }
}

/**
 * Atualiza as estatísticas exibidas na interface.
 */
function updateStats() {
    let totalRaces = 0;
    let totalPositions = 0;
    let totalFastestLaps = 0;
    let totalLapsLed = 0;
    let totalTimeSeconds = 0;
    let totalCompletedRaces = 0; // Para calcular a média da posição

    // Limpa a tabela para repopular com os dados mais recentes
    racesTableBody.innerHTML = '';

    // Adiciona as corridas salvas e calcula suas estatísticas
    races.forEach((race, index) => {
        addRaceRowToTable(race, index, false); // false = não é temporário
        totalRaces++; // Incrementa para cada corrida existente

        if (race.position && !isNaN(parseInt(race.position))) {
            totalPositions += parseInt(race.position);
            totalCompletedRaces++; // Apenas corridas com posição definida
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

    // ==== Lógica para adicionar a corrida atual que está sendo digitada (temporária) ====
    const currentRaceName = document.getElementById('race-name').value.trim();
    // Verifica se há pelo menos o nome da corrida ou alguma posição para considerar uma corrida temporária
    if (currentRaceName || document.getElementById('position').value.trim()) {
        const currentPosition = document.getElementById('position').value.trim();
        const currentTotalLaps = document.getElementById('total-laps').value.trim();
        const currentTime = document.getElementById('time').value.trim();
        const currentFastestLap = document.getElementById('fastest-lap').value;
        const currentLapsLed = document.getElementById('laps-led').value.trim();

        const currentRaceData = {
            name: currentRaceName,
            position: currentPosition,
            totalLaps: currentTotalLaps,
            time: currentTime,
            fastestLap: currentFastestLap,
            lapsLed: currentLapsLed
        };

        // Adiciona a corrida atual que está sendo digitada para exibição e cálculo de estatísticas
        // Ela aparecerá como a última linha da tabela.
        addRaceRowToTable(currentRaceData, races.length, true); // true = é temporário

        // Inclui os dados temporários nos cálculos das estatísticas gerais
        totalRaces++; // Conta a corrida temporária no total

        if (currentPosition && !isNaN(parseInt(currentPosition))) {
            totalPositions += parseInt(currentPosition);
            totalCompletedRaces++;
        }
        if (currentFastestLap === 'sim') {
            totalFastestLaps++;
        }
        if (currentLapsLed && !isNaN(parseInt(currentLapsLed))) {
            totalLapsLed += parseInt(currentLapsLed);
        }
        if (currentTime) {
            totalTimeSeconds += parseTimeToSeconds(currentTime);
        }
    }
    // ====================================================================================

    // Atualiza o painel de estatísticas gerais
    document.getElementById('stat-total-races').textContent = totalRaces;
    document.getElementById('stat-avg-position').textContent = totalCompletedRaces > 0 ? (totalPositions / totalCompletedRaces).toFixed(2) : '-';
    document.getElementById('stat-fastest-laps').textContent = totalFastestLaps;
    document.getElementById('stat-laps-led').textContent = totalLapsLed;
    document.getElementById('stat-total-time').textContent = formatTime(totalTimeSeconds);

    // Mostra/esconde mensagem "Nenhuma corrida registrada"
    if (races.length === 0 && !currentRaceName) { // Verifica se não há corridas salvas e nem sendo digitada
        noRacesMessage.classList.remove('hidden');
    } else {
        noRacesMessage.classList.add('hidden');
    }
}

/**
 * Carrega as corridas do Firebase para o usuário logado.
 */
async function loadRaces() {
    loadingIndicator.classList.remove('hidden'); // Mostra indicador de carregamento
    racesTableBody.innerHTML = ''; // Limpa a tabela antes de carregar
    noRacesMessage.classList.add('hidden'); // Esconde a mensagem de "nenhuma corrida" temporariamente

    if (!userId) {
        // Se não houver usuário logado, limpa as corridas e estatísticas
        races = [];
        updateStats(); // Atualiza a UI para mostrar zero corridas
        loadingIndicator.classList.add('hidden');
        noRacesMessage.classList.remove('hidden'); // Mostra a mensagem de nenhuma corrida
        return;
    }

    firebaseRacesRef = ref(database, `users/${userId}/races`);
    onValue(firebaseRacesRef, (snapshot) => {
        races = [];
        const data = snapshot.val();
        if (data) {
            for (let key in data) {
                races.push({ id: key, ...data[key] });
            }
        }
        updateStats(); // Atualiza a UI e as estatísticas após carregar
        loadingIndicator.classList.add('hidden'); // Esconde indicador
    }, (error) => {
        console.error("Erro ao carregar corridas:", error);
        loadingIndicator.classList.add('hidden');
        showMessageModal('Erro!', 'Não foi possível carregar suas corridas.', 'error');
    });
}

/**
 * Salva uma nova corrida no Firebase.
 * @param {object} raceData
 */
async function saveRace(raceData) {
    try {
        if (!userId) {
            console.error("Usuário não autenticado. Não é possível salvar corridas.");
            showMessageModal('Erro!', 'Você precisa estar logado para salvar corridas.', 'error');
            return;
        }

        const userRacesRef = ref(database, `users/${userId}/races`);
        const newRaceRef = push(userRacesRef); // Gera uma nova chave única para a corrida
        await set(newRaceRef, raceData);
        console.log("Corrida salva com sucesso no Firebase!");

        // raceForm.reset() e updateStats() já são chamados após o onValue em loadRaces,
        // que é ativado automaticamente após o set().
        raceForm.reset(); // Limpa o formulário após salvar para adicionar nova corrida
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
    try {
        if (!userId) {
            console.error("Usuário não autenticado. Não é possível excluir corridas.");
            showMessageModal('Erro!', 'Você precisa estar logado para excluir corridas.', 'error');
            return;
        }

        const raceToDeleteRef = ref(database, `users/${userId}/races/${raceId}`);
        await remove(raceToDeleteRef);
        console.log("Corrida excluída com sucesso do Firebase!");
        showMessageModal('Sucesso!', 'Corrida excluída com sucesso!', 'success');
        // O onValue em loadRaces() se encarrega de atualizar a UI
    } catch (error) {
        console.error("Erro ao excluir corrida:", error);
        showMessageModal('Erro!', 'Erro ao excluir corrida. Tente novamente.', 'error');
    }
}

// ==== Inicialização e Event Listeners ====

// Configuração inicial do Firebase e autenticação
window.onload = () => {
    try {
        // Verifica se o app já foi inicializado para evitar erros
        if (!app) {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth(); // Use firebase.auth() se estiver usando a CDN antiga ou configure o import
            database = firebase.database(); // Use firebase.database() se estiver usando a CDN antiga ou configure o import
        }

        // Listener de mudança de estado de autenticação
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                userId = user.uid;
                loginButton.classList.add('hidden');
                logoutButton.classList.remove('hidden');
                authStatusElement.textContent = `Logado como: ${user.email}`;
                authStatusElement.classList.remove('text-red-500');
                authStatusElement.classList.add('text-green-600');
                loadRaces(); // Carrega as corridas para o usuário logado
                setupRaceInputListeners(); // Configura listeners para o formulário
            } else {
                userId = null;
                loginButton.classList.remove('hidden');
                logoutButton.classList.add('hidden');
                authStatusElement.textContent = 'Não logado';
                authStatusElement.classList.remove('text-green-600');
                authStatusElement.classList.add('text-red-500');
                loadRaces(); // Limpa as corridas e estatísticas na UI
            }
        });

        // Configura os listeners iniciais para o formulário
        setupRaceInputListeners();
        // Carrega corridas inicial (será ajustado pelo onAuthStateChanged)
        loadRaces();

        // Listener do botão de login (simulação ou link real)
        loginButton.addEventListener('click', () => {
            // Em um app real, aqui você chamaria um método de login (ex: Google, email/senha)
            showMessageModal('Login', 'Funcionalidade de login ainda não implementada nesta demo.', 'info');
            // Exemplo de login temporário para teste se não tiver autenticação
            // try {
            //     const tempUser = await firebase.auth().signInAnonymously();
            //     console.log("Logado anonimamente:", tempUser.user.uid);
            // } catch (error) {
            //     console.error("Erro login anônimo:", error);
            // }
        });

        // Listener do botão de logout
        logoutButton.addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                showMessageModal('Logout', 'Você foi desconectado.', 'success');
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
                showMessageModal('Erro!', 'Erro ao fazer logout. Tente novamente.', 'error');
            }
        });

        // Listener do botão salvar corrida
        saveButton.addEventListener('click', (e) => {
            e.preventDefault(); // Impede o envio padrão do formulário

            const raceName = document.getElementById('race-name').value.trim();
            const position = document.getElementById('position').value.trim();
            const totalLaps = document.getElementById('total-laps').value.trim();
            const time = document.getElementById('time').value.trim();
            const fastestLap = document.getElementById('fastest-lap').value; // 'sim' ou 'não'
            const lapsLed = document.getElementById('laps-led').value.trim();

            if (!raceName) {
                showMessageModal('Atenção', 'O nome da corrida é obrigatório.', 'info');
                return;
            }

            const newRaceData = {
                name: raceName,
                position: position || null, // Armazena null se vazio
                totalLaps: totalLaps || null,
                time: time || null,
                fastestLap: fastestLap,
                lapsLed: lapsLed || null
            };

            saveRace(newRaceData);
        });

    } catch (error) {
        console.error("Erro na inicialização do Firebase ou listeners:", error);
        showMessageModal('Erro!', 'Ocorreu um erro ao inicializar o aplicativo.', 'error');
    }
};

/**
 * Configura os listeners de input para o formulário de corrida.
 * Esta função é chamada ao carregar a página e ao fazer login/logout.
 */
function setupRaceInputListeners() {
    const inputs = raceForm.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.removeEventListener('input', updateStats); // Evita duplicar listeners
        input.addEventListener('input', updateStats); // Cada mudança no input chama updateStats
    });
}

// Opcional: listener para o modal de mensagem (clicar fora fecha)
document.getElementById('message-modal').addEventListener('click', (e) => {
    if (e.target.id === 'message-modal') {
        closeModal();
    }
});
