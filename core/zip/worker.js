importScripts("./jszip.js");

const zings = {};

self.onmessage = (e) => {
  const { data } = e;
  console.log("message: ", e.data, JSZip);

  const zip = zings[data.id] || (zings[data.id] = new JSZip());

  zip.file(data.path, data.file);

  if (data.isEnd) {
    zip.generateAsync({ type: "blob" }).then(function (content) {
      self.postMessage({
        id: data.id,
        content,
      });
    });

    zings[data.id] = null;
  }
};
