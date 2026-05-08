# Financials Formula 🔢💰

A Python-based financial analysis system that uses real-time data to compute key investment ratios, valuation metrics, and dashboard visualizations.

## Features
- 📊 PE, ROE, ROIC, Owner's Earnings
- 📉 Cash Flow, Valuation Analysis
- 📂 Load from JSON / export to CSV/XLSX
- 🧠 Built-in AI-powered stock screening (optional)

## Usage
```bash
python main.py

🔐 Setting Up Your API Key
To fetch real-time or updated financial data using the financetoolkit, you need to provide your API key securely. This is done using a .env file.

1️⃣ Create a .env File
In the root directory of your project, create a file named:

bash
.env

2️⃣ Add Your API Key
Add the following line to the .env file:
API_KEY=your_api_key_here
🔁 Replace your_api_key_here with your actual API key from the financial data provider (e.g., Financial Modeling Prep).

3️⃣ Install Required Library
Ensure you have the python-dotenv package installed so your script can load the key automatically.
pip install python-dotenv

4️⃣ Load the Key in Your Python Scrip
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("API_KEY")

if not api_key:
    raise EnvironmentError("❌ API_KEY not found. Please add it to your .env file.")



📊 NVIDIA Financial Statements (2021–2025)
This repository contains detailed financial statement data for NVIDIA Corporation (NVDA), spanning fiscal years 2021 to 2025. The data is formatted in a single JSON file: NVDA_financials.json.

📁 File Structure
The data is structured into three main sections, each corresponding to a core financial statement:

Income_statement: รายได้, ค่าใช้จ่าย, กำไร, EPS ฯลฯ

Balance_sheet: สินทรัพย์, หนี้สิน, ส่วนของผู้ถือหุ้น ฯลฯ

cash_flow_statement: กระแสเงินสดจากการดำเนินงาน, การลงทุน, และการจัดหาเงิน

Each section contains financial data indexed by fiscal year.

✅ Example:
json

{
  "Income_statement": {
    "2025": {
      "Revenue": 130497000000.0,
      "Net Income": 72880000000.0,
      "EPS": 2.97,
      ...
    }
  },
  "Balance_sheet": {
    "2025": {
      "Total Assets": 111601000000.0,
      "Total Liabilities": 32274000000.0,
      ...
    }
  },
  "cash_flow_statement": {
    "2025": {
      "Operating Cash Flow": 64089000000.0,
      "Free Cash Flow": 60853000000.0,
      ...
    }
  }
}
🧠 How to Use
You can use this data for:

📈 Financial Ratio Analysis (e.g., PE Ratio, ROA, ROIC, Cash Ratio)

🧮 Valuation Models (e.g., Warren Buffett-style intrinsic value)

📊 Dashboard & Visualization using tools like Streamlit or Excel

🧠 AI/ML Models for financial prediction or stock screening

🛠️ Tools Recommended
Python (Pandas, NumPy, Financetoolkit)

Streamlit (for dashboard)

SQLite (for structured data query and storage)

Jupyter Notebook or VS Code (for analysis)

📌 Project Ideas
Financial Ratios Calculator — PE, ROA, ROIC, Owner’s Earnings, etc.

Valuation Engine — use discounted cash flow (DCF), earnings-based valuation.

AI Screener — feed into machine learning model to classify investment attractiveness.

Financial Dashboard — visualize metrics over the 5-year period.

📂 File
NVDA_financials.json: Contains all financial statements (2021–2025)

👨‍💻 Example Usage in Python

with open("NVDA_financials.json", "r") as f:
    data = json.load(f)

income_2025 = data["Income_statement"]["2025"]
revenue = income_2025["Revenue"]
net_income = income_2025["Net Income"]

print(f"Revenue 2025: ${revenue:,.2f}")
print(f"Net Income 2025: ${net_income:,.2f}")
📞 Contact
For more advanced financial systems, reach out to the project maintainer.




