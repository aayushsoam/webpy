import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Script from 'next/script'

declare global {
  interface Window {
    loadPyodide: any;
  }
}

export default function Home() {
  const [code, setCode] = useState(`# Example: Matplotlib Graph
import matplotlib.pyplot as plt
import numpy as np

# Create sample data
x = np.linspace(0, 2*np.pi, 100)
y1 = np.sin(x)
y2 = np.cos(x)

# Create the plot
plt.figure(figsize=(10, 6))
plt.plot(x, y1, 'b-', label='sin(x)', linewidth=2)
plt.plot(x, y2, 'r--', label='cos(x)', linewidth=2)

plt.title('Sine and Cosine Functions')
plt.xlabel('X (radians)')
plt.ylabel('Y')
plt.legend()
plt.grid(True)
plt.show()

print("Graph generated successfully!")`)

  const [output, setOutput] = useState('Loading Pyodide... Please wait...')
  const [isLoading, setIsLoading] = useState(false)
  const [plotImage, setPlotImage] = useState('')
  const [packageName, setPackageName] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)
  const [installedPackages, setInstalledPackages] = useState<string[]>(['numpy', 'matplotlib', 'pandas'])
  const pyodideRef = useRef<any>(null)

  // Pyodide initialize karne ka function
  const initializePyodide = async () => {
    try {
      const pyodide = await window.loadPyodide()

      // Required packages install karte hain
      await pyodide.loadPackage(["numpy", "matplotlib", "pandas"])

      // Matplotlib ko web ke liye configure karte hain
      await pyodide.runPython(`
import matplotlib
matplotlib.use('agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import io
import base64

def show_plot():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    buf.seek(0)
    img_data = base64.b64encode(buf.read()).decode()
    buf.close()
    plt.close()
    return img_data
      `)

      pyodideRef.current = pyodide
      setOutput('Pyodide loaded successfully! Ready to run Python code.')
    } catch (error) {
      setOutput('Error loading Pyodide: ' + error)
    }
  }

  // Component mount hone par Pyodide initialize karte hain
  useEffect(() => {
    initializePyodide()
  }, [])

  // Code run karne ka function
  const runCode = async () => {
    if (isLoading || !pyodideRef.current) return

    if (!code.trim()) {
      setOutput('Please enter some Python code to run.')
      return
    }

    setIsLoading(true)
    setOutput('Executing code...\n')
    setPlotImage('')

    try {
      const pyodide = pyodideRef.current

      // Output capture karne ke liye
      await pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
      `)

      // User ka code run karte hain
      await pyodide.runPython(code)

      // Output capture karte hain
      const stdout = await pyodide.runPython("sys.stdout.getvalue()")
      const stderr = await pyodide.runPython("sys.stderr.getvalue()")

      // Check if matplotlib plot was created
      let hasPlot = false
      try {
        const plotCheck = await pyodide.runPython(`
plt.get_fignums() if 'plt' in globals() else []
        `)
        hasPlot = plotCheck.length > 0
      } catch (e) {
        // No matplotlib usage
      }

      // Output display karte hain
      let result = ''
      if (stdout) result += stdout
      if (stderr) result += 'Errors:\n' + stderr
      if (!result && !hasPlot) result = 'Code executed successfully (no output)'

      setOutput(result)

      // Agar plot hai to display karte hain
      if (hasPlot) {
        try {
          const imgData = await pyodide.runPython('show_plot()')
          setPlotImage(imgData)
        } catch (plotError) {
          setOutput(prev => prev + '\nError displaying plot: ' + plotError)
        }
      }

    } catch (error) {
      setOutput('Error: ' + error.toString())
    } finally {
      // Reset stdout/stderr
      await pyodideRef.current.runPython(`
import sys
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
      `)
      setIsLoading(false)
    }
  }

  const clearOutput = () => {
    setOutput('')
    setPlotImage('')
  }

  const clearCode = () => {
    setCode('')
  }

  const loadExample = (type: string) => {
    const examples: {[key: string]: string} = {
      'basic': `# Basic Python Example
print("Hello from Pyodide!")
print("Python version:", __import__('sys').version)

numbers = [1, 2, 3, 4, 5]
print("Numbers:", numbers)
print("Sum:", sum(numbers))
print("Average:", sum(numbers) / len(numbers))

text = "Python is awesome!"
print("Text:", text)
print("Uppercase:", text.upper())`,

      'matplotlib': `# Matplotlib Graph Example
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2*np.pi, 100)
y1 = np.sin(x)
y2 = np.cos(x)

plt.figure(figsize=(10, 6))
plt.plot(x, y1, 'b-', label='sin(x)', linewidth=2)
plt.plot(x, y2, 'r--', label='cos(x)', linewidth=2)

plt.title('Sine and Cosine Functions')
plt.xlabel('X (radians)')
plt.ylabel('Y')
plt.legend()
plt.grid(True)
plt.show()
print("Graph generated!")`,

      'numpy': `# NumPy Array Operations
import numpy as np

arr1 = np.array([1, 2, 3, 4, 5])
arr2 = np.array([6, 7, 8, 9, 10])

print("Array 1:", arr1)
print("Array 2:", arr2)
print("Sum:", arr1 + arr2)
print("Product:", arr1 * arr2)

matrix = np.random.random((3, 3))
print("\\nRandom 3x3 matrix:")
print(matrix)`,

      'pandas': `# Pandas DataFrame Example
import pandas as pd

data = {
    'Name': ['Alice', 'Bob', 'Charlie'],
    'Age': [25, 30, 35],
    'City': ['New York', 'London', 'Tokyo']
}

df = pd.DataFrame(data)
print("DataFrame:")
print(df)
print("\\nAverage Age:", df['Age'].mean())`,
      'analytics': `# ✅ Business Analytics Dashboard
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# ✅ Generate sample business data
np.random.seed(42)
categories = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail']
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

# Create revenue data
revenue_data = []
for month in months:
    for category in categories:
        revenue = np.random.randint(50, 200)
        profit = revenue * np.random.uniform(0.1, 0.3)
        revenue_data.append([month, category, revenue, profit])

df = pd.DataFrame(revenue_data, columns=['Month', 'Category', 'Revenue', 'Profit'])

# ✅ Create visualizations
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))

# Revenue by Category
category_revenue = df.groupby('Category')['Revenue'].sum()
ax1.bar(category_revenue.index, category_revenue.values, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'])
ax1.set_title('Total Revenue by Category', fontsize=14, fontweight='bold')
ax1.set_ylabel('Revenue (Million $)')
ax1.tick_params(axis='x', rotation=45)

# Monthly Revenue Trend
monthly_revenue = df.groupby('Month')['Revenue'].sum()
ax2.plot(monthly_revenue.index, monthly_revenue.values, marker='o', linewidth=3, color='#FF6B6B')
ax2.set_title('Monthly Revenue Trend', fontsize=14, fontweight='bold')
ax2.set_ylabel('Revenue (Million $)')
ax2.grid(True, alpha=0.3)

# Profit Margin by Category
category_profit = df.groupby('Category')['Profit'].sum()
profit_margin = (category_profit / category_revenue * 100)
ax3.pie(profit_margin.values, labels=profit_margin.index, autopct='%1.1f%%', startangle=90)
ax3.set_title('Profit Margin Distribution', fontsize=14, fontweight='bold')

# Revenue vs Profit Scatter
ax4.scatter(df['Revenue'], df['Profit'], alpha=0.6, c=df['Category'].astype('category').cat.codes, cmap='viridis')
ax4.set_xlabel('Revenue (Million $)')
ax4.set_ylabel('Profit (Million $)')
ax4.set_title('Revenue vs Profit Analysis', fontsize=14, fontweight='bold')

plt.tight_layout()
plt.show()

# ✅ Display insights
print("📊 BUSINESS ANALYTICS DASHBOARD")
print("=" * 40)

latest_data = df[df['Month'] == 'Jun']
print("\\n📈 JUNE 2024 PERFORMANCE:")
print("-" * 25)

for _, row in latest_data.iterrows():
    revenue_str = str(int(row['Revenue']))
    profit_str = str(round(row['Profit'], 1))
    print(row['Category'] + ": $" + revenue_str + "M Revenue, $" + profit_str + "M Profit")

top_performer = latest_data.loc[latest_data['Revenue'].idxmax(), 'Category']
total_revenue = str(int(latest_data['Revenue'].sum()))
avg_revenue = str(round(latest_data['Revenue'].mean(), 1))

print("\\n🏆 Top Performer: " + top_performer)
print("💰 Total Revenue: $" + total_revenue + "M")
print("📊 Average Revenue: $" + avg_revenue + "M")

plt.tight_layout()
plt.show()`,
      'pdf': `# ✅ PDF Report Generator
from fpdf import FPDF
import datetime

# ✅ Create PDF class with custom styling
class BusinessReportPDF(FPDF):
    def header(self):
        # Logo/Header section
        self.set_font('Arial', 'B', 16)
        self.set_text_color(44, 62, 80)
        self.cell(0, 15, '📊 BUSINESS ANALYTICS REPORT', ln=True, align='C')
        
        # Date
        self.set_font('Arial', 'I', 10)
        self.set_text_color(100, 100, 100)
        today = datetime.datetime.now().strftime("%B %d, %Y")
        self.cell(0, 8, 'Generated on: ' + today, ln=True, align='C')
        self.ln(5)
        
        # Horizontal line
        self.set_draw_color(52, 152, 219)
        self.line(20, self.get_y(), 190, self.get_y())
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(100, 100, 100)
        page_text = 'Page ' + str(self.page_no()) + ' | Confidential Business Report'
        self.cell(0, 10, page_text, align='C')

    def add_section_title(self, title):
        self.set_font('Arial', 'B', 14)
        self.set_text_color(44, 62, 80)
        self.cell(0, 12, title, ln=True)
        self.ln(3)

    def add_metric_box(self, label, value, color_r=52, color_g=152, color_b=219):
        # Save current position
        x = self.get_x()
        y = self.get_y()
        
        # Draw colored box
        self.set_fill_color(color_r, color_g, color_b)
        self.rect(x, y, 85, 25, 'F')
        
        # Add white text
        self.set_text_color(255, 255, 255)
        self.set_font('Arial', 'B', 10)
        self.set_xy(x + 5, y + 5)
        self.cell(0, 5, label, ln=True)
        
        self.set_font('Arial', 'B', 16)
        self.set_xy(x + 5, y + 12)
        self.cell(0, 8, value, ln=True)
        
        # Reset text color
        self.set_text_color(0, 0, 0)
        return 90  # Width + margin

# ✅ Generate sample business data
import random
random.seed(42)

revenue_data = {
    'Q1': 1250000,
    'Q2': 1450000, 
    'Q3': 1680000,
    'Q4': 1920000
}

profit_margins = {
    'Technology': 28.5,
    'Healthcare': 22.3,
    'Finance': 31.2,
    'Education': 18.7,
    'Retail': 15.4
}

# ✅ Create PDF Report
pdf = BusinessReportPDF()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()

# ✅ Executive Summary Section
pdf.add_section_title('📈 EXECUTIVE SUMMARY')
pdf.set_font('Arial', size=11)
pdf.set_text_color(60, 60, 60)

summary_text = """Our business analytics reveal strong performance across all quarters with consistent growth. 
Key highlights include a 53.6% revenue increase from Q1 to Q4, improved profit margins in 
technology and finance sectors, and successful market expansion initiatives."""

pdf.multi_cell(0, 8, summary_text)
pdf.ln(8)

# ✅ Key Metrics Section
pdf.add_section_title('💰 KEY FINANCIAL METRICS')

# Calculate totals
total_revenue = sum(revenue_data.values())
avg_margin = sum(profit_margins.values()) / len(profit_margins)
growth_rate = ((revenue_data['Q4'] - revenue_data['Q1']) / revenue_data['Q1']) * 100

# Add metric boxes in a 2x2 grid
start_x = pdf.get_x()
start_y = pdf.get_y()

pdf.set_xy(start_x, start_y)
pdf.add_metric_box('Total Revenue', '$' + str(int(total_revenue)), 52, 152, 219)

pdf.set_xy(start_x + 95, start_y)
pdf.add_metric_box('Growth Rate', str(round(growth_rate, 1)) + '%', 46, 204, 113)

pdf.set_xy(start_x, start_y + 30)
pdf.add_metric_box('Avg Profit Margin', str(round(avg_margin, 1)) + '%', 155, 89, 182)

pdf.set_xy(start_x + 95, start_y + 30)
pdf.add_metric_box('Best Quarter', 'Q4 2024', 231, 76, 60)

pdf.ln(65)

# ✅ Quarterly Performance Section
pdf.add_section_title('📊 QUARTERLY REVENUE BREAKDOWN')

for quarter, revenue in revenue_data.items():
    percentage = (revenue / total_revenue) * 100
    pdf.set_font('Arial', size=11)
    pdf.cell(40, 8, quarter + ':', ln=False)
    pdf.cell(60, 8, '$' + str(revenue), ln=False)
    pdf.cell(0, 8, '(' + str(round(percentage, 1)) + '% of total)', ln=True)

pdf.ln(5)

# ✅ Sector Analysis Section
pdf.add_section_title('🏢 PROFIT MARGIN BY SECTOR')

for sector, margin in profit_margins.items():
    pdf.set_font('Arial', size=11)
    
    # Sector name
    pdf.cell(60, 8, sector + ':', ln=False)
    
    # Progress bar effect
    pdf.set_fill_color(52, 152, 219)
    bar_width = (margin / 35) * 80  # Scale to max width of 80
    pdf.rect(pdf.get_x(), pdf.get_y() + 2, bar_width, 4, 'F')
    
    # Percentage
    pdf.cell(90, 8, '', ln=False)  # Space for bar
    pdf.cell(0, 8, str(margin) + '%', ln=True)

pdf.ln(8)

# ✅ Recommendations Section
pdf.add_section_title('🎯 STRATEGIC RECOMMENDATIONS')

recommendations = [
    "• Continue investing in Technology and Finance sectors (highest margins)",
    "• Develop growth strategies for Education and Retail sectors", 
    "• Maintain Q4 momentum into next fiscal year",
    "• Consider expanding high-performing product lines",
    "• Implement cost optimization in lower-margin sectors"
]

pdf.set_font('Arial', size=11)
for rec in recommendations:
    pdf.multi_cell(0, 7, rec)

pdf.ln(5)

# ✅ Footer note
pdf.set_font('Arial', 'I', 9)
pdf.set_text_color(100, 100, 100)
pdf.multi_cell(0, 6, 
    "This report is generated automatically from business analytics data. "
    "For detailed analysis and custom reports, contact the analytics team.")

# ✅ Save PDF
pdf.output("business_analytics_report.pdf")

print("✅ PDF Report Generated Successfully!")
print("📄 Filename: business_analytics_report.pdf")
print("📊 Report includes:")
print("   • Executive Summary")
print("   • Key Financial Metrics") 
print("   • Quarterly Revenue Breakdown")
print("   • Sector Profit Analysis")
print("   • Strategic Recommendations")
print("\\n🎉 Your professional business report is ready!")`
    }

    setCode(examples[type] || '')
  }

  const installPackage = async () => {
    if (isInstalling || !pyodideRef.current) return

    if (!packageName.trim()) {
      setOutput('Please enter a package name to install.')
      return
    }

    setIsInstalling(true)
    setOutput(`Installing ${packageName}...`)

    try {
      const pyodide = pyodideRef.current
      await pyodide.loadPackage(['micropip']);
      const micropip = pyodide.pyimport('micropip');
      await micropip.install(packageName);

      setInstalledPackages(prev => [...prev, packageName])
      setOutput(`${packageName} installed successfully!`)
    } catch (error) {
      setOutput(`Error installing ${packageName}: ${error}`)
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <>
      <Head>
        <title>Python Code Runner - Next.js + Pyodide</title>
        <meta name="description" content="Run Python code in browser using Pyodide" />
      </Head>

      <Script 
        src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"
        strategy="beforeInteractive"
      />

      <div className="container">
        <h1>🐍 Python Code Runner with Next.js + Pyodide</h1>

        <div className="editor-section">
          <h3>Python Code Editor:</h3>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="code-editor"
            placeholder="# Write your Python code here..."
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault()
                runCode()
              }
            }}
          />
        </div>

        <div className="button-group">
          <button 
            onClick={runCode} 
            disabled={isLoading || !pyodideRef.current}
            className="run-btn"
          >
            {isLoading ? '⏳ Running...' : '▶️ Run Code'}
          </button>
          <button onClick={clearOutput}>🗑️ Clear Output</button>
          <button onClick={clearCode}>📝 Clear Code</button>
        </div>

        <div className="examples">
          <h3>Example Codes:</h3>
          <button onClick={() => loadExample('basic')} className="example-btn">Basic Python</button>
          <button onClick={() => loadExample('matplotlib')} className="example-btn">Matplotlib Graph</button>
          <button onClick={() => loadExample('numpy')} className="example-btn">NumPy Array</button>
          <button onClick={() => loadExample('pandas')} className="example-btn">Pandas DataFrame</button>
          <button onClick={() => loadExample('analytics')} className="example-btn">Business Analytics</button>
          <button onClick={() => loadExample('pdf')} className="example-btn">PDF Report Generator</button>
        </div>
         {/* Package Installation Section */}
         <div className="package-installer">
          <h3>📦 Install Python Packages</h3>
          
          <div className="package-suggestions">
            <h4>🔥 Popular Pyodide-Compatible Packages:</h4>
            <div className="suggestion-buttons">
              <button className="suggestion-btn" onClick={() => setPackageName('fpdf2')}>fpdf2 (PDF)</button>
              <button className="suggestion-btn" onClick={() => setPackageName('requests')}>requests</button>
              <button className="suggestion-btn" onClick={() => setPackageName('beautifulsoup4')}>beautifulsoup4</button>
              <button className="suggestion-btn" onClick={() => setPackageName('pillow')}>pillow (Images)</button>
              <button className="suggestion-btn" onClick={() => setPackageName('plotly')}>plotly</button>
              <button className="suggestion-btn" onClick={() => setPackageName('seaborn')}>seaborn</button>
              <button className="suggestion-btn" onClick={() => setPackageName('scipy')}>scipy</button>
              <button className="suggestion-btn" onClick={() => setPackageName('sympy')}>sympy</button>
              <button className="suggestion-btn" onClick={() => setPackageName('scikit-learn')}>scikit-learn</button>
            </div>
          </div>

          <div className="package-input-section">
            <input
              type="text"
              placeholder="Enter package name (e.g., fpdf2)"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              disabled={isInstalling}
              style={{flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd'}}
            />
            <button
              onClick={installPackage}
              disabled={isInstalling || !pyodideRef.current}
              style={{padding: '8px 16px'}}
            >
              {isInstalling ? '⏳ Installing...' : '📥 Install'}
            </button>
          </div>

          <div className="package-note">
            <p>
              <strong>💡 Note:</strong> Only Pyodide-compatible packages work in browser. 
              Popular choices: fpdf2 (PDF generation), requests (HTTP), beautifulsoup4 (web scraping), 
              plotly (interactive charts), scikit-learn (ML).
            </p>
          </div>
        </div>

        <div className="output-section">
          <h3>Output:</h3>
          <pre className="output">{output}</pre>
          {plotImage && (
            <div className="plot-container">
              <img src={`data:image/png;base64,${plotImage}`} alt="Generated Plot" />
            </div>
          )}
        </div>
      </div>
    </>
  )
}