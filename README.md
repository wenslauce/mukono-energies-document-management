# Mukono Energies Document Management

A comprehensive document management system built for Mukono Energies Limited, Uganda.

![Mukono Energies](public/logo.png)

## Overview

Efficiently manage business documents, invoices, and receipts in one place. This application streamlines document workflows, from creation to tracking, with a modern and intuitive interface.

## Features

- **Comprehensive Document Management**
  - Invoices & Tax Invoices
  - Receipts (Standard, Sales, Cash)
  - Quotes & Estimates
  - Credit Notes & Memos
  - Purchase Orders
  - Delivery Notes

- **Modern UI/UX**
  - Glassmorphism design with frosted glass effects
  - Animated transitions with Framer Motion
  - Responsive design for all devices
  - Dark/Light mode support

- **Smart Business Logic**
  - Automatic tax calculations
  - Standardized payment instructions
  - Customer management with quick selection
  - Customizable document templates

- **Powerful Dashboard**
  - Document metrics and analytics
  - Recent activity tracking
  - Status-based filtering
  - Full-text search capabilities

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI Components**: Shadcn UI, Radix UI, Tailwind CSS
- **Animation**: Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd mukono-energies
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Configure environment variables
```bash
cp .env.example .env.local
```
Edit `.env.local` with your Supabase credentials.

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

The application is optimized for deployment on Vercel:

```bash
npm run build
# or
yarn build
```

## License

This software is proprietary and restricted for use by Mukono Energies Limited, Uganda only. Unauthorized use, modification, or distribution is strictly prohibited.

## Author

Wenslauce Chengo

---

© 2023-2024 Mukono Energies Limited. All Rights Reserved. 