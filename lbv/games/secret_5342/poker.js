// Global variables for game state
    let players = [];
    let currentPlayerIndex = 0;
    let roundCount = 1;
    let playerHand = 0;
    let aiHand = 0;
    let saveSlot = null;

    // Poker hand evaluation helpers for 5 card draw
    function getCardDeck() {
      const suits = ['♠️','♥️','♦️','♣️'];
      const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
      let deck = [];
      for (let suit of suits) {
        for (let rank of ranks) {
          deck.push({ rank, suit });
        }
      }
      return deck;
    }

    function drawCards(deck, n) {
      let cards = [];
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * deck.length);
        cards.push(deck.splice(idx, 1)[0]);
      }
      return cards;
    }

    // Poker hand ranking for 5-card draw
    function handStrength(cards) {
      // Returns [rank, highCard, ...] for comparison
      // Rank: 8=Straight Flush, 7=Four, 6=Full House, 5=Flush, 4=Straight, 3=Three, 2=Two Pair, 1=Pair, 0=High Card
      const values = cards.map(c => cardValue(c.rank)).sort((a, b) => b - a);
      const suits = cards.map(c => c.suit);
      const counts = {};
      for (let v of values) counts[v] = (counts[v] || 0) + 1;
      const countVals = Object.values(counts).sort((a, b) => b - a);
      const uniqueVals = Object.keys(counts).map(Number).sort((a, b) => b - a);

      const isFlush = suits.every(s => s === suits[0]);
      const isStraight = values.every((v, i, arr) => i === 0 || arr[i - 1] - v === 1)
        || (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2); // Wheel

      if (isFlush && isStraight) return [8, values[0]];
      if (countVals[0] === 4) return [7, uniqueVals[0], uniqueVals[1]];
      if (countVals[0] === 3 && countVals[1] === 2) return [6, uniqueVals[0], uniqueVals[1]];
      if (isFlush) return [5, ...values];
      if (isStraight) return [4, values[0]];
      if (countVals[0] === 3) return [3, uniqueVals[0], ...uniqueVals.slice(1)];
      if (countVals[0] === 2 && countVals[1] === 2) return [2, uniqueVals[0], uniqueVals[1], uniqueVals[2]];
      if (countVals[0] === 2) return [1, uniqueVals[0], ...uniqueVals.slice(1)];
      return [0, ...values];
    }

    function compareHands(a, b) {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] || 0) > (b[i] || 0)) return 1;
        if ((a[i] || 0) < (b[i] || 0)) return -1;
      }
      return 0;
    }

    function cardValue(rank) {
      if (rank === 'A') return 14;
      if (rank === 'K') return 13;
      if (rank === 'Q') return 12;
      if (rank === 'J') return 11;
      return parseInt(rank);
    }

    // Track cheat mode activation
window._cheatMode = false;

// Kanami code handler: type "kanami" to activate cheat mode
document.addEventListener("keydown", function(e) {
  let key = e.key;
  if (typeof key !== "string" || key.length !== 1) return;
  window._kanamiBuffer = (window._kanamiBuffer || "") + key.toLowerCase();
  if (window._kanamiBuffer.length > 6) window._kanamiBuffer = window._kanamiBuffer.slice(-6);
  if (window._kanamiBuffer.endsWith("kanami")) {
    window._cheatMode = true;
    showCheatNotice();
    playerAction("kanamicoke");
    window._kanamiBuffer = "";
  }
});

// Show cheat mode notice and enable card editing
function showCheatNotice() {
  const gameDiv = document.getElementById("game");
  if (!document.getElementById("cheat-notice")) {
    const cheatDiv = document.createElement("div");
    cheatDiv.id = "cheat-notice";
    cheatDiv.innerHTML = `<p style="color:#0ff;font-weight:bold;">Cheat mode: You can click your cards to change them!</p>`;
    gameDiv.prepend(cheatDiv);
  }
}

// Helper to get all ranks and suits
function getAllRanks() {
  return ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
}
function getAllSuits() {
  return ['♠️','♥️','♦️','♣️'];
}

// Patch cardsToHTML to allow card changing in cheat mode (single click to select, then choose replacement)
function cardsToHTML(cards, selectable = false, selected = []) {
  return cards.map((card, i) => {
    let cheatAttr = '';
    if (window._cheatMode && selectable) {
      cheatAttr = `onclick="cheatSelectCard(${i})" title="Click to change this card"`;
    } else if (selectable) {
      cheatAttr = `onclick="toggleCardSelect(${i})"`;
    }
    return `<span 
      class="${selectable && selected.includes(i) ? 'selected-card' : ''}"
      style="display:inline-block;background:#fff;color:#222;border-radius:6px;border:2px solid #888;padding:8px 12px;font-size:2em;min-width:38px;text-align:center;box-shadow:1px 2px 4px #0003;${selectable ? 'cursor:pointer;' : ''}" 
      ${cheatAttr}
    >${card.rank}<br>${card.suit}</span>`;
  }).join('<span style="width:8px;display:inline-block"></span>');
}

// Cheat: select a card to change, then pick replacement from a dialog
window.cheatSelectCard = function(idx) {
  if (!window._cheatMode) return;
  const cards = window._lastPlayerCards;
  if (!cards) return;

  // Build a selection dialog for all possible cards not already in hand
  const allRanks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const allSuits = ['♠️','♥️','♦️','♣️'];
  const handSet = new Set(cards.map((c, i) => i !== idx ? c.rank + c.suit : null));
  let options = [];
  for (let suit of allSuits) {
    for (let rank of allRanks) {
      const key = rank + suit;
      if (!handSet.has(key)) {
        options.push({ rank, suit });
      }
    }
  }

  // Build a simple modal dialog
  let modal = document.createElement("div");
  modal.id = "cheat-modal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.7)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "1000";

  let inner = document.createElement("div");
  inner.style.background = "#fff";
  inner.style.padding = "24px";
  inner.style.borderRadius = "10px";
  inner.style.maxWidth = "90vw";
  inner.style.maxHeight = "80vh";
  inner.style.overflow = "auto";
  inner.style.textAlign = "center";

  inner.innerHTML = `<div style="margin-bottom:10px;font-weight:bold;">Choose a card to replace with:</div>`;
  let grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(8,auto)";
  grid.style.gap = "8px";
  options.forEach(opt => {
    let btn = document.createElement("button");
    btn.style.background = "#fff";
    btn.style.border = "2px solid #2196f3";
    btn.style.borderRadius = "6px";
    btn.style.padding = "8px 10px";
    btn.style.fontSize = "1.3em";
    btn.style.cursor = "pointer";
    btn.innerHTML = `${opt.rank}<br>${opt.suit}`;
    btn.onclick = function() {
      cards[idx] = { rank: opt.rank, suit: opt.suit };
      window._lastPlayerCards = cards;
      // Redraw hand
      if (document.getElementById("playerCards")) {
        document.getElementById("playerCards").outerHTML =
          `<span id="playerCards">${cardsToHTML(cards, true, window._selectedToReplace)}</span>`;
      }
      document.body.removeChild(modal);
    };
    grid.appendChild(btn);
  });
  inner.appendChild(grid);

  // Cancel button
  let cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.marginTop = "16px";
  cancelBtn.style.background = "#bbb";
  cancelBtn.style.color = "#222";
  cancelBtn.style.borderRadius = "5px";
  cancelBtn.style.padding = "8px 16px";
  cancelBtn.style.fontSize = "1em";
  cancelBtn.onclick = function() {
    document.body.removeChild(modal);
  };
  inner.appendChild(document.createElement("br"));
  inner.appendChild(cancelBtn);

  modal.appendChild(inner);
  document.body.appendChild(modal);
};

// --- Save/Load logic ---

    function showSaveSlotScreen() {
      const gameDiv = document.getElementById("game");
      // List existing save slots
      let slots = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith("poker_save_")) slots.push(k.replace("poker_save_", ""));
      }
      let html = `<h1>Poker Save Slots</h1>
        <p>Choose a save slot or create a new one:</p>
        <ul>`;
      slots.forEach(slot => {
        html += `<li>
          <button onclick="loadSaveSlot('${slot}')">Load: ${slot}</button>
          <button onclick="deleteSaveSlot('${slot}')" style="background:#a33;">Delete</button>
        </li>`;
      });
      html += `</ul>
        <p>Or create new save slot:</p>
        <input id="newSlotName" type="text" placeholder="Save name">
        <button onclick="createSaveSlot()">Create</button>
      `;
      gameDiv.innerHTML = html;
      document.getElementById("scoreboard").innerHTML = "";
    }

    function createSaveSlot() {
      const name = document.getElementById("newSlotName").value.trim();
      if (!name) {
        alert("Please enter a save name.");
        return;
      }
      saveSlot = name;
      // Start new game
      showSetupScreen();
    }

    function loadSaveSlot(slot) {
      saveSlot = slot;
      const data = localStorage.getItem("poker_save_" + slot);
      if (data) {
        const state = JSON.parse(data);
        players = state.players;
        currentPlayerIndex = state.currentPlayerIndex;
        roundCount = state.roundCount;
        window._lastPlayerCards = state.lastPlayerCards || null;
        window._lastAICards = state.lastAICards || null;
        updateScoreboard();
        showTurnPrompt();
      } else {
        showSetupScreen();
      }
    }

    function deleteSaveSlot(slot) {
      if (confirm("Delete save slot '" + slot + "'?")) {
        localStorage.removeItem("poker_save_" + slot);
        showSaveSlotScreen();
      }
    }

    // --- Setup/game logic ---

    // Store the current round's hands in the save file for persistence
    function saveGame() {
      if (!saveSlot) return;
      const state = {
        players,
        currentPlayerIndex,
        roundCount,
        lastPlayerCards: window._lastPlayerCards || null,
        lastAICards: window._lastAICards || null
      };
      localStorage.setItem("poker_save_" + saveSlot, JSON.stringify(state));
    }

    // Setup screen: ask for number of players
    function showSetupScreen() {
      const gameDiv = document.getElementById("game");
      gameDiv.innerHTML = `
        <h1>Multiplayer AI Poker Bluff</h1>
        <p>Enter number of players (1–4):</p>
        <input id="numPlayers" type="number" min="1" max="4" value="1">
        <br>
        <button onclick="startGame()">Next</button>
        <button onclick="showSaveSlotScreen()" style="background:#888;">Back to Save Slots</button>
      `;
      document.getElementById("scoreboard").innerHTML = "";
    }

    // After entering the number of players, show custom name inputs
    function startGame() {
      const num = parseInt(document.getElementById("numPlayers").value);
      if (isNaN(num) || num < 1 || num > 4) {
        alert("Please enter a valid number between 1 and 4.");
        return;
      }
      showNameSetupScreen(num);
    }

    // Display inputs to allow players to enter their names
    function showNameSetupScreen(num) {
      const gameDiv = document.getElementById("game");
      let inputsHTML = `<h1>Enter Player Names</h1>`;
      for (let i = 1; i <= num; i++) {
        inputsHTML += `
          <p>
            <label for="playerName${i}">Player ${i} Name: </label>
            <input id="playerName${i}" type="text" placeholder="Player ${i}">
          </p>
        `;
      }
      inputsHTML += `<button onclick="initializePlayers(${num})">Start Game</button>`;
      gameDiv.innerHTML = inputsHTML;
    }

    // Initialize the players array using entered names (or defaults)
    function initializePlayers(num) {
      players = [];
      for (let i = 1; i <= num; i++) {
        const nameInput = document.getElementById("playerName" + i);
        let name = nameInput.value.trim();
        if (name === "") {
          name = "Player " + i;
        }
        players.push({ name: name, chips: 100, wins: 0, losses: 0 });
      }
      currentPlayerIndex = 0;
      roundCount = 1;
      updateScoreboard();
      saveGame();
      showTurnPrompt();
    }

    // Update the scoreboard at the top-right
    function updateScoreboard() {
      let scoreboardHTML = '<h3>Scoreboard</h3><ul>';
      players.forEach(player => {
        scoreboardHTML += `<li><strong>${player.name}</strong>: Chips: ${player.chips} | Wins: ${player.wins} | Losses: ${player.losses}</li>`;
      });
      scoreboardHTML += '</ul><p><strong>Scoring Guide:</strong><br>Call → 10 chips<br>Raise → 20 chips<br>Fold → Lose 5 chips</p>';
      document.getElementById("scoreboard").innerHTML = scoreboardHTML;
      updateSaveExitButton(true);
    }

    // Show/hide the Save & Exit button depending on game state
function updateSaveExitButton(show = true) {
  const saveExitDiv = document.getElementById("saveexit");
  if (show) {
    saveExitDiv.innerHTML = `<button onclick="saveAndExit()">Save & Exit</button>`;
  } else {
    saveExitDiv.innerHTML = "";
  }
}

// Save and exit handler
function saveAndExit() {
  saveGame();
  showSaveSlotScreen();
  updateSaveExitButton(false);
}

// Prompt the current player to take their turn while enforcing "pass device"
    function showTurnPrompt() {
      // Remove players with zero or fewer chips
      if (players[currentPlayerIndex].chips <= 0) {
        players.splice(currentPlayerIndex, 1);
        if (players.length < 1) {
          showGameOver();
          return;
        }
        currentPlayerIndex %= players.length;
      }
      if (players.length < 1) {
        showGameOver();
        return;
      }
      const gameDiv = document.getElementById("game");
      if (players.length === 1) {
        // Single player: skip pass device
        beginTurn();
      } else {
        gameDiv.innerHTML = `
          <h2>${players[currentPlayerIndex].name}'s Turn</h2>
          <p>Please hand the device to ${players[currentPlayerIndex].name}.</p>
          <button onclick="beginTurn()">Begin Turn</button>
        `;
      }
    }

    // Begin the current player's round by generating hands and actions
    function beginTurn() {
      const gameDiv = document.getElementById("game");
      gameDiv.innerHTML = `
        <h2>${players[currentPlayerIndex].name}'s Round (Round ${roundCount})</h2>
        <p>Chips: ${players[currentPlayerIndex].chips}</p>
      `;
      // If hands exist from save, use them, else deal new
      let playerCards, aiCards;
      if (window._lastPlayerCards && window._lastAICards) {
        playerCards = window._lastPlayerCards;
        aiCards = window._lastAICards;
      } else {
        let deck = getCardDeck();
        playerCards = drawCards(deck, 5);
        aiCards = drawCards(deck, 5);
        window._lastPlayerCards = playerCards;
        window._lastAICards = aiCards;
        saveGame();
      }

      window._selectedToReplace = [];

      gameDiv.innerHTML += `
        <p>Your hand (click cards to select for redraw):<br>
        <span id="playerCards">${cardsToHTML(playerCards, true, window._selectedToReplace)}</span></p>
        <button onclick="drawPhase()">Draw Selected</button>
      `;
    }

    // Card selection for draw
    window._selectedToReplace = [];
    function toggleCardSelect(idx) {
      const cards = window._lastPlayerCards;
      if (!cards) return;
      if (!window._selectedToReplace) window._selectedToReplace = [];
      const i = window._selectedToReplace.indexOf(idx);
      if (i === -1) {
        if (window._selectedToReplace.length < 3) window._selectedToReplace.push(idx);
      } else {
        window._selectedToReplace.splice(i, 1);
      }
      document.getElementById("playerCards").innerHTML = cardsToHTML(cards, true, window._selectedToReplace);
    }

    // Draw phase: replace selected cards, then show betting options
    function drawPhase() {
      let playerCards = window._lastPlayerCards;
      let aiCards = window._lastAICards;
      let deck = getCardDeck();
      // Remove all cards in play from deck
      for (let c of playerCards.concat(aiCards)) {
        const idx = deck.findIndex(card => card.rank === c.rank && card.suit === c.suit);
        if (idx !== -1) deck.splice(idx, 1);
      }
      // Replace selected cards for player
      window._selectedToReplace = window._selectedToReplace || [];
      for (let idx of window._selectedToReplace) {
        playerCards[idx] = drawCards(deck, 1)[0];
      }
      // AI randomly replaces up to 3 non-paired cards
      let aiReplace = [];
      let aiCounts = {};
      aiCards.forEach(c => aiCounts[c.rank] = (aiCounts[c.rank] || 0) + 1);
      for (let i = 0; i < 5; i++) {
        if (aiCounts[aiCards[i].rank] === 1 && aiReplace.length < 3 && Math.random() < 0.7) aiReplace.push(i);
      }
      for (let idx of aiReplace) {
        aiCards[idx] = drawCards(deck, 1)[0];
      }
      window._lastPlayerCards = playerCards;
      window._lastAICards = aiCards;
      window._selectedToReplace = [];

      saveGame();

      const aiBetMessage = getAIBetMessage(handStrength(aiCards));

      const gameDiv = document.getElementById("game");
      gameDiv.innerHTML = `
        <p>Your final hand:<br>
        <span>${cardsToHTML(playerCards)}</span></p>
        <p>AI says: "${aiBetMessage}"</p>
        <button onclick="playerAction('call')">Call</button>
        <button onclick="playerAction('raise')">Raise</button>
        <button onclick="playerAction('fold')">Fold</button>
      `;
    }

    // Convert a numeric hand value to a descriptive text
    function getHandDescription(value) {
      // No description, just return empty string
      return "";
    }

    // Generate an AI betting message based on its hidden hand value
    function getAIBetMessage(value) {
      if (value <= 30) return Math.random() < 0.7 ? "I bet 20 chips." : "I bet 10 chips.";
      else if (value <= 60) return Math.random() < 0.5 ? "I bet 15 chips." : "I bet 10 chips.";
      else if (value <= 80) return Math.random() < 0.5 ? "I bet 15 chips." : "I bet 10 chips.";
      else return Math.random() < 0.5 ? "I bet 10 chips." : "I bet 5 chips.";
    }

    // Process the current player's action (call, raise, or fold)
    function playerAction(action) {
      const gameDiv = document.getElementById("game");
      let outcomeMessage = "";
      let chipChange = 0;

      // Use last dealt hands
      const playerCards = window._lastPlayerCards;
      const aiCards = window._lastAICards;
      const playerScore = handStrength(playerCards);
      const aiScore = handStrength(aiCards);

      // Kanami code: type "kanami"
      if (action === "kanamicoke") {
        gameDiv.innerHTML += `
          <p style="color:#0ff;"><strong>Cheat activated! AI's hand:</strong> <span style="display:inline-flex;gap:8px;">${cardsToHTML(aiCards)}</span></p>
        `;
        return;
      }

      const cmp = compareHands(playerScore, aiScore);

      if (action === "fold") {
        chipChange = -5;
        outcomeMessage = "You folded.";
        players[currentPlayerIndex].losses++;
      } else if (action === "call") {
        if (cmp > 0) {
          chipChange = 10;
          outcomeMessage = "You called and won!";
          players[currentPlayerIndex].wins++;
        } else if (cmp < 0) {
          chipChange = -10;
          outcomeMessage = "You called but lost.";
          players[currentPlayerIndex].losses++;
        } else {
          outcomeMessage = "It's a tie! No chips change.";
        }
      } else if (action === "raise") {
        if (cmp > 0) {
          chipChange = 20;
          outcomeMessage = "You raised and won!";
          players[currentPlayerIndex].wins++;
        } else if (cmp < 0) {
          chipChange = -20;
          outcomeMessage = "You raised but lost badly.";
          players[currentPlayerIndex].losses++;
        } else {
          outcomeMessage = "It's a tie! No chips change.";
        }
      }

      players[currentPlayerIndex].chips += chipChange;
      roundCount++;
      updateScoreboard();

      // Clear hands for next round
      window._lastPlayerCards = null;
      window._lastAICards = null;
      saveGame();

      gameDiv.innerHTML += `
        <p>${outcomeMessage}</p>
        <p>(Chip change: ${chipChange}, Total chips: ${players[currentPlayerIndex].chips})</p>
        <p>Your hand was: <span style="display:inline-flex;gap:8px;">${cardsToHTML(playerCards)}</span></p>
        <p>AI's hand was: <span style="display:inline-flex;gap:8px;">${cardsToHTML(aiCards)}</span></p>
        <button onclick="passDevice()">Pass Device</button>
      `;
    }

    // When a player finishes their turn, pass the device to the next valid player
    function passDevice() {
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
      saveGame();
      showTurnPrompt();
    }

    // Show the game over screen when only one player remains
    function showGameOver() {
      const gameDiv = document.getElementById("game");
      let winner;
      if (players.length === 1) {
        winner = players[0].name;
      } else if (players.length === 0) {
        winner = "No one";
      } else {
        winner = players.reduce((prev, curr) => (prev.chips > curr.chips ? prev : curr)).name;
      }
      // Remove save slot on game over
      if (saveSlot) localStorage.removeItem("poker_save_" + saveSlot);
      gameDiv.innerHTML = `
        <h2>Game Over!</h2>
        <p>The winner is <strong>${winner}</strong>!</p>
        <button onclick="showSaveSlotScreen()">Back to Save Slots</button>
        <button onclick="location.reload()">Restart Game</button>
      `;
      updateSaveExitButton(false);
    }

    // Start with save slot selection when the page loads
    window.onload = showSaveSlotScreen;