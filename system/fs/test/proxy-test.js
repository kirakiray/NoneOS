(async () => {
  const tester = expect(2, "proxy test");

  await fs.mkdir("/proxy_test").catch((e) => {});
  const mid = Math.random();
  await fs.writeFile("/proxy_test/test.js", `console.log(${mid})`);

  const fetch_data = await fetch("/$/proxy_test/test.js").then((e) => e.text());

  tester.ok(fetch_data === `console.log(${mid})`, "fetch data ok");
})();
