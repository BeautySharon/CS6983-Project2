import { it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskList from "../components/TaskList";
const task = {
  _id: "task-1",
  petType: "Dog",
  description: "Walk Max",
  date: "2099-01-01T12:00:00Z",
  duration: 1,
  location: "Seattle",
  status: "open",
  applicationCount: 2,
};
const applications = [
  {
    _id: "app-1",
    taskId: "task-1",
    sitterName: "Alex",
    message: "I can help.",
    status: "pending",
  },
  {
    _id: "app-2",
    taskId: "task-1",
    sitterName: "Sam",
    message: "Available nearby.",
    status: "pending",
  },
];
async function expand(ui) {
  await ui.click(screen.getByRole("button", { name: "Applications (2)" }));
}
it("shows applicant names and messages and confirms before accepting", async () => {
  const ui = userEvent.setup(),
    onAccept = vi.fn().mockResolvedValue();
  render(
    <TaskList
      tasks={[task]}
      applications={applications}
      onDelete={vi.fn()}
      onAccept={onAccept}
    />,
  );
  await expand(ui);
  expect(screen.getByText("I can help.")).toBeVisible();
  await ui.click(screen.getByRole("button", { name: "Accept Alex" }));
  expect(onAccept).not.toHaveBeenCalled();
  await ui.click(screen.getByRole("button", { name: "Confirm accept" }));
  expect(onAccept).toHaveBeenCalledWith("task-1", "app-1");
});
it("renders accepted and not-selected pills after refetch", async () => {
  const ui = userEvent.setup();
  render(
    <TaskList
      tasks={[{ ...task, status: "assigned" }]}
      applications={applications.map((a, i) => ({
        ...a,
        status: i ? "rejected" : "accepted",
      }))}
      onDelete={vi.fn()}
      onAccept={vi.fn()}
    />,
  );
  await expand(ui);
  expect(screen.getByText("Accepted")).toBeVisible();
  expect(screen.getByText("Not selected")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Accept Alex" }),
  ).not.toBeInTheDocument();
});
it("prevents duplicate submissions and shows failures without success pills", async () => {
  let reject;
  const onAccept = vi.fn(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const ui = userEvent.setup();
  render(
    <TaskList
      tasks={[task]}
      applications={applications}
      onDelete={vi.fn()}
      onAccept={onAccept}
    />,
  );
  await expand(ui);
  await ui.click(screen.getByRole("button", { name: "Accept Alex" }));
  await ui.dblClick(screen.getByRole("button", { name: "Confirm accept" }));
  expect(onAccept).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Accepting…" })).toBeDisabled();
  reject(new Error("Unable to accept. Please try again."));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to accept",
  );
  expect(screen.queryByText("Accepted")).not.toBeInTheDocument();
});
it("cancels confirmation without a request", async () => {
  const onAccept = vi.fn();
  const ui = userEvent.setup();
  render(
    <TaskList
      tasks={[task]}
      applications={applications}
      onDelete={vi.fn()}
      onAccept={onAccept}
    />,
  );
  await expand(ui);
  await ui.click(screen.getByRole("button", { name: "Accept Alex" }));
  await ui.click(
    within(
      screen.getByRole("group", { name: "Confirm sitter acceptance" }),
    ).getByRole("button", { name: "Cancel" }),
  );
  expect(onAccept).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Accept Alex" })).toHaveFocus();
});
