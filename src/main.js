let collection = [];
let activeDeck = [];

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if (tabId === 'collectionTab') document.getElementById('tab-col').classList.add('active');
  if (tabId === 'deckTab') document.getElementById('tab-deck').classList.add('active');
  if (tabId === 'aiTab') document.getElementById('tab-ai').classList.add('active');
};

window.toggleModal = function(show) {
  document.getElementById('helpModal').classList.toggle('open', show);
};

window.importCollectionJSON = function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      collection = [];

      let rawCards = [];
      if (data.seasons && Array.isArray(data.seasons)) {
        data.seasons.forEach(s => { if (s.cards) rawCards.push(...s.cards); });
      } else if (Array.isArray(data.cards)) {
        rawCards = data.cards;
      } else if (Array.isArray(data)) {
        rawCards = data;
      }

      rawCards.forEach(c => {
        const attr = (c.metadata && c.metadata.attributes) ? c.metadata.attributes : (c.attributes || {});
        let img = (c.metadata && c.metadata.images && c.metadata.images.folio) ? c.metadata.images.folio.medium : '';
        
        collection.push({
          id: c.id || 'Card',
          count: c.count || 1,
          rarity: attr.rarity || 'Common',
          name: attr.jutsu || attr.clan || c.id,
          img: img
        });
      });

      document.getElementById('uniqueCount').textContent = collection.length;
      document.getElementById('calcBtn').disabled = false;
      renderCollection();
      alert(`Successfully imported ${collection.length} unique cards!`);

    } catch (err) {
      alert('Error parsing JSON file: ' + err.message);
    }
  };
  reader.readAsText(file);
};

function renderCollection() {
  const grid = document.getElementById('collectionGrid');
  grid.innerHTML = collection.map(c => `
    <div class="ninja-card" onclick="addToDeck('${c.id}')">
      <div class="card-img-wrapper">
        <img src="${c.img}" onerror="this.src='https://via.placeholder.com/150x200/1e293b/ffffff?text=${c.id}'" />
        <span class="badge">x${c.count}</span>
        <span class="rarity-tag">${c.rarity}</span>
      </div>
      <div class="card-info">
        <strong>${c.id}</strong>
        <div>${c.name}</div>
      </div>
    </div>
  `).join('');
}

window.addToDeck = function(id) {
  if (activeDeck.length >= 6) {
    alert("Deck is full! Maximum 6 cards allowed.");
    return;
  }
  const card = collection.find(c => c.id === id);
  if (card) {
    activeDeck.push({ ...card, instanceId: Date.now() + Math.random() });
    updateDeckUI();
  }
};

window.removeFromDeck = function(instanceId) {
  activeDeck = activeDeck.filter(c => c.instanceId !== instanceId);
  updateDeckUI();
};

function updateDeckUI() {
  document.getElementById('deckCount').textContent = activeDeck.length;
  document.getElementById('deckBadge').textContent = `${activeDeck.length} / 6 Cards`;
  const grid = document.getElementById('deckGrid');

  if (activeDeck.length === 0) {
    grid.innerHTML = '<div class="placeholder-msg">Your deck is empty. Add cards from your collection or run the AI Calculator!</div>';
    return;
  }

  grid.innerHTML = activeDeck.map(c => `
    <div class="ninja-card" onclick="removeFromDeck(${c.instanceId})">
      <div class="card-img-wrapper">
        <img src="${c.img}" onerror="this.src='https://via.placeholder.com/150x200/1e293b/ffffff?text=${c.id}'" />
        <span class="badge" style="color:var(--accent-red)">✖ Remove</span>
        <span class="rarity-tag">${c.rarity}</span>
      </div>
      <div class="card-info">
        <strong>${c.id}</strong>
        <div>${c.name}</div>
      </div>
    </div>
  `).join('');
}

window.clearDeck = function() {
  activeDeck = [];
  updateDeckUI();
};

window.saveDeckToLocalStorage = function() {
  localStorage.setItem('naruto_deck', JSON.stringify(activeDeck));
  alert("Deck saved to browser!");
};

window.exportDeckJSON = function() {
  if (activeDeck.length === 0) return alert("Deck is empty!");
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeDeck, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = "naruto_6_card_deck.json";
  a.click();
};

window.runAICalculator = function() {
  if (collection.length < 6) return alert("Need at least 6 cards imported!");
  
  const rarityWeights = { "Legendary": 100, "Epic": 75, "Rare": 50, "Common": 20 };
  const sorted = [...collection].sort((a,b) => (rarityWeights[b.rarity] || 0) - (rarityWeights[a.rarity] || 0));
  
  activeDeck = sorted.slice(0, 6).map(c => ({ ...c, instanceId: Date.now() + Math.random() }));
  updateDeckUI();

  document.getElementById('aiGrid').innerHTML = activeDeck.map(c => `
    <div class="ninja-card">
      <div class="card-img-vector" style="position:relative; width:100%; aspect-ratio:1/1.35; background:#090d16;">
        <img src="${c.img}" onerror="this.src='https://via.placeholder.com/150x200/1e293b/ffffff?text=${c.id}'" style="width:100%;height:100%;object-fit:cover;" />
        <span class="rarity-tag" style="position:absolute; bottom:6px; left:6px; font-size:0.65rem; font-weight:700; text-transform:uppercase; padding:2px 5px; border-radius:3px; background:#333; color:#fff;">${c.rarity}</span>
      </div>
      <div class="card-info" style="padding:8px; font-size:0.75rem;">
        <strong>${c.id}</strong>
        <div>${c.name}</div>
      </div>
    </div>
  `).join('');

  alert("Calculated top 6 card deck and loaded it into Active Deck tab!");
  switchTab('deckTab');
};
