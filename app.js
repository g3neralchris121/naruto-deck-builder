// Master Database Global Variable & Embedded Fallback Structure
let masterDatabase = {};

// Load master database on startup with fallback
function loadMasterDatabase() {
  fetch('./master_database.json')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      masterDatabase = data;
      console.log("Master Database loaded successfully via fetch!", masterDatabase);
    })
    .catch(error => {
      console.warn("Fetch failed, attempting absolute path...", error);
      fetch('/master_database.json')
        .then(res => res.json())
        .then(data => { masterDatabase = data; })
        .catch(err => console.error("All master database fetches failed:", err));
    });
}

// Main Application Logic
let ownedCardsList = [];
let activeDeck = []; // Limited to 6 cards

document.addEventListener('DOMContentLoaded', () => {
  loadMasterDatabase();
  loadDeckFromLocalStorage();
  injectCardDetailModal();
});

// Trigger file input cleanly
function triggerFileInput() {
  const fileInput = document.getElementById('collectionFileInput');
  if (fileInput) {
    fileInput.click();
  }
}

// Help Modal Toggle
function toggleHelpModal(show) {
  const modal = document.getElementById('helpModal');
  if (show) modal.classList.add('open');
  else modal.classList.remove('open');
}

// Tab Navigation
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const selectedBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const selectedContent = document.getElementById(tabId);

  if (selectedBtn) selectedBtn.classList.add('active');
  if (selectedContent) selectedContent.classList.add('active');
}

// Collection Upload Handler
function handleCollectionUpload(event) {
  const file = event.target.files[0];
  if (!file) {
    console.warn("No file selected.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const data = JSON.parse(text);
      
      parseCollectionJSON(data);
      
      if (ownedCardsList.length === 0) {
        alert("Warning: No owned cards were found in this JSON file.");
        return;
      }

      document.getElementById('calcBtn').disabled = false;
      renderCollectionUI(ownedCardsList);
      alert(`Collection loaded successfully! Found ${ownedCardsList.length} unique cards.`);
      
    } catch (err) {
      console.error("JSON Parsing Error:", err);
      alert('Failed to parse JSON file! Error: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

// Universal Collection Parser for narutoninjacards.com format
function parseCollectionJSON(data) {
  ownedCardsList = [];
  let totalCardsCount = 0;
  let rawItems = [];

  if (!data) return;

  if (data.seasons && Array.isArray(data.seasons)) {
    data.seasons.forEach(season => {
      if (season.cards && Array.isArray(season.cards)) {
        season.cards.forEach(card => {
          rawItems.push({
            ...card,
            seasonId: season.id // "S1", "S2", "S3"
          });
        });
      }
    });
  } else if (Array.isArray(data.cards)) {
    rawItems = data.cards;
  } else if (Array.isArray(data.collection)) {
    rawItems = data.collection;
  } else if (Array.isArray(data)) {
    rawItems = data;
  }

  rawItems.forEach(card => {
    const count = card.count !== undefined ? card.count : 1;
    if (count > 0) {
      const rawId = card.id || 'S1_001';
      
      let seasonKey = 'season_1';
      let cleanNum = rawId;

      if (rawId.startsWith('S1_')) {
        seasonKey = 'season_1';
        cleanNum = rawId.replace('S1_', '');
      } else if (rawId.startsWith('S2_') || (card.seasonId === 'S2')) {
        seasonKey = 'season_2';
        cleanNum = rawId.replace('S2_', '');
      } else if (rawId.startsWith('S3_') || (card.seasonId === 'S3')) {
        seasonKey = 'season_3';
        cleanNum = rawId.replace('S3_', '');
      }

      // Lookup card details in master database
      let dbCard = null;
      if (masterDatabase[seasonKey] && masterDatabase[seasonKey][cleanNum]) {
        dbCard = masterDatabase[seasonKey][cleanNum];
      } else {
        for (const s in masterDatabase) {
          if (masterDatabase[s] && masterDatabase[s][cleanNum]) {
            dbCard = masterDatabase[s][cleanNum];
            seasonKey = s;
            break;
          }
        }
      }

      const attr = (card.metadata && card.metadata.attributes) ? card.metadata.attributes : (card.attributes || {});
      const rarity = dbCard ? dbCard.rarity : (attr.rarity || 'COMMON');
      const name = dbCard ? dbCard.name : (attr.jutsu || attr.clan || attr.ninja_type || attr.name || rawId);
      
      let imgUrl = `./card_images/${rawId}.webp`;
      if (card.metadata && card.metadata.images && card.metadata.images.folio && card.metadata.images.folio.medium) {
        imgUrl = card.metadata.images.folio.medium;
      } else if (card.imageUrl) {
        imgUrl = card.imageUrl;
      }

      ownedCardsList.push({
        id: rawId,
        cleanId: cleanNum,
        season: seasonKey,
        count: count,
        level: card.level || 1,
        attributes: {
          ...attr,
          rarity: rarity,
          name: name,
          cost: dbCard ? dbCard.cost : (attr.cost || 1),
          power: dbCard ? dbCard.power : (attr.power || 1),
          level1: dbCard ? dbCard.level1 : (attr.level1 || 'No description available.'),
          level2: dbCard ? dbCard.level2 : (attr.level2 || dbCard?.level1 || 'No level 2 description available.')
        },
        imageUrl: imgUrl
      });
      totalCardsCount += count;
    }
  });

  // Sort neatly by Season and Card Number ID in proper numerical order
  ownedCardsList.sort((a, b) => {
    if (a.season !== b.season) return a.season.localeCompare(b.season);
    return parseInt(a.cleanId) - parseInt(b.cleanId);
  });

  document.getElementById('totalOwnedCount').textContent = totalCardsCount;
  document.getElementById('uniqueOwnedCount').textContent = ownedCardsList.length;
}

// Render Collection
function renderCollectionUI(cards) {
  const grid = document.getElementById('collectionGrid');
  if (!cards || cards.length === 0) {
    grid.innerHTML = '<div class="placeholder-msg">No cards found matching your search.</div>';
    return;
  }

  grid.innerHTML = cards.map(card => createCardHTML(card, 'add')).join('');
}

// Add Card to Active Deck (Max 6)
function addCardToActiveDeck(cardId) {
  const cardData = ownedCardsList.find(c => c.id === cardId);
  if (!cardData) return;

  if (activeDeck.length >= 6) {
    alert("Deck limit reached! Active decks are capped at exactly 6 cards.");
    return;
  }

  const currentCopiesInDeck = activeDeck.filter(c => c.id === cardId).length;
  if (currentCopiesInDeck >= Math.min(cardData.count, 2)) {
    alert(`Cannot add more copies of ${cardId}! (Limit 2 copies per deck).`);
    return;
  }

  activeDeck.push({ ...cardData, instanceId: `${cardId}_${Date.now()}` });
  updateDeckUI();
}

// Remove Card from Active Deck
function removeCardFromActiveDeck(instanceId) {
  activeDeck = activeDeck.filter(c => c.instanceId !== instanceId);
  updateDeckUI();
}

function clearActiveDeck() {
  if (confirm("Are you sure you want to clear your current deck?")) {
    activeDeck = [];
    updateDeckUI();
  }
}

// Update Active Deck UI
function updateDeckUI() {
  const grid = document.getElementById('activeDeckGrid');
  const badge1 = document.getElementById('deckCountBadge');
  const badge2 = document.getElementById('deckTitleBadge');

  badge1.textContent = activeDeck.length;
  badge2.textContent = `${activeDeck.length} / 6 Cards`;

  if (activeDeck.length === 0) {
    grid.innerHTML = '<div class="placeholder-msg">Your deck is empty. Click cards in Collection to add them!</div>';
    return;
  }

  grid.innerHTML = activeDeck.map(card => createCardHTML(card, 'remove')).join('');
}

// Card HTML Generator with Click-to-Inspect Modal Trigger
function createCardHTML(card, actionType = 'add') {
  const attr = card.attributes || {};
  const rarity = (attr.rarity || 'Common').toLowerCase();
  const name = attr.name || card.id;
  
  return `
    <div class="ninja-card rarity-${rarity}">
      <div class="card-img-wrapper" onclick="openCardModal('${card.id}')" style="cursor: pointer;" title="Click to view card details">
        <img src="${card.imageUrl}" alt="${card.id}" onerror="this.onerror=null; this.src='./card_images/${card.id}.webp';" loading="lazy" />
        <span class="card-count-badge">${actionType === 'add' ? 'x' + card.count : '✖ Remove'}</span>
        <span class="card-rarity-tag ${rarity.toUpperCase()}">${attr.rarity || 'COMMON'}</span>
      </div>
      <div class="card-info" onclick="openCardModal('${card.id}')" style="cursor: pointer;">
        <div class="card-title" title="${name}">${card.id}: ${name}</div>
        <div class="card-details">Lvl ${card.level} | Cost: ${attr.cost} | Pwr: ${attr.power}</div>
      </div>
      <button class="action-btn-${actionType}" onclick="event.stopPropagation(); ${actionType === 'add' ? `addCardToActiveDeck('${card.id}')` : `removeCardFromActiveDeck('${card.instanceId || card.id}')`}">
        ${actionType === 'add' ? '+ Add to Deck' : 'Remove'}
      </button>
    </div>
  `;
}

// Inject Card Detail Modal into DOM dynamically
function injectCardDetailModal() {
  if (document.getElementById('cardDetailModal')) return;

  const modalHTML = `
    <div id="cardDetailModal" class="help-modal" style="display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); align-items: center; justify-content: center;">
      <div class="modal-content" style="background: #1a1a2e; border: 2px solid #f39c12; padding: 25px; border-radius: 12px; max-width: 450px; width: 90%; color: #fff; position: relative;">
        <span onclick="closeCardModal()" style="position: absolute; right: 15px; top: 10px; font-size: 24px; cursor: pointer; color: #aaa;">&times;</span>
        <h2 id="modalCardTitle" style="margin-top: 0; color: #f39c12;">Card Details</h2>
        <div style="display: flex; gap: 15px; margin-bottom: 15px; align-items: center;">
          <img id="modalCardImg" src="" alt="Card" style="width: 120px; border-radius: 8px; border: 1px solid #444;" />
          <div>
            <p><strong>ID:</strong> <span id="modalCardId"></span></p>
            <p><strong>Rarity:</strong> <span id="modalCardRarity"></span></p>
            <p><strong>Cost:</strong> <span id="modalCardCost"></span> | <strong>Power:</strong> <span id="modalCardPower"></span></p>
            <p><strong>Owned Count:</strong> <span id="modalCardCount"></span></p>
          </div>
        </div>
        <div style="margin-bottom: 15px; display: flex; gap: 10px; justify-content: center;">
          <button id="lvl1Btn" onclick="setCardLevelView(1)" style="padding: 8px 16px; background: #f39c12; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: #000;">Level 1</button>
          <button id="lvl2Btn" onclick="setCardLevelView(2)" style="padding: 8px 16px; background: #333; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Level 2</button>
        </div>
        <div style="background: #111; padding: 12px; border-radius: 8px; border: 1px solid #333; min-height: 70px;">
          <strong style="color: #f39c12; display: block; margin-bottom: 5px;">Ability Description:</strong>
          <p id="modalCardDesc" style="margin: 0; font-size: 14px; line-height: 1.4;"></p>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = modalHTML;
  document.body.appendChild(div);
}

let activeModalCard = null;
let currentModalLevel = 1;

function openCardModal(cardId) {
  const card = ownedCardsList.find(c => c.id === cardId);
  if (!card) return;
  activeModalCard = card;
  currentModalLevel = card.level || 1;

  document.getElementById('modalCardTitle').textContent = card.attributes.name || card.id;
  document.getElementById('modalCardId').textContent = card.id;
  document.getElementById('modalCardRarity').textContent = card.attributes.rarity;
  document.getElementById('modalCardCost').textContent = card.attributes.cost;
  document.getElementById('modalCardPower').textContent = card.attributes.power;
  document.getElementById('modalCardCount').textContent = card.count;
  document.getElementById('modalCardImg').src = card.imageUrl;

  updateModalLevelDisplay();
  document.getElementById('cardDetailModal').style.display = 'flex';
}

function closeCardModal() {
  document.getElementById('cardDetailModal').style.display = 'none';
}

function setCardLevelView(lvl) {
  currentModalLevel = lvl;
  updateModalLevelDisplay();
}

function updateModalLevelDisplay() {
  if (!activeModalCard) return;
  const attr = activeModalCard.attributes;
  const desc = currentModalLevel === 2 ? attr.level2 : attr.level1;
  
  document.getElementById('modalCardDesc').textContent = desc;

  const btn1 = document.getElementById('lvl1Btn');
  const btn2 = document.getElementById('lvl2Btn');

  if (currentModalLevel === 1) {
    btn1.style.background = '#f39c12';
    btn1.style.color = '#000';
    btn2.style.background = '#333';
    btn2.style.color = '#fff';
  } else {
    btn2.style.background = '#f39c12';
    btn2.style.color = '#000';
    btn1.style.background = '#333';
    btn1.style.color = '#fff';
  }
}

// AI Calculator Generation (Cap at 6)
function generateOptimalDeckUI() {
  const strategy = document.getElementById('strategySelect').value;
  const result = DeckCalculator.calculateBestDeck(ownedCardsList, strategy);

  if (result.error) {
    alert(result.error);
    return;
  }

  activeDeck = result.deck;
  updateDeckUI();

  const grid = document.getElementById('aiDeckGrid');
  grid.innerHTML = activeDeck.map(card => createCardHTML(card, 'remove')).join('');

  document.getElementById('aiSynergyScore').textContent = `Synergy Score: ${result.totalScore}`;
  document.getElementById('aiStrategyInfo').textContent = `Successfully loaded ${activeDeck.length} cards into your Active Deck using strategy: ${strategy.toUpperCase()}`;

  switchTab('deckTab');
}

// Search & Filter
function filterCollection() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const rarity = document.getElementById('rarityFilter').value;

  const filtered = ownedCardsList.filter(card => {
    const attr = card.attributes || {};
    const matchesSearch = card.id.toLowerCase().includes(query) ||
      (attr.name && attr.name.toLowerCase().includes(query)) ||
      (attr.clan && attr.clan.toLowerCase().includes(query));

    const matchesRarity = rarity === 'ALL' || attr.rarity.toUpperCase() === rarity.toUpperCase();

    return matchesSearch && matchesRarity;
  });

  renderCollectionUI(filtered);
}

// Save Deck to Browser LocalStorage
function saveDeckToLocalStorage() {
  if (activeDeck.length === 0) {
    alert("Please add cards to your deck before saving!");
    return;
  }
  localStorage.setItem('naruto_active_deck', JSON.stringify(activeDeck));
  alert(`Saved ${activeDeck.length}-card deck to browser local storage!`);
}

function loadDeckFromLocalStorage() {
  const saved = localStorage.getItem('naruto_active_deck');
  if (saved) {
    try {
      activeDeck = JSON.parse(saved);
      updateDeckUI();
    } catch(e){}
  }
}

// Export Deck JSON File
function exportDeckJSON() {
  if (!activeDeck || activeDeck.length === 0) {
    alert("Please add cards to your deck before exporting!");
    return;
  }

  const exportData = {
    deckName: "Custom Naruto Ninja Deck",
    createdAt: new Date().toISOString(),
    totalCards: activeDeck.length,
    cards: activeDeck.map(c => ({
      id: c.id,
      rarity: c.attributes ? c.attributes.rarity : 'Common',
      name: c.attributes ? c.attributes.name : c.id
    }))
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "naruto_deck.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}