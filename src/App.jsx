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
    setDeck(deck.filter((_, i) => i !== index));
  };

  const saveCurrentDeck = () => {
    if (deck.length === 0) {
      alert('Add cards to your deck before saving.');
      return;
    }
    const deckId = Date.now().toString();
    const newDeck = { id: deckId, name: deckName, cards: deck.map(c => c.id) };
    const updatedDecks = [...savedDecks, newDeck];
    
    setSavedDecks(updatedDecks);
    localStorage.setItem('ninja_saved_decks', JSON.stringify(updatedDecks));
    alert('Deck saved locally!');
  };

  const deleteDeck = (id) => {
    const updatedDecks = savedDecks.filter(d => d.id !== id);
    setSavedDecks(updatedDecks);
    localStorage.setItem('ninja_saved_decks', JSON.stringify(updatedDecks));
  };

  const loadDeck = (savedDeck) => {
    setDeckName(savedDeck.name);
    const loadedCards = savedDeck.cards.map(id => ALL_CARDS.find(c => c.id === id)).filter(Boolean);
    setDeck(loadedCards);
  };

  const exportDeckImage = async () => {
    if (!exportRef.current) return;
    const canvas = await html2canvas(exportRef.current, { useCORS: true, scale: 2 });
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `${deckName.replace(/\s+/g, '_')}_Deck.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-orange-500 w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-wide text-orange-500">NINJA CARDS META BUILDER</h1>
          </div>
          <a 
            href="https://app.narutoninjacards.com/naruto/u/collection" 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm transition"
          >
            <span>Official Folio</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
        
        {/* Gallery */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-200">Season 1 Gallery (85 Cards)</h2>
              <p className="text-sm text-slate-400">
                {userCollection.length > 0 ? `Synced: ${userCollection.length}/85 owned` : 'Showing full catalog'}
              </p>
            </div>
            <button 
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-orange-400 px-3 py-2 rounded-lg text-sm transition border border-orange-500/20"
            >
              <RefreshCw className="w-4 h-4" /> Sync Collection
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[75vh] overflow-y-auto p-2 bg-slate-900/50 rounded-xl border border-slate-800">
            {ALL_CARDS.map((card) => {
              const isOwned = userCollection.length === 0 || userCollection.includes(card.id);
              return (
                <div 
                  key={card.id}
                  onClick={() => addCardToDeck(card)}
                  className={`relative cursor-pointer group rounded-lg overflow-hidden border border-slate-800 transition transform hover:-translate-y-1 ${!isOwned ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                >
                  <img src={card.imageUrl} alt={card.id} className="w-full h-auto object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-orange-600/10 opacity-0 group-hover:opacity-100 transition" />
                  <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[10px] px-1.5 py-0.5 rounded font-mono">
                    {card.id}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Deck Panel & Saved Decks */}
        <section className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deck Name</label>
              <input 
                type="text" 
                value={deckName} 
                onChange={(e) => setDeckName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex justify-between items-center text-sm font-semibold text-slate-400">
              <span>Deck Cards ({deck.length}/30)</span>
              <div className="flex gap-2">
                <button 
                  onClick={saveCurrentDeck} 
                  className="flex items-center gap-1 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button 
                  onClick={exportDeckImage}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800/80 min-h-[160px]">
              {deck.map((card, idx) => (
                <div 
                  key={`${card.id}-${idx}`} 
                  onClick={() => removeCardFromDeck(idx)}
                  className="relative group rounded overflow-hidden border border-slate-700 cursor-pointer"
                >
                  <img src={card.imageUrl} alt={card.id} className="w-full h-auto" />
                  <div className="absolute inset-0 bg-red-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <X className="w-4 h-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-orange-500" /> Saved Decks
            </h3>
            {savedDecks.length === 0 ? (
              <p className="text-sm text-slate-500">No saved decks stored locally.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedDecks.map((d) => (
                  <div key={d.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300">{d.name}</h4>
                      <p className="text-xs text-slate-500">{d.cards.length} Cards</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => loadDeck(d)} className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs text-orange-400">
                        Load
                      </button>
                      <button onClick={() => deleteDeck(d.id)} className="bg-red-600/20 hover:bg-red-600/40 p-1.5 rounded text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Sync Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-100">Sync Collection JSON</h3>
              <button onClick={() => setIsSyncModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-400">Paste your raw network JSON or card ID array `["S1_001", "S1_002"]` here:</p>
            <textarea 
              rows={6}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste JSON response here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-orange-500"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsSyncModalOpen(false)} className="px-4 py-2 bg-slate-800 text-sm text-slate-300 rounded-lg">Cancel</button>
              <button onClick={saveCollection} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-sm font-semibold rounded-lg">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Target */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div ref={exportRef} className="bg-slate-950 p-8 w-[1000px] space-y-6 text-slate-100 border-4 border-orange-500/30">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-3xl font-bold text-orange-500">{deckName}</h1>
              <p className="text-slate-400 text-sm">Naruto Ninja Cards - Season 1 Meta Deck</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono">{deck.length} / 30</p>
              <p className="text-xs text-slate-500">CARDS IN DECK</p>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {deck.map((card, idx) => (
              <div key={`export-${card.id}-${idx}`} className="rounded border border-slate-800 overflow-hidden">
                <img src={card.imageUrl} alt={card.id} className="w-full h-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}