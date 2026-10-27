window.DeckCalculator = {
  calculateBestDeck(collection, strategy, currentActiveDeck = []) {
    if (strategy === 'active_deck') {
      if (!currentActiveDeck || currentActiveDeck.length === 0) {
        return { error: "Your active deck is currently empty! Build an active deck from the Collection or Database tab first." };
      }
      let totalScore = currentActiveDeck.reduce((acc, c) => acc + Number(c.attributes?.power || 1) * 15 + (c.level > 1 ? 30 : 10), 100);
      return {
        deck: [...currentActiveDeck],
        totalScore: totalScore
      };
    }

    if (!collection || collection.length === 0) {
      return { error: "Please import your collection JSON file first before running AI optimization." };
    }

    let sortedCards = [...collection];

    if (strategy === 'team7') {
      sortedCards.sort((a, b) => {
        const nameA = (a.attributes?.name || '').toLowerCase();
        const nameB = (b.attributes?.name || '').toLowerCase();
        const isTeam7A = nameA.includes('naruto') || nameA.includes('sasuke') || nameA.includes('sakura') || nameA.includes('kakashi') ? 1 : 0;
        const isTeam7B = nameB.includes('naruto') || nameB.includes('sasuke') || nameB.includes('sakura') || nameB.includes('kakashi') ? 1 : 0;
        
        if (isTeam7A !== isTeam7B) return isTeam7B - isTeam7A;
        return (b.attributes?.power || 0) - (a.attributes?.power || 0);
      });
    } else if (strategy === 'rarity') {
      const rarityOrder = { 'LEGENDARY': 4, 'EPIC': 3, 'RARE': 2, 'COMMON': 1 };
      sortedCards.sort((a, b) => {
        const rA = rarityOrder[(a.attributes?.rarity || '').toUpperCase()] || 0;
        const rB = rarityOrder[(b.attributes?.rarity || '').toUpperCase()] || 0;
        if (rA !== rB) return rB - rA;
        return (b.attributes?.power || 0) - (a.attributes?.power || 0);
      });
    } else if (strategy === 'jutsu') {
      sortedCards.sort((a, b) => {
        const hasJutsuA = (a.attributes?.description || '').length > 5 ? 1 : 0;
        const hasJutsuB = (b.attributes?.description || '').length > 5 ? 1 : 0;
        if (hasJutsuA !== hasJutsuB) return hasJutsuB - hasJutsuA;
        return (b.attributes?.power || 0) - (a.attributes?.power || 0);
      });
    } else {
      sortedCards.sort((a, b) => {
        const scoreA = (a.attributes?.power || 1) - (a.attributes?.cost || 1) * 0.5;
        const scoreB = (b.attributes?.power || 1) - (b.attributes?.cost || 1) * 0.5;
        return scoreB - scoreA;
      });
    }

    const selectedDeck = sortedCards.slice(0, 10).map(card => ({
      ...card,
      instanceId: `${card.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    }));

    let totalScore = selectedDeck.reduce((acc, c) => acc + Number(c.attributes?.power || 1) * 12 + (c.level > 1 ? 25 : 10), 120);

    return {
      deck: selectedDeck,
      totalScore: totalScore
    };
  }
};