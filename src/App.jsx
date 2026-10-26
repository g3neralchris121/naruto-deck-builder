import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { 
  Shield, 
  ExternalLink, 
  Download, 
  Save, 
  FolderOpen, 
  RefreshCw, 
  X,
  Trash2
} from 'lucide-react';

// Generate Season 1 Cards List using light small.png images (85 cards total)
const ALL_CARDS = Array.from({ length: 85 }, (_, i) => {
  const num = (i + 1).toString().padStart(3, '0');
  return {
    id: `S1_${num}`,
    name: `Card #${num}`,
    imageUrl: `https://assets.narutoninjacards.com/cards/S1_${num}/3/cropped/small.png`
  };
});

export default function App() {
  const [deck, setDeck] = useState([]);
  const [deckName, setDeckName] = useState('My Shinobi Meta Deck');
  const [savedDecks, setSavedDecks] = useState([]);
  const [userCollection, setUserCollection] = useState([]);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const exportRef = useRef(null);

  // Load saved collection and decks from Local Storage on launch
  useEffect(() => {
    const localCollection = localStorage.getItem('ninja_user_collection');
    if (localCollection) {
      try { setUserCollection(JSON.parse(localCollection)); } catch (e) {}
    }

    const localDecks = localStorage.getItem('ninja_saved_decks');
    if (localDecks) {
      try { setSavedDecks(JSON.parse(localDecks)); } catch (e) {}
    }
  }, []);

  const saveCollection = () => {
    try {
      let parsed = JSON.parse(jsonInput);
      if (parsed.seasons) {
        const s1 = parsed.seasons.find(s => s.id === 'S1');
        if (s1 && s1.cards) {
          parsed = s1.cards.map(c => c.id);
        }
      }
      if (!Array.isArray(parsed)) throw new Error('Invalid format');

      setUserCollection(parsed);
      localStorage.setItem('ninja_user_collection', JSON.stringify(parsed));
      setIsSyncModalOpen(false);
      setJsonInput('');
    } catch (err) {
      alert('Failed to parse collection JSON. Please check the array format.');
    }
  };

  const addCardToDeck = (card) => {
    if (userCollection.length > 0 && !userCollection.includes(card.id)) return;
    if (deck.length >= 30) {
      alert('Deck limit reached (30 cards max).');
      return;
    }
    setDeck([...deck, card]);
  };

  const removeCardFromDeck = (index) => {
    setDeck(deck