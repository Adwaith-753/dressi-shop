window.ProductCard = {
  getStatus(item) {
    if (item.stock === 0) return { label: 'Out of stock', className: 'status-out' };
    if (item.stock <= 5) return { label: 'Low stock', className: 'status-low' };
    return { label: 'Available', className: 'status-good' };
  },

  stars(count) {
    return Array.from({ length: 5 }, (_, index) => {
      const className = index < count ? 'star filled' : 'star';
      return `<span class="${className}">&#9733;</span>`;
    }).join('');
  },

  render(item) {
    const escapeHtml = window.DressiUtils?.escapeHtml || (value => String(value ?? ''));
    const status = this.getStatus(item);
    const price = item.oldPrice
      ? `<span class="old-price">$${escapeHtml(item.oldPrice)}.00</span> $${escapeHtml(item.price)}.00`
      : `$${escapeHtml(item.price)}.00`;

    return `
      <article class="product-card" data-product-card="${item.id}">
        <div class="product-image">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
          ${item.sale ? '<span class="sale-badge">Sale</span>' : ''}
        </div>
        <div class="product-body">
          <h2>${escapeHtml(item.name)}</h2>
          <div class="rating" aria-label="${escapeHtml(item.rating)} out of 5 stars">${this.stars(item.rating)}</div>
          <p class="price">${price}</p>
          <div class="stock-line">
            <span class="status-pill ${status.className}">${status.label}</span>
            <span>${escapeHtml(item.stock)} pcs</span>
          </div>
          <div class="dress-meta">
            <span>${escapeHtml(item.size)}</span>
            <span class="color-cell"><span class="color-swatch" style="background: ${escapeHtml(item.colorHex)}"></span>${escapeHtml(item.color)}</span>
          </div>
          <button class="outline-btn" type="button" data-add-cart="${item.id}" ${item.stock === 0 ? 'disabled' : ''}>
            ${item.stock === 0 ? 'Out of stock' : 'Add to cart'}
          </button>
        </div>
      </article>
    `;
  }
};
