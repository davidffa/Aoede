export type IncomingDiscordPacket = {
  op: number;
  d?: unknown;
  t?: string;
  s?: number;
}

export type VoiceStateUpdateData = {
  session_id: string;
  channel_id: string | null;
  user_id: string;
  guild_id: string;
}

export type OutgoingVoiceStateUpdateData = Omit<VoiceStateUpdateData, 'user_id' | 'session_id'> & {
  self_deaf: boolean;
  self_mute: boolean;
}

export type VoiceServerUpdateData = {
  token: string;
  guild_id: string;
  endpoint: string;
};

export type OutgoingDiscordPacket = {
  op: number;
  d: Record<string, unknown>;
};

export type VoiceServerInfo = {
  sessionId?: string;
  endpoint?: string;
  token?: string;
};

export type AoedeEventListeners<T> = {
  (event: 'debug', listener: (message: string) => void): T;
};

export type AoedeOptions = {
  cliendId: string;
  sendWS?: (guildId: string, packet: OutgoingDiscordPacket) => void;
};

export type VCEventListeners<T> = {
  (event: 'debug', listener: (message: string) => void): T;
  (event: 'warn', listener: (message: string) => void): T;
  (event: 'error', listener: (error: Error) => void): T;
  (event: 'rawWS', listener: (packet: Pick<IncomingDiscordPacket, 'op' | 'd'>) => void): T;
}