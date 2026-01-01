import { getMounted as handleGetMounted } from "../../fs/handle/mount/mount.js";

export async function getMounted({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const mounted = await handleGetMounted();

  const remoteUser = await localUser.connectUser(fromUserId);

  remoteUser.post(
    {
      type: "response-mounted",
      __internal_mark: 1,
      mounted: mounted.map((e) => {
        return {
          id: e.id,
          name: e.name,
          path: e.path,
        };
      }),
    },
    fromUserSessionId
  );
}

export async function responseMounted({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const mounted = data.mounted;

  const remoteUser = await localUser.connectUser(fromUserId);

  remoteUser.dispatchEvent(
    new CustomEvent("response-mounted", {
      detail: mounted,
    })
  );
}
