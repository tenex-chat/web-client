import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/projects")({
  component: ProjectsLayout,
});

function ProjectsLayout() {
  // This is a layout route that renders its children
  return <Outlet />;
}
