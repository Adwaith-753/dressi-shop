window.ShopControls = {
  showShop(els, renderProducts) {
    els.homePage.classList.add('hidden');
    els.shopPage.classList.remove('hidden');
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  showHome(els) {
    els.shopPage.classList.add('hidden');
    els.homePage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
