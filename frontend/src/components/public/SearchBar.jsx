function SearchBar({ value, onChange }) {
  return (
    <div className="pd-search-wrap">
      <input
        className="pd-search-input"
        type="text"
        placeholder="Search by title or description..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export default SearchBar;
