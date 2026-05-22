# Dressi Stock Checker

Static dress stock, cart, order history, and invoice website.

## Folder Structure

- `index.html` - main page
- `assets/css/styles.css` - website styling
- `assets/js/app.js` - main website logic
- `assets/js/dresses.js` - dress stock data
- `components/` - reusable UI renderers
- `images/` - local dress images

## Hosting

This project can be hosted free on GitHub Pages because it is a static website.

## Storage

The current app stores added dresses, uploaded images, stock changes, and order history in the browser using `localStorage`.
That works for a single shop/admin browser and survives refreshes.

For a real customer-facing hosted site where every customer sees the same products and orders go to the shop, connect a backend database and image storage service such as Supabase, Firebase, or a custom API.
