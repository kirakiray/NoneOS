export const createArticleData = (data) => {
  return {
    title: "",
    type: "article",
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
