import api from "./api";

export const getProjects = async () => {
  const res = await api.get("/projects");

  return res.data.data;
};

export const createProject = async (data) => {
  const res = await api.post("/projects", data);

  return res.data.data;
};

export const getProject = async (id) => {
  const res = await api.get(`/projects/${id}`);

  return res.data.data;
};

export const deleteProject = async (id) => {
  const res = await api.delete(`/projects/${id}`);

  return res.data;
};
