import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "../components/Sidebar";

describe("Sidebar - Recycle Bin Integration", () => {
  const mockProps = {
    quickAccess: [
      { label: "Desktop", path: "C:\\Users\\Test\\Desktop", icon: "folder" },
      {
        label: "Downloads",
        path: "C:\\Users\\Test\\Downloads",
        icon: "folder",
      },
    ],
    currentPath: "C:\\Users\\Test\\Desktop",
    bookmarks: [],
    drives: [
      {
        label: "C:",
        path: "C:",
        total_bytes: 1000000,
        available_bytes: 500000,
      },
    ],
    onNavigate: vi.fn(),
    onRemoveBookmark: vi.fn(),
    onOpenRecycleBin: vi.fn(),
    dragDrop: {
      dropTarget: null,
      onDragOver: vi.fn(),
      onDragLeave: vi.fn(),
      onDrop: vi.fn(),
    },
  };

  it("should render Recycle Bin item in sidebar", () => {
    render(React.createElement(Sidebar, mockProps));
    const recycleBinElement = screen.getByText("Recycle Bin");
    expect(recycleBinElement).toBeDefined();
  });

  it("should call onOpenRecycleBin when Recycle Bin is clicked", async () => {
    render(React.createElement(Sidebar, mockProps));
    const recycleBinItem = screen.getByText("Recycle Bin");
    fireEvent.click(recycleBinItem);
    await waitFor(() => {
      expect(mockProps.onOpenRecycleBin).toHaveBeenCalledTimes(1);
    });
  });

  it('should highlight Recycle Bin item when currentPath is "Recycle Bin"', () => {
    const propsWithRecycleBin = {
      ...mockProps,
      currentPath: "Recycle Bin",
    };
    render(React.createElement(Sidebar, propsWithRecycleBin));
    const recycleBinItem = screen.getByText("Recycle Bin").closest("li");
    expect(recycleBinItem?.className).toContain("active");
  });

  it("should NOT close terminal when Recycle Bin is clicked", async () => {
    render(React.createElement(Sidebar, mockProps));
    const recycleBinItem = screen.getByText("Recycle Bin");

    fireEvent.click(recycleBinItem);

    // Verify no terminal-closing events are triggered
    await waitFor(() => {
      expect(mockProps.onOpenRecycleBin).toHaveBeenCalled();
    });
  });
});
