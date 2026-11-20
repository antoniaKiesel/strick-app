// Rahmen um eine Stelle der Anleitung; rect relativ zur Seite (0–1).
function HighlightBox({ rect }) {
  return (
    <div
      className="viewer-highlight"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
      }}
      aria-hidden="true"
    />
  )
}

export default HighlightBox
