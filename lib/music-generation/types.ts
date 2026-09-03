export type MusicGenerationRequest = {
  prompt: string;
  durationSeconds: number;
  instrumental: boolean;
  requiredWords?: string;
};

export type MusicProvider = {
  id: string;
  generate(request: MusicGenerationRequest): Promise<{
    audio: ArrayBuffer;
    contentType: string;
    generationId?: string;
  }>;
};
