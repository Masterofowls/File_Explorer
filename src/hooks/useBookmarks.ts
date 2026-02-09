import { useCallback, useEffect, useState } from "react";
import type { Bookmark } from "../types";

const STORAGE_KEY = "file-explorer-bookmarks";

function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);

  useEffect(() => {
    saveBookmarks(bookmarks);
  }, [bookmarks]);

  const addBookmark = useCallback((label: string, path: string) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.path === path)) return prev;
      return [...prev, { id: crypto.randomUUID(), label, path }];
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const isBookmarked = useCallback(
    (path: string) => bookmarks.some((b) => b.path === path),
    [bookmarks],
  );

  return { bookmarks, addBookmark, removeBookmark, isBookmarked };
}
