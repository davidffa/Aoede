import { EventEmitter } from 'node:events';

import { VoiceConnection, VoiceConnectionState } from './VoiceConnection';

import type {
  AoedeEventListeners,
  AoedeOptions,
  IncomingDiscordPacket,
  OutgoingDiscordPacket,
  OutgoingVoiceStateUpdateData,
  VoiceServerUpdateData,
  VoiceStateUpdateData
} from './@types';

export declare interface Aoede {
  once: AoedeEventListeners<this>;
  on: AoedeEventListeners<this>;
}

export class Aoede extends EventEmitter {
  public readonly clientId: string;
  declare public readonly sendWS: ((guildId: string, packet: OutgoingDiscordPacket) => void) | undefined;

  private connections: VoiceConnection[];

  constructor(options: AoedeOptions) {
    super();

    this.clientId = options.cliendId;
    this.sendWS = options.sendWS;

    this.connections = [];
  }

  public createVoiceConnection(guildId: string): VoiceConnection {
    let connection = this.getVoiceConnection(guildId);

    if (!connection) {
      this.emit('debug', `Created new voice connection for guild ${guildId}`);
      connection = new VoiceConnection(this, guildId);
      this.connections.push(connection);
    }

    return connection;
  }

  public destroyVoiceConnection(guildId: string): void {
    const connection = this.getVoiceConnection(guildId);
    if (!connection) return;

    this.emit('debug', `Destroying voice connection for guild ${guildId}`);

    connection.disconnect();
    this.connections.splice(this.connections.indexOf(connection), 1);
  }

  public getVoiceConnection(guildId: string): VoiceConnection | null {
    return this.connections.find(c => c.guildId === guildId) ?? null;
  }

  public handleVoiceUpdate(packet: IncomingDiscordPacket): void {
    if (packet.op !== 0 || !(packet.d as Record<string, unknown>).guild_id) return;

    if (packet.t === 'VOICE_STATE_UPDATE') {
      const {
        channel_id,
        guild_id,
        session_id,
        user_id
      } = packet.d as VoiceStateUpdateData;

      if (user_id !== this.clientId || !channel_id) return;

      const connection = this.getVoiceConnection(guild_id);
      if (!connection) return;

      connection.sessionId = session_id;

      if (connection.state === VoiceConnectionState.READY) connection.connect();
    } else if (packet.t === 'VOICE_SERVER_UPDATE') {
      const {
        endpoint,
        guild_id,
        token
      } = packet.d as VoiceServerUpdateData;

      const connection = this.getVoiceConnection(guild_id);
      if (!connection) return;

      connection.voiceServerUpdateData = {
        token,
        endpoint
      };

      if (connection.state === VoiceConnectionState.READY) connection.connect();
    }
  }

  public joinVoiceChannel({
    channel_id,
    guild_id,
    self_deaf,
    self_mute
  }: OutgoingVoiceStateUpdateData): VoiceConnection {
    if (!this.sendWS || typeof this.sendWS !== 'function') {
      throw new Error('You must provide a sendWS function in Aoede constructor in order to use this method.');
    }

    const connection = this.createVoiceConnection(guild_id);

    // TODO: Add a way to change deaf/mute ?

    this.sendWS(guild_id, {
      op: 4,
      d: {
        guild_id,
        channel_id,
        self_deaf,
        self_mute
      }
    })

    return connection;
  }
}