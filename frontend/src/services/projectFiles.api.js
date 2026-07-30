import api from "./api";

// ---------- Files ----------

export const getProjectFiles = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/files`);
  return res.data.data;
};

export const uploadProjectFile = async (
  projectId,
  file,
  relativePath = file.name,
) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("relativePath", relativePath);
  console.log(projectId);
  const res = await api.post(`/projects/${projectId}/files`, formData);

  return res.data.data;
};

export const createProjectFile = async (projectId, relativePath) => {
  const res = await api.post(`/projects/${projectId}/files/create`, {
    relativePath,
  });

  return res.data.data;
};

export const getProjectFileContent = async (fileId) => {
  const res = await api.get(`/files/${fileId}/content`);
  return res.data.data;
};

export const saveProjectFileContent = async (fileId, content) => {
  const res = await api.put(`/files/${fileId}/content`, {
    content,
  });

  return res.data.data;
};

export const downloadProjectFile = async (fileId) => {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data);

  const a = document.createElement("a");
  a.href = url;

  const disposition = response.headers["content-disposition"];

  let filename = "download";

  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);

    if (match) filename = match[1];
  }

  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};

export const getProjectFileBlob = async (fileId) => {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });

  return {
    blob: response.data,
    filename:
      response.headers["content-disposition"]?.match(
        /filename="?([^"]+)"?/,
      )?.[1] || "download",
  };
};

export const deleteProjectFile = async (fileId) => {
  const res = await api.delete(`/files/${fileId}`);
  return res.data;
};

export const renameProjectFile = async (fileId, newName) => {
  const res = await api.put(`/files/${fileId}/rename`, {
    newName,
  });

  return res.data.data;
};

// ---------- Folders ----------

export const createProjectFolder = async (projectId, relativePath) => {
  const res = await api.post(`/projects/${projectId}/folders`, {
    relativePath,
  });

  return res.data.data;
};

export const deleteProjectFolder = async (projectId, relativePath) => {
  const res = await api.delete(`/projects/${projectId}/path`, {
    data: {
      relativePath,
    },
  });

  return res.data;
};

export const renameProjectFolder = async (projectId, relativePath, newName) => {
  const res = await api.put(`/projects/${projectId}/rename`, {
    relativePath,
    newName,
  });

  return res.data.data;
};

// ---------- Stats ----------
