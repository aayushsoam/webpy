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

      'business': `# Business Analytics Dashboard (Matplotlib Version)
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import matplotlib.patches as patches

# Generate dataset
np.random.seed(42)
categories = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail']
years = np.arange(2018, 2024)

data = []
for year in years:
    for cat in categories:
        data.append([year, cat, np.random.randint(50, 200), np.random.randint(10, 50)])

df = pd.DataFrame(data, columns=['Year', 'Category', 'Revenue', 'Profit'])

# Create animated-style chart for latest year
plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(12, 8))

# Get latest year data
latest_data = df[df['Year'] == 2023]
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']

bars = ax.bar(latest_data['Category'], latest_data['Revenue'], 
              color=colors, alpha=0.8, edgecolor='white', linewidth=1.5)

# Add value labels on bars
for i, (bar, revenue) in enumerate(zip(bars, latest_data['Revenue'])):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 5,
            f'{revenue}M', ha='center', va='bottom', fontweight='bold', fontsize=12)

# Styling
ax.set_title('📊 AI-Style Dynamic Revenue Graph (2023)', 
             fontsize=20, fontweight='bold', pad=20)
ax.set_xlabel('Business Category', fontsize=14, fontweight='bold')
ax.set_ylabel('Revenue (Millions)', fontsize=14, fontweight='bold')
ax.set_ylim(0, max(latest_data['Revenue']) * 1.2)

# Add grid
ax.grid(True, alpha=0.3, linestyle='--')
ax.set_axisbelow(True)

# Rotate x-axis labels
plt.xticks(rotation=45, ha='right')

# Add trend analysis
print("📈 Business Analytics Report 2023:")
print("=" * 40)
for _, row in latest_data.iterrows():
    print(f"{row['Category']}: ${row['Revenue']}M Revenue, ${row['Profit']}M Profit")
    
print(f"\\n🏆 Top Performer: {latest_data.loc[latest_data['Revenue'].idxmax(), 'Category']}")
print(f"💰 Total Revenue: ${latest_data['Revenue'].sum()}M")
print(f"📊 Average Revenue: {latest_data['Revenue'].mean():.1f}M")

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
          <button onClick={() => loadExample('business')} className="example-btn">📊 Business Analytics</button>
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