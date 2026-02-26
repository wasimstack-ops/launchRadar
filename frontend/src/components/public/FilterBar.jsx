function FilterBar({ category, sortBy, categories, onCategoryChange, onSortChange }) {
  return (
    <div className="pd-filter-bar">
      <div className="pd-field">
        <span>Category</span>
        <div className="pd-category-chips">
          <button
            type="button"
            className={`pd-chip${category === 'All' ? ' active' : ''}`}
            onClick={() => onCategoryChange('All')}
          >
            All
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`pd-chip${category === item ? ' active' : ''}`}
              onClick={() => onCategoryChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <label className="pd-field">
        <span>Sort</span>
        <select value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
          <option value="new">New</option>
          <option value="popular">Popular</option>
        </select>
      </label>
    </div>
  );
}

export default FilterBar;
