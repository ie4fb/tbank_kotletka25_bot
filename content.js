const sequenceRepeater = (bestUnavailableId) => {
  const authHeaders = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
  };
  if (window.botActive === false) {
    console.log("bot stopped");
    return;
  }
  const currentPhase = 1;
  //random sequence restart delay 
  let randomTime = Math.floor(Math.random() * (50000 - 5500 + 1)) + 5500;
  //getting min upgrade limits per hour
  fetch("https://kotletka.tbank.ru/api/queries/v1/users/businesses", {
    method: "GET",
    headers: authHeaders,
  })
    .then((res) => res.json())
    .then((res) => {
      const improvementData = res.payload.businesses.filter(
        (item) => item.availableFromPhase <= currentPhase,
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
