import "./Environment.css";

import { Plus } from "lucide-react";

import Button from "../../common/Button/Button";
import Card from "../../common/Card/Card";

import EnvironmentItem from "./EnvironmentItem";

import useEnvironment from "../../../hooks/useEnvironment";
import { useState } from "react";

import EnvironmentModal from "./EnvironmentModal";

export default function Environment({ projectId }) {
  const { variables, loading, createVariable, updateVariable, removeVariable } =
    useEnvironment(projectId);
  const [modalOpen, setModalOpen] = useState(false);

  const [editingVariable, setEditingVariable] = useState(null);
  return (
    <div className="eh-environment">
      <Card>
        <div className="eh-environment-header">
          <div>
            <h2>Environment Variables</h2>

            <p>Manage runtime configuration and secrets for this project.</p>
          </div>

          <Button
            icon={Plus}
            variant="primary"
            onClick={() => {
              setEditingVariable(null);
              setModalOpen(true);
            }}
          >
            Add Variable
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card>Loading...</Card>
      ) : variables.length === 0 ? (
        <Card>
          <div className="eh-environment-empty">
            No environment variables yet.
          </div>
        </Card>
      ) : (
        <div className="eh-environment-list">
          {variables.map((variable) => (
            <EnvironmentItem
              key={variable.id}
              variable={variable}
              onEdit={(variable) => {
                setEditingVariable(variable);
                setModalOpen(true);
              }}
              onDelete={async (variable) => {
                const confirmed = window.confirm(`Delete "${variable.key}"?`);

                if (!confirmed) return;

                await removeVariable(variable.id);
              }}
            />
          ))}
        </div>
      )}
      <EnvironmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        variable={editingVariable}
        onSave={async (payload) => {
          if (editingVariable) {
            await updateVariable(editingVariable.id, payload);
          } else {
            await createVariable(payload);
          }
        }}
      />
    </div>
  );
}
