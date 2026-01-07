export enum WorkflowTab {
  CORRECTION = 1,
  ENHANCEMENT = 2,
  STYLE_TRANSFER = 3,
}

export enum ControlRedundancy {
  LOW = "Baixa",
  MEDIUM = "Média",
  HIGH = "Alta"
}

export enum ControlEmotion {
  NEUTRAL = "Neutra",
  MODERATE = "Moderada",
  HIGH = "Alta"
}

export enum ControlHumor {
  NONE = "Nenhum",
  LIGHT = "Leve",
  MODERATE = "Moderado",
  SARCASTIC = "Sarcástico"
}

export enum ControlPacing {
  SLOW = "Lento",
  BALANCED = "Equilibrado",
  DYNAMIC = "Dinâmico"
}

export interface EnhancementParams {
  redundancy: ControlRedundancy;
  emotion: ControlEmotion;
  humor: ControlHumor;
  pacing: ControlPacing;
  characterSubstitution: string;
}

export interface GenerationState {
  isLoading: boolean;
  output: string | null;
  error: string | null;
}