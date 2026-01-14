import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { ArtifactCard } from './components/features/ArtifactCard';
import { mockArtifacts } from './lib/mockData';
import type { Artifact } from './types';
import { GlassCard } from './components/ui/GlassCard';

function App() {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const handleCopy = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setShowWarning(true);
  };

  const confirmCopy = () => {
    // In a real app, this would copy to clipboard
    console.log(`Copied artifact: ${selectedArtifact?.id}`);
    setShowWarning(false);
    setSelectedArtifact(null);
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Governance Artifacts</h1>
        <p className="text-gray-400">Discover and verify secure intents, gates, and contracts.</p>
      </div>

      {/* Grid of Artifacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockArtifacts.map((artifact) => (
          <ArtifactCard 
            key={artifact.id} 
            artifact={artifact} 
            onCopy={handleCopy} 
          />
        ))}
      </div>

      {/* Security Warning Modal (Zero Trust Guardrail) */}
      {showWarning && selectedArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="max-w-md w-full border-red-500/30 bg-[#1a0f0f]/90">
            <h2 className="text-xl font-bold text-red-400 mb-4">⚠️ Security Warning</h2>
            <p className="text-gray-300 mb-6">
              This artifact accesses external APIs. Have you reviewed the security gates?
              <br/><br/>
              <span className="text-sm text-gray-400">Artifact: {selectedArtifact.title}</span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmCopy}
                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-sm font-medium"
              >
                I Understand, Copy Code
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </Layout>
  );
}

export default App;
