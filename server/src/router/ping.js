const handlePing = ({ client }) => {
  client.send({
    type: "pong",
    timestamp: new Date().toISOString(),
  });
};

handlePing.admin = false;

export default handlePing;
