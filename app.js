let masterDatabase = {};
let ownedCardsList = [];
let activeDeck = [];
let allDatabaseCards = [];

document.addEventListener('DOMContentLoaded', () => {
  fetch('/master_database.json')
    .then(res => res.json())
    .then(data => {
      masterDatabase = data;
      flattenDatabase(data);
      renderDatabaseUI(allDatabaseCards);
    })
    .catch(err => console.log("Using fallback database mode"));
  
  loadDeckFromLocalStorage();
});

function flattenDatabase(data) {
  allDatabaseCards = [];
  for (const seasonKey in data) {
    const seasonCards = data[seasonKey];
    for (const cardId in seasonCards) {
      const card = seasonCards[cardId];
      allDatabaseCards.push({
        id: card.id || cardId,
        season: seasonKey,
        attributes: {
          rarity: card.rarity || 'COMMON',
          name: card.name || cardId,
          cost: card.cost || 1,
          power: card.power || 1,
          level1: card.level1 || '',
          level2: card.level2 || ''
        },
        imageUrl: `./card_images/${card.id || cardId}.webp`
      });
    }
  }
}

function renderDatabaseUI(cards) {
  const grid = document.getElementById('databaseGrid');
  if (!cards.length) {
    grid.innerHTML = '<div class="placeholder">No cards found in database.</div>';
    return;
  }
  grid.innerHTML = cards.map(c => `
    <div class="card-item">
      <img src="${c.imageUrl}" onerror="this.src='./card_images/001.webp'" />
      <div class="card-info">
        <span>${c.id}: ${c.attributes.name}</span>
        <small>${c.attributes.rarity} | Cost: ${c.attributes.cost}</small>
      </div>
      <button class="btn primary" onclick="addCardToActiveDeck('${c.id}', true)">Add to Deck</button>
    </div>
  `).join('');
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
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-buttons button').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');

  if (tabId === 'databaseTab') document.getElementById('btnDatabase').classList.add('active');
  if (tabId === 'collectionTab') document.getElementById('btnCollection').classList.add('active');
  if (tabId === 'deckTab') document.getElementById('btnDeck').classList.add('active');
  if (tabId === 'aiTab') document.getElementById('btnAi').classList.add('active');
}

function addCardToActiveDeck(cardId, fromDb = false) {
  // Check limit
  if (activeDeck.length >= 6) {
    alert("Active deck limit is strictly 6 cards!");
    return;
  }

  let card = ownedCardsList.find(c => c.id === cardId);
  if (!card && fromDb) {
    card = allDatabaseCards.find(c => c.id === cardId);
  }
  if (!card) return;

  activeDeck.push({ ...card, instanceId: `${cardId}_${Date.now()}` });
  updateDeckUI();
}

function removeCardFromActiveDeck(instanceId) {
  activeDeck = activeDeck.filter(c => c.instanceId !== instanceId);
  updateDeckUI();
}

function clearActiveDeck() {
  activeDeck = [];
  updateDeckUI();
}

function updateDeckUI() {
  document.getElementById('deckCountBadge').textContent = activeDeck.length;
  const grid = document.getElementById('activeDeckGrid');
  
  if (!activeDeck.length) {
    grid.innerHTML = '<div class="placeholder">Your active deck is empty. Add cards from database or collection.</div>';
    return;
  }
  grid.innerHTML = activeDeck.map(c => `
    <div class="card-item">
      <img src="${c.imageUrl}" onerror="this.src='./card_images/001.webp'" />
      <div class="card-info">
        <span>${c.id}: ${c.attributes?.name || 'Card'}</span>
        <small>${c.attributes?.rarity || 'COMMON'}</small>
      </div>
      <button class="btn danger" onclick="removeCardFromActiveDeck('${c.instanceId}')">Remove</button>
    </div>
  `).join('');
}

function loadDeckFromLocalStorage() {
  const saved = localStorage.getItem('naruto_active_deck');
  if (saved) {
    try { activeDeck = JSON.parse(saved); updateDeckUI(); } catch(e){}
  }
}