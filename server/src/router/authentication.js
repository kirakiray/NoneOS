const handleAuthentication = async ({ client, message, clientManager }) => {
  try {
    const userId = await clientManager.authenticateClient(
      client,
      message.signedData
    );
    client.onAuthenticated(userId);
    client.sendAuthSuccess();
    client.sendServerInfo();
  } catch (error) {
    client.send({
      type: "error",
      kind: "authentication",
      message: error.message,
    });

    setTimeout(() => {
      client.close();
    }, 100);
  }
};

handleAuthentication.admin = false;

export default handleAuthentication;