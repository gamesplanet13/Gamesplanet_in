# Games Planet — gamesplanet.in

A new Games Planet storefront inspired by the requested Chiptrades product-page design, with the familiar category-first flow of the owner's MyDukaan shop. Built from current GitHub catalog snapshots with the owner's logo and contact details.

## Website

- `dist/`: deployable static website. No build step.
- `wordpress/games-planet/`: installable WordPress theme source.
- `deliverables/START-HERE-WordPress.html`: Hindi WordPress.com, GoDaddy DNS and catalog setup guide.
- `deliverables/GamesPlanet-WordPress-Theme.zip`: upload only this ZIP in Appearance → Themes.
- `deliverables/GamesPlanet-WooCommerce-Products.csv`: optional editable WooCommerce catalog import, 273 parent listings plus 22 variations.

## Behavior

Category pages, full product pages with zoom galleries, quantity and variants, specifications, FAQs, product search and sorting, saved products, recently viewed products, delivery enquiry and a browser-local shopping bag and a customer-reviewed WhatsApp enquiry. No payment gateway, OTP authentication, automatic confirmed orders, or migrated order backend. Existing configurators and business tools open their original pages; their carts and databases remain separate. On WordPress, WooCommerce account links are used when the plugin is active. WordPress catalog mode must be enabled explicitly after a completed import. In this mode WooCommerce native product URLs use the same product layout. PIN checks validate the format and prepare a WhatsApp enquiry; they do not claim live courier serviceability.

## Sources and maintenance

62 repositories inventoried. 59 non-empty repositories fetched from their current default branch; 3 empty repositories accounted for. The primary retail catalog is `gamesplanet13/arcade-accessories-`; distinct products added from `Products`. Older `data` master fills exact-match missing dimensions/weight, not current retail prices. Seven exact-name price conflicts are recorded in `deliverables/price-conflicts.json`. Out-of-stock exclusions follow original stock rules.

`dist/catalog.json` and `dist/catalog-data.js` are a snapshot, not an unattended GitHub sync. WordPress can instead read editable WooCommerce products after import. Review prices and stock before launching. Missing exact photos use an explicit placeholder. The static source contains no customer database, invoice archive, API keys or backend credentials.

## Validation

JavaScript syntax checked. Browser QA covers category navigation, search, multi-category shopping bag and product variant selection. WordPress PHP and WooCommerce import still require installation testing on the target WordPress.com site. Domain DNS has not been changed by this project.
