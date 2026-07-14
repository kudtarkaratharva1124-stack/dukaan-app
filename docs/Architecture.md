# Architecture & Build Progress

## Build order
Following the exact folder order given in the project spec, top to bottom.

## ✅ Done
- Root: README.md, .gitignore, docker-compose.yml, .env.example
- frontend/: package.json, vite.config.js, index.html
- frontend/public/: manifest.json, robots.txt, offline.html (favicon.ico + icons/*.png are binary — placeholders only, drop real assets in)
- frontend/src/: main.jsx, App.jsx
- frontend/src/assets/: empty folders scaffolded (logo, icons, illustrations, images, sounds, animations) — no binary content generated
- frontend/src/components/layout/: Sidebar.jsx, Navbar.jsx, Header.jsx, Footer.jsx, PageContainer.jsx — ALL DONE
- frontend/src/components/ui/: Button.jsx, Card.jsx, Modal.jsx, Input.jsx, Table.jsx, Badge.jsx, Loader.jsx, Toast.jsx, SearchBox.jsx, Pagination.jsx — ALL DONE

## ⏭️ Next (resume here, in this order)
1. `frontend/src/components/scanner/` — BarcodeScanner.jsx, CameraView.jsx, ScanOverlay.jsx, FlashButton.jsx, CameraSelector.jsx
2. `frontend/src/components/charts/`, `invoices/`, `inventory/`, `orders/`, `khata/`, `analytics/` — subcomponents (not individually named in spec, will build as needed per page)
3. `frontend/src/pages/` — Login, Signup, Dashboard, Inventory, Scanner, Orders, Billing, Khata, Analytics, Customers, Suppliers, Expenses, Reports, Settings, Subscription, AIRecognition, NotFound
4. `frontend/src/routes/` — Router.jsx, ProtectedRoute.jsx, PublicRoute.jsx
5. `frontend/src/context/` — AuthContext.jsx, ThemeContext.jsx, ShopContext.jsx, NotificationContext.jsx (referenced already by main.jsx — needed before app will actually run)
6. `frontend/src/hooks/` — useAuth.js, useScanner.js, useInventory.js, useOrders.js (useAuth already referenced by Navbar.jsx)
7. `frontend/src/services/` — api.js, auth.service.js, inventory.service.js, order.service.js, scanner.service.js, payment.service.js, ai.service.js, report.service.js
8. `frontend/src/utils/` — helpers.js, constants.js, validators.js, currency.js, dates.js, permissions.js
9. `frontend/src/styles/` remaining — global.css and variables.css are done; still need dashboard.css, scanner.css, inventory.css, auth.css, mobile.css, animations.css
10. Then `api/` (package.json → Dockerfile → .env.example → src/index.js → app.js → config → controllers → routes → middleware → services → models → validators → utils → db → jobs → uploads)
11. Then `database/` (migrations, seeds, schema.sql)
12. Then `docs/` (API.md, Deployment.md — Architecture.md is this file)

## Important note
`main.jsx` and `Navbar.jsx` already import from `context/` and `hooks/` that don't exist yet — the app won't build/run until step 5 and 6 above are done. Don't try to `npm run dev` until then.
