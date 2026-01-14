import React from 'react';
import type { Artifact } from '../../types';
import { GlassCard } from '../ui/GlassCard';

interface ArtifactCardProps {
  artifact: Artifact;
  onCopy: (artifact: Artifact) => void;
}

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onCopy }) => {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'intent': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'gate': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'contract': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <GlassCard hoverEffect className="flex flex-col gap-4 h-full">
      <div className="flex justify-between items-start">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(artifact.type)} uppercase tracking-wider`}>
          {artifact.type}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Trust Score</span>
          <span className={`font-bold ${getTrustColor(artifact.trustScore)}`}>{artifact.trustScore}%</span>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-1">{artifact.title}</h3>
        <p className="text-gray-400 text-sm line-clamp-2">{artifact.description}</p>
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between border-t border-glass-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-[10px] font-bold">
            {artifact.author.name.charAt(0)}
          </div>
          <span className="text-xs text-gray-300">{artifact.author.name}</span>
          {artifact.author.verified && (
            <span className="text-accent" title="Verified">✓</span>
          )}
        </div>
        
        <button 
          onClick={() => onCopy(artifact)}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium border border-white/10 transition-colors"
        >
          Copy Code
        </button>
      </div>
    </GlassCard>
  );
};
