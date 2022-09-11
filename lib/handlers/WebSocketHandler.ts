import WebSocket from 'ws';

import { VoiceConnection } from '../VoiceConnection';
import { VoiceOpCodes, VOICE_GATEWAY_VERSION } from '../Constants';

import type { CloseEvent, ErrorEvent, MessageEvent } from 'ws';

export class WebSocketHandler {
  private lastHeartbeatSent: number;
  private heartbeatInterval: ReturnType<typeof setInterval> | null;
  private socket: WebSocket | null;

  public ping: number;

  constructor(
    private readonly connection: VoiceConnection
  ) {
    this.lastHeartbeatSent = 0;
    this.heartbeatInterval = null;
    this.socket = null;

    this.ping = -1;
  }

  get voiceGatewayURL(): string {
    return `wss://${this.connection.voiceServerInfo.endpoint}?v=${VOICE_GATEWAY_VERSION}`;
  }

  public connect(): void {
    if (this.socket) this.disconnect();

    this.socket = new WebSocket(this.voiceGatewayURL);
    this.socket.onopen = this.#onOpen.bind(this);
    this.socket.onmessage = this.#onMessage.bind(this);
    this.socket.onerror = this.#onError.bind(this);
    this.socket.onclose = this.#onClose.bind(this);
  }

  public disconnect(code: number = 1000, reason: string = 'Aoede: Disconnect'): void {
    this.connection.emit('debug', `Manually closing WebSocket with code: ${code}. Reason: ${reason}.`);
    this.socket?.close(code, reason);
  }

  private identify(): void {
    if (!this.socket) throw new Error('Cannot identify without a socket.');
    this.connection.emit('debug', 'Identifying.');

    const { sessionId, token } = this.connection.voiceServerInfo;

    this.send({
      op: VoiceOpCodes.IDENTIFY,
      d: {
        server_id: this.connection.guildId,
        user_id: this.connection.aoede.clientId,
        session_id: sessionId,
        token
      }
    });
  }

  private send(packet: unknown): void {
    this.socket?.send(JSON.stringify(packet));
  }

  private heartbeat() {
    this.lastHeartbeatSent = Date.now();

    this.send({
      op: VoiceOpCodes.HEARTBEAT,
      d: this.lastHeartbeatSent
    });
  }

  #setupKeepAlive(delay: number) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, delay);
  }

  #onOpen() {
    this.connection.emit('debug', 'WebSocket opened.');
    this.identify();
  }

  #onMessage({ data }: MessageEvent) {
    const packet = JSON.parse(data as string);

    this.connection.emit('rawWS', packet);

    switch (packet.op) {
      case VoiceOpCodes.READY:
        this.connection.emit('debug', `Received READY packet. Our SSRC: ${packet.d.ssrc}. UDP Server: ${packet.d.ip}:${packet.d.port}. Supported encryption modes: ${packet.d.modes}`);
        this.connection.ssrc = packet.d.ssrc;
        break;
      case VoiceOpCodes.HEARTBEAT_ACK:
        if (packet.d !== this.lastHeartbeatSent) {
          this.connection.emit('warn', `Unpaired heartbeat ack received. Our nonce: ${this.lastHeartbeatSent}. Its nonce: ${packet.d}.`);
        }
        this.ping = Date.now() - this.lastHeartbeatSent;
        break;
      case VoiceOpCodes.HELLO:
        this.#setupKeepAlive(packet.d.heartbeat_interval);
        break;
      default:
        this.connection.emit('warn', `Unhandled WebSocket opcode: ${packet.op}. Packet: ${data}`);
        break;
    }
  }

  #onError({ error }: ErrorEvent) {
    this.connection.emit('error', error);
  }

  #onClose({ code, reason, wasClean }: CloseEvent) {
    // TODO: close code handling (should resume ? etc.)
    this.connection.emit('debug', `WebSocket closed with code: ${code}. Reason: ${reason || 'none'}.`);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.socket?.removeAllListeners();
    this.socket = null;

    switch (code) {
      case 1000:
        this.connection.emit('wsDisconnect', code, reason, wasClean);
        break;
      default:
        this.connection.emit('warn', `Unhandled WebSocket close code: ${code}. Reason: ${reason}.`);
        break;
    }
  }
}