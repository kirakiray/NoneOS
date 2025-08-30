const getRandomId = () => {
  return Math.random().toString(32).slice(2);
};

export const createArticleData = (data) => {
  return {
    type: "article",
    aid: `${getRandomId()}-${getRandomId()}`,
    title: "",
    ...data,
    creationtime: Date.now(),
    content: [
      {
        type: "paragraph",
        value: "",
      },
    ],
  };
};
