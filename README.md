# MS Store - Smart Retail POS & Inventory Management App

A modern full-stack web application designed for retail shops featuring Point of Sale (POS) billing, real-time inventory and stock tracking, comprehensive Profit & Loss (P&L) analytics, and interactive **3D visual effects**.

---

## 🌟 Key Features

### 1. ⚡ Fast & Simple POS Billing
- **Interactive Product Catalog**: Search by product name or SKU/barcode with instant category filtering.
- **Stock Availability Badges**: Clear visual badges on each product showing current stock count (`48 pcs`, `Low stock alert`, or `Out of stock`).
- **Live Cart & Register**: Add items, adjust quantities (`+` / `-`), apply fixed or percentage discounts, and select payment methods (Cash, UPI/QR, Card, Store Credit).
- **Printable Invoices**: Generates instant itemized receipts with invoice numbers, store headers, customer info, and automatic print dialog support (`window.print()`).
- **Discreet Profit Indicator**: Shows the shop owner estimated net profit per sale in real time.
- **Celebration Effects**: Confetti fireworks upon completing an order.

### 2. 📦 Updatable Stock & Inventory Management
- **Instant Quick-Stock Adjustment**: One-click `+1`, `+5`, and `-1` buttons directly on the inventory list for lightning-fast restocking without opening dialogs.
- **Custom Restock Modal**: Replenish inventory with shipment notes, vendor batch tracking, or manual inventory audit adjustments.
- **Full Product CRUD**: Add new products with SKU auto-generator, custom units, cost price, selling price, and emoji icons.
- **Low Stock & Out-of-Stock Alerts**: Automatic warning triggers when stock drops below threshold.
- **3D Warehouse Visualizer**: An interactive 3D digital warehouse bay rendered with Three.js. Crate stack heights reflect stock levels with color coding (Green = Healthy, Amber = Low, Red = Empty). Click any crate in 3D to manage stock!

### 3. 📈 Real-Time Profit & Loss (P&L) Analytics
- **Total Revenue & Sales**: Tracks gross sales and net revenue.
- **Cost of Goods Sold (COGS)**: Automatically computes total cost of products sold based on purchase prices.
- **Net Profit & Net Margin**: Instant calculation of net profit and margin percentage (`%`).
- **Interactive Visual Charts**: Daily revenue vs daily profit trend bars with hover data tooltips.
- **Top Profit Drivers**: Identifies top products contributing the highest net earnings.
- **Full Invoices History**: Detailed breakdown of every bill generated, revenue, cost, profit, and printable receipt preview.

### 4. 🎨 3D Visual Effects & Modern UX
- **Three.js 3D Store Core**: Glowing interactive 3D crystal hub with orbiting product cubes and particle rings.
- **3D Warehouse Model**: Interactive 3D scene displaying inventory shelves and pallets with 360° mouse orbit.
- **Dynamic 3D Tilt Cards**: Realistic mouse-following 3D perspective tilt with specular shine highlight.
- **Responsive & Dark-Themed**: Sleek glassmorphism aesthetic optimized for laptops, tablets, and desktop POS terminals.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Running the Full-Stack Application

From the root directory (`c:\Users\PC\Desktop\MS_STORE`):

```bash
# Start both backend server (port 5000) and frontend (port 5173) concurrently:
npm run dev
```

Then open your browser at:
**[http://localhost:5173](http://localhost:5173)**

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js & Express.js
- **Database**: SQLite (`better-sqlite3`) with WAL mode for speed and atomic ACID transactions
- **Frontend**: React 19, Vite, Tailwind CSS v4
- **3D Engine**: Three.js (WebGL rendering, raycasting, interactive lighting)
- **Icons & UI**: Lucide React, Canvas Confetti
