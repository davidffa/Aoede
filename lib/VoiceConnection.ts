import { EventEmitter } from 'node:events';

import { Aoede } from './Aoede';

import type { VoiceServerInfo, VoiceServerUpdateData } from './@types';

export enum VoiceConnectionState {
  PENDING,    // waiting for voice server info
  READY,      // ready to connect
  CONNECTING, // connecting to voice server
  CONNECTED,  // connected to voice server
}

export class VoiceConnection extends EventEmitter {
  public state: VoiceConnectionState;
  private _voiceServerInfo: VoiceServerInfo;

  constructor(private readonly aoede: Aoede, public readonly guildId: string) {
    super();
    this.state = VoiceConnectionState.PENDING;
    this._voiceServerInfo = {};
  }

  set voiceServerInfo({ endpoint, token, sessionId }: VoiceServerInfo) {
    if (!endpoint || !token || !sessionId) {
      throw new TypeError('Malformed voiceServerInfo.');
    }

    this._voiceServerInfo = {
      endpoint,
      token,
      sessionId
    };
    this.state = VoiceConnectionState.READY;
  }

  set sessionId(sessionId: string) {
    if (this.state === VoiceConnectionState.PENDING) {
      this._voiceServerInfo.sessionId = sessionId;

      if (this._voiceServerInfo.endpoint && this._voiceServerInfo.token) {
        this.state = VoiceConnectionState.READY;
      }
    }
  }

  set voiceServerUpdateData(voiceServerUpdateData: Omit<VoiceServerUpdateData, 'guild_id'>) {
    this._voiceServerInfo.endpoint = voiceServerUpdateData.endpoint;
    this._voiceServerInfo.token = voiceServerUpdateData.token;

    if (this._voiceServerInfo.sessionId) {
      this.state = VoiceConnectionState.READY;
    }
  }

  public connect(): void {
    if (this.state === VoiceConnectionState.PENDING) {
      throw new Error('Missing voice server info to connect.');
    } else if (this.state === VoiceConnectionState.CONNECTING) {
      throw new Error('Already connecting to the voice server.');
    } else if (this.state === VoiceConnectionState.CONNECTED) {
      return;
    }

    this.state = VoiceConnectionState.CONNECTING;
  }

  public disconnect(): void {
    this._voiceServerInfo = {};
    this.state = VoiceConnectionState.PENDING;
  }
}