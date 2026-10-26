// Main Application Logic
let ownedCardsList = [];
let activeDeck = []; // Limited to 6 cards

document.addEventListener('DOMContentLoaded', () => {
  loadDeckFromLocalStorage();
});

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

// Ultra Robust Collection Upload Handler
function handleCollectionUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const data = JSON.parse(text);
      
      parseCollectionJSON(data);
      
      if (ownedCardsList.length === 0) {
        alert("Warning: No owned cards were found in this JSON file. Make sure you exported your 'me' or collection payload!");
        return;
      }

      document.getElementById('calcBtn').disabled = false;
      renderCollectionUI(ownedCardsList);
      alert(`Collection loaded successfully! Found ${ownedCardsList.length} unique cards.`);
      
    } catch (err) {
      console.error("JSON Parsing Error:", err);
      alert('Failed to parse JSON file! Ensure it is valid JSON text. Error: ' + err.message);
    } finally {
      // Reset input value so re-importing the same file triggers onchange reliably
      event.target.value = '';
    }
  };
  
  reader.readAsText(file);
}

// Universal Robust Collection Parser (Handles any nested layout)
function parseCollectionJSON(data) {
  ownedCardsList = [];
  let totalCardsCount = 0;
  let rawItems = [];

  if (!data) return;

  // 1. Check for seasons format (naruto_collection_2.json)
  if (data.seasons && Array.isArray(data.seasons)) {
    data.seasons.forEach(season => {
      if (season.cards && Array.isArray(season.cards)) {
        rawItems.push(...season.cards);
      }
    });
  } 
  // 2. Direct cards array
  else if (Array.isArray(data.cards)) {
    rawItems = data.cards;
  }
  // 3. Direct collection array
  else if (Array.isArray(data.collection)) {
    rawItems = data.collection;
  }
  // 4. Raw array of cards
  else if (Array.isArray(data)) {
    rawItems = data;
  }
  // 5. Fallback object search for card array inside arbitrary keys
  else if (typeof data === 'object') {
    for (const key in data) {
      if (Array.isArray(data[key])) {
        const sample = data[key][0];
        if (sample && (sample.id || sample.metadata)) {
          rawItems = data[key];
          break;
        }
      }
    }
  }

  // Parse items into normalized array
  rawItems.forEach(card => {
    const count = card.count !== undefined ? card.count : 1;
    if (count > 0) {
      const attr = (card.metadata && card.metadata.attributes) ? card.metadata.attributes : (card.attributes || {});
      
      let imgUrl = `./card_images/${card.id}.webp`;
      if (card.metadata && card.metadata.images && card.metadata.images.folio && card.metadata.images.folio.medium) {
        imgUrl = card.metadata.images.folio.medium;
      } else if (card.imageUrl) {
        imgUrl = card.imageUrl;
      }

      ownedCardsList.push({
        id: card.id || 'UNKNOWN',
        count: count,
        attributes: attr,
        imageUrl: imgUrl
      });
      totalCardsCount += count;
    }
  });

  console.log(`Parsed ${ownedCardsList.length} unique cards out of ${totalCardsCount} total owned.`);

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
    alert(`Cannot add more copies of ${cardId}! (Limit 2 copies per deck or total owned).`);
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

// Card HTML Generator
function createCardHTML(card, actionType = 'add') {
  const attr = card.attributes || {};
  const rarity = attr.rarity || 'Common';
  const name = attr.jutsu || attr.clan || attr.ninja_type || card.id;
  const clickAction = actionType === 'add' 
    ? `addCardToActiveDeck('${card.id}')` 
    : `removeCardFromActiveDeck('${card.instanceId || card.id}')`;

  return `
    <div class="ninja-card rarity-${rarity}" onclick="${clickAction}">
      <div class="card-img-wrapper">
        <img src="${card.imageUrl}" alt="${card.id}" onerror="this.src='https://via.placeholder.com/140x190/1e293b/94a3b8?text=${card.id}'" loading="lazy" />
        <span class="card-count-badge">${actionType === 'add' ? 'x' + card.count : '✖ Remove'}</span>
        <span class="card-rarity-tag ${rarity}">${rarity}</span>
      </div>
      <div class="card-info">
        <div class="card-title" title="${name}">${card.id}: ${name}</div>
        <div class="card-details">${attr.team || attr.affiliation || 'Shinobi'}</div>
      </div>
    </div>
  `;
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
      (attr.clan && attr.clan.toLowerCase().includes(query)) ||
      (attr.jutsu && attr.jutsu.toLowerCase().includes(query)) ||
      (attr.team && attr.team.toLowerCase().includes(query));

    const matchesRarity = rarity === 'ALL' || attr.rarity === rarity;

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
    alert("Please add cards to your deck before saving/exporting!");
    return;
  }

  const exportData = {
    deckName: "Custom Naruto Ninja Deck",
    createdAt: new Date().toISOString(),
    totalCards: activeDeck.length,
    cards: activeDeck.map(c => ({
      id: c.id,
      rarity: c.attributes ? c.attributes.rarity : 'Common',
      name: c.attributes ? (c.attributes.jutsu || c.attributes.clan || c.id) : c.id
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
