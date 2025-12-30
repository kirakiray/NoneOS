const handleUpdateDelay = ({ client, message }) => {
  const { delay } = message;
  client.delay = delay;
};

handleUpdateDelay.admin = false;

export default handleUpdateDelay;