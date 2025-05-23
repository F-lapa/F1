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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Verificar inicialização do Firebase antes de autenticar
if (!firebase.apps.length) {
  console.error("Firebase não inicializado corretamente.");
} else {
  // Autenticação anônima
  firebase.auth().signInAnonymously().catch(error => {
    console.error("Erro na autenticação anônima:", error);
    alert("Erro na autenticação com o Firebase. Habilite a autenticação anônima no Firebase Console.");
  });
}

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
  if (!element) return;
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

// Validação de inputs
function validateInputs(row, season) {
  const positionInput = row.querySelector(".position-input");
  const poleCheckbox = row.querySelector(".pole-checkbox");
  const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
  const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

  if (!positionInput || !poleCheckbox || !fastestLapCheckbox || !grandSlamCheckbox) {
    console.error("Elementos de input não encontrados na linha:", row);
    return;
  }

  positionInput.addEventListener('input', () => {
    const pos = parseInt(positionInput.value);
    if (pos < 1 || pos > 20 || isNaN(pos)) {
      positionInput.value = '';
    }
    if (grandSlamCheckbox.checked && (pos !== 1 || !poleCheckbox.checked || !fastestLapCheckbox.checked)) {
      grandSlamCheckbox.checked = false;
    }
    updateStats(season);
  });

  poleCheckbox.addEventListener('change', () => {
    if (grandSlamCheckbox.checked && !poleCheckbox.checked) {
      grandSlamCheckbox.checked = false;
    }
    updateStats(season);
  });

  fastestLapCheckbox.addEventListener('change', () => {
    if (grandSlamCheckbox.checked && !fastestLapCheckbox.checked) {
      grandSlamCheckbox.checked = false;
    }
    updateStats(season);
  });

  grandSlamCheckbox.addEventListener('change', () => {
    if (grandSlamCheckbox.checked) {
      positionInput.value = 1;
      poleCheckbox.checked = true;
      fastestLapCheckbox.checked = true;
    }
    updateStats(season);
  });
}

// Carregar dados do Firestore
async function loadData() {
  const seasons = ["2023", "2024"];
  for (const season of seasons) {
    const table = document.getElementById(`race-table-${season}`);
    if (!table) {
      console.error(`Tabela para ${season} não encontrada`);
      continue;
    }
    const rows = table.querySelectorAll("tr");

    for (const row of rows) {
      const raceKey = row.getAttribute("data-race");
      if (!raceKey) continue;

      const positionInput = row.querySelector(".position-input");
      const poleCheckbox = row.querySelector(".pole-checkbox");
      const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
      const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

      if (!positionInput || !poleCheckbox || !fastestLapCheckbox || !grandSlamCheckbox) {
        console.error(`Inputs não encontrados para ${season}-${raceKey}`);
        continue;
      }

      validateInputs(row, season);

      try {
        const docRef = db.collection("races").doc(`${season}-${raceKey}`);
        const doc = await docRef.get();
        if (doc.exists) {
          const savedData = doc.data();
          positionInput.value = savedData.position || "";
          poleCheckbox.checked = savedData.pole || false;
          fastestLapCheckbox.checked = savedData.fastestLap || false;
          grandSlamCheckbox.checked = savedData.grandSlam || false;
        }
      } catch (error) {
        console.error(`Erro ao carregar dados para ${season}-${raceKey}:`, error);
      }
    }

    try {
      const championCheckbox = document.getElementById(`champion-${season}`);
      if (championCheckbox) {
        const championDoc = await db.collection("champions").doc(`champion-${season}`).get();
        if (championDoc.exists) {
          championCheckbox.checked = championDoc.data().isChampion || false;
        }
      }
    } catch (error) {
      console.error(`Erro ao carregar status de campeão para ${season}:`, error);
    }
  }
  updateStats("2024");
}

// Salvar dados de uma corrida no Firestore
async function saveData(season, raceKey, position, pole, fastestLap, grandSlam) {
  try {
    const data = {
      position: position || "",
      pole: pole || false,
      fastestLap: fastestLap || false,
      grandSlam: grandSlam || false
    };
    await db.collection("races").doc(`${season}-${raceKey}`).set(data);
  } catch (error) {
    console.error(`Erro ao salvar dados para ${season}-${raceKey}:`, error);
  }
}

// Salvar status de campeão no Firestore
async function saveChampionStatus(season, isChampion) {
  try {
    await db.collection("champions").doc(`champion-${season}`).set({ isChampion });
  } catch (error) {
    console.error(`Erro ao salvar status de campeão para ${season}:`, error);
  }
}

// Salvar todas as alterações
async function saveAllChanges() {
  const seasons = ["2023", "2024"];
  for (const season of seasons) {
    const table = document.getElementById(`race-table-${season}`);
    if (!table) continue;
    const rows = table.querySelectorAll("tr");

    for (const row of rows) {
      const raceKey = row.getAttribute("data-race");
      if (!raceKey) continue;

      const positionInput = row.querySelector(".position-input");
      const poleCheckbox = row.querySelector(".pole-checkbox");
      const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
      const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

      if (!positionInput || !poleCheckbox || !fastestLapCheckbox || !grandSlamCheckbox) continue;

      const position = positionInput.value;
      const pole = poleCheckbox.checked;
      const fastestLap = fastestLapCheckbox.checked;
      const grandSlam = grandSlamCheckbox.checked;

      await saveData(season, raceKey, position, pole, fastestLap, grandSlam);
    }

    const championCheckbox = document.getElementById(`champion-${season}`);
    if (championCheckbox) {
      await saveChampionStatus(season, championCheckbox.checked);
    }
  }
  alert("Alterações salvas com sucesso!");
  updateStats(document.querySelector(".season-buttons button.active")?.id.split("-")[1] || "2024");
}

---

### Correção de `updateStats`

```javascript
// Atualizar estatísticas da temporada
function updateStats(season) {
  const rows = document.querySelectorAll(`#race-table-${season} tr`);
  const seasonStatsContainer = document.getElementById(`season-${season}`);
  if (!seasonStatsContainer) return;

  let totalRaces = 0;
  let totalWins = 0;
  let totalPodiums = 0;
  let totalPoles = 0;
  let totalFastestLaps = 0;
  let totalHattricks = 0;
  let totalGrandSlams = 0;
  let totalTitles = 0;
  let consecutiveWins = 0;
  let maxConsecutiveWins = 0;

  rows.forEach(row => {
    const positionInput = row.querySelector(".position-input");
    const poleCheckbox = row.querySelector(".pole-checkbox");
    const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
    const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

    if (!positionInput || !poleCheckbox || !fastestLapCheckbox || !grandSlamCheckbox) return;

    // **CORREÇÃO APLICADA AQUI:** Incrementa totalRaces para cada linha de corrida válida
    totalRaces++;

    const position = parseInt(positionInput.value);

    if (!isNaN(position) && position >= 1 && position <= 20) {
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

  const championCheckbox = document.getElementById(`champion-${season}`);
  if (championCheckbox) {
    totalTitles = championCheckbox.checked ? 1 : 0;
  }

  animateCount(seasonStatsContainer.querySelector("#total-races"), parseInt(seasonStatsContainer.querySelector("#total-races")?.textContent) || 0, totalRaces, 1000);
  animateCount(seasonStatsContainer.querySelector("#total-wins"), parseInt(seasonStatsContainer.querySelector("#total-wins")?.textContent) || 0, totalWins, 1000);
  animateCount(seasonStatsContainer.querySelector("#total-podiums"), parseInt(seasonStatsContainer.querySelector("#total-podiums")?.textContent) || 0, totalPodiums, 1000);
  animateCount(seasonStatsContainer.querySelector("#total-poles"), parseInt(seasonStatsContainer.querySelector("#total-poles")?.textContent) || 0, totalPoles, 1000);
  animateCount(seasonStatsContainer.querySelector("#total-fastest-laps"), parseInt(seasonStatsContainer.querySelector("#total-fastest-laps")?.textContent) || 0, totalFastestLaps, 1000);
  animateCount(seasonStatsContainer.querySelector("#total-hattricks"), parseInt(seasonStatsContainer.querySelector("#total-hattricks")?.textContent) || 0, totalHattricks, 1000);
  animateCount(seasonStatsContainer.querySelector("#total-grand-slams"), parseInt(seasonStatsContainer.querySelector("#total-grand-slams")?.textContent) || 0, totalGrandSlams, 1000);
  animateCount(seasonStatsContainer.querySelector("#total-titles"), parseInt(seasonStatsContainer.querySelector("#total-titles")?.textContent) || 0, totalTitles, 1000);

  const racesPossible = season === "2023" ? 22 : 24;
  animateCount(seasonStatsContainer.querySelector("#races-percentage"), parseFloat(seasonStatsContainer.querySelector("#races-percentage")?.textContent.replace(',', '.')) || 0, totalRaces > 0 ? (totalRaces / racesPossible) * 100 : 0, 1000, true);
  animateCount(seasonStatsContainer.querySelector("#wins-percentage"), parseFloat(seasonStatsContainer.querySelector("#wins-percentage")?.textContent.replace(',', '.')) || 0, totalRaces > 0 ? (totalWins / totalRaces) * 100 : 0, 1000, true);
  animateCount(seasonStatsContainer.querySelector("#podiums-percentage"), parseFloat(seasonStatsContainer.querySelector("#podiums-percentage")?.textContent.replace(',', '.')) || 0, totalRaces > 0 ? (totalPodiums / totalRaces) * 100 : 0, 1000, true);
  animateCount(seasonStatsContainer.querySelector("#poles-percentage"), parseFloat(seasonStatsContainer.querySelector("#poles-percentage")?.textContent.replace(',', '.')) || 0, totalRaces > 0 ? (totalPoles / totalRaces) * 100 : 0, 1000, true);
  animateCount(seasonStatsContainer.querySelector("#fastest-laps-percentage"), parseFloat(seasonStatsContainer.querySelector("#fastest-laps-percentage")?.textContent.replace(',', '.')) || 0, totalRaces > 0 ? (totalFastestLaps / totalRaces) * 100 : 0, 1000, true);
  animateCount(seasonStatsContainer.querySelector("#hattricks-percentage"), parseFloat(seasonStatsContainer.querySelector("#hattricks-percentage")?.textContent.replace(',', '.')) || 0, totalRaces > 0 ? (totalHattricks / totalRaces) * 100 : 0, 1000, true);
  animateCount(seasonStatsContainer.querySelector("#grand-slams-percentage"), parseFloat(seasonStatsContainer.querySelector("#grand-slams-percentage")?.textContent.replace(',', '.')) || 0, totalRaces > 0 ? (totalGrandSlams / totalRaces) * 100 : 0, 1000, true);
  animateCount(seasonStatsContainer.querySelector("#titles-percentage"), parseFloat(seasonStatsContainer.querySelector("#titles-percentage")?.textContent.replace(',', '.')) || 0, totalTitles > 0 ? 100 : 0, 1000, true);

  updateRecordsList({
    "Vitórias em uma Temporada": totalWins > 19 ? totalWins : 0,
    "Vitórias Consecutivas": maxConsecutiveWins > 10 ? maxConsecutiveWins : 0
  }, season);

  updateOverallStats();
}

---

### Correção de `updateOverallStats`

```javascript
// Atualizar estatísticas gerais
async function updateOverallStats() {
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

  for (const season of seasons) {
    const rows = document.querySelectorAll(`#race-table-${season} tr`);
    rows.forEach(row => {
      const positionInput = row.querySelector(".position-input");
      const poleCheckbox = row.querySelector(".pole-checkbox");
      const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
      const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

      if (!positionInput || !poleCheckbox || !fastestLapCheckbox || !grandSlamCheckbox) return;

      // **CORREÇÃO APLICADA AQUI:** Incrementa overallTotalRaces para cada linha de corrida válida
      overallTotalRaces++;

      const position = parseInt(positionInput.value);

      if (!isNaN(position) && position >= 1 && position <= 20) {
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

    try {
      const championDoc = await db.collection("champions").doc(`champion-${season}`).get();
      if (championDoc.exists && championDoc.data().isChampion) overallTotalTitles++;
    } catch (error) {
      console.error(`Erro ao carregar status de campeão para ${season}:`, error);
    }
  }

  animateCount(document.getElementById("overall-total-races"), parseInt(document.getElementById("overall-total-races")?.textContent) || 0, overallTotalRaces, 1000);
  animateCount(document.getElementById("overall-total-wins"), parseInt(document.getElementById("overall-total-wins")?.textContent) || 0, overallTotalWins, 1000);
  animateCount(document.getElementById("overall-total-podiums"), parseInt(document.getElementById("overall-total-podiums")?.textContent) || 0, overallTotalPodiums, 1000);
  animateCount(document.getElementById("overall-total-poles"), parseInt(document.getElementById("overall-total-poles")?.textContent) || 0, overallTotalPoles, 1000);
  animateCount(document.getElementById("overall-total-fastest-laps"), parseInt(document.getElementById("overall-total-fastest-laps")?.textContent) || 0, overallTotalFastestLaps, 1000);
  animateCount(document.getElementById("overall-total-hattricks"), parseInt(document.getElementById("overall-total-hattricks")?.textContent) || 0, overallTotalHattricks, 1000);
  animateCount(document.getElementById("overall-total-grand-slams"), parseInt(document.getElementById("overall-total-grand-slams")?.textContent) || 0, overallTotalGrandSlams, 1000);
  animateCount(document.getElementById("overall-total-titles"), parseInt(document.getElementById("overall-total-titles")?.textContent) || 0, overallTotalTitles, 1000);

  const totalPossibleRaces = 22 + 24;
  animateCount(document.getElementById("overall-races-percentage"), parseFloat(document.getElementById("overall-races-percentage")?.textContent.replace(',', '.')) || 0, overallTotalRaces > 0 ? (overallTotalRaces / totalPossibleRaces) * 100 : 0, 1000, true);
  animateCount(document.getElementById("overall-wins-percentage"), parseFloat(document.getElementById("overall-wins-percentage")?.textContent.replace(',', '.')) || 0, overallTotalRaces > 0 ? (overallTotalWins / overallTotalRaces) * 100 : 0, 1000, true);
  animateCount(document.getElementById("overall-podiums-percentage"), parseFloat(document.getElementById("overall-podiums-percentage")?.textContent.replace(',', '.')) || 0, overallTotalRaces > 0 ? (overallTotalPodiums / overallTotalRaces) * 100 : 0, 1000, true);
  animateCount(document.getElementById("overall-poles-percentage"), parseFloat(document.getElementById("overall-poles-percentage")?.textContent.replace(',', '.')) || 0, overallTotalRaces > 0 ? (overallTotalPoles / overallTotalRaces) * 100 : 0, 1000, true);
  animateCount(document.getElementById("overall-fastest-laps-percentage"), parseFloat(document.getElementById("overall-fastest-laps-percentage")?.textContent.replace(',', '.')) || 0, overallTotalRaces > 0 ? (overallTotalFastestLaps / overallTotalRaces) * 100 : 0, 1000, true);
  animateCount(document.getElementById("overall-hattricks-percentage"), parseFloat(document.getElementById("overall-hattricks-percentage")?.textContent.replace(',', '.')) || 0, overallTotalRaces > 0 ? (overallTotalHattricks / overallTotalRaces) * 100 : 0, 1000, true);
  animateCount(document.getElementById("overall-grand-slams-percentage"), parseFloat(document.getElementById("overall-grand-slams-percentage")?.textContent.replace(',', '.')) || 0, overallTotalRaces > 0 ? (overallTotalGrandSlams / overallTotalRaces) * 100 : 0, 1000, true);
  animateCount(document.getElementById("overall-titles-percentage"), parseFloat(document.getElementById("overall-titles-percentage")?.textContent.replace(',', '.')) || 0, overallTotalTitles > 0 ? (overallTotalTitles / 2) * 100 : 0, 1000, true);

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
  if (!recordsList) return;

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
document.getElementById("btn-2023")?.addEventListener("click", () => {
  const season2023 = document.getElementById("season-2023");
  const season2024 = document.getElementById("season-2024");
  const btn2023 = document.getElementById("btn-2023");
  const btn2024 = document.getElementById("btn-2024");
  if (season2023 && season2024 && btn2023 && btn2024) {
    season2023.classList.remove("hidden");
    season2024.classList.add("hidden");
    btn2023.classList.add("active");
    btn2024.classList.remove("active");
    updateStats("2023");
  }
});

document.getElementById("btn-2024")?.addEventListener("click", () => {
  const season2023 = document.getElementById("season-2023");
  const season2024 = document.getElementById("season-2024");
  const btn2023 = document.getElementById("btn-2023");
  const btn2024 = document.getElementById("btn-2024");
  if (season2023 && season2024 && btn2023 && btn2024) {
    season2024.classList.remove("hidden");
    season2023.classList.add("hidden");
    btn2024.classList.add("active");
    btn2023.classList.remove("active");
    updateStats("2024");
  }
});

// Salvar alterações ao clicar no botão
document.getElementById("save-button")?.addEventListener("click", saveAllChanges);

// Mostrar estatísticas de uma corrida específica no modal
function showRaceStats(raceName) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalWins = document.getElementById("modal-wins");
  const modalPodiums = document.getElementById("modal-podiums");
  const modalPoles = document.getElementById("modal-poles");
  const modalFastestLaps = document.getElementById("modal-fastest-laps");
  const modalHattricks = document.getElementById("modal-hattricks");
  const modalGrandSlams = document.getElementById("modal-grand-slams");

  if (!modal || !modalTitle || !modalWins || !modalPodiums || !modalPoles || !modalFastestLaps || !modalHattricks || !modalGrandSlams) return;

  modalTitle.textContent = `Estatísticas da Corrida: ${raceName}`;
  let wins = 0, podiums = 0, poles = 0, fastestLaps = 0, hattricks = 0, grandSlams = 0;

  ["2023", "2024"].forEach(season => {
    const row = document.querySelector(`#race-table-${season} tr[data-race="${raceName}"]`);
    if (row) {
      const positionInput = row.querySelector(".position-input");
      const poleCheckbox = row.querySelector(".pole-checkbox");
      const fastestLapCheckbox = row.querySelector(".fastest-lap-checkbox");
      const grandSlamCheckbox = row.querySelector(".grand-slam-checkbox");

      if (!positionInput || !poleCheckbox || !fastestLapCheckbox || !grandSlamCheckbox) return;

      const position = parseInt(positionInput.value) || 0;
      const pole = poleCheckbox.checked;
      const fastestLap = fastestLapCheckbox.checked;
      const grandSlam = grandSlamCheckbox.checked;

      if (position === 1) wins++;
      if (position >= 1 && position <= 3) podiums++;
      if (pole) poles++;
      if (fastestLap) fastestLaps++;
      if (position === 1 && pole && fastestLap) hattricks++;
      if (grandSlam) grandSlams++;
    }
  });

  modalWins.textContent = wins;
  modalPodiums.textContent = podiums;
  modalPoles.textContent = poles;
  modalFastestLaps.textContent = fastestLaps;
  modalHattricks.textContent = hattricks;
  modalGrandSlams.textContent = grandSlams;

  modal.classList.remove("hidden");
  modal.classList.add("show");
}

// Evento de clique nas linhas das tabelas
document.querySelectorAll("#race-table-2023 tr, #race-table-2024 tr").forEach(row => {
  row.addEventListener("click", (event) => {
    if (event.target.tagName !== "INPUT" && event.target.tagName !== "BUTTON") {
      const raceName = row.getAttribute("data-race");
      if (raceName) showRaceStats(raceName);
    }
  });
});

// Fechar o modal
document.querySelector(".close-modal")?.addEventListener("click", () => {
  const modal = document.getElementById("modal");
  if (modal) {
    modal.classList.remove("show");
    modal.classList.add("hidden");
  }
});

// Atualizar estatísticas ao alterar status de campeão
document.querySelectorAll(".champion-checkbox").forEach(checkbox => {
  checkbox.addEventListener("change", async (event) => {
    const season = event.target.id.split("-")[1];
    await saveChampionStatus(season, event.target.checked);
    updateStats(season);
  });
});

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  loadData();
});
