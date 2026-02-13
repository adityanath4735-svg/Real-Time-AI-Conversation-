
export type AtmosphereType = 'default' | 'sunny' | 'night' | 'party' | 'underwater';

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
  FINISHED = 'FINISHED'
}
