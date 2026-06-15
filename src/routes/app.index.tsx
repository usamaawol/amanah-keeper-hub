import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/app/")({
  component: () => {
    const navigate = useNavigate();
    useEffect(() => {
      navigate({ to: "/app/dashboard" });
    }, [navigate]);
    return null;
  },
});
