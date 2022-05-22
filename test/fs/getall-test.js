import getAll from "/system/fs/getAll.mjs";

(async () => {
  await new Promise((res) => setTimeout(res, 500));

  const rootdata = await getAll("/");

  const createUl = (data) => {
    let reEle = document.createElement("ul");
    reEle.innerHTML = `<div style="margin-left:-20px;color:green;">${data.path}</div>`;

    Object.assign(reEle.style, {
      color: "#fff",
      paddingLeft: "30px",
    });

    if (data.type === "folder") {
      data.content.forEach((e) => {
        const li = document.createElement("li");
        const c_ul = createUl(e);

        li.appendChild(c_ul);
        reEle.append(li);
      });
    } else {
      reEle = document.createElement("li");
      reEle.innerHTML = `<a href="${
        location.origin + "/$" + data.path
      }" target="_blank" style="color:white;">${data.path}</a>`;
    }

    return reEle;
  };

  const ele = createUl(rootdata);

  document.body.appendChild(ele);
})();
