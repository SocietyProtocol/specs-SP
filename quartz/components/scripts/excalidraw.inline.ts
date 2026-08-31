// Interactive Pan, Zoom & Lightbox for Excalidraw Diagrams in Quartz

function setupExcalidrawViewer() {
  const diagrams = document.querySelectorAll<HTMLElement>(
    'article object[type="image/svg+xml"], article img[src*=".svg"], article img[src*="excalidraw"]'
  )

  diagrams.forEach((diagram) => {
    if (diagram.dataset.excalidrawInit === "true") return
    diagram.dataset.excalidrawInit = "true"

    const parent = diagram.parentElement
    if (!parent) return

    parent.classList.add("excalidraw-wrapper")

    const overlayBtn = document.createElement("button")
    overlayBtn.className = "excalidraw-expand-btn"
    overlayBtn.setAttribute("type", "button")
    overlayBtn.setAttribute("aria-label", "Expand and Explore Diagram")
    overlayBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
      <span>Explore / Zoom</span>
    `

    parent.appendChild(overlayBtn)

    const openViewer = (e?: Event) => {
      if (e) e.stopPropagation()
      let svgSrc = ""
      if (diagram instanceof HTMLObjectElement) {
        svgSrc = diagram.data
      } else if (diagram instanceof HTMLImageElement) {
        svgSrc = diagram.src
      }
      if (!svgSrc) return
      createLightbox(svgSrc)
    }

    overlayBtn.addEventListener("click", openViewer)
    parent.addEventListener("click", (e) => {
      const target = e.target as HTMLElement
      if (target.tagName.toLowerCase() === "a") return
      openViewer(e)
    })
  })
}

function createLightbox(svgUrl: string) {
  document.querySelector(".excalidraw-modal")?.remove()

  const modal = document.createElement("div")
  modal.className = "excalidraw-modal"

  modal.innerHTML = `
    <div class="excalidraw-modal-backdrop"></div>
    <div class="excalidraw-toolbar">
      <button class="excalidraw-tool-btn" data-action="zoom-in" title="Zoom In (+)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
      </button>
      <button class="excalidraw-tool-btn" data-action="zoom-out" title="Zoom Out (-)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
      </button>
      <button class="excalidraw-tool-btn" data-action="reset" title="Reset View (0)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
      </button>
      <span class="excalidraw-zoom-level">100%</span>
      <button class="excalidraw-tool-btn excalidraw-close-btn" data-action="close" title="Close (Esc)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="excalidraw-viewport">
      <div class="excalidraw-canvas-container">
        <img src="${svgUrl}" class="excalidraw-modal-img" alt="Excalidraw Diagram" draggable="false" />
      </div>
      <div class="excalidraw-drag-capture"></div>
    </div>
    <div class="excalidraw-hint">Click & Drag to Pan • Scroll Wheel to Zoom • Esc to Close</div>
  `

  document.body.appendChild(modal)
  const prevOverflow = document.body.style.overflow
  document.body.style.overflow = "hidden"

  // Transform State
  let scale = 1
  let translateX = 0
  let translateY = 0
  let isDragging = false
  let startPointerX = 0
  let startPointerY = 0
  let startTranslateX = 0
  let startTranslateY = 0

  const viewport = modal.querySelector<HTMLElement>(".excalidraw-viewport")!
  const container = modal.querySelector<HTMLElement>(".excalidraw-canvas-container")!
  const dragCapture = modal.querySelector<HTMLElement>(".excalidraw-drag-capture")!
  const zoomText = modal.querySelector<HTMLElement>(".excalidraw-zoom-level")!

  function updateTransform() {
    container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
    if (zoomText) {
      zoomText.textContent = `${Math.round(scale * 100)}%`
    }
  }

  function resetView() {
    scale = 1
    translateX = 0
    translateY = 0
    updateTransform()
  }

  function zoomAt(factor: number, clientX?: number, clientY?: number) {
    const oldScale = scale
    const newScale = Math.min(Math.max(0.2, scale * factor), 8)
    if (newScale === oldScale) return

    if (clientX !== undefined && clientY !== undefined) {
      const rect = viewport.getBoundingClientRect()
      const originX = clientX - rect.left - rect.width / 2
      const originY = clientY - rect.top - rect.height / 2

      translateX -= (originX - translateX) * (newScale / oldScale - 1)
      translateY -= (originY - translateY) * (newScale / oldScale - 1)
    }

    scale = newScale
    updateTransform()
  }

  function closeModal() {
    modal.classList.add("closing")
    setTimeout(() => {
      modal.remove()
      document.body.style.overflow = prevOverflow
    }, 180)
    document.removeEventListener("keydown", onKeyDown)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      closeModal()
    } else if (e.key === "+" || e.key === "=") {
      zoomAt(1.25)
    } else if (e.key === "-") {
      zoomAt(0.8)
    } else if (e.key === "0") {
      resetView()
    } else if (e.key === "ArrowUp" || e.key === "w") {
      translateY += 60
      updateTransform()
    } else if (e.key === "ArrowDown" || e.key === "s") {
      translateY -= 60
      updateTransform()
    } else if (e.key === "ArrowLeft" || e.key === "a") {
      translateX += 60
      updateTransform()
    } else if (e.key === "ArrowRight" || e.key === "d") {
      translateX -= 60
      updateTransform()
    }
  }

  document.addEventListener("keydown", onKeyDown)

  modal.querySelector(".excalidraw-modal-backdrop")?.addEventListener("click", closeModal)

  modal.querySelectorAll<HTMLButtonElement>(".excalidraw-tool-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const action = btn.dataset.action
      if (action === "zoom-in") zoomAt(1.25)
      else if (action === "zoom-out") zoomAt(0.8)
      else if (action === "reset") resetView()
      else if (action === "close") closeModal()
    })
  })

  // Smooth proportional wheel zoom
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Smooth, finely-tuned zoom rate (proportional to scroll delta)
    const zoomFactor = Math.min(Math.max(0.92, Math.exp(-e.deltaY * 0.0015)), 1.08)
    zoomAt(zoomFactor, e.clientX, e.clientY)
  }

  modal.addEventListener("wheel", handleWheel, { passive: false })

  // Pointer Drag to Pan (supports Mouse, Pen, and Single-Touch reliably)
  dragCapture.addEventListener("pointerdown", (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return
    isDragging = true
    dragCapture.setPointerCapture(e.pointerId)
    startPointerX = e.clientX
    startPointerY = e.clientY
    startTranslateX = translateX
    startTranslateY = translateY
    viewport.classList.add("dragging")
  })

  dragCapture.addEventListener("pointermove", (e: PointerEvent) => {
    if (!isDragging) return
    translateX = startTranslateX + (e.clientX - startPointerX)
    translateY = startTranslateY + (e.clientY - startPointerY)
    updateTransform()
  })

  const endDrag = (e: PointerEvent) => {
    if (isDragging) {
      isDragging = false
      try {
        dragCapture.releasePointerCapture(e.pointerId)
      } catch {}
      viewport.classList.remove("dragging")
    }
  }

  dragCapture.addEventListener("pointerup", endDrag)
  dragCapture.addEventListener("pointercancel", endDrag)

  // Two-Finger Touch Pinch Zoom
  let initialPinchDistance: number | null = null
  let initialPinchScale = 1

  viewport.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isDragging = false
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        initialPinchScale = scale
      }
    },
    { passive: true }
  )

  viewport.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault()
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const factor = currentDistance / initialPinchDistance
        scale = Math.min(Math.max(0.2, initialPinchScale * factor), 8)
        updateTransform()
      }
    },
    { passive: false }
  )

  viewport.addEventListener("touchend", () => {
    initialPinchDistance = null
  })
}

// Attach listeners
document.addEventListener("DOMContentLoaded", setupExcalidrawViewer)
document.addEventListener("nav", setupExcalidrawViewer)
