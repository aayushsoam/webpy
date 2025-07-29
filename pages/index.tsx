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
plt.show()`
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
        </div>
         {/* Package Installation Section */}
         <div className="package-installer">
          <h3>Install Package:</h3>
          <input
            type="text"
            placeholder="Enter package name"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            disabled={isInstalling}
          />
          <button
            onClick={installPackage}
            disabled={isInstalling || !pyodideRef.current}
          >
            {isInstalling ? '⏳ Installing...' : 'Install'}
          </button>
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