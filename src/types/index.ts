export interface Artifact {
  id: string;
  type: 'intent' | 'gate' | 'contract';
  title: string;
  description: string;
  trustScore: number;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  tags: string[];
  contentHash: string;
}
