
class DeckCalculator {
  static RARITY_WEIGHTS = {
    "Legendary": 120,
    "Epic": 80,
    "Rare": 45,
    "Common": 15
  };

  static calculateBestDeck(ownedCardsArray, strategy = 'balanced') {
    if (!ownedCardsArray || ownedCardsArray.length < 6) {
      return { error: "You need at least 6 cards in your collection to build a 6-card deck." };
    }

    const cardPool = [];
    ownedCardsArray.forEach(card => {
      const maxInDeck = Math.min(card.count, 2);
      for (let i = 0; i < maxInDeck; i++) {
        cardPool.push({ ...card, instanceId: `${card.id}_${i}` });
      }
    });

    const scoredPool = cardPool.map(card => {
      let score = this.calculateCardBaseScore(card, strategy);
      return { ...card, score };
    });

    const deck = [];
    const usedIdsCount = {};

    scoredPool.sort((a, b) => b.score - a.score);

    for (const card of scoredPool) {
      if (deck.length === 6) break; // 6 Card limit

      const currentCount = usedIdsCount[card.id] || 0;
      if (currentCount >= 2) continue;

      let dynamicScore = card.score;
      deck.forEach(existing => {
        dynamicScore += this.getPairSynergyBonus(card, existing, strategy);
      });

      card.dynamicScore = dynamicScore;
      deck.push(card);
      usedIdsCount[card.id] = currentCount + 1;
    }

    deck.sort((a, b) => {
      const rarityA = a.attributes?.rarity || "Common";
      const rarityB = b.attributes?.rarity || "Common";
      return (this.RARITY_WEIGHTS[rarityB] || 0) - (this.RARITY_WEIGHTS[rarityA] || 0);
    });
    
    const totalScore = Math.round(deck.reduce((sum, c) => sum + (c.dynamicScore || c.score), 0));

    return {
      deck,
      totalScore,
      strategyUsed: strategy
    };
  }

  static calculateCardBaseScore(card, strategy) {
    const attr = card.attributes || {};
    let score = this.RARITY_WEIGHTS[attr.rarity] || 15;

    if (strategy === 'team7') {
      if (attr.team && attr.team.includes('Team 7')) score += 40;
      if (attr.clan === 'Uzumaki Clan' || attr.clan === 'Uchiha Clan' || attr.clan === 'Hatake Clan') score += 20;
    } else if (strategy === 'rarity') {
      score *= 1.5;
    } else if (strategy === 'jutsu') {
      if (attr.composition === 'Jutsu') score += 50;
      if (attr.kekke_genkai) score += 25;
    } else {
      if (attr.team && attr.team.includes('Team 7')) score += 25;
      if (attr.clan) score += 15;
      if (attr.composition === 'Jutsu') score += 15;
    }
    return score;
  }

  static getPairSynergyBonus(cardA, cardB, strategy) {
    let bonus = 0;
    const a = cardA.attributes || {};
    const b = cardB.attributes || {};

    if (a.team && b.team && a.team.includes('Team 7') && b.team.includes('Team 7')) bonus += 15;
    if (a.clan && b.clan && a.clan === b.clan) bonus += 12;

    if (a.composition === 'Jutsu' || b.composition === 'Jutsu') {
      if (a.clan && b.clan && a.clan === b.clan) bonus += 20;
      if (a.chakra_type && b.chakra_type) {
        const elementsA = a.chakra_type.split(', ');
        const elementsB = b.chakra_type.split(', ');
        if (elementsA.some(el => elementsB.includes(el))) bonus += 10;
      }
    }
    return bonus;
  }
}
