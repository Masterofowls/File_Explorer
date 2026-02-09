import React, { useState, useRef, useEffect, useCallback } from "react";
import { VscSearch, VscClose } from "react-icons/vsc";

interface SearchBarProps {
  query: string;
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ query, onSearch }) => {
  const [value, setValue] = useState(query);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setValue(query);
  }, [query]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onSearch(v), 300);
    },
    [onSearch],
  );

  const clear = useCallback(() => {
    setValue("");
    onSearch("");
    inputRef.current?.focus();
  }, [onSearch]);

  return (
    <div className={`search-bar ${focused ? "focused" : ""}`}>
      <VscSearch className="search-icon" />
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Search files..."
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value && (
        <button className="search-clear" onClick={clear}>
          <VscClose />
        </button>
      )}
    </div>
  );
};

export default React.memo(SearchBar);
