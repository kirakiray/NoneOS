export default function fileSync({ channels }) {
  const { fileSyncCMD: mainChannel } = channels;

  mainChannel.onmessage = (e) => {
    console.log("mainChannel => ", e.data);
  };

  return {
    testM: mainChannel,
  };
}

fileSync.agreementName = "fileSync";

fileSync.channels = ["fileSyncCMD"];
