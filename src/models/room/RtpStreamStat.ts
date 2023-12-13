export interface RtpStreamStat {
  readonly type: string;
  readonly ssrc: number;
  readonly timestamp: number;
  readonly kind: string;
  readonly packetCount: number;
  readonly packetsLost: number;
  readonly packetsDiscarded: number;
  readonly packetsRetransmitted: number;
  readonly packetsRepaired: number;
  readonly bitrate: number;
}
