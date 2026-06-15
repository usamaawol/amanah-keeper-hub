# 📚 Amanah Library System

A modern AI-powered Library Management System built to simplify book borrowing, tracking, reservations, and reader management.

🔗 Live Demo: https://amanahkeeper.vercel.app/

---

## Overview

Amanah Library System is a mobile-first Progressive Web Application (PWA) designed for libraries, schools, Islamic centers, organizations, and individual book collections.

The system helps library owners track borrowed books, manage reader records, monitor returns, maintain complete borrowing history, and interact with library data using an intelligent AI assistant.

Built with modern web technologies, the application provides an offline-first experience while maintaining secure cloud synchronization.

---

## Features

### 📖 Borrowing Management

* Create borrowing records
* Track borrowed books
* Track returned books
* Automatic return date assignment
* Borrower information management
* Expected return date tracking
* Permanent borrowing history

### 👤 Reader Profiles

Each borrower automatically receives a profile containing:

* Borrowing history
* Currently borrowed books
* Returned books
* Reading statistics
* Activity records

### 📚 Reservation Queue

If a book is currently unavailable:

* Readers can be added to a waiting list
* Reservations are tracked automatically
* Queue order is maintained

### 🔔 Smart Notifications

The system generates notifications for:

* New borrowings
* Returned books
* Upcoming return dates
* Overdue books
* Reservation updates

### 🤖 AI Assistant

The integrated AI Assistant can answer natural language questions about library records.

Examples:

**English**

* Who borrowed Bulugh al-Maram?
* Has Ahmed returned the book?
* Show overdue books.

**Arabic**

* من أخذ بلوغ المرام؟
* هل أعاد أحمد الكتاب؟
* ما هي الكتب المتأخرة؟

Features:

* Context-aware conversations
* Conversation history
* Natural language search
* Library data analysis
* Multi-language support

### 💬 AI Conversation Memory

The AI remembers conversation context.

Example:

User:
Who borrowed Bulugh al-Maram?

AI:
Ahmed Mohammed Ali.

User:
When did he borrow it?

AI understands that "he" refers to Ahmed and continues naturally.

---

## 🌍 Multi-Language Support

Supported Languages:

* English
* Arabic

Features:

* Automatic language detection
* Arabic RTL support
* Seamless language switching
* Localized interface

---

## 📱 Progressive Web App (PWA)

Amanah Library System is installable on:

* Android
* iPhone
* Tablets
* Desktop computers

Benefits:

* Native-app-like experience
* Fast loading
* Offline access
* Home screen installation

---

## 📴 Offline-First Architecture

Core functionality remains available without internet access.

Available Offline:

* Dashboard
* Borrow records
* Reader profiles
* Notifications
* History

When internet returns:

* Data automatically synchronizes
* Records remain consistent across devices

---

## 🔐 Authentication & Security

Authentication powered by Firebase Authentication.

Supported Login Methods:

* Google Sign-In

Security Features:

* Private user workspaces
* User-level data isolation
* Secure cloud storage
* Protected API access

Each user can only access their own library records.

---

## 👑 Super Admin System

The platform includes a Super Admin dashboard.

Capabilities:

* View all registered users
* Monitor platform activity
* Access system statistics
* Manage user accounts
* View audit logs

Normal users cannot access administrative data.

---

## 📊 Dashboard Features

The dashboard provides real-time insights:

* Active Borrowings
* Returned Books
* Overdue Books
* Reservations
* Total Readers
* Recent Activity

---

## 🕒 Activity Timeline

Every action is permanently recorded.

Examples:

June 1

* Ahmed borrowed Bulugh al-Maram

June 12

* Ahmed returned Bulugh al-Maram

June 15

* Mohammed borrowed Bulugh al-Maram

The history is never removed.

---

## ⚡ Technology Stack

### Frontend

* React
* TypeScript
* Tailwind CSS
* Vite

### Backend & Services

* Firebase Authentication
* Firebase Firestore
* Firebase Hosting Services

### AI Integration

* OpenRouter API
* Large Language Models

### PWA

* Service Workers
* Offline Caching
* Installable Web App

---

## Architecture

The application follows a multi-tenant architecture.

Each authenticated user receives:

* Private dashboard
* Private records
* Private AI conversations
* Private reservations
* Private notifications

User data is fully isolated.

---

## Security Rules

The system implements:

* User ownership validation
* Authentication checks
* Role-based access control
* Super Admin permissions
* Audit logging

---

## Use Cases

Amanah Library System can be used by:

* Islamic Libraries
* Schools
* Universities
* Masjids
* Community Centers
* Personal Book Collections
* Educational Institutions

---

## Future Enhancements

Planned improvements:

* Afaan Oromo support
* Email notifications
* WhatsApp notifications
* Advanced reporting
* Analytics dashboard
* Native mobile applications
* Barcode & QR code support
* Multi-library administration

---

## Author

Developed by **Usama Awol**

---

## Live Demo

https://amanahkeeper.vercel.app/

---

## License

This project is intended for educational and practical library management purposes.

All rights reserved.
