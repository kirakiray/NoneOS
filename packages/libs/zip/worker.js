try {
  importScripts("./jszip.js");
} catch (err) {
  importScripts("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
}

const zings = {};

self.onmessage = (e) => {
  const { data } = e;

  switch (data.taskType) {
    case "unzip":
      unzip(data);
      break;
    default:
      packaged(data);
  }
};

const unzip = async (data) => {
  const { file } = data;
  let files;
  try {
    files = await unzipFile(file);
  } catch (err) {
    self.postMessage({
      id: data.id,
      error: err.toString(),
    });
    return;
  }

  self.postMessage({
    id: data.id,
    content: files,
  });
};

const packaged = (data) => {
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

function unzipFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = function (e) {
      let data = e.target.result;
      JSZip.loadAsync(data)
        .then(function (zip) {
          const tasks = [];
          zip.forEach(function (relativePath, zipEntry) {
            const obj = zip.file(zipEntry.name);
            const name = zipEntry.name.split("/").slice(-1)[0];

            if (!obj || name === ".DS_Store") {
              return;
            }
            tasks.push(
              new Promise((res) => {
                obj.async("blob").then(function (content) {
                  let file = new File([content], name);

                  res({ path: zipEntry.name, file });
                });
              })
            );
          });

          Promise.all(tasks).then((files) => {
            resolve(files);
          });
        })
        .catch(reject);
    };
    reader.readAsArrayBuffer(file);
  });
}
