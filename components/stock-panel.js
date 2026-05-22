window.StockPanel = {
  render(items, selectedItem) {
    const escapeHtml = window.DressiUtils?.escapeHtml || (value => String(value ?? ''));
    const status = selectedItem ? window.ProductCard.getStatus(selectedItem) : null;
    const options = items.map(item => `
      <button class="stock-suggestion" type="button" data-stock-option="${item.id}">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.sku)} | ${escapeHtml(item.size)} | ${escapeHtml(item.color)}</span>
      </button>
    `).join('');
    const existingItemMarkup = selectedItem ? `
      <div class="panel-tags">
        <span class="status-pill ${status.className}">${status.label}</span>
        <span>${escapeHtml(selectedItem.sku)}</span>
        <span>${escapeHtml(selectedItem.vendor)}</span>
        <span class="color-cell"><span class="color-swatch" style="background: ${escapeHtml(selectedItem.colorHex)}"></span>${escapeHtml(selectedItem.color)}</span>
      </div>
      <div class="panel-stats">
        <div>
          <span>Current stock</span>
          <strong>${escapeHtml(selectedItem.stock)}</strong>
        </div>
        <div>
          <span>Sell item record</span>
          <strong>${escapeHtml(selectedItem.sold || 0)}</strong>
        </div>
        <div>
          <span>Total handled</span>
          <strong>${escapeHtml(selectedItem.stock + (selectedItem.sold || 0))}</strong>
        </div>
      </div>
      <form class="stock-form" id="stockForm">
        <label>
          New stock count
          <input id="stockCountInput" type="number" min="0" max="999" value="${escapeHtml(selectedItem.stock)}" required>
        </label>
        <label>
          Sell item record
          <input id="soldInput" type="number" min="0" max="999" value="${escapeHtml(selectedItem.sold || 0)}" required>
        </label>
        <button class="primary-btn" type="submit">
          <span data-icon="save"></span>
          Save Stock
        </button>
      </form>
    ` : `
      <div class="history-empty-state">
        <span data-icon="package-search"></span>
        <strong>No dresses yet</strong>
        <p>Add your first real item using the form.</p>
      </div>
    `;

    return `
      <div class="panel-body stock-manager-body">
        <p class="eyebrow">Stock manager</p>
        <h2 id="stockPanelTitle">View Stock</h2>
        <div class="stock-manager-grid">
          <section class="stock-editor">
            <h3>Edit existing item</h3>
            <label>
              Search dress
              <input id="stockItemSearch" type="text" placeholder="Type dress name or SKU">
            </label>
            <div class="stock-suggestions" id="stockSuggestions">${options}</div>
            ${existingItemMarkup}
          </section>

          <section class="stock-editor">
            <h3>Add new item</h3>
            <form class="add-item-form" id="addItemForm">
              <label>
                Dress name
                <input id="newName" type="text" placeholder="Example: Velvet Mini Dress" required>
              </label>
              <label>
                SKU
                <input id="newSku" type="text" placeholder="DRS-NEW-001" required>
              </label>
              <label>
                Type
                <input id="newType" type="text" placeholder="Casual, Party, Resort" required>
              </label>
              <label>
                Size
                <input id="newSize" type="text" placeholder="S, M, L, XL" required>
              </label>
              <label>
                Color
                <input id="newColor" type="text" placeholder="Lavender" required>
              </label>
              <label>
                Color code
                <input id="newColorHex" type="color" value="#ef4f5f" required>
              </label>
              <label>
                Stock
                <input id="newStock" type="number" min="0" max="999" value="1" required>
              </label>
              <label>
                Sell item record
                <input id="newSold" type="number" min="0" max="999" value="0" required>
              </label>
              <label>
                Vendor
                <input id="newVendor" type="text" placeholder="Vendor name" required>
              </label>
              <label>
                Price
                <input id="newPrice" type="number" min="1" max="999" value="40" required>
              </label>
              <label class="image-upload-field">
                Dress image
                <input id="newImageFile" type="file" accept="image/*">
              </label>
              <div class="image-preview" id="imagePreview">
                <span data-icon="image"></span>
                <p>No image selected</p>
              </div>
              <button class="primary-btn" type="submit">
                <span data-icon="plus"></span>
                Add Item
              </button>
            </form>
          </section>
        </div>
      </div>
    `;
  }
};
