import type { Artifact } from '../types';

export const mockArtifacts: Artifact[] = [
  {
    id: '1',
    type: 'intent',
    title: 'Autonomous Trading Bot',
    description: 'A high-frequency trading bot intent that scans for arbitrage opportunities across DEXs.',
    trustScore: 85,
    author: {
      name: 'CryptoWizard',
      avatar: '',
      verified: true
    },
    tags: ['defi', 'trading', 'automation'],
    contentHash: 'a1b2c3d4...'
  },
  {
    id: '2',
    type: 'gate',
    title: 'KYC Verification Gate',
    description: 'Ensures user has completed KYC before allowing access to sensitive financial instruments.',
    trustScore: 98,
    author: {
      name: 'SecureNet',
      avatar: '',
      verified: true
    },
    tags: ['security', 'compliance', 'identity'],
    contentHash: 'e5f6g7h8...'
  },
  {
    id: '3',
    type: 'contract',
    title: 'Yield Farming Vault',
    description: 'Smart contract for optimizing yield farming strategies on Aave and Compound.',
    trustScore: 92,
    author: {
      name: 'DeFi_Master',
      avatar: '',
      verified: true
    },
    tags: ['yield', 'smart-contract', 'farming'],
    contentHash: 'i9j0k1l2...'
  },
  {
    id: '4',
    type: 'intent',
    title: 'Social Media Sentiment Analyzer',
    description: 'Analyzes Twitter sentiment for specific tickers to trigger trade signals.',
    trustScore: 65,
    author: {
      name: 'SentimentAI',
      avatar: '',
      verified: false
    },
    tags: ['ai', 'sentiment', 'social'],
    contentHash: 'm3n4o5p6...'
  },
  {
    id: '5',
    type: 'gate',
    title: 'Multi-Sig Approval',
    description: 'Requires 3 out of 5 signatures for transaction execution.',
    trustScore: 99,
    author: {
      name: 'CoreTeam',
      avatar: '',
      verified: true
    },
    tags: ['security', 'multisig', 'governance'],
    contentHash: 'q7r8s9t0...'
  }
];
