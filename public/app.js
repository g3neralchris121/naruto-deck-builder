window.NarutoApp = window.NarutoApp || {
  ownedCardsList: [],
  allDatabaseCards: [],
  activeDeck: [],
  calculatedAiDeck: [], // Stores temporary preview calculated deck
  dbShowAll: false
};

const appState = window.NarutoApp;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof masterDatabase !== 'undefined' && Object.keys(masterDatabase).length > 0) {
    flattenDatabase(masterDatabase);
    renderDatabaseUI(appState.allDatabaseCards);
  } else {
    console.warn("masterDatabase global object not found.");
    const grid = document.getElementById('databaseGrid');
    if (grid) grid.innerHTML = '<div class="placeholder-msg">Error: masterDatabase not loaded. Check script order in index.html.</div>';
  }

  loadDeckFromLocalStorage();
});

function formatCardId(rawId, seasonKey) {
  if (typeof rawId === 'string' && rawId.includes('_')) return rawId;
  
  let seasonNum = '1';
  if (seasonKey) {
    const match = seasonKey.match(/\d+/);
    if (match) seasonNum = match[0];
  }
  
  const paddedNumber = String(rawId).padStart(3, '0');
  return `S${seasonNum}_${paddedNumber}`;
}

function flattenDatabase(data) {
  appState.allDatabaseCards = [];
  for (const seasonKey in data) {
    const seasonCards = data[seasonKey];
    for (const cardId in seasonCards) {
      const card = seasonCards[cardId];
      const fullId = formatCardId(card.id || cardId, seasonKey);
      
      appState.allDatabaseCards.push({
        id: fullId,
        season: seasonKey,
        count: 1,
        level: 1,
        attributes: {
          rarity: (card.rarity || 'Common').toUpperCase(),
          name: card.name || fullId,
          cost: card.cost !== undefined ? card.cost : 1,
          power: card.power !== undefined ? card.power : 1,
          description: card.description || card.level1 || ''
        },
        imageUrl: `./cards/${fullId}.png`
      });
    }
  }
  appState.allDatabaseCards.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

function renderDatabaseUI(cards) {
  const grid = document.getElementById('databaseGrid');
  const btn = document.getElementById('toggleDbLimitBtn');
  if (!grid) return;

  if (!cards.length) {
    grid.innerHTML = '<div class="placeholder-msg">No cards found in database.</div>';
    return;
  }
  
  const displayLimit = 60;
  const cardsToRender = appState.dbShowAll ? cards : cards.slice(0, displayLimit);
  let html = cardsToRender.map(c => createCardHTML(c, 'db')).join('');
  
  if (!appState.dbShowAll && cards.length > displayLimit) {
    html += `<div class="placeholder-msg" style="grid-column: 1 / -1; padding: 20px;">Showing top ${displayLimit} of ${cards.length} cards. Click <strong>"📖 Show All Cards"</strong> above or use search to view more.</div>`;
  }

  if (btn) {
    btn.textContent = appState.dbShowAll ? '⚡ Limit to Top 60' : `📖 Show All Cards (${cards.length})`;
  }

  grid.innerHTML = html;
}

function toggleDatabaseLimit() {
  appState.dbShowAll = !appState.dbShowAll;
  filterDatabase();
}

function filterDatabase() {
  const query = document.getElementById('dbSearchInput').value.toLowerCase();
  const season = document.getElementById('seasonSelect').value;

  const filtered = appState.allDatabaseCards.filter(c => {
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
  const fileInput = document.getElementById('collectionFileInput');
  if (fileInput) fileInput.click();
}

function toggleHelpModal(show) {
  const modal = document.getElementById('helpModal');
  if (modal) {
    if (show) {
      modal.style.display = 'flex';
      modal.classList.add('open');
    } else {
      modal.style.display = 'none';
      modal.classList.remove('open');
    }
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
      renderCollectionUI(appState.ownedCardsList);
      alert(`Collection loaded successfully! Found ${appState.ownedCardsList.length} unique cards.`);
    } catch (err) {
      alert('Failed to parse JSON file! Error: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function parseCollectionJSON(data) {
  appState.ownedCardsList = [];
  let totalCardsCount = 0;
  let rawItems = [];

  if (typeof masterDatabase !== 'undefined' && Object.keys(masterDatabase).length > 0 && appState.allDatabaseCards.length === 0) {
    flattenDatabase(masterDatabase);
  }

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
      let rawId = card.id || '001';
      
      let cleanId = rawId;
      if (!cleanId.startsWith('S')) {
        const numOnly = String(cleanId).replace(/\D/g, '').padStart(3, '0');
        const sId = card.seasonId || 1;
        cleanId = `S${sId}_${numOnly}`;
      }

      const computedLevel = card.level || (count > 1 ? 2 : 1);

      appState.ownedCardsList.push({
        id: cleanId,
        count: count,
        level: computedLevel,
        attributes: card.attributes || {},
        imageUrl: `./cards/${cleanId}.png`
      });
      totalCardsCount += count;
    }
  });

  enrichCollectionWithDatabase();
  appState.ownedCardsList.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const totalElem = document.getElementById('totalOwnedCount');
  const uniqueElem = document.getElementById('uniqueOwnedCount');
  const uniqueNav = document.getElementById('uniqueOwnedCountNav');

  if (totalElem) totalElem.textContent = totalCardsCount;
  if (uniqueElem) uniqueElem.textContent = appState.ownedCardsList.length;
  if (uniqueNav) uniqueNav.textContent = appState.ownedCardsList.length;
}

function enrichCollectionWithDatabase() {
  appState.ownedCardsList.forEach(owned => {
    const foundCard = appState.allDatabaseCards.find(c => {
      if (c.id === owned.id) return true;
      const dbNum = c.id.replace(/S\d+_/, '');
      const ownedNum = owned.id.replace(/S\d+_/, '');
      return dbNum === ownedNum && c.season.includes(owned.id.charAt(1));
    });

    if (foundCard) {
      owned.attributes = {
        rarity: foundCard.attributes.rarity,
        name: foundCard.attributes.name,
        cost: foundCard.attributes.cost,
        power: foundCard.attributes.power,
        description: foundCard.attributes.description
      };
    } else {
      owned.attributes = {
        rarity: owned.attributes.rarity || 'COMMON',
        name: owned.attributes.name || owned.id,
        cost: owned.attributes.cost || 1,
        power: owned.attributes.power || 1,
        description: owned.attributes.description || ''
      };
    }
  });
}

function renderCollectionUI(cards) {
  const grid = document.getElementById('collectionGrid');
  if (!grid) return;
  if (!cards.length) {
    grid.innerHTML = '<div class="placeholder-msg">No cards found matching your active filters.</div>';
    return;
  }
  
  const displayLimit = 150;
  const cardsToRender = cards.slice(0, displayLimit);
  let html = cardsToRender.map(c => createCardHTML(c, 'collection')).join('');
  
  if (cards.length > displayLimit) {
    html += `<div class="placeholder-msg" style="grid-column: 1 / -1; padding: 20px;">Showing ${displayLimit} of ${cards.length} cards. Refine filters to view specific cards.</div>`;
  }
  grid.innerHTML = html;
}

function filterCollection() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const sortBy = document.getElementById('sortByFilter').value;
  const skillType = document.getElementById('skillTypeFilter').value.toLowerCase();
  const cost = document.getElementById('costFilter').value;
  const power = document.getElementById('powerFilter').value;
  const rarity = document.getElementById('rarityFilter').value;
  const season = document.getElementById('seasonFilter').value;

  let filtered = appState.ownedCardsList.filter(card => {
    const attr = card.attributes || {};
    const nameStr = (attr.name || card.id).toLowerCase();
    const descStr = (attr.description || '').toLowerCase();
    
    const matchesSearch = card.id.toLowerCase().includes(query) || nameStr.includes(query) || descStr.includes(query);
    const matchesSkill = skillType === 'all' || descStr.includes(skillType);

    let matchesCost = true;
    if (cost !== 'ALL') {
      const cardCost = Number(attr.cost || 0);
      matchesCost = cost === '6' ? cardCost >= 6 : cardCost === Number(cost);
    }

    let matchesPower = true;
    if (power !== 'ALL') {
      const cardPwr = Number(attr.power || 0);
      matchesPower = power === '5' ? cardPwr >= 5 : cardPwr === Number(power);
    }

    const matchesRarity = rarity === 'ALL' || (attr.rarity || '').toUpperCase() === rarity.toUpperCase();
    const matchesSeason = season === 'ALL' || card.id.startsWith(season);

    return matchesSearch && matchesSkill && matchesCost && matchesPower && matchesRarity && matchesSeason;
  });

  if (sortBy === 'RARITY') {
    const order = { 'LEGENDARY': 4, 'EPIC': 3, 'RARE': 2, 'COMMON': 1 };
    filtered.sort((a, b) => (order[(b.attributes.rarity || '').toUpperCase()] || 0) - (order[(a.attributes.rarity || '').toUpperCase()] || 0));
  } else if (sortBy === 'COST') {
    filtered.sort((a, b) => (a.attributes.cost || 0) - (b.attributes.cost || 0));
  } else if (sortBy === 'POWER') {
    filtered.sort((a, b) => (b.attributes.power || 0) - (a.attributes.power || 0));
  } else {
    filtered.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }

  renderCollectionUI(filtered);
}

function resetCollectionFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('sortByFilter').value = 'ID';
  document.getElementById('skillTypeFilter').value = 'ALL';
  document.getElementById('costFilter').value = 'ALL';
  document.getElementById('powerFilter').value = 'ALL';
  document.getElementById('rarityFilter').value = 'ALL';
  document.getElementById('seasonFilter').value = 'ALL';
  
  filterCollection();
}

function addCardToActiveDeck(cardId, fromSource = 'collection') {
  const isAlreadyInDeck = appState.activeDeck.some(c => c.id === cardId);
  if (isAlreadyInDeck) {
    alert("This card is already in your active deck! Duplicate cards are not allowed.");
    return;
  }

  let cardData = fromSource === 'db' 
    ? appState.allDatabaseCards.find(c => c.id === cardId)
    : appState.ownedCardsList.find(c => c.id === cardId);

  if (!cardData) return;

  if (appState.activeDeck.length >= 10) {
    alert("Deck limit reached! Active decks are capped at 10 cards.");
    return;
  }

  appState.activeDeck.push({ ...cardData, instanceId: `${cardId}_${Date.now()}` });
  updateDeckUI();
  
  renderCollectionUI(appState.ownedCardsList);
  if (typeof allDatabaseCards !== 'undefined') {
    renderDatabaseUI(appState.allDatabaseCards);
  }
}

function removeCardFromActiveDeck(instanceId) {
  appState.activeDeck = appState.activeDeck.filter(c => c.instanceId !== instanceId);
  updateDeckUI();
  
  renderCollectionUI(appState.ownedCardsList);
  if (typeof allDatabaseCards !== 'undefined') {
    renderDatabaseUI(appState.allDatabaseCards);
  }
}

function clearActiveDeck() {
  if (confirm("Clear your current deck?")) {
    appState.activeDeck = [];
    updateDeckUI();
    renderCollectionUI(appState.ownedCardsList);
    if (typeof allDatabaseCards !== 'undefined') {
      renderDatabaseUI(appState.allDatabaseCards);
    }
  }
}

function renderChakraChart() {
  const chartContainer = document.getElementById('gameStyleChakraChart');
  const countLabel = document.getElementById('deckCardCountLabel');
  if (!chartContainer) return;

  if (countLabel) {
    countLabel.textContent = `${appState.activeDeck.length} / 10 Cards`;
  }

  const energyBuckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const chakraBuckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  appState.activeDeck.forEach(card => {
    const attr = card.attributes || {};
    const cost = Math.min(Number(attr.cost || 1), 5);
    const power = Math.min(Number(attr.power || attr.chakra || 1), 5);

    energyBuckets[cost] = (energyBuckets[cost] || 0) + 1;
    chakraBuckets[power] = (chakraBuckets[power] || 0) + 1;
  });

  let chartHtml = '';
  [1, 2, 3, 4, 5].forEach(level => {
    const energyCount = energyBuckets[level];
    const chakraCount = chakraBuckets[level];

    const energyWidth = Math.min((energyCount / 10) * 100, 100);
    const chakraWidth = Math.min((chakraCount / 10) * 100, 100);

    chartHtml += `
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
          <span style="font-weight: bold; color: #f97316; width: 14px; text-align: right;">${level}</span>
          <span style="font-size: 0.9rem;" title="Energy Cost">🔥</span>
          <div style="flex: 1; background: #1e293b; height: 10px; border-radius: 3px; overflow: hidden; border: 1px solid #475569;">
            <div style="width: ${energyWidth}%; height: 100%; background: #f97316; transition: width 0.3s ease;"></div>
          </div>
          <span style="color: #cbd5e1; width: 16px; text-align: left;">${energyCount}</span>
        </div>

        <div style="width: 1px; height: 14px; background: #475569;"></div>

        <div style="display: flex; align-items: center; gap: 6px; flex: 1; justify-content: flex-end;">
          <span style="color: #cbd5e1; width: 16px; text-align: right;">${chakraCount}</span>
          <div style="flex: 1; background: #1e293b; height: 10px; border-radius: 3px; overflow: hidden; border: 1px solid #475569;">
            <div style="width: ${chakraWidth}%; height: 100%; background: #3b82f6; transition: width 0.3s ease;"></div>
          </div>
          <span style="font-size: 0.9rem;" title="Chakra / Power">📜</span>
          <span style="font-weight: bold; color: #3b82f6; width: 14px; text-align: left;">${level}</span>
        </div>
      </div>
    `;
  });

  chartContainer.innerHTML = chartHtml;
}

// Separate chart renderer for AI preview tab
function renderAiChakraChart(deckCards) {
  const chartContainer = document.getElementById('gameStyleChakraChart');
  const countLabel = document.getElementById('deckCardCountLabel');
  if (!chartContainer) return;

  if (countLabel) {
    countLabel.textContent = `${deckCards.length} / 10 Cards`;
  }

  const energyBuckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const chakraBuckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  deckCards.forEach(card => {
    const attr = card.attributes || {};
    const cost = Math.min(Number(attr.cost || 1), 5);
    const power = Math.min(Number(attr.power || attr.chakra || 1), 5);

    energyBuckets[cost] = (energyBuckets[cost] || 0) + 1;
    chakraBuckets[power] = (chakraBuckets[power] || 0) + 1;
  });

  let chartHtml = '';
  [1, 2, 3, 4, 5].forEach(level => {
    const energyCount = energyBuckets[level];
    const chakraCount = chakraBuckets[level];

    const energyWidth = Math.min((energyCount / 10) * 100, 100);
    const chakraWidth = Math.min((chakraCount / 10) * 100, 100);

    chartHtml += `
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
          <span style="font-weight: bold; color: #f97316; width: 14px; text-align: right;">${level}</span>
          <span style="font-size: 0.9rem;" title="Energy Cost">🔥</span>
          <div style="flex: 1; background: #1e293b; height: 10px; border-radius: 3px; overflow: hidden; border: 1px solid #475569;">
            <div style="width: ${energyWidth}%; height: 100%; background: #f97316; transition: width 0.3s ease;"></div>
          </div>
          <span style="color: #cbd5e1; width: 16px; text-align: left;">${energyCount}</span>
        </div>

        <div style="width: 1px; height: 14px; background: #475569;"></div>

        <div style="display: flex; align-items: center; gap: 6px; flex: 1; justify-content: flex-end;">
          <span style="color: #cbd5e1; width: 16px; text-align: right;">${chakraCount}</span>
          <div style="flex: 1; background: #1e293b; height: 10px; border-radius: 3px; overflow: hidden; border: 1px solid #475569;">
            <div style="width: ${chakraWidth}%; height: 100%; background: #3b82f6; transition: width 0.3s ease;"></div>
          </div>
          <span style="font-size: 0.9rem;" title="Chakra / Power">📜</span>
          <span style="font-weight: bold; color: #3b82f6; width: 14px; text-align: left;">${level}</span>
        </div>
      </div>
    `;
  });

  chartContainer.innerHTML = chartHtml;
}

function updateDeckUI() {
  const grid = document.getElementById('activeDeckGrid');
  const badge = document.getElementById('deckCountBadge');
  const titleBadge = document.getElementById('deckTitleBadge');

  if (badge) badge.textContent = appState.activeDeck.length;
  if (titleBadge) titleBadge.textContent = `${appState.activeDeck.length} / 10 Cards`;

  if (!grid) return;
  if (!appState.activeDeck.length) {
    grid.innerHTML = '<div class="placeholder-msg">Your deck is empty. Add cards from collection or database!</div>';
    return;
  }
  grid.innerHTML = appState.activeDeck.map(c => createCardHTML(c, 'remove')).join('');
}

function createCardHTML(card, actionType) {
  const attr = card.attributes || {};
  const rarity = (attr.rarity || 'COMMON').toLowerCase();
  
  const displayTitle = attr.name || card.id;
  const descriptionText = attr.description ? attr.description : '';
  const cardLevel = card.level || (card.count > 1 ? 2 : 1);

  const isInDeck = appState.activeDeck.some(c => c.id === card.id);

  let btnAction = `addCardToActiveDeck('${card.id}', 'collection')`;
  let btnText = '+ Add to Deck';
  let btnStyle = 'background: var(--accent-orange); cursor: pointer;';

  if (actionType === 'remove') {
    btnAction = `removeCardFromActiveDeck('${card.instanceId || card.id}')`;
    btnText = '✖ Remove';
    btnStyle = 'background: rgba(239,68,68,0.2); cursor: pointer;';
  } else if (actionType === 'db') {
    btnAction = `addCardToActiveDeck('${card.id}', 'db')`;
    btnText = '+ Add to Deck';
    btnStyle = 'background: var(--accent-orange); cursor: pointer;';
  }

  if (actionType !== 'remove' && isInDeck) {
    btnAction = 'void(0)';
    btnText = '✓ Added to Deck';
    btnStyle = 'background: #334155; color: #94a3b8; cursor: not-allowed; opacity: 0.7;';
  }

  return `
    <div class="ninja-card rarity-${rarity}">
      <div class="card-img-wrapper" style="position:relative;">
        <img src="${card.imageUrl}" alt="${displayTitle}" onerror="this.src='./cards/${card.id}.png';" loading="lazy" />
        
        <span class="card-level-badge level-${cardLevel}" style="position:absolute; top:6px; left:6px; background:${cardLevel > 1 ? 'linear-gradient(135deg, #eab308, #ca8a04)' : 'rgba(15,23,42,0.85)'}; color:${cardLevel > 1 ? '#000' : '#fff'}; font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; z-index:2; border:1px solid ${cardLevel > 1 ? '#fef08a' : '#f97316'};">LVL ${cardLevel}</span>

        ${actionType === 'collection' ? `<span class="card-count-badge">x${card.count}</span>` : ''}
        <span class="card-rarity-tag ${rarity.toUpperCase()}">${attr.rarity || 'COMMON'}</span>
      </div>
      <div class="card-info">
        <div class="card-title" title="${displayTitle}">${displayTitle}</div>
        <div class="card-details">Cost: ${attr.cost} | Pwr: ${attr.power}</div>
        ${descriptionText ? `<div class="card-description" style="font-size:0.75rem; color:#aaa; margin-top:4px; max-height:42px; overflow:hidden;" title="${descriptionText}">${descriptionText}</div>` : ''}
      </div>
      <button onclick="${btnAction}" style="width:100%; padding:6px; border:none; color:#fff; font-weight:600; margin-top:6px; ${btnStyle}">
        ${btnText}
      </button>
    </div>
  `;
}

// 1. CALCULATE STRATEGY (Preview without leaving tab)
function calculateOptimalDeckUI() {
  const strategy = document.getElementById('strategySelect').value;

  const hasCollection = appState.ownedCardsList && appState.ownedCardsList.length > 0;
  const hasActiveDeck = appState.activeDeck && appState.activeDeck.length > 0;

  if (!hasCollection && !hasActiveDeck) {
    alert("⚠️ Calculator cannot run: You must first import a collection JSON file or create/load an active deck from the Database tab!");
    return;
  }

  const result = DeckCalculator.calculateBestDeck(appState.ownedCardsList, strategy, appState.activeDeck);

  if (result.error) {
    alert(result.error);
    return;
  }

  // Save to temporary preview container
  appState.calculatedAiDeck = result.deck;

  const grid = document.getElementById('aiDeckGrid');
  if (grid) {
    grid.innerHTML = appState.calculatedAiDeck.map(c => createCardHTML(c, 'remove')).join('');
  }

  renderAiChakraChart(appState.calculatedAiDeck);

  document.getElementById('aiSynergyScore').textContent = `Synergy Score: ${result.totalScore}`;
  document.getElementById('aiStrategyInfo').textContent = `Successfully calculated ${appState.calculatedAiDeck.length} cards using strategy: ${strategy.toUpperCase()}`;

  // Enable the "Load to Active Deck" button
  const loadBtn = document.getElementById('loadAiDeckBtn');
  if (loadBtn) loadBtn.disabled = false;
}

// 2. LOAD CALCULATED DECK TO ACTIVE TAB
function loadCalculatedDeckToActive() {
  if (!appState.calculatedAiDeck || appState.calculatedAiDeck.length === 0) {
    alert("Please calculate a strategy first!");
    return;
  }

  appState.activeDeck = [...appState.calculatedAiDeck];
  updateDeckUI();
  renderCollectionUI(appState.ownedCardsList);

  alert(`Successfully loaded ${appState.activeDeck.length} cards into your Active Deck!`);
  switchTab('deckTab');
}

function saveDeckToLocalStorage() {
  if (!appState.activeDeck.length) {
    alert("Deck is empty!");
    return;
  }
  localStorage.setItem('naruto_active_deck', JSON.stringify(appState.activeDeck));
  alert(`Saved ${appState.activeDeck.length}-card deck to browser storage!`);
}

function loadDeckFromLocalStorage() {
  const saved = localStorage.getItem('naruto_active_deck');
  if (saved) {
    try { 
      appState.activeDeck = JSON.parse(saved); 
      updateDeckUI(); 
    } catch(e){}
  }
}

function exportDeckJSON() {
  if (!appState.activeDeck.length) {
    alert("Deck is empty!");
    return;
  }
  const exportData = { deckName: "Naruto Deck", createdAt: new Date().toISOString(), cards: appState.activeDeck };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "naruto_deck.json";
  link.click();
  URL.revokeObjectURL(url);
}