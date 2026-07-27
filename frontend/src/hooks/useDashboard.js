import { useEffect, useState } from "react";

import { getDashboard } from "../services/dashboard.api";

export default function useDashboard() {
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const data = await getDashboard();

      setDashboard(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return {
    dashboard,

    loading,

    refresh: loadDashboard,
  };
}
