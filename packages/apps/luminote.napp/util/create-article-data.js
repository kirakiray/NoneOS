export const createArticleData = (data) => {
  return {
    type: "article",
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
