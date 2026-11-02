import React from "react";
import "./DeploymentStepper.css";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Box,
  Layers,
  ShieldCheck,
  Activity,
  Globe,
} from "lucide-react";

const STEPS = [
  { id: 1, key: "prep", label: "Initialize", icon: Layers, desc: "Workspace & config setup" },
  { id: 2, key: "build", label: "Isolated Build", icon: Box, desc: "Containerized sandbox compilation" },
  { id: 3, key: "verify", label: "Verification", icon: ShieldCheck, desc: "Docker image validation" },
  { id: 4, key: "health", label: "Health Probe", icon: Activity, desc: "Port & HTTP readiness probe" },
  { id: 5, key: "live", label: "Active Online", icon: Globe, desc: "Production traffic live" },
];

export default function DeploymentStepper({ status, logs = [] }) {
  const state = status?.state || "not_deployed";

  const getActiveStep = () => {
    if (state === "running") return 5;
    if (state === "failed") {
      const lastMsg = logs[logs.length - 1]?.message?.toLowerCase() || "";
      if (lastMsg.includes("health") || lastMsg.includes("port")) return 4;
      if (lastMsg.includes("verify") || lastMsg.includes("image")) return 3;
      if (lastMsg.includes("build") || lastMsg.includes("install") || lastMsg.includes("docker")) return 2;
      return 1;
    }
    if (state === "building") {
      const lastMsg = logs[logs.length - 1]?.message?.toLowerCase() || "";
      if (lastMsg.includes("health") || lastMsg.includes("port")) return 4;
      if (lastMsg.includes("verif") || lastMsg.includes("image built")) return 3;
      if (lastMsg.includes("build") || lastMsg.includes("install") || lastMsg.includes("docker")) return 2;
      return 1;
    }
    return 0; // Not deployed or stopped
  };

  const activeStep = getActiveStep();
  const isFailed = state === "failed";
  const isBuilding = state === "building";

  return (
    <div className="eh-deployment-stepper">
      <div className="eh-stepper-header">
        <div className="eh-stepper-title">
          <h4>Deployment Pipeline</h4>
          <span className={`eh-stepper-state-badge ${state}`}>
            {state.toUpperCase().replace("_", " ")}
          </span>
        </div>
        {isBuilding && (
          <div className="eh-stepper-building-indicator">
            <Loader2 className="eh-spinner" size={14} />
            <span>Multi-stage build in progress</span>
          </div>
        )}
      </div>

      <div className="eh-stepper-track">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = activeStep > step.id || (activeStep === 5 && step.id === 5);
          const isCurrent = activeStep === step.id;
          const hasFailed = isCurrent && isFailed;

          let stepClass = "eh-step-pending";
          if (hasFailed) stepClass = "eh-step-failed";
          else if (isCompleted) stepClass = "eh-step-completed";
          else if (isCurrent) stepClass = isBuilding ? "eh-step-active" : "eh-step-completed";

          return (
            <React.Fragment key={step.id}>
              <div className={`eh-step-node ${stepClass}`}>
                <div className="eh-step-icon-wrapper">
                  {hasFailed ? (
                    <AlertCircle size={18} className="eh-node-icon error" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={18} className="eh-node-icon success" />
                  ) : isCurrent && isBuilding ? (
                    <Loader2 size={18} className="eh-node-icon spinning" />
                  ) : (
                    <StepIcon size={18} className="eh-node-icon" />
                  )}
                </div>
                <div className="eh-step-content">
                  <span className="eh-step-label">{step.label}</span>
                  <span className="eh-step-desc">{step.desc}</span>
                </div>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`eh-step-connector ${
                    activeStep > step.id ? "completed" : ""
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
