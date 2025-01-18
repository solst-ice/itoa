import { useState, useCallback, useEffect, useRef } from 'react'
import './App.css'

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function updateFavicon(color) {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')

  // Set background
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, 32, 32)

  // Draw text
  ctx.fillStyle = color
  ctx.font = 'bold 16px Courier New'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('i2a', 16, 16)

  // Add glow effect
  ctx.shadowColor = color
  ctx.shadowBlur = 4
  ctx.fillText('i2a', 16, 16)

  // Update favicon
  const link = document.querySelector("link[rel*='icon']") || document.createElement('link')
  link.type = 'image/x-icon'
  link.rel = 'shortcut icon'
  link.href = canvas.toDataURL()
  document.head.appendChild(link)
}

function App() {
  const [asciiArt, setAsciiArt] = useState('')
  const [colorAsciiArt, setColorAsciiArt] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [useColor, setUseColor] = useState(false)
  const [size, setSize] = useState(isMobileDevice() ? 'small' : 'medium')
  const fileInputRef = useRef(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  const sizeMap = {
    small: 60,
    medium: 150,
    large: isMobileDevice() ? 225 : 300
  }

  const convertToAscii = useCallback(async (file) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    
    await new Promise((resolve) => {
      img.onload = resolve
    })
    
    const dropZone = document.querySelector('.drop-zone')
    const MAX_ASCII_SIZE = sizeMap[size]
    
    // Calculate dimensions while preserving exact aspect ratio
    const aspectRatio = img.width / img.height
    let charWidth, charHeight
    
    // Account for character aspect ratio (typically 0.6)
    const charAspectRatio = 0.6
    const adjustedAspectRatio = aspectRatio / charAspectRatio

    if (adjustedAspectRatio > 1) {
      // Landscape - use max width
      charWidth = MAX_ASCII_SIZE
      charHeight = Math.round(charWidth / adjustedAspectRatio)
    } else {
      // Portrait - use max height
      charHeight = MAX_ASCII_SIZE
      charWidth = Math.round(charHeight * adjustedAspectRatio)
    }

    // Calculate font sizes that would fit each dimension
    const horizontalFontSize = dropZone.clientWidth / (charWidth * charAspectRatio)
    const verticalFontSize = dropZone.clientHeight / charHeight

    // Use the smaller font size to ensure no cropping while maintaining aspect ratio
    const fontSize = Math.min(horizontalFontSize, verticalFontSize)

    // Calculate actual dimensions after applying font size
    const actualWidth = charWidth * fontSize * charAspectRatio
    const actualHeight = charHeight * fontSize

    // Center the output
    const marginX = (dropZone.clientWidth - actualWidth) / 2
    const marginY = (dropZone.clientHeight - actualHeight) / 2

    // Apply the calculated values
    document.documentElement.style.setProperty('--ascii-font-size', `${fontSize}px`)
    document.documentElement.style.setProperty('--ascii-line-height', `${fontSize}px`)
    document.documentElement.style.setProperty('--ascii-margin-x', `${marginX}px`)
    document.documentElement.style.setProperty('--ascii-margin-y', `${marginY}px`)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = charWidth
    canvas.height = charHeight
    ctx.drawImage(img, 0, 0, charWidth, charHeight)
    
    try {
      const imageData = ctx.getImageData(0, 0, charWidth, charHeight)
      const asciiChars = ' .:-=+*#%@'
      
      // Generate monochrome version first
      let monoAscii = ''
      let lines = []
      
      // Build the ASCII art line by line
      for (let y = 0; y < charHeight; y++) {
        let line = ''
        for (let x = 0; x < charWidth; x++) {
          const offset = (y * charWidth + x) * 4
          const r = imageData.data[offset]
          const g = imageData.data[offset + 1]
          const b = imageData.data[offset + 2]
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b
          const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1))
          line += asciiChars[charIndex]
        }
        lines.push(line)
        monoAscii += line + '\n'
      }
      
      // Generate colored version using the exact same characters
      let colorHtml = '<pre style="margin:0; padding:0; white-space:pre;">'
      for (let y = 0; y < charHeight; y++) {
        for (let x = 0; x < charWidth; x++) {
          const offset = (y * charWidth + x) * 4
          const r = imageData.data[offset]
          const g = imageData.data[offset + 1]
          const b = imageData.data[offset + 2]
          const char = lines[y][x] // Use the exact same character from monochrome version
          colorHtml += `<span style="color:rgb(${r},${g},${b})">${char}</span>`
        }
        colorHtml += '\n'
      }
      colorHtml += '</pre>'
      
      // Store both versions
      setAsciiArt(monoAscii)
      setColorAsciiArt(colorHtml)
      
    } catch (error) {
      console.error('Error converting image to ASCII:', error)
    } finally {
      URL.revokeObjectURL(img.src)
    }
  }, [size])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      convertToAscii(file)
    }
  }, [convertToAscii])

  const cycleSize = () => {
    const sizes = ['small', 'medium', 'large']
    const currentIndex = sizes.indexOf(size)
    const nextIndex = (currentIndex + 1) % sizes.length
    setSize(sizes[nextIndex])
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      convertToAscii(file)
    }
  }

  const handleSaveAscii = () => {
    if (!asciiArt && !colorAsciiArt) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Get the number of characters in width and height
    const lines = asciiArt.split('\n').filter(line => line.length > 0) // Remove empty lines
    const charHeight = lines.length
    const charWidth = lines[0].length

    // Set a base scale for high resolution
    const baseScale = 32 // pixels per character
    const charAspectRatio = 0.6 // Monospace character width/height ratio

    // Set canvas size to exactly fit the ASCII art
    canvas.width = Math.ceil(charWidth * baseScale * charAspectRatio)
    canvas.height = Math.ceil(charHeight * baseScale)

    // Draw background
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Set up high quality text rendering
    ctx.textRendering = 'geometricPrecision'
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Calculate font size to exactly fit the characters
    const fontSize = baseScale
    ctx.font = `bold ${fontSize}px "Courier New"`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.letterSpacing = '0px'

    if (useColor) {
      // For color mode
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = colorAsciiArt
      const pre = tempDiv.querySelector('pre')
      const spans = Array.from(pre.querySelectorAll('span'))
      let spanIndex = 0

      lines.forEach((line, lineIndex) => {
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          if (spanIndex < spans.length) {
            const span = spans[spanIndex]
            const color = span.style.color
            const rgb = color.match(/\d+/g)
            const brightenedColor = `rgb(${Math.min(255, parseInt(rgb[0]) * 1.3)}, ${Math.min(255, parseInt(rgb[1]) * 1.3)}, ${Math.min(255, parseInt(rgb[2]) * 1.3)})`
            ctx.fillStyle = brightenedColor
            ctx.fillText(
              span.textContent,
              Math.round(charIndex * fontSize * charAspectRatio),
              Math.round(lineIndex * fontSize)
            )
            spanIndex++
          }
        }
      })
    } else {
      // For monochrome mode
      ctx.fillStyle = '#ff2b9d'
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, Math.round(i * fontSize))
      })
    }

    // Save with max quality
    if (isMobileDevice()) {
      canvas.toBlob((blob) => {
        try {
          if (navigator.share) {
            const file = new File([blob], 'ascii-art.png', { type: 'image/png' })
            navigator.share({
              files: [file],
              title: 'ASCII Art',
              text: 'Created with ITOA'
            }).catch(console.error)
          } else {
            const imageUrl = canvas.toDataURL('image/png', 1.0) // Max quality
            const link = document.createElement('a')
            link.download = 'ascii-art.png'
            link.href = imageUrl
            link.click()
          }
        } catch (error) {
          console.error('Error saving image:', error)
          const link = document.createElement('a')
          link.download = 'ascii-art.png'
          link.href = URL.createObjectURL(blob)
          link.click()
          setTimeout(() => URL.revokeObjectURL(link.href), 100)
        }
      }, 'image/png', 1.0) // Max quality
    } else {
      const link = document.createElement('a')
      link.download = 'ascii-art.png'
      link.href = canvas.toDataURL('image/png', 1.0) // Max quality
      link.click()
    }
  }

  const handleZoom = () => {
    setZoomLevel(prev => {
      if (prev >= 8) return 1
      return prev * 2
    })
  }

  // Add favicon animation
  useEffect(() => {
    const colors = ['#00f3ff', '#ff2b9d']
    let colorIndex = 0

    const faviconInterval = setInterval(() => {
      updateFavicon(colors[colorIndex])
      colorIndex = (colorIndex + 1) % colors.length
    }, 1500) // Change favicon color

    // Initial favicon
    updateFavicon(colors[0])

    return () => clearInterval(faviconInterval)
  }, [])

  return (
    <div className="app-container">
      <h1 className="title">ITOA: Image to ASCII Converter</h1>
      <div className="credit">
        // by <a href="http://x.com/IceSolst" target="_blank" rel="noopener noreferrer">solst/ICE</a>
      </div>
      
      <div className="controls">
        <button 
          className={`control-btn ${useColor ? 'active' : ''}`}
          onClick={() => setUseColor(prev => !prev)}
        >
          {useColor ? 'Colors' : 'Monochrome'}
        </button>
        
        <button
          className="control-btn"
          onClick={cycleSize}
          data-text={size.charAt(0).toUpperCase() + size.slice(1)}
        >
          {size.charAt(0).toUpperCase() + size.slice(1)}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        
        <button
          className="control-btn"
          onClick={() => fileInputRef.current.click()}
          data-text="Upload"
        >
          Upload
        </button>

        <button
          className="control-btn"
          onClick={handleSaveAscii}
          disabled={!asciiArt && !colorAsciiArt}
          data-text="Save"
        >
          Save
        </button>

        {(asciiArt || colorAsciiArt) && (
          <button
            className="control-btn"
            onClick={handleZoom}
            data-text="Zoom"
          >
            {zoomLevel === 1 ? '🔍+' : `${zoomLevel}×`}
          </button>
        )}
      </div>
      
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${zoomLevel > 1 ? 'zoomed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ '--zoom-scale': zoomLevel }}
      >
        {(asciiArt || colorAsciiArt) ? (
          useColor ? (
            <pre 
              className="ascii-output"
              dangerouslySetInnerHTML={{ __html: colorAsciiArt }}
            />
          ) : (
            <pre className="ascii-output">
              {asciiArt}
            </pre>
          )
        ) : (
          <div className="drop-text">
            <span>DROP IMAGE HERE</span>
            <span className="small-text">[ jpg / png / gif ]</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
