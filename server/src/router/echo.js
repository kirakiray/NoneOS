const handleEcho = ({ client, message }) => {
  client.send({
    type: "echo",
    message: message.message,
    timestamp: new Date().toISOString(),
  });
};

handleEcho.admin = false;

export default handleEcho;