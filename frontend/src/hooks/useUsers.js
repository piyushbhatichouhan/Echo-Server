import { useEffect, useState } from "react";
import * as adminApi from "../services/admin.api";

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);

    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    users,
    loading,
    refresh,
    disableUser: adminApi.disableUser,
    enableUser: adminApi.enableUser,
    deleteUser: adminApi.deleteUser,
    restoreUser: adminApi.restoreUser,
  };
};
