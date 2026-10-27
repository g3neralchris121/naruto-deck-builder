let masterDatabase = {};
let ownedCardsList = [];
let allDatabaseCards = [];
let activeDeck = [];

document.addEventListener('DOMContentLoaded', () => {
  // Use the global masterDatabase object loaded directly via master_database.js
  if (typeof masterDatabase !== 'undefined' && Object.keys(masterDatabase).length > 0) {
    flattenDatabase(masterDatabase);
    renderDatabaseUI(allDatabaseCards);
  } else {
    console.warn("masterDatabase global object not found.");
    const grid = document.getElementById('databaseGrid');
    if (grid) grid.innerHTML = '<div class="placeholder-msg">Error: masterDatabase not loaded. Check script order in index.html.</div>';
  }

  loadDeckFromLocalStorage();
});

function flattenDatabase(data) {
  allDatabaseCards = [];
  for (const seasonKey in data) {
    const seasonCards = data[seasonKey];
    for (const cardId in seasonCards) {
      const card = seasonCards[cardId];
      const id = card.id || cardId;
      allDatabaseCards.push({
        id: id,
        season: seasonKey,
        count: 1,
        level: 1,
        attributes: {
          rarity: (card.rarity || 'Common').toUpperCase(),
          name: card.name || id,
          cost: card.cost || 1,
          power: card.power || 1,
          description: card.description || card.level1 || ''
        },
        imageUrl: `./cards/${id}.png`
      });
    }
  }
  // Sort database cards neatly by ID (e.g. S1_001, S1_002...)
  allDatabaseCards.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

function renderDatabaseUI(cards) {
  const grid = document.getElementById('databaseGrid');
  if (!grid) return;
  if (!cards.length) {
    grid.innerHTML = '<div class="placeholder-msg">No cards found in database.</div>';
    return;
  }
  
  const displayLimit = 60;
  const cardsToRender = cards.slice(0, displayLimit);
  let html = cardsToRender.map(c => createCardHTML(c, 'db')).join('');
  
  if (cards.length > displayLimit) {
    html += `<div class="placeholder-msg" style="grid-column: 1 / -1; padding: 20px;">Showing ${displayLimit} of ${cards.length} results. Use search to find specific cards!</div>`;
  }
  grid.innerHTML = html;
}

function filterDatabase() {
  const query = document.getElementById('dbSearchInput').value.toLowerCase();
  const season = document.getElementById('seasonSelect').value;

  const filtered = allDatabaseCards.filter(c => {
    const matchesSeason = season === 'all' || c.season === season;
    const matchesSearch = c.id.toLowerCase().includes(query) || c.attributes.name.toLowerCase().includes(query);
    return matchesSeason && matchesSearch;
  });

  renderDatabaseUI(filtered);
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const selectedBtn = document.querySelector(`[data-tab="${tabId}"]`);
  const selectedContent = document.getElementById(tabId);

  if (selectedBtn) selectedBtn.classList.add('active');
  if (selectedContent) selectedContent.classList.add('active');
}

function triggerFileInput() {
  document.getElementById('collectionFileInput').click();
}

function toggleHelpModal(show) {
  const modal = document.getElementById('helpModal');
  if (modal) {
    if (show) modal.classList.add('open');
    else modal.classList.remove('open');
  }
}

function handleCollectionUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      parseCollectionJSON(data);
      renderCollectionUI(ownedCardsList);
      const calcBtn = document.getElementById('calcBtn');
      if (calcBtn) calcBtn.disabled = false;
      alert(`Collection loaded successfully! Found ${ownedCardsList.length} unique cards.`);
    } catch (err) {
      alert('Failed to parse JSON file! Error: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function parseCollectionJSON(data) {
  ownedCardsList = [];
  let totalCardsCount = 0;
  let rawItems = [];

  if (data.seasons && Array.isArray(data.seasons)) {
    data.seasons.forEach(s => {
      if (s.cards) s.cards.forEach(c => rawItems.push({ ...c, seasonId: s.id }));
    });
  } else if (Array.isArray(data.cards)) {
    rawItems = data.cards;
  } else if (Array.isArray(data)) {
    rawItems = data;
  }

  rawItems.forEach(card => {
    const count = card.count !== undefined ? card.count : 1;
    if (count > 0) {
      const rawId = card.id || '001';
      ownedCardsList.push({
        id: rawId,
        count: count,
        level: card.level || 1,
        attributes: card.attributes || { rarity: 'COMMON', cost: 1, power: 1, name: rawId },
        imageUrl: `./cards/${rawId}.png`
      });
      totalCardsCount += count;
    }
  });

  // Enrich with master database info if available
  enrichCollectionWithDatabase();

  // Sort collection cards neatly by ID (S1_001, S1_002...)
  ownedCardsList.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const totalElem = document.getElementById('totalOwnedCount');
  const uniqueElem = document.getElementById('uniqueOwnedCount');
  if (totalElem) totalElem.textContent = totalCardsCount;
  if (uniqueElem) uniqueElem.textContent = ownedCardsList.length;
}

function enrichCollectionWithDatabase() {
  if (!Object.keys(masterDatabase).length) return;
  
  ownedCardsList.forEach(owned => {
    let foundCard = null;
    for (const seasonKey in masterDatabase) {
      if (masterDatabase[seasonKey][owned.id]) {
        foundCard = masterDatabase[seasonKey][owned.id];
        break;
      }
    }
    if (foundCard) {
      owned.attributes = {
        rarity: (foundCard.rarity || 'COMMON').toUpperCase(),
        name: foundCard.name || owned.id,
        cost: foundCard.cost || 1,
        power: foundCard.power || 1,
        description: foundCard.description || foundCard.level1 || ''
      };
    }
  });
}

function renderCollectionUI(cards) {
  const grid = document.getElementById('collectionGrid');
  if (!grid) return;
  if (!cards.length) {
    grid.innerHTML = '<div class="placeholder-msg">No cards found matching your search.</div>';
    return;
  }
  
  const displayLimit = 150;
  const cardsToRender = cards.slice(0, displayLimit);
  let html = cardsToRender.map(c => createCardHTML(c, 'collection')).join('');
  
  if (cards.length > displayLimit) {
    html += `<div class="placeholder-msg" style="grid-column: 1 / -1; padding: 20px;">Showing ${displayLimit} of ${cards.length} cards. Use search to view more.</div>`;
  }
  grid.innerHTML = html;
}

function addCardToActiveDeck(cardId, fromSource = 'collection') {
  let cardData = fromSource === 'db' 
    ? allDatabaseCards.find(c => c.id === cardId)
    : ownedCardsList.find(c => c.id === cardId);

  if (!cardData) return;

  if (activeDeck.length >= 6) {
    alert("Deck limit reached! Active decks are capped at exactly 6 cards.");
    return;
  }

  activeDeck.push({ ...cardData, instanceId: `${cardId}_${Date.now()}` });
  updateDeckUI();
}

function removeCardFromActiveDeck(instanceId) {
  activeDeck = activeDeck.filter(c => c.instanceId !== instanceId);
  updateDeckUI();
}

function clearActiveDeck() {
  if (confirm("Clear your current deck?")) {
    activeDeck = [];
    updateDeckUI();
  }
}

function updateDeckUI() {
  const grid = document.getElementById('activeDeckGrid');
  const badge = document.getElementById('deckCountBadge');
  const titleBadge = document.getElementById('deckTitleBadge');

  if (badge) badge.textContent = activeDeck.length;
  if (titleBadge) titleBadge.textContent = `${activeDeck.length} / 6 Cards`;

  if (!grid) return;
  if (!activeDeck.length) {
    grid.innerHTML = '<div class="placeholder-msg">Your deck is empty. Add cards from collection or database!</div>';
    return;
  }
  grid.innerHTML = activeDeck.map(c => createCardHTML(c, 'remove')).join('');
}

function createCardHTML(card, actionType) {
  const attr = card.attributes || {};
  const rarity = (attr.rarity || 'COMMON').toLowerCase();
  const name = attr.name || card.id;

  let btnAction = `addCardToActiveDeck('${card.id}', 'collection')`;
  let btnText = '+ Add to Deck';

  if (actionType === 'remove') {
    btnAction = `removeCardFromActiveDeck('${card.instanceId || card.id}')`;
    btnText = '✖ Remove';
  } else if (actionType === 'db') {
    btnAction = `addCardToActiveDeck('${card.id}', 'db')`;
    btnText = '+ Add to Deck';
  }

  return `
    <div class="ninja-card rarity-${rarity}">
      <div class="card-img-wrapper">
        <img src="${card.imageUrl}" alt="${card.id}" onerror="this.src='./cards/${card.id}.png';" loading="lazy" />
        ${actionType === 'collection' ? `<span class="card-count-badge">x${card.count}</span>` : ''}
        <span class="card-rarity-tag ${rarity.toUpperCase()}">${attr.rarity || 'COMMON'}</span>
      </div>
      <div class="card-info">
        <div class="card-title" title="${name}">${card.id}: ${name}</div>
        <div class="card-details">Cost: ${attr.cost} | Pwr: ${attr.power}</div>
      </div>
      <button onclick="${btnAction}" style="width:100%; padding:6px; border:none; color:#fff; font-weight:600; cursor:pointer; background:${actionType === 'remove' ? 'rgba(239,68,68,0.2)' : 'var(--accent-orange)'};">
        ${btnText}
      </button>
    </div>
  `;
}

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
  if (grid) grid.innerHTML = activeDeck.map(c => createCardHTML(c, 'remove')).join('');

  document.getElementById('aiSynergyScore').textContent = `Synergy Score: ${result.totalScore}`;
  document.getElementById('aiStrategyInfo').textContent = `Successfully loaded ${activeDeck.length} cards using strategy: ${strategy.toUpperCase()}`;

  switchTab('deckTab');
}

function filterCollection() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const rarity = document.getElementById('rarityFilter').value;

  const filtered = ownedCardsList.filter(card => {
    const attr = card.attributes || {};
    const matchesSearch = card.id.toLowerCase().includes(query) || (attr.name && attr.name.toLowerCase().includes(query));
    const matchesRarity = rarity === 'ALL' || attr.rarity.toUpperCase() === rarity.toUpperCase();
    return matchesSearch && matchesRarity;
  });

  renderCollectionUI(filtered);
}

function saveDeckToLocalStorage() {
  if (!activeDeck.length) {
    alert("Deck is empty!");
    return;
  }
  localStorage.setItem('naruto_active_deck', JSON.stringify(activeDeck));
  alert(`Saved ${activeDeck.length}-card deck to browser storage!`);
}

function loadDeckFromLocalStorage() {
  const saved = localStorage.getItem('naruto_active_deck');
  if (saved) {
    try { activeDeck = JSON.parse(saved); updateDeckUI(); } catch(e){}
  }
}

function exportDeckJSON() {
  if (!activeDeck.length) {
    alert("Deck is empty!");
    return;
  }
  const exportData = { deckName: "Naruto Deck", createdAt: new Date().toISOString(), cards: activeDeck };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "naruto_deck.json";
  link.click();
  URL.revokeObjectURL(url);
}