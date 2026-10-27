let masterDatabase = {};
let ownedCardsList = [];
let allDatabaseCards = [];
let activeDeck = [];

document.addEventListener('DOMContentLoaded', () => {
  fetch('master_database.json')
    .then(res => res.json())
    .then(data => {
      masterDatabase = data;
      flattenDatabase(data);
      renderDatabaseUI(allDatabaseCards);
    })
    .catch(err => console.log("Database fetch fallback active"));

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
        count: 1,
        level: 1,
        attributes: {
          rarity: card.rarity || 'Common',
          name: card.name || cardId,
          cost: card.cost || 1,
          power: card.power || 1
        },
        imageUrl: `./card_images/${card.id || cardId}.webp`
      });
    }
  }
}

function renderDatabaseUI(cards) {
  const grid = document.getElementById('databaseGrid');
  if (!cards.length) {
    grid.innerHTML = '<div class="placeholder-msg">No cards found in database.</div>';
    return;
  }
  grid.innerHTML = cards.map(c => createCardHTML(c, 'db')).join('');
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