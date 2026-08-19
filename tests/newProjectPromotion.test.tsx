import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NewProject } from "../src/components/NewProject";

function openToDetails() {
  fireEvent.click(screen.getByText("Rock"));
  fireEvent.click(screen.getByText("Warm"));
}

describe("NewProject promotion — V10 Section A", () => {
  it("A6: double-tap Create creates exactly one project", () => {
    const onCreate = vi.fn();
    render(<NewProject visible={true} onClose={() => {}} onCreate={onCreate} />);
    openToDetails();
    fireEvent.click(screen.getByText("Criar Projeto"));
    openToDetails();
    fireEvent.click(screen.getByText("Criar Projeto"));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("A7: re-render does not create a duplicate project", () => {
    const onCreate = vi.fn();
    const { rerender } = render(<NewProject visible={true} onClose={() => {}} onCreate={onCreate} />);
    openToDetails();
    fireEvent.click(screen.getByText("Criar Projeto"));
    rerender(<NewProject visible={true} onClose={() => {}} onCreate={onCreate} />);
    openToDetails();
    fireEvent.click(screen.getByText("Criar Projeto"));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("A8: closing the wizard creates no project", () => {
    const onCreate = vi.fn();
    render(<NewProject visible={true} onClose={() => {}} onCreate={onCreate} />);
    openToDetails();
    fireEvent.click(screen.getByText("✕"));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("A6b: a fresh open after close can create again (new session gate)", () => {
    const onCreate = vi.fn();
    const { rerender } = render(<NewProject visible={true} onClose={() => {}} onCreate={onCreate} />);
    openToDetails();
    fireEvent.click(screen.getByText("Criar Projeto"));
    expect(onCreate).toHaveBeenCalledTimes(1);
    rerender(<NewProject visible={false} onClose={() => {}} onCreate={onCreate} />);
    rerender(<NewProject visible={true} onClose={() => {}} onCreate={onCreate} />);
    openToDetails();
    fireEvent.click(screen.getByText("Criar Projeto"));
    expect(onCreate).toHaveBeenCalledTimes(2);
  });
});
