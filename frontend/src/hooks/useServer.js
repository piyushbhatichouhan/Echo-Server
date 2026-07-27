import { useEffect, useState } from "react";

import {
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../services/server.api";

export default function useServer() {
  const [pendingUsers, setPendingUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const loadPendingUsers = async () => {
    setLoading(true);

    try {
      const users = await getPendingUsers();

      setPendingUsers(users);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    await approveUser(id);

    await loadPendingUsers();
  };

  const reject = async (id) => {
    await rejectUser(id);

    await loadPendingUsers();
  };

  useEffect(() => {
    loadPendingUsers();
  }, []);

  return {
    pendingUsers,

    loading,

    approve,

    reject,
  };
}
