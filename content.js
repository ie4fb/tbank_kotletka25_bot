const getCurrentPhase = () => parseInt(window.localStorage.getItem('currentPhase'));
const getBotMode = () => window.localStorage.getItem('botMode')

const checkSettings = () => {
  if (window.localStorage.getItem('currentPhase') === null) {
    window.localStorage.setItem('currentPhase', 2)
  }

  if (window.localStorage.getItem('botMode') === null) {
    window.localStorage.setItem('botMode', 'gems')
  }

  if (window.localStorage.getItem('botActive') === null) {
    window.localStorage.setItem('botActive', true)
  }
}

checkSettings();

window.currentPhase = window.localStorage.getItem('currentPhase');
window.botActive = window.localStorage.getItem('botActive');
window.botMode = window.localStorage.getItem('botMode');

const botControlPanel = document.createElement('div');
botControlPanel.innerHTML = `
  <div style="
    position: fixed;
    top: 120px;
    left: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    backdrop-filter: blur(5px);
    border: 1px solid #333;
  ">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
      <span>Бот:</span>
      <button id="botToggle" style="
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        background: #f44336;
        color: white;
      ">ВЫКЛ</button>
    </div>
    <div style="display: flex; align-items: start; gap: 10px; flex-direction: column;">
      <span>Фаза:</span>
      <select id="phaseSelect" style="
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        background: white;
        color: black;
      ">
        <option value="1" ${(getCurrentPhase() === 1) && 'selected'}>1 - Fire</option>
        <option value="2" ${(getCurrentPhase() === 2) && 'selected'}>2 - Water</option>
        <option value="3" ${(getCurrentPhase() === 3) && 'selected'}>3 - Earth</option>
        <option value="4" ${(getCurrentPhase() === 4) && 'selected'}>4 - Air</option>
      </select>
       <span>Режим:</span>
      <select id="modeSelect" style="
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        background: white;
        color: black;
      ">
        <option value="gems" ${(getBotMode() === 'gems') && 'selected'}>Gems</option>
        <option value="stars" ${(getBotMode() === 'stars') && 'selected'}>Stars</option>
      </select>
    </div>
  </div>
`;

document.body.appendChild(botControlPanel);

if (typeof window.botActive === 'undefined') {
  window.botActive = false;
}

const toggleBtn = document.getElementById('botToggle');
const phaseSelect = document.getElementById('phaseSelect');
const modeSelect = document.getElementById('modeSelect')

function updateButtonText() {
  toggleBtn.textContent = window.botActive ? 'ВКЛ' : 'ВЫКЛ';
  toggleBtn.style.background = window.botActive ? '#4CAF50' : '#f44336';
}

toggleBtn.addEventListener('click', function() {
  window.botActive = !window.botActive;
  window.localStorage.setItem('botActive', window.botActive)
  updateButtonText();
  console.log('Бот:', window.botActive ? 'включен' : 'выключен');
});

phaseSelect.addEventListener('change', function() {
  window.currentPhase = parseInt(this.value);
  window.localStorage.setItem('currentPhase', window.currentPhase)
  console.log('Установлена фаза:', window.currentPhase, this.options[this.selectedIndex].text);
});

modeSelect.addEventListener('change', function() {
  window.botMode = this.value;
  window.localStorage.setItem('botMode', window.botMode)
  console.log('Установлен режим:', window.botMode);
});

window.currentPhase = parseInt(window.localStorage.getItem('currentPhase'));
window.botMode = window.localStorage.getItem('botMode', window.botMode)

updateButtonText();

const sequenceRepeater = (bestUnavailableId) => {
  const authHeaders = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
  };
  if (window.botActive === false) {
    console.log("bot stopped");
    return;
  }
  let randomTime = Math.floor(Math.random() * (50000 - 5500 + 1)) + 5500;
  //getting min upgrade limits per hour
  fetch("https://kotletka.tbank.ru/api/queries/v1/users/businesses", {
    method: "GET",
    headers: authHeaders,
  })
    .then((res) => res.json())
    .then((res) => {
      const improvementData = res.payload.businesses.filter(
        (item) => item.availableFromPhase <= window.currentPhase,
      );
      setTimeout(
        () => {
          fetch("https://kotletka.tbank.ru/api/commands/v1/users/game/sync", {
            method: "POST",
            body: JSON.stringify({
              operations: [
                {
                  type: "spend-energy",
                  energyToSpend: "1",
                  at: new Date().toISOString(),
                },
              ],
            }),
            headers: authHeaders,
          })
            .then((res) => res.json())
            .then((json) => {
              let bestCandidateId = "air_6";
              let bestCandidateNextLevel = 1;
              let bestIncrementPrice = 10000000;
              let bestUpgradeCost = 9999999;
              //getting best value per diamond upgrade
              console.log('calculating price for', window.botMode)
              if(window.botMode === 'gems') {
                improvementData.forEach((el) => {
                  if (el.id === bestUnavailableId) {
                    return;
                  } else {
                    const elPricePerIncrement =
                      el.nextLevelCost / el.nextLevelIncomePerHourDiff;
                      console.log(el.id, '1 diamond increment cost:', elPricePerIncrement)
                    if (elPricePerIncrement < bestIncrementPrice) {
                      bestIncrementPrice = elPricePerIncrement;
                      bestCandidateId = el.id;
                      bestUpgradeCost = el.nextLevelCost;
                      bestCandidateNextLevel = el.currentLevel + 1;
                    }
                  }
                });
              } else {
                improvementData.forEach((el) => {
                  if (el.id === bestUnavailableId) {
                    return;
                  } else {
                    const elPricePerIncrement =
                      el.nextLevelCost / el.nextLevelScoreDiff;
                      console.log(el.id, '1 star increment cost:', elPricePerIncrement)
                    if (elPricePerIncrement < bestIncrementPrice) {
                      bestIncrementPrice = elPricePerIncrement;
                      bestCandidateId = el.id;
                      bestUpgradeCost = el.nextLevelCost;
                      bestCandidateNextLevel = el.currentLevel + 1;
                    }
                  }
                });
              }
              //check if frozen
              let unfreezeTimestamp = improvementData.find(
                (el) => el.id === bestCandidateId,
              ).freezeUntil;
              let currentFrozen = unfreezeTimestamp > new Date().toISOString();
              if (unfreezeTimestamp === null) {
                currentFrozen = false;
                unfreezeTimestamp = new Date().toISOString();
              }
              if (
                json.payload.gameState.Gems.count > bestUpgradeCost &&
                !currentFrozen
              ) {
                setTimeout(
                  () => {
                    //trying to upgrade
                    let body = {};
                    const fetchUrl =
                      bestCandidateNextLevel === 1
                        ? "https://kotletka.tbank.ru/api/commands/v1/users/businesses/purchase"
                        : "https://kotletka.tbank.ru/api/commands/v1/users/businesses/upgrade";
                    if (bestCandidateNextLevel === 1) {
                      console.log("purchasing", bestCandidateId);
                      body = JSON.stringify({
                        businessId: bestCandidateId,
                      });
                    } else {
                      console.log("upgrading", bestCandidateId);
                      body = JSON.stringify({
                        businessId: bestCandidateId,
                        toLevel: bestCandidateNextLevel,
                      });
                    }
                    fetch(fetchUrl, {
                      method: "POST",
                      body: body,
                      headers: authHeaders,
                    })
                      .then((res) => res.json())
                      .then(() => {
                        console.log(
                          "upgraded with id:",
                          bestCandidateId,
                          "name:",
                          improvementData.find(
                            (impEl) => impEl.id === bestCandidateId,
                          ).title,
                        );
                        if (window.botActive) {
                          console.log(
                            "bot will restart in",
                            randomTime,
                            "msec",
                          );
                          setTimeout(sequenceRepeater, randomTime);
                        }
                      })
                      .catch(() => {
                        console.log(
                          "error while trying to upgrade, restarting in",
                          randomTime,
                        );
                        if (window.botActive) {
                          setTimeout(sequenceRepeater, randomTime);
                        }
                      });
                  },
                  Math.floor(randomTime / 5),
                );
              } else {
                const d1 = new Date(unfreezeTimestamp);
                const d2 = Date.now();
                const diffInMs = Math.abs(d1 - d2);
                const minutesLeft = Math.floor(diffInMs / (1000 * 60));
                bestUnavailableId &&
                  console.log("second best", bestUnavailableId, "unavailable");
                if (json.payload.gameState.Gems.count < bestUpgradeCost) {
                  console.log(
                    "bestCandidateId",
                    bestCandidateId,
                    "is not available, current gems:",
                    json.payload.gameState.Gems.count,
                    "needed gems:",
                    bestUpgradeCost,
                    "next try in",
                    randomTime,
                    "msec",
                  );
                  if (window.botActive) {
                    setTimeout(sequenceRepeater, randomTime);
                  }
                } else {
                  console.log(
                    "bestCandidateId",
                    bestCandidateId,
                    "is not available, because it is frozen, will be available in",
                    minutesLeft,
                    "minutes",
                  );
                  if (
                    minutesLeft * (json.payload.gameState.incomePerHour / 60) +
                      json.payload.gameState.Gems.count >
                    bestUpgradeCost
                  ) {
                    console.log("trying second best in", randomTime);
                    if (window.botActive) {
                      setTimeout(() => {
                        sequenceRepeater(bestCandidateId);
                      }, randomTime);
                    }
                  } else {
                    console.log("low balance, retry in", randomTime);
                    if (window.botActive) {
                      setTimeout(() => {
                        sequenceRepeater(bestCandidateId);
                      }, randomTime);
                    }
                  }
                }
              }
            })
            .catch(() => {
              console.log(
                "error while getting current upgrade prices, restarting in",
                randomTime,
              );
              if (window.botActive) {
                setTimeout(sequenceRepeater, randomTime);
              }
            });
        },
        Math.floor(randomTime / 4),
      );
    })
    .catch(() => {
      console.log(
        "error while getting improvement list, restarting in",
        randomTime,
      );
      if (window.botActive) {
        setTimeout(sequenceRepeater, randomTime);
      }
    });
};

window.botActive = true;
sequenceRepeater();
