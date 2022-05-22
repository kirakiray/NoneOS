import getAll from "/system/fs/getAll.js";

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
      reEle.innerHTML = `${data.path}`;
    }

    return reEle;
  };

  console.log("root data => ", rootdata);
  const ele = createUl(rootdata);

  document.body.appendChild(ele);
})();
