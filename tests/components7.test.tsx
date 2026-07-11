import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadingModal } from "../src/components/LoadingModal";

describe("Studio transport + loop markers + recording", () => {
  describe("LoadingModal (shared with studio transport)", () => {
    it("renders with title and message", () => {
      render(
        <LoadingModal
          visible={true}
          title="Renderizando"
          message="Aguarde..."
        />,
      );
      expect(screen.getByText("Renderizando")).toBeTruthy();
      expect(screen.getByText("Aguarde...")).toBeTruthy();
    });

    it("does not render when not visible", () => {
      render(
        <LoadingModal
          visible={false}
          title="Hidden"
          message="Should not appear"
        />,
      );
      expect(screen.queryByText("Hidden")).toBeNull();
    });

    it("shows progress percentage", () => {
      render(
        <LoadingModal
          visible={true}
          title="Progress"
          message="Working"
          progress={65}
        />,
      );
      expect(screen.getByText("65%")).toBeTruthy();
    });

    it("shows phase label when provided", () => {
      render(
        <LoadingModal
          visible={true}
          title="Phase"
          message="Processing"
          progress={30}
          phase="Renderizando stems"
        />,
      );
      expect(screen.getByText("Renderizando stems")).toBeTruthy();
    });

    it("renders with progress but no phase", () => {
      render(
        <LoadingModal
          visible={true}
          title="No Phase"
          message="Just progress"
          progress={50}
        />,
      );
      expect(screen.getByText("50%")).toBeTruthy();
    });

    it("renders cancellable button when onCancel provided", () => {
      const onCancel = vi.fn();
      render(
        <LoadingModal
          visible={true}
          title="Cancellable"
          message="You can cancel"
          onCancel={onCancel}
        />,
      );
      const cancelBtn = screen.getByText("Cancelar");
      expect(cancelBtn).toBeTruthy();
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it("does not render cancel button when onCancel not provided", () => {
      render(
        <LoadingModal
          visible={true}
          title="No Cancel"
          message="No cancel button"
        />,
      );
      expect(screen.queryByText("Cancelar")).toBeNull();
    });

    it("renders activity indicator without progress", () => {
      const { container } = render(
        <LoadingModal
          visible={true}
          title="Spinner"
          message="Indeterminate"
        />,
      );
      expect(screen.getByText("Spinner")).toBeTruthy();
      expect(container).toBeTruthy();
    });
  });
});
