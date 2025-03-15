// Script para partículas animadas
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particlesArray = [];
const numberOfParticles = 100;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 5 + 1;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.size > 0.2) this.size -= 0.1;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
        if (particlesArray[i].size <= 0.2) {
            particlesArray.splice(i, 1);
            i--;
            particlesArray.push(new Particle());
        }
    }
    requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Função para animação de contagem
function animateCount(element, start, end, duration, isPercentage = false) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = start + progress * (end - start);
        if (isPercentage) {
            element.textContent = `${current.toFixed(2).replace('.', ',')}%`;
        } else {
            element.textContent = Math.floor(current);
        }
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    requestAnimationFrame(step);
}

// Carregar dados salvos
function loadData() {
    const seasons = ["2023", "2024"];
    seasons.forEach(season => {
        const table = document.getElementById(`race-table-${season}`);
        if (!table) return;
        const rows = table.querySelectorAll("tr");

        rows.forEach(row => {
            const raceKey = row.getAttribute("data-race");
            const positionInput = row.querySelector(".position-input");
            const poleCheckbox = row.querySelector(".pole-checkbox");
            const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
            const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

            const savedData = JSON.parse(localStorage.getItem(`${season}-${raceKey}`)) || {};
            positionInput.value = savedData.position || "";
            poleCheckbox.checked = savedData.pole || false;
            fastestLapCheckbox.checked = savedData.fastestLap || false;
            grandSlamCheckbox.checked = savedData.grandSlam || false;
        });

        const championCheckbox = document.getElementById(`champion-${season}`);
        championCheckbox.checked = JSON.parse(localStorage.getItem(`champion-${season}`)) || false;
    });
}

// Salvar dados de uma corrida
function saveData(season, raceKey, position, pole, fastestLap, grandSlam) {
    const data = {
        position: position || "",
        pole: pole || false,
        fastestLap: fastestLap || false,
        grandSlam: grandSlam || false
    };
    localStorage.setItem(`${season}-${raceKey}`, JSON.stringify(data));
}

// Salvar status de campeão
function saveChampionStatus(season, isChampion) {
    localStorage.setItem(`champion-${season}`, JSON.stringify(isChampion));
}

// Salvar todas as alterações
function saveAllChanges() {
    const seasons = ["2023", "2024"];
    seasons.forEach(season => {
        const table = document.getElementById(`race-table-${season}`);
        if (!table) return;
        const rows = table.querySelectorAll("tr");

        rows.forEach(row => {
            const raceKey = row.getAttribute("data-race");
            const positionInput = row.querySelector(".position-input");
            const poleCheckbox = row.querySelector(".pole-checkbox");
            const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
            const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

            const position = positionInput.value;
            const pole = poleCheckbox.checked;
            const fastestLap = fastestLapCheckbox.checked;
            const grandSlam = grandSlamCheckbox.checked;

            saveData(season, raceKey, position, pole, fastestLap, grandSlam);
        });

        const championCheckbox = document.getElementById(`champion-${season}`);
        saveChampionStatus(season, championCheckbox.checked);
    });
    alert("Alterações salvas com sucesso!");
    updateStats(document.querySelector(".season-buttons button.active").id.split("-")[1]);
}

// Atualizar estatísticas da temporada
function updateStats(season) {
    const rows = document.querySelectorAll(`#race-table-${season} tr`);
    let totalRaces = 0;
    let totalWins = 0;
    let totalPodiums = 0;
    let totalPoles = 0;
    let totalFastestLaps = 0;
    let totalHattricks = 0;
    let totalGrandSlams = 0;
    let totalTitles = document.getElementById(`champion-${season}`).checked ? 1 : 0;
    let consecutiveWins = 0;
    let maxConsecutiveWins = 0;

    rows.forEach(row => {
        const positionInput = row.querySelector(".position-input");
        const poleCheckbox = row.querySelector(".pole-checkbox");
        const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
        const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

        const position = parseInt(positionInput.value);

        if (!isNaN(position)) {
            totalRaces++;
            if (position === 1) {
                totalWins++;
                consecutiveWins++;
                maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
            } else {
                consecutiveWins = 0;
            }
            if (position >= 1 && position <= 3) totalPodiums++;
        }
        if (poleCheckbox.checked) totalPoles++;
        if (fastestLapCheckbox.checked) totalFastestLaps++;
        if (position === 1 && poleCheckbox.checked && fastestLapCheckbox.checked) totalHattricks++;
        if (grandSlamCheckbox.checked) totalGrandSlams++;
    });

    const seasonStatsContainer = document.getElementById(`season-${season}`);
    animateCount(seasonStatsContainer.querySelector("#total-races"), 0, totalRaces, 1000);
    animateCount(seasonStatsContainer.querySelector("#total-wins"), 0, totalWins, 1000);
    animateCount(seasonStatsContainer.querySelector("#total-podiums"), 0, totalPodiums, 1000);
    animateCount(seasonStatsContainer.querySelector("#total-poles"), 0, totalPoles, 1000);
    animateCount(seasonStatsContainer.querySelector("#total-fastest-laps"), 0, totalFastestLaps, 1000);
    animateCount(seasonStatsContainer.querySelector("#total-hattricks"), 0, totalHattricks, 1000);
    animateCount(seasonStatsContainer.querySelector("#total-grand-slams"), 0, totalGrandSlams, 1000);
    animateCount(seasonStatsContainer.querySelector("#total-titles"), 0, totalTitles, 1000);

    const racesPossible = season === "2023" ? 22 : 24;
    animateCount(seasonStatsContainer.querySelector("#races-percentage"), 0, totalRaces > 0 ? (totalRaces / racesPossible) * 100 : 0, 1000, true);
    animateCount(seasonStatsContainer.querySelector("#wins-percentage"), 0, totalRaces > 0 ? (totalWins / totalRaces) * 100 : 0, 1000, true);
    animateCount(seasonStatsContainer.querySelector("#podiums-percentage"), 0, totalRaces > 0 ? (totalPodiums / totalRaces) * 100 : 0, 1000, true);
    animateCount(seasonStatsContainer.querySelector("#poles-percentage"), 0, totalRaces > 0 ? (totalPoles / totalRaces) * 100 : 0, 1000, true);
    animateCount(seasonStatsContainer.querySelector("#fastest-laps-percentage"), 0, totalRaces > 0 ? (totalFastestLaps / totalRaces) * 100 : 0, 1000, true);
    animateCount(seasonStatsContainer.querySelector("#hattricks-percentage"), 0, totalRaces > 0 ? (totalHattricks / totalRaces) * 100 : 0, 1000, true);
    animateCount(seasonStatsContainer.querySelector("#grand-slams-percentage"), 0, totalRaces > 0 ? (totalGrandSlams / totalRaces) * 100 : 0, 1000, true);
    animateCount(seasonStatsContainer.querySelector("#titles-percentage"), 0, totalTitles > 0 ? 100 : 0, 1000, true);

    updateRecordsList({
        "Vitórias em uma Temporada": totalWins > 19 ? totalWins : 0,
        "Vitórias Consecutivas": maxConsecutiveWins > 10 ? maxConsecutiveWins : 0
    }, season);

    updateOverallStats();
}

// Atualizar estatísticas gerais
function updateOverallStats() {
    const seasons = ["2023", "2024"];
    let overallTotalRaces = 0;
    let overallTotalWins = 0;
    let overallTotalPodiums = 0;
    let overallTotalPoles = 0;
    let overallTotalFastestLaps = 0;
    let overallTotalHattricks = 0;
    let overallTotalGrandSlams = 0;
    let overallTotalTitles = 0;
    let maxConsecutiveWins = 0;
    let consecutiveWins = 0;

    seasons.forEach(season => {
        const rows = document.querySelectorAll(`#race-table-${season} tr`);
        rows.forEach(row => {
            const positionInput = row.querySelector(".position-input");
            const poleCheckbox = row.querySelector(".pole-checkbox");
            const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
            const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

            const position = parseInt(positionInput.value);

            if (!isNaN(position)) {
                overallTotalRaces++;
                if (position === 1) {
                    overallTotalWins++;
                    consecutiveWins++;
                    maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
                } else {
                    consecutiveWins = 0;
                }
                if (position >= 1 && position <= 3) overallTotalPodiums++;
            }
            if (poleCheckbox.checked) overallTotalPoles++;
            if (fastestLapCheckbox.checked) overallTotalFastestLaps++;
            if (position === 1 && poleCheckbox.checked && fastestLapCheckbox.checked) overallTotalHattricks++;
            if (grandSlamCheckbox.checked) overallTotalGrandSlams++;
        });

        if (document.getElementById(`champion-${season}`).checked) overallTotalTitles++;
    });

    animateCount(document.getElementById("overall-total-races"), 0, overallTotalRaces, 1000);
    animateCount(document.getElementById("overall-total-wins"), 0, overallTotalWins, 1000);
    animateCount(document.getElementById("overall-total-podiums"), 0, overallTotalPodiums, 1000);
    animateCount(document.getElementById("overall-total-poles"), 0, overallTotalPoles, 1000);
    animateCount(document.getElementById("overall-total-fastest-laps"), 0, overallTotalFastestLaps, 1000);
    animateCount(document.getElementById("overall-total-hattricks"), 0, overallTotalHattricks, 1000);
    animateCount(document.getElementById("overall-total-grand-slams"), 0, overallTotalGrandSlams, 1000);
    animateCount(document.getElementById("overall-total-titles"), 0, overallTotalTitles, 1000);

    const totalPossibleRaces = 22 + 24; // 46 corridas no total (2023 + 2024)
    animateCount(document.getElementById("overall-races-percentage"), 0, overallTotalRaces > 0 ? (overallTotalRaces / totalPossibleRaces) * 100 : 0, 1000, true);
    animateCount(document.getElementById("overall-wins-percentage"), 0, overallTotalRaces > 0 ? (overallTotalWins / overallTotalRaces) * 100 : 0, 1000, true);
    animateCount(document.getElementById("overall-podiums-percentage"), 0, overallTotalRaces > 0 ? (overallTotalPodiums / overallTotalRaces) * 100 : 0, 1000, true);
    animateCount(document.getElementById("overall-poles-percentage"), 0, overallTotalRaces > 0 ? (overallTotalPoles / overallTotalRaces) * 100 : 0, 1000, true);
    animateCount(document.getElementById("overall-fastest-laps-percentage"), 0, overallTotalRaces > 0 ? (overallTotalFastestLaps / overallTotalRaces) * 100 : 0, 1000, true);
    animateCount(document.getElementById("overall-hattricks-percentage"), 0, overallTotalRaces > 0 ? (overallTotalHattricks / overallTotalRaces) * 100 : 0, 1000, true);
    animateCount(document.getElementById("overall-grand-slams-percentage"), 0, overallTotalRaces > 0 ? (overallTotalGrandSlams / overallTotalRaces) * 100 : 0, 1000, true);
    animateCount(document.getElementById("overall-titles-percentage"), 0, overallTotalTitles > 0 ? (overallTotalTitles / 2) * 100 : 0, 1000, true);

    updateRecordsList({
        "Títulos Mundiais": overallTotalTitles > 7 ? overallTotalTitles : 0,
        "Vitórias": overallTotalWins > 105 ? overallTotalWins : 0,
        "Pódios": overallTotalPodiums > 202 ? overallTotalPodiums : 0,
        "Pole Positions": overallTotalPoles > 104 ? overallTotalPoles : 0,
        "Voltas Mais Rápidas": overallTotalFastestLaps > 77 ? overallTotalFastestLaps : 0,
        "Hat-Tricks": overallTotalHattricks > 22 ? overallTotalHattricks : 0,
        "Grand Slams": overallTotalGrandSlams > 8 ? overallTotalGrandSlams : 0,
        "Corridas Disputadas": overallTotalRaces > 356 ? overallTotalRaces : 0,
        "Vitórias Consecutivas": maxConsecutiveWins > 10 ? maxConsecutiveWins : 0
    });
}

// Atualizar lista de recordes
function updateRecordsList(records, season = null) {
    const recordsList = document.getElementById("records-list");
    recordsList.innerHTML = "";

    Object.entries(records).forEach(([title, value]) => {
        if (value > 0) {
            const recordItem = document.createElement("div");
            recordItem.classList.add("record-item");

            const recordNumber = document.createElement("span");
            recordNumber.classList.add("record-number");
            recordNumber.textContent = value;

            const recordTitle = document.createElement("span");
            recordTitle.classList.add("record-title");
            recordTitle.textContent = season ? `${title} (${season})` : title;

            recordItem.appendChild(recordNumber);
            recordItem.appendChild(recordTitle);
            recordsList.appendChild(recordItem);
        }
    });
}

// Alternar entre temporadas
document.getElementById("btn-2023").addEventListener("click", () => {
    document.getElementById("season-2023").classList.remove("hidden");
    document.getElementById("season-2024").classList.add("hidden");
    document.getElementById("btn-2023").classList.add("active");
    document.getElementById("btn-2024").classList.remove("active");
    updateStats("2023");
});

document.getElementById("btn-2024").addEventListener("click", () => {
    document.getElementById("season-2024").classList.remove("hidden");
    document.getElementById("season-2023").classList.add("hidden");
    document.getElementById("btn-2024").classList.add("active");
    document.getElementById("btn-2023").classList.remove("active");
    updateStats("2024");
});

// Atualizar estatísticas ao alterar inputs
document.addEventListener("input", (event) => {
    const inputElement = event.target;
    const raceRow = inputElement.closest("tr");
    if (!raceRow) return;

    const tableElement = raceRow.closest("table");
    const season = tableElement.id.split("-")[2];
    const raceName = raceRow.getAttribute("data-race");

    const positionField = raceRow.querySelector(".position-input");
    const poleField = raceRow.querySelector(".pole-checkbox");
    const fastestLapField = raceRow.querySelector(".fastest-lap-checkbox");
    const grandSlamField = raceRow.querySelector(".grand-slam-checkbox");

    updateStats(season);
});

// Salvar alterações ao clicar no botão
document.getElementById("save-button").addEventListener("click", saveAllChanges);

// Mostrar estatísticas de uma corrida específica no modal
function showRaceStats(raceName) {
    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modal-title");
    const modalSummary = document.getElementById("modal-summary");

    modalTitle.textContent = `Estatísticas da Corrida: ${raceName}`;
    let wins = 0, podiums = 0, poles = 0, fastestLaps = 0, hattricks = 0, grandSlams = 0;

    ["2023", "2024"].forEach(season => {
        const row = document.querySelector(`#race-table-${season} tr[data-race="${raceName}"]`);
        if (row) {
            const position = parseInt(row.querySelector(".position-input").value) || 0;
            const pole = row.querySelector(".pole-checkbox").checked;
            const fastestLap = row.querySelector(".fastest-lap-checkbox").checked;
            const grandSlam = row.querySelector(".grand-slam-checkbox").checked;

            if (position === 1) wins++;
            if (position >= 1 && position <= 3) podiums++;
            if (pole) poles++;
            if (fastestLap) fastestLaps++;
            if (position === 1 && pole && fastestLap) hattricks++;
            if (grandSlam) grandSlams++;
        }
    });

    document.getElementById("modal-wins").textContent = wins;
    document.getElementById("modal-podiums").textContent = podiums;
    document.getElementById("modal-poles").textContent = poles;
    document.getElementById("modal-fastest-laps").textContent = fastestLaps;
    document.getElementById("modal-hattricks").textContent = hattricks;
    document.getElementById("modal-grand-slams").textContent = grandSlams;

    modal.classList.add("show");
}

// Evento de clique nas linhas das tabelas
document.querySelectorAll("#race-table-2023 tr, #race-table-2024 tr").forEach(row => {
    row.addEventListener("click", (event) => {
        if (event.target.tagName !== "INPUT") {
            const raceName = row.getAttribute("data-race");
            showRaceStats(raceName);
        }
    });
});

// Fechar o modal
document.querySelector(".close-modal").addEventListener("click", () => {
    const modal = document.getElementById("modal");
    modal.classList.remove("show");
});

// Atualizar estatísticas ao alterar status de campeão
document.querySelectorAll(".champion-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", (event) => {
        const season = event.target.id.split("-")[1];
        saveChampionStatus(season, event.target.checked);
        updateStats(season);
    });
});

// Inicialização
loadData();
updateStats("2024");
