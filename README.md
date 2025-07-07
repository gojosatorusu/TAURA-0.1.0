# Taura - Business Management System

A comprehensive business management system specifically designed for laboratories and manufacturing facilities. Taura provides complete control over your operations with advanced security, intuitive interfaces, and powerful analytics.

## 🔐 Security

Built with enterprise-grade security technologies and encryption protocols for maximum protection of your business data.

## 🌐 Multi-Language Support

- English
- French

## 📊 Core Features

### 💰 Treasury Management
Complete financial tracking and management system:
- **Deposit & Withdrawal**: Full transaction management with extensive configuration options
- **Automatic Tracking**: 
  - Initial monthly balance
  - Current balance
  - Total income
  - Total expenditure
  - Automatic archive creation
- **Financial Archive**: Historical transaction records with automated organization

### 📦 Stock Management

#### Raw Materials Tracking
Advanced inventory management with visual analytics:
- **Stock Health Dashboard**: 
  - Interactive pie chart showing quantity/threshold ratios
  - Visual classification: Critical, Warning, Safe items
  - Interactive bar charts highlighting most critical items
- **Smart Grid System**:
  - Comprehensive raw material data display
  - Search functionality by name
  - Sortable columns (ascending/descending)
  - Intuitive pagination system
- **Easy Material Creation**:
  - Add new raw materials with name, initial quantity, threshold, unit price
  - Vendor/supplier selection
  - Detailed material modification including loss adjustments

#### Final Products Management
Sophisticated product inventory system:
- **Visual Analytics**:
  - Double bar chart comparing quantity vs threshold
  - Most Critical Items analysis
  - **Product Timeline Analysis**: Weekly, fortnightly, monthly, quarterly, semi-annual, and yearly stock variations using area charts
- **Product Creation**:
  - Custom product recipes with raw material specifications
  - Quantity and pricing management
  - **Smart Production System**: Real-time production planning with available raw materials analysis
- **Intelligent Production Features**:
  - **Real-time Production Calculator**: Automatically calculates maximum producible units based on current raw material stock
  - **Material Availability Display**: Shows remaining quantities of each recipe component
  - **Dynamic Updates**: All calculations update in real-time as stock changes
  - **Recipe Management**: Modify and update product recipes directly from product details
- **Stock Analysis Tool**:
  - Date-range analysis between any two dates
  - Comprehensive reporting: initial quantity, production, manual adjustments, sales, returns, final stock value
  - Direct printing functionality

### 👥 Client & Vendor Management
Complete relationship management system:
- **Client Management**:
  - Client statistics dashboard
  - Outstanding balance tracking
  - Contact information (name, location, phone, commercial register)
  - Regional classification with auto-complete suggestions
- **Vendor Management**: 
  - Same comprehensive features as client management
  - Vendor performance tracking
- **Individual Profiles**:
  - Detailed client/vendor profiles
  - Financial deal reports by year
  - Payment history with filtering options (year, document type, payment status)
  - Edit, delete, and print functionality

### 💼 Sales & Purchases

#### Sales Management
Advanced sales tracking and processing:
- **Sales Dashboard**: Comprehensive sales statistics and analytics
- **Document Management**:
  - Document codes with sequential numbering
  - Multiple document types (BL, Invoice)
  - Payment status tracking
  - Approval/cancellation status
- **Advanced Filtering**: Filter by client, document type, year, month, payment status, and code
- **Sales Creation Process**:
  - Client selection
  - Document type and code assignment (with sequential code preservation)
  - Customizable fields (discount for BL, payment method for Invoice)
  - Product selection with integer quantities
  - Automatic total calculation with discount application

#### Purchase Management
Mirror functionality for purchase operations:
- Same comprehensive features as sales management
- Raw material quantities with decimal precision support
- Vendor-specific processing

### 💳 Payment System
Flexible payment processing:
- **Partial Payments**: Multiple payments across different dates and amounts
- **Current Month Restriction**: Payment modifications limited to current month for data integrity
- **Clear Functionality**: One-click payment clearing for remaining balances
- **Smart Validation**: Prevents modifications that would create inconsistencies

### 📋 Document Management
Professional document handling:
- **Finalization System**: 
  - Locks unit prices at transaction time
  - Prevents retroactive price changes affecting finalized documents
  - One-time finalization process
- **Cancellation vs Deletion**:
  - **Delete**: Only allowed for latest transactions, completely removes record
  - **Cancel**: Marks as cancelled while preserving record integrity
  - **Returns Processing**: Cancelled purchases enable printing of "Facture d'avoir" for official return documentation
  - Both operations automatically restore stock and payments
- **Numbering Systems**:
  - **Invoices**: Global sequential numbering
  - **BLs**: Client-specific sequential numbering

### 🔔 Notifications & Monitoring
Real-time system monitoring:
- **Critical Items Alerts**: Automatic notifications for low stock items
- **Comprehensive History Log**: 
  - Detailed action logging with before/after states
  - Categorical and time-based filtering
  - Complete timestamp tracking
  - Change tracking for all system modifications

### 🤖 AI Chat Assistant
Integrated AI-powered assistance:
- **Local Processing**: Uses Ollama with Mistral 7B model for data privacy
- **Contextual Intelligence**: 
  - Cash flow analysis
  - Regional sales data
  - Product profitability analysis
  - Top customers insights
  - Vendor performance metrics
  - Critical stock alerts
  - Product demand analysis
  - Supplier regional data
  - Credit risk assessment
  - Production analytics

### ⚙️ Settings & Configuration
Comprehensive system configuration:
- **Language Selection**: Switch between English and French
- **Account Management**: User account information and password management
- **About Section**: Access to comprehensive documentation and user guides
- **Migration Mode**: 
  - **Safe Data Entry**: Enter historical data without affecting current stock/treasury
  - **One-time Switch**: Permanent transition from migration to live mode
  - **Data Integrity**: Protects current operations during data migration

### 📝 Notes & Documentation
Built-in note-taking system:
- **Personal Notes**: Create and manage personal reminders
- **Entity Linking**: Link notes to specific sales, products, or other entities
- **Smart Filtering**: Filter notes by linked entities
- **Quick Access**: Easy note management for operational efficiency

## 🚀 Getting Started

### System Requirements
- Compatible with laboratory and manufacturing environments
- Supports multi-user operations
- Cross-platform support (Windows, macOS, Linux)
- Requires local setup for AI features (Ollama with Mistral 7B)

### Purchasing & Setup
Taura is a premium business management solution. Contact us for licensing and deployment options.

### Initial Configuration
1. **Enable Migration Mode**: Start with migration mode active
2. **Import Historical Data**: Safely enter existing business data
3. **Configure Settings**: Set language preferences and account details
4. **Disable Migration Mode**: Switch to live operations mode
5. **Start Operations**: Begin using all features with live data

## 🔧 Technical Features

### Security
- **Enterprise-grade Encryption**: Advanced cryptographic protection for all data
- **Secure Authentication**: Multi-layer user authentication and authorization
- **Data Protection**: Local data storage with encrypted databases (SQLCipher)

### Performance
- **Efficient Pagination**: Smooth navigation through large datasets
- **Optimized Queries**: Fast data retrieval and processing
- **Responsive UI**: Interactive charts and real-time updates

### Data Integrity
- **Automatic Validation**: Prevents inconsistent data entry
- **Sequential Numbering**: Maintains proper document sequencing
- **Audit Trail**: Complete change tracking and history

## 📈 Analytics & Reporting

### Visual Analytics
- Interactive pie charts for stock health
- Bar charts for critical item identification
- Area charts for timeline analysis
- Double bar charts for comparative analysis

### Reporting Tools
- Printable stock analysis reports
- Financial deal summaries
- Client/vendor performance reports
- Historical transaction reports

## 🔄 Workflow Integration

### Stock Management Flow
1. **Raw Materials**: Purchase → Stock → Production
2. **Production**: Recipe-based conversion of raw materials to products
3. **Sales**: Product inventory → Customer delivery
4. **Tracking**: Automatic stock updates and threshold monitoring

### Financial Flow
1. **Treasury Management**: Track all financial movements
2. **Sales Processing**: Generate invoices and delivery notes
3. **Payment Processing**: Handle partial payments and settlements
4. **Reporting**: Comprehensive financial analytics

## 🎯 Target Industries

- **Laboratories**: Research and testing facilities
- **Manufacturing**: Production and assembly operations
- **Quality Control**: Compliance and testing environments
- **Small to Medium Enterprises**: Comprehensive business management

## 📞 Support & Documentation

For comprehensive documentation and user guides, access the **About** section within the application settings.

## 📄 License

**Copyright © 2025 Guendouz Ahmed Fateh**

This is proprietary software. All rights reserved. Unauthorized copying, distribution, or modification is strictly prohibited.

## 🔄 Version History

**Current Version**: 0.1.0
- Initial release with full feature set
- Cross-platform compatibility
- Enterprise security implementation

---

**Taura** - Professional business management solution for laboratories and manufacturing facilities.

*Developed by Guendouz Ahmed Fateh*
