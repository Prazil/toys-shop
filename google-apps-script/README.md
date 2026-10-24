# Google Sheets Apps Script — Order Sync, Customer Email & WhatsApp Dispatcher

This Google Apps Script connects your **Giggle & Bloom Kids Gift Shop** directly to a Google Sheet. It automatically:
1. **Records Order Details**: Captures all 25 customer, product, and shipping columns.
2. **Prevents Duplicates**: When an order status updates (e.g., from *Payment Verified* to *Shipped*), it updates the existing row in place instead of creating duplicates.
3. **Sends Real Customer Emails**: Dispatches rich HTML order confirmation emails using Google's native `MailApp` (100% Free).
4. **Sends WhatsApp Notifications**: Dispatches rich, emoji-formatted WhatsApp order updates directly to customer phones!
5. **Interactive Sheet Menu**: Adds a custom **`🎁 Giggle & Bloom Actions`** menu in Google Sheets with 1-click WhatsApp customer chat links.

---

## 🚀 Quick Setup Instructions (5 Minutes)

### Step 1: Create a New Google Sheet
1. Go to [sheets.new](https://sheets.new) in your browser.
2. Name your spreadsheet **"Giggle & Bloom Orders"**.

### Step 2: Open the Apps Script Editor
1. In the top menu, click **Extensions** > **Apps Script**.
2. Rename the project to **"Gift Shop Order Dispatcher"**.

### Step 3: Configure WhatsApp Provider in `Code.gs`
1. Delete any sample code inside `Code.gs`.
2. Open [`Code.gs`](./Code.gs) from this folder, copy all contents, and paste them into the editor.
3. In `CONFIG` at the top, choose your WhatsApp Provider:
   - **Option 1: Twilio WhatsApp (`TWILIO_WHATSAPP`)**:
     - Register free at [twilio.com/try-twilio](https://www.twilio.com/try-twilio) (gives **$15.50 USD** free trial credit).
     - Enter your `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` (`whatsapp:+14155238886`).
   - **Option 2: CallMeBot (`CALLMEBOT`) — 100% Free Forever**:
     - 1-minute setup: Add `+34 911 06 43 03` to phone contacts as "CallMeBot".
     - Send `I allow callmebot to send me messages` to that contact on WhatsApp.
     - CallMeBot sends you your free API key in 10 seconds!
   - **Option 3: UltraMsg (`ULTRAMSG`)**:
     - Connect your own personal or business WhatsApp number by scanning a QR code on [ultramsg.com](https://ultramsg.com).
   - **Option 4: Direct WhatsApp Link (`DIRECT_WA`)**:
     - Zero API keys needed! Generates official 1-click `wa.me` links for instant chat.
4. Click the **Save** icon (💾) or press `Ctrl + S`.

### Step 4: Deploy as a Web App
1. Click the blue **Deploy** button (top right) > **New deployment**.
2. Click the gear icon (⚙️) next to "Select type" and choose **Web app**.
3. Configure the deployment settings:
   - **Description**: `Order Webhook & Notification Dispatcher`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` *(Crucial: Allows your shop backend to send POST webhooks without requiring Google login)*
4. Click **Deploy**.
5. Click **Authorize access** when prompted and grant permissions to send emails and connect to external services.
6. Copy the **Web app URL** (it looks like: `https://script.google.com/macros/s/AKfycbx.../exec`).

### Step 5: Connect to Your Shop Admin Panel
1. Open your shop admin at `http://localhost:5000/admin`.
2. Go to **Settings** > **Google Sheets 24-Col Sync**.
3. Paste your Web app URL into the **Google Apps Script Webhook URL** field.
4. Set **Automated Webhook Sync** to `Live Real-Time Webhook Dispatch`.
5. Click **Save Sheets Settings**.

---

## 📋 The 25 Tracked Columns

| # | Column Header | Description |
|---|---|---|
| 1 | **Order ID** | Unique ID (e.g., `GS-2026-000005`) — Used as Key to update in place |
| 2 | **Order Date** | Order placement date and time |
| 3 | **Customer Name** | Full name of parent / customer |
| 4 | **Phone** | 10-digit mobile number |
| 5 | **Email** | Customer email address |
| 6 | **House Number** | Flat / Door / House number |
| 7 | **Street** | Street name / Road |
| 8 | **Area** | Locality / Colony |
| 9 | **City** | City name |
| 10 | **District** | District name |
| 11 | **State** | State |
| 12 | **PIN Code** | 6-digit postal code |
| 13 | **Landmark** | Nearby landmark |
| 14 | **Products** | Semicolon-separated product names with quantities |
| 15 | **Quantity** | Total items in order |
| 16 | **Subtotal** | Base items price |
| 17 | **Discount** | Savings applied |
| 18 | **Total Amount** | Total amount paid |
| 19 | **Payment ID** | UPI UTR / Transaction reference |
| 20 | **Payment Method** | UPI / Gateway |
| 21 | **Payment Status** | Verified / Pending |
| 22 | **Order Status** | Payment Verified, Accepted, Processing, Packed, Shipped, Delivered |
| 23 | **Tracking Number** | Courier tracking number |
| 24 | **Created At** | Timestamp |
| 25 | **Updated At** | Last status transition timestamp |

---

## 🎁 Spreadsheet Custom Menu Actions

When you open your Google Sheet, you will see a new menu: **`🎁 Giggle & Bloom Actions`**:
* **✨ Format & Initialize Headers**: Instantly creates the colorful pink/coral header row, freezes row 1, and auto-resizes all columns.
* **✉️ Send Email for Active Row**: Select any row in the spreadsheet and click this to immediately dispatch an order email to that customer.
* **📱 Send SMS for Active Row**: Immediately dispatches an SMS to the phone number in that row via Fast2SMS.
* **🚀 Send Email + SMS for Active Row**: Triggers both email and SMS at once.
* **🧪 Test with Sample Order**: Appends a sample order and sends a test email to your own Google account to verify everything works!
