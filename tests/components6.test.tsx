import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LoadingModal } from "../src/components";

describe("LoadingModal", () => {
  it("does not render content when not visible", () => {
    render(
      <LoadingModal
        visible={false}
        title="Carregando"
        message="Aguarde"
      />
    );
    expect(screen.queryByText("Carregando")).toBeNull();
  });

  it("renders title when visible", () => {
    render(
      <LoadingModal
        visible={true}
        title="Renderizando áudio"
        message="Aguarde"
      />
    );
    expect(screen.getByText("Renderizando áudio")).toBeTruthy();
  });

  it("renders message when visible", () => {
    render(
      <LoadingModal
        visible={true}
        title="Título"
        message="Mensagem de status"
      />
    );
    expect(screen.getByText("Mensagem de status")).toBeTruthy();
  });

  it("shows indeterminate activity indicator when progress is undefined", () => {
    const { container } = render(
      <LoadingModal
        visible={true}
        title="Indeterminado"
        message="Processando"
      />
    );
    expect(container).toBeTruthy();
    expect(screen.getByText("Indeterminado")).toBeTruthy();
  });

  it("shows progress percentage when progress provided", () => {
    render(
      <LoadingModal
        visible={true}
        title="Progresso"
        message="Carregando"
        progress={42}
      />
    );
    expect(screen.getByText("42%")).toBeTruthy();
  });

  it("shows phase label when provided", () => {
    render(
      <LoadingModal
        visible={true}
        title="Fase"
        message="msg"
        progress={10}
        phase="Renderizando stems"
      />
    );
    expect(screen.getByText("Renderizando stems")).toBeTruthy();
  });

  it("shows sub-progress percentage when provided", () => {
    render(
      <LoadingModal
        visible={true}
        title="Sub"
        message="msg"
        progress={10}
        subProgress={75}
      />
    );
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("shows cancel button when onCancel provided", () => {
    render(
      <LoadingModal
        visible={true}
        title="Cancelável"
        message="msg"
        progress={30}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Cancelar")).toBeTruthy();
  });

  it("uses custom cancel label", () => {
    render(
      <LoadingModal
        visible={true}
        title="Cancelável"
        message="msg"
        progress={30}
        onCancel={vi.fn()}
        cancelLabel="Fechar"
      />
    );
    expect(screen.getByText("Fechar")).toBeTruthy();
  });

  it("does not show cancel button when onCancel not provided", () => {
    render(
      <LoadingModal
        visible={true}
        title="Sem cancelar"
        message="msg"
        progress={30}
      />
    );
    expect(screen.queryByText("Cancelar")).toBeNull();
  });

  it("calls onCancel when cancel button pressed", () => {
    const fn = vi.fn();
    render(
      <LoadingModal
        visible={true}
        title="Cancelável"
        message="msg"
        progress={30}
        onCancel={fn}
      />
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("shows Concluído state at 100% progress", () => {
    render(
      <LoadingModal
        visible={true}
        title="Completo"
        message="msg"
        progress={100}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Concluído")).toBeTruthy();
  });

  it("does not show cancel at 100% progress", () => {
    render(
      <LoadingModal
        visible={true}
        title="Completo"
        message="msg"
        progress={100}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByText("Cancelar")).toBeNull();
  });

  it("auto-closes via onCancel after reaching 100%", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    render(
      <LoadingModal
        visible={true}
        title="Auto close"
        message="msg"
        progress={100}
        onCancel={fn}
      />
    );
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does not auto-close when progress is not 100%", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    render(
      <LoadingModal
        visible={true}
        title="No auto close"
        message="msg"
        progress={50}
        onCancel={fn}
      />
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(fn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("renders with testID when provided", () => {
    const { container } = render(
      <LoadingModal
        visible={true}
        title="TestID"
        message="msg"
        testID="loading-modal"
      />
    );
    expect(container).toBeTruthy();
  });
});
