const MEDIA_CONSTRAINTS = {
  audio: true,
  video: {
    width: {
      min: 640,
      max: 1920,
    },
    height: {
      min: 400,
      max: 1080,
    },
  },
};

const displayMediaOptions = {
  audio: false,
  video: true,
};

export class MediaUtil {
  public fetchLocalMedia = async ({
    video = false,
    audio = false,
  }): Promise<MediaStream> => {
    return await navigator.mediaDevices.getUserMedia({
      ...MEDIA_CONSTRAINTS,
      video: video,
      audio: audio,
    });
  };

  public fetchLocalVideo = async (
    videoDeviceId: string
  ): Promise<MediaStream> => {
    return await navigator.mediaDevices.getUserMedia({
      video: { deviceId: videoDeviceId },
    });
  };

  public fetchScreenCaptureVideo = async () => {
    return await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
  };

  // 공유화면 mediaTrack의 크기 제약조건
  public SCREEN_CAPTURE_MEDIA_CONSTRAINTS = {
    width: { min: 800, max: 1920, ideal: 640 },
    height: { min: 400, max: 1080, ideal: 400 },
  };

  public fetchLocalAudioInput = async (
    audioDeviceId: string
  ): Promise<MediaStream> => {
    return await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: audioDeviceId },
    });
  };

  public getMediaStreamUsingFirstVideoTrackOf = (mediaStream: MediaStream) => {
    return new MediaStream([mediaStream.getVideoTracks()[0]]);
  };

  public getMediaStreamUsingFirstAudioTrackOf = (mediaStream: MediaStream) => {
    return new MediaStream([mediaStream.getAudioTracks()[0]]);
  };
}
