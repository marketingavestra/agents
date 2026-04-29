export interface VectorStore {
  backend: string;
  upsert: (docs: { id: string; text: string; meta?: any }[]) => Promise<void>;
  query: (q: string, k: number) => Promise<Array<{ id: string; score: number; meta?: any }>>;
}
