export interface RtcStreamStat {
  recvBitrate: number;
  sendBitrate: number;
  rtpRecvBitrate: number;
  transportId: string;
  type: string;
  timestamp: number;
}
