import { observePool } from "/packages/fs/re-remote/base.js";

export default function receiveObserve({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const { obsId, options } = data;

  const targetFunc = observePool.get(obsId);

  const reOptions = {
    ...options,
    // 修正 path
    path: `$user-${fromUserId}:${options.path}`,
  };

  targetFunc(reOptions);
}
