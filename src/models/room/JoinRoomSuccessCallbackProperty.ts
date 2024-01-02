import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import { PeerState } from "@/models/room/PeerState";
import AwaitingPeerInfo from "@/models/room/AwaitingPeerInfo";

export interface JoinRoomSuccessCallbackProperty {
  readonly roomId: string;
  readonly type: "success";
  readonly rtpCapabilities: RtpCapabilities;
  readonly peerStates: PeerState[];

  /**
   * 호스트 전용
   */
  readonly awaitingPeerInfos: AwaitingPeerInfo[];
  readonly joiningUserIds: string[];
}
